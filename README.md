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

## Rendering good practice (snappy UI)

To keep UI clients responsive (like `sub-bar`), prefer this sequence when a model or session changes:

1. **Render cached state immediately** (even if stale).
2. **Fetch fresh usage in the background**.
3. **Re-render when new data arrives**.

Why: awaiting fetches inside `pi.on("session_start")` / `pi.on("model_select")` blocks other extension handlers, so UI renders can lag behind network calls. In sub-core we use a non-blocking refresh (`void refresh(...)`) and allow stale cache (`allowStaleCache: true`) so cached usage is emitted before the forced fetch finishes. UI clients should listen for `sub-core:update-current` and render whenever state changes.

**Broadcasts**
- `sub-core:ready` → `{ state, settings }` (first load)
- `sub-core:update-current` → `{ state }` (cache hit or fresh fetch)
- `sub-core:update-all` → `{ state }` (cached entries + current provider)
- `sub-core:settings:updated` → `{ settings }`

**Requests (pull)**
- `sub-core:request` → `{ reply, includeSettings? }`
- `sub-core:request` → `{ type: "entries", reply, force? }`

**Actions (mutate core state)**
- `sub-core:settings:patch` → `{ patch }` (persists core settings)
- `sub-core:action` → `{ type: "refresh" | "cycleProvider" | "pinProvider", provider?, force? }`

UI extensions like `sub-bar` listen for updates and render the current provider state.

## Settings & Cache

- **sub-core settings**: `settings.json` next to the sub-core extension entry
- **sub-bar settings**: `settings.json` next to the sub-bar extension entry
- **cache**: `cache.json` next to the sub-core extension entry
- **lock**: `cache.lock` next to the sub-core extension entry
- **Anthropic overage currency (optional)**: configure orgId + cookie/sessionKey in `~/.pi/agent/auth.json` or env vars so “Extra” usage shows a currency symbol (otherwise amounts render without one)

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

## Developer guide (common workflows)

### Add a new provider (core + UI)

- **sub-core** owns fetching, caching, status lookup, provider detection, and emits update events.
- **sub-bar** owns display rules, formatting, per-provider UI settings, and visibility of windows/extras.
- If you add new shared types or provider metadata used by multiple packages, update **sub-shared** and re-export.

### Add a new feature: core vs sub-*

Use this rule of thumb when deciding where a feature lives:

**Put it in sub-core when:**
- It affects **data fetching**, provider detection/selection, or status polling.
- It changes **event contracts** (`sub-core:*` events) or tools (`sub_get_usage`, `sub_get_all_usage`).
- It introduces **shared settings** that should affect all clients.
- It requires cache/lock behavior or cross-window coordination.

**Put it in sub-* when:**
- It is **presentation-only** (formatting, layout, colors, widget behavior).
- It is **UI-only settings** (visibility toggles, label text, window ordering in display).
- It targets a single client (e.g. sub-bar specific display change).

**If both layers need it:**
- Add data and settings in sub-core (and `sub-shared` types), then consume in sub-bar.
- Update docs and tests for the shared contract.

### Example decisions

- **New API field or rate window data** → sub-core (fetch + cache), then surface in sub-bar.
- **New bar style or status icon pack** → sub-bar only.
- **New provider enablement behavior** → sub-core (and sub-bar UI can forward settings).

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

Sub-bar tests:

```bash
cd packages/sub-bar
npm run test
```

## Publishing (planned)

- NPM package names: `pi-sub-core`, `pi-sub-bar`, `pi-sub-shared`.
- Extension/command names stay `sub-*` (no user-facing breaking change).
- Start with lockstep versions across packages.
- Use GitHub Actions + `NPM_TOKEN` for publishing.
