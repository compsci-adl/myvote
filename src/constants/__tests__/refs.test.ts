import { setRefs, refs } from '../refs';
import type { MutableRefObject } from 'react';

describe('refs util', () => {
  it('sets refs value', () => {
    const map = new Map<number, HTMLParagraphElement>();
    const refObj = { current: map } as MutableRefObject<Map<number, HTMLParagraphElement>>;
    setRefs(refObj);
    expect(refs).toBe(refObj);
  });
});
