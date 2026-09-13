'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Square, LoaderCircle } from 'lucide-react';
import { z } from 'zod';
import { createLiveController } from './live-controller';
import styles from './globe-voice.module.css';
import QuestionBar from '../terra-input/QuestionBar';
import { readAnswerStream } from './answer-stream';
import { worldAnswerSchema, type WorldAnswer, type WorldTarget as GeneratedWorldTarget } from '../../lib/terra/world-answer';
import { getWorldState, subscribeWorldState } from '../../lib/world/bridge';
import { WORLD_TARGETS, type WorldCommand, type WorldState, type WorldTarget as CatalogueWorldTarget } from '../../lib/world/commands';
import { catalogueTargetIdInQuestion, executeLiveNavigation, planLiveNavigation } from './world-navigator';
import { suggestedPerspective } from './world-navigator';
import AnswerImage from './AnswerImage';

type Props = { ready: boolean; onAskReady: (ask: ((question: string) => void) | null) => void };

function catalogueTarget(target: GeneratedWorldTarget): CatalogueWorldTarget | null {
  const name = target.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (name === 'mariana trench') return WORLD_TARGETS.find(item => item.id === 'challenger-deep') ?? null;
  return WORLD_TARGETS.find(item => item.label.toLowerCase() === name) ?? null;
}

function lastSentence(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g);
  return sentences?.at(-1)?.trim() ?? text.trim();
}

function answerWithLinks(text: string) {
  return text.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).map((part,index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    return match ? <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a> : part;
  });
}

