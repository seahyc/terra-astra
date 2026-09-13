import type { Evidence, Measurement } from './types';

export function measureEvidence(operation: Measurement['operation'], evidence: Evidence[]): Measurement {
  if (!evidence.length) throw new Error('Select evidence before measuring.');
  const sources = [...new Map(evidence.flatMap(e => e.sources).map(s => [s.url, s])).values()];
  const caveats = [...new Set(evidence.flatMap(e => e.caveats))];
  const base = { id: `measurement:${operation}:${evidence.map(e => e.id).join('+')}`, operation, evidenceIds: evidence.map(e => e.id), unit: 'm' as const, sources, caveats };
  if (operation === 'elevation_profile') {
    if (evidence.length !== 1 || evidence[0].kind !== 'elevation_profile') throw new Error('An elevation profile requires exactly one sampled transect.');
    const e = evidence[0];
    if (e.points.length < 2) throw new Error('This transect has insufficient samples.');
    const highest = e.points.reduce((a, p) => p.elevationM > a.elevationM ? p : a);
    const lowest = e.points.reduce((a, p) => p.elevationM < a.elevationM ? p : a);
    const verticalRangeM = highest.elevationM - lowest.elevationM;
    return { ...base, method: `Maximum minus minimum of cached elevation samples. ${e.sampling}`, coverage: `${e.label}; ${e.points.length} samples from a ${e.resolutionDegrees}° grid.`, values: [{ evidenceId: e.id, label: 'Sampled vertical drop', value: verticalRangeM, definition: 'Highest minus lowest sample on this transect, relative to sea level.' }], profile: { points: e.points, highest, lowest, verticalRangeM } };
  }
  if (evidence.some(e => e.kind !== 'crossing')) throw new Error('Length comparison requires crossing evidence with published structural lengths.');
  const values = evidence.map(e => {
    if (e.kind !== 'crossing') throw new Error('Unsupported length evidence.');
    return { evidenceId: e.id, label: e.label, value: e.publishedLength.value, definition: e.publishedLength.definition };
  });
  if (operation === 'length' && values.length !== 1) throw new Error('Length requires exactly one crossing.');
  if (operation === 'compare' && values.length !== 2) throw new Error('Compare requires exactly two crossings, baseline first.');
  return {
    ...base, method: 'Published structural lengths; no length is calculated from the schematic map lines.',
    coverage: values.map(v => `${v.label}: ${v.definition}`).join(' '), values,
    ...(operation === 'compare' ? { comparison: { baselineId: values[0].evidenceId, comparedId: values[1].evidenceId, differenceM: values[1].value - values[0].value, ratio: values[1].value / values[0].value } } : {}),
  };
}
