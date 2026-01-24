/**
 * Google Antigravity usage provider
 */

import * as path from "node:path";
import type { Dependencies, RateWindow, UsageSnapshot } from "../../types.js";
import { BaseProvider } from "../../provider.js";
import { noCredentials, fetchFailed } from "../../errors.js";
import { createTimeoutController } from "../../utils.js";
import { API_TIMEOUT_MS } from "../../config.js";

const ANTIGRAVITY_ENDPOINTS = [
	"https://daily-cloudcode-pa.sandbox.googleapis.com",
	"https://cloudcode-pa.googleapis.com",
] as const;

const ANTIGRAVITY_HEADERS = {
	"User-Agent": "antigravity/1.11.5 darwin/arm64",
	"X-Goog-Api-Client": "google-cloud-sdk vscode_cloudshelleditor/0.1",
	"Client-Metadata": JSON.stringify({
		ideType: "IDE_UNSPECIFIED",
		platform: "PLATFORM_UNSPECIFIED",
		pluginType: "GEMINI",
	}),
};

/**
 * Load Antigravity access token from auth.json
 */
function loadAntigravityToken(deps: Dependencies): string | undefined {
	const piAuthPath = path.join(deps.homedir(), ".pi", "agent", "auth.json");
	try {
		if (deps.fileExists(piAuthPath)) {
			const data = JSON.parse(deps.readFile(piAuthPath) ?? "{}");
			const entry = data["google-antigravity"];
			if (entry?.access) return entry.access;
			if (entry?.key) return entry.key;
			if (typeof entry === "string") return entry;
		}
	} catch {
		// Ignore parse errors
	}

	return undefined;
}

async function fetchAntigravityQuota(
	deps: Dependencies,
	endpoint: string,
	token: string
): Promise<{ buckets?: Array<{ modelId?: string; remainingFraction?: number }> } | null> {
	const { controller, clear } = createTimeoutController(API_TIMEOUT_MS);
	try {
		const res = await deps.fetch(`${endpoint}/v1internal:retrieveUserQuota`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				...ANTIGRAVITY_HEADERS,
			},
			body: "{}",
			signal: controller.signal,
		});
		clear();
		if (!res.ok) return null;
		return (await res.json()) as { buckets?: Array<{ modelId?: string; remainingFraction?: number }> };
	} catch {
		clear();
		return null;
	}
}

export class AntigravityProvider extends BaseProvider {
	readonly name = "antigravity" as const;
	readonly displayName = "Antigravity";

	hasCredentials(deps: Dependencies): boolean {
		return Boolean(loadAntigravityToken(deps));
	}

	async fetchUsage(deps: Dependencies): Promise<UsageSnapshot> {
		const token = loadAntigravityToken(deps);
		if (!token) {
			return this.emptySnapshot(noCredentials());
		}

		let data: { buckets?: Array<{ modelId?: string; remainingFraction?: number }> } | null = null;
		for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
			data = await fetchAntigravityQuota(deps, endpoint, token);
			if (data) break;
		}

		if (!data) {
			return this.emptySnapshot(fetchFailed());
		}

		const quotas: Record<string, number> = {};
		for (const bucket of data.buckets || []) {
			const model = bucket.modelId || "unknown";
			const frac = bucket.remainingFraction ?? 1;
			if (!quotas[model] || frac < quotas[model]) {
				quotas[model] = frac;
			}
		}

		let claudeMin = 1;
		let proMin = 1;
		let flashMin = 1;
		let hasClaude = false;
		let hasPro = false;
		let hasFlash = false;

		for (const [model, frac] of Object.entries(quotas)) {
			const lower = model.toLowerCase();
			if (lower.includes("claude")) {
				hasClaude = true;
				if (frac < claudeMin) claudeMin = frac;
			}
			if (lower.includes("pro")) {
				hasPro = true;
				if (frac < proMin) proMin = frac;
			}
			if (lower.includes("flash")) {
				hasFlash = true;
				if (frac < flashMin) flashMin = frac;
			}
		}

		const windows: RateWindow[] = [];
		if (hasClaude) {
			windows.push({ label: "Claude", usedPercent: (1 - claudeMin) * 100 });
		}
		if (hasPro) {
			windows.push({ label: "Pro", usedPercent: (1 - proMin) * 100 });
		}
		if (hasFlash) {
			windows.push({ label: "Flash", usedPercent: (1 - flashMin) * 100 });
		}

		if (windows.length === 0) {
			const fallback = Object.entries(quotas).slice(0, 3);
			for (const [model, frac] of fallback) {
				windows.push({ label: model, usedPercent: (1 - frac) * 100 });
			}
		}

		return this.snapshot({ windows });
	}
}
