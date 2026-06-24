import { parseDate, type CalendarDate } from '@internationalized/date';

const canonicalDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export function parseCanonicalDate(value: string): CalendarDate | null {
	if (!canonicalDatePattern.test(value)) return null;

	try {
		const date = parseDate(value);
		return date.toString() === value ? date : null;
	} catch {
		return null;
	}
}

export function isCanonicalDate(value: string) {
	return parseCanonicalDate(value) !== null;
}
