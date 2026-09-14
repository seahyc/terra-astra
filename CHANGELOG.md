# Terra Astra changelog

Semantic versions label the experience; Sites version numbers identify saved deployment packages. They are separate counters. `lib/terra/releases.ts` is the source for the public history page and current build badge. Git tags identify exact source snapshots; native Sites records are authoritative for save/deploy status.

## v0.10.0-alpha.6 — 2026-09-14 — Open to every ChatGPT user
- Publishes the personal fork at its own public Sites URL without changing the hackathon deployment.
- Connects Sites to the isolated bridge through a stable free ngrok domain; macOS restarts both services and Keychain holds the shared credential.
- Hosted status and device-authorization start pass. Sites still requires ChatGPT sign-in before the renderer, and a complete visitor answer awaits browser login.

## v0.10.0-alpha.5 — 2026-09-14 — The bridge can leave the edge
- Uses the edge runtime’s supported manual redirect mode and explicitly rejects every redirect response.
- Fixes the hosted proxy failing before it contacted the external account bridge.

## v0.10.0-alpha.4 — 2026-09-14 — A protected network probe
- Adds a service-credential-protected diagnostic response for the Site-to-bridge network boundary after the hosted log feed returned no events.
- Ordinary visitors still receive only the existing generic offline state.

## v0.10.0-alpha.3 — 2026-09-14 — A visible service boundary
- Records sanitized server telemetry when the hosted renderer cannot reach the account bridge: error type, bounded message, target host, method and route only.
- Never records questions, answers, session cookies, device codes or service credentials.

## v0.10.0-alpha.2 — 2026-09-14 — A separate home for open exploration
- Registers the personal fork as its own Sites project so publishing cannot replace the teammate-era hackathon deployment.
- Keeps the renderer public while visitor-owned inference remains behind the isolated Codex account bridge.
- The first release is private until the external bridge, real device authorization, and complete hosted request path are verified.

## v0.10.0-alpha.1 — 2026-09-13 — Open exploration preview
- Personal-fork preview: public globe, prepared models and data feeds; inference requires a visitor-owned Codex connection through official device authorization.
- General grounded search and safe procedural recipes replace demo evidence routing. Follow-up context is carried explicitly. No paid API-key fallback, live voice or image-generation calls.
- A separate Node bridge isolates visitor credential contexts and bounds concurrent jobs, duration, retrieval and output size. Sites serves the renderer and proxies to a configured HTTPS bridge.
- Tests cover source/geometry validation, anonymous browsing, per-visitor accounts, logout, overlap and cancellation. Local desktop/phone connection UI and the real device-code initiation were checked. Full visitor authorization awaits user completion; no public bridge or replacement deployment has been provisioned.
- See docs/OPEN-EXPLORATION.md and docs/evals/OPEN-SEARCH.md. This is a source preview, not a saved or deployed Sites release.

## v0.9 — 2026-09-13 — Ready for the journey
- Stop ends microphone tracks immediately; the data channel remains briefly available for final usage. A new regression verifies no false ended-track error and successful late usage delivery.
- Disconnected sessions return to a usable Talk button; the visible status omits raw usage JSON.
- Gently raises existing SG/NY continuation luminance (4.4→5.5; filament cap .18→.20), with no geometry, camera, layer population or destination changes.
- Public v0.8 verified an actual spoken Palm request through GPT-Live-1 → WorldCommand → visible arrival, then session close. This patch retains that path; final public smoke evidence follows deployment.

