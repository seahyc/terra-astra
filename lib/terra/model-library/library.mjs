import turbine from './turbine.json' with { type: 'json' };
export const DEMOS = [
 {id:'wind-turbine',title:'Wind turbine',question:'How does a wind turbine turn wind into electricity?',anchor:null,hint:'Approved generated conceptual rotor, tower and generator; geometry validated, not a surveyed turbine.',patterns:[/\bwind\s+(turbine|generator)s?\b/i]},
 {id:'angkor',title:'Angkor Wat',question:'Why does Angkor Wat have five towers?',anchor:{latitude:13.4125,longitude:103.867,name:'Angkor Wat'},hint:'Five towers, concentric galleries and terraces, causeway and moat.',patterns:[/\bangkor\b/i]},
 {id:'java',title:'Java → ocean',question:'How far does Java’s landscape drop into the ocean?',anchor:{latitude:-9,longitude:112.922,name:'Java transect'},hint:'121 supplied NOAA elevation samples along 112.922°E; highest984m,lowest−5361m,range6345m. Smoothed section, not summit or deepest trench.',patterns:[/\bjava\b.*\b(ocean|trench|landscape|mountain|depth|drop)\b/i,/\b(ocean|trench|landscape|depth)\b.*\bjava\b/i]},
 {id:'port',title:'Container terminal',question:'How does Singapore move so many shipping containers?',anchor:{latitude:1.26,longitude:103.84,name:'Singapore'},hint:'Singapore terminal: quay cranes transfer containers between ships and the quay. Terminal vehicles carry them to storage stacks; trucks serve landside transport, and transshipment transfers containers between vessels. The model shows a ship, crane and yard. Do not add rail transport or operational counts.',patterns:[/\b(quay|shipping containers?|container terminal|cargo containers?)\b/i,/\bsingapore\b.*\b(shipping|port|cargo)\b/i]},
 {id:'datacentre',title:'Inside AI',question:'What happens inside a data centre when I ask an AI a question?',anchor:null,hint:'Conceptual AI facility: compute racks, networking, electrical power and cooling. Request flow is distinct from power and cooling.',patterns:[/\bdata\s*(cent(?:er|re)s?)\b/i,/\bserver racks?\b/i]},
 {id:'manhattan',title:'Manhattan grid',question:'Why do Manhattan’s streets form a grid?',anchor:{latitude:40.74,longitude:-73.99,name:'Manhattan'},hint:'Conceptual comparison of planned rectangular street blocks and older irregular street patterns; no surveyed building heights.',patterns:[/\b(manhattan|new york|nyc)\b.*\b(grid|street|blocks?)\b/i]},
];
export function matchLibrary(question){return DEMOS.find(d=>d.patterns.some(re=>re.test(question)))??null;}
export const publicLibrary=()=>DEMOS.map(({patterns,...d})=>d);
const part=(id,label,shape,position,size,tone='gold',rotation=[0,0,0],motion=null)=>({id,label,shape,position,size,tone,rotation,motion});
export function libraryRecipe(id){
 if(id==='wind-turbine')return {...validateRecipe(turbine),id,source:'library'};
 const d=DEMOS.find(d=>d.id===id);if(!d)throw new Error('Unknown library model');
 const parts=[];
 if(id==='port'){
 parts.push(part('quay','Quay','box',[0,.15,-2.1],[7,.3,2.6],'dim'));
 parts.push(part('hull','Ship hull','ellipsoid',[0,.4,.8],[6.8,.85,1.65],'gold'));
 parts.push(part('deck','Deck','box',[0,.7,.8],[5.7,.15,1.4],'gold'));
 parts.push(part('bridge','Bridge','box',[2.25,1.25,.8],[.55,1.1,1.3],'ivory'));
 for(let x=0;x<7;x++)for(let z=0;z<2;z++)for(let y=0;y<2;y++)parts.push(part('containers','Containers','box',[-2+x*.59,.95+y*.34,.44+z*.67],[.53,.3,.58],y?'violet':'blue'));
 for(const x of [-.9,.9])parts.push(part('crane','Crane legs','box',[x,1.9,-1.55],[.14,3.6,.14],'ivory'));
 parts.push(part('crane','Crane beam','box',[0,3.55,-.6],[2,.16,3.1],'ivory'));
 parts.push(part('cable','Cable','cylinder',[0,2.4,.3],[.015,2.1,.015],'ivory'));
 parts.push(part('cargo','Container transfer','box',[0,1.5,.35],[.52,.3,.6],'gold',[0,0,0],{kind:'lift',axis:'z',speed:.6,amplitude:1.8,pivot:[0,0,0]}));
 for(let x=0;x<6;x++)parts.push(part('yard','Yard stacks','box',[-2+x*.8,.5,-2.5],[.65,.7,.8],'blue'));
 }
 if(id==='datacentre'){
 parts.push(part('floor','Floor','box',[0,.05,0],[7,.1,4.5],'dim'));
 for(let x=0;x<5;x++)for(let z=0;z<2;z++){
  parts.push(part('racks','Compute racks','box',[-2+x,1,-.9+z*1.8],[.55,1.8,.7],'gold'));
  for(let y=0;y<6;y++)parts.push(part('servers','Server trays','box',[-2+x,.3+y*.27,-.9+z*1.8+.36],[.45,.045,.025],'ivory'));
 }
 parts.push(part('network','Network switch','box',[0,2.4,0],[4.7,.2,.25],'violet'));
 for(let x=0;x<5;x++)parts.push(part('request','Request signal','ellipsoid',[-2+x,2.15,0],[.08,.08,.08],'violet',[0,0,0],{kind:'translate',axis:'y',speed:1.3,amplitude:.75,pivot:[0,0,0]}));
 for(const x of [-3,3]){parts.push(part('cooling','Cooling unit','box',[x,.9,0],[.5,1.6,2.6],'blue'));parts.push(part('cooling','Cooling flow','torus',[x,1,0],[.65,.1,.65],'blue',[0,0,Math.PI/2],{kind:'rotate',axis:'x',speed:1,amplitude:1,pivot:[x,1,0]}));}
 parts.push(part('power','Power supply','box',[0,.6,2.6],[2,.95,.6],'gold'));
 }
 if(id==='manhattan'){
 // Deliberately schematic blocks, not a fabricated survey or building-height dataset.
 for(let x=0;x<6;x++)for(let z=0;z<9;z++)parts.push(part('grid','Planned blocks','box',[.1+x*.51,.16,-2.7+z*.62],[.34,.28,.45],'gold'));
 const irregular=[[-3.1,-2.3,.2],[-2.3,-2.4,-.3],[-1.5,-2.15,.4],[-3.1,-1.2,-.3],[-2.2,-1.4,.4],[-1.3,-.9,-.4],[-3,-.1,.15],[-2.1,-.2,-.3],[-1.2,.3,.5],[-3,1.1,-.4],[-2.2,1,.2],[-1.2,1.5,-.15],[-2.8,2.3,.4],[-1.8,2.5,-.3]];
 for(const [x,z,r]of irregular)parts.push(part('older','Older street pattern','box',[x,.16,z],[.62,.28,.63],'blue',[0,r,0]));
 parts.push(part('broadway','Diagonal avenue','box',[1.55,.02,0],[.045,.035,6],'violet',[0,.4,0]));
 }
 return {id,title:d.title,anchor:d.anchor,source:'library',special:id==='angkor'||id==='java'?id:null,parts};
}
const vec=(v,min,max)=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(x)&&x>=min&&x<=max);
export function validateRecipe(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid recipe');
 if(typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>100)throw new Error('Invalid recipe title');
 if(!Array.isArray(raw.parts)||raw.parts.length<1||raw.parts.length>100)throw new Error('Recipe must contain 1–100 parts');
 const parts=raw.parts.map(p=>{
  if(!p||!['box','ellipsoid','cylinder','cone','torus'].includes(p.shape)||!vec(p.position,-12,12)||!vec(p.size,.005,12)||!vec(p.rotation,-7,7)||typeof p.id!=='string'||p.id.length>40||typeof p.label!=='string'||p.label.length>80||!['gold','ivory','blue','violet','dim'].includes(p.tone))throw new Error('Invalid model part');
  if(p.motion!==null&&p.motion!==undefined){const m=p.motion;if(!['rotate','translate','pulse','lift'].includes(m.kind)||!['x','y','z'].includes(m.axis)||!vec(m.pivot,-12,12)||!Number.isFinite(m.speed)||m.speed<0||m.speed>3||!Number.isFinite(m.amplitude)||m.amplitude<0||m.amplitude>4)throw new Error('Invalid part animation');}
  return {id:p.id,label:p.label,shape:p.shape,position:[...p.position],size:[...p.size],rotation:[...p.rotation],tone:p.tone,motion:p.motion?{...p.motion,pivot:[...p.motion.pivot]}:null};
 });
 const anchor=raw.anchor??null;if(anchor&&(!Number.isFinite(anchor.latitude)||Math.abs(anchor.latitude)>80||!Number.isFinite(anchor.longitude)||Math.abs(anchor.longitude)>180||typeof anchor.name!=='string'||anchor.name.length>80))throw new Error('Invalid anchor');
 return {title:raw.title,parts,anchor,source:'procedural',special:null};
}
export function validateGraph(raw){
 if(!raw||!['bars','profile'].includes(raw.type)||!Array.isArray(raw.values)||raw.values.length<2||raw.values.length>500)throw new Error('Invalid graph');
 if(!['xLabel','yLabel','xUnit','yUnit','source'].every(k=>typeof raw[k]==='string'&&raw[k].length<=200))throw new Error('Missing graph units/source');
 if(!raw.values.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))throw new Error('Non-finite graph data');
 if(raw.values.some((p,i)=>i&&p[0]<=raw.values[i-1][0]))throw new Error('Graph x must increase');
 return raw;
}

// Special models resolve exclusively from checked-in data, never client-supplied graph values.
export function validateLibraryModel(raw){
 if(raw?.source==='library'&&DEMOS.some(d=>d.id===raw.id))return libraryRecipe(raw.id);
 const recipe=validateRecipe(raw);return {...recipe,id: typeof raw.id==='string'&&/^generated-[a-f0-9]{20}$/.test(raw.id)?raw.id:'generated-preview'};
}
