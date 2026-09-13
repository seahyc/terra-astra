import test from 'node:test';
import assert from 'node:assert/strict';
import { createImageAnswerService, validateImageRequest } from './image-answer.mjs';

const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
const input = n => ({ query: `Explain temple ${n}`, brief: { title: `Temple ${n}`, prompt: `A precise schematic of temple ${n}` } });
const response = () => new Response(JSON.stringify({ data: [{ b64_json: png }] }), { status: 200, headers: { 'content-type': 'application/json' } });

test('validates strict bounded input', () => {
  assert.deepEqual(validateImageRequest(input(1)), input(1));
  assert.throws(() => validateImageRequest({ ...input(1), extra: true }), /unsupported fields/);
  assert.throws(() => validateImageRequest({ query: 'x', brief: { title: 'x', prompt: 'x'.repeat(1401) } }), /1 to 1400/);
});

test('posts one bounded PNG request and caches it', async () => {
  let calls = 0, sent;
  const service = createImageAnswerService({ fetchImpl: async (_url, init) => { calls++; sent = JSON.parse(init.body); return response(); } });
  const first = await service.generate({ apiKey: 'test-key', input: input(1) });
  const second = await service.generate({ apiKey: 'test-key', input: input(1) });
  assert.equal(calls, 1); assert.equal(first.cached, false); assert.equal(second.cached, true);
  assert.match(first.imageUrl, /^data:image\/png;base64,/);
  assert.deepEqual(sent, { model: 'gpt-image-2.5-flare', prompt: input(1).brief.prompt, size: '1024x1024', quality: 'medium', n: 1, output_format: 'png' });
});

test('allows only one active generation', async () => {
  let release, calls = 0;
  const service = createImageAnswerService({ fetchImpl: () => { calls++; return new Promise(resolve => { release = () => resolve(response()); }); } });
  const first = service.generate({ apiKey: 'test-key', input: input(1) });
  await Promise.resolve();
  const duplicate = service.generate({ apiKey: 'test-key', input: input(1) });
  await assert.rejects(service.generate({ apiKey: 'test-key', input: input(2) }), error => error.status === 409);
  release();
  assert.deepEqual(await duplicate, await first);
  assert.equal(calls, 1);
});

test('times out and releases the active slot', async () => {
  const service = createImageAnswerService({ timeoutMs: 5, fetchImpl: (_url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true })) });
  await assert.rejects(service.generate({ apiKey: 'test-key', input: input(1) }), error => error.status === 504);
  assert.equal(service.isActive(), false);
});

test('keeps at most eight images and rejects non-PNG data', async () => {
  const service = createImageAnswerService({ fetchImpl: async () => response() });
  for (let index = 0; index < 9; index++) await service.generate({ apiKey: 'test-key', input: input(index) });
  assert.equal(service.cacheEntries(), 8);
  const bad = createImageAnswerService({ fetchImpl: async () => new Response(JSON.stringify({ data: [{ b64_json: Buffer.from('not png').toString('base64') }] })) });
  await assert.rejects(bad.generate({ apiKey: 'test-key', input: input(1) }), error => error.status === 502);
});
