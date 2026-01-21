/**
 * Settings types and defaults for sub-bar
 */

import type { CoreSettings } from "pi-sub-shared";
import { PROVIDERS } from "pi-sub-shared";

/**
 * Bar display style
 */
export type BarStyle = "bar" | "percentage" | "both";

/**
 * Bar rendering type
 */
export type BarType = "horizontal-bar" | "horizontal-single" | "vertical" | "braille" | "shade";

/**
 * Color scheme for usage bars
 */
export type ColorScheme = "monochrome" | "base-warning-error" | "success-base-warning-error";

/**
 * Progress bar character style
 */
export type BarCharacter = "light" | "heavy" | "double" | "block";

/**
 * Divider character style
 */
export type DividerCharacter = "none" | "blank" | "|" | "•" | "●" | "○" | "◇";

/**
 * Widget line wrapping mode
 */
export type WidgetWrapping = "truncate" | "wrap";

/**
 * Widget placement
 */
export type WidgetPlacement = "belowEditor";

/**
 * Alignment for the widget
 */
export type DisplayAlignment = "left" | "center" | "right" | "split";

/**
 * Provider label prefix
 */
export type ProviderLabel = "plan" | "subscription" | "sub" | "none";

/**
 * Reset timer format
 */
export type ResetTimeFormat = "relative" | "datetime";

/**
 * Status indicator display mode
 */
export type StatusIndicatorMode = "icon" | "color" | "icon+color";

/**
 * Status icon pack selection
 */
export type StatusIconPack = "minimal" | "emoji";

/**
 * Base text color for widget labels
 */
export type BaseTextColor = "dim" | "muted" | "text";

/**
 * Bar width configuration
 */
export type BarWidth = 1 | 4 | 6 | 8 | 10 | 12 | "fill";

/**
 * Divider blank spacing configuration
 */
export type DividerBlanks = 0 | 1 | 2 | 3 | "fill";

/**
 * Provider settings (UI-only)
 */
export interface BaseProviderSettings {
	/** Show status indicator */
	showStatus: boolean;
}

export interface AnthropicProviderSettings extends BaseProviderSettings {
	windows: {
		show5h: boolean;
		show7d: boolean;
		showExtra: boolean;
	};
}

export interface CopilotProviderSettings extends BaseProviderSettings {
	showMultiplier: boolean;
	showRequestsLeft: boolean;
	quotaDisplay: "percentage" | "requests";
	windows: {
		showMonth: boolean;
	};
}

export interface GeminiProviderSettings extends BaseProviderSettings {
	windows: {
		showPro: boolean;
		showFlash: boolean;
	};
}

export interface CodexProviderSettings extends BaseProviderSettings {
	invertUsage: boolean;
	windows: {
		showPrimary: boolean;
		showSecondary: boolean;
	};
}

export interface KiroProviderSettings extends BaseProviderSettings {
	windows: {
		showCredits: boolean;
	};
}

export interface ZaiProviderSettings extends BaseProviderSettings {
	windows: {
		showTokens: boolean;
		showMonthly: boolean;
	};
}

export interface ProviderSettingsMap {
	anthropic: AnthropicProviderSettings;
	copilot: CopilotProviderSettings;
	gemini: GeminiProviderSettings;
	codex: CodexProviderSettings;
	kiro: KiroProviderSettings;
	zai: ZaiProviderSettings;
}

export type { BehaviorSettings, CoreSettings } from "pi-sub-shared";

/**
 * Display settings
 */
export interface DisplaySettings {
	/** Alignment */
	alignment: DisplayAlignment;
	/** Bar display style */
	barStyle: BarStyle;
	/** Bar type */
	barType: BarType;
	/** Width of the progress bar in characters */
	barWidth: BarWidth;
	/** Progress bar character */
	barCharacter: BarCharacter;
	/** Contain bar within ▕ and ▏ */
	containBar: boolean;
	/** Fill empty braille segments with dim full blocks */
	brailleFillEmpty: boolean;
	/** Color scheme for bars */
	colorScheme: ColorScheme;
	/** Reset time display position */
	resetTimePosition: "off" | "front" | "back" | "integrated";
	/** Reset time format */
	resetTimeFormat: ResetTimeFormat;
	/** Status indicator mode */
	statusIndicatorMode: StatusIndicatorMode;
	/** Status icon pack */
	statusIconPack: StatusIconPack;
	/** Show textual status */
	statusText: boolean;
	/** Dismiss status when operational */
	statusDismissOk: boolean;
	/** Show provider display name */
	showProviderName: boolean;
	/** Provider label prefix */
	providerLabel: ProviderLabel;
	/** Show colon after provider label */
	providerLabelColon: boolean;
	/** Base text color for widget labels */
	baseTextColor: BaseTextColor;
	/** Show usage labels (used/rem.) */
	showUsageLabels: boolean;
	/** Divider character */
	dividerCharacter: DividerCharacter;
	/** Blanks before and after divider */
	dividerBlanks: DividerBlanks;
	/** Show divider line above the bar */
	showTopDivider: boolean;
	/** Show divider line below the bar */
	showBottomDivider: boolean;
	/** Widget line wrapping */
	widgetWrapping: WidgetWrapping;
	/** Left/right padding inside widget */
	paddingX: 0 | 1 | 2 | 3 | 4;
	/** Widget placement */
	widgetPlacement: WidgetPlacement;
	/** Error threshold (percentage remaining below this = red) */
	errorThreshold: number;
	/** Warning threshold (percentage remaining below this = yellow) */
	warningThreshold: number;
	/** Success threshold (percentage remaining above this = green, gradient only) */
	successThreshold: number;
}

/**
 * All settings
 */
export interface Settings extends Omit<CoreSettings, "providers"> {
	/** Version for migration */
	version: number;
	/** Provider-specific UI settings */
	providers: ProviderSettingsMap;
	/** Display settings */
	display: DisplaySettings;
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
				showStatus: true,
				windows: {
					show5h: true,
					show7d: true,
					showExtra: true,
				},
			},
			copilot: {
				showStatus: true,
				showMultiplier: true,
				showRequestsLeft: true,
				quotaDisplay: "percentage",
				windows: {
					showMonth: true,
				},
			},
			gemini: {
				showStatus: true,
				windows: {
					showPro: true,
					showFlash: true,
				},
			},
			codex: {
				showStatus: true,
				invertUsage: false,
				windows: {
					showPrimary: true,
					showSecondary: true,
				},
			},
			kiro: {
				showStatus: false,
				windows: {
					showCredits: true,
				},
			},
			zai: {
				showStatus: false,
				windows: {
					showTokens: true,
					showMonthly: true,
				},
			},
		},
		display: {
			alignment: "left",
			barStyle: "both",
			barType: "horizontal-bar",
			barWidth: 6,
			barCharacter: "heavy",
			containBar: false,
			brailleFillEmpty: false,
			colorScheme: "base-warning-error",
			resetTimePosition: "front",
			resetTimeFormat: "relative",
			statusIndicatorMode: "icon",
			statusIconPack: "emoji",
			statusText: false,
			statusDismissOk: true,
			showProviderName: true,
			providerLabel: "none",
			providerLabelColon: true,
			baseTextColor: "dim",
			showUsageLabels: true,
			dividerCharacter: "•",
			dividerBlanks: 1,
			showTopDivider: false,
			showBottomDivider: true,
			paddingX: 0,
			widgetPlacement: "belowEditor",
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
 * Merge settings with defaults (no legacy migrations).
 */
export function mergeSettings(loaded: Partial<Settings>): Settings {
	return deepMerge(getDefaultSettings(), loaded);
}
