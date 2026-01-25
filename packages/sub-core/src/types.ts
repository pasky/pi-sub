/**
 * Core types for the sub-bar extension
 */

export type {
	ProviderName,
	StatusIndicator,
	ProviderStatus,
	RateWindow,
	UsageSnapshot,
	UsageError,
	UsageErrorCode,
	ProviderUsageEntry,
	SubCoreState,
	SubCoreEvents,
} from "@marckrenn/pi-sub-shared";

export { PROVIDERS } from "@marckrenn/pi-sub-shared";

/**
 * Dependencies that can be injected for testing
 */
export interface Dependencies {
	fetch: typeof globalThis.fetch;
	readFile: (path: string) => string | undefined;
	fileExists: (path: string) => boolean;
	execSync: (command: string, options?: { encoding: string; timeout?: number; env?: NodeJS.ProcessEnv; stdio?: any[] }) => string;
	homedir: () => string;
	env: NodeJS.ProcessEnv;
}
