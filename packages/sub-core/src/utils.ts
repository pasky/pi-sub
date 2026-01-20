/**
 * Utility functions for the sub-bar extension
 */

import type { Dependencies } from "./types.js";
import { MODEL_MULTIPLIERS } from "./config.js";

/**
 * Format a reset date as a relative time string
 */
export function formatReset(date: Date): string {
	const diffMs = date.getTime() - Date.now();
	if (diffMs < 0) return "now";

	const diffMins = Math.floor(diffMs / 60000);
	if (diffMins < 60) return `${diffMins}m`;

	const hours = Math.floor(diffMins / 60);
	const mins = diffMins % 60;
	if (hours < 24) return mins > 0 ? `${hours}h${mins}m` : `${hours}h`;

	const days = Math.floor(hours / 24);
	const remHours = hours % 24;
	return remHours > 0 ? `${days}d${remHours}h` : `${days}d`;
}

/**
 * Strip ANSI escape codes from a string
 */
export function stripAnsi(text: string): string {
	return text.replace(/\x1B\[[0-9;?]*[A-Za-z]|\x1B\].*?\x07/g, "");
}

/**
 * Format a currency amount in cents
 */
export function formatCurrency(cents: number, currency?: string): string {
	const amount = cents / 100;
	if (!currency) return amount.toFixed(2);
	if (currency === "EUR") return `€${amount.toFixed(2)}`;
	if (currency === "USD") return `$${amount.toFixed(2)}`;
	return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Normalize a string into tokens for fuzzy matching
 */
export function normalizeTokens(value: string): string[] {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
		.split(" ")
		.filter(Boolean);
}

// Pre-computed token entries for model multiplier matching
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

/**
 * Check if a command exists in PATH
 */
export function whichSync(cmd: string, deps: Dependencies): string | null {
	try {
		return deps.execSync(`which ${cmd}`, { encoding: "utf-8" }).trim();
	} catch {
		return null;
	}
}

/**
 * Create an abort controller with a timeout
 */
export function createTimeoutController(timeoutMs: number): { controller: AbortController; clear: () => void } {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	return {
		controller,
		clear: () => clearTimeout(timeoutId),
	};
}
