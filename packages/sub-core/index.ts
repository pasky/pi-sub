/**
 * sub-core - Shared usage data core for sub-* extensions.
 */

import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { join } from "node:path";
import type { Dependencies, ProviderName, UsageSnapshot } from "./src/types.js";
import type { Settings } from "./src/settings-types.js";
import type { ProviderUsageEntry } from "./src/usage/types.js";
import { createDefaultDependencies } from "./src/dependencies.js";
import { createUsageController, type UsageUpdate } from "./src/usage/controller.js";
import { fetchUsageEntries, getCachedUsageEntries } from "./src/usage/fetch.js";
import { getAgentDir } from "./src/paths.js";
import { getStorage } from "./src/storage.js";
import { loadSettings, saveSettings } from "./src/settings.js";

interface SubCoreState {
	provider?: ProviderName;
	usage?: UsageSnapshot;
}

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

function cleanupLegacyCache(): void {
	const storage = getStorage();
	const legacyDir = join(getAgentDir(), "extensions", "sub-bar");
	const legacyCache = join(legacyDir, "cache.json");
	const legacyLock = join(legacyDir, "cache.lock");
	if (storage.exists(legacyCache)) {
		storage.removeFile(legacyCache);
	}
	if (storage.exists(legacyLock)) {
		storage.removeFile(legacyLock);
	}
}

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

	function emitUpdate(update: UsageUpdate): void {
		lastState = {
			provider: update.provider,
			usage: update.usage,
		};
		pi.events.emit("sub-core:update", { state: lastState });
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

	async function getEntries(force?: boolean): Promise<ProviderUsageEntry[]> {
		const enabledProviders = controller.getEnabledProviders(settings);
		if (enabledProviders.length === 0) return [];
		if (force) {
			return fetchUsageEntries(deps, settings, enabledProviders, { force: true });
		}
		return getCachedUsageEntries(enabledProviders, settings);
	}

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
		cleanupLegacyCache();
		lastContext = ctx;
		settings = loadSettings();
		setupRefreshInterval();
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

	pi.on("session_branch", async (_event, ctx) => {
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
		lastContext = undefined;
	});
}