## v0.8 — 2026-09-13 — Different places, different motion
- Selectively adapts YC f3ea241 Live transport and hosted session/answer endpoints, preserving existing renderer and command payloads. Typed catalogue requests acknowledge, move immediately, then explain. Existing authentication remains; server OPENAI_API_KEY is required. No models, database, new renderer, arbitrary-coordinate API or extra datasets from YC’s branch are included. Server secret configured at14:36; native microphone/audio verification follows deployment.
- Selectively adapts the Palm Jumeirah and Makkah spike from 4023b278d664f5d827d188413f1e7c71376b20dc onto current v0.7.1. No wholesale stale-branch merge.
- Adds lazy, bounded OSM snapshots and shared destination hooks. Palm retains mapped trunk/frond/crescent geometry, Dubai mainland and curated warm road activity. Makkah retains mosque context, a mapped Kaaba anchor, soft counter-clockwise collective flow and persistent mobile disclosure.
- Preserves current Genesis, warm SG/NY preparation, 1,100ms same-target scales, FIFO command results, existing destinations and all richness layers. Commands gain two target IDs; payloads remain compatible.
- New destination activity is explicitly illustrative, not live human tracking. No new renderer, framework or tracking provider.
- TypeScript, special-destination lifecycle/geography/CCW, existing world, response and Genesis checks pass. Native acceptance and publication evidence are recorded in docs/special-destinations/INTEGRATION-GATE.md. Physical-phone performance remains unverified.

## v0.7.1 — 2026-09-13 — Stay with the place you chose
- Fixes an inherited primary action that still offered Singapore while viewing New York region or Challenger Deep.
- Uses the existing WorldCommand scale path: New York regional view enters New York city; Challenger Deep returns to planet. The opening still offers Singapore.
- Renderer, geometry and all v0.7 richness are unchanged. v0.7 remains preserved as source tag and Sites version 10, published at 14:01 SGT.

## v0.7 — 2026-09-13 — A wider, more responsive world
- Run 1 authority: Richness + Responsiveness v4. Preserves v0.6.1 history and the existing renderer, Genesis and YC WorldCommand API.
- Starts camera motion before cold city loading, prepares Singapore and New York after Genesis, retains prepared geometry, and reduces same-target scale travel from 6,800 to 1,100ms while preserving serialized completion results.
- Adds 72 orbital, 120 aircraft and 24 sea records; multiple altitude bands, moving trails, ten faint illustrative undersea backbones, and two faint stellar depth shells.
- Adds cached, land-masked city continuation around the detailed OSM cores. Urban traffic uses road length/connectivity and activity gathers around junction hubs. No new provider, backend or live-tracking claim.
- Adds focused-canvas WASD/QE/RF/TG and 1–4/0 navigation; typing targets and modifier shortcuts are ignored.
- Native Mac WebGL: warm SG City→Street 1,201ms (baseline 6,877ms), Street→Region 1,206ms (baseline 6,917ms), NY City→Street 1,186ms. Rolling render diagnostic remained near 120fps at 1027×989 CSS pixels. These are local session observations, not physical-phone or cold-network benchmarks.
- TypeScript, renderer responsiveness, world lifecycle, Genesis, signals, cables, urban, continuation, memory and transformation checks pass. Saved-version/deployment evidence is recorded separately in RUN1-V4.md after publication.

## v0.6.1 — 2026-09-13 — A clearer view into the deep
- Historical changelog completion: this release was already recorded in public build history and tagged before Run 1; this note does not alter its source/tag.
- Challenger Deep uses the existing angled Horizon view, with regional seafloor contrast and matching target/transition labels. Source tag: c2165327f342ef01e1a55033f16e9ec9cff1a565. Saved as Sites version 9 and deployed before Run 1.

## v0.6 — 2026-09-13 — A world born from stars
- Historical changelog completion: this release was already recorded in public build history and tagged before Run 1; this note does not alter its source/tag.
- Existing geographic particles form a dense nucleus, eject and return to Earth. Distinct orbit/air movement, New York streets, procedural urban activity and the serializable WorldCommand bridge join the Singapore journey.
- Source tag: 05e1a2be79c230993f19b608cd6705ea673c5da2. The preserved 90-second demo records this milestone; separate YC Live conversation integration remained pending.

