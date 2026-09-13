import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  stdin: { contents: `export * from './lib/terra/telemetry'; export { currentVersion } from './lib/terra/releases';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'esm',
});
const telemetryModule = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
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
const parsed = JSON.parse(recorder.exportJson());
assert.equal(parsed.report_version, 1);
assert.equal(parsed.app_build, telemetryModule.currentVersion);
assert.equal(parsed.events.filter(event => event.turn_id === first).length, 5);
assert.equal(parsed.events.filter(event => event.turn_id === second).length, 2);
assert.equal(parsed.events.length, 7, 'unknown turn IDs must not be recorded');
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
