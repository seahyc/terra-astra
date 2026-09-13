import { searchEvidence, selectEvidence } from './evidence/catalog';
import { measureEvidence } from './evidence/measure';
import type { EvidenceScene } from './evidence/types';

/** Resolve only cached evidence; the language model explains measurements, never invents them. */
export function planQuestion(query: string, selectedIds: string[] = []) {
  if (!/mountain|terrain|ocean floor|elevation|drop|trench|relief|causeway|second link|compar|long|short|difference|\b(that|this|it)\b/i.test(query)) return null;
  const evidence = searchEvidence(query);
  const compare = /compar|versus|\bvs\b|longer|shorter|difference/i.test(query);
  let ids = evidence.map(e => e.id);
  if (compare) {
    const previous = selectedIds.filter(id => id.startsWith('crossing:'));
    ids = [...new Set([...previous, ...ids.filter(id => id.startsWith('crossing:'))])];
    if (ids.length === 1 && /second link|causeway/i.test(query)) ids = ['crossing:causeway', 'crossing:second-link'];
  } else if (!ids.length && /\b(that|this|it|there)\b/i.test(query)) ids = selectedIds;
  if (!ids.length || /live traffic|right now|data cent|civil war|mao/i.test(query)) return null;
  const chosen = selectEvidence(ids);
  const view: EvidenceScene['view'] = chosen.length === 2 && chosen.every(e => e.kind === 'crossing') ? 'comparison' : chosen.length === 1 && chosen[0].kind === 'elevation_profile' ? 'profile' : 'map';
  if (view === 'map' && chosen.length !== 1) return null;
  const measurement = measureEvidence(view === 'profile' ? 'elevation_profile' : view === 'comparison' ? 'compare' : 'length', chosen);
  const { profile, ...summary } = measurement;
  return {
    evidenceIds: ids, view, measurement,
    inventory: {
      scope: 'Cached geographic evidence currently displayed on the interactive Earth',
      measurement: { ...summary, ...(profile ? { profile: { highest: profile.highest, lowest: profile.lowest, verticalRangeM: profile.verticalRangeM, pointCount: profile.points.length } } : {}) },
      visualization: { available: true, view, evidenceIds: ids },
      sources: measurement.sources, caveats: measurement.caveats,
    },
  };
}

export { worldAnswerSchema } from './world-answer';
