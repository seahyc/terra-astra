import { validateLibraryModel } from '../terra/model-library/library.mjs';
import { validateProceduralModelRecipe, type ProceduralModelRecipe } from '../terra/sculptures/procedural-model';
/** Serializable boundary for YC's Live navigator. Rendering stays inside the engine. */
export type ScaleTier = 'planet' | 'region' | 'city' | 'street';
export type WorldLayer = 'satellites' | 'aircraft' | 'ships' | 'urban';
export type WorldPerspective = 'aerial' | 'horizon' | 'cutaway';
export type WorldLocation = Readonly<{ name: string; latitude: number; longitude: number; span: number }>;
export type WorldCommand =
  | { type: 'flyTo'; targetId: string }
  | ({ type: 'flyToLocation' } & WorldLocation)
  | { type: 'setScale'; tier: ScaleTier }
  | { type: 'setPerspective'; perspective: WorldPerspective }
  | { type: 'focusLayer'; layer: WorldLayer; enabled?: boolean }
  | { type: 'highlightTarget'; targetId: string }
  | { type: 'showProceduralModel'; recipe: ProceduralModelRecipe; anchor?: WorldLocation }
  | { type: 'clearProceduralModel' }
  | { type: 'showLibraryModel'; recipe: ReturnType<typeof validateLibraryModel>; anchor?: WorldLocation }
  | { type: 'focusModelPart'; id: string | null }
  | { type: 'cancelWorldTurn' }
  | { type: 'resetView' };
export type GenesisPhase = 'core' | 'compression' | 'ignition' | 'ejection' | 'capture' | 'settlement' | 'complete';
export type GenesisState = Readonly<{ phase: GenesisPhase; progress: number; busy: boolean }>;
export type WorldState = Readonly<{ targetId: string | null; location?: WorldLocation; proceduralModel?: Readonly<{id:string;title:string;pointCount:number;parts?: readonly {id:string;label:string}[]}>; tier: ScaleTier; perspective: WorldPerspective; busy: boolean; genesis: GenesisState; layers: Readonly<Record<WorldLayer, boolean>> }>;
export type WorldCommandResult = Readonly<{ ok: boolean; command: WorldCommand; reason?: string }>;
export type WorldTarget = Readonly<{ id: string; label: string; lat: number; lon: number; tier: ScaleTier; detail: string }>;
export const WORLD_TARGETS: readonly WorldTarget[] = Object.freeze(([
  { id: 'singapore', label: 'Singapore', lat: 1.2965, lon: 103.851, tier: 'city', detail: 'Detailed central Singapore streets; procedural activity.' },
  { id: 'new-york', label: 'New York', lat: 40.721562, lon: -73.995718, tier: 'city', detail: 'Curated New York showcase; procedural activity.' },
  { id: 'challenger-deep', label: 'Challenger Deep', lat: 11.369, lon: 142.587, tier: 'region', detail: 'Mariana Trench; exaggerated NOAA relief.' },
] satisfies WorldTarget[]).map(target=>Object.freeze(target)));
export function validateWorldCommand(input: unknown): WorldCommand | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const c=input as Record<string,unknown>;
  if(c.type==='cancelWorldTurn')return {type:'cancelWorldTurn'};
  if(c.type==='clearProceduralModel')return {type:'clearProceduralModel'};
  if(c.type==='focusModelPart')return c.id===null||typeof c.id==='string'&&c.id.length<=40?{type:'focusModelPart',id:c.id as string|null}:null;
  if(c.type==='showLibraryModel') {
    try {const recipe=validateLibraryModel(c.recipe);if(c.anchor===undefined)return {type:'showLibraryModel',recipe};
    const anchor=validateWorldCommand({...c.anchor as Record<string,unknown>,type:'flyToLocation'});
    return anchor?.type==='flyToLocation'?{type:'showLibraryModel',recipe,anchor:{name:anchor.name,latitude:anchor.latitude,longitude:anchor.longitude,span:anchor.span}}:null;}catch{return null;}
  }
  if(c.type==='showProceduralModel') {
    try {
      const recipe=validateProceduralModelRecipe(c.recipe);
      if(c.anchor===undefined)return {type:'showProceduralModel',recipe};
      if(!c.anchor||typeof c.anchor!=='object'||Array.isArray(c.anchor))return null;
      const anchor=validateWorldCommand({...c.anchor as Record<string,unknown>,type:'flyToLocation'});
      return anchor?.type==='flyToLocation'?{type:'showProceduralModel',recipe,anchor:{name:anchor.name,latitude:anchor.latitude,longitude:anchor.longitude,span:anchor.span}}:null;
    }catch{return null;}
  }
  if(c.type==='flyToLocation') {
    if(typeof c.name!=='string'||!c.name.trim()||c.name.trim().length>80)return null;
    if(typeof c.latitude!=='number'||!Number.isFinite(c.latitude)||c.latitude < -80||c.latitude > 80)return null;
    if(typeof c.longitude!=='number'||!Number.isFinite(c.longitude)||c.longitude < -180||c.longitude > 180)return null;
    if(typeof c.span!=='number'||!Number.isFinite(c.span)||c.span < 2||c.span > 60)return null;
    return {type:'flyToLocation',name:c.name.trim(),latitude:c.latitude,longitude:c.longitude,span:c.span};
  }
  if(c.type==='flyTo'||c.type==='highlightTarget') return typeof c.targetId==='string'&&WORLD_TARGETS.some(t=>t.id===c.targetId)?{type:c.type,targetId:c.targetId}:null;
  if(c.type==='resetView')return {type:'resetView'};
  if(c.type==='setScale'&&['planet','region','city','street'].includes(c.tier as string))return {type:'setScale',tier:c.tier as ScaleTier};
  if(c.type==='setPerspective'&&['aerial','horizon','cutaway'].includes(c.perspective as string))return {type:'setPerspective',perspective:c.perspective as WorldPerspective};
  if(c.type==='focusLayer'&&['satellites','aircraft','ships','urban'].includes(c.layer as string)&&(c.enabled===undefined||typeof c.enabled==='boolean'))return {type:'focusLayer',layer:c.layer as WorldLayer,...(c.enabled===undefined?{}:{enabled:c.enabled})};
  return null;
}
