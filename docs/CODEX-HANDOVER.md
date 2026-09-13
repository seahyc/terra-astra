# Terra Astra — Codex hackathon handover

Prepared 13 September 2026. This document prepares a migration; it does not claim that new hackathon features, a GitHub repository or a new deployment have been created.

## Start here

Continue the existing project. Read AGENTS.md, this document, docs/IMPLEMENTATION.md and docs/DEPTH-STUDY.md. Preserve all release tags. Reproduce v0.4 locally before changing rendering. Do not rebuild from a screenshot or regenerate the geography.

- Live baseline: https://terra-astra.riffster.chatgpt.site
- History: https://terra-astra.riffster.chatgpt.site/history
- Source baseline: `9b9e2ec4ef3534b463e20d4d08c4ae3de444843d`, tag `v0.4`.
- Existing tags: v0.1, v0.2, v0.2.1, v0.3, v0.4.
- Existing Sites project: `appgprj_6aa175fa488c8191a2677ce883c203a7`.
- Handover branch: `handoff/codex-2026-09-13` (documentation only).
- A GitHub repository was not found by connected installed-repository search for “terra”. This is not proof none exists. No GitHub creation tool or authenticated gh CLI was available in the export environment.

## What we are making

Terra Astra — Earth, constellated. We have always looked up to see the stars. From space, Earth becomes a constellation of geography, places and lives. The emotional journey is Earth → Singapore → one fictional life → remembered light returning to Earth. Preserve the ending: “the constellation was us all along”.

The user wants glitter, shimmer, genuine spatial depth, terrain contours and oceans with character. Maintain crisp points, generous darkness, warm human lights and cooler geographic structure. A glowing blur or a flat dotted shell misses the brief. Depth should remain legible with motion paused.

## Verified source inventory

React 19 / Next-compatible Vinext / TypeScript / Three.js, with a Cloudflare Worker build. Node >=22.13.0. Existing lockfile and prepared data are included.

| File | Responsibility |
| --- | --- |
| app/terra-experience.tsx | Main interface, narrative state, engine wiring |
| app/depth-controls.tsx | Spatial study controls |
| app/globals.css | Visual styling |
| lib/terra/engine.ts | Three.js rendering, camera, selection, transitions, resource lifecycle |
| lib/terra/canvas-renderer.ts | Lower-detail Canvas2D fallback |
| lib/terra/spatial.ts | Relief and spatial study logic |
| lib/terra/choreography.ts | Journey timing and camera support |
| lib/terra/scintillation.ts | Shimmer rhythms |
| lib/terra/stories.ts | Three fictional lives |
| lib/terra/releases.ts, CHANGELOG.md | Visible release record |
| public/data/ | Approximately 17 MB of prepared binary geography and manifests |

v0.4 includes Globe, Horizon, Cutaway, two region presets, Surface reference, shimmer controls, real central Singapore streets, three stories and remembered-life return. Surface reference is a same-camera treatment comparison, not a running historical release.

Data: Natural Earth, NASA Black Marble 2016, OSM central Singapore (9 September 2026), NOAA ETOPO 2022. Night lights are historical artistic samples, not live presence or population. Interior stellar matter is interpretive, not geological measurement. Retain attribution and fictional-story labels.

The current Engine interface exposes descend, orbit, zoom, rotate, select, configure, storyInset, view, region and dispose. Use those existing operations as the integration boundary. Inspect exact types before coding. No live Astra interaction was found in the inspected baseline; do not represent it as already implemented.

## Reproduce on the Mac

1. Clone the supplied Git bundle using the command in START-HERE.md. It contains source and history.
2. If the Sites plugin is available, follow its current execution-profile setup for this checkout. The existing clean-clone profile defaults to portable; do not copy managed Linux caches or runtime state to macOS.
3. Run `npm run install:ci` once, then `npm run dev`. Use the loopback URL printed by the server (portable default port 5173).
4. Run `npm run build`, `npx tsc --noEmit`, and the relevant existing checks: `node scripts/check-choreography.mjs`, `node scripts/check-memory.mjs`, `node scripts/check-depth.mjs`.
5. Visually inspect actual WebGL in the Mac browser. Previous automated pixel reviews used Canvas2D. Physical-phone performance remains unverified. This export did not reinstall dependencies or rerun the app.

## GitHub and ownership

Create or reuse one shared GitHub repository, suggested name `terra-astra`. Preserve existing commit history and tags. Use a private repository during development if preferred, but ensure judges can access the submitted repository. Add the teammate through the owner's GitHub interface once their exact username is known. Do not publish credentials, API keys, account tokens, environment files or unrelated screenshots.

