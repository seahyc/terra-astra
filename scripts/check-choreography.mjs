// Regression checks for the empty return, saturated city approach, and clipped map edges.
// Run with Node 24+: node scripts/check-choreography.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { cityFeather, flightProgress, lightLevels, revealProgress, memoryLight, recallFocus } from '../lib/terra/choreography.ts';
import { stories } from '../lib/terra/stories.ts';

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

let memoryFrames = 0;
for (const [w, h] of [[1363, 936], [390, 844]]) {
  const cam = new THREE.PerspectiveCamera(42, w / h, .0000004, 65);
  cam.setViewOffset(w, h, w < 700 ? 0 : -w * .17, w < 700 ? -h * .035 : 0, w, h);
  const radius = Math.min(w * .44, h * .38);
  const home = Math.max(2.15, Math.sqrt(1 + (h / (2 * Math.tan(21 * R) * radius)) ** 2) - 1);
  for (const story of stories) {
    const anchorLon = story.places.reduce((n, p) => n + p.lon, 0) / 3;
    const anchorLat = story.places.reduce((n, p) => n + p.lat, 0) / 3;
    let lastGlimmer = 0;
    for (let i = 0; i <= 240; i++) {
      const t = i / 240, p = flightProgress(t, .0019, home, true, w / h);
      // Begin after an extreme legal city pan; the return first recalls the life.
      const fromLat = THREE.MathUtils.lerp(1.272, anchorLat, recallFocus(t));
      const fromLon = THREE.MathUtils.lerp(103.890, anchorLon, recallFocus(t));
      const lat = THREE.MathUtils.lerp(fromLat, 19, p.turn), lon = THREE.MathUtils.lerp(fromLon, 95, p.turn);
      cam.position.copy(geo(lon, lat, 1 + p.altitude));cam.up.copy(geo(lon, lat + 90));cam.lookAt(geo(lon, lat));cam.updateMatrixWorld();
      const points = story.places.map(place => geo(place.lon, place.lat, 1.00003).project(cam));
      let spread = 0;
      for (let j = 0; j < 3; j++) for (let k = j + 1; k < 3; k++) spread = Math.max(spread, Math.hypot((points[j].x-points[k].x)*w/2, (points[j].y-points[k].y)*h/2));
      const light = memoryLight(spread, null, true);
      if (t > .12) {
        const anchor = geo(anchorLon, anchorLat, 1.00004).project(cam);
        assert.ok(Math.abs(anchor.x) < 1 && Math.abs(anchor.y) < 1 && anchor.z < 1, `${story.id} leaves the ${w}px return view at t=${t.toFixed(3)}, altitude=${p.altitude.toFixed(3)}, x=${anchor.x.toFixed(3)}, y=${anchor.y.toFixed(3)}`);
        assert.ok(light.glimmer + .002 >= lastGlimmer, 'The merged light should not reverse or flicker during ascent');
      }
      lastGlimmer = light.glimmer;memoryFrames++;
    }
    assert.ok(lastGlimmer > .99, 'All places must become one light by orbit');
  }
}
console.log(`PASS: ${memoryFrames} projected return frames keep all three remembered lives in view after recall on desktop and phone-sized cameras.`);
