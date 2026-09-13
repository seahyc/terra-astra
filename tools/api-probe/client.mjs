import { loadProfile } from './profile.mjs';

const $ = id => document.getElementById(id);
const audio = $('audio');
let peer, channel, microphone, connectionAbort, agentAbort;
let liveRevision = 0, agentRevision = 0;
let ready = false, closing = false, finalized = false;
let startupTimer, runTimer, closeTimer, delegationTimer;
let pendingDelegation = null, currentDelegation = null;
const history = [];
const status = (id, text) => { $(id).textContent = text; };
function log(text) {
  const node = $('log');
  node.textContent = (node.textContent === 'Waiting.' ? '' : node.textContent + '\n') + text;
  node.scrollTop = node.scrollHeight;
}
function transcriptRows() {
  const rows = [];
  for (const fragment of history) {
    const previous = rows.at(-1);
    if (previous?.who === fragment.who) previous.text += fragment.delta;
    else rows.push({ who: fragment.who, text: fragment.delta });
  }
  return rows;
}
function transcriptText() {
  return transcriptRows().map(row => `${row.who}: ${row.text}`).join('\n');
}
function renderTranscript() {
  $('transcript').textContent = transcriptText() || 'No transcript received.';
}
function emphasize(text) {
  const selector = /deep|trench|ocean floor|lowest/i.test(text) ? '.trench' : /mountain|high|peak/i.test(text) ? '.peak' : null;
  if (!selector) return;
  const node = document.querySelector(selector);
  node.classList.remove('emphasis');
  void node.getBoundingClientRect();
  node.classList.add('emphasis');
}
// Keep each append below the API limit even for text with many multibyte characters.
function commentaryChunks(text) {
  const chunks = [];
  let chunk = '';
  for (const char of text) {
    if (new TextEncoder().encode(chunk + char).length > 480) { chunks.push(chunk); chunk = ''; }
    chunk += char;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}
function cancelAgent(message = 'Cancellation requested; late results will be ignored.') {
  agentRevision++;
  // Disconnecting the active request makes the local server cancel that exact run.
  agentAbort?.abort();
  agentAbort = null;
  $('cancel-agents').disabled = true;
  if (message) status('agent-output', message);
}
function cleanup() {
  liveRevision++;
  clearTimeout(startupTimer); clearTimeout(runTimer); clearTimeout(closeTimer); clearTimeout(delegationTimer);
  pendingDelegation = currentDelegation = null;
  cancelAgent('');
  connectionAbort?.abort();
  const oldChannel = channel, oldPeer = peer;
  channel = peer = null;
  microphone?.getTracks().forEach(t => t.stop());
  microphone = null;
  oldChannel?.close(); oldPeer?.close();
  audio.srcObject = null;
  ready = false;
  $('stop').disabled = true;
  status('mic-status', 'Off');
  void refreshStatus();
}
function requestClose(reason) {
  closing = true;
  clearTimeout(delegationTimer);
  pendingDelegation = currentDelegation = null;
  cancelAgent();
  if (ready && channel?.readyState === 'open') {
    $('stop').disabled = true;
    status('session-status', reason);
    channel.send(JSON.stringify({ type: 'session.close' }));
    closeTimer = setTimeout(() => {
      status('session-status', 'Final usage unconfirmed: no session.closed event.');
      cleanup();
    }, 15000);
  } else cleanup();
}
async function runAgent(query, delegationId = null, expectedLiveRevision = liveRevision) {
  cancelAgent('');
  const revision = ++agentRevision, controller = new AbortController();
  agentAbort = controller;
  $('agents').disabled = true;
  $('cancel-agents').disabled = false;
  status('agent-output', 'Running Agents with two native subagents…');
  try {
    let response;
    // Cancellation cleanup of the preceding run can take several seconds.
    for (let attempt = 0; attempt < 12; attempt++) {
      controller.signal.throwIfAborted();
      response = await fetch('/api/agents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }), signal: controller.signal,
      });
      if (response.status !== 409) break;
      await response.text();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Agents request failed');
    if (revision !== agentRevision || expectedLiveRevision !== liveRevision || controller.signal.aborted) return;
    const answer = result.measured.output;
    status('agent-output', `Agents answer\n\n${answer}\n\nEvidence: ${result.measured.inventory_source}\nNative subagents: ${result.measured.subagent_count}\nCompleted turns: ${result.measured.completed_turns}\nSession cleanup: ${result.measured.cleanup}\nUsage: ${JSON.stringify(result.measured.usage)}`);
    emphasize(answer);
    await new Promise(requestAnimationFrame);
    if (revision !== agentRevision || expectedLiveRevision !== liveRevision) return;
    if (delegationId && ready && !closing && channel?.readyState === 'open') {
      for (const [index, content] of commentaryChunks(answer).entries()) {
        channel.send(JSON.stringify({ type: 'session.commentary.append', event_id: `answer_${revision}_${index}`, delegation_id: delegationId, content }));
      }
      log('Agents result sent to GPT-Live; awaiting spoken output.');
    }
  } catch (error) {
    if (revision === agentRevision) status('agent-output', controller.signal.aborted ? 'Run stopped; result discarded.' : error.message);
  } finally {
    if (revision === agentRevision) {
      agentAbort = null;
      $('cancel-agents').disabled = true;
      void refreshStatus();
    }
  }
}
function scheduleDelegation() {
  clearTimeout(delegationTimer);
  delegationTimer = setTimeout(() => {
    if (!pendingDelegation || closing || !ready || !history.some(x => x.who === 'You')) return;
    const task = pendingDelegation;
    pendingDelegation = null;
    currentDelegation = task;
    const query = 'Answer the latest user request in this transcript, using the displayed Java profile. Earlier fragments are context; later corrections take precedence.\n' + transcriptText();
    void runAgent(query, task.id, task.revision);
  }, 650);
}
function receive(event, revision) {
  if (revision !== liveRevision) return;
  log(event.type);
  if (event.type === 'session.started') {
    clearTimeout(startupTimer);
    ready = true;
    status('session-status', 'Started');
    runTimer = setTimeout(() => requestClose('180-second limit; finalizing…'), 180000);
    channel.send(JSON.stringify({ type: 'session.thinking.append', delegation_id: null, content: 'The page displays a measured north-south Java elevation profile at longitude 112.922 east. The diagram has labelled sea level, elevation and distance axes. Use backend evidence for values and limitations.' }));
  } else if (event.type === 'session.input_transcript.delta' || event.type === 'session.output_transcript.delta') {
    if (typeof event.delta !== 'string') return;
    const who = event.type.includes('input_') ? 'You' : 'Terra Astra';
    history.push({ who, delta: event.delta, start_ms: event.start_ms, end_ms: event.end_ms });
    renderTranscript();
    if (who === 'Terra Astra') emphasize(history.filter(x => x.who === who).map(x => x.delta).join('').slice(-120));
    if (who === 'You' && !closing) {
      if (agentAbort && currentDelegation) {
        pendingDelegation = currentDelegation;
        cancelAgent('Updating the request with your latest words…');
      }
      if (pendingDelegation) scheduleDelegation();
    }
  } else if (event.type === 'session.delegation.created' && event.delegation?.target === 'client') {
    if (closing || !event.delegation.id) return;
    cancelAgent('Collecting transcript for the new delegation…');
    pendingDelegation = { id: event.delegation.id, revision };
    scheduleDelegation();
  } else if (event.type === 'session.commentary.appended') {
    log('GPT-Live accepted the result as context; audibility is not yet verified.');
  } else if (event.type === 'session.closed') {
    finalized = true;
    status('session-status', `Closed · usage ${JSON.stringify(event.usage ?? null)}`);
    cleanup();
  } else if (event.type === 'error') {
    status('session-status', event.error?.message || 'Live session error');
  }
}
async function iceComplete(pc, signal) {
  if (pc.iceGatheringState === 'complete') return;
  await new Promise((resolve, reject) => {
    const done = () => { if (pc.iceGatheringState === 'complete') finish(); };
    const abort = () => finish(signal.reason || new Error('Connection cancelled'));
    const timer = setTimeout(() => finish(new Error('ICE gathering timed out')), 10000);
    function finish(error) {
      clearTimeout(timer); pc.removeEventListener('icegatheringstatechange', done); signal.removeEventListener('abort', abort);
      error ? reject(error) : resolve();
    }
    pc.addEventListener('icegatheringstatechange', done);
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort(); else done();
  });
}
async function startVoice() {
  cleanup();
  const revision = liveRevision;
  closing = finalized = false;
  history.length = 0;
  renderTranscript();
  $('start').disabled = true;
  $('stop').disabled = false;
  status('session-status', 'Connecting…');
  connectionAbort = new AbortController();
  const signal = connectionAbort.signal;
  startupTimer = setTimeout(() => {
    if (revision === liveRevision && !ready) {
      status('session-status', 'Startup timed out; final usage unconfirmed.');
      cleanup();
    }
  }, 30000);
  try {
    const configured = await fetch('/api/status', { signal }).then(r => r.json());
    if (!configured.configured) throw new Error('API key missing; microphone was not requested.');
    const pc = new RTCPeerConnection();
    peer = pc;
    pc.addEventListener('track', event => {
      if (revision !== liveRevision) return;
      audio.srcObject = new MediaStream([event.track]);
      status('audio-status', 'Remote track received; audibility unverified.');
      audio.play().catch(() => status('audio-status', 'Press Play to hear the received track.'));
    });
    const dc = pc.createDataChannel('oai-events');
    channel = dc;
    dc.addEventListener('message', ({ data }) => {
      try { receive(JSON.parse(data), revision); } catch { log('An event could not be processed.'); }
    });
    dc.addEventListener('close', () => {
      if (channel === dc && !finalized) {
        status('session-status', 'Disconnected; final usage unconfirmed.');
        cleanup();
      }
    });
    const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (revision !== liveRevision) { mic.getTracks().forEach(t => t.stop()); return; }
    microphone = mic;
    status('mic-status', 'Active');
    mic.getAudioTracks().forEach(t => pc.addTrack(t, mic));
    await pc.setLocalDescription(await pc.createOffer());
    await iceComplete(pc, signal);
    signal.throwIfAborted();
    const response = await fetch('/api/session', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sdp: pc.localDescription.sdp }), signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Live setup failed');
    if (revision !== liveRevision) return;
    await pc.setRemoteDescription({ type: 'answer', sdp: result.transport.sdp });
    if (!ready) status('session-status', 'Negotiated; waiting for session.started…');
  } catch (error) {
    if (revision === liveRevision) { status('session-status', error.message); cleanup(); }
  }
}
async function refreshStatus() {
  try {
    const result = await fetch('/api/status').then(r => r.json());
    status('key-status', result.configured ? 'Configured' : 'Missing');
    $('start').disabled = !result.configured || !!peer || !!startupTimer && !ready && !!connectionAbort && !connectionAbort.signal.aborted;
    $('agents').disabled = !result.configured || !!agentAbort;
  } catch { status('key-status', 'Status unavailable'); }
}
$('start').addEventListener('click', startVoice);
$('stop').addEventListener('click', () => requestClose('Finalizing…'));
$('agents').addEventListener('click', () => {
  const query = $('query').value.trim();
  if (query) void runAgent(query);
});
$('cancel-agents').addEventListener('click', () => { pendingDelegation = currentDelegation = null; clearTimeout(delegationTimer); cancelAgent(); });
window.addEventListener('pagehide', cleanup);
await loadProfile();
await refreshStatus();
setInterval(refreshStatus, 3000);
