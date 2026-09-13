# Evidence and geographic answering handoff

Current integrated state, 13 September 2026. The application uses one renderer boundary: the shared validated `WorldCommand` path in `lib/world/bridge.ts` and `lib/terra/engine.ts`. Voice and manual navigation use that same path. There is no active evidence-scene renderer, secondary scene director, or standalone review renderer.

## Current contract

Fast, simple navigation intents map directly to validated WorldCommands. The engine currently supports:

- catalog targets: Singapore, New York, and Challenger Deep;
- target scales defined by the WorldCommand schema;
- orbit and aircraft layer toggles, plus reset;
- deterministic illustrative activity including 20 city-pair flight paths, 12 orbital lights, and 6 sea paths.

These layers are illustrative and are not live tracking. Unknown targets, scales, layers, and malformed commands fail closed. The engine serializes commands so one navigation result cannot race another.

Complex general questions use the native Agents path with exactly two subagents: one reviews the explanation and uncertainty, while the other proposes up to four geographic orientation anchors. The coordinator waits for both. An anchor does not itself grant the renderer a new target or arbitrary-coordinate command.

## Retained evidence

The cached Java relief profile and Singapore-Malaysia crossing measurements remain available to ground answer text and backend checks:

| Stable ID | Text result | Boundary |
|---|---|---|
| `profile:java-north-south` | 121 samples; +984 m to -5,361 m; 6,345 m range | One cached NOAA-grid meridian, not actual summit or trench maxima. |
| `crossing:causeway` | 1,056 m | Published bank-to-bank structure length. |
| `crossing:second-link` | 1,920 m | Published bridge section; excludes the 47 km highway. |

The ordered comparison is 864 m and about 1.82 times. These values do not activate a map trace, profile, projected label, Angkor sculpture, or evidence overlay. The application must not imply that such geometry is visible.

The former `/evidence` review route now redirects to `/`. The standalone `EvidenceExperience` and engine adapter were removed. Generic evidence catalog, measurement, and director modules may remain for backend and unit tests, but no application runtime imports them as renderer authority.

## Future extension rule

Arbitrary locations, a richer `presentScene` operation, sourced overlays, and narration-beat readiness are future work. Add them as validated variants of the same WorldCommand boundary and implement them in the shared engine. Do not create a parallel renderer, direct camera adapter, or model-authored geometry execution path.

Any future scene command needs bounded coordinates and counts, explicit supported semantics, serialized execution, reduced-motion and Canvas behavior, and an observable readiness result. Only after that readiness result exists may narration claim the corresponding visual is visible.

## Verification status

The shared engine matches the supplied world-only baseline. Its deterministic harness passes catalog navigation, scale commands, layer toggles, sourced New York detail, Singapore return, Challenger Deep regional view, reset, invalid-command handling, and graphics-loss settlement. The signal harness reports finite, bounded, repeatable samples for the 20 flight paths, 12 orbital lights, and 6 sea paths. The settled project TypeScript check passes.

GPT-Live WebRTC startup, remote audio track, transcripts, and a clean close were observed separately. A complete audible question-to-Agents-to-WorldCommand-to-playback interaction, including interruption behavior, remains pending real end-to-end verification.
