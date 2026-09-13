# Terra Astra: Earth as an explanatory instrument

Design and implementation notes, 13 September 2026. The user selected the first API proof and Southeast Asia using already-loaded data. The broader showcase ideas below remain deferred. The current deployed baseline remains v0.4. Personal paths, photo ingestion, multiplayer, and social features are outside this design.

## Product

Ask a question by voice or text. Astra answers general questions and can navigate the existing stellar Earth through the same validated `WorldCommand` boundary used by the manual controls. The current visual catalog is deliberately finite: Singapore, New York, Challenger Deep, and the existing illustrative orbit, aircraft, and sea layers. Cached measurements may ground answer text, but they do not create a separate rendered evidence scene.

The two intended tracks are GPT-Live-1 and Agents API. The application uses GPT-Live client delegation connected to a real Agents API session with native subagents. These are runtime capabilities, not merely development tools.

## Selected first proof: Southeast Asia

“Show me Java’s mountains and the ocean floor to its south. How far does the landscape drop?”

`scripts/prepare-sea-profile.mjs` derives `public/data/sea-java-profile.json` directly from the committed NOAA relief grid using the production bilinear sampler. The profile follows longitude 112.922° E from 6° S to 12° S. Its rounded samples reach 984 m above and 5,361 m below sea level: about 6.3 km of vertical range. These are coarse grid samples, not summit elevations or a claim about the deepest point of the whole Java Trench. The source is 0.25° per cell; denser profile sampling adds smoothness, not resolution.

First voice interaction: ask the question, then interrupt with “Show me the deepest part.” Native Agents subagents can examine the measured evidence and its limitations. The answer may state the cached sampled values and navigate to a supported catalog target such as Challenger Deep. No Java profile, evidence overlay, or measured cross-section is rendered in the current application.

The API credit promotion is applied in the user's Personal organization. On 13 September, the original credential returned HTTP 401 `token_invalidated` for Agents and Responses despite appearing Active in the platform and succeeding at authenticated model lookup. Explicit organization/project headers, another model and curl reproduced that failure. A separately approved one-day project credential then successfully created an Agents session, executed the inventory function callback and produced a grounded Java-profile answer. This isolates an original-credential failure; its precise invalidation cause remains unknown. An explicit delegation request in user input subsequently produced two native subagents, both confirmed completed through their dedicated saved-turn endpoints. Root event streams and root turn lists omit those child completions. Later function-tool calls intermittently failed inside the provider with HTTP 424 (no active turn), before any client required-action event. The local demo therefore supplies measured inventory directly and labels that evidence source rather than claiming a function callback. This complete path passed in 40.8 seconds: two completed native subagents, a grounded coordinator answer and verified session cleanup. GPT-Live WebRTC startup, remote audio track, input/output transcripts and a clean 90-second close were observed. The complete audible geography explanation remains unverified.

## Deferred showcase questions

### 1. How many data centers are being built right now, and where?

Visual grammar: global clusters, status-coded markers, regional zoom, ranked quantitative towers, project evidence card.

Answer sequence: declare geographic scope, source coverage, count unit (campus/site/building), and as-of date; identify verified construction projects; distinguish announced, under construction, completed, cancelled, and unknown status; aggregate the same records shown on the map; inspect one cluster and its source evidence. Only show capacity where a comparable sourced value and unit exist.

Interruption demo: “Only count projects actually under construction. Now focus on Southeast Asia.” The count, markers, legend, and spoken scope must change together.

Evidence gate: a current global construction inventory is not supplied by OSM facility points. Build and document a finite verified catalog, consult current owner/developer/permit records, deduplicate sites/campuses, and say “verified projects in these sources” when completeness is unknown. Do not claim a global count from a selected sample or infer construction from investment announcements. Keep the date of source evidence separate from the date we fetched it.

### 2. How did geography help the Union win the American Civil War?

Visual grammar: regional relief, dated political regions, highlighted rivers, campaign route traces, strategic-node cards.

Answer sequence: give the political context without reducing the war's causes to geography; focus on the Mississippi theater; highlight Vicksburg and Port Hudson, supply/navigation relationships, and a few sourced campaign stages; show the resulting geographic division in July 1863. Avoid pretending a schematic campaign arrow is a surveyed troop track.

Interruption demo: “Why couldn't they just go around Vicksburg?” Hold the geographic frame and reveal the terrain and river relationship needed for that answer.

Evidence gate: dated region boundaries, route approximations, places, and event dates need source records. Sources can begin with National Park Service material; corroborate each mapped claim before preparing the demo pack.

### 3. How did Mao's movement survive retreat and ultimately take power?

