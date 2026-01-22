/**
 * Settings menu item builders.
 */

import type { SelectItem } from "@mariozechner/pi-tui";
import type { CoreProviderSettingsMap } from "pi-sub-shared";
import type { Settings } from "../settings-types.js";
import type { ProviderName } from "../types.js";
import { PROVIDERS, PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";

export type TooltipSelectItem = SelectItem & { tooltip?: string };

export function buildMainMenuItems(settings: Settings): TooltipSelectItem[] {
	return [
		{
			value: "providers",
			label: "Provider Settings",
			description: `${Object.keys(settings.providers).length} providers`,
			tooltip: "Configure provider display toggles and window visibility.",
		},
		{
			value: "display",
			label: "Display Settings",
			description: `${settings.display.barStyle} style, divider: ${settings.display.dividerCharacter}`,
			tooltip: "Adjust layout, colors, bar styling, status indicators, and dividers.",
		},
		{
			value: "open-core-settings",
			label: "Change additional settings in sub-core",
			description: "open sub-core settings",
			tooltip: "Open sub-core settings for refresh behavior and provider enablement.",
		},
	];
}

export function buildProviderListItems(settings: Settings, coreProviders?: CoreProviderSettingsMap): TooltipSelectItem[] {
	const orderedProviders = settings.providerOrder.length > 0 ? settings.providerOrder : PROVIDERS;
	const items: TooltipSelectItem[] = orderedProviders.map((provider) => {
		const ps = settings.providers[provider];
		const core = coreProviders?.[provider];
		const enabledValue = core
			? core.enabled === "auto"
				? "auto"
				: core.enabled === true || core.enabled === "on"
					? "on"
					: "off"
			: "auto";
		const status = ps.showStatus ? "status on" : "status off";
		return {
			value: `provider-${provider}`,
			label: PROVIDER_DISPLAY_NAMES[provider],
			description: `enabled ${enabledValue}, ${status}`,
			tooltip: `Configure ${PROVIDER_DISPLAY_NAMES[provider]} display settings.`,
		};
	});

	items.push({
		value: "reset-providers",
		label: "Reset Provider Defaults",
		description: "restore provider settings",
		tooltip: "Restore provider display settings to their defaults.",
	});

	return items;
}

export function buildDisplayMenuItems(): TooltipSelectItem[] {
	return [
		{
			value: "display-layout",
			label: "Layout & Content",
			description: "alignment, wrapping, reset, usage labels",
			tooltip: "Control alignment, wrapping, reset placement, and labels.",
		},
		{
			value: "display-color",
			label: "Color Scheme",
			description: "colors and thresholds",
			tooltip: "Tune base colors, color scheme, and thresholds.",
		},
		{
			value: "display-bar",
			label: "Bar",
			description: "style, width, character",
			tooltip: "Customize bar type, width, and bar styling.",
		},
		{
			value: "display-provider",
			label: "Provider",
			description: "label controls",
			tooltip: "Adjust provider label visibility and suffix.",
		},
		{
			value: "display-status",
			label: "Status Indicator",
			description: "mode, icons, text",
			tooltip: "Configure status icons, colors, and optional text.",
		},
		{
			value: "display-divider",
			label: "Divider",
			description: "character, blanks, top divider",
			tooltip: "Change divider character, spacing, and divider lines.",
		},
		{
			value: "display-save-theme",
			label: "Save Theme",
			description: "store current theme",
			tooltip: "Save the current display theme with a custom name.",
		},
		{
			value: "display-presets",
			label: "Load Theme",
			description: "default, minimal, saved themes",
			tooltip: "Load saved display themes.",
		},
	];
}

export function buildProviderSettingsItems(settings: Settings): TooltipSelectItem[] {
	return buildProviderListItems(settings);
}

export function getProviderFromCategory(category: string): ProviderName | null {
	const match = category.match(/^provider-(\w+)$/);
	return match ? (match[1] as ProviderName) : null;
}
