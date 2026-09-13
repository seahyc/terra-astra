import * as THREE from 'three';
import { specialFeather } from './special-destinations';
import { sampleCircumambulation } from './circumambulation';
import makkahAnchor from './makkah-anchor';

type Cloud = { points: THREE.Points; material: THREE.ShaderMaterial; count: number };
type Ports = {
  load: (name: string) => Promise<Float32Array>;
  cloud: (data: Float32Array, tint: string, feather?: (lon: number, lat: number) => number) => Cloud;
  lines: (data: Float32Array, tint: string, feather?: (lon: number, lat: number) => number) => THREE.LineSegments;
  urban: (id: string, roads: Float32Array, feather: (lon: number, lat: number) => number) => void;
  alive: () => boolean;
};

/** Uses the engine's material factories, ownership/disposal and urban sampler.
 * This module owns only the spike's assets and activity, not a renderer or camera.
 */
export function specialDestinationViews(ports: Ports) {
  const views = new Map<string, { stars: Cloud; coast: Cloud; streets: THREE.LineSegments; outline: THREE.LineSegments; routes: THREE.LineSegments | null; sea: Cloud | null; flow: Cloud | null; anchor: THREE.LineSegments | null }>();
  const pending = new Map<string, Promise<void>>();
  async function ensure(id: string) {
    if (views.has(id)) return;
    if (pending.has(id)) return pending.get(id);
    const task = (async () => {
      const [stars, streets, coast, outline, activityRoads] = await Promise.all([
        ports.load(`special/${id}-stars`), ports.load(`special/${id}-streets`),
        ports.load(`special/${id}-coast`), ports.load(`special/${id}-outline`),
        id === 'palm-jumeirah' ? ports.load('special/palm-jumeirah-activity') : Promise.resolve(null),
      ]);
      if (!ports.alive()) return;
      const feather = (lon: number, lat: number) => specialFeather(id, lon, lat);
      // Keep the mapped points; only lift mainland context and shoreline rhythm.
      if (id === 'palm-jumeirah') {
        for (let i=0; i<stars.length; i+=6) {
          const lat = Math.atan2(stars[i+1],Math.hypot(stars[i],stars[i+2]))*180/Math.PI;
          stars[i+3] *= 1.15 + .35*Math.max(0,Math.min(1,(25.105-lat)/.025));
          stars[i+4] *= 1.18;
        }
        for (let i=0; i<coast.length; i+=6) coast[i+3] *= .82+.30*Math.sin(coast[i+5]*2.1)**2;
      }
      const starView = ports.cloud(stars, '#d5c5a5', feather), coastView = ports.cloud(coast, id==='makkah'?'#d6d0bc':'#91c8c9', feather);
      const streetView = ports.lines(streets, '#c1a780', feather), outlineView = ports.lines(outline, '#80b9bd', feather);
      const routes = activityRoads ? ports.lines(activityRoads, '#d9b480', feather) : null;
      starView.points.userData.fallbackExposure = 2.4;
      coastView.points.userData.fallbackExposure = 2.4;
      if (activityRoads) ports.urban(id, activityRoads, feather);
      // Sparse, interpretive water light beyond the crescent. Not AIS or boat tracks.
      const sea = id === 'palm-jumeirah' ? ports.cloud(new Float32Array(96*6), '#73b9bc') : null;
      if (sea) sea.material.uniforms.soft.value = .35;
      let flow: Cloud | null = null, anchor: THREE.LineSegments | null = null;
      if (id === 'makkah') {
        const data = new Float32Array(1440*6);
        for(let i=0;i<1440;i++) data.set([0,0,0,.42+(i%17)/48,.64+(i%7)/28,(i*.713)%6.28],i*6);
        flow = ports.cloud(data, '#d5aa82');
        flow.material.uniforms.soft.value = .72;
        flow.points.userData.specialFlow = true;
        const position = (p: readonly number[], height: number) => {
          const lon=p[0]*Math.PI/180,lat=p[1]*Math.PI/180,r=1.00002+height/6371000;
          return [Math.cos(lat)*Math.sin(lon)*r,Math.sin(lat)*r,Math.cos(lat)*Math.cos(lon)*r];
        };
        const edges: number[] = [];
        for(let i=1;i<makkahAnchor.footprint.length;i++) {
          const a=makkahAnchor.footprint[i-1],b=makkahAnchor.footprint[i];
          edges.push(...position(a,0),...position(b,0),...position(a,makkahAnchor.heightMetres),...position(b,makkahAnchor.heightMetres),...position(a,0),...position(a,makkahAnchor.heightMetres));
        }
        anchor = ports.lines(new Float32Array(edges), '#d6bd86');
      }
      for(const object of [starView.points,coastView.points,streetView,outlineView,routes,sea?.points,flow?.points,anchor]) if(object) object.userData.specialDestination=id;
      views.set(id, { stars: starView, coast: coastView, streets: streetView, outline: outlineView, routes, sea, flow, anchor });
    })();
    pending.set(id, task);
    try { await task; } finally { pending.delete(id); }
  }
  function update(id: string | null, time: number, city: number, regional: number, fraction: number, size: number, budget: number, threads: number, activity: boolean, altitude: number) {
    for (const [key, view] of views) {
      const visibility = id === key ? 1 : 0;
      view.stars.material.uniforms.opacity.value = visibility * city * 1.25;
      view.stars.material.uniforms.sizeScale.value = size*1.65;
      view.stars.points.geometry.setDrawRange(0, Math.floor(view.stars.count*Math.min(1,fraction*(key==='palm-jumeirah'?1.35:1))*budget));
      view.coast.material.uniforms.opacity.value = visibility * (city*(key==='makkah'?2:1.25) + regional*.035);
      view.coast.material.uniforms.sizeScale.value = key==='makkah'?1.08:.92;
      (view.streets.material as THREE.LineBasicMaterial).opacity = visibility*(city*.23 + regional*.02)*threads;
      (view.outline.material as THREE.LineBasicMaterial).opacity = visibility*(city*(key==='makkah'?.44:.23) + regional*.03)*threads;
      view.streets.visible = (view.streets.material as THREE.LineBasicMaterial).opacity > .001;
      view.outline.visible = (view.outline.material as THREE.LineBasicMaterial).opacity > .001;
      if (view.routes) {
        (view.routes.material as THREE.LineBasicMaterial).opacity = visibility*city*.42*threads;
        view.routes.visible = (view.routes.material as THREE.LineBasicMaterial).opacity > .001;
      }
      if (view.anchor) {
        (view.anchor.material as THREE.LineBasicMaterial).opacity = visibility*city*.95;
        view.anchor.visible = visibility*city > .001;
      }
      if (view.flow) {
        view.flow.material.uniforms.opacity.value = visibility*city*(activity?2:0);
        view.flow.points.geometry.setDrawRange(0, Math.floor(view.flow.count*Math.min(1,.00017/altitude)**1.3));
        if (visibility && activity && city>.002) {
          const position = view.flow.points.geometry.getAttribute('position') as THREE.BufferAttribute;
          sampleCircumambulation(time, makkahAnchor.center, position.array as Float32Array);
          position.needsUpdate = true;
        }
      }
      if (view.sea) {
        view.sea.material.uniforms.opacity.value = visibility*city*(activity?.5:0);
        if (!visibility || !activity || city < .002) continue;
        const positions = view.sea.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const brightness = view.sea.points.geometry.getAttribute('brightness') as THREE.BufferAttribute;
        const sizes = view.sea.points.geometry.getAttribute('starSize') as THREE.BufferAttribute;
        for (let i=0; i<96; i++) {
          const angle = .12 + ((i*.61803398875 + time*.0007)%1)*2.52;
          const radius = .033 + (i%5)*.0012;
          const lon = (55.139 + Math.cos(angle)*radius/Math.cos(25.1124*Math.PI/180))*Math.PI/180;
          const lat = (25.1124 + Math.sin(angle)*radius)*Math.PI/180;
          positions.setXYZ(i, Math.cos(lat)*Math.sin(lon)*1.00003, Math.sin(lat)*1.00003, Math.cos(lat)*Math.cos(lon)*1.00003);
          brightness.setX(i, .12 + .12*Math.sin(angle*12+i)**2); sizes.setX(i, i%12===0?.65:.3);
        }
        positions.needsUpdate = brightness.needsUpdate = sizes.needsUpdate = true;
      }
    }
  }
  return { ensure, update };
}
