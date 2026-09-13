'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import QuestionBar from '../terra-input/QuestionBar';
import { createLiveController, type TranscriptRow } from './live-controller';
import { readAnswerStream } from './answer-stream';
import { executeLiveNavigation, planLiveNavigation } from './world-navigator';
import styles from './globe-voice.module.css';

type Props = { ready: boolean; onAskReady?: (ask: ((question: string) => void) | null) => void };
type LiveController = ReturnType<typeof createLiveController>;

/** The Live transport delegates full questions to the same bounded visual/answer path as typing. */
export default function GlobeVoice({ ready, onAskReady }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('off');
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const live = useRef<LiveController | null>(null);
  const active = useRef<AbortController | null>(null);
  const askRef = useRef<(question: string, delegationId?: string) => Promise<void>>(async () => {});

  const ask = useCallback(async (question: string, delegationId?: string) => {
    if (!ready || !question.trim()) return;
    active.current?.abort();
    const request = new AbortController();
    active.current = request;
    setOpen(true); setBusy(true); setError(''); setAnswer('');
    try {
      const plan = planLiveNavigation(question);
      if (plan) {
        setAnswer(plan.acknowledgement);
        const result = await executeLiveNavigation(plan, {
          signal: request.signal,
          onDispatch: (_command, index) => { if (index === 0) live.current?.say(delegationId ?? null, plan.acknowledgement); },
        });
        if (request.signal.aborted) return;
        if (!result.ok) throw new Error(result.reason ?? 'The world could not move there.');
        setAnswer(plan.context);
        live.current?.say(delegationId ?? null, plan.context);
        return;
      }
      const response = await fetch('/api/terra/answer', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
        body: JSON.stringify({ query: question, selectedIds: [], previous: null }), signal: request.signal,
      });
      const data = await readAnswerStream(response, (text, complete) => {
        if (request.signal.aborted) return;
        setAnswer(text);
        if (complete) live.current?.say(delegationId ?? null, text);
      }) as { error?: string; measured?: { output?: string }; answer?: string };
      if (request.signal.aborted) return;
      if (!response.ok || data.error) throw new Error(data.error ?? 'The answer service is unavailable.');
      const text = data.measured?.output ?? data.answer;
      if (typeof text !== 'string' || !text.trim()) throw new Error('The answer service returned no answer.');
      setAnswer(text);
      live.current?.say(delegationId ?? null, text);
    } catch (cause) {
      if (!request.signal.aborted) setError(cause instanceof Error ? cause.message : 'The request could not complete.');
    } finally {
      if (active.current === request) { active.current = null; setBusy(false); }
    }
  }, [ready]);
  askRef.current = ask;

  useEffect(() => {
    live.current = createLiveController({
      onStatus: setStatus, onTranscript: setRows, onError: setError,
      onAssistantText: setAnswer,
      onDelegation: ({ id, query }) => { void askRef.current(query, id); },
    });
    return () => { active.current?.abort(); live.current?.dispose(); live.current = null; };
  }, []);
  useEffect(() => {
    onAskReady?.((question) => { void ask(question); });
    return () => onAskReady?.(null);
  }, [ask, onAskReady]);

  const connected = !['off', 'stopped', 'error', 'startup timed out', 'disconnected'].includes(status) && !status.startsWith('closed') && !status.startsWith('disconnected');
  const statusLabel = status.startsWith('closed') || ['off', 'stopped'].includes(status) ? 'Voice off' : status === 'started' ? 'Listening' : status;
  return <aside className={styles.dock} aria-label="Astra navigation">
    <div className={styles.heading}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}>Ask Astra <span>{open ? '−' : '+'}</span></button>
      <button type="button" disabled={!ready} onClick={() => { setOpen(true); setError(''); if (connected) live.current?.stop(); else void live.current?.start(); }} aria-label={connected ? 'Stop Live voice' : 'Start Live voice'}>{connected ? 'Stop voice' : 'Talk'}</button>
    </div>
    {open && <div className={styles.body}>
      <p className={styles.status}>Live · {statusLabel}</p>
      <QuestionBar onQuestion={(text) => ask(text)} disabled={!ready} busy={busy} onCancel={() => { active.current?.abort(); active.current = null; setBusy(false); }} />
      {answer && <p className={styles.answer} aria-live="polite">{answer}</p>}
      {error && <p className={styles.error} role="alert">{error}{/sign.?in|signed in/i.test(error) && <> <a href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT</a></>}</p>}
      {rows.length > 0 && <details className={styles.transcript}><summary>Conversation</summary>{rows.slice(-6).map((row, index) => <p key={index}><strong>{row.who === 'user' ? 'You' : 'Astra'}:</strong> {row.text}</p>)}</details>}
      {!answer && <p className={styles.hint}>Try “Show me the vibe in New York.”</p>}
    </div>}
  </aside>;
}
