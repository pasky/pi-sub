/**
 * Settings types and defaults for sub-core
 */

import type { CoreSettings } from "pi-sub-shared";
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
 * Merge settings with defaults (no legacy migrations).
 */
export function mergeSettings(loaded: Partial<Settings>): Settings {
	return deepMerge(getDefaultSettings(), loaded);
}
