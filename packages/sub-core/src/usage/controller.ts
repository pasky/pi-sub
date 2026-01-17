/**
 * Usage refresh and provider selection controller.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { ProviderName, UsageSnapshot } from "../types.js";
import type { Settings } from "../settings-types.js";
import { detectProviderFromModel } from "../providers/detection.js";
import { isExpectedMissingData } from "../errors.js";
import { fetchUsageForProvider } from "./fetch.js";
import type { Dependencies } from "../types.js";
import { getCachedData } from "../cache.js";

export interface UsageControllerState {
	currentProvider?: ProviderName;
	cachedUsage?: UsageSnapshot;
	pinnedProvider?: ProviderName;
	providerCycleIndex: number;
}

export interface UsageUpdate {
	provider?: ProviderName;
	usage?: UsageSnapshot;
}

export type UsageUpdateHandler = (update: UsageUpdate) => void;

export function createUsageController(deps: Dependencies) {
	function getEnabledProviders(settings: Settings): ProviderName[] {
		return settings.providerOrder.filter((p) => settings.providers[p].enabled);
	}

	function resolveProvider(
		ctx: ExtensionContext,
		settings: Settings,
		state: UsageControllerState
	): ProviderName | undefined {
		if (state.pinnedProvider && settings.providers[state.pinnedProvider].enabled) {
			return state.pinnedProvider;
		}
		if (settings.defaultProvider && settings.providers[settings.defaultProvider].enabled) {
			return settings.defaultProvider;
		}
		if (settings.behavior.autoDetectProvider) {
			const detected = detectProviderFromModel(ctx.model);
			if (detected && settings.providers[detected].enabled) {
				return detected;
			}
		}
		return undefined;
	}

	function emitUpdate(state: UsageControllerState, onUpdate: UsageUpdateHandler): void {
		onUpdate({
			provider: state.currentProvider,
			usage: state.cachedUsage,
		});
	}

	async function refresh(
		ctx: ExtensionContext,
		settings: Settings,
		state: UsageControllerState,
		onUpdate: UsageUpdateHandler,
		options?: { force?: boolean }
	): Promise<void> {
		const provider = resolveProvider(ctx, settings, state);
		if (!provider) {
			state.currentProvider = undefined;
			state.cachedUsage = undefined;
			state.pinnedProvider = undefined;
			emitUpdate(state, onUpdate);
			return;
		}

		const providerChanged = provider !== state.currentProvider;
		state.currentProvider = provider;
		if (providerChanged) {
			state.cachedUsage = undefined;
		}

		const cachedEntry = await getCachedData(provider, settings.behavior.refreshInterval * 1000);
		if (cachedEntry?.usage) {
			state.cachedUsage = { ...cachedEntry.usage, status: cachedEntry.status };
		}
		emitUpdate(state, onUpdate);

		const result = await fetchUsageForProvider(deps, settings, provider, options);
		state.cachedUsage = result.usage ? { ...result.usage, status: result.status } : undefined;
		emitUpdate(state, onUpdate);
	}

	async function cycleProvider(
		ctx: ExtensionContext,
		settings: Settings,
		state: UsageControllerState,
		onUpdate: UsageUpdateHandler
	): Promise<void> {
		const enabledProviders = getEnabledProviders(settings);
		if (enabledProviders.length === 0) {
			state.currentProvider = undefined;
			state.cachedUsage = undefined;
			state.pinnedProvider = undefined;
			emitUpdate(state, onUpdate);
			return;
		}

		const currentIndex = state.currentProvider
			? enabledProviders.indexOf(state.currentProvider)
			: -1;
		if (currentIndex >= 0) {
			state.providerCycleIndex = currentIndex;
		}

		const total = enabledProviders.length;
		for (let i = 0; i < total; i += 1) {
			state.providerCycleIndex = (state.providerCycleIndex + 1) % total;
			const nextProvider = enabledProviders[state.providerCycleIndex];
			const result = await fetchUsageForProvider(deps, settings, nextProvider);
			if (!isUsageAvailable(result.usage)) {
				continue;
			}
			state.pinnedProvider = nextProvider;
			state.currentProvider = nextProvider;
			state.cachedUsage = result.usage ? { ...result.usage, status: result.status } : undefined;
			emitUpdate(state, onUpdate);
			return;
		}

		state.pinnedProvider = undefined;
		state.currentProvider = undefined;
		state.cachedUsage = undefined;
		emitUpdate(state, onUpdate);
	}

	function isUsageAvailable(usage: UsageSnapshot | undefined): usage is UsageSnapshot {
		if (!usage) return false;
		if (usage.windows.length > 0) return true;
		if (!usage.error) return false;
		return !isExpectedMissingData(usage.error);
	}

	return {
		getEnabledProviders,
		resolveProvider,
		refresh,
		cycleProvider,
	};
}
