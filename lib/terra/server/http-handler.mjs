/** Fetch-based API shared by the hosted Worker. No local server or filesystem required. */
export function createTerraHttpHandler({ apiKey, authorize, planQuestion, worldAnswerSchema, inventory, runProbe, streamOpening, imageService, answerQuestion, fetchImpl = fetch }) {
  const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
  const json = (body, status = 200) => Response.json(body, { status, headers });
  const active = new Map();
  const requests = new Map();
  async function body(request, limit = 65536) {
    if (Number(request.headers.get('content-length')) > limit) throw Object.assign(new Error('Request is too large.'), { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) throw Object.assign(new Error('Request body required.'), { status: 400 });
    let length = 0, text = ''; const decoder = new TextDecoder();
    while (true) { const { value, done } = await reader.read(); if (done) break; length += value.byteLength; if (length > limit) { await reader.cancel(); throw Object.assign(new Error('Request is too large.'), { status: 413 }); } text += decoder.decode(value, { stream: true }); }
    try { return JSON.parse(text + decoder.decode()); } catch { throw Object.assign(new Error('Invalid JSON.'), { status: 400 }); }
  }
  return async function handle(request) {
    const path = new URL(request.url).pathname.replace(/^\/api\/terra/, '');
    try {
      const user = await authorize(request);
      if (request.method === 'GET' && path === '/status') return json({ configured: Boolean(apiKey), signedIn: Boolean(user), signInUrl: '/signin-with-chatgpt?return_to=%2F' });
      if (request.method !== 'POST') return json({ error: 'Not found.' }, 404);
      if (!user) return json({ error: 'Sign in with ChatGPT to use voice, answers and images.', signInUrl: '/signin-with-chatgpt?return_to=%2F' }, 401);
      if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Unexpected request origin.' }, 403);
      if (!apiKey) return json({ error: 'Online answers are not configured yet.' }, 503);
      if (!['/session', '/answer', '/image', '/agents/cancel'].includes(path)) return json({ error: 'Not found.' }, 404);
      if (path === '/agents/cancel') { active.get(user)?.abort(); return json({ cancellation_requested: active.has(user) }); }
      const now = Date.now();
      for (const [id, entry] of requests) if (entry.until < now) requests.delete(id);
      const budget = requests.get(user) ?? { count: 0, until: now + 60000 };
      if (budget.count >= 12 || requests.size >= 1000 && !requests.has(user)) return json({ error: 'Please wait a minute before asking again.' }, 429);
      budget.count++; requests.set(user, budget);
      const input = await body(request, path === '/image' ? 16384 : 65536);
      if (path === '/image') return json(await imageService.generate({ apiKey, input, signal: request.signal }));
      if (path === '/session') {
        if (typeof input.sdp !== 'string' || !input.sdp.trim() || input.sdp.length > 60000) return json({ error: 'A valid SDP offer is required.' }, 400);
        const response = await fetchImpl('https://api.openai.com/v1/live/sessions', {
          method: 'POST', signal: AbortSignal.any([request.signal, AbortSignal.timeout(30000)]),
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ session: { model: 'gpt-live-1', delegation: { type: 'client' }, instructions: 'You are Astra, the concise voice of an interactive Earth. Delegate substantive questions and requests to navigate, measure, illustrate or change perspective to the client. Acknowledge briefly, then explain the returned answer. Use aerial, horizon or cutaway when suitable through the shared navigation interface. Never invent camera success or measurements. Let users interrupt. Avoid repetitive caveats; mention uncertainty when it matters.' }, transport: { type: 'webrtc', sdp: input.sdp } }),
        });
        if (!response.ok) return json({ error: 'Live session creation failed.' }, 502);
        const result = await response.json();
        if (!result?.session?.id || !result?.transport?.sdp) return json({ error: 'Live session response was incomplete.' }, 502);
        return json({ session: { id: result.session.id }, transport: { type: 'webrtc', sdp: result.transport.sdp } }, 201);
      }
      if (typeof input.query !== 'string' || !input.query.trim() || input.query.length > 8000) return json({ error: 'Ask a question of up to 8000 characters.' }, 400);
      if (active.has(user) || active.size >= 4) return json({ error: 'An answer is still being prepared. Please retry shortly.' }, 409);
      const query = input.query.trim();
      const selected = Array.isArray(input.selectedIds) && input.selectedIds.length <= 8 && input.selectedIds.every(id => typeof id === 'string') ? input.selectedIds : [];
      const plan = planQuestion(query, selected);
      const previous = worldAnswerSchema.safeParse(input.previous);
      const context = previous.success ? { ...inventory, conversation_context: { question: typeof input.previousQuestion === 'string' ? input.previousQuestion.slice(0, 1000) : '', answer: previous.data } } : inventory;
      const controller = new AbortController(); active.set(user, controller);
      const signal = AbortSignal.any([controller.signal, request.signal, AbortSignal.timeout(125000)]);
      const openingController = new AbortController(); const encoder = new TextEncoder();
      let closed = false;
      const stream = new ReadableStream({
        start(sink) {
          const emit = event => { if (!closed && !signal.aborted) sink.enqueue(encoder.encode(JSON.stringify(event) + '\n')); };
          emit({ type: 'started' });
          const answerInventory = plan ? { ...context, relevant_measurements: plan.inventory } : context;
          const opening = answerQuestion ? Promise.resolve() : streamOpening({ apiKey, question: query, inventory: answerInventory, signal: AbortSignal.any([signal, openingController.signal]), onDelta: delta => emit({ type: 'opening.delta', delta }), onDone: text => emit({ type: 'opening.done', text }) }).catch(() => {});
          void (async () => {
            try {
              if (answerQuestion) {
                const result = await answerQuestion({ apiKey, question: query, inventory: answerInventory, signal, onOpening: text => emit({ type: 'opening.done', text }) });
                emit({ type: 'result', result });
                return;
              }
              const report = await runProbe({ apiKey, question: query, inventory: plan?.inventory ?? context, inventoryMode: 'inline', answerMode: plan ? 'evidence' : 'world', signal, keepSession: false, reportPath: null });
              const world = plan ? null : worldAnswerSchema.parse(JSON.parse(report.final_text.trim().replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '')));
              openingController.abort(); await opening;
              emit({ type: 'result', result: { world, kind: 'agents_terrain_answer', measured: { output: world ? world.explanation : report.final_text, subagent_count: report.subagent_ids.length } } });
            } catch { emit({ type: 'error', error: 'The answer could not be completed. Please try again.' }); }
            finally { openingController.abort(); await opening; if (active.get(user) === controller) active.delete(user); if (!closed) { closed = true; sink.close(); } }
          })();
        },
        cancel() { closed = true; controller.abort(); openingController.abort(); },
      });
      return new Response(stream, { headers: { ...headers, 'Content-Type': 'application/x-ndjson; charset=utf-8' } });
    } catch (error) {
      const status = Number.isInteger(error?.status) ? error.status : 500;
      return json({ error: status === 500 ? 'The request could not be completed. Please try again.' : String(error.message).split(apiKey || '\0').join('[redacted]') }, status);
    }
  };
}
