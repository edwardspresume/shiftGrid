import { describe, expect, it } from 'vitest';
import * as v from 'valibot';

import { parseCanonicalDate } from './date';
import { addShiftSchema } from './shiftValidation';
import {
	formatClockTime,
	getShiftHours,
	getShiftMinuteRange,
	isClockInput,
	shiftMinuteRangesOverlap
} from './time';

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
		expect(formatClockTime('17:00')).toBe('5:00 PM');
		expect(getShiftHours('22:00', '06:00', 30)).toBe(7.5);
	});

	it('detects overlapping shift time ranges without blocking adjacent shifts', () => {
		const shiftDate = parseCanonicalDate('2026-06-24');
		if (!shiftDate) throw new Error('Expected valid shift date');

		const existingShift = getShiftMinuteRange(shiftDate, '09:00', '17:00');

		expect(
			shiftMinuteRangesOverlap(existingShift, getShiftMinuteRange(shiftDate, '13:00', '18:00'))
		).toBe(true);
		expect(
			shiftMinuteRangesOverlap(existingShift, getShiftMinuteRange(shiftDate, '17:00', '21:00'))
		).toBe(false);
	});

	it('detects overlaps when overnight shifts cover the following date', () => {
		const shiftDate = parseCanonicalDate('2026-06-24');
		const nextDate = parseCanonicalDate('2026-06-25');
		if (!shiftDate || !nextDate) throw new Error('Expected valid shift dates');

		const overnightShift = getShiftMinuteRange(shiftDate, '22:00', '06:00');

		expect(
			shiftMinuteRangesOverlap(overnightShift, getShiftMinuteRange(nextDate, '01:00', '03:00'))
		).toBe(true);
		expect(
			shiftMinuteRangesOverlap(overnightShift, getShiftMinuteRange(nextDate, '06:00', '10:00'))
		).toBe(false);
	});
});
