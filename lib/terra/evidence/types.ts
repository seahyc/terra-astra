export type Coordinate = [longitude: number, latitude: number];
export type EvidenceSource = { title: string; url: string; publisher: string; publishedAt?: string; retrievedAt: string; supports: string };
export type ProfilePoint = { latitude: number; longitude: number; distanceKm: number; elevationM: number };
export type EvidenceBase = { id: string; label: string; aliases: string[]; area: string; sources: EvidenceSource[]; caveats: string[] };
export type CrossingEvidence = EvidenceBase & {
  kind: 'crossing'; publishedLength: { value: number; unit: 'm'; definition: string };
  geometry: { kind: 'schematic' | 'surveyed'; coordinates: Coordinate[]; endpointLabels: [string, string]; note: string };
};
export type ProfileEvidence = EvidenceBase & {
  kind: 'elevation_profile'; points: ProfilePoint[]; resolutionDegrees: number; sampling: string;
};
export type Evidence = CrossingEvidence | ProfileEvidence;
export type Measurement = {
  id: string; operation: 'length' | 'elevation_profile' | 'compare'; evidenceIds: string[];
  unit: 'm'; method: string; coverage: string; caveats: string[];
  values: { evidenceId: string; label: string; value: number; definition: string }[];
  profile?: { points: ProfilePoint[]; highest: ProfilePoint; lowest: ProfilePoint; verticalRangeM: number };
  comparison?: { baselineId: string; comparedId: string; differenceM: number; ratio: number };
  sources: EvidenceSource[];
};
export type SceneTrace = { id: string; label: string; color: string; coordinates: Coordinate[]; elevationsM?: number[]; schematic: boolean };
export type SceneLabel = { id: string; text: string; coordinate: Coordinate; elevationM?: number; color: string; role: 'endpoint' | 'extremum' | 'value' };
export type EvidenceScene = {
  revision: number; view: 'map' | 'profile' | 'comparison'; perspective?: 'globe' | 'oblique'; sculpture?: 'angkor-wat'; evidenceIds: string[]; focusIds: string[];
  bounds: { west: number; east: number; south: number; north: number };
  traces: SceneTrace[]; labels: SceneLabel[]; measurement: Measurement | null;
  evidence: Evidence[];
};
export type RendererReady = { revision: number; ready: true; renderer: string };
export type SceneRenderer = (scene: EvidenceScene, signal: AbortSignal) => Promise<RendererReady>;
export type PresentationSnapshot = { scene: EvidenceScene | null; status: 'idle' | 'rendering' | 'ready' | 'error'; error?: string };
