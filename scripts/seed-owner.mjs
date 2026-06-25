import 'dotenv/config';

import { neon } from '@neondatabase/serverless';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL is not set');
}

const ownerEmail = (process.env.SHIFTGRID_OWNER_EMAIL ?? process.env.AUTH_SEED_EMAIL)
	?.trim()
	.toLowerCase();
const ownerPassword = process.env.SHIFTGRID_OWNER_PASSWORD ?? process.env.AUTH_SEED_PASSWORD;
const ownerName =
	(process.env.SHIFTGRID_OWNER_NAME ?? process.env.AUTH_SEED_NAME)?.trim() || 'ShiftGrid Owner';

if (!ownerEmail) {
	throw new Error('SHIFTGRID_OWNER_EMAIL or AUTH_SEED_EMAIL is not set');
}

if (!ownerPassword || ownerPassword.length < 8) {
	throw new Error('SHIFTGRID_OWNER_PASSWORD or AUTH_SEED_PASSWORD must be at least 8 characters');
}

const userRole = pgEnum('user_role', ['system_admin', 'scheduler', 'receptionist']);

const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	role: userRole('role').default('receptionist').notNull(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at').defaultNow().notNull()
});

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);
const now = new Date();

const [existingUser] = await db
	.select({ id: user.id })
	.from(user)
	.where(eq(user.email, ownerEmail))
	.limit(1);

const userId = existingUser?.id ?? crypto.randomUUID();

if (existingUser) {
	await db
		.update(user)
		.set({
			name: ownerName,
			role: 'system_admin',
			emailVerified: true,
			updatedAt: now
		})
		.where(eq(user.id, userId));
} else {
	await db.insert(user).values({
		id: userId,
		name: ownerName,
		email: ownerEmail,
		role: 'system_admin',
		emailVerified: true,
		createdAt: now,
		updatedAt: now
	});
}

const password = await hashPassword(ownerPassword);
const credentialAccountId = `${userId}:credential`;

const updatedAccounts = await db
	.update(account)
	.set({
		accountId: userId,
		password,
		updatedAt: now
	})
	.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
	.returning({ id: account.id });

if (updatedAccounts.length === 0) {
	await db.insert(account).values({
		id: credentialAccountId,
		accountId: userId,
		providerId: 'credential',
		userId,
		password,
		createdAt: now,
		updatedAt: now
	});
}

console.log(`Owner account ready: ${ownerEmail}`);
console.log('Owner role set to system_admin.');
