/**
 * Settings types and defaults for sub-core
 */

import type {
	ProviderName,
	ProviderSettingsMap,
	BehaviorSettings,
	CoreSettings,
	BaseProviderSettings,
	AnthropicProviderSettings,
	CopilotProviderSettings,
	GeminiProviderSettings,
	CodexProviderSettings,
	KiroProviderSettings,
	ZaiProviderSettings,
} from "pi-sub-shared";
import { PROVIDERS } from "pi-sub-shared";

export type {
	BaseProviderSettings,
	AnthropicProviderSettings,
	CopilotProviderSettings,
	GeminiProviderSettings,
	CodexProviderSettings,
	KiroProviderSettings,
	ZaiProviderSettings,
	ProviderSettingsMap,
	BehaviorSettings,
	CoreSettings,
} from "pi-sub-shared";

/**
 * All settings
 */
export interface Settings extends CoreSettings {
	/** Version for migration */
	version: number;
}

/**
 * Current settings version
 */
export const SETTINGS_VERSION = 2;

/**
 * Default settings
 */
export function getDefaultSettings(): Settings {
	return {
		version: SETTINGS_VERSION,
		providers: {
			anthropic: {
				enabled: true,
				showStatus: true,
				showExtraUsage: true,
				extraUsageCurrency: "EUR",
				windows: {
					show5h: true,
					show7d: true,
					showExtra: true,
				},
			},
			copilot: {
				enabled: true,
				showStatus: true,
				showMultiplier: true,
				showRequestsLeft: true,
				quotaDisplay: "percentage",
				windows: {
					showMonth: true,
				},
			},
			gemini: {
				enabled: true,
				showStatus: true,
				windows: {
					showPro: true,
					showFlash: true,
				},
			},
			codex: {
				enabled: true,
				showStatus: true,
				invertUsage: false,
				windows: {
					showPrimary: true,
					showSecondary: true,
				},
			},
			kiro: {
				enabled: true,
				showStatus: false,
				windows: {
					showCredits: true,
				},
			},
			zai: {
				enabled: true,
				showStatus: false,
				windows: {
					showTokens: true,
					showMonthly: true,
				},
			},
		},
		behavior: {
			refreshInterval: 60,
			refreshOnTurnStart: true,
			refreshOnToolResult: true,
			autoDetectProvider: true,
		},
		providerOrder: [...PROVIDERS],
		defaultProvider: null,
	};
}

/**
 * Deep merge two objects
 */
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
 * Migrate settings from older versions
 */
export function migrateSettings(
	loaded: Partial<Settings> & {
		copilot?: { showMultiplier?: boolean; showRequestsLeft?: boolean };
		anthropic?: { showExtraUsage?: boolean; extraUsageCurrency?: "EUR" | "USD" };
	}
): Settings {
	const defaults = getDefaultSettings();

	// If no version, it's either new or very old
	if (!loaded.version) {
		return deepMerge(defaults, loaded as Partial<Settings>);
	}

	// Migrate from version 1 to version 2
	if (loaded.version === 1) {
		// Move root-level copilot/anthropic settings into providers
		if (loaded.copilot) {
			if (!loaded.providers) {
				loaded.providers = {} as ProviderSettingsMap;
			}
			if (!loaded.providers.copilot) {
				loaded.providers.copilot = { ...defaults.providers.copilot } as CopilotProviderSettings;
			}
			if (loaded.copilot.showMultiplier !== undefined) {
				loaded.providers.copilot.showMultiplier = loaded.copilot.showMultiplier;
			}
			if (loaded.copilot.showRequestsLeft !== undefined) {
				loaded.providers.copilot.showRequestsLeft = loaded.copilot.showRequestsLeft;
			}
			delete loaded.copilot;
		}
		if (loaded.anthropic) {
			if (!loaded.providers) {
				loaded.providers = {} as ProviderSettingsMap;
			}
			if (!loaded.providers.anthropic) {
				loaded.providers.anthropic = { ...defaults.providers.anthropic } as AnthropicProviderSettings;
			}
			if (loaded.anthropic.showExtraUsage !== undefined) {
				loaded.providers.anthropic.showExtraUsage = loaded.anthropic.showExtraUsage;
			}
			if (loaded.anthropic.extraUsageCurrency !== undefined) {
				loaded.providers.anthropic.extraUsageCurrency = loaded.anthropic.extraUsageCurrency;
			}
			delete loaded.anthropic;
		}
		loaded.version = 2;
	}

	return deepMerge(defaults, loaded as Partial<Settings>);
}
