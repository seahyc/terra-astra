import { makeContextScene, type WorldTarget } from '../world-answer';
import { measureEvidence } from '../evidence/measure';
import type { Evidence, EvidenceScene, PresentationSnapshot, SceneRenderer } from '../evidence/types';

export const evidenceColor = (id: string) => id === 'crossing:second-link' ? '#eee6ff' : '#D6C8FF';
export function makeScene(revision: number, view: EvidenceScene['view'], evidence: Evidence[], focusIds: string[]): EvidenceScene {
  if (!focusIds.length || focusIds.some(id => !evidence.some(e => e.id === id))) throw new Error('Focus must refer to selected evidence.');
  const operation = view === 'profile' ? 'elevation_profile' : view === 'comparison' ? 'compare' : 'length';
  const measurement = measureEvidence(operation, evidence);
  const traces = evidence.map(e => ({ id: e.id, label: e.label, color: evidenceColor(e.id), coordinates: e.kind === 'crossing' ? e.geometry.coordinates : e.points.map(p => [p.longitude, p.latitude] as [number, number]), ...(e.kind === 'elevation_profile' ? { elevationsM: e.points.map(p => p.elevationM) } : {}), schematic: e.kind === 'crossing' && e.geometry.kind === 'schematic' }));
  const coordinates = traces.filter(t => focusIds.includes(t.id)).flatMap(t => t.coordinates);
  if (!coordinates.length || coordinates.some(p => !Number.isFinite(p[0]) || !Number.isFinite(p[1]) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)) throw new Error('Evidence coordinates are unavailable or invalid.');
  const bounds = { west: Math.min(...coordinates.map(p => p[0])), east: Math.max(...coordinates.map(p => p[0])), south: Math.min(...coordinates.map(p => p[1])), north: Math.max(...coordinates.map(p => p[1])) };
  const labels: EvidenceScene['labels'] = evidence.flatMap(e => e.kind === 'crossing' ? [0, e.geometry.coordinates.length - 1].map((i, n) => ({ id: `${e.id}:endpoint:${n}`, text: e.geometry.endpointLabels[n], coordinate: e.geometry.coordinates[i], color: evidenceColor(e.id), role: 'endpoint' as const })) : []);
  for (const e of evidence) if (e.kind === 'crossing') {
    const first=e.geometry.coordinates[0],last=e.geometry.coordinates[e.geometry.coordinates.length-1];
    const p: [number, number] = [(first[0]+last[0])/2,(first[1]+last[1])/2];
    labels.push({ id: `${e.id}:value`, text: `${e.label} · ${e.publishedLength.value.toLocaleString('en')} m`, coordinate: p, color: evidenceColor(e.id), role: 'value' });
  }
  if (measurement.profile) for (const [name, p] of [['Highest sample', measurement.profile.highest], ['Lowest sample', measurement.profile.lowest]] as const) labels.push({ id: `${evidence[0].id}:${name}`, text: `${name} · ${p.elevationM > 0 ? '+' : ''}${p.elevationM.toLocaleString('en')} m`, coordinate: [p.longitude, p.latitude], elevationM: p.elevationM, color: name === 'Lowest sample' ? '#75cdd8' : evidenceColor(evidence[0].id), role: 'extremum' });
  return { revision, view, evidenceIds: evidence.map(e => e.id), focusIds, bounds, traces, labels, measurement, evidence };
}

/** Owns ordering; a superseded command can never acknowledge the new scene. */
export function createSceneDirector(renderer?: SceneRenderer) {
  let revision = 0, controller: AbortController | null = null;
  let snapshot: PresentationSnapshot = { scene: null, status: 'idle' };
  const listeners = new Set<() => void>();
  const emit = (next: PresentationSnapshot) => { snapshot = next; for (const listener of listeners) listener(); };
  async function render(scene: EvidenceScene) {
      revision = scene.revision;
      controller?.abort();
      const active = new AbortController(); controller = active;
      emit({ scene, status: 'rendering' });
      try {
        if (!renderer) throw new Error('The Earth renderer is not connected.');
        const ack = await renderer(scene, active.signal);
        if (active.signal.aborted || scene.revision !== revision) return { status: 'superseded' as const, revision: scene.revision, ready: false };
        if (!ack.ready || ack.revision !== revision) throw new Error('Renderer did not acknowledge this scene revision.');
        emit({ scene, status: 'ready' });
        return { status: 'ready' as const, revision, ready: true, renderer: ack.renderer, evidenceIds: scene.evidenceIds, measurement: scene.measurement };
      } catch (error) {
        if (active.signal.aborted || scene.revision !== revision) return { status: 'superseded' as const, revision: scene.revision, ready: false };
        const message = error instanceof Error ? error.message : 'Presentation unavailable.';
        emit({ scene, status: 'error', error: message });
        return { status: 'unavailable' as const, revision, ready: false, error: message };
      }
    }
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    present: (view: EvidenceScene['view'], evidence: Evidence[], focusIds = evidence.map(e => e.id)) => render(makeScene(revision + 1, view, evidence, focusIds)),
    presentContext: (target: WorldTarget) => render(makeContextScene(revision + 1, target)),
    clear() { controller?.abort(); revision++; emit({scene:null,status:'idle'}); },
    dispose() { controller?.abort(); revision++; snapshot = { scene: null, status: 'idle' }; listeners.clear(); },
  };
}
export type SceneDirector = ReturnType<typeof createSceneDirector>;
