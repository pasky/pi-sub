/**
 * Provider-specific extra usage lines (non-window info).
 */

import type { UsageSnapshot } from "../types.js";
import type { Settings } from "../settings-types.js";
import { PROVIDER_METADATA, type UsageExtra } from "./metadata.js";

export type { UsageExtra } from "./metadata.js";

export function getUsageExtras(
	usage: UsageSnapshot,
	settings?: Settings,
	modelId?: string
): UsageExtra[] {
	const handler = PROVIDER_METADATA[usage.provider]?.getExtras;
	if (handler) {
		return handler(usage, settings, modelId);
	}
	return [];
}
