import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createAnswerRouter } from '../lib/terra/server/answer-router.mjs';
const bundle = await build({ entryPoints: ['lib/terra/world-answer.ts'], bundle: true, platform: 'node', format: 'esm', write: false });
const { worldAnswerSchema } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const world = { title: 'Tokyo', explanation: 'Tokyo is on the eastern side of Honshu.', limitation: '', targets: [{name:'Tokyo',latitude:35.68,longitude:139.65,span:8}], perspective:'aerial',imageBrief:null };
const response = (body, annotations = []) => Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(body),annotations}]}]});
const input = {apiKey:'test-key',question:'Tell me about Tokyo',inventory:{},signal:new AbortController().signal};

test('ordinary arbitrary questions finish in one call without native sessions',async()=>{
  let calls=0;
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('No delegation for ordinary questions'),fetchImpl:async(url,init)=>{
    calls++; assert.equal(url,'https://api.openai.com/v1/responses'); const body=JSON.parse(init.body); assert.equal(body.model,'gpt-5.6-luna'); assert.equal(body.store,false);
    return response({route:'quick',needsWeb:false,answer:world});
  }});
  const result=await answer(input);assert.equal(calls,1);assert.equal(result.measured.subagent_count,0);assert.equal(result.world.targets[0].name,'Tokyo');assert.equal(result.world.imageBrief,undefined);
});

test('conversation-only exchanges return a reply without an opening or native session',async()=>{
  let calls=0,openings=0;
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('No delegation for conversation'),fetchImpl:async()=>{
    calls++;return response({route:'conversation',needsWeb:false,conversationReply:'I received your message. I cannot verify the microphone hardware from text alone.',answer:null});
  }});
  const result=await answer({...input,question:'Can you hear me?',onOpening:()=>openings++});
  assert.equal(calls,1);assert.equal(openings,0);assert.equal(result.kind,'conversation_reply');assert.equal(result.world,null);assert.deepEqual(result.sources,[]);
  assert.equal(result.conversationReply,'I received your message. I cannot verify the microphone hardware from text alone.');assert.equal(result.measured.output,result.conversationReply);
  assert.equal(result.measured.model,'gpt-5.6-luna');assert.equal(result.measured.route,'quick');assert.equal(result.measured.subagent_count,0);
});

test('mixed conversation and subject answer remain separate without rewriting the article',async()=>{
  const exact='Hello is part of the subject quotation; keep this arbitrary wording verbatim.';
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('No delegation for quick mixed request'),fetchImpl:async()=>response({route:'quick',needsWeb:false,conversationReply:'I received the text portion of your mic check.',answer:{...world,explanation:exact}})});
  const result=await answer({...input,question:'Mic check, then explain this sentence.'});
  assert.equal(result.kind,'direct_answer');assert.equal(result.conversationReply,'I received the text portion of your mic check.');assert.equal(result.world.explanation,exact);assert.equal(result.measured.output,exact);
});

test('fresh facts escalate to Terra search and retain actual citation annotations',async()=>{
  const bodies=[];
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('No native session needed'),fetchImpl:async(url,init)=>{
    bodies.push(JSON.parse(init.body));return bodies.length===1?response({route:'quick',needsWeb:true,answer:world}):response(world,[{type:'url_citation',url:'https://www.metro.tokyo.lg.jp/',title:'Tokyo Government'},{type:'url_citation',url:'javascript:alert(1)',title:'bad'}]);
  }});
  const result=await answer(input);assert.equal(bodies[1].model,'gpt-5.6-terra');assert.equal(bodies[1].tools[0].type,'web_search');assert.equal(bodies[1].tool_choice,'required');assert.equal(result.sources.length,1);assert.equal(result.measured.web_searched,true);
});

test('explicit deep route uses native delegation and gives opening first',async()=>{
  const events=[];
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:async options=>{
    events.push('research');assert.equal(options.reportPath,null);assert.equal(options.answerMode,'world');return {final_text:JSON.stringify(world),subagent_ids:['one','two']};
  },fetchImpl:async()=>response({route:'research',needsWeb:false,answer:world})});
  const result=await answer({...input,onOpening:()=>events.push('opening')});assert.deepEqual(events,['opening','research']);assert.equal(result.measured.subagent_count,2);assert.equal(result.measured.model,'gpt-6-astra');
});

test('cancelled routing cannot start a fallback request or native run',async()=>{
  const controller=new AbortController();let calls=0;
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('Cancelled'),fetchImpl:async()=>{calls++;controller.abort();throw new DOMException('Cancelled','AbortError');}});
  await assert.rejects(answer({...input,signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);
});

test('invalid coordinates do not reach the renderer',async()=>{
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('Invalid'),fetchImpl:async()=>response({route:'quick',needsWeb:false,answer:{...world,targets:[{name:'Bad',latitude:999,longitude:0,span:8}]}})});
  await assert.rejects(answer(input));
});

test('relevant surveyed depth reaches quick answers and used citations survive',async()=>{
  const source='https://nora.nerc.ac.uk/id/eprint/530930/';
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('No research needed'),fetchImpl:async(url,init)=>{
    const body=JSON.parse(init.body), request=JSON.parse(body.input);
    assert.equal(request.relevant_evidence.java_trench.survey.maximum_depth_m,7187);
    assert.match(body.instructions,/section minimum cannot answer/);
    return response({route:'quick',needsWeb:false,answer:{...world,explanation:`The surveyed depth is 7,187 metres. [Survey](${source})`}});
  }});
  const result=await answer({...input,question:'How deep is the Java trench?'});
  assert.deepEqual(result.sources.map(s=>s.url),[source]);
});
test('unused supplied sources are never attached to an answer',async()=>{
  const answer=createAnswerRouter({worldAnswerSchema,runProbe:()=>assert.fail('No research needed'),fetchImpl:async()=>response({route:'quick',needsWeb:false,answer:world})});
  assert.deepEqual((await answer({...input,question:'How does Singapore move shipping containers?'})).sources,[]);
});
