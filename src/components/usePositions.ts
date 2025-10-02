import useSWR from 'swr';

import { fetcher } from '@/lib/fetcher';

export function usePositions(election_id: string | number | undefined) {
    const { data, error, isLoading } = useSWR(election_id ? ['positions', election_id] : null, () =>
        fetcher.get.query([`positions?election_id=${election_id}`])
    );
    return { data, error, isLoading };
}
