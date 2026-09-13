# Special destinations — second visual pass

Isolated continuation on `feat/special-destinations-spike`, building on `1d54b5569dcec1c8b5279fef37609c3f1d01f673`. The user authorized another 15–20 minute pass. This is an unpublished spike; main and the active richness checkout remain separate. The inherited v0.6.1 badge is the base version, not a release claim.

## What changed

**Palm:** warm foreground filaments and activity now follow 1,824 mapped segments from named trunk, frond, Shoreline, crescent and adjoining coastal roads. About 83% of their length is on the Palm. The same 760 desktop / 440 phone traffic particles and 600 / 320 activity particles are reused. Mainland stars are slightly brighter, point size is 18% larger and the static draw fraction is 35% higher (still capped). Coast brightness varies gently. The wider, more central desktop framing shows the island connected to Dubai.

**Makkah:** overlapping, independently scattered radii replace the twelve discrete rings. Broad density differences and gentle speed variation preserve counter-clockwise collective movement without a fixed spiral lattice. The 1,440 particles are softer and remain outside the small mapped Kaaba anchor. A wider street distance and brighter mosque filaments retain more architectural context. The phone and tablet disclosure remains visible after the introduction fades.

**Navigation:** the regional primary action names and enters the selected city through the existing command bridge. It previously entered Singapore regardless of the special destination. Regional-only destinations return to orbit. About copy now includes the additional bounded snapshots and identifies Makkah's flow as interpretive.

## Integration scope

The follow-up is a separate commit. Most changes live in the spike's adapter, destination metadata and flow sampler. The only additional engine change supplies a destination-specific horizontal offset to the existing camera smoothing expression. No camera algorithm, material factory, shader, renderer, backend, dependency or YC command contract was replaced. Port this small offset input manually if the integration owner has newer framing logic.

New runtime files: `app/special-destinations.module.css` and the 43,776-byte `public/data/special/palm-jumeirah-activity.bin`. `scripts/prepare-palm-activity.py` reproduces that asset from the same OSM snapshot; source way IDs, input hash, output hash and route lengths are recorded in the existing Palm manifest. Full street geometry remains available for the map.

## Validation and performance

- TypeScript, production build and the focused destination lifecycle/CCW check pass. The existing world-engine regression suite also passes.
- Browser UI checks enter Palm, Makkah and New York from their actual regional primary buttons at 390px width, with correct final target and no clipping. Makkah disclosure remains visible at 390 × 844 and 820 × 1180. Challenger Deep returns to the planet, and the default Singapore entry still works.
- All six final captures report 120 fps / 8.3 ms rolling render diagnostics, no page errors, no alerts and no horizontal overflow. These are display-capped observations, not GPU headroom measurements.
- Original and final screenshots use native Chrome WebGL on this Mac at 1440 × 960 and 390 × 844. Phone dimensions are browser emulation, not a physical device.
- In one same-process Node comparison, Palm activity initialization fell from 165.6 ms over 92,164 valid map segments to 3.7 ms over 1,824 curated segments. Sampling remained approximately 0.03 ms per frame. This measures the sampler, not network latency or GPU frame time.
- The added route data is 43.8 kB raw and one line draw call. No activity count increase. Palm submits up to 35% more of its existing static stars; its larger points also increase fill work. These changes need physical-phone review before making mobile performance claims.
- Two focused Node runs took 134.6–140.7 ms for 1,000 Makkah flow updates (approximately 0.14 ms each). No allocation is added in the animation loop.
- The design detector's single advisory concerned a redundant font-size declaration; it was removed so the disclosure inherits the existing hint typography. The build retains its inherited large-chunk advisory.

## Disposition

| Destination | Recommendation | Remaining integration work |
| --- | --- | --- |
| Palm Jumeirah | **MERGE NOW**, subject to owner approval | Approximately 45–90 minutes to adapt the hooks to the active renderer and repeat the visual checks. The foreground activity and composition are stronger. |
| Makkah | **PROMISING BUT POST-HACKATHON** | The mechanical rings and missing mobile disclosure are resolved. The geometry remains an abstract planar study; allow 1–2 hours for integration and deliberate owner review of the moving effect before release. |

No merge, deployment, push, tag or saved Sites release is authorized by these recommendations. Earlier images and `REVIEW.md` remain historical evidence of the first pass; the `polish-*.png` images show this follow-up.

## Fresh evidence

- `polish-palm-desktop.png`, `polish-palm-mobile.png`
- `polish-makkah-city-desktop.png`, `polish-makkah-city-mobile.png`
- `polish-makkah-street-desktop.png`, `polish-makkah-street-mobile.png`
- `makkah-flow-polish.webm`: ten-second capture of the actual WebGL canvas; 30 fps recording target, no UI overlay or audio. Browser playback was decoded and visually checked at five seconds (1440 × 960, no media error). The full-page screenshots retain the interpretive disclosure.
- `polish-desktop-measurements.json`, `polish-mobile-measurements.json`, `polish-ui-checks.json`, `polish-route-performance.json`

The preview remains local at http://localhost:5194/ (existing dev session 28738). Nothing was published.

## Files changed in the follow-up

- `app/special-destinations.module.css`
- `app/terra-experience.tsx`
- `docs/special-destinations/DESIGN-NOTE.md`
- `docs/special-destinations/HANDBACK.md`
- `docs/special-destinations/POLISH-HANDBACK.md`
- `docs/special-destinations/SOURCES.md`
- `docs/special-destinations/makkah-flow-polish.webm`
- `docs/special-destinations/polish-desktop-measurements.json`
- `docs/special-destinations/polish-makkah-city-desktop.png`
- `docs/special-destinations/polish-makkah-city-mobile.png`
- `docs/special-destinations/polish-makkah-street-desktop.png`
- `docs/special-destinations/polish-makkah-street-mobile.png`
- `docs/special-destinations/polish-mobile-measurements.json`
- `docs/special-destinations/polish-palm-desktop.png`
- `docs/special-destinations/polish-palm-mobile.png`
- `docs/special-destinations/polish-route-performance.json`
- `docs/special-destinations/polish-ui-checks.json`
- `lib/terra/engine.ts`
- `lib/world/circumambulation.ts`
- `lib/world/special-destination-view.ts`
- `lib/world/special-destinations.ts`
- `public/data/special/palm-jumeirah-activity.bin`
- `public/data/special/palm-jumeirah-manifest.json`
- `scripts/prepare-palm-activity.py`
