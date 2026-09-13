/** Dim procedural context beyond the accurate OSM core. Never mapped or live streets. */
export type ContinuationCity = 'singapore' | 'new-york';
export type CityContinuation = {
  stars: Float32Array;
  lines: Float32Array;
  bounds: { south: number; west: number; north: number; east: number };
  core: { centerLat: number; centerLon: number; halfLatitude: number; halfLongitude: number };
  feather: { start: number; end: number };
  interpretation: string;
};
export type ContinuationOptions = { elevation?: Int16Array; pointBudget?: number };
type Point = readonly [number, number];
const R = Math.PI / 180;
const cache = new WeakMap<Float32Array, { key: string; elevation: Int16Array | undefined; result: CityContinuation }[]>();
const smooth = (a: number, b: number, value: number) => { const t = Math.max(0, Math.min(1, (value - a) / (b - a))); return t * t * (3 - 2 * t); };
function random(n: number) { let x = Math.imul(n ^ (n >>> 16), 0x21f0aaad); x = Math.imul(x ^ (x >>> 15), 0x735a2d97); return ((x ^ (x >>> 15)) >>> 0) / 4294967296; }
const cities = {
  singapore: {
    core: { centerLat: 1.305, centerLon: 103.8525, halfLatitude: .039, halfLongitude: .055 },
    bounds: { south: 1.265, west: 103.67, north: 1.455, east: 104.015 },
    hubs: [[103.8525,1.305],[103.795,1.327],[103.746,1.352],[103.714,1.345],[103.835,1.375],[103.875,1.38],[103.925,1.348],[103.954,1.365],[103.814,1.423]] as Point[],
    // Conservative artistic land envelopes; not a replacement coastline dataset.
    land: [[[103.67,1.34],[103.70,1.41],[103.755,1.443],[103.82,1.452],[103.88,1.415],[103.944,1.414],[104.0,1.375],[103.978,1.333],[103.93,1.304],[103.855,1.27],[103.79,1.284],[103.714,1.30]]] as Point[][],
  },
  'new-york': {
    core: { centerLat: 40.72155, centerLon: -73.9957, halfLatitude: .01805, halfLongitude: .0237 },
    bounds: { south: 40.65, west: -74.02, north: 40.86, east: -73.87 },
    hubs: [[-73.9957,40.72155],[-73.985,40.752],[-73.969,40.78],[-73.95,40.811],[-73.943,40.834],[-73.941,40.742],[-73.921,40.769],[-73.955,40.694],[-73.934,40.674]] as Point[],
    land: [
      [[-74.014,40.706],[-74.008,40.739],[-73.995,40.766],[-73.976,40.802],[-73.944,40.855],[-73.934,40.85],[-73.945,40.818],[-73.944,40.795],[-73.966,40.761],[-73.976,40.735],[-73.991,40.712]],
      [[-73.97,40.685],[-73.956,40.718],[-73.947,40.731],[-73.956,40.749],[-73.938,40.772],[-73.907,40.783],[-73.876,40.757],[-73.886,40.69],[-73.928,40.655],[-73.962,40.657]],
    ] as Point[][],
  },
};
function inside(lon: number, lat: number, polygon: Point[]) {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if ((a[1] > lat) !== (b[1] > lat) && lon < (b[0] - a[0]) * (lat - a[1]) / (b[1] - a[1]) + a[0]) result = !result;
  }
  return result;
}
function sphere(lon: number, lat: number, out: number[], radius: number) {
  const a = lon * R, b = lat * R;
  out.push(radius * Math.cos(b) * Math.sin(a), radius * Math.sin(b), radius * Math.cos(b) * Math.cos(a));
}
/** Inputs must be treated as immutable. Repeated calls with the same arrays/options reuse the prepared buffers. */
export function createCityContinuation(cityId: ContinuationCity, roadPositions: Float32Array, options: ContinuationOptions = {}): CityContinuation {
  const budget = Math.max(0, Math.min(24000, Math.floor(Number.isFinite(options.pointBudget) ? options.pointBudget! : 16000)));
  // A supplied terrain mask is fixed for this road identity, like the prepared roads.
  const key = `${cityId}:${budget}`;
  let entries = cache.get(roadPositions); const cached = entries?.find(entry=>entry.key===key&&entry.elevation===options.elevation); if (cached) return cached.result;
  const city = cities[cityId], core = city.core, bounds = city.bounds;
  const geographic: number[] = [];
  for (let i = 0; i + 5 < roadPositions.length; i += 6) {
    const ax=roadPositions[i],ay=roadPositions[i+1],az=roadPositions[i+2],bx=roadPositions[i+3],by=roadPositions[i+4],bz=roadPositions[i+5];
    const ar=Math.hypot(ax,ay,az),br=Math.hypot(bx,by,bz),length=Math.hypot(ax-bx,ay-by,az-bz)*6371000;
    if (!(ar>.98&&ar<1.02&&br>.98&&br<1.02&&length>3&&length<900)) continue;
    const alon=Math.atan2(ax,az)/R,alat=Math.atan2(ay,Math.hypot(ax,az))/R,blon=Math.atan2(bx,bz)/R,blat=Math.atan2(by,Math.hypot(bx,bz))/R;
    if (Math.abs(alon-core.centerLon)>.15||Math.abs(alat-core.centerLat)>.15) continue;
    geographic.push(alon,alat,blon,blat,length);
  }
  const supported = (lon: number, lat: number) => {
    if(lon<bounds.west||lon>bounds.east||lat<bounds.south||lat>bounds.north||!city.land.some(polygon=>inside(lon,lat,polygon))) return false;
    // Existing 0.25-degree ETOPO is too coarse for rivers. Only reject obvious deep
    // ocean; conservative curated envelopes carry the local water separation.
    if(options.elevation?.length===1440*720){const x=Math.max(0,Math.min(1439,Math.floor((lon+180)*4))),y=Math.max(0,Math.min(719,Math.floor((90-lat)*4)));if(options.elevation[y*1440+x]<-150)return false;}
    return true;
  };
  const brightness = (lon:number,lat:number) => {
    const d=Math.hypot((lon-core.centerLon)/core.halfLongitude,(lat-core.centerLat)/core.halfLatitude);
    const edge=Math.min((lon-bounds.west)/(bounds.east-bounds.west),(bounds.east-lon)/(bounds.east-bounds.west),(lat-bounds.south)/(bounds.north-bounds.south),(bounds.north-lat)/(bounds.north-bounds.south));
    return smooth(.45,1.05,d)*smooth(0,.14,edge);
  };
  const stars:number[]=[],lines:number[]=[];
  const count=geographic.length/5,seed=cityId==='singapore'?260928:260929;
  for(let attempt=0;count&&stars.length/6<budget&&attempt<budget*7;attempt++) {
    const n=seed+attempt*17,route=Math.floor(random(n)*count)*5,hub=city.hubs[attempt%city.hubs.length];
    const scale=.7+random(n+1)*.8,angle=(random(n+2)-.5)*.14,c=Math.cos(angle),s=Math.sin(angle);
    const ax=(geographic[route]-core.centerLon)*scale,ay=(geographic[route+1]-core.centerLat)*scale;
    const bx=(geographic[route+2]-core.centerLon)*scale,by=(geographic[route+3]-core.centerLat)*scale;
    const alon=hub[0]+ax*c-ay*s,alat=hub[1]+ax*s+ay*c,blon=hub[0]+bx*c-by*s,blat=hub[1]+bx*s+by*c;
    const middleLon=(alon+blon)/2,middleLat=(alat+blat)/2;
    if(!supported(alon,alat)||!supported(blon,blat)||!supported(middleLon,middleLat)) continue;
    const weight=brightness(middleLon,middleLat);if(weight<.015)continue;
    const importance=Math.min(1,geographic[route+4]/180),samples=Math.max(2,Math.min(9,Math.ceil(geographic[route+4]*scale/22)));
    if(random(n+3)<.34){sphere(alon,alat,lines,1.000013);sphere(blon,blat,lines,1.000013);}
    for(let k=0;k<samples&&stars.length/6<budget;k++){
      const t=(k+.25+random(n+k+4)*.5)/samples,lon=alon+(blon-alon)*t,lat=alat+(blat-alat)*t;
      if(!supported(lon,lat))continue;
      sphere(lon,lat,stars,1.000019);stars.push((.075+importance*.12)*brightness(lon,lat)*(.65+random(n+k+6)*.6),.55+random(n+k+7)*.65,random(n+k+8)*Math.PI*2);
    }
  }
  const result:CityContinuation={stars:new Float32Array(stars),lines:new Float32Array(lines),bounds:{...bounds},core:{...core},feather:{start:.45,end:1.05},interpretation:'Procedural celestial context, patterned from the accurate core street sample and clipped to conservative artistic land envelopes. Outside-core filaments are not mapped roads, live traffic or observed people.'};
  if(!entries){entries=[];cache.set(roadPositions,entries);}entries.push({key,elevation:options.elevation,result});return result;
}
