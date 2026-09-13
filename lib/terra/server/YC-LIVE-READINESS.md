# YC Live transport — minimal hosted integration

Ported from YC source `f3ea241` into the current renderer branch. Existing fetch-based HTTP handler, Live SDP exchange, NDJSON answer transport and answer router are retained. No localhost proxy, separate server process, image generator, sculpture system, database or new dependency is required.

Hosted prerequisites:

1. Sites Worker secret `OPENAI_API_KEY` with access to `gpt-live-1` at `/v1/live/sessions`. It stays on the server. Do not put it in a client variable or commit it.
2. Visitor signed in through existing ChatGPT Site authentication. The server reads trusted host-provided identity through `getChatGPTUser()`. A public app page does not imply anonymous paid API use. Unsigned requests return 401 and `/signin-with-chatgpt?return_to=%2F`.
3. HTTPS and user-granted microphone permission for the browser WebRTC controller. The user must start voice explicitly.
4. Answer models default to `gpt-5.6-luna` / `gpt-5.6-terra`; optional server variables `OPENAI_FAST_MODEL` / `OPENAI_ANSWER_MODEL` select available compatible models. A Live-capable key alone does not prove these models are available.

Endpoints use same-origin `/api/terra`:

- GET `/status` → `{configured,signedIn,signInUrl}`; no secret values.
- POST `/session` `{sdp}` → `{session:{id},transport:{type:'webrtc',sdp}}`; upstream secrets are stripped.
- POST `/answer` `{query,selectedIds:[],previous:null}` → NDJSON started/opening/result events. Final text is `event.result.measured.output` (also `event.result.world.explanation`).
- POST `/agents/cancel` cancels only the authenticated visitor's active answer.
- Image/model generation and extended multi-agent research are not included in this minimal voice integration. They must not be advertised as available.

The supplied scene inventory names only the actual supported three renderer targets and existing procedural layer counts. No runtime claim of tracked vehicles or people is made.

Validation: six inherited HTTP handler tests and full TypeScript pass. Tests cover anonymous status/auth gates, origin/body/query/rate checks, NDJSON output, session response credential stripping and user-scoped cancellation. These are mocked transport tests, not proof that a deployed secret, real Live session or microphone audio works. Integrator must verify deployed `/status`, sign-in, actual session creation and a spoken navigation action before claiming Live completion.
