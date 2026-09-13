import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';
import { createBridge } from './server.mjs';

class FakeClient extends EventEmitter {
  ready = Promise.resolve();
  signedIn = false;
  closed = false;
  calls = [];
  async request(method) {
    this.calls.push(method);
    if (method === 'account/read') return { account: this.signedIn ? { type: 'chatgpt', email: null, planType: 'pro' } : null };
    if (method === 'account/login/start') return { verificationUrl: 'https://auth.openai.com/codex/device', userCode: 'TEST-ONLY' };
  }
  close() { this.closed = true; }
  async run() { return { text: JSON.stringify({world:{title:'An answer',explanation:'A complete explanation.',limitation:'',targets:[],perspective:null,modelBrief:null},sources:[],conversationReply:null}) }; }
}
async function setup(t) {
  const clients = [], contexts = [];
  const server = createBridge({ createClient: context => { contexts.push(context); const c = new FakeClient(); clients.push(c); return c; } });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.close(); server.closeAllConnections(); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = (path, body, cookie) => fetch(origin + '/api/explore' + path, { method: body === undefined ? 'GET' : 'POST',
    headers: { Origin: origin, 'Content-Type':'application/json', ...(cookie ? {Cookie:cookie} : {}) }, ...(body === undefined ? {} : {body:JSON.stringify(body)}) });
  return { clients, contexts, call, origin };
}
test('public browsing starts no worker; prepared models need no account', async t => {
  const {call,clients}=await setup(t);
  assert.equal((await (await call('/status')).json()).signedIn,false);
  assert.equal((await call('/models')).status,200);
  const model=await call('/library-model',{preferredId:'wind-turbine'});assert.equal(model.status,200);assert.equal((await model.json()).persisted,false);
  assert.equal((await call('/library-model',{preferredId:'missing'})).status,404);
  assert.equal((await call('/answer',{query:'Hello'})).status,401);assert.equal(clients.length,0);
});
test('two visitors have isolated auth, logout, and credential contexts', async t => {
  const {call,clients,contexts}=await setup(t);
  const a=await call('/auth/start',{}), ca=a.headers.get('set-cookie').split(';')[0];
  const b=await call('/auth/start',{}), cb=b.headers.get('set-cookie').split(';')[0];
  assert.notEqual(ca,cb);assert.notEqual(contexts[0].home,contexts[1].home);assert.notEqual(contexts[0].cwd,contexts[1].cwd);
  assert.equal(contexts[0].inheritedAuth,undefined);
  clients[0].signedIn=true;
  assert.equal((await (await call('/status',undefined,ca)).json()).signedIn,true);
  assert.equal((await (await call('/status',undefined,cb)).json()).signedIn,false);
  assert.equal((await call('/answer',{query:'What is an orbit?'},cb)).status,401);
  const answer=await call('/answer',{query:'What is an orbit?',selectedIds:[],previous:null,previousQuestion:''},ca);
  assert.match(await answer.text(),/"type":"result"/);
  await call('/auth/logout',{},ca);assert.equal(clients[0].closed,true);assert.equal(clients[1].closed,false);
  assert.equal((await (await call('/status',undefined,ca)).json()).signedIn,false);
});
test('one inference per visitor, cancellation releases capacity', async t => {
  const {call,clients}=await setup(t);
  const auth=await call('/auth/start',{}), cookie=auth.headers.get('set-cookie').split(';')[0];clients[0].signedIn=true;
  let entered;const started=new Promise(resolve=>{entered=resolve;});
  clients[0].run=({signal})=>new Promise((resolve,reject)=>{entered();signal.addEventListener('abort',()=>reject(new Error('Cancelled')),{once:true});});
  const response=await call('/answer',{query:'Explain an orbit'},cookie);await started;
  assert.equal((await call('/answer',{query:'Another question'},cookie)).status,409);
  assert.equal((await call('/agents/cancel',{},cookie)).status,200);
  assert.match(await response.text(),/"type":"error"/);
  clients[0].run=FakeClient.prototype.run;
  assert.match(await (await call('/answer',{query:'Explain an orbit'},cookie)).text(),/"type":"result"/);
});
