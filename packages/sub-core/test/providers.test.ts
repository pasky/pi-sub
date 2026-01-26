import test from "node:test";
import assert from "node:assert/strict";
import { AnthropicProvider } from "../src/providers/impl/anthropic.js";
import { CopilotProvider } from "../src/providers/impl/copilot.js";
import { GeminiProvider } from "../src/providers/impl/gemini.js";
import { AntigravityProvider } from "../src/providers/impl/antigravity.js";
import { CodexProvider } from "../src/providers/impl/codex.js";
import { KiroProvider } from "../src/providers/impl/kiro.js";
import { ZaiProvider } from "../src/providers/impl/zai.js";
import { createDeps, createJsonResponse, getAuthPath } from "./helpers.js";
import type { UsageSnapshot } from "../src/types.js";

function withAuth(files: Map<string, string>, payload: Record<string, unknown>, home: string): void {
	files.set(getAuthPath(home), JSON.stringify(payload));
}

function assertWindow(usage: UsageSnapshot, label: string): void {
	const found = usage.windows.find((window) => window.label === label);
	assert.ok(found, `Expected window ${label}`);
}

test("anthropic parses windows and extra usage", async () => {
	const provider = new AnthropicProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({
			five_hour: { utilization: 99, resets_at: new Date(Date.now() + 3600_000).toISOString() },
			seven_day: { utilization: 20, resets_at: new Date(Date.now() + 86400_000).toISOString() },
			extra_usage: { is_enabled: true, used_credits: 1234, monthly_limit: 5000, utilization: 40 },
		}),
		execFileSync: () => "",
	});
	withAuth(files, { anthropic: { access: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assertWindow(usage, "5h");
	assertWindow(usage, "7d");
	const extra = usage.windows.find((window) => window.label.startsWith("Extra"));
	assert.ok(extra?.label.includes("Extra [active]"));
	assert.equal(usage.extraUsageEnabled, true);
});

test("copilot handles missing quota snapshots", async () => {
	const provider = new CopilotProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({}),
	});
	withAuth(files, { "github-copilot": { refresh: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assert.equal(usage.windows.length, 0);
});

test("copilot parses quotas and requests", async () => {
	const provider = new CopilotProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({
			quota_reset_date_utc: "2026-01-01T00:00:00Z",
			quota_snapshots: {
				premium_interactions: {
					percent_remaining: 70,
					remaining: 10,
					entitlement: 50,
				},
			},
		}),
	});
	withAuth(files, { "github-copilot": { refresh: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assertWindow(usage, "Month");
	assert.equal(usage.windows[0]?.usedPercent, 30);
	assert.equal(usage.requestsRemaining, 10);
	assert.equal(usage.requestsEntitlement, 50);
});

test("copilot reports http errors", async () => {
	const provider = new CopilotProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({}, { ok: false, status: 500 }),
	});
	withAuth(files, { "github-copilot": { refresh: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assert.equal(usage.error?.code, "HTTP_ERROR");
});

test("gemini handles empty buckets", async () => {
	const provider = new GeminiProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({ buckets: [] }),
	});
	withAuth(files, { "google-gemini-cli": { access: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assert.equal(usage.windows.length, 0);
});

test("gemini aggregates pro and flash quotas", async () => {
	const provider = new GeminiProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({
			buckets: [
				{ modelId: "Gemini Pro", remainingFraction: 0.2 },
				{ modelId: "Gemini Flash", remainingFraction: 0.6 },
			],
		}),
	});
	withAuth(files, { "google-gemini-cli": { access: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assertWindow(usage, "Pro");
	assertWindow(usage, "Flash");
});

test("antigravity falls back to unknown model labels", async () => {
	const provider = new AntigravityProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({
			buckets: [
				{ modelId: "Unknown A", remainingFraction: 0.8 },
				{ modelId: "Unknown B", remainingFraction: 0.7 },
			],
		}),
	});
	withAuth(files, { "google-antigravity": { access: "token" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assert.ok(usage.windows.some((window) => window.label === "Unknown A"));
	assert.ok(usage.windows.some((window) => window.label === "Unknown B"));
});

test("codex formats primary and secondary windows", async () => {
	const provider = new CodexProvider();
	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({
			rate_limit: {
				primary_window: {
					reset_at: Math.floor(Date.now() / 1000) + 3600,
					limit_window_seconds: 18000,
					used_percent: 12,
				},
				secondary_window: {
					reset_at: Math.floor(Date.now() / 1000) + 86400,
					limit_window_seconds: 86400,
					used_percent: 30,
				},
			},
		}),
	});
	withAuth(files, { "openai-codex": { access: "token", accountId: "acct" } }, deps.homedir());

	const usage = await provider.fetchUsage(deps);
	assertWindow(usage, "5h");
	assertWindow(usage, "Day");
});

test("kiro parses percentage and reset date", async () => {
	const provider = new KiroProvider();
	const output = "██████ 12%\nresets on 01/01";
	const { deps } = createDeps({
		execFileSync: (file: string, args: string[]) => {
			if (file === "which" && args[0] === "kiro-cli") return "/usr/local/bin/kiro-cli";
			if (file === "/usr/local/bin/kiro-cli" && args[0] === "whoami") return "user";
			if (file === "/usr/local/bin/kiro-cli" && args[0] === "chat") return output;
			throw new Error(`Unexpected command ${file} ${args.join(" ")}`);
		},
	});

	const usage = await provider.fetchUsage(deps);
	assertWindow(usage, "Credits");
	assert.equal(usage.windows[0]?.usedPercent, 12);
	assert.ok(usage.windows[0]?.resetAt);
});

test("kiro parses credits when percent is missing", async () => {
	const provider = new KiroProvider();
	const output = "(1.5 of 10 covered in plan) resets on 12/31";
	const { deps } = createDeps({
		execFileSync: (file: string, args: string[]) => {
			if (file === "which" && args[0] === "kiro-cli") return "/usr/local/bin/kiro-cli";
			if (file === "/usr/local/bin/kiro-cli" && args[0] === "whoami") return "user";
			if (file === "/usr/local/bin/kiro-cli" && args[0] === "chat") return output;
			throw new Error(`Unexpected command ${file} ${args.join(" ")}`);
		},
	});

	const usage = await provider.fetchUsage(deps);
	assert.equal(Math.round(usage.windows[0]?.usedPercent ?? 0), 15);
});

test("zai reports api errors and parses limits", async () => {
	const provider = new ZaiProvider();
	const home = "/home/test";
	const authPath = getAuthPath(home);

	const { deps, files } = createDeps({
		fetch: async () => createJsonResponse({ success: false, code: 500, msg: "Bad" }),
		homedir: home,
	});
	files.set(authPath, JSON.stringify({ "z-ai": { access: "token" } }));
	const errorUsage = await provider.fetchUsage(deps);
	assert.equal(errorUsage.error?.code, "API_ERROR");

	const { deps: okDeps, files: okFiles } = createDeps({
		fetch: async () => createJsonResponse({
			success: true,
			code: 200,
			data: {
				limits: [
					{ type: "TOKENS_LIMIT", percentage: 12, nextResetTime: "2026-01-01T00:00:00Z" },
					{ type: "TIME_LIMIT", percentage: 34, nextResetTime: "2026-02-01T00:00:00Z" },
				],
			},
		}),
		homedir: home,
	});
	okFiles.set(authPath, JSON.stringify({ "zai": { access: "token" } }));

	const usage = await provider.fetchUsage(okDeps);
	assertWindow(usage, "Tokens");
	assertWindow(usage, "Monthly");
});
