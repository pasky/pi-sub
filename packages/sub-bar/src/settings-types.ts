/**
 * Settings types and defaults for sub-bar
 */

import type { ProviderName } from "./types.js";
import { PROVIDERS } from "./providers/metadata.js";

/**
 * Bar display style
 */
export type BarStyle = "bar" | "percentage" | "both";

/**
 * Color scheme for usage bars
 */
export type ColorScheme = "monochrome" | "text-warning-error" | "success-text-warning-error" | "muted-warning-error";

/**
 * Progress bar character style
 */
export type BarCharacter = "light" | "heavy" | "double" | "block";

/**
 * Divider character style
 */
export type DividerCharacter = "blank" | "|" | "•" | "●" | "○" | "◇";

/**
 * Widget line wrapping mode
 */
export type WidgetWrapping = "truncate" | "wrap";

/**
 * Base provider settings (shared by all providers)
 */
export interface BaseProviderSettings {
	/** Whether this provider is enabled */
	enabled: boolean;
	/** Custom display name (optional) */
	displayName?: string;
	/** Show status indicator from status page */
	showStatus: boolean;
}

/**
 * Anthropic-specific provider settings
 */
export interface AnthropicProviderSettings extends BaseProviderSettings {
	/** Show extra usage info */
	showExtraUsage: boolean;
	/** Currency for extra usage display */
	extraUsageCurrency: "EUR" | "USD";
	/** Visible windows */
	windows: {
		show5h: boolean;
		show7d: boolean;
		showExtra: boolean;
	};
}

/**
 * Copilot-specific provider settings
 */
export interface CopilotProviderSettings extends BaseProviderSettings {
	/** Show model multiplier info */
	showMultiplier: boolean;
	/** Show requests remaining calculation */
	showRequestsLeft: boolean;
	/** Show quota as percentage or requests */
	quotaDisplay: "percentage" | "requests";
	/** Visible windows */
	windows: {
		showMonth: boolean;
	};
}

/**
 * Gemini-specific provider settings
 */
export interface GeminiProviderSettings extends BaseProviderSettings {
	/** Visible windows */
	windows: {
		showPro: boolean;
		showFlash: boolean;
	};
}

/**
 * Codex-specific provider settings
 */
export interface CodexProviderSettings extends BaseProviderSettings {
	/** Invert remaining/used percentage (Codex usage page style) */
	invertUsage: boolean;
	/** Visible windows */
	windows: {
		showPrimary: boolean;
		showSecondary: boolean;
	};
}

/**
 * Kiro-specific provider settings
 */
export interface KiroProviderSettings extends BaseProviderSettings {
	/** Visible windows */
	windows: {
		showCredits: boolean;
	};
}

/**
 * z.ai-specific provider settings
 */
export interface ZaiProviderSettings extends BaseProviderSettings {
	/** Visible windows */
	windows: {
		showTokens: boolean;
		showMonthly: boolean;
	};
}

/**
 * Provider settings map with specific types for providers that have extra settings
 */
export interface ProviderSettingsMap {
	anthropic: AnthropicProviderSettings;
	copilot: CopilotProviderSettings;
	gemini: GeminiProviderSettings;
	codex: CodexProviderSettings;
	kiro: KiroProviderSettings;
	zai: ZaiProviderSettings;
}

/**
 * Display settings
 */
export interface DisplaySettings {
	/** Bar display style */
	barStyle: BarStyle;
	/** Width of the progress bar in characters */
	barWidth: number;
	/** Progress bar character */
	barCharacter: BarCharacter;
	/** Color scheme for bars */
	colorScheme: ColorScheme;
	/** Reset time display position */
	resetTimePosition: "off" | "front" | "back" | "integrated";
	/** Show provider display name */
	showProviderName: boolean;
	/** Show usage labels (used/rem.) */
	showUsageLabels: boolean;
	/** Divider character */
	dividerCharacter: DividerCharacter;
	/** Blanks before and after divider (0 or 1) */
	dividerBlanks: 0 | 1;
	/** Show divider line above the bar */
	showTopDivider: boolean;
	/** Widget line wrapping */
	widgetWrapping: WidgetWrapping;
	/** Error threshold (percentage remaining below this = red) */
	errorThreshold: number;
	/** Warning threshold (percentage remaining below this = yellow) */
	warningThreshold: number;
	/** Success threshold (percentage remaining above this = green, gradient only) */
	successThreshold: number;
}

