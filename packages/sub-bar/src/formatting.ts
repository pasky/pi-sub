/**
 * UI formatting utilities for the sub-bar extension
 */

import type { Theme } from "@mariozechner/pi-coding-agent";
import { visibleWidth } from "@mariozechner/pi-tui";
import type { RateWindow, UsageSnapshot } from "./types.js";
import type { Settings, BarStyle, BarType, ColorScheme, BarCharacter, BarWidth, DividerBlanks, BaseTextColor } from "./settings-types.js";
import { formatErrorForDisplay } from "./errors.js";
import { getStatusIcon, getStatusLabel } from "./status.js";
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
): "error" | "warning" | "base" | "success" | "accent" | "text" {
	if (colorScheme === "monochrome") {
		return "base";
	}

	// For remaining percentage (Codex style), invert the logic
	const effectivePercent = isRemaining ? percent : 100 - percent;

	if (colorScheme === "success-base-warning-error") {
		// >75%: success, >50%: base, >25%: warning, <=25%: error
		if (effectivePercent < errorThreshold) return "error";
		if (effectivePercent < warningThreshold) return "warning";
		if (effectivePercent < successThreshold) return "base";
		return "success";
	}

	// base-warning-error (default)
	// >50%: base, >25%: warning, <=25%: error
	if (effectivePercent < errorThreshold) return "error";
	if (effectivePercent < warningThreshold) return "warning";
	return "base";
}

function getStatusColor(
	indicator: NonNullable<UsageSnapshot["status"]>["indicator"],
	colorScheme: ColorScheme
): "error" | "warning" | "success" | "base" {
	if (colorScheme === "monochrome") {
		return "base";
	}
	if (indicator === "minor" || indicator === "maintenance") {
		return "warning";
	}
	if (indicator === "major" || indicator === "critical") {
		return "error";
	}
	if (indicator === "none") {
		return colorScheme === "success-base-warning-error" ? "success" : "base";
	}
	return "base";
}

function resolveStatusTintColor(color: "error" | "warning" | "success" | "base", baseTextColor: BaseTextColor): BaseTextColor | "error" | "warning" | "success" {
	return color === "base" ? baseTextColor : color;
}

function formatResetDateTime(resetAt: string): string {
	const date = new Date(resetAt);
	if (Number.isNaN(date.getTime())) return resetAt;
	return new Intl.DateTimeFormat(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date);
}

function getBarTypeLevels(barType: BarType): string[] | null {
	switch (barType) {
		case "horizontal-single":
			return ["▏", "▎", "▍", "▌", "▋", "▊", "▉", "█"];
		case "vertical":
			return ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];
		case "braille":
			return ["⡀", "⣀", "⣄", "⣆", "⣇", "⣧", "⣷", "⣿"];
		case "shade":
			return ["░", "▒", "▓", "█"];
		default:
			return null;
	}
}

function renderBarSegments(
	percent: number,
	width: number,
	levels: string[],
	options?: { allowMinimum?: boolean; emptyChar?: string }
): { segments: Array<{ char: string; filled: boolean }>; minimal: boolean } {
	const totalUnits = Math.max(1, width) * levels.length;
	let filledUnits = Math.round((percent / 100) * totalUnits);
	let minimal = false;
	if (options?.allowMinimum && percent > 0 && filledUnits === 0) {
		filledUnits = 1;
		minimal = true;
	}
	const emptyChar = options?.emptyChar ?? " ";
	const segments: Array<{ char: string; filled: boolean }> = [];
	for (let i = 0; i < Math.max(1, width); i++) {
		if (filledUnits >= levels.length) {
			segments.push({ char: levels[levels.length - 1], filled: true });
			filledUnits -= levels.length;
			continue;
		}
		if (filledUnits > 0) {
			segments.push({ char: levels[Math.min(levels.length - 1, filledUnits - 1)], filled: true });
			filledUnits = 0;
			continue;
		}
		segments.push({ char: emptyChar, filled: false });
	}
	return { segments, minimal };
}

