import React, { useRef } from 'react';
import { render } from '@testing-library/react';

// Mock atlaskit prag-dnd exports used in hook
jest.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
    combine: jest.fn((...args: any[]) => () => {}),
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
    draggable: jest.fn(() => () => {}),
    dropTargetForElements: jest.fn(() => () => {}),
}));

import { useDND } from '../dnd';

function TestComponent() {
    const ref = useRef<HTMLDivElement | null>(null);
    useDND(ref, { key: 'value' } as any, { another: 'value' } as any, []);
    return <div ref={ref}>drag</div>;
}

describe('useDND', () => {
    it('mounts without throwing', () => {
        expect(() => render(<TestComponent />)).not.toThrow();
    });
});
