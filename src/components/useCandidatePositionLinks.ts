import useSWR from 'swr';

import { CACHE_KEYS, SWR_CONFIG } from '@/lib/cache-config';
import { fetcher } from '@/lib/fetcher';

export function useCandidatePositionLinks(position_id: string | undefined) {
    const { data, error, isLoading } = useSWR(
        position_id ? [CACHE_KEYS.CANDIDATES, position_id] : null,
        () => fetcher.get.query([`candidate-position-links?position_id=${position_id}`]),
        SWR_CONFIG
    );
    return { data, error, isLoading };
}

export function useCandidatePositionLinksMultiple(position_ids: string[] | undefined) {
    const cacheKey =
        position_ids && position_ids.length > 0
            ? CACHE_KEYS.CANDIDATE_POSITION_LINKS(position_ids)
            : null;

    const { data, error, isLoading } = useSWR(
        cacheKey,
        () =>
            fetcher.get.query([
                'candidate-position-links',
                {
                    searchParams: { position_ids: position_ids?.join(',') },
                },
            ]),
        SWR_CONFIG
    );
    return { data, error, isLoading };
}
