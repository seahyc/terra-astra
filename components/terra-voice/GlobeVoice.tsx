'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MoreHorizontal, Square } from 'lucide-react';
import { z } from 'zod';
import { createLiveController } from './live-controller';
import styles from './globe-voice.module.css';
import QuestionBar from '../terra-input/QuestionBar';
import { readAnswerStream } from './answer-stream';
import { worldAnswerSchema, type WorldAnswer, type WorldTarget as GeneratedWorldTarget } from '../../lib/terra/world-answer';
import { getWorldState, sendWorldCommand, subscribeWorldState } from '../../lib/world/bridge';
import { WORLD_TARGETS, type WorldCommand, type WorldState, type WorldTarget as CatalogueWorldTarget } from '../../lib/world/commands';
import { classifyTelemetryError, downloadTelemetryReport, navigationTurnOutcome, telemetry, type TelemetryErrorKind } from '../../lib/terra/telemetry';
import { catalogueTargetIdInQuestion, executeLiveNavigation, planLiveNavigation } from './world-navigator';
import { suggestedPerspective } from './world-navigator';
import AnswerImage from './AnswerImage';
import { validateProceduralModelRecipe, type ProceduralModelRecipe } from '../../lib/terra/sculptures/procedural-model';

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

function telemetryWorldState(state: WorldState | null) {
  const catalogue = state?.targetId ? WORLD_TARGETS.some(target => target.id === state.targetId) : false;
  return state ? { tier: state.tier, perspective: state.perspective, busy: state.busy, target_kind: catalogue ? 'catalogue' as const : state.location ? 'dynamic' as const : 'none' as const } : {};
}

function voiceTelemetryStatus(status: string) {
  if (status.startsWith('closed')) return 'closed';
  if (status.startsWith('disconnected')) return 'disconnected';
  if (status.startsWith('session limit reached') || status === 'finalizing') return 'finalizing';
  if (status === 'startup timed out') return 'startup_timeout';
  return status.replaceAll(' ', '_');
}

function voiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    'checking availability': 'Checking voice availability',
    'requesting microphone': 'Requesting microphone access',
    connecting: 'Connecting voice',
    'awaiting session start': 'Waiting for Astra',
    finalizing: 'Finishing voice response',
    'microphone muted': 'Microphone muted',
    reconnecting: 'Reconnecting voice',
  };
  return labels[status] ?? status;
}

function answerSubtitle(world: WorldAnswer | null, navigationState: WorldState | null, hasAnswer: boolean, progress: string) {
  if (world?.targets.length) return world.targets.map(target => target.name).join(' · ');
  if (world?.perspective) return `${world.perspective[0].toUpperCase()}${world.perspective.slice(1)} perspective`;
  const catalogue = navigationState?.targetId ? WORLD_TARGETS.find(target => target.id === navigationState.targetId) : null;
  if (catalogue) return catalogue.label;
  if (progress) return progress.replace(/…$/, '');
  return hasAnswer ? 'Astra’s answer' : 'A live field note';
}

