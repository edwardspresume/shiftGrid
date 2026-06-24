import { db } from '$lib/server/db';
import { locations, shiftExceptions, shifts } from '$lib/server/db/schema';
import {
	recurrenceFrequencyDisplayLabels,
	recurrenceDayLabels,
	type RecurrenceFrequency
} from '$lib/schedule/constants';
import { parseCanonicalDate } from '$lib/schedule/date';
import {
	addShiftSchema,
	deleteShiftSchema,
	editShiftSchema,
	scheduleWeekSchema
} from '$lib/schedule/shiftValidation';
import {
	formatClockTime,
	formatHours,
	getShiftHours,
	getShiftMinuteRange,
	normalizeClockInput,
	shiftMinuteRangesOverlap
} from '$lib/schedule/time';
import { DEFAULT_WEEK_STARTS_ON, getCurrentWeekStart, getWeekStart } from '$lib/schedule/week';
import { invalid } from '@sveltejs/kit';
import { form, query, requested } from '$app/server';
import { and, asc, eq, gte, inArray, lte, ne, or } from 'drizzle-orm';
import type { CalendarDate } from '@internationalized/date';

type ShiftRule = {
	id?: number;
	shiftDate: string;
	startTime: string;
	endTime: string;
	recurrenceFrequency: RecurrenceFrequency;
	recurrenceUntil: string | null;
	recurrenceDays: number[] | null;
};

function resolveWeekStart(week: string | null | undefined) {
	if (!week) {
		return getCurrentWeekStart(DEFAULT_WEEK_STARTS_ON);
	}

	const date = parseCanonicalDate(week);
	return date
		? getWeekStart(date, DEFAULT_WEEK_STARTS_ON)
		: getCurrentWeekStart(DEFAULT_WEEK_STARTS_ON);
}

function formatRecurrence(frequency: RecurrenceFrequency, recurrenceDays: number[] | null) {
	if (frequency === 'none') return recurrenceFrequencyDisplayLabels[frequency];

	const days = recurrenceDays
		?.map((day) => recurrenceDayLabels[day.toString() as keyof typeof recurrenceDayLabels])
		.filter(Boolean)
		.join(', ');

	return days
		? `${recurrenceFrequencyDisplayLabels[frequency]} · ${days}`
		: recurrenceFrequencyDisplayLabels[frequency];
}

function getRecurrenceIntervalWeeks(frequency: RecurrenceFrequency) {
	if (frequency === 'weekly') return 1;
	if (frequency === 'biweekly') return 2;
	return 0;
}

function getUtcDay(date: CalendarDate) {
	return Date.UTC(date.year, date.month - 1, date.day) / 86_400_000;
}

function getDayDifference(start: CalendarDate, end: CalendarDate) {
	return getUtcDay(end) - getUtcDay(start);
}

function getDayOfWeek(date: CalendarDate) {
	return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
}

function getOccurrenceDatesInRange(
	shift: ShiftRule,
	rangeStart: CalendarDate,
	rangeEnd: CalendarDate
) {
	const shiftDate = parseCanonicalDate(shift.shiftDate);
	if (!shiftDate) return [];

	if (shift.recurrenceFrequency === 'none') {
		return shiftDate.compare(rangeStart) >= 0 && shiftDate.compare(rangeEnd) <= 0
			? [shiftDate]
			: [];
	}

	const recurrenceUntil = shift.recurrenceUntil ? parseCanonicalDate(shift.recurrenceUntil) : null;
	if (
		!recurrenceUntil ||
		recurrenceUntil.compare(rangeStart) < 0 ||
		shiftDate.compare(rangeEnd) > 0
	) {
		return [];
	}

	const effectiveEnd = recurrenceUntil.compare(rangeEnd) < 0 ? recurrenceUntil : rangeEnd;
	const selectedDays =
		shift.recurrenceDays && shift.recurrenceDays.length > 0
			? new Set(shift.recurrenceDays)
			: new Set([getDayOfWeek(shiftDate)]);
	const intervalWeeks = getRecurrenceIntervalWeeks(shift.recurrenceFrequency);
	const anchorWeekStart = getWeekStart(shiftDate, DEFAULT_WEEK_STARTS_ON);
	const occurrenceDates = [];

	for (
		let occurrenceDate = shiftDate.compare(rangeStart) > 0 ? shiftDate : rangeStart;
		occurrenceDate.compare(effectiveEnd) <= 0;
		occurrenceDate = occurrenceDate.add({ days: 1 })
	) {
		const occurrenceWeekStart = getWeekStart(occurrenceDate, DEFAULT_WEEK_STARTS_ON);
		const weeksFromAnchor = getDayDifference(anchorWeekStart, occurrenceWeekStart) / 7;

		if (
			weeksFromAnchor >= 0 &&
			weeksFromAnchor % intervalWeeks === 0 &&
			selectedDays.has(getDayOfWeek(occurrenceDate))
		) {
			occurrenceDates.push(occurrenceDate);
		}
	}

	return occurrenceDates;
}

