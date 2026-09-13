'use client';

import type {
  EvidenceSource,
  PresentationSnapshot,
  ProfilePoint,
} from '../../lib/terra/evidence/types';
import styles from './evidence-panel.module.css';

type EvidencePanelProps = { snapshot: PresentationSnapshot };

const signedMetres = (value: number) =>
  `${value > 0 ? '+' : ''}${Math.round(value).toLocaleString('en')} m`;

const kilometres = (metres: number, digits = 2) =>
  `${(metres / 1000).toFixed(digits)} km`;

function sourceDate(source: EvidenceSource) {
  const raw = source.publishedAt ?? source.retrievedAt;
  const date = new Date(raw);
  return Number.isNaN(date.valueOf())
    ? raw
    : new Intl.DateTimeFormat('en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date);
}

function ProfileGraph({ points }: { points: ProfilePoint[] }) {
  if (points.length < 2) {
    return <p className={styles.empty}>The profile needs at least two samples.</p>;
  }

  const width = 344;
  const height = 146;
  const inset = { top: 12, right: 8, bottom: 25, left: 8 };
  const distances = points.map((point) => point.distanceKm);
  const elevations = points.map((point) => point.elevationM);
  const minX = Math.min(...distances);
  const maxX = Math.max(...distances);
  const minY = Math.min(0, ...elevations);
  const maxY = Math.max(0, ...elevations);
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY || 1;
  const x = (value: number) =>
    inset.left + ((value - minX) / xSpan) * (width - inset.left - inset.right);
  const y = (value: number) =>
    inset.top + ((maxY - value) / ySpan) * (height - inset.top - inset.bottom);
  const line = points.map((point) => `${x(point.distanceKm)},${y(point.elevationM)}`).join(' ');
  const seaY = y(0);
  const areaPath = `${line} ${x(maxX)},${seaY} ${x(minX)},${seaY}`;
  const highest = points.reduce((best, point) =>
    point.elevationM > best.elevationM ? point : best,
  );
  const lowest = points.reduce((best, point) =>
    point.elevationM < best.elevationM ? point : best,
  );

  return (
    <svg
      className={styles.profileGraph}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="profile-title profile-description"
    >
      <title id="profile-title">Sampled elevation profile</title>
      <desc id="profile-description">
        Elevation in metres plotted against distance in kilometres. Gold indicates land above sea level and cyan indicates ocean depth below it.
      </desc>
      <defs>
        <linearGradient id="profile-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#edcb91" stopOpacity=".52" />
          <stop offset={`${Math.max(0, Math.min(100, (seaY / height) * 100))}%`} stopColor="#edcb91" stopOpacity=".18" />
          <stop offset="100%" stopColor="#75cdd8" stopOpacity=".42" />
        </linearGradient>
      </defs>
      <line className={styles.seaLine} x1={inset.left} x2={width - inset.right} y1={seaY} y2={seaY} />
      <text className={styles.seaLabel} x={inset.left + 4} y={seaY - 5}>SEA LEVEL</text>
      <polygon points={areaPath} fill="url(#profile-fill)" />
      <polyline className={styles.profileLine} points={line} />
      {[highest, lowest].map((point, index) => (
        <g key={`${point.distanceKm}-${point.elevationM}`}>
          <circle className={styles.markerHalo} cx={x(point.distanceKm)} cy={y(point.elevationM)} r="5.5" />
          <circle className={index === 0 ? styles.highMarker : styles.lowMarker} cx={x(point.distanceKm)} cy={y(point.elevationM)} r="2.7" />
        </g>
      ))}
      <text className={styles.axisLabel} x={inset.left} y={height - 7}>0 km</text>
      <text className={styles.axisLabel} textAnchor="end" x={width - inset.right} y={height - 7}>{maxX.toFixed(0)} km</text>
    </svg>
  );
}

export function EvidencePanel({ snapshot }: EvidencePanelProps) {
  const scene = snapshot.scene, measurement = scene?.measurement;
  if (!scene || !measurement) return null;
  const value = measurement.profile ? kilometres(measurement.profile.verticalRangeM, 1)
    : measurement.comparison ? `${Math.abs(measurement.comparison.differenceM).toLocaleString('en')} m longer`
    : `${measurement.values[0]?.value.toLocaleString('en')} m`;
  return <details className={styles.panel} aria-label="Measurement and sources">
    <summary className={styles.summary}><span>{value}</span><span>{measurement.profile ? 'sampled relief' : 'published length'} · Sources <span aria-hidden="true">↗</span></span></summary>
    <div className={styles.details}>
      <h3>{scene.evidence.map(e => e.label).join(' / ')}</h3>
      {measurement.profile && <ProfileGraph points={measurement.profile.points}/>}
      {measurement.profile && <p>{signedMetres(measurement.profile.highest.elevationM)} to {signedMetres(measurement.profile.lowest.elevationM)} along the sampled transect.</p>}
      {measurement.values.map(v => <p key={v.evidenceId}>{v.label}: {v.value.toLocaleString('en')} m. {v.definition}</p>)}
      <p>{measurement.method}</p>
      {measurement.caveats.map(c => <p key={c}>{c}</p>)}
      <div className={styles.sources}>{measurement.sources.map(source => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.publisher} · {source.title}<small>{sourceDate(source)}</small></a>)}</div>
    </div>
  </details>;
}
