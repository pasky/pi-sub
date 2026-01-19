/**
 * sub-bar - Usage Widget Extension
 * Shows current provider's usage in a widget above the editor.
 * Only shows stats for the currently selected provider.
 */

import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, wrapTextWithAnsi, visibleWidth } from "@mariozechner/pi-tui";
import type { ProviderName, UsageSnapshot } from "./src/types.js";
import type { Settings } from "./src/settings-types.js";
import type { ProviderUsageEntry } from "./src/usage/types.js";
import { formatUsageStatus, formatUsageStatusWithWidth } from "./src/formatting.js";
import { loadSettings, saveSettings } from "./src/settings.js";
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

		const setWidgetWithPlacement = (ctx.ui as unknown as { setWidget: (...args: unknown[]) => void }).setWidget;
		setWidgetWithPlacement(
			"usage",
			(_tui: unknown, theme: Theme) => ({
				render(width: number) {
					const safeWidth = Math.max(1, width);
					const paddingX = settings.display.paddingX ?? 0;
					const contentWidth = Math.max(1, safeWidth - paddingX * 2);
					const showTopDivider = settings.display.showTopDivider ?? true;
					const showBottomDivider = settings.display.showBottomDivider ?? false;
					const dividerLine = theme.fg("borderMuted", "─".repeat(safeWidth));
					const alignment = settings.display.alignment ?? "left";
					const hasFill = settings.display.barWidth === "fill" || settings.display.dividerBlanks === "fill";
					const wantsSplit = alignment === "split";
					const shouldAlign = !hasFill && !wantsSplit && (alignment === "center" || alignment === "right");
					const formatted = (hasFill || wantsSplit)
						? formatUsageStatusWithWidth(theme, usage, contentWidth, ctx.model?.id, settings, { labelGapFill: wantsSplit })
						: formatUsageStatus(theme, usage, ctx.model?.id, settings);

					const alignLine = (line: string) => {
						if (!shouldAlign) return line;
						const lineWidth = visibleWidth(line);
						if (lineWidth >= contentWidth) return line;
						const padding = contentWidth - lineWidth;
						const leftPad = alignment === "center" ? Math.floor(padding / 2) : padding;
						return " ".repeat(leftPad) + line;
					};

					let lines: string[] = [];
					if (!formatted) {
						lines = [];
					} else if (settings.display.widgetWrapping === "wrap") {
						lines = wrapTextWithAnsi(formatted, contentWidth).map(alignLine);
					} else {
						const trimmed = alignLine(truncateToWidth(formatted, contentWidth, theme.fg("dim", "...")));
						lines = [trimmed];
					}

					if (paddingX > 0) {
						const pad = " ".repeat(paddingX);
						lines = lines.map((line) => pad + line + pad);
					}

					if (showTopDivider) {
						lines = [dividerLine, ...lines];
					}
					if (showBottomDivider) {
						lines = [...lines, dividerLine];
					}
					return lines;
				},
				invalidate() {},
			}),
			{ placement: settings.display.widgetPlacement ?? "aboveEditor" },
		);
		
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
	pi.registerCommand("sub-bar:settings", {
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

	// Register command to show all providers
	pi.registerCommand("sub-bar:compare-all", {
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

	// Register shortcut to toggle reset timer format
	pi.registerShortcut("ctrl+alt+r", {
		description: "Toggle reset timer format",
		handler: async () => {
			settings.display.resetTimeFormat = settings.display.resetTimeFormat === "datetime" ? "relative" : "datetime";
			saveSettings(settings);
			if (lastContext && currentUsage) {
				renderUsageWidget(lastContext, currentUsage);
			}
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