function getShiftDateWindowWhere(windowStart: string, windowEnd: string) {
	return or(
		and(
			eq(shifts.recurrenceFrequency, 'none'),
			gte(shifts.shiftDate, windowStart),
			lte(shifts.shiftDate, windowEnd)
		),
		and(
			ne(shifts.recurrenceFrequency, 'none'),
			lte(shifts.shiftDate, windowEnd),
			gte(shifts.recurrenceUntil, windowStart)
		)
	);
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
			recurrenceUntil: shifts.recurrenceUntil,
			recurrenceDays: shifts.recurrenceDays,
			locationId: shifts.locationId,
			locationName: locations.name,
			locationColor: locations.color,
			notes: shifts.notes
		})
		.from(shifts)
		.innerJoin(locations, eq(shifts.locationId, locations.id))
		.where(getShiftDateWindowWhere(weekStart.toString(), weekEnd.toString()))
		.orderBy(asc(shifts.shiftDate), asc(shifts.startTime));

	const shiftIds = shiftRows.map((shift) => shift.id);
	const exceptionRows =
		shiftIds.length > 0
			? await db
					.select({
						shiftId: shiftExceptions.shiftId,
						occurrenceDate: shiftExceptions.occurrenceDate
					})
					.from(shiftExceptions)
					.where(
						and(
							inArray(shiftExceptions.shiftId, shiftIds),
							eq(shiftExceptions.action, 'cancelled'),
							gte(shiftExceptions.occurrenceDate, weekStart.toString()),
							lte(shiftExceptions.occurrenceDate, weekEnd.toString())
						)
					)
			: [];
	const cancelledOccurrences = new Map<number, Set<string>>();

	for (const exception of exceptionRows) {
		const dates = cancelledOccurrences.get(exception.shiftId) ?? new Set<string>();
		dates.add(exception.occurrenceDate);
		cancelledOccurrences.set(exception.shiftId, dates);
	}

	const scheduledShifts = shiftRows
		.flatMap((shift) => {
			const startTime = normalizeClockInput(shift.startTime);
			const endTime = normalizeClockInput(shift.endTime);
			const hours = getShiftHours(startTime, endTime, shift.breakMinutes);
			const cancelledDates = cancelledOccurrences.get(shift.id) ?? new Set<string>();

			return getOccurrenceDatesInRange(shift, weekStart, weekEnd)
				.filter((occurrenceDate) => !cancelledDates.has(occurrenceDate.toString()))
				.map((occurrenceDate) => ({
					id: `${shift.id}:${occurrenceDate.toString()}`,
					ruleId: shift.id,
					shiftDate: occurrenceDate.toString(),
					baseShiftDate: shift.shiftDate,
					locationId: shift.locationId,
					location: shift.locationName,
					locationColor: shift.locationColor,
					startTime,
					endTime,
					breakMinutes: shift.breakMinutes,
					recurrenceFrequency: shift.recurrenceFrequency,
					recurrenceUntil: shift.recurrenceUntil,
					recurrenceDays: shift.recurrenceDays,
					notes: shift.notes,
					time: `${formatClockTime(startTime)} - ${formatClockTime(endTime)}`,
					hours: formatHours(hours),
					hoursValue: hours,
					frequency: formatRecurrence(shift.recurrenceFrequency, shift.recurrenceDays)
				}));
		})
		.sort(
			(first, second) =>
				first.shiftDate.localeCompare(second.shiftDate) ||
				first.startTime.localeCompare(second.startTime) ||
				first.endTime.localeCompare(second.endTime) ||
				first.location.localeCompare(second.location) ||
				first.id.localeCompare(second.id)
		);

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
type RemoteIssue = Parameters<typeof invalid>[0];

async function validateLocation(
	locationId: number,
	issue: { locationId: (message: string) => RemoteIssue }
) {
	const [location] = await db
		.select({ id: locations.id })
		.from(locations)
		.where(eq(locations.id, locationId))
		.limit(1);

	if (!location) {
		invalid(issue.locationId('Choose an existing location.'));
	}
}

