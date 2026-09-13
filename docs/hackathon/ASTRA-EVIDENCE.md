# Astra engineering evidence — 13 September 2026

## Starting point

Pre-existing v0.4: `9b9e2ec4ef3534b463e20d4d08c4ae3de444843d`.
Documentation-only handoff: `3dce4c5d5fec20ab6b0b98c675de09713879c93c`.
Today began with bundle restoration at approximately 11:06 SGT, not a new application build.

## Actual instruction

User: “Start now by inspecting the handover and getting the recovered baseline running.” The request also explicitly authorized two read-only reviewers, native WebGL inspection, history-preserving GitHub setup, useful fixes and a repeatable demo.

## Actual Astra diagnoses and resulting work

- Read-only reviewers identified that WebGL context loss stopped the render loop but the ready UI offered only Dismiss. Lead added a fatal recovery state with Restart journey and kept the lost renderer stopped across visibility changes.
- Reviewers identified that switching equal-height phone story panels can skip ResizeObserver and lose camera fitting. Lead reapplies the existing inset whenever a life is selected.
- Browser inspection confirmed that desktop→390×844 resizing preserved the old altitude and cropped the globe. Lead adjusted home-camera framing and resize scaling.
- Lead added an always-available Restart journey control. This reloads the app to reset camera, story memory, region, light settings and in-flight work together.

These are engineering actions in Codex. No runtime Ask Astra inference is implemented or evidenced by this record.

## Baseline verification performed before source edits

- Complete bundle verified; all five annotated tags and both supplied branches recovered.
- `npm run install:ci` completed through Sites portable dependency installer; Node 24.14.1.
- `check-depth`, `check-choreography`, `check-memory`, TypeScript and production build passed. Build reported a large-chunk advisory.
- Browser `.universe[data-renderer]` was `webgl`; initial console warnings/errors were empty.
- Inspected actual WebGL globe, paused Horizon, paused Cutaway, Singapore and Amina expanded with three visible labelled place lights.
- Existing automated engine checks use an inert Canvas renderer. Their pass is not WebGL pixel or physical-device proof.

## v0.4.1 verification

- All existing checks and TypeScript pass; production Worker build passed after the fixes.
- Added real-engine regressions for desktop/phone home-altitude changes and switching into Daniel with an unchanged 450px phone story inset; pass.
- Impeccable changed-UI detector returned no findings.
- Native WebGL at 390 × 844: full globe framing; expanded Amina; consecutive Daniel and Mei with all place lights above their panels; panel close and paused return show the remembered light and closing line.
- Restart journey reloads the complete app. Native induced graphics-context loss has not been tested; its recovery change is source-reviewed.

## Pending delivery verification

Native deployment, judge repository access, video duration/upload and portal submission must receive their own evidence before completion is claimed.

## Runtime model reference

Official model identifier `gpt-6-astra` verified at https://developers.openai.com/api/docs/models/gpt-6-astra on 13 September 2026. Credential provisioning and account-level model access remain unverified.