After restoring the bundle, origin points to the local bundle: rename it `handover-bundle`, then add the actual GitHub URL as origin. Push main, the handover branch and release tags without force. Do not use `--mirror`. Treat GitHub as the team's integration source; keep Sites publishing under one release owner. Reuse the existing Site identity when publishing there. Preserve the v0.4 tag and distinguish source changes from deployed releases.

## Work split — recommended, not yet assigned

| Owner | Scope | File boundary / output |
| --- | --- | --- |
| Shariff + lead Codex thread | Visual direction, render/camera improvements, merge and release | engine.ts, spatial.ts, scintillation.ts, canvas-renderer.ts; lead owns shared UI wiring |
| Teammate + their Codex session | One bounded Astra interaction, if agreed | New server route and isolated UI component; coordinate types with lead before editing shared files |
| Lead's QA subagent | Read-only review and existing checks | Return defects, commands, renderer limits; no deployment |
| Teammate alongside development | Portal join, submission draft, demo evidence collection | Save exact Astra prompts/changes and usable before/after recordings |

Use separate branches/worktrees. One editor at a time per shared file. Agree a small action schema before parallel implementation. Integration owner resolves conflicts and runs the full journey. If applicable Sites instructions restrict subagents to read-only/asset work, obey that restriction; independent human-owned checkouts can supply patches through GitHub.

Codex can spawn and steer its own subagents when explicitly requested. Do not assume arbitrary existing sidebar conversations or the teammate's session can be controlled by the lead. Use GitHub and explicit task briefs between independent sessions.

## Hackathon scope recommendation

Must ship: a stable, impressive WebGL Earth; clean Singapore descent; one legible human reveal and remembered return; reliable reset; judge-accessible deployment and GitHub; exactly 90-second video showing the app and evidenced Astra use.

Recommended new capability, only after team agreement: a compact “Ask Astra” interaction that maps a request to a small validated set of supported scene actions. Example: “Show me the ocean floor, then take me to a life in Singapore.” Keep model/API credentials server-side; validate action IDs and sequence transitions. Provide loading/error states and a clearly labelled curated route when live inference fails. Use the actual model available to the account; verify its API identifier. Do not label a scripted sequence as live inference.

Cut: global street streaming, more cities, real profiles, login, social graph, live population, arbitrary geocoding, new scientific datasets, a rendering-engine rewrite and a hosting migration. Add only one demonstrated Astra interaction if there is time; do not let it displace the functioning journey.

The screenshot does not establish that runtime AI is mandatory. Astra-assisted engineering and runtime Astra are distinct claims. Record actual usage and check track criteria with the organiser.

## Deadline and portal

Screenshot at 10:44 am SGT shows deadline 13 September 2026, 3:30 pm SGT, with about 4h45 remaining. It explicitly says: “Your teammate must join before you save a project.” Resolve immediately. Portal access is working for Shariff; team acceptance and successful draft save are not verified.

Form requires description <=300 characters, how Astra was used, demo URL, video URL and judge-accessible GitHub URL. Choose up to two tracks. Agentic Engineering is a candidate if demonstrated; Visual Understanding requires evidence of visual interpretation, not just beautiful output. Do not select Agents API merely because Codex subagents were used. Check rules on pre-existing code and disclose v0.4 as the starting point; do not claim it was created during the five-hour event.

Suggested timetable (SGT): by 11:05 source runs + team joins + repo ready; by 12:15 core changes and first integration; by 13:15 complete end-to-end route; by 14:00 feature freeze and deploy; 14:00–14:40 record/edit; by 15:00 upload and save complete submission; 15:00–15:20 verify all links and submit, leaving ten minutes contingency. If starting later, cut optional features rather than consuming the recording/submission buffer.

## Exactly 90 seconds — shot plan

| Time | Evidence |
| --- | --- |
| 0–10s | Earth opening; “We have always looked up to see the stars.” |
| 10–25s | Rotate, oblique relief and ocean structure; show actual interaction |
| 25–45s | Astra-driven action if implemented; otherwise demonstrate the guided descent without an AI claim |
| 45–65s | Open a life, reveal its places, return with the remembered light |
| 65–82s | Show actual Astra engineering evidence: prompt, diagnosis/change, resulting visual improvement; mention runtime use only if real |
| 82–90s | Earth settles; “the constellation was us all along”; project name |

Capture real app footage and keep the complete flow repeatable. Verify the exported duration is 90.000 seconds, not merely estimated from the timeline. Open the deployed app, repo and uploaded video with judge-equivalent access. Record the submission confirmation.

Official workflow references: https://learn.chatgpt.com/docs/agent-configuration/subagents and https://learn.chatgpt.com/docs/environments/git-worktrees (checked 13 September 2026).
