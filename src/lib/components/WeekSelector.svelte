<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import { formatWeekRange, type WeekStartsOn } from '$lib/schedule/week';
	import type { CalendarDate, DateValue } from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';

	let {
		weekStart,
		weekStartsOn,
		onPreviousWeek,
		onNextWeek,
		onThisWeek,
		onApplyDate
	}: {
		weekStart: CalendarDate;
		weekStartsOn: WeekStartsOn;
		onPreviousWeek: () => void;
		onNextWeek: () => void;
		onThisWeek: () => void;
		onApplyDate: (date: DateValue) => void;
	} = $props();

	let open = $state(false);
	let selectedDate: DateValue | undefined = $state();
	const rangeLabel = $derived(formatWeekRange(weekStart));

	function applySelectedDate() {
		if (!selectedDate) return;
		onApplyDate(selectedDate);
		open = false;
	}
</script>

<nav class="flex items-stretch gap-2">
	<section
		aria-label="Week selector"
		class="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
	>
		<Button variant="ghost" size="icon" aria-label="Previous week" onclick={onPreviousWeek}>
			<ChevronLeft class="size-4" />
		</Button>

		<Popover.Root bind:open>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button
						{...props}
						variant="ghost"
						class="w-32 justify-center sm:w-44"
						title="Jump to date"
						aria-label="Jump to date"
					>
						<span class="min-w-0 text-center font-heading text-sm leading-none font-semibold">
							{rangeLabel}
						</span>
						<CalendarDays class="size-4" />
					</Button>
				{/snippet}
			</Popover.Trigger>
			<Popover.Content class="w-auto gap-3 p-3" align="center">
				<div class="px-1">
					<p class="font-heading text-sm leading-none font-semibold">Choose Week</p>
				</div>

				<Calendar
					type="single"
					bind:value={selectedDate}
					captionLayout="dropdown"
					{weekStartsOn}
					calendarLabel="Choose a date"
				/>

				<div class="flex justify-end border-t pt-3">
					<Button disabled={!selectedDate} onclick={applySelectedDate}>Apply</Button>
				</div>
			</Popover.Content>
		</Popover.Root>

		<Button variant="ghost" size="icon" aria-label="Next week" onclick={onNextWeek}>
			<ChevronRight class="size-4" />
		</Button>
	</section>

	<Button variant="outline" class="h-auto" onclick={onThisWeek}>This Week</Button>
</nav>
