/**
 * Cache configuration for both client and server-side caching
 */

// Client-side SWR cache settings
export const SWR_CONFIG = {
    // Revalidate every 5 minutes (300 seconds)
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute - prevent duplicate requests
    focusThrottleInterval: 300000, // 5 minutes
    errorRetryCount: 2,
    errorRetryInterval: 5000,
    shouldRetryOnError: true,
};

// Server-side cache TTL (in seconds)
export const SERVER_CACHE_TTL = {
    ELECTIONS: 300, // 5 minutes
    POSITIONS: 300, // 5 minutes
    CANDIDATES: 600, // 10 minutes
    CANDIDATE_POSITION_LINKS: 600, // 10 minutes
    MEMBERSHIP: 60, // 1 minute - frequently changes
    VOTES: 0, // No caching - real-time check
} as const;

// Cache keys for client-side
export const CACHE_KEYS = {
    ELECTIONS: 'elections',
    POSITIONS: (electionId: string) => `positions:${electionId}`,
    CANDIDATES: 'candidates',
    CANDIDATE_POSITION_LINKS: (positionIds: string[]) =>
        `candidate-position-links:${positionIds.sort().join(',')}`,
    MEMBERSHIP: (keycloakId: string) => `membership:${keycloakId}`,
    VOTES: (electionId: string, studentId: string) => `votes:${electionId}:${studentId}`,
} as const;
