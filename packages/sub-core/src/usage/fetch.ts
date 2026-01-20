/**
 * Usage fetching helpers with cache integration.
 */

import type { Dependencies, ProviderName, ProviderStatus, UsageSnapshot } from "../types.js";
import type { Settings } from "../settings-types.js";
import type { ProviderUsageEntry } from "./types.js";
import { createProvider } from "../providers/registry.js";
import { fetchWithCache, getCachedData } from "../cache.js";
import { fetchProviderStatusWithFallback, providerHasStatus } from "../providers/status.js";
import { isExpectedMissingData } from "../errors.js";

export function getCacheTtlMs(settings: Settings): number {
	return settings.behavior.refreshInterval * 1000;
}

export async function fetchUsageForProvider(
	deps: Dependencies,
	settings: Settings,
	provider: ProviderName,
	options?: { force?: boolean }
): Promise<{ usage?: UsageSnapshot; status?: ProviderStatus }> {
	if (!settings.providers[provider].enabled) {
		return {};
	}

	const ttlMs = getCacheTtlMs(settings);

	return fetchWithCache(
		provider,
		ttlMs,
		async () => {
			const providerInstance = createProvider(provider);
			const usage = await providerInstance.fetchUsage(deps);
			let status;
			if (settings.providers[provider].fetchStatus && providerHasStatus(provider, providerInstance)) {
				status = await fetchProviderStatusWithFallback(provider, providerInstance, deps);
			} else {
				status = { indicator: "none" as const };
			}

			return { usage, status };
		},
		options,
	);
}

export async function getCachedUsageEntry(
	provider: ProviderName,
	settings: Settings
): Promise<ProviderUsageEntry | undefined> {
	const ttlMs = getCacheTtlMs(settings);
	const cachedEntry = await getCachedData(provider, ttlMs);
	const usage = cachedEntry?.usage ? { ...cachedEntry.usage, status: cachedEntry.status } : undefined;
	if (!usage || (usage.error && isExpectedMissingData(usage.error))) {
		return undefined;
	}
	return { provider, usage };
}

export async function getCachedUsageEntries(
	providers: ProviderName[],
	settings: Settings
): Promise<ProviderUsageEntry[]> {
	const entries: ProviderUsageEntry[] = [];
	for (const provider of providers) {
		const entry = await getCachedUsageEntry(provider, settings);
		if (entry) {
			entries.push(entry);
		}
	}
	return entries;
}

export async function fetchUsageEntries(
	deps: Dependencies,
	settings: Settings,
	providers: ProviderName[],
	options?: { force?: boolean }
): Promise<ProviderUsageEntry[]> {
	const entries: ProviderUsageEntry[] = [];
	for (const provider of providers) {
		const result = await fetchUsageForProvider(deps, settings, provider, options);
		const usage = result.usage ? { ...result.usage, status: result.status } : undefined;
		if (!usage || (usage.error && isExpectedMissingData(usage.error))) {
			continue;
		}
		entries.push({ provider, usage });
	}
	return entries;
}
