/** Spatial study: genuine relief, artistically exaggerated; interior light is interpretive. */
export type EarthView = 'globe' | 'oblique' | 'cutaway';
export type StudyRegion = 'indonesia' | 'andes';
export const studyRegions = {
  indonesia: { label: 'Indonesia · Java Trench', lat: -5, lon: 112 },
  andes: { label: 'Andes · Pacific', lat: -20, lon: -72 },
} as const;
const smooth = (a: number, b: number, n: number) => { const t = Math.max(0, Math.min(1, (n - a) / (b - a))); return t * t * (3 - 2 * t); };

export function reliefRadius(metres: number) {
  return 1 + (metres >= 0 ? .078 * Math.pow(metres / 8500, .72) : -.070 * Math.pow(-metres / 11000, .65));
}

export function spatialBlend(altitude: number, enabled: boolean) {
  return enabled ? smooth(.025, .24, altitude) : 0;
}

export function sampleElevation(grid: Int16Array, width: number, height: number, lon: number, lat: number) {
  const x = ((lon + 180) / 360 * width - .5 + width) % width;
  const y = Math.max(0, Math.min(height - 1, (90 - lat) / 180 * height - .5));
  const x0 = Math.floor(x), y0 = Math.floor(y), tx = x - x0, ty = y - y0;
  const a = grid[y0 * width + x0], b = grid[y0 * width + (x0 + 1) % width];
  const c = grid[Math.min(height - 1, y0 + 1) * width + x0], d = grid[Math.min(height - 1, y0 + 1) * width + (x0 + 1) % width];
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

/** Camera-ray distance through the luminous body controls how much deep light is seen. */
export const spatialVertexGLSL = `
uniform float spatial;uniform float depthMix;uniform float cutaway;uniform vec3 cutNormal;uniform vec3 cutFacing;uniform float cameraDistance;
vec3 spatialPosition(vec3 original){
  if(spatial<.5)return original;
  return normalize(original)*mix(1.00002,length(original),depthMix);
}
float spatialVisibility(vec3 world){
  if(spatial<.5)return 1.0;
  float cut=smoothstep(-.008,.008,dot(world,cutNormal))*smoothstep(-.008,.008,dot(world,cutFacing));
  vec3 ray=normalize(world-cameraPosition);float b=dot(cameraPosition,ray);
  float discriminant=b*b-dot(cameraPosition,cameraPosition)+1.12*1.12;
  float entry=max(0.0,-b-sqrt(max(0.0,discriminant)));
  float depth=max(0.0,distance(world,cameraPosition)-entry);
  return mix(1.0,(1.0-cutaway*cut*(1.0-opening))*exp(-depth*mix(mix(2.9,1.4,cutaway),.24,openingEase(opening))),depthMix);
}`;
