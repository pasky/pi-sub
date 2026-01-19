/**
 * Settings UI for sub-bar
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, type SettingItem, SettingsList, Spacer, Text } from "@mariozechner/pi-tui";
import type { ProviderName } from "../types.js";
import type { Settings } from "../settings-types.js";
import { getDefaultSettings } from "../settings-types.js";
import { getSettings, saveSettings, resetSettings } from "../settings.js";
import { PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";
import { buildProviderSettingsItems, applyProviderSettingsChange } from "../providers/settings.js";
import { buildDisplayLayoutItems, buildDisplayColorItems, buildDisplayBarItems, buildDisplayProviderItems, buildDisplayDividerItems, applyDisplayChange } from "./display.js";
import { buildBehaviorItems, applyBehaviorChange } from "./behavior.js";
import {
	buildDefaultProviderItems,
	buildMainMenuItems,
	buildProviderListItems,
	buildProviderOrderItems,
	buildDisplayMenuItems,
	buildDisplayPresetItems,
} from "./menu.js";

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
	| "display-divider"
	| "display-presets"
	| "behavior"
	| "provider-order";

function buildMinimalDisplaySettings(defaultDisplay: Settings["display"]): Settings["display"] {
	return {
		...defaultDisplay,
		alignment: "left",
		widgetWrapping: "truncate",
		resetTimePosition: "off",
		showUsageLabels: false,
		paddingX: 0,
		widgetPlacement: "aboveEditor",
		barStyle: "bar",
		barType: "horizontal-bar",
		barWidth: 4,
		brailleFillEmpty: false,
		showProviderName: false,
		providerLabel: "none",
		providerLabelColon: false,
		baseTextColor: "dim",
		dividerCharacter: "none",
		dividerBlanks: 0,
		showTopDivider: false,
		showBottomDivider: false,
	};
}


/**
 * Extract provider name from category
 */
function getProviderFromCategory(category: SettingsCategory): ProviderName | null {
	const match = category.match(/^provider-(\w+)$/);
	if (match && match[1] !== "order") {
		return match[1] as ProviderName;
	}
	return null;
}

/**
 * Show the settings UI
 */
