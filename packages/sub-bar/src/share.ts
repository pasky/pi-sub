/**
 * Display theme share helpers.
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

function encodeDisplaySharePayload(display: Settings["display"]): string {
	const payload: DisplaySharePayload = { v: DISPLAY_SHARE_VERSION, display };
	return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export function buildDisplayShareString(name: string, display: Settings["display"]): string {
	const encoded = encodeDisplaySharePayload(display);
	const trimmedName = name.trim() || "custom";
	return `${trimmedName}${SHARE_SEPARATOR}${encoded}`;
}

export function buildDisplayShareStringWithoutName(display: Settings["display"]): string {
	return encodeDisplaySharePayload(display);
}

export function decodeDisplayShareString(input: string): DecodedDisplayShare | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	let name = "custom";
	let payload = trimmed;
	const separatorIndex = trimmed.indexOf(SHARE_SEPARATOR);
	if (separatorIndex >= 0) {
		const candidateName = trimmed.slice(0, separatorIndex).trim();
		payload = trimmed.slice(separatorIndex + 1).trim();
		if (candidateName) {
			name = candidateName;
		}
	}
	if (!payload) return null;
	try {
		const decoded = Buffer.from(payload, "base64url").toString("utf-8");
		const parsed = JSON.parse(decoded) as unknown;
		if (!parsed || typeof parsed !== "object") return null;
		const displayCandidate = (parsed as DisplaySharePayload).display ?? parsed;
		if (!displayCandidate || typeof displayCandidate !== "object" || Array.isArray(displayCandidate)) {
			return null;
		}
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
