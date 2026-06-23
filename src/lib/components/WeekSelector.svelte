<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import type { DateValue } from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';

	let selectedDate: DateValue | undefined = $state();
</script>

<nav class="flex items-stretch gap-2">
	<section
		aria-label="Week selector"
		class="flex items-center gap-1 rounded-lg border bg-card p-1 shadow-sm"
	>
		<Button variant="ghost" size="icon" aria-label="Previous week">
			<ChevronLeft class="size-4" />
		</Button>

		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="ghost" title="Jump to date" aria-label="Jump to date">
						<span class="font-heading text-sm leading-none font-semibold">Jun 1-7, 2026</span>
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
					weekStartsOn={1}
					calendarLabel="Choose a date"
				/>

				<div class="flex justify-end border-t pt-3">
					<Button>Apply</Button>
				</div>
			</Popover.Content>
		</Popover.Root>

		<Button variant="ghost" size="icon" aria-label="Next week">
			<ChevronRight class="size-4" />
		</Button>
	</section>

	<Button variant="outline" class="h-auto">This Week</Button>
</nav>
