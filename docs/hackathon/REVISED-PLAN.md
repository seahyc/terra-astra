# Revised sprint plan — scope v2

Updated 13 September 2026, 11:21 SGT. Planning only: no application edits, Sites source push, saved version or deployment. Production remains the completed v0.4.1 release. Implementation starts after agreement on the small shared contract.

## Authority and preserved work

Read the supplied Terra-Astra-Engineering-Handoff-v2/HANDOFF.md, CURRENT_STATE.md, HACKATHON_PLAN.md, RUN_COMMANDS.md and source/AGENTS.md. These replace the earlier Ask Astra-led proposal. Their v0.4 snapshot does not undo subsequently completed work.

- Pre-existing v0.4: `9b9e2ec4ef3534b463e20d4d08c4ae3de444843d`; all earlier tags preserved.
- Completed v0.4.1: `c4a4dad2281203eedc50138d4dac2a1c4048309c`; full restart, fatal graphics recovery UI, responsive globe framing and equal-height story-panel fitting. Preserve the verification evidence in ASTRA-EVIDENCE.md.
- Retain this working checkout, prepared geography, dependencies, private GitHub, YC's verified write access and portable server at http://localhost:5173/. Do not restore the new bundle over it.
- Production https://terra-astra.riffster.chatgpt.site remains v0.4.1, saved Sites version 6. Future publication requires a separate user instruction.

## Ordered implementation proposal

1. **Spatial Earth:** inspect existing WebGL layers with motion paused. Tune only as needed for terrain, ocean-floor relief and parallax. Preserve darkness, crisp cool glints and warm personal light.
2. **Terra ↔ Astra:** one deterministic, reversible formation from a bounded subset of existing stars. Immutable home positions, stable IDs, one bounded progress value; no per-frame geometry rebuilding or new simulation. Preserve regional neighbours and geographic orientation; nearer layers may travel farther. Reform to exact home positions. Links and DOM projections must follow the morph. Serialize conflicting camera/selection input. Reduced motion reaches the same endpoints. Canvas needs shared projection support or an explicitly reduced effect.
3. **Three meaningful places:** exactly three distinct choices from a compact searchable local catalogue with verified coordinates. Default meanings: Where I began / Where I belong / A place I carry. Optional short edits stay on this device in session memory. No geocoding or runtime-model dependency.
4. **Personal ending:** separate personal state and globe-scale framing; never mutate fictional Singapore stories or reuse regional camera limits. Use unit-vector anchors and spherical links with a deterministic near-antipodal fallback. Retain warm anchors bound to their places during reformation, then settle into “The constellation was us all along.”
5. **Reliability and delivery:** repeat both the new route and preserved Singapore route. Record a rough take once the new route works; prepare exact 90-second video, judge access and submission evidence. Production remains frozen until separately released.

Main proposed route: orbit → Open Astra → choose/reveal three places → Reform Earth around their lights → settle → ending. Existing Singapore → fictional life → remembered return stays accessible.

## Ownership and integration

Lead branch: `sprint/hackathon-integration`. Lead owns engine, shaders, spatial/scintillation/choreography, Canvas, camera, shared UI/types, hosting and releases.

YC branch: `feat/personal-constellation` (proposed; create from the agreed integration commit in YC's own clone). YC owns only the catalogue, validation/model, form, isolated CSS and teammate evidence/submission draft listed in TEAMMATE-TASK.md. Preserve the superseded `feat/ask-astra` reservation; it contains no Ask Astra implementation.

The precise proposed TypeScript boundary and acceptance criteria are in TEAMMATE-TASK.md. This is a design contract, not an implemented API. Both sessions acknowledge it in Git before implementation; lead supplies the shared type file. YC returns a PR into the integration branch. Lead reviews, integrates and verifies. No concurrent shared-file edits or teammate deployments.

Reset semantics: form reset clears draft; camera replay preserves a submitted personal constellation; explicit clear-personal removes it; existing full Restart journey clears session memory. Singapore remembrance stays independent. No persistence claim.

## Time gates (SGT)

At 11:21: 2h39 to feature freeze, 4h09 to deadline. Baseline/setup are complete; do not repeat recovery. Engineering windows below depend on timely implementation authorization.

| Target | Deliverable / decision |
| --- | --- |
| 11:35 | Contract acknowledged, ownership fixed; paused WebGL inspection |
| 12:20 | Single opening/reformation locally; YC catalogue/form ready |
| 13:05 | Full personal route integrated locally; ending/reset; rough recording |
| 14:00 | Feature freeze after focused checks and actual WebGL review |
| 15:00 | Exact 90-second export, uploaded playback, submission assets complete |
| 15:20 | Submit with confirmation; ten minutes before 15:30 deadline |

Cut runtime AI, geocoding, persistence, sharing, audio and additional formations first. Reduce morph complexity and catalogue size while keeping three distinct places and verified coordinates. Never consume recording/upload buffer. If the new route is unreliable at freeze, report it unfinished and use the preserved release for an authorized fallback submission; do not describe proposed features as shipped.

## Verification and unresolved items

Run existing TypeScript, depth, choreography, memory and Worker build checks. Add focused checks for new math/validation/state invariants: dateline and antipodal anchors, exact home return, rapid repeated input, reset independence. Inspect native WebGL endpoints, paused depth, repeated open/reform, reduced motion, three labels, phone viewport and preserved Singapore journey. Inert Canvas engine checks are not WebGL pixel proof; physical-phone performance remains unverified.

GitHub remains private: judge access is unresolved. YC's GitHub write access is confirmed, but hackathon portal join, successful draft save and organiser acceptance of the disclosed pre-existing baseline remain separate human requirements. No exact 90-second video/export/upload exists yet. Current Astra evidence is engineering assistance in Codex; runtime inference is stretch.

The shared Drive's existing “God’s Eye View — Features, Data Sources & Layer Analysis” is reference material. Its external feeds and global layers do not expand this sprint's scope.
