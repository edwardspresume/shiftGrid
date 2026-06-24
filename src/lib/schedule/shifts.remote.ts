import { db } from '$lib/server/db';
import { locations, shifts } from '$lib/server/db/schema';
import {
	recurrenceFrequencyDisplayLabels,
	type RecurrenceFrequency
} from '$lib/schedule/constants';
import { addShiftSchema, scheduleWeekSchema } from '$lib/schedule/shiftValidation';
import { DEFAULT_WEEK_STARTS_ON, getCurrentWeekStart, getWeekStart } from '$lib/schedule/week';
import { parseDate } from '@internationalized/date';
import { invalid } from '@sveltejs/kit';
import { form, query } from '$app/server';
import { and, asc, eq, gte, lte } from 'drizzle-orm';

function resolveWeekStart(week: string | null | undefined) {
	if (!week) {
		return getCurrentWeekStart(DEFAULT_WEEK_STARTS_ON);
	}

	try {
		return getWeekStart(parseDate(week), DEFAULT_WEEK_STARTS_ON);
	} catch {
		return getCurrentWeekStart(DEFAULT_WEEK_STARTS_ON);
	}
}

function formatClockTime(time: string) {
	const [hourValue = '0', minuteValue = '0'] = time.split(':');
	const hour = Number.parseInt(hourValue, 10);
	const minute = Number.parseInt(minuteValue, 10);
	const period = hour >= 12 ? 'PM' : 'AM';
	const displayHour = hour % 12 || 12;

	return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

function getMinutes(time: string) {
	const [hourValue = '0', minuteValue = '0'] = time.split(':');
	return Number.parseInt(hourValue, 10) * 60 + Number.parseInt(minuteValue, 10);
}

function getShiftHours(startTime: string, endTime: string, breakMinutes: number) {
	const startMinutes = getMinutes(startTime);
	let endMinutes = getMinutes(endTime);

	if (endMinutes <= startMinutes) {
		endMinutes += 24 * 60;
	}

	return Math.max((endMinutes - startMinutes - breakMinutes) / 60, 0);
}

function formatHours(hours: number) {
	const formatted = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
	return `${formatted} ${hours === 1 ? 'hour' : 'hours'}`;
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

	const weekStart = getWeekStart(parseDate(data.shiftDate), DEFAULT_WEEK_STARTS_ON).toString();

	return {
		success: true,
		weekStart
	};
});
