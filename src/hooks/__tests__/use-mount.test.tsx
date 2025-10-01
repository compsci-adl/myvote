import { render } from '@testing-library/react';
import React from 'react';

import { useMount } from '../use-mount';

function TestComponent({ fn }: { fn: () => void }) {
    useMount(fn);
    return <div />;
}

describe('useMount', () => {
    it('calls the provided function only once across re-renders', () => {
        const fn = jest.fn();
        const { rerender } = render(<TestComponent fn={fn} />);
        expect(fn).toHaveBeenCalledTimes(1);
        rerender(<TestComponent fn={fn} />);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
