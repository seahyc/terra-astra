# Final 90-second demo — v0.5

Recorded from the public deployed app at https://terra-astra.riffster.chatgpt.site on 13 September 2026. Source: `04ac6b3c04d8febbac175d5760298eb83a9c146c`, tag `v0.5`, Sites version 7.

[Download MP4](https://github.com/shariffster/terra-astra/releases/download/v0.5/terra-astra-demo-90.mp4) · [Release](https://github.com/shariffster/terra-astra/releases/tag/v0.5) · [Timing report](https://github.com/shariffster/terra-astra/releases/download/v0.5/verification.json)

The GitHub repository remains PRIVATE. These assets are uploaded, but judge-equivalent access is pending the user's repository visibility choice.

## Actual edit

| Time | Footage |
| --- | --- |
| 00–20 | Real Earth rotation, depth controls, surface perspective, return to globe |
| 20–35 | Real reversible Earth-to-Astra opening |
| 35–60 | Real selection: Singapore shaped me, London home, Tokyo drawn toward; connected personal stars |
| 60–72 | Real reformation and camera settlement with personal connections retained |
| 72–87 | Factual Astra engineering slate: actual user instruction, isolated worker commits and QA regression/fix |
| 87–90 | Actual closing Earth frame: “The constellation was us all along.” |

The app footage uses timestamped native browser captures, preserving measured frame intervals and repeating samples between captures. Encoding at 30 fps does not claim 30 distinct captured frames each second. The last three seconds intentionally hold the closing frame. No app motion is synthesized.

Narration is synthesized locally with the installed macOS Samantha voice. It is not a recording of a team member. No microphone or external voice service was used. Timed silence aligns intact speech; narration is not truncated or stretched. The evidence segment explicitly discloses the existing prototype and Astra's engineering role, with no runtime inference claim.

## Verification and integrity

- Filename: `terra-astra-demo-90.mp4`
- H.264 video, AAC audio, 1280×720, 30 fps.
- Exactly **90.000 seconds** for the MP4 container and video track.
- Exactly **2700** video samples with zero timestamp error against 1/30-second spacing.
- Native AVFoundation verification passed after audio muxing.
- Final narration source: 4,320,000 PCM samples at 48 kHz = exactly 90 seconds.
- File size: **15,106,769 bytes**.
- SHA-256: `487a1200afcde5226552234883e0106bfe8940951c3a15528be6159657d09ee3`.
- GitHub asset API reports uploaded and the same SHA-256 digest.
- Browser player confirmed 1:30 duration, playback, seeking, transformation, form, engineering evidence, and closing frames.

The final local artifact and complete capture/encoding provenance are under the sibling `demo-tooling` directory, outside application source. The release includes the MP4 and machine-readable timing report. A verified upload is not portal submission confirmation.
