/**
 * Tool settings UI helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { ToolsSettings } from "../settings-types.js";

export function buildToolItems(settings: ToolsSettings): SettingItem[] {
	return [
		{
			id: "usageTool",
			label: "Usage Tool",
			currentValue: settings.usageTool ? "on" : "off",
			values: ["on", "off"],
			description: "Expose sub_get_usage to fetch current provider usage.",
		},
		{
			id: "allUsageTool",
			label: "All Usage Tool",
			currentValue: settings.allUsageTool ? "on" : "off",
			values: ["on", "off"],
			description: "Expose sub_get_all_usage for all enabled providers.",
		},
	];
}

export function applyToolChange(settings: ToolsSettings, id: string, value: string): ToolsSettings {
	switch (id) {
		case "usageTool":
			settings.usageTool = value === "on";
			break;
		case "allUsageTool":
			settings.allUsageTool = value === "on";
			break;
	}
	return settings;
}
