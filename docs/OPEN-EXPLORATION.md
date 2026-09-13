# Open exploration preview

This personal fork keeps the existing globe and WorldCommand renderer. It replaces
the owner's paid API path with visitor-owned Codex connections. It is a local,
testable preview; the existing public hackathon deployment has not been replaced.

## Run locally

Requirements: Node 22.13+, npm dependencies, and the official `codex` CLI on PATH.

```
npm ci
npm run dev:open
```

Open http://localhost:5185/. The web preview proxies its own `/api/explore` calls
to the loopback bridge at port 5182. It does not require an OPENAI_API_KEY.

Browsing, manual controls, public data feeds, and prepared models remain public.
The first question requiring inference opens the account connection panel.
Complete OpenAI's device authorization, then the preserved question resumes.
An existing terminal login is deliberately not inherited by a web visitor.

## Runtime boundaries

- One isolated Codex home, empty job directory, and process per browser session.
- Visitor credentials stay in the process's ephemeral credential store. A random
  HttpOnly session cookie maps the browser to that process; it contains no OpenAI token.
- Restarting the bridge, disconnecting, or expiring an idle session requires a new login.
- No ChatGPT memories are imported. Codex memory, plugins, local shell and computer
  tools are disabled. The browser cannot call arbitrary App Server methods.
- One inference job per visitor, four globally, 90 seconds per turn, at most four
  searches and twelve retrieval tool calls. Questions are limited to 8,000 characters,
  generated JSON to 64 KB, sources to twelve, map targets to four, and models to 22 parts.
- There is no fallback to the owner's API key, including the legacy `/api/terra` route.
- Text answers complete before an optional model job starts. Images and live voice
  are removed from this typing-only fork. Prepared models require no inference.
- Search answers cite sources and may select arbitrary validated coordinates.
  Abstract questions use no forced geographic target. Model recipes are validated
  primitive data, not executable code or proof of real-world geometry.
- Flight/satellite facts require source identity and time. A web search result is
  not a continuous tracking feed. Existing public data adapters remain available,
  but this change does not wire arbitrary flight following into the renderer.

## Hosting

The Sites/Workers renderer cannot launch the Node Codex executable. A separate
long-running Node host is required. Run `npm run bridge` there and set:

- `TERRA_BRIDGE_HOST`: listener interface (defaults to loopback)
- `TERRA_BRIDGE_PORT`: port (defaults to 5182)
- `TERRA_SITE_ORIGIN`: exact HTTPS origin of the public website
- `TERRA_CODEX_BRIDGE_TOKEN`: private service-to-service credential

Expose the bridge through authenticated HTTPS. In the Sites runtime, configure
`TERRA_CODEX_BRIDGE_URL` and the matching `TERRA_CODEX_BRIDGE_TOKEN`. The proxy
forwards only the Terra session cookie. Never place these runtime secrets in source
or browser code. The bridge does not accept a shared OpenAI API key.

No public bridge host or tunnel has been provisioned. A Mac-based host must remain
awake and connected. Per-user account authorization is implemented using the
documented experimental App Server protocol, not a promise of production support.

The inherited `.openai/hosting.json` still identifies the existing hackathon Site.
Do not casually deploy this fork there before the bridge and two-account flow are
verified; doing so without configuration would leave public inference unavailable.

Sites is a beta service with plan-dependent usage limits. The published documentation
does not guarantee perpetual hosting or continued publication after cancellation
or account deletion. Keep this GitHub fork and exported application data independent
of a Sites subscription. A source checkout does not back up runtime D1 data.

References:
- https://learn.chatgpt.com/docs/app-server
- https://learn.chatgpt.com/docs/customization/memories
- https://help.openai.com/en/articles/20001339
- https://openai.com/policies/chatgpt-sites-terms/

## Checks

```
npm run test:open
npx tsc --noEmit
npm run build
```

The automated tests use fixture account clients to verify public access, two-visitor
isolation, logout, concurrency, and cancellation. These are separate from a completed
real device authorization. See `docs/evals/OPEN-SEARCH.md` for search test cases and
real-inference evidence. The preview's Diagnostics menu exports bounded metadata
from the current tab, excluding raw questions, answers, audio, images, and credentials.
