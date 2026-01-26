# Contributing

Thanks for helping improve **pi-sub**!

## Requirements

- Node.js >= 20 (see `.nvmrc`)
- npm

## Setup

```bash
npm install
```

## Common scripts

```bash
npm run check
npm run test
npm run lint
npm run format
npm run verify
```

Workspace-specific commands:

```bash
npm run check -w @marckrenn/pi-sub-core
npm run check -w @marckrenn/pi-sub-bar
npm run check -w @marckrenn/pi-sub-shared
npm run test -w @marckrenn/pi-sub-core
npm run test -w @marckrenn/pi-sub-bar
```

Watch mode:

```bash
npm run check:watch -w @marckrenn/pi-sub-core
npm run check:watch -w @marckrenn/pi-sub-bar
npm run check:watch -w @marckrenn/pi-sub-shared
npm run test:watch -w @marckrenn/pi-sub-bar
```

## Changesets

For user-facing changes, add a changeset:

```bash
npm run changeset
```

Commit the generated `.changeset/*.md` file with your PR.

## Pull requests

- Keep PRs focused and include relevant docs/tests.
- If you add or change shared types/events, update `sub-shared` exports and docs.
