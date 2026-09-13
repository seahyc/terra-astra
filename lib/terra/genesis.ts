/** One deterministic deformation of the existing geographic particles; never a second engine. */
import * as THREE from 'three';
import type { GenesisPhase, GenesisState } from '../world/commands';
export const GENESIS_DURATION = 10800;
export const genesisSmooth = (t:number) => {const p=Math.max(0,Math.min(1,t));return p*p*(3-2*p);};
const ramp=(a:number,b:number,p:number)=>genesisSmooth((p-a)/(b-a));
export function genesisSeed(id:number,k:number){let x=(id^Math.imul(k,374761393))|0;x=Math.imul(x^(x>>>16),0x21f0aaad);x=Math.imul(x^(x>>>15),0x735a2d97);return Math.fround(((x^(x>>>15))>>>0)/4294967296);}
export function genesisState(progress:number):GenesisState{
 const p=Math.max(0,Math.min(1,progress));
 const phase:GenesisPhase=p>=1?'complete':p<.20?'core':p<.32?'compression':p<.355?'ignition':p<.52?'ejection':p<.87?'capture':'settlement';
 return {phase,progress:p,busy:p<1};
}
export function genesisLight(progress:number){
 const p=Math.max(0,Math.min(1,progress)),flash=Math.exp(-Math.pow((p-.344)/.009,2));
 return {exposure:(.16+.84*ramp(.36,.67,p))*(1+flash*2.8),size:.60+.40*ramp(.36,.74,p)+flash*.36,flash,settled:ramp(.82,1,p)};
}
/** Reusable output, exact home endpoint. id is a stable buffer index plus cloud offset. */
export function genesisPosition(x:number,y:number,z:number,id:number,phase:number,progress:number,out:THREE.Vector3){
 if(progress>=1)return out.set(x,y,z);
 const p=Math.max(0,progress),a=genesisSeed(id,1),b=genesisSeed(id,2),c=genesisSeed(id,3),az=a*Math.PI*2,ny=b*2-1,rad=Math.sqrt(Math.max(0,1-ny*ny));
 const compression=ramp(.20,.32,p),turn=p*(12+compression*19)*(a>.8?1:-1)+phase;
 const radius=(a>.80?.19+.12*c:.026+.115*Math.pow(c,1.3))*(1-compression*.52);
 const curl=.014*Math.sin(phase*3+p*47)*(1-compression*.4);
 const cx=Math.cos(az+turn)*rad*radius+curl*ny,cy=ny*radius+Math.sin(turn*.7+phase)*radius*.18,cz=Math.sin(az+turn)*rad*radius-curl*rad;
 const nx=Math.cos(az)*rad,nz=Math.sin(az)*rad,reach=1.30+.55*c;
 const ex=nx*reach,ey=ny*reach,ez=nz*reach;
 if(p<.355)return out.set(cx,cy,cz);
 if(p<.52){const t=ramp(.355,.52,p);return out.set(cx+(ex-cx)*t,cy+(ey-cy)*t,cz+(ez-cz)*t);}
 if(p<.87){const t=ramp(.52,.87,p),v=1-t;
 // Tangential handles turn radial bursts into a coherent geographic capture.
 const tx=-nz*.32,ty=Math.sin(phase)*.18,tz=nx*.32;
 return out.set(v*v*v*ex+3*v*v*t*(ex*1.05+tx)+3*v*t*t*(x*1.08-tx*.3)+t*t*t*x,v*v*v*ey+3*v*v*t*(ey*1.05+ty)+3*v*t*t*(y*1.08-ty*.3)+t*t*t*y,v*v*v*ez+3*v*v*t*(ez*1.05+tz)+3*v*t*t*(z*1.08-tz*.3)+t*t*t*z);}
 const residual=.018*Math.sin((p-.87)/.13*Math.PI*2)*Math.pow(1-(p-.87)/.13,2);
 return out.set(x+nx*residual,y+ny*residual,z+nz*residual);
}
/** Same path and constants as genesisPosition. No mutable particle simulation state. */
export const genesisGLSL=`
uniform float genesis;uniform float genesisEnabled;uniform float genesisExposure;uniform float genesisSize;attribute float particleId;attribute vec3 genesisSeed;
float genRamp(float a,float b,float p){float t=clamp((p-a)/(b-a),0.0,1.0);return t*t*(3.0-2.0*t);}
vec3 genesisPosition(vec3 home){
 if(genesisEnabled<.5||genesis>=1.0)return home;
 float p=max(0.0,genesis),a=genesisSeed.x,b=genesisSeed.y,c=genesisSeed.z;
 float az=a*6.28318530718,ny=b*2.0-1.0,rad=sqrt(max(0.0,1.0-ny*ny)),compression=genRamp(.20,.32,p);
 float turn=p*(12.0+compression*19.0)*(a>.8?1.0:-1.0)+phase;
 float radius=(a>.80?.19+.12*c:.026+.115*pow(c,1.3))*(1.0-compression*.52),curl=.014*sin(phase*3.0+p*47.0)*(1.0-compression*.4);
 vec3 core=vec3(cos(az+turn)*rad*radius+curl*ny,ny*radius+sin(turn*.7+phase)*radius*.18,sin(az+turn)*rad*radius-curl*rad);
 vec3 n=vec3(cos(az)*rad,ny,sin(az)*rad),burst=n*(1.30+.55*c);
 if(p<.355)return core;
 if(p<.52)return mix(core,burst,genRamp(.355,.52,p));
 if(p<.87){float t=genRamp(.52,.87,p),v=1.0-t;vec3 tangent=vec3(-n.z*.32,sin(phase)*.18,n.x*.32);return v*v*v*burst+3.0*v*v*t*(burst*1.05+tangent)+3.0*v*t*t*(home*1.08-tangent*.3)+t*t*t*home;}
 float t=(p-.87)/.13,residual=.018*sin(t*6.28318530718)*(1.0-t)*(1.0-t);return home+n*residual;
}`;
