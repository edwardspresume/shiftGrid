import { db } from '$lib/server/db';
import { locations, shifts } from '$lib/server/db/schema';
import {
	recurrenceFrequencyDisplayLabels,
	type RecurrenceFrequency
} from '$lib/schedule/constants';
import { parseCanonicalDate } from '$lib/schedule/date';
import { addShiftSchema, scheduleWeekSchema } from '$lib/schedule/shiftValidation';
import {
	formatClockTime,
	formatHours,
	getShiftHours,
	getShiftMinuteRange,
	shiftMinuteRangesOverlap
} from '$lib/schedule/time';
import { DEFAULT_WEEK_STARTS_ON, getCurrentWeekStart, getWeekStart } from '$lib/schedule/week';
import { invalid } from '@sveltejs/kit';
import { form, query, requested } from '$app/server';
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

export const getLocations = query(async () => {
	return db
		.select({
			id: locations.id,
			name: locations.name,
			color: locations.color
		})
		.from(locations)
		.orderBy(asc(locations.name));
});

export const getSchedule = query(scheduleWeekSchema, async (week) => {
	const weekStart = resolveWeekStart(week);
	const weekEnd = weekStart.add({ days: 6 });

	const shiftRows = await db
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
		.orderBy(asc(shifts.shiftDate), asc(shifts.startTime));

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
		shifts: scheduledShifts,
		summary: {
			totalHours,
			scheduledShifts: scheduledShifts.length
		}
	};
});

export type LocationsData = NonNullable<ReturnType<typeof getLocations>['current']>;
export type ScheduleData = NonNullable<ReturnType<typeof getSchedule>['current']>;
export type LocationOption = LocationsData[number];
export type ScheduledShift = ScheduleData['shifts'][number];

export const addShift = form(addShiftSchema, async (data, issue) => {
	const shiftDate = parseCanonicalDate(data.shiftDate);
	if (!shiftDate) {
		invalid(issue.shiftDate('Use a valid shift date.'));
	}

	const [location] = await db
		.select({ id: locations.id })
		.from(locations)
		.where(eq(locations.id, data.locationId))
		.limit(1);

	if (!location) {
		invalid(issue.locationId('Choose an existing location.'));
	}

	const newShiftRange = getShiftMinuteRange(shiftDate, data.startTime, data.endTime);
	const overlapWindowStart = shiftDate.subtract({ days: 1 }).toString();
	const overlapWindowEnd = shiftDate.add({ days: 1 }).toString();
	const existingShifts = await db
		.select({
			shiftDate: shifts.shiftDate,
			startTime: shifts.startTime,
			endTime: shifts.endTime
		})
		.from(shifts)
		.where(and(gte(shifts.shiftDate, overlapWindowStart), lte(shifts.shiftDate, overlapWindowEnd)));

	const overlappingShift = existingShifts.find((existingShift) => {
		const existingShiftDate = parseCanonicalDate(existingShift.shiftDate);
		if (!existingShiftDate) return false;

		return shiftMinuteRangesOverlap(
			newShiftRange,
			getShiftMinuteRange(existingShiftDate, existingShift.startTime, existingShift.endTime)
		);
	});

	if (overlappingShift) {
		invalid(
			issue.startTime(
				`This shift overlaps an existing shift from ${formatClockTime(overlappingShift.startTime)} to ${formatClockTime(overlappingShift.endTime)} on ${overlappingShift.shiftDate}.`
			)
		);
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

	await requested(getSchedule, 1).refreshAll();

	return {
		success: true,
		weekStart
	};
});
