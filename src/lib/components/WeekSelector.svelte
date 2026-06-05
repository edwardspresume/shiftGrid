<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover';
	import type { DateValue } from '@internationalized/date';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';

	let selectedDate: DateValue | undefined = $state();
</script>

<nav class="flex items-center gap-2">
	<section
		aria-label="Week selector"
		class="flex items-center gap-1.5 rounded-lg border bg-card/60 p-1"
	>
		<Button variant="outline" aria-label="Previous week">
			<ChevronLeft class="size-5" />
		</Button>

		<Popover.Root>
			<Popover.Trigger>
				{#snippet child({ props })}
					<Button {...props} variant="outline" title="Jump to date" aria-label="Jump to date">
						<span class="font-heading leading-none">Jun 1-7, 2026</span>
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

		<Button variant="outline" aria-label="Next week">
			<ChevronRight class="size-5" />
		</Button>
	</section>

	<Button variant="outline">This Week</Button>
</nav>
