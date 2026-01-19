/**
 * Cache management for sub-bar
 * Shared cache across all pi instances to avoid redundant API calls
 */

import * as path from "node:path";
import type { ProviderName, ProviderStatus, UsageSnapshot } from "./types.js";
import { isExpectedMissingData } from "./errors.js";
import { getStorage } from "./storage.js";
import { getCachePath, getCacheLockPath } from "./paths.js";
import { tryAcquireFileLock, releaseFileLock, waitForLockRelease } from "./storage/lock.js";

/**
 * Cache entry for a provider
 */
export interface CacheEntry {
	fetchedAt: number;
	usage?: UsageSnapshot;
	status?: ProviderStatus;
}

/**
 * Cache structure
 */
export interface Cache {
	[provider: string]: CacheEntry;
}

export type CacheUpdateListener = (provider: ProviderName, entry?: CacheEntry) => void;

const cacheUpdateListeners = new Set<CacheUpdateListener>();

export function onCacheUpdate(listener: CacheUpdateListener): () => void {
	cacheUpdateListeners.add(listener);
	return () => {
		cacheUpdateListeners.delete(listener);
	};
}

function emitCacheUpdate(provider: ProviderName, entry?: CacheEntry): void {
	for (const listener of cacheUpdateListeners) {
		try {
			listener(provider, entry);
		} catch (error) {
			console.error("Failed to notify cache update:", error);
		}
	}
}

/**
 * Cache file path
 */
export const CACHE_PATH = getCachePath();

/**
 * Lock file path
 */
const LOCK_PATH = getCacheLockPath();

/**
 * Lock timeout in milliseconds
 */
const LOCK_TIMEOUT_MS = 5000;

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
	const storage = getStorage();
	const dir = path.dirname(CACHE_PATH);
	storage.ensureDir(dir);
}

/**
 * Read cache from disk
 */
export function readCache(): Cache {
	const storage = getStorage();
	try {
		if (storage.exists(CACHE_PATH)) {
			const content = storage.readFile(CACHE_PATH);
			if (content) {
				return JSON.parse(content) as Cache;
			}
		}
	} catch (error) {
		console.error("Failed to read cache:", error);
	}
	return {};
}

/**
 * Write cache to disk
 */
function writeCache(cache: Cache): void {
	const storage = getStorage();
	try {
		ensureCacheDir();
		const content = JSON.stringify(cache, null, 2);
		storage.writeFile(CACHE_PATH, content);
	} catch (error) {
		console.error("Failed to write cache:", error);
	}
}

/**
 * Wait for lock to be released and re-check cache
 * Returns the cache entry if it became fresh while waiting
 */
async function waitForLockAndRecheck(
	provider: ProviderName,
	ttlMs: number,
	maxWaitMs: number = 3000
): Promise<CacheEntry | null> {
	const released = await waitForLockRelease(LOCK_PATH, maxWaitMs);
	if (!released) {
		return null;
	}

	const cache = readCache();
	const entry = cache[provider];
	if (entry && Date.now() - entry.fetchedAt < ttlMs) {
		return entry;
	}
	return null;
}

/**
 * Get cached data for a provider if fresh, or null if stale/missing
 */
export async function getCachedData(
	provider: ProviderName,
	ttlMs: number
): Promise<CacheEntry | null> {
	const cache = readCache();
	const entry = cache[provider];
	
	if (!entry) {
		return null;
	}
	
	const age = Date.now() - entry.fetchedAt;
	if (age < ttlMs) {
		return entry;
	}
	
	return null;
}

/**
 * Fetch data with lock coordination
 * Returns cached data if fresh, or executes fetchFn if cache is stale
 */
export async function fetchWithCache<T extends { usage?: UsageSnapshot; status?: ProviderStatus }>(
	provider: ProviderName,
	ttlMs: number,
	fetchFn: () => Promise<T>,
	options?: { force?: boolean }
): Promise<T> {
	const forceRefresh = options?.force === true;

	if (!forceRefresh) {
		// Check cache first
		const cached = await getCachedData(provider, ttlMs);
		if (cached) {
			return { usage: cached.usage, status: cached.status } as T;
		}
	}
	
	// Cache is stale or forced refresh, try to acquire lock
	const lockAcquired = tryAcquireFileLock(LOCK_PATH, LOCK_TIMEOUT_MS);
	
	if (!lockAcquired) {
		// Another process is fetching, wait and re-check cache
		const freshEntry = await waitForLockAndRecheck(provider, ttlMs);
		if (freshEntry) {
			return { usage: freshEntry.usage, status: freshEntry.status } as T;
		}
		// Timeout or cache still stale, fetch anyway
	}
	
	try {
		// Fetch fresh data
		const result = await fetchFn();
		
		// Only cache if we got valid usage data (not just no-credentials errors)
		const hasCredentialError = result.usage?.error && isExpectedMissingData(result.usage.error);
		const shouldCache = result.usage && !hasCredentialError;
		
		const cache = readCache();
		
		if (shouldCache) {
			// Update cache with valid data
			cache[provider] = {
				fetchedAt: Date.now(),
				usage: result.usage,
				status: result.status,
			};
			writeCache(cache);
			emitCacheUpdate(provider, cache[provider]);
		} else if (hasCredentialError) {
			// Remove from cache if no credentials
			if (cache[provider]) {
				delete cache[provider];
				writeCache(cache);
				emitCacheUpdate(provider, undefined);
			}
		}
		
		return result;
	} finally {
		if (lockAcquired) {
			releaseFileLock(LOCK_PATH);
		}
	}
}

/**
 * Clear cache for a specific provider or all providers
 */
export function clearCache(provider?: ProviderName): void {
	const storage = getStorage();
	if (provider) {
		const cache = readCache();
		delete cache[provider];
		writeCache(cache);
	} else {
		try {
			if (storage.exists(CACHE_PATH)) {
				storage.removeFile(CACHE_PATH);
			}
		} catch (error) {
			console.error("Failed to clear cache:", error);
		}
	}
}
