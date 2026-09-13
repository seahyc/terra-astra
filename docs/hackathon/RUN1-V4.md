# Run 1 — richness and responsiveness

Current authority: [TERRA × ASTRA — Richness + Responsiveness Run v4](https://docs.google.com/document/d/1VolxqC5D-mFjPd0ypT5m9MMIgaLPZJ3wAkvh7b9saxo/edit), read 13 September 2026 at approximately 13:42 SGT, modified 13:38:40 SGT. Supplements Visual Grammar v1 and Execution v3. Historical 14:00 freeze is superseded: Run 1 checkpoint 14:15, Run 2 polish 14:15–14:40, hard feature freeze 14:40 SGT.

Start: existing clean `46f70f9a4a0870c3bc7d91bdaa49459ca4860723`, public v0.6.1 `c2165327f342ef01e1a55033f16e9ec9cff1a565`. Integration branch `hackathon/run1-richness`; previous branches/tags remain intact.

Scope: scale responsiveness first, denser orbit/air/sea movement, understated illustrative undersea connectivity, surrounding city LOD, two-shell distant stars, bounded ocean/relief improvement, focused keyboard controls if safe. No new renderer/framework/backend, Live-provider integrations, cities or personas. Preserve the YC WorldCommand interface and serialized results.

Ownership: renderer/camera exclusively `hackathon/run1-renderer`; typed movement/cables exclusively `hackathon/run1-signals`; city-continuation and procedural urban data exclusively `hackathon/run1-urban`. Integration owns app UI, docs, release, native measurements and publication. Renderer responsiveness must land before richness integration.

Baseline native measurement on the existing public v0.6.1, Mac WebGL at 1027×989 CSS pixels: Singapore entry settled in 6,876ms; warm City→Street in 6,877ms; warm Street→Region in 6,917ms. Observed rolling render rate remained approximately 120fps. The first changed coordinate text appeared 401ms after entry, but that text updates only every 500ms and is not a precise first-motion measurement. Source shows every scale command uses a 6,800ms flight; cold city fetch, sorting, geometry and urban preparation also precede camera start. No network-cold browser measurement is claimed from these already-open session samples.

Checkpoint results, source SHA, cuts, before/after timings and deployment evidence will be appended before 14:15. Do not label this directive document as completed delivery before integration and validation.
