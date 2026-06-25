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
		RECURRENCE_LIMIT_YEARS,
		recurrenceDayLabels,
		recurrenceDayValues,
		recurrenceFrequencyLabels,
		recurrenceFrequencyValues
	} from '$lib/schedule/constants';
	import { parseCanonicalDate } from '$lib/schedule/date';
	import { addShift, getSchedule, type TeamMemberOption } from '$lib/schedule/shifts.remote';
	import {
		DEFAULT_END_TIME,
		DEFAULT_START_TIME,
		formatClockTime,
		formatCompactHours,
		getShiftHours
	} from '$lib/schedule/time';
	import { DEFAULT_WEEK_STARTS_ON, getWeekStart } from '$lib/schedule/week';
	import { CalendarDays, Clock3, NotebookPen, Repeat2, UserRound, Utensils } from '@lucide/svelte';

	type RepeatUntilPreset = {
		label: string;
		duration: { days?: number; months?: number };
	};

	let {
		teamMembers,
		initialDate,
		visibleWeekStart,
		currentWeekQuery,
		onCancel
	}: {
		teamMembers: TeamMemberOption[];
		initialDate: string;
		visibleWeekStart: string;
		currentWeekQuery: string | null;
		onCancel: () => void;
	} = $props();

	let initializedFor = '';

	const fieldClass =
		'w-full rounded-lg border-input bg-background text-sm shadow-sm transition-colors focus:border-ring focus:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:opacity-70';
	const labelClass = 'text-xs font-semibold text-muted-foreground uppercase';
	const issueClass = 'text-xs font-medium text-destructive';
	const repeatUntilPresets: RepeatUntilPreset[] = [
		{ label: '2 weeks', duration: { days: 14 } },
		{ label: '1 month', duration: { months: 1 } },
		{ label: '3 months', duration: { months: 3 } }
	];

	const defaultTeamMemberId = $derived(teamMembers[0]?.id.toString() ?? '');
	const defaultFormKey = $derived(`${initialDate}:${defaultTeamMemberId}`);
	const activeTeamMemberId = $derived(
		String(addShift.fields.teamMemberId.value() || defaultTeamMemberId)
	);
	const shiftDate = $derived(String(addShift.fields.shiftDate.value() || initialDate));
	const startTime = $derived(String(addShift.fields.startTime.value() || DEFAULT_START_TIME));
	const endTime = $derived(String(addShift.fields.endTime.value() || DEFAULT_END_TIME));
	const breakMinutes = $derived(
		String(addShift.fields.breakMinutes.value() || breakMinuteOptions[0])
	);
	const recurrenceFrequency = $derived(
		String(addShift.fields.recurrenceFrequency.value() || recurrenceFrequencyValues[0])
	);
	const recurrenceUntil = $derived(String(addShift.fields.recurrenceUntil.value() || ''));
	const isRecurring = $derived(recurrenceFrequency !== 'none');
	const selectedTeamMember = $derived(
		teamMembers.find((teamMember) => teamMember.id.toString() === activeTeamMemberId) ??
			teamMembers[0]
	);
	const defaultFormValues = $derived({
		teamMemberId: defaultTeamMemberId,
		shiftDate: initialDate,
		startTime: DEFAULT_START_TIME,
		endTime: DEFAULT_END_TIME,
		breakMinutes: breakMinuteOptions[0],
		recurrenceFrequency: recurrenceFrequencyValues[0],
		recurrenceUntil: '',
		recurrenceDays: [getRecurrenceDayValue(initialDate)],
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
	const repeatUntilMax = $derived(
		parseCanonicalDate(shiftDate)?.add({ years: RECURRENCE_LIMIT_YEARS }).toString()
	);

	function getRecurrenceDayValue(dateValue: string) {
		const date = parseCanonicalDate(dateValue);
		if (!date) return recurrenceDayValues[0];

		return new Date(Date.UTC(date.year, date.month - 1, date.day))
			.getUTCDay()
			.toString() as (typeof recurrenceDayValues)[number];
	}

	function getPresetRepeatUntil(preset: RepeatUntilPreset) {
		const date = parseCanonicalDate(shiftDate);
		if (!date) return '';

		const presetDate = date.add(preset.duration);
		const maxDate = repeatUntilMax ? parseCanonicalDate(repeatUntilMax) : null;

		return maxDate && presetDate.compare(maxDate) > 0 ? maxDate.toString() : presetDate.toString();
	}

	function getCurrentRecurrenceDays() {
		const currentDays = addShift.fields.recurrenceDays.value();

		return Array.isArray(currentDays) && currentDays.length > 0
			? (currentDays as (typeof recurrenceDayValues)[number][])
			: defaultFormValues.recurrenceDays;
	}

	function applyRepeatUntilPreset(preset: RepeatUntilPreset) {
		const presetDate = getPresetRepeatUntil(preset);
		if (!presetDate) return;

		addShift.fields.set({
			teamMemberId: activeTeamMemberId,
			shiftDate,
			startTime,
			endTime,
			breakMinutes: breakMinutes as (typeof breakMinuteOptions)[number],
			recurrenceFrequency: recurrenceFrequency as (typeof recurrenceFrequencyValues)[number],
			recurrenceUntil: presetDate,
			recurrenceDays: getCurrentRecurrenceDays(),
			notes: String(addShift.fields.notes.value() || '')
		});
	}

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
			Create a scheduled shift with team member, date, time, break, recurrence, and notes.
		</DialogDescription>
		<p class="text-sm font-medium text-muted-foreground">{formattedHours} total</p>
	</DialogHeader>

	<div class="grid max-h-[calc(100dvh-12rem)] gap-5 overflow-y-auto p-4 lg:grid-cols-[1fr_18rem]">
		<div class="grid gap-4 md:grid-cols-2">
			<label class="space-y-2 md:col-span-2">
				<span class={labelClass}>Team member</span>
				<span class="relative block">
					<UserRound
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						{...addShift.fields.teamMemberId.as('select', defaultTeamMemberId)}
						class={`${fieldClass} pl-9`}
						required
						disabled={teamMembers.length === 0}
					>
						{#if teamMembers.length === 0}
							<option value="">No team members available</option>
						{:else}
							{#each teamMembers as teamMember (teamMember.id)}
								<option value={teamMember.id.toString()}>{teamMember.name}</option>
							{/each}
						{/if}
					</select>
				</span>
				{#each addShift.fields.teamMemberId.issues() ?? [] as issue (issue.message)}
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

			<div class={['space-y-2', !isRecurring && 'opacity-60']}>
				<label class="block space-y-2">
					<span class={labelClass}>Repeat until</span>
					<input
						{...addShift.fields.recurrenceUntil.as('date')}
						class={fieldClass}
						disabled={!isRecurring}
						required={isRecurring}
						min={shiftDate}
						max={repeatUntilMax}
					/>
				</label>
				<div class="grid grid-cols-3 gap-1.5">
					{#each repeatUntilPresets as preset (preset.label)}
						{@const presetValue = getPresetRepeatUntil(preset)}
						<button
							type="button"
							class={[
								'min-h-8 rounded-lg border px-2 text-xs font-semibold transition-colors',
								recurrenceUntil === presetValue
									? 'border-primary bg-primary/10 text-primary'
									: 'bg-background hover:bg-muted/50'
							]}
							aria-pressed={recurrenceUntil === presetValue}
							disabled={!isRecurring || !presetValue}
							onclick={() => applyRepeatUntilPreset(preset)}
						>
							{preset.label}
						</button>
					{/each}
				</div>
				{#each addShift.fields.recurrenceUntil.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</div>

			<fieldset class={['space-y-2 md:col-span-2', !isRecurring && 'opacity-60']}>
				<legend class={labelClass}>Repeat days</legend>
				<div class="grid grid-cols-7 gap-2">
					{#each recurrenceDayValues as option (option)}
						<label
							class="flex min-h-10 items-center justify-center rounded-lg border bg-background px-2 text-xs font-semibold transition-colors has-checked:border-primary has-checked:bg-primary/10 has-checked:text-primary has-disabled:cursor-not-allowed has-disabled:bg-muted/60 has-disabled:text-muted-foreground"
						>
							<input
								{...addShift.fields.recurrenceDays.as('checkbox', option)}
								class="sr-only"
								disabled={!isRecurring}
							/>
							{recurrenceDayLabels[option]}
						</label>
					{/each}
				</div>
				{#each addShift.fields.recurrenceDays.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</fieldset>
		</div>

		<aside class="space-y-4 rounded-lg border bg-muted/20 p-4">
			<div class="space-y-2">
				<p class={labelClass}>Preview</p>
				<div
					class="rounded-lg border border-l-4 bg-background p-3 shadow-sm"
					style:border-left-color={selectedTeamMember?.color}
				>
					<p class="text-sm font-bold">{selectedTeamMember?.name ?? 'Team member'}</p>
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
		<Button type="submit" disabled={teamMembers.length === 0 || addShift.pending > 0}>
			{addShift.pending > 0 ? 'Adding...' : 'Add shift'}
		</Button>
	</DialogFooter>
</form>
