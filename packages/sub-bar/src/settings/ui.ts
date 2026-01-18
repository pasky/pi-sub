/**
 * Settings UI for sub-bar
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, type SelectItem, SelectList, type SettingItem, SettingsList, Spacer, Text } from "@mariozechner/pi-tui";
import type { ProviderName } from "../types.js";
import type { Settings } from "../settings-types.js";
import { getSettings, saveSettings, resetSettings } from "../settings.js";
import { PROVIDER_DISPLAY_NAMES } from "../providers/metadata.js";
import { buildProviderSettingsItems, applyProviderSettingsChange } from "../providers/settings.js";
import { buildDisplayItems, applyDisplayChange } from "./display.js";
import { buildBehaviorItems, applyBehaviorChange } from "./behavior.js";
import {
	buildDefaultProviderItems,
	buildMainMenuItems,
	buildProviderListItems,
	buildProviderOrderItems,
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
	| "behavior"
	| "provider-order";


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
	let reorderingIndex: number | null = null;

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
				} else if (currentCategory === "provider-order") {
					const items = buildProviderOrderItems(settings);
					const selectList = new SelectList(items, Math.min(items.length, 10), {
						selectedPrefix: (t: string) => reorderingIndex !== null ? theme.fg("warning", t) : theme.fg("accent", t),
						selectedText: (t: string) => reorderingIndex !== null ? theme.fg("warning", t) : theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					selectList.onSelect = (item) => {
						const idx = settings.providerOrder.indexOf(item.value as ProviderName);
						if (reorderingIndex === null) {
							reorderingIndex = idx;
							rebuild();
							tui.requestRender();
						} else {
							// Swap positions
							const temp = settings.providerOrder[reorderingIndex];
							settings.providerOrder[reorderingIndex] = settings.providerOrder[idx];
							settings.providerOrder[idx] = temp;
							reorderingIndex = null;
							saveSettings(settings);
							if (onSettingsChange) void onSettingsChange(settings);
							rebuild();
							tui.requestRender();
						}
					};
					selectList.onCancel = () => {
						if (reorderingIndex !== null) {
							reorderingIndex = null;
							rebuild();
							tui.requestRender();
						} else {
							currentCategory = "main";
							rebuild();
							tui.requestRender();
						}
					};
					activeList = selectList;
					container.addChild(selectList);

					if (reorderingIndex !== null) {
						container.addChild(new Text(theme.fg("warning", "Select position to swap with, or Esc to cancel"), 1, 0));
					}
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
							case "display":
								items = buildDisplayItems(settings);
								handleChange = (id, value) => {
									settings = applyDisplayChange(settings, id, value);
									saveSettings(settings);
									if (onSettingsChange) void onSettingsChange(settings);
								};
								break;
							case "behavior":
								items = buildBehaviorItems(settings);
								handleChange = (id, value) => {
									settings = applyBehaviorChange(settings, id, value);
									saveSettings(settings);
									// Don't refresh for auto-refresh interval changes
									if (id !== "refreshInterval" && onSettingsChange) {
										void onSettingsChange(settings);
									}
								};
								break;
							default:
								items = [];
								handleChange = () => {};
						}
					}

					// Use custom theme with no hint text (we show it separately below)
					const customTheme = {
						...getSettingsListTheme(),
						hint: () => "", // Disable built-in hint
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
				let helpText: string;
				if (currentCategory === "main" || currentCategory === "providers") {
					helpText = "↑↓ navigate • Enter select • Esc back";
				} else if (currentCategory === "provider-order") {
					helpText = reorderingIndex !== null
						? "Enter swap position • Esc cancel"
						: "Enter select to move • Esc back";
				} else {
					helpText = "↑↓ navigate • Enter/Space to change • Esc to cancel";
				}
				container.addChild(new Spacer(1));
				container.addChild(new Text(theme.fg("dim", helpText), 1, 0));

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
				container.addChild(new Text(theme.fg("dim", "↑↓ navigate • Enter select • Esc back"), 1, 0));
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
					if (activeList) {
						if ("handleInput" in activeList && activeList.handleInput) {
							activeList.handleInput(data);
						}
					}
					tui.requestRender();
				},
			};
		}).then(resolve);
	});
}
