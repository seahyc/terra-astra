'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, MoreHorizontal, Square } from 'lucide-react';
import { z } from 'zod';
import { createLiveController, type PlaybackState } from './live-controller';
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
import { matchLibrary, validateLibraryModel } from '../../lib/terra/model-library/library.mjs';

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
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
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
  const [modelStatus, setModelStatus] = useState<{ title: string; phase: 'building' | 'ready' | 'error'; persisted?: boolean; measured?: boolean } | null>(null);
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
  const voiceFirstRef=useRef<string|null>(null);
  const emphasize = useCallback((text: string) => {
    const turn=activeTurnRef.current;if(turn&&voiceFirstRef.current!==turn){voiceFirstRef.current=turn;telemetry.record('voice.response',{phase:'first_transcript'},turn);}
    const phrases=text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g)??[text];
    setSpokenCaption(phrases.at(-1)?.trim()??text);
    const phrase=(phrases.at(-1)??text).toLowerCase();const part=getWorldState()?.proceduralModel?.parts?.find(p=>phrase.includes(p.label.toLowerCase()));if(part)void sendWorldCommand({type:'focusModelPart',id:part.id});
  }, []);
  const ask = useCallback(async (question: string, delegationId?: string, preferredId?: string) => {
    if (!ready || !question.trim()) return;
    if (active.current && activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'superseded' }, activeTurnRef.current);
    if (imageAbortRef.current && imageTelemetryRef.current) telemetry.record('image.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - imageTelemetryRef.current.started }, imageTelemetryRef.current.turnId);
    if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId);
    const id = ++revision.current;
    active.current?.abort();
    imageAbortRef.current?.abort(); imageAbortRef.current = null;
    modelAbortRef.current?.abort(); modelAbortRef.current = null;
    modelTelemetryRef.current = null;
    void sendWorldCommand({ type: 'cancelWorldTurn' }).catch(() => {});
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
      const navigationPlan = navigationState && !preferredId ? planLiveNavigation(question) : null;
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
      live.current?.say(delegationId ?? null, `Answer the central idea of this question now in two short sentences from stable knowledge: ${question}. Grounded details and a model are being prepared concurrently; do not claim a model is visible or invent measurements.`);
      const prepared = matchLibrary(question);
      const wantsModel = Boolean(preferredId || prepared || /\b(model|3d|structure|architecture|mechanism|engine|pump|turbine|bridge|volcano|building|machine|works?|inside|shape|anatomy|robot|satellite|heart|lighthouse|gear|telescope)\b/i.test(question));
      let resolvedModelTarget: GeneratedWorldTarget | undefined;
      let modelPromise: Promise<void> | null = null;
      const startModel = () => {
        const modelController = new AbortController(); modelAbortRef.current=modelController;
        const modelSignal=AbortSignal.any([controller.signal,modelController.signal]);
        const modelStarted=performance.now(); modelTelemetryRef.current={turnId,started:modelStarted};
        telemetry.record('model.lifecycle',{phase:'requested'},turnId);setModelStatus({title:prepared?.title??'model',phase:'building'});
        return (async()=>{
          const response=await fetch('/api/terra/library-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:question,...(preferredId?{preferredId}:{})}),signal:modelSignal});
          if(!response.ok)throw new Error('Model unavailable');const payload=z.object({recipe:z.unknown(),via:z.string(),persisted:z.boolean()}).parse(await response.json());const recipe=validateLibraryModel(payload.recipe);
          if(initialJourney)await initialJourney;if(initialPerspectiveJourney)await initialPerspectiveJourney;
          if(id!==revision.current||modelSignal.aborted)return;
          const state=getWorldState();const anchor=recipe.anchor?{...recipe.anchor,span:12}:resolvedModelTarget??(queryTarget?{name:queryTarget.label,latitude:queryTarget.lat,longitude:queryTarget.lon,span:12}:state?.location??null);
          const commands:WorldCommand[]=[];
          if(anchor)commands.push({type:'flyToLocation',...anchor});
          else {const coordinates=prepared?.anchor; if(coordinates)commands.push({type:'flyToLocation',...coordinates,span:12});}
          commands.push({type:'setPerspective',perspective:'horizon'},{type:'showLibraryModel',recipe,...(anchor?{anchor}:{})});
          const shown=await navigate({commands,acknowledgement:'',context:''});
          if(id!==revision.current||modelSignal.aborted)return;
          if(!shown.ok)throw new Error('Model could not be placed');
          telemetry.record('model.lifecycle',{phase:'ready',duration_ms:performance.now()-modelStarted,point_count:getWorldState()?.proceduralModel?.pointCount,model:'gpt-5.6-luna',cached:payload.via!=='procedural',persisted:payload.persisted},turnId);
          setModelStatus({title:recipe.title,phase:'ready',persisted:payload.persisted,measured:recipe.special==='java'});
          live.current?.context(`The model ${recipe.title} is now visible. Named parts: ${getWorldState()?.proceduralModel?.parts?.map(p=>p.label).join(', ')}. Geometry is validated, not factual proof.`);
        })().catch(()=>{if(id===revision.current&&!modelSignal.aborted){setModelStatus({title:prepared?.title??'model',phase:'error'});telemetry.record('model.lifecycle',{phase:'error',duration_ms:performance.now()-modelStarted},turnId);}}).finally(()=>{if(modelAbortRef.current===modelController){modelAbortRef.current=null;modelTelemetryRef.current=null;}});
      }
      if(wantsModel)modelPromise=startModel();
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
        if(complete) live.current?.context(`Verified answer opening: ${text}`);
      }));
      if (!response!.ok) throw new Error(result.error || 'The explanation could not be completed.');
      if (id !== revision.current || controller.signal.aborted) return;
      if (!result.measured) throw new Error('The explanation was empty. Please try again.');
      telemetry.record('answer.result', { model: result.measured.model, route: result.measured.route, subagent_count: result.measured.subagent_count, server_elapsed_ms: result.measured.elapsed_ms, duration_ms: performance.now() - answerStarted }, turnId);
      const explanation = result.measured.output.replace(/\*\*|^[-#]\s/gm,'').replace(/cite[^]+/g, '');
      setAnswer(explanation); setSources(result.sources ?? []); setProgress('');
      if (result.world) setWorld(result.world);
      resolvedModelTarget=result.world?.targets[0];
      if(!modelPromise && result.world?.modelBrief)modelPromise=startModel();
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
        if (!modelPromise && target && (!supported || supported.id !== queryTarget?.id) && navigationState) {
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
      const finalPerspective = modelPromise ? null : result.world?.perspective;
      if (finalPerspective && getWorldState()?.perspective !== finalPerspective) {
        const navigation = await navigate({ commands: [{ type: 'setPerspective', perspective: finalPerspective }], acknowledgement: '', context: '' });
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      live.current?.context(`Grounded backend answer for the current question: ${explanation}. Use this to correct any material discrepancy in your first explanation, without repeating it.`);
      if(modelPromise)await modelPromise;
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
      onPlaybackState: setPlaybackState,
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
    void sendWorldCommand({ type: 'cancelWorldTurn' }).catch(() => {});
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
    {navigationState?.proceduralModel?.parts && <div className={styles.parts} aria-label="Model parts">{navigationState.proceduralModel.parts.map(part=><button key={part.id} type="button" onClick={()=>void sendWorldCommand({type:'focusModelPart',id:part.id})}>{part.label}</button>)}<button type="button" onClick={()=>void sendWorldCommand({type:'focusModelPart',id:null})}>All parts</button></div>}
    {modelStatus && <p className={styles.modelStatus} role="status">{modelStatus.phase === 'building' ? `Shaping ${modelStatus.title}…` : modelStatus.phase === 'ready' ? `${modelStatus.title} is now on the globe.${modelStatus.persisted === false ? ' Library saving is unavailable for this model.' : ''}` : `The ${modelStatus.title} model was unavailable.`}</p>}
    {modelStatus?.phase==='ready' && <details className={styles.modelEvidence}><summary>About this model</summary><p>{modelStatus.measured?'121 checked-in NOAA ETOPO samples along 112.922°E. Horizontal distance: km; elevation: m. Highest sample +984 m, lowest −5,361 m. These are transect samples, not summit or deepest-trench measurements; axes are scaled independently.':'Conceptual geometry with validated shapes and bounds. Dimensions and motion explain the subject; they are not surveyed measurements or independent factual verification.'}</p></details>}
    {answer && detailedAnswer && <details className={styles.moreDetail}><summary>More detail</summary><div>{answerWithLinks(detailedAnswer)}</div></details>}
    {sources.length > 0 && <p className={styles.sources}>Sources: {sources.map((source,index) => <span key={source.url}>{index > 0 ? ' · ' : ''}<a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a></span>)}</p>}
  </aside>}
  <section ref={dockRef} className={styles.dock} data-active={Boolean(questionText)} aria-label="Ask the interactive Earth">
    <div className={styles.conversation} aria-live="polite" aria-atomic="false">
      {userCaption && <div className={styles.turn}><span className={styles.you}>You</span><p className={/^\s*\[[^\]]+\]\s*$/.test(userCaption) ? styles.nonverbal : undefined}>{userCaption}</p></div>}
      {error ? <div className={styles.turn}><span className={styles.astra}>Astra</span><p role="alert" className={styles.error}>{error}</p></div> : agentCaption ? <div className={styles.turn}><span className={styles.astra}>Astra</span><p className={/^\s*\[[^\]]+\]\s*$/.test(agentCaption) ? styles.nonverbal : undefined}>{agentCaption}</p></div> : progress ? <div className={styles.preload} aria-label="Preparing the explanation"><span/><span/><span/></div> : null}
    </div>
    {needsSignIn && <p className={styles.statusLine}><a className={styles.signInButton} href="/signin-with-chatgpt?return_to=%2F" title="Enable voice, answers and images">Sign in with ChatGPT</a></p>}
    <div className={styles.inputRow}>
      <QuestionBar onQuestion={ask} disabled={!ready} busy={busy} onCancel={cancel}/>
      <button className={`${styles.voiceButton} ${isOn ? styles.active : ''}`} type="button" disabled={!ready || (busy && !isOn)} onClick={() => isOn ? cancel() : void live.current?.start()} aria-label={isOn ? busy ? 'Voice active while answering' : 'Stop voice' : 'Talk to Earth'} title={isOn ? busy ? 'Voice active while answering' : 'Stop voice' : 'Talk to Earth'}>{isOn && !busy ? <Square size={15}/> : <Mic size={19}/>}</button>
      <details className={styles.diagnostics}><summary aria-label="Diagnostics" title="Diagnostics"><MoreHorizontal size={19}/></summary><div><button type="button" onClick={downloadTelemetryReport}>Export debug report</button><button type="button" onClick={() => telemetry.clear()}>Clear diagnostics</button><p>Stored only in this tab. Raw questions, answers, audio, images, and credentials are excluded.</p></div></details>
    </div>
    {(playbackState === 'blocked' || playbackState === 'unavailable') && <div className={styles.audioRecovery} role="status"><span>{playbackState === 'blocked' ? 'Your browser paused Astra’s audio.' : 'Astra’s audio could not play.'}</span><button type="button" onClick={() => void live.current?.resumeAudio()}>{playbackState === 'blocked' ? 'Enable audio' : 'Retry audio'}</button></div>}
    {visibleVoiceStatus && <p className={styles.live}>{visibleVoiceStatus}</p>}
  </section></>;
}
