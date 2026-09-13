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
const stages = [], states = [];let personalArrivals=0;
let rendered = null;
const { CanvasStarRenderer } = await import('../lib/terra/canvas-renderer.ts');
// Pixel review is done separately in the preview browser. Capture the real engine's
// scene and camera here without spending the lifecycle test drawing inert sprites.
CanvasStarRenderer.prototype.render = (scene, camera) => { rendered = { scene, camera }; };

const { createEarth } = await import('../lib/terra/engine.ts');
const engine = await createEarth(host, { querySelector: () => null }, {
  ready: noop, coordinates: noop, interact: noop, arrival: noop,
  stage: s => stages.push(s), transformation: state => states.push(state), personalSettled: () => personalArrivals++, error: message => assert.fail(message),
}, new AbortController().signal);
const options = { glow: 1.15, shimmer: 1.1, depth: true, threads: .55, density: .85, borders: false, motion: false };
const tick = (ms = 60) => { clock += ms; const next = frame; frame = null; assert.ok(next); next(clock); };
const makePlaces = coordinates => coordinates.map(([lat,lon],i) => ({id:String(i),label:'Place '+i,lat,lon,meaning:'Meaning '+i}));
const cases=[
  makePlaces([[1.29,103.85],[51.51,-.13],[35.68,139.65]]),
  makePlaces([[0,179.9],[0,-179.9],[20,178]]),
  makePlaces([[0,0],[0,180],[90,0]]),
  makePlaces([[0,0],[0,120],[0,-120]]),
  makePlaces([[1.29,103.85],[1.30,103.86],[1.31,103.87]]),
];
const result=new THREE.Vector3(),frameBasis=openingFrame(95,19);
assert.ok(Math.abs(frameBasis.determinant()-1)<1e-12,'Opening basis is orthonormal');
for(const places of cases){
  const camera=personalCamera(places);assert.ok(Number.isFinite(camera.lat)&&Number.isFinite(camera.lon),'Global frame is finite, including antipodes and zero-sum triples');
  const earth=personalGeography(places),stars=personalAstra(frameBasis);
  for(let i=0;i<3;i++){
    assert.ok(Math.abs(earth[i].length()-1.085)<1e-10);
    for(let j=i+1;j<3;j++)assert.ok(stars[i].distanceTo(stars[j])>.8,'Open personal stars must remain distinct even with nearby geographic places');
    for(let t=0;t<=1;t+=.05){personalArc(earth[i],earth[(i+1)%3],t,result);assert.ok(result.toArray().every(Number.isFinite),'Antipodal geodesic is finite');}
  }
}
for(let i=0;i<2000;i++){
  const original=new THREE.Vector3(Math.sin(i*2.3),Math.sin(i*3.7),Math.cos(i*.9)).normalize().multiplyScalar(.23+(i%90)/100);
  openingPosition(original.x,original.y,original.z,0,frameBasis,result);assert.deepEqual(result.toArray(),original.toArray(),'Earth endpoint is exactly unchanged');
  for(const progress of [.01,.25,.5,.75,1]){openingPosition(original.x,original.y,original.z,progress,frameBasis,result);assert.ok(result.toArray().every(Number.isFinite)&&result.length()<2.7,'Every particle stays finite and inside the camera envelope');}
  openingPosition(original.x,original.y,original.z,.42,frameBasis,result);const forward=result.toArray();openingPosition(original.x,original.y,original.z,.42,frameBasis,result);assert.deepEqual(result.toArray(),forward,'Reversing reaches exactly the same point');
}
engine.configure(options);tick();
engine.view('oblique');tick();engine.transform(true);assert.equal(states.at(-1).phase,'opening');tick();assert.equal(states.at(-1).phase,'astra');assert.equal(states.at(-1).progress,1);assert.equal(rendered.scene.userData.coreRadius,0,'Opening reveals interior depth');
const clouds=[];rendered.scene.traverse(o=>{if(o instanceof THREE.Points&&o.userData.spatial)clouds.push({object:o,positions:o.geometry.getAttribute('position').array.slice()});});
for(const places of cases){
  engine.personal(places);tick();
  const personal=rendered.scene.children.flatMap(o=>o.children).find(o=>o.userData.personal&&o instanceof THREE.Points);assert.ok(personal);assert.equal(personal.geometry.getAttribute('position').count,3);
  const astra=personal.geometry.getAttribute('astraPosition');
  for(let i=0;i<3;i++){result.fromBufferAttribute(astra,i).project(rendered.camera);assert.ok(Math.abs(result.x)<1&&Math.abs(result.y)<1,'All three Astra stars fit desktop');}
  engine.transform(false);tick();assert.equal(states.at(-1).phase,'terra');assert.equal(personalArrivals,cases.indexOf(places)+1,'Personal settlement fires once');tick();assert.equal(personalArrivals,cases.indexOf(places)+1);
  for(let i=0;i<3;i++){result.fromBufferAttribute(personal.geometry.getAttribute('position'),i);assert.ok(result.distanceTo(personalGeography(places)[i])<1e-6,'Reform returns actual geographic coordinates');}
  engine.transform(true);tick();
}
for(const {object,positions} of clouds)assert.deepEqual(object.geometry.getAttribute('position').array,positions,'Opening never mutates original geographic particle arrays');
engine.configure({...options,motion:true});engine.transform(false);tick(1500);const mid=states.at(-1).progress;assert.ok(mid>0&&mid<1);engine.transform(true);assert.equal(states.at(-1).progress,mid,'Reversal has no progress discontinuity');
engine.view('cutaway');await engine.descend();engine.rotate(300,50);engine.zoom(.1);assert.equal(stages.at(-1),undefined,'Camera actions are serialized during transformation');
for(let i=0;i<35;i++)tick(200);assert.equal(states.at(-1).phase,'astra');
engine.transform(false);engine.configure(options);tick();assert.equal(states.at(-1).phase,'terra','Motion off completes a running transition');
host.clientWidth=390;host.clientHeight=844;resizeCallback();engine.transform(true);tick();
const personal=rendered.scene.children.flatMap(o=>o.children).find(o=>o.userData.personal&&o instanceof THREE.Points);
for(let i=0;i<3;i++){result.fromBufferAttribute(personal.geometry.getAttribute('astraPosition'),i).project(rendered.camera);const y=(-result.y*.5+.5)*844;assert.ok(Math.abs(result.x)<.95&&y>70&&y<550,'Personal stars fit above the phone form area');}
engine.personal(null);engine.transform(false);tick();await engine.descend();tick();assert.equal(stages.at(-1),'city','Singapore journey remains reachable');engine.orbit();tick();assert.equal(stages.at(-1),'orbit');
engine.dispose();assert.equal(frame,null);
assert.equal(transformationEase(0),0);assert.equal(transformationEase(1),1);
console.log('PASS: 2,000 bounded reversible particle paths; exact source positions; global/date-line/antipodal/nearby personal triples; separated Astra stars; desktop/phone projection; serial camera actions; repeat/reverse; reduced-motion endpoints; single personal settlement; Singapore retained. Inert Canvas lifecycle, not pixel evidence.');
