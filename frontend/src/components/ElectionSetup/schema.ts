import { z } from 'zod';

export const electionSchema = z.object({
	name: z.string().min(1),
	nomination_start: z.date(),
	nomination_end: z.date(),
	voting_start: z.date(),
	voting_end: z.date(),
});
