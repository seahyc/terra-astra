# Run 1 — richness and responsiveness

Current authority: [TERRA × ASTRA — Richness + Responsiveness Run v4](https://docs.google.com/document/d/1VolxqC5D-mFjPd0ypT5m9MMIgaLPZJ3wAkvh7b9saxo/edit), read 13 September 2026 at approximately 13:42 SGT, modified 13:38:40 SGT. Supplements Visual Grammar v1 and Execution v3. Historical 14:00 freeze is superseded: Run 1 checkpoint 14:15, Run 2 polish 14:15–14:40, hard feature freeze 14:40 SGT.

Start: existing clean `46f70f9a4a0870c3bc7d91bdaa49459ca4860723`, public v0.6.1 `c2165327f342ef01e1a55033f16e9ec9cff1a565`. Integration branch `hackathon/run1-richness`; previous branches/tags remain intact.

Scope: scale responsiveness first, denser orbit/air/sea movement, understated illustrative undersea connectivity, surrounding city LOD, two-shell distant stars, bounded ocean/relief improvement, focused keyboard controls if safe. No new renderer/framework/backend, Live-provider integrations, cities or personas. Preserve the YC WorldCommand interface and serialized results.

Ownership: renderer/camera exclusively `hackathon/run1-renderer`; typed movement/cables exclusively `hackathon/run1-signals`; city-continuation and procedural urban data exclusively `hackathon/run1-urban`. Integration owns app UI, docs, release, native measurements and publication. Renderer responsiveness must land before richness integration.

Baseline native measurement on the existing public v0.6.1, Mac WebGL at 1027×989 CSS pixels: Singapore entry settled in 6,876ms; warm City→Street in 6,877ms; warm Street→Region in 6,917ms. Observed rolling render rate remained approximately 120fps. The first changed coordinate text appeared 401ms after entry, but that text updates only every 500ms and is not a precise first-motion measurement. Source shows every scale command uses a 6,800ms flight; cold city fetch, sorting, geometry and urban preparation also precede camera start. No network-cold browser measurement is claimed from these already-open session samples.

## Integrated verification — before publication

Responsiveness landed before richness. Native Mac WebGL candidate measurements at the same 1027×989 CSS viewport:

| Journey | v0.6.1 | Run 1 |
| --- | ---: | ---: |
| Singapore City → Street | 6,877ms | 1,201ms |
| Singapore Street → Region | 6,917ms | 1,206ms |
| New York City → Street | not measured | 1,186ms |
| Singapore full entry | 6,876ms | 6,854ms |

Full destination flights intentionally retain the 6.8-second journey. The 1.1-second scale command preserves FIFO ordering and resolves after actual camera settlement. Engine diagnostics recorded SG City→Street queue 4.3ms, camera start 0.1ms after execution, actual command duration 1,106.5ms; next scale queue 3.6ms and duration 1,108.4ms. Coordinate labels update every 500ms and are not used to claim first motion.

Preparation moved before the click: the native idle warm-up observed SG fetch 7.1ms / preparation 113.9ms and NY fetch 8.9ms / preparation 42.1ms. These are local session measurements, not network-cold production benchmarks. A deterministic held-fetch test independently verifies camera movement while the detail response is blocked. Repeated journeys reuse prepared geometry.

Native rolling render diagnostics stayed near 120fps / 8.3ms during the measured SG/NY journeys. At 390×844 browser width, the planet, destination panel and all three layer controls fit. This is not physical-phone performance proof. Native browser console showed no warnings/errors in the reviewed candidate.

Source tests cover TypeScript, response/FIFO/settlement, Genesis stable endpoints and replay, world lifecycle, shell and cable geography, bounded/cached city continuation, road-constrained activity, keyboard typing/modifier guards, memory and transformation. The inert test harness intentionally cannot create WebGL; native visual verification is separate.

Cuts: sophisticated cable sources, live providers, advanced new terrain/ocean-current refinements, accurate broader OSM ingestion. Existing ETOPO relief and subtle ocean motion remain. Outside-core city fields are openly illustrative. No additional cities, backend or persona scope.

Integration risk: YC public WorldCommand contract remains unchanged, but no current YC Live conversation implementation is present on the inspected remote branches. Existing 90-second video documents v0.6; recording the final integrated build belongs to the next polish/recording window. GitHub repository remains private pending judge-access arrangements.

Publication SHA, tag and saved-version evidence are appended after terminal deployment verification.
