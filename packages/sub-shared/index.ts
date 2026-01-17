/**
 * Shared types for sub-* extensions.
 *
 * TODO: move ProviderName/UsageSnapshot/event payloads here once sub-core/sub-bar migrate.
 */

export type SubCoreState = {
	provider?: string;
	usage?: unknown;
};

export type SubCoreEvents =
	| { type: "sub-core:ready"; state: SubCoreState }
	| { type: "sub-core:update"; state: SubCoreState };
