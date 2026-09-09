# Terra Astra — Earth, Constellated

First prototype, 9 September 2026.

## Implemented experience
- A real geographic globe drawn from star point clouds, geographic threads, and historical city lights.
- Rotate, zoom, pause ambient motion, and tune glow, thread strength, land density, and country boundaries.
- Guided descent into central Singapore using actual OSM street geometry.
- Three explicitly fictional human constellations with connections to real places.
- Select another life, close the story, and return to orbit to reveal the closing line.
- Responsive controls and keyboard alternatives. Reduced-motion preferences are respected.
- GPU renderer and an automatic lower-detail Canvas2D fallback when WebGL is unavailable.

## Architecture
`app/terra-experience.tsx` owns the interface and narrative state. The dynamically imported `lib/terra/engine.ts` owns geographic coordinates, camera flight, point clouds, uniforms, pointer controls, and resource disposal. `lib/terra/canvas-renderer.ts` projects the same scene at reduced detail without WebGL. `lib/terra/stories.ts` contains fictional story content, separate from geography.

All coordinates use east-positive longitude and north-positive latitude. The Earth is a unit sphere; a closer near plane is selected as the camera approaches Singapore. Geographic particles have stable positions, with brightness-only shimmer. The hidden hemisphere is occluded. City files load on first descent. Rendering pauses when the tab is hidden, and device pixel ratio is capped.

## Sources and reproducibility
See `public/data/manifest.json` for source credits, sample counts and binary layout. All binary layers contain little-endian float32 values. Star rows are x/y/z/brightness/size/phase. Line rows are x/y/z in pairs.

Natural Earth geography is public domain. Night lights use NASA Earth Observatory's grayscale 2016 Black Marble composite, sampled artistically; they do not represent current illumination, individual people, or population counts. Singapore streets are OpenStreetMap data under ODbL, retrieved 9 September 2026. Three authored human stories are fictional.

`python scripts/fetch-geography.py` obtains source inputs. Run `scripts/prepare-geography.py` with Python and Pillow to reproduce prepared star samples (seed 260909). Source snapshots are not a live feed; the checked-in processed layers are the deployed snapshot. The source-fetch scripts are offline build tools, not site runtime dependencies.

## Current scope and limits
- Detailed navigation covers central Singapore, not global street detail.
- The camera approach fades between global and local data levels. Intermediate levels have less detail.
- Terrain elevation, population estimates, real profiles and a live social network are future work.
- A star's brightness is artistic styling, never a person's worth.
- Device-specific WebGL appearance and real iPhone performance require owner review.

## Verification
TypeScript checking and the production build passed during implementation. All nine binary layers were checked for byte counts, finite coordinates and spherical radii. Browser review covers a desktop viewport and a 390 × 844 iframe representing a phone layout. The review browser has WebGL disabled, so its visual and interaction results apply to the Canvas fallback. A physical phone and the WebGL shader path were not available for visual verification.
