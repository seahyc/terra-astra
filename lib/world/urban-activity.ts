/**
 * Truth-inspired urban movement on prepared street geometry. These particles are
 * procedural activity, never observed vehicles, individual people or live counts.
 * Uses the same world XYZ convention as Terra's prepared geography.
 */
export const URBAN_RADIUS = 1.00003;
const EARTH_METRES = 6_371_000;
const TAU = Math.PI * 2;

export type UrbanActivityOptions = {
  trafficCount?: number;
  activityCount?: number;
  seed?: number;
  /** Reject discontinuous geometry instead of animating across gaps. */
  maxSegmentMetres?: number;
};

export type UrbanActivity = {
  readonly trafficCount: number;
  readonly activityCount: number;
  readonly validSegmentCount: number;
  /** Per-particle immutable unit-sphere endpoints, stride 6, useful for inspection. */
  readonly trafficSegments: Float32Array;
  readonly trafficDirections: Int8Array;
  readonly trafficBrightness: Float32Array;
  readonly trafficSize: Float32Array;
  readonly activityBrightness: Float32Array;
  readonly activitySize: Float32Array;
  /** Updated by sample; fade traffic at segment boundaries if desired. */
  readonly trafficOpacity: Float32Array;
  /** Immutable unit-sphere activity centers at repeated road endpoints. */
  readonly activityAnchors: Float32Array;
  /** Seconds; caller owns reusable XYZ output buffers, each count * 3 or larger. */
  sample(timeSeconds: number, trafficXYZ: Float32Array, activityXYZ: Float32Array): void;
  /** Alias for sample for frame-loop adapters. */
  update(timeSeconds: number, trafficXYZ: Float32Array, activityXYZ: Float32Array): void;
};

function hash(value: number) {
  let x = value | 0;
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
}
const fraction = (x: number) => x - Math.floor(x);
const budget = (n: number | undefined, fallback: number) => Math.max(0, Math.min(2000, Math.floor(Number.isFinite(n) ? n! : fallback)));
function choose(cumulative: number[], value: number) {
  let low = 0, high = cumulative.length - 1;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (value < cumulative[middle]) high = middle; else low = middle + 1;
  }
  return low;
}

