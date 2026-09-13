import { z } from 'zod';
import { searchEvidence, selectEvidence } from './catalog';
import { measureEvidence } from './measure';
import { createSceneDirector } from '../presentation/director';
import type { SceneRenderer } from './types';

const ids = z.array(z.string().min(1)).min(1).max(8);
const getSchema = z.object({ query: z.string().trim().min(1).max(1000), area: z.string().trim().max(160).optional() }).strict();
const measureSchema = z.object({ operation: z.enum(['length', 'elevation_profile', 'compare']), evidenceIds: ids }).strict();
const presentSchema = z.object({ evidenceIds: ids, view: z.enum(['map', 'profile', 'comparison']), focusIds: ids.optional() }).strict();

/** Create once per conversation. Handlers belong on the coordinator, not GPT-Live. */
export function createEvidenceTools(options: { renderer?: SceneRenderer } = {}) {
  const director = createSceneDirector(options.renderer);
  let selectedEvidenceIds: string[] = [];
  const fail = (error: unknown) => ({ status: 'unavailable' as const, error: error instanceof Error ? error.message : 'Evidence unavailable.' });
  const handlers = {
    get_evidence(input: unknown) {
      try {
        const { query, area } = getSchema.parse(input);
        const evidence = searchEvidence(query, area);
        const referenceIds = /\b(that|this|it|those|them)\b/i.test(query) ? [...selectedEvidenceIds] : [];
        return { status: evidence.length || referenceIds.length ? 'ok' as const : 'not_found' as const, evidence, referenceIds, selectedEvidenceIds: [...selectedEvidenceIds], coverage: 'Cached Java relief transect and two Singapore–Malaysia crossings; no live traffic.', ...(!evidence.length && !referenceIds.length ? { message: 'No matching sourced evidence is cached for that query.' } : {}) };
      } catch (error) { return fail(error); }
    },
    measure(input: unknown) {
      try { const request = measureSchema.parse(input); return { status: 'ok' as const, measurement: measureEvidence(request.operation, selectEvidence(request.evidenceIds)) }; }
      catch (error) { return fail(error); }
    },
    async present(input: unknown) {
      try {
        const request = presentSchema.parse(input);
        const result = await director.present(request.view, selectEvidence(request.evidenceIds), request.focusIds);
        if (result.ready) selectedEvidenceIds = [...request.evidenceIds];
        return result;
      } catch (error) { return fail(error); }
    },
  };
  return { handlers, director, getSelection: () => [...selectedEvidenceIds], clearSelection: () => { selectedEvidenceIds = []; }, dispose: () => { selectedEvidenceIds = []; director.dispose(); } };
}
export type EvidenceTools = ReturnType<typeof createEvidenceTools>;

/** Plain JSON schemas; the actual Agents API adapter is owned by the session coordinator. */
export const evidenceToolDefinitions = [
  { name: 'get_evidence', description: 'Retrieve cached, sourced geographic evidence and stable IDs. Pronouns resolve against the last successfully presented selection. Missing data is explicit.', parameters: { type: 'object', properties: { query: { type: 'string' }, area: { type: 'string' } }, required: ['query'], additionalProperties: false } },
  { name: 'measure', description: 'Deterministic measurement from evidence IDs. Compare exactly two published structural lengths, baseline first. Schematic map geometry is never measured.', parameters: { type: 'object', properties: { operation: { type: 'string', enum: ['length', 'elevation_profile', 'compare'] }, evidenceIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 } }, required: ['operation', 'evidenceIds'], additionalProperties: false } },
  { name: 'present', description: 'Focus and trace selected evidence; return ready only after the actual renderer acknowledges the latest scene revision. Use profile for a transect, map for one crossing, comparison for two crossings.', parameters: { type: 'object', properties: { evidenceIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 }, view: { type: 'string', enum: ['map', 'profile', 'comparison'] }, focusIds: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 } }, required: ['evidenceIds', 'view'], additionalProperties: false } },
] as const;
