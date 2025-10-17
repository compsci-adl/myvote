export interface Candidate {
    name: string;
    id: string;
    nominations: string[];
    statement: string;
    executive?: boolean;
}
