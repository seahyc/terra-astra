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
let graphicsLostCallback=null,keyCallback=null;
class Canvas {
  style = {}; width = 1; height = 1;
  getContext(type) { return type === '2d' ? ctx : null; }
  addEventListener(type,callback) {if(type==='webglcontextlost')graphicsLostCallback=callback;if(type==='keydown')keyCallback=callback;} removeEventListener() {} setAttribute() {} remove() {}
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
assert.deepEqual(objects().filter(o=>o.userData.backgroundDepth).map(o=>o.userData.backgroundDepth).sort((a,b)=>a-b),[8,30],'Two faint physical background depths');assert.equal(engine.worldState().layers.ships,true,'Sea movement starts enabled');assert.ok(objects().some(o=>o.userData.seaBackbone),'Existing engine carries illustrated sea pulses');
const shells=()=>objects().filter(o=>o.userData.shell&&o.userData.shell!=='ships');
assert.equal(shells().length,2,'One orbital and one atmosphere shell');
const radii=shells().map(o=>{const a=o.geometry.getAttribute('position');return [o.userData.shell,...Array.from({length:a.count},(_,i)=>Math.hypot(a.getX(i),a.getY(i),a.getZ(i)))];});
for(const [layer,...values] of radii)assert.ok(values.every(r=>layer==='satellites'?r>=1.19&&r<=1.39:r>=1.024&&r<=1.061),'Distinct physical shell radii');
const paused=shells().map(o=>o.geometry.getAttribute('position').array.slice());engine.rotate(20,4);tick(1000);for(let i=0;i<2;i++)assert.deepEqual(shells()[i].geometry.getAttribute('position').array,paused[i],'Pause holds actual shell positions during camera interaction');
engine.configure({...baseOptions,motion:true});tick(1000);assert.notDeepEqual(shells()[0].geometry.getAttribute('position').array,paused[0]);engine.configure(baseOptions);tick();
async function complete(cmd){let done=false,result;const pending=engine.command(cmd).then(v=>{done=true;result=v;});for(let i=0;i<150&&!done;i++){await new Promise(resolve=>setImmediate(resolve));tick(100);}assert.ok(done,'Command resolves within bounded lifecycle');await pending;return result;}
assert.equal((await complete({type:'focusLayer',layer:'satellites',enabled:false})).ok,true);tick();assert.equal(shells().find(o=>o.userData.shell==='satellites').visible,false);
assert.equal((await complete({type:'focusLayer',layer:'satellites',enabled:true})).ok,true);tick();assert.equal(shells().find(o=>o.userData.shell==='satellites').visible,true);
const keyTarget={matches:()=>false,isContentEditable:false,closest:()=>null};const press=(key,extra={})=>{let prevented=false;keyCallback({key,target:keyTarget,preventDefault(){prevented=true;},...extra});return prevented;};const keyboardPose=rendered.camera.position.clone();assert.equal(press('q'),true);tick();assert.ok(rendered.camera.position.distanceTo(keyboardPose)>.01,'Focused canvas Q orbits');const afterOrbit=rendered.camera.position.clone();assert.equal(press('w',{target:{matches:()=>true}}),false);tick();assert.deepEqual(rendered.camera.position.toArray(),afterOrbit.toArray(),'Typing target ignored');assert.equal(press('w',{ctrlKey:true}),false);tick();assert.deepEqual(rendered.camera.position.toArray(),afterOrbit.toArray(),'Browser modifier shortcut ignored');const oldRadius=rendered.camera.position.length();press('r');tick();assert.ok(rendered.camera.position.length()<oldRadius,'R zooms inward');press('t');tick();assert.equal(views.at(-1),'oblique','T tilts through existing camera');press('g');tick();assert.equal(views.at(-1),'globe');
assert.equal((await complete({type:'flyTo',targetId:'new-york'})).ok,true);assert.equal(engine.worldState().targetId,'new-york');assert.equal(engine.worldState().tier,'city');assert.equal(stages.at(-1),'city');
assert.ok(Math.abs(Math.atan2(rendered.camera.position.y,Math.hypot(rendered.camera.position.x,rendered.camera.position.z))*180/Math.PI-40.721562)<.01,'New York camera reaches true target');
assert.equal(shells().every(o=>!o.visible),true,'Global shells fade by city scale');assert.ok(objects().filter(o=>o.userData.seaBackbone).every(o=>!o.visible),'Sea backbone fades before city scale');
const nyContext=objects().find(o=>o.userData.cityContinuation==='new-york');assert.ok(nyContext?.visible,'NY procedural continuation surrounds the accurate core');assert.ok(nyContext.material.uniforms.opacity.value>=4.5,'Dim authored context gets enough display exposure to bridge the core edge');assert.ok(nyContext.material.uniforms.sizeScale.value>=.9,'Context star cores remain larger than subpixel sparks');
const aerialResult=await complete({type:'setPerspective',perspective:'aerial'});const aerialPose=rendered.camera.position.clone();assert.equal(aerialResult.ok,true);assert.equal(engine.worldState().targetId,'new-york');assert.equal(engine.worldState().tier,'city');assert.equal(engine.worldState().perspective,'aerial');
const horizonResult=await complete({type:'setPerspective',perspective:'horizon'});const horizonPose=rendered.camera.position.clone();assert.equal(horizonResult.ok,true);assert.equal(engine.worldState().targetId,'new-york');assert.equal(engine.worldState().tier,'city');assert.equal(engine.worldState().perspective,'horizon');assert.ok(horizonPose.distanceTo(aerialPose)>.001,'City horizon changes the real camera projection without leaving the city');
const cutawayResult=await complete({type:'setPerspective',perspective:'cutaway'});const cutawayPose=rendered.camera.position.clone();assert.equal(cutawayResult.ok,true);assert.equal(engine.worldState().targetId,'new-york');assert.equal(engine.worldState().tier,'planet','City cutaway pulls back to an Earth-interior framing');assert.equal(engine.worldState().perspective,'cutaway');assert.ok(Math.abs(Math.atan2(cutawayPose.y,Math.hypot(cutawayPose.x,cutawayPose.z))*180/Math.PI-40.721562)<.01,'Cutaway retains the New York anchor');assert.ok(rendered.scene.userData.spatial.cut>.99,'Cutaway acknowledgement waits for the real cut plane');
await complete({type:'setScale',tier:'city'});
assert.equal(shells().every(o=>!o.visible),true,'Global shells fade by city scale');
const ny=objects().filter(o=>o.userData.urban==='new-york');assert.equal(ny.length,2);assert.ok(ny.every(o=>o.visible),'Traffic and soft activity visible');
for(const cloud of ny){const a=cloud.geometry.getAttribute('position');for(let i=0;i<a.count;i++)assert.ok(Math.abs(Math.hypot(a.getX(i),a.getY(i),a.getZ(i))-1.00003)<1e-6);}
const nyBefore=ny.map(o=>o.geometry.getAttribute('position').array.slice());engine.rotate(15,0);tick(500);for(let i=0;i<2;i++)assert.deepEqual(ny[i].geometry.getAttribute('position').array,nyBefore[i]);
await complete({type:'setScale',tier:'street'});assert.equal(engine.worldState().tier,'street');
await complete({type:'focusLayer',layer:'urban',enabled:false});tick();assert.ok(ny.every(o=>!o.visible));await complete({type:'focusLayer',layer:'urban',enabled:true});tick();assert.ok(ny.every(o=>o.visible));
await complete({type:'flyTo',targetId:'singapore'});assert.equal(engine.worldState().targetId,'singapore');assert.equal(stages.at(-1),'city');assert.ok(ny.every(o=>!o.visible));assert.ok(objects().filter(o=>o.userData.urban==='singapore').every(o=>o.visible));const sgContext=objects().find(o=>o.userData.cityContinuation==='singapore');assert.ok(sgContext?.visible&&sgContext.material.uniforms.opacity.value>=4.5,'Singapore receives the same readable context treatment');
const singaporePose=rendered.camera.position.clone();await complete({type:'highlightTarget',targetId:'new-york'});assert.equal(engine.worldState().targetId,'singapore','Highlight does not replace active camera target');engine.rotate(10,0);tick();assert.ok(rendered.camera.position.distanceTo(singaporePose)<.0001,'Highlight another city does not change camera bounds or snap across Earth');assert.ok(objects().filter(o=>o.userData.urban==='singapore').every(o=>o.visible),'Highlight preserves current city activity');
engine.select('amina');tick();engine.orbit();tick();assert.equal(stages.at(-1),'orbit');
await complete({type:'flyTo',targetId:'challenger-deep'});assert.equal(engine.worldState().tier,'region');assert.equal(engine.worldState().targetId,'challenger-deep');assert.ok(rendered.camera.position.length()>1.19);
const trenchAnchor=new THREE.Vector3(Math.cos(11.369*Math.PI/180)*Math.sin(142.587*Math.PI/180),Math.sin(11.369*Math.PI/180),Math.cos(11.369*Math.PI/180)*Math.cos(142.587*Math.PI/180));const sea=objects().find(o=>o.material.uniforms?.seaMotion?.value===1);assert.equal(views.at(-1),'oblique','Challenger announces the existing Horizon view');assert.ok(Math.abs(rendered.camera.position.distanceTo(trenchAnchor)-.62)<1e-6,'Challenger arrives at existing .62 horizon altitude');assert.ok(Math.abs(Math.acos(rendered.camera.position.clone().sub(trenchAnchor).normalize().dot(trenchAnchor))*180/Math.PI-68)<1e-6,'Challenger uses the existing 68-degree camera');assert.ok(Math.abs(sea.material.uniforms.opacity.value-3.45)<1e-6,'Only selected trench region boosts existing ocean material threefold');engine.zoom(.8);tick();assert.ok(Math.abs(rendered.camera.position.distanceTo(trenchAnchor)-.496)<1e-6,'Horizon zoom moves closer');engine.zoom(.01);tick();assert.ok(Math.abs(rendered.camera.position.distanceTo(trenchAnchor)-.32)<1e-6,'Horizon retains safe minimum');engine.configure({...baseOptions,depth:false});tick();assert.equal(sea.material.uniforms.opacity.value,0,'User Surface reference remains respected');engine.configure(baseOptions);tick();
engine.view('cutaway');tick();assert.equal(engine.worldState().targetId,'challenger-deep');assert.ok(Math.abs(Math.atan2(rendered.camera.position.y,Math.hypot(rendered.camera.position.x,rendered.camera.position.z))*180/Math.PI-11.369)<.01,'View change retains Challenger target');assert.ok(Math.abs(rendered.camera.position.length()-1.20)<1e-6);engine.view('globe');tick();host.clientWidth=800;host.clientHeight=600;resizeCallback();tick();assert.ok(Math.abs(rendered.camera.position.length()-1.20)<1e-6,'Idle region resize preserves altitude');engine.zoom(.8);tick();assert.ok(Math.abs(rendered.camera.position.length()-1.16)<1e-6,'Regional zoom-in moves closer rather than snapping to old planet minimum');engine.zoom(.01);tick();assert.ok(Math.abs(rendered.camera.position.length()-1.10)<1e-6,'Regional zoom retains safe .10 minimum');engine.zoom(2);tick();
assert.equal((await complete({type:'setScale',tier:'street'})).ok,false,'Unsupported trench street scale rejected');assert.equal(engine.worldState().tier,'region');
await complete({type:'resetView'});assert.equal(engine.worldState().targetId,null);assert.equal(engine.worldState().tier,'planet');assert.ok(Math.abs(sea.material.uniforms.opacity.value-1.15)<1e-6,'Planet ocean material returns to unchanged exposure');assert.ok(objects().filter(o=>o.userData.cityContinuation).every(o=>!o.visible),'Context remains absent on the global planet');
assert.equal((await complete({type:'flyTo',targetId:'missing'})).ok,false);
const tokyo={type:'flyToLocation',name:'Tokyo',latitude:35.6762,longitude:139.6503,span:8};
assert.equal((await complete(tokyo)).ok,true);assert.equal(engine.worldState().targetId,'location');assert.equal(engine.worldState().tier,'region');assert.equal(stages.at(-1),'orbit');assert.equal(engine.worldState().location.name,'Tokyo');
await complete({type:'setPerspective',perspective:'aerial'});
assert.ok(Math.abs(Math.atan2(rendered.camera.position.y,Math.hypot(rendered.camera.position.x,rendered.camera.position.z))*180/Math.PI-tokyo.latitude)<.01,'Arbitrary camera reaches Tokyo latitude');
assert.ok(Math.abs(Math.atan2(rendered.camera.position.x,rendered.camera.position.z)*180/Math.PI-tokyo.longitude)<.01,'Arbitrary camera reaches Tokyo longitude');
assert.equal((await complete({type:'setScale',tier:'street'})).ok,false,'Arbitrary anchors cannot pretend to load curated street detail');assert.equal(engine.worldState().tier,'region');
for(const perspective of ['horizon','cutaway','aerial']){assert.equal((await complete({type:'setPerspective',perspective})).ok,true);assert.equal(engine.worldState().location.name,'Tokyo');}
assert.ok(Math.abs(Math.atan2(rendered.camera.position.y,Math.hypot(rendered.camera.position.x,rendered.camera.position.z))*180/Math.PI-tokyo.latitude)<.01,'Perspective changes retain arbitrary geographic anchor');
await complete({type:'setScale',tier:'planet'});assert.equal(engine.worldState().location.name,'Tokyo');await complete({type:'setScale',tier:'region'});assert.equal(engine.worldState().location.name,'Tokyo');
for(const invalid of [{...tokyo,latitude:NaN},{...tokyo,longitude:181},{...tokyo,span:0},{...tokyo,name:''}])assert.equal((await complete(invalid)).ok,false,'Invalid arbitrary location rejected');
const pendingTokyo=engine.command(tokyo);await complete({type:'resetView'});assert.equal((await pendingTokyo).ok,true);assert.equal(engine.worldState().location,undefined);assert.equal(engine.worldState().targetId,null,'Queued reset clears arbitrary anchor');

engine.configure({...baseOptions,motion:true});const flight=engine.command({type:'flyTo',targetId:'challenger-deep'});for(let i=0;i<5;i++){await Promise.resolve();tick(100);}host.clientWidth=390;host.clientHeight=844;resizeCallback();for(let i=0;i<80;i++){tick(100);await Promise.resolve();}assert.equal((await flight).ok,true);assert.ok(Math.abs(rendered.camera.position.distanceTo(trenchAnchor)-.62)<1e-6,'In-flight regional resize retains its intended horizon altitude');engine.region('indonesia');assert.equal(engine.worldState().targetId,null,'Explicit depth preset clears old command target');
const lostCommand=engine.command({type:'flyTo',targetId:'singapore'});for(let i=0;i<6;i++){await Promise.resolve();tick(100);}assert.ok(graphicsLostCallback);graphicsLostCallback({preventDefault(){}});assert.equal((await lostCommand).ok,false,'Graphics loss settles active command');assert.equal((await engine.command({type:'resetView'})).ok,false,'Graphics loss rejects later commands');
engine.dispose();assert.equal(frame,null);
console.log('PASS: distinct orbital/aircraft shells with trails; real pause of positions; layer toggles; serialized target/scale commands; sourced NYC detail and activity; SG return; Mariana region; reset; invalid command. Inert Canvas lifecycle, not pixel/performance evidence.');
