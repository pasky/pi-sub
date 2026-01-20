/**
 * Anthropic/Claude usage provider
 */

import * as path from "node:path";
import type { Dependencies, RateWindow, UsageSnapshot } from "../../types.js";
import { BaseProvider } from "../../provider.js";
import { noCredentials, fetchFailed, httpError } from "../../errors.js";
import { formatReset, formatCurrency, createTimeoutController } from "../../utils.js";
import { API_TIMEOUT_MS } from "../../config.js";
import { getSettings } from "../../settings.js";

const DEFAULT_CLAUDE_CLIENT_SHA = "64f860b20d9f606fca2f10073d71ee7dc3ab1336";
const DEFAULT_CLAUDE_CLIENT_VERSION = "1.0.0";
const DEFAULT_CLAUDE_USER_AGENT =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36";
const DEFAULT_CLAUDE_ACCEPT_LANGUAGE = "en-US,en;q=0.9";

/**
 * Load Claude API token from various sources
 */
function loadClaudeToken(deps: Dependencies): string | undefined {
	// Try pi auth.json first
	const piAuthPath = path.join(deps.homedir(), ".pi", "agent", "auth.json");
	try {
		if (deps.fileExists(piAuthPath)) {
			const data = JSON.parse(deps.readFile(piAuthPath) ?? "{}");
			if (data.anthropic?.access) return data.anthropic.access;
		}
	} catch {
		// Ignore parse errors
	}

	// Try macOS Keychain (Claude Code credentials)
	try {
		const keychainData = deps.execSync(
			'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }
		).trim();
		if (keychainData) {
			const parsed = JSON.parse(keychainData);
			const scopes = parsed.claudeAiOauth?.scopes || [];
			if (scopes.includes("user:profile") && parsed.claudeAiOauth?.accessToken) {
				return parsed.claudeAiOauth.accessToken;
			}
		}
	} catch {
		// Keychain access failed
	}

	return undefined;
}

type AnthropicOverageAuth = {
	orgId?: string;
	cookie?: string;
	sessionKey?: string;
	deviceId?: string;
	anonymousId?: string;
	clientSha?: string;
	clientVersion?: string;
	userAgent?: string;
	acceptLanguage?: string;
	referer?: string;
};

type AnthropicOverageConfig = {
	orgId: string;
	cookie: string;
	deviceId?: string;
	anonymousId?: string;
	clientSha?: string;
	clientVersion?: string;
	userAgent?: string;
	acceptLanguage?: string;
	referer?: string;
};

function loadAnthropicOverageConfig(deps: Dependencies): AnthropicOverageConfig | undefined {
	const authPath = path.join(deps.homedir(), ".pi", "agent", "auth.json");
	let authConfig: AnthropicOverageAuth | undefined;
	try {
		if (deps.fileExists(authPath)) {
			const data = JSON.parse(deps.readFile(authPath) ?? "{}");
			authConfig = data.anthropic?.overage ?? data["claude-ai"]?.overage ?? data.claudeAi?.overage;
		}
	} catch {
		// Ignore parse errors
	}

	const env = deps.env;
	const orgId = env.CLAUDE_AI_OVERAGE_ORG_ID ?? authConfig?.orgId;
	const cookie = env.CLAUDE_AI_COOKIE ?? authConfig?.cookie;
	const sessionKey = env.CLAUDE_AI_SESSION_KEY ?? authConfig?.sessionKey;
	const cookieValue = cookie ?? (sessionKey ? `sessionKey=${sessionKey}` : undefined);
	if (!orgId || !cookieValue) return undefined;

	return {
		orgId,
		cookie: cookieValue,
		deviceId: env.CLAUDE_AI_DEVICE_ID ?? authConfig?.deviceId,
		anonymousId: env.CLAUDE_AI_ANON_ID ?? authConfig?.anonymousId,
		clientSha: env.CLAUDE_AI_CLIENT_SHA ?? authConfig?.clientSha,
		clientVersion: env.CLAUDE_AI_CLIENT_VERSION ?? authConfig?.clientVersion,
		userAgent: env.CLAUDE_AI_USER_AGENT ?? authConfig?.userAgent,
		acceptLanguage: env.CLAUDE_AI_ACCEPT_LANGUAGE ?? authConfig?.acceptLanguage,
		referer: env.CLAUDE_AI_REFERER ?? authConfig?.referer,
	};
}

function getAnthropicOverageCurrency(): string | undefined {
	const settings = getSettings();
	return settings.providers.anthropic.overageCurrency;
}

