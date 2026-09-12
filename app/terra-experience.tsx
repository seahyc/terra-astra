'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Minus, Plus, Pause, Play, SlidersHorizontal, X, Sparkles, Info } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Engine, Stage, ViewOptions } from '@/lib/terra/engine';
import { stories } from '@/lib/terra/stories';
import { currentVersion } from '@/lib/terra/releases';

const initialOptions:ViewOptions={glow:1,threads:.55,density:.85,borders:false,motion:true};
const formatCoordinate=(n:number,a:string,b:string)=>`${Math.abs(n).toFixed(2)}° ${n>=0?a:b}`;
export default function TerraExperience(){
 const host=useRef<HTMLDivElement>(null),markers=useRef<HTMLDivElement>(null),engine=useRef<Engine|null>(null),coordinate=useRef<HTMLSpanElement>(null);
 const [stage,setStage]=useState<Stage>('orbit'),[ready,setReady]=useState(false),[loadingCity,setLoadingCity]=useState(false),[error,setError]=useState(''),[options,setOptions]=useState<ViewOptions>(initialOptions),[selected,setSelected]=useState<string|null>(null),[returned,setReturned]=useState(false);
 const [exploring,setExploring]=useState(false),[expanded,setExpanded]=useState(false);
 const panelObserver=useRef<ResizeObserver|null>(null);
 const measureStory=useCallback((panel:HTMLDivElement|null)=>{panelObserver.current?.disconnect();if(!panel){engine.current?.storyInset(0);return;}const measure=()=>engine.current?.storyInset(panel.offsetHeight+(parseFloat(getComputedStyle(panel).bottom)||0));const observer=new ResizeObserver(measure);panelObserver.current=observer;observer.observe(panel);if(host.current)observer.observe(host.current);measure();},[]);
 const previousStage=useRef<Stage>('orbit');const story=stories.find(x=>x.id===selected);const inCity=stage==='city';const flying=stage==='descending'||stage==='ascending';
 useEffect(()=>{const controller=new AbortController();let instance:Engine|undefined;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const opts={...initialOptions,motion:!reduced};setOptions(opts);
  import('@/lib/terra/engine').then(({createEarth})=>{if(controller.signal.aborted||!host.current||!markers.current)return;return createEarth(host.current,markers.current,{ready:()=>setReady(true),stage:s=>{if(s==='orbit'&&previousStage.current==='ascending')setReturned(true);previousStage.current=s;setStage(s);setExploring(false);},error:setError,interact:()=>setExploring(true),coordinates:(lat,lon)=>{if(coordinate.current)coordinate.current.textContent=`${formatCoordinate(lat,'N','S')}  /  ${formatCoordinate(lon,'E','W')}`;}},controller.signal);}).then(e=>{if(!e)return;if(controller.signal.aborted){e.dispose();return;}instance=e;engine.current=e;e.configure(opts);}).catch(e=>{if(e?.name!=='AbortError')setError('The star field could not open. Please try a browser with WebGL enabled, or reload to try again.');});
  return()=>{controller.abort();instance?.dispose();engine.current=null;};
 },[]);
 useEffect(()=>{if(stage!=='city')return;const timer=setTimeout(()=>setExploring(true),4500);return()=>clearTimeout(timer);},[stage]);
 function configure(partial:Partial<ViewOptions>){const next={...options,...partial};setOptions(next);engine.current?.configure(next);}
 async function descend(){if(!engine.current||loadingCity||flying)return;setError('');setLoadingCity(true);setSelected(null);try{await engine.current.descend();}catch{}finally{setLoadingCity(false);}}
 function orbit(){setSelected(null);engine.current?.orbit();}
 function choose(id:string|null){setExpanded(false);setSelected(id);engine.current?.select(id);}
 return <main className={`experience stage-${stage}${selected?' has-story':''}${exploring?' is-exploring':''}${options.motion?'':' motion-paused'}`}>
  <header className="masthead"><span className="wordmark">TERRA <i aria-hidden="true">✦</i> ASTRA</span><span className="edition">EARTH, CONSTELLATED</span><Dialog><DialogTrigger asChild><button className="about-button" aria-label="About Terra Astra"><Info size={17}/><span>About</span></button></DialogTrigger><DialogContent className="about-dialog"><DialogTitle className="dialog-title">A sky full of us.</DialogTitle><DialogDescription className="about-intro">We have always looked up to find the stars. Terra Astra imagines what happens when Earth itself becomes a constellation.</DialogDescription><p>Rotate the planet, descend into Singapore, and open a life by selecting a named star. Pull back to see it all together.</p><div className="data-note"><h3>The light behind the world</h3><p>Geography: <a href="https://www.naturalearthdata.com/" target="_blank" rel="noreferrer">Natural Earth</a>. City light patterns: <a href="https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/" target="_blank" rel="noreferrer">NASA Black Marble, 2016</a>, artistically sampled from the historical composite. Light intensity does not represent population.</p><p>Singapore streets: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>, retrieved 9 September 2026. Detailed exploration currently covers central Singapore.</p><p>The three human stories are fictional. Their stars represent imagined connections to real places, with no real people or live location data.</p></div><p className="about-ending">The constellation was us all along.</p><a className="about-history-link" href="/history">Build history · v{currentVersion}</a></DialogContent></Dialog></header>
  <div ref={host} className="universe" />
  <div ref={markers} className="map-markers" aria-label="Explore the constellations">
   <button hidden data-star="singapore" className="map-star destination-star" onClick={descend} disabled={loadingCity}><span className="star-anchor" aria-hidden="true">✦</span><span className="marker-label">Singapore <ArrowDown size={12}/></span></button>
   {stories.map(s=><button hidden key={s.id} data-star={s.id} className="map-star human-star" onClick={()=>choose(s.id)} aria-label={`Discover ${s.name}'s constellation`}><span className="star-anchor" aria-hidden="true">✦</span><span className="marker-label">{s.name}</span></button>)}
   {[0,1,2].map(i=><div hidden key={i} data-star={`place-${i}`} className="map-star place-marker"><span className="star-anchor" aria-hidden="true">✦</span><span className="marker-label">{story?.places[i]?.label}</span></div>)}
  </div>
  {!ready&&!error?<p className="loading-message" role="status">Gathering the constellations<span className="loading-dots">…</span></p>:null}
  {error?<div className="error-message" role="alert"><p>{error}</p><button onClick={()=>ready?setError(''):location.reload()}>{ready?'Dismiss':'Try again'}</button></div>:null}
  <section className="opening" aria-live="polite">
   <p className="eyebrow">{stage==='orbit'?'A SKY FULL OF US':stage==='city'?'ONE CITY. COUNTLESS WORLDS.':stage==='ascending'?'PART OF SOMETHING LARGER':'A LITTLE CLOSER'}</p>
   {stage==='orbit'?<><h1>Earth,<br/><em>constellated.</em></h1><p>{returned?<>The constellation<br/>was us all along.</>:<>We have always looked up<br/>to find the stars.</>}</p></>:inCity?<><h1>Every light,<br/><em>a life.</em></h1><p>Choose a star.<br/>Discover the places it holds.</p></>:<><h1>{stage==='descending'?'Coming':'Going'}<br/><em>{stage==='descending'?'home.':'beyond.'}</em></h1><p>{stage==='descending'?'A planet becomes a place.':'A life becomes part of the world.'}</p></>}
  </section>
  <div className="view-tools" aria-label="View controls">
   <button disabled={!ready||flying} onClick={()=>engine.current?.zoom(.80)} aria-label="Zoom in" title="Zoom in"><Plus size={19}/></button><button disabled={!ready||flying} onClick={()=>engine.current?.zoom(1.25)} aria-label="Zoom out" title="Zoom out"><Minus size={19}/></button><span className="tool-divider"/>
   <button disabled={!ready} onClick={()=>configure({motion:!options.motion})} aria-label={options.motion?'Pause ambient motion':'Resume ambient motion'} title={options.motion?'Pause ambient motion':'Resume ambient motion'}>{options.motion?<Pause size={16}/>:<Play size={16}/>}</button>
   <Dialog><DialogTrigger asChild><button disabled={!ready} aria-label="Adjust the constellations" title="Adjust the constellations"><SlidersHorizontal size={18}/></button></DialogTrigger><DialogContent className="tuning-dialog"><DialogTitle className="dialog-title">Light, to your liking.</DialogTitle><DialogDescription>Find the balance between the stars and the space between them.</DialogDescription><div className="tuning-row"><label id="glow-label">Star glow</label><Slider ref={node=>{node?.querySelector('[role="slider"]')?.setAttribute('aria-labelledby','glow-label');}} aria-labelledby="glow-label" min={.25} max={2} step={.05} value={[options.glow]} onValueChange={([glow])=>configure({glow})}/></div><div className="tuning-row"><label id="threads-label">Constellation threads</label><Slider ref={node=>{node?.querySelector('[role="slider"]')?.setAttribute('aria-labelledby','threads-label');}} aria-labelledby="threads-label" min={0} max={1.4} step={.05} value={[options.threads]} onValueChange={([threads])=>configure({threads})}/></div><div className="tuning-row"><label id="density-label">Land star density</label><Slider ref={node=>{node?.querySelector('[role="slider"]')?.setAttribute('aria-labelledby','density-label');}} aria-labelledby="density-label" min={.2} max={1} step={.05} value={[options.density]} onValueChange={([density])=>configure({density})}/></div><div className="switch-row"><label htmlFor="borders">Trace country boundaries</label><Switch id="borders" checked={options.borders} onCheckedChange={borders=>configure({borders})}/></div><div className="switch-row"><label htmlFor="motion">Ambient motion</label><Switch id="motion" checked={options.motion} onCheckedChange={motion=>configure({motion})}/></div><button className="text-button" onClick={()=>configure({...initialOptions,motion:options.motion})}>Restore the original light</button></DialogContent></Dialog>
  </div>
  <div className="journey-bar">
   <div className="journey-location"><span className="journey-index">{selected?'03':inCity?'02':'01'} <span>/</span> 03</span><div><span className="location-label">{selected?story?.name.toUpperCase():inCity?'SINGAPORE':stage==='descending'?'APPROACHING SINGAPORE':stage==='ascending'?'RETURNING TO ORBIT':'PLANET EARTH'}</span><span ref={coordinate} className="coordinates">19.00° N / 95.00° E</span></div></div>
   <span className="gesture-hint">{flying?'':selected?'A life, held by its places':inCity?'Drag to explore · Select a named star':'Drag to orbit · Scroll or pinch to approach'}</span>
   {inCity?<button className="journey-button return-button" onClick={orbit}><span>Return to orbit</span><ArrowUp size={18}/></button>:<button className="journey-button" disabled={!ready||flying||loadingCity} onClick={descend}><span>{loadingCity?'Gathering Singapore…':flying?(stage==='ascending'?'Returning to orbit…':'Following the light…'):'Enter Singapore'}</span>{stage==='ascending'?<ArrowUp size={18}/>:<ArrowDown size={18}/>}</button>}
  </div>
  <footer className="credits"><span>Geography: Natural Earth <span className="credit-dot">·</span> Night lights: NASA, 2016</span><span className="credit-links"><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><a className="version-link" href="/history" aria-label={`Build history, version ${currentVersion}`}>v{currentVersion}</a></span></footer>
  {inCity&&!selected?<div className="story-access" aria-label="Human constellations">{stories.map(s=><button key={s.id} onClick={()=>choose(s.id)}><Sparkles size={13}/>{s.name}</button>)}<span>Three imagined lives</span></div>:null}
  <Sheet modal={false} open={!!story&&inCity} onOpenChange={open=>{if(!open)choose(null);}}>
   <SheetContent ref={measureStory} side="bottom" className={`story-sheet${expanded?' story-expanded':''}${options.motion?'':' motion-paused'}`} showCloseButton={false} onInteractOutside={e=>e.preventDefault()}>
    <button className="story-close" onClick={()=>choose(null)} aria-label="Close this constellation"><X size={18}/></button>
    {story?<div className="story-reveal">
     <p className="eyebrow">03 / A HUMAN CONSTELLATION</p>
     <SheetTitle className="story-name">{story.name}</SheetTitle>
     <SheetDescription className="story-subtitle">{story.subtitle}</SheetDescription>
     <blockquote key={story.id} className="story-first-line">{story.quote}</blockquote>
     <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild><button className="text-button story-read">{expanded?'Let the stars speak':`Explore ${story.name}’s story`}<span aria-hidden="true">{expanded?'−':'+'}</span></button></CollapsibleTrigger>
      <CollapsibleContent className="story-details">
       <p className="story-body">{story.body}</p>
       <ol className="life-places">{story.places.map(p=><li key={p.label}><span>{p.label}</span><p>{p.meaning}</p></li>)}</ol>
      </CollapsibleContent>
     </Collapsible>
     <p className="fiction-label">An imagined life, connected to real places.</p>
     <button className="text-button next-life" onClick={()=>choose(stories[(stories.findIndex(s=>s.id===story.id)+1)%stories.length].id)}>Discover another life <span aria-hidden="true">↗</span></button>
    </div>:null}
   </SheetContent>
  </Sheet>
  <noscript><p className="error-message">Enable JavaScript to explore Terra Astra.</p></noscript>
 </main>;
}
