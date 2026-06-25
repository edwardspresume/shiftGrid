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
		RECURRENCE_LIMIT_YEARS,
		recurrenceDayLabels,
		recurrenceDayValues,
		type RecurrenceFrequency,
		recurrenceFrequencyLabels,
		recurrenceFrequencyValues as recurrenceFrequencyOptions
	} from '$lib/schedule/constants';
	import { parseCanonicalDate } from '$lib/schedule/date';
	import {
		editShift,
		getSchedule,
		type TeamMemberOption,
		type ScheduledShift
	} from '$lib/schedule/shifts.remote';
	import { formatClockTime, formatCompactHours, getShiftHours } from '$lib/schedule/time';
	import { DEFAULT_WEEK_STARTS_ON, getWeekStart } from '$lib/schedule/week';
	import { CalendarDays, Clock3, NotebookPen, Repeat2, UserRound } from '@lucide/svelte';

	type EditScope = 'single' | 'series';
	type RepeatUntilPreset = {
		label: string;
		duration: { days?: number; months?: number };
	};

	let {
		teamMembers,
		shift,
		visibleWeekStart,
		currentWeekQuery,
		onCancel
	}: {
		teamMembers: TeamMemberOption[];
		shift: ScheduledShift;
		visibleWeekStart: string;
		currentWeekQuery: string | null;
		onCancel: () => void;
	} = $props();

	let initializedFor = '';
	let editScope = $state<EditScope>('series');

	const fieldClass =
		'w-full rounded-lg border-input bg-background text-sm shadow-sm transition-colors focus:border-ring focus:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:opacity-70';
	const labelClass = 'text-xs font-semibold text-muted-foreground uppercase';
	const issueClass = 'text-xs font-medium text-destructive';
	const repeatUntilPresets: RepeatUntilPreset[] = [
		{ label: '2 weeks', duration: { days: 14 } },
		{ label: '1 month', duration: { months: 1 } },
		{ label: '3 months', duration: { months: 3 } }
	];
	const defaultTeamMemberId = $derived(shift.teamMemberId.toString());
	const defaultFormKey = $derived(`${shift.ruleId}:${shift.baseShiftDate}:${shift.shiftDate}`);
	const sourceIsRecurring = $derived(shift.recurrenceFrequency !== 'none');
	const activeTeamMemberId = $derived(
		String(editShift.fields.teamMemberId.value() || defaultTeamMemberId)
	);
	const shiftDate = $derived(
		String(
			editShift.fields.shiftDate.value() ||
				(editScope === 'single' ? shift.shiftDate : shift.baseShiftDate)
		)
	);
	const startTime = $derived(String(editShift.fields.startTime.value() || shift.startTime));
	const endTime = $derived(String(editShift.fields.endTime.value() || shift.endTime));
	const recurrenceFrequency = $derived(
		String(editShift.fields.recurrenceFrequency.value() || shift.recurrenceFrequency)
	);
	const recurrenceUntil = $derived(String(editShift.fields.recurrenceUntil.value() || ''));
	const isRecurring = $derived(recurrenceFrequency !== 'none');
	const selectedTeamMember = $derived(
		teamMembers.find((teamMember) => teamMember.id.toString() === activeTeamMemberId) ??
			teamMembers.find((teamMember) => teamMember.id === shift.teamMemberId) ??
			teamMembers[0]
	);

	$effect(() => {
		if (initializedFor === defaultFormKey) return;

		const nextScope = sourceIsRecurring ? 'single' : 'series';
		initializedFor = defaultFormKey;
		editScope = nextScope;
		editShift.fields.set(getDefaultFormValues(nextScope));
	});

	const totalHours = $derived(getShiftHours(startTime, endTime));
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

	function getRecurrenceDayValues(value: ScheduledShift) {
		if (value.recurrenceDays && value.recurrenceDays.length > 0) {
			return value.recurrenceDays.map(
				(day) => day.toString() as (typeof recurrenceDayValues)[number]
			);
		}

		return [getRecurrenceDayValue(value.baseShiftDate)];
	}

	function getDefaultFormValues(scope: EditScope) {
		const isSingleOccurrence = sourceIsRecurring && scope === 'single';
		const activeShiftDate = isSingleOccurrence ? shift.shiftDate : shift.baseShiftDate;

		return {
			id: shift.ruleId.toString(),
			occurrenceDate: shift.shiftDate,
			teamMemberId: shift.teamMemberId.toString(),
			shiftDate: activeShiftDate,
			startTime: shift.startTime,
			endTime: shift.endTime,
			recurrenceFrequency: (isSingleOccurrence
				? 'none'
				: shift.recurrenceFrequency) as RecurrenceFrequency,
			recurrenceUntil: isSingleOccurrence ? '' : (shift.recurrenceUntil ?? ''),
			recurrenceDays: isSingleOccurrence
				? [getRecurrenceDayValue(shift.shiftDate)]
				: getRecurrenceDayValues(shift),
			notes: shift.notes ?? ''
		};
	}

	function selectEditScope(scope: EditScope) {
		if (editScope === scope) return;

		editScope = scope;
		editShift.fields.set(getDefaultFormValues(scope));
	}

	function getPresetRepeatUntil(preset: RepeatUntilPreset) {
		const date = parseCanonicalDate(shiftDate);
		if (!date) return '';

		const presetDate = date.add(preset.duration);
		const maxDate = repeatUntilMax ? parseCanonicalDate(repeatUntilMax) : null;

		return maxDate && presetDate.compare(maxDate) > 0 ? maxDate.toString() : presetDate.toString();
	}

	function getCurrentRecurrenceDays() {
		const currentDays = editShift.fields.recurrenceDays.value();

		return Array.isArray(currentDays) && currentDays.length > 0
			? (currentDays as (typeof recurrenceDayValues)[number][])
			: getDefaultFormValues(editScope).recurrenceDays;
	}

	function applyRepeatUntilPreset(preset: RepeatUntilPreset) {
		const presetDate = getPresetRepeatUntil(preset);
		if (!presetDate) return;

		editShift.fields.set({
			id: shift.ruleId.toString(),
			occurrenceDate: shift.shiftDate,
			teamMemberId: activeTeamMemberId,
			shiftDate,
			startTime,
			endTime,
			recurrenceFrequency: recurrenceFrequency as RecurrenceFrequency,
			recurrenceUntil: presetDate,
			recurrenceDays: getCurrentRecurrenceDays(),
			notes: String(editShift.fields.notes.value() || '')
		});
	}

	function resetForm(element: HTMLFormElement) {
		element.reset();
		editShift.fields.set(getDefaultFormValues(editScope));
	}
