/**
 * Behavior settings UI helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { BehaviorSettings } from "../settings-types.js";
import { CUSTOM_OPTION } from "../ui/settings-list.js";

export function buildRefreshItems(settings: BehaviorSettings): SettingItem[] {
	return [
		{
			id: "refreshInterval",
			label: "Auto-refresh Interval",
			currentValue: settings.refreshInterval === 0 ? "off" : `${settings.refreshInterval}s`,
			values: ["off", "15s", "30s", "60s", "120s", "300s", CUSTOM_OPTION],
			description: "How often to refresh automatically.",
		},
		{
			id: "refreshOnTurnStart",
			label: "Refresh on Turn Start",
			currentValue: settings.refreshOnTurnStart ? "on" : "off",
			values: ["on", "off"],
			description: "Refresh when a new turn starts.",
		},
		{
			id: "refreshOnToolResult",
			label: "Refresh on Tool Result",
			currentValue: settings.refreshOnToolResult ? "on" : "off",
			values: ["on", "off"],
			description: "Refresh after tool executions.",
		},
	];
}

export function applyRefreshChange(settings: BehaviorSettings, id: string, value: string): BehaviorSettings {
	switch (id) {
		case "refreshInterval":
			settings.refreshInterval = value === "off" ? 0 : parseInt(value, 10);
			break;
		case "refreshOnTurnStart":
			settings.refreshOnTurnStart = value === "on";
			break;
		case "refreshOnToolResult":
			settings.refreshOnToolResult = value === "on";
			break;
	}
	return settings;
}
