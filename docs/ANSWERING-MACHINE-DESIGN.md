# Terra Astra: Earth as an explanatory instrument

Design and implementation notes, 13 September 2026. The user selected the first API proof and Southeast Asia using already-loaded data. The broader showcase ideas below remain deferred. The current deployed baseline remains v0.4. Personal paths, photo ingestion, multiplayer, and social features are outside this design.

## Product

Ask a question by voice or text. Astra explains it aloud while Earth becomes a sequence of sourced geographic illustrations. Follow-up questions can change scope, pause the explanation, revisit an event, or compare places. The interface accepts general questions; geographic detail is limited by available evidence and renderer capabilities.

The two intended tracks are GPT-Live-1 and Agents API. The application uses GPT-Live client delegation connected to a real Agents API session with native subagents. These are runtime capabilities, not merely development tools.

## Selected first proof: Southeast Asia

“Show me Java’s mountains and the ocean floor to its south. How far does the landscape drop?”

`scripts/prepare-sea-profile.mjs` derives `public/data/sea-java-profile.json` directly from the committed NOAA relief grid using the production bilinear sampler. The profile follows longitude 112.922° E from 6° S to 12° S. Its rounded samples reach 984 m above and 5,361 m below sea level: about 6.3 km of vertical range. These are coarse grid samples, not summit elevations or a claim about the deepest point of the whole Java Trench. The source is 0.25° per cell; denser profile sampling adds smoothness, not resolution.

First voice interaction: ask the question, then interrupt with “Show me the deepest part.” Native Agents subagents examine the measured evidence and its limitations. A deterministic profile highlights the relevant sampled point, with source, sea-level reference, and numeric labels visible. A later globe integration locates the profile geographically; the existing artistic cutaway must not be presented as a measured cross-section.

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

Coordinator -> up to three native subagents: evidence/status, chronology/causation, geography/quantities. They research independent questions concurrently and return sourced claims. They inherit configured built-in web search; custom dataset functions belong to the coordinator, which can pass their results to subagents. Do not put all researchers behind a barrier before showing the first independently supported beat.

Coordinator -> application function `publish_beat` -> schema/evidence validation -> persisted beat queue -> browser renderer -> visible-state acknowledgement -> concise factual briefing to GPT-Live.

One coordinator owns semantic sequencing. One deterministic browser director owns the camera, layers, labels, and transitions. Subagents never mutate the scene directly.

### Official API boundaries verified during design

- GPT-Live client delegation allows an application-owned backend. `session.delegation.created` carries metadata, not task text; assemble the request from retained transcript fragments and application context. Maintain revisions because fragments are not authoritative complete turns.
- Native Agents API multi-agent is enabled with `agent.multi_agent.enabled` and `max_concurrent_subagents`. `environment.type: none` is sufficient for supplied evidence, web search, and coordinator function tools; no sandbox is needed for this design.
- Subagents inherit web search and configured MCP tools but do not support custom function tools. A created/waited subagent event does not prove task completion.
- Coordinator functions are executed from `session.required_actions` on `agent.session.requires_action`. Return results using the pending action's exact `turn_id` and `call_id`; persist the result for retry safety.
- GPT-Live `session.commentary.append` takes concise factual text (up to 500 tokens) that it may paraphrase. Acknowledgment is not proof of speech or playback.
- Transcript timing is not exact word alignment. The app must observe rendered state and actual audio playback separately.
- Spoken interruption does not automatically cancel agent work. Explicitly revise/cancel tasks as appropriate, discard stale results, and verify cancellation rather than assuming it.

Sources: https://developers.openai.com/api/docs/guides/live-delegation ; https://developers.openai.com/api/docs/guides/live-conversations ; https://developers.openai.com/api/docs/guides/agents-api/multi-agent ; https://developers.openai.com/api/docs/guides/agents-api/tools/functions ; https://developers.openai.com/api/docs/guides/agents-api/tools/web-search

## Scene contract

Each short beat contains `answerId`, `revision`, `beatId`, `sourceIds`, `claimIds`, a temporal scope, one camera intent, validated geographic feature references, a bounded set of overlay operations, concise narration facts, and a renderer readiness requirement. The scene contract is application-defined, not an OpenAI event schema.

Store full evidence in the backend. Each claim links to records, citations, source dates, spatial/temporal precision, and an observation/estimate/interpretation label. Generate counts deterministically from filtered records. A schema-valid claim is not automatically true: require supported citations and checks of the relevant records.

Reject unknown feature IDs, nonfinite/out-of-range coordinates, incompatible dates/units, excessive point counts, missing required sources, and stale revisions. Do not accept executable JavaScript, arbitrary shaders, arbitrary HTML, or model-authored URLs as renderer commands.

