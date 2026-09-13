import * as THREE from 'three';
import type { EvidenceScene, Coordinate } from '../evidence/types';

const NS = 'http://www.w3.org/2000/svg';
const element = <K extends keyof SVGElementTagNameMap>(name: K, attributes: Record<string, string> = {}) => {
  const node = document.createElementNS(NS, name);
  Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
};
/** Geographic overlay, projected through the very same camera as the stellar Earth. */
export function createEarthEvidenceOverlay(host: HTMLElement, position: (coordinate: Coordinate, elevationM?: number) => THREE.Vector3) {
  const svg = element('svg', { 'aria-label': 'Geographic evidence traces; dashed crossings are schematic', role: 'img' });
  Object.assign(svg.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'hidden', zIndex: '2' });
  host.appendChild(svg);
  let scene: EvidenceScene | null = null;
  let traces: { path: SVGPathElement; trace: EvidenceScene['traces'][number] }[] = [];
  let labels: { group: SVGGElement; text: SVGTextElement; label: EvidenceScene['labels'][number]; index: number }[] = [];
  function set(next: EvidenceScene) {
    scene = next; svg.replaceChildren(); svg.dataset.revision = String(next.revision);
    traces = next.traces.map(trace => {
      const path = element('path', { 'data-evidence-id':trace.id, fill: 'none', stroke: trace.color, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: '.94', ...(trace.schematic ? { 'stroke-dasharray': '6 4' } : {}) });
      svg.appendChild(path); return { path, trace };
    });
    labels = next.labels.map((label, index) => {
      const group = element('g', { 'data-evidence-label-id':label.id });
      const circle = element('circle', { r: label.role === 'value' ? '0' : '3.5', fill: label.color, stroke: '#061018', 'stroke-width': '2' });
      const isValue = label.role === 'value';
      const text = element('text', { x: isValue ? '0' : '10', y: isValue ? '-20' : index % 2 ? '-12' : '20', fill: label.color, 'font-size': isValue ? '13' : '11', 'font-family': 'system-ui, sans-serif', 'font-weight': isValue ? '600' : '400', 'text-anchor': isValue ? 'middle' : 'start', 'paint-order': 'stroke', stroke: '#03070b', 'stroke-width': '4', 'stroke-linejoin': 'round' });
      if(isValue){const parts=label.text.split(' · ');parts.forEach((part,i)=>{const line=element('tspan',{x:'0',dy:i?'15':'0'});line.textContent=part;text.appendChild(line);});}else text.textContent=label.text;
      group.appendChild(circle); group.appendChild(text); svg.appendChild(group); return { group, text, label, index };
    });
  }
  function update(camera: THREE.PerspectiveCamera) {
    if (!scene) return;
    const w = host.clientWidth, h = host.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const project = (coordinate: Coordinate, elevationM?: number) => {
      const v = position(coordinate, elevationM);
      if (v.dot(camera.position.clone().sub(v)) <= 0) return null;
      v.project(camera);
      return v.z > 1 || v.z < -1 ? null : [(v.x * .5 + .5) * w, (-v.y * .5 + .5) * h];
    };
    for (const { path, trace } of traces) {
      let d = '', pen = false;
      trace.coordinates.forEach((coordinate, i) => { const p = project(coordinate, trace.elevationsM?.[i]); if (!p) { pen = false; return; } d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)} `; pen = true; });
      path.setAttribute('d', d);
    }
    const occupied:{left:number;right:number;top:number;bottom:number}[]=[];
    for (const { group, text, label, index } of [...labels].sort((a,b)=>Number(b.label.role==='value')-Number(a.label.role==='value'))) {
      const p = project(label.coordinate, label.elevationM);
      const visible = p && p[0] > 10 && p[0] < w - 10 && p[1] > 60 && p[1] < h - 50;
      group.style.display = visible ? '' : 'none';
      if (p && visible) {
        group.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})`);
        const isValue=label.role==='value', parts=isValue?label.text.split(' · '):[label.text];
        const textWidth=Math.min(w-24,Math.max(...parts.map(part=>part.length))*(isValue?7:5.7));
        const center=isValue?Math.max(textWidth/2+12,Math.min(w-textWidth/2-12,p[0])):Math.max(12,Math.min(w-textWidth-12,p[0]+10));
        const dx=center-p[0];let dy=isValue?-45:index%2?-12:20;
        const left=isValue?center-textWidth/2:center,right=left+textWidth,height=isValue?30:14;
        for(let attempt=0;attempt<6;attempt++){
          const top=p[1]+dy-12,bottom=top+height;
          if(!occupied.some(box=>left<box.right+6&&right>box.left-6&&top<box.bottom+5&&bottom>box.top-5))break;
          dy+=isValue?-18:18;
        }
        text.setAttribute('x',String(dx));text.setAttribute('y',String(dy));
        text.querySelectorAll('tspan').forEach(line=>line.setAttribute('x',String(dx)));
        occupied.push({left,right,top:p[1]+dy-12,bottom:p[1]+dy-12+height});
      }
    }
  }
  return { set, update, clear: () => { if (scene) svg.replaceChildren(); scene = null; }, dispose: () => svg.remove() };
}
