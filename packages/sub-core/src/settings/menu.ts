/**
 * Settings menu item builders.
 */

import type { SelectItem } from "@mariozechner/pi-tui";
import type { Settings } from "../settings-types.js";
import type { ProviderName } from "../types.js";
import { PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";

export type TooltipSelectItem = SelectItem & { tooltip?: string };

export function buildMainMenuItems(settings: Settings): TooltipSelectItem[] {
	const enabledCount = Object.values(settings.providers).filter((p) => p.enabled !== "off" && p.enabled !== false).length;
	const totalCount = Object.keys(settings.providers).length;

	return [
		{
			value: "providers",
			label: "Provider Settings",
			description: `${enabledCount}/${totalCount} enabled`,
			tooltip: "Enable providers, toggle status fetch, and adjust provider settings.",
		},
		{
			value: "behavior",
			label: "Behavior Settings",
			description: `refresh ${settings.behavior.refreshInterval}s`,
			tooltip: "Control refresh interval and auto-refresh triggers.",
		},
		{
			value: "provider-order",
			label: "Provider Order",
			description: settings.providerOrder.slice(0, 3).join(", ") + "...",
			tooltip: "Reorder providers for cycling and auto-selection.",
		},
		{
			value: "default-provider",
			label: "Pinned Provider",
			description: settings.defaultProvider ?? "none",
			tooltip: "Pin a provider or leave auto-detect enabled.",
		},
		{
			value: "reset",
			label: "Reset to Defaults",
			description: "restore all settings",
			tooltip: "Restore all sub-core settings to defaults.",
		},
	];
}

export function buildProviderListItems(settings: Settings): TooltipSelectItem[] {
	return settings.providerOrder.map((provider) => {
		const ps = settings.providers[provider];
		const enabledValue = ps.enabled === "auto" ? "auto" : ps.enabled === true || ps.enabled === "on" ? "on" : "off";
		const statusIcon = ps.fetchStatus ? ", status fetch on" : "";
		return {
			value: `provider-${provider}`,
			label: PROVIDER_DISPLAY_NAMES[provider],
			description: `enabled ${enabledValue}${statusIcon}`,
			tooltip: `Enable ${PROVIDER_DISPLAY_NAMES[provider]} and configure status fetching.`,
		};
	});
}

export function buildProviderOrderItems(settings: Settings): TooltipSelectItem[] {
	const activeProviders = settings.providerOrder.filter((provider) => {
		const enabled = settings.providers[provider].enabled;
		return enabled !== "off" && enabled !== false;
	});
	return activeProviders.map((provider, index) => ({
		value: provider,
		label: `${index + 1}. ${PROVIDER_DISPLAY_NAMES[provider]}`,
		tooltip: "Reorder enabled providers (Space to toggle move mode).",
	}));
}

export function buildDefaultProviderItems(settings: Settings): TooltipSelectItem[] {
	const items: TooltipSelectItem[] = [
		{
			value: "auto",
			label: settings.defaultProvider === null ? "None (auto-detect) - current" : "None (auto-detect)",
			description: "detect from current model",
			tooltip: "Use the current model to auto-detect the provider.",
		},
	];

	for (const provider of settings.providerOrder) {
		const enabled = settings.providers[provider].enabled;
		if (enabled !== "off" && enabled !== false) {
			items.push({
				value: provider,
				label:
					settings.defaultProvider === provider
						? `${PROVIDER_DISPLAY_NAMES[provider]} (current)`
						: PROVIDER_DISPLAY_NAMES[provider],
				description: `pin ${provider}`,
				tooltip: `Pin ${PROVIDER_DISPLAY_NAMES[provider]} as the default provider.`,
			});
		}
	}

	return items;
}