## v0.5 — 2026-09-13 — A universe within
- Opens the existing geographic particles into a deterministic volumetric stellar spiral and reforms exact original positions. GPU and sampled Canvas share the transformation math; camera actions are serialized during transitions.
- Adds a keyboard-accessible three-place form and a 48-place sourced local catalogue. No geocoding service, credentials, persistence, or runtime model call is needed.
- Personal geometry derives from the three geographic distances, with bounded regularization for close or collinear places. Real geographic anchors and geodesic threads remain visible on the closing Earth.
- Retains personal memory through the separate Singapore journey. Draft reset preserves submitted stars; explicit clear removes them; Restart journey clears session state.
- Improves phone framing so the personal stars, form and closing text occupy separate areas. Preserves the existing visual identity and historical releases.
- Validation: TypeScript; sourced model boundary; 2,000 reversible particle paths and real-engine lifecycle; existing 482 geography / 1,446 remembered-return camera samples; depth and memory checks. Native WebGL reviewed at 1280×720 and 390×844 with no console warnings/errors in the tested route. Observed rolling render diagnostics near 120fps on the Mac browser; not a physical-phone measurement or universal guarantee.
- Preserves pre-existing v0.4 at `pre-hackathon` and `v0.4`, and today's v0.4.1. Astra's role was source investigation, parallel implementation, integration and verification in Codex.

## v0.4.1 — 2026-09-13 — A journey you can return to
- Restores the existing v0.4 history into a portable Mac checkout and private shared GitHub repository; no data regeneration or renderer replacement.
- Adds a complete Restart journey action using page reload, clearing camera, tuning, region, selected/remembered life and in-flight work.
- Fits the home globe inside its desktop composition and recalculates home altitude when the viewport changes.
- Reapplies story-panel fitting when switching lives at phone width, including equal-height panels.
- Marks graphics-context loss as a fatal restartable state; a lost renderer stays stopped across visibility changes.
- Verification: geography, choreography, lifecycle and TypeScript checks; production build. The lifecycle check now covers home resize and same-height phone story switching.
- Native WebGL review on the Mac covered paused Globe/Horizon/Cutaway, Singapore, expanded Amina, all three lives at 390 × 844, and a remembered-light return. Physical-phone performance and induced GPU context loss remain unverified.
- Retains the exact v0.4 tag and earlier milestones. Today's engineering changes are distinct from the pre-existing prototype. No runtime Astra inference is claimed.

## v0.4 — 2026-09-12 — A world with depth
- Adds real NOAA ETOPO 2022 land elevation and ocean bathymetry, artistically exaggerated. Slope and elevation bands emphasize mountain profiles, shelves, ridges and trenches.
- Adds 296,171 prepared spatial particles across land, ocean, body, interior, haze and halo layers, with screen-dependent draw budgets. Interior structures are interpretive, not geological measurements or people.
- Adds Globe, Horizon and Cutaway perspectives, Indonesia / Java Trench and Andes / Pacific presets, and a fixed-camera Surface reference switch. Phone cutaways leave the opening clear of the controls.
- Applies perspective sizing, ray-depth attenuation and world-fixed cut planes to 3D particles in both renderers. Separately balances the Canvas fallback and increases nearby terrain detail. Paused scenes stop redrawing after settling.
- Fades spatial relief before Singapore street scale and resets the study view on descent. Preserves the fictional lives, their remembered light and the return choreography.
- Adds reproducible source preparation and provenance in `scripts/prepare-relief.py`, `public/data/relief-manifest.json` and `docs/DEPTH-STUDY.md`.
- Verification: actual relief registration, radial thickness and source checks; real-engine checks of all three views in both regions, fixed comparison camera, safe close zoom, city reset and all existing remembered-life cases; 482 geography-flight and 1,446 remembered-return projection frames; targeted lint, TypeScript and production build.
- Visual review: motion-paused desktop and 390 × 844 phone-width Canvas views; Indonesia and Andes relief; Surface reference; cutaway orbit; Singapore selection and return. Native WebGL pixels and physical-device performance remain unverified.
- Preserves v0.3 at source `a4823cf3dbbb8a94749cdc0452b5d2c6f06472b8`, annotated tag `v0.3`, saved Sites version 4 (`appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_cd54921e18e48191a7b192014ffb6801`). The Surface reference is an in-build comparison, not a separately playable old release.

