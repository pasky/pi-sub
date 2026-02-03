/**
 * Settings persistence for sub-bar
 */

import * as path from "node:path";
import type { Settings } from "./settings-types.js";
import { getDefaultSettings, mergeSettings } from "./settings-types.js";
import { getStorage } from "./storage.js";
import { getLegacySettingsPath, getSettingsPath } from "./paths.js";

/**
 * Settings file path
 */
export const SETTINGS_PATH = getSettingsPath();
const LEGACY_SETTINGS_PATH = getLegacySettingsPath();

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
	const loaded = JSON.parse(content) as Partial<Settings>;
	return mergeSettings({
		version: loaded.version,
		display: loaded.display,
		providers: loaded.providers,
		displayThemes: loaded.displayThemes,
		displayUserTheme: loaded.displayUserTheme,
		pinnedProvider: loaded.pinnedProvider,
	} as Partial<Settings>);
}

function loadSettingsFromDisk(settingsPath: string): Settings | null {
	const storage = getStorage();
	if (storage.exists(settingsPath)) {
		const content = storage.readFile(settingsPath);
		if (content) {
			return parseSettings(content);
		}
	}
	return null;
}

function tryLoadSettings(settingsPath: string): Settings | null {
	try {
		return loadSettingsFromDisk(settingsPath);
	} catch (error) {
		console.error(`Failed to load settings from ${settingsPath}:`, error);
		return null;
	}
}

/**
 * Load settings from disk
 */
export function loadSettings(): Settings {
	if (cachedSettings) {
		return cachedSettings;
	}

	const diskSettings = tryLoadSettings(SETTINGS_PATH);
	if (diskSettings) {
		cachedSettings = diskSettings;
		return cachedSettings;
	}

	const legacySettings = tryLoadSettings(LEGACY_SETTINGS_PATH);
	if (legacySettings) {
		const saved = saveSettings(legacySettings);
		if (saved) {
			getStorage().removeFile(LEGACY_SETTINGS_PATH);
		}
		cachedSettings = legacySettings;
		return cachedSettings;
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
			const diskSettings = loadSettingsFromDisk(SETTINGS_PATH);
			if (diskSettings) {
				const displayChanged = JSON.stringify(settings.display) !== JSON.stringify(cachedSettings.display);
				const providersChanged = JSON.stringify(settings.providers) !== JSON.stringify(cachedSettings.providers);
				const themesChanged = JSON.stringify(settings.displayThemes) !== JSON.stringify(cachedSettings.displayThemes);
				const userThemeChanged = JSON.stringify(settings.displayUserTheme) !== JSON.stringify(cachedSettings.displayUserTheme);
				const pinnedChanged = settings.pinnedProvider !== cachedSettings.pinnedProvider;

				next = {
					...diskSettings,
					version: settings.version,
					display: displayChanged ? settings.display : diskSettings.display,
					providers: providersChanged ? settings.providers : diskSettings.providers,
					displayThemes: themesChanged ? settings.displayThemes : diskSettings.displayThemes,
					displayUserTheme: userThemeChanged ? settings.displayUserTheme : diskSettings.displayUserTheme,
					pinnedProvider: pinnedChanged ? settings.pinnedProvider : diskSettings.pinnedProvider,
				};
			}
		}
		const content = JSON.stringify({
			version: next.version,
			display: next.display,
			providers: next.providers,
			displayThemes: next.displayThemes,
			displayUserTheme: next.displayUserTheme,
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
		displayThemes: defaults.displayThemes,
		displayUserTheme: defaults.displayUserTheme,
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
