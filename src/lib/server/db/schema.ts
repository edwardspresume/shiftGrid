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
	timestamp
} from 'drizzle-orm/pg-core';

export const recurrenceFrequency = pgEnum('recurrence_frequency', ['none', 'weekly', 'biweekly']);

export const locations = pgTable('locations', {
	id: serial('id').primaryKey(),
	name: text('name').notNull(),
	color: text('color').notNull().default('#16a34a'),
	address: text('address'),
	notes: text('notes'),
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

export const locationsRelations = relations(locations, ({ many }) => ({
	shifts: many(shifts)
}));

export const shiftsRelations = relations(shifts, ({ one }) => ({
	location: one(locations, {
		fields: [shifts.locationId],
		references: [locations.id]
	})
}));

export * from './auth.schema';
