# Run 1 — denser global signals and an illustrated sea backbone

13 September 2026. This isolated data lane continues the existing `signals.ts` interface. Renderer ownership stays with the genesis/spatial lane. No UI, camera, world-command union, dependencies or runtime network service changed. Earlier `SIGNALS-V3.md` remains the historical 12/20/6 implementation record.

## Fixed budgets

| Matter | Records | Geometry and identity |
| --- | ---: | --- |
| Orbital lights | 72 | Original 12 preserved, plus 60 in three clear bands at radius 1.20, 1.29 and 1.38. Inclined/near-polar planes use authored directions. |
| Aircraft lights | 120 | Forty curated city-pair corridors, three evenly phased lights per corridor. Radius 1.025–1.06. Original 20 corridor identities and their first samples are preserved. |
| Ship lights | 24 | Twelve authored open-water corridors, two phased lights per corridor. Radius 1.002. Original six identities remain present. |
| Undersea connection paths | 10 | Four to eight authored water waypoints each. At most 64 renderer segments per path, one slow pulse per path. Visual radius 1.001. |

All records explicitly carry `provenance: 'procedural'`. Aircraft anchors still come from the existing sourced Natural Earth city catalogue. Authored pairings do not assert an airline service. Orbital lights are not actual tracked spacecraft. Sea legs are not AIS or navigable shipping lanes. The connection paths do not represent real cable alignments, owners, landing sites, outages or traffic. No live claim is introduced.

Use the existing signal palette: icy cyan-white satellites, pale aqua aircraft, sea-turquoise ships. Cables provide a subdued `#609FA8` thin-line color. The display radii and animation clocks are interpretive and exaggerated. Cable radius is a small visual offset, not a measured cable depth. Faintness, scale fading and draw budget remain renderer decisions; 72/120/24 are available records, not a requirement to expose every point at every scale.

## Interfaces

`worldSignals`, `satelliteSignals`, `aircraftSignals`, `shipSignals`, `signalColors`, `signalDisclosure`, and `sampleSignal(record, timeSeconds, outXYZ, lagSeconds = 0)` are unchanged. Sampling allocates nothing. Corridor copies share their immutable precomputed bases, while stable ID suffixes distinguish individual lights and fixed phase offsets spread them along the path. `signalDisclosure` continues to say the motion is illustrated, not live tracking.

New `lib/world/cables.ts` exports:

```ts
cablePaths;                 // readonly CablePath[10]
cableColor;                 // '#609FA8'
cableDisclosure;            // explicit illustration / no-live-status text
CABLE_SEGMENTS_PER_PATH;    // 64
sampleCable(path, progress01, outXYZ);
sampleCablePulse(path, timeSeconds, outXYZ, lagSeconds = 0);
```

`CablePath` contains `id`, `label`, `provenance`, `radius`, `periodSeconds`, `phase`, `waypoints` (latitude/longitude pairs), `segments` (precomputed perpendicular bases, arc length and cumulative start/end), and `totalArc`. Everything is fixed and JSON-serializable. Each path is a sequence of great-circle arcs. The pulse moves by arc length and reverses smoothly at either endpoint, avoiding a loop teleport; internal segment corners are continuous. Hold the caller's animation clock to pause the pulse and lagged trail together. Both sampling functions mutate only caller-owned indices 0–2, with no per-frame allocation. Geographic x/y/z convention matches the established Earth renderer.

## Validation

- `node scripts/check-signals.mjs`: **216,216** finite, fixed-radius, repeatable samples, negative times, continuous loop boundaries, bounded speed, lag-correct trails, distinct shared-corridor phases, source-exact aircraft endpoints, and frozen geometry. All **24,024 ship samples** have negative elevation in the bundled NOAA ETOPO grid.
- `node scripts/check-cables.mjs`: **10,010** finite, fixed-radius, continuous samples over negative ETOPO elevation; all authored waypoints reached; immutable serializable records; periodic pulse and exact lagged history. The water check caught Madagascar, a Natuna island and the Tunisian cape during authoring; control points were rerouted, with assertions retained.
- Full-project `npx tsc --noEmit --incremental false` passes at this worktree baseline.

ETOPO checks are coarse water-clearance checks, not cable or maritime route verification. The cable paths are authored ocean-scale links and deliberately do not imply precise shore landings. Existing sources and interpretive limits are recorded in `SIGNALS-V3.md`; no additional external data or license-dependent dataset was imported.

Native rendered clutter, line exposure, physical-phone frame rate and global-to-city visibility remain integration checks. If the additional matter competes with Earth or the core journey, reduce visible density or omit the cable layer without changing the immutable geography or command contract.
