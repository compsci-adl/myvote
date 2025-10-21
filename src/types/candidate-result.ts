export interface CandidateResult {
    id: string;
    name: string;
    ranking: number;
    total_points: number;
    borda_points: number;
    excluded: boolean;
}
