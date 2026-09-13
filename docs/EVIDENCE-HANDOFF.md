# Evidence and geographic presentation slice

Local review slice, 13 September 2026. No deployment, credential changes, git commands, or pushes were performed by this task. Checkout HEAD was read directly as `refs/heads/feat/yc-terra-astra`. The user explicitly prohibits pushing main.

The user clarified that the final product must be integrated into the original `app/terra-experience.tsx` and zoom from the wider Earth. `/evidence` and `EvidenceExperience` are only concurrent review surfaces; they must not replace the original root experience. The main task owns the original UI/voice integration. The engine now includes the requested wide-view journey.

## Import contract

```tsx
import { createEvidenceTools, evidenceToolDefinitions } from '@/lib/terra/evidence/handlers';
import { earthSceneRenderer } from '@/lib/terra/presentation/engine-adapter';
import { EvidencePanel } from '@/components/terra-evidence/EvidencePanel';

// Create once per conversation/engine lifetime, outside repeated renders.
const tools = createEvidenceTools({ renderer: earthSceneRenderer(() => engine.current) });
// Register evidenceToolDefinitions via the actual coordinator Agents API adapter.
// Dispatch incoming validated function arguments to tools.handlers[name](args).
// These functions are NOT direct GPT-Live tools, nor proof of an API invocation.
const found = tools.handlers.get_evidence({ query: 'Java mountains and ocean floor' });
const measured = tools.handlers.measure({
  operation: 'elevation_profile', evidenceIds: ['profile:java-north-south'],
});
const ack = await tools.handlers.present({
  view: 'profile', evidenceIds: ['profile:java-north-south'],
});
if (ack.ready) {
  // Only now brief Live with this revision, measurement, coverage and caveats.
}
// React: useSyncExternalStore(tools.director.subscribe,
//   tools.director.getSnapshot, tools.director.getSnapshot)
// then <EvidencePanel snapshot={snapshot} />.
```

`get_evidence` returns cached evidence objects, stable IDs, coverage and `referenceIds` for pronouns. Searching Second Link does not overwrite the selected Causeway. Selection changes only after a successful presentation. Unknown topics return `not_found`; invalid IDs, incompatible operations and absent renderers return unavailable, never fabricated values.

`measure` accepts `length`, `elevation_profile`, or `compare`. For compare provide exactly two crossings, baseline first. Results include metres, definition, method, coverage, caveats, source records, individual values, and difference/ratio or sampled extrema.

`present` accepts `map` for one crossing, `profile` for a sampled transect, or `comparison` for two crossings. `focusIds` must belong to the selected evidence. Scene creation validates coordinates and operation. The director aborts the previous renderer request, rejects stale or mismatched acknowledgments, and protects selected evidence from stale callbacks. The renderer returns ready only after the actual camera reaches its target and at least two frames render. Render errors, cancellation, and a 12-second camera-settling limit are explicit. Injected renderers must honor AbortSignal and resolve or reject their request.

## Evidence and demo sequence

| Stable ID | Result | Boundary |
|---|---|---|
| `profile:java-north-south` | 121 samples; +984 m to −5,361 m; 6,345 m vertical range (about 6.3 km) | One meridian at 112.922° E from 6° S to 12° S. NOAA 0.25° cached grid; 0.05° interpolation spacing is not higher source resolution. Not actual summit or trench maxima. |
| `crossing:causeway` | 1,056 m | Published bank-to-bank Causeway structure; NLB engineering description plus NHB completed-structure description. |
| `crossing:second-link` | 1,920 m | PLUS-published bridge section over the Johor Strait; excludes the 47 km LINKEDUA highway. |

The ordered crossing comparison is 864 m longer and 1.8181818… times as long (display 1.82×). Those are derived from published structural figures. The map lines and endpoints are approximate schematic guides, explicitly unverified as surveyed geometry. No route, geodesic, or polyline length is calculated from them. Source URLs, dates and definitions are cached in `public/data/crossings-evidence.json` and expanded in `docs/CROSSING-SOURCES.md`. The existing Java JSON/generator remain owned and unchanged by the main task.

## Engine behavior

