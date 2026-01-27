/**
 * Provider-specific window visibility rules.
 */

import type { RateWindow, UsageSnapshot, ModelInfo } from "../types.js";
import type { Settings } from "../settings-types.js";
import { PROVIDER_METADATA } from "./metadata.js";

/**
 * Check if a window should be shown based on settings.
 */
export function shouldShowWindow(
	usage: UsageSnapshot,
	window: RateWindow,
	settings?: Settings,
	model?: ModelInfo
): boolean {
	const handler = PROVIDER_METADATA[usage.provider]?.isWindowVisible;
	if (handler) {
		return handler(usage, window, settings, model);
	}
	return true;
}
