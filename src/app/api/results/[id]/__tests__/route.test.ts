/** @jest-environment node */

import type { NextRequest } from 'next/server';

import {
    candidates,
    candidatePositionLinks,
    positions,
    ballots,
} from '@/db/schema';
import { GET, POST } from '../route';

interface Fixture {
    positions: {
        id: string;
        name: string;
        executive: boolean;
        vacancies: number;
    }[];
    candidates: { id: string; name: string }[];
    links: { position_id: string; candidate_id: string }[];
    ballots: { position: string; preferences: unknown }[];
}

interface CandidateResult {
    id: string;
    total_points: number;
    borda_points: number;
    excluded: boolean;
}

interface ApiResponse {
    status: number;
    body: {
        error?: string;
        results: {
            position_id: string;
            winners: CandidateResult[];
            candidates: CandidateResult[];
        }[];
    };
}

let mockFixture: Fixture;
const mockAuth = jest.fn();

jest.mock('@/auth', () => ({ auth: () => mockAuth() }));
jest.mock('next/server', () => ({
    NextResponse: {
        json: (body: unknown, init?: { status: number }) => ({
            body,
            status: init?.status ?? 200,
        }),
    },
}));
jest.mock('@/db/index', () => ({
    db: {
        select: () => ({
            from: (table: unknown) => {
                if (table === candidatePositionLinks)
                    return Promise.resolve(mockFixture.links);
                if (table === ballots) {
                    return {
                        innerJoin: () => ({
                            where: async () =>
                                mockFixture.ballots.map((ballot) => ({
                                    ballot,
                                })),
                        }),
                    };
                }
                return {
                    where: async () => {
                        if (table === positions) return mockFixture.positions;
                        if (table === candidates) return mockFixture.candidates;
                        throw new Error('Unexpected table');
                    },
                };
            },
        }),
    },
}));

function request(body?: unknown): NextRequest {
    return {
        url: 'http://localhost/api/results/election-1',
        json: async () => body,
    } as NextRequest;
}

async function getResults(): Promise<ApiResponse> {
    return (await GET(request())) as unknown as ApiResponse;
}

async function confirm(
    confirmedPositions: string[],
    manualOverrides: Record<string, string[]> = {},
): Promise<ApiResponse> {
    return (await POST(
        request({ confirmedPositions, manualOverrides }),
    )) as unknown as ApiResponse;
}

function winners(response: ApiResponse, positionId: string): string[] {
    return response.body.results
        .find((result) => result.position_id === positionId)!
        .winners.map((candidate) => candidate.id);
}

function setAdmin() {
    mockAuth.mockResolvedValue({
        user: { id: 'admin' },
        accessToken: `header.${Buffer.from(
            JSON.stringify({ realm_access: { roles: ['myvote-admin'] } }),
        ).toString('base64')}.signature`,
    });
}

beforeEach(() => {
    mockAuth.mockReset();
    setAdmin();
    mockFixture = {
        positions: [
            {
                id: 'manager',
                name: 'Events Manager',
                executive: false,
                vacancies: 1,
            },
            {
                id: 'treasurer',
                name: 'Treasurer',
                executive: true,
                vacancies: 1,
            },
            {
                id: 'vice',
                name: 'Vice-President',
                executive: true,
                vacancies: 1,
            },
            {
                id: 'president',
                name: 'President',
                executive: true,
                vacancies: 1,
            },
        ],
        candidates: [
            { id: 'c', name: 'Charlie' },
            { id: 'a', name: 'Alice' },
            { id: 'd', name: 'Dana' },
            { id: 'b', name: 'Bob' },
        ],
        links: [
            ...['president', 'vice', 'treasurer', 'manager'].flatMap(
                (position_id) =>
                    ['a', 'b', 'c'].map((candidate_id) => ({
                        position_id,
                        candidate_id,
                    })),
            ),
            { position_id: 'vice', candidate_id: 'd' },
            { position_id: 'manager', candidate_id: 'd' },
        ],
        ballots: ['treasurer', 'vice', 'president'].flatMap((position) => [
            { position, preferences: ['a', 'b', 'c'] },
            { position, preferences: ['a', 'b', 'c'] },
            { position, preferences: ['a', 'b', 'c'] },
            { position, preferences: ['c', 'b', 'a'] },
        ]),
    };
});

