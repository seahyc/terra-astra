# Terra Astra changelog

Semantic versions label the experience; Sites version numbers identify saved deployment packages. They are separate counters. `lib/terra/releases.ts` is the source for the public history page and current build badge. Git tags identify exact source snapshots; native Sites records are authoritative for save/deploy status.

## v0.4.1 — 2026-09-13 — A journey you can return to
- Restores the existing v0.4 history into a portable Mac checkout and private shared GitHub repository; no data regeneration or renderer replacement.
- Adds a complete Restart journey action using page reload, clearing camera, tuning, region, selected/remembered life and in-flight work.
- Fits the home globe inside its desktop composition and recalculates home altitude when the viewport changes.
- Reapplies story-panel fitting when switching lives at phone width, including equal-height panels.
- Marks graphics-context loss as a fatal restartable state; a lost renderer stays stopped across visibility changes.
- Verification: geography, choreography, lifecycle and TypeScript checks; production build. The lifecycle check now covers home resize and same-height phone story switching.
- Native WebGL review on the Mac covered paused Globe/Horizon/Cutaway, Singapore, expanded Amina, all three lives at 390 × 844, and a remembered-light return. Physical-phone performance and induced GPU context loss remain unverified.
- Retains the exact v0.4 tag and earlier milestones. Today's engineering changes are distinct from the pre-existing prototype. No runtime Astra inference is claimed.

## v0.4 — 2026-09-12 — A world with depth
- Adds real NOAA ETOPO 2022 land elevation and ocean bathymetry, artistically exaggerated. Slope and elevation bands emphasize mountain profiles, shelves, ridges and trenches.
- Adds 296,171 prepared spatial particles across land, ocean, body, interior, haze and halo layers, with screen-dependent draw budgets. Interior structures are interpretive, not geological measurements or people.
- Adds Globe, Horizon and Cutaway perspectives, Indonesia / Java Trench and Andes / Pacific presets, and a fixed-camera Surface reference switch. Phone cutaways leave the opening clear of the controls.
- Applies perspective sizing, ray-depth attenuation and world-fixed cut planes to 3D particles in both renderers. Separately balances the Canvas fallback and increases nearby terrain detail. Paused scenes stop redrawing after settling.
- Fades spatial relief before Singapore street scale and resets the study view on descent. Preserves the fictional lives, their remembered light and the return choreography.
- Adds reproducible source preparation and provenance in `scripts/prepare-relief.py`, `public/data/relief-manifest.json` and `docs/DEPTH-STUDY.md`.
- Verification: actual relief registration, radial thickness and source checks; real-engine checks of all three views in both regions, fixed comparison camera, safe close zoom, city reset and all existing remembered-life cases; 482 geography-flight and 1,446 remembered-return projection frames; targeted lint, TypeScript and production build.
- Visual review: motion-paused desktop and 390 × 844 phone-width Canvas views; Indonesia and Andes relief; Surface reference; cutaway orbit; Singapore selection and return. Native WebGL pixels and physical-device performance remain unverified.
- Preserves v0.3 at source `a4823cf3dbbb8a94749cdc0452b5d2c6f06472b8`, annotated tag `v0.3`, saved Sites version 4 (`appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_cd54921e18e48191a7b192014ffb6801`). The Surface reference is an in-build comparison, not a separately playable old release.

## v0.3 — 2026-09-12 — A light you remember
- Adds independent shimmer rhythms, sparse diffraction glints, brighter cores and a fuller halo to geographic stars. Includes a Star shimmer slider; pause/reduced motion stops the effect.
- Keeps the last visited fictional life independently of its panel. On return, its places merge by their projected separation into one geographically anchored warm glimmer with the same pulse.
- Recalls the visited places after a city pan, holds the orbit before showing the closing line, and leaves a quiet residual light. New journeys clear the remembered life; unvisited journeys return neutrally.
- Preserves more city context around a selection, scales city point budgets with screen area, and delays turning in portrait views so the remembered light stays visible.
- Removes static star glyphs that obscured the rendered human shimmer while retaining labels and accessible hit targets.
- Verification: engine lifecycle and deterministic light checks; 482 geographic flight frames and 1,446 projected remembered-life return frames across desktop and phone dimensions; TypeScript and production build.
- No v0.3 browser pixel comparison or physical-device performance review was performed. Prior v0.2 Canvas screenshots are historical evidence, not verification of this shader change.
- Preserves the v0.2.1 baseline at source `44b193b2a6a6791de52d32bb676ffb336cd91713`, tag `v0.2.1`, saved Sites version 3 (`appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_63a7b36f6fdc81919d643c440acb14fe`).

## v0.2.1 — 2026-09-12 — Build history
- Adds `/history`, a visible build number and an About link to the release record.
- Records changes and review limits for each milestone.
- Adds annotated source tags for the two existing milestones and this release.
- Establishes a release checklist and a proposed v0.3 build brief.
- Inherits the v0.2 rendering unchanged. Full WebGL appearance and physical-phone performance remain unverified by the agent.

## v0.2 — 2026-09-09 — Continuity, light and the human reveal
- Ascent zooms out before turning; regional geometry bridges global and local detail.
- City stars use stable sampling, altitude-based draw budgets and smaller sprites.
- Streets feather inside the actual data bounds; selected-life context dims.
- Stars, links and the opening sentence reveal in order. Stories expand on request.
- Phone camera framing responds to the story panel; labels flip to avoid clipping.
- Verified: production build, TypeScript, 482 camera samples with visible source geography, and desktop/phone-width fallback interactions.
- Saved as Sites version 2; no standalone deployment as of the 2026-09-12 history audit. Included in v0.2.1.
- Source: `9f647d8ffff42156534b9ac3f1f2f9d816dc90d8`; tag `v0.2`.
- Saved ID: `appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_3510fbc599a88191862b13b6fdd840dd`.

## v0.1 — 2026-09-09 — Original prototype
- Star Earth, rotation and zoom, guided Singapore descent, three fictional lives, return to orbit and light controls.
- Natural Earth geography, NASA Black Marble 2016 light samples and OSM central Singapore streets.
- Saved and deployed as Sites version 1. Owner recording exposed bright compressed city detail and a dark return transition.
- Source: `d5e3ad98c03d8a5841e37b9bebe0bff045298535`; tag `v0.1`.
- Saved ID: `appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_901ef2d96a5481919bdd3d87833e42df`.

## Version convention
- A focused feature milestone increments the minor version: `v0.3`, `v0.4`.
- A bounded fix or supporting addition increments the patch: `v0.2.1`, `v0.2.2`.
- Add an entry; do not overwrite an old release or move its tag. Correct historical facts through explicit notes.
- Dates describe build milestones in UTC. A saved milestone is not necessarily a published one.

## Release checklist
1. Confirm the current Site, audience, saved versions and clean source baseline.
2. Make only the authorized changes; update this changelog and `lib/terra/releases.ts` together.
3. Record what was checked, with device and renderer limitations. Never mark a proposal as implemented.
4. Validate the required build and relevant checks, commit the exact source and annotate its version tag.
5. Push that source and tag, package it, save a new Sites version, and publish under the current Sites workflow and user instructions.
6. Confirm terminal deployment success before saying it is live. Handoff the semantic version, URL, changes and outstanding limits.

For rollback, select the known saved Sites version and redeploy it when authorized. Preserve newer history; do not force-reset the source branch. There is no simultaneous playable version comparison in this release.
