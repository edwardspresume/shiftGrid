import { relations, sql } from 'drizzle-orm';
import {
	check,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	time,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';

import { recurrenceFrequencyValues } from '../../schedule/constants';
import { user } from './auth.schema';

export const recurrenceFrequency = pgEnum('recurrence_frequency', recurrenceFrequencyValues);

export const teamMembers = pgTable(
	'team_members',
	{
		id: serial('id').primaryKey(),
		name: text('name').notNull(),
		color: text('color').notNull().default('#16a34a'),
		createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		updatedByUserId: text('updated_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('team_members_created_by_user_id_idx').on(table.createdByUserId),
		uniqueIndex('team_members_name_unique').on(table.name)
	]
);

export const shifts = pgTable(
	'shifts',
	{
		id: serial('id').primaryKey(),
		teamMemberId: integer('team_member_id')
			.notNull()
			.references(() => teamMembers.id, { onDelete: 'restrict' }),
		shiftDate: date('shift_date').notNull(),
		startTime: time('start_time').notNull(),
		endTime: time('end_time').notNull(),
		breakMinutes: integer('break_minutes').notNull().default(0),
		recurrenceFrequency: recurrenceFrequency('recurrence_frequency').notNull().default('none'),
		recurrenceUntil: date('recurrence_until'),
		recurrenceDays: integer('recurrence_days').array(),
		notes: text('notes'),
		createdByUserId: text('created_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		updatedByUserId: text('updated_by_user_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('shifts_team_member_id_idx').on(table.teamMemberId),
		index('shifts_shift_date_idx').on(table.shiftDate),
		index('shifts_recurrence_frequency_idx').on(table.recurrenceFrequency),
		index('shifts_created_by_user_id_idx').on(table.createdByUserId)
	]
);

export const shiftExceptions = pgTable(
	'shift_exceptions',
	{
		id: serial('id').primaryKey(),
		shiftId: integer('shift_id')
			.notNull()
			.references(() => shifts.id, { onDelete: 'cascade' }),
		occurrenceDate: date('occurrence_date').notNull(),
		action: text('action').notNull().default('cancelled'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		check('shift_exceptions_action_check', sql`${table.action} in ('cancelled')`),
		index('shift_exceptions_shift_id_idx').on(table.shiftId),
		uniqueIndex('shift_exceptions_shift_id_occurrence_date_unique').on(
			table.shiftId,
			table.occurrenceDate
		)
	]
);

export const teamMembersRelations = relations(teamMembers, ({ many, one }) => ({
	shifts: many(shifts),
	createdByUser: one(user, {
		fields: [teamMembers.createdByUserId],
		references: [user.id],
		relationName: 'team_member_created_by_user'
	}),
	updatedByUser: one(user, {
		fields: [teamMembers.updatedByUserId],
		references: [user.id],
		relationName: 'team_member_updated_by_user'
	})
}));

export const shiftsRelations = relations(shifts, ({ many, one }) => ({
	teamMember: one(teamMembers, {
		fields: [shifts.teamMemberId],
		references: [teamMembers.id]
	}),
	createdByUser: one(user, {
		fields: [shifts.createdByUserId],
		references: [user.id],
		relationName: 'shift_created_by_user'
	}),
	updatedByUser: one(user, {
		fields: [shifts.updatedByUserId],
		references: [user.id],
		relationName: 'shift_updated_by_user'
	}),
	exceptions: many(shiftExceptions)
}));

export const shiftExceptionsRelations = relations(shiftExceptions, ({ one }) => ({
	shift: one(shifts, {
		fields: [shiftExceptions.shiftId],
		references: [shifts.id]
	})
}));

export * from './auth.schema';
