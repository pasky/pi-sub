/**
 * Provider metadata shared across the core.
 */

import { PROVIDERS, type ProviderName } from "../types.js";

export { PROVIDERS } from "../types.js";

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
