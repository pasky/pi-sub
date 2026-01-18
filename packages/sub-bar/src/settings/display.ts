/**
 * Display settings UI helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { Settings, BarStyle, ColorScheme, BarCharacter, DividerCharacter, WidgetWrapping } from "../settings-types.js";

export function buildDisplayItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "barStyle",
			label: "Bar Style",
			currentValue: settings.display.barStyle,
			values: ["bar", "percentage", "both"] as BarStyle[],
		},
		{
			id: "barWidth",
			label: "Bar Width",
			currentValue: String(settings.display.barWidth),
			values: ["4", "6", "8", "10", "12"],
		},
		{
			id: "barCharacter",
			label: "Bar Character",
			currentValue: settings.display.barCharacter,
			values: ["light", "heavy", "double", "block"],
		},
		{
			id: "colorScheme",
			label: "Color Scheme",
			description: "Color coding based on remaining quota percentage",
			currentValue: settings.display.colorScheme,
			values: [
				"muted-warning-error",
				"text-warning-error",
				"success-text-warning-error",
				"monochrome",
			] as ColorScheme[],
		},
		{
			id: "resetTimePosition",
			label: "Reset Timer",
			currentValue: settings.display.resetTimePosition,
			values: ["off", "front", "back", "integrated"],
		},
		{
			id: "showProviderName",
			label: "Show Provider Name",
			currentValue: settings.display.showProviderName ? "on" : "off",
			values: ["on", "off"],
		},
		{
			id: "showUsageLabels",
			label: "Show Usage Labels",
			currentValue: settings.display.showUsageLabels ? "on" : "off",
			values: ["on", "off"],
		},
		{
			id: "dividerCharacter",
			label: "Divider Character",
			currentValue: settings.display.dividerCharacter,
			values: ["blank", "|", "•", "●", "○", "◇"] as DividerCharacter[],
		},
		{
			id: "dividerBlanks",
			label: "Blanks Before/After Divider",
			currentValue: String(settings.display.dividerBlanks),
			values: ["0", "1"],
		},
		{
			id: "showTopDivider",
			label: "Show Top Divider",
			currentValue: settings.display.showTopDivider ? "on" : "off",
			values: ["on", "off"],
		},
		{
			id: "widgetWrapping",
			label: "Widget Wrapping",
			currentValue: settings.display.widgetWrapping,
			values: ["truncate", "wrap"] as WidgetWrapping[],
		},
		{
			id: "errorThreshold",
			label: "Error Threshold (%)",
			currentValue: String(settings.display.errorThreshold),
			values: ["10", "15", "20", "25", "30", "35", "40"],
		},
		{
			id: "warningThreshold",
			label: "Warning Threshold (%)",
			currentValue: String(settings.display.warningThreshold),
			values: ["30", "40", "50", "60", "70"],
		},
		{
			id: "successThreshold",
			label: "Success Threshold (%)",
			currentValue: String(settings.display.successThreshold),
			values: ["60", "70", "75", "80", "90"],
		},
	];
}

export function applyDisplayChange(settings: Settings, id: string, value: string): Settings {
	switch (id) {
		case "barStyle":
			settings.display.barStyle = value as BarStyle;
			break;
		case "barWidth":
			settings.display.barWidth = parseInt(value, 10);
			break;
		case "barCharacter":
			settings.display.barCharacter = value as BarCharacter;
			break;
		case "colorScheme":
			settings.display.colorScheme = value as ColorScheme;
			break;
		case "resetTimePosition":
			settings.display.resetTimePosition = value as "off" | "front" | "back" | "integrated";
			break;
		case "showProviderName":
			settings.display.showProviderName = value === "on";
			break;
		case "showUsageLabels":
			settings.display.showUsageLabels = value === "on";
			break;
		case "dividerCharacter":
			settings.display.dividerCharacter = value as DividerCharacter;
			break;
		case "dividerBlanks":
			settings.display.dividerBlanks = parseInt(value, 10) as 0 | 1;
			break;
		case "showTopDivider":
			settings.display.showTopDivider = value === "on";
			break;
		case "widgetWrapping":
			settings.display.widgetWrapping = value as WidgetWrapping;
			break;
		case "errorThreshold":
			settings.display.errorThreshold = parseInt(value, 10);
			break;
		case "warningThreshold":
			settings.display.warningThreshold = parseInt(value, 10);
			break;
		case "successThreshold":
			settings.display.successThreshold = parseInt(value, 10);
			break;
	}
	return settings;
}
