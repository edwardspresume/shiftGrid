import { relations } from 'drizzle-orm';
import {
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

export const recurrenceFrequency = pgEnum('recurrence_frequency', recurrenceFrequencyValues);

export const locations = pgTable('locations', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	color: text('color').notNull().default('#16a34a'),
	createdAt: timestamp('created_at').defaultNow().notNull(),
	updatedAt: timestamp('updated_at')
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull()
});

export const shifts = pgTable(
	'shifts',
	{
		id: serial('id').primaryKey(),
		locationId: integer('location_id')
			.notNull()
			.references(() => locations.id, { onDelete: 'restrict' }),
		shiftDate: date('shift_date').notNull(),
		startTime: time('start_time').notNull(),
		endTime: time('end_time').notNull(),
		breakMinutes: integer('break_minutes').notNull().default(0),
		recurrenceFrequency: recurrenceFrequency('recurrence_frequency').notNull().default('none'),
		recurrenceUntil: date('recurrence_until'),
		recurrenceDays: integer('recurrence_days').array(),
		notes: text('notes'),
		createdAt: timestamp('created_at').defaultNow().notNull(),
		updatedAt: timestamp('updated_at')
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull()
	},
	(table) => [
		index('shifts_location_id_idx').on(table.locationId),
		index('shifts_shift_date_idx').on(table.shiftDate),
		index('shifts_recurrence_frequency_idx').on(table.recurrenceFrequency)
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
		index('shift_exceptions_shift_id_idx').on(table.shiftId),
		uniqueIndex('shift_exceptions_shift_id_occurrence_date_unique').on(
			table.shiftId,
			table.occurrenceDate
		)
	]
);

export const locationsRelations = relations(locations, ({ many }) => ({
	shifts: many(shifts)
}));

export const shiftsRelations = relations(shifts, ({ many, one }) => ({
	location: one(locations, {
		fields: [shifts.locationId],
		references: [locations.id]
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
