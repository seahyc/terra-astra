# Urban activity — v3 isolated data lane

Implementation: `lib/world/urban-activity.ts`. No renderer, camera, UI, dependency or shared-command changes. Existing Singapore geometry and historical plans remain untouched.

The generator creates warm-ember traffic traveling in a stable direction along prepared road segments and smaller soft-coral activity that wanders around road junctions. Both are deterministic procedural movement, **not live traffic, tracked vehicles, observed people or literal population**. Road topology comes from source geometry; motion, apparent speed, brightness and density are artistic. Directions are stable per particle but do not claim legal one-way directions.

## Renderer adapter

```typescript
const movement = createUrbanActivity(roadXYZ, { trafficCount: 600, activityCount: 500 });
const trafficXYZ = new Float32Array(movement.trafficCount * 3);
const activityXYZ = new Float32Array(movement.activityCount * 3);
movement.sample(elapsedSeconds, trafficXYZ, activityXYZ); // or movement.update(...)
```

The caller owns output buffers and can use stable prefix draw ranges for smaller screens. `sample` allocates nothing, updates the same buffers, and samples absolute seconds so pause/replay/reduced motion do not accumulate drift. Pause by keeping time fixed. Recommended colors: traffic `#f0a66d` warm ember; activity `#eaa99c` soft coral. Use `trafficBrightness` / `trafficSize` and `activityBrightness` / `activitySize` as point attributes. Optional `trafficOpacity` changes each sample to fade segment endpoint wraps; without this multiplier points can visibly restart at the other end of their assigned segment. Render global layers separately, and show urban motion only at city/street scale.

Both motion groups normalize to radius `1.00003`, matching the existing city presentation. Source roads are not modified. Traffic uses weighted seeded segment assignments, fixed directions and 7–20 m/s artistic travel rates. Bad radii, non-finite points, incomplete endpoint pairs, segments shorter than 2 m and longer than 1,200 m are skipped. Traffic remains on each segment's spherical chord projection, within Float32 rounding. Activity centers are real road endpoints weighted toward repeated junctions; two slow unequal frequencies wander less than 11 m. Its supplied points are smaller and dimmer than traffic. There is no physics system, external request or mutable global state.

## New York showcase

One bounded OpenStreetMap request succeeded. The prepared assets cover roughly 4 × 4 km around the guaranteed catalogue target at 40.721562, −73.995718. This is a curated lower-Manhattan showcase, not complete NYC support. Assets total 1,038,384 bytes:

- `public/data/new-york-streets.bin`: 19,030 segments; Float32 little-endian XYZ endpoint pairs, radius `1.000014`.
- `public/data/new-york-stars.bin`: 24,236 artistically sampled road lights; Float32 stride 6 `[x, y, z, brightness, size, phase]`, radius `1.000018`.
- `public/data/new-york-manifest.json`: source/query/timestamps, exact SHA256s, bounds, preparation recipe and attribution.

Source: [OpenStreetMap contributors, ODbL](https://www.openstreetmap.org/copyright), through Overpass. Retrieved 2026-09-13 04:18:47 UTC / 12:18:47 SGT; OSM base timestamp 04:16:49 UTC. Raw response hash is recorded in the manifest. No network request is required at runtime. The existing Singapore attribution continues to apply to its unchanged assets.

Bounds: south 40.7035, west −74.0194, north 40.7396, east −73.9720. Both endpoints were clipped to these bounds. Generalize the renderer's existing Singapore-only feather for NYC: center latitude `40.72155`, longitude `−73.9957`, half-latitude `.01805`, half-longitude `.0237`, fade normalized elliptical radius `.65 → 1`. Exact circles/ellipses are a rendering choice, not a claimed geographic boundary. Renderer ownership remains lane 01.

World convention matches `prepare-geography.py`: `x = cos(lat) * sin(lon)`, `y = sin(lat)`, `z = cos(lat) * cos(lon)`. Points use deterministic seed 260913, approximately 12 m sampling and probability .8 on major roads / .6 elsewhere. Brightness and sprite sizes are artistic. Source query, filters and this preparation recipe are recorded in the manifest; rerunning the remote query later can return newer OSM data and will not necessarily reproduce the archived source hash.

## Checks and limits

`node scripts/check-urban.mjs` uses the actual Singapore and NYC binaries to check finite outputs, radial bounds, spherical road constraint, small junction wander, repeatability, source-buffer immutability, malformed geometry, bounded counts, geographic clip bounds, manifest checksums and a Node update benchmark. `npx tsc --noEmit --incremental false` checks integration types. Browser perception and frame performance belong to integration QA; Node timing is not a browser FPS guarantee.

The street binary has no OSM one-way metadata, so the generator cannot honor source legal direction. At segment boundaries the same-direction particle fades and reappears at its starting endpoint; this is inexpensive street motion, not a transport simulation. Activity locations inherit the distribution of mapped roads and must never be marketed as tracked humans or live urban popularity.
