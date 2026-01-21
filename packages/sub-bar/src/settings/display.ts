/**
 * Display settings UI helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { Settings, BarStyle, BarType, ColorScheme, BarCharacter, DividerCharacter, WidgetWrapping, DisplayAlignment, BarWidth, DividerBlanks, ProviderLabel, BaseTextColor, WidgetPlacement, ResetTimeFormat, StatusIndicatorMode, StatusIconPack } from "../settings-types.js";

export function buildDisplayLayoutItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "alignment",
			label: "Alignment",
			currentValue: settings.display.alignment,
			values: ["left", "center", "right", "split"] as DisplayAlignment[],
			description: "Align the usage line inside the widget.",
		},
		{
			id: "widgetWrapping",
			label: "Widget Wrapping",
			currentValue: settings.display.widgetWrapping,
			values: ["truncate", "wrap"] as WidgetWrapping[],
			description: "Wrap the usage line or truncate with ellipsis.",
		},
		{
			id: "resetTimePosition",
			label: "Reset Timer",
			currentValue: settings.display.resetTimePosition,
			values: ["off", "front", "back", "integrated"],
			description: "Where to show the reset timer in each window.",
		},
		{
			id: "resetTimeFormat",
			label: "Reset Timer Format",
			currentValue: settings.display.resetTimeFormat ?? "relative",
			values: ["relative", "datetime"] as ResetTimeFormat[],
			description: "Show relative countdown or reset datetime.",
		},
		{
			id: "showUsageLabels",
			label: "Show Usage Labels",
			currentValue: settings.display.showUsageLabels ? "on" : "off",
			values: ["on", "off"],
			description: "Show “used/rem.” labels after percentages.",
		},
		{
			id: "paddingX",
			label: "Padding X",
			currentValue: String(settings.display.paddingX ?? 0),
			values: ["0", "1", "2", "3", "4"],
			description: "Add left/right padding inside the widget.",
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
			description: "Base color for neutral labels and dividers.",
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
			description: "Choose how usage levels are color-coded.",
		},
		{
			id: "errorThreshold",
			label: "Error Threshold (%)",
			currentValue: String(settings.display.errorThreshold),
			values: ["10", "15", "20", "25", "30", "35", "40"],
			description: "Percent remaining below which usage is red.",
		},
		{
			id: "warningThreshold",
			label: "Warning Threshold (%)",
			currentValue: String(settings.display.warningThreshold),
			values: ["30", "40", "50", "60", "70"],
			description: "Percent remaining below which usage is yellow.",
		},
		{
			id: "successThreshold",
			label: "Success Threshold (%)",
			currentValue: String(settings.display.successThreshold),
			values: ["60", "70", "75", "80", "90"],
			description: "Percent remaining above which usage is green.",
		},
	];
}

export function buildDisplayBarItems(settings: Settings): SettingItem[] {
	const items: SettingItem[] = [
		{
			id: "barType",
			label: "Bar Type",
			currentValue: settings.display.barType,
			values: [
				"horizontal-bar",
				"horizontal-single",
				"vertical",
				"braille",
				"shade",
			] as BarType[],
			description: "Choose the bar glyph style for usage.",
		},
	];

	if (settings.display.barType === "horizontal-bar") {
		items.push({
			id: "barCharacter",
			label: "H. Bar Character",
			currentValue: settings.display.barCharacter,
			values: ["light", "heavy", "double", "block"],
			description: "Select the horizontal bar line weight.",
		});
	}

	items.push(
		{
			id: "barWidth",
			label: "Bar Width",
			currentValue: String(settings.display.barWidth),
			values: ["1", "4", "6", "8", "10", "12", "fill"],
			description: "Set the bar width or fill available space.",
		},
		{
			id: "containBar",
			label: "Contain Bar",
			currentValue: settings.display.containBar ? "on" : "off",
			values: ["on", "off"],
			description: "Wrap the bar with ▕ and ▏ caps.",
		},
	);

	if (settings.display.barType === "braille") {
		items.push({
			id: "brailleFillEmpty",
			label: "Braille Empty Fill",
			currentValue: settings.display.brailleFillEmpty ? "on" : "off",
			values: ["on", "off"],
			description: "Fill empty braille cells with dim blocks.",
		});
	}

	items.push({
		id: "barStyle",
		label: "Bar Style",
		currentValue: settings.display.barStyle,
		values: ["bar", "percentage", "both"] as BarStyle[],
		description: "Show bar, percentage, or both.",
	});

	return items;
}

export function buildDisplayProviderItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "showProviderName",
			label: "Show Provider Name",
			currentValue: settings.display.showProviderName ? "on" : "off",
			values: ["on", "off"],
			description: "Toggle the provider name prefix.",
		},
		{
			id: "providerLabel",
			label: "Provider Label",
			currentValue: settings.display.providerLabel,
			values: ["none", "plan", "subscription", "sub"] as ProviderLabel[],
			description: "Suffix appended after the provider name.",
		},
		{
			id: "providerLabelColon",
			label: "Provider Label Colon",
			currentValue: settings.display.providerLabelColon ? "on" : "off",
			values: ["on", "off"],
			description: "Show a colon after the provider label.",
		},
	];
}

const STATUS_ICON_PACK_PREVIEW: Record<Exclude<StatusIconPack, "shapes">, string> = {
	minimal: "minimal (✓ ⚠ ×)",
	emoji: "emoji (✅ ⚠️ 🔴)",
};

function formatStatusIconPack(pack: Exclude<StatusIconPack, "shapes">): string {
	return STATUS_ICON_PACK_PREVIEW[pack] ?? pack;
}

function parseStatusIconPack(value: string): Exclude<StatusIconPack, "shapes"> {
	if (value.startsWith("minimal")) return "minimal";
	return "emoji";
}

export function buildDisplayStatusItems(settings: Settings): SettingItem[] {
	const mode = settings.display.statusIndicatorMode ?? "icon";
	const items: SettingItem[] = [
		{
			id: "statusIndicatorMode",
			label: "Status Mode",
			currentValue: mode,
			values: ["icon", "color", "icon+color"] as StatusIndicatorMode[],
			description: "Use icons, color tint, or both for status indicators.",
		},
	];

	if (mode === "icon" || mode === "icon+color") {
		items.push({
			id: "statusIconPack",
			label: "Status Icon Pack",
			currentValue: formatStatusIconPack((settings.display.statusIconPack === "minimal" ? "minimal" : "emoji")),
			values: [
				formatStatusIconPack("minimal"),
				formatStatusIconPack("emoji"),
			],
			description: "Pick the icon set used for status indicators.",
		});
	}

	items.push(
		{
			id: "statusText",
			label: "Show Status Text",
			currentValue: settings.display.statusText ? "on" : "off",
			values: ["on", "off"],
			description: "Show the textual status description next to the icon.",
		},
		{
			id: "statusDismissOk",
			label: "Dismiss Operational Status",
			currentValue: settings.display.statusDismissOk ? "on" : "off",
			values: ["on", "off"],
			description: "Hide status text/icons when there are no incidents.",
		}
	);

	return items;
}

export function buildDisplayDividerItems(settings: Settings): SettingItem[] {
	return [
		{
			id: "dividerCharacter",
			label: "Divider Character",
			currentValue: settings.display.dividerCharacter,
			values: ["none", "blank", "|", "•", "●", "○", "◇"] as DividerCharacter[],
			description: "Choose the divider glyph between windows.",
		},
		{
			id: "dividerBlanks",
			label: "Blanks Before/After Divider",
			currentValue: String(settings.display.dividerBlanks),
			values: ["0", "1", "2", "3", "fill"],
			description: "Padding around the divider character.",
		},
		{
			id: "showBottomDivider",
			label: "Show Bottom Divider",
			currentValue: settings.display.showBottomDivider ? "on" : "off",
			values: ["on", "off"],
			description: "Show a divider line below the widget.",
		},

	];
}

export function applyDisplayChange(settings: Settings, id: string, value: string): Settings {
	switch (id) {
		case "alignment":
			settings.display.alignment = value as DisplayAlignment;
			break;
		case "barType":
			settings.display.barType = value as BarType;
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
		case "containBar":
			settings.display.containBar = value === "on";
			break;
		case "barCharacter":
			settings.display.barCharacter = value as BarCharacter;
			break;
		case "brailleFillEmpty":
			settings.display.brailleFillEmpty = value === "on";
			break;
		case "colorScheme":
			settings.display.colorScheme = value as ColorScheme;
			break;
		case "resetTimePosition":
			settings.display.resetTimePosition = value as "off" | "front" | "back" | "integrated";
			break;
		case "resetTimeFormat":
			settings.display.resetTimeFormat = value as ResetTimeFormat;
			break;
		case "statusIndicatorMode":
			settings.display.statusIndicatorMode = value as StatusIndicatorMode;
			break;
		case "statusIconPack":
			settings.display.statusIconPack = parseStatusIconPack(value);
			break;
		case "statusText":
			settings.display.statusText = value === "on";
			break;
		case "statusDismissOk":
			settings.display.statusDismissOk = value === "on";
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
		case "widgetPlacement":
			settings.display.widgetPlacement = value as WidgetPlacement;
			break;
		case "paddingX":
			settings.display.paddingX = parseInt(value, 10) as 0 | 1 | 2 | 3 | 4;
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
		case "showBottomDivider":
			settings.display.showBottomDivider = value === "on";
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
