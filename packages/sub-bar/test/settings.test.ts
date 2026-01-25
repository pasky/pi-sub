import test from "node:test";
import assert from "node:assert/strict";
import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";
import { formatUsageStatus, formatUsageWindowParts } from "../src/formatting.js";
import { buildDisplayShareString, decodeDisplayShareString } from "../src/share.js";
import { applyDisplayChange } from "../src/settings/display.js";
import { buildDisplayPresetItems, saveDisplayPreset, upsertDisplayPreset } from "../src/settings/presets.js";
import { getDefaultSettings, resolveBaseTextColor } from "../src/settings-types.js";
import type { UsageSnapshot } from "../src/types.js";

const theme = {
	fg: (_color: string, text: string) => text,
	bold: (text: string) => text,
} as unknown as Theme;

function buildUsage(): UsageSnapshot {
	return {
		provider: "codex",
		displayName: "Codex Plan",
		windows: [
			{
				label: "5h",
				usedPercent: 12,
				resetDescription: "4h",
				resetAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
			},
		],
	};
}

test("custom provider label is appended", () => {
	const settings = getDefaultSettings();
	settings.display.providerLabel = "Team";

	const output = formatUsageStatus(theme, buildUsage(), undefined, settings);
	assert.ok(output);
	assert.ok(output.startsWith("Codex Team:"));
});

test("custom bar character is used", () => {
	const settings = getDefaultSettings();
	settings.display.barType = "horizontal-bar";
	settings.display.barStyle = "bar";
	settings.display.barWidth = 4;
	settings.display.barCharacter = "★";

	const usage = buildUsage();
	const parts = formatUsageWindowParts(theme, usage.windows[0], false, settings, usage);
	assert.ok(parts.bar.includes("★"));
});

test("mixed bar characters fill full width", () => {
	const settings = getDefaultSettings();
	settings.display.barType = "horizontal-bar";
	settings.display.barStyle = "bar";
	settings.display.barWidth = 22;
	settings.display.barCharacter = "🚀_";

	const usage = buildUsage();
	usage.windows[0].usedPercent = 57;

	const parts = formatUsageWindowParts(theme, usage.windows[0], false, settings, usage);
	assert.equal(visibleWidth(parts.bar), 22);
	assert.ok(parts.bar.includes("🚀"));
	assert.ok(parts.bar.includes("_"));
});

test("applyDisplayChange clamps custom numeric values", () => {
	const settings = getDefaultSettings();

	applyDisplayChange(settings, "paddingX", "-5");
	assert.equal(settings.display.paddingX, 0);

	applyDisplayChange(settings, "barWidth", "150");
	assert.equal(settings.display.barWidth, 100);

	applyDisplayChange(settings, "dividerBlanks", "-2");
	assert.equal(settings.display.dividerBlanks, 0);

	applyDisplayChange(settings, "errorThreshold", "-10");
	assert.equal(settings.display.errorThreshold, 0);

	applyDisplayChange(settings, "warningThreshold", "250");
	assert.equal(settings.display.warningThreshold, 100);
});

test("share string preserves custom values and tolerates unknown colors", () => {
	const defaults = getDefaultSettings();
	const display = {
		...defaults.display,
		providerLabel: "Team",
		barCharacter: "★",
		baseTextColor: "not-a-color",
	};

	const share = buildDisplayShareString("Custom", display);
	const decoded = decodeDisplayShareString(share);
	assert.ok(decoded);
	assert.equal(decoded?.display.providerLabel, "Team");
	assert.equal(decoded?.display.barCharacter, "★");
	assert.equal(resolveBaseTextColor(decoded?.display.baseTextColor), "dim");
});

test("preset source labels imported vs saved", () => {
	const settings = getDefaultSettings();
	upsertDisplayPreset(settings, "Imported", settings.display, "imported");
	saveDisplayPreset(settings, "Saved");

	const items = buildDisplayPresetItems(settings);
	const importedItem = items.find((item) => item.label === "Imported");
	const savedItem = items.find((item) => item.label === "Saved");

	assert.equal(importedItem?.description, "manually imported theme");
	assert.equal(savedItem?.description, "manually saved theme");
});

test("imported source persists when updated", () => {
	const settings = getDefaultSettings();
	upsertDisplayPreset(settings, "Imported", settings.display, "imported");
	upsertDisplayPreset(settings, "Imported", { ...settings.display, barWidth: 8 });

	const items = buildDisplayPresetItems(settings);
	const importedItem = items.find((item) => item.label === "Imported");
	assert.equal(importedItem?.description, "manually imported theme");
});

test("decode marks newer share versions", () => {
	const payload = { v: 99, display: getDefaultSettings().display };
	const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const decoded = decodeDisplayShareString(`Future:${encoded}`);
	assert.ok(decoded?.isNewerVersion);
});
