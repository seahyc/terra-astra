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
let clock = 0, frame = null, resizeCallback = null;
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
globalThis.ResizeObserver = class { constructor(callback) { resizeCallback = callback; } observe() {} disconnect() {} };
globalThis.Path2D = class { moveTo() {} lineTo() {} };
globalThis.requestAnimationFrame = callback => { frame = callback; return 1; };
globalThis.cancelAnimationFrame = () => { frame = null; };
Object.defineProperty(globalThis, 'performance', { value: { now: () => clock } });
globalThis.fetch = async path => new Response(await readFile(new URL('../public' + path, import.meta.url)));
const host = { clientWidth: 1363, clientHeight: 936, dataset: {}, appendChild: noop, addEventListener: noop, removeEventListener: noop };
const stages = [], arrivals = [], views = [];
let rendered = null;
const { CanvasStarRenderer } = await import('../lib/terra/canvas-renderer.ts');
// Pixel review is done separately in the preview browser. Capture the real engine's
// scene and camera here without spending the lifecycle test drawing inert sprites.
CanvasStarRenderer.prototype.render = (scene, camera) => { rendered = { scene, camera }; };
const { createEarth } = await import('../lib/terra/engine.ts');
const engine = await createEarth(host, { querySelector: () => null }, {
  ready: noop, coordinates: noop, interact: noop,
  stage: s => stages.push(s), arrival: id => arrivals.push(id), view: mode => views.push(mode), error: message => assert.fail(message),
}, new AbortController().signal);
const options = { glow: 1.15, shimmer: 1.1, depth: true, threads: .55, density: .85, borders: false, motion: false };
const tick = (ms = 60) => { clock += ms; const next = frame; frame = null; assert.ok(next, 'Engine should schedule a frame'); next(clock); };
engine.configure(options);
for (const region of ['indonesia', 'andes']) {
  engine.region(region);
  for (const view of ['globe', 'oblique', 'cutaway']) {
    engine.view(view);tick();
    assert.equal(views.at(-1), view);
    assert.equal(rendered.scene.userData.spatial.depth, 1);
    assert.equal(rendered.scene.userData.coreRadius, view === 'cutaway' ? 0 : .7);
    const pose = rendered.camera.matrixWorld.toArray();
    engine.configure({ ...options, depth: false });tick();
    assert.equal(rendered.scene.userData.spatial.depth, 0);
    assert.equal(rendered.scene.userData.spatial.cut, 0);
    assert.equal(rendered.scene.userData.coreRadius, 1);
    assert.deepEqual(rendered.camera.matrixWorld.toArray(), pose, 'Reference comparison must keep the camera fixed');
    engine.configure(options);tick();
    if (view === 'oblique') {
      const before = rendered.camera.position.length();
      engine.zoom(.8);tick();
      assert.ok(rendered.camera.position.length() < before, 'Horizon zoom-in must approach instead of jumping out');
      for (let i = 0; i < 10; i++) { engine.zoom(.5);tick(); }
      assert.ok(rendered.camera.position.length() > 1.10, 'The close camera must stay outside exaggerated mountains');
    }
  }
}
engine.view('oblique');tick();
await engine.descend();tick();assert.equal(stages.at(-1), 'city');
assert.equal(views.at(-1), 'globe', 'Descent must reset the study camera');
assert.equal(rendered.scene.userData.spatial.depth, 0, 'Spatial matter must fade out before street detail');
assert.equal(rendered.scene.userData.spatial.cut, 0, 'Cutaway must not remain in the city');
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
// A new story must retain phone fitting even when its panel has the same height.
host.clientWidth = 390; host.clientHeight = 844;
resizeCallback();tick();
const phoneAltitude = rendered.camera.position.length() - 1;
assert.ok(phoneAltitude > 5, 'Resizing home to a phone must refit the entire globe');
host.clientWidth = 1363; host.clientHeight = 936;resizeCallback();tick();
assert.ok(rendered.camera.position.length() - 1 < phoneAltitude, 'Returning to desktop must restore home framing');
host.clientWidth = 390;host.clientHeight = 844;resizeCallback();tick();
await engine.descend();tick();
engine.select('amina');engine.storyInset(450);tick();
engine.select('daniel');tick();
for (const place of stories.find(s => s.id === 'daniel').places) {
  const { geo } = await import('../lib/terra/engine.ts');
  const point = geo(place.lon, place.lat, 1.00003).project(rendered.camera);
  const y = (-point.y * .5 + .5) * host.clientHeight;
  assert.ok(y > 75 && y < host.clientHeight - 450, 'Switching lives must keep every light above the unchanged phone panel');
}
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
console.log(`PASS: three spatial views across both regions, fixed-camera reference, safe horizon zoom, city reset, neutral return, all three lives after close/pan, delayed single arrival, switching, fresh journey, reduced motion, disposal, and bounded shimmer (${(peakFraction * 100).toFixed(1)}% peak glints). Canvas is inert; no pixel review claimed.`);
