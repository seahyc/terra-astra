import { env } from 'cloudflare:workers';
import { libraryRecipe, publicLibrary } from '@/lib/terra/model-library/library.mjs';

/** Sites serves the renderer; an isolated Node runtime owns account connections. */
async function handle(request: Request) {
  const config = env as unknown as Record<string, string | undefined>;
  const base = config.TERRA_CODEX_BRIDGE_URL, token = config.TERRA_CODEX_BRIDGE_TOKEN;
  const headers = { 'Cache-Control': 'no-store' };
  const path = new URL(request.url).pathname.replace(/^\/api\/(explore|terra)/, '');
  if (request.method === 'GET' && path === '/models') return Response.json({ models: publicLibrary() }, { headers });
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Unexpected request origin.' }, { status: 403, headers });
  if (request.method === 'POST' && path === '/library-model' && Number(request.headers.get('content-length') || 0) < 16000) {
    const raw: unknown = await request.clone().json().catch(() => null);
    const input = raw && typeof raw === 'object' ? raw as {preferredId?: unknown} : null;
    if (typeof input?.preferredId === 'string') {
      if (!publicLibrary().some((model: {id:string}) => model.id === input.preferredId)) return Response.json({ error: 'Prepared model not found.' }, { status: 404, headers });
      return Response.json({ recipe: libraryRecipe(input.preferredId), via: 'library', persisted: false }, { headers });
    }
  }
  if (!base || !token) return Response.json(path === '/status'
    ? { configured: false, signedIn: false, provider: 'codex' }
    : { error: 'The account connection service is not configured yet. You can still explore the globe.' }, { status: path === '/status' ? 200 : 503, headers });
  if (request.method === 'POST' && request.headers.get('origin') !== new URL(request.url).origin)
    return Response.json({ error: 'Unexpected request origin.' }, { status: 403, headers });
  try {
    const target = new URL(base);
    if (target.protocol !== 'https:') throw new Error('A secure bridge URL is required.');
    target.pathname = `/api/explore${path}`; target.search = '';
    const forwarded = new Headers({ Authorization: `Bearer ${token}` });
    for (const key of ['content-type', 'origin', 'accept']) {
      const value = request.headers.get(key); if (value) forwarded.set(key, value);
    }
    const cookie = request.headers.get('cookie')?.split(';').map(value => value.trim()).find(value => /^terra_codex_session=[a-f0-9]{64}$/.test(value));
    if (cookie) forwarded.set('cookie', cookie);
    const response = await fetch(target, { method: request.method, headers: forwarded,
      ...(request.method === 'POST' ? { body: request.body } : {}),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(125000)]), redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) throw new Error('Bridge redirects are not accepted.');
    const returned = new Headers(headers);
    for (const key of ['content-type', 'set-cookie', 'retry-after']) {
      const value = response.headers.get(key); if (value) returned.set(key, value);
    }
    return new Response(response.body, { status: response.status, headers: returned });
  } catch (error) {
    console.error('Terra bridge fetch failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message.slice(0, 240) : 'Unknown bridge failure',
      host: (() => { try { return new URL(base).host; } catch { return 'invalid'; } })(),
      method: request.method,
      path,
    });
    const diagnostic = request.headers.get('x-terra-bridge-debug') === token && error instanceof Error
      ? { name: error.name, message: error.message.slice(0, 240) }
      : undefined;
    return Response.json({ error: 'The account connection service is offline. You can still explore the globe.', ...(diagnostic ? { diagnostic } : {}) }, { status: 503, headers });
  }
}
export const GET = handle;
export const POST = handle;
