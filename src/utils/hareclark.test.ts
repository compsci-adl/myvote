// Silence tie warnings in tests
beforeAll(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});
afterAll(() => {
    (console.warn as jest.Mock).mockRestore();
});
import { hareclark } from './hareclark';
it('handles a candidate winning multiple positions and choosing one', () => {
    // Simulate two positions, with overlapping candidates
    const candidatesA = ['A', 'B', 'C'];
    const candidatesB = ['A', 'D', 'E'];
    const ballotsA = [
        ['A', 'B', 'C'],
        ['B', 'A', 'C'],
        ['A', 'C', 'B'],
        ['C', 'A', 'B'],
    ];
    const ballotsB = [
        ['A', 'D', 'E'],
        ['D', 'A', 'E'],
        ['A', 'E', 'D'],
        ['E', 'A', 'D'],
    ];

    const winnerA = hareclark(candidatesA, ballotsA, 1)[0];
    const winnerB = hareclark(candidatesB, ballotsB, 1)[0];
    expect(winnerA).toBe('A');
    expect(winnerB).toBe('A');

    // Simulate candidate A chooses to take position A, so must be removed from B
    const candidatesB2 = candidatesB.filter((c) => c !== 'A');
    const ballotsB2 = ballotsB.map((b) => b.filter((c) => c !== 'A'));
    const newWinnerB = hareclark(candidatesB2, ballotsB2, 1)[0];
    expect(['D', 'E']).toContain(newWinnerB);
});

describe('hareclark', () => {
    it('basic', () => {
        const res = hareclark(
            // Candidate IDs
            ['0', '1', '2', '3', '4', '5', '6', '7'],
            // Each ballot is an ID of a candidate, in order from first as highest preference
            [
                ['4', '0', '6', '5', '2', '3', '7', '1'],
                ['1', '4', '6', '5', '3', '7', '2', '0'],
                ['2', '4', '7', '1', '0', '5', '6', '3'],
                ['0', '3', '4', '7', '6', '2', '5', '1'],
                ['5', '7', '0', '3', '4', '6', '1', '2'],
                ['2', '1', '4', '0', '5', '3', '7', '6'],
                ['0', '6', '4', '2', '5', '7', '3', '1'],
                ['2', '4', '6', '5', '3', '0', '7', '1'],
            ],
            2
        );
        expect(res).toEqual(['0', '2']);
    });

    it('extended', () => {
        const res = hareclark(
            ['0', '1', '2', '3', '4', '5', '6', '7'],
            [
                ['4', '0', '6', '5', '2', '3', '7', '1'],
                ['1', '4', '6', '5', '3', '7', '2', '0'],
                ['2', '4', '7', '1', '0', '5', '6', '3'],
                ['0', '3', '4', '7', '6', '2', '5', '1'],
                ['5', '7', '0', '3', '4', '6', '1', '2'],
                ['2', '1', '4', '0', '5', '3', '7', '6'],
                ['0', '6', '4', '2', '5', '7', '3', '1'],
                ['2', '4', '6', '5', '3', '0', '7', '1'],
                ['6', '5', '1', '4', '3', '0', '2', '7'],
                ['5', '1', '0', '3', '7', '4', '2', '6'],
                ['5', '6', '3', '0', '2', '4', '1', '7'],
                ['3', '0', '1', '4', '5', '6', '7', '2'],
                ['5', '0', '1', '3', '4', '2', '7', '6'],
                ['0', '5', '4', '6', '7', '3', '2', '1'],
                ['5', '4', '7', '2', '1', '0', '3', '6'],
                ['5', '2', '0', '7', '1', '4', '3', '6'],
                ['2', '3', '1', '4', '5', '0', '7', '6'],
                ['4', '5', '7', '1', '2', '3', '6', '0'],
                ['1', '5', '4', '2', '6', '3', '0', '7'],
                ['2', '5', '1', '7', '4', '3', '6', '0'],
                ['3', '6', '2', '4', '1', '5', '7', '0'],
                ['6', '1', '0', '7', '3', '5', '2', '4'],
                ['4', '3', '0', '6', '5', '1', '2', '7'],
                ['0', '2', '6', '4', '3', '7', '1', '5'],
                ['7', '0', '6', '5', '3', '1', '2', '4'],
                ['4', '0', '2', '7', '5', '6', '3', '1'],
                ['6', '0', '4', '5', '2', '3', '1', '7'],
                ['3', '6', '7', '4', '0', '5', '2', '1'],
                ['1', '3', '5', '7', '6', '4', '0', '2'],
                ['5', '4', '6', '3', '0', '1', '7', '2'],
                ['0', '4', '2', '1', '5', '7', '3', '6'],
                ['6', '5', '3', '0', '4', '7', '2', '1'],
            ],
            4
        );
        expect(res.sort()).toEqual(['0', '4', '5', '6'].sort());
    });
});
it('handles string candidate IDs (Events Officer example)', () => {
    const candidateIds = [
        '0ee9c076-41ef-4e26-978e-4fbf4a6936a9',
        'add75ad8-afd3-4983-8b13-c5008ecd98af',
        '8f6ebdd4-80a0-46b9-b64b-8426e3862a63',
        '0294d4b1-6838-493d-b44d-d137dcf33253',
        '75bf8000-9696-40f4-b594-9a944d5bd961',
    ];
    const ballots = [
        [
            '0ee9c076-41ef-4e26-978e-4fbf4a6936a9',
            'add75ad8-afd3-4983-8b13-c5008ecd98af',
            '8f6ebdd4-80a0-46b9-b64b-8426e3862a63',
            '0294d4b1-6838-493d-b44d-d137dcf33253',
        ],
        [
            '0ee9c076-41ef-4e26-978e-4fbf4a6936a9',
            'add75ad8-afd3-4983-8b13-c5008ecd98af',
            '8f6ebdd4-80a0-46b9-b64b-8426e3862a63',
            '0294d4b1-6838-493d-b44d-d137dcf33253',
        ],
        [
            '0294d4b1-6838-493d-b44d-d137dcf33253',
            'add75ad8-afd3-4983-8b13-c5008ecd98af',
            '0ee9c076-41ef-4e26-978e-4fbf4a6936a9',
            '8f6ebdd4-80a0-46b9-b64b-8426e3862a63',
        ],
        [
            '0294d4b1-6838-493d-b44d-d137dcf33253',
            '0ee9c076-41ef-4e26-978e-4fbf4a6936a9',
            '8f6ebdd4-80a0-46b9-b64b-8426e3862a63',
            'add75ad8-afd3-4983-8b13-c5008ecd98af',
        ],
        [
            '0ee9c076-41ef-4e26-978e-4fbf4a6936a9',
            '0294d4b1-6838-493d-b44d-d137dcf33253',
            'add75ad8-afd3-4983-8b13-c5008ecd98af',
            '8f6ebdd4-80a0-46b9-b64b-8426e3862a63',
        ],
    ];
    const result: string[] = hareclark(candidateIds, ballots, 2);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
});
