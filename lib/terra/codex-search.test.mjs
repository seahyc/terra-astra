import assert from 'node:assert/strict';
import test from 'node:test';
import { createCodexSearch } from './codex-search.mjs';

const validWorld = { title: 'Orbital context', explanation: 'The answer is grounded in the supplied evidence.', limitation: '', targets: [], perspective: null, modelBrief: null };
const runner = value => async request => ({ text: typeof value === 'function' ? JSON.stringify(value(request)) : JSON.stringify(value), usage: {}, webSearchCount: 0 });

test('answers a generic non-geographic subject without forcing a target', async () => {
  let request;
  const search = createCodexSearch({ run: async value => { request = value; return { text: JSON.stringify({ world: validWorld, sources: [], conversationReply: null }) }; } });
  const result = await search.answer('Why is a proof by contradiction valid?');
  assert.deepEqual(result.world.targets, []);
  assert.equal(result.world.perspective, undefined);
  assert.equal(result.kind, 'direct_answer');
  assert.equal(result.measured.model, 'gpt-5.6-sol');
  assert.equal(request.schema.additionalProperties, false);
  assert.match(request.prompt, /any subject/i);
  assert.doesNotMatch(request.prompt, /questionEvidence/);
});

test('passes follow-up context without treating it as evidence', async () => {
  let prompt;
  const search = createCodexSearch({ run: async request => { prompt = request.prompt; return runner({ world: validWorld, sources: [], conversationReply: null })(request); } });
  await search.answer({ question: 'What about the second case?', previousQuestion: 'Compare both cases', previous: { world: validWorld } });
  assert.match(prompt, /Previous questions and answers are conversation context, not verified evidence/);
  assert.match(prompt, /What about the second case/);
  assert.match(prompt, /Compare both cases/);
});

test('accepts the browser answer request shape', async () => {
  let prompt;
  const search = createCodexSearch({ run: async request => { prompt = request.prompt; return { text: JSON.stringify({ world: validWorld, sources: [], conversationReply: null }) }; } });
  await search.answer({ query: 'What happened there?', selectedIds: ['crossing:one'], previous: validWorld, previousQuestion: 'Where did it cross?' });
  assert.match(prompt, /What happened there/);
  assert.match(prompt, /crossing:one/);
  await assert.rejects(search.answer({ query: 'Too many', selectedIds: Array(9).fill('x') }), /selected evidence/);
});

test('rejects malformed JSON', async () => {
  const search = createCodexSearch({ run: async () => ({ text: '{oops' }) });
  await assert.rejects(search.answer('Anything'), /malformed JSON/);
});

test('rejects invalid coordinates and excess targets', async () => {
  const invalid = structuredClone(validWorld); invalid.targets = [{ name: 'Pole', latitude: 91, longitude: 0, span: 2 }];
  await assert.rejects(createCodexSearch({ run: runner({ world: invalid, sources: [], conversationReply: null }) }).answer('Where?'), /Invalid answer target/);
  const tooMany = structuredClone(validWorld); tooMany.targets = Array.from({ length: 5 }, (_, i) => ({ name: `P${i}`, latitude: 0, longitude: i, span: 2 }));
  await assert.rejects(createCodexSearch({ run: runner({ world: tooMany, sources: [], conversationReply: null }) }).answer('Where?'), /Invalid answer targets/);
});

test('rejects unsafe and excess sources while deduplicating normalized URLs', async () => {
  await assert.rejects(createCodexSearch({ run: runner({ world: validWorld, sources: [{ title: 'Bad', url: 'javascript:alert(1)' }], conversationReply: null }) }).answer('Sources?'), /source URL/);
  const citedWorld = { ...validWorld, explanation: 'See [the source](https://example.com/a).' };
  const duplicate = [{ title: 'One', url: 'https://example.com/a' }, { title: 'Two', url: 'https://example.com/a' }];
  const deduped = await createCodexSearch({ run: runner({ world: citedWorld, sources: duplicate, conversationReply: null }) }).answer('Sources?');
  assert.deepEqual(deduped.sources, [{ title: 'One', url: 'https://example.com/a' }]);
  const excess = Array.from({ length: 13 }, (_, i) => ({ title: `S${i}`, url: `https://example.com/${i}` }));
  await assert.rejects(createCodexSearch({ run: runner({ world: validWorld, sources: excess, conversationReply: null }) }).answer('Sources?'), /Invalid answer sources/);
});

