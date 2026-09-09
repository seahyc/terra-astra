import * as THREE from 'three';
import { stories, type Story } from './stories';
import { CanvasStarRenderer } from './canvas-renderer';
export type Stage = 'orbit'|'descending'|'city'|'ascending';
export type ViewOptions = { glow:number; threads:number; density:number; borders:boolean; motion:boolean };
export type Engine = { descend:()=>Promise<void>; orbit:()=>void; zoom:(factor:number)=>void; rotate:(dx:number,dy:number)=>void; select:(id:string|null)=>void; configure:(o:ViewOptions)=>void; dispose:()=>void };
type Callbacks={stage:(s:Stage)=>void;ready:()=>void;error:(s:string)=>void;coordinates:(lat:number,lon:number)=>void};
type Cloud={points:THREE.Points;material:THREE.ShaderMaterial;count:number};
const R=Math.PI/180;
export function geo(lon:number,lat:number,r=1){const a=lon*R,b=lat*R;return new THREE.Vector3(r*Math.cos(b)*Math.sin(a),r*Math.sin(b),r*Math.cos(b)*Math.cos(a));}
const clamp=THREE.MathUtils.clamp;
const ease=(t:number)=>t*t*(3-2*t);
const wrap=(x:number)=>((x+180)%360+360)%360-180;
const vertex=`attribute float brightness;attribute float starSize;attribute float phase;uniform float time;uniform float motion;uniform float pixelRatio;uniform float zoomFactor;varying float vB;varying float vP;
void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;float tw=1.0+motion*0.075*sin(time*.65+phase);vB=brightness*tw;vP=phase;gl_PointSize=clamp(starSize*pixelRatio*3.8*zoomFactor,2.0,36.0);}`;
const fragment=`uniform vec3 tint;uniform float opacity;uniform float glow;varying float vB;varying float vP;
void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float core=exp(-r*r*190.0);float halo=exp(-r*r*25.0)*.25*glow;float ray=exp(-abs(p.x)*110.0)*exp(-abs(p.y)*17.0)+exp(-abs(p.y)*110.0)*exp(-abs(p.x)*17.0);float flare=step(5.92,vP)*ray*.15;float a=(core+halo+flare)*vB*opacity;gl_FragColor=vec4(tint,a);}`;
export async function createEarth(host:HTMLDivElement,markers:HTMLDivElement,callbacks:Callbacks,signal:AbortSignal):Promise<Engine>{
 let renderer:THREE.WebGLRenderer|CanvasStarRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});}catch{renderer=new CanvasStarRenderer();}
 const fallback=renderer instanceof CanvasStarRenderer;host.dataset.renderer=fallback?'canvas':'webgl';
 renderer.setClearColor(0x03070b,1);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const pixelRatio=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.35:1.7);renderer.setPixelRatio(pixelRatio);
 renderer.domElement.setAttribute('aria-label','Rotate Earth with the arrow keys or drag. Use plus and minus to zoom.');renderer.domElement.tabIndex=0;renderer.domElement.style.touchAction='none';host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(42,1,.000001,100);const earth=new THREE.Group();scene.add(earth);
 const geometries:THREE.BufferGeometry[]=[];const materials:THREE.Material[]=[];const clouds:Cloud[]=[];
 const homeAltitude=()=>{const w=host.clientWidth,h=host.clientHeight,r=Math.min(w*.44,h*.38);return Math.max(2.15,Math.sqrt(1+Math.pow(h/(2*Math.tan(21*R)*r),2))-1);};
 let disposed=false,raf=0,stage:Stage='orbit',lat=19,lon=95,alt=homeAltitude(),targetLat=lat,targetLon=lon,targetAlt=alt,selected:Story|null=null;
 let options:ViewOptions={glow:1,threads:.55,density:.85,borders:false,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches};
 let flight:{start:number;duration:number;fromLat:number;fromLon:number;fromAlt:number;toLat:number;toLon:number;toAlt:number;end:Stage}|null=null;
 let cityReady=false;let cityLoading:Promise<void>|null=null;let lastInteraction=0;let lastTime=performance.now(),time=0,lastCoordinate=0,frameCount=0,totalFrame=0,sampleFrames=0;
 const setStage=(s:Stage)=>{stage=s;callbacks.stage(s);};
 function geometry(positions:number[]|Float32Array){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometries.push(g);return g;}
 function cloud(data:Float32Array,tint:string){const count=data.length/6;const p=new Float32Array(count*3),b=new Float32Array(count),s=new Float32Array(count),ph=new Float32Array(count);for(let i=0;i<count;i++){p.set(data.subarray(i*6,i*6+3),i*3);b[i]=data[i*6+3];s[i]=data[i*6+4];ph[i]=data[i*6+5];}
 const g=geometry(p);g.setAttribute('brightness',new THREE.BufferAttribute(b,1));g.setAttribute('starSize',new THREE.BufferAttribute(s,1));g.setAttribute('phase',new THREE.BufferAttribute(ph,1));
 const m=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{tint:{value:new THREE.Color(tint)},opacity:{value:1},glow:{value:1},time:{value:0},motion:{value:1},pixelRatio:{value:pixelRatio},zoomFactor:{value:1}},transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});materials.push(m);const points=new THREE.Points(g,m);points.frustumCulled=false;earth.add(points);const c={points,material:m,count};clouds.push(c);return c;}
 function lines(data:Float32Array|number[],color:string){const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(m);const o=new THREE.LineSegments(geometry(data),m);o.frustumCulled=false;earth.add(o);return o;}
 async function load(name:string){const res=await fetch('/data/'+name+'.bin',{signal});if(!res.ok)throw new Error('Could not load '+name);const b=await res.arrayBuffer();if(b.byteLength%4)throw new Error('Invalid geographic data');return new Float32Array(b);}
 const sphereG=new THREE.SphereGeometry(1,96,64);geometries.push(sphereG);const sphereM=new THREE.MeshBasicMaterial({color:0x020609});materials.push(sphereM);const sphere=new THREE.Mesh(sphereG,sphereM);earth.add(sphere);
 // A very restrained atmospheric edge; its surface fades away during descent.
 const edgeG=new THREE.SphereGeometry(1.001,80,48);geometries.push(edgeG);const edgeM=new THREE.ShaderMaterial({uniforms:{opacity:{value:1}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;uniform float opacity;void main(){float f=pow(1.0-max(0.0,dot(normalize(n),normalize(v))),5.0);gl_FragColor=vec4(.20,.40,.51,f*.13*opacity);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(edgeM);earth.add(new THREE.Mesh(edgeG,edgeM));
 // Sparse, deterministic distant stars keep Earth as the brightest object.
 let seed=901;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const bg:number[]=[];
 for(let i=0;i<650;i++){const v=geo(random()*360-180,Math.asin(random()*2-1)/R,30);bg.push(...v.toArray(),.18+random()*.34,.6+random()*.85,random()*6.28);}const background=cloud(new Float32Array(bg),'#a3bfce');earth.remove(background.points);scene.add(background.points);
 let land:Cloud,coast:Cloud,lights:Cloud,coastLines:THREE.LineSegments,borders:THREE.LineSegments;
 let cityStars:Cloud|null=null,cityCoast:Cloud|null=null,streetLines:THREE.LineSegments|null=null,regional:THREE.LineSegments|null=null;
 const storyGroup=new THREE.Group();earth.add(storyGroup);let storyCloud:Cloud|null=null;let storyLines:THREE.LineSegments|null=null;
 let peopleCloud:Cloud|null=null;
 function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const destroy=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',cancel);host.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('keydown',key);renderer.domElement.removeEventListener('webglcontextlost',contextLost);document.removeEventListener('visibilitychange',visibility);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.domElement.remove();};
 const contextLost=(e:Event)=>{e.preventDefault();callbacks.error('The star field paused because graphics became unavailable. Reload to gather it again.');cancelAnimationFrame(raf);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
 try{const data=await Promise.all(['land','coast','lights','coast-lines','borders'].map(load));if(signal.aborted){destroy();throw new DOMException('Aborted','AbortError');}land=cloud(data[0],'#a8cfde');coast=cloud(data[1],'#d6e5e9');lights=cloud(data[2],'#eed7a8');coastLines=lines(data[3],'#789dab');borders=lines(data[4],'#89a8b5');}catch(e){destroy();throw e;}
 function fly(toLat:number,toLon:number,toAlt:number,end:Stage){lastInteraction=performance.now();flight={start:performance.now(),duration:options.motion?6200:250,fromLat:lat,fromLon:lon,fromAlt:alt,toLat,toLon:lon+wrap(toLon-lon),toAlt,end};setStage(end==='city'?'descending':'ascending');}
 async function ensureCity(){if(cityReady)return;if(cityLoading)return cityLoading;cityLoading=(async()=>{const data=await Promise.all(['singapore-stars','singapore-streets','regional-lines','singapore-coast'].map(load));if(disposed||signal.aborted)return;cityStars=cloud(data[0],'#c8dbe1');streetLines=lines(data[1],'#84a8ba');regional=lines(data[2],'#aac6cd');cityCoast=cloud(data[3],'#decca4');const people:number[]=[];for(const s of stories)people.push(...geo(s.lon,s.lat,1.000024).toArray(),1.3,5,6.1);peopleCloud=cloud(new Float32Array(people),'#f9dfb2');cityReady=true;})();try{await cityLoading;}catch(e){cityLoading=null;throw e;}}
 function clearStory(){if(storyCloud){storyCloud.points.visible=false;}if(storyLines)storyLines.visible=false;selected=null;}
 function select(id:string|null){clearStory();if(!id)return;const s=stories.find(x=>x.id===id);if(!s)return;selected=s;targetLat=s.places.reduce((a,p)=>a+p.lat,0)/s.places.length;targetLon=s.places.reduce((a,p)=>a+p.lon,0)/s.places.length;targetAlt=host.clientWidth<700?.0019:.00125;lastInteraction=performance.now();const pts:number[]=[],links:number[]=[];for(const p of s.places)pts.push(...geo(p.lon,p.lat,1.00003).toArray(),1.15,3.6,6.15);
 for(let i=1;i<s.places.length;i++){const a=s.places[i-1],b=s.places[i];for(let k=0;k<32;k++){const t=k/32,u=(k+1)/32;links.push(...geo(THREE.MathUtils.lerp(a.lon,b.lon,t),THREE.MathUtils.lerp(a.lat,b.lat,t),1.00004).toArray(),...geo(THREE.MathUtils.lerp(a.lon,b.lon,u),THREE.MathUtils.lerp(a.lat,b.lat,u),1.00004).toArray());}}
 // Reuse buffers when switching lives; no growing collection of discarded story objects.
 if(storyCloud){earth.remove(storyCloud.points);const idx=clouds.indexOf(storyCloud);if(idx>=0)clouds.splice(idx,1);storyCloud.points.geometry.dispose();storyCloud.material.dispose();}
 if(storyLines){earth.remove(storyLines);storyLines.geometry.dispose();(storyLines.material as THREE.Material).dispose();}
 storyCloud=cloud(new Float32Array(pts),'#ffe4b3');storyLines=lines(links,'#f0c885');}
 const pointer=new Map<number,{x:number;y:number}>();let dragged=false,initial={x:0,y:0},pinch=0;
 function rotate(dx:number,dy:number){if(flight)return;lastInteraction=performance.now();const scale=stage==='city'?targetAlt*2*Math.tan(21*R)/(R*host.clientHeight):.18;targetLon-=dx*scale;targetLat=clamp(targetLat+dy*scale,-80,80);if(stage==='city'){targetLon=clamp(targetLon,103.810,103.890);targetLat=clamp(targetLat,1.272,1.330);}}
 function zoom(f:number){if(flight)return;lastInteraction=performance.now();targetAlt=clamp(targetAlt*f,stage==='city'?.00055:.42,stage==='city'?.004:homeAltitude()*1.8);}
 function down(e:PointerEvent){if(flight||!(e.target instanceof HTMLCanvasElement))return;renderer.domElement.focus({preventScroll:true});pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);initial={x:e.clientX,y:e.clientY};dragged=false;lastInteraction=performance.now();if(pointer.size===2){const p=[...pointer.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}}
 function move(e:PointerEvent){const old=pointer.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-initial.x,e.clientY-initial.y)>3)dragged=true;if(pointer.size===2){const p=[...pointer.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(dist>0&&pinch>0)zoom(pinch/dist);pinch=dist;}else rotate(dx,dy);}
 function up(e:PointerEvent){pointer.delete(e.pointerId);pinch=0;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);void dragged;}
 function cancel(e:PointerEvent){pointer.delete(e.pointerId);pinch=0;}
 function wheel(e:WheelEvent){e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-150,150)*.002));}
 function key(e:KeyboardEvent){if(e.key.startsWith('Arrow')){e.preventDefault();rotate(e.key==='ArrowLeft'?-35:e.key==='ArrowRight'?35:0,e.key==='ArrowUp'?-35:e.key==='ArrowDown'?35:0);}if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.82);}if(e.key==='-'){e.preventDefault();zoom(1.22);}}
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);host.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('keydown',key);
 const markerElements=new Map<string,HTMLElement>();const proj=new THREE.Vector3();
 function placeLabel(id:string,lat:number,lon:number,show:boolean){let el=markerElements.get(id);if(!el){el=markers.querySelector<HTMLElement>('[data-star="'+id+'"]')||undefined;if(el)markerElements.set(id,el);}if(!el)return;const world=geo(lon,lat,1.00005);const front=world.dot(camera.position.clone().sub(world))>0;proj.copy(world).project(camera);const x=(proj.x*.5+.5)*host.clientWidth,y=(-proj.y*.5+.5)*host.clientHeight;el.hidden=!(show&&front&&proj.z<1&&x>20&&x<host.clientWidth-20&&y>75&&y<host.clientHeight-125);if(!el.hidden)el.style.transform=`translate(${x}px,${y}px)`;}
 const north=new THREE.Vector3();
 function frame(now:number){if(disposed||document.hidden)return;if(fallback&&now-lastTime<50){raf=requestAnimationFrame(frame);return;}const dt=Math.min((now-lastTime)/1000,.06);lastTime=now;time+=dt;frameCount++;
 if(flight){const t=clamp((now-flight.start)/flight.duration,0,1),z=ease(clamp((t-.17)/.83,0,1)),a=ease(clamp(t/.50,0,1));lat=THREE.MathUtils.lerp(flight.fromLat,flight.toLat,a);lon=THREE.MathUtils.lerp(flight.fromLon,flight.toLon,a);alt=Math.exp(THREE.MathUtils.lerp(Math.log(flight.fromAlt),Math.log(flight.toAlt),z));if(t>=1){targetLat=lat;targetLon=lon;targetAlt=alt;setStage(flight.end);flight=null;}}
 else{if(stage==='orbit'&&options.motion&&pointer.size===0&&now-lastInteraction>4000)targetLon+=dt*.65;const smooth=1-Math.exp(-dt*5);lat=THREE.MathUtils.lerp(lat,targetLat,smooth);lon=THREE.MathUtils.lerp(lon,targetLon,smooth);alt=THREE.MathUtils.lerp(alt,targetAlt,smooth);}
 const local=1-THREE.MathUtils.smoothstep(alt,.004,.045),global=THREE.MathUtils.smoothstep(alt,.006,.14),localArrival=1-THREE.MathUtils.smoothstep(alt,.0019,.009);
 camera.position.copy(geo(lon,lat,1+alt));north.copy(geo(lon,lat+90));camera.up.copy(north);camera.lookAt(geo(lon,lat));const w=host.clientWidth,h=host.clientHeight,mobile=w<700;camera.setViewOffset(w,h,mobile?0:-w*.17,mobile?(selected?h*.17:-h*.035):0,w,h);camera.near=Math.max(.0000004,alt*.002);camera.far=65;camera.updateProjectionMatrix();
 land.material.uniforms.opacity.value=global*.85;coast.material.uniforms.opacity.value=global*.65;lights.material.uniforms.opacity.value=global*1.12;coastLines.material instanceof THREE.LineBasicMaterial&&(coastLines.material.opacity=global*options.threads*.24);(borders.material as THREE.LineBasicMaterial).opacity=options.borders?global*.15:0;edgeM.uniforms.opacity.value=global;
 if(cityStars)cityStars.material.uniforms.opacity.value=local*.95;if(cityCoast)cityCoast.material.uniforms.opacity.value=local*.62;if(streetLines)(streetLines.material as THREE.LineBasicMaterial).opacity=local*options.threads*.36;if(regional)(regional.material as THREE.LineBasicMaterial).opacity=local*.25;if(peopleCloud)peopleCloud.material.uniforms.opacity.value=localArrival*1.35;
 if(storyCloud)storyCloud.material.uniforms.opacity.value=localArrival;if(storyLines){(storyLines.material as THREE.LineBasicMaterial).opacity=localArrival*.75;storyLines.visible=!!selected;}
 for(const c of clouds){const u=c.material.uniforms;c.points.visible=u.opacity.value>.001&&(c!==storyCloud||!!selected);u.time.value=time;u.motion.value=options.motion?1:0;u.glow.value=options.glow;u.zoomFactor.value=c===background?1:Math.min(1.45,Math.pow(2.1/Math.max(alt,.3),.14))*(mobile&&global>.5?.6:1);if(c===land)c.points.geometry.setDrawRange(0,Math.floor(c.count*options.density));}
 camera.updateMatrixWorld();if(frameCount%2===0){placeLabel('singapore',1.30,103.85,stage==='orbit');for(const s of stories)placeLabel(s.id,s.lat,s.lon,stage==='city'&&!selected);for(let i=0;i<3;i++){const p=selected?.places[i];placeLabel('place-'+i,p?.lat||0,p?.lon||0,stage==='city'&&!!p);}}
 renderer.render(scene,camera);if(now-lastCoordinate>500){callbacks.coordinates(lat,wrap(lon));lastCoordinate=now;}
 if(!flight&&frameCount>60&&sampleFrames<150){totalFrame+=dt;sampleFrames++;if(sampleFrames===150&&totalFrame/sampleFrames>.034&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);for(const c of clouds)c.material.uniforms.pixelRatio.value=1;resize();}}
 raf=requestAnimationFrame(frame);
 }
 function visibility(){if(document.hidden){cancelAnimationFrame(raf);}else{lastTime=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}}document.addEventListener('visibilitychange',visibility);
 callbacks.ready();raf=requestAnimationFrame(frame);
 return {descend:async()=>{if(flight)return;try{await ensureCity();if(disposed)return;clearStory();fly(1.2965,103.851,.0018,'city');}catch(e){if(!signal.aborted)callbacks.error('Singapore could not load. Your Earth is still here; try entering again.');throw e;}},orbit:()=>{if(flight)return;clearStory();fly(19,95,homeAltitude(),'orbit');},zoom,rotate,select,configure:(o)=>{options=o;lastInteraction=performance.now();},dispose:destroy};
}