Visual grammar: dated route, changing regional emphasis, milestone cards, timeline comparison, geographic context plus non-geographic causal cards.

Answer sequence: rural bases and retreat; leadership and organization; wartime conditions; postwar civil war and 1949. Distinguish Mao's personal leadership from the wider CCP, military, social, economic, and international factors. Treat historical interpretations as interpretations and show competing explanations where material.

Interruption demo: “Was it just the Long March?” Preserve that route as a subdued reference and shift to the other evidenced factors and later periods.

Evidence gate: do not invent yearly territorial polygons, interpolate political control, or imply the Long March alone caused victory. Use sourced key locations/routes and event snapshots when reliable boundary data is absent. Historic archives require cross-checking rather than copying one overview wholesale.

## Runtime architecture

Browser microphone/audio <-> GPT-Live-1 over WebRTC.

Live client-delegation events -> application session bridge -> Agents API coordinator.

Simple supported navigation intents take the fast deterministic path to a validated `WorldCommand`. Complex questions use exactly two native Agents subagents: one reviews the explanation and uncertainty, and one proposes useful geographic orientation anchors. The coordinator waits for both and returns the answer. Cached measurement inventory can ground text, but does not authorize new renderer geometry.

Coordinator -> application bridge -> validated `WorldCommand` -> the shared browser engine. There is one renderer command path for both voice and manual navigation.

One coordinator owns semantic sequencing. The existing engine owns camera, layers, labels, and transitions. Subagents never mutate the scene directly.

### Official API boundaries verified during design

- GPT-Live client delegation allows an application-owned backend. `session.delegation.created` carries metadata, not task text; assemble the request from retained transcript fragments and application context. Maintain revisions because fragments are not authoritative complete turns.
- Native Agents API multi-agent is enabled with `agent.multi_agent.enabled` and `max_concurrent_subagents`. `environment.type: none` is sufficient for supplied evidence, web search, and coordinator function tools; no sandbox is needed for this design.
- Subagents inherit web search and configured MCP tools but do not support custom function tools. A created/waited subagent event does not prove task completion.
- Coordinator functions are executed from `session.required_actions` on `agent.session.requires_action`. Return results using the pending action's exact `turn_id` and `call_id`; persist the result for retry safety.
- GPT-Live `session.commentary.append` takes concise factual text (up to 500 tokens) that it may paraphrase. Acknowledgment is not proof of speech or playback.
- Transcript timing is not exact word alignment. The app must observe rendered state and actual audio playback separately.
- Spoken interruption does not automatically cancel agent work. Explicitly revise/cancel tasks as appropriate, discard stale results, and verify cancellation rather than assuming it.

Sources: https://developers.openai.com/api/docs/guides/live-delegation ; https://developers.openai.com/api/docs/guides/live-conversations ; https://developers.openai.com/api/docs/guides/agents-api/multi-agent ; https://developers.openai.com/api/docs/guides/agents-api/tools/functions ; https://developers.openai.com/api/docs/guides/agents-api/tools/web-search

## Renderer command contract

The current renderer accepts only the shared `WorldCommand` schema: supported target navigation, scale changes, layer toggles, and reset. Commands are validated before execution and serialized by the engine. The supported visual catalog is Singapore, New York, and Challenger Deep. The illustrative datasets contain 20 city-pair flight paths, 12 orbital lights, and 6 sea paths; they are deterministic visual layers rather than live tracking.

Store full evidence in the backend. Each claim links to records, citations, source dates, spatial/temporal precision, and an observation/estimate/interpretation label. Generate counts deterministically from filtered records. A schema-valid claim is not automatically true: require supported citations and checks of the relevant records.

Reject unknown targets, scales, layers, and malformed commands. Do not accept executable JavaScript, arbitrary coordinates, shaders, HTML, URLs, or model-authored geometry as renderer commands.

Arbitrary locations, richer `presentScene` semantics, and narration-beat readiness are future extensions. They must extend this same WorldCommand boundary and engine state machine rather than introduce another renderer or scene director. None is implemented today.

## Visual system

Current authored visuals are the stellar globe, supported target detail, geographic scale transitions, and toggleable orbit/air layers. Cached measurement results are presented as answer text only.

Use the current dark stellar Earth, restrained cyan/amber accents, and clear typography. Fly from orbit into an oblique regional view when the question becomes local. A raised region is a focus treatment, not a numeric height encoding. Quantitative towers always carry units and a consistent scale.

Rules: one focal subject and one major camera move at a time. Do not describe an unsupported location, profile, sculpture, route, or evidence overlay as visible. No agent-message dashboard belongs in the main experience.

