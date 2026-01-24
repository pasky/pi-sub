# sub-bar

Usage widget extension for [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent).

Displays current provider usage in a widget above the editor. Fetching and caching are handled by `sub-core`, which can also power other `sub-*` extensions (UI or non-UI).

## Features

- Displays usage quotas for multiple AI providers
- Auto-detects provider from current model (via sub-core)
- Shows rate limit windows with visual progress bars
- Status indicators from provider status pages
- **Extensive settings UI** via `sub-bar:settings`
- Cycle through providers with `Ctrl+Alt+P`

## Supported Providers

| Provider | Usage Data | Status Page |
|----------|-----------|-------------|
| Anthropic (Claude) | 5h/7d windows, extra usage | ✅ |
| GitHub Copilot | Monthly quota, requests | ✅ |
| Google Gemini | Pro/Flash quotas | ✅ |
| OpenAI Codex | Primary/secondary windows | ✅ |
| AWS Kiro | Credits | - |
| z.ai | Tokens/monthly limits | - |

## Provider Feature Matrix

| Provider | Usage Windows | Extra Info | Status Indicator | Notes |
|----------|--------------|------------|------------------|-------|
| Anthropic (Claude) | 5h, 7d, Extra | Extra usage label (currency from sub-core) | ✅ | Extra usage can show on/off state |
| GitHub Copilot | Month | Model multiplier + requests left | ✅ | Requests left uses model multiplier |
| Google Gemini | Pro, Flash | - | ✅ | Quotas aggregated per model family |
| OpenAI Codex | Primary, Secondary | Remaining-style display | ✅ | Primary label derived from window duration |
| AWS Kiro | Credits | - | - | CLI-based usage query |
| z.ai | Tokens, Monthly | - | - | API quota limits |

## Installation

Install **both** `sub-core` and `sub-bar` extensions. `sub-core` is shared across the wider `sub-*` ecosystem (some extensions are UI-only, others run headless and just consume events).

```bash
git clone https://github.com/marckrenn/sub-core.git
git clone https://github.com/marckrenn/sub-bar.git

ln -s /path/to/sub-core ~/.pi/agent/extensions/sub-core
ln -s /path/to/sub-bar ~/.pi/agent/extensions/sub-bar
```

Alternative (no symlink): add both to `~/.pi/agent/settings.json`:

```json
{
  "extensions": [
    "/path/to/sub-core/index.ts",
    "/path/to/sub-bar/index.ts"
  ]
}
```

To install dependencies (for type checking):

```bash
cd /path/to/sub-bar
npm install
```

## Packaging notes (pi install compatibility)

The draft in pi-mono issue #645 expects npm packages with a `pi` field in `package.json`. This repo already declares `pi.extensions`, so once `pi install` lands you should be able to do:

```bash
pi install npm:pi-sub-core
pi install npm:pi-sub-bar
```

Until then, manual paths/symlinks work as documented above.

## Usage

The extension loads automatically. Use:

- `sub-bar:settings` - Open display + provider UI settings
- `sub-bar:import <share string>` - Preview a shared theme and choose to save/apply
- `sub-core:settings` - Configure provider enablement/order + behavior settings
- `Ctrl+Alt+P` - Cycle through available providers
- `Ctrl+Alt+R` - Toggle reset timer format (relative vs datetime)

**Caching:**
- Handled by sub-core at `cache.json` next to the sub-core extension entry
- Cache TTL matches your auto-refresh interval setting
- Lock file prevents race conditions between multiple pi windows

## Communication with sub-core

`sub-bar` is a display client. It listens for `sub-core:update-current`/`sub-core:ready` events and renders the widget. On startup it requests the current state via `sub-core:request`.

`sub-bar` manages display settings and UI-only provider options (window visibility, labels, status indicator). Provider enablement lives in sub-core, but the sub-bar settings UI can toggle Enabled (auto/on/off) and forwards changes to `sub-core:settings:patch`. Ordering and refresh behavior are configured in `sub-core:settings`, and sub-core broadcasts updates that sub-bar consumes. The cycle command forwards to `sub-core:action` so core updates provider selection and then broadcasts the new state.

## Settings

Display and provider UI settings are persisted next to the extension entry (`settings.json` in the same folder as `index.ts`). Core settings are managed by sub-core, and the sub-bar settings menu includes a shortcut that points you to `sub-core:settings` for additional options.

**Settings migrations:** settings are merged with defaults on load, but renames/removals are not migrated automatically. When adding new settings or changing schema, update the defaults/merge logic and provide a migration (or instruct users to reset `settings.json`).

### Provider UI Settings

Use `sub-bar:settings` → Provider Settings to control enabled state (auto/on/off), status indicators, and per-provider window visibility. Anthropic extra usage amounts use the currency from sub-core overage configuration (if present).

### Core Settings

Use `sub-core:settings` to configure provider enablement (auto/on/off), fetch status, refresh behavior, provider order, and pinned provider.

### Display Settings

Use Display Settings → Theme to save, share, import, and manage display themes.

