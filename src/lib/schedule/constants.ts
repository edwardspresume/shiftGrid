export const recurrenceFrequencyValues = ['none', 'weekly', 'biweekly'] as const;
export const RECURRENCE_LIMIT_YEARS = 1;
export const recurrenceDayValues = ['0', '1', '2', '3', '4', '5', '6'] as const;

export type RecurrenceFrequency = (typeof recurrenceFrequencyValues)[number];
export type RecurrenceDayValue = (typeof recurrenceDayValues)[number];

export const recurrenceFrequencyLabels = {
	none: 'None',
	weekly: 'Weekly',
	biweekly: 'Biweekly'
} satisfies Record<RecurrenceFrequency, string>;

export const recurrenceFrequencyDisplayLabels = {
	none: 'One-time',
	weekly: 'Weekly',
	biweekly: 'Biweekly'
} satisfies Record<RecurrenceFrequency, string>;

export const recurrenceDayLabels = {
	'0': 'Sun',
	'1': 'Mon',
	'2': 'Tue',
	'3': 'Wed',
	'4': 'Thu',
	'5': 'Fri',
	'6': 'Sat'
} satisfies Record<RecurrenceDayValue, string>;