export async function showSettingsUI(
	ctx: ExtensionContext,
	onSettingsChange?: (settings: Settings) => void | Promise<void>
): Promise<Settings> {
	let settings = getSettings();
	let currentCategory: SettingsCategory = "main";
	let providerOrderSelectedIndex = 0;
	let providerOrderReordering = false;
	let suppressProviderOrderChange = false;

	return new Promise((resolve) => {
		ctx.ui.custom<Settings>((tui, theme, _kb, done) => {
			let container = new Container();
			let activeList: SelectList | SettingsList | null = null;

			function rebuild(): void {
				container = new Container();

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
					"display-divider": "Divider",
					"display-presets": "Load Presets",
					behavior: "Behavior Settings",
					"provider-order": "Provider Order",
				};
				const providerCategory = getProviderFromCategory(currentCategory);
				const title = providerCategory
					? `${PROVIDER_DISPLAY_NAMES[providerCategory]} Settings`
					: titles[currentCategory];
				container.addChild(new Text(theme.fg("accent", theme.bold(title)), 1, 0));
				container.addChild(new Spacer(1));

				if (currentCategory === "main") {
					const items = buildMainMenuItems(settings);
					const selectList = new SelectList(items, Math.min(items.length, 12), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					selectList.onSelect = (item) => {
						if (item.value === "reset") {
							settings = resetSettings();
							if (onSettingsChange) void onSettingsChange(settings);
							ctx.ui.notify("Settings reset to defaults", "info");
							rebuild();
							tui.requestRender();
						} else if (item.value === "default-provider") {
							showDefaultProviderSelector();
						} else {
							currentCategory = item.value as SettingsCategory;
							rebuild();
							tui.requestRender();
						}
					};
					selectList.onCancel = () => {
						saveSettings(settings);
						done(settings);
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "providers") {
					// Provider list menu
					const items = buildProviderListItems(settings);
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
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
				} else if (currentCategory === "display") {
					const items = buildDisplayMenuItems();
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
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
					const items = buildDisplayPresetItems();
					const selectList = new SelectList(items, Math.min(items.length, 6), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					selectList.onSelect = (item) => {
						const defaults = getDefaultSettings();
						if (item.value === "default") {
							settings.display = { ...defaults.display };
							ctx.ui.notify("Display settings reset to defaults", "info");
						} else if (item.value === "minimal") {
							settings.display = buildMinimalDisplaySettings(defaults.display);
							ctx.ui.notify("Display settings set to minimal", "info");
						}
						saveSettings(settings);
						if (onSettingsChange) void onSettingsChange(settings);
						currentCategory = "display";
						rebuild();
						tui.requestRender();
					};
					selectList.onCancel = () => {
						currentCategory = "display";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "provider-order") {
					const items = buildProviderOrderItems(settings);
					const isReordering = providerOrderReordering;
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => isReordering ? theme.fg("warning", t) : theme.fg("accent", t),
						selectedText: (t: string) => isReordering ? theme.fg("warning", t) : theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});

					if (items.length > 0) {
						suppressProviderOrderChange = true;
						providerOrderSelectedIndex = Math.min(providerOrderSelectedIndex, items.length - 1);
						selectList.setSelectedIndex(providerOrderSelectedIndex);
						suppressProviderOrderChange = false;
					}

					selectList.onSelectionChange = (item) => {
						if (suppressProviderOrderChange) return;
						const newIndex = items.findIndex((listItem) => listItem.value === item.value);
						if (newIndex === -1) return;

						if (!providerOrderReordering) {
							providerOrderSelectedIndex = newIndex;
							return;
						}

						const activeProviders = settings.providerOrder.filter((provider) => settings.providers[provider].enabled);
						const oldIndex = providerOrderSelectedIndex;
						if (newIndex === oldIndex) return;
						if (oldIndex < 0 || oldIndex >= activeProviders.length) return;

						const provider = activeProviders[oldIndex];
						const updatedActive = [...activeProviders];
						updatedActive.splice(oldIndex, 1);
						updatedActive.splice(newIndex, 0, provider);

						let activeIndex = 0;
						settings.providerOrder = settings.providerOrder.map((existing) => {
							if (!settings.providers[existing].enabled) return existing;
							const next = updatedActive[activeIndex];
							activeIndex += 1;
							return next;
						});

						providerOrderSelectedIndex = newIndex;
						saveSettings(settings);
						if (onSettingsChange) void onSettingsChange(settings);
						rebuild();
						tui.requestRender();
					};

					selectList.onSelect = () => {
						if (items.length === 0) return;
						providerOrderReordering = !providerOrderReordering;
						rebuild();
						tui.requestRender();
					};

					selectList.onCancel = () => {
						if (providerOrderReordering) {
							providerOrderReordering = false;
							rebuild();
							tui.requestRender();
							return;
						}
						currentCategory = "main";
						rebuild();
						tui.requestRender();
					};

					activeList = selectList;
					container.addChild(selectList);
				} else {
					// Settings list for category
					let items: SettingItem[];
					let handleChange: (id: string, value: string) => void;
					let backCategory: SettingsCategory = "main";

					const provider = getProviderFromCategory(currentCategory);
					if (provider) {
						// Provider-specific settings
						items = buildProviderSettingsItems(settings, provider);
						handleChange = (id, value) => {
							settings = applyProviderSettingsChange(settings, provider, id, value);
							saveSettings(settings);
							if (onSettingsChange) void onSettingsChange(settings);
						};
						backCategory = "providers";
					} else {
						switch (currentCategory) {
							case "display-layout":
								items = buildDisplayLayoutItems(settings);
								backCategory = "display";
								break;
							case "display-color":
								items = buildDisplayColorItems(settings);
								backCategory = "display";
								break;
							case "display-bar":
								items = buildDisplayBarItems(settings);
								backCategory = "display";
								break;
							case "display-provider":
								items = buildDisplayProviderItems(settings);
								backCategory = "display";
								break;
							case "display-divider":
								items = buildDisplayDividerItems(settings);
								backCategory = "display";
								break;
							case "behavior":
								items = buildBehaviorItems(settings);
								break;
							default:
								items = [];
						}

						handleChange = (id, value) => {
							if (currentCategory === "behavior") {
								settings = applyBehaviorChange(settings, id, value);
								saveSettings(settings);
								if (id !== "refreshInterval" && onSettingsChange) {
									void onSettingsChange(settings);
								}
								return;
							}
							settings = applyDisplayChange(settings, id, value);
							saveSettings(settings);
							if (onSettingsChange) void onSettingsChange(settings);
							if (currentCategory === "display-bar" && id === "barType") {
								rebuild();
								tui.requestRender();
							}
						};
					}

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
					currentCategory === "behavior" ||
					currentCategory === "display-layout" ||
					currentCategory === "display-color" ||
					currentCategory === "display-bar" ||
					currentCategory === "display-provider" ||
					currentCategory === "display-divider" ||
					getProviderFromCategory(currentCategory) !== null;
				if (!usesSettingsList) {
					let helpText: string;
					if (
						currentCategory === "main" ||
						currentCategory === "providers" ||
						currentCategory === "display" ||
						currentCategory === "display-presets"
					) {
						helpText = "↑↓ navigate • Enter/Space select • Esc back";
					} else if (currentCategory === "provider-order") {
						helpText = providerOrderReordering
							? "↑↓ move provider • Esc back"
							: "↑↓ navigate • Enter/Space select • Esc back";
					} else {
						helpText = "↑↓ navigate • Enter/Space to change • Esc to cancel";
					}
					container.addChild(new Spacer(1));
					container.addChild(new Text(theme.fg("dim", helpText), 1, 0));
				}

				// Bottom border
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
			}

			function showDefaultProviderSelector(): void {
				const items = buildDefaultProviderItems(settings);
				const selectList = new SelectList(items, Math.min(items.length, 10), {
					selectedPrefix: (t: string) => theme.fg("accent", t),
					selectedText: (t: string) => theme.fg("accent", t),
					description: (t: string) => theme.fg("muted", t),
					scrollInfo: (t: string) => theme.fg("dim", t),
					noMatch: (t: string) => theme.fg("warning", t),
				});

				container = new Container();
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));
				container.addChild(new Text(theme.fg("accent", theme.bold("Pinned Provider")), 1, 0));
				container.addChild(new Spacer(1));
				container.addChild(selectList);
				container.addChild(new Spacer(1));
				container.addChild(new Text(theme.fg("dim", "↑↓ navigate • Enter/Space select • Esc back"), 1, 0));
				container.addChild(new DynamicBorder((s: string) => theme.fg("accent", s)));

				selectList.onSelect = (item) => {
					settings.defaultProvider = item.value === "auto" ? null : item.value as ProviderName;
					saveSettings(settings);
					if (onSettingsChange) void onSettingsChange(settings);
					ctx.ui.notify(`Pinned provider: ${item.value === "auto" ? "none" : item.value}`, "info");
					rebuild();
					tui.requestRender();
				};
				selectList.onCancel = () => {
					rebuild();
					tui.requestRender();
				};
				activeList = selectList;
				tui.requestRender();
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
						if (currentCategory === "provider-order") {
							providerOrderReordering = !providerOrderReordering;
							rebuild();
							tui.requestRender();
							return;
						}
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
