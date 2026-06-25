import * as v from 'valibot';

import {
	breakMinuteOptions,
	RECURRENCE_LIMIT_YEARS,
	recurrenceDayValues,
	recurrenceFrequencyValues
} from '$lib/schedule/constants';
import { isCanonicalDate, parseCanonicalDate } from '$lib/schedule/date';
import { isClockInput } from '$lib/schedule/time';

export const scheduleWeekSchema = v.nullish(v.string());
export const deleteShiftScopeValues = ['single', 'series'] as const;
export const editShiftScopeValues = ['single', 'series'] as const;
export const teamMemberColorValues = [
	'#16a34a',
	'#2563eb',
	'#dc2626',
	'#ea580c',
	'#9333ea',
	'#0891b2',
	'#475569'
] as const;

export const addTeamMemberSchema = v.object({
	name: v.pipe(
		v.string('Enter a team member name.'),
		v.trim(),
		v.minLength(1, 'Enter a team member name.'),
		v.maxLength(80, 'Team member names must be 80 characters or less.')
	),
	color: v.picklist(teamMemberColorValues, 'Choose a team member color.')
});

const shiftFormFields = {
	teamMemberId: v.pipe(
		v.string('Choose a team member.'),
		v.trim(),
		v.transform(Number),
		v.integer('Choose a team member.'),
		v.minValue(1, 'Choose a team member.')
	),
	shiftDate: v.pipe(
		v.string('Choose a shift date.'),
		v.trim(),
		v.minLength(1, 'Choose a shift date.'),
		v.check(isCanonicalDate, 'Use a valid shift date.')
	),
	startTime: v.pipe(
		v.string('Choose a start time.'),
		v.trim(),
		v.minLength(1, 'Choose a start time.'),
		v.check(isClockInput, 'Use a valid start time.')
	),
	endTime: v.pipe(
		v.string('Choose an end time.'),
		v.trim(),
		v.minLength(1, 'Choose an end time.'),
		v.check(isClockInput, 'Use a valid end time.')
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
		v.check((value) => value === null || isCanonicalDate(value), 'Use a valid repeat end date.')
	),
	recurrenceDays: v.pipe(
		v.optional(v.array(v.picklist(recurrenceDayValues)), []),
		v.transform((values) =>
			[...new Set(values)].map(Number).sort((first, second) => first - second)
		)
	),
	notes: v.pipe(
		v.fallback(v.string(), ''),
		v.trim(),
		v.maxLength(2000, 'Notes must be 2,000 characters or less.'),
		v.transform((value): string | null => (value === '' ? null : value))
	)
};

function isWithinRecurrenceLimit(shiftDate: string, recurrenceUntil: string | null) {
	if (recurrenceUntil === null) return true;

	const start = parseCanonicalDate(shiftDate);
	const until = parseCanonicalDate(recurrenceUntil);
	return !!start && !!until && until.compare(start.add({ years: RECURRENCE_LIMIT_YEARS })) <= 0;
}

export const addShiftSchema = v.pipe(
	v.object(shiftFormFields),
	v.forward(
		v.check(
			({ recurrenceFrequency, recurrenceUntil, shiftDate }) =>
				recurrenceFrequency === 'none' || recurrenceUntil === null || recurrenceUntil >= shiftDate,
			'Repeat until cannot be before the shift date.'
		),
		['recurrenceUntil']
	),
	v.forward(
		v.check(
			({ recurrenceFrequency, recurrenceUntil }) =>
				recurrenceFrequency === 'none' || recurrenceUntil !== null,
			'Choose a repeat end date.'
		),
		['recurrenceUntil']
	),
	v.forward(
		v.check(
			({ recurrenceFrequency, shiftDate, recurrenceUntil }) =>
				recurrenceFrequency === 'none' || isWithinRecurrenceLimit(shiftDate, recurrenceUntil),
			`Repeat until must be within ${RECURRENCE_LIMIT_YEARS} year of the shift date.`
		),
		['recurrenceUntil']
	),
	v.forward(
		v.check(
			({ recurrenceFrequency, recurrenceDays }) =>
				recurrenceFrequency === 'none' || recurrenceDays.length > 0,
			'Choose at least one repeat day.'
		),
		['recurrenceDays']
	),
	v.transform((data) => ({
		...data,
		recurrenceUntil: data.recurrenceFrequency === 'none' ? null : data.recurrenceUntil,
		recurrenceDays: data.recurrenceFrequency === 'none' ? null : data.recurrenceDays
	}))
);

export const editShiftSchema = v.pipe(
	v.object({
		id: v.pipe(
			v.string('Choose a shift.'),
			v.trim(),
			v.transform(Number),
			v.integer('Choose a shift.'),
			v.minValue(1, 'Choose a shift.')
		),
		occurrenceDate: v.pipe(
			v.string('Choose a shift date.'),
			v.trim(),
			v.minLength(1, 'Choose a shift date.'),
			v.check(isCanonicalDate, 'Use a valid shift date.')
		),
		scope: v.picklist(editShiftScopeValues, 'Choose what to edit.'),
		...shiftFormFields
	}),
	v.forward(
		v.check(
			({ scope, recurrenceFrequency, recurrenceUntil, shiftDate }) =>
				scope === 'single' ||
				recurrenceFrequency === 'none' ||
				recurrenceUntil === null ||
				recurrenceUntil >= shiftDate,
			'Repeat until cannot be before the shift date.'
		),
		['recurrenceUntil']
	),
	v.forward(
		v.check(
			({ scope, recurrenceFrequency, recurrenceUntil }) =>
				scope === 'single' || recurrenceFrequency === 'none' || recurrenceUntil !== null,
			'Choose a repeat end date.'
		),
		['recurrenceUntil']
	),
	v.forward(
		v.check(
			({ scope, recurrenceFrequency, shiftDate, recurrenceUntil }) =>
				scope === 'single' ||
				recurrenceFrequency === 'none' ||
				isWithinRecurrenceLimit(shiftDate, recurrenceUntil),
			`Repeat until must be within ${RECURRENCE_LIMIT_YEARS} year of the shift date.`
		),
		['recurrenceUntil']
	),
	v.forward(
		v.check(
			({ scope, recurrenceFrequency, recurrenceDays }) =>
				scope === 'single' || recurrenceFrequency === 'none' || recurrenceDays.length > 0,
			'Choose at least one repeat day.'
		),
		['recurrenceDays']
	),
	v.transform((data) => ({
		...data,
		recurrenceFrequency: data.scope === 'single' ? 'none' : data.recurrenceFrequency,
		recurrenceUntil:
			data.scope === 'single' || data.recurrenceFrequency === 'none' ? null : data.recurrenceUntil,
		recurrenceDays:
			data.scope === 'single' || data.recurrenceFrequency === 'none' ? null : data.recurrenceDays
	}))
);

export const deleteShiftSchema = v.object({
	id: v.pipe(
		v.string('Choose a shift.'),
		v.trim(),
		v.transform(Number),
		v.integer('Choose a shift.'),
		v.minValue(1, 'Choose a shift.')
	),
	occurrenceDate: v.pipe(
		v.string('Choose a shift date.'),
		v.trim(),
		v.minLength(1, 'Choose a shift date.'),
		v.check(isCanonicalDate, 'Use a valid shift date.')
	),
	scope: v.picklist(deleteShiftScopeValues, 'Choose what to delete.')
});