Camera moves use authored easing, longitude wrapping, safe altitude/tilt limits, and viewport-aware framing. Cards are DOM overlays with collision handling. Routes use source polylines or clearly identified schematic connections. Aggregate dense data at globe scale. Reduced motion and the Canvas renderer need equivalent semantic output, even if the visual treatment is simpler.

## Narration and interruption

The current flow waits for the WorldCommand result before continuing the geographic answer. Exact narration-beat readiness and playback synchronization remain future work on the same command boundary.

Use the actual output transcript to emphasize named entities in the current scene. Use measured playback behavior and semantic progression to pace chapters; transcript arrival is not proof the words have been heard. Do not promise frame-accurate word synchronization or an exact script from GPT-Live. Keep the current beat visible when timing is uncertain, instead of running ahead on fixed timers.

An explicit “wait” freezes the current scene and redirects narration. A follow-up revises the active explanation, clears uncommitted beats, and cancels obsolete work where appropriate. All results carry revision IDs so a late result cannot revert the map. Manual globe drag suspends automatic camera control and updates voice context; it need not cancel all research or audio. Mute, pause, stop, and new question are separate controls.

## Deployment shape

Retain Sites, React, Three.js, and the existing Worker-compatible Vinext build. Same-origin routes provide voice setup and the answer/delegation bridge. API keys stay in hosted secrets. The browser sends only validated WorldCommands to the shared renderer.

Use provider-managed Agents sessions for complex model work. Keep curated geographic source packs static and do not depend on Worker module memory surviving. On a broken event connection retrieve managed session state where available; do not assume provider streams replay missed events. No new image generation, photo uploads, or storage service is necessary for this milestone.

## Existing-engine changes

The current engine is the shared WorldCommand renderer. It supports the catalog targets Singapore, New York, and Challenger Deep, scale transitions, deterministic visual layers, original stories, and personal constellation behavior. The former evidence overlay, Angkor sculpture branch, renderer adapter, and standalone evidence experience are not part of the active runtime. `/evidence` redirects to `/`.

Future visual capabilities should add validated WorldCommand variants and engine behavior, with Canvas fallback and deterministic tests, before voice prompts may claim them.

## Build order and acceptance

1. Preserve the verified component probes for GPT-Live transport and Agents native delegation, then verify the complete audible application flow. Component success does not establish end-to-end playback.
2. Complete one vertical slice: spoken Java relief question -> actual subagents -> measured text answer -> supported WorldCommand navigation -> audible explanation -> interruption updates the answer and supported target.
3. Expand only after that slice works. Select further Southeast Asia questions from available data; defer the Civil War, Mao and data-center catalog until their required evidence exists. Cached source packs must not be presented as fresh live observations.
4. Test real desktop WebGL and a phone layout; record actual audio plus scene transitions. Verify no stale beat after interruption, no duplicate function effects on retry, correct count/map agreement, source clicks, missing-data behavior, and reconnect behavior.
5. Freeze features by 14:30 SGT if possible. Reserve the final hour before 15:30 for testing, the 90-second recording, and submission preparation. Public/judge access is a separate requested sharing change; the current Site is owner-private.

Engineering targets to measure, not guarantees: a useful first scene within 5-10 seconds on cached showcase evidence, smooth desktop animation, and no scene reversal after a confirmed revision. The first end-to-end test should determine whether those targets are achievable before widening scope.


## September 13 runtime update

The public Site runs a small authenticated backend in its existing Sites Worker. Oracle hosting is optional, not required for OpenAI calls. Visitors can explore the globe anonymously; AI requests require ChatGPT sign-in. Sign-in establishes identity only: Responses, Agents, Live and Images requests use the server's configured OpenAI API key and its API billing.

Luna semantically selects an answer route and completes ordinary stable questions in one Responses call. Terra handles harder reasoning and source searches; search citations are displayed as links. Explicit in-depth research uses the native Astra coordinator and two delegated agents, with a source-checked brief when freshness requires it. Live remains gpt-live-1; illustrations use gpt-image-2.5-flare independently after the answer. Server environment settings control the fast, answer and image models.

Generated geographic anchors now use validated shared `flyToLocation` commands. They navigate the original globe at regional scale and retain their anchor through perspective changes. Detailed city/street scales remain restricted to the supplied Singapore and New York data. Non-geographic answers leave the globe in place. Arbitrary route geometry, historic boundary animations, live individual flight/satellite tracking and images anchored in the globe are not implemented by this change.

Measured local API examples: general questions 2.5–4 seconds, one official-source lookup 9 seconds, a source-checked native two-agent research answer 80 seconds. These are individual smoke tests, not latency guarantees.
