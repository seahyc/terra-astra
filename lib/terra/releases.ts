/** User-facing release history. Keep historical entries tied to their saved milestones. */
export const currentVersion = '0.2.1';

export const releases = [
  {
    version: '0.2.1',
    date: '2026-09-12',
    dateLabel: '12 September 2026',
    title: 'A history to build on',
    milestone: 'This build',
    changes: [
      'A visible version number opens this build history.',
      'Each milestone records its changes and review notes.',
      'The original globe and the v0.2 refinement are preserved as separate snapshots.',
    ],
    review: 'Uses the v0.2 star field. Full WebGL appearance and physical phone performance still need a device review.',
  },
  {
    version: '0.2',
    date: '2026-09-09',
    dateLabel: '9 September 2026',
    title: 'Continuity, light and the human reveal',
    milestone: 'Saved milestone',
    changes: [
      'The camera pulls away from Singapore before turning back toward the globe.',
      'Street detail appears gradually, with quieter light and softer coverage edges.',
      'Choosing a life dims the city, reveals its places and traces their connections.',
      'Stories begin with one sentence and expand on request. Phone framing keeps their places above the panel.',
    ],
    review: 'Camera regression checks and desktop / phone-width fallback checks passed. Saved separately before being included in v0.2.1.',
  },
  {
    version: '0.1',
    date: '2026-09-09',
    dateLabel: '9 September 2026',
    title: 'Earth, constellated',
    milestone: 'Original release',
    changes: [
      'A rotating Earth made from geographic star samples and historical city lights.',
      'A guided descent into central Singapore and three imagined human constellations.',
      'Controls for glow, density, connecting threads and ambient motion.',
    ],
    review: 'Owner screenshots and a recording informed the next pass: city brightness, transition continuity and the human reveal needed work.',
  },
] as const;
