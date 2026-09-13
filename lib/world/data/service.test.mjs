import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAircraft } from './aircraft.mjs';
import { createWorldDataService } from './service.mjs';
const NOW = 1800000000000;
const plane = { hex:'aabbcc',flight:'TEST1 ',lat:1.3,lon:103.8,alt_geom:10000,seen_pos:2,track:90,gs:400 };
const feed = (ac=[plane], time=NOW) => ({now:time,ac});

test('aircraft preserves observed time and converts feet without inventing missing altitude',()=>{
 const records=parseAircraft(feed([plane,{...plane,hex:'ccddee',alt_geom:null}]),NOW).records;
 assert.ok(Math.abs(records[0].altitudeKm-3.048)<1e-9);assert.equal(records[0].observedAt,NOW-2000);assert.equal(records[1].altitudeKm,null);
 assert.equal(parseAircraft(feed([{...plane,seen_pos:121},{...plane,lat:91},{...plane,alt_baro:'ground'}]),NOW).records.length,0);
});
test('null/stale/future positions are filtered and latest duplicates retained',()=>{
 const records=parseAircraft(feed([{...plane,seen_pos:null},{...plane,seen_pos:10},{...plane,seen_pos:1}]),NOW).records;
 assert.equal(records.length,1);assert.equal(records[0].observedAt,NOW-1000);
 assert.throws(()=>parseAircraft({now:NOW+31000,ac:[]},NOW));
});
test('concurrent source calls coalesce, rounded viewport caches, failure expires observations',async()=>{
 let clock=NOW,calls=0,fail=false;
 const service=createWorldDataService({now:()=>clock,fetchImpl:async()=>{calls++;if(fail)return new Response('<html>bad</html>',{status:502});return Response.json(feed());}});
 const result=await Promise.all([service('aircraft'),service('aircraft')]);assert.equal(calls,1);assert.equal(result[0].status,'fresh');
 await service('aircraft',{latitude:1.2,longitude:103.9});assert.equal(calls,1);
 clock+=61000;fail=true;const stale=await service('aircraft');assert.equal(stale.status,'stale');assert.equal(stale.records.length,1);
 clock+=61000;const expired=await service('aircraft');assert.equal(expired.status,'unavailable');assert.deepEqual(expired.records,[]);
 assert.doesNotMatch(JSON.stringify(expired),/html|bad/);
});
test('invalid layer and coordinates cannot trigger arbitrary upstream requests',async()=>{
 let calls=0;const service=createWorldDataService({fetchImpl:async()=>{calls++;return Response.json({});}});
 await assert.rejects(service('https://example.com'));await assert.rejects(service('aircraft',{latitude:NaN,longitude:0}));assert.equal(calls,0);
});
test('oversized JSON body cancels and returns unavailable',async()=>{
 let cancelled=false;const service=createWorldDataService({fetchImpl:async()=>new Response(new ReadableStream({pull(c){c.enqueue(new Uint8Array(1024*1024));},cancel(){cancelled=true;}}),{headers:{'Content-Type':'application/json'}})});
 const data=await service('earthquakes');assert.equal(data.status,'unavailable');assert.equal(cancelled,true);
});
test('empty valid earthquake feed stays fresh',async()=>{
 const service=createWorldDataService({now:()=>NOW,fetchImpl:async()=>Response.json({type:'FeatureCollection',metadata:{generated:NOW},features:[]})});
 const data=await service('earthquakes');assert.equal(data.status,'fresh');assert.deepEqual(data.records,[]);
});
test('distinct viewport bursts cannot exceed four upstream requests',async()=>{
 let calls=0,release;const gate=new Promise(resolve=>{release=resolve;});
 const service=createWorldDataService({now:()=>NOW,fetchImpl:async()=>{calls++;await gate;return Response.json(feed());}});
 const active=[0,1,2,3].map(latitude=>service('aircraft',{latitude,longitude:0}));
 const overflow=await service('aircraft',{latitude:8,longitude:0});
 assert.equal(overflow.status,'unavailable');assert.equal(calls,4);release();await Promise.all(active);
});
test('Worker cache shares normalized snapshots across service instances',async()=>{
 const storage=new Map();const cache={match:async key=>storage.get(key.url)?.clone(),put:async(key,response)=>{storage.set(key.url,response.clone());}};
 let calls=0;const fetchImpl=async()=>{calls++;return Response.json(feed());};
 await createWorldDataService({cache,now:()=>NOW,fetchImpl})('aircraft');
 const second=await createWorldDataService({cache,now:()=>NOW+1000,fetchImpl})('aircraft');
 assert.equal(calls,1);assert.equal(second.records.length,1);assert.equal(second.status,'fresh');
 const stored=await [...storage.values()][0].json();assert.equal(stored.raw,undefined);assert.equal(stored.data.records[0].id,'aircraft:aabbcc');
});
