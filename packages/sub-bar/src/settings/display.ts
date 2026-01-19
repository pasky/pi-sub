/**
 * Display settings UI helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { Settings, BarStyle, ColorScheme, BarCharacter, DividerCharacter, WidgetWrapping, DisplayAlignment, BarWidth, DividerBlanks, ProviderLabel, BaseTextColor } from "../settings-types.js";

export function buildDisplayLayoutItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "alignment",
			label: "Alignment",
			currentValue: settings.display.alignment,
			values: ["left", "center", "right", "split"] as DisplayAlignment[],
		},
		{
			id: "widgetWrapping",
			label: "Widget Wrapping",
			currentValue: settings.display.widgetWrapping,
			values: ["truncate", "wrap"] as WidgetWrapping[],
		},
		{
			id: "resetTimePosition",
			label: "Reset Timer",
			currentValue: settings.display.resetTimePosition,
			values: ["off", "front", "back", "integrated"],
		},
		{
			id: "showUsageLabels",
			label: "Show Usage Labels",
			currentValue: settings.display.showUsageLabels ? "on" : "off",
			values: ["on", "off"],
		},
	];
}

export function buildDisplayColorItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "baseTextColor",
			label: "Base Color",
			currentValue: settings.display.baseTextColor,
			values: ["dim", "muted", "text"] as BaseTextColor[],
		},
		{
			id: "colorScheme",
			label: "Color Scheme",
			currentValue: settings.display.colorScheme,
			values: [
				"base-warning-error",
				"success-base-warning-error",
				"monochrome",
			] as ColorScheme[],
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

export function buildDisplayBarItems(settings: Settings): SettingItem[] {
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
			values: ["4", "6", "8", "10", "12", "fill"],
		},
		{
			id: "barCharacter",
			label: "Bar Character",
			currentValue: settings.display.barCharacter,
			values: ["light", "heavy", "double", "block"],
		},
	];
}

export function buildDisplayProviderItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "showProviderName",
			label: "Show Provider Name",
			currentValue: settings.display.showProviderName ? "on" : "off",
			values: ["on", "off"],
		},
		{
			id: "providerLabel",
			label: "Provider Label",
			currentValue: settings.display.providerLabel,
			values: ["none", "plan", "subscription", "sub"] as ProviderLabel[],
		},
		{
			id: "providerLabelColon",
			label: "Provider Label Colon",
			currentValue: settings.display.providerLabelColon ? "on" : "off",
			values: ["on", "off"],
		},
	];
}

export function buildDisplayDividerItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "dividerCharacter",
			label: "Divider Character",
			currentValue: settings.display.dividerCharacter,
			values: ["none", "blank", "|", "•", "●", "○", "◇"] as DividerCharacter[],
		},
		{
			id: "dividerBlanks",
			label: "Blanks Before/After Divider",
			currentValue: String(settings.display.dividerBlanks),
			values: ["0", "1", "2", "3", "fill"],
		},
		{
			id: "showTopDivider",
			label: "Show Top Divider",
			currentValue: settings.display.showTopDivider ? "on" : "off",
			values: ["on", "off"],
		},
	];
}

export function applyDisplayChange(settings: Settings, id: string, value: string): Settings {
	switch (id) {
		case "alignment":
			settings.display.alignment = value as DisplayAlignment;
			break;
		case "barStyle":
			settings.display.barStyle = value as BarStyle;
			break;
		case "barWidth": {
			settings.display.barWidth = value === "fill"
				? "fill" as BarWidth
				: parseInt(value, 10) as BarWidth;
			break;
		}
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
		case "providerLabel":
			settings.display.providerLabel = value as ProviderLabel;
			break;
		case "providerLabelColon":
			settings.display.providerLabelColon = value === "on";
			break;
		case "baseTextColor":
			settings.display.baseTextColor = value as BaseTextColor;
			break;
		case "showUsageLabels":
			settings.display.showUsageLabels = value === "on";
			break;
		case "dividerCharacter":
			settings.display.dividerCharacter = value as DividerCharacter;
			break;
		case "dividerBlanks": {
			settings.display.dividerBlanks = value === "fill"
				? "fill" as DividerBlanks
				: parseInt(value, 10) as DividerBlanks;
			break;
		}
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
