import type { MutableRefObject } from 'react';

export let refs: MutableRefObject<Map<number, HTMLParagraphElement>> | null =
	null;
export function setRefs(
	value: MutableRefObject<Map<number, HTMLParagraphElement>>,
) {
	refs = value;
}
