/**
 * sub-bar - Usage Widget Extension
 * Shows current provider's usage in a widget above the editor.
 * Only shows stats for the currently selected provider.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi } from "@mariozechner/pi-tui";
import type { ProviderName, UsageSnapshot } from "./src/types.js";
import type { Settings } from "./src/settings-types.js";
import type { ProviderUsageEntry } from "./src/usage/types.js";
import { formatUsageStatus } from "./src/formatting.js";
import { loadSettings } from "./src/settings.js";
import { showSettingsUI } from "./src/settings-ui.js";
import { showUsageComparison } from "./src/ui/compare.js";

type SubCoreState = {
	provider?: ProviderName;
	usage?: UsageSnapshot;
};

type SubCoreRequest =
	| {
			type?: "current";
			includeSettings?: boolean;
			reply: (payload: { state: SubCoreState; settings?: unknown }) => void;
	  }
	| {
			type: "entries";
			force?: boolean;
			reply: (payload: { entries: ProviderUsageEntry[] }) => void;
	  };

type SubCoreAction = {
	type: "refresh" | "cycleProvider" | "pinProvider";
	provider?: ProviderName;
	force?: boolean;
};

/**
 * Create the extension
 */
export default function createExtension(pi: ExtensionAPI) {
	let lastContext: ExtensionContext | undefined;
	let settings: Settings = loadSettings();
	let currentUsage: UsageSnapshot | undefined;

	function renderUsageWidget(ctx: ExtensionContext, usage: UsageSnapshot | undefined): void {
		if (!usage) {
			ctx.ui.setWidget("usage", undefined);
			return;
		}

		ctx.ui.setWidget("usage", (_tui, theme) => ({
			render(width: number) {
				const safeWidth = Math.max(1, width);
				const showTopDivider = settings.display.showTopDivider ?? true;
				const divider = showTopDivider ? theme.fg("borderMuted", "─".repeat(safeWidth)) : undefined;
				const formatted = formatUsageStatus(theme, usage, ctx.model?.id, settings);
				if (!formatted) return divider ? [divider] : [];
				if (settings.display.widgetWrapping === "wrap") {
					const wrapped = wrapTextWithAnsi(formatted, safeWidth);
					return divider ? [divider, ...wrapped] : wrapped;
				}
				const trimmed = truncateToWidth(formatted, safeWidth, theme.fg("dim", "..."));
				return divider ? [divider, trimmed] : [trimmed];
			},
			invalidate() {},
		}));
	}

	function updateUsage(usage: UsageSnapshot | undefined): void {
		currentUsage = usage;
		if (lastContext) {
			renderUsageWidget(lastContext, usage);
		}
	}

	function buildCoreSettingsPatch(current: Settings): Partial<Settings> {
		return {
			providers: current.providers,
			behavior: current.behavior,
			providerOrder: current.providerOrder,
			defaultProvider: current.defaultProvider,
		};
	}

	function syncCoreSettings(current: Settings): void {
		pi.events.emit("sub-core:settings:patch", { patch: buildCoreSettingsPatch(current) });
	}

	function emitCoreAction(action: SubCoreAction): void {
		pi.events.emit("sub-core:action", action);
	}

	function requestCoreState(timeoutMs = 1000): Promise<SubCoreState | undefined> {
		return new Promise((resolve) => {
			let resolved = false;
			const timer = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					resolve(undefined);
				}
			}, timeoutMs);

			const request: SubCoreRequest = {
				type: "current",
				reply: (payload) => {
					if (resolved) return;
					resolved = true;
					clearTimeout(timer);
					resolve(payload.state);
				},
			};

			pi.events.emit("sub-core:request", request);
		});
	}

	function requestCoreEntries(force: boolean, timeoutMs = 2000): Promise<ProviderUsageEntry[] | null> {
		return new Promise((resolve) => {
			let resolved = false;
			const timer = setTimeout(() => {
				if (!resolved) {
					resolved = true;
					resolve(null);
				}
			}, timeoutMs);

			const request: SubCoreRequest = {
				type: "entries",
				force,
				reply: (payload) => {
					if (resolved) return;
					resolved = true;
					clearTimeout(timer);
					resolve(payload.entries);
				},
			};

			pi.events.emit("sub-core:request", request);
		});
	}

	async function showAllProviders(ctx: ExtensionContext): Promise<void> {
		if (!ctx.hasUI) {
			return;
		}

		const snapshots = await requestCoreEntries(false);
		if (!snapshots) {
			ctx.ui.notify("sub-core not available", "warning");
			return;
		}

		if (snapshots.length === 0) {
			ctx.ui.notify("No providers with credentials found", "warning");
			return;
		}

		await showUsageComparison(ctx, {
			settings,
			modelId: ctx.model?.id,
			snapshots,
			fetchLatest: async () => (await requestCoreEntries(true)) ?? [],
		});
	}

	pi.events.on("sub-core:update", (payload) => {
		const state = payload as { state?: SubCoreState };
		updateUsage(state.state?.usage);
	});

	pi.events.on("sub-core:ready", (payload) => {
		const state = payload as { state?: SubCoreState };
		updateUsage(state.state?.usage);
	});

	// Register command to open settings
	pi.registerCommand("sub-bar-settings", {
		description: "Open sub-bar settings",
		handler: async (_args, ctx) => {
			const newSettings = await showSettingsUI(ctx, async (updatedSettings) => {
				settings = updatedSettings;
				syncCoreSettings(settings);
				if (lastContext) {
					renderUsageWidget(lastContext, currentUsage);
				}
			});
			settings = newSettings;
			syncCoreSettings(settings);
			if (lastContext) {
				renderUsageWidget(lastContext, currentUsage);
			}
		},
	});

	// Register command to redraw usage widget
	pi.registerCommand("sub-bar-redraw", {
		description: "Redraw usage widget (uses cache if fresh)",
		handler: async () => {
			emitCoreAction({ type: "refresh", force: true });
		},
	});

	// Register command to show all providers
	pi.registerCommand("sub-bar-compare-all", {
		description: "Show all provider plans",
		handler: async (_args, ctx) => {
			await showAllProviders(ctx);
		},
	});

	// Register shortcut to cycle providers
	pi.registerShortcut("ctrl+alt+p", {
		description: "Cycle usage provider",
		handler: async () => {
			emitCoreAction({ type: "cycleProvider" });
		},
	});

	pi.on("session_start", async (_event, ctx) => {
		lastContext = ctx;
		settings = loadSettings();
		syncCoreSettings(settings);
		const state = await requestCoreState();
		if (state?.usage) {
			updateUsage(state.usage);
		}
	});

	pi.on("model_select" as unknown as "session_start", async (_event: unknown, ctx: ExtensionContext) => {
		lastContext = ctx;
		if (currentUsage) {
			renderUsageWidget(ctx, currentUsage);
		}
	});

	pi.on("session_shutdown", async () => {
		lastContext = undefined;
	});
}
