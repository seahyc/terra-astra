# Run 1 — context beyond the accurate city core

This isolated lane extends the city presentation without new network ingestion. It does not edit renderer, camera, navigation contracts, app UI or prepared source assets. Accurate central Singapore and lower-Manhattan OSM buffers remain unchanged. Root integration owns final appearance and release metadata.

## Continuation adapter

```typescript
const context = createCityContinuation('new-york', streetsXYZ, {
  elevation: existingETOPOGrid, // optional Int16Array, 1440 × 720
  pointBudget: 16000,
});
// context.stars: Float32 [x, y, z, brightness, size, phase]
// context.lines: Float32 XYZ endpoint pairs
```

`lib/world/city-continuation.ts` prepares and caches by city, road-buffer identity, elevation-buffer identity and budget. Repeated calls return the same object and typed buffers. Treat source arrays and returned arrays as immutable. Invoke once when the city sources are prepared; no preparation or sampling belongs in the frame loop. Default budget is 16,000 points; optional cap is 24,000. There is no external request or extra downloadable dataset.

The field samples real source segment directions, lengths and source road density, translating bounded small variations into nine curated context areas. It is not a uniform random box. Short filaments and smaller dim particles suggest a broader city around the accurate core. The output deliberately has no named roads, observations or claims of complete mapped coverage. **Outside-core filaments are impressionistic procedural context, not mapped streets or tracked activity.** Existing OSM attribution applies to the source geometry that supplies the patterns.

Geographic support uses conservative hand-curated artistic land envelopes for Singapore Island and Manhattan/Brooklyn/Queens. These envelopes are approximate masks, not a replacement coastline dataset. The already-bundled ETOPO grid additionally rejects cells below −150 m; its 0.25° resolution cannot resolve local rivers or coastal edges, so it is not presented as a precise urban land mask. There are no luminous context fields across broad surrounding oceans, but small coastal discrepancies remain possible. Accurate core geography remains the authority at close scale.

Geographic bounds are supplied in the result. Singapore extends from 103.67° E to 104.015° E and 1.265° N to 1.455° N. NYC context extends from 74.02° W to 73.87° W and 40.65° N to 40.86° N. This is still curated support, not comprehensive NYC.

Stars use radius `1.000019`; filaments use `1.000013`. Point brightness already incorporates a soft inverse-core overlap and outer-edge fade. **Do not apply the accurate core's `cityFeather` to this output.** The provided `core` and `feather` fields describe that baked overlap, not an additional renderer multiplier. The continuation is intentionally dimmer and finer than the accurate streets and should remain behind them. Renderer owner selects altitude visibility, line opacity, draw range and camera behavior.

## Activity refinement

`lib/world/urban-activity.ts` retains its existing allocation-free `sample(timeSeconds, trafficXYZ, activityXYZ)` API. Traffic importance now combines actual segment length and repeated endpoint connectivity. The higher-importance geometric routes receive greater sampling weight, modestly stronger warm embers and slightly faster travel. `trafficImportance` exposes the normalized score for inspection. It does **not** infer a road class, traffic measurement or legal travel direction from the binary.

Four of every five soft activity points now share a stable sampled junction hub, each with its own slow wandering phase; the fifth remains distributed. This creates visible gathering and dispersal while preserving small (<11 m) movement around real core road endpoints. Activity remains softer and smaller than traffic. No animation is generated on the invented continuation filaments; motion remains constrained to accurate core roads.

## Validation

- `node scripts/check-city-continuation.mjs`: real Singapore and NYC sources; exact 16,000-point budgets, finite/radial/geographic bounds, deep-water rejection, dimness, outside-core support, deterministic reproducibility, cache identity, source immutability, malformed inputs, geometric importance and clustered activity.
- Singapore: 16,000 points, 2,331 short filaments, 14,342 points beyond the accurate core feather, 439,944 bytes of retained output buffers. Initial Node preparation measured 24.8 ms; cache read 0.112 ms.
- NYC: 16,000 points, 2,384 short filaments, 14,917 points beyond the accurate core feather, 441,216 bytes of retained output buffers. Initial Node preparation measured 17.9 ms; cache read 0.043 ms.
- Existing `node scripts/check-urban.mjs` passes after the importance/hub refinement: actual road constraints, finite samples, deterministic replay, radial bounds and source immutability. Maximum sampled activity wander remained below 10.7 m.
- `npx tsc --noEmit --incremental false` and `git diff --check` pass on the isolated branch.

These are source and Node checks, not rendered-browser proof or phone performance guarantees. Root performs native visual QA and can reject the continuation if it is too bright, visibly artificial or does not soften the transition.
