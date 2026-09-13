# Teammate task — seahyc

Status: proposed scope, awaiting team agreement. Do not start runtime implementation until the owner confirms this contract. GitHub invitation sent; acceptance is separate from the hackathon portal team join.

Repository: https://github.com/shariffster/terra-astra (private during setup).
Base: `handoff/codex-2026-09-13` at `3dce4c5d5fec20ab6b0b98c675de09713879c93c`.
Work branch: `feat/ask-astra`. Create from that base in your own checkout. Keep all historical tags. No force pushes.

You own only these new files:
- `app/ask-astra.tsx` and `app/ask-astra.module.css`
- `app/api/ask-astra/route.ts`
- `lib/astra/planner.ts`, `lib/astra/planner.test.ts`
- `docs/hackathon/TEAMMATE-EVIDENCE.md`, `docs/hackathon/SUBMISSION-DRAFT.md`

Lead owns `lib/terra/**`, `app/terra-experience.tsx`, `app/globals.css`, all shared types, dependency manifests/lockfiles, hosting, integration, releases and tags. Do not edit those files or deploy. Request an interface change through your PR if necessary. Do not control unrelated Codex tasks. Return work through GitHub.

## Proposed contract v1

The lead will supply `lib/terra/astra-contract.ts` after team agreement. Until then use this document to assess feasibility; do not invent a competing shared type.

Request: `POST /api/ask-astra`, JSON `{prompt: string, stage: 'orbit'|'city'}`. Trim prompt, require 1–400 characters, reject unknown keys and oversized bodies. Never send location, profiles or conversation history.

A plan contains 1–5 actions from this closed set:
- `{type:'view', view:'globe'|'oblique'|'cutaway', region:'indonesia'|'andes'}`
- `{type:'singapore'}`
- `{type:'life', id:'amina'|'daniel'|'mei'}`
- `{type:'return'}`

No arbitrary camera coordinates, URLs, code, tool names, configuration or external searches. The whole plan must be legal starting from the supplied stage; reject invalid transitions. View is orbit-only, life/return are city-only. Singapore transitions orbit→city; return transitions city→orbit.

Success: `{mode:'live', model:'gpt-6-astra', summary:string, actions:Action[]}`. Summary <=160 characters. Only a completed, validated API response may use mode live. Reject malformed/unsupported results; do not silently substitute another model.

Failure: non-2xx `{error:{code:'unavailable'|'invalid_request'|'rate_limited', message:string}}`, with safe user copy and no credential/provider response leakage. Use a short timeout, server-side key, bounded output, and rate/cost safeguards appropriate to a public demo. Do not log the secret or full provider payload.

Component export: `AskAstra({stage, disabled, onPlan})`, where stage is orbit/city, disabled blocks new submission, and `onPlan(plan)` returns Promise<void>. UI owns text submission/loading/error and displays the live/curated label. Lead owns executing the plan via existing UI wrappers, waiting for actual stage callbacks, cancellation/reset, and layout placement. IMPORTANT: awaiting Engine.descend() waits for loading/flight dispatch, not arrival. Never drive the Engine directly.

Curated fallback must be a separate explicit button labelled `Play a curated journey`; use a fixed known route and mode `curated`, model null. Never call a scripted sequence live Astra or auto-convert an API failure into an unlabeled success. Avoid a conversational chat surface; one compact request and a readable action summary is enough.

## Acceptance and cutoff

- Verify `gpt-6-astra` with the actual provisioned account and one successful response; official catalog presence alone is not account access.
- Server key never enters source control, client bundle, response body or logs. Do not paste secrets in task messages.
- Demonstrate one real prompt, validated action sequence, timeout/error, invalid input and explicit curated fallback. Include exact sanitized evidence in your evidence document.
- Check TypeScript and focused validation tests. No new dependencies without lead agreement.
- Open a PR into `sprint/hackathon-integration`; no shared-file edits. Include exact commit and files.
- Integration target 12:15 SGT; if live access remains unavailable, return the component/route feasibility result and prioritize submission preparation. Feature freeze 14:00; assets done 15:00; submit by 15:20 for 15:30 deadline.
- Submission disclosure: working v0.4 existed before today. Distinguish Astra engineering assistance from runtime inference. The portal requires your team join before saving a project.
