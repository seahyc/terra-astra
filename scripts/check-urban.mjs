// Node >= 22.13; exercises real prepared road geometry and the shipped generator.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createUrbanActivity, URBAN_RADIUS } from '../lib/world/urban-activity.ts';

const metres = 6_371_000;
function binary(name) {
  const buffer = readFileSync(new URL(`../public/data/${name}.bin`, import.meta.url));
  return new Float32Array(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
}
function unit(x, y, z) { const radius = Math.hypot(x, y, z); return [x / radius, y / radius, z / radius]; }
const checksum = values => createHash('sha256').update(Buffer.from(values.buffer, values.byteOffset, values.byteLength)).digest('hex');

for (const city of ['singapore', 'new-york']) {
  const streets = binary(`${city}-streets`), original = checksum(streets);
  const activity = createUrbanActivity(streets);
  assert.equal(activity.trafficCount, 600); assert.equal(activity.activityCount, 500);
  assert.ok(activity.validSegmentCount > 1000);
  const traffic = new Float32Array(activity.trafficCount * 3), people = new Float32Array(activity.activityCount * 3);
  const firstTraffic = new Float32Array(traffic.length), firstPeople = new Float32Array(people.length);
  activity.sample(123.456, firstTraffic, firstPeople);
  let largestRoadError = 0, largestWander = 0;
  for (const time of [-3600, -1, 0, .001, 1, 2, 10, 123.456, 3600, 1e6, Infinity, NaN]) {
    activity.sample(time, traffic, people);
    assert.ok([...traffic, ...people].every(Number.isFinite));
    for (let i = 0; i < activity.trafficCount; i++) {
      const o = i * 3, s = i * 6, endpoints = activity.trafficSegments;
      assert.ok(Math.abs(Math.hypot(...traffic.slice(o, o + 3)) - URBAN_RADIUS) < 1e-7);
      const p = unit(traffic[o], traffic[o + 1], traffic[o + 2]);
      const a = unit(endpoints[s], endpoints[s + 1], endpoints[s + 2]), b = unit(endpoints[s + 3], endpoints[s + 4], endpoints[s + 5]);
      const delta = b.map((value, index) => value - a[index]);
      const t = Math.max(0, Math.min(1, p.reduce((sum, value, index) => sum + (value - a[index]) * delta[index], 0) / delta.reduce((sum, value) => sum + value * value, 0)));
      const onRoad = unit(...a.map((value, index) => value + delta[index] * t));
      const error = Math.hypot(...p.map((value, index) => value - onRoad[index])) * metres;
      largestRoadError = Math.max(largestRoadError, error);
      assert.ok(error < .9, `${city} traffic left road by ${error}m (Float32 tolerance .9m)`);
      assert.ok(activity.trafficOpacity[i] >= 0 && activity.trafficOpacity[i] <= 1);
    }
    for (let i = 0; i < activity.activityCount; i++) {
      const o = i * 3;
      assert.ok(Math.abs(Math.hypot(...people.slice(o, o + 3)) - URBAN_RADIUS) < 1e-7);
      const p = unit(people[o], people[o + 1], people[o + 2]);
      const a = unit(...activity.activityAnchors.slice(o, o + 3));
      const wander = Math.hypot(...p.map((value, index) => value - a[index])) * metres;
      largestWander = Math.max(largestWander, wander);
      assert.ok(wander < 11.5, `${city} activity exceeded its small junction neighborhood`);
    }
  }
  activity.update(123.456, traffic, people);
  assert.deepEqual(traffic, firstTraffic); assert.deepEqual(people, firstPeople);
  const second = createUrbanActivity(streets);
  second.sample(123.456, traffic, people);
  assert.deepEqual(traffic, firstTraffic); assert.deepEqual(people, firstPeople);
  const changedSeed = createUrbanActivity(streets, { seed: 8 });
  changedSeed.sample(123.456, traffic, people); assert.notDeepEqual(traffic, firstTraffic);
  assert.equal(checksum(streets), original, 'Immutable source roads must not be mutated.');
  assert.throws(() => activity.sample(0, new Float32Array(1), people), RangeError);
  activity.sample(0, traffic, people);
  const start = performance.now();
  for (let frame = 0; frame < 1000; frame++) activity.sample(frame / 60, traffic, people);
  const elapsed = performance.now() - start;
  console.log(`PASS ${city}: ${activity.validSegmentCount} valid roads, 600 traffic + 500 activity, max road error ${largestRoadError.toFixed(3)}m, max wander ${largestWander.toFixed(2)}m; 1000 updates ${elapsed.toFixed(1)}ms (Node only).`);
}

const invalid = new Float32Array([0,0,0,0,0,0, NaN,0,0,1,0,0, 1,0,0,-1,0,0, 1,0,0,1,0,0]);
const empty = createUrbanActivity(invalid);
assert.equal(empty.trafficCount, 0); assert.equal(empty.activityCount, 0);
empty.sample(0, new Float32Array(), new Float32Array());
const bounded = createUrbanActivity(binary('new-york-streets'), { trafficCount: 999999, activityCount: -1 });
assert.equal(bounded.trafficCount, 2000); assert.equal(bounded.activityCount, 0);
const manifest = JSON.parse(readFileSync(new URL('../public/data/new-york-manifest.json', import.meta.url)));
for (const [name, layer] of Object.entries(manifest.layers)) {
  const data = binary(name);
  assert.equal(data.byteLength, layer.bytes); assert.equal(data.length / layer.stride, layer.count);
  assert.equal(checksum(data), layer.sha256);
  for (let i = 0; i < data.length; i += layer.stride) {
    const lon = Math.atan2(data[i], data[i + 2]) * 180 / Math.PI;
    const lat = Math.atan2(data[i + 1], Math.hypot(data[i], data[i + 2])) * 180 / Math.PI;
    assert.ok(lon >= manifest.bounds.west - 1e-5 && lon <= manifest.bounds.east + 1e-5);
    assert.ok(lat >= manifest.bounds.south - 1e-5 && lat <= manifest.bounds.north + 1e-5);
  }
}
console.log('PASS malformed geometry, count limits, finite-time recovery, deterministic repeatability, source immutability, NYC geographic bounds and manifest SHA256.');