## v0.3 — 2026-09-12 — A light you remember
- Adds independent shimmer rhythms, sparse diffraction glints, brighter cores and a fuller halo to geographic stars. Includes a Star shimmer slider; pause/reduced motion stops the effect.
- Keeps the last visited fictional life independently of its panel. On return, its places merge by their projected separation into one geographically anchored warm glimmer with the same pulse.
- Recalls the visited places after a city pan, holds the orbit before showing the closing line, and leaves a quiet residual light. New journeys clear the remembered life; unvisited journeys return neutrally.
- Preserves more city context around a selection, scales city point budgets with screen area, and delays turning in portrait views so the remembered light stays visible.
- Removes static star glyphs that obscured the rendered human shimmer while retaining labels and accessible hit targets.
- Verification: engine lifecycle and deterministic light checks; 482 geographic flight frames and 1,446 projected remembered-life return frames across desktop and phone dimensions; TypeScript and production build.
- No v0.3 browser pixel comparison or physical-device performance review was performed. Prior v0.2 Canvas screenshots are historical evidence, not verification of this shader change.
- Preserves the v0.2.1 baseline at source `44b193b2a6a6791de52d32bb676ffb336cd91713`, tag `v0.2.1`, saved Sites version 3 (`appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_63a7b36f6fdc81919d643c440acb14fe`).

## v0.2.1 — 2026-09-12 — Build history
- Adds `/history`, a visible build number and an About link to the release record.
- Records changes and review limits for each milestone.
- Adds annotated source tags for the two existing milestones and this release.
- Establishes a release checklist and a proposed v0.3 build brief.
- Inherits the v0.2 rendering unchanged. Full WebGL appearance and physical-phone performance remain unverified by the agent.

## v0.2 — 2026-09-09 — Continuity, light and the human reveal
- Ascent zooms out before turning; regional geometry bridges global and local detail.
- City stars use stable sampling, altitude-based draw budgets and smaller sprites.
- Streets feather inside the actual data bounds; selected-life context dims.
- Stars, links and the opening sentence reveal in order. Stories expand on request.
- Phone camera framing responds to the story panel; labels flip to avoid clipping.
- Verified: production build, TypeScript, 482 camera samples with visible source geography, and desktop/phone-width fallback interactions.
- Saved as Sites version 2; no standalone deployment as of the 2026-09-12 history audit. Included in v0.2.1.
- Source: `9f647d8ffff42156534b9ac3f1f2f9d816dc90d8`; tag `v0.2`.
- Saved ID: `appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_3510fbc599a88191862b13b6fdd840dd`.

## v0.1 — 2026-09-09 — Original prototype
- Star Earth, rotation and zoom, guided Singapore descent, three fictional lives, return to orbit and light controls.
- Natural Earth geography, NASA Black Marble 2016 light samples and OSM central Singapore streets.
- Saved and deployed as Sites version 1. Owner recording exposed bright compressed city detail and a dark return transition.
- Source: `d5e3ad98c03d8a5841e37b9bebe0bff045298535`; tag `v0.1`.
- Saved ID: `appgprj_6aa175fa488c8191a2677ce883c203a7~appgver_901ef2d96a5481919bdd3d87833e42df`.

## Version convention
- A focused feature milestone increments the minor version: `v0.3`, `v0.4`.
- A bounded fix or supporting addition increments the patch: `v0.2.1`, `v0.2.2`.
- Add an entry; do not overwrite an old release or move its tag. Correct historical facts through explicit notes.
- Dates describe build milestones in UTC. A saved milestone is not necessarily a published one.

## Release checklist
1. Confirm the current Site, audience, saved versions and clean source baseline.
2. Make only the authorized changes; update this changelog and `lib/terra/releases.ts` together.
3. Record what was checked, with device and renderer limitations. Never mark a proposal as implemented.
4. Validate the required build and relevant checks, commit the exact source and annotate its version tag.
5. Push that source and tag, package it, save a new Sites version, and publish under the current Sites workflow and user instructions.
6. Confirm terminal deployment success before saying it is live. Handoff the semantic version, URL, changes and outstanding limits.