export async function fetchAnthropicOverageCurrency(deps: Dependencies): Promise<string | undefined> {
	const config = loadAnthropicOverageConfig(deps);
	if (!config) return undefined;

	const headers: Record<string, string> = {
		accept: "*/*",
		"content-type": "application/json",
		"anthropic-client-platform": "web_claude_ai",
		"anthropic-client-sha": config.clientSha ?? DEFAULT_CLAUDE_CLIENT_SHA,
		"anthropic-client-version": config.clientVersion ?? DEFAULT_CLAUDE_CLIENT_VERSION,
		"accept-language": config.acceptLanguage ?? DEFAULT_CLAUDE_ACCEPT_LANGUAGE,
		"user-agent": config.userAgent ?? DEFAULT_CLAUDE_USER_AGENT,
		cookie: config.cookie,
		referer: config.referer ?? "https://claude.ai/settings/usage",
	};

	if (config.deviceId) headers["anthropic-device-id"] = config.deviceId;
	if (config.anonymousId) headers["anthropic-anonymous-id"] = config.anonymousId;

	const { controller, clear } = createTimeoutController(API_TIMEOUT_MS);
	try {
		const res = await deps.fetch(
			`https://claude.ai/api/organizations/${config.orgId}/overage_spend_limit`,
			{
				headers,
				signal: controller.signal,
			}
		);
		if (!res.ok) {
			return undefined;
		}

		const data = (await res.json()) as { currency?: string };
		const currency = typeof data.currency === "string" ? data.currency.trim().toUpperCase() : undefined;
		return currency || undefined;
	} catch {
		return undefined;
	} finally {
		clear();
	}
}

export class AnthropicProvider extends BaseProvider {
	readonly name = "anthropic" as const;
	readonly displayName = "Claude Plan";

	hasCredentials(deps: Dependencies): boolean {
		return Boolean(loadClaudeToken(deps));
	}

	async fetchUsage(deps: Dependencies): Promise<UsageSnapshot> {
		const token = loadClaudeToken(deps);
		if (!token) {
			return this.emptySnapshot(noCredentials());
		}

		const { controller, clear } = createTimeoutController(API_TIMEOUT_MS);

		try {
			const res = await deps.fetch("https://api.anthropic.com/api/oauth/usage", {
				headers: {
					Authorization: `Bearer ${token}`,
					"anthropic-beta": "oauth-2025-04-20",
				},
				signal: controller.signal,
			});
			clear();

			if (!res.ok) {
				return this.emptySnapshot(httpError(res.status));
			}

			const data = (await res.json()) as {
				five_hour?: { utilization?: number; resets_at?: string };
				seven_day?: { utilization?: number; resets_at?: string };
				extra_usage?: {
					is_enabled?: boolean;
					used_credits?: number;
					monthly_limit?: number;
					utilization?: number;
				};
			};

			const windows: RateWindow[] = [];

			if (data.five_hour?.utilization !== undefined) {
				const resetAt = data.five_hour.resets_at ? new Date(data.five_hour.resets_at) : undefined;
				windows.push({
					label: "5h",
					usedPercent: data.five_hour.utilization,
					resetDescription: resetAt ? formatReset(resetAt) : undefined,
					resetAt: resetAt?.toISOString(),
				});
			}

			if (data.seven_day?.utilization !== undefined) {
				const resetAt = data.seven_day.resets_at ? new Date(data.seven_day.resets_at) : undefined;
				windows.push({
					label: "7d",
					usedPercent: data.seven_day.utilization,
					resetDescription: resetAt ? formatReset(resetAt) : undefined,
					resetAt: resetAt?.toISOString(),
				});
			}

			// Extra usage / overage
			const extraUsageEnabled = data.extra_usage?.is_enabled === true;
			const fiveHourUsage = data.five_hour?.utilization ?? 0;

			if (extraUsageEnabled) {
				const extra = data.extra_usage!;
				const usedCredits = extra.used_credits || 0;
				const monthlyLimit = extra.monthly_limit;
				const utilization = extra.utilization || 0;
				const currency = getAnthropicOverageCurrency();

				// "active" when 5h >= 99%, otherwise "on"
				const extraStatus = fiveHourUsage >= 99 ? "active" : "on";
				let label: string;
				if (monthlyLimit && monthlyLimit > 0) {
					label = `Extra [${extraStatus}] ${formatCurrency(usedCredits, currency)}/${formatCurrency(monthlyLimit, currency)}`;
				} else {
					label = `Extra [${extraStatus}] ${formatCurrency(usedCredits, currency)}`;
				}

				windows.push({
					label,
					usedPercent: utilization,
					resetDescription: extraStatus === "active" ? "__ACTIVE__" : undefined,
				});
			}

			return this.snapshot({
				windows,
				extraUsageEnabled,
				fiveHourUsage,
			});
		} catch {
			clear();
			return this.emptySnapshot(fetchFailed());
		}
	}

}
