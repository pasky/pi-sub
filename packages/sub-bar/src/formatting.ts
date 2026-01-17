/**
 * UI formatting utilities for the sub-bar extension
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import type { RateWindow, UsageSnapshot } from "./types.js";
import type { Settings, BarStyle, ColorScheme, BarCharacter } from "./settings-types.js";
import { formatErrorForDisplay } from "./errors.js";
import { getStatusEmoji } from "./status.js";
import { shouldShowWindow } from "./providers/windows.js";
import { getUsageExtras } from "./providers/extras.js";

export interface UsageWindowParts {
	label: string;
	bar: string;
	pct: string;
	reset: string;
}

/**
 * Get the character to use for progress bars
 */
function getBarCharacter(barCharacter: BarCharacter): string {
	switch (barCharacter) {
		case "light":
			return "─";
		case "heavy":
			return "━";
		case "double":
			return "═";
		case "block":
			return "█";
		default:
			// Fallback for unexpected values
			return "═";
	}
}

/**
 * Get color based on percentage and color scheme
 */
function getUsageColor(
	percent: number,
	isRemaining: boolean,
	colorScheme: ColorScheme,
	errorThreshold: number = 25,
	warningThreshold: number = 50,
	successThreshold: number = 75
): "error" | "warning" | "muted" | "success" | "accent" {
	if (colorScheme === "monochrome") {
		return "muted";
	}

	// For remaining percentage (Codex style), invert the logic
	const effectivePercent = isRemaining ? percent : 100 - percent;

	if (colorScheme === "gradient") {
		if (effectivePercent < errorThreshold) return "error";
		if (effectivePercent < warningThreshold) return "warning";
		if (effectivePercent < successThreshold) return "muted";
		return "success";
	}

	// traffic-light (default)
	if (effectivePercent < errorThreshold) return "error";
	if (effectivePercent < warningThreshold) return "warning";
	return "muted";
}

/**
 * Format a single usage window as a styled string
 */
export function formatUsageWindow(
	theme: Theme,
	window: RateWindow,
	isCodex: boolean,
	settings?: Settings,
	usage?: UsageSnapshot
): string {
	const parts = formatUsageWindowParts(theme, window, isCodex, settings, usage);

	// Special handling for Extra usage label
	if (window.label.startsWith("Extra [")) {
		const match = window.label.match(/^(Extra \[)(on|active)(\] .*)$/);
		if (match) {
			const [, prefix, status, suffix] = match;
			const styledLabel =
				status === "active"
					? theme.fg("dim", prefix) + theme.fg("text", status) + theme.fg("dim", suffix)
					: theme.fg("dim", window.label);
			const extraParts = [styledLabel, parts.bar, parts.pct].filter(Boolean);
			return extraParts.join(" ");
		}
		const extraParts = [theme.fg(getUsageColor(window.usedPercent, false, settings?.display.colorScheme ?? "traffic-light"), window.label), parts.bar, parts.pct].filter(Boolean);
		return extraParts.join(" ");
	}

	const joinedParts = [parts.label, parts.bar, parts.pct, parts.reset].filter(Boolean);
	return joinedParts.join(" ");
}

