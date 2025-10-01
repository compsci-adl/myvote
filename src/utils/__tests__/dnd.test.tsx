import {
    draggable,
    dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { render } from '@testing-library/react';
import React, { useRef } from 'react';

// Mock atlaskit prag-dnd exports used in hook
jest.mock('@atlaskit/pragmatic-drag-and-drop/combine', () => ({
    combine: jest.fn(() => () => {}),
}));

jest.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
    draggable: jest.fn(() => () => {}),
    dropTargetForElements: jest.fn(() => () => {}),
}));

import { useDND } from '../dnd';

function TestComponent() {
    const ref = useRef<HTMLDivElement | null>(null);
    // Provide minimal valid props for draggable and dropTargetForElements
    useDND(
        ref,
        { key: 'value' } as Omit<Parameters<typeof draggable>[0], 'element'>,
        { type: 'test' } as Omit<Parameters<typeof dropTargetForElements>[0], 'element'>,
        []
    );
    return <div ref={ref}>drag</div>;
}

describe('useDND', () => {
    it('mounts without throwing', () => {
        expect(() => render(<TestComponent />)).not.toThrow();
    });
});
