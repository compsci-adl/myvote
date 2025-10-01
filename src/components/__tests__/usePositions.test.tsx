import { renderHook } from '@testing-library/react';
import useSWR from 'swr';

import { usePositions } from '../usePositions';

jest.mock('swr');

describe('usePositions', () => {
    afterEach(() => jest.resetAllMocks());

    it('returns undefined when election_id is undefined', () => {
        (useSWR as jest.Mock).mockReturnValue({
            data: undefined,
            error: undefined,
            isLoading: false,
        });
        const { result } = renderHook(() => usePositions(undefined));
        expect(result.current.data).toBeUndefined();
    });

    it('returns data when election_id is provided', () => {
        const id = 1;
        const expected = [{ id, name: 'Position A' }];
        (useSWR as jest.Mock).mockReturnValue({
            data: expected,
            error: undefined,
            isLoading: false,
        });

        const { result } = renderHook(() => usePositions(id));
        expect(result.current.data).toBe(expected);
    });
});
