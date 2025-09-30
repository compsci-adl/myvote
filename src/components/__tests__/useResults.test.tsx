import { renderHook } from '@testing-library/react';
import useSWR from 'swr';

import { useResults } from '../useResults';

jest.mock('swr');

describe('useResults', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns undefined when election_id is undefined', () => {
    // @ts-ignore
    (useSWR as jest.Mock).mockReturnValue({ data: undefined, error: undefined, isLoading: false });
    const { result } = renderHook(() => useResults(undefined));
    expect(result.current.data).toBeUndefined();
  });

  it('returns data when election_id is provided', () => {
    const id = 2;
    const expected = { election_id: id, votes: [] };
    // @ts-ignore
    (useSWR as jest.Mock).mockReturnValue({ data: expected, error: undefined, isLoading: false });

    const { result } = renderHook(() => useResults(id));
    expect(result.current.data).toBe(expected);
  });
});
