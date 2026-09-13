// Exercise the real engine lifecycle with a deterministic clock and inert Canvas surface.
// This verifies behavior and geography, not rendered pixels or browser performance.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import * as THREE from 'three';

const root = new URL('../lib/', import.meta.url).href;
registerHooks({ resolve(specifier, context, next) {
  if (context.parentURL?.startsWith(root) && specifier.startsWith('.') && !specifier.endsWith('.ts')) return next(specifier + '.ts', context);
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

engine.skipGenesis();
const baseOptions={glow:1.15,shimmer:1.1,depth:true,threads:.55,density:.85,borders:false,motion:false};engine.configure(baseOptions);tick();
const objects=()=>{const result=[];rendered.scene.traverse(o=>{if(o instanceof THREE.Points)result.push(o);});return result;};
async function complete(cmd){let done=false,result;const pending=engine.command(cmd).then(v=>{done=true;result=v;});for(let i=0;i<150&&!done;i++){await new Promise(resolve=>setImmediate(resolve));tick(100);}assert.ok(done,'Command resolves within bounded lifecycle');await pending;return result;}

for (const id of ['palm-jumeirah','makkah']) {
  assert.equal((await complete({type:'flyTo',targetId:id})).ok,true);
  const destination = engine.worldState(); assert.equal(destination.targetId,id); assert.equal(destination.tier,'city');
  const city = objects().filter(o=>o.userData.specialDestination===id);
  assert.ok(city.length>=3 && city.some(o=>o.visible));
  for(const object of city) {
    const positions=object.geometry.getAttribute('position').array;
    assert.ok(positions.every(Number.isFinite));
    for(let i=0;i<positions.length;i+=3) assert.ok(Math.abs(Math.hypot(...positions.slice(i,i+3))-1)<.0001);
  }
  const pose=rendered.camera.position.clone(); engine.rotate(8,0); tick();
  assert.ok(rendered.camera.position.distanceTo(pose)<.0001,'Panning must stay at the selected geography');
  await complete({type:'setScale',tier:'street'});
  if(id==='makkah') {
    const flow=objects().find(o=>o.userData.specialFlow); assert.ok(flow?.visible);
    const paused=flow.geometry.getAttribute('position').array.slice();
    engine.rotate(2,0); tick(1000); assert.deepEqual(flow.geometry.getAttribute('position').array,paused);
    engine.configure({...baseOptions,motion:true}); tick(1000); assert.notDeepEqual(flow.geometry.getAttribute('position').array,paused);
    engine.configure(baseOptions);tick();
    await complete({type:'focusLayer',layer:'urban',enabled:false});tick();assert.equal(flow.visible,false);
    await complete({type:'focusLayer',layer:'urban',enabled:true});tick();assert.equal(flow.visible,true);
    const beforeZoom=rendered.camera.position.length(); engine.zoom(.8); tick();assert.ok(rendered.camera.position.length()<beforeZoom,'Close zoom must not snap back to the old Singapore minimum');
  }
  host.clientWidth=390;host.clientHeight=844;resizeCallback();
  await complete({type:'flyTo',targetId:id});
  await complete({type:'setScale',tier:'street'});
  await complete({type:'setScale',tier:'region'});assert.equal(engine.worldState().tier,'region');
  await complete({type:'resetView'});tick();assert.ok(city.every(o=>!o.visible));
  rendered.scene.traverse(o=>{if(o.userData.specialDestination)assert.equal(o.visible,false,'Inactive destination geometry must not submit transparent draw calls');});
  host.clientWidth=1363;host.clientHeight=936;resizeCallback();
}
await complete({type:'flyTo',targetId:'singapore'}); assert.equal(engine.worldState().targetId,'singapore');
assert.ok(objects().filter(o=>o.userData.specialDestination).every(o=>!o.visible));
engine.dispose();
const {sampleCircumambulation}=await import('../lib/world/circumambulation.ts');
const anchor=(await import('../lib/world/makkah-anchor.ts')).default;
const a=new Float32Array(1440*3),b=new Float32Array(a.length);
sampleCircumambulation(0,anchor.center,a);sampleCircumambulation(10,anchor.center,b);
const local=(p,i)=>[(Math.atan2(p[i],p[i+2])*180/Math.PI-anchor.center[0])*103516,(Math.atan2(p[i+1],Math.hypot(p[i],p[i+2]))*180/Math.PI-anchor.center[1])*111195];
for(let i=0;i<a.length;i+=3){const x=local(a,i),y=local(b,i);assert.ok(x[0]*y[1]-x[1]*y[0]>0,'Every stream travels counter-clockwise');assert.ok(Math.hypot(...x)>16&&Math.hypot(...x)<62,'Streams stay outside the anchor and within the chosen courtyard');}
const start=process.hrtime.bigint();for(let i=0;i<1000;i++)sampleCircumambulation(i/60,anchor.center,b);
console.log(`PASS special destinations: real-engine loads, geographic pan, all scales, phone entry, pause/toggle, SG return; 1,440 CCW samples; 1,000 flow updates ${Number(process.hrtime.bigint()-start)/1e6} ms (Node only).`);