| Setting | Options | Default | Description |
|---------|---------|---------|-------------|
| Alignment | left, center, right, split | left | Alignment for the widget (split fills the gap after the provider name) |
| Bar Type | horizontal-bar, horizontal-single, vertical, braille, shade | horizontal-bar | Bar rendering style |
| H. Bar Character | light, heavy, double, block | heavy | Character used for horizontal bar (─, ━, ═, █) |
| Bar Width | 1, 4, 6, 8, 10, 12, fill | 6 | Width of progress bar in characters |
| Contain Bar | on/off | off | Wrap bar with ▕ and ▏ |
| Braille Empty Fill | on/off | off | Fill empty braille segments with dim ⣿ |
| Bar Style | bar, percentage, both | both | How to display usage |
| Color Scheme | base-warning-error, success-base-warning-error, monochrome | base-warning-error | Color coding for usage levels |
| Usage Color Targets | title, timer, bar, usage label | all | Select which elements use usage colors |
| Reset Timer | off, front, back, integrated | front | Show time until quota resets |
| Reset Timer Format | relative, datetime | relative | Show relative countdown or reset datetime |
| Reset Timer Containment | none, blank, (), [], <> | () | Wrap reset timer text |
| Status Mode | icon, color, icon+color | icon | Show status as icons, color tint, or both |
| Status Icon Pack | minimal, emoji | emoji | Icon set for status indicators |
| Show Status Text | on/off | off | Show textual status description |
| Dismiss Operational Status | on/off | on | Hide status when there are no incidents |
| Show Provider Name | on/off | on | Show provider label in status |
| Provider Label | none, plan, subscription, sub | none | Suffix after provider name (replaces existing Plan/Subscription suffix if present) |
| Provider Label Colon | on/off | on | Show colon after provider label |
| Show in Bold | on/off | off | Bold the provider name and colon |
| Base Color | primary, text, muted, dim, success, warning, error, border, borderMuted, borderAccent, selectedBg, userMessageBg, customMessageBg, toolPendingBg, toolSuccessBg, toolErrorBg | dim | Base color for widget labels/dividers |
| Background Color | primary, text, muted, dim, success, warning, error, border, borderMuted, borderAccent, selectedBg, userMessageBg, customMessageBg, toolPendingBg, toolSuccessBg, toolErrorBg | text | Background color for widget line |
| Show Usage Labels | on/off | on | Show "used/rem." labels |
| Bold Title | on/off | off | Bold window titles like 5h, Week |
| Padding X | 0, 1, 2, 3, 4 | 0 | Left/right padding inside widget |
| Divider Character | none, blank, \|, │, ┃, ┆, ┇, ║, •, ●, ○, ◇ | • | Character between usage entries |
| Divider Color | primary, text, muted, dim, success, warning, error, border, borderMuted, borderAccent | borderMuted | Color for divider glyphs and lines |
| Divider Blanks | 0, 1, 2, 3, fill | 1 | Padding around divider |
| Show Provider Divider | on/off | off | Show divider after provider label |
| Show Top Divider | on/off | off | Show horizontal divider line above bar |
| Show Bottom Divider | on/off | on | Show horizontal divider line below bar |
| Connect Dividers | on/off | off | Draw reverse-T connectors for top/bottom dividers |
| Widget Wrapping | truncate, wrap | truncate | Wrap usage line to multiple lines or truncate |
| Error Threshold (%) | 10-40 | 25 | Percentage remaining below which shows red |
| Warning Threshold (%) | 30-70 | 50 | Percentage remaining below which shows yellow |
| Success Threshold (%) | 60-90 | 75 | Percentage remaining above which shows green/success - success-base-warning-error only |

## Credentials

Credentials are loaded by sub-core from:

- `~/.pi/agent/auth.json` - pi's auth file
- Provider-specific locations (e.g., `~/.codex/auth.json`, `~/.gemini/oauth_creds.json`)
- macOS Keychain for Claude Code credentials
- Environment variables (e.g., `Z_AI_API_KEY`)

## Architecture

```
sub-bar/
├── index.ts              # Extension entry point (display client)
├── src/
│   ├── formatting.ts     # UI formatting
│   ├── status.ts         # Status indicator helpers
│   ├── utils.ts          # Display helpers
│   ├── providers/        # Display metadata + visibility rules
│   ├── settings/         # Settings UI helpers
│   ├── settings-types.ts # Settings type definitions
│   ├── settings.ts       # Settings persistence
│   └── usage/types.ts    # Shared usage types
├── package.json
└── tsconfig.json
```

## Adding a New Provider

Update both sub-core (fetch) and sub-bar (display). See `sub-core/README.md` for the full checklist.

## Feature placement (UI vs core)

- **sub-bar** owns presentation (formatting, layout, status indicators, UI settings).
- **sub-core** owns data fetching, caching, provider selection, and shared settings/events.
- Add shared types to **sub-shared** when both layers reference them.

See the root README “Developer guide” for the full decision checklist and examples.

## Credits

- Hannes Januschka ([barts](https://github.com/hjanuschka/shitty-extensions?tab=readme-ov-file#usage-barts), [@hjanuschka](https://x.com/hjanuschka))
- Peter Steinberger ([CodexBar](https://github.com/steipete/CodexBar), [@steipete](https://x.com/steipete))

## Development

```bash
# Type check
npm run check
```

## License

MIT
