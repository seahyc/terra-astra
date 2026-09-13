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
 * are deliberately a personal composition, not a geographic distance chart.
 */
export function personalAstra(frame: THREE.Matrix3) {
  return [
    new THREE.Vector3(-.88, .38, .22),
    new THREE.Vector3(.05, -.43, .60),
    new THREE.Vector3(.86, .49, -.04),
  ].map(p => p.applyMatrix3(frame));
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