function formatProviderLabel(theme: Theme, usage: UsageSnapshot, settings?: Settings): string {
	const showProviderName = settings?.display.showProviderName ?? true;
	const showStatus = settings?.providers[usage.provider]?.showStatus ?? true;
	const status = showStatus ? usage.status : undefined;
	const statusDismissOk = settings?.display.statusDismissOk ?? true;
	const statusMode = settings?.display.statusIndicatorMode ?? "icon";
	const statusIconPack = settings?.display.statusIconPack ?? "emoji";
	const showStatusText = settings?.display.statusText ?? false;
	const providerLabelSetting = settings?.display.providerLabel ?? "none";
	const showColon = settings?.display.providerLabelColon ?? true;
	const baseTextColor = settings?.display.baseTextColor ?? "muted";

	const statusActive = Boolean(status && (!statusDismissOk || status.indicator !== "none"));
	const showIcon = statusActive && (statusMode === "icon" || statusMode === "icon+color");
	const showColor = statusActive && (statusMode === "color" || statusMode === "icon+color");
	const showText = statusActive && showStatusText;

	const labelSuffix = providerLabelSetting === "plan"
		? "Plan"
		: providerLabelSetting === "subscription"
			? "Subscription"
			: providerLabelSetting === "sub"
				? "Sub."
				: "";

	const rawName = usage.displayName?.trim() ?? "";
	const baseName = rawName.replace(/\s+(plan|subscription|sub\.?)[\s]*$/i, "").trim();
	const providerName = baseName || rawName;
	const providerLabel = showProviderName
		? [providerName, labelSuffix].filter(Boolean).join(" ")
		: "";
	const providerLabelWithColon = providerLabel && showColon ? `${providerLabel}:` : providerLabel;

	const icon = showIcon && status ? getStatusIcon(status, statusIconPack) : "";
	const statusText = showText && status ? getStatusLabel(status) : "";
	const statusColor = showColor && status ? getStatusColor(status.indicator, settings?.display.colorScheme ?? "base-warning-error") : "base";
	const labelColor = showColor ? resolveStatusTintColor(statusColor, baseTextColor) : baseTextColor;

	const parts = [icon, statusText, providerLabelWithColon].filter(Boolean);
	if (parts.length === 0) return "";
	return parts.map((part) => theme.fg(labelColor, part)).join(" ");
}

/**
 * Format a single usage window as a styled string
 */
