import { parseDate } from '@internationalized/date';
import * as v from 'valibot';

import { breakMinuteOptions, recurrenceFrequencyValues } from '$lib/schedule/constants';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const timePattern = /^\d{2}:\d{2}$/;

function isValidDate(value: string) {
	if (!datePattern.test(value)) return false;

	try {
		return parseDate(value).toString() === value;
	} catch {
		return false;
	}
}

function isValidTime(value: string) {
	if (!timePattern.test(value)) return false;

	const [hour = 0, minute = 0] = value.split(':').map(Number);
	return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

export const scheduleWeekSchema = v.nullish(v.string());

export const addShiftSchema = v.pipe(
	v.object({
		locationId: v.pipe(
			v.string('Choose a location.'),
			v.trim(),
			v.transform(Number),
			v.integer('Choose a location.'),
			v.minValue(1, 'Choose a location.')
		),
		shiftDate: v.pipe(
			v.string('Choose a shift date.'),
			v.trim(),
			v.minLength(1, 'Choose a shift date.'),
			v.check(isValidDate, 'Use a valid shift date.')
		),
		startTime: v.pipe(
			v.string('Choose a start time.'),
			v.trim(),
			v.minLength(1, 'Choose a start time.'),
			v.check(isValidTime, 'Use a valid start time.')
		),
		endTime: v.pipe(
			v.string('Choose an end time.'),
			v.trim(),
			v.minLength(1, 'Choose an end time.'),
			v.check(isValidTime, 'Use a valid end time.')
		),
		breakMinutes: v.pipe(
			v.picklist(breakMinuteOptions, 'Choose a valid break.'),
			v.transform(Number)
		),
		recurrenceFrequency: v.picklist(recurrenceFrequencyValues, 'Choose a valid recurrence.'),
		recurrenceUntil: v.pipe(
			v.fallback(v.string(), ''),
			v.trim(),
			v.transform((value): string | null => (value === '' ? null : value)),
			v.check((value) => value === null || isValidDate(value), 'Use a valid repeat end date.')
		),
		notes: v.pipe(
			v.fallback(v.string(), ''),
			v.trim(),
			v.maxLength(2000, 'Notes must be 2,000 characters or less.'),
			v.transform((value): string | null => (value === '' ? null : value))
		)
	}),
	v.forward(
		v.check(
			({ recurrenceFrequency, recurrenceUntil, shiftDate }) =>
				recurrenceFrequency === 'none' || recurrenceUntil === null || recurrenceUntil >= shiftDate,
			'Repeat until cannot be before the shift date.'
		),
		['recurrenceUntil']
	),
	v.transform((data) => ({
		...data,
		recurrenceUntil: data.recurrenceFrequency === 'none' ? null : data.recurrenceUntil
	}))
);