export function createUrbanActivity(roadPositions: Float32Array, options: UrbanActivityOptions = {}): UrbanActivity {
  const seed = Number.isFinite(options.seed) ? options.seed! | 0 : 260913;
  const maximum = Number.isFinite(options.maxSegmentMetres) ? Math.max(2, Math.min(5000, options.maxSegmentMetres!)) : 1200;
  const roads: number[] = [], lengths: number[] = [], cumulative: number[] = [];
  const junctions = new Map<string, { x: number; y: number; z: number; count: number }>();
  let totalLength = 0;
  function junction(x: number, y: number, z: number) {
    // Sub-metre quantization recovers shared OSM endpoints after Float32 storage.
    const key = `${Math.round(x * 1e7)},${Math.round(y * 1e7)},${Math.round(z * 1e7)}`;
    const existing = junctions.get(key);
    if (existing) existing.count++; else junctions.set(key, { x, y, z, count: 1 });
  }
  for (let i = 0; i + 5 < roadPositions.length; i += 6) {
    let ax = roadPositions[i], ay = roadPositions[i + 1], az = roadPositions[i + 2];
    let bx = roadPositions[i + 3], by = roadPositions[i + 4], bz = roadPositions[i + 5];
    const ar = Math.hypot(ax, ay, az), br = Math.hypot(bx, by, bz);
    if (!(ar > .98 && ar < 1.02 && br > .98 && br < 1.02)) continue;
    ax /= ar; ay /= ar; az /= ar; bx /= br; by /= br; bz /= br;
    const metres = Math.hypot(bx - ax, by - ay, bz - az) * EARTH_METRES;
    if (!(metres >= 2 && metres <= maximum)) continue;
    roads.push(ax, ay, az, bx, by, bz); lengths.push(metres);
    totalLength += metres; cumulative.push(totalLength);
    junction(ax, ay, az); junction(bx, by, bz);
  }

  const trafficCount = lengths.length ? budget(options.trafficCount, 600) : 0;
  const activityCount = lengths.length ? budget(options.activityCount, 500) : 0;
  const trafficSegments = new Float32Array(trafficCount * 6);
  const trafficDirections = new Int8Array(trafficCount);
  const trafficBrightness = new Float32Array(trafficCount), trafficSize = new Float32Array(trafficCount);
  const trafficOpacity = new Float32Array(trafficCount), trafficPhase = new Float64Array(trafficCount), trafficRate = new Float64Array(trafficCount);
  for (let i = 0; i < trafficCount; i++) {
    const identity = seed + i * 19;
    const selected = choose(cumulative, hash(identity) * totalLength);
    for (let c = 0; c < 6; c++) trafficSegments[i * 6 + c] = roads[selected * 6 + c];
    trafficDirections[i] = hash(identity + 1) < .5 ? -1 : 1;
    trafficPhase[i] = hash(identity + 2);
    trafficRate[i] = (7 + hash(identity + 3) * 13) / lengths[selected];
    trafficBrightness[i] = .5 + hash(identity + 4) * .4;
    trafficSize[i] = .6 + hash(identity + 5) * .4;
  }

  const centers = [...junctions.values()];
  const centerWeights: number[] = [];
  let totalWeight = 0;
  for (const center of centers) { totalWeight += center.count * center.count; centerWeights.push(totalWeight); }
  const activityAnchors = new Float32Array(activityCount * 3);
  const activityBasis = new Float32Array(activityCount * 6);
  const activityBrightness = new Float32Array(activityCount), activitySize = new Float32Array(activityCount);
  const activityPhase = new Float64Array(activityCount), activityRate = new Float64Array(activityCount), activityWander = new Float64Array(activityCount);
  for (let i = 0; i < activityCount; i++) {
    const identity = seed + 100000 + i * 23;
    const center = centers[choose(centerWeights, hash(identity) * totalWeight)];
    activityAnchors.set([center.x, center.y, center.z], i * 3);
    // Longitude tangent and perpendicular tangent, stable even near the poles.
    let tx = center.z, ty = 0, tz = -center.x;
    let tr = Math.hypot(tx, tz);
    if (tr < .00001) { tx = 1; ty = 0; tz = 0; tr = 1; }
    tx /= tr; ty /= tr; tz /= tr;
    activityBasis.set([tx, ty, tz, center.y * tz - center.z * ty, center.z * tx - center.x * tz, center.x * ty - center.y * tx], i * 6);
    activityPhase[i] = hash(identity + 1) * TAU;
    activityRate[i] = .045 + hash(identity + 2) * .075;
    activityWander[i] = (2 + hash(identity + 3) * 7) / EARTH_METRES;
    activityBrightness[i] = .12 + hash(identity + 4) * .2;
    activitySize[i] = .28 + hash(identity + 5) * .25;
  }

  function sample(timeSeconds: number, trafficXYZ: Float32Array, activityXYZ: Float32Array) {
    if (trafficXYZ.length < trafficCount * 3 || activityXYZ.length < activityCount * 3) throw new RangeError('Urban output buffer is smaller than its particle count.');
    const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
    for (let i = 0; i < trafficCount; i++) {
      const route = i * 6, output = i * 3;
      const progress = fraction(trafficPhase[i] + time * trafficRate[i]);
      const t = trafficDirections[i] === 1 ? progress : 1 - progress;
      const x = trafficSegments[route] * (1 - t) + trafficSegments[route + 3] * t;
      const y = trafficSegments[route + 1] * (1 - t) + trafficSegments[route + 4] * t;
      const z = trafficSegments[route + 2] * (1 - t) + trafficSegments[route + 5] * t;
      const radius = URBAN_RADIUS / Math.sqrt(x * x + y * y + z * z);
      trafficXYZ[output] = x * radius; trafficXYZ[output + 1] = y * radius; trafficXYZ[output + 2] = z * radius;
      trafficOpacity[i] = Math.min(1, progress / .08, (1 - progress) / .08);
    }
    for (let i = 0; i < activityCount; i++) {
      const anchor = i * 3, basis = i * 6;
      const phase = activityPhase[i] + time * activityRate[i];
      // Two unequal periods produce soft wandering and clustering, not road traffic.
      const a = Math.sin(phase) * activityWander[i];
      const b = Math.sin(phase * 1.617 + activityPhase[i]) * activityWander[i] * .65;
      const x = activityAnchors[anchor] + activityBasis[basis] * a + activityBasis[basis + 3] * b;
      const y = activityAnchors[anchor + 1] + activityBasis[basis + 1] * a + activityBasis[basis + 4] * b;
      const z = activityAnchors[anchor + 2] + activityBasis[basis + 2] * a + activityBasis[basis + 5] * b;
      const radius = URBAN_RADIUS / Math.sqrt(x * x + y * y + z * z);
      activityXYZ[anchor] = x * radius; activityXYZ[anchor + 1] = y * radius; activityXYZ[anchor + 2] = z * radius;
    }
  }
  return { trafficCount, activityCount, validSegmentCount: lengths.length, trafficSegments, trafficDirections, trafficBrightness, trafficSize, trafficOpacity, activityAnchors, activityBrightness, activitySize, sample, update: sample };
}
