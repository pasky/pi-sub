# sub-core

Shared usage data core for pi extensions. Sub-core owns fetching, caching, provider selection, and emits usage updates via `pi.events` for the wider `sub-*` ecosystem (UI and non-UI clients).

## Overview

- Fetches usage + status data from providers
- Deduplicates requests via shared cache/lock
- Emits updates for display-focused extensions (e.g. `sub-bar`) and non-UI tooling extensions

## Tool Access

`sub-core` registers tools to expose usage snapshots to Pi:

- `sub_get_usage` – refreshes usage (forced by default) and returns `{ provider, usage }`.
- `sub_get_all_usage` – refreshes and returns all enabled provider entries.

## Settings

Use `sub-core:settings` to configure shared provider + behavior settings.

## Installation

Clone the repo and register the extension with pi. `sub-core` can power multiple `sub-*` extensions (some with UI, some without), so you typically install it alongside whichever clients you want:

```bash
git clone https://github.com/marckrenn/sub-core.git
ln -s /path/to/sub-core ~/.pi/agent/extensions/sub-core
```

Alternative (no symlink): add it to `~/.pi/agent/settings.json`:

```json
{
  "extensions": ["/path/to/sub-core/index.ts"]
}
```

For a UI, also install a display extension like `sub-bar`. Other `sub-*` extensions may consume the same data without UI.

## Packaging notes (pi install compatibility)

The plan in pi-mono issue #645 expects packages to declare extension entry points via the `pi` field in `package.json` (already done here). To stay compatible:

- Keep `pi.extensions` pointing at `./index.ts`
- Publish the package to npm (e.g. `pi-sub-core`) so future `pi install npm:pi-sub-core` can work
- Avoid repo-specific assumptions in docs (manual paths still work)

## Cache

Sub-core stores a shared cache and lock file:

- `cache.json` (next to the extension entry)
- `cache.lock` (next to the extension entry)

## Provider Comparison

| Provider | Usage Data | Status Page | Notes |
|----------|-----------|-------------|-------|
| Anthropic (Claude) | 5h/7d windows, extra usage | ✅ | Extra usage on/off state |
| GitHub Copilot | Monthly quota, requests | ✅ | Request multiplier support |
| Google Gemini | Pro/Flash quotas | ✅ | Aggregated by model family |
| OpenAI Codex | Primary/secondary windows | ✅ | Remaining-style display in UI |
| AWS Kiro | Credits | - | CLI-based usage query |
| z.ai | Tokens/monthly limits | - | API quota limits |

## Adding a Provider

You need to update both **sub-core** (fetch layer) and **sub-bar** (display layer).

### sub-core (fetch + status)
1. Add provider name to `src/types.ts` (`PROVIDERS`, `ProviderName`).
2. Implement fetcher in `src/providers/impl/<provider>.ts`.
3. Register provider in `src/providers/registry.ts`.
4. Add detection + status config in `src/providers/metadata.ts`.
5. Add provider settings defaults in `src/settings-types.ts`.

### sub-bar (display + UI)
1. Add provider name to `src/types.ts`.
2. Add display rules + labels in `src/providers/metadata.ts`.
3. Add window visibility in `src/providers/windows.ts`.
4. Add extras in `src/providers/extras.ts` (if needed).
5. Add settings UI + defaults in `src/providers/settings.ts` and `src/settings-types.ts`.

## Events (public contract)

Sub-core uses `pi.events` as an in-process pub/sub bus. Any `sub-*` extension can subscribe to updates (UI or headless). Sub-core is the source of truth for provider selection and refresh behavior; clients observe state and optionally request changes.

### Broadcasts
- `sub-core:ready` → `{ state, settings }` (first load)
- `sub-core:update` → `{ state }` (cache hit or fresh fetch)
- `sub-core:settings:updated` → `{ settings }`

`state` is `{ provider, usage }`, where `usage` includes windows, status, and error info.

### Requests (pull current state)
- `sub-core:request` → `{ reply, includeSettings? }`
- `sub-core:request` → `{ type: "entries", reply, force? }` (for compare views)

The `reply` callback receives `{ state }` or `{ entries }` immediately if available.

### Actions (mutate core state)
- `sub-core:settings:patch` → `{ patch }` (updates refresh interval/provider settings and persists)
- `sub-core:action` → `{ type: "refresh" | "cycleProvider" | "pinProvider", provider?, force? }`

After an action, sub-core emits `sub-core:update` with the new state.

## Status

Active. Used by `sub-bar` for display.
