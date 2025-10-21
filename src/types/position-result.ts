import type { CandidateResult } from './candidate-result';
import type { Winner } from './winner';

export interface PositionResult {
    position_id: string;
    position_name: string;
    winners: Winner[];
    candidates: CandidateResult[];
    vacancies: number;
}
