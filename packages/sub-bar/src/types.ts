/**
 * Core types for the sub-bar extension
 */

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

export const PROVIDERS = ["anthropic", "copilot", "gemini", "codex", "kiro", "zai"] as const;

export type ProviderName = (typeof PROVIDERS)[number];

