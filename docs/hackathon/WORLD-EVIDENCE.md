# World-depth handback

Implemented on `hackathon/world-depth`, isolated worktree `terra-astra-world`.

## Scope and behavior

- Extends the existing Three.js/WebGL renderer and its Canvas fallback. Preserves prepared assets, particle identities, original position buffers, Singapore city/stories, and the pre-hackathon release.
- `Engine.transform(open: boolean)` opens/reforms a deterministic volumetric spiral. The geographic source is never mutated. A frozen orthonormal frame keeps opening/reversal continuous after camera rotation. Correlated spiral lanes, unequal radial spread and real depth retain negative space and layered matter. Existing relief/body/interior/halo layers remain independently budgeted.
- `Engine.personal(places: PersonalPlaces | null)` creates exactly three warm stars plus a three-edge connection. Separated Astra endpoints form an intentionally composed personal constellation. Reform endpoints are the visitor's actual geographic coordinates, artistically lifted 8.5% above the Earth radius. Geographic threads use spherical interpolation; antipodal interpolation has a deterministic fallback. Far-side personal light remains perceptible through the luminous body rather than being depth-occluded.
- Global return framing uses vectors and a bounded candidate search, avoiding arithmetic longitude means, dateline failure and Singapore-only camera clamps. Nearby places are distinct in Astra and can gather into one warm residual light at globe scale.
- Optional `transformation(state)` callback reports phases immediately and progress at most once per 120ms. `personalSettled()` fires once after a personal reform and settled camera, with about 1.1 seconds of hold when motion is enabled. A reversal suppresses stale settlement.
- Labels `data-star="personal-0"`, `personal-1`, `personal-2` project the same rendered warm stars. They are visible in settled Astra and hidden during travel/reform. UI remains the integration owner's responsibility.
- Other camera actions are serialized while morphing. Repeated reverse calls continue from the current progress. Reduced motion immediately reaches endpoints on the next frame, including an already-running transition. Study views normalize on opening. Singapore remains reachable once returned to Earth.
- `host.dataset.renderFps`, `renderFrames`, `renderFrameMs` report actual render-call diagnostics once per second. These count native render calls, not scheduled animation callbacks. Paused rendering reports its last sample.

## Validation performed

- `node scripts/check-transformation.mjs`: 2,000 bounded deterministic reversible source trajectories; original buffers unchanged; dateline, antipodal, zero-sum, nearby and intercontinental triples; three distinct Astra endpoints; desktop and 390 x 844 projection; camera action serialization; reversal; reduced-motion endpoints; one settlement notification; Singapore re-entry.
- `node scripts/check-memory.mjs`: existing Globe/Horizon/Cutaway, two geographic regions, close zoom, all fictional lives, return timing, phone panel fitting and renderer disposal.
- `node scripts/check-depth.mjs`: existing 296,171 prepared spatial particles, source registration, elevation/bathymetry, geographic bounds and city transition.
- `node scripts/check-choreography.mjs`: existing 482 geographic flight frames and 1,446 remembered return projections.
- TypeScript (`--noEmit --incremental false`), targeted ESLint and `git diff --check` pass.

## Honest limits

These checks use deterministic math and an inert Canvas lifecycle. They do not prove browser pixels, shader compilation, FPS, native GPU quality or physical-device behavior. The integration owner must inspect the complete UI in native WebGL and the actual Canvas fallback before claiming those results. No local browser was opened by this worker. No dependency, app UI, release metadata, shared contract, Sites configuration or publication was changed. No push or deploy was performed.
