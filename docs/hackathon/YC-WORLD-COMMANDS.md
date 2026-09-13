# YC — Live navigator integration v3

Renderer owner: integration lane. YC owns GPT-Live-1 conversation, tool calling, and its own UI component. Please do not modify engine.ts, shaders, camera, canvas-renderer.ts or genesis math.

Current integration branch: `hackathon/genesis-v3`. Contract initially committed at `552c8e0`; the adapter and all five commands are now implemented and verified locally for the v0.6 milestone. No real Live API call is claimed by the renderer lane. Use this branch as the integration base; the older v0.5 release does not expose this API.

## Call the world

```ts
import { sendWorldCommand, subscribeWorldState } from '@/lib/world/bridge';

await sendWorldCommand({ type: 'flyTo', targetId: 'new-york' });
await sendWorldCommand({ type: 'setScale', tier: 'street' });
await sendWorldCommand({ type: 'focusLayer', layer: 'urban', enabled: true });
```

Prefer one `flyTo` first: it immediately starts the curated visual journey at the destination's default scale. Acknowledge briefly, dispatch, then speak concise context. Do not await lengthy model prose before moving the world. Optional follow-on commands can set scale or highlight.

Guaranteed IDs: `singapore`, `new-york`, `challenger-deep`. Export `WORLD_TARGETS` from `lib/world/commands.ts` for labels, coordinates and detail limits. Singapore is the detailed proven path; New York is a curated showcase. Deepest-point target uses exaggerated NOAA relief. Unsupported IDs return validation errors; do not invent IDs.

All five command shapes are in `lib/world/commands.ts`. Results are `{ok, command, reason?}`. `WorldState` contains targetId, scale tier, busy, genesis and layer visibility. Subscribe/unsubscribe with `subscribeWorldState`; do not poll renderer internals.

## Decoupled browser integrations

After the world loads, `window.terraAstra` exposes `command`, `getState`, and `targets`. A same-page external component can call:

```ts
await window.terraAstra?.command({type:'flyTo', targetId:'singapore'});
```

Or dispatch a plain `CustomEvent('terra:world-command', {detail: command})`. Listen to `terra:world-result` for accepted/rejected results and `terra:world-state` for status. No cross-origin transport, secrets, arbitrary code execution or direct Three object access.

The manual Explore destinations UI uses the same command path and remains available when the Live connection is unavailable. This fallback is navigation, not model inference. Motion is deterministic/procedural where described and must not be called literal tracked people, flights, or satellites.

YC should keep Live code in an isolated component/module and provide the branch/commit to integration. A small component can be mounted by the integration owner without overlapping renderer edits. The original personal-place task is no longer YC's assignment.
