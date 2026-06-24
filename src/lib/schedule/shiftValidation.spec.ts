import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { parseCanonicalDate } from './date';
import { addShiftSchema } from './shiftValidation';
import { getShiftHours, isClockInput } from './time';

const validShift = {
	locationId: '1',
	shiftDate: '2026-06-24',
	startTime: '09:00',
	endTime: '17:00',
	breakMinutes: '0',
	recurrenceFrequency: 'none',
	recurrenceUntil: '',
	notes: 'Coverage notes'
};

describe('addShiftSchema', () => {
	it('parses a valid shift form submission', () => {
		const result = v.safeParse(addShiftSchema, validShift);

		expect(result.success).toBe(true);
		if (!result.success) return;

		expect(result.output).toMatchObject({
			locationId: 1,
			breakMinutes: 0,
			recurrenceFrequency: 'none',
			recurrenceUntil: null,
			notes: 'Coverage notes'
		});
	});

	it('rejects invalid time values', () => {
		const result = v.safeParse(addShiftSchema, {
			...validShift,
			startTime: '25:00'
		});

		expect(result.success).toBe(false);
	});

	it('rejects non-minute-precision form time values', () => {
		const result = v.safeParse(addShiftSchema, {
			...validShift,
			startTime: '09:00:00'
		});

		expect(result.success).toBe(false);
	});

	it('rejects non-canonical date values', () => {
		const result = v.safeParse(addShiftSchema, {
			...validShift,
			shiftDate: '0000-01-01'
		});

		expect(result.success).toBe(false);
		expect(parseCanonicalDate('0000-01-01')).toBeNull();
	});

	it('rejects invalid break values instead of silently defaulting them', () => {
		const result = v.safeParse(addShiftSchema, {
			...validShift,
			breakMinutes: '999'
		});

		expect(result.success).toBe(false);
	});

	it('rejects recurrence end dates before the shift date', () => {
		const result = v.safeParse(addShiftSchema, {
			...validShift,
			recurrenceFrequency: 'weekly',
			recurrenceUntil: '2026-06-23'
		});

		expect(result.success).toBe(false);
	});

	it('shares clock validation and cross-midnight duration logic', () => {
		expect(isClockInput('09:00')).toBe(true);
		expect(isClockInput('9:00')).toBe(false);
		expect(isClockInput('24:00')).toBe(false);
		expect(getShiftHours('22:00', '06:00', 30)).toBe(7.5);
	});
});
