# Signals v3 — deterministic living shells

Scope: isolated data and geometry for Execution v3. This does not replace Earth particles, camera choreography or any historical plan. The renderer owner decides visibility, depth occlusion, point size and integration timing.

Implemented in `lib/world/signals.ts`: 12 orbital lights, 20 illustrated city-pair flight paths and 6 illustrated open-water sea paths. Every record is frozen, has a stable ID, deterministic phase, normalized radius, color, time period and trail duration. No network request, live feed, credentials, orbital propagator, browser object, Three dependency or runtime randomness is involved.

| Layer | Radius (Earth = 1) | Color | Motion |
| --- | --- | --- | --- |
| Satellites | 1.20–1.38 | `#A8F4FF` | Sparse circular planes, 170–269 animation seconds per revolution |
| Aircraft | 1.025–1.06 | `#7CE9E6` | Faster great-circle shuttles between existing city anchors; 0.65-second trails |
| Ships | 1.002 | `#53D8C6` | Six slow open-water shuttles; 1.8-second trails |

These radii and clocks are visual exaggerations. The points are **not named real satellites, scheduled airline services, AIS vessels or tracked people**. Exported disclosure: “Illustrated orbital, flight and sea motion. Not live tracking.” City coordinates have source provenance; route pairings, sea legs, inclinations, timing and phases are authored illustration. A record's `provenance` is explicitly `procedural`.

## Renderer contract

```ts
import { worldSignals, sampleSignal } from './lib/world/signals';
const out = new Float32Array(3); // allocate once
for (const record of worldSignals) {
  sampleSignal(record, animationSeconds, out); // writes x, y, z
  // Use the same record and animation clock for a fading trail:
  sampleSignal(record, animationSeconds, out, record.trailSeconds * 0.5);
}
```

`WorldSignal` exposes `id`, `layer`, `label`, `provenance`, `color`, `radius`, `periodSeconds`, `phase`, `trailSeconds`, `basisA`, `basisB`, `arcRadians`, `motion`, plus aircraft `fromId` / `toId`. Exports include `worldSignals`, `satelliteSignals`, `aircraftSignals`, `shipSignals`, `signalColors` and `signalDisclosure`.

The geocentric convention matches the existing renderer: x = cos(latitude) × sin(longitude), y = sin(latitude), z = cos(latitude) × cos(longitude). Both bases are unit-length and perpendicular. Every sampled point remains at its declared layer radius. Aircraft and sea routes follow great-circle arcs, turn with zero speed at either endpoint, and repeat without a teleport. This turnaround is an illustration, not flight navigation. Positive trail lag is a true earlier sample of the same identity and clock, including across loop boundaries and negative times. Non-finite times resolve to zero; negative trail lag is clamped to zero.

`sampleSignal` allocates nothing and mutates only caller-owned indices 0–2. Reuse an output array for all samples. Freeze the animation clock to pause heads and trails together. The 38 heads plus short trails are a small fixed budget; no paths or buffers grow over time. Suggested rendering: reveal after geographic capture, distinguish shell radii at planet/region scale, then fade global shells as city geometry becomes dominant. Omit ships first if they dilute the visual read or cost integration time.

## Sources and interpretation

Aircraft anchors reference the existing [Natural Earth city catalogue provenance](./PERSONAL-EVIDENCE.md) by ID, without copying or editing its records. The 20 authored pairings cover Asia-Pacific, the Atlantic, the Americas, Europe, Africa and the Indian Ocean. They assert city locations, not existing airline routes.

[ESA, Types of orbits](https://www.esa.int/Enabling_Support/Space_Transportation/Types_of_orbits) describes inclined and near-polar paths and the large physical separation between aircraft and orbital spacecraft. That is the qualitative basis for these shell behaviors. We do not apply ESA's physical altitudes or periods: this globe deliberately exaggerates separation and changes animation speed for readability.

Sea endpoints are authored open-water coordinates, not a sourced shipping network. The check samples every sea leg against the existing NOAA ETOPO relief grid and verifies negative elevation at all tested points. This is a coarse visual water-clearance check; it is not maritime route validation.

The demo target **Challenger Deep: 11.369°N, 142.587°E** is independently supported by [Bongiovanni et al., High-resolution multibeam sonar bathymetry of the deepest place in each ocean](https://doi.org/10.1002/gdj3.122), table 1, and the co-author institution's [British Geological Survey report](https://www.bgs.ac.uk/news/deepest-points-of-the-indian-ocean-and-southern-ocean-revealed/). [NOAA's overview](https://oceanservice.noaa.gov/facts/oceandepth.html) confirms the feature in the southern Mariana Trench but does not give that exact coordinate. Treat it as a curated geographic focus from that survey, without implying this point is the sole or universally accepted exact deepest sounding. No command catalogue is edited by this lane.

## Validation and limits

`node scripts/check-signals.mjs` passes 38,038 samples across negative time, full loops and route reversals. It verifies finite output, declared radii, fixed bases, exact repeatability, stable immutable records, continuous loop boundaries, bounded speed, exact historical trails, every aircraft endpoint against its original Natural Earth city, and 6,006 sea samples over negative ETOPO elevation.

The isolated signal module passes strict TypeScript. Whole-project TypeScript at the supplied baseline currently reports an unrelated `lib/world/commands.ts:15` inference error; the integrator owns that file. This lane does not claim rendered appearance, performance on a physical phone, public deployment, current transport state or real-time orbital accuracy.
