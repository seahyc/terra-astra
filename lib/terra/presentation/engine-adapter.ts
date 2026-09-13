import type { Engine } from '../engine';
import type { SceneRenderer } from '../evidence/types';
/** A late-bound engine avoids falsely acknowledging a not-yet-mounted canvas. */
export function earthSceneRenderer(getEngine: () => Engine | null): SceneRenderer {
  return async (scene, signal) => {
    const engine = getEngine();
    if (!engine) throw new Error('Earth is still loading. Try the presentation again when it is ready.');
    return engine.presentEvidenceScene(scene, signal);
  };
}
