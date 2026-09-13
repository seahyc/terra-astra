import * as THREE from 'three';
import { stories, type Story } from './stories';
import { CanvasStarRenderer } from './canvas-renderer';
import { cityFeather, flightProgress, lightLevels, revealProgress, memoryLight, cityScreenBudget, recallFocus } from './choreography';
import { scintillationGLSL } from './scintillation';
import type { PersonalPlaces, TransformationState } from './personal-contract';
import { openingFrame, transformationEase, transformationGLSL } from './transformation';
import { personalAstra, personalArc, personalCamera, personalGeography } from './personal-rendering';
import { reliefRadius, sampleElevation, spatialBlend, spatialVertexGLSL, studyRegions, type EarthView, type StudyRegion } from './spatial';
export type Stage = 'orbit'|'descending'|'city'|'ascending';
export type ViewOptions = { glow:number; shimmer:number; depth:boolean; threads:number; density:number; borders:boolean; motion:boolean };
export type Engine = { transform:(open:boolean)=>void; personal:(places:PersonalPlaces|null)=>void; descend:()=>Promise<void>; orbit:()=>void; zoom:(factor:number)=>void; rotate:(dx:number,dy:number)=>void; select:(id:string|null)=>void; configure:(o:ViewOptions)=>void; storyInset:(pixels:number)=>void; view:(view:EarthView)=>void; region:(region:StudyRegion)=>void; dispose:()=>void };
type Callbacks={transformation?:(state:TransformationState)=>void;personalSettled?:()=>void;stage:(s:Stage)=>void;ready:()=>void;error:(s:string,fatal?:boolean)=>void;coordinates:(lat:number,lon:number)=>void;interact:()=>void;arrival:(storyId:string|null)=>void;view?:(view:EarthView)=>void};
type Cloud={points:THREE.Points;material:THREE.ShaderMaterial;count:number};
const R=Math.PI/180;
export function geo(lon:number,lat:number,r=1){const a=lon*R,b=lat*R;return new THREE.Vector3(r*Math.cos(b)*Math.sin(a),r*Math.sin(b),r*Math.cos(b)*Math.cos(a));}
const clamp=THREE.MathUtils.clamp;
const wrap=(x:number)=>((x+180)%360+360)%360-180;
const vertex=`attribute float brightness;attribute float starSize;attribute float phase;attribute float revealAt;
uniform float time;uniform float motion;uniform float pixelRatio;uniform float zoomFactor;uniform float sizeScale;uniform float reveal;uniform float sparkle;uniform float signature;
varying float vB;varying float vG;varying float vP;
${scintillationGLSL}
${transformationGLSL}
${spatialVertexGLSL}
void main(){vec3 world=openedPosition(spatialPosition(position));vec4 p=modelViewMatrix*vec4(world,1.0);gl_Position=projectionMatrix*p;vec3 light=scintillate(time,phase,motion,sparkle,signature);vB=brightness*light.x*smoothstep(revealAt,revealAt+.18,reveal)*spatialVisibility(world);vG=light.y;vP=phase;gl_PointSize=clamp(starSize*pixelRatio*4.1*zoomFactor*sizeScale*light.z*mix(1.0,clamp(cameraDistance/max(.01,-p.z),.55,2.6),max(spatial*depthMix,opening)),.75*pixelRatio,40.0*pixelRatio);}`;
const fragment=`uniform vec3 tint;uniform float opacity;uniform float glow;uniform float soft;varying float vB;varying float vG;varying float vP;
void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float core=exp(-r*r*205.0);float halo=exp(-r*r*24.0)*.27*glow;float ray=exp(-abs(p.x)*120.0)*exp(-abs(p.y)*12.0)+exp(-abs(p.y)*120.0)*exp(-abs(p.x)*12.0);float flare=ray*(.035*step(.96,fract(vP*13.37))+.42*vG);float a=mix(core+halo+flare,exp(-r*r*14.0)*.18*glow,soft)*vB*opacity;vec3 color=mix(tint,vec3(1.0),core*.38+min(vG,.8)*.2);gl_FragColor=vec4(color,a);}`;
export async function createEarth(host:HTMLDivElement,markers:HTMLDivElement,callbacks:Callbacks,signal:AbortSignal):Promise<Engine>{
 let renderer:THREE.WebGLRenderer|CanvasStarRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'high-performance'});}catch{renderer=new CanvasStarRenderer();}
 const fallback=renderer instanceof CanvasStarRenderer;host.dataset.renderer=fallback?'canvas':'webgl';
 renderer.setClearColor(0x03070b);renderer.outputColorSpace=THREE.SRGBColorSpace;
 const pixelRatio=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.35:1.7);renderer.setPixelRatio(pixelRatio);
 renderer.domElement.setAttribute('aria-label','Rotate Earth with the arrow keys or drag. Use plus and minus to zoom.');renderer.domElement.tabIndex=0;renderer.domElement.style.touchAction='none';host.appendChild(renderer.domElement);
 const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(42,1,.000001,100);const earth=new THREE.Group();scene.add(earth);
 const geometries:THREE.BufferGeometry[]=[];const materials:THREE.Material[]=[];const clouds:Cloud[]=[];
 const homeAltitude=()=>{const w=host.clientWidth,h=host.clientHeight,r=Math.min(w*(w<700?.44:.30),h*.38);return Math.max(2.15,Math.sqrt(1+Math.pow(h/(2*Math.tan(21*R)*r),2))-1);};
 let disposed=false,raf=0,stage:Stage='orbit',lat=19,lon=95,alt=homeAltitude(),targetLat=lat,targetLon=lon,targetAlt=alt,selected:Story|null=null,remembered:Story|null=null;
 let remembering=false,settledAt:number|null=null,arrivalSent=false,stillFrames=0,graphicsLost=false;
 let viewMode:EarthView='globe',region:StudyRegion='indonesia',tilt=0,targetTilt=0,cut=0,depth=1;
 let openProgress=0,openTarget=false,lastTransformation=-Infinity,personalSettledAt:number|null=null,personalArrivalSent=false;
 const openFrame=new THREE.Matrix3();openingFrame(lon,lat,openFrame);
 let morph:{from:number;to:number;start:number;duration:number;prelude:number;fromLat:number;fromLon:number;toLat:number;toLon:number}|null=null;
 let personalPlaces:PersonalPlaces|null=null,personalCloud:Cloud|null=null,personalLines:THREE.LineSegments|null=null;
 let personalEarth:THREE.Vector3[]=[],personalStars:THREE.Vector3[]=[],personalLineEarth=new Float32Array(0),personalLineAstra=new Float32Array(0);
 const personalProjected=[new THREE.Vector3(),new THREE.Vector3(),new THREE.Vector3()];
 const openAltitude=()=>homeAltitude()*1.62;
 const cutNormal=geo(202,-5),cutFacing=geo(112,-5);let elevation=new Int16Array(0);
 let options:ViewOptions={glow:1.15,shimmer:1.1,depth:true,threads:.55,density:.85,borders:false,motion:!matchMedia('(prefers-reduced-motion: reduce)').matches};
 let flight:{start:number;duration:number;fromLat:number;fromLon:number;fromAlt:number;toLat:number;toLon:number;toAlt:number;end:Stage;anchorLat:number;anchorLon:number}|null=null;
 let cityReady=false;let cityLoading:Promise<void>|null=null;let lastInteraction=0;let lastTime=performance.now(),time=0,lastCoordinate=0,frameCount=0,totalFrame=0,sampleFrames=0,diagnosticStart=performance.now(),diagnosticFrames=0;
 const setStage=(s:Stage)=>{stage=s;callbacks.stage(s);};
 function geometry(positions:number[]|Float32Array){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometries.push(g);return g;}
 function cloud(data:Float32Array,tint:string,feather=false){const count=data.length/6;const p=new Float32Array(count*3),b=new Float32Array(count),s=new Float32Array(count),ph=new Float32Array(count);for(let i=0;i<count;i++){p.set(data.subarray(i*6,i*6+3),i*3);b[i]=data[i*6+3]*(feather?cityFeather(Math.atan2(p[i*3],p[i*3+2])/R,Math.atan2(p[i*3+1],Math.hypot(p[i*3],p[i*3+2]))/R):1);s[i]=data[i*6+4];ph[i]=data[i*6+5];}
 const g=geometry(p);g.setAttribute('brightness',new THREE.BufferAttribute(b,1));g.setAttribute('starSize',new THREE.BufferAttribute(s,1));g.setAttribute('phase',new THREE.BufferAttribute(ph,1));g.setAttribute('revealAt',new THREE.BufferAttribute(new Float32Array(count),1));
 const m=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms:{tint:{value:new THREE.Color(tint)},opacity:{value:1},glow:{value:1},time:{value:0},motion:{value:1},pixelRatio:{value:renderer.getPixelRatio()},zoomFactor:{value:1},sizeScale:{value:1},reveal:{value:1},sparkle:{value:1},signature:{value:-1},opening:{value:0},openingFrame:{value:openFrame},personalStar:{value:0},spatial:{value:0},depthMix:{value:0},cutaway:{value:0},cutNormal:{value:cutNormal},cutFacing:{value:cutFacing},cameraDistance:{value:3},soft:{value:0}},transparent:true,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending});materials.push(m);const points=new THREE.Points(g,m);points.frustumCulled=false;earth.add(points);const c={points,material:m,count};clouds.push(c);return c;}
 function lines(data:Float32Array|number[],color:string,feather=false){const m=new THREE.LineBasicMaterial({color,transparent:true,opacity:.2,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(m);const o=new THREE.LineSegments(geometry(data),m);o.frustumCulled=false;earth.add(o);if(feather){const a=o.geometry.getAttribute('position'),colors=new Float32Array(a.count*3);for(let i=0;i<a.count;i++){const w=cityFeather(Math.atan2(a.getX(i),a.getZ(i))/R,Math.atan2(a.getY(i),Math.hypot(a.getX(i),a.getZ(i)))/R);colors.set([w,w,w],i*3);}o.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));m.vertexColors=true;}return o;}
 async function load(name:string){const res=await fetch('/data/'+name+'.bin',{signal});if(!res.ok)throw new Error('Could not load '+name);const b=await res.arrayBuffer();if(b.byteLength%4)throw new Error('Invalid geographic data');return new Float32Array(b);}
 function spatialCloud(data:Float32Array,tint:string){const c=cloud(data,tint);c.material.uniforms.spatial.value=1;c.points.userData.spatial=true;c.points.userData.sampleBudget=22000;c.points.userData.spatialExposure=1.8;return c;}
 function lift(data:Float32Array){const out=data.slice();for(let i=0;i<out.length;i+=6){const v=new THREE.Vector3(out[i],out[i+1],out[i+2]);const h=sampleElevation(elevation,1440,720,Math.atan2(v.x,v.z)/R,Math.atan2(v.y,Math.hypot(v.x,v.z))/R);v.normalize().multiplyScalar(reliefRadius(Math.max(0,h))+.00004);out.set(v.toArray(),i);}return out;}
 const sphereG=new THREE.SphereGeometry(1,96,64);geometries.push(sphereG);const sphereM=new THREE.MeshBasicMaterial({color:0x020609});materials.push(sphereM);const sphere=new THREE.Mesh(sphereG,sphereM);earth.add(sphere);
 // A very restrained atmospheric edge; its surface fades away during descent.
 const edgeG=new THREE.SphereGeometry(1.001,80,48);geometries.push(edgeG);const edgeM=new THREE.ShaderMaterial({uniforms:{opacity:{value:1}},vertexShader:`varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.0);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,fragmentShader:`varying vec3 n;varying vec3 v;uniform float opacity;void main(){float f=pow(1.0-max(0.0,dot(normalize(n),normalize(v))),5.0);gl_FragColor=vec4(.20,.40,.51,f*.13*opacity);}`,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});materials.push(edgeM);earth.add(new THREE.Mesh(edgeG,edgeM));
 // Sparse, deterministic distant stars keep Earth as the brightest object.
 let seed=901;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const bg:number[]=[];
 for(let i=0;i<650;i++){const v=geo(random()*360-180,Math.asin(random()*2-1)/R,30);bg.push(...v.toArray(),.18+random()*.34,.6+random()*.85,random()*6.28);}const background=cloud(new Float32Array(bg),'#a3bfce');earth.remove(background.points);scene.add(background.points);
 let reliefLand:Cloud,reliefOcean:Cloud,body:Cloud,interior:Cloud,haze:Cloud,halo:Cloud;
 let land:Cloud,coast:Cloud,lights:Cloud,coastLines:THREE.LineSegments,borders:THREE.LineSegments;
 let cityStars:Cloud|null=null,cityCoast:Cloud|null=null,streetLines:THREE.LineSegments|null=null,regional:THREE.LineSegments|null=null;
 let storyCloud:Cloud|null=null;let memoryCloud:Cloud|null=null;let storyLines:THREE.LineSegments|null=null;
 let peopleCloud:Cloud|null=null;let storyStarted=0,focus=0,storyInset=0;
 const smoothCameraOffset=new THREE.Vector2();
 let previousHomeAltitude=homeAltitude();
 function resize(){stillFrames=0;const w=host.clientWidth,h=host.clientHeight;if(!w||!h)return;const nextHomeAltitude=homeAltitude();if(stage==='orbit'&&viewMode==='globe'&&!flight&&!morph){const scale=nextHomeAltitude/previousHomeAltitude;alt*=scale;targetAlt*=scale;}if(flight?.end==='orbit')flight.toAlt=nextHomeAltitude;previousHomeAltitude=nextHomeAltitude;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(selected&&storyInset)setStoryInset(storyInset);}
 const observer=new ResizeObserver(resize);observer.observe(host);resize();
 const destroy=()=>{if(disposed)return;disposed=true;cancelAnimationFrame(raf);observer.disconnect();host.removeEventListener('pointerdown',down);host.removeEventListener('pointermove',move);host.removeEventListener('pointerup',up);host.removeEventListener('pointercancel',cancel);host.removeEventListener('wheel',wheel);renderer.domElement.removeEventListener('keydown',key);renderer.domElement.removeEventListener('webglcontextlost',contextLost);document.removeEventListener('visibilitychange',visibility);for(const g of geometries)g.dispose();for(const m of materials)m.dispose();renderer.dispose();renderer.domElement.remove();};
 const contextLost=(e:Event)=>{e.preventDefault();graphicsLost=true;callbacks.error('Graphics became unavailable. Restart the journey to gather the stars again.',true);cancelAnimationFrame(raf);};renderer.domElement.addEventListener('webglcontextlost',contextLost);
 try{
 const gridRequest=fetch('/data/relief-grid.bin',{signal}).then(async res=>{if(!res.ok)throw new Error('Relief unavailable');const buffer=await res.arrayBuffer();if(buffer.byteLength!==1440*720*2)throw new Error('Invalid relief grid');return new Int16Array(buffer);});
 const [data,grid]=await Promise.all([Promise.all(['land','coast','lights','coast-lines','borders','relief-land','relief-ocean','stellar-body','stellar-interior','stellar-haze','stellar-halo'].map(load)),gridRequest]);
 if(signal.aborted){destroy();throw new DOMException('Aborted','AbortError');}elevation=grid;
 land=spatialCloud(lift(data[0]),'#a8cfde');coast=spatialCloud(lift(data[1]),'#d6e5e9');lights=spatialCloud(lift(data[2]),'#eed7a8');coastLines=lines(data[3],'#789dab');borders=lines(data[4],'#89a8b5');
 for(const c of [land,coast,lights]){c.points.userData.sampleBudget=5000;c.points.userData.spatialExposure=1;}
 reliefLand=spatialCloud(data[5],'#b6d7df');reliefOcean=spatialCloud(data[6],'#629da9');body=spatialCloud(data[7],'#9ab3cd');interior=spatialCloud(data[8],'#baa4c9');haze=spatialCloud(data[9],'#7796b5');halo=spatialCloud(data[10],'#c7dfea');haze.material.uniforms.soft.value=1;
 scene.userData.spatial={depth:1,cut:0,cutNormal,cutFacing};
 }catch(e){destroy();throw e;}
 function setView(mode:EarthView){if(stage!=='orbit'||flight||morph||openProgress>0)return;viewMode=mode;targetTilt=mode==='oblique'?68:0;targetAlt=mode==='oblique'?.62:homeAltitude();if(mode!=='globe'){const r=studyRegions[region];targetLat=r.lat;targetLon=lon+wrap(r.lon-lon);}if(mode==='cutaway'){cutFacing.copy(geo(targetLon,targetLat));cutNormal.copy(geo(targetLon+90,0));}lastInteraction=performance.now();stillFrames=0;callbacks.interact();callbacks.view?.(mode);}
 function setRegion(id:StudyRegion){if(stage!=='orbit'||flight||morph||openProgress>0)return;region=id;const r=studyRegions[id];targetLat=r.lat;targetLon=lon+wrap(r.lon-lon);cutFacing.copy(geo(r.lon,r.lat));cutNormal.copy(geo(r.lon+90,0));lastInteraction=performance.now();stillFrames=0;callbacks.interact();}
 function resetView(){viewMode='globe';targetTilt=0;callbacks.view?.('globe');}

 function fly(toLat:number,toLon:number,toAlt:number,end:Stage){resetView();lastInteraction=performance.now();stillFrames=0;flight={start:performance.now(),duration:options.motion?6800:0,fromLat:lat,fromLon:lon,fromAlt:alt,toLat,toLon:lon+wrap(toLon-lon),toAlt,end,anchorLat:end==='orbit'&&remembered?remembered.places.reduce((n,p)=>n+p.lat,0)/remembered.places.length:lat,anchorLon:end==='orbit'&&remembered?remembered.places.reduce((n,p)=>n+p.lon,0)/remembered.places.length:lon};setStage(end==='city'?'descending':'ascending');}
 async function ensureCity(){if(cityReady)return;if(cityLoading)return cityLoading;cityLoading=(async()=>{const data=await Promise.all(['singapore-stars','singapore-streets','regional-lines','singapore-coast'].map(load));if(disposed||signal.aborted)return;// Stable random order makes draw-range detail changes spatially even.
 const raw=data[0],order=Array.from({length:raw.length/6},(_,i)=>i).sort((a,b)=>(Math.imul(a+1,2654435761)>>>0)-(Math.imul(b+1,2654435761)>>>0));const sorted=new Float32Array(raw.length);order.forEach((i,j)=>sorted.set(raw.subarray(i*6,i*6+6),j*6));
 cityStars=cloud(sorted,'#b9d0de',true);streetLines=lines(data[1],'#7a9bab',true);cityStars.points.userData.fallbackExposure=2.4;streetLines.userData.fallbackExposure=2;regional=lines(data[2],'#aac6cd');cityCoast=cloud(data[3],'#decca4');const people:number[]=[];for(const s of stories)people.push(...geo(s.lon,s.lat,1.000024).toArray(),1.3,5,6.1);peopleCloud=cloud(new Float32Array(people),'#f9dfb2');cityReady=true;})();try{await cityLoading;}catch(e){cityLoading=null;throw e;}}
 function release(g:THREE.BufferGeometry,m:THREE.Material){g.dispose();m.dispose();const gi=geometries.indexOf(g),mi=materials.indexOf(m);if(gi>=0)geometries.splice(gi,1);if(mi>=0)materials.splice(mi,1);}
 function setStoryInset(pixels:number){stillFrames=0;storyInset=pixels;if(selected&&host.clientWidth<700){const available=Math.max(120,host.clientHeight-pixels-115);const span=Math.max(...selected.places.map(p=>p.lat))-Math.min(...selected.places.map(p=>p.lat));targetAlt=Math.max(.0019,span*R*host.clientHeight/(2*Math.tan(21*R)*available)*1.18);}}
 function clearStory(){stillFrames=0;if(storyCloud){storyCloud.points.visible=false;}if(storyLines)storyLines.visible=false;selected=null;}
 function select(id:string|null){if(stage!=='city'||flight||morph)return;if(!id){clearStory();return;}const s=stories.find(x=>x.id===id);if(!s)return;clearStory();selected=s;remembered=s;storyStarted=performance.now();targetLat=(Math.min(...s.places.map(p=>p.lat))+Math.max(...s.places.map(p=>p.lat)))/2;targetLon=(Math.min(...s.places.map(p=>p.lon))+Math.max(...s.places.map(p=>p.lon)))/2;targetAlt=host.clientWidth<700?.0019:.00125;if(storyInset)setStoryInset(storyInset);lastInteraction=performance.now();stillFrames=0;const pts:number[]=[],links:number[]=[];for(const p of s.places)pts.push(...geo(p.lon,p.lat,1.00003).toArray(),1.4,4.1,6.15);
 for(let i=1;i<s.places.length;i++){const a=s.places[i-1],b=s.places[i];for(let k=0;k<32;k++){const t=k/32,u=(k+1)/32;links.push(...geo(THREE.MathUtils.lerp(a.lon,b.lon,t),THREE.MathUtils.lerp(a.lat,b.lat,t),1.00004).toArray(),...geo(THREE.MathUtils.lerp(a.lon,b.lon,u),THREE.MathUtils.lerp(a.lat,b.lat,u),1.00004).toArray());}}
 // Release each old story from the scene and disposal registry when switching lives.
 if(storyCloud){earth.remove(storyCloud.points);const idx=clouds.indexOf(storyCloud);if(idx>=0)clouds.splice(idx,1);release(storyCloud.points.geometry,storyCloud.material);}
 if(storyLines){earth.remove(storyLines);release(storyLines.geometry,storyLines.material as THREE.Material);}
 if(memoryCloud){earth.remove(memoryCloud.points);const idx=clouds.indexOf(memoryCloud);if(idx>=0)clouds.splice(idx,1);release(memoryCloud.points.geometry,memoryCloud.material);}
 const memoryAnchor=geo(s.places.reduce((n,p)=>n+p.lon,0)/s.places.length,s.places.reduce((n,p)=>n+p.lat,0)/s.places.length,1.00004);
 memoryCloud=cloud(new Float32Array([...memoryAnchor.toArray(),1.4,5,6.15]),'#ffe4b3');memoryCloud.material.uniforms.opacity.value=0;
 storyCloud=cloud(new Float32Array(pts),'#ffe4b3');const signature=stories.indexOf(s)*2.1;storyCloud.material.uniforms.signature.value=signature;memoryCloud.material.uniforms.signature.value=signature;
 storyLines=lines(links,'#f0c885');storyLines.geometry.setDrawRange(0,0);const revealAt=storyCloud.points.geometry.getAttribute('revealAt');for(let i=0;i<revealAt.count;i++)revealAt.setX(i,i*.25);}
 function notifyTransformation(force=false){const now=performance.now();if(!force&&now-lastTransformation<120)return;lastTransformation=now;callbacks.transformation?.({phase:morph?(openTarget?'opening':'reforming'):openProgress===1?'astra':'terra',progress:openProgress,busy:!!morph});}
 function setTransformation(open:boolean){
   if(disposed||stage!=='orbit'||flight||open===openTarget&&(!!morph||openProgress===(open?1:0)))return;
   const now=performance.now();openTarget=open;personalArrivalSent=false;personalSettledAt=null;lastInteraction=now;stillFrames=0;
   // Keep a live reversal continuous: never resample positions or replace the frame.
   if(open&&openProgress===0&&!morph){openingFrame(lon,lat,openFrame);if(personalPlaces)rebuildPersonal();}
   const destination=!open&&personalPlaces?personalCamera(personalPlaces):{lat,lon};
   morph={from:openProgress,to:open?1:0,start:now,duration:Math.max(1,5400*Math.abs((open?1:0)-openProgress)),prelude:open&&alt<homeAltitude()*.75?1000:0,fromLat:lat,fromLon:lon,toLat:destination.lat,toLon:lon+wrap(destination.lon-lon)};
   targetLat=lat;targetLon=lon;targetAlt=open?openAltitude():homeAltitude();resetView();clearStory();remembering=false;settledAt=null;arrivalSent=true;notifyTransformation(true);
 }
 function releasePersonal(){
   if(personalCloud){earth.remove(personalCloud.points);const index=clouds.indexOf(personalCloud);if(index>=0)clouds.splice(index,1);release(personalCloud.points.geometry,personalCloud.material);personalCloud=null;}
   if(personalLines){earth.remove(personalLines);release(personalLines.geometry,personalLines.material as THREE.Material);personalLines=null;}
 }
 function rebuildPersonal(){
   releasePersonal();if(!personalPlaces)return;
   personalEarth=personalGeography(personalPlaces);personalStars=personalAstra(personalPlaces,openFrame);
   const data=new Float32Array(18);for(let i=0;i<3;i++)data.set([...personalEarth[i].toArray(),1.65,5.0,1.4+i*1.6],i*6);
   personalCloud=cloud(data,'#ffdc99');personalCloud.points.userData.personal=true;personalCloud.points.renderOrder=20;personalCloud.material.depthTest=false;personalCloud.material.uniforms.personalStar.value=1;personalCloud.material.uniforms.signature.value=1.3;
   personalCloud.points.geometry.setAttribute('astraPosition',new THREE.Float32BufferAttribute(personalStars.flatMap(p=>p.toArray()),3));
   const earthPositions:number[]=[],astraPositions:number[]=[],sample=new THREE.Vector3();
   for(let edge=0;edge<3;edge++){const next=(edge+1)%3;for(let k=0;k<48;k++)for(const t of [k/48,(k+1)/48]){
     personalArc(personalEarth[edge],personalEarth[next],t,sample);earthPositions.push(sample.x,sample.y,sample.z);
     sample.copy(personalStars[edge]).lerp(personalStars[next],t);astraPositions.push(sample.x,sample.y,sample.z);
   }}
   personalLineEarth=new Float32Array(earthPositions);personalLineAstra=new Float32Array(astraPositions);
   personalLines=lines(personalLineEarth.slice(),'#e9bf78');personalLines.userData.personal=true;personalLines.renderOrder=19;(personalLines.material as THREE.LineBasicMaterial).depthTest=false;
 }
 function setPersonal(places:PersonalPlaces|null){
   if(disposed)return;personalPlaces=places;personalSettledAt=null;personalArrivalSent=false;stillFrames=0;lastInteraction=performance.now();rebuildPersonal();
   if(!places){personalEarth=[];personalStars=[];for(let i=0;i<3;i++)placePersonalLabel(i,false);}
 }
 const pointer=new Map<number,{x:number;y:number}>();let dragged=false,initial={x:0,y:0},pinch=0;
 function rotate(dx:number,dy:number){if(flight||morph)return;callbacks.interact();lastInteraction=performance.now();stillFrames=0;const scale=stage==='city'?targetAlt*2*Math.tan(21*R)/(R*host.clientHeight):.18*Math.min(1,targetAlt/1.4);targetLon-=dx*scale;targetLat=clamp(targetLat+dy*scale,-80,80);if(stage==='city'){targetLon=clamp(targetLon,103.810,103.890);targetLat=clamp(targetLat,1.272,1.330);}}
 function zoom(f:number){if(flight||morph)return;callbacks.interact();lastInteraction=performance.now();stillFrames=0;targetAlt=clamp(targetAlt*f,stage==='city'?.00055:openProgress>0?openAltitude()*.78:viewMode==='oblique'?.32:.42,stage==='city'?.004:homeAltitude()*(openProgress>0?2.5:1.8));}
 function down(e:PointerEvent){if(flight||morph||!(e.target instanceof HTMLCanvasElement))return;renderer.domElement.focus({preventScroll:true});pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);initial={x:e.clientX,y:e.clientY};dragged=false;lastInteraction=performance.now();stillFrames=0;if(pointer.size===2){const p=[...pointer.values()];pinch=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}}
 function move(e:PointerEvent){const old=pointer.get(e.pointerId);if(!old)return;const dx=e.clientX-old.x,dy=e.clientY-old.y;pointer.set(e.pointerId,{x:e.clientX,y:e.clientY});if(Math.hypot(e.clientX-initial.x,e.clientY-initial.y)>3)dragged=true;if(pointer.size===2){const p=[...pointer.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(dist>0&&pinch>0)zoom(pinch/dist);pinch=dist;}else rotate(dx,dy);}
 function up(e:PointerEvent){pointer.delete(e.pointerId);pinch=0;if(host.hasPointerCapture(e.pointerId))host.releasePointerCapture(e.pointerId);void dragged;}
 function cancel(e:PointerEvent){pointer.delete(e.pointerId);pinch=0;}
 function wheel(e:WheelEvent){e.preventDefault();zoom(Math.exp(clamp(e.deltaY,-150,150)*.002));}
 function key(e:KeyboardEvent){if(e.key.startsWith('Arrow')){e.preventDefault();rotate(e.key==='ArrowLeft'?-35:e.key==='ArrowRight'?35:0,e.key==='ArrowUp'?-35:e.key==='ArrowDown'?35:0);}if(e.key==='+'||e.key==='='){e.preventDefault();zoom(.82);}if(e.key==='-'){e.preventDefault();zoom(1.22);}}
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);host.addEventListener('wheel',wheel,{passive:false});renderer.domElement.addEventListener('keydown',key);
 const markerElements=new Map<string,HTMLElement>();const proj=new THREE.Vector3();
 function placeLabel(id:string,lat:number,lon:number,show:boolean){let el=markerElements.get(id);if(!el||!el.isConnected){el=markers.querySelector<HTMLElement>('[data-star="'+id+'"]')||undefined;if(el)markerElements.set(id,el);}if(!el)return;const world=geo(lon,lat,1.00005);const front=world.dot(camera.position.clone().sub(world))>0;proj.copy(world).project(camera);const x=(proj.x*.5+.5)*host.clientWidth,y=(-proj.y*.5+.5)*host.clientHeight;el.hidden=!(show&&front&&proj.z<1&&x>20&&x<host.clientWidth-20&&y>75&&y<host.clientHeight-125);if(!el.hidden){el.style.transform=`translate(${x}px,${y}px)`;const labelWidth=el.querySelector<HTMLElement>('.marker-label')?.offsetWidth||120;el.dataset.labelSide=x+labelWidth+30>host.clientWidth-(host.clientWidth<700?65:25)?'left':'right';}}
 function placePersonalLabel(index:number,show:boolean){
   const id='personal-'+index;let el=markerElements.get(id);if(!el||!el.isConnected){el=markers.querySelector<HTMLElement>('[data-star="'+id+'"]')||undefined;if(el)markerElements.set(id,el);}if(!el)return;
   if(!show){el.hidden=true;return;}
   proj.copy(personalProjected[index]).project(camera);const x=(proj.x*.5+.5)*host.clientWidth,y=(-proj.y*.5+.5)*host.clientHeight;
   el.hidden=!(proj.z<1&&x>12&&x<host.clientWidth-12&&y>60&&y<host.clientHeight-55);
   if(!el.hidden){el.style.transform=`translate(${x}px,${y}px)`;el.dataset.labelSide=x>host.clientWidth*.65?'left':'right';}
 }
 const north=new THREE.Vector3();
 function frame(now:number){if(disposed||graphicsLost||document.hidden)return;if(!options.motion&&stillFrames>2&&!flight&&!morph&&personalSettledAt===null){raf=requestAnimationFrame(frame);return;}if(fallback&&now-lastTime<50){raf=requestAnimationFrame(frame);return;}const dt=Math.min((now-lastTime)/1000,.06);lastTime=now;time+=dt;frameCount++;stillFrames++;
 if(flight){const t=flight.duration?clamp((now-flight.start)/flight.duration,0,1):1;const p=flightProgress(t,flight.fromAlt,flight.toAlt,flight.end==='orbit',host.clientWidth/host.clientHeight);const recall=flight.end==='orbit'?recallFocus(t):0;const fromLat=THREE.MathUtils.lerp(flight.fromLat,flight.anchorLat,recall),fromLon=THREE.MathUtils.lerp(flight.fromLon,flight.anchorLon,recall);lat=THREE.MathUtils.lerp(fromLat,flight.toLat,p.turn);lon=THREE.MathUtils.lerp(fromLon,flight.toLon,p.turn);alt=p.altitude;if(t>=1){targetLat=lat;targetLon=lon;targetAlt=alt;const end=flight.end;flight=null;if(end==='orbit')settledAt=now;setStage(end);}}
 else{if(stage==='orbit'&&viewMode==='globe'&&!morph&&openProgress===0&&!personalPlaces&&(!remembering||settledAt!==null&&now-settledAt>6500)&&options.motion&&pointer.size===0&&now-lastInteraction>4000)targetLon+=dt*.65;const smooth=options.motion?1-Math.exp(-dt*5):1;lat=THREE.MathUtils.lerp(lat,targetLat,smooth);lon=THREE.MathUtils.lerp(lon,targetLon,smooth);alt=THREE.MathUtils.lerp(alt,targetAlt,smooth);}
 if(morph){
   const elapsed=options.motion?Math.max(0,(now-morph.start-morph.prelude)/morph.duration):1;const t=clamp(elapsed,0,1);
   openProgress=THREE.MathUtils.lerp(morph.from,morph.to,t);
   if(!openTarget){const turn=transformationEase(t);lat=THREE.MathUtils.lerp(morph.fromLat,morph.toLat,turn);lon=THREE.MathUtils.lerp(morph.fromLon,morph.toLon,turn);targetLat=lat;targetLon=lon;}
   if(t>=1){openProgress=morph.to;morph=null;if(openProgress===0&&personalPlaces)personalSettledAt=now;notifyTransformation(true);}else notifyTransformation();
 }
 const opened=transformationEase(openProgress);
 const levels=lightLevels(alt),global=levels.global;const ease=options.motion?1-Math.exp(-dt*3):1;tilt=THREE.MathUtils.lerp(tilt,targetTilt,ease);cut=THREE.MathUtils.lerp(cut,viewMode==='cutaway'&&options.depth?1:0,ease);depth=THREE.MathUtils.lerp(depth,spatialBlend(alt,options.depth),ease);scene.userData.spatial={depth,cut,cutNormal,cutFacing};sphere.visible=cut<.02&&opened<.995;sphere.scale.setScalar((1-depth*.30)*(1-opened));scene.userData.coreRadius=sphere.visible?(1-depth*.30)*(1-opened):0;scene.userData.opening=openProgress;focus=THREE.MathUtils.lerp(focus,selected?1:0,options.motion?1-Math.exp(-dt*3.2):1);const cityDim=1-focus*.64;const reveal=revealProgress((now-storyStarted)/1000,options.motion);
 north.copy(geo(lon,lat+90));camera.position.copy(geo(lon,lat)).addScaledVector(geo(lon,lat),alt*Math.cos(tilt*R)).addScaledVector(north,-alt*Math.sin(tilt*R));camera.up.copy(north);camera.lookAt(geo(lon,lat));const w=host.clientWidth,h=host.clientHeight,mobile=w<700;const offsetY=mobile?(selected?(storyInset?Math.max(0,(storyInset-70)/2):h*.225):openProgress>0||personalPlaces?h*.14:viewMode==='cutaway'?h*.11:-h*.035):0;smoothCameraOffset.lerp(new THREE.Vector2(mobile?0:-w*.17,offsetY),frameCount===1||!options.motion?1:1-Math.exp(-dt*4));camera.setViewOffset(w,h,smoothCameraOffset.x,smoothCameraOffset.y,w,h);camera.near=Math.max(.0000004,alt*.002);camera.far=65;camera.updateProjectionMatrix();camera.updateMatrixWorld();
 // Project the actual places: the merge follows their visible separation at every viewport.
 let spread=0;if(remembering&&remembered){const places=remembered.places.map(p=>geo(p.lon,p.lat,1.00003).project(camera));for(let i=0;i<places.length;i++)for(let j=i+1;j<places.length;j++)spread=Math.max(spread,Math.hypot((places[i].x-places[j].x)*w/2,(places[i].y-places[j].y)*h/2));}
 const memory=memoryLight(spread,settledAt===null?null:(now-settledAt)/1000,options.motion);
 land.material.uniforms.opacity.value=global*.65*(1-depth*.8);coast.material.uniforms.opacity.value=global*.44*(1-depth*.2);lights.material.uniforms.opacity.value=global*1.12*(1-depth*.40);lights.material.uniforms.sizeScale.value=1-depth*.42;coast.material.uniforms.sizeScale.value=.82-depth*.16;(coastLines.material as THREE.LineBasicMaterial).opacity=global*options.threads*.10*(1-depth)*(1-opened);(borders.material as THREE.LineBasicMaterial).opacity=options.borders?global*.15*(1-cut)*(1-opened):0;edgeM.uniforms.opacity.value=global*(1-depth)*(1-opened);
 const quality=mobile?.45:.8;
 for(const c of [reliefLand,reliefOcean,body,interior])c.points.geometry.setDrawRange(0,Math.floor(c.count*quality*(c===reliefLand?options.density:1)));
 const nearDetail=clamp((1.5-alt)/.9,0,1);
 reliefLand.points.userData.sampleBudget=36000+nearDetail*50000;reliefOcean.points.userData.sampleBudget=60000+nearDetail*100000;
 reliefLand.material.uniforms.opacity.value=depth*(1.65-opened*.28);reliefOcean.material.uniforms.opacity.value=depth*(1.15-opened*.46);body.material.uniforms.opacity.value=depth*(1.30-opened*.55);interior.material.uniforms.opacity.value=depth*(.82+cut*1.65+opened*.15);haze.material.uniforms.opacity.value=depth*(.32+cut*.35+opened*.05);halo.material.uniforms.opacity.value=depth*(.82-opened*.22);
 if(cityStars){cityStars.material.uniforms.opacity.value=levels.city*.70*cityDim;cityStars.material.uniforms.sizeScale.value=levels.citySize;cityStars.points.geometry.setDrawRange(0,Math.floor(cityStars.count*levels.cityFraction*cityScreenBudget(w,h)));}
 if(cityCoast){cityCoast.material.uniforms.opacity.value=levels.coast*cityDim;cityCoast.material.uniforms.sizeScale.value=.60;}
 if(streetLines)(streetLines.material as THREE.LineBasicMaterial).opacity=levels.city*options.threads*.12*cityDim;
 if(regional)(regional.material as THREE.LineBasicMaterial).opacity=levels.regional*(.16+.12*(1-levels.city))*cityDim;
 if(peopleCloud)peopleCloud.material.uniforms.opacity.value=levels.people*1.55*(1-focus);
 if(storyCloud){storyCloud.material.uniforms.opacity.value=remembering?memory.places*1.4:levels.people*1.4;storyCloud.material.uniforms.reveal.value=remembering?1:reveal.stars;}
 if(memoryCloud){memoryCloud.material.uniforms.opacity.value=remembering?memory.glimmer*1.5:0;memoryCloud.material.uniforms.sizeScale.value=memory.size;}
 if(storyLines){(storyLines.material as THREE.LineBasicMaterial).opacity=(remembering?memory.places:levels.people)*.75;storyLines.visible=!!selected||remembering;const count=storyLines.geometry.getAttribute('position').count;storyLines.geometry.setDrawRange(0,2*Math.floor(count/2*(remembering?1:reveal.links)));}
 if(personalCloud){
   personalCloud.material.uniforms.opacity.value=stage==='orbit'?1.65:0;personalCloud.material.uniforms.sizeScale.value=1+opened*.16;
   for(let i=0;i<3;i++)personalProjected[i].copy(personalEarth[i]).lerp(personalStars[i],opened);
   if(personalLines){personalLines.visible=stage==='orbit';const a=personalLines.geometry.getAttribute('position') as THREE.BufferAttribute;const values=a.array as Float32Array;for(let i=0;i<values.length;i++)values[i]=personalLineEarth[i]+(personalLineAstra[i]-personalLineEarth[i])*opened;a.needsUpdate=true;(personalLines.material as THREE.LineBasicMaterial).opacity=.25+opened*.30;}
 }
 for(const c of clouds){const u=c.material.uniforms;u.opening.value=c.points.userData.spatial||c===personalCloud?openProgress:0;c.points.visible=u.opacity.value>.001&&(c!==storyCloud||!!selected||remembering);u.depthMix.value=depth;u.cutaway.value=cut;u.cameraDistance.value=camera.position.length();u.time.value=time;u.motion.value=options.motion?1:0;u.glow.value=options.glow;u.sparkle.value=options.shimmer*(c===background?.25:c===land?.8:1);u.zoomFactor.value=c===background?1:Math.min(1.45,Math.pow(2.1/Math.max(alt,.3),.14))*(mobile?1-global*.4:1);if(c===land)c.points.geometry.setDrawRange(0,Math.floor(c.count*options.density));}
 if(personalSettledAt!==null&&!personalArrivalSent&&!morph&&(!options.motion||now-personalSettledAt>=1100)&&Math.abs(alt-targetAlt)<.035){personalArrivalSent=true;personalSettledAt=null;callbacks.personalSettled?.();}
 if(settledAt!==null&&!arrivalSent&&(!options.motion||now-settledAt>=1400)){arrivalSent=true;callbacks.arrival(remembered?.id||null);}
 if(!options.motion||frameCount%2===0){placeLabel('singapore',1.30,103.85,stage==='orbit'&&viewMode==='globe'&&!morph&&openProgress===0&&!personalPlaces);for(const s of stories)placeLabel(s.id,s.lat,s.lon,stage==='city'&&!selected);for(let i=0;i<3;i++){const p=selected?.places[i];placeLabel('place-'+i,p?.lat||0,p?.lon||0,stage==='city'&&!!p&&reveal.stars>i*.25+.15);}}
 for(let i=0;i<3;i++)placePersonalLabel(i,!!personalPlaces&&stage==='orbit'&&openProgress>.72&&!morph);
 renderer.render(scene,camera);diagnosticFrames++;if(now-diagnosticStart>=1000){host.dataset.renderFps=(diagnosticFrames*1000/(now-diagnosticStart)).toFixed(1);host.dataset.renderFrames=String(frameCount);host.dataset.renderFrameMs=((now-diagnosticStart)/diagnosticFrames).toFixed(1);diagnosticStart=now;diagnosticFrames=0;}if(!options.motion||now-lastCoordinate>500){callbacks.coordinates(lat,wrap(lon));lastCoordinate=now;}
 if(!flight&&frameCount>60&&sampleFrames<150){totalFrame+=dt;sampleFrames++;if(sampleFrames===150&&totalFrame/sampleFrames>.034&&renderer.getPixelRatio()>1){renderer.setPixelRatio(1);for(const c of clouds)c.material.uniforms.pixelRatio.value=1;resize();}}
 raf=requestAnimationFrame(frame);
 }
 function visibility(){stillFrames=0;if(document.hidden||graphicsLost){cancelAnimationFrame(raf);}else{lastTime=performance.now();cancelAnimationFrame(raf);raf=requestAnimationFrame(frame);}}document.addEventListener('visibilitychange',visibility);
 callbacks.ready();notifyTransformation(true);raf=requestAnimationFrame(frame);
 return {transform:setTransformation,personal:setPersonal,descend:async()=>{if(flight||morph||openProgress>0)return;try{await ensureCity();if(disposed)return;setPersonal(null);clearStory();remembered=null;remembering=false;settledAt=null;arrivalSent=false;fly(1.2965,103.851,.0018,'city');}catch(e){if(!signal.aborted)callbacks.error('Singapore could not load. Your Earth is still here; try entering again.');throw e;}},orbit:()=>{if(flight||morph||stage!=='city')return;clearStory();remembering=!!remembered;settledAt=null;arrivalSent=false;fly(19,95,homeAltitude(),'orbit');},zoom,rotate,select,view:setView,region:setRegion,configure:(o)=>{options=o;if(flight&&!o.motion)flight.duration=0;lastInteraction=performance.now();stillFrames=0;},storyInset:setStoryInset,dispose:destroy};
}
