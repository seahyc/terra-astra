import test from 'node:test';
import assert from 'node:assert/strict';
import { createLiveController } from '../components/terra-voice/live-controller.ts';

function harness(t, { getUserMedia } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const statuses = [], errors = [], delegations = [], transcripts = [];
  class Track extends EventTarget {
    kind = 'audio'; readyState = 'live'; enabled = true; muted = false;
    stop() { this.readyState = 'ended'; }
  }
  const track = new Track();
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  class Channel extends EventTarget {
    readyState = 'open'; sent = [];
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = 'closed'; this.dispatchEvent(new Event('close')); }
  }
  const peers = [];
  class Peer extends EventTarget {
    iceGatheringState = 'complete'; connectionState = 'connected'; localDescription = null;
    constructor() { super(); peers.push(this); }
    addTrack() {}
    createDataChannel() { return this.channel = new Channel(); }
    async createOffer() { return { type: 'offer', sdp: 'offer' }; }
    async setLocalDescription(offer) { this.localDescription = offer; }
    async setRemoteDescription() {}
    close() { this.connectionState = 'closed'; }
  }
  class Audio { autoplay = false; pause() {} load() {} removeAttribute() {} async play() {} }
  const originals = new Map();
  for (const [key, value] of Object.entries({
    navigator: { mediaDevices: { getUserMedia: getUserMedia ?? (async () => stream) } },
    RTCPeerConnection: Peer, Audio,
    fetch: async url => Response.json(url.endsWith('/status') ? { configured: true, signedIn: true } : { transport: { sdp: 'answer' } }),
  })) {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const controller = createLiveController({
    onStatus: value => statuses.push(value), onError: value => errors.push(value),
    onDelegation: value => delegations.push(value), onTranscript: value => transcripts.push(value), onAssistantText() {},
  });
  t.after(() => {
    controller.dispose();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key];
    }
  });
  const receive = data => peers.at(-1).channel.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(data) }));
  return { controller, track, stream, statuses, errors, delegations, transcripts, receive, get peer() { return peers.at(-1); },
    async start() { await controller.start(); receive({ type: 'session.started' }); },
    input(delta, start_ms = 0, end_ms = 500) { receive({ type: 'session.input_transcript.delta', delta, start_ms, end_ms }); },
    delegate(id, offset_ms = 500) { receive({ type: 'session.delegation.created', offset_ms, delegation: { target: 'client', id } }); },
  };
}

test('late transcript fragments settle before one complete question is dispatched', async t => {
  const h = harness(t); await h.start();
  h.input('Show me '); h.delegate('first'); t.mock.timers.tick(500);
  h.input('Tokyo.', 500, 1000); t.mock.timers.tick(151);
  assert.equal(h.delegations.length, 0, 'Do not dispatch on the original timer while words still arrive');
  t.mock.timers.tick(500);
  assert.deepEqual(h.delegations, [{ id: 'first', query: 'Show me Tokyo.' }]);
});

test('a new delegation waits for new words instead of replaying the previous question', async t => {
  const h = harness(t); await h.start();
  h.input('Show Tokyo.', 0, 500); h.delegate('first'); t.mock.timers.tick(700);
  h.delegate('second', 2000); t.mock.timers.tick(700);
  assert.equal(h.delegations.length, 1, 'Old transcript must not be reused');
  h.input('Now Singapore.', 1600, 2000); t.mock.timers.tick(700);
  assert.deepEqual(h.delegations[1], { id: 'second', query: 'Now Singapore.' });
});

test('microphone ending is visible and releases the broken session', async t => {
  const h = harness(t); await h.start();
  h.track.readyState = 'ended'; h.track.dispatchEvent(new Event('ended'));
  assert.match(h.errors.at(-1) ?? '', /microphone.*stopped/i);
  assert.equal(h.peer.connectionState, 'closed');
});

