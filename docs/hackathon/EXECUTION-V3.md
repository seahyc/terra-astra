# Current execution authority — v3

User decision received 13 September 2026, approximately 12:15 SGT. This supersedes conflicting scope in REVISED-PLAN.md and the personal-led ACTIVE-SPRINT.md. Both documents and all published milestones remain historical evidence, unchanged.

Visual authority: [Visual Grammar & Scale System v1](https://docs.google.com/document/d/14xKqLDB92gORY05EtiC94XryzG0IWsnVL03LbyTUnpk/edit), read 12:17 SGT; modified 12:03:48 SGT.
Execution authority: [Hackathon Execution Plan & Codex Orchestration v3](https://docs.google.com/document/d/1PGlwKuJzlBd3-Y81dhNVDZP-dcdl9IylJMTWdXEBSPg/edit), read 12:17 SGT; modified 12:10:57 SGT.

Primary journey: nucleus → compression → ignition → volumetric ejection → geographic capture → layered Earth → region → city → street → Astra-guided visual navigation. Personal constellations are retained without expansion. YC owns GPT-Live-1 voice/chat and command mapping, not renderer internals.

Preserved release: v0.5 at 04ac6b3c04d8febbac175d5760298eb83a9c146c, public Sites version 7. New work starts from bc774128a02eefe331ec9147def0126f86b7b39d on hackathon/genesis-v3 in terra-astra-integration, leaving the original handoff checkout intact. No historical tags or plans are rewritten. Production changes only through a deliberate verified release.

## Inspection and reuse decision

engine.ts owns one Three scene and the shared point shader. Prepared buffers hold immutable xyz geography plus brightness, starSize and phase. Geographic particle groups are land, coast, lights, relief-land, relief-ocean, stellar-body/interior/haze/halo. 296,171 prepared spatial points supplement 45,433 land, 20,958 coast and 22,081 night-light points. Singapore adds static roads and 70,726 city particles on demand.

transformation.ts contains deterministic openedPosition GLSL and matching openingPosition CPU math. engine.ts drives opening/openingFrame uniforms with a serialized morph progress; Canvas mirrors this path. Original buffer positions are not overwritten. Genesis can extend this same point pipeline with deterministic stable identities and a separate bounded progress value. No second particle engine is necessary.

## File ownership

00 Integration: lib/world/commands.ts, command bridge, app UI/CSS, documentation, releases, integration and browser verification.
01 Genesis/spatial: lib/terra/engine.ts, canvas-renderer.ts, transformation.ts, spatial.ts, genesis.ts and renderer math checks. Sole renderer/camera owner during implementation. Implements engine command adapter against the shared type.
02 Signals: lib/world/signals.ts and isolated signal checks/provenance only. No renderer/UI edits.
03 Urban: lib/world/urban-activity.ts, optional bundled curated New York geometry and isolated activity checks/provenance only. No renderer/camera/UI edits.

Each worker inspects, commits scoped work, and reports checks, risks and SHA. Integrator cherry-picks. UI command bridge is the only entry point needed by YC; no access to internal Three objects.

14:00 SGT feature freeze. After freeze: fixes, performance, recording, access, submission. Cut extra data, cables, additional deep cities, ships, advanced terrain, personal expansion in that order. Preserve stable Earth, readable genesis, convincing depth, one living shell, Singapore descent, a working navigation command path, and demo reliability.
