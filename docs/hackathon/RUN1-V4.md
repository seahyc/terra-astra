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


## Run 1 navigation correction

Native review found the inherited primary button always offered Singapore, including from New York region. v0.7.1 routes that button through the existing WorldCommand path: New York region → New York city (1,208ms observed); Challenger Deep → planet (1,191ms), then the opening Singapore action is available. This changes no renderer or public command contract. Challenger's angled seafloor remains visible; its heavier regional view observed about 96–97fps rather than the 120fps SG/NY samples.

v0.7 source d755cf146035319c464b6cb8a7ff7cf9b9036453 is preserved as an annotated tag and Sites version 10. Deployment appgdep_6aa63c1266bc8191a28f76f410a03ffb succeeded at 14:01:04 SGT. v0.7.1 is a subsequent bounded correction, not a moved tag.

## Delivered checkpoint — 14:07 SGT

- Integration branch: `hackathon/run1-richness`; GitHub `main` includes the same application.
- Application source: `0e8bc71209a9d89a44986ab75bf2e124af990d07`, annotated tag `v0.7.1`.
- Public app: https://terra-astra.riffster.chatgpt.site/
- Saved Sites version 11: `appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_07f14b5b6e208191aef3c495b0eb8196`.
- Deployment `appgdep_6aa63d19b8108191b7b8cf0233e545c8` succeeded at 14:05:27 SGT. The first archive upload timed out before saving; retry succeeded. Audience remains public. v0.7 and v0.6.1 remain preserved.
- Public native WebGL readback shows v0.7.1, completed Genesis and the retained Singapore journey. City→Street settled in 1,207ms. Engine queue 0.2ms, camera start 0.1ms after execution, actual command duration 1,102.8ms, rolling rendering 120fps.
- Public idle warm-up recorded SG fetch 226.0ms / preparation 140.1ms; NY fetch 631.0ms / preparation 54.7ms. Both were ready before the measured click. This demonstrates removal of those costs from repeated scale navigation; it does not claim globally cold-network latency.
- Native desktop review confirms visible dim extension north of New York's accurate core, retained Singapore city/street activity, and the Challenger angled seafloor. The change in detail density between accurate and illustrative city fields remains noticeable and is a suitable final visual polish target.
- Final evidence is outside the app bundle at `../demo-tooling/run1/final-metrics.json` and `../demo-tooling/run1/ny-city-final.png`. Build, focused automated checks and native browser review passed. Physical-phone performance remains unverified.
- GitHub remains private; the pre-hackathon tag still resolves to `9b9e2ec4ef3534b463e20d4d08c4ae3de444843d`. Existing source milestones were not rewritten.

Maximum three priorities for 14:15–14:40:
1. Integrate and prove YC Live → visible New York navigation using the unchanged WorldCommand bridge.
2. Tune the city-core/context blend and shell exposure on the actual demo display; add no datasets or renderer architecture.
3. Record the final exactly 90-second demo and confirm judge repository access. The preserved existing demo still shows v0.6.

Run 1 scope is closed. This checkpoint documentation may be a later commit than the deployed application source above; it changes no app behavior.
