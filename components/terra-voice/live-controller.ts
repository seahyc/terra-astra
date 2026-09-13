export type TranscriptRow = {
  who: "user" | "assistant";
  text: string;
};

export type LiveDelegation = {
  id: string;
  query: string;
};

export type PlaybackState = "idle" | "playing" | "blocked" | "unavailable";

export type LiveControllerCallbacks = {
  onPlaybackState?: (state: PlaybackState) => void;
  onStatus: (status: string) => void;
  onTranscript: (rows: TranscriptRow[]) => void;
  onDelegation: (delegation: LiveDelegation) => void;
  onAssistantText: (text: string) => void;
  onError: (message: string) => void;
};

export type LiveController = {
  start: () => Promise<void>;
  resumeAudio: () => Promise<void>;
  stop: () => void;
  dispose: () => void;
  say: (delegationId: string | null, content: string) => void;
  context: (content: string) => void;
};

type TranscriptFragment = TranscriptRow & {
  startMs?: number;
  endMs?: number;
};

type LiveEvent = Record<string, unknown>;

// Prime the same output element in the microphone click, before any network awaits.
// Browsers may still require the explicit Enable audio action for the remote stream.
const SILENT_AUDIO = "data:audio/wav;base64,UklGRsQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

const STARTUP_TIMEOUT_MS = 30_000;
const GRACEFUL_CLOSE_TIMEOUT_MS = 15_000;
const DELEGATION_SETTLE_MS = 650;
const DISCONNECT_TIMEOUT_MS = 8_000;
const MAX_EVENT_BYTES = 480;

