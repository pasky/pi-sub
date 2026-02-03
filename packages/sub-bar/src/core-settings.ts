/**
 * Core settings fallbacks for sub-bar when sub-core settings are unavailable.
 */

import { type CoreSettings, DEFAULT_TOOLS_SETTINGS } from "@marckrenn/pi-sub-shared";
import type { Settings } from "./settings-types.js";
import { PROVIDERS, PROVIDER_METADATA } from "./providers/metadata.js";

export function getFallbackCoreSettings(settings: Settings): CoreSettings {
	const providers = {} as CoreSettings["providers"];
	for (const provider of PROVIDERS) {
		providers[provider] = {
			enabled: "auto",
			fetchStatus: Boolean(PROVIDER_METADATA[provider]?.status),
		};
	}

	return {
		providers,
		behavior: settings.behavior,
		statusRefresh: settings.statusRefresh ?? settings.behavior,
		tools: { ...DEFAULT_TOOLS_SETTINGS },
		providerOrder: settings.providerOrder,
		defaultProvider: settings.defaultProvider ?? null,
	};
}
