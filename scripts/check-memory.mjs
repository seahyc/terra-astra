// Exercise the real engine lifecycle with a deterministic clock and inert Canvas surface.
// This verifies behavior and geography, not rendered pixels or browser performance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { stories } from '../lib/terra/stories.ts';
import { scintillation } from '../lib/terra/scintillation.ts';
import { memoryLight, cityScreenBudget } from '../lib/terra/choreography.ts';

const root = new URL('../lib/terra/', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(root) && specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(specifier + '.ts', context);
  return next(specifier, context);
} });
let clock = 0, frame = null;
const noop = () => {};
const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, { get: (o, key) => o[key] ?? noop, set: (o, key, value) => { o[key] = value; return true; } });
class Canvas {
  style = {}; width = 1; height = 1;
  getContext(type) { return type === '2d' ? ctx : null; }
  addEventListener() {} removeEventListener() {} setAttribute() {} remove() {}
}
globalThis.document = { hidden: false, createElement: () => new Canvas(), createElementNS: () => new Canvas(), addEventListener: noop, removeEventListener: noop };
globalThis.window = { devicePixelRatio: 1, innerWidth: 1363 };
globalThis.matchMedia = () => ({ matches: false });
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.Path2D = class { moveTo() {} lineTo() {} };
globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
globalThis.cancelAnimationFrame = () => { frame = null; };
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock } });
globalThis.fetch = async path => new Response(await readFile(new URL('../public' + path, import.meta.url)));
const host = { clientWidth: 1363, clientHeight: 936, dataset: {}, appendChild: noop, addEventListener: noop, removeEventListener: noop };
const stages = [], arrivals = [];
const { createEarth } = await import('../lib/terra/engine.ts');
const engine = await createEarth(host, { querySelector: () => null }, {
  ready: noop, coordinates: noop, interact: noop,
  stage: s => stages.push(s), arrival: id => arrivals.push(id), error: message => assert.fail(message),
}, new AbortController().signal);
const options = { glow: 1.15, shimmer: 1.1, threads: .55, density: .85, borders: false, motion: false };
const tick = (ms = 60) => { clock += ms; const next = frame; frame = null; assert.ok(next, 'Engine should schedule a frame'); next(clock); };
engine.configure(options);
await engine.descend();tick();assert.equal(stages.at(-1), 'city');
engine.orbit();tick();assert.equal(arrivals.at(-1), null, 'Unvisited journey must have a neutral ending');

for (const story of stories) {
  await engine.descend();tick();
  engine.select(story.id);tick();
  engine.select(null);tick(); // Closing the panel must not forget the person.
  engine.rotate(80, -30);tick(); // Returning after exploration still recalls that person.
  engine.configure({ ...options, motion: true });
  const before = arrivals.length;
  engine.orbit();
  for (let i = 0; i < 34; i++) tick(200);
  assert.equal(stages.at(-1), 'orbit');
  assert.equal(arrivals.length, before, 'Closing words must wait for settled Earth');
  tick(1200);assert.equal(arrivals.length, before);
  tick(200);assert.equal(arrivals.at(-1), story.id);
  tick(1000);assert.equal(arrivals.length, before + 1, 'Arrival should fire once');
  engine.configure(options);
}
await engine.descend();tick();engine.select('amina');tick();engine.select('mei');tick();engine.orbit();tick();
assert.equal(arrivals.at(-1), 'mei', 'The most recently visited life must win');
await engine.descend();tick();engine.orbit();tick();
assert.equal(arrivals.at(-1), null, 'Starting a new journey must clear memory');
engine.dispose();assert.equal(frame, null, 'Disposal must stop rendering');

// Sparse peaks must remain sparse across the full field, even at maximum shimmer.
let peakFraction = 0;
for (let t = 0; t < 30; t += .25) {
  let bright = 0, total = 0;
  for (let i = 0; i < 1000; i++) {
    const phase = i / 1000 * Math.PI * 2;
    const light = scintillation(t, phase, true, 2);
    assert.ok(light.brightness >= .5 && light.brightness <= 3.2);
    if (light.glint > .8) bright++;
    total += light.brightness;
    assert.deepEqual(scintillation(t, phase, false, 2), { brightness: 1, glint: 0, size: 1 });
  }
  peakFraction = Math.max(peakFraction, bright / 1000);
  assert.ok(total / 1000 < 1.2, 'Shimmer must not turn into whole-field overexposure');
}
assert.ok(peakFraction < .055, 'Bright glints should occupy a small minority of stars');
for (let spread = 0; spread < 500; spread++) {
  const light = memoryLight(spread, null, true);
  assert.ok(light.places + light.glimmer > .99, 'The merge must not lose the remembered light');
}
assert.ok(memoryLight(0, 8, true).glimmer > .3, 'Keep a visible residual light after settling');
assert.deepEqual(memoryLight(0, 8, false), memoryLight(0, 8, true));
assert.ok(cityScreenBudget(390, 844) < cityScreenBudget(1363, 936));
console.log(`PASS: neutral return, all three lives after close/pan, delayed single arrival, switching, fresh journey, reduced motion, disposal, and bounded shimmer (${(peakFraction * 100).toFixed(1)}% peak glints). Canvas is inert; no pixel review claimed.`);