For rollback, select the known saved Sites version and redeploy it when authorized. Preserve newer history; do not force-reset the source branch. There is no simultaneous playable version comparison in this release.


## v0.7.0 — 2026-09-13 — Ask the Earth
- Integrates typed and Live voice questions into the original globe through the shared WorldCommand interface; supports aerial, horizon and cutaway choices.
- Routes ordinary questions through Luna, stronger reasoning and live source searches through Terra, and explicit in-depth research through native Astra delegation. Optional generated answer images use Flare.
- Extends the shared camera boundary with validated regional geographic anchors, preserving the existing globe and detailed Singapore/New York scenes.
- Removes obsolete Explore/depth panels and fictional-person controls; fixes removed-state references and preserves the renderer coordinate callback.
- Adds a hosted Fetch API for signed-in ChatGPT users, with server-only credentials, bounded requests, cancellation, and Worker-compatible research imports. Public visitors can explore the globe without signing in.
- Validation: TypeScript, build, world/navigation/evidence/stream/image tests and hosted API authentication, body limits, cancellation, streaming and credential filtering. Local globe/input/navigation were checked in a browser. Live API smoke checks cover general questions (about 2.5–4 seconds), official-source search (about 9 seconds) and generated image completion. Hosted microphone/audio and physical-phone performance remain separate verification tasks.
- Preserves previous Git tags, source history and saved Sites milestones. The new release is for YC's independent Site.

## v0.7.1 — 2026-09-13 — Hosted answers
- Separates the local native-Agents probe CLI from the Worker-safe module, removing a file URL evaluated during hosted API startup.
- Fixes the production `/api/terra/status` and answer routes throwing before request handling. The v0.7.0 public globe loaded correctly but its hosted API did not.
- Preserves the source and saved Sites milestone for v0.7.0.

## v0.7.2 — 2026-09-13 — Clearer answers and diagnostics
- Routes comparison, explanation, research and particular-object tracking requests to the answer backend before considering camera-only shortcuts. Keeps simple navigation immediate.
- Adds a collapsed Diagnostics panel with metadata-only local recording, JSON export and clear controls. Records request/stream timing, model route, command outcomes, image lifecycle, voice connection status and safe error categories; retains at most 500 events and 1,000 turn IDs. No remote telemetry upload or conversation/audio recording is added.
- Shares neutral scene inventory wording across hosted, local and deep-answer agents; removes routine layer caveats while preserving identity/time-source requirements for external tracking.
- Makes HTML and malformed answer streams fail with readable messages, and cancels broken streams.
- Adds a 20-case general-answering evaluation specification and a separate live QA record. The full specification is not an executed test suite.
- Validation: targeted navigation, streaming and telemetry checks, including redaction, cancellation and 10,000-turn bounded storage. Live QA identifies remaining regional visibility and actual flight/satellite feed limitations. Hosted microphone/audio and physical-phone testing remain separate verification tasks.

## v0.8.0 — 2026-09-13 — An explanation beside the Earth
- Replaces the bulky answer dock with a responsive editorial answer/graphic panel, right-side focal globe, and compact bottom You/Astra transcript. One stop control handles active work; diagnostics lives in a small composer menu.
- Generates bounded data-only procedural recipes from question-specific briefs; compiles six geometric primitive types into the same starlight shader inside the shared Earth scene. Shared WorldCommand handles model show/clear; geometry is normalized, terrain-grounded and disposed on replacement.
- Settles the horizon before model placement, gently orbits the geographic anchor, preserves user camera interaction and reduced-motion preferences, and frames phone targets above the answer panel.
- Adds authenticated, bounded model generation alongside existing asynchronous image generation, with cancellation and stale-turn guards. Graphics remain explanatory, not measurement sources.
- Fixes voice fragment debounce, duplicate delegation, stale question reuse, microphone interruption and transport recovery. Removes the application three-minute cutoff and uses the API-verified Ripple voice with restrained playful delivery.
- Corrects v0.7.2 import-time telemetry initialization. That release was saved and deployed, but live page verification failed; production was restored to v0.7.1 while this correction was prepared. Recorder now initializes only on browser use; SSR imports perform no random/clock work.
- Includes separately committed real-data adapters and a cancellable poller as preparation; visible movement layers are not yet connected to those feeds in this release.
- Validation: targeted model, renderer lifecycle, HTTP/answer routing, voice and telemetry regression checks; TypeScript. A real local Borobudur question generated both a model on the globe and an explanatory image. Browser viewport checks include desktop and phone widths; physical-phone and microphone audio testing remain separate.

