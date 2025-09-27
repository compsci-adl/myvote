import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
    draggable,
    dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import type { DependencyList, MutableRefObject } from 'react';
import { useEffect } from 'react';

export const useDND = <T extends HTMLElement | null>(
    ref: MutableRefObject<T>,
    props1: Omit<Parameters<typeof draggable>[0], 'element'>,
    props2: Omit<Parameters<typeof dropTargetForElements>[0], 'element'>,
    deps: DependencyList = []
) => {
    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        return combine(
            draggable({
                element,
                ...props1,
            }),
            dropTargetForElements({
                element,
                ...props2,
            })
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);
};
