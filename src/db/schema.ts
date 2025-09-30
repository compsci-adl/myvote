import { sql } from 'drizzle-orm';
import { blob, integer, sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';

export const electionStatusEnum = [
    'PreRelease',
    'Nominations',
    'NominationsClosed',
    'Voting',
    'VotingClosed',
    'ResultsReleased',
] as const;
export type ElectionStatus = (typeof electionStatusEnum)[number];

export const elections = sqliteTable('election', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    status: text('status', { enum: electionStatusEnum }).notNull(),
});

export const voters = sqliteTable('voter', {
    id: text('id').primaryKey(),
    election: text('election')
        .notNull()
        .references(() => elections.id),
    student_id: integer('student_id').notNull(),
    name: text('name').notNull(),
});

export const candidatePositionLinks = sqliteTable(
    'candidate_position_link',
    (column) => ({
        candidate_id: column.text('candidate_id'),
        position_id: column.text('position_id'),
    }),
    (table) => [
        primaryKey({ columns: [table.candidate_id, table.position_id] }),
    ]
);

export const candidates = sqliteTable('candidate', {
    id: text('id').primaryKey(),
    election: text('election')
        .notNull()
        .references(() => elections.id),
    name: text('name').notNull(),
    statement: text('statement'),
    avatar: text('avatar'),
});

export const positions = sqliteTable('position', {
    id: text('id').primaryKey(),
    election_id: text('election_id')
        .notNull()
        .references(() => elections.id),
    name: text('name').notNull(),
    vacancies: integer('vacancies').notNull(),
    description: text('description').notNull(),
    executive: integer('executive', { mode: 'boolean' }).notNull(),
});

export const ballots = sqliteTable('ballot', {
    id: text('id').primaryKey(),
    voter_id: text('voter_id')
        .notNull()
        .references(() => voters.id),
    position: text('position')
        .notNull()
        .references(() => positions.id),
    preferences: blob('preferences', { mode: 'json' }).notNull(),
    submitted: integer('submitted', { mode: 'timestamp' })
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
});
