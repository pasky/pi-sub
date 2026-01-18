# sub-bar

Usage widget extension for [pi-coding-agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent).

Displays current provider usage in a widget above the editor. Fetching and caching are handled by `sub-core`, which can also power other `sub-*` extensions (UI or non-UI).

## Features

- Displays usage quotas for multiple AI providers
- Auto-detects provider from current model (via sub-core)
- Shows rate limit windows with visual progress bars
- Status indicators from provider status pages
- **Extensive settings UI** via `/sub-bar:settings`
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
| Anthropic (Claude) | 5h, 7d, Extra | Extra usage toggle + currency | ✅ | Extra usage can show on/off state |
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

- `/sub-bar:settings` - Open the settings UI
- `Ctrl+Alt+P` - Cycle through available providers

**Caching:**
- Handled by sub-core at `~/.pi/agent/extensions/sub-core/cache.json`
- Cache TTL matches your auto-refresh interval setting
- Lock file prevents race conditions between multiple pi windows

## Communication with sub-core

`sub-bar` is a display client. It listens for `sub-core:update`/`sub-core:ready` events and renders the widget. On startup it requests the current state via `sub-core:request`.

When you change settings in `/sub-bar:settings`, it sends a `sub-core:settings:patch` so core refresh behavior stays in sync. The cycle command forwards to `sub-core:action` so core updates provider selection and then broadcasts the new state.

## Settings

Settings are persisted to `~/.pi/agent/extensions/sub-bar/settings.json` and forwarded to sub-core when needed.

### Provider Settings

Each provider has its own settings page accessible via Provider Settings menu:

**All Providers:**
- Enabled: Enable/disable the provider
- Show Status: Show status page indicator

**Anthropic (Claude):**
- Show Extra Usage: Display overage/extra usage info
- Extra Usage Currency: EUR or USD

**GitHub Copilot:**
- Show Model Multiplier: Display request cost multiplier
- Show Requests Remaining: Calculate remaining requests based on multiplier

### Display Settings

| Setting | Options | Description |
|---------|---------|-------------|
| Bar Style | bar, percentage, both | How to display usage |
| Bar Width | 4-12 | Width of progress bar in characters |
| Bar Character | light, heavy, double, block | Character used for progress bar (─, ━, ═, █) |
| Color Scheme | traffic-light, gradient, monochrome | Color coding for usage levels |
| Reset Timer | off, front, back, integrated | Show time until quota resets |
| Show Provider Name | on/off | Show provider label in status |
| Show Usage Labels | on/off | Show “used/rem.” labels |
| Divider Character | blank, |, •, ●, ○, ◇ | Character between usage entries |
| Divider Blanks | 0, 1 | Padding around divider |
| Widget Wrapping | truncate, wrap | Wrap usage line to multiple lines or truncate |
| Error Threshold (%) | 10-40 | Percentage remaining below which shows red (default: 25%) |
| Warning Threshold (%) | 30-70 | Percentage remaining below which shows yellow (default: 50%) |
| Success Threshold (%) | 60-90 | Percentage remaining above which shows green - gradient only (default: 75%) |

### Behavior Settings

| Setting | Options | Description |
|---------|---------|-------------|
| Auto-refresh Interval | off, 30s, 60s, 120s, 300s | Automatic refresh frequency |
| Refresh on Turn Start | on/off | Refresh when a new turn begins |
| Refresh on Tool Result | on/off | Refresh after each tool execution |
| Auto-detect Provider | on/off | Detect provider from current model |

### Provider Order

Customize the order when cycling through providers with `Ctrl+Alt+P`.

### Pinned Provider

Pin a specific provider to always show, or use none (auto-detect from current model).

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
│   ├── status.ts         # Status emoji helpers
│   ├── utils.ts          # Display helpers
│   ├── providers/        # Display metadata + visibility rules
│   ├── settings/         # Settings UI helpers
│   ├── settings-types.ts # Settings type definitions
│   ├── settings.ts       # Settings persistence
│   ├── ui/compare.ts     # Usage comparison UI
│   └── usage/types.ts    # Shared usage types
├── package.json
└── tsconfig.json
```

## Adding a New Provider

Update both sub-core (fetch) and sub-bar (display). See `sub-core/README.md` for the full checklist.

## Development

```bash
# Type check
npm run check
```

## License

MIT