export default function GlobeVoice({ ready, onAskReady }: Props) {
  const [voiceStatus, setVoiceStatus] = useState('off');
  const [needsSignIn, setNeedsSignIn] = useState(false);
  useEffect(() => { const controller = new AbortController(); void fetch('/api/terra/status', { signal: controller.signal }).then(r => r.json()).then(status => setNeedsSignIn(Boolean(status && typeof status === 'object' && 'signedIn' in status && status.signedIn === false))).catch(() => {}); return () => controller.abort(); }, []);
  const [progress, setProgress] = useState('');
  const [answer, setAnswer] = useState('');
  const [opening, setOpening] = useState('');
  const [spokenCaption,setSpokenCaption] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [world, setWorld] = useState<WorldAnswer | null>(null);
  const [sources, setSources] = useState<{url:string;title:string}[]>([]);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<{who:'user'|'assistant';text:string}[]>([]);
  const [busy, setBusy] = useState(false);
  const [answerImage, setAnswerImage] = useState<{ title: string; imageUrl?: string; loading: boolean; error?: string } | null>(null);
  const [navigationState, setNavigationState] = useState<WorldState | null>(() => getWorldState());
  const [transcriptBaseline, setTranscriptBaseline] = useState({ userIndex: -1, userText: '' });
  const live = useRef<ReturnType<typeof createLiveController> | null>(null);
  const active = useRef<AbortController | null>(null), revision = useRef(0);
  const imageAbortRef = useRef<AbortController | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const askRef = useRef<(question: string, delegationId?: string) => void>(() => {});
  const emphasize = useCallback((text: string) => {
    const phrases=text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)??[text];
    setSpokenCaption(phrases.at(-1)?.trim()??text);
  }, []);
  const ask = useCallback(async (question: string, delegationId?: string) => {
    if (!ready || !question.trim()) return;
    const id = ++revision.current;
    active.current?.abort();
    imageAbortRef.current?.abort(); imageAbortRef.current = null;
    const controller = new AbortController(); active.current = controller;
    const lastUserIndex = rows.findLastIndex(row => row.who === 'user');
    setTranscriptBaseline({ userIndex: lastUserIndex, userText: lastUserIndex >= 0 ? rows[lastUserIndex].text.trim() : '' });
    setError(''); setAnswer(''); setOpening(''); setSpokenCaption(''); setBusy(true); setQuestionText(question); setWorld(null); setSources([]); setAnswerImage(null);
    const selectedIds: string[] = [];
    try {
      const navigationPlan = navigationState ? planLiveNavigation(question) : null;
      if (navigationPlan) {
        setProgress('Moving through the world…');
        let acknowledged = false;
        const navigation = executeLiveNavigation(navigationPlan, {
          signal: controller.signal,
          onDispatch: () => {
            if (acknowledged || id !== revision.current || controller.signal.aborted) return;
            acknowledged = true;
            setOpening(navigationPlan.acknowledgement);
            live.current?.say(delegationId ?? null, navigationPlan.acknowledgement);
          },
        });
        const result = await navigation;
        if (id !== revision.current || controller.signal.aborted) return;
        if (!result.ok) throw new Error(result.reason ?? 'The world could not complete that journey.');
        setAnswer(navigationPlan.context); setProgress('');
        live.current?.say(delegationId ?? null, navigationPlan.context);
        return;
      }
      setProgress('Thinking…');
      const queryTargetId = navigationState ? catalogueTargetIdInQuestion(question) : null;
      const initialPerspective = navigationState ? suggestedPerspective(question) : null;
      const queryTarget = queryTargetId ? WORLD_TARGETS.find(item => item.id === queryTargetId) ?? null : null;
      const initialJourney = queryTarget
        ? executeLiveNavigation({ commands: [{ type: 'flyTo', targetId: queryTarget.id }], acknowledgement: '', context: '' }, { signal: controller.signal })
        : null;
      const initialPerspectiveJourney = initialPerspective && navigationState?.perspective !== initialPerspective
        ? (async () => {
            const journey = initialJourney ? await initialJourney : null;
            if (journey && !journey.ok) return journey;
            return executeLiveNavigation({ commands: [{ type: 'setPerspective', perspective: initialPerspective }], acknowledgement: '', context: '' }, { signal: controller.signal });
          })()
        : null;
      live.current?.context(`User question: ${question}. Wait for the backend answer and answer only from what it returns.`);
      let response: Response | undefined;
      for (let attempt = 0; attempt < 12; attempt++) {
        controller.signal.throwIfAborted();
        response = await fetch('/api/terra/answer', { method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/x-ndjson'}, body: JSON.stringify({query:question, selectedIds, previous:world, previousQuestion:questionText}), signal:controller.signal });
        if (response.status !== 409) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const result = z.object({error:z.string().optional(), world:worldAnswerSchema.nullable().optional(), sources:z.array(z.object({url:z.string().url().regex(/^https?:\/\//),title:z.string().max(200)})).max(12).optional(), measured:z.object({output:z.string()}).optional()}).parse(await readAnswerStream(response!, (text, complete) => {
        if (id !== revision.current || controller.signal.aborted) return;
        setOpening(text);
        if(complete) live.current?.say(delegationId??null, text);
      }));
      if (!response!.ok) throw new Error(result.error || 'The explanation could not be completed.');
      if (id !== revision.current || controller.signal.aborted) return;
      if (!result.measured) throw new Error('The explanation was empty. Please try again.');
      const explanation = result.measured.output.replace(/\*\*|^[-#]\s/gm,'').replace(/cite[^]+/g, '');
      setAnswer(explanation); setSources(result.sources ?? []); setProgress('');
      if (result.world?.imageBrief) {
        const brief = result.world.imageBrief;
        const imageController = new AbortController();
        imageAbortRef.current = imageController;
        setAnswerImage({ title: brief.title, loading: true });
        void fetch('/api/terra/image', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query:question, brief}), signal:imageController.signal })
          .then(async response => {
            const payload: unknown = await response.json();
            if (!response.ok) throw new Error('The visual could not be generated.');
            const parsed = z.object({
              imageUrl: z.string().max(12_000_000).regex(/^data:image\/png;base64,iVBORw0KGgo[A-Za-z0-9+/]*={0,2}$/),
              title: z.string().max(100).optional(),
              model: z.string().max(100).optional(),
              cached: z.boolean().optional(),
            }).strict().parse(payload);
            if (id === revision.current && !imageController.signal.aborted) setAnswerImage({ title: brief.title, imageUrl: parsed.imageUrl, loading: false });
          })
          .catch(error => {
            if (id === revision.current && !imageController.signal.aborted) setAnswerImage({ title: brief.title, loading: false, error: error instanceof Error && error.message === 'The visual could not be generated.' ? error.message : 'The visual was unavailable.' });
          })
          .finally(() => { if (imageAbortRef.current === imageController) imageAbortRef.current = null; });
      }
      if (initialJourney) {
        const navigation = await initialJourney;
        if (id !== revision.current || controller.signal.aborted) return;
        if (!navigation.ok) return;
      }
      if (result.world) {
        setWorld(result.world);
        const target = result.world.targets[0];
        const supported = target ? catalogueTarget(target) : null;
        if (target && (!supported || supported.id !== queryTarget?.id) && navigationState) {
          const command: WorldCommand = supported ? { type:'flyTo',targetId:supported.id } : { type:'flyToLocation', ...target };
          const navigation = await executeLiveNavigation({ commands: [command], acknowledgement: '', context: '' }, { signal: controller.signal });
          if (!navigation.ok) return;
        }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      if (initialPerspectiveJourney) {
        const navigation = await initialPerspectiveJourney;
        if (!navigation.ok) return;
      }
      if (id !== revision.current || controller.signal.aborted) return;
      const finalPerspective = result.world?.perspective;
      if (finalPerspective && getWorldState()?.perspective !== finalPerspective) {
        const navigation = await executeLiveNavigation({ commands: [{ type: 'setPerspective', perspective: finalPerspective }], acknowledgement: '', context: '' }, { signal: controller.signal });
        if (!navigation.ok) return;
      }
      if (id !== revision.current || controller.signal.aborted) return;
      live.current?.say(delegationId ?? null, `Continue naturally with at most three short sentences without repeating the opening. ${explanation}`);
    } catch (e) {
      if (id !== revision.current || controller.signal.aborted) return;
      const message = e instanceof Error ? e.message : 'Something interrupted the explanation.';
      setError(message); setProgress('');
      live.current?.say(delegationId ?? null, `Tell the user briefly: ${message}`);
    } finally {
      if (id === revision.current) { setBusy(false); active.current = null; }
    }
  }, [ready, world, questionText, navigationState, rows]);
  useEffect(() => { askRef.current = (q, id) => { void ask(q,id); }; onAskReady(q => { void ask(q); }); return () => onAskReady(null); }, [ask, onAskReady]);
  useEffect(() => {
    const controller = createLiveController({
      onStatus:setVoiceStatus, onTranscript:setRows, onError:setError,
      onAssistantText:emphasize,
      onDelegation:({id,query}) => askRef.current(query,id),
    });
    live.current = controller;
    return () => { revision.current++; active.current?.abort(); imageAbortRef.current?.abort(); controller.dispose(); live.current = null; };
  }, [emphasize]);
  useEffect(() => {
    return subscribeWorldState(setNavigationState);
  }, []);
  useEffect(() => {
    const dock = dockRef.current;
    const experience = dock?.closest<HTMLElement>('.experience');
    if (!dock || !experience) return;
    const updateClearance = () => experience.style.setProperty('--voice-dock-height', `${Math.ceil(dock.getBoundingClientRect().height)}px`);
    updateClearance();
    const observer = new ResizeObserver(updateClearance);
    observer.observe(dock);
    return () => { observer.disconnect(); experience.style.removeProperty('--voice-dock-height'); };
  }, []);
  const isOn = ['checking availability','requesting microphone','connecting','awaiting session start','started','finalizing'].includes(voiceStatus);
  const cancel = () => {
    revision.current++; active.current?.abort(); active.current = null;
    imageAbortRef.current?.abort(); imageAbortRef.current = null;
    if (busy) setAnswer('');
    setOpening(''); setSpokenCaption(''); setAnswerImage(null); setRows(current => current.filter(row => row.who === 'user').slice(-1));
    setBusy(false); setProgress(''); live.current?.stop();
  };
  const liveRows = rows.filter(row => row.text.trim()).slice(-2);
  const latestUserIndex = rows.findLastIndex(row => row.who === 'user');
  const latestUserText = latestUserIndex >= 0 ? rows[latestUserIndex].text.trim() : '';
  const hasNewLiveUser = latestUserIndex > transcriptBaseline.userIndex || (latestUserIndex === transcriptBaseline.userIndex && latestUserText !== transcriptBaseline.userText);
  const latestUser = isOn && hasNewLiveUser ? latestUserText : '';
  const latestAssistant = isOn ? [...liveRows].reverse().find(row => row.who === 'assistant')?.text.trim() : '';
  const userCaption = latestUser || questionText;
  const agentCaption = isOn && spokenCaption ? spokenCaption : latestAssistant ? lastSentence(latestAssistant) : (answer || opening).match(/^.*?[.!?](?:\s|$)/)?.[0] || (answer || opening);
  return <section ref={dockRef} className={styles.dock} data-active={Boolean(questionText)} aria-label="Ask the interactive Earth">
    <div className={styles.conversation} aria-live="polite" aria-atomic="false">
      {userCaption && <div className={styles.turn}><span className={styles.you}>You</span><p className={/^\s*\[[^\]]+\]\s*$/.test(userCaption) ? styles.nonverbal : undefined}>{userCaption}</p></div>}
      {error ? <div className={styles.turn}><span className={styles.astra}>Astra</span><p role="alert" className={styles.error}>{error}</p></div> : agentCaption ? <div className={styles.turn}><span className={styles.astra}>Astra</span><p className={/^\s*\[[^\]]+\]\s*$/.test(agentCaption) ? styles.nonverbal : undefined}>{agentCaption}</p></div> : progress ? <div className={styles.preload} aria-label="Preparing the explanation"><span/><span/><span/></div> : null}
    </div>
    {busy && <p className={styles.statusLine}><LoaderCircle size={10} className={styles.spin}/>{progress}</p>}
    {answer && <details className={styles.explanation}><summary>Read more</summary><div><p>{answerWithLinks(answer)}</p>{sources.length > 0 && <p>Sources: {sources.map((source,index) => <span key={source.url}>{index > 0 ? ' · ' : ''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</p>}</div></details>}
    {answerImage && <AnswerImage title={answerImage.title} imageUrl={answerImage.imageUrl} loading={answerImage.loading} error={answerImage.error}/>}
    {needsSignIn && <p className={styles.statusLine}><a href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT for voice, answers and images</a></p>}
    <div className={styles.inputRow}>
      <QuestionBar onQuestion={ask} disabled={!ready} busy={busy} onCancel={cancel}/>
      <button className={`${styles.voiceButton} ${isOn ? styles.active : ''}`} type="button" disabled={!ready} onClick={() => isOn ? cancel() : void live.current?.start()} aria-label={isOn ? 'Stop voice' : 'Talk to Earth'} title={isOn ? 'Stop voice' : 'Talk to Earth'}>{isOn ? <Square size={17}/> : <Mic size={20}/>}</button>
    </div>
    {isOn && <p className={styles.live}>Listening · interrupt anytime</p>}
  </section>;
}
