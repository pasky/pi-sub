# pi-sub

Monorepo for the `sub-*` extension ecosystem: a shared usage core (`sub-core`), UI clients (like `sub-bar`), and headless consumers that subscribe to usage updates.

## Overview

- **sub-core**: fetches usage + status, manages cache/locks, owns provider selection, and emits updates via `pi.events`.
- **sub-bar**: UI widget that renders the current usage state above the editor.
- **sub-shared**: shared types + event contract (published to npm as `pi-sub-shared`).

`sub-core` can power multiple `sub-*` extensions at once (some with UI, some headless).

## Packages

- `packages/sub-core` — shared fetch/cache core (pi extension)
- `packages/sub-bar` — UI display client (pi extension)
- `packages/sub-shared` — shared types + event contract (npm package)

## Quick Start (manual install)

```bash
git clone https://github.com/marckrenn/pi-sub.git

# Enable extensions
ln -s /path/to/pi-sub/packages/sub-core ~/.pi/agent/extensions/sub-core
ln -s /path/to/pi-sub/packages/sub-bar  ~/.pi/agent/extensions/sub-bar
```

Alternative (no symlink): add both to `~/.pi/agent/settings.json`:

```json
{
  "extensions": [
    "/path/to/pi-sub/packages/sub-core/index.ts",
    "/path/to/pi-sub/packages/sub-bar/index.ts"
  ]
}
```

> You only install `sub-core` + `sub-bar`. `sub-shared` is an npm dependency and is pulled automatically.

## Future (pi package manager)

Once the package manager from pi-mono issue #645 ships, users should be able to install via:

```bash
pi install npm:pi-sub-core
pi install npm:pi-sub-bar
```

## Communication model (core ↔ clients)

`sub-core` is the source of truth. It emits updates and accepts requests/actions over `pi.events`.

**Broadcasts**
- `sub-core:ready` → `{ state, settings }` (first load)
- `sub-core:update` → `{ state }` (cache hit or fresh fetch)
- `sub-core:settings:updated` → `{ settings }`

**Requests (pull)**
- `sub-core:request` → `{ reply, includeSettings? }`
- `sub-core:request` → `{ type: "entries", reply, force? }`

**Actions (mutate core state)**
- `sub-core:settings:patch` → `{ patch }` (persists core settings)
- `sub-core:action` → `{ type: "refresh" | "cycleProvider" | "pinProvider", provider?, force? }`

UI extensions like `sub-bar` listen for updates and render. They send settings patches (e.g., refresh interval) so the core stays in sync.

## Settings & Cache

- **sub-core settings**: `~/.pi/agent/extensions/sub-core/settings.json`
- **sub-bar settings**: `~/.pi/agent/extensions/sub-bar/settings.json`
- **cache**: `~/.pi/agent/extensions/sub-core/cache.json`
- **lock**: `~/.pi/agent/extensions/sub-core/cache.lock`

## Adding a Provider (summary)

You must update **both** sub-core (fetch layer) and sub-bar (display/UI).

### sub-core
1. Add provider name to `packages/sub-core/src/types.ts`.
2. Implement fetcher in `packages/sub-core/src/providers/impl/<provider>.ts`.
3. Register provider in `packages/sub-core/src/providers/registry.ts`.
4. Add detection + status config in `packages/sub-core/src/providers/metadata.ts`.
5. Add settings defaults in `packages/sub-core/src/settings-types.ts`.

### sub-bar
1. Add provider name to `packages/sub-bar/src/types.ts`.
2. Add display metadata in `packages/sub-bar/src/providers/metadata.ts`.
3. Add window visibility rules in `packages/sub-bar/src/providers/windows.ts`.
4. Add extras (if needed) in `packages/sub-bar/src/providers/extras.ts`.
5. Add settings UI + defaults in `packages/sub-bar/src/providers/settings.ts` and `packages/sub-bar/src/settings-types.ts`.

## Development

```bash
npm install
npm run check
```

Per-package checks:

```bash
npm run check -w pi-sub-core
npm run check -w pi-sub-bar
npm run check -w pi-sub-shared
```

## Publishing (planned)

- NPM package names: `pi-sub-core`, `pi-sub-bar`, `pi-sub-shared`.
- Extension/command names stay `sub-*` (no user-facing breaking change).
- Start with lockstep versions across packages.
- Use GitHub Actions + `NPM_TOKEN` for publishing.
