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
const {genesisPosition,genesisState,genesisLight,GENESIS_DURATION}=await import('../lib/terra/genesis.ts');
const out=new THREE.Vector3(),home=new THREE.Vector3(.8,.5,.4),first=new THREE.Vector3();
for(let id=1;id<=3000;id++){
 genesisPosition(home.x,home.y,home.z,id,id*.37,0,out);assert.ok(out.length()<.36,'Nucleus has no geographic silhouette');
 for(const p of [.1,.25,.344,.40,.52,.7,.869,.9,1]){genesisPosition(home.x,home.y,home.z,id,id*.37,p,out);assert.ok(out.toArray().every(Number.isFinite)&&out.length()<2.5);}
 genesisPosition(home.x,home.y,home.z,id,id*.37,.52,out);assert.ok(out.length()>1.3,'Ejection overshoots Earth in 3D');
 genesisPosition(home.x,home.y,home.z,id,id*.37,.63,out);genesisPosition(home.x,home.y,home.z,id,id*.37,.63,first);assert.deepEqual(out.toArray(),first.toArray(),'Replay deterministic');
 genesisPosition(home.x,home.y,home.z,id,id*.37,1,out);assert.deepEqual(out.toArray(),home.toArray(),'Exact immutable home endpoint');
}
assert.equal(GENESIS_DURATION,10800);assert.equal(genesisState(0).phase,'core');assert.equal(genesisState(1).busy,false);assert.ok(genesisLight(.344).flash>.99);assert.equal(genesisLight(1).exposure,1);
assert.equal(engine.worldState().genesis.phase,'core');tick();
const clouds=[];rendered.scene.traverse(o=>{if(o instanceof THREE.Points&&o.userData.spatial)clouds.push({object:o,positions:o.geometry.getAttribute('position').array.slice()});});
assert.equal(rendered.scene.userData.coreRadius,0,'Opaque globe suppressed through genesis');
const initialIds=new Set();for(const c of clouds){const ids=c.object.geometry.getAttribute('particleId');for(let i=0;i<ids.count;i++){assert.ok(!initialIds.has(ids.getX(i)));initialIds.add(ids.getX(i));}}
assert.ok(initialIds.size>300000,'Existing geographic clouds participate with unique stable IDs');
host.clientWidth=390;host.clientHeight=844;resizeCallback();
for(let i=0;i<54;i++)tick(200);
assert.equal(engine.worldState().genesis.phase,'complete');assert.equal(engine.worldState().busy,false);assert.ok(rendered.scene.userData.coreRadius>0);
for(const {object,positions} of clouds)assert.deepEqual(object.geometry.getAttribute('position').array,positions);
engine.replayGenesis();assert.equal(engine.worldState().genesis.phase,'core');tick(3500);assert.ok(engine.worldState().genesis.progress>0&&engine.worldState().genesis.progress<1);
let commandDone=false;const pending=engine.command({type:'resetView'}).then(result=>{assert.equal(result.ok,true);commandDone=true;});await Promise.resolve();assert.equal(commandDone,false,'Busy command queued');
engine.skipGenesis();tick();await Promise.resolve();await Promise.resolve();await Promise.resolve();for(let i=0;i<40;i++){tick(200);await Promise.resolve();}await pending;assert.equal(commandDone,true);
engine.configure({glow:1.15,shimmer:1.1,depth:true,threads:.55,density:.85,borders:false,motion:false});engine.replayGenesis();assert.equal(engine.worldState().genesis.progress,1,'Reduced motion replay directly restores Earth');tick();
await engine.descend();tick();assert.equal(stages.at(-1),'city','Singapore retained');engine.orbit();tick();assert.equal(stages.at(-1),'orbit');
engine.configure({glow:1.15,shimmer:1.1,depth:true,threads:.55,density:.85,borders:false,motion:true});engine.replayGenesis();const disposedCommand=engine.command({type:'resetView'});await Promise.resolve();engine.dispose();assert.equal((await disposedCommand).ok,false,'Dispose settles pending command');assert.equal(frame,null);
console.log('PASS: 3,000 deterministic nucleus/ejection/capture paths; 300k+ unique stable IDs; exact geographic endpoints and unchanged arrays; auto genesis, resize, replay, skip, reduced motion, queued command/disposal and Singapore lifecycle. Inert Canvas, not pixel evidence.');
