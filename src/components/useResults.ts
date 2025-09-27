import useSWR from 'swr';

import { fetcher } from '@/lib/fetcher';

export function useResults(election_id: string | number | undefined) {
    const { data, error, isLoading } = useSWR(election_id ? ['results', election_id] : null, () =>
        fetcher.get.query([`results?election_id=${election_id}`])
    );
    return { data, error, isLoading };
}
