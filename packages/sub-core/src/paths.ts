/**
 * Shared path helpers for sub-core storage.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
	return join(getExtensionDir(), "settings.json");
}
