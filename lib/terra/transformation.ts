/** Reversible, deterministic opening. Original positions are never overwritten.
 * The frozen orthonormal frame makes an opening coherent even after Earth was rotated.
 * This is artistic stellar matter, not a reconstruction of astronomical objects.
 */
import * as THREE from 'three';

export const transformationEase = (progress: number) => {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export function openingFrame(lon: number, lat: number, target = new THREE.Matrix3()) {
  const a = lon * Math.PI / 180, b = lat * Math.PI / 180;
  return target.set(
    Math.cos(a), -Math.sin(b) * Math.sin(a), Math.cos(b) * Math.sin(a),
    0, Math.cos(b), Math.sin(b),
    -Math.sin(a), -Math.sin(b) * Math.cos(a), Math.cos(b) * Math.cos(a),
  );
}

/** Writes into a reusable vector: Canvas does not allocate per particle. */
export function openingPosition(x: number, y: number, z: number, progress: number, frame: THREE.Matrix3, out: THREE.Vector3) {
  if (progress <= 0) return out.set(x, y, z);
  const e = frame.elements;
  const lx = e[0] * x + e[1] * y + e[2] * z;
  const ly = e[3] * x + e[4] * y + e[5] * z;
  const lz = e[6] * x + e[7] * y + e[8] * z;
  const radius = Math.max(.00001, Math.hypot(lx, ly, lz));
  const nx = lx / radius, ny = ly / radius, nz = lz / radius;
  const azimuth = Math.hypot(nx, ny) < 1e-7 ? 0 : Math.atan2(ny, nx);
  const spread = Math.sqrt(Math.max(0, (1 - nz) * .5));
  const angle = azimuth + spread * 2.4 + (radius - 1) * 1.6;
  const reach = (.20 + spread * 1.78 + (radius - .65) * .48) * (.83 + .17 * Math.cos(azimuth * 2 + spread * 2));
  const tx = Math.cos(angle) * reach;
  const ty = Math.sin(angle) * reach * .78;
  const tz = nz * .56 + Math.sin(azimuth * 2 + spread * 4) * .20 + (radius - 1) * 1.25;
  const p = transformationEase(progress);
  return out.set(
    x + (e[0] * tx + e[3] * ty + e[6] * tz - x) * p,
    y + (e[1] * tx + e[4] * ty + e[7] * tz - y) * p,
    z + (e[2] * tx + e[5] * ty + e[8] * tz - z) * p,
  );
}

/** The literal constants and operations match openingPosition above. */
export const transformationGLSL = `
uniform float opening;uniform mat3 openingFrame;uniform float personalStar;attribute vec3 astraPosition;
float openingEase(float t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
vec3 openedPosition(vec3 original){
  if(opening<=0.0)return original;
  float p=openingEase(opening);
  if(personalStar>.5)return mix(original,astraPosition,p);
  vec3 local=vec3(dot(openingFrame[0],original),dot(openingFrame[1],original),dot(openingFrame[2],original));
  float radius=max(.00001,length(local));vec3 n=local/radius;
  float azimuth=length(n.xy)<.0000001?0.0:atan(n.y,n.x);float spread=sqrt(max(0.0,(1.0-n.z)*.5));
  float angle=azimuth+spread*2.4+(radius-1.0)*1.6;
  float reach=(.20+spread*1.78+(radius-.65)*.48)*(.83+.17*cos(azimuth*2.0+spread*2.0));
  vec3 target=vec3(cos(angle)*reach,sin(angle)*reach*.78,n.z*.56+sin(azimuth*2.0+spread*4.0)*.20+(radius-1.0)*1.25);
  return mix(original,openingFrame*target,p);
}`;
