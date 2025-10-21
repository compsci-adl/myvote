import useSWR from 'swr';

import { CACHE_KEYS, SWR_CONFIG } from '@/lib/cache-config';
import { fetcher } from '@/lib/fetcher';

export function useVotes(
    election_id: string | number | undefined,
    student_id: string | null | undefined
) {
    const { data, error, isLoading } = useSWR(
        election_id && student_id ? CACHE_KEYS.VOTES(String(election_id), student_id) : null,
        () => fetcher.get.query([`votes?election_id=${election_id}&student_id=${student_id}`]),
        SWR_CONFIG
    );
    return { data, error, isLoading };
}
