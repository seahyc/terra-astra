// Regression checks for the empty return, saturated city approach, and clipped map edges.
// Run with Node 24+: node scripts/check-choreography.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { cityFeather, flightProgress, lightLevels, revealProgress } from '../lib/terra/choreography.ts';

const R = Math.PI / 180;
const geo = (lon, lat, r = 1) => new THREE.Vector3(r * Math.cos(lat * R) * Math.sin(lon * R), r * Math.sin(lat * R), r * Math.cos(lat * R) * Math.cos(lon * R));
function data(name) {
  const buffer = readFileSync(new URL(`../public/data/${name}.bin`, import.meta.url));
  return new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
}
const globalStars = data('coast'), regionalLines = data('regional-lines'), streets = data('singapore-stars');
const camera = new THREE.PerspectiveCamera(42, 1363 / 936, .0000004, 65);
camera.setViewOffset(1363, 936, -1363 * .17, 0, 1363, 936);
function visibleCount(buffer, stride, feather = false) {
  let visible = 0;
  const p = new THREE.Vector3();
  for (let i = 0; i < buffer.length; i += stride) {
    p.set(buffer[i], buffer[i + 1], buffer[i + 2]);
    if (p.dot(camera.position) <= p.lengthSq()) continue;
    if (feather && cityFeather(Math.atan2(p.x, p.z) / R, Math.atan2(p.y, Math.hypot(p.x, p.z)) / R) < .1) continue;
    p.project(camera);
    if (Math.abs(p.x) < 1 && Math.abs(p.y) < 1 && p.z < 1) visible++;
  }
  return visible;
}
let checked = 0;
for (const ascending of [false, true]) {
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    const p = flightProgress(t, ascending ? .0018 : 2.15, ascending ? 2.15 : .0018, ascending);
    if (p.altitude < .065) assert.equal(p.turn, ascending ? 0 : 1, 'Camera must stay over Singapore at low altitude');
    const lat = ascending ? 1.2965 + (19 - 1.2965) * p.turn : 19 + (1.2965 - 19) * p.turn;
    const lon = ascending ? 103.851 + (95 - 103.851) * p.turn : 95 + (103.851 - 95) * p.turn;
    camera.position.copy(geo(lon, lat, 1 + p.altitude));
    camera.up.copy(geo(lon, lat + 90));camera.lookAt(geo(lon, lat));camera.updateMatrixWorld();
    const l = lightLevels(p.altitude);
    const visible = (l.global > .03 ? visibleCount(globalStars, 6) : 0)
      + (l.regional > .1 ? visibleCount(regionalLines, 3) : 0)
      + (l.city > .1 ? visibleCount(streets, 6, true) * l.cityFraction : 0);
    assert.ok(visible > 8, `Geography disappeared at ${ascending ? 'return' : 'descent'} frame ${i}: ${visible}`);
    checked++;
  }
}
assert.ok(lightLevels(.009).cityFraction < .06, 'Distant city must stay sparse');
assert.ok(lightLevels(.004).cityFraction < .2, 'Zoomed-out city must reduce detail');
for (const [lon, lat] of [[103.832,1.2835],[103.8592,1.302],[103.8545,1.2868],[103.8515,1.3069]]) assert.ok(cityFeather(lon,lat)>.95, 'Story places must retain their context');
for (const [lon, lat] of [[103.795,1.305],[103.91,1.305],[103.8525,1.265],[103.8525,1.345]]) assert.equal(cityFeather(lon,lat),0, 'Clipped coverage edges must vanish');
assert.deepEqual(revealProgress(0,false), {stars:1,links:1});
assert.ok(revealProgress(.4,true).stars>0 && revealProgress(.4,true).links===0);
assert.equal(revealProgress(3,true).links,1);
console.log(`PASS: ${checked} camera frames retain actual visible geography; city detail budgets, edge feather, authored places, and reveal timing pass.`);
