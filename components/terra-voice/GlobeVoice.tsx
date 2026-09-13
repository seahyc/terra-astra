'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, LoaderCircle } from 'lucide-react';
import { z } from 'zod';
import type { EvidenceTools } from '../../lib/terra/evidence/handlers';
import { planQuestion } from '../../lib/terra/answer-plan';
import { createLiveController } from './live-controller';
import styles from './globe-voice.module.css';
import QuestionBar from '../terra-input/QuestionBar';
import { readAnswerStream } from './answer-stream';
import { EvidencePanel } from '../terra-evidence/EvidencePanel';
import type { PresentationSnapshot } from '../../lib/terra/evidence/types';
import { worldAnswerSchema, immediateTarget, type WorldAnswer, type WorldTarget } from '../../lib/terra/world-answer';

type Props = { snapshot: PresentationSnapshot; tools: EvidenceTools; ready: boolean; onAskReady: (ask: ((question: string) => void) | null) => void };
export default function GlobeVoice({ tools, ready, onAskReady, snapshot }: Props) {
  const [voiceStatus, setVoiceStatus] = useState('off');
  const [progress, setProgress] = useState('');
  const [answer, setAnswer] = useState('');
  const [opening, setOpening] = useState('');
  const [spokenCaption,setSpokenCaption] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [world, setWorld] = useState<WorldAnswer | null>(null);
  const [activePlace, setActivePlace] = useState('');
  const worldTargets = useRef<WorldTarget[]>([]), focusedTarget = useRef('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<{who:'user'|'assistant';text:string}[]>([]);
  const [busy, setBusy] = useState(false);
  const live = useRef<ReturnType<typeof createLiveController> | null>(null);
  const active = useRef<AbortController | null>(null), revision = useRef(0);
  const askRef = useRef<(question: string, delegationId?: string) => void>(() => {});
  const focusTarget = useCallback((target: WorldTarget) => {
    if (focusedTarget.current === target.name) return;
    focusedTarget.current = target.name;
    setActivePlace(target.name);
    void tools.director.presentContext(target).then(result => { if (result.status === 'unavailable') setError('That place could not come into view. Try another location.'); });
  }, [tools]);
  const emphasize = useCallback((text: string) => {
    const phrases=text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)??[text];
    setSpokenCaption(phrases.at(-1)?.trim()??text);
    const mentioned = worldTargets.current.map(target => ({target, at:text.toLowerCase().lastIndexOf(target.name.toLowerCase())})).filter(item => item.at >= Math.max(0,text.length - 100)).sort((a,b) => b.at-a.at)[0];
    if (mentioned) focusTarget(mentioned.target);
    const recent = text.slice(-100).toLowerCase();
    const mention = [...recent.matchAll(/highest|mountain|above|lowest|deep|ocean floor|below|second link|causeway/g)].at(-1)?.[0] ?? '';
    const target = /lowest|deep|ocean floor|below/.test(mention) ? 'Lowest sample' : /highest|mountain|above/.test(mention) ? 'Highest sample' : mention === 'second link' ? 'second-link' : mention === 'causeway' ? 'causeway' : '';
    if (!target) return;
    document.querySelectorAll<SVGElement>('[data-evidence-label-id]').forEach(node => {
      const match = node.dataset.evidenceLabelId?.includes(target);
      node.style.filter = match ? 'drop-shadow(0 0 7px #d6c8ff)' : '';
      node.style.opacity = match ? '1' : '.6';
    });
  }, [focusTarget]);
  const ask = useCallback(async (question: string, delegationId?: string) => {
    if (!ready || !question.trim()) return;
    const id = ++revision.current;
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setError(''); setAnswer(''); setOpening(''); setSpokenCaption(''); setBusy(true); setQuestionText(question); setWorld(null); setActivePlace(''); worldTargets.current = []; focusedTarget.current = '';
    const selectedIds = tools.getSelection();
    try {
      const plan = planQuestion(question, selectedIds);
      const target = plan ? null : immediateTarget(question);
      if (!plan) tools.clearSelection();
      if (!plan && !target) tools.director.clear();
      setProgress(plan || target ? 'Following your question…' : 'Finding the places behind your question…');
      let rendering = plan ? tools.handlers.present({ evidenceIds: plan.evidenceIds, view: plan.view }) : target ? tools.director.presentContext(target) : null;
      if (target) focusedTarget.current = target.name;
      if (rendering) void rendering.then(() => { if (id === revision.current) setProgress('Exploring the details…'); });
      live.current?.context(`User question: ${question}. Wait for the backend answer. Never claim visual features or values that have not been returned.`);
      let response: Response | undefined;
      for (let attempt = 0; attempt < 12; attempt++) {
        controller.signal.throwIfAborted();
        response = await fetch('/api/terra/answer', { method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/x-ndjson'}, body: JSON.stringify({query:question, selectedIds, previous:world, previousQuestion:questionText}), signal:controller.signal });
        if (response.status !== 409) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const result = z.object({error:z.string().optional(), world:worldAnswerSchema.nullable().optional(), measured:z.object({output:z.string()}).optional()}).parse(await readAnswerStream(response!, (text, complete) => {
        if (id !== revision.current || controller.signal.aborted) return;
        setOpening(text);
        if(complete) live.current?.say(delegationId??null, `Start with this short opening now. The deeper answer is still being checked; do not add unverified details: ${text}`);
      }));
      if (!response!.ok) throw new Error(result.error || 'The explanation could not be completed.');
      if (id !== revision.current || controller.signal.aborted) return;
      if (!result.measured) throw new Error('The explanation was empty. Please try again.');
      if (result.world) {
        setWorld(result.world); worldTargets.current = result.world.targets;
        const first = result.world.targets[0];
        if (first) setActivePlace(first.name);
        if (!first) { tools.director.clear(); rendering = null; }
        if (first && (!target || first.name !== target.name)) {
          focusedTarget.current = first.name;
          rendering = tools.director.presentContext(first);
        }
      }
      const scene = rendering ? await rendering : null;
      if (id !== revision.current || controller.signal.aborted) return;
      if (scene && (!('ready' in scene) || !scene.ready)) throw new Error('The globe could not settle on that view. Please try again.');
      if (scene && tools.director.getSnapshot().scene?.revision !== scene.revision) return;
      const explanation = result.measured.output.replace(/\*\*|^[-#]\s/gm,'');
      setAnswer(explanation); setProgress('');
      if (plan) emphasize(explanation);
      live.current?.say(delegationId ?? null, `Continue with at most three short sentences; do not repeat the opening already spoken. ${scene ? "The geographic view is ready." : "No geographic view accompanies this answer."} ${result.world ? "This is background knowledge, not live or source-verified data. Approximate location anchors only; no historical routes or territories are shown." : "Use the measured evidence."} ${explanation}`);
    } catch (e) {
      if (id !== revision.current || controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : 'Something interrupted the explanation.';
      setError(message); setProgress('');
      live.current?.say(delegationId ?? null, `Tell the user briefly: ${message}`);
    } finally {
      if (id === revision.current) { setBusy(false); active.current = null; }
    }
  }, [tools, ready, emphasize, world, questionText]);
  useEffect(() => { askRef.current = (q, id) => { void ask(q,id); }; onAskReady(q => { void ask(q); }); return () => onAskReady(null); }, [ask, onAskReady]);
  useEffect(() => {
    const controller = createLiveController({
      onStatus:setVoiceStatus, onTranscript:setRows, onError:setError,
      onAssistantText:emphasize,
      onDelegation:({id,query}) => askRef.current(query,id),
    });
    live.current = controller;
    return () => { revision.current++; active.current?.abort(); controller.dispose(); live.current = null; };
  }, [emphasize]);
  const isOn = ['checking availability','requesting microphone','connecting','awaiting session start','started','finalizing'].includes(voiceStatus);
  const cancel = () => { revision.current++; active.current?.abort(); active.current = null; setBusy(false); setProgress(''); live.current?.stop(); };
  return <section className={styles.dock} data-active={Boolean(questionText)} aria-label="Ask the interactive Earth">
    {questionText && <p className={styles.question}>{questionText}</p>}
    <div className={styles.caption} aria-live="polite">
      {error ? <p role="alert" className={styles.error}>{error}</p> : (answer || opening) ? <p>{isOn && spokenCaption ? spokenCaption : (answer || opening).match(/^.*?[.!?](?:\s|$)/)?.[0] || (answer || opening)}</p> : isOn && rows.length ? <p>{rows.at(-1)?.text}</p> : progress ? <div className={styles.preload} aria-label="Preparing the explanation"><span/><span/><span/></div> : null}

    </div>
    {busy && <p className={styles.statusLine}><LoaderCircle size={10} className={styles.spin}/>{opening ? 'Opening context · checking the details' : progress}</p>}
    {snapshot.scene?.sculpture && <p className={styles.contextNote}>Illustrative starlight model · not a surveyed reconstruction</p>}
    {world && <p className={styles.contextNote}>Background knowledge · approximate places</p>}
    {world && <div className={styles.places}>{world.targets.map(target => <button key={target.name} aria-pressed={activePlace === target.name} onClick={() => focusTarget(target)}>{target.name}<span aria-hidden="true"> ↗</span></button>)}</div>}
    {answer && <details className={styles.explanation}><summary>{world ? 'Background & context' : 'Full explanation'}</summary><div><p>{answer}</p>{world && <p className={styles.limitation}>{world.limitation || 'Background knowledge; not checked against current sources.'} Map labels are approximate orientation points.</p>}</div></details>}
    {snapshot.scene?.measurement && <EvidencePanel snapshot={snapshot}/>}
    <div className={styles.inputRow}>
      <QuestionBar onQuestion={ask} disabled={!ready} busy={busy} onCancel={cancel}/>
      <button className={`${styles.voiceButton} ${isOn ? styles.active : ''}`} type="button" disabled={!ready} onClick={() => isOn ? cancel() : void live.current?.start()} aria-label={isOn ? 'Stop voice' : 'Talk to Earth'} title={isOn ? 'Stop voice' : 'Talk to Earth'}>{isOn ? <Square size={17}/> : <Mic size={20}/>}</button>
    </div>
    {isOn && <p className={styles.live}>Listening · interrupt anytime</p>}
  </section>;
}
