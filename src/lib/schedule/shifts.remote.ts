import { db } from '$lib/server/db';
import { locations, shifts } from '$lib/server/db/schema';
import {
	recurrenceFrequencyDisplayLabels,
	type RecurrenceFrequency
} from '$lib/schedule/constants';
import { parseCanonicalDate } from '$lib/schedule/date';
import { addShiftSchema, scheduleWeekSchema } from '$lib/schedule/shiftValidation';
import { formatClockTime, formatHours, getShiftHours } from '$lib/schedule/time';
import { DEFAULT_WEEK_STARTS_ON, getCurrentWeekStart, getWeekStart } from '$lib/schedule/week';
import { invalid } from '@sveltejs/kit';
import { form, query } from '$app/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

function resolveWeekStart(week: string | null | undefined) {
	if (!week) {
		return getCurrentWeekStart(DEFAULT_WEEK_STARTS_ON);
	}

	const date = parseCanonicalDate(week);
	return date
		? getWeekStart(date, DEFAULT_WEEK_STARTS_ON)
		: getCurrentWeekStart(DEFAULT_WEEK_STARTS_ON);
}

function formatRecurrence(frequency: RecurrenceFrequency) {
	return recurrenceFrequencyDisplayLabels[frequency];
}

export const getSchedule = query(scheduleWeekSchema, async (week) => {
	const weekStart = resolveWeekStart(week);
	const weekEnd = weekStart.add({ days: 6 });

	const [locationRows, shiftRows] = await Promise.all([
		db
			.select({
				id: locations.id,
				name: locations.name,
				color: locations.color,
				address: locations.address
			})
			.from(locations)
			.orderBy(asc(locations.name)),
		db
			.select({
				id: shifts.id,
				shiftDate: shifts.shiftDate,
				startTime: shifts.startTime,
				endTime: shifts.endTime,
				breakMinutes: shifts.breakMinutes,
				recurrenceFrequency: shifts.recurrenceFrequency,
				locationName: locations.name,
				locationColor: locations.color
			})
			.from(shifts)
			.innerJoin(locations, eq(shifts.locationId, locations.id))
			.where(
				and(gte(shifts.shiftDate, weekStart.toString()), lte(shifts.shiftDate, weekEnd.toString()))
			)
			.orderBy(asc(shifts.shiftDate), asc(shifts.startTime))
	]);

	const scheduledShifts = shiftRows.map((shift) => {
		const hours = getShiftHours(shift.startTime, shift.endTime, shift.breakMinutes);

		return {
			id: shift.id,
			shiftDate: shift.shiftDate,
			location: shift.locationName,
			locationColor: shift.locationColor,
			time: `${formatClockTime(shift.startTime)} - ${formatClockTime(shift.endTime)}`,
			hours: formatHours(hours),
			hoursValue: hours,
			frequency: formatRecurrence(shift.recurrenceFrequency)
		};
	});

	const totalHours = scheduledShifts.reduce((total, shift) => total + shift.hoursValue, 0);

	return {
		weekStart: weekStart.toString(),
		locations: locationRows,
		shifts: scheduledShifts,
		summary: {
			totalHours,
			scheduledShifts: scheduledShifts.length,
			locations: locationRows.length
		}
	};
});

export type ScheduleData = NonNullable<ReturnType<typeof getSchedule>['current']>;
export type LocationOption = ScheduleData['locations'][number];
export type ScheduledShift = ScheduleData['shifts'][number];

export const addShift = form(addShiftSchema, async (data, issue) => {
	const [location] = await db
		.select({ id: locations.id })
		.from(locations)
		.where(eq(locations.id, data.locationId))
		.limit(1);

	if (!location) {
		invalid(issue.locationId('Choose an existing location.'));
	}

	const shiftDate = parseCanonicalDate(data.shiftDate);
	if (!shiftDate) {
		invalid(issue.shiftDate('Use a valid shift date.'));
	}

	await db.insert(shifts).values({
		locationId: data.locationId,
		shiftDate: data.shiftDate,
		startTime: data.startTime,
		endTime: data.endTime,
		breakMinutes: data.breakMinutes,
		recurrenceFrequency: data.recurrenceFrequency,
		recurrenceUntil: data.recurrenceUntil,
		notes: data.notes
	});

	const weekStart = getWeekStart(shiftDate, DEFAULT_WEEK_STARTS_ON).toString();

	return {
		success: true,
		weekStart
	};
});
