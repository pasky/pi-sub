/**
 * Usage data types shared across modules.
 */

import type { ProviderName, UsageSnapshot } from "../types.js";

export interface ProviderUsageEntry {
	provider: ProviderName;
	usage?: UsageSnapshot;
}
