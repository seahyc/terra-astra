/** A reduced-detail, 2D projection of the same scene when WebGL is unavailable. */
import * as THREE from 'three';
export class CanvasStarRenderer {
 readonly domElement=document.createElement('canvas');
 outputColorSpace=THREE.SRGBColorSpace;
 private ctx:CanvasRenderingContext2D;
 private ratio=1;private width=1;private height=1;private clear='#03070b';
 private sprites=new Map<string,HTMLCanvasElement>();private matrix=new THREE.Matrix4();
 readonly isFallback=true;
 constructor(){const ctx=this.domElement.getContext('2d',{alpha:false});if(!ctx)throw new Error('Canvas unavailable');this.ctx=ctx;}
 setPixelRatio(r:number){this.ratio=Math.min(r,1.3);this.setSize(this.width,this.height);}
 getPixelRatio(){return this.ratio;}
 setClearColor(hex:number,_alpha:number){this.clear='#'+hex.toString(16).padStart(6,'0');}
 setSize(w:number,h:number){this.width=w;this.height=h;this.domElement.width=Math.round(w*this.ratio);this.domElement.height=Math.round(h*this.ratio);this.domElement.style.width=w+'px';this.domElement.style.height=h+'px';}
 dispose(){this.sprites.clear();}
 private sprite(color:string){let s=this.sprites.get(color);if(s)return s;s=document.createElement('canvas');s.width=s.height=32;const c=s.getContext('2d')!;const g=c.createRadialGradient(16,16,0,16,16,16);g.addColorStop(0,'#ffffff');g.addColorStop(.08,color);g.addColorStop(.16,color+'cc');g.addColorStop(.35,color+'35');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,32,32);this.sprites.set(color,s);return s;}
 render(scene:THREE.Scene,camera:THREE.PerspectiveCamera){
 const ctx=this.ctx,w=this.width,h=this.height;ctx.setTransform(this.ratio,0,0,this.ratio,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.fillStyle=this.clear;ctx.fillRect(0,0,w,h);
 this.matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);const m=this.matrix.elements,cp=camera.position;
 const project=(x:number,y:number,z:number)=>{const q=m[3]*x+m[7]*y+m[11]*z+m[15];if(q<=0)return null;const px=(m[0]*x+m[4]*y+m[8]*z+m[12])/q,py=(m[1]*x+m[5]*y+m[9]*z+m[13])/q;if(px< -1.2||px>1.2||py< -1.2||py>1.2)return null;return [(px*.5+.5)*w,(-py*.5+.5)*h];};
 const drawPoints=(o:THREE.Points,background=false)=>{if(!o.visible)return;const mat=o.material as THREE.ShaderMaterial,u=mat.uniforms;if(!u?.opacity||u.opacity.value<.003)return;const a=o.geometry.getAttribute('position'),b=o.geometry.getAttribute('brightness'),sz=o.geometry.getAttribute('starSize'),ph=o.geometry.getAttribute('phase');if(!a||!b||!sz)return;const tint='#'+(u.tint.value as THREE.Color).getHexString(),sprite=this.sprite(tint);const count=Math.min(a.count,o.geometry.drawRange.count);const step=Math.max(1,Math.ceil(count/(background?350:5000)));ctx.globalCompositeOperation='lighter';
 for(let i=0;i<count;i+=step){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);if(!background&&x*cp.x+y*cp.y+z*cp.z<x*x+y*y+z*z)continue;const p=project(x,y,z);if(!p)continue;const tw=1+(u.motion.value?Math.sin(u.time.value*.65+ph.getX(i))*.06:0);const size=sz.getX(i)*u.zoomFactor.value*(2.6+u.glow.value*.7);ctx.globalAlpha=Math.min(1,b.getX(i)*u.opacity.value*tw*.95);ctx.drawImage(sprite,p[0]-size/2,p[1]-size/2,size,size);}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';};
 for(const o of scene.children)if(o instanceof THREE.Points)drawPoints(o,true);
 // Occlude distant stars with the actual projected silhouette of the globe.
 const d=cp.length(),f=h/(2*Math.tan(camera.fov*Math.PI/360)),radius=f/Math.sqrt(d*d-1),center=new THREE.Vector3().project(camera);const cx=(center.x*.5+.5)*w,cy=(-center.y*.5+.5)*h;
 ctx.fillStyle='#020609';if(radius>w*5){ctx.fillRect(0,0,w,h);}else{ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#46667524';ctx.lineWidth=.8;ctx.stroke();}
 scene.traverse(o=>{if(!(o instanceof THREE.LineSegments)||!o.visible)return;const mat=o.material as THREE.LineBasicMaterial;if(mat.opacity<.003)return;const a=o.geometry.getAttribute('position');const step=Math.max(1,Math.ceil(a.count/12000))*2;ctx.beginPath();ctx.strokeStyle='#'+mat.color.getHexString();ctx.globalAlpha=mat.opacity;ctx.lineWidth=.65;for(let i=0;i<a.count-1;i+=step){const x=a.getX(i),y=a.getY(i),z=a.getZ(i);if(x*cp.x+y*cp.y+z*cp.z<x*x+y*y+z*z)continue;const p=project(x,y,z),q=project(a.getX(i+1),a.getY(i+1),a.getZ(i+1));if(p&&q){ctx.moveTo(p[0],p[1]);ctx.lineTo(q[0],q[1]);}}ctx.stroke();ctx.globalAlpha=1;});
 for(const group of scene.children)if(group instanceof THREE.Group)group.traverse(o=>{if(o instanceof THREE.Points)drawPoints(o);});
 }
}