function splitEditorialAnswer(text: string) {
  if (!text) return { lead: '', detail: '' };
  const sentences = [...text.matchAll(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)].slice(0, 2);
  let end = sentences.length ? (sentences.at(-1)?.index ?? 0) + (sentences.at(-1)?.[0].length ?? 0) : text.length;
  const clipped = end > 360;
  if (clipped) end = Math.max(1, text.lastIndexOf(' ', 357));
  const lead = `${text.slice(0, end).trim()}${clipped ? '…' : ''}`;
  return { lead, detail: text.slice(end).trim() };
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
  const [modelStatus, setModelStatus] = useState<{ title: string; phase: 'building' | 'ready' | 'error' } | null>(null);
  const [navigationState, setNavigationState] = useState<WorldState | null>(() => getWorldState());
  const [transcriptBaseline, setTranscriptBaseline] = useState({ userIndex: -1, userText: '' });
  const live = useRef<ReturnType<typeof createLiveController> | null>(null);
  const active = useRef<AbortController | null>(null), revision = useRef(0);
  const activeTurnRef = useRef<string | null>(null);
  const imageAbortRef = useRef<AbortController | null>(null);
  const modelAbortRef = useRef<AbortController | null>(null);
  const modelTelemetryRef = useRef<{ turnId: string; started: number } | null>(null);
  const imageTelemetryRef = useRef<{ turnId: string; started: number } | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const askRef = useRef<(question: string, delegationId?: string) => void>(() => {});
  const emphasize = useCallback((text: string) => {
    const phrases=text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)??[text];
    setSpokenCaption(phrases.at(-1)?.trim()??text);
  }, []);
  const ask = useCallback(async (question: string, delegationId?: string) => {
    if (!ready || !question.trim()) return;
    if (active.current && activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'superseded' }, activeTurnRef.current);
    if (imageAbortRef.current && imageTelemetryRef.current) telemetry.record('image.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - imageTelemetryRef.current.started }, imageTelemetryRef.current.turnId);
    if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId);
    const id = ++revision.current;
    active.current?.abort();
    imageAbortRef.current?.abort(); imageAbortRef.current = null;
    modelAbortRef.current?.abort(); modelAbortRef.current = null;
    modelTelemetryRef.current = null;
    void sendWorldCommand({ type: 'clearProceduralModel' }).catch(() => {});
    imageTelemetryRef.current = null;
    const turnId = telemetry.beginTurn(delegationId ? 'voice' : 'typed', question.trim().length);
    activeTurnRef.current = turnId;
    const controller = new AbortController(); active.current = controller;
    const lastUserIndex = rows.findLastIndex(row => row.who === 'user');
    setTranscriptBaseline({ userIndex: lastUserIndex, userText: lastUserIndex >= 0 ? rows[lastUserIndex].text.trim() : '' });
    setError(''); setAnswer(''); setOpening(''); setSpokenCaption(''); setBusy(true); setQuestionText(question); setWorld(null); setSources([]); setAnswerImage(null); setModelStatus(null);
    const selectedIds: string[] = [];
    let turnOutcome: 'completed' | 'navigation_only' | 'error' = 'completed';
    let caughtErrorKind: TelemetryErrorKind | undefined;
    let lastHttpStatus: number | undefined;
    const navigationFailed = () => { turnOutcome = navigationTurnOutcome(false); telemetry.record('turn.error', { error_kind: 'navigation' }, turnId); };
    const navigate = async (plan: Parameters<typeof executeLiveNavigation>[0], onDispatch?: () => void) => {
      let commandIndex = 0;
      return executeLiveNavigation(plan, { signal: controller.signal, onDispatch, send: async command => {
        const index = commandIndex++, started = performance.now();
        try {
          const result = await sendWorldCommand(command);
          telemetry.record('navigation.command', { command_type: command.type, index, ok: result.ok, duration_ms: performance.now() - started, ...telemetryWorldState(getWorldState()) }, turnId);
          return result;
        } catch (navigationError) {
          caughtErrorKind = 'navigation';
          telemetry.record('navigation.command', { command_type: command.type, index, ok: false, duration_ms: performance.now() - started, ...telemetryWorldState(getWorldState()) }, turnId);
          throw navigationError;
        }
      } });
    };
    try {
      const navigationPlan = navigationState ? planLiveNavigation(question) : null;
      if (navigationPlan) {
        setProgress('Moving through the world…');
        let acknowledged = false;
        const navigation = navigate(navigationPlan, () => {
            if (acknowledged || id !== revision.current || controller.signal.aborted) return;
            acknowledged = true;
            setOpening(navigationPlan.acknowledgement);
            live.current?.say(delegationId ?? null, navigationPlan.acknowledgement);
          });
        const result = await navigation;
        if (id !== revision.current || controller.signal.aborted) return;
        if (!result.ok) { caughtErrorKind = 'navigation'; throw new Error(result.reason ?? 'The world could not complete that journey.'); }
        setAnswer(navigationPlan.context); setProgress('');
        live.current?.say(delegationId ?? null, navigationPlan.context);
        turnOutcome = 'navigation_only';
        return;
      }
      setProgress('Thinking…');
      const queryTargetId = navigationState ? catalogueTargetIdInQuestion(question) : null;
      const initialPerspective = navigationState ? suggestedPerspective(question) : null;
      const queryTarget = queryTargetId ? WORLD_TARGETS.find(item => item.id === queryTargetId) ?? null : null;
      const initialJourney = queryTarget
        ? navigate({ commands: [{ type: 'flyTo', targetId: queryTarget.id }], acknowledgement: '', context: '' })
        : null;
      const initialPerspectiveJourney = initialPerspective && navigationState?.perspective !== initialPerspective
        ? (async () => {
            const journey = initialJourney ? await initialJourney : null;
            if (journey && !journey.ok) return journey;
            return navigate({ commands: [{ type: 'setPerspective', perspective: initialPerspective }], acknowledgement: '', context: '' });
          })()
        : null;
      live.current?.context(`User question: ${question}. Wait for the backend answer and answer only from what it returns.`);
      let response: Response | undefined;
      for (let attempt = 0; attempt < 12; attempt++) {
        controller.signal.throwIfAborted();
        const requestStarted = performance.now();
        response = await fetch('/api/terra/answer', { method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/x-ndjson'}, body: JSON.stringify({query:question, selectedIds, previous:world, previousQuestion:questionText}), signal:controller.signal });
        lastHttpStatus = response.status;
        const contentType = response.headers.get('content-type') ?? '';
        telemetry.record('answer.http', { attempt, status: response.status, duration_ms: performance.now() - requestStarted, content_type: contentType.includes('application/x-ndjson') ? 'ndjson' : contentType.includes('json') ? 'json' : 'other' }, turnId);
        if (response.status !== 409) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const answerStarted = performance.now();
      let openingSeen = false;
      const result = z.object({error:z.string().optional(), world:worldAnswerSchema.nullable().optional(), sources:z.array(z.object({url:z.string().url().regex(/^https?:\/\//),title:z.string().max(200)})).max(12).optional(), measured:z.object({output:z.string(),model:z.enum(['gpt-5.6-luna','gpt-5.6-terra','gpt-6-astra']).optional(),route:z.enum(['quick','standard','research']).optional(),subagent_count:z.number().int().nonnegative().optional(),elapsed_ms:z.number().nonnegative().optional()}).optional()}).parse(await readAnswerStream(response!, (text, complete) => {
        if (id !== revision.current || controller.signal.aborted) return;
        if (!openingSeen) { openingSeen = true; telemetry.record('answer.opening', { phase: 'first', duration_ms: performance.now() - answerStarted }, turnId); }
        if (complete) telemetry.record('answer.opening', { phase: 'complete', duration_ms: performance.now() - answerStarted }, turnId);
        setOpening(text);
        if(complete) live.current?.say(delegationId??null, text);
      }));
      if (!response!.ok) throw new Error(result.error || 'The explanation could not be completed.');
      if (id !== revision.current || controller.signal.aborted) return;
      if (!result.measured) throw new Error('The explanation was empty. Please try again.');
      telemetry.record('answer.result', { model: result.measured.model, route: result.measured.route, subagent_count: result.measured.subagent_count, server_elapsed_ms: result.measured.elapsed_ms, duration_ms: performance.now() - answerStarted }, turnId);
      const explanation = result.measured.output.replace(/\*\*|^[-#]\s/gm,'').replace(/cite[^]+/g, '');
      setAnswer(explanation); setSources(result.sources ?? []); setProgress('');
      if (result.world) setWorld(result.world);
      let modelPromise: Promise<{ recipe: ProceduralModelRecipe; model?: string } | null> | null = null;
      let modelStarted = 0;
      if (result.world?.modelBrief) {
        const brief = result.world.modelBrief;
        const modelController = new AbortController();
        modelAbortRef.current = modelController;
        modelStarted = performance.now();
        modelTelemetryRef.current = { turnId, started: modelStarted };
        telemetry.record('model.lifecycle', { phase: 'requested' }, turnId);
        setModelStatus({ title: brief.title, phase: 'building' });
        modelPromise = fetch('/api/terra/model', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({query:question, brief}), signal:modelController.signal })
          .then(async response => {
            if (!response.ok) throw new Error('The model could not be generated.');
            const payload: unknown = await response.json();
            if (!payload || typeof payload !== 'object' || !('recipe' in payload)) throw new TypeError('The model response was incomplete.');
            const rawModel = (payload as Record<string, unknown>).model;
            return { recipe: validateProceduralModelRecipe((payload as Record<string, unknown>).recipe), ...(typeof rawModel === 'string' ? { model: rawModel } : {}) };
          })
          .catch(() => {
            if (id === revision.current && !modelController.signal.aborted) {
              telemetry.record('model.lifecycle', { phase: 'error', duration_ms: performance.now() - modelStarted }, turnId);
              setModelStatus({ title: brief.title, phase: 'error' });
              if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null;
            }
            return null;
          })
          .finally(() => { if (modelAbortRef.current === modelController) modelAbortRef.current = null; });
      }
      if (result.world?.imageBrief) {
        const brief = result.world.imageBrief;
        const imageController = new AbortController();
        imageAbortRef.current = imageController;
        const imageStarted = performance.now();
        imageTelemetryRef.current = { turnId, started: imageStarted };
        telemetry.record('image.lifecycle', { phase: 'requested' }, turnId);
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
            if (id === revision.current && !imageController.signal.aborted) {
              telemetry.record('image.lifecycle', { phase: 'ready', status: response.status, duration_ms: performance.now() - imageStarted, model: parsed.model, cached: parsed.cached }, turnId);
              setAnswerImage({ title: brief.title, imageUrl: parsed.imageUrl, loading: false });
            } else telemetry.record('image.lifecycle', { phase: 'stale', status: response.status, duration_ms: performance.now() - imageStarted }, turnId);
          })
          .catch(error => {
            if (id === revision.current && !imageController.signal.aborted) {
              telemetry.record('image.lifecycle', { phase: 'error', duration_ms: performance.now() - imageStarted }, turnId);
              setAnswerImage({ title: brief.title, loading: false, error: error instanceof Error && error.message === 'The visual could not be generated.' ? error.message : 'The visual was unavailable.' });
            }
          })
          .finally(() => { if (imageAbortRef.current === imageController) { imageAbortRef.current = null; imageTelemetryRef.current = null; } });
      }
      if (initialJourney) {
        const navigation = await initialJourney;
        if (id !== revision.current || controller.signal.aborted) return;
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (result.world) {
        const target = result.world.targets[0];
        const supported = target ? catalogueTarget(target) : null;
        if (target && (!supported || supported.id !== queryTarget?.id) && navigationState) {
          const command: WorldCommand = supported ? { type:'flyTo',targetId:supported.id } : { type:'flyToLocation', ...target };
          const navigation = await navigate({ commands: [command], acknowledgement: '', context: '' });
          if (!navigation.ok) { navigationFailed(); return; }
        }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      if (initialPerspectiveJourney) {
        const navigation = await initialPerspectiveJourney;
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      const finalPerspective = result.world?.perspective;
      if (finalPerspective && getWorldState()?.perspective !== finalPerspective) {
        const navigation = await navigate({ commands: [{ type: 'setPerspective', perspective: finalPerspective }], acknowledgement: '', context: '' });
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      live.current?.say(delegationId ?? null, `Continue naturally with at most three short sentences without repeating the opening. ${explanation}`);
      if (modelPromise) {
        const generated = await modelPromise;
        if (generated && (id !== revision.current || controller.signal.aborted)) {
          telemetry.record('model.lifecycle', { phase: 'stale', duration_ms: performance.now() - modelStarted, model: generated.model }, turnId);
          if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null;
        } else if (generated) {
          const anchor = result.world?.targets[0];
          const asksForOtherPerspective = /\b(?:aerial|aerial view|from above|top down|overhead|cutaway|cut away|cross section|inside view)\b/i.test(question);
          let canShow = true;
          if (!asksForOtherPerspective && getWorldState()?.perspective !== 'horizon') {
            const framed = await navigate({ commands: [{ type: 'setPerspective', perspective: 'horizon' }], acknowledgement: '', context: '' });
            if (id !== revision.current || controller.signal.aborted) {
              telemetry.record('model.lifecycle', { phase: 'stale', duration_ms: performance.now() - modelStarted, model: generated.model }, turnId);
              if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null;
              canShow = false;
            } else if (!framed.ok) {
              telemetry.record('model.lifecycle', { phase: 'error', duration_ms: performance.now() - modelStarted, model: generated.model }, turnId);
              if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null;
              navigationFailed(); canShow = false;
            }
          }
          const shown = canShow ? await navigate({ commands: [{ type: 'showProceduralModel', recipe: generated.recipe, ...(anchor ? { anchor } : {}) }], acknowledgement: '', context: '' }) : null;
          if (shown && (id !== revision.current || controller.signal.aborted)) {
            telemetry.record('model.lifecycle', { phase: 'stale', duration_ms: performance.now() - modelStarted, model: generated.model }, turnId);
            if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null;
          } else if (shown?.ok) {
            telemetry.record('model.lifecycle', { phase: 'ready', point_count: generated.recipe.primitives.reduce((sum, primitive) => sum + primitive.sampleCount, 0), duration_ms: performance.now() - modelStarted, model: generated.model }, turnId);
            if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null;
            setModelStatus(current => current ? { ...current, phase: 'ready' } : current);
          } else if (shown) { telemetry.record('model.lifecycle', { phase: 'error', duration_ms: performance.now() - modelStarted, model: generated.model }, turnId); if (modelTelemetryRef.current?.turnId === turnId) modelTelemetryRef.current = null; navigationFailed(); }
        }
      }
    } catch (e) {
      if (id !== revision.current || controller.signal.aborted) return;
      turnOutcome = 'error';
      telemetry.record('turn.error', { error_kind: classifyTelemetryError(e, caughtErrorKind, lastHttpStatus) }, turnId);
      const message = e instanceof Error ? e.message : 'Something interrupted the explanation.';
      setError(message); setProgress('');
      live.current?.say(delegationId ?? null, `Tell the user briefly: ${message}`);
    } finally {
      const interrupted = id !== revision.current || controller.signal.aborted;
      telemetry.record('turn.finished', { outcome: interrupted ? (controller.signal.aborted ? 'cancelled' : 'stale') : turnOutcome }, turnId);
      if (id === revision.current) { setBusy(false); active.current = null; activeTurnRef.current = null; }
    }
  }, [ready, world, questionText, navigationState, rows]);
  useEffect(() => { askRef.current = (q, id) => { void ask(q,id); }; onAskReady(q => { void ask(q); }); return () => onAskReady(null); }, [ask, onAskReady]);
  useEffect(() => {
    const controller = createLiveController({
      onStatus:status => { setVoiceStatus(status); telemetry.record('voice.status', { status: voiceTelemetryStatus(status) }, activeTurnRef.current ?? undefined); }, onTranscript:setRows, onError:setError,
      onAssistantText:emphasize,
      onDelegation:({id,query}) => askRef.current(query,id),
    });
    live.current = controller;
    return () => { if (activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'unmount' }, activeTurnRef.current); if (imageAbortRef.current && imageTelemetryRef.current) telemetry.record('image.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - imageTelemetryRef.current.started }, imageTelemetryRef.current.turnId); if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId); revision.current++; active.current?.abort(); imageAbortRef.current?.abort(); modelAbortRef.current?.abort(); controller.dispose(); live.current = null; };
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
  const isOn = ['checking availability','requesting microphone','connecting','awaiting session start','started','finalizing','microphone muted','reconnecting'].includes(voiceStatus);
  const cancel = () => {
    if (activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'user' }, activeTurnRef.current);
    if (imageAbortRef.current && imageTelemetryRef.current) telemetry.record('image.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - imageTelemetryRef.current.started }, imageTelemetryRef.current.turnId);
    if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId);
    revision.current++; active.current?.abort(); active.current = null;
    imageAbortRef.current?.abort(); imageAbortRef.current = null;
    modelAbortRef.current?.abort(); modelAbortRef.current = null;
    modelTelemetryRef.current = null;
    void sendWorldCommand({ type: 'clearProceduralModel' }).catch(() => {});
    imageTelemetryRef.current = null;
    if (busy) setAnswer('');
    setOpening(''); setSpokenCaption(''); setAnswerImage(null); setModelStatus(null); setRows(current => current.filter(row => row.who === 'user').slice(-1));
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
  const showEditorial = Boolean(questionText || answer || opening || progress || answerImage || error);
  const editorialTitle = world?.title || (busy ? 'Reading the world' : questionText ? 'Astra’s field note' : 'Ask the Earth');
  const subtitle = answerSubtitle(world, navigationState, Boolean(answer), progress);
  const visibleVoiceStatus = isOn && voiceStatus !== 'started' ? voiceStatusLabel(voiceStatus) : '';
  const editorialAnswer = splitEditorialAnswer(answer || opening);
  const detailedAnswer = answer.length > 140 ? answer : editorialAnswer.detail;
  return <>
  {showEditorial && <aside className={styles.editorial} aria-live="polite" aria-label="Astra’s answer">
    <header><p>{subtitle}</p><h2>{editorialTitle}</h2></header>
    {busy && !answer && <div className={styles.editorialLoading} role="status"><span/><span/><span/><small>{progress || 'Thinking'}</small></div>}
    {editorialAnswer.lead && <div className={styles.editorialCopy}>{answerWithLinks(editorialAnswer.lead)}</div>}
    {answerImage && <AnswerImage title={answerImage.title} imageUrl={answerImage.imageUrl} loading={answerImage.loading} error={answerImage.error}/>}
    {modelStatus && <p className={styles.modelStatus} role="status">{modelStatus.phase === 'building' ? `Shaping ${modelStatus.title}…` : modelStatus.phase === 'ready' ? `${modelStatus.title} is now on the globe.` : `The ${modelStatus.title} model was unavailable.`}</p>}
    {answer && detailedAnswer && <details className={styles.moreDetail}><summary>More detail</summary><div>{answerWithLinks(detailedAnswer)}</div></details>}
    {sources.length > 0 && <p className={styles.sources}>Sources: {sources.map((source,index) => <span key={source.url}>{index > 0 ? ' · ' : ''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</p>}
  </aside>}
  <section ref={dockRef} className={styles.dock} data-active={Boolean(questionText)} aria-label="Ask the interactive Earth">
    <div className={styles.conversation} aria-live="polite" aria-atomic="false">
      {userCaption && <div className={styles.turn}><span className={styles.you}>You</span><p className={/^\s*\[[^\]]+\]\s*$/.test(userCaption) ? styles.nonverbal : undefined}>{userCaption}</p></div>}
      {error ? <div className={styles.turn}><span className={styles.astra}>Astra</span><p role="alert" className={styles.error}>{error}</p></div> : agentCaption ? <div className={styles.turn}><span className={styles.astra}>Astra</span><p className={/^\s*\[[^\]]+\]\s*$/.test(agentCaption) ? styles.nonverbal : undefined}>{agentCaption}</p></div> : progress ? <div className={styles.preload} aria-label="Preparing the explanation"><span/><span/><span/></div> : null}
    </div>
    {needsSignIn && <p className={styles.statusLine}><a href="/signin-with-chatgpt?return_to=%2F">Sign in with ChatGPT for voice, answers and images</a></p>}
    <div className={styles.inputRow}>
      <QuestionBar onQuestion={ask} disabled={!ready} busy={busy} onCancel={cancel}/>
      <button className={`${styles.voiceButton} ${isOn ? styles.active : ''}`} type="button" disabled={!ready || busy} onClick={() => isOn ? cancel() : void live.current?.start()} aria-label={isOn ? busy ? 'Voice active while answering' : 'Stop voice' : 'Talk to Earth'} title={isOn ? busy ? 'Voice active while answering' : 'Stop voice' : 'Talk to Earth'}>{isOn && !busy ? <Square size={15}/> : <Mic size={19}/>}</button>
      <details className={styles.diagnostics}><summary aria-label="Diagnostics" title="Diagnostics"><MoreHorizontal size={19}/></summary><div><button type="button" onClick={downloadTelemetryReport}>Export debug report</button><button type="button" onClick={() => telemetry.clear()}>Clear diagnostics</button><p>Stored only in this tab. Raw questions, answers, audio, images, and credentials are excluded.</p></div></details>
    </div>
    {visibleVoiceStatus && <p className={styles.live}>{visibleVoiceStatus}</p>}
  </section></>;
}
