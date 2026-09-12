/** User-facing release history. Keep historical entries tied to their saved milestones. */
export const currentVersion = '0.3';

export const releases = [
  {
    version: '0.3',
    date: '2026-09-12',
    dateLabel: '12 September 2026',
    title: 'A light you remember',
    milestone: 'This build',
    changes: [
      'Independent star rhythms, sharper occasional glints and a fuller glow make the Earth shimmer.',
      'A new Star shimmer control adjusts the effect. Pausing motion keeps the light still.',
      'The last life you visit stays with you after closing its story, gathering into a warm light on the way back to Earth.',
      'The globe settles before the closing words appear. A journey without a visited life has its own neutral return.',
      'Portrait returns allow more room for the remembered light; city point density responds to screen size.',
    ],
    review: 'Source, engine-lifecycle and projected-camera checks cover all three lives, fresh journeys and reduced motion. This release still needs an on-device visual review; earlier fallback screenshots describe v0.2.',
  },
  {
    version: '0.2.1',
    date: '2026-09-12',
    dateLabel: '12 September 2026',
    title: 'A history to build on',
    milestone: 'Previous release',
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
