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

Native deployment succeeded for v0.4.1 on 13 September at 11:14:45 SGT. Unauthenticated HTTP read returned 200, and the public browser showed v0.4.1, native WebGL and no console errors/warnings. Judge repository access, video duration/upload and portal submission remain outstanding.

## Runtime model reference

Official model identifier `gpt-6-astra` verified at https://developers.openai.com/api/docs/models/gpt-6-astra on 13 September 2026. Credential provisioning and account-level model access remain unverified.

## Scope revision — planning only

At approximately 11:21 SGT, read revised HANDOFF.md, CURRENT_STATE.md and HACKATHON_PLAN.md. Replaced Ask Astra-led planning with a proposed reversible Terra ↔ Astra transformation and separate personal three-place constellation. Preserved completed v0.4.1 work. This revision changes documentation only; production is explicitly frozen. No new feature implementation is claimed.

## Living-universe implementation — current authorized sprint

The user explicitly requested: “If collaboration/subagent tools are available, aggressively delegate independent work that can safely happen in parallel.” The original request also required investigation before edits and preservation of the pre-hackathon baseline.

- Lead inspected the current source and native WebGL baseline before edits. A read-only agent audited remaining configuration, data, starter components and baseline checks.
- Lead preserved v0.4 with the pushed annotated `pre-hackathon` tag, created separate integration, world-depth and personal-constellation worktrees, and committed the typed boundary at `e89ab92`.
- World agent returned reversible GPU/Canvas morph, global personal framing and rendering at `2cda1bd`. Integration review rejected a fixed triangle shared by all visitors. Follow-up `ec3551d` derives personal geometry from the chosen places' angular distances.
- Personal agent returned form, 48 sourced places, canonical validation and checks at `47c0212`. The lead integrated both tracks without overlapping source ownership.
- Independent QA reproduced a bug: entering Singapore cleared the renderer's personal constellation while the UI kept its three places. Lead fixed it and added a regression at `4bc995f`.
- Native browser review exposed phone label/text crowding. The same integration fix separated the Astra stars and closing Earth from their panels. A browser round trip confirmed the preserved three-place constellation still renders after visiting Singapore.
- Focused checks and native WebGL verification are recorded in the new release. A fresh screenshot reviewer evaluates desktop and phone compositions independently.

These are actual Codex engineering actions and Git commits. There is no live Astra model call in the app, no claim of newly generating the pre-existing geographic dataset, and no physical-phone FPS claim.
