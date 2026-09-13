/** A reduced-detail, 2D projection of the same scene when WebGL is unavailable. */
import * as THREE from 'three';
import { openingPosition, transformationEase } from './transformation';
import { genesisPosition } from './genesis';
import { scintillation } from './scintillation';
export class CanvasStarRenderer {
 readonly domElement=document.createElement('canvas');
 outputColorSpace=THREE.SRGBColorSpace;
 private ctx:CanvasRenderingContext2D;
 private ratio=1;private width=1;private height=1;private clear='#03070b';
 private transformed=new THREE.Vector3();
 private sprites=new Map<string,HTMLCanvasElement>();private matrix=new THREE.Matrix4();
 readonly isFallback=true;
 constructor(){const ctx=this.domElement.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');this.ctx=ctx;}
 setPixelRatio(r:number){this.ratio=Math.min(r,1.3);this.setSize(this.width,this.height);}
 getPixelRatio(){return this.ratio;}
 setClearColor(hex:number){this.clear='#'+hex.toString(16).padStart(6,'0');}
 setSize(w:number,h:number){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}
 dispose(){this.sprites.clear();}
 private sprite(color:string,soft=false){const key=color+(soft?'soft':'star');let s=this.sprites.get(key);if(s)return s;s=document.createElement('canvas');s.width=s.height=32;const c=s.getContext('2d')!;const g=c.createRadialGradient(16,16,0,16,16,16);if(soft){g.addColorStop(0,color+'66');g.addColorStop(.3,color+'33');g.addColorStop(1,color+'00');}else{g.addColorStop(0,'#ffffff');g.addColorStop(.08,color);g.addColorStop(.16,color+'cc');g.addColorStop(.35,color+'35');g.addColorStop(1,color+'00');}c.fillStyle=g;c.fillRect(0,0,32,32);this.sprites.set(key,s);return s;}
 render(scene:THREE.Scene,camera:THREE.PerspectiveCamera){
 const ctx=this.ctx,w=this.width,h=this.height;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=this.clear;ctx.fillRect(0,0,w,h);
 this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const m=this.matrix.elements,cp=camera.position,view=camera.matrixWorldInverse.elements;
 const core=scene.userData.coreRadius??1,spatial=scene.userData.spatial,opening=scene.userData.opening??0,opened=transformationEase(opening);
 const visibility=(x:number,y:number,z:number,layer:boolean,shell=false)=>{
   const dx=x-cp.x,dy=y-cp.y,dz=z-cp.z,d=Math.hypot(dx,dy,dz),b=(cp.x*dx+cp.y*dy+cp.z*dz)/d;
   const occluder=shell?1:core,discriminant=b*b-cp.lengthSq()+occluder*occluder;
   if(occluder>0&&discriminant>0){const hit=-b-Math.sqrt(discriminant);if(hit>0&&hit<d-.00001)return 0;}
   if(!layer||!spatial)return 1;
   const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,(n+.008)/.016));return t*t*(3-2*t);};
   const cut=smooth(x*spatial.cutNormal.x+y*spatial.cutNormal.y+z*spatial.cutNormal.z)*smooth(x*spatial.cutFacing.x+y*spatial.cutFacing.y+z*spatial.cutFacing.z);
   const outer=b*b-cp.lengthSq()+1.12*1.12,entry=Math.max(0,-b-Math.sqrt(Math.max(0,outer)));
   const attenuation=(1-spatial.cut*cut*(1-opening))*Math.exp(-Math.max(0,d-entry)*((2.9-spatial.cut*1.5)*(1-opened)+.24*opened));
   return 1+(attenuation-1)*spatial.depth;
 };
 const project=(x:number,y:number,z:number)=>{const q=m[3]*x+m[7]*y+m[11]*z+m[15];if(q<=0)return null;const px=(m[0]*x+m[4]*y+m[8]*z+m[12])/q,py=(m[1]*x+m[5]*y+m[9]*z+m[13])/q;if(px< -1.2||px>1.2||py< -1.2||py>1.2)return null;return [(px*.5+.5)*w,(-py*.5+.5)*h];};
 const drawPoints=(o:THREE.Points,background=false)=>{if(!o.visible)return;const mat=o.material as THREE.ShaderMaterial,u=mat.uniforms;if(!u?.opacity||u.opacity.value<.003)return;const a=o.geometry.getAttribute('position'),b=o.geometry.getAttribute('brightness'),sz=o.geometry.getAttribute('starSize'),ph=o.geometry.getAttribute('phase'),revealAt=o.geometry.getAttribute('revealAt'),astra=o.geometry.getAttribute('astraPosition'),ids=o.geometry.getAttribute('particleId');if(!a||!b||!sz)return;const tint='#'+(u.tint.value as THREE.Color).getHexString(),sprite=this.sprite(tint,!!u.soft?.value);const count=Math.min(a.count,o.geometry.drawRange.count);const step=Math.max(1,Math.ceil(a.count/(background?350:o.userData.sampleBudget??(o.userData.fallbackExposure?12000:5000))));ctx.globalCompositeOperation='lighter';
 for(let i=0;i<count;i+=step){let x=a.getX(i),y=a.getY(i),z=a.getZ(i);if(o.userData.spatial){const r=Math.hypot(x,y,z),scale=(1.00002+(r-1.00002)*u.depthMix.value+(u.seaMotion?.value||0)*u.motion.value*.0012*Math.sin(x*31+z*19+u.time.value*.65)*Math.sin(y*23-u.time.value*.38)*u.depthMix.value)/r;x*=scale;y*=scale;z*=scale;}if(u.opening?.value>0){if(o.userData.personal&&astra){const t=transformationEase(u.opening.value);x+=(astra.getX(i)-x)*t;y+=(astra.getY(i)-y)*t;z+=(astra.getZ(i)-z)*t;}else{openingPosition(x,y,z,u.opening.value,u.openingFrame.value,this.transformed);x=this.transformed.x;y=this.transformed.y;z=this.transformed.z;}}if(u.genesisEnabled?.value&&u.genesis.value<1){genesisPosition(x,y,z,ids.getX(i),ph.getX(i),u.genesis.value,this.transformed);x=this.transformed.x;y=this.transformed.y;z=this.transformed.z;}const p=project(x,y,z);if(!p)continue;const visible=u.genesisEnabled?.value&&u.genesis.value<.78?1:background||o.userData.personal?1:visibility(x,y,z,!!o.userData.spatial,!!o.userData.shell);if(visible<.003)continue;const light=scintillation(u.time.value,ph.getX(i),!!u.motion.value,u.sparkle.value,u.signature.value);const perspective=o.userData.spatial||o.userData.personal?1+(Math.max(.55,Math.min(2.6,cp.length()/Math.max(.01,-(view[2]*x+view[6]*y+view[10]*z+view[14]))))-1)*Math.max(o.userData.spatial?u.depthMix.value:0,u.opening?.value??0):1;const size=(u.genesisEnabled?.value?u.genesisSize.value:1)*sz.getX(i)*u.zoomFactor.value*u.sizeScale.value*(2.8+u.glow.value*.7)*light.size*perspective;const t=Math.max(0,Math.min(1,(u.reveal.value-revealAt.getX(i))/.18)),reveal=t*t*(3-2*t);ctx.globalAlpha=Math.min(1,b.getX(i)*u.opacity.value*(u.genesisEnabled?.value?u.genesisExposure.value:1)*light.brightness*.95*reveal*visible*(o.userData.fallbackExposure||o.userData.spatialExposure||1));ctx.drawImage(sprite,p[0]-size/2,p[1]-size/2,size,size);
 // A few short diffraction rays give glints definition without brightening the whole map.
 if(!u.soft?.value&&light.glint>.12&&size>3){ctx.globalAlpha*=Math.min(.55,light.glint*.55);ctx.strokeStyle=tint;ctx.lineWidth=.55;const arm=size*(.32+light.glint*.12);ctx.beginPath();ctx.moveTo(p[0]-arm,p[1]);ctx.lineTo(p[0]+arm,p[1]);ctx.moveTo(p[0],p[1]-arm);ctx.lineTo(p[0],p[1]+arm);ctx.stroke();}}

 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';};
 for(const o of scene.children)if(o instanceof THREE.Points)drawPoints(o,true);
 // Occlude distant stars with the actual projected silhouette of the globe.
 const d=cp.length(),f=h/(2*Math.tan(camera.fov*Math.PI/360)),radius=core?f*core/Math.sqrt(d*d-core*core):0,center=new THREE.Vector3().project(camera);const cx=(center.x*.5+.5)*w,cy=(-center.y*.5+.5)*h;
 ctx.fillStyle='#020609';if(core>0){if(radius>w*5){ctx.fillRect(0,0,w,h);}else{ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#46667524';ctx.lineWidth=.8;ctx.stroke();}}
 scene.traverse(o=>{
   if(!(o instanceof THREE.LineSegments)||!o.visible)return;
   const mat=o.material as THREE.LineBasicMaterial;if(mat.opacity<.003)return;
   const a=o.geometry.getAttribute('position'),colors=o.geometry.getAttribute('color');
   const count=Math.min(a.count,o.geometry.drawRange.count),step=Math.max(1,Math.ceil(count/12000))*2;
   const paths=Array.from({length:colors?8:1},()=>new Path2D());
   for(let i=0;i<count-1;i+=step){
     const x=a.getX(i),y=a.getY(i),z=a.getZ(i);
     if(!o.userData.personal&&x*cp.x+y*cp.y+z*cp.z<x*x+y*y+z*z)continue;
     const weight=colors?(colors.getX(i)+colors.getX(i+1))/2:1;if(weight<.025)continue;
     const p=project(x,y,z),q=project(a.getX(i+1),a.getY(i+1),a.getZ(i+1));
     if(p&&q){const path=paths[Math.min(paths.length-1,Math.floor(weight*paths.length))];path.moveTo(p[0],p[1]);path.lineTo(q[0],q[1]);}
   }
   ctx.strokeStyle='#'+mat.color.getHexString();ctx.lineWidth=.65;
   paths.forEach((path,i)=>{ctx.globalAlpha=Math.min(1,mat.opacity*(i+1)/paths.length*(o.userData.fallbackExposure||1));ctx.stroke(path);});ctx.globalAlpha=1;
 });
 for(const group of scene.children)if(group instanceof THREE.Group)group.traverse(o=>{if(o instanceof THREE.Points)drawPoints(o);});
 }
}
