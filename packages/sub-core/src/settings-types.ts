/**
 * Settings types and defaults for sub-core
 */

import type { CoreSettings, CoreProviderSettingsMap, CoreProviderSettings, BehaviorSettings, ProviderName } from "pi-sub-shared";
import { PROVIDERS } from "pi-sub-shared";

export type {
	CoreProviderSettings,
	CoreProviderSettingsMap,
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
				fetchStatus: true,
			},
			copilot: {
				enabled: true,
				fetchStatus: true,
			},
			gemini: {
				enabled: true,
				fetchStatus: true,
			},
			codex: {
				enabled: true,
				fetchStatus: true,
			},
			kiro: {
				enabled: true,
				fetchStatus: false,
			},
			zai: {
				enabled: true,
				fetchStatus: false,
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
