/**
 * Settings menu item builders.
 */

import type { SelectItem } from "@mariozechner/pi-tui";

export function buildDisplayMenuItems(): SelectItem[] {
	return [
		{
			value: "display-layout",
			label: "Layout & Content",
			description: "alignment, wrapping, reset, usage labels",
		},
		{
			value: "display-color",
			label: "Color Scheme",
			description: "colors and thresholds",
		},
		{
			value: "display-bar",
			label: "Bar",
			description: "style, width, character",
		},
		{
			value: "display-provider",
			label: "Provider",
			description: "label controls",
		},
		{
			value: "display-divider",
			label: "Divider",
			description: "character, blanks, top divider",
		},
		{
			value: "display-presets",
			label: "Load Presets",
			description: "default or minimal",
		},
	];
}

export function buildDisplayPresetItems(): SelectItem[] {
	return [
		{
			value: "default",
			label: "Default",
			description: "restore default display settings",
		},
		{
			value: "minimal",
			label: "Minimal",
			description: "compact display",
		},
	];
}
