import { z } from 'zod';
import crossings from '../../../public/data/crossings-evidence.json';
import javaProfile from '../../../public/data/sea-java-profile.json';
import type { Evidence } from './types';

const coordinate = z.tuple([z.number().finite().min(-180).max(180), z.number().finite().min(-90).max(90)]);
const source = z.object({ title: z.string(), url: z.string().url().startsWith('https://'), publisher: z.string(), publishedAt: z.string().optional(), retrievedAt: z.string(), supports: z.string() });
const crossing = z.object({ id: z.string(), kind: z.literal('crossing'), label: z.string(), aliases: z.array(z.string()), area: z.string(), publishedLength: z.object({ value: z.number().finite().positive(), unit: z.literal('m'), definition: z.string() }), geometry: z.object({ kind: z.enum(['schematic', 'surveyed']), coordinates: z.array(coordinate).min(2), endpointLabels: z.tuple([z.string(), z.string()]), note: z.string() }), sources: z.array(source).min(1), caveats: z.array(z.string()) });
const points = z.array(z.object({ latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), distanceKm: z.number().finite().nonnegative(), elevationM: z.number().finite() })).min(2).parse(javaProfile.points);
if (points.some((p, i) => i > 0 && p.distanceKm <= points[i - 1].distanceKm)) throw new Error('Profile distances must increase.');
export const evidenceCatalog: readonly Evidence[] = [
  ...z.array(crossing).parse(crossings.features),
  { id: 'profile:java-north-south', kind: 'elevation_profile', label: 'Java to the Indian Ocean', aliases: ['Java', 'Java mountains', 'ocean floor south of Java', 'Java Trench', 'Indonesia', 'Java transect'], area: 'East Java, Indonesia and the Indian Ocean to its south', sources: [{ title: 'NOAA ETOPO 2022 global relief model', url: javaProfile.sourceUrl, publisher: 'NOAA NCEI', publishedAt: '2022', retrievedAt: '2026-09-13', supports: `Elevation samples from cached globe grid SHA-256 ${javaProfile.sourceGridSha256}.` }], caveats: javaProfile.limitations, points, resolutionDegrees: javaProfile.resolutionDegrees, sampling: javaProfile.sampling },
];
export function selectEvidence(ids: string[], catalog: readonly Evidence[] = evidenceCatalog): Evidence[] {
  if (!ids.length || ids.length > 8 || new Set(ids).size !== ids.length) throw new Error('Provide one to eight distinct evidence IDs.');
  return ids.map(id => { const e = catalog.find(e => e.id === id); if (!e) throw new Error(`Evidence unavailable: ${id}`); return e; });
}
const normalize = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const stopWords = new Set(['the', 'and', 'to', 'of', 'me', 'how', 'does', 'is', 'that', 'it', 'this', 'with', 'now', 'show', 'take', 'long', 'far', 'compare', 'singapore', 'malaysia', 'johor']);
/** Search a small verified catalogue. Unsupported topics return no results, never generated evidence. */
export function searchEvidence(query: string, area?: string): Evidence[] {
  const words = normalize(query).split(' ').filter(w => w.length > 2 && !stopWords.has(w));
  if (!words.length) return [];
  return evidenceCatalog.filter(e => {
    const tokens = new Set(normalize([e.label, ...e.aliases].join(' ')).split(' '));
    return words.some(w => tokens.has(w)) && (!area || normalize(e.area).includes(normalize(area)) || normalize(e.label).includes(normalize(area)));
  });
}
