import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerraHttpHandler } from '../lib/terra/server/http-handler.mjs';

const url = 'https://terra.test/api/terra';
const request = (path, data = {}, origin = 'https://terra.test') => new Request(url + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const answer = { title: 'Earth', explanation: 'A geographic answer.', targets: [], limitation: '' };
function setup(overrides = {}) {
  return createTerraHttpHandler({ apiKey: 'test-secret', authorize: async () => 'signed-in-user', planQuestion: () => null, inventory: {}, worldAnswerSchema: { safeParse: () => ({ success: false }), parse: value => value }, streamOpening: async ({ onDelta, onDone }) => { onDelta('Opening.'); onDone('Opening.'); }, runProbe: async options => { assert.equal(options.reportPath, null); return { final_text: JSON.stringify(answer), subagent_ids: ['one', 'two'] }; }, imageService: { generate: async () => ({ imageUrl: 'data:image/png;base64,test' }) }, ...overrides });
}
test('anonymous visitors get status and a sign-in path; paid requests require sign-in', async () => {
  const handle = setup({ authorize: async () => null });
  const status = await (await handle(new Request(url + '/status'))).json();
  assert.equal(status.signedIn, false); assert.equal(status.configured, true);
  const result = await handle(request('/answer', { query: 'Earth?' }));
  assert.equal(result.status, 401); assert.match((await result.json()).signInUrl, /^\/signin-with-chatgpt/);
});
test('origin, body, query and burst limits fail before upstream work', async () => {
  const handle = setup();
  assert.equal((await handle(request('/answer', {}, 'https://other.test'))).status, 403);
  assert.equal((await handle(request('/answer', { query: 'x'.repeat(66000) }))).status, 413);
  assert.equal((await handle(request('/answer', { query: '' }))).status, 400);
  for (let i = 0; i < 10; i++) await handle(request('/image'));
  assert.equal((await handle(request('/image'))).status, 429);
});
test('stream sends opening then validated result without filesystem reporting', async () => {
  const response = await setup()(request('/answer', { query: 'Earth?' }));
  assert.match(response.headers.get('content-type'), /ndjson/);
  const events = (await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(events[1].type, 'opening.delta');
  assert.deepEqual(events.at(-1).result.world, answer);
  assert.equal(events.at(-1).result.measured.subagent_count, 2);
});
test('Live returns only session identity and SDP, keeping credentials server-side', async () => {
  const handle = setup({ fetchImpl: async (_url, init) => { assert.equal(init.headers.Authorization, 'Bearer test-secret'); assert.equal(JSON.parse(init.body).session.audio.output.voice,'ripple'); return Response.json({ session: { id: 'session', secret: 'do-not-return' }, transport: { sdp: 'answer', secret: 'also-private' } }); } });
  const response = await handle(request('/session', { sdp: 'offer' }));
  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { session: { id: 'session' }, transport: { type: 'webrtc', sdp: 'answer' } });
});
test('cancellation is scoped to the authenticated user and frees the active request', async () => {
  let started; const began = new Promise(resolve => started = resolve);
  const handle = setup({ authorize: async req => req.headers.get('x-test-user') ?? 'signed-in-user', runProbe: async ({ signal }) => { started(); await new Promise((_, reject) => signal.addEventListener('abort', () => reject(new Error('cancelled')), { once: true })); } });
  const response = await handle(request('/answer', { query: 'Earth?' })); await began;
  assert.equal((await handle(request('/answer', { query: 'Again?' }))).status, 409);
  const other = request('/agents/cancel'); other.headers.set('x-test-user', 'other');
  assert.equal((await (await handle(other)).json()).cancellation_requested, false);
  assert.equal((await (await handle(request('/agents/cancel'))).json()).cancellation_requested, true);
  await response.text();
});

test('procedural models share authentication, origin and request-size gates', async () => {
  let calls=0;
  const modelService={generate:async({apiKey,input,signal})=>{calls++;assert.equal(apiKey,'test-secret');assert.ok(signal);return {recipe:{id:input.brief.title},model:'gpt-5.6-luna'};}};
  const input={query:'Explain a structure',brief:{title:'Structure',prompt:'A compact shape'}};
  const handle=setup({modelService});
  assert.equal((await setup({authorize:async()=>null,modelService})(request('/model',input))).status,401);
  assert.equal((await handle(request('/model',input,'https://other.test'))).status,403);
  assert.equal((await handle(request('/model',{...input,query:'x'.repeat(17000)}))).status,413);
  const response=await handle(request('/model',input));assert.equal(response.status,200);assert.equal((await response.json()).recipe.id,'Structure');assert.equal(calls,1);
});
