import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createModelAnswerService, validateModelAnswerRequest } from '../lib/terra/server/model-answer.mjs';

const bundle = await build({ entryPoints: ['lib/terra/sculptures/procedural-model.ts'], bundle: true, write: false, platform: 'node', format: 'esm' });
const compiler = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const transform = { position: [0, 0, 0], rotationDegrees: [0, 0, 0], scale: [1, 1, 1] };
const validRecipe = { version: 1, id: 'volcano-cycle', title: 'Volcano cycle', description: 'Conceptual illustration, not a measured reconstruction.', semanticMode: 'conceptual', seed: 7, gentleRotationDegPerSec: .25, primitives: [
  { id: 'cone', type: 'cone', transform, sampleCount: 80, brightness: 1, pointSize: 1, radius: .5, height: .8 },
  { id: 'plume', type: 'sphere', transform: { ...transform, position: [0, .6, 0] }, sampleCount: 60, brightness: 1.3, pointSize: 1.2, radius: .2 },
] };
const response = recipe => Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(recipe) }] }] });
let captured;
const service = createModelAnswerService({ validateRecipe: compiler.validateProceduralModelRecipe, fetchImpl: async (url, init) => { captured = { url, init }; return response(validRecipe); } });
const result = await service.generate({ apiKey: 'test-key', input: { query: 'How does a volcano erupt?', brief: { title: 'Volcano', prompt: 'Show magma rising into a cone and plume.' } }, signal: new AbortController().signal });
assert.equal(result.model, 'gpt-5.6-luna'); assert.equal(result.recipe.semanticMode, 'conceptual'); assert.equal(service.isActive(), false);
assert.equal(captured.url, 'https://api.openai.com/v1/responses');
const requestBody = JSON.parse(captured.init.body);
assert.equal(requestBody.store, false); assert.equal(requestBody.text.format.type, 'json_schema'); assert.equal(requestBody.text.format.strict, true);
assert.equal(requestBody.text.format.schema.properties.primitives.maxItems, 12);
assert.ok(captured.init.signal instanceof AbortSignal);
console.log('PASS requests strict Responses JSON and returns a compiler-validated conceptual recipe.');

assert.throws(() => validateModelAnswerRequest({ query: 'x'.repeat(8001), brief: { title: 'x', prompt: 'x' } }), error => error.status === 400);
assert.throws(() => validateModelAnswerRequest({ query: 'x', brief: { title: 'x', prompt: 'x'.repeat(1401) } }), error => error.status === 400);
assert.throws(() => validateModelAnswerRequest({ query: 'x', brief: { title: 'x', prompt: 'x' }, url: 'https://example.com' }), error => error.status === 400);
console.log('PASS rejects oversized and unsupported request data before fetch.');

const invalid = createModelAnswerService({ validateRecipe: compiler.validateProceduralModelRecipe, fetchImpl: async () => response({ ...validRecipe, semanticMode: 'surveyed' }) });
await assert.rejects(invalid.generate({ apiKey: 'test', input: { query: 'x', brief: { title: 'x', prompt: 'x' } } }), error => error.status === 502);
const tooDense = createModelAnswerService({ validateRecipe: compiler.validateProceduralModelRecipe, fetchImpl: async () => response({ ...validRecipe, primitives: Array.from({ length: 5 }, (_, id) => ({ ...validRecipe.primitives[0], id: `dense-${id}`, sampleCount: 3000 })) }) });
await assert.rejects(tooDense.generate({ apiKey: 'test', input: { query: 'x', brief: { title: 'x', prompt: 'x' } } }), error => error.status === 502);
console.log('PASS rejects invalid evidence claims and recipes above the 12000-point planner cap.');

let release;
const pending = new Promise(resolve => { release = resolve; });
const concurrent = createModelAnswerService({ validateRecipe: compiler.validateProceduralModelRecipe, fetchImpl: async () => { await pending; return response(validRecipe); } });
const first = concurrent.generate({ apiKey: 'test', input: { query: 'one', brief: { title: 'one', prompt: 'one' } } });
await assert.rejects(concurrent.generate({ apiKey: 'test', input: { query: 'two', brief: { title: 'two', prompt: 'two' } } }), error => error.status === 409);
release(); await first;
assert.equal(concurrent.isActive(), false);
await concurrent.generate({ apiKey: 'test', input: { query: 'three', brief: { title: 'three', prompt: 'three' } } });
console.log('PASS enforces one active generation and releases concurrency after settlement.');

const controller = new AbortController();
const cancelled = createModelAnswerService({ validateRecipe: compiler.validateProceduralModelRecipe, fetchImpl: async (_url, init) => { controller.abort(); init.signal.throwIfAborted(); } });
await assert.rejects(cancelled.generate({ apiKey: 'test', input: { query: 'x', brief: { title: 'x', prompt: 'x' } }, signal: controller.signal }), error => error.status === 499);
assert.equal(cancelled.isActive(), false);
console.log('PASS maps caller abort to cancellation and releases the active slot.');

const timedOut = createModelAnswerService({ validateRecipe: compiler.validateProceduralModelRecipe, timeoutMs: 5, fetchImpl: async (_url, init) => new Promise((_resolve, reject) => {
  const hold = setTimeout(() => reject(new Error('Fake request failed to receive abort.')), 100);
  init.signal.addEventListener('abort', () => { clearTimeout(hold); reject(init.signal.reason); }, { once: true });
}) });
await assert.rejects(timedOut.generate({ apiKey: 'test', input: { query: 'x', brief: { title: 'x', prompt: 'x' } } }), error => error.status === 504);
assert.equal(timedOut.isActive(), false);
console.log('PASS enforces the bounded timeout and releases the active slot.');
console.log('PASS no paid API request, filesystem access, asset loading, rendering, or executable code path was used.');
