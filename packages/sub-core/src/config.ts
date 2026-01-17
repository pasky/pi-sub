/**
 * Configuration constants for the sub-bar extension
 */

/**
 * Google Workspace status API endpoint
 */
export const GOOGLE_STATUS_URL = "https://www.google.com/appsstatus/dashboard/incidents.json";

/**
 * Google product ID for Gemini in the status API
 */
export const GEMINI_PRODUCT_ID = "npdyhgECDJ6tB66MxXyo";

/**
 * Model multipliers for Copilot request counting
 * Maps model display names to their request multiplier
 */
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

/**
 * Timeout for API requests in milliseconds
 */
export const API_TIMEOUT_MS = 5000;

/**
 * Timeout for CLI commands in milliseconds
 */
export const CLI_TIMEOUT_MS = 10000;

/**
 * Interval for automatic usage refresh in milliseconds
 */
export const REFRESH_INTERVAL_MS = 60_000;

