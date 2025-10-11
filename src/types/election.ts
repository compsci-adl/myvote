import type { ElectionStatus } from '@/db/schema';

export type Election = {
    id: number;
    name: string;
    status: ElectionStatus;
};
