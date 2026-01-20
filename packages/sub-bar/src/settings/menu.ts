/**
 * Settings menu item builders.
 */

import type { SelectItem } from "@mariozechner/pi-tui";
import type { Settings } from "../settings-types.js";
import type { ProviderName } from "../types.js";
import { PROVIDERS, PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";

export function buildMainMenuItems(settings: Settings): SelectItem[] {
	return [
		{
			value: "providers",
			label: "Provider Settings",
			description: `${Object.keys(settings.providers).length} providers`,
		},
		{
			value: "display",
			label: "Display Settings",
			description: `${settings.display.barStyle} style, divider: ${settings.display.dividerCharacter}`,
		},
		{
			value: "reset-display",
			label: "Reset Display Defaults",
			description: "restore display settings",
		},
		{
			value: "reset-providers",
			label: "Reset Provider Defaults",
			description: "restore provider settings",
		},
	];
}

export function buildProviderListItems(settings: Settings): SelectItem[] {
	return PROVIDERS.map((provider) => {
		const ps = settings.providers[provider];
		const status = ps.showStatus ? "status on" : "status off";
		return {
			value: `provider-${provider}`,
			label: PROVIDER_DISPLAY_NAMES[provider],
			description: status,
		};
	});
}

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

export function buildProviderSettingsItems(settings: Settings): SelectItem[] {
	return buildProviderListItems(settings);
}

export function getProviderFromCategory(category: string): ProviderName | null {
	const match = category.match(/^provider-(\w+)$/);
	return match ? (match[1] as ProviderName) : null;
}
