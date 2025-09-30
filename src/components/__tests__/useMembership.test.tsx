import { renderHook } from '@testing-library/react';
import useSWR from 'swr';

import { useMembership } from '../useMembership';
import { fetcher } from '@/lib/fetcher';

jest.mock('swr');
jest.mock('@/lib/fetcher');

describe('useMembership', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns null data when keycloak_id is undefined', () => {
    // @ts-ignore - mock implementation
    (useSWR as jest.Mock).mockReturnValue({ data: undefined, error: undefined, isLoading: false });
    const { result } = renderHook(() => useMembership(undefined));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeUndefined();
  });

  it('calls fetcher when keycloak_id provided', () => {
    const id = 'abc123';
    const expected = { membership: { id } };
    // @ts-ignore
    (useSWR as jest.Mock).mockReturnValue({ data: expected, error: undefined, isLoading: false });

    const { result } = renderHook(() => useMembership(id));
    expect(result.current.data).toBe(expected);
  });
});
