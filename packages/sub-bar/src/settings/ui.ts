/**
 * Settings UI for sub-bar
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, SelectList, type SettingItem, SettingsList, Spacer, Text } from "@mariozechner/pi-tui";
import type { ProviderName } from "../types.js";
import type { Settings } from "../settings-types.js";
import type { CoreSettings } from "pi-sub-shared";
import { getFallbackCoreSettings } from "../core-settings.js";
import { getDefaultSettings } from "../settings-types.js";
import { getSettings, saveSettings } from "../settings.js";
import { PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";
import { buildProviderSettingsItems, applyProviderSettingsChange } from "../providers/settings.js";
import { buildDisplayLayoutItems, buildDisplayColorItems, buildDisplayBarItems, buildDisplayProviderItems, buildDisplayStatusItems, buildDisplayDividerItems, applyDisplayChange } from "./display.js";
import {
	buildMainMenuItems,
	buildProviderListItems,
	buildDisplayMenuItems,
	getProviderFromCategory,
	type TooltipSelectItem,
} from "./menu.js";
import { buildDisplayPresetItems, buildPresetActionItems, resolveDisplayPresetTarget } from "./presets.js";

/**
 * Settings category
 */
type ProviderCategory = `provider-${ProviderName}`;

type SettingsCategory =
	| "main"
	| "providers"
	| ProviderCategory
	| "display"
	| "display-layout"
	| "display-color"
	| "display-bar"
	| "display-provider"
	| "display-status"
	| "display-divider"
	| "display-presets"
	| "display-presets-action";

/**
 * Show the settings UI
 */
