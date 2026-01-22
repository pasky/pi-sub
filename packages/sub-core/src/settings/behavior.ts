/**
 * Behavior settings UI helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { Settings } from "../settings-types.js";
import { CUSTOM_OPTION } from "../ui/settings-list.js";

export function buildBehaviorItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "refreshInterval",
			label: "Auto-refresh Interval",
			currentValue: settings.behavior.refreshInterval === 0 ? "off" : `${settings.behavior.refreshInterval}s`,
			values: ["off", "30s", "60s", "120s", "300s", CUSTOM_OPTION],
			description: "How often to refresh usage data automatically.",
		},
		{
			id: "refreshOnTurnStart",
			label: "Refresh on Turn Start",
			currentValue: settings.behavior.refreshOnTurnStart ? "on" : "off",
			values: ["on", "off"],
			description: "Refresh usage when a new turn starts.",
		},
		{
			id: "refreshOnToolResult",
			label: "Refresh on Tool Result",
			currentValue: settings.behavior.refreshOnToolResult ? "on" : "off",
			values: ["on", "off"],
			description: "Refresh usage after tool executions.",
		},
		{
			id: "autoDetectProvider",
			label: "Auto-detect Provider",
			currentValue: settings.behavior.autoDetectProvider ? "on" : "off",
			values: ["on", "off"],
			description: "Detect provider from the active model.",
		},
	];
}

export function applyBehaviorChange(settings: Settings, id: string, value: string): Settings {
	switch (id) {
		case "refreshInterval":
			settings.behavior.refreshInterval = value === "off" ? 0 : parseInt(value, 10);
			break;
		case "refreshOnTurnStart":
			settings.behavior.refreshOnTurnStart = value === "on";
			break;
		case "refreshOnToolResult":
			settings.behavior.refreshOnToolResult = value === "on";
			break;
		case "autoDetectProvider":
			settings.behavior.autoDetectProvider = value === "on";
			break;
	}
	return settings;
}