describe('ordered provisional and confirmed results', () => {
    test('GET includes zero-ballot offices and does not exclude provisional officeholders', async () => {
        const response = await getResults();
        expect(response.status).toBe(200);
        expect(
            response.body.results.map((result) => result.position_id),
        ).toEqual(['president', 'vice', 'treasurer', 'manager']);
        expect(winners(response, 'president')).toEqual(['a']);
        expect(winners(response, 'vice')).toEqual(['a']);
        expect(winners(response, 'treasurer')).toEqual(['a']);
        expect(winners(response, 'manager')).toEqual([]);
        expect(
            response.body.results
                .flatMap((result) => result.candidates)
                .every((candidate) => !candidate.excluded),
        ).toBe(true);
        expect(
            response.body.results[1].candidates.find(
                (candidate) => candidate.id === 'd',
            ),
        ).toMatchObject({ excluded: false, total_points: 0 });
        expect(await confirm([])).toEqual(response);
    });

    test('replays cumulative exclusions and transfers preferences without changing earlier results', async () => {
        const originalBallots = JSON.parse(JSON.stringify(mockFixture.ballots));
        const initial = await getResults();
        const presidentConfirmed = await confirm(['president']);
        expect(presidentConfirmed.status).toBe(200);
        expect(presidentConfirmed.body.results[0]).toEqual(
            initial.body.results[0],
        );
        expect(winners(presidentConfirmed, 'vice')).toEqual(['b']);
        expect(winners(presidentConfirmed, 'treasurer')).toEqual(['b']);
        expect(presidentConfirmed.body.results[1].candidates).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: 'a',
                    excluded: true,
                    total_points: 0,
                }),
                expect.objectContaining({
                    id: 'b',
                    excluded: false,
                    total_points: 4,
                }),
            ]),
        );

        const viceConfirmed = await confirm(['president', 'vice']);
        expect(viceConfirmed.status).toBe(200);
        expect(viceConfirmed.body.results.slice(0, 2)).toEqual(
            presidentConfirmed.body.results.slice(0, 2),
        );
        expect(winners(viceConfirmed, 'treasurer')).toEqual(['c']);
        expect(
            viceConfirmed.body.results[2].candidates
                .filter((candidate) => candidate.excluded)
                .map((candidate) => candidate.id)
                .sort(),
        ).toEqual(['a', 'b']);

        const allConfirmed = await confirm([
            'president',
            'vice',
            'treasurer',
            'manager',
        ]);
        expect(allConfirmed.status).toBe(200);
        expect(allConfirmed.body.results.slice(0, 3)).toEqual(
            viceConfirmed.body.results.slice(0, 3),
        );
        expect(winners(allConfirmed, 'manager')).toEqual([]);
        expect(
            allConfirmed.body.results
                .flatMap((result) => result.winners)
                .map((candidate) => candidate.id),
        ).toEqual(['a', 'b', 'c']);
        expect(
            await confirm(['president', 'vice', 'treasurer', 'manager']),
        ).toEqual(allConfirmed);
        expect(mockFixture.ballots).toEqual(originalBallots);
    });

    test('preserves Hare-Clark ties rather than using Borda to truncate winners', async () => {
        mockFixture.ballots = [
            { position: 'president', preferences: ['a', 'b'] },
            { position: 'president', preferences: ['b', 'c', 'a'] },
        ];
        const provisional = await getResults();
        expect(winners(provisional, 'president')).toEqual(['a', 'b']);
        expect((await confirm(['president'])).status).toBe(400);
        const overridden = await confirm(['president'], { president: ['b'] });
        expect(overridden.status).toBe(200);
        expect(winners(overridden, 'president')).toEqual(['b']);
    });

    test('allows explicit empty overrides and manual election without ballots', async () => {
        const vacant = await confirm(['president'], { president: [] });
        expect(vacant.status).toBe(200);
        expect(winners(vacant, 'president')).toEqual([]);
        expect(winners(vacant, 'vice')).toEqual(['a']);

        const manualOverrides = {
            president: [],
            vice: [],
            treasurer: [],
            manager: ['d'],
        };
        const response = await confirm(
            ['president', 'vice', 'treasurer', 'manager'],
            manualOverrides,
        );
        expect(response.status).toBe(200);
        expect(winners(response, 'manager')).toEqual(['d']);
    });

    test('does not elect unsupported candidates when all supported nominees were excluded', async () => {
        mockFixture.ballots = mockFixture.ballots.filter(
            (ballot) => ballot.position === 'president',
        );
        mockFixture.ballots.push({ position: 'vice', preferences: ['a'] });
        const response = await confirm(['president']);
        expect(response.status).toBe(200);
        expect(winners(response, 'vice')).toEqual([]);
        expect(
            response.body.results[1].candidates.find(
                (candidate) => candidate.id === 'a',
            ),
        ).toMatchObject({ excluded: true });
    });

    test('position and candidate input ordering does not affect output', async () => {
        const response = await confirm(['president', 'vice']);
        mockFixture.positions.reverse();
        mockFixture.candidates.reverse();
        mockFixture.links.reverse();
        mockFixture.ballots.reverse();
        expect(await confirm(['president', 'vice'])).toEqual(response);
    });

    test('uses named priorities, other executive, managers, alphabetical names, then ID', async () => {
        mockFixture.positions = [
            ['z', 'Volunteer', false],
            ['m-z', 'Zebra Manager', false],
            ['x-z', 'Zebra Executive', true],
            ['partnerships', 'Partnerships & Sponsorships Manager', false],
            ['secretary', 'Secretary', false],
            ['treasurer', 'Treasurer', false],
            ['vice', 'Vice-President', false],
            ['president', 'President', false],
            ['x-a', 'Additional Executive', true],
            ['m-a', 'Arts Manager', false],
            ['a-2', 'Assistant', false],
            ['a-1', 'Assistant', false],
        ].map(([id, name, executive]) => ({
            id: id as string,
            name: name as string,
            executive: executive as boolean,
            vacancies: 1,
        }));
        mockFixture.ballots = [];
        const response = await getResults();
        expect(
            response.body.results.map((result) => result.position_id),
        ).toEqual([
            'president',
            'vice',
            'treasurer',
            'secretary',
            'partnerships',
            'x-a',
            'x-z',
            'm-a',
            'm-z',
            'a-1',
            'a-2',
            'z',
        ]);
    });

    test('confirms more than ten offices in one deterministic pass', async () => {
        const ids = Array.from(
            { length: 12 },
            (_, index) => `candidate-${index.toString().padStart(2, '0')}`,
        );
        mockFixture.candidates = ids.map((id) => ({ id, name: id }));
        mockFixture.positions = ids.map((_, index) => ({
            id: `office-${index.toString().padStart(2, '0')}`,
            name: `Office ${index.toString().padStart(2, '0')}`,
            executive: false,
            vacancies: 1,
        }));
        mockFixture.links = mockFixture.positions.flatMap(
            ({ id: position_id }) =>
                ids.map((candidate_id) => ({ position_id, candidate_id })),
        );
        mockFixture.ballots = mockFixture.positions.map(({ id: position }) => ({
            position,
            preferences: [...ids],
        }));
        const response = await confirm(
            mockFixture.positions.map((position) => position.id),
        );
        expect(response.status).toBe(200);
        expect(
            response.body.results
                .flatMap((result) => result.winners)
                .map((candidate) => candidate.id),
        ).toEqual(ids);
    });
});

