/**
 * Settings UI for sub-bar
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { DynamicBorder, getSettingsListTheme } from "@mariozechner/pi-coding-agent";
import { Container, Input, SelectList, Spacer, Text } from "@mariozechner/pi-tui";
import { SettingsList, type SettingItem, CUSTOM_OPTION } from "../ui/settings-list.js";
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
	buildDisplayThemeMenuItems,
	getProviderFromCategory,
	type TooltipSelectItem,
} from "./menu.js";
import {
	buildDisplayPresetItems,
	buildPresetActionItems,
	resolveDisplayPresetTarget,
	saveDisplayPreset,
	upsertDisplayPreset,
} from "./presets.js";
import { buildDisplayShareString, decodeDisplayShareString } from "../share.js";

/**
 * Settings category
 */
type ProviderCategory = `provider-${ProviderName}`;

type SettingsCategory =
	| "main"
	| "providers"
	| ProviderCategory
	| "display"
	| "display-theme"
	| "display-theme-save"
	| "display-theme-manage"
	| "display-theme-action"
	| "display-theme-import"
	| "display-layout"
	| "display-color"
	| "display-bar"
	| "display-provider"
	| "display-status"
	| "display-divider";

/**
 * Show the settings UI
 */
export async function showSettingsUI(
	ctx: ExtensionContext,
	options?: {
		coreSettings?: CoreSettings;
		onSettingsChange?: (settings: Settings) => void | Promise<void>;
		onCoreSettingsChange?: (patch: Partial<CoreSettings>, next: CoreSettings) => void | Promise<void>;
		onDisplayPresetApplied?: (name: string, options?: { source?: "manual" }) => void | Promise<void>;
		onDisplayThemeShared?: (name: string, shareString: string) => void | Promise<void>;
	}
): Promise<Settings> {
	const onSettingsChange = options?.onSettingsChange;
	const onCoreSettingsChange = options?.onCoreSettingsChange;
	let settings = getSettings();
	let coreSettings = options?.coreSettings ?? getFallbackCoreSettings(settings);
	const onDisplayPresetApplied = options?.onDisplayPresetApplied;
	const onDisplayThemeShared = options?.onDisplayThemeShared;
	let currentCategory: SettingsCategory = "main";

	return new Promise((resolve) => {
		ctx.ui.custom<Settings>((tui, theme, _kb, done) => {
			let container = new Container();
			let activeList: SelectList | SettingsList | { handleInput: (data: string) => void } | null = null;
			let presetActionTarget: { id?: string; name: string; display: Settings["display"]; deletable: boolean } | null = null;
			let displayPreviewBackup: Settings["display"] | null = null;
			const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

			const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

			const buildInputSubmenu = (
				label: string,
				parseValue: (value: string) => string | null,
				formatInitial?: (value: string) => string,
			) => {
				return (currentValue: string, done: (selectedValue?: string) => void) => {
					const input = new Input();
					input.focused = true;
					input.setValue(formatInitial ? formatInitial(currentValue) : currentValue);
					input.onSubmit = (value) => {
						const parsed = parseValue(value);
						if (!parsed) return;
						done(parsed);
					};
					input.onEscape = () => {
						done();
					};

					const container = new Container();
					container.addChild(new Text(theme.fg("muted", label), 1, 0));
					container.addChild(new Spacer(1));
					container.addChild(input);

					return {
						render: (width: number) => container.render(width),
						invalidate: () => container.invalidate(),
						handleInput: (data: string) => input.handleInput(data),
					};
				};
			};

			const parseInteger = (raw: string, min: number, max: number): string | null => {
				const trimmed = raw.trim().replace(/%$/, "");
				if (!trimmed) {
					ctx.ui.notify("Enter a value", "warning");
					return null;
				}
				const parsed = Number.parseInt(trimmed, 10);
				if (Number.isNaN(parsed)) {
					ctx.ui.notify("Enter a number", "warning");
					return null;
				}
				return String(clamp(parsed, min, max));
			};

			const parseBarWidth = (raw: string): string | null => {
				const trimmed = raw.trim().toLowerCase();
				if (!trimmed) {
					ctx.ui.notify("Enter a value", "warning");
					return null;
				}
				if (trimmed === "fill") return "fill";
				return parseInteger(trimmed, 0, 100);
			};

			const parseDividerBlanks = (raw: string): string | null => {
				const trimmed = raw.trim().toLowerCase();
				if (!trimmed) {
					ctx.ui.notify("Enter a value", "warning");
					return null;
				}
				if (trimmed === "fill") return "fill";
				return parseInteger(trimmed, 0, 100);
			};

			const parseDividerCharacter = (raw: string): string | null => {
				const trimmed = raw.trim();
				if (!trimmed) {
					ctx.ui.notify("Enter a character", "warning");
					return null;
				}
				const normalized = trimmed.toLowerCase();
				if (normalized === "none" || normalized === "blank") {
					return normalized;
				}
				const iterator = segmenter.segment(trimmed)[Symbol.iterator]();
				const first = iterator.next().value?.segment ?? trimmed[0];
				return first;
			};

			const parseBarCharacter = (raw: string): string | null => {
				const trimmed = raw.trim();
				if (!trimmed) {
					ctx.ui.notify("Enter a character", "warning");
					return null;
				}
				const normalized = trimmed.toLowerCase();
				if (["light", "heavy", "double", "block"].includes(normalized)) {
					return normalized;
				}
				const iterator = segmenter.segment(trimmed)[Symbol.iterator]();
				const first = iterator.next().value?.segment ?? trimmed[0];
				return first;
			};

			const parseProviderLabel = (raw: string): string | null => {
				const trimmed = raw.trim();
				if (!trimmed) {
					ctx.ui.notify("Enter a label", "warning");
					return null;
				}
				const normalized = trimmed.toLowerCase();
				if (["none", "plan", "subscription", "sub"].includes(normalized)) {
					return normalized;
				}
				return trimmed;
			};

			const attachCustomInputs = (
				items: SettingItem[],
				handlers: Record<string, ReturnType<typeof buildInputSubmenu>>,
			) => {
				for (const item of items) {
					if (!item.values || !item.values.includes(CUSTOM_OPTION)) continue;
					const handler = handlers[item.id];
					if (!handler) continue;
					item.submenu = handler;
				}
			};

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
					"display-theme": "Theme",
					"display-theme-save": "Save Theme",
					"display-theme-manage": "Manage Themes",
					"display-theme-action": "Manage Theme",
					"display-theme-import": "Import Theme",
					"display-layout": "Layout & Content",
					"display-color": "Color Scheme",
					"display-bar": "Bar",
					"display-provider": "Provider",
					"display-status": "Status Indicator",
					"display-divider": "Divider",
				};
				const providerCategory = getProviderFromCategory(currentCategory);
				let title = providerCategory
					? `${PROVIDER_DISPLAY_NAMES[providerCategory]} Settings`
					: (titles[currentCategory] ?? "sub-bar Settings");
				if (currentCategory === "display-theme-action" && presetActionTarget) {
					title = `Manage ${presetActionTarget.name}`;
				}
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
					const settingsHintText = "↓ navigate • ←/→ change • Enter/Space to change • Esc to cancel";
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
				} else if (currentCategory === "display-theme") {
					const items = buildDisplayThemeMenuItems();
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
						currentCategory = "display";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "display-theme-save") {
					const input = new Input();
					input.focused = true;
					const titleText = new Text(theme.fg("muted", "Theme name"), 1, 0);
					input.onSubmit = (value) => {
						const trimmed = value.trim();
						if (!trimmed) {
							ctx.ui.notify("Enter a theme name", "warning");
							return;
						}
						settings = saveDisplayPreset(settings, trimmed);
						saveSettings(settings);
						if (onSettingsChange) void onSettingsChange(settings);
						ctx.ui.notify(`Theme ${trimmed} saved`, "info");
						currentCategory = "display-theme";
						rebuild();
						tui.requestRender();
					};
					input.onEscape = () => {
						currentCategory = "display-theme";
						rebuild();
						tui.requestRender();
					};
					container.addChild(titleText);
					container.addChild(new Spacer(1));
					container.addChild(input);
					activeList = input;
				} else if (currentCategory === "display-theme-manage") {
					if (!displayPreviewBackup) {
						displayPreviewBackup = { ...settings.display };
					}
					const defaults = getDefaultSettings();
					const fallbackUser = settings.displayUserPreset ?? displayPreviewBackup;
					const presetItems = buildDisplayPresetItems(settings);
					const manageItems: TooltipSelectItem[] = [
						{
							value: "import",
							label: "Import theme",
							description: "from share string",
							tooltip: "Import a shared theme string.",
						},
						...presetItems,
					];

					const selectList = new SelectList(manageItems, Math.min(manageItems.length, 10), {
						selectedPrefix: (t: string) => theme.fg("accent", t),
						selectedText: (t: string) => theme.fg("accent", t),
						description: (t: string) => theme.fg("muted", t),
						scrollInfo: (t: string) => theme.fg("dim", t),
						noMatch: (t: string) => theme.fg("warning", t),
					});
					selectList.onSelectionChange = (item) => {
						if (!item || item.value === "import") return;
						const target = resolveDisplayPresetTarget(item.value, settings, defaults, fallbackUser);
						if (!target) return;
						settings.display = { ...target.display };
						if (onSettingsChange) void onSettingsChange(settings);
						tui.requestRender();
					};
					attachTooltip(manageItems, selectList);

					selectList.onSelect = (item) => {
						if (item.value === "import") {
							if (displayPreviewBackup) {
								settings.display = { ...displayPreviewBackup };
								if (onSettingsChange) void onSettingsChange(settings);
							}
							currentCategory = "display-theme-import";
							rebuild();
							tui.requestRender();
							return;
						}
						const target = resolveDisplayPresetTarget(item.value, settings, defaults, fallbackUser);
						if (!target) return;
						presetActionTarget = target;
						currentCategory = "display-theme-action";
						rebuild();
						tui.requestRender();
					};
					selectList.onCancel = () => {
						if (displayPreviewBackup) {
							settings.display = { ...displayPreviewBackup };
							if (onSettingsChange) void onSettingsChange(settings);
						}
						displayPreviewBackup = null;
						currentCategory = "display-theme";
						rebuild();
						tui.requestRender();
					};
					activeList = selectList;
					container.addChild(selectList);
				} else if (currentCategory === "display-theme-import") {
					const input = new Input();
					input.focused = true;
					const titleText = new Text(theme.fg("muted", "Share string"), 1, 0);
					input.onSubmit = (value) => {
						const trimmed = value.trim();
						if (!trimmed) {
							ctx.ui.notify("Enter a share string", "warning");
							return;
						}
						const decoded = decodeDisplayShareString(trimmed);
						if (!decoded) {
							ctx.ui.notify("Invalid theme share string", "error");
							return;
						}
						settings = upsertDisplayPreset(settings, decoded.name, decoded.display, "imported");
						saveSettings(settings);
						if (onSettingsChange) void onSettingsChange(settings);
						const message = decoded.isNewerVersion
							? `Imported ${decoded.name} (newer version, some fields may be ignored)`
							: `Imported ${decoded.name}`;
						ctx.ui.notify(message, decoded.isNewerVersion ? "warning" : "info");
						currentCategory = "display-theme-manage";
						rebuild();
						tui.requestRender();
					};
					input.onEscape = () => {
						currentCategory = "display-theme-manage";
						rebuild();
						tui.requestRender();
					};
					container.addChild(titleText);
					container.addChild(new Spacer(1));
					container.addChild(input);
					activeList = input;
				} else if (currentCategory === "display-theme-action") {
					const target = presetActionTarget;
					if (!target) {
						currentCategory = "display-theme-manage";
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
							if (onDisplayPresetApplied) void onDisplayPresetApplied(target.name, { source: "manual" });
							displayPreviewBackup = null;
							presetActionTarget = null;
							currentCategory = "display-theme";
							rebuild();
							tui.requestRender();
							return;
						}
						if (item.value === "share") {
							const shareString = buildDisplayShareString(target.name, target.display);
							if (onDisplayThemeShared) {
								void onDisplayThemeShared(target.name, shareString);
								ctx.ui.notify("Theme share string posted to chat", "info");
							} else {
								ctx.ui.notify(shareString, "info");
							}
							presetActionTarget = null;
							currentCategory = "display-theme-manage";
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
							currentCategory = "display-theme-manage";
							rebuild();
							tui.requestRender();
						}
					};
					selectList.onCancel = () => {
						currentCategory = "display-theme-manage";
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

					const customHandlers: Record<string, ReturnType<typeof buildInputSubmenu>> = {};
					if (currentCategory === "display-layout") {
						customHandlers.paddingX = buildInputSubmenu("Padding X", (value) => parseInteger(value, 0, 100));
					}
					if (currentCategory === "display-color") {
						customHandlers.errorThreshold = buildInputSubmenu("Error Threshold (%)", (value) => parseInteger(value, 0, 100));
						customHandlers.warningThreshold = buildInputSubmenu("Warning Threshold (%)", (value) => parseInteger(value, 0, 100));
						customHandlers.successThreshold = buildInputSubmenu("Success Threshold (%)", (value) => parseInteger(value, 0, 100));
					}
					if (currentCategory === "display-bar") {
						customHandlers.barWidth = buildInputSubmenu("Bar Width", parseBarWidth);
						customHandlers.barCharacter = buildInputSubmenu("Bar Character", parseBarCharacter);
					}
					if (currentCategory === "display-provider") {
						customHandlers.providerLabel = buildInputSubmenu("Provider Label", parseProviderLabel);
					}
					if (currentCategory === "display-divider") {
						customHandlers.dividerCharacter = buildInputSubmenu("Divider Character", parseDividerCharacter);
						customHandlers.dividerBlanks = buildInputSubmenu("Divider Blanks", parseDividerBlanks);
					}
					attachCustomInputs(items, customHandlers);

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

					const settingsHintText = "↓ navigate • ←/→ change • Enter/Space to change • Esc to cancel";
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
					if (currentCategory === "display-theme-save") {
						helpText = "Type name • Enter to save • Esc back";
					} else if (currentCategory === "display-theme-import") {
						helpText = "Paste share string • Enter to import • Esc back";
					} else if (
						currentCategory === "main" ||
						currentCategory === "providers" ||
						currentCategory === "display" ||
						currentCategory === "display-theme" ||
						currentCategory === "display-theme-manage" ||
						currentCategory === "display-theme-action"
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
