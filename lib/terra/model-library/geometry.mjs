import * as THREE from 'three';
import {makeAngkorParticles} from './assets/angkor-particles.ts';
import java from './assets/java-profile.json' with { type: 'json' };
import {validateRecipe,validateGraph} from './library.mjs';
export const TONES={gold:[.95,.74,.4],ivory:[1,.94,.76],blue:[.35,.62,.96],violet:[.73,.57,1],dim:[.2,.29,.37]};
let seed=1;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function hash(s){let h=7;for(const c of s)h=Math.imul(h,31)+c.charCodeAt(0);return h>>>0;}
function sample(shape,size){
 const [w,h,d]=size,angle=random()*Math.PI*2;let x,y,z;
 if(shape==='box'){
  const axis=Math.floor(random()*3),edge=random()<.62;x=(random()-.5)*w;y=(random()-.5)*h;z=(random()-.5)*d;
  if(axis===0)x=(random()<.5?-.5:.5)*w;if(axis===1)y=(random()<.5?-.5:.5)*h;if(axis===2)z=(random()<.5?-.5:.5)*d;
  if(edge){if(axis!==0)x=(random()<.5?-.5:.5)*w;else z=(random()<.5?-.5:.5)*d;}
 }else if(shape==='ellipsoid'){const yy=random()*2-1,r=Math.sqrt(1-yy*yy);x=Math.cos(angle)*r*w/2;y=yy*h/2;z=Math.sin(angle)*r*d/2;}
 else if(shape==='torus'){const b=random()*Math.PI*2,t=Math.min(h,w*.4,d*.4)/2;x=(w/2-t+t*Math.cos(b))*Math.cos(angle);y=t*Math.sin(b);z=(d/2-t+t*Math.cos(b))*Math.sin(angle);}
 else{const f=random();y=(f-.5)*h;const r=shape==='cone'?1-f:1;x=Math.cos(angle)*w/2*r;z=Math.sin(angle)*d/2*r;}
 return [x,y,z];
}
export function compileGraph(input){const graph=validateGraph(input),positions=[],colors=[],orders=[];const minX=graph.values[0][0],maxX=graph.values.at(-1)[0];const minY=Math.min(0,...graph.values.map(p=>p[1])),maxY=Math.max(0,...graph.values.map(p=>p[1]));const span=maxY-minY||1;
 const map=([x,y])=>[(x-minX)/(maxX-minX)*8-4,(y-minY)/span*3.8+.12,0],zero=map([minX,0])[1];seed=319;
 const add=(p,c,t)=>{positions.push(...p);colors.push(...c);orders.push(t);};
 graph.values.forEach((v,i)=>{const p=map(v),c=v[1]>=0?TONES.gold:TONES.blue,t=i/graph.values.length*.8;
 if(i<graph.values.length-1){const next=map(graph.values[i+1]);for(let j=0;j<20;j++)add([p[0]+(next[0]-p[0])*j/20,p[1]+(next[1]-p[1])*j/20,0],TONES.ivory,t);}
 if(graph.type==='profile'||i%4===0)for(let j=0;j<(graph.type==='bars'?220:35);j++)add([p[0]+(random()-.5)*.1,zero+(p[1]-zero)*random(),(random()-.5)*(graph.type==='bars'?.14:.02)],c,t);
 });for(let x=-4;x<=4;x+=.025)add([x,zero,0],TONES.dim,0);
 return {positions,colors,orders,map,zero,extent:{minX,maxX,minY,maxY},graph};
}
export function compileModel(raw,createPoints,releasePoints,options={}){
 const began=performance.now(),group=new THREE.Group(),materials=new Map(),items=[],labels=[];let pointCount=0;
 const add=(id,label,p,c,o,motion=null)=>{const pts=createPoints(p,c,o);group.add(pts);items.push({pts,motion,origin:pts.position.clone()});if(!materials.has(id))materials.set(id,{label,points:[]});materials.get(id).points.push(pts);pointCount+=p.length/3;return pts;};
 if(raw.special==='angkor'){
  const arr=makeAngkorParticles(),segments=[['moat','Moat',1400],['causeway','Causeway',820],['galleries','Galleries',3240],['terraces','Terraces',2400],['towers','Five towers',5500]];let offset=0;
  for(const [id,label,count]of segments){const p=[],c=[],o=[];for(let i=offset*6;i<(offset+count)*6;i+=6){p.push(arr[i]*4,arr[i+1]*4,arr[i+2]*4);c.push(...TONES.gold.map(x=>x*arr[i+3]));o.push(Math.min(.85,arr[i+1]));}add(id,label,p,c,o);offset+=count;}
 }else if(raw.special==='java'){
  const graph=compileGraph({type:options.graphType??'bars',values:java.points.map(p=>[p.distanceKm,p.elevationM]),xLabel:'Distance south',yLabel:'Elevation',xUnit:'km',yUnit:'m',source:java.source});add('terrain','Elevation',graph.positions,graph.colors,graph.orders);
  labels.push({text:'JAVA · 6° S',pos:[-4,-.3,0]},{text:'INDIAN OCEAN · 12° S',pos:[2.5,-.3,0]},{text:'Sea level',pos:[-4.7,graph.zero,0]},{text:'+984 m',pos:graph.map([java.highest.distanceKm,984]).map((v,i)=>i===1?v+.2:v)},{text:'−5,361 m',pos:graph.map([java.lowest.distanceKm,-5361]).map((v,i)=>i===1?v-.2:v)});
 }else{
  const recipe=validateRecipe(raw);for(let index=0;index<recipe.parts.length;index++){
   const part=recipe.parts[index];seed=hash(part.id+index);const positions=[],colors=[],orders=[],v=new THREE.Vector3(),rotation=new THREE.Euler(...part.rotation),count=Math.min(Math.floor(18000/recipe.parts.length),Math.max(100,Math.round((part.size[0]+part.size[1]+part.size[2])*100)));
   for(let j=0;j<count;j++){v.set(...sample(part.shape,part.size)).applyEuler(rotation).add(new THREE.Vector3(...part.position));positions.push(v.x,v.y,v.z);colors.push(...TONES[part.tone]);orders.push(Math.min(.85,index/recipe.parts.length*.6+Math.max(0,v.y)*.05));}
   const pts=add(part.id,part.label,positions,colors,orders,part.motion);if(part.motion?.kind==='rotate'){const pivot=new THREE.Vector3(...part.motion.pivot);pts.geometry.translate(-pivot.x,-pivot.y,-pivot.z);pts.position.copy(pivot);items.at(-1).origin.copy(pivot);}
  }
 }
 let focused=null;return {group,labels,pointCount,buildMs:performance.now()-began,parts:[...materials].map(([id,d])=>({id,label:d.label})),focus(id){focused=id;},update(elapsed,moving=true){for(const [id,d]of materials)for(const pts of d.points){pts.material.uniforms.reveal.value=moving?elapsed/1.8:1;pts.material.uniforms.opacity.value=focused?(focused===id?1.6:.25):1;}
 for(const {pts,motion:m,origin}of items){if(!m||!moving)continue;const t=elapsed*m.speed;if(m.kind==='rotate')pts.rotation[m.axis]=t;if(m.kind==='translate')pts.position[m.axis]=origin[m.axis]+Math.sin(t)*m.amplitude;if(m.kind==='lift'){const cycle=(t%(Math.PI*2));pts.position.y=origin.y+Math.max(0,Math.sin(cycle))*1.2;pts.position[m.axis]=origin[m.axis]-m.amplitude*(.5-.5*Math.cos(cycle));}if(m.kind==='pulse')pts.scale.setScalar(1+.06*m.amplitude*Math.sin(t));}},dispose(){for(const {pts}of items)releasePoints(pts);group.removeFromParent();}};
}