async function validateNoOverlap(
	data: ShiftRule,
	issue: {
		startTime: (message: string) => RemoteIssue;
		recurrenceUntil: (message: string) => RemoteIssue;
	},
	excludedShiftId?: number
) {
	const shiftDate = parseCanonicalDate(data.shiftDate);
	if (!shiftDate) {
		return;
	}

	const recurrenceUntil = data.recurrenceUntil
		? parseCanonicalDate(data.recurrenceUntil)
		: shiftDate;
	if (!recurrenceUntil) {
		invalid(issue.recurrenceUntil('Use a valid repeat end date.'));
	}

	const overlapWindowStart = shiftDate.subtract({ days: 1 }).toString();
	const overlapWindowEnd = recurrenceUntil.add({ days: 1 }).toString();
	const existingShifts = await db
		.select({
			id: shifts.id,
			shiftDate: shifts.shiftDate,
			startTime: shifts.startTime,
			endTime: shifts.endTime,
			recurrenceFrequency: shifts.recurrenceFrequency,
			recurrenceUntil: shifts.recurrenceUntil,
			recurrenceDays: shifts.recurrenceDays
		})
		.from(shifts)
		.where(
			excludedShiftId
				? and(
						getShiftDateWindowWhere(overlapWindowStart, overlapWindowEnd),
						ne(shifts.id, excludedShiftId)
					)
				: getShiftDateWindowWhere(overlapWindowStart, overlapWindowEnd)
		);
	const existingShiftIds = existingShifts.map((shift) => shift.id);
	const exceptionRows =
		existingShiftIds.length > 0
			? await db
					.select({
						shiftId: shiftExceptions.shiftId,
						occurrenceDate: shiftExceptions.occurrenceDate
					})
					.from(shiftExceptions)
					.where(
						and(
							inArray(shiftExceptions.shiftId, existingShiftIds),
							eq(shiftExceptions.action, 'cancelled'),
							gte(shiftExceptions.occurrenceDate, overlapWindowStart),
							lte(shiftExceptions.occurrenceDate, overlapWindowEnd)
						)
					)
			: [];
	const cancelledOccurrences = new Map<number, Set<string>>();

	for (const exception of exceptionRows) {
		const dates = cancelledOccurrences.get(exception.shiftId) ?? new Set<string>();
		dates.add(exception.occurrenceDate);
		cancelledOccurrences.set(exception.shiftId, dates);
	}

	const newOccurrences = getOccurrenceDatesInRange(
		data,
		shiftDate.subtract({ days: 1 }),
		recurrenceUntil.add({ days: 1 })
	);

	const overlappingShift = existingShifts
		.flatMap((existingShift) =>
			getOccurrenceDatesInRange(
				existingShift,
				shiftDate.subtract({ days: 1 }),
				recurrenceUntil.add({ days: 1 })
			)
				.filter(
					(occurrenceDate) =>
						!cancelledOccurrences.get(existingShift.id)?.has(occurrenceDate.toString())
				)
				.map((occurrenceDate) => ({ ...existingShift, occurrenceDate }))
		)
		.find((existingShift) =>
			newOccurrences.some((newOccurrenceDate) =>
				shiftMinuteRangesOverlap(
					getShiftMinuteRange(newOccurrenceDate, data.startTime, data.endTime),
					getShiftMinuteRange(
						existingShift.occurrenceDate,
						existingShift.startTime,
						existingShift.endTime
					)
				)
			)
		);

	if (overlappingShift) {
		invalid(
			issue.startTime(
				`This shift overlaps an existing shift from ${formatClockTime(overlappingShift.startTime)} to ${formatClockTime(overlappingShift.endTime)} on ${overlappingShift.occurrenceDate.toString()}.`
			)
		);
	}
}

function recurrenceDaysMatch(first: number[] | null, second: number[] | null) {
	const firstDays = [...(first ?? [])].sort((a, b) => a - b);
	const secondDays = [...(second ?? [])].sort((a, b) => a - b);

	return (
		firstDays.length === secondDays.length &&
		firstDays.every((day, index) => day === secondDays[index])
	);
}

function hasRecurrencePatternChanged(existingShift: ShiftRule, updatedShift: ShiftRule) {
	return (
		existingShift.shiftDate !== updatedShift.shiftDate ||
		existingShift.recurrenceFrequency !== updatedShift.recurrenceFrequency ||
		existingShift.recurrenceUntil !== updatedShift.recurrenceUntil ||
		!recurrenceDaysMatch(existingShift.recurrenceDays, updatedShift.recurrenceDays)
	);
}

