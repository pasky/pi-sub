/**
 * Shared path helpers for sub-core storage.
 */

import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SETTINGS_FILE_NAME = "pi-sub-core-settings.json";

export function getExtensionDir(): string {
	return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function getCachePath(): string {
	return join(getExtensionDir(), "cache.json");
}

export function getCacheLockPath(): string {
	return join(getExtensionDir(), "cache.lock");
}

export function getSettingsPath(): string {
	return join(getAgentDir(), SETTINGS_FILE_NAME);
}

export function getLegacySettingsPath(): string {
	return join(getExtensionDir(), "settings.json");
}
