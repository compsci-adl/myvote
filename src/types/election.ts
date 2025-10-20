import type { ElectionStatus } from '@/db/schema';

export type Election = {
    id: string;
    name: string;
    status: ElectionStatus;
};
