/**
 * Usage comparison UI for all providers.
 */

import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import type { Settings } from "../settings-types.js";
import type { ProviderUsageEntry } from "../usage/types.js";
import { formatUsageWindowParts } from "../formatting.js";
import { getUsageExtras } from "../providers/extras.js";
import { shouldShowWindow } from "../providers/windows.js";
import { getStatusEmoji } from "../status.js";

export async function showUsageComparison(
	ctx: ExtensionContext,
	options: {
		settings: Settings;
		snapshots: ProviderUsageEntry[];
		fetchLatest: () => Promise<ProviderUsageEntry[]>;
		modelId?: string;
	}
): Promise<void> {
	if (!ctx.hasUI) {
		return;
	}

	const { settings, snapshots, fetchLatest, modelId } = options;

	await ctx.ui.custom<void>((tui, theme, _kb, done) => {
		const title = theme.fg("accent", theme.bold("sub-bar Comparison"));
		const footer = theme.fg("dim", "Press any key to dismiss");
		let refreshed = false;

		const headerCells = ["St.", "Plan", "Primary", "Secondary", "Misc"];

		const buildRows = () => {
			const rows: Array<{ cells: string[]; windows: (ReturnType<typeof formatUsageWindowParts> | undefined)[] }> = [];

			for (const { provider, usage } of snapshots) {
				if (!usage) {
					rows.push({
						cells: [theme.fg("dim", " —"), theme.fg("dim", provider), theme.fg("dim", "(no data)"), "", ""],
						windows: [],
					});
					continue;
				}

				const statusIndicator =
					usage.status && usage.status.indicator !== "none" && usage.status.indicator !== "unknown"
						? getStatusEmoji(usage.status)
						: "";
				const statusCell = " " + (statusIndicator || "✓");
				const planLabel = usage.displayName;

				const isCodex = usage.provider === "codex";
				const invertUsage = isCodex && (settings?.providers.codex.invertUsage ?? false);
				const isCopilot = usage.provider === "copilot";

				const visibleWindows = usage.windows.filter((window) => shouldShowWindow(usage, window, settings));
				const formattedWindows = visibleWindows.map((window) =>
					formatUsageWindowParts(theme, window, invertUsage, settings, usage, { useNormalColors: true }),
				);

				const primary: ReturnType<typeof formatUsageWindowParts> | undefined = formattedWindows[0] ?? undefined;
				const secondary: ReturnType<typeof formatUsageWindowParts> | undefined = isCopilot
					? undefined
					: (formattedWindows[1] ?? undefined);
				const miscParts: ReturnType<typeof formatUsageWindowParts>[] = isCopilot ? [] : formattedWindows.slice(2);

				const extras = getUsageExtras(usage, settings, modelId);
				for (const extra of extras) {
					miscParts.push({ label: extra.label, bar: "", pct: "", reset: "" });
				}

				rows.push({
					cells: [statusCell, planLabel, "", "", ""],
					windows: [primary, secondary, ...miscParts],
				});
			}
			return rows;
		};

		return {
			render(width: number) {
				if (!refreshed) {
					refreshed = true;
					void (async () => {
						const updated = await fetchLatest();
						snapshots.splice(0, snapshots.length, ...updated);
						tui.requestRender();
					})();
				}

				const innerWidth = Math.max(20, width - 2);
				const contentWidth = Math.max(0, innerWidth - 2);

				const rows = buildRows();
				const primaryLabelWidth = rows.reduce(
					(max, row) => Math.max(max, visibleWidth(row.windows[0]?.label ?? "")),
					0,
				);
				const secondaryLabelWidth = rows.reduce(
					(max, row) => Math.max(max, visibleWidth(row.windows[1]?.label ?? "")),
					0,
				);

				const renderWindow = (
					entry: ReturnType<typeof formatUsageWindowParts> | undefined,
					labelWidth: number,
				) => {
					if (!entry) return "";
					const padLabel = entry.label + " ".repeat(Math.max(0, labelWidth - visibleWidth(entry.label)));
					const segments = [padLabel, entry.bar, entry.pct, entry.reset].filter((segment) => segment);
					return segments.join("  ").trimEnd();
				};

				const renderMisc = (entry: ReturnType<typeof formatUsageWindowParts> | undefined) => {
					if (!entry) return "";
					if (entry.pct && !entry.bar) {
						const segments = [entry.label, entry.pct, entry.reset].filter((segment) => segment);
						return segments.join("  ").trimEnd();
					}
					const segments = [entry.label, entry.bar, entry.pct, entry.reset].filter((segment) => segment);
					return segments.join("  ").trimEnd();
				};

				const resolvedRows = rows.map((row) => {
					const primary = renderWindow(row.windows[0], primaryLabelWidth);
					const secondary = renderWindow(row.windows[1], secondaryLabelWidth);
					const misc = row.windows.slice(2).map(renderMisc).filter(Boolean).join(" • ");
					return [row.cells[0], row.cells[1], primary, secondary, misc];
				});

				const allRows = [headerCells, ...resolvedRows];
				const colWidths = headerCells.map((_, idx) =>
					Math.max(...allRows.map((row) => visibleWidth(row[idx] ?? "")), visibleWidth(headerCells[idx])),
				);

				const baseWidth = colWidths.reduce((sum, value) => sum + value, 0) + headerCells.length * 3 + 1;
				const widths = [...colWidths];
				let overflow = baseWidth - contentWidth;
				for (let i = widths.length - 1; i >= 0 && overflow > 0; i -= 1) {
					const shrinkBy = Math.min(overflow, Math.max(0, widths[i] - 6));
					widths[i] -= shrinkBy;
					overflow -= shrinkBy;
				}

				const trimCell = (value: string, cellWidth: number) =>
					truncateToWidth(value, cellWidth, theme.fg("dim", "..."));
				const padCell = (value: string, cellWidth: number) =>
					value + " ".repeat(Math.max(0, cellWidth - visibleWidth(value)));
				const dataTableRow = (row: string[]) => {
					const cells = row.map((cell, idx) => {
						const trimmed = trimCell(cell, widths[idx]);
						return padCell(trimmed, widths[idx]);
					});
					const separator = theme.fg("dim", " │ ");
					return ` ${cells.join(separator)}`;
				};

				const makeDivider = () => {
					const segments = widths.map((w) => "─".repeat(Math.max(3, w + 2)));
					return theme.fg("dim", segments.join("┼"));
				};

				const headerRow = dataTableRow(headerCells);
				const separatorRow = makeDivider();
				const tableLines = [headerRow, separatorRow, ...resolvedRows.map(dataTableRow)];

				const trim = (value: string) => truncateToWidth(value, contentWidth, theme.fg("dim", "..."));
				const pad = (value: string) => value + " ".repeat(Math.max(0, contentWidth - visibleWidth(value)));
				const row = (value: string) => {
					const trimmed = trim(value);
					return theme.fg("borderMuted", "│") + " " + pad(trimmed) + " " + theme.fg("borderMuted", "│");
				};

				const lines: string[] = [];
				lines.push(theme.fg("borderMuted", `╭${"─".repeat(innerWidth)}╮`));
				lines.push(row(title));
				lines.push(theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`));

				for (const line of tableLines) {
					lines.push(row(line));
				}

				lines.push(theme.fg("borderMuted", `├${"─".repeat(innerWidth)}┤`));
				lines.push(row(footer));
				lines.push(theme.fg("borderMuted", `╰${"─".repeat(innerWidth)}╯`));

				return lines;
			},
			invalidate() {},
			handleInput(_data: string) {
				done(undefined);
			},
		};
	});
}
