'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { z } from 'zod';
import styles from './globe-voice.module.css';
import QuestionBar from '../terra-input/QuestionBar';
import { readAnswerStream } from './answer-stream';
import { worldAnswerSchema, type WorldAnswer, type WorldTarget as GeneratedWorldTarget } from '../../lib/terra/world-answer';
import { getWorldState, sendWorldCommand, subscribeWorldState } from '../../lib/world/bridge';
import { WORLD_TARGETS, type WorldCommand, type WorldState, type WorldTarget as CatalogueWorldTarget } from '../../lib/world/commands';
import { classifyTelemetryError, downloadTelemetryReport, navigationTurnOutcome, telemetry, type TelemetryErrorKind } from '../../lib/terra/telemetry';
import { catalogueTargetIdInQuestion, executeLiveNavigation, planLiveNavigation } from './world-navigator';
import { suggestedPerspective } from './world-navigator';
import { spokenParagraph, splitEditorialAnswer } from './answer-copy';
import { modelLocation, overviewLocation, prefersGeographicOverview } from './model-view.mjs';
import { libraryRecipe, matchLibrary, validateLibraryModel } from '../../lib/terra/model-library/library.mjs';
import CodexConnection, { readCodexStatus } from './CodexConnection';

type Props = { ready: boolean; onAskReady: (ask: ((question: string) => void) | null) => void };

function catalogueTarget(target: GeneratedWorldTarget): CatalogueWorldTarget | null {
  const name = target.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (name === 'mariana trench') return WORLD_TARGETS.find(item => item.id === 'challenger-deep') ?? null;
  return WORLD_TARGETS.find(item => item.label.toLowerCase() === name) ?? null;
}

function answerWithLinks(text: string) {
  return text.replace(/cite[^]+/g, '').split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s<>]+|\*\*[^*]+\*\*)/g).map((part,index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (match) return <a key={index} href={match[2]} target="_blank" rel="noopener noreferrer">{match[1]}</a>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2,-2)}</strong>;
    if (/^https?:\/\//.test(part)) {
      const url = part.replace(/[.,;:!?\])]+$/, '');
      try { return <span key={index}><a href={url} target="_blank" rel="noopener noreferrer">{new URL(url).hostname.replace(/^www\./, '')}</a>{part.slice(url.length)}</span>; } catch { return part; }
    }
    return part;
  });
}

function telemetryWorldState(state: WorldState | null) {
  const catalogue = state?.targetId ? WORLD_TARGETS.some(target => target.id === state.targetId) : false;
  return state ? { tier: state.tier, perspective: state.perspective, busy: state.busy, target_kind: catalogue ? 'catalogue' as const : state.location ? 'dynamic' as const : 'none' as const } : {};
}

function answerSubtitle(world: WorldAnswer | null, navigationState: WorldState | null, hasAnswer: boolean, progress: string) {
  if (world?.targets.length) return world.targets.map(target => target.name).join(' · ');
  if (world?.perspective) return `${world.perspective[0].toUpperCase()}${world.perspective.slice(1)} perspective`;
  const catalogue = navigationState?.targetId ? WORLD_TARGETS.find(target => target.id === navigationState.targetId) : null;
  if (catalogue) return catalogue.label;
  if (progress) return progress.replace(/…$/, '');
  return hasAnswer ? 'Astra’s answer' : 'A live field note';
}