export async function showSettingsUI(
	ctx: ExtensionContext,
	options?: {
		coreSettings?: CoreSettings;
		onSettingsChange?: (settings: Settings) => void | Promise<void>;
		onCoreSettingsChange?: (patch: Partial<CoreSettings>, next: CoreSettings) => void | Promise<void>;
		onDisplayPresetApplied?: (name: string) => void | Promise<void>;
	}
): Promise<Settings> {
	const onSettingsChange = options?.onSettingsChange;
	const onCoreSettingsChange = options?.onCoreSettingsChange;
	let settings = getSettings();
	let coreSettings = options?.coreSettings ?? getFallbackCoreSettings(settings);
	const onDisplayPresetApplied = options?.onDisplayPresetApplied;
	let currentCategory: SettingsCategory = "main";

	return new Promise((resolve) => {
		ctx.ui.custom<Settings>((tui, theme, _kb, done) => {
			let container = new Container();
			let activeList: SelectList | SettingsList | { handleInput: (data: string) => void } | null = null;
			let presetActionTarget: { id?: string; name: string; display: Settings["display"]; deletable: boolean } | null = null;
			let displayPreviewBackup: Settings["display"] | null = null;

			function rebuild(): void {
				container = new Container();
				let tooltipText: Text | null = null;

				const attachTooltip = (items: TooltipSelectItem[], selectList: SelectList): void => {
					if (!items.some((item) => item.tooltip)) return;
					const tooltipComponent = new Text("", 1, 0);
					const setTooltip = (item?: TooltipSelectItem | null) => {
						const tooltip = item?.tooltip?.trim();
						tooltipComponent.setText(tooltip ? theme.fg("dim", tooltip) : "");
					};
					setTooltip(selectList.getSelectedItem() as TooltipSelectItem | null);
					const existingHandler = selectList.onSelectionChange;
					selectList.onSelectionChange = (item) => {
						if (existingHandler) existingHandler(item);
						setTooltip(item as TooltipSelectItem);
						tui.requestRender();
					};
					tooltipText = tooltipComponent;
				};

				// Top border
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

				// Title
				const titles: Record<string, string> = {
					main: "sub-bar Settings",
					providers: "Provider Settings",
					display: "Display Settings",
					"display-layout": "Layout & Content",
					"display-color": "Color Scheme",
					"display-bar": "Bar",
					"display-provider": "Provider",
					"display-status": "Status Indicator",
					"display-divider": "Divider",
					"display-presets": "Load Settings",
					"display-presets-action": "Load Settings",
				};
				const providerCategory = getProviderFromCategory(currentCategory);
				const title = providerCategory
					? `${PROVIDER_DISPLAY_NAMES[providerCategory]} Settings`
					: (titles[currentCategory] ?? "sub-bar Settings");
				container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
				container.addChild(new Spacer(1));

				if (currentCategory === "main") {
					const items = buildMainMenuItems(settings);
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					attachTooltip(items, selectList);
					selectList.onSelect = (item) => {
						if (item.value === "open-core-settings") {
							ctx.ui.notify("Run sub-core:settings to edit core settings", "info");
							saveSettings(settings);
							done(settings);
							return;
						}
						currentCategory = item.value as SettingsCategory;
						rebuild();
						tui.requestRender();
					};
					selectList.onCancel = () => {
						saveSettings(settings);
						done(settings);
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "providers") {
					const items = buildProviderListItems(settings, coreSettings.providers);
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					attachTooltip(items, selectList);
					selectList.onSelect = (item) => {
						if (item.value === "reset-providers") {
							const defaults = getDefaultSettings();
							settings.providers = { ...defaults.providers };
							saveSettings(settings);
							if (onSettingsChange) void onSettingsChange(settings);
							ctx.ui.notify("Provider settings reset to defaults", "info");
							rebuild();
							tui.requestRender();
							return;
						}
						currentCategory = item.value as SettingsCategory;
						rebuild();
						tui.requestRender();
					};
					selectList.onCancel = () => {
						currentCategory = "main";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (providerCategory) {
					const items = buildProviderSettingsItems(settings, providerCategory);
					const coreProvider = coreSettings.providers[providerCategory];
					const enabledValue = coreProvider.enabled === "auto"
						? "auto"
						: coreProvider.enabled === true || coreProvider.enabled === "on"
							? "on"
							: "off";
					items.unshift({
						id: "enabled",
						label: "Enabled",
						currentValue: enabledValue,
						values: ["auto", "on", "off"],
					});
					const handleChange = (id: string, value: string) => {
						if (id === "enabled") {
							const nextEnabled = value === "auto" ? "auto" : value === "on";
							coreProvider.enabled = nextEnabled;
							if (onCoreSettingsChange) {
								const patch = {
									providers: {
										[providerCategory]: { enabled: nextEnabled },
									},
								} as unknown as Partial<CoreSettings>;
								void onCoreSettingsChange(patch, coreSettings);
							}
							return;
						}
						settings = applyProviderSettingsChange(settings, providerCategory, id, value);
						saveSettings(settings);
						if (onSettingsChange) void onSettingsChange(settings);
					};
					const settingsHintText = "↑↓ navigate • Enter/Space to change • Esc to cancel";
					const customTheme = {
						...getSettingsListTheme(),
						hint: (text: string) => {
							if (text.includes("Enter/Space")) {
								return theme.fg("dim", settingsHintText);
							}
							return theme.fg("dim", text);
						},
					};
					const settingsList = new SettingsList(
						items,
						Math.min(items.length + 2, 15),
						customTheme,
						handleChange,
						() => {
							currentCategory = "providers";
							rebuild();
							tui.requestRender();
						}
					);
					activeList = settingsList;
					container.addChild(settingsList);
				} else if (currentCategory === "display") {
					const items = buildDisplayMenuItems();
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					attachTooltip(items, selectList);
					selectList.onSelect = (item) => {
						currentCategory = item.value as SettingsCategory;
						rebuild();
						tui.requestRender();
					};
					selectList.onCancel = () => {
						currentCategory = "main";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "display-presets") {
					if (!displayPreviewBackup) {
						displayPreviewBackup = { ...settings.display };
					}
					const defaults = getDefaultSettings();
					const fallbackUser = settings.displayUserPreset ?? displayPreviewBackup;
					const presetItems = buildDisplayPresetItems(settings);

					const selectList = new SelectList(presetItems, Math.min(presetItems.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					selectList.onSelectionChange = (item) => {
						const target = item
							? resolveDisplayPresetTarget(item.value, settings, defaults, fallbackUser)
							: null;
						if (!target) return;
						settings.display = { ...target.display };
						if (onSettingsChange) void onSettingsChange(settings);
						tui.requestRender();
					};
					attachTooltip(presetItems, selectList);

					selectList.onSelect = (item) => {
						const target = resolveDisplayPresetTarget(item.value, settings, defaults, fallbackUser);
						if (!target) return;
						presetActionTarget = target;
						currentCategory = "display-presets-action";
						rebuild();
						tui.requestRender();
					};
					selectList.onCancel = () => {
						if (displayPreviewBackup) {
							settings.display = { ...displayPreviewBackup };
							if (onSettingsChange) void onSettingsChange(settings);
						}
						displayPreviewBackup = null;
						currentCategory = "display";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "display-presets-action") {
					const target = presetActionTarget;
					if (!target) {
						currentCategory = "display-presets";
						rebuild();
						tui.requestRender();
						return;
					}

					const items = buildPresetActionItems(target);

					const selectList = new SelectList(items, items.length, {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					attachTooltip(items, selectList);

					selectList.onSelect = (item) => {
						if (item.value === "load") {
							const backup = displayPreviewBackup ?? settings.display;
							settings.displayUserPreset = { ...backup };
							settings.display = { ...target.display };
							saveSettings(settings);
							if (onSettingsChange) void onSettingsChange(settings);
							if (onDisplayPresetApplied) void onDisplayPresetApplied(target.name);
							displayPreviewBackup = null;
							presetActionTarget = null;
							currentCategory = "display";
							rebuild();
							tui.requestRender();
							return;
						}
						if (item.value === "delete" && target.deletable && target.id) {
							settings.displayPresets = settings.displayPresets.filter((entry) => entry.id !== target.id);
							saveSettings(settings);
							if (displayPreviewBackup) {
								settings.display = { ...displayPreviewBackup };
								if (onSettingsChange) void onSettingsChange(settings);
							}
							presetActionTarget = null;
							currentCategory = "display-presets";
							rebuild();
							tui.requestRender();
						}
					};
					selectList.onCancel = () => {
						currentCategory = "display-presets";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else {
					// Settings list for category
					let items: SettingItem[];
					let handleChange: (id: string, value: string) => void;
					let backCategory: SettingsCategory = "display";

					switch (currentCategory) {
						case "display-layout":
							items = buildDisplayLayoutItems(settings);
							break;
						case "display-color":
							items = buildDisplayColorItems(settings);
							break;
						case "display-bar":
							items = buildDisplayBarItems(settings);
							break;
						case "display-provider":
							items = buildDisplayProviderItems(settings);
							break;
						case "display-status":
							items = buildDisplayStatusItems(settings);
							break;
						case "display-divider":
							items = buildDisplayDividerItems(settings);
							break;
						default:
							items = [];
					}

					handleChange = (id, value) => {
						settings = applyDisplayChange(settings, id, value);
						saveSettings(settings);
						if (onSettingsChange) void onSettingsChange(settings);
						if (currentCategory === "display-bar" && id === "barType") {
							rebuild();
							tui.requestRender();
							return;
						}
						if (currentCategory === "display-status" && id === "statusIndicatorMode") {
							rebuild();
							tui.requestRender();
						}
					};

					const settingsHintText = "↑↓ navigate • Enter/Space to change • Esc to cancel";
					const customTheme = {
						...getSettingsListTheme(),
						hint: (text: string) => {
							if (text.includes("Enter/Space")) {
								return theme.fg("dim", settingsHintText);
							}
							return theme.fg("dim", text);
						},
					};
					const settingsList = new SettingsList(
						items,
						Math.min(items.length + 2, 15),
						customTheme,
						handleChange,
						() => {
							currentCategory = backCategory;
							rebuild();
							tui.requestRender();
						}
					);
					activeList = settingsList;
					container.addChild(settingsList);
				}

				// Help text
				const usesSettingsList =
					Boolean(providerCategory) ||
					currentCategory === "display-layout" ||
					currentCategory === "display-color" ||
					currentCategory === "display-bar" ||
					currentCategory === "display-provider" ||
					currentCategory === "display-status" ||
					currentCategory === "display-divider";
				if (!usesSettingsList) {
					let helpText: string;
					if (
						currentCategory === "main" ||
						currentCategory === "providers" ||
						currentCategory === "display" ||
						currentCategory === "display-presets" ||
						currentCategory === "display-presets-action"
					) {
						helpText = "↑↓ navigate • Enter/Space select • Esc back";
					} else {
						helpText = "↑↓ navigate • Enter/Space to change • Esc to cancel";
					}
					if (tooltipText) {
						container.addChild(new Spacer(1));
						container.addChild(tooltipText);
					}
					container.addChild(new Spacer(1));
					container.addChild(new Text(theme.fg("dim", helpText), 1, 0));
				}

				// Bottom border
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			}

			rebuild();

			return {
				render(width: number) {
					return container.render(width);
				},
				invalidate() {
					container.invalidate();
				},
				handleInput(data: string) {
					if (data === " ") {
						if (activeList && "handleInput" in activeList && activeList.handleInput) {
							activeList.handleInput("\r");
						}
						tui.requestRender();
						return;
					}
					if (activeList && "handleInput" in activeList && activeList.handleInput) {
						activeList.handleInput(data);
					}
					tui.requestRender();
				},
			};
		}).then(resolve);
	});
}
