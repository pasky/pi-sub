/**
 * Shared path helpers for sub-core storage.
 */

import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CACHE_FILE_NAME = "pi-sub-core-cache.json";
const CACHE_LOCK_FILE_NAME = "pi-sub-core-cache.lock";

export function getExtensionDir(): string {
	return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function getCachePath(): string {
	return join(getAgentDir(), CACHE_FILE_NAME);
}

export function getCacheLockPath(): string {
	return join(getAgentDir(), CACHE_LOCK_FILE_NAME);
}

export function getLegacyCachePath(): string {
	return join(getExtensionDir(), "cache.json");
}

export function getLegacyCacheLockPath(): string {
	return join(getExtensionDir(), "cache.lock");
}

export function getSettingsPath(): string {
	return join(getExtensionDir(), "settings.json");
}
