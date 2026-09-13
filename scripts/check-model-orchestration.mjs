import assert from 'node:assert/strict';
import {createLibraryService} from '../lib/terra/model-library/service.mjs';
import {libraryRecipe} from '../lib/terra/model-library/library.mjs';
const recipe={...libraryRecipe('wind-turbine'),libraryId:null};
const sse=items=>new Response(items.map(e=>'data: '+JSON.stringify(e)+'\n\n').join(''),{headers:{'content-type':'text/event-stream'}});
const action={type:'function_call',name:'compose_model_recipe',turn_id:'turn',call_id:'call'};
function fixture({omitEvent=false,hangRecipe=false}={}){const calls=[];let ended=false;return {calls,async fetchImpl(url,init){calls.push({url,body:init.body?JSON.parse(init.body):null,method:init.method});
if(url.endsWith('/responses')){if(hangRecipe)return new Promise((_,reject)=>{const hold=setTimeout(()=>reject(Error('Abort was not delivered')),100);init.signal.addEventListener('abort',()=>{clearTimeout(hold);reject(init.signal.reason);},{once:true});});return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(recipe)}]}]});}
if(url.endsWith('/sessions'))return sse([{type:'agent.session.created',session:{id:'test-session'}},...(omitEvent?[]:[{type:'agent.session.requires_action',session:{id:'test-session',required_actions:[action]}}])]);
if(init.method==='DELETE')return new Response(null,{status:204});
if(init.method==='GET')return Response.json(ended?{status:'idle',required_actions:[]}:{status:'requires_action',required_actions:[action]});
if(init.body?.includes('tool_result')||init.body?.includes('input.cancel'))ended=true;
return Response.json({accepted:true},{status:202});
}};}
for(const omitEvent of [false,true]){const mock=fixture({omitEvent}),service=createLibraryService(mock);const result=await service.generate({apiKey:'test',input:{query:'An unfamiliar mechanism'},signal:new AbortController().signal});assert.equal(result.via,'procedural');assert.equal(result.persisted,false);assert.equal(result.orchestration.toolCalls,1);assert.equal(result.orchestration.toolResultAccepted,true);assert.equal(result.orchestration.cleanup,'deleted');assert.equal(mock.calls.filter(c=>c.url.endsWith('/responses')).length,1);assert.ok(mock.calls.find(c=>c.body?.events?.[0]?.type==='agent.session.input.tool_result'));assert.equal(mock.calls.find(c=>c.url.endsWith('/responses')).body.max_output_tokens,3200);console.log(`PASS real-protocol fixture: action ${omitEvent?'recovered from snapshot':'in stream'}, one strict recipe call, accepted native tool result, cleanup`);}
const mock=fixture({hangRecipe:true});await assert.rejects(createLibraryService({...mock,timeoutMs:5}).generate({apiKey:'test',input:{query:'New model'},signal:new AbortController().signal}),e=>e.name==='TimeoutError');assert.ok(mock.calls.some(c=>c.method==='DELETE'));console.log('PASS recipe deadline cancels work and closes the native session');
const cancelled=new AbortController();cancelled.abort();let fetched=false;await assert.rejects(createLibraryService({fetchImpl:async()=>{fetched=true;}}).generate({apiKey:'test',input:{query:'New model'},signal:cancelled.signal}));assert.equal(fetched,false);console.log('PASS superseded requests make no model/API mutations');
