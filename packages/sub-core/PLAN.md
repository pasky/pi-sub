# PLAN

## Goals
- Split sub-core into a shared fetch/cache engine used by multiple sub-* extensions.
- Keep sub-bar as display-only (formatting + widget rendering).
- Keep cycle/pin commands in sub-bar (sub-core exposes actions via events, not CLI commands).
- Use a **new cache location** for sub-core and **remove old sub-bar cache** without migration.

## Event contract (sub-core ↔ sub-*)

### Events emitted by sub-core
- `sub-core:ready` → `{ state, settings }`
- `sub-core:update` → `{ state }`
- `sub-core:settings:updated` → `{ settings }`

### Events handled by sub-core
- `sub-core:request` → `{ reply: (payload) => void, includeSettings?: boolean }`
- `sub-core:settings:patch` → `{ patch: Partial<CoreSettings> }`
- `sub-core:action` → `{ type: "refresh" | "cycleProvider" | "pinProvider", provider?: ProviderName }`

### Notes
- No CLI commands in sub-core. sub-bar owns user commands and forwards actions via events.
- sub-core responds to late subscribers via `sub-core:request`.

## Implementation checklist

### 1) sub-core scaffolding & paths
- [ ] Add sub-core `src/paths.ts` for cache/settings paths.
- [ ] Set cache to `~/.pi/agent/extensions/sub-core/cache.json` (and lock file in same dir).
- [ ] On startup, **delete** legacy cache files if present:
  - `~/.pi/agent/extensions/sub-bar/cache.json`
  - `~/.pi/agent/extensions/sub-bar/cache.lock`

### 2) Move data + provider stack into sub-core
- [ ] Move/copy fetching + caching modules into sub-core:
  - `dependencies.ts`, `config.ts`, `errors.ts`, `provider.ts`
  - `providers/**` (impl + metadata + detection + status + extras/windows)
  - `usage/**` (fetch/controller/types)
  - `cache.ts`, `storage/**`, `storage.ts`, `status.ts`
- [ ] Export shared types from `sub-core/src/shared/types.ts` for sub-* consumers.

### 3) sub-core settings ownership
- [ ] Implement `sub-core` settings file with provider + behavior settings only.
- [ ] Remove provider/behavior settings from sub-bar (display settings stay).
- [ ] Optional: one-time cleanup of obsolete sub-bar settings keys if needed.

### 4) sub-core runtime + events
- [ ] Initialize refresh loop in sub-core (session_start/turn/tool/model events).
- [ ] Emit `sub-core:ready` after first load.
- [ ] Emit `sub-core:update` on cache read and after fresh fetch.
- [ ] Handle `sub-core:request`, `sub-core:settings:patch`, `sub-core:action`.

### 5) sub-bar as display-only client
- [ ] Remove fetching/controller/caching from sub-bar.
- [ ] Subscribe to `sub-core:update` and render widget.
- [ ] On startup, call `sub-core:request` for immediate state.
- [ ] Keep cycle/pin commands in sub-bar and forward actions via `sub-core:action`.

### 6) Validation
- [ ] `npm run check` in sub-core.
- [ ] `npm run check` in sub-bar.
- [ ] Manual verification: multiple pi instances use shared cache and do not refetch excessively.
