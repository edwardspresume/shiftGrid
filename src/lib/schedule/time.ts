import { parseTime, type Time } from '@internationalized/date';
import type { CalendarDate } from '@internationalized/date';

export const DEFAULT_START_TIME = '09:00';
export const DEFAULT_END_TIME = '17:00';
const MINUTES_PER_DAY = 24 * 60;

const clockInputPattern = /^\d{2}:\d{2}$/;

function formatTimePart(value: number) {
	return value.toString().padStart(2, '0');
}

export function formatClockInput(time: Time) {
	return `${formatTimePart(time.hour)}:${formatTimePart(time.minute)}`;
}

export function parseClockInput(value: string): Time | null {
	if (!clockInputPattern.test(value)) return null;

	try {
		const time = parseTime(value);
		return formatClockInput(time) === value ? time : null;
	} catch {
		return null;
	}
}

export function normalizeClockInput(value: string) {
	return formatClockInput(parseTime(value));
}

export function isClockInput(value: string) {
	return parseClockInput(value) !== null;
}

export function getClockMinutes(value: string) {
	const time = parseTime(value);
	return time.hour * 60 + time.minute + time.second / 60 + time.millisecond / 60000;
}

function getDateStartMinutes(date: CalendarDate) {
	return Date.UTC(date.year, date.month - 1, date.day) / 60000;
}

export function getShiftMinuteRange(shiftDate: CalendarDate, startTime: string, endTime: string) {
	const dateStartMinutes = getDateStartMinutes(shiftDate);
	const start = dateStartMinutes + getClockMinutes(startTime);
	let end = dateStartMinutes + getClockMinutes(endTime);

	if (end <= start) {
		end += MINUTES_PER_DAY;
	}

	return { start, end };
}

export function shiftMinuteRangesOverlap(
	first: ReturnType<typeof getShiftMinuteRange>,
	second: ReturnType<typeof getShiftMinuteRange>
) {
	return first.start < second.end && second.start < first.end;
}

export function getShiftHours(startTime: string, endTime: string) {
	const startMinutes = getClockMinutes(startTime);
	let endMinutes = getClockMinutes(endTime);

	if (endMinutes <= startMinutes) {
		endMinutes += 24 * 60;
	}

	return Math.max((endMinutes - startMinutes) / 60, 0);
}

export function formatClockTime(value: string) {
	const time = parseTime(value);
	const period = time.hour >= 12 ? 'PM' : 'AM';
	const displayHour = time.hour % 12 || 12;

	return `${displayHour}:${formatTimePart(time.minute)} ${period}`;
}

export function formatHours(hours: number) {
	const formatted = Number.isInteger(hours) ? hours.toString() : hours.toFixed(1);
	return `${formatted} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function formatCompactHours(hours: number) {
	return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}
