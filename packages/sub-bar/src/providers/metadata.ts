/**
 * Provider metadata shared across the extension.
 */

import type { RateWindow, UsageSnapshot } from "../types.js";
import { PROVIDERS, type ProviderName } from "../types.js";
import type { Settings } from "../settings-types.js";
import { getModelMultiplier } from "../utils.js";

export { PROVIDERS } from "../types.js";

export type ProviderStatusConfig =
	| { type: "statuspage"; url: string }
	| { type: "google-workspace" };

export interface ProviderDetectionConfig {
	providerTokens: string[];
	modelTokens: string[];
}

export interface UsageExtra {
	label: string;
}

export interface ProviderMetadata {
	displayName: string;
	detection?: ProviderDetectionConfig;
	status?: ProviderStatusConfig;
	isWindowVisible?: (usage: UsageSnapshot, window: RateWindow, settings?: Settings) => boolean;
	getExtras?: (usage: UsageSnapshot, settings?: Settings, modelId?: string) => UsageExtra[];
}

const anthropicWindowVisible: ProviderMetadata["isWindowVisible"] = (_usage, window, settings) => {
	if (!settings) return true;
	const ps = settings.providers.anthropic;
	if (window.label === "5h") return ps.windows.show5h;
	if (window.label === "7d") return ps.windows.show7d;
	if (window.label.startsWith("Extra [")) return ps.windows.showExtra;
	return true;
};

const copilotWindowVisible: ProviderMetadata["isWindowVisible"] = (_usage, window, settings) => {
	if (!settings) return true;
	const ps = settings.providers.copilot;
	if (window.label === "Month") return ps.windows.showMonth;
	return true;
};

const geminiWindowVisible: ProviderMetadata["isWindowVisible"] = (_usage, window, settings) => {
	if (!settings) return true;
	const ps = settings.providers.gemini;
	if (window.label === "Pro") return ps.windows.showPro;
	if (window.label === "Flash") return ps.windows.showFlash;
	return true;
};

const codexWindowVisible: ProviderMetadata["isWindowVisible"] = (_usage, window, settings) => {
	if (!settings) return true;
	const ps = settings.providers.codex;
	if (window.label.match(/^\d+h$/)) return ps.windows.showPrimary;
	if (window.label === "Day" || window.label === "Week") return ps.windows.showSecondary;
	return true;
};

const kiroWindowVisible: ProviderMetadata["isWindowVisible"] = (_usage, window, settings) => {
	if (!settings) return true;
	const ps = settings.providers.kiro;
	if (window.label === "Credits") return ps.windows.showCredits;
	return true;
};

const zaiWindowVisible: ProviderMetadata["isWindowVisible"] = (_usage, window, settings) => {
	if (!settings) return true;
	const ps = settings.providers.zai;
	if (window.label === "Tokens") return ps.windows.showTokens;
	if (window.label === "Monthly") return ps.windows.showMonthly;
	return true;
};

const anthropicExtras: ProviderMetadata["getExtras"] = (usage, settings) => {
	const extras: UsageExtra[] = [];
	const showExtraUsage = settings?.providers.anthropic.showExtraUsage ?? true;
	const showExtraWindow = settings?.providers.anthropic.windows.showExtra ?? true;
	if (showExtraUsage && showExtraWindow && usage.extraUsageEnabled === false) {
		extras.push({ label: "Extra [off]" });
	}
	return extras;
};

const copilotExtras: ProviderMetadata["getExtras"] = (usage, settings, modelId) => {
	const extras: UsageExtra[] = [];
	const showMultiplier = settings?.providers.copilot.showMultiplier ?? true;
	const showRequestsLeft = settings?.providers.copilot.showRequestsLeft ?? true;
	if (!showMultiplier) return extras;

	const multiplier = getModelMultiplier(modelId);
	const remaining = usage.requestsRemaining;
	if (multiplier !== undefined) {
		let multiplierStr = `Model multiplier: ${multiplier}x`;
		if (showRequestsLeft && remaining !== undefined) {
			const leftCount = Math.floor(remaining / Math.max(multiplier, 0.0001));
			multiplierStr += ` (${leftCount} req. left)`;
		}
		extras.push({ label: multiplierStr });
	}
	return extras;
};

export const PROVIDER_METADATA: Record<ProviderName, ProviderMetadata> = {
	anthropic: {
		displayName: "Anthropic (Claude)",
		status: { type: "statuspage", url: "https://status.anthropic.com/api/v2/status.json" },
		detection: { providerTokens: ["anthropic"], modelTokens: ["claude"] },
		isWindowVisible: anthropicWindowVisible,
		getExtras: anthropicExtras,
	},
	copilot: {
		displayName: "GitHub Copilot",
		status: { type: "statuspage", url: "https://www.githubstatus.com/api/v2/status.json" },
		detection: { providerTokens: ["copilot", "github"], modelTokens: [] },
		isWindowVisible: copilotWindowVisible,
		getExtras: copilotExtras,
	},
	gemini: {
		displayName: "Google Gemini",
		status: { type: "google-workspace" },
		detection: { providerTokens: ["google", "gemini"], modelTokens: ["gemini"] },
		isWindowVisible: geminiWindowVisible,
	},
	codex: {
		displayName: "OpenAI Codex",
		status: { type: "statuspage", url: "https://status.openai.com/api/v2/status.json" },
		detection: { providerTokens: ["openai", "codex"], modelTokens: ["gpt", "o1", "o3"] },
		isWindowVisible: codexWindowVisible,
	},
	kiro: {
		displayName: "AWS Kiro",
		detection: { providerTokens: ["kiro", "aws"], modelTokens: [] },
		isWindowVisible: kiroWindowVisible,
	},
	zai: {
		displayName: "z.ai",
		detection: { providerTokens: ["zai", "z.ai", "xai"], modelTokens: [] },
		isWindowVisible: zaiWindowVisible,
	},
};

export const PROVIDER_DISPLAY_NAMES = Object.fromEntries(
	PROVIDERS.map((provider) => [provider, PROVIDER_METADATA[provider].displayName])
) as Record<ProviderName, string>;
