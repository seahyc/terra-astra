# Integrated model library (local candidate)

This change extends the existing globe and WorldCommand engine. It does not publish a new Site or replace the scene/camera. The previous procedural schema and endpoint remain supported.

## Runtime

- `GET /api/terra/models` returns six prepared/approved entries plus at most 50 recent generated entries. Prepared entries: Angkor, measured Java transect, container terminal, data centre, schematic Manhattan, approved generated wind turbine.
- Authenticated `POST /api/terra/library-model` accepts `{query, preferredId?}`. Exact hashed queries hit shared D1 without inference. Semantic selection sees the six prepared entries and at most eight indexed generated candidates. New recipes use Luna strict structured JSON inside a real native Agents function callback.
- Recipe generation has a 15-second deadline. Native session startup has a separate bounded allowance; total model latency is longer. The Worker schedules bounded native-session cleanup with `waitUntil`. Cleanup may remain unconfirmed after upstream errors; this is not reported as confirmed deletion.
- Live starts a central explanation independently. Backend evidence and model generation run concurrently. A failed model leaves the answer available. Named parts can be selected, and matching received Live transcript phrases highlight parts. This is transcript-level synchronization, not phoneme synchronization.
- Model clouds use the existing star shader, with geographic tangent transforms, scale derived from bounds, ground contact, progressive reveal, and the engine's horizon orbit. Generated models have no authority to invent geographic anchors or graph values.
- `cancelWorldTurn` invalidates queued engine work and stops an active camera journey. Request abort/revision checks suppress stale model and narration submissions.

## Durable storage

`.openai/hosting.json` declares D1 binding `DB`. The Drizzle migration creates recipes, SHA-256 query mappings and a term index. Atomic D1 batches deduplicate content across visitors and processes. Titles, component labels, bounded geometry and provenance are stored; raw questions, conversations, audio and credentials are not stored. Generated titles/labels are instructed to contain generic public subject/component names only. Geometric validation does not verify factual accuracy.

The public catalogue is intentionally shared, as requested. Do not put personal information into model titles or parts. Generated models without a successful save remain visible for their current answer and report that saving is unavailable.

Local preview uses the actual Worker route (the old port-5180 proxy is removed). Put local Worker secrets in ignored `.dev.vars`, never in source. Generate/build, then apply the D1 migration locally:

```
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_certain_william_stryker.sql
npm run dev -- --host 127.0.0.1 --port 5203
```

The migration must be applied only once to each local database. Deployment provisions the shared D1 binding and applies migrations separately; no production deployment or production persistence verification is claimed here.

## Observed verification, 13 September 2026

- Real browser, original WebGL globe: Angkor's five-tower model rendered, 13,360 points. First answer 4.31 s; model attached after camera journey 9.58 s in this run.
- Real Live session: first received output transcript for piston-pump question at 5.73 s. The model failed during that early run; the explanation remained usable. This proves received Live transcript concurrency, not an audible physical-device timing measurement.
- Real Worker + native Agents + Luna: new lighthouse returned HTTP 200, one `compose_model_recipe` call, accepted native tool result, persisted to D1. Total 26.76 s, recipe step 8.015 s. The exact follow-up reused D1 in 55 ms with no inference. These are individual runs, not service guarantees.
- Initial native attempts exposed missed required-action snapshots and invalid unconstrained dimensions; both paths now have fixes and regression coverage. Native session deletion is a separately bounded cleanup operation.
- Automated checks: all six finite geometry compilers; strict recipe limits; real-protocol tool stream/snapshot fixtures; deadline and cancellation; D1-compatible SQLite persistence across reopen, deduplication and hashed lookup; real-engine queued command cancellation; existing procedural, Live controller, hosted API and telemetry checks; TypeScript and production build.

Pending final merged-checkout validation is recorded by the integrating task. No saved Sites version, release tag or publication is claimed for this local candidate.
