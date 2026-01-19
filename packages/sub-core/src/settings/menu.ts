/**
 * Settings menu item builders.
 */

import type { SelectItem } from "@mariozechner/pi-tui";
import type { Settings } from "../settings-types.js";
import type { ProviderName } from "../types.js";
import { PROVIDERS, PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";

export function buildMainMenuItems(settings: Settings): SelectItem[] {
	const enabledCount = Object.values(settings.providers).filter((p) => p.enabled).length;
	const totalCount = Object.keys(settings.providers).length;

	return [
		{
			value: "providers",
			label: "Provider Settings",
			description: `${enabledCount}/${totalCount} enabled`,
		},
		{
			value: "behavior",
			label: "Behavior Settings",
			description: `refresh ${settings.behavior.refreshInterval}s`,
		},
		{
			value: "provider-order",
			label: "Provider Order",
			description: settings.providerOrder.slice(0, 3).join(", ") + "...",
		},
		{
			value: "default-provider",
			label: "Pinned Provider",
			description: settings.defaultProvider ?? "none",
		},
		{
			value: "reset",
			label: "Reset to Defaults",
			description: "restore all settings",
		},
	];
}

export function buildProviderListItems(settings: Settings): SelectItem[] {
	return PROVIDERS.map((provider) => {
		const ps = settings.providers[provider];
		const status = ps.enabled ? "enabled" : "disabled";
		const statusIcon = ps.showStatus ? ", status on" : "";
		return {
			value: `provider-${provider}`,
			label: PROVIDER_DISPLAY_NAMES[provider],
			description: `${status}${statusIcon}`,
		};
	});
}

export function buildProviderOrderItems(settings: Settings): SelectItem[] {
	const activeProviders = settings.providerOrder.filter((provider) => settings.providers[provider].enabled);
	return activeProviders.map((provider, index) => ({
		value: provider,
		label: `${index + 1}. ${PROVIDER_DISPLAY_NAMES[provider]}`,
	}));
}

export function buildDefaultProviderItems(settings: Settings): SelectItem[] {
	const items: SelectItem[] = [
		{
			value: "auto",
			label: settings.defaultProvider === null ? "None (auto-detect) - current" : "None (auto-detect)",
			description: "detect from current model",
		},
	];

	for (const provider of settings.providerOrder) {
		if (settings.providers[provider].enabled) {
			items.push({
				value: provider,
				label:
					settings.defaultProvider === provider
						? `${PROVIDER_DISPLAY_NAMES[provider]} (current)`
						: PROVIDER_DISPLAY_NAMES[provider],
				description: `pin ${provider}`,
			});
		}
	}

	return items;
}
