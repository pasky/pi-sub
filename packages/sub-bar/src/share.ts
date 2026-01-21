/**
 * Display settings share helpers.
 */

import type { Settings } from "./settings-types.js";
import { mergeSettings } from "./settings-types.js";

const SHARE_SEPARATOR = ":";
const DISPLAY_SHARE_VERSION = 1;

export interface DisplaySharePayload {
	v: number;
	display: Settings["display"];
}

export interface DecodedDisplayShare {
	name: string;
	display: Settings["display"];
	version: number;
	isNewerVersion: boolean;
}

export function buildDisplayShareString(name: string, display: Settings["display"]): string {
	const payload: DisplaySharePayload = { v: DISPLAY_SHARE_VERSION, display };
	const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
	const trimmedName = name.trim() || "custom";
	return `${trimmedName}${SHARE_SEPARATOR}${encoded}`;
}

export function decodeDisplayShareString(input: string): DecodedDisplayShare | null {
	const trimmed = input.trim();
	const separatorIndex = trimmed.indexOf(SHARE_SEPARATOR);
	if (separatorIndex <= 0) return null;
	const name = trimmed.slice(0, separatorIndex).trim() || "custom";
	const payload = trimmed.slice(separatorIndex + 1).trim();
	if (!payload) return null;
	try {
		const decoded = Buffer.from(payload, "base64url").toString("utf-8");
		const parsed = JSON.parse(decoded) as Partial<DisplaySharePayload> | Settings["display"];
		const displayCandidate = (parsed as DisplaySharePayload).display ?? parsed;
		const merged = mergeSettings({ display: displayCandidate } as Partial<Settings>).display;
		const version = typeof (parsed as DisplaySharePayload).v === "number" ? (parsed as DisplaySharePayload).v : 0;
		return {
			name,
			display: merged,
			version,
			isNewerVersion: version > DISPLAY_SHARE_VERSION,
		};
	} catch {
		return null;
	}
}
