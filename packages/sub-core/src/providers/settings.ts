/**
 * Provider-specific settings helpers.
 */

import type { SettingItem } from "@mariozechner/pi-tui";
import type { ProviderName } from "../types.js";
import type { Settings, CoreProviderSettings } from "../settings-types.js";

function buildBaseProviderItems(ps: CoreProviderSettings): SettingItem[] {
	return [
		{
			id: "enabled",
			label: "Enabled",
			currentValue: ps.enabled ? "on" : "off",
			values: ["on", "off"],
		},
		{
			id: "fetchStatus",
			label: "Fetch Status",
			currentValue: ps.fetchStatus ? "on" : "off",
			values: ["on", "off"],
		},
	];
}

function applyBaseProviderSetting(ps: CoreProviderSettings, id: string, value: string): boolean {
	switch (id) {
		case "enabled":
			ps.enabled = value === "on";
			return true;
		case "fetchStatus":
			ps.fetchStatus = value === "on";
			return true;
		default:
			return false;
	}
}

/**
 * Build settings items for a specific provider.
 */
export function buildProviderSettingsItems(settings: Settings, provider: ProviderName): SettingItem[] {
	const ps = settings.providers[provider];
	return buildBaseProviderItems(ps);
}

/**
 * Apply a provider settings change in-place.
 */
export function applyProviderSettingsChange(
	settings: Settings,
	provider: ProviderName,
	id: string,
	value: string
): Settings {
	const ps = settings.providers[provider];
	applyBaseProviderSetting(ps, id, value);
	return settings;
}
