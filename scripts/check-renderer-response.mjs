// Exercise the real engine lifecycle with a deterministic clock and inert Canvas surface.
// This verifies behavior and geography, not rendered pixels or browser performance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import * as THREE from 'three';
import { openingFrame, openingPosition, transformationEase } from '../lib/terra/transformation.ts';
import { personalGeography, personalCamera, personalAstra, personalArc } from '../lib/terra/personal-rendering.ts';
import { scintillation } from '../lib/terra/scintillation.ts';
import { memoryLight, cityScreenBudget } from '../lib/terra/choreography.ts';

const root = new URL('../lib/', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(root) && specifier.startsWith('.') && ! /\.(?:ts|mjs|js|json)$/.test(specifier)) return next(specifier + '.ts', context);
  return next(specifier, context);
} });
let clock = 0, frame = null, resizeCallback = null;
const noop = () => {};
const ctx = new Proxy({ createRadialGradient: () => ({ addColorStop: noop }) }, { get: (o, key) => o[key] ?? noop, set: (o, key, value) => { o[key] = value; return true; } });
let graphicsLostCallback=null;
class Canvas {
  style = {}; width = 1; height = 1;
  getContext(type) { return type === '2d' ? ctx : null; }
  addEventListener(type,callback) {if(type==='webglcontextlost')graphicsLostCallback=callback;} removeEventListener() {} setAttribute() {} remove() {}
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
const stages = [], states = [], genesisStates=[], worldStates=[], views=[];let personalArrivals=0;
let rendered = null;
const { CanvasStarRenderer } = await import('../lib/terra/canvas-renderer.ts');
// Pixel review is done separately in the preview browser. Capture the real engine's
// scene and camera here without spending the lifecycle test drawing inert sprites.
CanvasStarRenderer.prototype.render = (scene, camera) => { rendered = { scene, camera }; };

const { createEarth } = await import('../lib/terra/engine.ts');
const engine = await createEarth(host, { querySelector: () => null }, {
  view:v=>views.push(v),genesis:s=>genesisStates.push(s),worldState:s=>worldStates.push(s),ready: noop, coordinates: noop, interact: noop, arrival: noop,
  stage: s => stages.push(s), transformation: state => states.push(state), personalSettled: () => personalArrivals++, error: message => {if(!message.includes('Graphics became unavailable'))assert.fail(message);},
}, new AbortController().signal);

const tick=(ms=60)=>{clock+=ms;const next=frame;frame=null;assert.ok(next);next(clock);};


engine.skipGenesis();const opts={glow:1.15,shimmer:1.1,depth:true,threads:.55,density:.85,borders:false,motion:true};engine.configure(opts);tick();
const realFetch=globalThis.fetch;let releaseCold;const coldGate=new Promise(resolve=>{releaseCold=resolve;});let cityFetches=0;
globalThis.fetch=async path=>{if(path.includes('new-york')){cityFetches++;await coldGate;}return realFetch(path);};
const cold=engine.command({type:'flyTo',targetId:'new-york'});for(let i=0;i<8;i++)await Promise.resolve();
assert.equal(stages.at(-1),'descending','Camera starts before cold assets resolve');assert.equal(host.dataset.detailNewYorkStatus,'fetching');assert.ok(Number(host.dataset.worldCommandCameraStartedAt)-Number(host.dataset.worldCommandQueuedAt)<20,'Cold command-to-camera latency independent of network');
const initial=rendered.camera.position.clone();tick(1000);assert.ok(rendered.camera.position.distanceTo(initial)>.01,'Actual camera moves while detail fetch is held');releaseCold();
async function finish(promise){let done=false,result;promise.then(v=>{done=true;result=v;});for(let i=0;i<150&&!done;i++){await new Promise(resolve=>setImmediate(resolve));tick(100);}assert.ok(done);return result;}
assert.equal((await finish(cold)).ok,true);assert.equal(host.dataset.detailNewYorkStatus,'ready');assert.ok(Number.isFinite(Number(host.dataset.detailNewYorkFetchMs)));assert.ok(Number.isFinite(Number(host.dataset.detailNewYorkPrepareMs)));assert.equal(host.dataset.worldCommandTransitionMs,'6800');assert.ok(Number(host.dataset.worldCommandSettledAt)>=Number(host.dataset.worldCommandCameraStartedAt)+6800,'Public command settles after the real camera flight');
const fetches=cityFetches,start=clock;assert.equal((await finish(engine.command({type:'setScale',tier:'street'}))).ok,true);assert.equal(cityFetches,fetches,'Warm scale reuses prepared city geometry');assert.equal(host.dataset.worldCommandTransitionMs,'1100');assert.ok(clock-start<1600,'Warm scale latency bounded below previous6.8seconds');
const stale=engine.command({type:'setScale',tier:'region'}),latest=engine.command({type:'setScale',tier:'planet'});const old=await finish(stale);assert.equal(old.ok,true,'First queued command retains FIFO settlement semantics');assert.equal((await finish(latest)).ok,true);assert.equal(engine.worldState().tier,'planet');
engine.dispose();assert.equal(frame,null);console.log('PASS responsiveness: camera starts before blocked cold fetch; actual movement during load; observable fetch/prep/queue/start/settled timings; public settlement after flight;1100ms warm scale; cached geometry; FIFO queue settlement preserved. Inert Canvas, not native FPS.');
