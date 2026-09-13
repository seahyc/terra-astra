import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['lib/world/data/client.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {createWorldDataPoller,currentRecords}=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const now=1800000000000;
const snapshot={version:1,layer:'aircraft',status:'fresh',source:{name:'test'},expiresAt:now+60000,records:[{id:'a',latitude:1,longitude:2,observedAt:now-1000,positionAt:now-1000,kind:'observed'}]};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('client clears expired snapshots and old aircraft independently',()=>{
 assert.equal(currentRecords(snapshot,now).length,1);
 assert.equal(currentRecords(snapshot,now+60001).length,0);
 assert.equal(currentRecords({...snapshot,expiresAt:now+999999},now+121000).length,0);
});
test('late responses for an old viewport cannot overwrite current data',async()=>{
 const replies=[],seen=[];const poller=createWorldDataPoller((layer,s)=>seen.push(s),{now:()=>now,visibilityDocument:null,fetchImpl:()=>new Promise(resolve=>replies.push(resolve))});
 poller.setLayer('aircraft',true,{latitude:1,longitude:2});poller.setLayer('aircraft',true,{latitude:10,longitude:20});
 replies[1](Response.json({...snapshot,records:[{...snapshot.records[0],id:'new'}]}));await tick();
 replies[0](Response.json({...snapshot,records:[{...snapshot.records[0],id:'old'}]}));await tick();
 assert.equal(seen.at(-1).records[0].id,'new');poller.dispose();
});
test('hidden tabs do not fetch, and disposal cancels in-flight capture',async()=>{
 const handlers=new Map();const doc={hidden:true,addEventListener:(n,f)=>handlers.set(n,f),removeEventListener:n=>handlers.delete(n)};let calls=0,signal;
 const poller=createWorldDataPoller(()=>{},{visibilityDocument:doc,fetchImpl:async(_url,options)=>{calls++;signal=options.signal;return new Promise(()=>{});}});
 poller.setLayer('satellites',true);assert.equal(calls,0);
 doc.hidden=false;handlers.get('visibilitychange')();assert.equal(calls,1);poller.dispose();assert.equal(signal.aborted,true);assert.equal(handlers.size,0);
});
