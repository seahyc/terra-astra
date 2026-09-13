import {matchLibrary,publicLibrary,libraryRecipe,validateRecipe} from './library.mjs';
import {recipeSchema,recipeInstructions} from './recipe-schema.mjs';
import {runModelTool} from './agents.mjs';
/** @param {{store?: ReturnType<typeof import("./store.mjs").createD1ModelStore>, fetchImpl?: typeof fetch, timeoutMs?: number,defer?: (promise:Promise<unknown>)=>void}} options */
export function createLibraryService({store=null,fetchImpl=fetch,timeoutMs=15000,defer}={}){
 return {
 async list(){return [...publicLibrary(),...(await store?.list()??[])];},
 async generate({apiKey,input,signal:externalSignal}){
 if(!input||typeof input.query!=='string'||!input.query.trim()||input.query.length>8000||Object.keys(input).some(k=>!['query','preferredId'].includes(k)))throw Object.assign(new Error('Invalid model question'),{status:400});
 const signal=externalSignal?AbortSignal.any([externalSignal,AbortSignal.timeout(timeoutMs+25000)]):AbortSignal.timeout(timeoutMs+25000);signal.throwIfAborted();
 const start=performance.now(),query=input.query;const library=publicLibrary();
 const preferred=input.preferredId;
 if(preferred!==undefined&&(typeof preferred!=='string'||preferred.length>64))throw Object.assign(new Error('Invalid model selection'),{status:400});
 const direct=preferred?library.find(d=>d.id===preferred):matchLibrary(query);
 const provenance={origin:'generated',model:'gpt-5.6-luna',schemaVersion:1,geometryValidated:true,factualAccuracy:'unverified conceptual illustration'};
 if(direct)return {recipe:libraryRecipe(direct.id),via:'library',persisted:true,elapsedMs:performance.now()-start,provenance:{origin:direct.id==='wind-turbine'?'approved-generated':'prepared',geometryValidated:true,factualAccuracy:direct.id==='java'?'checked-in NOAA measurements':'conceptual illustration'}};
 const cached=preferred?await store?.get(preferred):await store?.find(query);signal.throwIfAborted();
 if(cached)return {...cached,via:'cache',persisted:true,elapsedMs:performance.now()-start};
 if(preferred)throw Object.assign(new Error('Unknown library model'),{status:404});
 const candidates=[...library,...(await store?.candidates(query)??[])];signal.throwIfAborted();
 const result=await runModelTool({apiKey,signal,fetchImpl,defer,compose:async()=>{
 const recipeSignal=AbortSignal.any([signal,AbortSignal.timeout(timeoutMs)]);
 const response=await fetchImpl('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},signal:recipeSignal,body:JSON.stringify({model:'gpt-5.6-luna',store:false,reasoning:{effort:'none'},max_output_tokens:3200,instructions:recipeInstructions,input:JSON.stringify({question:query,library:candidates.map(({id,title,hint})=>({id,title,hint}))}),text:{format:{type:'json_schema',name:'model_recipe',strict:true,schema:{...recipeSchema,properties:{...recipeSchema.properties,libraryId:{type:['string','null'],enum:[...candidates.map(d=>d.id),null]}}}}}})});
 if(!response.ok)throw new Error('Recipe unavailable');const body=await response.json();if(body.status!=='completed')throw new Error('Incomplete recipe');
 const raw=JSON.parse(body.output?.flatMap(x=>x.content??[]).filter(x=>x.type==='output_text').map(x=>x.text).join(''));
 if(raw.libraryId){if(!candidates.some(c=>c.id===raw.libraryId))throw new Error('Unknown recipe');return {recipe:library.some(d=>d.id===raw.libraryId)?libraryRecipe(raw.libraryId):(await store.get(raw.libraryId)).recipe,via:'library'};}
 if(!Array.isArray(raw.parts)||raw.parts.length>22)throw new Error('Recipe exceeded part budget');
 // Generated geometry has no geographic authority; the answer navigator owns it.
 return {recipe:validateRecipe({...raw,anchor:null}),via:'procedural'};
 }});
 signal.throwIfAborted();let persisted=result.via==='library',recipe=result.recipe;
 if(store){try{if(result.via==='procedural'){recipe=await store.save(query,recipe,provenance,signal);persisted=true;}else if(recipe.id?.startsWith('generated-'))await store.alias(query,recipe.id,signal);}catch{signal.throwIfAborted();persisted=false;}}
 return {...result,recipe,persisted,provenance,elapsedMs:performance.now()-start};
 }
 };
}
