# Exactly 90 seconds — recording script

Use the actual public release and capture real WebGL. This script is a production guide, not proof that a video has been recorded. Runtime Ask Astra is absent from v0.4.1; do not claim it.

| Time | Picture | Voice or caption |
|---|---|---|
| 00–10 | Full Earth, slow rotation | “We have always looked up to find the stars. Terra Astra turns our gaze home.” |
| 10–22 | Pause, Horizon, Cutaway; show relief | “Real terrain and ocean-floor data shape a body of starlight. Its interior is an artistic interpretation.” |
| 22–32 | Globe → Enter Singapore, uninterrupted descent | “A planet becomes a place.” |
| 32–47 | Select Amina; reveal three places and story | “An imagined life, held by familiar places: Kampong Gelam, Little India, Marina Bay.” |
| 47–60 | Close panel; Return to orbit; remembered light | “Return, and that life stays with you as one warm light.” |
| 60–78 | Actual Astra prompt, reviewer diagnosis, source diff, and phone result | “We began today with our working v0.4 prototype. Astra reviewed the journey, found a phone-framing bug and a frozen-scene recovery gap, and helped us fix and verify them in WebGL.” |
| 78–90 | Settled Earth, closing words; project name | “The constellation was us all along.” |

## Capture discipline

- Open https://terra-astra.riffster.chatgpt.site, confirm v0.4.1 and native WebGL.
- Restart journey before each take. Use visible UI actions. Disable unrelated notifications through existing user settings only; do not capture messages, tokens, profile details or other tasks.
- Use desktop landscape output; keep the entire app in frame. Record clean source footage longer than each slot, then trim.
- For engineering evidence use the exact sanitized instruction and changes in ASTRA-EVIDENCE.md and Git diff v0.4…v0.4.1. Do not fabricate a runtime request or response.
- If the teammate later delivers verified live inference, substitute its actual request/actions for part of the middle segment and adjust captions. Keep the baseline disclosure.
- Final export: H.264 MP4, 30 fps, exactly 2,700 frames = 90.000 seconds. Match audio to 90.000 seconds. Verify actual container/stream duration with ffprobe or equivalent before upload.
- Open the uploaded URL without owner credentials; duration, access and successful portal submission need explicit evidence.
