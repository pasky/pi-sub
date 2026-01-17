/**
 * Shared path helpers for sub-core storage.
 */

import { homedir } from "node:os";
import { join } from "node:path";

const AGENT_DIR_ENV = "PI_CODING_AGENT_DIR";

export function getAgentDir(): string {
	return process.env[AGENT_DIR_ENV] || join(homedir(), ".pi", "agent");
}

export function getExtensionDir(): string {
	return join(getAgentDir(), "extensions", "sub-core");
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
