# YC feature branch

This checkout starts from `shariffster/terra-astra` source
`9b9e2ec4ef3534b463e20d4d08c4ae3de444843d` on `feat/yc-terra-astra`.
It retains the v0.4 experience and release history. This is a deployment baseline,
not a new feature release. The hosting manifest identifies YC's independent Site;
historical Sites IDs in the changelog refer to the original team's milestones.

## Local development

Use Node 24 or later (the existing engine checks need native TypeScript support).
When reopening this checkout, configure the installed Sites plugin's portable
execution profile according to its skill before running project commands.

```sh
npm run install:ci
npm run dev -- --port 5173 --hostname 127.0.0.1
```

The development server prints its local URL. Dependencies need installation only
when absent or when the lockfile changes. All rendered geography is checked in;
ordinary development needs no API keys, databases, or source-data regeneration.

## Existing verification

```sh
npx tsc --noEmit --incremental false
node scripts/check-depth.mjs
node scripts/check-choreography.mjs
node scripts/check-memory.mjs
npm run build
```

Publish through the Sites hosting skill from this checkout. Keep `origin` pointing
at the teammate repository and use a separate `sites` remote for the independent
Site source. Push the feature branch to `origin`; push its exact source to the
branch supplied by Sites before saving and deploying. Do not deploy the historical
Site IDs or change their access policy.

Future user-facing features must follow `AGENTS.md`'s release continuity rules.
Track ideas remain proposals until selected; this setup does not implement AI,
new stories, uploads, audio, or additional geography.