export function formatUsageWindowParts(
	theme: Theme,
	window: RateWindow,
	isCodex: boolean,
	settings?: Settings,
	usage?: UsageSnapshot,
	options?: { useNormalColors?: boolean }
): UsageWindowParts {
	const barStyle: BarStyle = settings?.display.barStyle ?? "both";
	const barWidth = settings?.display.barWidth ?? 6;
	const barCharacter: BarCharacter = settings?.display.barCharacter ?? "double";
	const colorScheme: ColorScheme = settings?.display.colorScheme ?? "traffic-light";
	const resetTimePosition = settings?.display.resetTimePosition ?? "front";
	const showUsageLabels = settings?.display.showUsageLabels ?? true;
	const errorThreshold = settings?.display.errorThreshold ?? 25;
	const warningThreshold = settings?.display.warningThreshold ?? 50;
	const successThreshold = settings?.display.successThreshold ?? 75;

	const usedPct = Math.round(window.usedPercent);
	const displayPct = isCodex ? Math.max(0, Math.min(100, 100 - usedPct)) : usedPct;
	const isRemaining = isCodex;

	const filled = Math.round((displayPct / 100) * barWidth);
	const empty = barWidth - filled;

	const baseColor = getUsageColor(displayPct, isRemaining, colorScheme, errorThreshold, warningThreshold, successThreshold);
	// In compare view, replace "muted" with "text" for better visibility
	const color = (options?.useNormalColors && baseColor === "muted") ? "text" : baseColor;
	const char = getBarCharacter(barCharacter);

	const emptyColor = "dim";
	
	let barStr = "";
	if (barStyle === "bar" || barStyle === "both") {
		barStr = theme.fg(color as Parameters<typeof theme.fg>[0], char.repeat(filled)) + theme.fg(emptyColor, char.repeat(empty));
	}

	let pctStr = "";
	if (barStyle === "percentage" || barStyle === "both") {
		// Special handling for Copilot Month window - can show percentage or requests
		if (window.label === "Month" && usage?.provider === "copilot") {
			const quotaDisplay = settings?.providers.copilot.quotaDisplay ?? "percentage";
			if (quotaDisplay === "requests" && usage.requestsRemaining !== undefined && usage.requestsEntitlement !== undefined) {
				const used = usage.requestsEntitlement - usage.requestsRemaining;
				const suffix = showUsageLabels ? " used" : "";
				pctStr = theme.fg(color, `${used}/${usage.requestsEntitlement}${suffix}`);
			} else {
				const suffix = showUsageLabels ? " used" : "";
				pctStr = theme.fg(color, `${usedPct}%${suffix}`);
			}
		} else if (isCodex) {
			const suffix = showUsageLabels ? " rem." : "";
			pctStr = theme.fg(color, `${displayPct}%${suffix}`);
		} else {
			const suffix = showUsageLabels ? " used" : "";
			pctStr = theme.fg(color, `${usedPct}%${suffix}`);
		}
	}

	let labelValue = window.label;
	if (window.resetDescription && window.resetDescription !== "__ACTIVE__") {
		if (resetTimePosition === "front") {
			labelValue = `${window.label} (${window.resetDescription} left)`;
		} else if (resetTimePosition === "integrated") {
			labelValue = `${window.resetDescription}/${window.label}`;
		}
	}

	const labelPart = resetTimePosition === "back"
		? theme.fg(color, window.label)
		: theme.fg(color, labelValue);
	const resetPart =
		resetTimePosition === "back" && window.resetDescription && window.resetDescription !== "__ACTIVE__"
			? theme.fg(color, `(${window.resetDescription} left)`)
			: "";

	return {
		label: labelPart,
		bar: barStr,
		pct: pctStr,
		reset: resetPart,
	};
}

/**
 * Format a complete usage snapshot as a usage line
 */
export function formatUsageStatus(
	theme: Theme,
	usage: UsageSnapshot,
	modelId?: string,
	settings?: Settings
): string | undefined {
	const showProviderName = settings?.display.showProviderName ?? true;

	// Build provider label with status indicator
	let label = "";
	if (showProviderName) {
		const statusIndicator =
			usage.status && usage.status.indicator !== "none" && usage.status.indicator !== "unknown"
				? getStatusEmoji(usage.status)
				: "";
		const providerLabel = statusIndicator
			? `${statusIndicator} ${usage.displayName}:`
			: `${usage.displayName}:`;
		label = theme.fg("muted", providerLabel) + "  ";
	}

	// If no windows, just show the provider name with error
	if (usage.windows.length === 0) {
		const errorMsg = usage.error ? theme.fg("dim", `(${formatErrorForDisplay(usage.error)})`) : "";
		return label + errorMsg;
	}

	// Build usage bars
	const parts: string[] = [];
	const isCodex = usage.provider === "codex";
	const invertUsage = isCodex && (settings?.providers.codex.invertUsage ?? false);

	for (const w of usage.windows) {
		// Skip windows that are disabled in settings
		if (!shouldShowWindow(usage, w, settings)) {
			continue;
		}
		parts.push(formatUsageWindow(theme, w, invertUsage, settings, usage));
	}

	// Add extra usage lines (extra usage off, copilot multiplier, etc.)
	const extras = getUsageExtras(usage, settings, modelId);
	for (const extra of extras) {
		parts.push(theme.fg("dim", extra.label));
	}

	// Build divider from settings
	const dividerChar = settings?.display.dividerCharacter ?? "•";
	const blanks = settings?.display.dividerBlanks ?? 1;
	const spacing = " ".repeat(blanks);
	const charToDisplay = dividerChar === "blank" ? " " : dividerChar;
	const divider = spacing + theme.fg("muted", charToDisplay) + spacing;

	return label + parts.join(divider);
}
