# Terra Astra changelog

Semantic versions label the experience; Sites version numbers identify saved deployment packages. They are separate counters. `lib/terra/releases.ts` is the source for the public history page and current build badge. Git tags identify exact source snapshots; native Sites records are authoritative for save/deploy status.

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
