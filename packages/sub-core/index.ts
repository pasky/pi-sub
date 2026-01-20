/**
 * sub-core - Shared usage data core for sub-* extensions.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import type { Dependencies, ProviderName, SubCoreState, UsageSnapshot } from "./src/types.js";
import type { Settings } from "./src/settings-types.js";
import type { ProviderUsageEntry } from "./src/usage/types.js";
import { createDefaultDependencies } from "./src/dependencies.js";
import { createUsageController, type UsageUpdate } from "./src/usage/controller.js";
import { fetchUsageEntries, getCachedUsageEntries } from "./src/usage/fetch.js";
import { onCacheSnapshot, onCacheUpdate, watchCacheUpdates, type Cache } from "./src/cache.js";
import { isExpectedMissingData } from "./src/errors.js";
import { getStorage } from "./src/storage.js";
import { loadSettings, saveSettings } from "./src/settings.js";
import { showSettingsUI } from "./src/settings-ui.js";
import { fetchAnthropicOverageCurrency } from "./src/providers/impl/anthropic.js";


type SubCoreRequest =
	| {
			type?: "current";
			includeSettings?: boolean;
			reply: (payload: { state: SubCoreState; settings?: Settings }) => void;
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

function deepMerge<T extends object>(target: T, source: Partial<T>): T {
	const result = { ...target } as T;
	for (const key of Object.keys(source) as (keyof T)[]) {
		const sourceValue = source[key];
		const targetValue = result[key];
		if (
			sourceValue !== undefined &&
			typeof sourceValue === "object" &&
			sourceValue !== null &&
			!Array.isArray(sourceValue) &&
			typeof targetValue === "object" &&
			targetValue !== null &&
			!Array.isArray(targetValue)
		) {
			result[key] = deepMerge(targetValue as object, sourceValue as object) as T[keyof T];
		} else if (sourceValue !== undefined) {
			result[key] = sourceValue as T[keyof T];
		}
	}
	return result;
}

function stripUsageProvider(usage?: UsageSnapshot): Omit<UsageSnapshot, "provider"> | undefined {
	if (!usage) return undefined;
	const { provider: _provider, ...rest } = usage;
	return rest;
}

/**
 * Create the extension
 */
