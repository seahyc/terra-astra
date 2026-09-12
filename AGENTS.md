# Terra Astra release continuity

The user wants visible version tracking and preserved iterations.

- Before changing this Site, read `CHANGELOG.md` and the current `lib/terra/releases.ts`. Follow the current Sites skills and the user's scope and publication instructions.
- Every user-facing release gets a semantic version, an appended changelog entry, a public history entry, an annotated Git tag pointing to its exact source, and a saved Sites version.
- Preserve previous tags and saved milestones. Do not move a published tag or overwrite an old milestone to make a new one look like the original.
- Keep saved, published, proposed and reviewed states distinct. Only report publication after a successful native deployment result; only claim device/renderer verification that actually occurred.
- `docs/NEXT-BUILD.md` is a proposal, not authorization to implement its scope.
- Use the existing project identity. Source is Git-backed; do not duplicate the repository into generic file storage.