describe('confirmation validation', () => {
    test.each([
        ['vice'],
        ['president', 'treasurer'],
        ['unknown'],
        ['president', 'president'],
        ['president', 'vice', 'treasurer', 'manager', 'unknown'],
    ])('rejects invalid prefix %j', async (...confirmedPositions) => {
        expect((await confirm(confirmedPositions)).status).toBe(400);
    });

    test.each<Record<string, string[]>>([
        { vice: ['b'] },
        { unknown: ['a'] },
        { president: ['unknown'] },
        { president: ['d'] },
        { president: ['a', 'a'] },
        { president: ['a', 'b'] },
    ])('rejects invalid override %j', async (manualOverrides) => {
        expect((await confirm(['president'], manualOverrides)).status).toBe(
            400,
        );
    });

    test('rejects already-confirmed officeholders as manual winners', async () => {
        const response = await confirm(['president', 'vice'], { vice: ['a'] });
        expect(response.status).toBe(400);
    });

    test.each([
        null,
        {},
        { confirmedPositions: 'president', manualOverrides: {} },
        { confirmedPositions: [1], manualOverrides: {} },
        { confirmedPositions: [], manualOverrides: [] },
        {
            confirmedPositions: ['president'],
            manualOverrides: { president: 'a' },
        },
        {
            confirmedPositions: ['president'],
            manualOverrides: { president: [1] },
        },
    ])('rejects malformed request %j', async (body) => {
        const response = (await POST(request(body))) as unknown as ApiResponse;
        expect(response.status).toBe(400);
    });

    test('rejects malformed JSON', async () => {
        const req = request();
        req.json = async () => {
            throw new SyntaxError('Invalid JSON');
        };
        const response = (await POST(req)) as unknown as ApiResponse;
        expect(response.status).toBe(400);
    });
});

describe('admin authorization', () => {
    test.each([GET, POST])(
        'requires an authenticated administrator',
        async (handler) => {
            mockAuth.mockResolvedValue(null);
            expect(
                ((await handler(request())) as unknown as ApiResponse).status,
            ).toBe(401);
            mockAuth.mockResolvedValue({ user: {}, accessToken: 'malformed' });
            expect(
                ((await handler(request())) as unknown as ApiResponse).status,
            ).toBe(403);
            mockAuth.mockResolvedValue({
                user: {},
                accessToken: `header.${Buffer.from(JSON.stringify({ realm_access: { roles: ['voter'] } })).toString('base64')}.signature`,
            });
            expect(
                ((await handler(request())) as unknown as ApiResponse).status,
            ).toBe(403);
        },
    );
});
