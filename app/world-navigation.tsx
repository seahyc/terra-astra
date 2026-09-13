'use client';
import { useState } from 'react';
import { ArrowUpRight, RotateCcw, X } from 'lucide-react';
import { sendWorldCommand } from '@/lib/world/bridge';
import { WORLD_TARGETS, type WorldCommand, type WorldState } from '@/lib/world/commands';

/** The same tiny command path used by YC's voice tools, with a reliable manual route. */
export function WorldNavigation({state,disabled,onReplay}:{state:WorldState|null;disabled:boolean;onReplay:()=>void}) {
  const [open,setOpen]=useState(false),[message,setMessage]=useState('');
  const run=async(command:WorldCommand)=>{setMessage('');setOpen(false);const result=await sendWorldCommand(command);if(!result.ok)setMessage(result.reason??'Please try again.');};
  return <div className="world-navigation">
    <button className="journey-button world-explore" disabled={disabled} onClick={()=>setOpen(!open)} aria-expanded={open}>Explore the world <ArrowUpRight size={17}/></button>
    {open?<section className="world-destinations" aria-label="Explore destinations">
      <div className="world-destinations-heading"><h2>Follow a light.</h2><button aria-label="Close destinations" onClick={()=>setOpen(false)}><X size={17}/></button></div>
      <p>Three places. Different worlds.</p>
      {WORLD_TARGETS.map(target=><button key={target.id} disabled={disabled} className="world-target" onClick={()=>void run({type:'flyTo',targetId:target.id})}><span>{target.label}<small>{target.id==='singapore'?'Streets, embers, everyday life':target.id==='new-york'?'The city, in motion':'Into the ocean’s depths'}</small></span><ArrowUpRight size={16}/></button>)}
      <div className="world-layer-actions"><span>Above the world</span><button onClick={()=>void run({type:'focusLayer',layer:'satellites',enabled:!state?.layers.satellites})} aria-pressed={state?.layers.satellites??true}>Orbit</button><button onClick={()=>void run({type:'focusLayer',layer:'aircraft',enabled:!state?.layers.aircraft})} aria-pressed={state?.layers.aircraft??true}>Air</button></div>
      <button className="text-button world-replay" onClick={()=>{setOpen(false);onReplay();}}><RotateCcw size={13}/> Replay the birth of Earth</button>
    </section>:null}
    {message?<p className="world-command-message" role="status">{message}</p>:null}
  </div>;
}
