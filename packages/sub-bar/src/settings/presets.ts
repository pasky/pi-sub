import type { Settings } from "../settings-types.js";
import type { TooltipSelectItem } from "./menu.js";

export interface DisplayPresetTarget {
	id?: string;
	name: string;
	display: Settings["display"];
	deletable: boolean;
}

export function buildDisplayPresetItems(
	settings: Settings,
): TooltipSelectItem[] {
	const items: TooltipSelectItem[] = [];
	items.push({
		value: "user",
		label: "Your setting",
		description: "restore your last settings",
		tooltip: "Restore your previous display settings.",
	});
	items.push({
		value: "default",
		label: "Default",
		description: "restore default settings",
		tooltip: "Reset display settings to defaults.",
	});
	items.push({
		value: "minimal",
		label: "Minimal",
		description: "compact display",
		tooltip: "Apply a compact display preset.",
	});
	for (const preset of settings.displayPresets) {
		items.push({
			value: `preset:${preset.id}`,
			label: preset.name,
			description: "imported preset",
			tooltip: `Manage ${preset.name}.`,
		});
	}
	return items;
}

export function resolveDisplayPresetTarget(
	value: string,
	settings: Settings,
	defaults: Settings,
	fallbackUser: Settings["display"] | null,
): DisplayPresetTarget | null {
	if (value === "user") {
		const display = settings.displayUserPreset ?? fallbackUser ?? settings.display;
		return { name: "Your setting", display, deletable: false };
	}
	if (value === "default") {
		return { name: "Default", display: { ...defaults.display }, deletable: false };
	}
	if (value === "minimal") {
		return {
			name: "Minimal",
			display: {
				...defaults.display,
				alignment: "left",
				widgetWrapping: "truncate",
				resetTimePosition: "off",
				resetTimeFormat: "relative",
				showUsageLabels: false,
				paddingX: 0,
				widgetPlacement: "belowEditor",
				barStyle: "bar",
				barType: "horizontal-bar",
				barWidth: 4,
				brailleFillEmpty: false,
				showProviderName: false,
				providerLabel: "none",
				providerLabelColon: false,
				providerLabelBold: false,
				baseTextColor: "dim",
				backgroundColor: "text",
				boldWindowTitle: false,
				dividerCharacter: "none",
				dividerColor: "borderMuted",
				dividerBlanks: 0,
				showProviderDivider: false,
				dividerFooterJoin: false,
				showTopDivider: false,
				showBottomDivider: false,
			},
			deletable: false,
		};
	}
	if (value.startsWith("preset:")) {
		const id = value.replace("preset:", "");
		const preset = settings.displayPresets.find((entry) => entry.id === id);
		if (!preset) return null;
		return { id: preset.id, name: preset.name, display: preset.display, deletable: true };
	}
	return null;
}

export function buildPresetActionItems(target: DisplayPresetTarget): TooltipSelectItem[] {
	const items: TooltipSelectItem[] = [
		{
			value: "load",
			label: `Load ${target.name}`,
			description: "apply this preset",
			tooltip: "Apply the selected preset.",
		},
	];
	if (target.deletable) {
		items.push({
			value: "delete",
			label: `Delete ${target.name}`,
			description: "remove saved preset",
			tooltip: "Remove this preset from saved presets.",
		});
	}
	return items;
}
