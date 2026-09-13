# Terra/Astra debug telemetry design

Status: **first local-only slice implemented 2026-09-13**. The bounded in-tab recorder, answer/image/navigation/voice lifecycle capture, export/clear UI, runtime allowlist, and focused checker are implemented. Cross-client/server trace propagation, server stages/provider request IDs, detailed WebRTC state, and FPS summaries remain proposals.

## Objective and privacy boundary

Give a user enough information to export a bounded debug report for one broken Terra/Astra interaction without creating a remote analytics system. The first implementation should keep a capped ring buffer in the browser and expose an explicit **Export debug report** action. Recording is metadata-only by default.

The recorder must not store the raw question, transcript, answer, source URLs, image prompt, image bytes/data URL, SDP, audio, API key, authorization/cookie headers, user ID, IP address, full provider error body, stack trace, or arbitrary event payload. It may store allowlisted enums, booleans, counts, durations, byte-length buckets, HTTP status, sanitized error codes, generated opaque IDs, and renderer state drawn from the typed `WorldState` allowlist. No events are sent off-device unless a later, separately authorized and provisioned sink is added.

Recommended local retention is the lesser of 500 events, 512 KiB after JSON serialization, or the current tab lifetime. Evict oldest events first. Clear on reload, explicit **Clear debug data**, and immediately after a successful export if the user chooses “export and clear.” Export requires a user gesture and a short disclosure that the file describes recent interaction timings and visual state. Diagnostic recording can be on by default because it is local, ephemeral, and metadata-only; any future capture of content or remote persistence requires a separate opt-in and retention policy.

## Current evidence and gaps

The current code has useful signals, but no diagnostic recorder consumes them:

| Area | Evidence in current code | Debugging gap |
| --- | --- | --- |
| Answer turn and stale work | `GlobeVoice.tsx:64-67` increments a revision and aborts earlier answer/image work; `:116`, `:121`, `:140`, `:149`, `:162`, `:167`, and `:176` silently drop aborted or superseded callbacks. | No turn ID, cancellation reason, stale-event count, or elapsed stage is retained. A late event is indistinguishable from code that never ran. |
| Answer HTTP and stream | `GlobeVoice.tsx:109-115` retries HTTP 409 up to 12 times; `answer-stream.ts:8-12` handles opening/result/error event types and `:22` detects an incomplete stream. | No attempt number, response status per attempt, first-byte/opening/result latency, stream event count, parse-error code, or shared trace ID. Stream events carry no correlation metadata. |
| Server lifecycle | `http-handler.mjs:5-6` holds only active/rate-limit maps; `:58-74` emits started/opening/result/error and collapses internal exceptions to one message; `:80-82` sanitizes the API key from surfaced errors. | No structured server event, stage, status, duration, request/turn trace ID, or sanitized failure code. The broad catch at `:73` discards which stage failed. Maps are operational state, not telemetry. |
| Routing and models | `answer-router.mjs:53` starts a timer; `:69`, `:78`, and `:83` return total `elapsed_ms`, route, model, and subagent count. Provider non-OK status is available at `:43`; router failure is intentionally swallowed at `:60-64`. | Only total latency reaches the result. Router versus answer versus research stage latency, fallback occurrence, server status, and provider request ID are absent. Provider error status becomes an untyped message. |
| World commands | `world-navigator.ts:167-180` dispatches commands in order, counts accepted commands, and stops on cancellation/rejection. `bridge.ts:33-38` validates, executes, publishes a result event, and can read current state at `:21`/`:31-32`. | No command ID/turn ID, queued timestamp, settle latency, or explicit accepted/settled distinction. `WORLD_RESULT_EVENT` contains the result but no post-settle actual `getState()` snapshot, so intended command and rendered state cannot be compared. |
| Image lifecycle | `GlobeVoice.tsx:125-145` records loading in UI state, validates the response, suppresses stale/aborted completions, and exposes only a generic failure. | No linked turn ID, requested/HTTP/decoded/rendered/failed/cancelled phases, latency, status, model, cache hit, encoded-size bucket, or stale completion event. The image content and prompt must remain excluded. |
| WebRTC/live voice | `live-controller.ts:224-284` handles session/transcript/delegation/close/error events; `:291-309` times out ICE; `:321-328` times out startup; `:331-416` advances availability, microphone, offer, session HTTP, and remote-description states; `:364-381` reacts to connection/data-channel failure. | UI callbacks receive strings, not timestamps or structured state transitions. No session trace, HTTP status/latency, ICE/peer/data-channel state history, timeout code, or stale-generation count is retained. Raw provider error messages and serialized usage currently reach UI (`:217-220`, `:274-281`) and must not be copied wholesale into an export. SDP and audio must never enter telemetry. |
| FPS/render health | None of the audited files samples frame cadence. | No render-health evidence around navigation. Add a summarized sampler at the renderer boundary later: aggregate count, duration, average FPS, p95 frame time, and frames over 50 ms; never store per-frame events. |
| API composition | `app/api/terra/[...path]/route.ts:11-17` wires models and services into one handler. | There is no injected telemetry interface or remote store. This is desirable for the local-only first slice; server correlation should return metadata to the client rather than persist logs remotely. |