`Engine.presentEvidenceScene(scene, signal)` uses the original stellar Earth, geographic camera and existing relief/coast data. A geographic journey turns at a wider altitude before descending (4.2 seconds for distant areas, 2.4 seconds nearby); reduced motion settles immediately. It frames one crossing or both crossing bounds, traces the transect, places endpoint/value/extrema labels, and returns revision plus actual renderer type. Resize recomputes framing. Phone labels clamp inside the viewport and avoid text collisions.

Use `Engine.clearEvidenceScene()` when leaving evidence for the original story/descent controls. Measured views use stage `orbit` to avoid the downtown Singapore pan constraints; hide original opening/depth controls while evidence is active. Border-area context is sparse because existing detailed street data covers central Singapore only. No new local street dataset was claimed.

Overlay hooks for speaker highlighting:

- Trace paths: `data-evidence-id="crossing:causeway"` (or other stable ID).
- Label groups: `data-evidence-label-id="crossing:causeway:value"`, `crossing:causeway:endpoint:0` / `:1`.
- Java labels: `profile:java-north-south:Highest sample` and `profile:java-north-south:Lowest sample`.
- The same label records are available in `tools.director.getSnapshot().scene.labels`.

## Files delivered

New: `lib/terra/evidence/{types,catalog,measure,handlers}.ts`; `lib/terra/presentation/{director,earth-overlay,engine-adapter}.ts`; `components/terra-evidence/{EvidencePanel,EvidenceExperience}.tsx` and their CSS modules; `public/data/crossings-evidence.json`; `scripts/check-evidence.mjs`; `docs/CROSSING-SOURCES.md`; this handoff; `app/evidence/page.tsx`.

Existing extension: `lib/terra/engine.ts` only. Original app integration is owned by the main task; EvidenceExperience/CSS ownership was released earlier for possible integration work. No original entrypoint, voice/provider files, environment files or main-task probes were edited by this slice.

## Actual verification

Full `npx tsc --noEmit` and `npm run build` passed before concurrent voice integration began. Build output listed `/`, `/evidence`, `/history` and `Build complete`; warnings: client chunks over 500 kB and vinext route classification unknown. Later full-project type checks encountered incomplete main-task voice files and proxy typing during active writes, so they are not claimed as a final integrated build.

After the final engine/overlay changes, an isolated strict TypeScript invocation covering all evidence/presentation files, their engine dependencies and EvidencePanel passed (exit 0). Targeted ESLint passed (exit 0). Engine and handler browser bundles passed; panel JavaScript/CSS bundle passed (75,651 / 8,725 bytes). These do not replace the main task's final full integrated build.

Real output from `node scripts/check-evidence.mjs`:

```text
PASS real cached Java: 121 samples, +984m/-5361m, range6345m; caveats=4
PASS published structural comparison: 1056m vs1920m; difference=864m ratio=1.8181818181818181
PASS unknown data, invalid IDs/focus, retained Causeway reference, missing renderer and mismatched acknowledgment fail closed.
PASS overlapping presentations: only revision2 can acknowledge readiness; stale revision1 cannot overwrite selection.
```

This test loads the real cached datasets/production handlers. Its injected ready renderer is explicitly a unit-test stand-in; it does not establish browser or API readiness.

Existing regression checks also passed: 296,171 relief particles/source registration; 482 geographic camera frames; 1,446 remembered-return projection frames; the existing engine lifecycle/reduced-motion/disposal checks. That harness reported inert Canvas and no pixel claim.

Actual local browser review at `http://localhost:5173/evidence` observed Java and Causeway desktop scenes change from Rendering scene to Scene ready with the correct measured values and projected lines/labels. A 390×844 phone comparison showed the actual wider stellar globe during the new journey, then both crossings, endpoint labels, 1,056/1,920 m, 864 m and 1.82× with ready status. A label-clipping issue found during this review was fixed and rechecked. This was software browser review; physical-device performance is untested. Main-task voice/Agents integration is not verified by this slice and no successful native API call is simulated here.

## Main task remaining work

Mount the shared tools/panel/voice in the original experience, preserve its opening and wide-to-local journey, re-run the full build on a settled tree, and verify the exact three spoken questions through the real coordinator/voice transport. Wait for each renderer readiness acknowledgment before the corresponding spoken geographic explanation. The main task reported an upstream function-transport issue and an explicitly labeled inline-evidence workaround; this slice makes no assertion that native function callbacks are reliable.
