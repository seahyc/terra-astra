export async function readAnswerStream(response: Response, onOpening: (text:string, complete:boolean)=>void): Promise<unknown> {
  if (!response.headers.get('content-type')?.includes('application/x-ndjson')) return response.json();
  if (!response.body) throw new Error('The answer stream is unavailable.');
  const reader=response.body.getReader(), decoder=new TextDecoder();
  let buffer='', opening='', result:unknown;
  function consume(line:string) {
    if (!line.trim()) return;
    const event=JSON.parse(line);
    if (event.type==='opening.delta' && typeof event.delta==='string') { opening+=event.delta; onOpening(opening,false); }
    if (event.type==='opening.done' && typeof event.text==='string') onOpening(event.text,true);
    if (event.type==='result') result=event.result;
    if (event.type==='error') throw new Error(typeof event.error==='string'?event.error:'The answer was interrupted.');
  }
  try {
    while(true) {
      const {value,done}=await reader.read();
      buffer+=done?decoder.decode():decoder.decode(value,{stream:true});
      let end; while((end=buffer.indexOf('\n'))>=0) {consume(buffer.slice(0,end));buffer=buffer.slice(end+1);}
      if(done)break;
    }
    consume(buffer);
    if(result===undefined)throw new Error('The answer ended before completion.');
    return result;
  } finally {reader.releaseLock();}
}
