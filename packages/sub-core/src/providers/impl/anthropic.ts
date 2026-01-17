/**
 * Anthropic/Claude usage provider
 */

import * as path from "node:path";
import type { Dependencies, RateWindow, UsageSnapshot } from "../../types.js";
import { BaseProvider } from "../../provider.js";
import { noCredentials, fetchFailed, httpError } from "../../errors.js";
import { formatReset, formatCurrency, createTimeoutController } from "../../utils.js";
import { API_TIMEOUT_MS } from "../../config.js";

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

export class AnthropicProvider extends BaseProvider {
	readonly name = "anthropic" as const;
	readonly displayName = "Claude Plan";

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
				windows.push({
					label: "5h",
					usedPercent: data.five_hour.utilization,
					resetDescription: data.five_hour.resets_at
						? formatReset(new Date(data.five_hour.resets_at))
						: undefined,
				});
			}

			if (data.seven_day?.utilization !== undefined) {
				windows.push({
					label: "7d",
					usedPercent: data.seven_day.utilization,
					resetDescription: data.seven_day.resets_at
						? formatReset(new Date(data.seven_day.resets_at))
						: undefined,
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

				// "active" when 5h >= 99%, otherwise "on"
				const extraStatus = fiveHourUsage >= 99 ? "active" : "on";
				let label: string;
				if (monthlyLimit && monthlyLimit > 0) {
					label = `Extra [${extraStatus}] ${formatCurrency(usedCredits)}/${formatCurrency(monthlyLimit)}`;
				} else {
					label = `Extra [${extraStatus}] ${formatCurrency(usedCredits)}`;
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
