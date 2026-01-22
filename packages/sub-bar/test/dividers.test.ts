import test from "node:test";
import assert from "node:assert/strict";
import type { Theme } from "@mariozechner/pi-coding-agent";
import { buildDividerLine } from "../src/dividers.js";

const theme = {
	fg: (_color: string, text: string) => text,
} as unknown as Theme;

test("divider join aligns after wide emoji", () => {
	const baseLine = "🙂|"; // emoji width 2, divider at column 2
	const line = buildDividerLine(4, baseLine, "|", true, "bottom", "text", theme);
	assert.equal(line[2], "┴");
});