- Reuses six prepared/approved models, including the generated turbine, and saves new validated recipes to shared D1 with hashed exact lookup and bounded semantic candidates.
- Starts Live independently of model work; exposes recipe generation through a native Agents function with a 15-second recipe deadline, cancellation and Worker cleanup.
- Renders named, animated parts through the existing globe shader and geographic WorldCommand engine. Keeps measured Java values separate from generated geometry.

## v0.8.1 — 2026-09-13 — A stage for every question
- Carries the responsive interface, reusable model library, voice and diagnostics into the public demo.
- Corrects framing for generated models with no geographic anchor, which could extend outside the view in the v0.8.0 candidate.
- v0.8.0 was committed and tagged but held before Sites version saving or deployment when the final browser check exposed this issue. Its tag remains unchanged.

## v0.8.2 — 2026-09-13 — Ready to ask
- Makes the existing ChatGPT sign-in link a prominent, touch-sized button.
- Removes the manual model-library picker from the answer panel while preserving automatic model selection and named-part controls.
- Records the production v0.8.1 mobile answer/model and metadata-export checks, with remaining evaluation limits.

## v0.8.3 — 2026-09-13 — Keep the conversation going
- Keeps the voice session and transcript active when browser autoplay blocks remote audio.
- Adds a compact Enable audio / Retry audio action that calls playback directly from the user gesture, including while an answer is being prepared.
- Primes the same audio element during voice startup and prevents stale playback attempts from changing a stopped or replaced session.
- Validation includes controller regression checks and isolated browser recovery using a synthetic MediaStream; no physical-microphone or public audio audition is claimed.

## v0.8.4 — 2026-09-13 — Follow every question
- Fixes the Angkor → US data-center follow-up retaining Cambodia: location searches use a fitted map overview with named location controls, and unlocated models await the current answer target.
- Recognizes New York street geometry regardless of word order. Supplies reviewed Java trench survey depth separately from the displayed transect; grounds Singapore terminal logistics without inventing rail freight.
- Preserves full opening paragraphs in the answer and transcript, narrates the grounded paragraph once before model/camera completion, and hides background introductory copy under the answer.
- Busy answer retries preserve the generation allowance; rejected throttled requests report Retry-After. Excludes generated files and alternate worktrees from lint.
- Includes the rebased main branch through ab8eb4d. Prior published milestones are preserved. Public five-question baseline and focused regressions are documented; post-deployment verification is separate from physical microphone/audio testing.


## v0.8.5 — 2026-09-13 — Room for the explanation
- Consume the integration CSS module through a local class so production retains answer/intro visibility and dock-aware control positioning.
- Replace empty image-loading frames with a compact status row; preserve bounded images and mobile scrolling after completion.
- Separate conversation replies and subject articles in the generation contract instead of deleting phrases from rendered text. Pure dialogue has no article; mixed questions retain subject prose verbatim.
- Render bare source URLs as short source links, request descriptive inline citations, and omit raw URLs from spoken paragraphs. Clear stale model status when following answer-location controls.
- Public v0.8.4 returned the expected answer and map/model controls for all five requested questions, with no observed repeat throttling. Browser tooling resets split that sequence; final v0.8.5 verification is recorded separately.
