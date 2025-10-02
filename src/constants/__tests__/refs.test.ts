import type { MutableRefObject } from 'react';

import { refs, setRefs } from '../refs';

describe('refs util', () => {
    it('sets refs value', () => {
        const map = new Map<number, HTMLParagraphElement>();
        const refObj = { current: map } as MutableRefObject<Map<number, HTMLParagraphElement>>;
        setRefs(refObj);
        expect(refs).toBe(refObj);
    });
});
