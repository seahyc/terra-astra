# Terra × Astra

Earth, constellated. A geographic Earth made of light opens into a living volume of stars. Choose three meaningful places, find their constellation, and carry it back to Earth.

**Hackathon candidate:** the living-universe branch is under integration. The public app currently serves the preserved v0.4.1 release. See [active sprint](docs/hackathon/ACTIVE-SPRINT.md) for ownership and [release history](CHANGELOG.md) for exact milestones.

- [Open Terra Astra](https://terra-astra.riffster.chatgpt.site)
- [Build history](https://terra-astra.riffster.chatgpt.site/history)
- [Astra engineering evidence](docs/hackathon/ASTRA-EVIDENCE.md)
- [Submission status](docs/hackathon/SUBMISSION-PREP.md)

## Run locally

Node.js 22.13 or newer. No API keys, authentication, database, or live geocoding service is needed.

```sh
npm run install:ci
npm run dev
```

Open the localhost URL printed by the server (normally port 5173). All geographic assets are included in `public/data`; no regeneration is needed. Use `npm run dev -- --port 5174` if another checkout is already running.

```sh
npx tsc --noEmit --incremental false
node --experimental-strip-types scripts/check-depth.mjs
node --experimental-strip-types scripts/check-choreography.mjs
node --experimental-strip-types scripts/check-memory.mjs
npm run build
```

The build produces a Cloudflare Worker and client assets under `dist`. It is a Vinext application, not a plain HTML export. Hosting identity is preserved in `.openai/hosting.json`.

## Architecture

React 19 and TypeScript provide the interface. Vinext/Vite provides Next-compatible routing and Worker output. Three.js batches prepared geographic particles into custom shaders, with a separate reduced-detail Canvas renderer. The personal journey remains local to the browser session.

| Module | Responsibility |
| --- | --- |
| `app/terra-experience.tsx` | Journey UI and integration |
| `lib/terra/engine.ts` | Camera, particle layers, interaction and lifecycle |
| `lib/terra/canvas-renderer.ts` | Reduced-detail fallback |
| `lib/terra/spatial.ts` | Relief and spatial attenuation |
| `lib/terra/choreography.ts` | Geographic flight and remembered return |
| `lib/terra/personal-contract.ts` | Typed three-place and morph boundaries |
| `public/data/` | Prepared geography and provenance manifests |

## What predates the hackathon

The v0.4 globe, prepared geography, Singapore stories, depth layers, and remembered-life return were built before the hackathon. Their exact source is retained under `v0.4` and `pre-hackathon` at `9b9e2ec4ef3534b463e20d4d08c4ae3de444843d`. Earlier tags and v0.4.1 are retained too.

Astra is used as the engineering collaborator in Codex: source investigation, isolated implementation tracks, integration, and verification. No runtime model call is required or claimed. Today's changes and their evidence are documented separately.

## Data and interpretation

Geography: Natural Earth. Historical night lights: NASA Black Marble 2016. Relief and ocean-floor elevation: NOAA ETOPO 2022. Singapore streets: © OpenStreetMap contributors, retrieved 9 September 2026. Exact preparation provenance lives in `public/data/manifest.json` and `public/data/relief-manifest.json`.

Night-light intensity is not population. Interior stellar matter is an artistic interpretation. The three Singapore lives are fictional. Personal places use a finite curated catalogue; the app does not invent coordinates or track visitors' locations.

[Original infrastructure documentation](docs/STARTER.md) records the retained starter's optional features; authentication and database examples are unused by Terra Astra.