</script>

<form
	{...editShift.enhance(async (form) => {
		const submittedShiftDate = String(form.fields.shiftDate.value() || shift.baseShiftDate);
		const submitted = await form.submit().updates(getSchedule(currentWeekQuery));
		if (!submitted) return;

		const submittedCalendarDate = parseCanonicalDate(submittedShiftDate);
		const submittedWeekStart = submittedCalendarDate
			? getWeekStart(submittedCalendarDate, DEFAULT_WEEK_STARTS_ON).toString()
			: shift.baseShiftDate;

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
	<input {...editShift.fields.id.as('hidden', shift.ruleId.toString())} />
	<input {...editShift.fields.occurrenceDate.as('hidden', shift.shiftDate)} />

	<DialogHeader class="border-b p-4">
		<DialogTitle>Edit shift</DialogTitle>
		<DialogDescription class="sr-only">
			Update a scheduled shift with team member, date, time, recurrence, and notes.
		</DialogDescription>
		<p class="text-sm font-medium text-muted-foreground">{formattedHours} total</p>
	</DialogHeader>

	<div class="grid max-h-[calc(100dvh-12rem)] gap-5 overflow-y-auto p-4 lg:grid-cols-[1fr_18rem]">
		<div class="grid gap-4 md:grid-cols-2">
			{#if sourceIsRecurring}
				<fieldset class="space-y-2 md:col-span-2">
					<legend class={labelClass}>Apply changes to</legend>
					<div class="grid gap-2 sm:grid-cols-2">
						<button
							type="button"
							class={[
								'flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors',
								editScope === 'single'
									? 'border-primary bg-primary/10 text-primary'
									: 'bg-background hover:bg-muted/50'
							]}
							aria-pressed={editScope === 'single'}
							onclick={() => selectEditScope('single')}
						>
							<CalendarDays class="size-4" />
							This shift
						</button>
						<button
							type="button"
							class={[
								'flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors',
								editScope === 'series'
									? 'border-primary bg-primary/10 text-primary'
									: 'bg-background hover:bg-muted/50'
							]}
							aria-pressed={editScope === 'series'}
							onclick={() => selectEditScope('series')}
						>
							<Repeat2 class="size-4" />
							Series
						</button>
					</div>
					{#each editShift.fields.scope.issues() ?? [] as issue (issue.message)}
						<p class={issueClass}>{issue.message}</p>
					{/each}
					{#each editShift.fields.occurrenceDate.issues() ?? [] as issue (issue.message)}
						<p class={issueClass}>{issue.message}</p>
					{/each}
				</fieldset>
			{/if}

			<label class="space-y-2 md:col-span-2">
				<span class={labelClass}>Team member</span>
				<span class="relative block">
					<UserRound
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						{...editShift.fields.teamMemberId.as('select', defaultTeamMemberId)}
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
				{#each editShift.fields.teamMemberId.issues() ?? [] as issue (issue.message)}
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
						{...editShift.fields.shiftDate.as(
							'date',
							editScope === 'single' ? shift.shiftDate : shift.baseShiftDate
						)}
						class={`${fieldClass} pl-9`}
						required
					/>
				</span>
				{#each editShift.fields.shiftDate.issues() ?? [] as issue (issue.message)}
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
						{...editShift.fields.startTime.as('time', shift.startTime)}
						class={`${fieldClass} pl-9`}
						required
					/>
				</span>
				{#each editShift.fields.startTime.issues() ?? [] as issue (issue.message)}
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
						{...editShift.fields.endTime.as('time', shift.endTime)}
						class={`${fieldClass} pl-9`}
						required
					/>
				</span>
				{#each editShift.fields.endTime.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Recurrence</span>
				<span class="relative block">
					<Repeat2
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					{#if sourceIsRecurring && editScope === 'single'}
						<input {...editShift.fields.recurrenceFrequency.as('hidden', 'none')} />
						<span class={`${fieldClass} flex min-h-10 items-center pl-9 text-muted-foreground`}>
							{recurrenceFrequencyLabels.none}
						</span>
					{:else}
						<select
							{...editShift.fields.recurrenceFrequency.as('select', shift.recurrenceFrequency)}
							class={`${fieldClass} pl-9`}
						>
							{#each recurrenceFrequencyOptions as option (option)}
								<option value={option}>{recurrenceFrequencyLabels[option]}</option>
							{/each}
						</select>
					{/if}
				</span>
				{#each editShift.fields.recurrenceFrequency.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>

			<div class={['space-y-2', !isRecurring && 'opacity-60']}>
				<label class="block space-y-2">
					<span class={labelClass}>Repeat until</span>
					<input
						{...editShift.fields.recurrenceUntil.as('date')}
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
				{#each editShift.fields.recurrenceUntil.issues() ?? [] as issue (issue.message)}
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
								{...editShift.fields.recurrenceDays.as('checkbox', option)}
								class="sr-only"
								disabled={!isRecurring}
							/>
							{recurrenceDayLabels[option]}
						</label>
					{/each}
				</div>
				{#each editShift.fields.recurrenceDays.issues() ?? [] as issue (issue.message)}
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
						{...editShift.fields.notes.as('text')}
						class={`${fieldClass} min-h-32 resize-none pl-9`}
						placeholder="Coverage, handoff, or staffing notes"
					></textarea>
				</span>
				{#each editShift.fields.notes.issues() ?? [] as issue (issue.message)}
					<p class={issueClass}>{issue.message}</p>
				{/each}
			</label>
		</aside>
	</div>

	<DialogFooter class="mx-0 mb-0 rounded-none border-t px-4 py-4">
		<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
		<Button
			{...editShift.fields.scope.as('submit', editScope)}
			disabled={teamMembers.length === 0 || editShift.pending > 0}
		>
			{editShift.pending > 0
				? 'Saving...'
				: sourceIsRecurring && editScope === 'single'
					? 'Save this shift'
					: sourceIsRecurring
						? 'Save series'
						: 'Save changes'}
		</Button>
	</DialogFooter>
</form>
