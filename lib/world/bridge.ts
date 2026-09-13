'use client';

import { validateWorldCommand, WORLD_TARGETS, type WorldCommand, type WorldCommandResult, type WorldState } from './commands';

export const WORLD_COMMAND_EVENT = 'terra:world-command';
export const WORLD_STATE_EVENT = 'terra:world-state';
export const WORLD_RESULT_EVENT = 'terra:world-result';
export type WorldNavigator = {
  command: (input: unknown) => Promise<WorldCommandResult>;
  getState: () => WorldState | null;
  targets: typeof WORLD_TARGETS;
};
declare global { interface Window { terraAstra?: WorldNavigator } }
let navigator: WorldNavigator | null = null;

/** YC imports this function; payloads remain plain serializable objects. */
export async function sendWorldCommand(input: WorldCommand): Promise<WorldCommandResult> {
  if (!navigator) return { ok: false, command: input, reason: 'The world is still loading.' };
  return navigator.command(input);
}
export function getWorldState() { return navigator?.getState() ?? null; }
export function publishWorldState(state: WorldState) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(WORLD_STATE_EVENT, { detail: state }));
}
export function subscribeWorldState(listener: (state: WorldState) => void) {
  const handle=(event: Event)=>listener((event as CustomEvent<WorldState>).detail);
  window.addEventListener(WORLD_STATE_EVENT,handle);
  return ()=>window.removeEventListener(WORLD_STATE_EVENT,handle);
}
/** Called only by TerraExperience when the renderer has loaded. Returns precise cleanup. */
export function connectWorldNavigator(execute: (command: WorldCommand) => Promise<WorldCommandResult>, getState: () => WorldState | null) {
  const api:WorldNavigator={targets:WORLD_TARGETS,getState,command:async input=>{
    const command=validateWorldCommand(input);
    if(!command) throw new TypeError('Unknown world command or target. Use the guaranteed target catalogue.');
    let result:WorldCommandResult;
    try{result=await execute(command);}catch{result={ok:false,command,reason:'That journey could not complete. Try another destination.'};}
    window.dispatchEvent(new CustomEvent(WORLD_RESULT_EVENT,{detail:result}));
    return result;
  }};
  navigator=api;window.terraAstra=api;
  const handle=(event:Event)=>{void api.command((event as CustomEvent).detail).catch(()=>{
    window.dispatchEvent(new CustomEvent(WORLD_RESULT_EVENT,{detail:{ok:false,reason:'Invalid world command.'}}));
  });};
  window.addEventListener(WORLD_COMMAND_EVENT,handle);
  return ()=>{window.removeEventListener(WORLD_COMMAND_EVENT,handle);if(navigator===api)navigator=null;if(window.terraAstra===api)delete window.terraAstra;};
}
