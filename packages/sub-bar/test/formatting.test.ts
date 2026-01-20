import test from "node:test";
import assert from "node:assert/strict";
import { visibleWidth } from "@mariozechner/pi-tui";
import type { Theme } from "@mariozechner/pi-coding-agent";
import { formatUsageStatus, formatUsageStatusWithWidth } from "../src/formatting.js";
import { getDefaultSettings } from "../src/settings-types.js";
import type { UsageSnapshot } from "../src/types.js";

const theme = {
	fg: (_color: string, text: string) => text,
} as unknown as Theme;

function buildUsage(): UsageSnapshot {
	return {
		provider: "codex",
		displayName: "Codex Plan",
		windows: [
			{
				label: "5h",
				usedPercent: 3,
				resetDescription: "4h",
				resetAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
			},
			{
				label: "Week",
				usedPercent: 7,
				resetDescription: "6d",
				resetAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
			},
		],
	};
}

test("fill width with contained vertical bars does not overflow", () => {
	const settings = getDefaultSettings();
	settings.display.barType = "vertical";
	settings.display.barWidth = "fill";
	settings.display.containBar = true;

	const output = formatUsageStatusWithWidth(theme, buildUsage(), 80, undefined, settings);
	assert.ok(output);
	assert.ok(visibleWidth(output) <= 80);
});

test("fill width with contained horizontal bars does not overflow", () => {
	const settings = getDefaultSettings();
	settings.display.barType = "horizontal-bar";
	settings.display.barWidth = "fill";
	settings.display.containBar = true;

	const output = formatUsageStatusWithWidth(theme, buildUsage(), 80, undefined, settings);
	assert.ok(output);
	assert.ok(visibleWidth(output) <= 80);
});

test("bar width 1 contained vertical bars stay compact", () => {
	const settings = getDefaultSettings();
	settings.display.barType = "vertical";
	settings.display.barWidth = 1;
	settings.display.containBar = true;

	const output = formatUsageStatus(theme, buildUsage(), undefined, settings);
	assert.ok(output);
	assert.match(output, /▕▁▏/);
});