test('transient microphone mute recovers without silently remaining in listening state', async t => {
  const h = harness(t); await h.start();
  h.track.muted = true; h.track.dispatchEvent(new Event('mute'));
  assert.equal(h.statuses.at(-1), 'microphone muted');
  h.track.muted = false; h.track.dispatchEvent(new Event('unmute'));
  assert.equal(h.statuses.at(-1), 'started');
});

test('temporary transport loss recovers but a persistent loss reports retry', async t => {
  const h = harness(t); await h.start();
  h.peer.connectionState = 'disconnected'; h.peer.dispatchEvent(new Event('connectionstatechange'));
  assert.equal(h.statuses.at(-1), 'reconnecting');
  t.mock.timers.tick(2000);
  h.peer.connectionState = 'connected'; h.peer.dispatchEvent(new Event('connectionstatechange'));
  t.mock.timers.tick(10000); assert.equal(h.peer.connectionState, 'connected');
  h.peer.connectionState = 'disconnected'; h.peer.dispatchEvent(new Event('connectionstatechange'));
  t.mock.timers.tick(10000);
  assert.match(h.errors.at(-1) ?? '', /connection.*lost/i);
  assert.equal(h.peer.connectionState, 'closed');
});

test('microphone permission returning after Stop cannot reopen the session', async t => {
  let resolve;
  const h = harness(t, { getUserMedia: () => new Promise(r => { resolve = r; }) });
  const starting = h.controller.start();
  for (let i = 0; i < 10 && !resolve; i++) await Promise.resolve();
  assert.equal(typeof resolve, 'function');
  h.controller.stop(); resolve(h.stream); await starting;
  assert.equal(h.track.readyState, 'ended'); assert.equal(h.peer, undefined);
});

test('repeated transcript and delegation events cannot duplicate a question', async t => {
  const h = harness(t); await h.start();
  const fragment = { type: 'session.input_transcript.delta', event_id: 'transcript-1', delta: 'Show Tokyo.', start_ms: 0, end_ms: 500 };
  h.receive(fragment); h.receive(fragment); h.delegate('first'); t.mock.timers.tick(700);
  h.delegate('first'); t.mock.timers.tick(700);
  assert.deepEqual(h.delegations, [{ id: 'first', query: 'Show Tokyo.' }]);
});

test('Stop prevents buffered delegation events from starting another answer', async t => {
  const h = harness(t); await h.start();
  h.input('Show Tokyo.'); h.delegate('first'); h.controller.stop();
  h.delegate('buffered'); t.mock.timers.tick(700);
  assert.equal(h.delegations.length, 0);
  assert.equal(h.peer.channel.sent.at(-1).type, 'session.close');
  h.receive({ type: 'session.closed' });
  assert.equal(h.track.readyState, 'ended');
});

test('voice stays active beyond three minutes and still accepts questions until Stop', async t => {
  const h = harness(t); await h.start(); t.mock.timers.tick(240000);
  assert.equal(h.statuses.at(-1), 'started');
  assert.equal(h.errors.length, 0); assert.equal(h.track.readyState, 'live');
  assert.equal(h.peer.channel.sent.length, 0, 'Elapsed time alone must not close voice');
  h.input('Show Singapore.', 240000, 240500); h.delegate('after-four-minutes', 240500);
  t.mock.timers.tick(700);
  assert.deepEqual(h.delegations, [{ id: 'after-four-minutes', query: 'Show Singapore.' }]);
  h.controller.stop(); assert.equal(h.peer.channel.sent.at(-1).type, 'session.close');
  h.receive({ type: 'session.closed' });
  assert.equal(h.track.readyState, 'ended'); assert.equal(h.peer.connectionState, 'closed');
});

test('permission denial produces actionable feedback and no peer connection', async t => {
  const h = harness(t, { getUserMedia: async () => { throw new DOMException('Permission denied', 'NotAllowedError'); } });
  await h.controller.start();
  assert.match(h.errors.at(-1) ?? '', /Allow microphone access/i);
  assert.equal(h.statuses.at(-1), 'error'); assert.equal(h.peer, undefined);
});
