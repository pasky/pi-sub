/**
 * Status indicator helpers.
 */

import type { ProviderStatus } from "./types.js";
import type { StatusIconPack } from "./settings-types.js";

const STATUS_ICON_PACKS: Record<StatusIconPack, Record<ProviderStatus["indicator"], string>> = {
	minimal: {
		none: "✓",
		minor: "⚠",
		major: "⚠",
		critical: "×",
		maintenance: "~",
		unknown: "?",
	},
	emoji: {
		none: "✅",
		minor: "⚠️",
		major: "🟠",
		critical: "🔴",
		maintenance: "🔧",
		unknown: "❓",
	},
};

export function getStatusIcon(status: ProviderStatus | undefined, pack: StatusIconPack): string {
	if (!status) return "";
	return STATUS_ICON_PACKS[pack][status.indicator] ?? "";
}

export function getStatusLabel(status: ProviderStatus | undefined): string {
	if (!status) return "";
	if (status.description) return status.description;
	switch (status.indicator) {
		case "none":
			return "Operational";
		case "minor":
			return "Degraded";
		case "major":
			return "Outage";
		case "critical":
			return "Outage";
		case "maintenance":
			return "Maintenance";
		case "unknown":
		default:
			return "Status Unknown";
	}
}
