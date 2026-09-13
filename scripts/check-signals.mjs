// Node >=22.13: deterministic geometry checks against real prepared geography.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.includes('/lib/') && specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(specifier + '.ts', context);
  return next(specifier, context);
} });
const { worldSignals, satelliteSignals, aircraftSignals, shipSignals, sampleSignal } = await import('../lib/world/signals.ts');
const { placeCatalogue } = await import('../lib/personal/catalogue.ts');
const { sampleElevation } = await import('../lib/terra/spatial.ts');
const gridBuffer = readFileSync(new URL('../public/data/relief-grid.bin', import.meta.url));
const grid = new Int16Array(gridBuffer.buffer, gridBuffer.byteOffset, gridBuffer.byteLength / 2);
const a = new Float64Array(3), b = new Float64Array(3), c = new Float64Array(3);
const distance = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
const snapshot = JSON.stringify(worldSignals);
assert.equal(satelliteSignals.length, 72); assert.equal(aircraftSignals.length, 120); assert.equal(shipSignals.length, 24);
assert.equal(new Set(worldSignals.map(s => s.id)).size, worldSignals.length);
assert.equal(new Set(aircraftSignals.map(s => s.id.replace(/-light-\d+$/, ''))).size, 40);
assert.equal(new Set(shipSignals.map(s => s.id.replace(/-light-\d+$/, ''))).size, 12);
for (const signals of [aircraftSignals, shipSignals]) {
  for (const original of signals.filter(s => !/-light-\d+$/.test(s.id))) {
    const copies = signals.filter(s => s.id === original.id || s.id.startsWith(original.id + '-light-'));
    assert.equal(copies.length, original.layer === 'aircraft' ? 3 : 2);
    assert.equal(new Set(copies.map(s => s.phase)).size, copies.length, 'Corridor lights have distinct phases.');
    assert.ok(copies.every(s => s.basisA === original.basisA && s.basisB === original.basisB), 'Copies reuse fixed corridor geometry.');
  }
}
assert.ok(aircraftSignals.some(s => s.id === 'flight-ne-1159151627-ne-1159151609'), 'The original Singapore/Tokyo identity remains available.');
let samples = 0;
for (const signal of worldSignals) {
  assert.ok(Object.isFrozen(signal) && Object.isFrozen(signal.basisA) && Object.isFrozen(signal.basisB));
  assert.equal(signal.provenance, 'procedural');
  assert.ok(signal.phase >= 0 && signal.phase < 1);
  assert.ok(signal.trailSeconds > 0 && signal.trailSeconds < signal.periodSeconds / 3);
  const bounds = signal.layer === 'satellites' ? [1.20, 1.38] : signal.layer === 'aircraft' ? [1.025, 1.06] : [1.002, 1.002];
  assert.ok(signal.radius >= bounds[0] - 1e-12 && signal.radius <= bounds[1] + 1e-12);
  assert.ok(Math.abs(Math.hypot(...signal.basisA) - 1) < 1e-12);
  assert.ok(Math.abs(Math.hypot(...signal.basisB) - 1) < 1e-12);
  assert.ok(Math.abs(signal.basisA.reduce((sum, value, i) => sum + value * signal.basisB[i], 0)) < 1e-12);
  for (let i = -200; i <= 800; i++) {
    const time = signal.periodSeconds * i / 400;
    sampleSignal(signal, time, a); sampleSignal(signal, time, b);
    assert.deepEqual(a, b, 'Same time and identity are exact repeatable samples.');
    assert.ok([...a].every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...a) - signal.radius) < 1e-12, signal.id);
    sampleSignal(signal, time + signal.periodSeconds, b);
    assert.ok(distance(a, b) < 1e-12, 'Loop boundary has no jump.');
    sampleSignal(signal, time + .001, b);
    assert.ok(distance(a, b) < .00021, 'Bounded speed, including route turnaround.');
    sampleSignal(signal, time, b, signal.trailSeconds);
    sampleSignal(signal, time - signal.trailSeconds, c);
    assert.ok(distance(b, c) < 1e-12, 'Trail is a true sample of the same history.');
    if (signal.layer === 'ships') {
      const lat = Math.asin(a[1] / signal.radius) * 180 / Math.PI;
      const lon = Math.atan2(a[0], a[2]) * 180 / Math.PI;
      assert.ok(sampleElevation(grid, 1440, 720, lon, lat) < 0, `${signal.id} route must stay over water in the bundled ETOPO grid.`);
    }
    samples++;
  }
  // The same small caller-owned output is reused by all heads and trails.
  sampleSignal(signal, NaN, a, Infinity); sampleSignal(signal, 0, b);
  assert.deepEqual(a, b);
  if (signal.layer === 'aircraft') {
    for (const [id, timeOffset] of [[signal.fromId, 0], [signal.toId, signal.periodSeconds / 2]]) {
      const place = placeCatalogue.find(place => place.id === id);
      assert.ok(place && place.source === 'natural-earth');
      sampleSignal(signal, -signal.phase * signal.periodSeconds + timeOffset, a);
      const lat = place.lat * Math.PI / 180, lon = place.lon * Math.PI / 180;
      b.set([Math.cos(lat) * Math.sin(lon) * signal.radius, Math.sin(lat) * signal.radius, Math.cos(lat) * Math.cos(lon) * signal.radius]);
      assert.ok(distance(a, b) < 1e-12, 'Each aircraft route reaches its actual catalogue anchors.');
    }
    assert.ok(signal.arcRadians * Math.PI / signal.periodSeconds > .055, 'Aircraft visibly faster than orbital points near route midpoint.');
  }
}
assert.equal(JSON.stringify(worldSignals), snapshot, 'Samples never mutate immutable identities or geometry.');
assert.ok(satelliteSignals.every(signal => Math.PI * 2 / signal.periodSeconds < .038));
console.log(`PASS: ${samples} finite, bounded, continuous, repeatable samples; 72 orbital lights; 120 aircraft on 40 sourced corridors; 24 ships on 12 ETOPO-water-checked corridors; exact lagged trails and immutable records.`);