## Visual system

Six authored primitives: geographic camera target; region highlight/lift; route/network trace; point/cluster; quantitative tower; anchored evidence card. Timeline and comparison modes compose these primitives.

Use the current dark stellar Earth, restrained cyan/amber accents, and clear typography. Fly from orbit into an oblique regional view when the question becomes local. A raised region is a focus treatment, not a numeric height encoding. Quantitative towers always carry units and a consistent scale.

Rules: one focal subject, one major camera move at a time, at most three prominent labels and two evidence cards per beat. New material emerges while the previous focal point recedes. Keep captions away from map labels. Show a visible time or as-of label and a compact source drawer. No agent-message dashboard in the main experience; optional inspectable activity shows real tool/task status.

Camera moves use authored easing, longitude wrapping, safe altitude/tilt limits, and viewport-aware framing. Cards are DOM overlays with collision handling. Routes use source polylines or clearly identified schematic connections. Aggregate dense data at globe scale. Reduced motion and the Canvas renderer need equivalent semantic output, even if the visual treatment is simpler.

## Narration and interruption

Prepare a short sequence of beats, but commit one at a time. Stage the next beat while the current one is being explained. Once required assets and camera framing are ready, the browser acknowledges that state; only then brief GPT-Live with the facts for that beat.

Use the actual output transcript to emphasize named entities in the current scene. Use measured playback behavior and semantic progression to pace chapters; transcript arrival is not proof the words have been heard. Do not promise frame-accurate word synchronization or an exact script from GPT-Live. Keep the current beat visible when timing is uncertain, instead of running ahead on fixed timers.

An explicit “wait” freezes the current scene and redirects narration. A follow-up revises the active explanation, clears uncommitted beats, and cancels obsolete work where appropriate. All results carry revision IDs so a late result cannot revert the map. Manual globe drag suspends automatic camera control and updates voice context; it need not cancel all research or audio. Mute, pause, stop, and new question are separate controls.

## Deployment shape

Retain Sites, React, Three.js, and the existing Worker-compatible Vinext build. Add same-origin authenticated routes for voice setup, delegation/session events, renderer acknowledgments, and cancellation. API keys stay in hosted secrets. The browser forwards Live delegation events to the server and receives validated scene events.

Use provider-managed Agents sessions for long-running model work. Persist answer revision, source/claim records, tool results, and scene sequence in D1; do not depend on Worker module memory surviving. Keep curated geographic source packs static and cache expensive source queries. On a broken event connection retrieve managed session state and resume from persisted application state; do not assume provider streams replay missed events. No new image generation, photo uploads, or storage service is necessary for this milestone.

## Existing-engine changes

The current engine has only Indonesia/Andes study presets, a fixed 6.8-second flight, Singapore-only city geometry/pan limits, and three fixed story selections. Add generic camera/overlay interfaces alongside it, and replace the primary UI with the answering surface after it works. Keep the previous release recoverable. The Canvas fallback currently handles point/line geometry; new regions/towers require explicit fallback rendering.

Proposed ownership: `lib/answering/schema.ts` and `director.ts` for the lead; `app/api/answering/**` and `lib/answering/server/**` for the session bridge; `lib/terra/overlays.ts` and `canvas-overlays.ts` for rendering; `lib/answering/data/**` for evidence adapters and showcase packs; UI integration in `app/terra-experience.tsx` for the lead. Freeze interfaces before parallel implementation. Re-run delegated verification on a settled tree.

## Build order and acceptance

1. Verify real account access: one GPT-Live audible exchange, one Agents API native delegation, and one coordinator function callback. These integrations are currently untested.
2. Complete one vertical slice: spoken Java relief question -> actual subagents -> measured evidence -> regional globe/profile -> audible explanation -> interruption changes the highlighted sample.
3. Expand only after that slice works. Select further Southeast Asia questions from available data; defer the Civil War, Mao and data-center catalog until their required evidence exists. Cached source packs must not be presented as fresh live observations.
4. Test real desktop WebGL and a phone layout; record actual audio plus scene transitions. Verify no stale beat after interruption, no duplicate function effects on retry, correct count/map agreement, source clicks, missing-data behavior, and reconnect behavior.
5. Freeze features by 14:30 SGT if possible. Reserve the final hour before 15:30 for testing, the 90-second recording, and submission preparation. Public/judge access is a separate requested sharing change; the current Site is owner-private.

Engineering targets to measure, not guarantees: a useful first scene within 5-10 seconds on cached showcase evidence, smooth desktop animation, and no scene reversal after a confirmed revision. The first end-to-end test should determine whether those targets are achievable before widening scope.
