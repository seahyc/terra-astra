const API_URL = 'https://api.openai.com/v1/images/generations';
const DEFAULT_MODEL = 'gpt-image-2.5-flare';
const ALLOWED_MODELS = new Set(['gpt-image-2.5-flare', 'gpt-image-2.5-sunburst']);
const MAX_QUERY = 8_000;
const MAX_TITLE = 100;
const MAX_PROMPT = 1_400;

function httpError(message, status) { return Object.assign(new Error(message), { status }); }

export function validateImageRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw httpError('Image request must be an object', 400);
  const keys = Object.keys(input);
  if (keys.some(key => !['query', 'brief'].includes(key))) throw httpError('Image request contains unsupported fields', 400);
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

function pngDataUrl(value) {
  if (typeof value !== 'string' || value.length < 12 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw httpError('Image API returned invalid image data', 502);
  const bytes = Buffer.from(value, 'base64');
  if (bytes.length < 8 || !bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw httpError('Image API did not return a PNG image', 502);
  return `data:image/png;base64,${value}`;
}

export function createImageAnswerService({ fetchImpl = fetch, model = process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL, timeoutMs = 120_000, cacheSize = 8 } = {}) {
  if (!ALLOWED_MODELS.has(model)) throw new Error('OPENAI_IMAGE_MODEL must be gpt-image-2.5-flare or gpt-image-2.5-sunburst');
  if (!Number.isInteger(cacheSize) || cacheSize < 1 || cacheSize > 8) throw new Error('cacheSize must be an integer from 1 to 8');
  let activeKey = null, activePromise = null;
  const cache = new Map();
  return {
    async generate({ apiKey, input, signal }) {
      if (!apiKey) throw httpError('OpenAI API key is not configured', 503);
      const request = validateImageRequest(input);
      const key = JSON.stringify([model, request.query, request.brief]);
      const cached = cache.get(key);
      if (cached) { cache.delete(key); cache.set(key, cached); return { ...cached, cached: true }; }
      if (activePromise) {
        if (activeKey === key) return activePromise;
        throw httpError('An image generation is already active', 409);
      }
      activeKey = key;
      activePromise = (async () => {
       try {
        const timeout = AbortSignal.timeout(timeoutMs);
        const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
        const response = await fetchImpl(API_URL, {
          method: 'POST', signal: combined,
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: request.brief.prompt, size: '1024x1024', quality: 'medium', n: 1, output_format: 'png' }),
        });
        if (!response.ok) throw httpError(`Image generation failed (${response.status})`, response.status >= 400 && response.status < 500 ? response.status : 502);
        const body = await response.json();
        const result = { imageUrl: pngDataUrl(body?.data?.[0]?.b64_json), title: request.brief.title, model, cached: false };
        cache.set(key, result);
        while (cache.size > cacheSize) cache.delete(cache.keys().next().value);
        return result;
      } catch (error) {
        if (error?.name === 'TimeoutError') throw httpError('Image generation timed out', 504);
        if (signal?.aborted) throw httpError('Image generation cancelled', 499);
        throw error;
      } finally { activeKey = null; activePromise = null; }
      })();
      return activePromise;
    },
    cacheEntries: () => cache.size,
    isActive: () => Boolean(activePromise),
  };
}
