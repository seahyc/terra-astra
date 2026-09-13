# Active living-universe sprint

Latest user instruction authorizes implementation, parallel agents, deployment, accessible GitHub and a 90-second demo. Historical freeze documents remain historical; do not treat them as current scope.

Baseline: pre-existing v0.4 remains at annotated `pre-hackathon` and `v0.4`; completed v0.4.1 remains preserved. Integration starts at d17738e04a8f31cabc3a38412a52c363fed94be6. No data regeneration, replacement renderer, runtime inference, database, auth or geocoding.

Integration owner: `hackathon/living-universe`, `terra-astra-integration` worktree. Owns shared contract, app/terra-experience.tsx, app/globals.css, releases, publishing and demo.

World worker: `hackathon/world-depth`, `terra-astra-world` worktree. Owns engine.ts, canvas-renderer.ts, spatial.ts, new lib/terra/transformation.ts and lib/terra/personal-rendering.ts plus dedicated math checks. No app/UI/contract edits.

Personal worker: `hackathon/personal-constellation`, `terra-astra-personal` worktree. Owns app/personal-constellation-form.tsx, its CSS module, lib/personal/catalogue.ts, lib/personal/model.ts, scripts/check-personal-model.mjs, and its evidence document. No engine/shared UI/contract edits. User assigned this track to an Astra agent instead of YC.

Workers inspect before editing, validate and commit explicit scoped paths; report SHA, changed files and risks. No pushes, deployments, dependency edits or shared browser. Integrator cherry-picks and verifies combined flow.

Engine contract to add: transform(open: boolean): void; personal(places: PersonalPlaces | null): void; optional callbacks transformation(state: TransformationState): void and personalSettled(): void. personalSettled fires after reform and camera settlement with a submitted constellation. Existing methods remain compatible. Personal state stays separate from fictional stories.

Form named export PersonalConstellationForm uses the shared props. Model exports validatePersonalPlaces(input: unknown), returning { ok: true, places: PersonalPlaces } or { ok: false, error: string }. Exactly three distinct catalogue IDs with verified coordinates; meanings <=80 characters. Use the user's meanings: A place that shaped me / A place I call home / A place I am drawn toward.

Targets SGT: full local route 13:05; freeze 14:00; exact video and links 15:00; deadline 15:30. Prefer one coherent reversible transformation. Actual Astra evidence means engineering work; no runtime AI claim.
