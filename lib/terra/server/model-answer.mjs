const API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-5.6-luna';
const MAX_QUERY = 8_000;
const MAX_TITLE = 100;
const MAX_PROMPT = 1_400;
const MAX_OBJECTS = 12;
const MAX_POINTS = 12_000;

function httpError(message, status) { return Object.assign(new Error(message), { status }); }
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const number = (minimum, maximum) => ({ type: 'number', minimum, maximum });
const vec3 = (minimum, maximum) => ({ type: 'array', minItems: 3, maxItems: 3, items: number(minimum, maximum) });
const transform = object({ position: vec3(-1, 1), rotationDegrees: vec3(-180, 180), scale: vec3(.01, 2) });
const base = {
  id: { type: 'string', minLength: 1, maxLength: 48 }, transform,
  sampleCount: { type: 'integer', minimum: 8, maximum: 3000 }, brightness: number(.1, 2), pointSize: number(.1, 4),
};
const primitive = { anyOf: [
  object({ ...base, type: { type: 'string', enum: ['box'] }, dimensions: vec3(.01, 2) }),
  object({ ...base, type: { type: 'string', enum: ['cylinder'] }, radius: number(.005, 1), height: number(.01, 2) }),
  object({ ...base, type: { type: 'string', enum: ['cone'] }, radius: number(.005, 1), height: number(.01, 2) }),
  object({ ...base, type: { type: 'string', enum: ['sphere'] }, radius: number(.005, 1) }),
  object({ ...base, type: { type: 'string', enum: ['ring'] }, innerRadius: number(.005, 1), outerRadius: number(.01, 1) }),
  object({ ...base, type: { type: 'string', enum: ['line'] }, points: { type: 'array', minItems: 2, maxItems: 16, items: vec3(-1, 1) } }),
] };
const recipeShape = object({
  version: { type: 'integer', enum: [1] }, id: { type: 'string', minLength: 1, maxLength: 64 },
  title: { type: 'string', minLength: 1, maxLength: 100 }, description: { type: 'string', minLength: 1, maxLength: 500 },
  semanticMode: { type: 'string', enum: ['conceptual'] }, seed: { type: 'integer', minimum: 0, maximum: 4294967295 },
  gentleRotationDegPerSec: number(-2, 2), primitives: { type: 'array', minItems: 1, maxItems: MAX_OBJECTS, items: primitive },
});

const instructions = `Create a compact procedural starlight model that visually explains the supplied brief. Return JSON only in the required schema.
The model is an illustrative conceptual shape, never an exact, surveyed, measured, live, or evidence-derived reconstruction. Set semanticMode to conceptual; describe the structure and relationships concisely, without routine caveats. Use only boxes, cylinders, cones, spheres, flat rings, and polylines. Coordinates and dimensions are normalized local values. Compose a legible silhouette with no more than ${MAX_OBJECTS} primitives and ${MAX_POINTS} total sampled points. Prefer fewer well-chosen objects. Use a gentle rotation from -2 to 2 degrees per second. Never emit code, URLs, asset references, geographic coordinates, scripts, shaders, markup, or executable instructions. The renderer and validated geographic target own placement, camera, and animation.`;

export function validateModelAnswerRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw httpError('Model request must be an object', 400);
  if (Object.keys(input).some(key => !['query', 'brief'].includes(key))) throw httpError('Model request contains unsupported fields', 400);
  const query = typeof input.query === 'string' ? input.query.trim() : '';
  if (!query || query.length > MAX_QUERY) throw httpError('query must contain 1 to 8000 characters', 400);
  const brief = input.brief;
  if (!brief || typeof brief !== 'object' || Array.isArray(brief) || Object.keys(brief).some(key => !['title', 'prompt'].includes(key))) throw httpError('brief must contain only title and prompt', 400);
  const title = typeof brief.title === 'string' ? brief.title.trim() : '';
  const prompt = typeof brief.prompt === 'string' ? brief.prompt.trim() : '';
  if (!title || title.length > MAX_TITLE) throw httpError('brief.title must contain 1 to 100 characters', 400);
  if (!prompt || prompt.length > MAX_PROMPT) throw httpError('brief.prompt must contain 1 to 1400 characters', 400);
  return { query, brief: { title, prompt } };
}

function outputText(body) {
  const value = body?.output?.flatMap(item => item.content ?? []).filter(part => part.type === 'output_text').map(part => part.text).join('');
  if (!value) throw httpError('Model planner returned an empty response', 502);
  try { return JSON.parse(value); } catch { throw httpError('Model planner returned malformed JSON', 502); }
}

/** @param {{validateRecipe?: (input: unknown) => unknown, fetchImpl?: typeof fetch, model?: string, timeoutMs?: number}} [options] */
export function createModelAnswerService({ validateRecipe, fetchImpl = fetch, model = DEFAULT_MODEL, timeoutMs = 30_000 } = {}) {
  if (typeof validateRecipe !== 'function') throw new TypeError('validateRecipe is required.');
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function.');
  if (typeof model !== 'string' || !model.trim() || model.length > 100) throw new TypeError('model must be a nonempty string up to 100 characters.');
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new TypeError('timeoutMs must be an integer from 1 to 30000.');
  let active = null;
  return {
    async generate({ apiKey, input, signal } = {}) {
      if (!apiKey) throw httpError('OpenAI API key is not configured', 503);
      const request = validateModelAnswerRequest(input);
      if (active) throw httpError('A procedural model generation is already active', 409);
      const operation = (async () => {
        try {
          const timeout = AbortSignal.timeout(timeoutMs);
          const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
          const response = await fetchImpl(API_URL, {
            method: 'POST', signal: combined,
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: model.trim(), store: false, reasoning: { effort: 'none' }, max_output_tokens: 6000,
              instructions, input: JSON.stringify(request),
              text: { format: { type: 'json_schema', name: 'terra_procedural_model', strict: true, schema: recipeShape } },
            }),
          });
          if (!response.ok) throw httpError(`Model planner failed (${response.status})`, response.status >= 400 && response.status < 500 ? response.status : 502);
          const body = await response.json();
          if (body?.status !== 'completed') throw httpError('Model planner response was incomplete', 502);
          const candidate = outputText(body);
          if (!Array.isArray(candidate?.primitives) || candidate.primitives.length > MAX_OBJECTS) throw httpError('Model planner exceeded the object limit', 502);
          const pointCount = candidate.primitives.reduce((sum, item) => sum + (Number.isInteger(item?.sampleCount) ? item.sampleCount : 0), 0);
          if (pointCount > MAX_POINTS) throw httpError('Model planner exceeded the point limit', 502);
          let recipe;
          try { recipe = validateRecipe(candidate); } catch { throw httpError('Model planner returned an invalid recipe', 502); }
          return { recipe, model: model.trim() };
        } catch (error) {
          if (signal?.aborted) throw httpError('Model generation cancelled', 499);
          if (error?.name === 'TimeoutError') throw httpError('Model generation timed out', 504);
          throw error;
        }
      })();
      active = operation;
      try { return await operation; } finally { if (active === operation) active = null; }
    },
    isActive: () => Boolean(active),
  };
}
