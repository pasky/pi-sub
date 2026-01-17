/**
 * Shared path helpers for sub-bar settings storage.
 */

import { homedir } from "node:os";
import { join } from "node:path";

const AGENT_DIR_ENV = "PI_CODING_AGENT_DIR";

export function getAgentDir(): string {
	return process.env[AGENT_DIR_ENV] || join(homedir(), ".pi", "agent");
}

export function getExtensionDir(): string {
	return join(getAgentDir(), "extensions", "sub-bar");
}

export function getSettingsPath(): string {
	return join(getExtensionDir(), "settings.json");
}
