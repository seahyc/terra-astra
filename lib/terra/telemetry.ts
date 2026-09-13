import { currentVersion } from './releases';

export const TELEMETRY_REPORT_VERSION = 1;
export const MAX_TELEMETRY_EVENTS = 500;
export const MAX_TELEMETRY_BYTES = 512 * 1024;
export const MAX_REGISTERED_TURNS = 1000;

export const TELEMETRY_EVENT_NAMES = [
  'turn.started', 'answer.http', 'answer.opening', 'answer.result',
  'image.lifecycle', 'model.lifecycle', 'voice.response', 'voice.status', 'navigation.command',
  'turn.cancelled', 'turn.error', 'turn.finished',
] as const;

export type TelemetryEventName = typeof TELEMETRY_EVENT_NAMES[number];
type JsonScalar = string | number | boolean;
type Metadata = Record<string, JsonScalar | undefined>;

type StoredEvent = Readonly<{
  sequence: number;
  at_ms: number;
  elapsed_ms: number;
  name: TelemetryEventName;
  turn_id?: string;
  metadata: Readonly<Record<string, JsonScalar>>;
}>;

type Clock = { now: () => number; monotonic: () => number; uuid: () => string };

const MODEL_VALUES = new Set(['gpt-5.6-luna', 'gpt-5.6-terra', 'gpt-6-astra', 'gpt-image-2.5-flare']);
const RULES: Record<TelemetryEventName, Record<string, readonly JsonScalar[] | 'number' | 'boolean'>> = {
  'turn.started': { input_mode: ['typed', 'voice'], question_length: 'number' },
  'answer.http': { attempt: 'number', status: 'number', duration_ms: 'number', content_type: ['ndjson', 'json', 'other'] },
  'answer.opening': { phase: ['first', 'complete'], duration_ms: 'number' },
  'answer.result': { model: [...MODEL_VALUES], route: ['quick', 'standard', 'research'], subagent_count: 'number', server_elapsed_ms: 'number', duration_ms: 'number' },
  'image.lifecycle': { phase: ['requested', 'ready', 'error', 'cancelled', 'stale'], status: 'number', duration_ms: 'number', model: [...MODEL_VALUES], cached: 'boolean' },
  'model.lifecycle': {cached:'boolean',persisted:'boolean',phase: ['requested', 'ready', 'error', 'cancelled', 'stale'], point_count: 'number', duration_ms: 'number', model: [...MODEL_VALUES] },
  'voice.response': {phase:['first_transcript','first_audio']},
  'voice.status': { status: ['off', 'checking_availability', 'requesting_microphone', 'microphone_muted', 'connecting', 'reconnecting', 'awaiting_session_start', 'started', 'finalizing', 'closed', 'startup_timeout', 'disconnected', 'error'] },
  'navigation.command': { command_type: ['flyTo', 'flyToLocation', 'setScale', 'setPerspective', 'focusLayer', 'highlightTarget', 'showProceduralModel', 'clearProceduralModel', 'showLibraryModel', 'focusModelPart', 'cancelWorldTurn', 'resetView'], index: 'number', ok: 'boolean', duration_ms: 'number', tier: ['planet', 'region', 'city', 'street'], perspective: ['aerial', 'horizon', 'cutaway'], busy: 'boolean', target_kind: ['catalogue', 'dynamic', 'none'] },
  'turn.cancelled': { reason: ['user', 'superseded', 'unmount'] },
  'turn.error': { error_kind: ['network', 'http', 'unreadable', 'validation', 'navigation', 'unknown'] },
  'turn.finished': { outcome: ['completed', 'navigation_only', 'error', 'cancelled', 'stale'] },
};

export type TelemetryErrorKind = 'network' | 'http' | 'unreadable' | 'validation' | 'navigation' | 'unknown';
export function navigationTurnOutcome(ok: boolean): 'completed' | 'error' { return ok ? 'completed' : 'error'; }
export function classifyTelemetryError(error: unknown, hint?: TelemetryErrorKind, status?: number): TelemetryErrorKind {
  if (hint) return hint;
  if (typeof status === 'number' && status >= 400) return 'http';
  if (error instanceof SyntaxError) return 'unreadable';
  if (error instanceof TypeError) return 'network';
  if (error instanceof Error && error.name === 'ZodError') return 'validation';
  return 'unknown';
}

function defaultUuid(): string {
  return globalThis.crypto?.randomUUID?.() ?? `00000000-0000-4000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`;
}

function byteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function normalize(name: TelemetryEventName, input: Metadata): Record<string, JsonScalar> {
  const rules = RULES[name];
  const output: Record<string, JsonScalar> = {};
  for (const [key, value] of Object.entries(input)) {
    const rule = rules[key];
    if (!rule || value === undefined) continue;
    if (rule === 'number') {
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) output[key] = Math.round(value);
    } else if (rule === 'boolean') {
      if (typeof value === 'boolean') output[key] = value;
    } else if (rule.includes(value)) output[key] = value;
  }
  return output;
}

export function createTelemetryRecorder(overrides: Partial<Clock> = {}) {
  const clock: Clock = {
    now: overrides.now ?? (() => Date.now()),
    monotonic: overrides.monotonic ?? (() => globalThis.performance?.now?.() ?? Date.now()),
    uuid: overrides.uuid ?? defaultUuid,
  };
  const sessionId = clock.uuid();
  const started = clock.monotonic();
  const turns = new Set<string>();
  let events: StoredEvent[] = [];
  let sequence = 0;
  let evicted = 0;

  function beginTurn(inputMode: 'typed' | 'voice', questionLength: number): string {
    const turnId = clock.uuid();
    turns.add(turnId);
    while (turns.size > MAX_REGISTERED_TURNS) turns.delete(turns.values().next().value as string);
    record('turn.started', { input_mode: inputMode, question_length: Math.max(0, questionLength) }, turnId);
    return turnId;
  }

  function record(name: TelemetryEventName, metadata: Metadata = {}, turnId?: string): void {
    if (!TELEMETRY_EVENT_NAMES.includes(name) || (turnId !== undefined && !turns.has(turnId))) return;
    const event: StoredEvent = Object.freeze({
      sequence: sequence++, at_ms: clock.now(), elapsed_ms: Math.max(0, Math.round(clock.monotonic() - started)),
      name, ...(turnId ? { turn_id: turnId } : {}), metadata: Object.freeze(normalize(name, metadata)),
    });
    events.push(event);
    while (events.length > MAX_TELEMETRY_EVENTS || byteLength(events) > MAX_TELEMETRY_BYTES - 2048) {
      events.shift(); evicted++;
    }
  }

  function snapshot() {
    return {
      report_version: TELEMETRY_REPORT_VERSION,
      app_build: currentVersion,
      generated_at: new Date(clock.now()).toISOString(),
      privacy: 'Local tab memory; metadata allowlist; no raw text, URLs, coordinates, media, credentials, or remote upload.',
      session_id: sessionId,
      limits: { max_events: MAX_TELEMETRY_EVENTS, max_bytes: MAX_TELEMETRY_BYTES, max_registered_turns: MAX_REGISTERED_TURNS, registered_turns: turns.size, evicted },
      events: events.map(event => ({ ...event, metadata: { ...event.metadata } })),
    };
  }

  function exportJson(): string { return JSON.stringify(snapshot(), null, 2); }
  function clear(): void { events = []; turns.clear(); evicted = 0; }
  return { beginTurn, record, snapshot, exportJson, clear };
}

type TelemetryRecorder = ReturnType<typeof createTelemetryRecorder>;
let browserRecorder: TelemetryRecorder | null = null;
function getBrowserRecorder(): TelemetryRecorder | null {
  if (typeof window !== 'object') return null;
  return browserRecorder ??= createTelemetryRecorder();
}
function emptySnapshot() {
  return {
    report_version: TELEMETRY_REPORT_VERSION, app_build: currentVersion, generated_at: '',
    privacy: 'Unavailable outside a browser tab; no telemetry was initialized.', session_id: '',
    limits: { max_events: MAX_TELEMETRY_EVENTS, max_bytes: MAX_TELEMETRY_BYTES, max_registered_turns: MAX_REGISTERED_TURNS, registered_turns: 0, evicted: 0 },
    events: [] as StoredEvent[],
  };
}

/** Lazy browser-only facade. SSR import and server calls never create clocks, IDs or shared state. */
export const telemetry = Object.freeze({
  beginTurn(inputMode: 'typed' | 'voice', questionLength: number): string { return getBrowserRecorder()?.beginTurn(inputMode, questionLength) ?? ''; },
  record(name: TelemetryEventName, metadata: Metadata = {}, turnId?: string): void { getBrowserRecorder()?.record(name, metadata, turnId); },
  snapshot() { return getBrowserRecorder()?.snapshot() ?? emptySnapshot(); },
  exportJson(): string { return JSON.stringify(getBrowserRecorder()?.snapshot() ?? emptySnapshot(), null, 2); },
  clear(): void { getBrowserRecorder()?.clear(); },
});

export function downloadTelemetryReport(): void {
  if (typeof document !== 'object' || typeof URL?.createObjectURL !== 'function') return;
  const blob = new Blob([telemetry.exportJson()], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = `terra-astra-debug-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  link.click();
  URL.revokeObjectURL(href);
}
