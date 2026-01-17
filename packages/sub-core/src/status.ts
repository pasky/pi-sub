/**
 * Status polling for providers
 */

import type { Dependencies, ProviderName, ProviderStatus, StatusIndicator } from "./types.js";
import { GOOGLE_STATUS_URL, GEMINI_PRODUCT_ID, API_TIMEOUT_MS } from "./config.js";
import { PROVIDER_METADATA } from "./providers/metadata.js";
import { createTimeoutController } from "./utils.js";

/**
 * Fetch status from a standard statuspage.io API
 */
async function fetchStatuspageStatus(url: string, deps: Dependencies): Promise<ProviderStatus> {
	const { controller, clear } = createTimeoutController(API_TIMEOUT_MS);

	try {
		const res = await deps.fetch(url, { signal: controller.signal });
		clear();

		if (!res.ok) return { indicator: "unknown" };

		const data = (await res.json()) as { status?: { indicator?: string; description?: string } };
		const indicator = data.status?.indicator || "none";
		const description = data.status?.description;

		return {
			indicator: indicator as StatusIndicator,
			description,
		};
	} catch {
		clear();
		return { indicator: "unknown" };
	}
}

/**
 * Fetch Gemini status from Google Workspace status API
 */
async function fetchGeminiStatus(deps: Dependencies): Promise<ProviderStatus> {
	const { controller, clear } = createTimeoutController(API_TIMEOUT_MS);

	try {
		const res = await deps.fetch(GOOGLE_STATUS_URL, { signal: controller.signal });
		clear();

		if (!res.ok) return { indicator: "unknown" };

		const incidents = (await res.json()) as Array<{
			end?: string;
			currently_affected_products?: Array<{ id: string }>;
			affected_products?: Array<{ id: string }>;
			most_recent_update?: { status?: string };
			status_impact?: string;
			external_desc?: string;
		}>;

		const activeIncidents = incidents.filter((inc) => {
			if (inc.end) return false;
			const affected = inc.currently_affected_products || inc.affected_products || [];
			return affected.some((p) => p.id === GEMINI_PRODUCT_ID);
		});

		if (activeIncidents.length === 0) {
			return { indicator: "none" };
		}

		let worstIndicator: StatusIndicator = "minor";
		let description: string | undefined;

		for (const inc of activeIncidents) {
			const status = inc.most_recent_update?.status || inc.status_impact;
			if (status === "SERVICE_OUTAGE") {
				worstIndicator = "critical";
				description = inc.external_desc;
			} else if (status === "SERVICE_DISRUPTION" && worstIndicator !== "critical") {
				worstIndicator = "major";
				description = inc.external_desc;
			}
		}

		return { indicator: worstIndicator, description };
	} catch {
		clear();
		return { indicator: "unknown" };
	}
}

/**
 * Fetch status for a provider
 */
export async function fetchProviderStatus(provider: ProviderName, deps: Dependencies): Promise<ProviderStatus> {
	const statusConfig = PROVIDER_METADATA[provider]?.status;
	if (!statusConfig) {
		return { indicator: "none" };
	}

	if (statusConfig.type === "google-workspace") {
		return fetchGeminiStatus(deps);
	}

	return fetchStatuspageStatus(statusConfig.url, deps);
}

/**
 * Get emoji for a status indicator
 */
export function getStatusEmoji(status?: ProviderStatus): string {
	if (!status) return "";
	switch (status.indicator) {
		case "none":
			return "✅";
		case "minor":
			return "⚠️";
		case "major":
			return "🟠";
		case "critical":
			return "🔴";
		case "maintenance":
			return "🔧";
		default:
			return "";
	}
}
