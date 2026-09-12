# Terra Astra — Earth, Constellated

v0.4 — A world with depth, 12 September 2026.

Release history and recovery: `CHANGELOG.md`, `lib/terra/releases.ts`, and `/history`. Proposed next feature build: `docs/NEXT-BUILD.md`.

v0.1 is preserved as saved Site version 1 (source d5e3ad98c03d8a5841e37b9bebe0bff045298535).

## Implemented experience
- A real geographic globe drawn from star point clouds, geographic threads, and historical city lights.
- Rotate, zoom, pause ambient motion, and tune glow, shimmer, thread strength, land density, and country boundaries.
- Guided descent into central Singapore using actual OSM street geometry.
- Three explicitly fictional human constellations with connections to real places.
- Select another life, close the story without forgetting the life, and return to orbit to reveal the closing line after a settled pause.
- Responsive controls and keyboard alternatives. Reduced-motion preferences are respected.
- GPU renderer and an automatic lower-detail Canvas2D fallback when WebGL is unavailable.

## Architecture
`app/terra-experience.tsx` owns the interface and narrative state. The dynamically imported `lib/terra/engine.ts` owns geographic coordinates, camera flight, point clouds, uniforms, pointer controls, and resource disposal. `lib/terra/canvas-renderer.ts` projects the same scene at reduced detail without WebGL. `lib/terra/stories.ts` contains fictional story content, separate from geography.

All coordinates use east-positive longitude and north-positive latitude. Earth coordinates use a unit reference sphere, with artistically exaggerated terrain radii at globe scale; a closer near plane is selected as the camera approaches Singapore. Geographic particles have stable positions, with brightness, halo and diffraction shimmer; geography does not move. The hidden hemisphere is occluded. City files load on first descent. Rendering pauses when the tab is hidden, and device pixel ratio is capped.

## Sources and reproducibility
See `public/data/manifest.json` for source credits, sample counts and binary layout. Star and line layers contain little-endian float32 values; the v0.4 relief grid uses little-endian int16 metres. Star rows are x/y/z/brightness/size/phase. Line rows are x/y/z in pairs.

Natural Earth geography is public domain. Night lights use NASA Earth Observatory's grayscale 2016 Black Marble composite, sampled artistically; they do not represent current illumination, individual people, or population counts. Singapore streets are OpenStreetMap data under ODbL, retrieved 9 September 2026. Three authored human stories are fictional.

`python scripts/fetch-geography.py` obtains source inputs. Run `scripts/prepare-geography.py` with Python and Pillow to reproduce prepared star samples (seed 260909). Source snapshots are not a live feed; the checked-in processed layers are the deployed snapshot. The source-fetch scripts are offline build tools, not site runtime dependencies.

## Current scope and limits
- Detailed navigation covers central Singapore, not global street detail.
- Global geography overlaps regional coastline detail during flight. Detailed streets still cover central Singapore only; the feathered edge is an artistic transition, not additional street coverage.
- Terrain and ocean-floor relief are now implemented at globe scale. Population estimates, real profiles and a live social network remain outside scope.
- A star's brightness is artistic styling, never a person's worth.
- Device-specific WebGL appearance and real iPhone performance require owner review.

## Historical v0.1/v0.2 verification
TypeScript checking and the production build passed during implementation. All nine binary layers were checked for byte counts, finite coordinates and spherical radii. Browser review covers a desktop viewport and a 390 × 844 iframe representing a phone layout. The review browser has WebGL disabled, so its visual and interaction results apply to the Canvas fallback. A physical phone and the WebGL shader path were not available for visual verification.


## v0.2 changes
- Return flights rise above Singapore before changing direction, eliminating the early low-altitude turn away from all detailed data.
- Regional geography stays visible between the global and city levels. City stars use a stable, spatially mixed prefix with altitude-dependent counts, size, and opacity, avoiding a dense white patch during approach.
- Street points and lines fade inside the actual OSM coverage edges. Authored story places retain their surrounding street context. Coastline threads are quieter at orbit scale.
- Selecting a person dims the city over time, reveals the three stars, then draws their connections. The opening sentence follows; the full story expands through an accessible Collapsible control.
- City introductory copy recedes after arrival or exploration. The journey indicator reaches 03/03 for a selected life.
- Phone story framing responds to the actual panel height. Long place labels switch sides to avoid clipping and controls. Reduced motion removes flight, camera easing, and reveal delays.
- The fallback shares edge weights, draw ranges, and reveal timing; its reduced point budget has a separate exposure correction. It remains an approximation of WebGL.

## v0.2 verification
- `node scripts/check-choreography.mjs`: 482 sampled camera positions along descent and return retain actual visible geographic source vertices. Additional checks cover city detail budgets, coverage-edge feathering, authored places, and reveal/reduced-motion timing.
- Desktop and 390 × 844 phone-width browser checks cover the globe, descent, return, story selection, expansion, changing lives, closing, and paused-motion travel.
- All three Amina place labels remain within the phone width and above the expanded story panel.
- TypeScript checking and the production build are run before saving the version. The review browser exposes only Canvas2D, so WebGL visual appearance and physical-device performance still need owner review.
- No new source data, personal profiles, location tracking, or backend capabilities were added.


## v0.3 implementation and verification
- `scintillation.ts` holds matching GPU and Canvas rhythms. Stable phases drive separate slow twinkles and a sparse bright-glint subset; no texture assets, post-processing passes or per-star CPU uploads were added. Human places and their merged light share a signature pulse.
- The engine separates the selected story from remembered life. Panel close only clears the selection. A return recalls the geographic anchor, merges according to projected separation (68 to 14 CSS pixels), then settles to a residual light. Fresh descent clears remembrance.
- The arrival callback follows 1.4 seconds of settled orbit; the glimmer settles over 2.2–6.5 seconds. Reduced motion reaches the same residual state and closing words immediately.
- City context retains 36% of its brightness under a selection, compared with 24% previously. Screen-area budgets retain a deterministic point prefix; portrait flights postpone their turn.
- `node scripts/check-memory.mjs` drives the actual engine on an inert Canvas surface and deterministic clock. It verifies all three lives after panel close and panning, latest-life selection, neutral return, fresh-journey reset, single delayed arrival, reduced motion and disposal. It also bounds field brightness and sparse peaks (1.7% maximum bright-glint share in the sample at maximum shimmer). This does not render pixels or measure frame rate.
- `node scripts/check-choreography.mjs` includes 482 actual-geography flight frames plus 1,446 projected memory-return frames for desktop and phone dimensions. It caught and drove the correction to portrait turn timing.
- TypeScript and production build are release gates. No v0.3 browser screenshots, GPU pixel review or physical-phone performance measurement are claimed. The next review should use the owner's WebGL device and the same camera/light settings as the v0.2.1 baseline.


## v0.4 spatial study
See `docs/DEPTH-STUDY.md` for data provenance, three views, comparison behavior, particle budgets, review limits and the preserved v0.3 baseline. Real ETOPO terrain and bathymetry shape the outer light. Interpretive material extends into depth; Horizon and Cutaway make it inspectable. The reference toggle holds the camera fixed.
