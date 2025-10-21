/**
 * Server-side cache utility for API routes
 * Uses in-memory caching with TTL
 */

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

class ServerCache {
    private cache = new Map<string, CacheEntry<unknown>>();

    /**
     * Get cached value if not expired
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;
        if (!entry) return null;

        const now = Date.now();
        if (entry.expiresAt < now) {
            this.cache.delete(key);
            return null;
        }

        return entry.data;
    }

    /**
     * Set cache value with TTL
     */
    set<T>(key: string, data: T, ttlSeconds: number): void {
        const expiresAt = Date.now() + ttlSeconds * 1000;
        this.cache.set(key, { data, expiresAt });
    }

    /**
     * Clear specific cache entry
     */
    clear(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all cache entries matching pattern
     */
    clearPattern(pattern: RegExp): void {
        const keysToDelete: string[] = [];
        this.cache.forEach((_, key) => {
            if (pattern.test(key)) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach((key) => this.cache.delete(key));
    }

    /**
     * Get or compute value
     */
    async getOrCompute<T>(
        key: string,
        computeFn: () => Promise<T>,
        ttlSeconds: number
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const data = await computeFn();
        this.set(key, data, ttlSeconds);
        return data;
    }

    /**
     * Get cache size (for debugging)
     */
    size(): number {
        return this.cache.size;
    }

    /**
     * Clear all cache
     */
    clearAll(): void {
        this.cache.clear();
    }
}

// Singleton instance
export const serverCache = new ServerCache();

/**
 * Cache key builders for common patterns
 */
export const serverCacheKeys = {
    elections: () => 'elections:all',
    position: (electionId: string) => `position:${electionId}`,
    candidate: (candidateId: string) => `candidate:${candidateId}`,
    candidatePositionLinks: (positionIds: string[]) =>
        `candidate-position-links:${positionIds.sort().join(',')}`,
    membership: (keycloakId: string) => `membership:${keycloakId}`,
    voter: (studentId: string, electionId: string) => `voter:${studentId}:${electionId}`,
} as const;
