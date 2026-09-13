'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import styles from './globe-voice.module.css';

const statusSchema = z.object({
  configured: z.boolean(),
  signedIn: z.boolean(),
  provider: z.literal('codex'),
  account: z.object({ email: z.string().nullable().optional(), planType: z.string().nullable().optional() }).optional(),
  login: z.object({ verificationUrl: z.string().url(), userCode: z.string() }).optional(),
  error: z.string().optional(),
});
const errorSchema = z.object({ error: z.string().min(1) });

function responseError(raw: unknown, fallback: string) {
  const parsed = errorSchema.safeParse(raw);
  return parsed.success ? parsed.data.error : fallback;
}

export type CodexStatus = z.infer<typeof statusSchema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onConnected: (status: CodexStatus) => void;
  onDisconnected: () => void;
};

export async function readCodexStatus(signal?: AbortSignal) {
  const response = await fetch('/api/explore/status', { signal });
  const raw: unknown = await response.json();
  if (!response.ok) throw new Error(responseError(raw, 'ChatGPT connection status is unavailable.'));
  return statusSchema.parse(raw);
}

export default function CodexConnection({ open, onClose, onConnected, onDisconnected }: Props) {
  const [status, setStatus] = useState<CodexStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const polling = useRef(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const next = await readCodexStatus(signal);
      setStatus(next);
      setError(next.error ?? '');
      if (next.signedIn) onConnected(next);
      return next;
    } catch (cause) {
      if (!signal?.aborted) setError(cause instanceof Error ? cause.message : 'ChatGPT connection status is unavailable.');
      return null;
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onConnected]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    queueMicrotask(() => { if (!controller.signal.aborted) void refresh(controller.signal); });
    return () => controller.abort();
  }, [open, refresh]);

  useEffect(() => {
    if (!open || !status?.login || status.signedIn) return;
    polling.current = true;
    const controller = new AbortController();
    const timer = window.setInterval(() => { if (polling.current) void refresh(controller.signal); }, 3000);
    return () => { polling.current = false; window.clearInterval(timer); controller.abort(); };
  }, [open, refresh, status?.login, status?.signedIn]);

  const connect = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/explore/auth/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const raw: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(raw, 'ChatGPT connection could not start.'));
      const next = statusSchema.parse(raw);
      setStatus(next);
      if (next.signedIn) onConnected(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ChatGPT connection could not start.');
    } finally { setLoading(false); }
  };

  const disconnect = async () => {
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/explore/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const raw: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(raw, 'ChatGPT could not be disconnected.'));
      const next = statusSchema.parse(raw);
      setStatus(next); onDisconnected();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ChatGPT could not be disconnected.');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  return <div className={styles.connection} role="dialog" aria-label="Connect ChatGPT">
    <div><strong>{status?.signedIn ? 'ChatGPT connected' : 'Connect ChatGPT to answer'}</strong><p>{status?.signedIn ? (status.account?.email || 'Your browser session is ready.') : status?.configured === false ? (status.error || 'ChatGPT connection is not configured on this server.') : 'Uses your Codex allowance. ChatGPT memories are not imported.'}</p></div>
    {status?.login && !status.signedIn && <div className={styles.deviceCode}><span>Enter this code</span><b>{status.login.userCode}</b><a href={status.login.verificationUrl} target="_blank" rel="noopener noreferrer">Open ChatGPT</a></div>}
    {error && <p className={styles.connectionError} role="alert">{error}</p>}
    <div className={styles.connectionActions}>{status?.signedIn ? <button type="button" disabled={loading} onClick={() => void disconnect()}>{loading ? 'Disconnecting…' : 'Disconnect'}</button> : !status?.login && <button type="button" disabled={loading || status?.configured === false} onClick={() => void connect()}>{loading ? 'Checking…' : 'Connect ChatGPT'}</button>}<button type="button" className={styles.quietButton} onClick={onClose}>Close</button></div>
  </div>;
}
