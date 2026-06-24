<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { deleteShift, getSchedule, type ScheduledShift } from '$lib/schedule/shifts.remote';
	import { CalendarX, RefreshCw, Trash2 } from '@lucide/svelte';

	let {
		shift,
		currentWeekQuery,
		onCancel
	}: {
		shift: ScheduledShift;
		currentWeekQuery: string | null;
		onCancel: () => void;
	} = $props();

	const isRecurring = $derived(shift.recurrenceFrequency !== 'none');
</script>

<form
	{...deleteShift.enhance(async (form) => {
		const submitted = await form.submit().updates(getSchedule(currentWeekQuery));
		if (!submitted) return;

		form.element.reset();
		onCancel();
	})}
>
	<input {...deleteShift.fields.id.as('hidden', shift.ruleId.toString())} />
	<input {...deleteShift.fields.occurrenceDate.as('hidden', shift.shiftDate)} />

	<DialogHeader class="border-b p-4">
		<DialogTitle>Delete shift</DialogTitle>
		<DialogDescription class="sr-only">
			Choose whether to delete this shift or the recurring series.
		</DialogDescription>
	</DialogHeader>

	<div class="space-y-4 p-4">
		<div
			class="rounded-lg border border-l-4 bg-background p-3"
			style:border-left-color={shift.locationColor}
		>
			<p class="text-sm font-bold">{shift.location}</p>
			<p class="mt-1 text-sm font-medium text-muted-foreground">{shift.time}</p>
			<p
				class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase"
			>
				<RefreshCw class="size-3.5" />
				{shift.frequency}
			</p>
		</div>

		{#if isRecurring}
			<p class="text-sm text-muted-foreground">
				This shift belongs to a recurring series. Choose how much of the series to remove.
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">This will remove the selected shift.</p>
		{/if}

		{#each deleteShift.fields.id.issues() ?? [] as issue (issue.message)}
			<p class="text-xs font-medium text-destructive">{issue.message}</p>
		{/each}
		{#each deleteShift.fields.occurrenceDate.issues() ?? [] as issue (issue.message)}
			<p class="text-xs font-medium text-destructive">{issue.message}</p>
		{/each}
		{#each deleteShift.fields.scope.issues() ?? [] as issue (issue.message)}
			<p class="text-xs font-medium text-destructive">{issue.message}</p>
		{/each}
	</div>

	<DialogFooter class="mx-0 mb-0 rounded-none border-t px-4 py-4">
		<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
		{#if isRecurring}
			<Button
				{...deleteShift.fields.scope.as('submit', 'single')}
				variant="destructive"
				disabled={deleteShift.pending > 0}
			>
				<CalendarX class="size-4" />
				Delete this shift
			</Button>
			<Button
				{...deleteShift.fields.scope.as('submit', 'series')}
				variant="destructive"
				disabled={deleteShift.pending > 0}
			>
				<Trash2 class="size-4" />
				Delete series
			</Button>
		{:else}
			<Button
				{...deleteShift.fields.scope.as('submit', 'single')}
				variant="destructive"
				disabled={deleteShift.pending > 0}
			>
				<Trash2 class="size-4" />
				Delete shift
			</Button>
		{/if}
	</DialogFooter>
</form>
