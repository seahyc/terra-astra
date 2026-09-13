import { z } from 'zod';
import type { EvidenceScene } from './evidence/types';

export const worldTargetSchema = z.object({
  name: z.string().trim().min(1).max(80),
  latitude: z.number().finite().min(-80).max(80),
  longitude: z.number().finite().min(-180).max(180),
  span: z.number().finite().min(2).max(60),
});
export const worldAnswerSchema = z.object({
  title: z.string().trim().min(1).max(100),
  explanation: z.string().trim().min(1).max(2000),
  limitation: z.string().trim().max(500),
  targets: z.array(worldTargetSchema).max(4),
  perspective: z.enum(['aerial', 'horizon', 'cutaway']).optional(),
  imageBrief: z.object({
    title: z.string().trim().min(1).max(100),
    prompt: z.string().trim().min(1).max(1400),
  }).strict().optional(),
});
export type WorldTarget = z.infer<typeof worldTargetSchema>;
export type WorldAnswer = z.infer<typeof worldAnswerSchema>;

/** Geographic orientation only. No invented measurements, historical boundaries or routes. */
export function makeContextScene(revision: number, input: WorldTarget): EvidenceScene {
  const target = worldTargetSchema.parse(input);
  const sculpture = /angkor\s*wat/i.test(target.name) ? 'angkor-wat' as const : undefined;
  if(sculpture){target.latitude=13.4125;target.longitude=103.867;}
  const half = sculpture ? .006 : target.span / 2;
  return {
    revision, view: 'map', perspective: 'oblique', sculpture, evidenceIds: [], focusIds: [], evidence: [], measurement: null,
    bounds: { west: Math.max(-180,target.longitude-half), east: Math.min(180,target.longitude+half), south: Math.max(-85,target.latitude-half), north: Math.min(85,target.latitude+half) },
    traces: [], labels: [{ id: 'world-focus', text: target.name, coordinate: [target.longitude,target.latitude], color: '#D6C8FF', role: 'value' }],
  };
}

/** These shortcuts move the globe immediately; the answer is still generated per question. */
const knownTargets: { pattern: RegExp; target: WorldTarget }[] = [
  { pattern: /angkor\s*wat/i, target: {name:'Angkor Wat',latitude:13.4125,longitude:103.867,span:2} },
  { pattern: /angkor/i, target: {name:'Angkor',latitude:13.44,longitude:103.86,span:3} },
  { pattern: /singapore/i, target: {name:'Singapore',latitude:1.35,longitude:103.82,span:2} },
  { pattern: /new york|\bnyc\b/i, target: {name:'New York',latitude:40.71,longitude:-74.01,span:3} },
  { pattern: /mariana|challenger deep|deepest trench/i, target: {name:'Mariana Trench',latitude:11.37,longitude:142.59,span:10} },
  { pattern: /malacca|melaka/i, target: {name:'Strait of Malacca',latitude:3.7,longitude:100.3,span:10} },
  { pattern: /himalaya|everest/i, target: {name:'Himalayas',latitude:28,longitude:86.9,span:15} },
  { pattern: /mekong/i, target: {name:'Mekong region',latitude:16,longitude:104.5,span:16} },
  { pattern: /andes/i, target: {name:'Andes',latitude:-20,longitude:-72,span:25} },
  { pattern: /indonesia|java/i, target: {name:'Indonesia',latitude:-5,longitude:112,span:18} },
  { pattern: /vietnam/i, target: {name:'Vietnam',latitude:16,longitude:107,span:15} },
];
export function immediateTarget(question: string) { return knownTargets.find(item => item.pattern.test(question))?.target; }