Evidence was collected read-only with these exact commands (outputs contained source code and line numbers, no secrets):

```sh
rg -n "telemetry|trace|request|turn|latency|provider|status|error|WorldCommand|queue|accept|settle|reject|image|WebRTC|RTC|cancel|stale|fps|console\\.|logger|log\\(|answer|render" components/terra-voice/GlobeVoice.tsx components/terra-voice/live-controller.ts components/terra-voice/answer-stream.ts components/terra-voice/world-navigator.ts lib/world/bridge.ts lib/terra/server/http-handler.mjs lib/terra/server/answer-router.mjs app/api/terra
nl -ba components/terra-voice/GlobeVoice.tsx | sed -n '35,225p'
nl -ba components/terra-voice/live-controller.ts | sed -n '35,430p'
nl -ba components/terra-voice/answer-stream.ts
nl -ba components/terra-voice/world-navigator.ts | sed -n '155,190p'
nl -ba lib/world/bridge.ts
nl -ba lib/terra/server/http-handler.mjs | sed -n '1,100p'
nl -ba lib/terra/server/answer-router.mjs | sed -n '35,90p'
nl -ba 'app/api/terra/[...path]/route.ts'
```

## Minimal event architecture

Add a client-only `DebugRecorder` singleton with `record(allowlistedEvent)`, `snapshot()`, `clear()`, and `exportReport()`. It stores compact normalized events in an array-backed ring buffer and recalculates serialized size on insertion. All callers pass typed fields; the recorder rejects unknown keys and never accepts a generic `payload`, `message`, `Error`, `Request`, `Response`, SDP, transcript, or content string.

Use three opaque identifiers generated with `crypto.randomUUID()`:

- `report_session_id`: created once per page load.
- `turn_trace_id`: created at the beginning of `ask`, sent as `X-Terra-Trace-Id` on `/answer`, `/image`, and `/agents/cancel`, and included in each NDJSON envelope and JSON response. The server validates it as UUID-like and creates one if missing. It is diagnostic correlation only, never an authorization key.
- `operation_id`: generated for each WorldCommand, image request, and WebRTC startup. `parent_operation_id` may link follow-up perspective/navigation commands to the answer turn.

The server remains stateless for this slice. It returns allowlisted stage metadata to the requesting client in `Server-Timing` and stream events. A single terminal `trace.summary` NDJSON event should contain route, model identifier, stage durations, final HTTP/provider status class, sanitized error code, and provider request ID if the provider supplied a safe opaque request header. Do not echo raw provider headers. `/session` and `/image` JSON may include the same `trace` object. This preserves client/server correlation without remote persistence.

All events share `{schema_version:1, at_ms, monotonic_ms, report_session_id, turn_trace_id?, operation_id?, category, name}`. Wall-clock time is useful for support correlation; durations use `performance.now()`/monotonic time.

### Allowlisted events and fields

| Category / event | Additional allowed fields |
| --- | --- |
| `turn.started` | `input_chars_bucket` (`0-40`, `41-200`, `201-1000`, `1001-8000`), `source` (`typed`,`voice`) |
| `turn.http` | `endpoint`, `attempt`, `status`, `latency_ms`, `response_bytes_bucket` |
| `turn.stream` | `phase` (`started`,`opening_first`,`opening_done`,`result`,`error`,`incomplete`,`parse_error`), `elapsed_ms`, `event_count` |
| `turn.cancelled` / `event.stale_ignored` | `stage`, `reason_code` (`user_cancel`,`superseded`,`unmounted`,`timeout`,`transport_abort`), `count` |
| `server.stage` | `stage` (`authorize`,`rate_limit`,`parse`,`plan`,`route`,`answer`,`research`,`image`,`live_session`), `outcome`, `latency_ms`, `http_status`, `provider_status`, `provider_request_id`, `model`, `route`, `web_searched`, `error_code` |
| `world.command` | `phase` (`queued`,`accepted`,`settled`,`rejected`,`cancelled`), `command_type`, safe command enum fields, `queue_depth`, `latency_ms`, `error_code`, `actual_state` |
| `image.lifecycle` | `phase` (`requested`,`response`,`decoded`,`rendered`,`failed`,`cancelled`,`stale_ignored`), `status`, `latency_ms`, `model`, `cached`, `encoded_bytes_bucket`, `error_code` |
| `webrtc.state` | `component` (`permission`,`ice_gathering`,`peer`,`data_channel`,`session`), `from`, `to`, `latency_ms`, `status`, `error_code` |
| `render.summary` | `window_ms`, `frame_count`, `average_fps`, `p95_frame_ms`, `over_50ms_count`, `visibility_state` |

`actual_state` is a fresh post-settle snapshot from `getState()`, reduced to an explicit schema: current target/catalogue ID when present, scale tier, perspective, enabled layer enums, and coarse camera/render mode fields already public in `WorldState`. Do not record free-text labels, arbitrary coordinates beyond commands already defined as public geography, matrices, textures, or renderer objects. A command becomes `accepted` when validation succeeds and renderer execution begins; it becomes `settled` only after the execute promise resolves and the post-state snapshot is taken. A resolved `ok:false` becomes `rejected`.

