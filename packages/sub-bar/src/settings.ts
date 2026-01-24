/**
 * Settings persistence for sub-bar
 */

import * as path from "node:path";
import type { Settings } from "./settings-types.js";
import { getDefaultSettings, mergeSettings } from "./settings-types.js";
import { getStorage } from "./storage.js";
import { getSettingsPath } from "./paths.js";

/**
 * Settings file path
 */
export const SETTINGS_PATH = getSettingsPath();

/**
 * In-memory settings cache
 */
let cachedSettings: Settings | undefined;

/**
 * Ensure the settings directory exists
 */
function ensureSettingsDir(): void {
	const storage = getStorage();
	const dir = path.dirname(SETTINGS_PATH);
	storage.ensureDir(dir);
}

/**
 * Parse settings file contents
 */
function parseSettings(content: string): Settings {
	const loaded = JSON.parse(content) as Partial<Settings> & {
		displayThemes?: Settings["displayPresets"];
	};
	return mergeSettings({
		version: loaded.version,
		display: loaded.display,
		providers: loaded.providers,
		displayPresets: loaded.displayThemes ?? loaded.displayPresets,
		displayUserPreset: loaded.displayUserPreset,
		pinnedProvider: loaded.pinnedProvider,
	} as Partial<Settings>);
}

function loadSettingsFromDisk(): Settings | null {
	const storage = getStorage();
	try {
		if (storage.exists(SETTINGS_PATH)) {
			const content = storage.readFile(SETTINGS_PATH);
			if (content) {
				return parseSettings(content);
			}
		}
	} catch {
		return null;
	}
	return null;
}

/**
 * Load settings from disk
 */
export function loadSettings(): Settings {
	if (cachedSettings) {
		return cachedSettings;
	}

	try {
		const diskSettings = loadSettingsFromDisk();
		if (diskSettings) {
			cachedSettings = diskSettings;
			return cachedSettings;
		}
	} catch (error) {
		console.error(`Failed to load settings from ${SETTINGS_PATH}:`, error);
	}

	// Return defaults if file doesn't exist or failed to load
	cachedSettings = getDefaultSettings();
	return cachedSettings;
}

/**
 * Save settings to disk
 */
export function saveSettings(settings: Settings): boolean {
	const storage = getStorage();
	try {
		ensureSettingsDir();
		let next = settings;
		if (cachedSettings) {
			const diskSettings = loadSettingsFromDisk();
			if (diskSettings) {
				const displayChanged = JSON.stringify(settings.display) !== JSON.stringify(cachedSettings.display);
				const providersChanged = JSON.stringify(settings.providers) !== JSON.stringify(cachedSettings.providers);
				const presetsChanged = JSON.stringify(settings.displayPresets) !== JSON.stringify(cachedSettings.displayPresets);
				const userPresetChanged = JSON.stringify(settings.displayUserPreset) !== JSON.stringify(cachedSettings.displayUserPreset);
				const pinnedChanged = settings.pinnedProvider !== cachedSettings.pinnedProvider;

				next = {
					...diskSettings,
					version: settings.version,
					display: displayChanged ? settings.display : diskSettings.display,
					providers: providersChanged ? settings.providers : diskSettings.providers,
					displayPresets: presetsChanged ? settings.displayPresets : diskSettings.displayPresets,
					displayUserPreset: userPresetChanged ? settings.displayUserPreset : diskSettings.displayUserPreset,
					pinnedProvider: pinnedChanged ? settings.pinnedProvider : diskSettings.pinnedProvider,
				};
			}
		}
		const content = JSON.stringify({
			version: next.version,
			display: next.display,
			providers: next.providers,
			displayThemes: next.displayPresets,
			displayUserPreset: next.displayUserPreset,
			pinnedProvider: next.pinnedProvider,
		}, null, 2);
		storage.writeFile(SETTINGS_PATH, content);
		cachedSettings = next;
		return true;
	} catch (error) {
		console.error(`Failed to save settings to ${SETTINGS_PATH}:`, error);
		return false;
	}
}

/**
 * Reset settings to defaults
 */
export function resetSettings(): Settings {
	const defaults = getDefaultSettings();
	const current = getSettings();
	const next = {
		...current,
		display: defaults.display,
		providers: defaults.providers,
		displayPresets: defaults.displayPresets,
		displayUserPreset: defaults.displayUserPreset,
		pinnedProvider: defaults.pinnedProvider,
		version: defaults.version,
	};
	saveSettings(next);
	return next;
}

/**
 * Get current settings (cached)
 */
export function getSettings(): Settings {
	return loadSettings();
}

/**
 * Clear the settings cache (force reload on next access)
 */
export function clearSettingsCache(): void {
	cachedSettings = undefined;
}
