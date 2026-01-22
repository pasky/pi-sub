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
 * Load settings from disk
 */
export function loadSettings(): Settings {
	if (cachedSettings) {
		return cachedSettings;
	}

	const storage = getStorage();
	try {
		if (storage.exists(SETTINGS_PATH)) {
			const content = storage.readFile(SETTINGS_PATH);
			if (content) {
				const loaded = JSON.parse(content) as Partial<Settings> & {
					displayThemes?: Settings["displayPresets"];
				};
				cachedSettings = mergeSettings({
					version: loaded.version,
					display: loaded.display,
					providers: loaded.providers,
					displayPresets: loaded.displayThemes ?? loaded.displayPresets,
					displayUserPreset: loaded.displayUserPreset,
				} as Partial<Settings>);
				return cachedSettings;
			}
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
		const content = JSON.stringify({
			version: settings.version,
			display: settings.display,
			providers: settings.providers,
			displayThemes: settings.displayPresets,
			displayUserPreset: settings.displayUserPreset,
		}, null, 2);
		storage.writeFile(SETTINGS_PATH, content);
		cachedSettings = settings;
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
