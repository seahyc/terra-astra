# Proposed v0.3 — A light you remember

Status: proposed; not implemented. The immediate baseline is v0.2.1, which adds history to the completed v0.2 refinement.

## Outcome
After discovering one fictional life, the viewer can follow that light back into the whole Earth. The closing line should describe an experience the viewer has already felt.

## Scope, in order

### 1. Calibrate the existing rendering on a real device
- Review v0.2.1 in the owner's WebGL browser at orbit, approach, city, selected life and return; retain the same framing and light settings for comparisons.
- Check that streets remain readable before selection and peripheral afterward; preserve discrete stars without excessive brightness or empty-looking regions.
- If calibration is needed, base city point density and brightness on projected screen area as well as altitude. Retain stable sampling so stars do not shuffle while zooming.
- Capture frame-time and pixel-ratio observations through development diagnostics; do not add performance controls to the main experience.

### 2. Retain the selected life during the return
- Separate the selected panel from a remembered story ID. Closing a panel must not erase the visited life.
- On return, keep the three geographic points and their links while the city comes back into view.
- As their projected separation becomes too small to read, fade their links into a single representative glimmer anchored near the constellation's center. This is an artistic representation of the fictional life, not a live location.
- Hold that glimmer through the pullback, then let it settle into the existing city lights. Keep the closing sentence for the settled orbit.
- If no life was visited, use a neutral return; do not imply a human discovery that did not happen.
- Clear remembered state when beginning a deliberately new journey. No accounts, tracking or persistent personal data are required.

### 3. Make the three scales feel connected
- Reuse the geographic anchor, gold tint and restrained pulse so the person can be recognized across the city and globe views.
- Let text and controls recede without making navigation inaccessible.
- Reduced-motion mode must reach the same clear end state without the animated sequence.

## Acceptance criteria
- A first-time viewer can follow the chosen life through the return without relying on its label.
- No empty geographic interval, bright city patch or sudden disappearance of the selected light during flight.
- All three authored lives work, including after panning, changing lives and closing the panel.
- Story labels remain clear on a phone with the panel expanded and collapsed.
- Desktop and phone WebGL review is recorded separately from the Canvas fallback.
- The build has a fresh version, history entry, source tag and saved Sites version; v0.1, v0.2 and v0.2.1 remain recoverable.

## Later: v0.4 exploration
More fluid free exploration and broader Singapore context can follow the emotional return. Expanding detailed geography requires actual additional source coverage and a streaming/detail budget. Full-world people, real profiles, live presence, accounts, audio and global street coverage are outside the proposed v0.3 build.

## Review evidence to retain
For each meaningful visual milestone, retain an orbit view, city view, selected-life view and a short return recording with viewport, renderer and settings. Do not substitute fallback images for proof of WebGL appearance. Add supplied review evidence to the milestone notes when available.
