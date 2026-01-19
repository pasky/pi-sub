/**
 * Shared path helpers for sub-bar settings storage.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getExtensionDir(): string {
	return join(dirname(fileURLToPath(import.meta.url)), "..");
}

export function getSettingsPath(): string {
	return join(getExtensionDir(), "settings.json");
}