export function createLiveController(
  callbacks: LiveControllerCallbacks,
): LiveController {
  let peer: RTCPeerConnection | null = null;
  let channel: RTCDataChannel | null = null;
  let microphone: MediaStream | null = null;
  let audio: HTMLAudioElement | null = null;
  let playbackAttempt = 0;
  let connectionAbort: AbortController | null = null;
  let generation = 0;
  let ready = false;
  let closing = false;
  let disposed = false;
  let eventSequence = 0;
  let fragments: TranscriptFragment[] = [];
  let startupTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let delegationTimer: ReturnType<typeof setTimeout> | null = null;
  let disconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pendingDelegation: { id: string; generation: number } | null = null;
  let consumedFragmentCount = 0;
  let consumedEndMs = -1;
  const handledDelegations = new Set<string>();
  const receivedEvents = new Set<string>();

  const reportError = (message: string) => callbacks.onError(message);

  function clearTimer(timer: ReturnType<typeof setTimeout> | null): null {
    if (timer !== null) clearTimeout(timer);
    return null;
  }

  function groupedTranscript(): TranscriptRow[] {
    const rows: TranscriptRow[] = [];
    for (const fragment of fragments) {
      if (!fragment.text) continue;
      const previous = rows.at(-1);
      if (previous?.who === fragment.who) previous.text += fragment.text;
      else rows.push({ who: fragment.who, text: fragment.text });
    }
    return rows;
  }

  function emitTranscript(): void {
    callbacks.onTranscript(groupedTranscript().map((row) => ({ ...row })));
  }

  function retainedQuery(): string {
    return fragments.slice(consumedFragmentCount)
      .filter(fragment => fragment.who === 'user' && (fragment.endMs === undefined || fragment.endMs > consumedEndMs))
      .map(fragment => fragment.text).join('').trim();
  }

  function releaseResources(): void {
    generation += 1;
    playbackAttempt += 1;
    callbacks.onPlaybackState?.("idle");
    ready = false;
    closing = false;
    pendingDelegation = null;
    startupTimer = clearTimer(startupTimer);
    closeTimer = clearTimer(closeTimer);
    delegationTimer = clearTimer(delegationTimer);
    disconnectTimer = clearTimer(disconnectTimer);
    connectionAbort?.abort();
    connectionAbort = null;
    microphone?.getTracks().forEach((track) => track.stop());
    microphone = null;
    try {
      channel?.close();
    } catch {
      // Already closed.
    }
    channel = null;
    try {
      peer?.close();
    } catch {
      // Already closed.
    }
    peer = null;
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.removeAttribute("src");
      audio.load();
    }
    audio = null;
  }

  function isCurrent(runGeneration: number): boolean {
    return !disposed && runGeneration === generation;
  }

  async function resumeAudio(): Promise<void> {
    const output = audio;
    if (!output?.srcObject || disposed || closing) return;
    const runGeneration = generation;
    const attempt = ++playbackAttempt;
    const current = () => isCurrent(runGeneration) && !closing && audio === output && attempt === playbackAttempt;
    try {
      // Keep play() before the first await so a recovery click retains its gesture.
      await output.play();
      if (current()) callbacks.onPlaybackState?.("playing");
    } catch (error) {
      if (!current()) return;
      // A replaced source or Stop can interrupt play without an autoplay denial.
      const name = error instanceof Error ? error.name : "";
      if (name === "AbortError") return;
      callbacks.onPlaybackState?.(name === "NotAllowedError" ? "blocked" : "unavailable");
    }
  }

  function failConnection(message: string): void {
    reportError(message);
    callbacks.onStatus('error');
    releaseResources();
  }

  function activeStatus(): void {
    if (!ready || closing) return;
    callbacks.onStatus(peer?.connectionState === 'disconnected' ? 'reconnecting'
      : microphone?.getAudioTracks().some(track => track.muted || !track.enabled) ? 'microphone muted' : 'started');
  }

  function sendEvent(event: Record<string, unknown>): boolean {
    if (!ready || closing || channel?.readyState !== "open") {
      reportError("The live session is not ready to receive an event.");
      return false;
    }
    try {
      channel.send(JSON.stringify(event));
      return true;
    } catch (error) {
      reportError(error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  function utf8Chunks(content: string): string[] {
    const chunks: string[] = [];
    let current = "";
    let bytes = 0;
    for (const character of content) {
      const size = new TextEncoder().encode(character).byteLength;
      if (current && bytes + size > MAX_EVENT_BYTES) {
        chunks.push(current);
        current = "";
        bytes = 0;
      }
      current += character;
      bytes += size;
    }
    if (current) chunks.push(current);
    return chunks;
  }

  function appendContent(
    type: "session.commentary.append" | "session.thinking.append",
    delegationId: string | null,
    content: string,
  ): void {
    if (!ready || closing || disposed) return;
    const trimmed = content.trim();
    if (!trimmed) return;
    for (const chunk of utf8Chunks(trimmed)) {
      if (
        !sendEvent({
          type,
          event_id: `terra-${Date.now()}-${eventSequence++}`,
          delegation_id: delegationId,
          content: chunk,
        })
      ) {
        break;
      }
    }
  }

  function scheduleDelegation(delay = DELEGATION_SETTLE_MS): void {
    if (!pendingDelegation || delegationTimer !== null) return;
    const scheduled = pendingDelegation;
    delegationTimer = setTimeout(() => {
      delegationTimer = null;
      if (
        !pendingDelegation ||
        pendingDelegation.id !== scheduled.id ||
        pendingDelegation.generation !== scheduled.generation ||
        !isCurrent(scheduled.generation) || closing || !ready
      ) {
        return;
      }
      const query = retainedQuery();
      if (!query) return;
      pendingDelegation = null;
      consumedFragmentCount = fragments.length;
      consumedEndMs = Math.max(consumedEndMs, ...fragments.filter(fragment => fragment.who === 'user').map(fragment => fragment.endMs ?? -1));
      handledDelegations.add(scheduled.id);
      callbacks.onDelegation({ id: scheduled.id, query });
    }, delay);
  }

  function addTranscript(
    who: TranscriptRow["who"],
    event: LiveEvent,
  ): void {
    const delta = typeof event.delta === "string" ? event.delta : "";
    if (!delta) return;
    fragments.push({
      who,
      text: delta,
      startMs: typeof event.start_ms === "number" ? event.start_ms : undefined,
      endMs: typeof event.end_ms === "number" ? event.end_ms : undefined,
    });
    emitTranscript();
    if (who === "assistant") callbacks.onAssistantText(groupedTranscript().filter(row => row.who === "assistant").at(-1)?.text ?? delta);
    if (who === "user" && pendingDelegation) {
      // Transcript events are fragments, not complete turns. Wait for the
      // latest words to settle instead of submitting the first partial phrase.
      delegationTimer = clearTimer(delegationTimer);
      scheduleDelegation();
    }
  }

  function usageStatus(event: LiveEvent): string {
    const usage = event.usage;
    return usage && typeof usage === "object"
      ? `closed · usage ${JSON.stringify(usage)}`
      : "closed";
  }

  function receive(raw: string, runGeneration: number): void {
    if (!isCurrent(runGeneration)) return;
    let event: LiveEvent;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      event = parsed as LiveEvent;
    } catch {
      reportError("The live session sent malformed JSON.");
      return;
    }
    if (typeof event.event_id === 'string') {
      if (receivedEvents.has(event.event_id)) return;
      receivedEvents.add(event.event_id);
      if (receivedEvents.size > 2000) receivedEvents.delete(receivedEvents.values().next().value!);
    }

    switch (event.type) {
      case "session.started":
        if (ready) return;
        ready = true;
        startupTimer = clearTimer(startupTimer);
        activeStatus();
        break;
      case "session.input_transcript.delta":
        addTranscript("user", event);
        break;
      case "session.output_transcript.delta":
        addTranscript("assistant", event);
        break;
      case "session.delegation.created": {
        if (closing || !ready) return;
        const target = event.delegation;
        const delegation =
          target && typeof target === "object"
            ? (target as Record<string, unknown>)
            : null;
        const id =
          delegation?.target === "client" && typeof delegation.id === "string"
            ? delegation.id
            : null;
        if (!id || handledDelegations.has(id) || pendingDelegation?.id === id) return;
        delegationTimer = clearTimer(delegationTimer);
        pendingDelegation = { id, generation: runGeneration };
        scheduleDelegation();
        break;
      }
      case "session.closed":
        callbacks.onStatus(usageStatus(event));
        releaseResources();
        break;
      case "error": {
        const detail = event.error;
        const message =
          detail && typeof detail === "object" &&
          typeof (detail as Record<string, unknown>).message === "string"
            ? String((detail as Record<string, unknown>).message)
            : "The live session reported an error.";
        reportError(message);
        break;
      }
    }
  }

  function waitForIceComplete(
    connection: RTCPeerConnection,
    runGeneration: number,
  ): Promise<void> {
    if (connection.iceGatheringState === "complete") return Promise.resolve();
    return new Promise((resolve, reject) => {
      const signal = connectionAbort?.signal;
      const finish = (error?: Error) => {
        clearTimeout(timer);
        connection.removeEventListener("icegatheringstatechange", onChange);
        signal?.removeEventListener("abort", onAbort);
        if (error) reject(error); else resolve();
      };
      const onAbort = () => finish(new DOMException("Connection superseded", "AbortError"));
      const onChange = () => {
        if (!isCurrent(runGeneration)) onAbort();
        else if (connection.iceGatheringState === "complete") finish();
      };
      const timer = setTimeout(() => finish(new Error("Connection negotiation timed out.")), 10000);
      connection.addEventListener("icegatheringstatechange", onChange);
      signal?.addEventListener("abort", onAbort, {once:true});
      if (signal?.aborted) onAbort(); else onChange();
    });
  }

  async function start(): Promise<void> {
    if (disposed) {
      reportError("This live controller has been disposed.");
      return;
    }
    releaseResources();
    const runGeneration = generation;
    fragments = [];
    consumedFragmentCount = 0;
    consumedEndMs = -1;
    handledDelegations.clear();
    receivedEvents.clear();
    emitTranscript();
    callbacks.onStatus("checking availability");
    connectionAbort = new AbortController();
    startupTimer = setTimeout(() => {
      if (!isCurrent(runGeneration) || ready) return;
      reportError("The live session did not start within 30 seconds.");
      callbacks.onStatus("startup timed out");
      releaseResources();
    }, STARTUP_TIMEOUT_MS);

    try {
      audio = new Audio(SILENT_AUDIO);
      audio.autoplay = true;
      audio.setAttribute("playsinline", "");
      // This best-effort gesture preparation must not delay microphone startup.
      void audio.play().catch(() => {});
      const statusResponse = await fetch("/api/terra/status", {
        signal: connectionAbort.signal,
        cache: "no-store",
      });
      const status: unknown = await statusResponse.json();
      if (status && typeof status === 'object' && (status as Record<string, unknown>).signedIn === false) throw new Error('Sign in with ChatGPT to use voice.');
      if (
        !statusResponse.ok ||
        !status ||
        typeof status !== "object" ||
        (status as Record<string, unknown>).configured !== true
      ) {
        throw new Error("Live voice is not configured on this server.");
      }
      if (!isCurrent(runGeneration)) return;

      callbacks.onStatus("requesting microphone");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access is unavailable in this browser. Open the HTTPS site in a browser with microphone support.');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: {
        echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      } });
      if (!isCurrent(runGeneration)) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      microphone = stream;
      const tracks = stream.getAudioTracks();
      if (!tracks.some(track => track.readyState === 'live')) throw new Error('The microphone did not provide an active audio track. Check your input device and try again.');
      for (const track of tracks) {
        track.addEventListener('ended', () => {
          if (isCurrent(runGeneration) && !closing) failConnection('The microphone stopped. Reconnect your input device, then tap the microphone to try again.');
        });
        for (const type of ['mute', 'unmute']) track.addEventListener(type, () => {
          if (isCurrent(runGeneration)) activeStatus();
        });
      }
      peer = new RTCPeerConnection();
      peer.addEventListener("track", (trackEvent) => {
        if (!isCurrent(runGeneration) || !audio) return;
        audio.srcObject = new MediaStream([trackEvent.track]);
        void resumeAudio();
      });
      peer.addEventListener("connectionstatechange", () => {
        if (!isCurrent(runGeneration) || closing || !peer) return;
        if (peer.connectionState === "failed") {
          failConnection('The voice connection was lost. Tap the microphone to reconnect.');
        } else if (peer.connectionState === 'disconnected') {
          activeStatus();
          if (disconnectTimer === null) disconnectTimer = setTimeout(() => {
            if (isCurrent(runGeneration) && !closing && peer?.connectionState === 'disconnected') failConnection('The voice connection was lost. Tap the microphone to reconnect.');
          }, DISCONNECT_TIMEOUT_MS);
        } else if (peer.connectionState === 'connected') {
          disconnectTimer = clearTimer(disconnectTimer);
          activeStatus();
        }
      });
      for (const track of tracks) peer.addTrack(track, stream);

      channel = peer.createDataChannel("oai-events");
      channel.addEventListener("message", (message) => {
        if (typeof message.data === "string") receive(message.data, runGeneration);
      });
      channel.addEventListener("close", () => {
        if (!isCurrent(runGeneration)) return;
        if (!closing) reportError('The voice connection closed. Tap the microphone to reconnect.');
        callbacks.onStatus("disconnected; final usage unconfirmed");
        releaseResources();
      });

      callbacks.onStatus("connecting");
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await waitForIceComplete(peer, runGeneration);
      if (!isCurrent(runGeneration) || !peer.localDescription?.sdp) return;

      const sessionResponse = await fetch("/api/terra/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sdp: peer.localDescription.sdp }),
        signal: connectionAbort.signal,
      });
      const session: unknown = await sessionResponse.json();
      if (!sessionResponse.ok) {
        const message =
          session && typeof session === "object" &&
          typeof (session as Record<string, unknown>).error === "string"
            ? String((session as Record<string, unknown>).error)
            : `Live session request failed (${sessionResponse.status}).`;
        throw new Error(message);
      }
      const transport =
        session && typeof session === "object"
          ? (session as Record<string, unknown>).transport
          : null;
      const sdp =
        transport && typeof transport === "object" &&
        typeof (transport as Record<string, unknown>).sdp === "string"
          ? String((transport as Record<string, unknown>).sdp)
          : null;
      if (!sdp) throw new Error("Live session response did not include answer SDP.");
      if (!isCurrent(runGeneration) || !peer) return;
      await peer.setRemoteDescription({ type: "answer", sdp });
      if (!ready) callbacks.onStatus("awaiting session start");
    } catch (error) {
      if (!isCurrent(runGeneration)) return;
      const name = error instanceof Error ? error.name : '';
      const message = name === 'NotAllowedError' ? 'Microphone permission was denied. Allow microphone access for this site, then try again.'
        : name === 'NotFoundError' ? 'No microphone was found. Connect an input device and try again.'
        : name === 'NotReadableError' ? 'The microphone could not be opened. Check whether another app or your device settings are blocking it.'
        : error instanceof Error ? error.message : "Live voice failed to start.";
      reportError(message);
      callbacks.onStatus("error");
      releaseResources();
    }
  }

  function stop(): void {
    if (disposed || closing) return;
    pendingDelegation = null;
    delegationTimer = clearTimer(delegationTimer);
    if (!ready || channel?.readyState !== "open") {
      callbacks.onStatus("stopped");
      releaseResources();
      return;
    }
    closing = true;
    microphone?.getTracks().forEach((track) => track.stop());
    microphone = null;
    playbackAttempt += 1;
    callbacks.onPlaybackState?.("idle");
    callbacks.onStatus("finalizing");
    try {
      channel.send(
        JSON.stringify({
          type: "session.close",
          event_id: `terra-${Date.now()}-${eventSequence++}`,
        }),
      );
    } catch {
      callbacks.onStatus("disconnected; final usage unconfirmed");
      releaseResources();
      return;
    }
    const runGeneration = generation;
    closeTimer = setTimeout(() => {
      if (!isCurrent(runGeneration)) return;
      callbacks.onStatus("closed; final usage unconfirmed");
      releaseResources();
    }, GRACEFUL_CLOSE_TIMEOUT_MS);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    releaseResources();
    callbacks.onStatus("disposed");
  }

  return {
    start,
    resumeAudio,
    stop,
    dispose,
    say: (delegationId, content) =>
      appendContent("session.commentary.append", delegationId, content),
    context: (content) =>
      appendContent("session.thinking.append", null, content),
  };
}
