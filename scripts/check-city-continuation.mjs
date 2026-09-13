// Actual bundled sources; Node type stripping. No network and no writes.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createCityContinuation } from '../lib/world/city-continuation.ts';
import { createUrbanActivity } from '../lib/world/urban-activity.ts';
function bytes(name) { const b=readFileSync(new URL(`../public/data/${name}.bin`,import.meta.url));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength); }
const fingerprint=a=>createHash('sha256').update(Buffer.from(a.buffer,a.byteOffset,a.byteLength)).digest('hex');
const grid=new Int16Array(bytes('relief-grid'));
const gridBefore=fingerprint(grid);
for(const city of ['singapore','new-york']) {
  const roads=new Float32Array(bytes(`${city}-streets`)),before=fingerprint(roads);
  const start=performance.now();const data=createCityContinuation(city,roads,{elevation:grid});const duration=performance.now()-start;
  assert.equal(data.stars.length/6,16000,'Default preparation fills bounded point budget');
  assert.ok(data.lines.length>600&&data.lines.length<16000*6);
  assert.equal(data.stars.length%6,0);assert.equal(data.lines.length%6,0);
  assert.ok(data.interpretation.includes('not mapped roads'));
  let outsideCore=0;
  for(const [points,stride,radius] of [[data.stars,6,1.000019],[data.lines,3,1.000013]]) {
    for(let i=0;i<points.length;i+=stride) {
      assert.ok([...points.subarray(i,i+stride)].every(Number.isFinite));
      assert.ok(Math.abs(Math.hypot(points[i],points[i+1],points[i+2])-radius)<1e-7);
      const lon=Math.atan2(points[i],points[i+2])*180/Math.PI,lat=Math.atan2(points[i+1],Math.hypot(points[i],points[i+2]))*180/Math.PI;
      assert.ok(lon>=data.bounds.west-1e-5&&lon<=data.bounds.east+1e-5&&lat>=data.bounds.south-1e-5&&lat<=data.bounds.north+1e-5);
      const x=Math.max(0,Math.min(1439,Math.floor((lon+180)*4))),y=Math.max(0,Math.min(719,Math.floor((90-lat)*4)));
      assert.ok(grid[y*1440+x]>=-150,'Continuation avoids coarse deep-water cells');
      const d=Math.hypot((lon-data.core.centerLon)/data.core.halfLongitude,(lat-data.core.centerLat)/data.core.halfLatitude);
      if(stride===6){assert.ok(points[i+3]>=0&&points[i+3]<.3,'Farfield is dimmer than accurate streets');if(d>1)outsideCore++;}
    }
  }
  assert.ok(outsideCore>8000,'Most continuation points extend beyond the accurate core feather');
  const cacheStart=performance.now();assert.equal(createCityContinuation(city,roads,{elevation:grid}),data);const cachedMs=performance.now()-cacheStart;
  const again=createCityContinuation(city,roads.slice(),{elevation:grid});assert.deepEqual(again.stars,data.stars);assert.deepEqual(again.lines,data.lines);
  assert.equal(fingerprint(roads),before);assert.equal(fingerprint(grid),gridBefore);
  const ocean=new Int16Array(grid.length).fill(-1000);assert.equal(createCityContinuation(city,roads,{elevation:ocean,pointBudget:1000}).stars.length,0,'Different supplied mask must not reuse a cached land result');
  const zero=createCityContinuation(city,roads,{pointBudget:0});assert.equal(zero.stars.length,0);assert.equal(zero.lines.length,0);
  const motion=createUrbanActivity(roads);assert.ok([...motion.trafficImportance].every(x=>x>=0&&x<=1));
  let low=0,lowN=0,high=0,highN=0;
  for(let i=0;i<motion.trafficCount;i++){if(motion.trafficImportance[i]<.35){low+=motion.trafficBrightness[i];lowN++;}if(motion.trafficImportance[i]>.6){high+=motion.trafficBrightness[i];highN++;}}
  assert.ok(lowN>0&&highN>0&&high/highN>low/lowN+.1,'Geometric primary embers are measurably stronger');
  for(let group=0;group<Math.floor(motion.activityCount/5);group++){const a=motion.activityAnchors.subarray((group*5+1)*3,(group*5+2)*3);for(let j=2;j<5;j++)assert.deepEqual(motion.activityAnchors.subarray((group*5+j)*3,(group*5+j+1)*3),a,'Hub cohort shares stable junction anchor');}
  console.log(`PASS ${city}: ${data.stars.length/6} points, ${data.lines.length/6} filaments, ${outsideCore} outside core; prepare ${duration.toFixed(1)}ms, cache ${cachedMs.toFixed(3)}ms, buffers ${data.stars.byteLength+data.lines.byteLength}B. Node timing, not browser FPS.`);
}
assert.equal(createCityContinuation('singapore',new Float32Array([NaN,0,0,0,0,0])).stars.length,0);
console.log('PASS finite/radial/geographic extents, deepwater rejection, dim farfield, deterministic data, cache identity, immutable inputs, budget/malformed input, importance and clustered activity.');
