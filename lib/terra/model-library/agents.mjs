// Native Agents owns the model tool invocation. Luna's strict Responses call is
// the tool implementation, not a substitute for an Agents session.
async function* events(response){
 if(!response.ok||!response.body)throw new Error('Model orchestration unavailable');
 let buffer='';const decoder=new TextDecoder();
 for await(const chunk of response.body){buffer+=decoder.decode(chunk,{stream:true}).replace(/\r\n/g,'\n');let end;while((end=buffer.indexOf('\n\n'))>=0){const block=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=block.split('\n').filter(l=>l.startsWith('data:')).map(l=>l.slice(5).trimStart()).join('\n');if(data&&data!=='[DONE]')yield JSON.parse(data);}}
}
export async function runModelTool({apiKey,signal,compose,fetchImpl=fetch,defer}){
 const base='https://api.openai.com/v1/agents/sessions';
 const headers={Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json','OpenAI-Beta':'agents=v1'};
 let sessionId=null,submitted=false;const evidence={api:'agents/v1',tool:'compose_model_recipe',toolCalls:0,toolResultAccepted:false,cleanup:'not_started',recipeMs:0};
 const request=async(url,body,method='POST',requestSignal=signal)=>{const r=await fetchImpl(url,{method,headers,signal:requestSignal,...(body?{body:JSON.stringify(body)}:{})});if(!r.ok)throw new Error('Model orchestration unavailable');return r;};
 try{
 let response=await request(base,{agent:{model:'gpt-6-astra',instructions:'Call compose_model_recipe exactly once with empty arguments now. The application has already bound the current question and bounded library candidates to that tool. When the tool returns, reply Done and end. No other work or delegation is needed.',reasoning:{effort:'low'},text:{verbosity:'low'},tools:[{type:'function',name:'compose_model_recipe',description:'Build or reuse the requested model from validated geometry. The request is bound by the application.',parameters:{type:'object',properties:{},required:[],additionalProperties:false},defer_loading:false}]},environment:{type:'none'},input:'Compose the model for the current application request.',stream:true});
 const handleActions=async actions=>{
  const action=actions?.find(a=>a.type==='function_call'&&a.name==='compose_model_recipe');
  if(!action)return null;if(submitted)throw new Error('Repeated model tool action');
  evidence.toolCalls++;let result,failure;
  const recipeStarted=performance.now();try{result=await compose();evidence.recipeMs=Math.round(performance.now()-recipeStarted);signal.throwIfAborted();}catch(error){failure=error;}
  const toolResult={type:'agent.session.input.tool_result',turn_id:action.turn_id,call_id:action.call_id,success:!failure,...(failure?{error:'Recipe unavailable or cancelled'}:{output:JSON.stringify({id:result.recipe.id??null,title:result.recipe.title,validated:true})})};
  // Complete the required action even on recipe failure, using a cleanup signal
  // if the caller has cancelled. Otherwise the session cannot become deletable.
  await request(`${base}/${sessionId}/events`,{events:[toolResult]},'POST',signal.aborted?AbortSignal.timeout(3000):signal);
  submitted=true;evidence.toolResultAccepted=!failure;if(failure)throw failure;
  return {...result,orchestration:evidence};
 };
 for(let attachment=0;attachment<4;attachment++){
  for await(const event of events(response)){
   sessionId??=event.session_id??event.session?.id??null;
   const result=await handleActions(event.session?.required_actions);if(result)return result;
   if(event.type==='agent.session.requires_action'){
    const session=await (await request(`${base}/${sessionId}`,null,'GET')).json();
    const result=await handleActions(session.required_actions);if(result)return result;
   }
  }
  if(!sessionId)throw new Error('Missing model session');
  const session=await (await request(`${base}/${sessionId}`,null,'GET')).json();
  const result=await handleActions(session.required_actions);if(result)return result;
  if(session.status==='failed'||session.status==='idle')throw new Error('Coordinator did not call model tool');
  response=await request(`${base}/${sessionId}/events`,null,'GET');
 }
 throw new Error('Model tool was not invoked');
 }finally{
 if(sessionId){const finish=async()=>{const cleanup=AbortSignal.timeout(20000);
 if(!evidence.toolResultAccepted)try{await request(`${base}/${sessionId}/events`,{events:[{type:'agent.session.input.cancel'}]},'POST',cleanup);}catch{}
 for(let attempt=0;attempt<16;attempt++){
  try{const state=await (await request(`${base}/${sessionId}`,null,'GET',cleanup)).json();
   if(state.required_actions?.length){await request(`${base}/${sessionId}/events`,{events:state.required_actions.filter(a=>a.type==='function_call').map(a=>({type:'agent.session.input.tool_result',turn_id:a.turn_id,call_id:a.call_id,success:false,error:'Request ended'}))},'POST',cleanup);}
   if(state.status==='idle'||state.status==='failed'){await request(`${base}/${sessionId}`,null,'DELETE',cleanup);evidence.cleanup='deleted';break;}
  }catch{break;}
  await new Promise(resolve=>setTimeout(resolve,400));
 }
 if(evidence.cleanup!=='deleted')evidence.cleanup='unconfirmed';};
 if(defer){evidence.cleanup='scheduled';defer(finish());}else await finish();}
 }
}