export default function GlobeVoice({ ready, onAskReady }: Props) {
  const [connectionOpen, setConnectionOpen] = useState(false);
  const signedInRef = useRef(false);
  const pendingQuestionRef = useRef<{ question: string; delegationId?: string; preferredId?: string } | null>(null);
  const authGateRevisionRef = useRef(0);
  const [progress, setProgress] = useState('');
  const [answer, setAnswer] = useState('');
  const [opening, setOpening] = useState('');
  const [conversationReply, setConversationReply] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [world, setWorld] = useState<WorldAnswer | null>(null);
  const [sources, setSources] = useState<{url:string;title:string}[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [modelStatus, setModelStatus] = useState<{ title: string; phase: 'building' | 'ready' | 'error'; persisted?: boolean; measured?: boolean } | null>(null);
  const [navigationState, setNavigationState] = useState<WorldState | null>(() => getWorldState());
  const active = useRef<AbortController | null>(null), revision = useRef(0);
  const activeTurnRef = useRef<string | null>(null);
  const modelAbortRef = useRef<AbortController | null>(null);
  const locationAbortRef = useRef<AbortController | null>(null);
  const modelTelemetryRef = useRef<{ turnId: string; started: number } | null>(null);
  const dockRef = useRef<HTMLElement | null>(null);
  const viewLocation = (target: GeneratedWorldTarget) => {
    locationAbortRef.current?.abort();
    setModelStatus(null);
    const controller = new AbortController(); locationAbortRef.current = controller;
    void executeLiveNavigation({ commands: [{type:'clearProceduralModel'},{type:'flyToLocation',...target},{type:'setPerspective',perspective:'aerial'}], acknowledgement:'',context:'' }, {signal:controller.signal})
      .then(result => { if (!controller.signal.aborted && !result.ok) setError(result.reason ?? 'This location could not be shown.'); });
  };
  const ask = useCallback(async (question: string, delegationId?: string, preferredId?: string) => {
    if (!ready || !question.trim()) return;
    const publicNavigationPlan = navigationState && !preferredId ? planLiveNavigation(question) : null;
    const publicPrepared = matchLibrary(question);
    const showPublicPrepared = async () => {
      if (!publicPrepared) return;
      const recipe = libraryRecipe(publicPrepared.id);
      const commands: WorldCommand[] = [{ type: 'clearProceduralModel' }];
      if (recipe.anchor) commands.push({ type: 'flyToLocation', ...recipe.anchor });
      else if (publicPrepared.anchor) commands.push({ type: 'flyToLocation', ...publicPrepared.anchor, span: 12 });
      commands.push({ type: 'setPerspective', perspective: 'horizon' }, { type: 'showLibraryModel', recipe, ...(recipe.anchor ? { anchor: recipe.anchor } : {}) });
      const shown = await executeLiveNavigation({ commands, acknowledgement: '', context: '' }, { signal: new AbortController().signal });
      if (shown.ok) setModelStatus({ title: recipe.title, phase: 'ready', persisted: false, measured: recipe.special === 'java' });
    };
    if (!publicNavigationPlan && !signedInRef.current) {
      const gateRevision = ++authGateRevisionRef.current;
      try {
        const status = await readCodexStatus();
        if (gateRevision !== authGateRevisionRef.current) return;
        if (status.signedIn) signedInRef.current = true;
        else {
          await showPublicPrepared();
          if (gateRevision !== authGateRevisionRef.current) return;
          pendingQuestionRef.current = { question, delegationId, preferredId };
          setConnectionOpen(true);
          setError(status.configured ? 'Connect ChatGPT to answer this question.' : (status.error || 'ChatGPT connection is not configured on this server.'));
          return;
        }
      } catch {
        if (gateRevision !== authGateRevisionRef.current) return;
        await showPublicPrepared();
        if (gateRevision !== authGateRevisionRef.current) return;
        pendingQuestionRef.current = { question, delegationId, preferredId };
        setConnectionOpen(true);
        setError('ChatGPT connection is unavailable. You can keep exploring the globe.');
        return;
      }
    }
    if (active.current && activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'superseded' }, activeTurnRef.current);
    if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId);
    const id = ++revision.current;
    active.current?.abort();
    locationAbortRef.current?.abort();
    modelAbortRef.current?.abort(); modelAbortRef.current = null;
    modelTelemetryRef.current = null;
    void sendWorldCommand({ type: 'cancelWorldTurn' }).catch(() => {});
    const turnId = telemetry.beginTurn('typed', question.trim().length);
    activeTurnRef.current = turnId;
    const controller = new AbortController(); active.current = controller;
    const previousWorld = world;
    const previousQuestion = questionText;
    setError(''); setAnswer(''); setOpening(''); setConversationReply(''); setBusy(true); setQuestionText(question); setWorld(null); setSources([]); setModelStatus(null);
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
    let cancelModel = () => {};
    let resolveAnswerTarget: () => void = () => {};
    const answerTargetReady = new Promise<void>(resolve => { resolveAnswerTarget = resolve; });
    try {
      const navigationPlan = publicNavigationPlan;
      if (navigationPlan) {
        setProgress('Moving through the world…');
        let acknowledged = false;
        const navigation = navigate(navigationPlan, () => {
            if (acknowledged || id !== revision.current || controller.signal.aborted) return;
            acknowledged = true;
            setOpening(navigationPlan.acknowledgement);
          });
        const result = await navigation;
        if (id !== revision.current || controller.signal.aborted) return;
        if (!result.ok) { caughtErrorKind = 'navigation'; throw new Error(result.reason ?? 'The world could not complete that journey.'); }
        setAnswer(navigationPlan.context); setProgress('');
        turnOutcome = 'navigation_only';
        return;
      }
      setProgress('Thinking…');
      const mapOverview = !preferredId && prefersGeographicOverview(question);
      const prepared = mapOverview ? null : matchLibrary(question);
      const queryTargetId = navigationState ? catalogueTargetIdInQuestion(question) : null;
      const initialPerspective = navigationState ? suggestedPerspective(question) : null;
      const queryTarget = queryTargetId ? WORLD_TARGETS.find(item => item.id === queryTargetId) ?? null : null;
      const initialJourney = queryTarget && !prepared?.anchor
        ? navigate({ commands: [{ type: 'flyTo', targetId: queryTarget.id }], acknowledgement: '', context: '' })
        : null;
      const initialPerspectiveJourney = !prepared?.anchor && initialPerspective && navigationState?.perspective !== initialPerspective
        ? (async () => {
            const journey = initialJourney ? await initialJourney : null;
            if (journey && !journey.ok) return journey;
            return navigate({ commands: [{ type: 'setPerspective', perspective: initialPerspective }], acknowledgement: '', context: '' });
          })()
        : null;

      const wantsModel = !mapOverview && Boolean(preferredId || prepared || /\b(model|3d|structure|architecture|mechanism|engine|pump|turbine|bridge|volcano|building|machine|works?|inside|shape|anatomy|robot|satellite|heart|lighthouse|gear|telescope)\b/i.test(question));
      let resolvedModelTarget: GeneratedWorldTarget | undefined = undefined;
      let modelPromise: Promise<void> | null = null;
      const startModel = (answerContext?: WorldAnswer) => {
        const modelController = new AbortController(); modelAbortRef.current=modelController; cancelModel = () => modelController.abort();
        const modelSignal=AbortSignal.any([controller.signal,modelController.signal]);
        const modelStarted=performance.now(); modelTelemetryRef.current={turnId,started:modelStarted};
        telemetry.record('model.lifecycle',{phase:'requested'},turnId);setModelStatus({title:prepared?.title??'model',phase:'building'});
        return (async()=>{
          const response=await fetch('/api/explore/library-model',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({query:question,...(preferredId?{preferredId}:{}),...(answerContext?{world:answerContext}:{})}),signal:modelSignal});
          if(!response.ok)throw new Error('Model unavailable');const payload=z.object({recipe:z.unknown(),via:z.string(),persisted:z.boolean()}).parse(await response.json());const recipe=validateLibraryModel(payload.recipe);
          if (!recipe.anchor && !queryTarget) await answerTargetReady;
          if(initialJourney)await initialJourney;if(initialPerspectiveJourney)await initialPerspectiveJourney;
          if(id!==revision.current||modelSignal.aborted)return;
          const anchor=modelLocation(recipe,resolvedModelTarget,queryTarget?{name:queryTarget.label,latitude:queryTarget.lat,longitude:queryTarget.lon}:null);
          const commands:WorldCommand[]=[];
          if(anchor)commands.push({type:'flyToLocation',...anchor});
          else {const coordinates=prepared?.anchor; if(coordinates)commands.push({type:'flyToLocation',...coordinates,span:12});}
          commands.push({type:'setPerspective',perspective:'horizon'},{type:'showLibraryModel',recipe,...(anchor?{anchor}:{})});
          const shown=await navigate({commands,acknowledgement:'',context:''});
          if(id!==revision.current||modelSignal.aborted)return;
          if(!shown.ok)throw new Error('Model could not be placed');
          telemetry.record('model.lifecycle',{phase:'ready',duration_ms:performance.now()-modelStarted,point_count:getWorldState()?.proceduralModel?.pointCount,model:'gpt-5.6-luna',cached:payload.via!=='procedural',persisted:payload.persisted},turnId);
          setModelStatus({title:recipe.title,phase:'ready',persisted:payload.persisted,measured:recipe.special==='java'});
        })().catch(()=>{if(id===revision.current&&!modelSignal.aborted){setModelStatus({title:prepared?.title??'model',phase:'error'});telemetry.record('model.lifecycle',{phase:'error',duration_ms:performance.now()-modelStarted},turnId);}}).finally(()=>{if(modelAbortRef.current===modelController){modelAbortRef.current=null;modelTelemetryRef.current=null;}});
      }
      let response: Response | undefined;
      for (let attempt = 0; attempt < 12; attempt++) {
        controller.signal.throwIfAborted();
        const requestStarted = performance.now();
        response = await fetch('/api/explore/answer', { method: 'POST', headers: {'Content-Type':'application/json','Accept':'application/x-ndjson'}, body: JSON.stringify({query:question, selectedIds, previous:previousWorld, previousQuestion}), signal:controller.signal });
        lastHttpStatus = response.status;
        const contentType = response.headers.get('content-type') ?? '';
        telemetry.record('answer.http', { attempt, status: response.status, duration_ms: performance.now() - requestStarted, content_type: contentType.includes('application/x-ndjson') ? 'ndjson' : contentType.includes('json') ? 'json' : 'other' }, turnId);
        if (response.status !== 409) break;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      const answerStarted = performance.now();
      let openingSeen = false;
      const result = z.object({kind:z.enum(['conversation_reply','direct_answer','agents_terrain_answer']).optional(), conversationReply:z.string().max(2000).optional(), error:z.string().optional(), world:worldAnswerSchema.nullable().optional(), sources:z.array(z.object({url:z.string().url().regex(/^https?:\/\//),title:z.string().max(200)})).max(12).optional(), measured:z.object({output:z.string(),model:z.enum(['gpt-5.6-luna','gpt-5.6-sol','gpt-5.6-terra','gpt-6-astra']).optional(),route:z.enum(['quick','standard','research']).optional(),subagent_count:z.number().int().nonnegative().optional(),elapsed_ms:z.number().nonnegative().optional()}).optional()}).parse(await readAnswerStream(response!, (text, complete) => {
        if (id !== revision.current || controller.signal.aborted) return;
        if (!openingSeen) { openingSeen = true; telemetry.record('answer.opening', { phase: 'first', duration_ms: performance.now() - answerStarted }, turnId); }
        if (complete) telemetry.record('answer.opening', { phase: 'complete', duration_ms: performance.now() - answerStarted }, turnId);
        setOpening(text);
      }));
      if (!response!.ok) {
        if (response!.status === 401) {
          signedInRef.current = false;
          pendingQuestionRef.current = { question, delegationId, preferredId };
          setConnectionOpen(true);
          throw new Error('Your ChatGPT connection ended. Connect again to answer this question.');
        }
        if (response!.status === 503) throw new Error('ChatGPT is unavailable right now. You can keep exploring the globe.');
        throw new Error(result.error || 'The explanation could not be completed.');
      }
      if (id !== revision.current || controller.signal.aborted) return;
      if (!result.measured) throw new Error('The explanation was empty. Please try again.');
      telemetry.record('answer.result', { model: result.measured.model, route: result.measured.route, subagent_count: result.measured.subagent_count, server_elapsed_ms: result.measured.elapsed_ms, duration_ms: performance.now() - answerStarted }, turnId);
      if (result.kind === 'conversation_reply') {
        if (result.world !== null || !result.conversationReply?.trim()) throw new Error('The conversational reply was incomplete.');
        cancelModel();
        resolveAnswerTarget();
        setOpening(''); setModelStatus(null);
        setConversationReply(result.conversationReply); setProgress('');
        return;
      }
      // The article reads the subject field, never the conversational reply or live transcript.
      const explanation = result.world?.explanation ?? result.measured.output;
      setAnswer(explanation); setSources(result.sources ?? []); setProgress('');
      if (result.world) setWorld(result.world);
      resolvedModelTarget=result.world?.targets[0];
      resolveAnswerTarget();
      if (wantsModel || result.world?.modelBrief) modelPromise=startModel(result.world ?? undefined);
      if (initialJourney) {
        const navigation = await initialJourney;
        if (id !== revision.current || controller.signal.aborted) return;
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (result.world) {
        const target = mapOverview ? overviewLocation(result.world.targets) : result.world.targets[0];
        const supported = target ? catalogueTarget(target) : null;
        if (!modelPromise && target && (!supported || supported.id !== queryTarget?.id) && navigationState) {
          const command: WorldCommand = supported ? { type:'flyTo',targetId:supported.id } : { type:'flyToLocation', ...target };
          const navigation = await navigate({ commands: [{ type: 'clearProceduralModel' },command], acknowledgement: '', context: '' });
          if (!navigation.ok) { navigationFailed(); return; }
        }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      if (initialPerspectiveJourney) {
        const navigation = await initialPerspectiveJourney;
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (id !== revision.current || controller.signal.aborted) return;
      const finalPerspective = modelPromise ? null : mapOverview ? 'aerial' : result.world?.perspective;
      if (finalPerspective && getWorldState()?.perspective !== finalPerspective) {
        const navigation = await navigate({ commands: [{ type: 'setPerspective', perspective: finalPerspective }], acknowledgement: '', context: '' });
        if (!navigation.ok) { navigationFailed(); return; }
      }
      if (id !== revision.current || controller.signal.aborted) return;

      if(modelPromise)await modelPromise;
    } catch (e) {
      cancelModel();
      resolveAnswerTarget();
      if (id !== revision.current || controller.signal.aborted) return;
      turnOutcome = 'error';
      telemetry.record('turn.error', { error_kind: classifyTelemetryError(e, caughtErrorKind, lastHttpStatus) }, turnId);
      const message = e instanceof Error ? e.message : 'Something interrupted the explanation.';
      setError(message); setProgress('');
    } finally {
      resolveAnswerTarget();
      const interrupted = id !== revision.current || controller.signal.aborted;
      telemetry.record('turn.finished', { outcome: interrupted ? (controller.signal.aborted ? 'cancelled' : 'stale') : turnOutcome }, turnId);
      if (id === revision.current) { setBusy(false); active.current = null; activeTurnRef.current = null; }
    }
  }, [ready, world, questionText, navigationState]);
  useEffect(() => { onAskReady(q => { void ask(q); }); return () => onAskReady(null); }, [ask, onAskReady]);
  useEffect(() => () => { if (activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'unmount' }, activeTurnRef.current); if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId); revision.current++; active.current?.abort(); locationAbortRef.current?.abort(); modelAbortRef.current?.abort(); }, []);
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
  const cancel = () => {
    if (activeTurnRef.current) telemetry.record('turn.cancelled', { reason: 'user' }, activeTurnRef.current);
    if (modelTelemetryRef.current) telemetry.record('model.lifecycle', { phase: 'cancelled', duration_ms: performance.now() - modelTelemetryRef.current.started }, modelTelemetryRef.current.turnId);
    revision.current++; active.current?.abort(); active.current = null;
    modelAbortRef.current?.abort(); modelAbortRef.current = null;
    modelTelemetryRef.current = null;
    void sendWorldCommand({ type: 'cancelWorldTurn' }).catch(() => {});
    if (busy) setAnswer('');
    setOpening(''); setModelStatus(null);
    setBusy(false); setProgress('');
  };
  const handleConnected = useCallback(() => {
    authGateRevisionRef.current++;
    signedInRef.current = true;
    setError('');
    const pending = pendingQuestionRef.current;
    pendingQuestionRef.current = null;
    if (pending) { setConnectionOpen(false); void ask(pending.question, pending.delegationId, pending.preferredId); }
  }, [ask]);
  const userCaption = questionText;
  const agentCaption = conversationReply || spokenParagraph(answer || opening);
  const showEditorial = Boolean(world || answer || opening || modelStatus);
  const editorialTitle = world?.title || (busy ? 'Reading the world' : questionText ? 'Astra’s field note' : 'Ask the Earth');
  const subtitle = answerSubtitle(world, navigationState, Boolean(answer), progress);
  const editorialAnswer = splitEditorialAnswer(answer || opening);
  const detailedAnswer = editorialAnswer.detail;
  return <>
  {showEditorial && <aside className={styles.editorial} data-answer-panel="true" aria-live="polite" aria-label="Astra’s answer">
    <header><p>{subtitle}</p><h2>{editorialTitle}</h2></header>
    {busy && !answer && <div className={styles.editorialLoading} role="status"><span/><span/><span/><small>{progress || 'Thinking'}</small></div>}
    {editorialAnswer.lead && <div className={styles.editorialCopy}>{answerWithLinks(editorialAnswer.lead)}</div>}
    {world && world.targets.length > 1 && <div className={styles.parts} aria-label="Answer locations">{world.targets.map(target=><button key={`${target.name}:${target.latitude}:${target.longitude}`} type="button" disabled={busy || navigationState?.busy} onClick={()=>viewLocation(target)}>{target.name}</button>)}</div>}
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
    <CodexConnection open={connectionOpen} onClose={() => setConnectionOpen(false)} onConnected={handleConnected} onDisconnected={() => { signedInRef.current = false; }}/>
    <div className={styles.inputRow}>
      <QuestionBar onQuestion={ask} disabled={!ready} busy={busy} onCancel={cancel}/>
      <details className={styles.diagnostics}><summary aria-label="Diagnostics" title="Diagnostics"><MoreHorizontal size={19}/></summary><div><button type="button" onClick={downloadTelemetryReport}>Export debug report</button><button type="button" onClick={() => telemetry.clear()}>Clear diagnostics</button><p>Stored only in this tab. Raw questions, answers, audio, images, and credentials are excluded.</p></div></details>
    </div>
    {!connectionOpen && <div className={styles.dockMeta}><button type="button" className={styles.connectCompact} onClick={() => setConnectionOpen(true)}>Connect ChatGPT</button></div>}
  </section></>;
}