test('keeps valid Sources-panel evidence when the explanation has no inline URL', async () => {
  const sourcedTarget = { world: { ...validWorld, title: 'Iceland', explanation: 'Iceland sits across a divergent plate boundary.', targets: [{ name: 'Iceland', latitude: 64.9, longitude: -18.6, span: 8 }], perspective: 'aerial' }, sources: [{ title: 'Geological survey', url: 'https://example.com/iceland/' }], conversationReply: null };
  const result = await createCodexSearch({ run: runner(sourcedTarget) }).answer('Why is Iceland volcanic?');
  assert.deepEqual(result.sources, [{ title: 'Geological survey', url: 'https://example.com/iceland/' }]);
  assert.equal(result.world.targets[0].name, 'Iceland');
});

test('still requires evidence for geographic targets', async () => {
  const unsourcedTarget = { world: { ...validWorld, targets: [{ name: 'Place', latitude: 1, longitude: 2, span: 3 }], perspective: 'aerial' }, sources: [], conversationReply: null };
  await assert.rejects(createCodexSearch({ run: runner(unsourcedTarget) }).answer('Where?'), /require a source/);
});

test('forwards progress events and abort signal', async () => {
  const events = [], controller = new AbortController();
  const search = createCodexSearch({ run: async request => { request.onEvent({ type: 'search', count: 1 }); assert.equal(request.signal, controller.signal); return { text: JSON.stringify({ world: validWorld, sources: [], conversationReply: null }) }; } });
  await search.answer('Current fact', { signal: controller.signal, onProgress: event => events.push(event) });
  assert.deepEqual(events, [{ type: 'search', count: 1 }]);
});

test('generates and validates a procedural model for an arbitrary subject', async () => {
  let request;
  const raw = { libraryId: null, title: 'DNA replication fork', anchor: null, parts: [{ id: 'strand', label: 'DNA strand', shape: 'cylinder', position: [0, 1, 0], size: [.1, 2, .1], rotation: [0, 0, 0], tone: 'gold', motion: null }] };
  const search = createCodexSearch({ run: async value => { request = value; return { text: JSON.stringify(raw) }; } });
  const result = await search.model({ query: 'Show a DNA replication fork', world: { explanation: 'Conceptual only' } });
  assert.equal(result.via, 'procedural');
  assert.equal(result.recipe.anchor, null);
  assert.equal(result.recipe.parts[0].shape, 'cylinder');
  assert.match(request.prompt, /never emit code/i);
  assert.match(request.prompt, /Conceptual only/);
});

test('rejects unsafe procedural geometry', async () => {
  const raw = { libraryId: null, title: 'Unsafe', anchor: null, parts: [{ id: 'x', label: 'x', shape: 'javascript', position: [0, 0, 0], size: [1, 1, 1], rotation: [0, 0, 0], tone: 'gold', motion: null }] };
  await assert.rejects(createCodexSearch({ run: runner(raw) }).model('Make something'), /Invalid model part/);
});

test('reuses a prepared safe recipe when it clearly matches', async () => {
  let called = false;
  const result = await createCodexSearch({ run: async () => { called = true; } }).model('How does a wind turbine work?');
  assert.equal(result.via, 'library');
  assert.equal(result.recipe.id, 'wind-turbine');
  assert.equal(result.persisted, false);
  assert.equal(called, false);
});

test('honours an explicit prepared model selection without claiming persistence', async () => {
  const search = createCodexSearch({ run: async () => { throw new Error('should not run'); } });
  const result = await search.model({ query: 'Show this prepared example', preferredId: 'wind-turbine' });
  assert.equal(result.recipe.id, 'wind-turbine');
  assert.equal(result.persisted, false);
  await assert.rejects(search.model({ query: 'Show this', preferredId: 'missing' }), /Unknown library model/);
});

test('rejects imageBrief and other undeclared answer fields', async () => {
  const world = { ...validWorld, imageBrief: { title: 'No', prompt: 'No' } };
  await assert.rejects(createCodexSearch({ run: runner({ world, sources: [], conversationReply: null }) }).answer('Draw it'), /Invalid world answer/);
});
