# Local Agents API + GPT-Live proof

This is a local development harness, not a released change to the hosted Earth experience.

1. Put a project API key from the credited organization in the gitignored root `.env.local` as `OPENAI_API_KEY=...`. Never put it in this directory or client code.
2. Run `npm run probe:agents` to verify a real coordinator function callback, exactly two native subagents, a completed coordinator turn and a nonempty answer.
3. Run `npm run probe:live`, then open `http://127.0.0.1:5180`. Start voice and ask the displayed Java terrain question. Allow microphone access when prompted. Interrupt with “Show me the deepest part.” Listen to verify the actual audible response.

The server is loopback-only. It reads the key on the server and exchanges the WebRTC offer with GPT-Live. Client delegation calls the Agents API and returns concise evidence to GPT-Live. Local origin checks are not production authentication; do not expose this harness publicly. The hosted integration will use authenticated Sites routes and hosted secrets.

The Java profile is generated from the existing NOAA relief grid with `node scripts/prepare-sea-profile.mjs`. It contains 121 bilinear samples from a coarse 0.25-degree grid. Sample spacing does not improve source resolution. The roughly 6.3 km range is specific to the displayed profile, not a summit-height or whole-trench maximum measurement.

`npm run probe:test` runs network-free fixtures. Those fixtures do not prove account/model access, actual native delegation, or audible voice. A successful Live startup also does not prove that speech was received or heard. The page exposes these outcomes separately.

Agents runs are bounded to 120 seconds plus cleanup. Incomplete runs request cancellation before session deletion. A sanitized, gitignored `probe-report.json` records the result. Voice conversations have a 180-second limit plus a graceful-close window. API calls incur usage; source rendering and fixture tests do not.

Contracts verified against official documentation:

- [GPT-Live WebRTC](https://developers.openai.com/api/docs/guides/voice-webrtc?api=live)
- [Client delegation](https://developers.openai.com/api/docs/guides/live-delegation)
- [Native Agents multi-agent](https://developers.openai.com/api/docs/guides/agents-api/multi-agent)
- [Coordinator function results](https://developers.openai.com/api/docs/guides/agents-api/tools/functions)
- [Session lifecycle](https://developers.openai.com/api/docs/guides/agents-api/sessions)

Launch the local backend with the canonical project configuration: `node --env-file=.env.local tools/api-probe/server.mjs`. The agent probe reads the same `.env.local` configuration through the npm script.

The browser demo currently supplies measured inventory directly to the Agents coordinator (`inventory_source: server_inline`). Native subagents still run through the real Agents API. The separate CLI defaults to the function-callback probe; use `PROBE_INVENTORY_MODE=inline` for the demo path. This isolates an observed intermittent provider HTTP 424 function transport failure. Success requires two created subagents and completed saved child turns; a completed wait-tool item alone is insufficient.

## Integrated globe preview

The original application at `http://localhost:5173/` now includes the microphone, question shortcuts, captions and evidence panel. Run the normal `npm run dev` alongside this loopback API server. The Vite development proxy routes `/api/terra/*` to port 5180; this is a local integration, not a hosted API deployment. Keep the key only in the server-side `.env.local`.

Each supported question selects cached evidence and starts the original Earth's geographic camera journey immediately. The backend independently computes the same measurement and runs the two native researchers. The client waits for the actual scene revision to be ready before forwarding the explanation to GPT-Live. Later requests cancel and suppress stale answers. Spoken mentions pulse the geographically projected labels.


## Open geographic questions

The local globe now accepts questions beyond the three measured examples. Cached measurement questions retain deterministic source-backed evidence. Other questions use two native Agents subagents to produce a concise background explanation and up to four validated geographic orientation anchors; GPT-Live uses the same submission handler. Common place names move immediately. Other places appear after the validated answer returns. The last generated answer is provided as conversation context for follow-ups.

General answers are explicitly labelled background knowledge, not current source verification. They do not create historical borders, migration routes, live traffic, satellite layers or global street data. Location coordinates are approximate and bounded. Context scenes carry `measurement: null` and no fabricated evidence or route lines. The existing renderer handles their camera journey. The native Agents step took about 41 seconds in the Malacca browser test; it is not instantaneous.

The visible answer uses the shared serif typography, a compact caption, restrained violet-white focus, selectable locations, and collapsed measurements/sources. Tests: `node scripts/check-world-answer.mjs`, `node scripts/check-evidence.mjs`, `npm run probe:test`.

## Progressive narration and starlight geometry

Browser `/api/answer` requests now use NDJSON. A short Responses API opening streams in parallel with the two native Agents researchers. Text is shown incrementally; its completion is forwarded to GPT-Live commentary before the deeper answer finishes. The opening is labelled as context while details are checked. It is optional and bounded to 20 seconds; failure does not block the full answer. Disconnect/cancel aborts both paths. A lightweight loading shape appears immediately. Final text uses a sentence-sized lead; an active voice session displays its current spoken sentence.

Geographic context now uses the existing horizon camera, preserving the selected anchor when switching overhead/horizon. Angkor Wat is the first curated sculpted landmark. Its 13,360 deterministic particles share the globe's actual star shader, shimmer, glow, reveal and Canvas fallback. The five towers, terraces, galleries, causeway and moat are schematic, with exaggerated height for readability; this is not a surveyed reconstruction. Other places continue to use geographic context until an appropriate geometry asset is supplied. Reference: https://www.earthobservatory.nasa.gov/images/5112/angkor-wat and https://whc.unesco.org/en/list/668.

Streaming contract check: `node scripts/check-opening.mjs`. Geometry generator: `lib/terra/sculptures/angkor-particles.ts`.
