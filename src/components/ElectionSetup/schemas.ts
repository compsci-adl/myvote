import { z } from 'zod';

const positionSchema = z.object({
    name: z.string().min(1, 'Position name is required'),
    description: z.string().min(1, 'Description is required'),
    vacancies: z.number().min(1, 'Vacancies must be at least 1'),
    executive: z.boolean(),
});

export const electionSchema = z.object({
    name: z.string().min(1, 'Election name is required'),
    positions: z.array(positionSchema).nonempty('At least one position is required'),
});
