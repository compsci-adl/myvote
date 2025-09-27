import useSWR from 'swr';

import { fetcher } from '@/lib/fetcher';

export function useMembership(keycloak_id: string | undefined) {
    const { data, error, isLoading } = useSWR(
        keycloak_id ? ['membership', keycloak_id] : null,
        () => fetcher.get.query([`membership?keycloak_id=${keycloak_id}`])
    );
    return { data, error, isLoading };
}
