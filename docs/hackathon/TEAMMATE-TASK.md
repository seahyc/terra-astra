# YC task — personal constellation, contract v2

Proposed implementation prompt for YC (`seahyc`). Planning only until both sessions acknowledge this contract in Git. Replaces Ask Astra; preserve the unused `feat/ask-astra` branch. Production must stay unchanged.

Repository: https://github.com/shariffster/terra-astra (private; YC write access verified).
Base: agreed HEAD of `sprint/hackathon-integration`, retaining v0.4.1 at `c4a4dad2281203eedc50138d4dac2a1c4048309c`. Record exact base SHA in PR. Proposed branch: `feat/personal-constellation`; create in your own clone after fetching the agreed base. No force pushes or moved tags.

## Exact scope and ownership

Build a compact accessible form to choose exactly three meaningful places from a searchable local catalogue. Each choice has a short meaning. No runtime API, geocoding, persistence or new dependencies.

You own only these new files:
- `app/personal-constellation-form.tsx`
- `app/personal-constellation-form.module.css`
- `lib/personal/catalogue.ts` (include coordinate sources/provenance)
- `lib/personal/model.ts` (validation and draft helpers)
- `scripts/check-personal-model.mjs`
- `docs/hackathon/TEAMMATE-EVIDENCE.md`
- `docs/hackathon/SUBMISSION-DRAFT.md`

Lead owns `lib/terra/**`, shared UI/styles/types, existing checks, dependencies, hosting, integration and releases. Do not edit these, drive the engine or deploy. Request interface changes through your PR. Coordinate independent sessions through Git.

## Proposed shared contract

Lead will create `lib/terra/personal-contract.ts` after agreement. Do not create a competing copy. Proposed exports:

```ts
export type PersonalPlace = Readonly<{
  id: string;
  label: string;
  lat: number;
  lon: number;
  meaning: string;
}>;
export type PersonalPlaces = readonly [PersonalPlace, PersonalPlace, PersonalPlace];
export type TransformationState = Readonly<{
  phase: 'terra' | 'opening' | 'astra' | 'reforming';
  progress: number; // bounded 0..1; 0 = Terra, 1 = Astra
  busy: boolean;
}>;
export type PersonalConstellationFormProps = {
  initialValue?: PersonalPlaces;
  disabled: boolean;
  onSubmit: (places: PersonalPlaces) => void;
  onReset: () => void; // draft only, not camera or submitted-personal memory
};
```

Named export: `PersonalConstellationForm`. Lead owns placement/transformation state, passes disabled during conflicting work, and revalidates submissions. Submission is a data event, not a camera-arrival promise. Existing Engine.descend() resolves at loading/flight dispatch, not arrival.

Validation: exactly three distinct catalogue IDs; labels/coordinates must match trusted catalogue entries; finite latitude [-90,90] and longitude [-180,180]; trimmed nonempty meaning of at most 80 characters. Normalize through catalogue lookup; never invent coordinates from arbitrary text. Defaults: “Where I began”, “Where I belong”, “A place I carry”. Catalogue limits must be visible. Render meanings as plain text; no analytics or network submission.

Form reset clears draft selections/meanings and calls onReset; it does not clear the submitted constellation. Resubmission replaces the triple atomically. Lead owns explicit personal clear, camera replay and full restart. Personal state stays separate from the fixed fictional Singapore stories.

## Acceptance and handback

- Keyboard-operable labelled search/selection; three distinct choices; readable errors; clear limited-catalogue explanation.
- Reject missing/duplicate places, forged IDs/coordinates, nonfinite values and overlong/blank meanings. Focused validation checks cover these cases.
- One valid triple arrives through onSubmit. Disabled blocks edits/submission/reset. No shared-file, credential, API or dependency changes.
- No claim of detailed streets outside Singapore. All coordinate sources documented.
- Run TypeScript and focused model check. Evidence includes exact commands/results, source provenance, base/commit SHA and integration example.
- PR target `sprint/hackathon-integration`. Target handback 12:20 SGT, combined route 13:05, freeze 14:00. Report blockers through Git/your human teammate.
- Submission draft uses verified capabilities only; disclose pre-existing v0.4 and distinguish today's fixes/new work. Astra currently assists engineering; runtime inference is absent unless separately built and verified.
- Portal team join remains a human action; GitHub access is not portal membership. Judge repository/video access and exact 90-second submission video remain outstanding.
