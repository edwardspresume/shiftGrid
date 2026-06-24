import {
	DateFormatter,
	startOfWeek,
	today,
	toCalendarDate,
	type CalendarDate,
	type DateValue
} from '@internationalized/date';

export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const DEFAULT_WEEK_STARTS_ON: WeekStartsOn = 0;
export const SCHEDULE_LOCALE = 'en-US';
export const SCHEDULE_TIME_ZONE = 'America/New_York';

const DAY_OF_WEEK = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

const weekdayMonthDayFormatter = new DateFormatter(SCHEDULE_LOCALE, {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
	timeZone: SCHEDULE_TIME_ZONE
});

const monthDayFormatter = new DateFormatter(SCHEDULE_LOCALE, {
	month: 'short',
	day: 'numeric',
	timeZone: SCHEDULE_TIME_ZONE
});

const monthFormatter = new DateFormatter(SCHEDULE_LOCALE, {
	month: 'short',
	timeZone: SCHEDULE_TIME_ZONE
});

function toLocalDate(date: CalendarDate) {
	return date.toDate(SCHEDULE_TIME_ZONE);
}

export function getCurrentWeekStart(weekStartsOn = DEFAULT_WEEK_STARTS_ON) {
	return getWeekStart(today(SCHEDULE_TIME_ZONE), weekStartsOn);
}

export function getWeekStart(date: DateValue, weekStartsOn = DEFAULT_WEEK_STARTS_ON) {
	return startOfWeek(
		toCalendarDate(date),
		SCHEDULE_LOCALE,
		DAY_OF_WEEK[weekStartsOn]
	) as CalendarDate;
}

export function getWeekDays(weekStart: CalendarDate) {
	return Array.from({ length: 7 }, (_, index) => weekStart.add({ days: index }));
}

export function formatDayLabel(date: CalendarDate) {
	return weekdayMonthDayFormatter.format(toLocalDate(date));
}

export function formatWeekRange(weekStart: CalendarDate) {
	const weekEnd = weekStart.add({ days: 6 });

	if (weekStart.year === weekEnd.year && weekStart.month === weekEnd.month) {
		return `${monthFormatter.format(toLocalDate(weekStart))} ${weekStart.day}-${weekEnd.day}, ${weekStart.year}`;
	}

	if (weekStart.year === weekEnd.year) {
		return `${monthDayFormatter.format(toLocalDate(weekStart))}-${monthDayFormatter.format(
			toLocalDate(weekEnd)
		)}, ${weekStart.year}`;
	}

	return `${monthDayFormatter.format(toLocalDate(weekStart))}, ${weekStart.year}-${monthDayFormatter.format(
		toLocalDate(weekEnd)
	)}, ${weekEnd.year}`;
}