export const addShift = form(addShiftSchema, async (data, issue) => {
	const shiftDate = parseCanonicalDate(data.shiftDate);
	if (!shiftDate) {
		invalid(issue.shiftDate('Use a valid shift date.'));
	}

	await validateLocation(data.locationId, issue);
	await validateNoOverlap(data, issue);

	await db.insert(shifts).values({
		locationId: data.locationId,
		shiftDate: data.shiftDate,
		startTime: data.startTime,
		endTime: data.endTime,
		breakMinutes: data.breakMinutes,
		recurrenceFrequency: data.recurrenceFrequency,
		recurrenceUntil: data.recurrenceUntil,
		recurrenceDays: data.recurrenceDays,
		notes: data.notes
	});

	const weekStart = getWeekStart(shiftDate, DEFAULT_WEEK_STARTS_ON).toString();

	await requested(getSchedule, 1).refreshAll();

	return {
		success: true,
		weekStart
	};
});

export const editShift = form(editShiftSchema, async (data, issue) => {
	const shiftDate = parseCanonicalDate(data.shiftDate);
	if (!shiftDate) {
		invalid(issue.shiftDate('Use a valid shift date.'));
	}

	const [existingShift] = await db
		.select({
			id: shifts.id,
			shiftDate: shifts.shiftDate,
			startTime: shifts.startTime,
			endTime: shifts.endTime,
			recurrenceFrequency: shifts.recurrenceFrequency,
			recurrenceUntil: shifts.recurrenceUntil,
			recurrenceDays: shifts.recurrenceDays
		})
		.from(shifts)
		.where(eq(shifts.id, data.id))
		.limit(1);

	if (!existingShift) {
		invalid(issue.id('Choose an existing shift.'));
	}

	await validateLocation(data.locationId, issue);
	await validateNoOverlap(data, issue, data.id);

	const shouldClearExceptions = hasRecurrencePatternChanged(existingShift, data);

	await db
		.update(shifts)
		.set({
			locationId: data.locationId,
			shiftDate: data.shiftDate,
			startTime: data.startTime,
			endTime: data.endTime,
			breakMinutes: data.breakMinutes,
			recurrenceFrequency: data.recurrenceFrequency,
			recurrenceUntil: data.recurrenceUntil,
			recurrenceDays: data.recurrenceDays,
			notes: data.notes
		})
		.where(eq(shifts.id, data.id));

	if (shouldClearExceptions) {
		await db.delete(shiftExceptions).where(eq(shiftExceptions.shiftId, data.id));
	}

	const weekStart = getWeekStart(shiftDate, DEFAULT_WEEK_STARTS_ON).toString();

	await requested(getSchedule, 1).refreshAll();

	return {
		success: true,
		weekStart
	};
});

export const deleteShift = form(deleteShiftSchema, async (data, issue) => {
	const occurrenceDate = parseCanonicalDate(data.occurrenceDate);
	if (!occurrenceDate) {
		invalid(issue.occurrenceDate('Use a valid shift date.'));
	}

	const [existingShift] = await db
		.select({
			id: shifts.id,
			shiftDate: shifts.shiftDate,
			startTime: shifts.startTime,
			endTime: shifts.endTime,
			recurrenceFrequency: shifts.recurrenceFrequency,
			recurrenceUntil: shifts.recurrenceUntil,
			recurrenceDays: shifts.recurrenceDays
		})
		.from(shifts)
		.where(eq(shifts.id, data.id))
		.limit(1);

	if (!existingShift) {
		invalid(issue.id('Choose an existing shift.'));
	}

	if (existingShift.recurrenceFrequency === 'none') {
		if (existingShift.shiftDate !== data.occurrenceDate) {
			invalid(issue.occurrenceDate('Choose an existing shift occurrence.'));
		}

		await db.delete(shifts).where(eq(shifts.id, data.id));
	} else if (data.scope === 'series') {
		await db.delete(shifts).where(eq(shifts.id, data.id));
	} else {
		const matchingOccurrence = getOccurrenceDatesInRange(
			existingShift,
			occurrenceDate,
			occurrenceDate
		).some((date) => date.compare(occurrenceDate) === 0);

		if (!matchingOccurrence) {
			invalid(issue.occurrenceDate('Choose an existing shift occurrence.'));
		}

		await db
			.insert(shiftExceptions)
			.values({
				shiftId: data.id,
				occurrenceDate: data.occurrenceDate,
				action: 'cancelled'
			})
			.onConflictDoNothing();
	}

	await requested(getSchedule, 1).refreshAll();

	return {
		success: true
	};
});
