'use client';

import { useRef, useState } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import styles from './question-bar.module.css';

/** Keyboard submissions and finalized voice transcripts should call the same handler. */
export type SubmitQuestion = (text: string) => void | Promise<void>;
export type QuestionBarProps = {
  onQuestion: SubmitQuestion;
  disabled?: boolean;
  busy?: boolean;
  onCancel?: () => void;
};

/** Input only: no microphone, provider session, renderer, or interpretation logic. */
export default function QuestionBar({ onQuestion, disabled = false, busy = false, onCancel }: QuestionBarProps) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const isBusy = busy || submitting;

  async function submit() {
    const question = text.trim();
    if (!question || disabled || isBusy || pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError('');
    setText('');
    try { await onQuestion(question); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'That question could not be sent. Please try again.'); }
    finally { pending.current = false; setSubmitting(false); }
  }

  return <div className={styles.input}>
    <form className={styles.bar} aria-label="Ask the Earth" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <input
        aria-label="Your question"
        placeholder="Ask the Earth…"
        value={text}
        onChange={event => setText(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)) event.preventDefault();
        }}
        maxLength={1000}
        autoComplete="off"
        enterKeyHint="send"
        disabled={disabled}
      />
      {isBusy && onCancel
        ? <button type="button" onClick={onCancel} aria-label="Cancel question"><Square size={16} /></button>
        : <button type="submit" disabled={disabled || isBusy || !text.trim()} aria-label="Send question"><ArrowUp size={19} /></button>}
    </form>
    {error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.hint}>{disabled ? 'Earth is loading…' : isBusy ? 'Following your question…' : 'Type a question and press Enter'}</p>}
  </div>;
}
