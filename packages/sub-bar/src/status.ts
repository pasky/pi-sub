/**
 * Status indicator helpers.
 */

import type { ProviderStatus } from "./types.js";

/**
 * Get emoji for a status indicator
 */
export function getStatusEmoji(status?: ProviderStatus): string {
	if (!status) return "";
	switch (status.indicator) {
		case "none":
			return "✅";
		case "minor":
			return "⚠️";
		case "major":
			return "🟠";
		case "critical":
			return "🔴";
		case "maintenance":
			return "🔧";
		default:
			return "";
	}
}
