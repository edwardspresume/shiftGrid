import { recurrenceDayValues } from '$lib/schedule/constants';
import { parseCanonicalDate } from '$lib/schedule/date';

export type RepeatUntilPreset = {
	label: string;
	duration: { days?: number; months?: number };
};

export const repeatUntilPresets: RepeatUntilPreset[] = [
	{ label: '2 weeks', duration: { days: 14 } },
	{ label: '1 month', duration: { months: 1 } },
	{ label: '3 months', duration: { months: 3 } }
];

export function getRecurrenceDayValue(dateValue: string) {
	const date = parseCanonicalDate(dateValue);
	if (!date) return recurrenceDayValues[0];

	return new Date(Date.UTC(date.year, date.month - 1, date.day))
		.getUTCDay()
		.toString() as (typeof recurrenceDayValues)[number];
}

export function getPresetRepeatUntil(
	shiftDate: string,
	repeatUntilMax: string | undefined,
	preset: RepeatUntilPreset
) {
	const date = parseCanonicalDate(shiftDate);
	if (!date) return '';

	const presetDate = date.add(preset.duration);
	const maxDate = repeatUntilMax ? parseCanonicalDate(repeatUntilMax) : null;

	return maxDate && presetDate.compare(maxDate) > 0 ? maxDate.toString() : presetDate.toString();
}
