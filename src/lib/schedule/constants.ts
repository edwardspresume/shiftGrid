export const recurrenceFrequencyValues = ['none', 'weekly', 'biweekly'] as const;

export type RecurrenceFrequency = (typeof recurrenceFrequencyValues)[number];

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

export const breakMinuteOptions = ['0', '15', '30', '45', '60'] as const;

export type BreakMinuteOption = (typeof breakMinuteOptions)[number];

export const breakMinuteLabels = {
	'0': 'No break',
	'15': '15 minutes',
	'30': '30 minutes',
	'45': '45 minutes',
	'60': '60 minutes'
} satisfies Record<BreakMinuteOption, string>;
