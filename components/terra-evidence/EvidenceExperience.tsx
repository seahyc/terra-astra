'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createEarth, type Engine } from '../../lib/terra/engine';
import { createEvidenceTools, type EvidenceTools } from '../../lib/terra/evidence/handlers';
import { earthSceneRenderer } from '../../lib/terra/presentation/engine-adapter';
import type { SceneRenderer } from '../../lib/terra/evidence/types';
import { EvidencePanel } from './EvidencePanel';
import styles from './evidence-experience.module.css';

const studies = [
  { label: 'Java’s mountains & ocean floor', ids: ['profile:java-north-south'], view: 'profile' as const },
  { label: 'The Causeway', ids: ['crossing:causeway'], view: 'map' as const },
  { label: 'Compare the Second Link', ids: ['crossing:causeway', 'crossing:second-link'], view: 'comparison' as const },
];
/** Mountable review slice. onTools exposes the same handlers used by the coordinator adapter. */
export default function EvidenceExperience({ renderer, onTools }: { renderer?: SceneRenderer; onTools?: (tools: EvidenceTools | null) => void }) {
  const host = useRef<HTMLDivElement>(null), markers = useRef<HTMLDivElement>(null);
  const [engineHolder] = useState<{current:Engine|null}>(() => ({current:null}));
  const [tools] = useState(() => createEvidenceTools({ renderer: renderer ?? earthSceneRenderer(() => engineHolder.current) }));
  const snapshot = useSyncExternalStore(tools.director.subscribe, tools.director.getSnapshot, tools.director.getSnapshot);
  const [ready, setReady] = useState(!!renderer), [error, setError] = useState('');
  useEffect(() => {
    onTools?.(tools);
    return () => { onTools?.(null); tools.dispose(); };
  }, [tools, onTools]);
  useEffect(() => {
    if (renderer || !host.current || !markers.current) return;
    const controller = new AbortController();
    createEarth(host.current, markers.current, { stage: () => {}, ready: () => {}, error: setError, coordinates: () => {}, interact: () => {}, arrival: () => {} }, controller.signal).then(value => {
      if (controller.signal.aborted) { value.dispose(); return; }
      engineHolder.current = value;
      value.configure({ glow: 1.15, shimmer: .8, depth: true, threads: 1, density: .85, borders: false, motion: !matchMedia('(prefers-reduced-motion: reduce)').matches });
      setReady(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Earth unavailable.'); });
    return () => { controller.abort(); engineHolder.current?.dispose(); engineHolder.current = null; };
  }, [renderer, engineHolder]);
  const select = (study: typeof studies[number]) => { void tools.handlers.present({ evidenceIds: study.ids, view: study.view }); };
  return <main className={styles.experience}>
    <div ref={host} className={styles.earth} /><div ref={markers} />
    <header className={styles.header}><Link href="/">TERRA <i aria-hidden="true">✦</i> ASTRA</Link><span>EARTH, WITH EVIDENCE</span></header>
    <div className={styles.intro}><p>A WORLD YOU CAN ASK ABOUT</p><h1>From mountain<br />to <em>ocean floor.</em></h1><span>Explore a sourced transect. Put two crossings side by side.</span></div>
    <nav className={styles.studies} aria-label="Geographic studies">{studies.map((study, i) => <button key={study.view} disabled={!ready} aria-pressed={snapshot.scene?.view === study.view} onClick={() => select(study)}><span>0{i+1}</span>{study.label}<b aria-hidden="true">↗</b></button>)}</nav>
    <div className={styles.panel}><EvidencePanel snapshot={snapshot} /></div>
    {!ready && !error && <p className={styles.loading} role="status">Gathering Earth…</p>}
    {error && <p className={styles.loading} role="alert">{error}</p>}
    <footer className={styles.footer}>NOAA ETOPO 2022 · Natural Earth · Historical night lights · <span>Dashed crossing traces are schematic.</span></footer>
  </main>;
}
