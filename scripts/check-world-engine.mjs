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
const stages = [], states = [], genesisStates=[], worldStates=[];let personalArrivals=0;
let rendered = null;
const { CanvasStarRenderer } = await import('../lib/terra/canvas-renderer.ts');
// Pixel review is done separately in the preview browser. Capture the real engine's
// scene and camera here without spending the lifecycle test drawing inert sprites.
CanvasStarRenderer.prototype.render = (scene, camera) => { rendered = { scene, camera }; };

const { createEarth } = await import('../lib/terra/engine.ts');
const engine = await createEarth(host, { querySelector: () => null }, {
  genesis:s=>genesisStates.push(s),worldState:s=>worldStates.push(s),ready: noop, coordinates: noop, interact: noop, arrival: noop,
  stage: s => stages.push(s), transformation: state => states.push(state), personalSettled: () => personalArrivals++, error: message => assert.fail(message),
}, new AbortController().signal);

const tick=(ms=60)=>{clock+=ms;const next=frame;frame=null;assert.ok(next);next(clock);};

engine.skipGenesis();
const baseOptions={glow:1.15,shimmer:1.1,depth:true,threads:.55,density:.85,borders:false,motion:false};engine.configure(baseOptions);tick();
const objects=()=>{const result=[];rendered.scene.traverse(o=>{if(o instanceof THREE.Points)result.push(o);});return result;};
const shells=()=>objects().filter(o=>o.userData.shell&&o.userData.shell!=='ships');
assert.equal(shells().length,2,'One orbital and one atmosphere shell');
const radii=shells().map(o=>{const a=o.geometry.getAttribute('position');return [o.userData.shell,...Array.from({length:a.count},(_,i)=>Math.hypot(a.getX(i),a.getY(i),a.getZ(i)))];});
for(const [layer,...values] of radii)assert.ok(values.every(r=>layer==='satellites'?r>=1.19&&r<=1.39:r>=1.024&&r<=1.061),'Distinct physical shell radii');
const paused=shells().map(o=>o.geometry.getAttribute('position').array.slice());engine.rotate(20,4);tick(1000);for(let i=0;i<2;i++)assert.deepEqual(shells()[i].geometry.getAttribute('position').array,paused[i],'Pause holds actual shell positions during camera interaction');
engine.configure({...baseOptions,motion:true});tick(1000);assert.notDeepEqual(shells()[0].geometry.getAttribute('position').array,paused[0]);engine.configure(baseOptions);tick();
async function complete(cmd){let done=false,result;const pending=engine.command(cmd).then(v=>{done=true;result=v;});for(let i=0;i<150&&!done;i++){await new Promise(resolve=>setImmediate(resolve));tick(100);}assert.ok(done,'Command resolves within bounded lifecycle');await pending;return result;}
assert.equal((await complete({type:'focusLayer',layer:'satellites',enabled:false})).ok,true);tick();assert.equal(shells().find(o=>o.userData.shell==='satellites').visible,false);
assert.equal((await complete({type:'focusLayer',layer:'satellites',enabled:true})).ok,true);tick();assert.equal(shells().find(o=>o.userData.shell==='satellites').visible,true);
assert.equal((await complete({type:'flyTo',targetId:'new-york'})).ok,true);assert.equal(engine.worldState().targetId,'new-york');assert.equal(engine.worldState().tier,'city');assert.equal(stages.at(-1),'city');
assert.ok(Math.abs(Math.atan2(rendered.camera.position.y,Math.hypot(rendered.camera.position.x,rendered.camera.position.z))*180/Math.PI-40.721562)<.01,'New York camera reaches true target');
assert.equal(shells().every(o=>!o.visible),true,'Global shells fade by city scale');
const ny=objects().filter(o=>o.userData.urban==='new-york');assert.equal(ny.length,2);assert.ok(ny.every(o=>o.visible),'Traffic and soft activity visible');
for(const cloud of ny){const a=cloud.geometry.getAttribute('position');for(let i=0;i<a.count;i++)assert.ok(Math.abs(Math.hypot(a.getX(i),a.getY(i),a.getZ(i))-1.00003)<1e-6);}
const nyBefore=ny.map(o=>o.geometry.getAttribute('position').array.slice());engine.rotate(15,0);tick(500);for(let i=0;i<2;i++)assert.deepEqual(ny[i].geometry.getAttribute('position').array,nyBefore[i]);
await complete({type:'setScale',tier:'street'});assert.equal(engine.worldState().tier,'street');
await complete({type:'focusLayer',layer:'urban',enabled:false});tick();assert.ok(ny.every(o=>!o.visible));await complete({type:'focusLayer',layer:'urban',enabled:true});tick();assert.ok(ny.every(o=>o.visible));
await complete({type:'flyTo',targetId:'singapore'});assert.equal(engine.worldState().targetId,'singapore');assert.equal(stages.at(-1),'city');assert.ok(ny.every(o=>!o.visible));assert.ok(objects().filter(o=>o.userData.urban==='singapore').every(o=>o.visible));
engine.select('amina');tick();engine.orbit();tick();assert.equal(stages.at(-1),'orbit');
await complete({type:'flyTo',targetId:'challenger-deep'});assert.equal(engine.worldState().tier,'region');assert.equal(engine.worldState().targetId,'challenger-deep');assert.ok(rendered.camera.position.length()>1.19);
await complete({type:'resetView'});assert.equal(engine.worldState().targetId,null);assert.equal(engine.worldState().tier,'planet');
assert.equal((await complete({type:'flyTo',targetId:'missing'})).ok,false);
engine.dispose();assert.equal(frame,null);
console.log('PASS: distinct orbital/aircraft shells with trails; real pause of positions; layer toggles; serialized target/scale commands; sourced NYC detail and activity; SG return; Mariana region; reset; invalid command. Inert Canvas lifecycle, not pixel/performance evidence.');
