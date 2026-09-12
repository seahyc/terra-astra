import type { Metadata } from 'next';
import Link from 'next/link';
import { currentVersion, releases } from '@/lib/terra/releases';

export const metadata: Metadata = {
  title: 'Build history — Terra Astra',
  description: 'The saved milestones, changes and review notes behind Terra Astra.',
};

export default function BuildHistory() {
  return (
    <main className="build-history">
      <header className="history-header">
        <Link className="wordmark" href="/">TERRA <i aria-hidden="true">✦</i> ASTRA</Link>
        <Link className="history-return" href="/">Return to Earth <span aria-hidden="true">↗</span></Link>
      </header>
      <div className="history-intro">
        <p className="eyebrow">EARTH, CONSTELLATED</p>
        <h1>Build history.</h1>
        <p>What changed, what we learned, and what still needs a closer look.</p>
      </div>
      <ol className="release-list" aria-label="Terra Astra versions">
        {releases.map(release => (
          <li key={release.version} id={`v${release.version}`}>
            <article className="release" aria-labelledby={`title-${release.version}`}>
              <div className="release-meta">
                <span className="release-number">v{release.version}</span>
                <span className={`release-kind${release.version === currentVersion ? ' current-release' : ''}`}>{release.milestone}</span>
                <time dateTime={release.date}>{release.dateLabel}</time>
              </div>
              <div className="release-content">
                <h2 id={`title-${release.version}`}>{release.title}</h2>
                <ul>{release.changes.map(change => <li key={change}>{change}</li>)}</ul>
                <p className="release-review"><strong>Review notes</strong>{release.review}</p>
              </div>
            </article>
          </li>
        ))}
      </ol>
      <footer className="history-footer">Earlier milestones are preserved as saved snapshots for recovery.</footer>
    </main>
  );
}