export function formatUsageWindow(
	theme: Theme,
	window: RateWindow,
	isCodex: boolean,
	settings?: Settings,
	usage?: UsageSnapshot,
	options?: { useNormalColors?: boolean; barWidthOverride?: number }
): string {
	const parts = formatUsageWindowParts(theme, window, isCodex, settings, usage, options);
	const baseTextColor = settings?.display.baseTextColor ?? "muted";

	// Special handling for Extra usage label
	if (window.label.startsWith("Extra [")) {
		const match = window.label.match(/^(Extra \[)(on|active)(\] .*)$/);
		if (match) {
			const [, prefix, status, suffix] = match;
			const styledLabel =
				status === "active"
					? theme.fg(baseTextColor, prefix) + theme.fg("text", status) + theme.fg(baseTextColor, suffix)
					: theme.fg(baseTextColor, window.label);
			const extraParts = [styledLabel, parts.bar, parts.pct].filter(Boolean);
			return extraParts.join(" ");
		}
		const extraColor = getUsageColor(window.usedPercent, false, settings?.display.colorScheme ?? "base-warning-error");
		const extraTextColor = (options?.useNormalColors && extraColor === "base")
			? "text"
			: extraColor === "base"
				? baseTextColor
				: extraColor;
		const extraParts = [theme.fg(extraTextColor, window.label), parts.bar, parts.pct].filter(Boolean);
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
	options?: { useNormalColors?: boolean; barWidthOverride?: number }
): UsageWindowParts {
	const barStyle: BarStyle = settings?.display.barStyle ?? "both";
	const barWidthSetting = settings?.display.barWidth;
	const containBar = settings?.display.containBar ?? false;
	const barWidth = options?.barWidthOverride ?? (typeof barWidthSetting === "number" ? barWidthSetting : 6);
	const barType: BarType = settings?.display.barType ?? "horizontal-bar";
	const brailleFillEmpty = settings?.display.brailleFillEmpty ?? false;
	const barCharacter: BarCharacter = settings?.display.barCharacter ?? "heavy";
	const colorScheme: ColorScheme = settings?.display.colorScheme ?? "base-warning-error";
	const resetTimePosition = settings?.display.resetTimePosition ?? "front";
	const resetTimeFormat = settings?.display.resetTimeFormat ?? "relative";
	const showUsageLabels = settings?.display.showUsageLabels ?? true;
	const baseTextColor = settings?.display.baseTextColor ?? "muted";
	const errorThreshold = settings?.display.errorThreshold ?? 25;
	const warningThreshold = settings?.display.warningThreshold ?? 50;
	const successThreshold = settings?.display.successThreshold ?? 75;

	const usedPct = Math.round(window.usedPercent);
	const displayPct = isCodex ? Math.max(0, Math.min(100, 100 - usedPct)) : usedPct;
	const isRemaining = isCodex;

	const filled = Math.round((displayPct / 100) * barWidth);
	const empty = barWidth - filled;

	const baseColor = getUsageColor(displayPct, isRemaining, colorScheme, errorThreshold, warningThreshold, successThreshold);
	const barColor = (options?.useNormalColors && baseColor === "base") ? "text" : baseColor === "base" ? "muted" : baseColor;
	const textColor = (options?.useNormalColors && baseColor === "base")
		? "text"
		: baseColor === "base"
			? baseTextColor
			: baseColor;
	const char = getBarCharacter(barCharacter);

	const emptyColor = "dim";
	
	let barStr = "";
	if ((barStyle === "bar" || barStyle === "both") && barWidth > 0) {
		const levels = getBarTypeLevels(barType);
		if (!levels || barType === "horizontal-bar") {
			barStr = theme.fg(barColor as Parameters<typeof theme.fg>[0], char.repeat(filled)) + theme.fg(emptyColor, char.repeat(empty));
		} else {
			const emptyChar = barType === "braille" && brailleFillEmpty && barWidth > 1 ? "⣿" : " ";
			const { segments, minimal } = renderBarSegments(displayPct, barWidth, levels, {
				allowMinimum: true,
				emptyChar,
			});
			const filledColor = minimal ? "dim" : barColor;
			barStr = segments
				.map((segment) => {
					if (segment.filled) {
						return theme.fg(filledColor as Parameters<typeof theme.fg>[0], segment.char);
					}
					if (segment.char === " ") {
						return segment.char;
					}
					return theme.fg("dim", segment.char);
				})
				.join("");
		}

		if (settings?.display.containBar && barStr) {
			const leftCap = theme.fg(baseTextColor, "▕");
			const rightCap = theme.fg(baseTextColor, "▏");
			barStr = leftCap + barStr + rightCap;
		}
	}

	let pctStr = "";
	if (barStyle === "percentage" || barStyle === "both") {
		// Special handling for Copilot Month window - can show percentage or requests
		if (window.label === "Month" && usage?.provider === "copilot") {
			const quotaDisplay = settings?.providers.copilot.quotaDisplay ?? "percentage";
			if (quotaDisplay === "requests" && usage.requestsRemaining !== undefined && usage.requestsEntitlement !== undefined) {
				const used = usage.requestsEntitlement - usage.requestsRemaining;
				const suffix = showUsageLabels ? " used" : "";
				pctStr = theme.fg(textColor, `${used}/${usage.requestsEntitlement}${suffix}`);
			} else {
				const suffix = showUsageLabels ? " used" : "";
				pctStr = theme.fg(textColor, `${usedPct}%${suffix}`);
			}
		} else if (isCodex) {
			const suffix = showUsageLabels ? " rem." : "";
			pctStr = theme.fg(textColor, `${displayPct}%${suffix}`);
		} else {
			const suffix = showUsageLabels ? " used" : "";
			pctStr = theme.fg(textColor, `${usedPct}%${suffix}`);
		}
	}

	const isActiveReset = window.resetDescription === "__ACTIVE__";
	const resetText = isActiveReset
		? undefined
		: resetTimeFormat === "datetime"
			? (window.resetAt ? formatResetDateTime(window.resetAt) : window.resetDescription)
			: window.resetDescription;
	const leftSuffix = resetText && resetTimeFormat === "relative" && showUsageLabels ? " left" : "";

	let labelValue = window.label;
	if (resetText) {
		if (resetTimePosition === "front") {
			labelValue = `${window.label} (${resetText}${leftSuffix})`;
		} else if (resetTimePosition === "integrated") {
			labelValue = `${resetText}/${window.label}`;
		}
	}

	const labelPart = resetTimePosition === "back"
		? theme.fg(textColor, window.label)
		: theme.fg(textColor, labelValue);
	const resetPart =
		resetTimePosition === "back" && resetText
			? theme.fg(textColor, `(${resetText}${leftSuffix})`)
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
	const baseTextColor = settings?.display.baseTextColor ?? "muted";
	const label = formatProviderLabel(theme, usage, settings);

	// If no windows, just show the provider name with error
	if (usage.windows.length === 0) {
		const errorMsg = usage.error ? theme.fg(baseTextColor, `(${formatErrorForDisplay(usage.error)})`) : "";
		if (!label) {
			return errorMsg;
		}
		return errorMsg ? `${label} ${errorMsg}` : label;
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
		parts.push(theme.fg(baseTextColor, extra.label));
	}

	// Build divider from settings
	const dividerChar = settings?.display.dividerCharacter ?? "•";
	const blanksSetting = settings?.display.dividerBlanks ?? 1;
	const blanksPerSide = typeof blanksSetting === "number" ? blanksSetting : 1;
	const spacing = " ".repeat(blanksPerSide);
	const charToDisplay = dividerChar === "blank" ? " " : dividerChar === "none" ? "" : dividerChar;
	const divider = charToDisplay ? spacing + theme.fg(baseTextColor, charToDisplay) + spacing : spacing + spacing;
	const labelGap = label && parts.length > 0 ? " ".repeat(blanksPerSide) : "";

	return label + labelGap + parts.join(divider);
}

export function formatUsageStatusWithWidth(
	theme: Theme,
	usage: UsageSnapshot,
	width: number,
	modelId?: string,
	settings?: Settings,
	options?: { labelGapFill?: boolean }
): string | undefined {
	const labelGapFill = options?.labelGapFill ?? false;
	const baseTextColor = settings?.display.baseTextColor ?? "muted";
	const label = formatProviderLabel(theme, usage, settings);

	// If no windows, just show the provider name with error
	if (usage.windows.length === 0) {
		const errorMsg = usage.error ? theme.fg(baseTextColor, `(${formatErrorForDisplay(usage.error)})`) : "";
		if (!label) {
			return errorMsg;
		}
		return errorMsg ? `${label} ${errorMsg}` : label;
	}

	const barStyle: BarStyle = settings?.display.barStyle ?? "both";
	const hasBar = barStyle === "bar" || barStyle === "both";
	const barWidthSetting = settings?.display.barWidth ?? 6;
	const dividerBlanksSetting = settings?.display.dividerBlanks ?? 1;
	const containBar = settings?.display.containBar ?? false;

	const barFill = barWidthSetting === "fill";
	const barBaseWidth = typeof barWidthSetting === "number" ? barWidthSetting : (hasBar ? 1 : 0);
	const barContainerExtra = containBar && hasBar ? 2 : 0;
	const barBaseContentWidth = barFill ? 0 : barBaseWidth;
	const barBaseWidthCalc = barFill ? 0 : barBaseContentWidth + barContainerExtra;
	const barTotalBaseWidth = barBaseWidthCalc;
	const baseDividerBlanks = typeof dividerBlanksSetting === "number" ? dividerBlanksSetting : 1;

	const dividerFill = dividerBlanksSetting === "fill";

	// Build usage windows
	const windows: RateWindow[] = [];
	const isCodex = usage.provider === "codex";
	const invertUsage = isCodex && (settings?.providers.codex.invertUsage ?? false);

	for (const w of usage.windows) {
		if (!shouldShowWindow(usage, w, settings)) {
			continue;
		}
		windows.push(w);
	}

	const barEligibleCount = hasBar ? windows.length : 0;
	const extras = getUsageExtras(usage, settings, modelId);
	const extraParts = extras.map((extra) => theme.fg(baseTextColor, extra.label));

	const barSpacerWidth = hasBar ? 1 : 0;
	const baseWindowWidths = windows.map((w) =>
		visibleWidth(formatUsageWindow(theme, w, invertUsage, settings, usage, { barWidthOverride: 0 })) + barSpacerWidth
	);
	const extraWidths = extraParts.map((part) => visibleWidth(part));

	const partCount = windows.length + extraParts.length;
	const dividerCount = Math.max(0, partCount - 1);
	const dividerChar = settings?.display.dividerCharacter ?? "•";
	const charToDisplay = dividerChar === "blank" ? " " : dividerChar === "none" ? "" : dividerChar;
	const dividerBaseWidth = (charToDisplay ? 1 : 0) + baseDividerBlanks * 2;
	const labelGapEnabled = label !== "" && partCount > 0;
	const labelGapBaseWidth = labelGapEnabled ? baseDividerBlanks : 0;

	const labelWidth = visibleWidth(label);
	const baseTotalWidth =
		labelWidth +
		labelGapBaseWidth +
		baseWindowWidths.reduce((sum, w) => sum + w, 0) +
		extraWidths.reduce((sum, w) => sum + w, 0) +
		(barEligibleCount * barTotalBaseWidth) +
		(dividerCount * dividerBaseWidth);

	let remainingWidth = width - baseTotalWidth;
	if (remainingWidth < 0) {
		remainingWidth = 0;
	}

	const useBars = barFill && barEligibleCount > 0;
	const dividerSlots = dividerCount + (labelGapEnabled ? 1 : 0);
	const dividerUnits = dividerCount * 2 + (labelGapEnabled ? 1 : 0);
	const useDividers = dividerFill && dividerUnits > 0;

	let barExtraTotal = 0;
	let dividerExtraTotal = 0;
	if (remainingWidth > 0 && (useBars || useDividers)) {
		const barWeight = useBars ? barEligibleCount : 0;
		const dividerWeight = useDividers ? dividerUnits : 0;
		const totalWeight = barWeight + dividerWeight;
		if (totalWeight > 0) {
			barExtraTotal = Math.floor((remainingWidth * barWeight) / totalWeight);
			dividerExtraTotal = remainingWidth - barExtraTotal;
		}
	}

	const barWidths: number[] = windows.map(() => barBaseWidthCalc);
	if (useBars && barEligibleCount > 0) {
		const perBar = Math.floor(barExtraTotal / barEligibleCount);
		let remainder = barExtraTotal % barEligibleCount;
		for (let i = 0; i < barWidths.length; i++) {
			barWidths[i] = barBaseWidthCalc + perBar + (remainder > 0 ? 1 : 0);
			if (remainder > 0) remainder -= 1;
		}
	}

	let labelBlanks = labelGapEnabled ? baseDividerBlanks : 0;
	const dividerBlanks: number[] = [];
	if (dividerUnits > 0) {
		const baseUnit = useDividers ? Math.floor(dividerExtraTotal / dividerUnits) : 0;
		let remainderUnits = useDividers ? dividerExtraTotal % dividerUnits : 0;
		if (labelGapEnabled) {
			labelBlanks = baseDividerBlanks + baseUnit + (remainderUnits > 0 ? 1 : 0);
			if (remainderUnits > 0) remainderUnits -= 1;
		}
		for (let i = 0; i < dividerCount; i++) {
			let extraUnits = baseUnit * 2;
			if (remainderUnits >= 2) {
				extraUnits += 2;
				remainderUnits -= 2;
			}
			const blanks = baseDividerBlanks + Math.floor(extraUnits / 2);
			dividerBlanks.push(blanks);
		}
	}

	const parts: string[] = [];
	for (let i = 0; i < windows.length; i++) {
		const totalWidth = barWidths[i] ?? barBaseWidthCalc;
		const contentWidth = containBar ? Math.max(0, totalWidth - barContainerExtra) : totalWidth;
		parts.push(formatUsageWindow(theme, windows[i], invertUsage, settings, usage, { barWidthOverride: contentWidth }));
	}
	for (const extra of extraParts) {
		parts.push(extra);
	}

	let rest = "";
	for (let i = 0; i < parts.length; i++) {
		rest += parts[i];
		if (i < dividerCount) {
			const blanks = dividerBlanks[i] ?? baseDividerBlanks;
			const spacing = " ".repeat(Math.max(0, blanks));
			rest += charToDisplay
				? spacing + theme.fg(baseTextColor, charToDisplay) + spacing
				: spacing + spacing;
		}
	}

	let labelGap = labelGapEnabled ? Math.max(0, labelBlanks) : 0;
	if (labelGapFill && labelGapEnabled) {
		const restWidth = visibleWidth(rest);
		const totalWidth = visibleWidth(label) + restWidth + labelGap;
		const extraGap = Math.max(0, width - totalWidth);
		labelGap += extraGap;
	}

	let output = label;
	if (labelGapEnabled) {
		output += " ".repeat(labelGap);
	}
	output += rest;

	return output;
}
