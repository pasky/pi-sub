/**
 * Shared types and metadata for sub-* extensions.
 */

export const PROVIDERS = ["anthropic", "copilot", "gemini", "codex", "kiro", "zai"] as const;

export type ProviderName = (typeof PROVIDERS)[number];

export type StatusIndicator = "none" | "minor" | "major" | "critical" | "maintenance" | "unknown";

export interface ProviderStatus {
	indicator: StatusIndicator;
	description?: string;
}

export interface RateWindow {
	label: string;
	usedPercent: number;
	resetDescription?: string;
	resetAt?: string;
}

export interface UsageSnapshot {
	provider: ProviderName;
	displayName: string;
	windows: RateWindow[];
	extraUsageEnabled?: boolean;
	fiveHourUsage?: number;
	error?: UsageError;
	status?: ProviderStatus;
	requestsSummary?: string;
	requestsRemaining?: number;
	requestsEntitlement?: number;
}

export type UsageErrorCode =
	| "NO_CREDENTIALS"
	| "NO_CLI"
	| "NOT_LOGGED_IN"
	| "FETCH_FAILED"
	| "HTTP_ERROR"
	| "API_ERROR"
	| "TIMEOUT"
	| "UNKNOWN";

export interface UsageError {
	code: UsageErrorCode;
	message: string;
	httpStatus?: number;
}

export interface ProviderUsageEntry {
	provider: ProviderName;
	usage?: UsageSnapshot;
}

export interface BaseProviderSettings {
	enabled: boolean;
	displayName?: string;
	showStatus: boolean;
}

export interface AnthropicProviderSettings extends BaseProviderSettings {
	showExtraUsage: boolean;
	extraUsageCurrency: "EUR" | "USD";
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

export interface BehaviorSettings {
	refreshInterval: number;
	refreshOnTurnStart: boolean;
	refreshOnToolResult: boolean;
	autoDetectProvider: boolean;
}

export interface CoreSettings {
	providers: ProviderSettingsMap;
	behavior: BehaviorSettings;
	providerOrder: ProviderName[];
	defaultProvider: ProviderName | null;
}

export type SubCoreState = {
	provider?: ProviderName;
	usage?: UsageSnapshot;
};

export type SubCoreAllState = {
	provider?: ProviderName;
	entries: ProviderUsageEntry[];
};

export type SubCoreEvents =
	| { type: "sub-core:ready"; state: SubCoreState }
	| { type: "sub-core:update-current"; state: SubCoreState }
	| { type: "sub-core:update-all"; state: SubCoreAllState };

export type ProviderStatusConfig =
	| { type: "statuspage"; url: string }
	| { type: "google-workspace" };

export interface ProviderDetectionConfig {
	providerTokens: string[];
	modelTokens: string[];
}

export interface ProviderMetadata {
	displayName: string;
	detection?: ProviderDetectionConfig;
	status?: ProviderStatusConfig;
}

export const PROVIDER_METADATA: Record<ProviderName, ProviderMetadata> = {
	anthropic: {
		displayName: "Anthropic (Claude)",
		status: { type: "statuspage", url: "https://status.anthropic.com/api/v2/status.json" },
		detection: { providerTokens: ["anthropic"], modelTokens: ["claude"] },
	},
	copilot: {
		displayName: "GitHub Copilot",
		status: { type: "statuspage", url: "https://www.githubstatus.com/api/v2/status.json" },
		detection: { providerTokens: ["copilot", "github"], modelTokens: [] },
	},
	gemini: {
		displayName: "Google Gemini",
		status: { type: "google-workspace" },
		detection: { providerTokens: ["google", "gemini"], modelTokens: ["gemini"] },
	},
	codex: {
		displayName: "OpenAI Codex",
		status: { type: "statuspage", url: "https://status.openai.com/api/v2/status.json" },
		detection: { providerTokens: ["openai", "codex"], modelTokens: ["gpt", "o1", "o3"] },
	},
	kiro: {
		displayName: "AWS Kiro",
		detection: { providerTokens: ["kiro", "aws"], modelTokens: [] },
	},
	zai: {
		displayName: "z.ai",
		detection: { providerTokens: ["zai", "z.ai", "xai"], modelTokens: [] },
	},
};

export const PROVIDER_DISPLAY_NAMES = Object.fromEntries(
	PROVIDERS.map((provider) => [provider, PROVIDER_METADATA[provider].displayName])
) as Record<ProviderName, string>;

export const MODEL_MULTIPLIERS: Record<string, number> = {
	"Claude Haiku 4.5": 0.33,
	"Claude Opus 4.1": 10,
	"Claude Opus 4.5": 3,
	"Claude Sonnet 4": 1,
	"Claude Sonnet 4.5": 1,
	"Gemini 2.5 Pro": 1,
	"Gemini 3 Flash": 0.33,
	"Gemini 3 Pro": 1,
	"GPT-4.1": 0,
	"GPT-4o": 0,
	"GPT-5": 1,
	"GPT-5 mini": 0,
	"GPT-5-Codex": 1,
	"GPT-5.1": 1,
	"GPT-5.1-Codex": 1,
	"GPT-5.1-Codex-Mini": 0.33,
	"GPT-5.1-Codex-Max": 1,
	"GPT-5.2": 1,
	"Grok Code Fast 1": 0.25,
	"Raptor mini": 0,
};