Errors are mapped at their source to codes such as `ANSWER_HTTP_429`, `ANSWER_STREAM_INCOMPLETE`, `ANSWER_ROUTE_FALLBACK`, `PROVIDER_HTTP_5XX`, `WORLD_NOT_READY`, `WORLD_VALIDATION`, `WORLD_EXECUTION`, `IMAGE_HTTP`, `IMAGE_SCHEMA`, `WEBRTC_PERMISSION`, `WEBRTC_ICE_TIMEOUT`, `WEBRTC_SESSION_HTTP`, `WEBRTC_AUTOPLAY`, and `STALE_GENERATION`. Export `error_code`, status, and stage only. Never export `error.message`, response bodies, stack traces, or rejected payloads.

## Recommended first implementation slice

Keep the first slice to the answer/world/image paths and local export. Defer FPS and detailed WebRTC instrumentation until the recorder contract is proven.

1. Add `components/terra-voice/debug-recorder.ts` with the strict event union, bounded ring buffer, recursive forbidden-key/value guard, JSON export schema, and browser download helper.
2. Add `components/terra-voice/debug-recorder.test.ts` for redaction, bounds, ordering, and export behavior.
3. Update `GlobeVoice.tsx` to create the turn trace, record answer attempts/stream/image/cancellation/stale decisions, attach `X-Terra-Trace-Id`, and render **Export debug report** plus **Clear debug data** near the existing controls.
4. Update `answer-stream.ts` to accept structured lifecycle callbacks and retain the trace summary event without recording opening or answer text.
5. Update `world-navigator.ts` and `lib/world/bridge.ts` to carry operation/turn IDs outside the validated command payload, emit queued/accepted/settled/rejected/cancelled events, and record a post-settle `getState()` snapshot.
6. Update `http-handler.mjs` to validate/create the trace ID, include it in every response/stream event, measure stages, map sanitized error codes, and collect safe provider request IDs. Update `answer-router.mjs` to return per-stage metadata rather than only total elapsed time. The route composition file needs no storage binding for this slice.

Likely scoped files are the six audited client/server modules above, `app/api/terra/[...path]/route.ts` only if dependency injection is needed, the new recorder and tests, and this design. Do not add a database, analytics SDK, Worker binding, remote log drain, service worker, transcript hashing, or content opt-in in the first slice.

## Verification contract

The implementation is complete only if automated tests prove all of the following:

- **Redaction/allowlist:** attempts to record `query`, `question`, `transcript`, `answer`, `prompt`, `sdp`, `audio`, `apiKey`, `authorization`, `cookie`, `message`, `stack`, arbitrary nested objects, and unknown keys are rejected or removed. A fixture containing recognizable sentinel secrets must produce an export with zero sentinel matches.
- **Bounds:** after more than 500 events and more than 512 KiB of attempted records, the snapshot is at or below both caps, contains the newest valid events in order, and reports dropped/evicted counts without including their content.
- **Correlation:** one synthetic answer flow with a 409 retry, NDJSON opening/result, image request, and two WorldCommands has the same `turn_trace_id`; every operation has a unique ID; server trace metadata joins to the correct turn; a second turn cannot cross-link.
- **Error mapping:** provider 429/5xx, malformed NDJSON, incomplete stream, renderer throw/rejection, image schema failure, ICE timeout, and user cancellation export only the expected code/status/stage. Raw exception/provider text is absent.
- **Cancellation and stale events:** superseding a turn records one cancellation and summarized stale ignores while preventing late answer, image, and navigation events from being attributed to the new turn.
- **World truth:** accepted and settled are separate; settled includes the actual post-command state; rejection preserves the prior actual state; cancelled queued commands never appear as settled.
- **Image lifecycle:** requested through rendered can be distinguished from decoded-but-stale, aborted, HTTP failure, and schema failure without storing the brief, URL, or bytes.
- **WebRTC boundary:** when later instrumented, tests assert that only state enums/timings/status/code are recorded and that SDP, ICE candidate text, audio, transcripts, raw usage, and provider messages never appear.
- **FPS summarization:** when later instrumented, thousands of animation frames yield one bounded aggregate per sampling window and no per-frame records.

Run the recorder unit suite plus the existing focused answer-stream, navigation/bridge, handler/router, and live-controller tests. Validate the document itself with:

```sh
test -s docs/evals/TELEMETRY-DESIGN.md
rg -n "proposal only|500 events|512 KiB|X-Terra-Trace-Id|queued|accepted|settled|rejected|SDP|No events are sent off-device|Redaction/allowlist" docs/evals/TELEMETRY-DESIGN.md
```

The export should be support-readable JSON with `schema_version`, `generated_at`, `privacy` declaration, bounds/eviction counters, environment metadata limited to app build identifier, browser family/major version, viewport bucket, and device-pixel-ratio bucket, followed by the ordered events. Do not use exact user-agent strings or stable device identifiers.