export default function createExtension(pi: ExtensionAPI, deps: Dependencies = createDefaultDependencies()): void {
	let refreshInterval: ReturnType<typeof setInterval> | undefined;
	let lastContext: ExtensionContext | undefined;
	let settings: Settings = loadSettings();
	let lastState: SubCoreState = {};

	const controller = createUsageController(deps);
	const controllerState = {
		currentProvider: undefined as ProviderName | undefined,
		cachedUsage: undefined as UsageSnapshot | undefined,
		pinnedProvider: undefined as ProviderName | undefined,
		providerCycleIndex: 0,
	};

	let lastAllSnapshot = "";
	let lastCurrentSnapshot = "";

	const emitCurrentUpdate = (provider?: ProviderName, usage?: UsageSnapshot): void => {
		lastState = { provider, usage };
		const payload = JSON.stringify(lastState);
		if (payload === lastCurrentSnapshot) return;
		lastCurrentSnapshot = payload;
		pi.events.emit("sub-core:update-current", { state: lastState });
	};

	const unsubscribeCacheSnapshot = onCacheSnapshot((cache: Cache) => {
		const ttlMs = settings.behavior.refreshInterval * 1000;
		const now = Date.now();
		const entries: ProviderUsageEntry[] = [];
		for (const provider of settings.providerOrder) {
			const entry = cache[provider];
			if (!entry || !entry.usage) continue;
			if (now - entry.fetchedAt >= ttlMs) continue;
			const usage = { ...entry.usage, status: entry.status };
			if (usage.error && isExpectedMissingData(usage.error)) continue;
			entries.push({ provider, usage });
		}
		const payload = JSON.stringify({ provider: controllerState.currentProvider, entries });
		if (payload === lastAllSnapshot) return;
		lastAllSnapshot = payload;
		pi.events.emit("sub-core:update-all", {
			state: { provider: controllerState.currentProvider, entries },
		});
	});

	const unsubscribeCache = onCacheUpdate((provider, entry) => {
		if (!controllerState.currentProvider || provider !== controllerState.currentProvider) return;
		const usage = entry?.usage ? { ...entry.usage, status: entry.status } : undefined;
		controllerState.cachedUsage = usage;
		emitCurrentUpdate(controllerState.currentProvider, usage);
	});

	const stopCacheWatch = watchCacheUpdates();

	function emitUpdate(update: UsageUpdate): void {
		emitCurrentUpdate(update.provider, update.usage);
	}

	async function refresh(ctx: ExtensionContext, options?: { force?: boolean }) {
		lastContext = ctx;
		await controller.refresh(ctx, settings, controllerState, emitUpdate, options);
	}

	async function cycleProvider(ctx: ExtensionContext): Promise<void> {
		await controller.cycleProvider(ctx, settings, controllerState, emitUpdate);
	}

	function setupRefreshInterval(): void {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = undefined;
		}

		const intervalMs = settings.behavior.refreshInterval * 1000;
		if (intervalMs > 0) {
			refreshInterval = setInterval(() => {
				if (lastContext) {
					void refresh(lastContext);
				}
			}, intervalMs);
		}
	}

	function applySettingsPatch(patch: Partial<Settings>): void {
		settings = deepMerge(settings, patch);
		saveSettings(settings);
		setupRefreshInterval();
		pi.events.emit("sub-core:settings:updated", { settings });
	}

	async function refreshAnthropicOverageCurrency(): Promise<void> {
		try {
			const currency = await fetchAnthropicOverageCurrency(deps);
			if (!currency) return;
			const current = settings.providers.anthropic.overageCurrency;
			if (currency === current) return;
			applySettingsPatch({
				providers: {
					anthropic: { overageCurrency: currency },
				},
			} as unknown as Partial<Settings>);
		} catch {
			// Ignore failures
		}
	}

	async function getEntries(force?: boolean): Promise<ProviderUsageEntry[]> {
		const enabledProviders = controller.getEnabledProviders(settings);
		if (enabledProviders.length === 0) return [];
		if (force) {
			return fetchUsageEntries(deps, settings, enabledProviders, { force: true });
		}
		return getCachedUsageEntries(enabledProviders, settings);
	}

	pi.registerTool({
		name: "sub_get_usage",
		label: "Sub Usage",
		description: "Refresh and return the latest subscription usage snapshot.",
		parameters: Type.Object({
			force: Type.Optional(Type.Boolean({ description: "Force refresh" })),
		}),
		async execute(_toolCallId, params, _onUpdate, ctx) {
			const { force } = params as { force?: boolean };
			await refresh(ctx, { force: force ?? true });
			const payload = { provider: lastState.provider, usage: stripUsageProvider(lastState.usage) };
			return {
				content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
				details: payload,
			};
		},
	});

	pi.registerTool({
		name: "sub_get_all_usage",
		label: "Sub All Usage",
		description: "Refresh and return usage snapshots for all enabled providers.",
		parameters: Type.Object({
			force: Type.Optional(Type.Boolean({ description: "Force refresh" })),
		}),
		async execute(_toolCallId, params) {
			const { force } = params as { force?: boolean };
			const entries = await getEntries(force ?? true);
			const payload = entries.map((entry) => ({
				provider: entry.provider,
				usage: stripUsageProvider(entry.usage),
			}));
			return {
				content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
				details: { entries: payload },
			};
		},
	});

	pi.registerCommand("sub-core:settings", {
		description: "Open sub-core settings",
		handler: async (_args, ctx) => {
			const handleSettingsChange = async (updatedSettings: Settings) => {
				applySettingsPatch(updatedSettings);
				if (lastContext) {
					await refresh(lastContext);
				}
			};

			const newSettings = await showSettingsUI(ctx, handleSettingsChange);
			settings = newSettings;
			applySettingsPatch(newSettings);
			if (lastContext) {
				await refresh(lastContext);
			}
		},
	});

	pi.events.on("sub-core:request", async (payload) => {
		const request = payload as SubCoreRequest;
		if (request.type === "entries") {
			const entries = await getEntries(request.force);
			request.reply({ entries });
			return;
		}
		request.reply({
			state: lastState,
			settings: request.includeSettings ? settings : undefined,
		});
	});

	pi.events.on("sub-core:settings:patch", (payload) => {
		const patch = (payload as { patch?: Partial<Settings> }).patch;
		if (!patch) return;
		applySettingsPatch(patch);
		if (lastContext) {
			void refresh(lastContext);
		}
	});

	pi.events.on("sub-core:action", (payload) => {
		const action = payload as SubCoreAction;
		if (!lastContext) return;
		switch (action.type) {
			case "refresh":
				void refresh(lastContext, { force: action.force });
				break;
			case "cycleProvider":
				void cycleProvider(lastContext);
				break;
			case "pinProvider":
				controllerState.pinnedProvider = action.provider;
				controllerState.currentProvider = undefined;
				controllerState.cachedUsage = undefined;
				void refresh(lastContext, { force: true });
				break;
		}
	});

	pi.on("session_start", async (_event, ctx) => {
		lastContext = ctx;
		settings = loadSettings();
		setupRefreshInterval();
		await refreshAnthropicOverageCurrency();
		await refresh(ctx);
		pi.events.emit("sub-core:ready", { state: lastState, settings });
	});

	pi.on("turn_start", async (_event, ctx) => {
		if (settings.behavior.refreshOnTurnStart) {
			await refresh(ctx);
		}
	});

	pi.on("tool_result", async (_event, ctx) => {
		if (settings.behavior.refreshOnToolResult) {
			await refresh(ctx, { force: true });
		}
	});

	pi.on("turn_end", async (_event, ctx) => {
		await refresh(ctx, { force: true });
	});

	pi.on("session_switch", async (_event, ctx) => {
		controllerState.currentProvider = undefined;
		controllerState.pinnedProvider = undefined;
		controllerState.cachedUsage = undefined;
		await refresh(ctx);
	});

	pi.on("session_branch" as unknown as "session_start", async (_event: unknown, ctx: ExtensionContext) => {
		controllerState.currentProvider = undefined;
		controllerState.pinnedProvider = undefined;
		controllerState.cachedUsage = undefined;
		await refresh(ctx);
	});

	pi.on("model_select" as unknown as "session_start", async (_event: unknown, ctx: ExtensionContext) => {
		controllerState.currentProvider = undefined;
		controllerState.pinnedProvider = undefined;
		controllerState.cachedUsage = undefined;
		await refresh(ctx, { force: true });
	});

	pi.on("session_shutdown", async () => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
			refreshInterval = undefined;
		}
		unsubscribeCache();
		unsubscribeCacheSnapshot();
		stopCacheWatch();
		lastContext = undefined;
	});
}
