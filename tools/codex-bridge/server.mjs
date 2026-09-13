import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CodexClient } from './client.mjs';
import { createCodexSearch } from '../../lib/terra/codex-search.mjs';
import { publicLibrary, libraryRecipe } from '../../lib/terra/model-library/library.mjs';

const COOKIE = 'terra_codex_session';
const fail = (message, status) => Object.assign(new Error(message), { status });
export function createBridge({ createClient = options => new CodexClient(options), siteOrigin = '', token = '', maxSessions = 32 } = {}) {
  const sessions = new Map();
  let jobs = 0;
  const sweep = setInterval(() => {
    for (const [id, session] of sessions) if (!session.busy && Date.now() - session.touched > 30 * 60000) dispose(id);
  }, 60000);
  sweep.unref();
  function dispose(id) { const session = sessions.get(id); if (!session) return; session.client.close(); sessions.delete(id); void rm(session.dir, { recursive: true, force: true }); }
  const server = http.createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff');
    const json = (value, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(value)); };
    const cookie = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
    let session = sessions.get(cookie);
    if (session) session.touched = Date.now();
    try {
      if (token && req.headers.authorization !== `Bearer ${token}`) throw fail('Bridge authorization required.', 403);
      const path = new URL(req.url, 'http://bridge.local').pathname.replace(/^\/api\/(explore|terra)/, '');
      if (req.method === 'POST') {
        const origin = req.headers.origin;
        const local = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin ?? '');
        if (!(siteOrigin ? origin === siteOrigin : local)) throw fail('Unexpected request origin.', 403);
      }
      if (req.method === 'GET' && path === '/models') return json({ models: publicLibrary() });
      const status = async () => {
        let account = null;
        if (session && !session.client.closed) {
          await session.client.ready;
          const result = await session.client.request('account/read');
          if (result.account?.type === 'chatgpt') account = result.account;
        }
        if (account && session) session.login = null;
        return { configured: true, provider: 'codex', signedIn: Boolean(account),
          ...(account ? { account: { email: account.email, planType: account.planType } } : {}),
          ...(session?.login ? { login: session.login } : {}), ...(session?.loginError ? { error: session.loginError } : {}) };
      };
      if (req.method === 'GET' && path === '/status') return json(await status());
      if (req.method !== 'POST') return json({ error: 'Not found.' }, 404);
      let bytes = 0, body = '';
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 32000) throw fail('Request too large.', 413); body += chunk; }
      let input; try { input = JSON.parse(body || '{}'); } catch { throw fail('Invalid JSON.', 400); }
      if (path === '/auth/logout') {
        if (session) dispose(cookie);
        res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${siteOrigin.startsWith('https:') ? '; Secure' : ''}`);
        return json({ configured: true, signedIn: false, provider: 'codex' });
      }
      if (path === '/auth/start') {
        if (session?.client.closed) { dispose(cookie); session = null; }
        if (!session) {
          if (sessions.size >= maxSessions) throw fail('All connection slots are busy. Please try again shortly.', 503);
          const id = randomBytes(32).toString('hex');
          const dir = await mkdtemp(join(tmpdir(), 'terra-visitor-'));
          const home = join(dir, 'auth'), cwd = join(dir, 'work');
          await mkdir(home, { mode: 0o700 }); await mkdir(cwd, { mode: 0o700 });
          const client = createClient({ home, cwd });
          session = { client, dir, touched: Date.now(), busy: false, login: null };
          sessions.set(id, session);
          const current = session;
          client.on('notification', ({ method, params }) => {
            if (method === 'account/login/completed') { current.login = null; current.loginError = params.success ? null : 'Connection was not completed. Please try again.'; }
          });
          res.setHeader('Set-Cookie', `${COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400${siteOrigin.startsWith('https:') ? '; Secure' : ''}`);
        }
        await session.client.ready;
        if ((await status()).signedIn) return json(await status());
        if (!session.login) {
          const result = await session.client.request('account/login/start', { type: 'chatgptDeviceCode' });
          if (!result.verificationUrl || !result.userCode) throw fail('ChatGPT connection could not start.', 502);
          session.login = { verificationUrl: result.verificationUrl, userCode: result.userCode };
          session.loginError = null;
        }
        return json(await status());
      }
      // Reading prepared assets remains public and does not consume inference.
      if (path === '/library-model' && typeof input.preferredId === 'string') {
        if (!publicLibrary().some(model => model.id === input.preferredId)) throw fail('Prepared model not found.', 404);
        const recipe = libraryRecipe(input.preferredId);
        if (recipe) return json({ recipe, via: 'library', persisted: false });
      }
      if (!['/answer', '/library-model', '/agents/cancel'].includes(path)) return json({ error: 'This feature is unavailable in typing mode.' }, 404);
      if (!session || !(await status()).signedIn) throw fail('Connect your ChatGPT account to answer.', 401);
      if (path === '/agents/cancel') { session.controller?.abort(); return json({ cancellation_requested: Boolean(session.busy) }); }
      if (session.busy || jobs >= 4) throw fail('An answer is already running. Please retry shortly.', 409);
      if (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 8000) throw fail('Ask a question of up to 8000 characters.', 400);
      session.busy = true; jobs++;
      const controller = new AbortController(); session.controller = controller;
      res.on('close', () => { if (!res.writableEnded) controller.abort(); });
      const search = createCodexSearch({ run: args => session.client.run(args) });
      try {
        if (path === '/library-model') return json(await search.model(input, { signal: controller.signal }));
        res.writeHead(200, { 'Content-Type': 'application/x-ndjson; charset=utf-8' });
        res.write(JSON.stringify({ type: 'started' }) + '\n');
        const result = await search.answer(input, { signal: controller.signal });
        if (!res.destroyed) { res.write(JSON.stringify({ type: 'result', result }) + '\n'); res.end(); }
      } catch {
        if (res.headersSent && !res.destroyed) { res.write(JSON.stringify({ type: 'error', error: 'Search could not finish within its limits. Try a narrower question or reconnect your account.' }) + '\n'); res.end(); }
        else if (!res.destroyed) json({ error: 'The model could not be generated. Please retry.' }, 502);
      } finally { session.busy = false; session.controller = null; jobs--; }
    } catch (error) { if (!res.headersSent) json({ error: error.status ? error.message : 'The ChatGPT connection is unavailable. Please retry.' }, error.status ?? 502); }
  });
  server.on('close', () => { clearInterval(sweep); for (const id of sessions.keys()) dispose(id); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const host = process.env.TERRA_BRIDGE_HOST || '127.0.0.1';
  const token = process.env.TERRA_CODEX_BRIDGE_TOKEN || '';
  if (!['127.0.0.1', 'localhost'].includes(host) && !token) throw new Error('A bridge token is required for a remote listener.');
  const server = createBridge({ siteOrigin: process.env.TERRA_SITE_ORIGIN, token });
  server.listen(Number(process.env.TERRA_BRIDGE_PORT || 5182), host, () => process.stdout.write('Terra Astra account bridge ready.\n'));
  for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => { server.close(); server.closeAllConnections(); });
}
