import type { SignalOutput } from './signals';

/** Authored undersea-backbone illustration, not actual cable alignments, landing
 * sites, ownership or network status. Coarse ETOPO water checks are in the test.
 */
type XYZ = readonly [number, number, number];
type LatLon = readonly [number, number];
export type CableSegment = Readonly<{ basisA: XYZ; basisB: XYZ; arc: number; start: number; end: number }>;
export type CablePath = Readonly<{
  id: string;
  label: string;
  provenance: 'procedural';
  radius: number;
  periodSeconds: number;
  phase: number;
  waypoints: readonly LatLon[];
  segments: readonly CableSegment[];
  totalArc: number;
}>;

export const cableColor = '#7776AD';
export const cableDisclosure = 'Illustrated undersea connections. Not actual cable routes or live network status.';
export const CABLE_SEGMENTS_PER_PATH = 64;
const TAU = Math.PI * 2;
const R = Math.PI / 180;
const xyz = (x: number, y: number, z: number): XYZ => Object.freeze([x, y, z]);
function geography([lat, lon]: LatLon): XYZ {
  return xyz(Math.cos(lat * R) * Math.sin(lon * R), Math.sin(lat * R), Math.cos(lat * R) * Math.cos(lon * R));
}

function cable(id: string, label: string, locations: readonly LatLon[], index: number): CablePath {
  const waypoints = Object.freeze(locations.map(point => Object.freeze([...point]) as LatLon));
  const segments: CableSegment[] = [];
  let totalArc = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const a = geography(waypoints[i - 1]), b = geography(waypoints[i]);
    const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    const arc = Math.acos(dot), denominator = Math.sin(arc);
    if (denominator < 1e-6) throw new Error(`Invalid illustrated cable segment: ${id}`);
    segments.push(Object.freeze({ basisA: a, basisB: xyz((b[0] - a[0] * dot) / denominator, (b[1] - a[1] * dot) / denominator, (b[2] - a[2] * dot) / denominator), arc, start: totalArc, end: totalArc + arc }));
    totalArc += arc;
  }
  return Object.freeze({ id, label: `${label} · illustrated`, provenance: 'procedural', radius: 1.001, periodSeconds: 200 + index * 13, phase: (index * .381966 + .14) % 1, waypoints, segments: Object.freeze(segments), totalArc });
}

/** Open-water control points only. The visual offset is not physical cable depth. */
export const cablePaths: readonly CablePath[] = Object.freeze([
  cable('backbone-north-atlantic', 'North Atlantic', [[40, -69], [38, -55], [43, -40], [48, -25], [50, -15]], 0),
  cable('backbone-south-atlantic', 'South Atlantic', [[-25, -40], [-20, -30], [-16, -18], [-15, -5], [-20, 5]], 1),
  cable('backbone-north-pacific', 'North Pacific', [[35, 145], [38, 165], [37, -175], [38, -155], [36, -135], [35, -125]], 2),
  cable('backbone-south-pacific', 'South Pacific', [[-30, 157], [-28, 175], [-25, -165], [-23, -145], [-18, -120], [-15, -90]], 3),
  cable('backbone-indian', 'Indian Ocean', [[-11, 44], [-10, 50], [-12, 58], [-10, 72], [-8, 86], [-10, 98]], 4),
  cable('backbone-arabian', 'Arabian Sea', [[10, 57], [14, 59], [18, 62], [20, 67], [17, 70]], 5),
  cable('backbone-bengal', 'Bay of Bengal', [[6, 83], [10, 85], [15, 87], [19, 89]], 6),
  cable('backbone-south-china', 'South China Sea', [[4, 109.5], [8, 110], [13, 113], [18, 115]], 7),
  cable('backbone-mediterranean', 'Mediterranean', [[36, -3], [38, 1], [38, 8], [37.6, 11], [36, 13], [34, 20], [34, 26], [33, 32]], 8),
  cable('backbone-eastern-pacific', 'Eastern Pacific', [[-10, -90], [0, -95], [10, -105], [20, -117], [31, -126]], 9),
]);

/** Allocation-free arc-length sample of one fixed multi-waypoint path. */
export function sampleCable(path: CablePath, progress: number, out: SignalOutput): void {
  const fraction = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const distance = fraction * path.totalArc;
  let segment = path.segments[path.segments.length - 1];
  for (let i = 0; i < path.segments.length; i++) {
    if (distance <= path.segments[i].end) { segment = path.segments[i]; break; }
  }
  const angle = Math.max(0, Math.min(segment.arc, distance - segment.start));
  const c = Math.cos(angle) * path.radius, s = Math.sin(angle) * path.radius;
  out[0] = segment.basisA[0] * c + segment.basisB[0] * s;
  out[1] = segment.basisA[1] * c + segment.basisB[1] * s;
  out[2] = segment.basisA[2] * c + segment.basisB[2] * s;
}

/** A slow illustrative pulse traverses the same path and turns without jumping.
 * Positive lag is earlier history. Hold the caller's clock to pause completely.
 */
export function sampleCablePulse(path: CablePath, timeSeconds: number, out: SignalOutput, lagSeconds = 0): void {
  const time = Number.isFinite(timeSeconds) ? timeSeconds : 0;
  const lag = Number.isFinite(lagSeconds) ? Math.max(0, lagSeconds) : 0;
  const cycle = ((time % path.periodSeconds) - (lag % path.periodSeconds)) / path.periodSeconds + path.phase;
  sampleCable(path, .5 - .5 * Math.cos(TAU * (cycle - Math.floor(cycle))), out);
}
