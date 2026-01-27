/**
 * Google Antigravity usage provider
 */

import * as path from "node:path";
import type { Dependencies, RateWindow, UsageSnapshot } from "../../types.js";
import { BaseProvider } from "../../provider.js";
import { noCredentials, fetchFailed, httpError } from "../../errors.js";
import { createTimeoutController, formatReset } from "../../utils.js";
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

const ANTIGRAVITY_HIDDEN_MODELS = new Set(["tab_flash_lite_preview"]);

interface AntigravityAuth {
	access?: string;
	accessToken?: string;
	token?: string;
	key?: string;
	projectId?: string;
	project?: string;
}

interface CloudCodeQuotaResponse {
	models?: Record<string, {
		displayName?: string;
		model?: string;
		isInternal?: boolean;
		quotaInfo?: {
			remainingFraction?: number;
			limit?: string;
			resetTime?: string;
		};
	}>;
}

interface ParsedModelQuota {
	name: string;
	remainingFraction: number;
	resetAt?: Date;
}

/**
 * Load Antigravity access token from auth.json
 */
function loadAntigravityAuth(deps: Dependencies): AntigravityAuth | undefined {
	const piAuthPath = path.join(deps.homedir(), ".pi", "agent", "auth.json");
	try {
		if (deps.fileExists(piAuthPath)) {
			const data = JSON.parse(deps.readFile(piAuthPath) ?? "{}");
			const entry = data["google-antigravity"];
			if (!entry) return undefined;
			if (typeof entry === "string") {
				return { token: entry };
			}
			return {
				access: entry.access,
				accessToken: entry.accessToken,
				token: entry.token,
				key: entry.key,
				projectId: entry.projectId ?? entry.project,
			};
		}
	} catch {
		// Ignore parse errors
	}

	return undefined;
}

function resolveAntigravityToken(auth: AntigravityAuth | undefined): string | undefined {
	return auth?.access ?? auth?.accessToken ?? auth?.token ?? auth?.key;
}

function parseResetTime(value?: string): Date | undefined {
	if (!value) return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;
	return date;
}

function toUsedPercent(remainingFraction: number): number {
	const fraction = Number.isFinite(remainingFraction) ? remainingFraction : 1;
	const used = (1 - fraction) * 100;
	return Math.max(0, Math.min(100, used));
}

async function fetchAntigravityQuota(
	deps: Dependencies,
	endpoint: string,
	token: string,
	projectId?: string
): Promise<{ data?: CloudCodeQuotaResponse; status?: number }> {
	const { controller, clear } = createTimeoutController(API_TIMEOUT_MS);
	try {
		const payload = projectId ? { project: projectId } : {};
		const res = await deps.fetch(`${endpoint}/v1internal:fetchAvailableModels`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
				...ANTIGRAVITY_HEADERS,
			},
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		clear();
		if (!res.ok) return { status: res.status };
		const data = (await res.json()) as CloudCodeQuotaResponse;
		return { data };
	} catch {
		clear();
		return {};
	}
}

export class AntigravityProvider extends BaseProvider {
	readonly name = "antigravity" as const;
	readonly displayName = "Antigravity";

	hasCredentials(deps: Dependencies): boolean {
		return Boolean(resolveAntigravityToken(loadAntigravityAuth(deps)));
	}

	async fetchUsage(deps: Dependencies): Promise<UsageSnapshot> {
		const auth = loadAntigravityAuth(deps);
		const token = resolveAntigravityToken(auth);
		if (!token) {
			return this.emptySnapshot(noCredentials());
		}

		let data: CloudCodeQuotaResponse | undefined;
		let lastStatus: number | undefined;
		for (const endpoint of ANTIGRAVITY_ENDPOINTS) {
			const result = await fetchAntigravityQuota(deps, endpoint, token, auth?.projectId);
			if (result.data) {
				data = result.data;
				break;
			}
			if (result.status) {
				lastStatus = result.status;
			}
		}

		if (!data) {
			return lastStatus ? this.emptySnapshot(httpError(lastStatus)) : this.emptySnapshot(fetchFailed());
		}

		const parsedModels: ParsedModelQuota[] = [];
		for (const [modelId, model] of Object.entries(data.models ?? {})) {
			if (model.isInternal) continue;
			if (modelId && ANTIGRAVITY_HIDDEN_MODELS.has(modelId.toLowerCase())) continue;
			const name = model.displayName ?? modelId ?? model.model ?? "unknown";
			if (!name) continue;
			if (ANTIGRAVITY_HIDDEN_MODELS.has(name.toLowerCase())) continue;
			parsedModels.push({
				name,
				remainingFraction: model.quotaInfo?.remainingFraction ?? 1,
				resetAt: parseResetTime(model.quotaInfo?.resetTime),
			});
		}

		parsedModels.sort((a, b) => a.name.localeCompare(b.name));

		const buildWindow = (label: string, remainingFraction: number, resetAt?: Date): RateWindow => ({
			label,
			usedPercent: toUsedPercent(remainingFraction),
			resetDescription: resetAt ? formatReset(resetAt) : undefined,
			resetAt: resetAt?.toISOString(),
		});

		const windows = parsedModels.map((model) => buildWindow(model.name, model.remainingFraction, model.resetAt));

		return this.snapshot({ windows });
	}
}
