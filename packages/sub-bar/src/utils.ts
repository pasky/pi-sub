/**
 * Utility functions for the sub-bar display layer.
 */

const MODEL_MULTIPLIERS: Record<string, number> = {
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

function normalizeTokens(value: string): string[] {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean);
}

const MODEL_MULTIPLIER_TOKENS = Object.entries(MODEL_MULTIPLIERS).map(([label, multiplier]) => ({
	label,
	multiplier,
	tokens: normalizeTokens(label),
}));

/**
 * Get the request multiplier for a model ID
 * Uses fuzzy matching against known model names
 */
export function getModelMultiplier(modelId: string | undefined): number | undefined {
	if (!modelId) return undefined;
	const modelTokens = normalizeTokens(modelId);
	if (modelTokens.length === 0) return undefined;

	let bestMatch: { multiplier: number; tokenCount: number } | undefined;
	for (const entry of MODEL_MULTIPLIER_TOKENS) {
		const isMatch = entry.tokens.every((token) => modelTokens.includes(token));
		if (!isMatch) continue;
		const tokenCount = entry.tokens.length;
		if (!bestMatch || tokenCount > bestMatch.tokenCount) {
			bestMatch = { multiplier: entry.multiplier, tokenCount };
		}
	}

	return bestMatch?.multiplier;
}
