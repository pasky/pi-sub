import type { Settings } from "../settings-types.js";
import type { TooltipSelectItem } from "./menu.js";

const PRESET_ID_LENGTH = 24;
const PRESET_ID_FALLBACK = "theme";

function buildPresetId(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9_-]+/g, "-").slice(0, PRESET_ID_LENGTH) || PRESET_ID_FALLBACK;
}

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
		label: "Restore backup",
		description: "restore your last theme",
		tooltip: "Restore your previous display theme.",
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
		const description = preset.source === "imported" ? "manually imported theme" : "manually saved theme";
		items.push({
			value: `preset:${preset.id}`,
			label: preset.name,
			description,
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
		return { name: "Restore backup", display, deletable: false };
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
				resetTimeContainment: "()",
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
			label: "Load",
			description: "apply this theme",
			tooltip: "Apply the selected theme.",
		},
		{
			value: "share",
			label: "Share",
			description: "post share string",
			tooltip: "Post a shareable theme string to chat.",
		},
	];
	if (target.deletable) {
		items.push({
			value: "delete",
			label: "Delete",
			description: "remove saved theme",
			tooltip: "Remove this theme from saved themes.",
		});
	}
	return items;
}

export function upsertDisplayPreset(
	settings: Settings,
	name: string,
	display: Settings["display"],
	source?: "saved" | "imported",
): Settings {
	const trimmed = name.trim() || "Theme";
	const id = buildPresetId(trimmed);
	const snapshot = { ...display };
	const existing = settings.displayPresets.find((preset) => preset.id === id);
	const resolvedSource = source ?? existing?.source ?? "saved";
	if (existing) {
		existing.name = trimmed;
		existing.display = snapshot;
		existing.source = resolvedSource;
	} else {
		settings.displayPresets.push({ id, name: trimmed, display: snapshot, source: resolvedSource });
	}
	return settings;
}

export function saveDisplayPreset(settings: Settings, name: string): Settings {
	return upsertDisplayPreset(settings, name, settings.display, "saved");
}
