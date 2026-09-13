/** Geographic personal stars are distinct from the authored Singapore stories. */
import * as THREE from 'three';
import type { PersonalPlaces } from './personal-contract';

const radians = Math.PI / 180;
export function personalGeography(places: PersonalPlaces) {
  return places.map(p => new THREE.Vector3(
    Math.cos(p.lat * radians) * Math.sin(p.lon * radians),
    Math.sin(p.lat * radians),
    Math.cos(p.lat * radians) * Math.cos(p.lon * radians),
  ).multiplyScalar(1.085));
}

/** Unit-vector framing handles the dateline; deterministic sampling handles an
 * antipodal or zero-sum triple without NaN or an arbitrary longitude average.
 * Favor visible places, with projection separation as the tie breaker.
 */
export function personalCamera(places: PersonalPlaces) {
  const points = personalGeography(places).map(p => p.normalize());
  const mean = points.reduce((sum, p) => sum.add(p), new THREE.Vector3());
  const candidates: THREE.Vector3[] = [];
  if (mean.lengthSq() > 1e-8) candidates.push(mean.normalize());
  for (let i = 0; i < 192; i++) {
    const y = 1 - 2 * (i + .5) / 192;
    const a = i * Math.PI * (3 - Math.sqrt(5));
    const r = Math.sqrt(1 - y * y);
    candidates.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  let best = candidates[0], bestScore = -Infinity;
  for (const c of candidates) {
    const facing = points.map(p => p.dot(c));
    let separation = Infinity;
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      const difference = points[i].clone().sub(points[j]);
      separation = Math.min(separation, difference.lengthSq() - difference.dot(c) ** 2);
    }
    const score = Math.min(...facing) * 1.4 + facing.reduce((a, b) => a + b, 0) * .2 + separation * .45;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return { lat: Math.asin(best.y) / radians, lon: Math.atan2(best.x, best.z) / radians };
}

/** A readable open constellation, with each place retaining its identity.
 * Earth endpoints are real coordinates; these three separated Astra endpoints
 * derive from the three great-circle distances. Bounded distance compression
 * retains readability; the result is a personal composition, not a scale map.
 */
export function personalAstra(places: PersonalPlaces, frame: THREE.Matrix3) {
  const geography = personalGeography(places).map(p => p.normalize());
  const angular = (a: number, b: number) => Math.acos(THREE.MathUtils.clamp(geography[a].dot(geography[b]), -1, 1));
  const distances = [angular(0, 1), angular(0, 2), angular(1, 2)];
  const maximum = Math.max(.000001, ...distances);
  // Compress extreme ratios, rather than letting two nearby places disappear.
  const [ab, ac, bc] = distances.map(d => .55 + .45 * d / maximum);
  const x = (ac * ac + ab * ab - bc * bc) / (2 * ab);
  const y = Math.max(.34, Math.sqrt(Math.max(0, ac * ac - x * x)));
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(ab, 0, 0), new THREE.Vector3(x, y, 0)];
  const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / 3);
  const rotation = -.70, cosine = Math.cos(rotation), sine = Math.sin(rotation);
  for (const p of points) {
    p.sub(center);const px = p.x, py = p.y;p.set(px * cosine - py * sine, px * sine + py * cosine, 0);
  }
  const extent = Math.max(...points.map(p => Math.max(Math.abs(p.x) / .96, Math.abs(p.y) / .64)));
  const span = .88 + .12 * Math.min(1, maximum / Math.PI);
  return points.map((p, i) => {
    p.multiplyScalar(span / Math.max(.000001, extent));
    // Small, coordinate-derived depth gives every submitted triple a stable volume.
    p.z = .25 + .24 * geography[i].y + .16 * geography[i].x;
    return p.applyMatrix3(frame);
  });
}

/** Warm lifted geodesic threads. Antipodal endpoints use a stable perpendicular. */
export function personalArc(a: THREE.Vector3, b: THREE.Vector3, t: number, out: THREE.Vector3) {
  const dot = THREE.MathUtils.clamp(a.dot(b) / (a.length() * b.length()), -1, 1);
  const angle = Math.acos(dot);
  if (angle < .00001) return out.copy(a).lerp(b, t);
  if (dot < -.9999) {
    const normal = new THREE.Vector3().crossVectors(a, Math.abs(a.y) < .9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    return out.copy(a).normalize().multiplyScalar(Math.cos(Math.PI * t)).addScaledVector(normal, Math.sin(Math.PI * t)).multiplyScalar(1.085 + Math.sin(Math.PI * t) * .08);
  }
  return out.copy(a).multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle)).addScaledVector(b, Math.sin(t * angle) / Math.sin(angle)).normalize().multiplyScalar(1.085 + Math.sin(Math.PI * t) * .08);
}
