<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import {
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		breakMinuteLabels,
		breakMinuteOptions,
		recurrenceFrequencyLabels,
		recurrenceFrequencyValues
	} from '$lib/schedule/constants';
	import { parseCanonicalDate } from '$lib/schedule/date';
	import { addShift, getSchedule, type LocationOption } from '$lib/schedule/shifts.remote';
	import {
		DEFAULT_END_TIME,
		DEFAULT_START_TIME,
		formatClockTime,
		formatCompactHours,
		getShiftHours
	} from '$lib/schedule/time';
	import { DEFAULT_WEEK_STARTS_ON, getWeekStart } from '$lib/schedule/week';
	import { CalendarDays, Clock3, MapPin, NotebookPen, Repeat2, Utensils } from '@lucide/svelte';

	let {
		locations,
		initialDate,
		visibleWeekStart,
		currentWeekQuery,
		onCancel
	}: {
		locations: LocationOption[];
		initialDate: string;
		visibleWeekStart: string;
		currentWeekQuery: string | null;
		onCancel: () => void;
	} = $props();

	let initializedFor = '';

	const fieldClass =
		'w-full rounded-lg border-input bg-background text-sm shadow-sm transition-colors focus:border-ring focus:ring-ring/50';
	const labelClass = 'text-xs font-semibold text-muted-foreground uppercase';
	const issueClass = 'text-xs font-medium text-destructive';

	const defaultLocationId = $derived(locations[0]?.id.toString() ?? '');
	const defaultFormKey = $derived(`${initialDate}:${defaultLocationId}`);
	const activeLocationId = $derived(
		String(addShift.fields.locationId.value() || defaultLocationId)
	);
	const startTime = $derived(String(addShift.fields.startTime.value() || DEFAULT_START_TIME));
	const endTime = $derived(String(addShift.fields.endTime.value() || DEFAULT_END_TIME));
	const breakMinutes = $derived(
		String(addShift.fields.breakMinutes.value() || breakMinuteOptions[0])
	);
	const recurrenceFrequency = $derived(
		String(addShift.fields.recurrenceFrequency.value() || recurrenceFrequencyValues[0])
	);
	const selectedLocation = $derived(
		locations.find((location) => location.id.toString() === activeLocationId) ?? locations[0]
	);
	const defaultFormValues = $derived({
		locationId: defaultLocationId,
		shiftDate: initialDate,
		startTime: DEFAULT_START_TIME,
		endTime: DEFAULT_END_TIME,
		breakMinutes: breakMinuteOptions[0],
		recurrenceFrequency: recurrenceFrequencyValues[0],
		recurrenceUntil: '',
		notes: ''
	});

	$effect(() => {
		if (initializedFor === defaultFormKey) return;

		initializedFor = defaultFormKey;
		addShift.fields.set(defaultFormValues);
	});

	const totalHours = $derived(getShiftHours(startTime, endTime, Number(breakMinutes)));
	const formattedHours = $derived(formatCompactHours(totalHours));
	const formattedTimeRange = $derived(
		`${formatClockTime(startTime)} - ${formatClockTime(endTime)}`
	);

	function resetForm(element: HTMLFormElement) {
		element.reset();
		addShift.fields.set(defaultFormValues);
	}
</script>

<form
	{...addShift.enhance(async (form) => {
		const submittedShiftDate = String(form.fields.shiftDate.value() || initialDate);
		const submitted = await form.submit().updates(getSchedule(currentWeekQuery));
		if (!submitted) return;

		const submittedCalendarDate = parseCanonicalDate(submittedShiftDate);
		const submittedWeekStart = submittedCalendarDate
			? getWeekStart(submittedCalendarDate, DEFAULT_WEEK_STARTS_ON).toString()
			: initialDate;

		resetForm(form.element);
		onCancel();

		if (submittedWeekStart !== visibleWeekStart) {
			await goto(resolve(`/?week=${submittedWeekStart}`), {
				keepFocus: true,
				noScroll: true
			});
		}
	})}
