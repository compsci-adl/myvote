import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const memberTable = sqliteTable('members', {
    id: text('id').primaryKey(),
    keycloakId: text('keycloak_id').notNull().unique(),
    email: text('email').notNull(),
    phoneNumber: text('phone_number'),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    studentStatus: text('student_status').notNull(),
    studentId: text('student_id'),
    gender: text('gender').notNull(),
    ageBracket: text('age_bracket').notNull(),
    degree: text('degree'),
    studentType: text('student_type'),
    welcomeEmailSent: integer('welcome_email_sent', { mode: 'boolean' }),
    membershipExpiresAt: integer('membership_expires_at', { mode: 'timestamp' }),
    createdAt: text('created_at'),
    updatedAt: text('updated_at'),
});

const memberClient = createClient({
    url: process.env.MEMBER_DATABASE_URL || 'file:dev_member.sqlite',
    authToken: process.env.MEMBER_DATABASE_AUTH_TOKEN,
});

export const memberDb = drizzle(memberClient, { schema: { memberTable } });