/**
 * Behavior settings
 */
export interface BehaviorSettings {
	/** Auto-refresh interval in seconds (0 = disabled) */
	refreshInterval: number;
	/** Refresh on turn start */
	refreshOnTurnStart: boolean;
	/** Refresh on tool result */
	refreshOnToolResult: boolean;
	/** Auto-detect provider from model */
	autoDetectProvider: boolean;
}

/**
 * All settings
 */
export interface Settings {
	/** Version for migration */
	version: number;
	/** Provider-specific settings */
	providers: ProviderSettingsMap;
	/** Display settings */
	display: DisplaySettings;
	/** Behavior settings */
	behavior: BehaviorSettings;
	/** Provider order for cycling */
	providerOrder: ProviderName[];
	/** Default/pinned provider (null = auto-detect) */
	defaultProvider: ProviderName | null;
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
		display: {
			barStyle: "both",
			barWidth: 6,
			barCharacter: "heavy",
			colorScheme: "muted-warning-error",
			resetTimePosition: "front",
			showProviderName: true,
			showUsageLabels: true,
			dividerCharacter: "•",
			dividerBlanks: 1,
			showTopDivider: true,
			errorThreshold: 25,
			warningThreshold: 50,
			widgetWrapping: "truncate",
			successThreshold: 75,
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
	const result = { ...target };
	for (const key of Object.keys(source) as (keyof T)[]) {
		const sourceValue = source[key];
		const targetValue = target[key];
		if (
			sourceValue !== undefined &&
			typeof sourceValue === "object" &&
			sourceValue !== null &&
			!Array.isArray(sourceValue) &&
			typeof targetValue === "object" &&
			targetValue !== null &&
			!Array.isArray(targetValue)
		) {
			result[key] = deepMerge(targetValue, sourceValue as Partial<typeof targetValue>);
		} else if (sourceValue !== undefined) {
			result[key] = sourceValue as T[keyof T];
		}
	}
	return result;
}

/**
 * Migrate settings from older versions
 */
export function migrateSettings(loaded: Partial<Settings> & { copilot?: { showMultiplier?: boolean; showRequestsLeft?: boolean }; anthropic?: { showExtraUsage?: boolean; extraUsageCurrency?: "EUR" | "USD" } }): Settings {
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
				loaded.providers.copilot = { ...defaults.providers.copilot };
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
				loaded.providers.anthropic = { ...defaults.providers.anthropic };
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

	// Migrate old barCharacter values (hyphen/equals/double-line -> light/heavy/double)
	if (loaded.display?.barCharacter) {
		const oldToNew: Record<string, BarCharacter> = {
			"hyphen": "light",
			"equals": "heavy",
			"double-line": "double",
			"block": "block",
		};
		const oldValue = loaded.display.barCharacter as string;
		if (oldValue in oldToNew) {
			loaded.display.barCharacter = oldToNew[oldValue];
		}
	}

	// Migrate old colorScheme values
	if (loaded.display?.colorScheme) {
		const oldToNew: Record<string, ColorScheme> = {
			"traffic-light": "muted-warning-error",
			"gradient": "success-text-warning-error",
			"monochrome": "monochrome",
		};
		const oldValue = loaded.display.colorScheme as string;
		if (oldValue in oldToNew) {
			loaded.display.colorScheme = oldToNew[oldValue];
		}
	}

	// Migrate showResetTime to resetTimePosition
	if (loaded.display) {
		const legacyDisplay = loaded.display as {
			showResetTime?: boolean;
			leadingDivider?: boolean;
			trailingDivider?: boolean;
		};
		if (legacyDisplay.showResetTime !== undefined) {
			loaded.display.resetTimePosition = legacyDisplay.showResetTime ? "front" : "off";
			delete legacyDisplay.showResetTime;
		}
		if (legacyDisplay.leadingDivider !== undefined) {
			delete legacyDisplay.leadingDivider;
		}
		if (legacyDisplay.trailingDivider !== undefined) {
			delete legacyDisplay.trailingDivider;
		}
	}

	// Version-specific migrations would go here for future versions
	return deepMerge(defaults, loaded as Partial<Settings>);
}
