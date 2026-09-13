import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundle = await build({ stdin:{contents:`export * from './lib/terra/world-answer'; export * from './lib/terra/presentation/director';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm'});
const { worldAnswerSchema, makeContextScene, createSceneDirector } = await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const targets = [{name:'Malacca',latitude:3.7,longitude:100.3,span:10},{name:'Date line',latitude:0,longitude:179,span:10},{name:'High latitude',latitude:80,longitude:0,span:20}];
for (const target of targets) {
 const scene=makeContextScene(1,target);
 assert.equal(scene.measurement,null); assert.deepEqual(scene.traces,[]); assert.deepEqual(scene.evidence,[]);
 assert.ok(scene.bounds.west<=scene.bounds.east && scene.bounds.west>=-180 && scene.bounds.east<=180);
 assert.ok(scene.bounds.south>=-85 && scene.bounds.north<=85);
}
const answer={title:'Context',explanation:'Geographic background.',limitation:'Approximate coordinates.',targets};
assert.ok(worldAnswerSchema.safeParse(answer).success);
assert.ok(!worldAnswerSchema.safeParse({...answer,targets:[{...targets[0],latitude:Infinity}]}).success);
assert.ok(!worldAnswerSchema.safeParse({...answer,targets:Array(5).fill(targets[0])}).success);
const pending=[];
const director=createSceneDirector((scene,signal)=>new Promise(resolve=>pending.push({scene,signal,resolve})));
const first=director.presentContext(targets[0]), second=director.presentContext(targets[1]);
assert.ok(pending[0].signal.aborted);
pending[1].resolve({revision:pending[1].scene.revision,ready:true,renderer:'test'});
assert.equal((await second).ready,true);
pending[0].resolve({revision:pending[0].scene.revision,ready:true,renderer:'test'});
assert.equal((await first).status,'superseded');
assert.equal(director.getSnapshot().scene.labels[0].text,'Date line');
director.clear(); assert.equal(director.getSnapshot().scene,null);
console.log('PASS global context bounds, invalid targets, no fabricated measurements/routes, supersession and clearing');
