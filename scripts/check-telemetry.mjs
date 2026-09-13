import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './lib/terra/telemetry'; export { currentVersion } from './lib/terra/releases';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
let randomCalls = 0;
const originalCrypto = globalThis.crypto;
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID() { randomCalls++; throw new Error('SSR must not consume randomness'); } } });
const telemetryModule = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal(randomCalls, 0, 'module import must not create the singleton');
assert.equal(telemetryModule.telemetry.beginTurn('typed', 5), '', 'server beginTurn must be a no-op');
telemetryModule.telemetry.record('voice.status', { status: 'started' });
assert.equal(telemetryModule.telemetry.snapshot().events.length, 0);
assert.equal(randomCalls, 0, 'server facade calls must not create a clock or ID');
console.log('PASS SSR import and server facade calls perform no clock/random initialization');
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
const { createTelemetryRecorder, classifyTelemetryError, navigationTurnOutcome, MAX_TELEMETRY_BYTES, MAX_TELEMETRY_EVENTS, MAX_REGISTERED_TURNS } = telemetryModule;

let wall = Date.parse('2026-09-13T00:00:00.000Z');
let monotonic = 0;
let id = 0;
const recorder = createTelemetryRecorder({ now: () => wall++, monotonic: () => monotonic++, uuid: () => `00000000-0000-4000-8000-${String(++id).padStart(12, '0')}` });
const first = recorder.beginTurn('typed', 37);
recorder.record('answer.http', {
  attempt: 0, status: 200, duration_ms: 18, content_type: 'ndjson',
  question: 'SECRET_QUESTION', transcript: 'SECRET_TRANSCRIPT', answer: 'SECRET_ANSWER',
  error: 'SECRET_ERROR', url: 'https://SECRET_URL', sdp: 'SECRET_SDP', apiKey: 'SECRET_KEY',
  cookie: 'SECRET_COOKIE', image: 'SECRET_IMAGE', arbitrary: { nested: 'SECRET_NESTED' },
}, first);
recorder.record('turn.cancelled', { reason: 'user' }, first);
recorder.record('turn.finished', { outcome: 'cancelled' }, first);
recorder.record('turn.error', { error_kind: 'validation', message: 'SECRET_ERROR_MESSAGE' }, first);
recorder.record('turn.finished', { outcome: 'completed' }, '00000000-0000-4000-8000-999999999999');

const second = recorder.beginTurn('voice', 12);
recorder.record('answer.result', { model: 'gpt-5.6-terra', route: 'standard', subagent_count: 0, server_elapsed_ms: 91, duration_ms: 97 }, second);
recorder.record('model.lifecycle', { phase: 'ready', point_count: 12000, duration_ms: 421, model: 'gpt-5.6-luna', prompt: 'SECRET_MODEL_PROMPT' }, second);
recorder.record('voice.status', { status: 'microphone_muted' }, second);
recorder.record('voice.status', { status: 'reconnecting' }, second);
recorder.record('navigation.command', { command_type: 'showProceduralModel', index: 1, ok: true, duration_ms: 20 }, second);
recorder.record('navigation.command', { command_type: 'clearProceduralModel', index: 2, ok: true, duration_ms: 5 }, second);
const parsed = JSON.parse(recorder.exportJson());
assert.equal(parsed.report_version, 1);
assert.equal(parsed.app_build, telemetryModule.currentVersion);
assert.equal(parsed.events.filter(event => event.turn_id === first).length, 5);
assert.equal(parsed.events.filter(event => event.turn_id === second).length, 7);
assert.equal(parsed.events.length, 12, 'unknown turn IDs must not be recorded');
assert.equal(parsed.events.find(event => event.name === 'model.lifecycle').metadata.point_count, 12000);
assert.equal(recorder.exportJson().includes('SECRET_MODEL_PROMPT'), false);
for (const sentinel of ['SECRET_QUESTION','SECRET_TRANSCRIPT','SECRET_ANSWER','SECRET_ERROR','SECRET_URL','SECRET_SDP','SECRET_KEY','SECRET_COOKIE','SECRET_IMAGE','SECRET_NESTED']) assert.equal(recorder.exportJson().includes(sentinel), false, sentinel);

for (let index = 0; index < MAX_TELEMETRY_EVENTS + 75; index++) recorder.record('voice.status', { status: 'started' });
for (let index = 0; index < 10_000; index++) recorder.beginTurn('typed', index);
const bounded = recorder.snapshot();
assert.ok(bounded.events.length <= MAX_TELEMETRY_EVENTS);
assert.ok(new TextEncoder().encode(recorder.exportJson()).byteLength <= MAX_TELEMETRY_BYTES);
assert.ok(bounded.limits.evicted > 0);
assert.equal(bounded.limits.registered_turns, MAX_REGISTERED_TURNS);
assert.equal(bounded.limits.max_registered_turns, MAX_REGISTERED_TURNS);
assert.ok(bounded.events.every((event, index, events) => index === 0 || event.sequence > events[index - 1].sequence));
const lastSequence = bounded.events.at(-1).sequence;
recorder.record('turn.finished', { outcome: 'completed' }, first);
assert.equal(recorder.snapshot().events.at(-1).sequence, lastSequence, 'evicted turn IDs must stop accepting late events');
assert.equal(classifyTelemetryError(new SyntaxError('SECRET_PARSE_BODY')), 'unreadable');
assert.equal(classifyTelemetryError(new TypeError('SECRET_NETWORK_BODY')), 'network');
assert.equal(classifyTelemetryError(new Error('SECRET_HTTP_BODY'), undefined, 503), 'http');
assert.equal(classifyTelemetryError(new Error('SECRET_NAV_BODY'), 'navigation'), 'navigation');
assert.equal(navigationTurnOutcome(false), 'error', 'a rejected navigation must fail its turn');
assert.equal(navigationTurnOutcome(true), 'completed');

recorder.clear();
assert.equal(recorder.snapshot().events.length, 0);
assert.doesNotThrow(() => JSON.parse(recorder.exportJson()));
console.log(`PASS telemetry redaction, correlation, bounds (${MAX_TELEMETRY_EVENTS} events/${MAX_TELEMETRY_BYTES} bytes), clear and JSON export`);

let browserUuidCalls = 0;
Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: { randomUUID: () => `browser-${++browserUuidCalls}` } });
const browserFirst = telemetryModule.telemetry.beginTurn('typed', 9);
const browserSecond = telemetryModule.telemetry.beginTurn('voice', 11);
assert.equal(browserFirst, 'browser-2');
assert.equal(browserSecond, 'browser-3');
assert.equal(browserUuidCalls, 3, 'one session ID plus one ID for each turn proves one recorder instance');
assert.equal(telemetryModule.telemetry.snapshot().events.length, 2);
telemetryModule.telemetry.clear();
assert.equal(telemetryModule.telemetry.snapshot().events.length, 0);
delete globalThis.window;
Object.defineProperty(globalThis, 'crypto', { configurable: true, value: originalCrypto });
console.log('PASS first browser use creates exactly one recorder and later calls reuse it');
