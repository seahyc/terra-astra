// Verify actual relief assets and their geographic registration, independently of pixels.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sampleElevation, reliefRadius, spatialBlend } from '../lib/terra/spatial.ts';

const path = name => new URL('../public/data/' + name, import.meta.url);
const manifest = JSON.parse(readFileSync(path('relief-manifest.json'), 'utf8'));
const { width, height } = manifest.grid;
const raw = readFileSync(path('relief-grid.bin'));
assert.equal(raw.byteLength, width * height * 2);
const grid = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
assert.ok(Math.min(...Array.from(grid).filter((_, i) => i % 20 === 0)) < -8000);
assert.ok(sampleElevation(grid, width, height, -68, -20) > 3000, 'Andes must rise above sea level');
assert.ok(sampleElevation(grid, width, height, 112, -11) < -4000, 'Java Trench region must lie below sea level');
assert.equal(sampleElevation(grid, width, height, -180, 0), sampleElevation(grid, width, height, 180, 0), 'Longitude seam must wrap');
assert.equal(spatialBlend(.0018, true), 0, 'Do not displace Singapore street detail');
assert.equal(spatialBlend(.62, true), 1);
assert.equal(spatialBlend(2.15, false), 0);
let total = 0;
for (const [name, layer] of Object.entries(manifest.layers)) {
  const buffer = readFileSync(path(name + '.bin'));
  assert.equal(buffer.byteLength, layer.bytes);
  const values = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
  assert.equal(values.length, layer.count * 6);
  let lo = Infinity, hi = 0, mismatches = 0;
  for (let i = 0; i < values.length; i += 6) {
    const [x, y, z, brightness, size, phase] = values.subarray(i, i + 6);
    assert.ok([x, y, z, brightness, size, phase].every(Number.isFinite), name + ' must be finite');
    const radius = Math.hypot(x, y, z);lo = Math.min(lo, radius);hi = Math.max(hi, radius);
    assert.ok(brightness > 0 && size > 0 && phase >= 0 && phase <= Math.PI * 2);
    if (name.startsWith('relief-')) {
      const lon = Math.atan2(x, z) * 180 / Math.PI, lat = Math.atan2(y, Math.hypot(x, z)) * 180 / Math.PI;
      // Binary stars use a finer source grid than the client light-lifting grid.
      if (Math.abs(radius - reliefRadius(sampleElevation(grid, width, height, lon, lat))) > .007) mismatches++;
    }
  }
  assert.ok(lo > .20 && hi < 1.14, name + ' must stay within the intended body');
  if (name === 'relief-land') assert.ok(lo >= .9999 && hi > 1.04);
  if (name === 'relief-ocean') assert.ok(lo < .94 && hi <= 1.00001);
  if (name === 'stellar-body') assert.ok(hi - lo > .25, 'Body must have real radial thickness');
  if (name === 'stellar-interior') assert.ok(lo < .30 && hi > .75);
  assert.ok(mismatches / layer.count < .015, name + ' must remain registered to source relief');
  total += layer.count;
}
console.log(`PASS: ${total.toLocaleString()} spatial particles, source registration, land/seafloor relief, radial depth, longitude wrap and city transition.`);
