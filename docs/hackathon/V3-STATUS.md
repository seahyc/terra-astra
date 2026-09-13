# Living Earth sprint — current closeout

13 September 2026, approximately 12:52 SGT. Feature freeze remains 14:00 SGT; submission deadline remains 15:30 SGT.

## Current app

- Public app: https://terra-astra.riffster.chatgpt.site
- v0.6.1 application source: `c2165327f342ef01e1a55033f16e9ec9cff1a565`; annotated tag `v0.6.1`.
- Sites project: `appgprj_6aa175fa488c8191a2677ce883c203a7`.
- Saved version 9: `appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_cb6a57e8bd148191b5829743badf0869`.
- Deployment `appgdep_6aa62baac4888191a0556b519962ec4a` succeeded at 12:51:03 SGT.
- v0.6 genesis milestone: `05e1a2be79c230993f19b608cd6705ea673c5da2`, preserved as tag `v0.6` and Sites version 8. v0.6.1 only corrects the trench view and regional UI labels.

The existing point engine now performs nucleus → compression → ignition → 3D ejection → capture → exact geographic settlement. Sparse orbital and atmospheric movement occupy distinct radii. Singapore and curated lower Manhattan support planet/region/city/street navigation and deterministic urban activity. Existing relief, geographic coherence and personal features remain retained. See [verification](V3-VERIFICATION.md), [signals provenance](SIGNALS-V3.md), and [urban provenance](URBAN-V3.md).

## YC integration

Use `main` or `hackathon/genesis-v3` as the current base. The callable interface, guaranteed target IDs and sample tool sequence are in [YC-WORLD-COMMANDS.md](YC-WORLD-COMMANDS.md). Renderer internals remain owned by integration. YC owns Live conversation and command mapping. All five command shapes are implemented and the manual controls use the same bridge.

**Actual GPT-Live-1 integration is pending.** Remote `feat/yc-terra-astra` was inspected at setup commit `a540a0b`; no Live implementation was present there. A request for YC's working branch/commit is pending. Do not claim a runtime model call from the working manual route.

## Exactly 90-second video

Release: https://github.com/shariffster/terra-astra/releases/tag/v0.6

Asset: `terra-astra-v06-demo-90.mp4`, 27,338,964 bytes. SHA256: `424676021b0faad353aab543ff148d3a83ac144222946f19214b978b18d7e39a`. GitHub returned the same size and digest after upload.

Native AVFoundation confirms exactly 90.000 seconds, 2,700 video frames at 30 fps and zero video timestamp error. The source footage is actual public v0.6 app capture: genesis, living Earth, Singapore descent/return and New York streets. A separate engineering card and local synthetic Samantha narration describe Astra's development work and explicitly disclose that YC Live is pending. This recording predates the small v0.6.1 trench framing correction; no trench footage is included.

The capture consists of timestamped browser screenshots repeated between samples, encoded at 30 fps. It does not claim 30 unique captures per second. Browser playback, seeking, opening, city scenes and evidence disclosure were reviewed. A later portrait-framed New York retake was rejected; it is not the uploaded asset. The earlier personal-led v0.5 video remains preserved under its own release.

## Remaining submission gates

1. Integrate and verify YC Live → visible action with a real model session; update the final recording if this changes the demonstrated flow.
2. GitHub repository and release video are still **private**. Judge-equivalent access is not confirmed. The user's sharing decision remains pending; audience has not been changed.
3. Hackathon portal team membership and final submission are **unknown / unconfirmed**. Preserve actual portal confirmation when submitted.

## Preservation and work ownership

`pre-hackathon` remains `9b9e2ec4ef3534b463e20d4d08c4ae3de444843d`; v0.5 remains `04ac6b3c04d8febbac175d5760298eb83a9c146c`. No tag or historical plan was rewritten. The original handoff checkout remains separate from the integration worktree.

Genesis worker owned renderer/camera/math only. Signals worker owned pure trajectory data and checks. Urban worker owned geometry/activity utilities and later independent read-only QA. Integration owned commands, UI, cherry-picks, native visual review, publication and demo. Worker commits and the integrating history are preserved in Git. The reference projection video was unavailable in the searched shared folder; the reuse decision is based on the inspected existing implementation, not a claimed viewing of that video.