>
	<DialogHeader class="border-b p-4">
		<DialogTitle>Add shift</DialogTitle>
		<DialogDescription class="sr-only">
			Create a scheduled shift with location, date, time, break, recurrence, and notes.
		</DialogDescription>
		<p class="text-sm font-medium text-muted-foreground">{formattedHours} total</p>
	</DialogHeader>

	<div class="grid max-h-[calc(100dvh-12rem)] gap-5 overflow-y-auto p-4 lg:grid-cols-[1fr_18rem]">
		<div class="grid gap-4 md:grid-cols-2">
			<label class="space-y-2 md:col-span-2">
				<span class={labelClass}>Location</span>
				<span class="relative block">
					<MapPin
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						{...addShift.fields.locationId.as('select', defaultLocationId)}
						class={`${fieldClass} pl-9`}
						required
						disabled={locations.length === 0}
					>
						{#if locations.length === 0}
							<option value="">No locations available</option>
						{:else}
							{#each locations as location (location.id)}
								<option value={location.id.toString()}>{location.name}</option>
							{/each}
						{/if}
					</select>
				</span>
				{#each addShift.fields.locationId.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Date</span>
				<span class="relative block">
					<CalendarDays
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						{...addShift.fields.shiftDate.as('date', initialDate)}
						class={`${fieldClass} pl-9`}
						required
						readonly
					/>
				</span>
				{#each addShift.fields.shiftDate.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Break</span>
				<span class="relative block">
					<Utensils
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						{...addShift.fields.breakMinutes.as('select', breakMinuteOptions[0])}
						class={`${fieldClass} pl-9`}
					>
						{#each breakMinuteOptions as option (option)}
							<option value={option}>{breakMinuteLabels[option]}</option>
						{/each}
					</select>
				</span>
				{#each addShift.fields.breakMinutes.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Start time</span>
				<span class="relative block">
					<Clock3
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						{...addShift.fields.startTime.as('time', DEFAULT_START_TIME)}
						class={`${fieldClass} pl-9`}
						required
					/>
				</span>
				{#each addShift.fields.startTime.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>End time</span>
				<span class="relative block">
					<Clock3
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						{...addShift.fields.endTime.as('time', DEFAULT_END_TIME)}
						class={`${fieldClass} pl-9`}
						required
					/>
				</span>
				{#each addShift.fields.endTime.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Recurrence</span>
				<span class="relative block">
					<Repeat2
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						{...addShift.fields.recurrenceFrequency.as('select', recurrenceFrequencyValues[0])}
						class={`${fieldClass} pl-9`}
					>
						{#each recurrenceFrequencyValues as option (option)}
							<option value={option}>{recurrenceFrequencyLabels[option]}</option>
						{/each}
					</select>
				</span>
				{#each addShift.fields.recurrenceFrequency.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Repeat until</span>
				<input
					{...addShift.fields.recurrenceUntil.as('date')}
					class={fieldClass}
					disabled={recurrenceFrequency === 'none'}
				/>
				{#each addShift.fields.recurrenceUntil.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>
		</div>

		<aside class="space-y-4 rounded-lg border bg-muted/20 p-4">
			<div class="space-y-2">
				<p class={labelClass}>Preview</p>
				<div
					class="rounded-lg border border-l-4 bg-background p-3 shadow-sm"
					style:border-left-color={selectedLocation?.color}
				>
					<p class="text-sm font-bold">{selectedLocation?.name ?? 'Location'}</p>
					<p class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
						<Clock3 class="size-3.5" />
						{formattedTimeRange}
					</p>
					<p class="mt-1 text-xs font-medium text-muted-foreground">{formattedHours} total</p>
				</div>
			</div>

			<label class="block space-y-2">
				<span class={labelClass}>Notes</span>
				<span class="relative block">
					<NotebookPen
						class="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
					/>
					<textarea
						{...addShift.fields.notes.as('text')}
						class={`${fieldClass} min-h-32 resize-none pl-9`}
						placeholder="Coverage, handoff, or staffing notes"
					></textarea>
				</span>
				{#each addShift.fields.notes.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>
		</aside>
	</div>

	<DialogFooter class="mx-0 mb-0 rounded-none border-t px-4 py-4">
		<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
		<Button type="submit" disabled={locations.length === 0 || addShift.pending > 0}>
			{addShift.pending > 0 ? 'Adding...' : 'Add shift'}
		</Button>
	</DialogFooter>
</form>
