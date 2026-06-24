<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { formatDayLabel, getWeekDays } from '$lib/schedule/week';
	import type { CalendarDate } from '@internationalized/date';
	import { Clock3, Plus, RefreshCw } from '@lucide/svelte';

	type Shift = {
		id: number;
		location: string;
		time: string;
		hours: string;
		frequency: 'Weekly';
	};

	type ShiftDay = {
		id: string;
		label: string;
		shifts: Shift[];
	};

	let { weekStart }: { weekStart: CalendarDate } = $props();

	const demoShiftsByDay: Shift[][] = [
		[
			{
				id: 5,
				location: 'Northern Met',
				time: '6:00 AM - 3:00 PM',
				hours: '9 hours',
				frequency: 'Weekly'
			},
			{
				id: 6,
				location: 'Pine Valley',
				time: '5:00 PM - 12:00 AM',
				hours: '7 hours',
				frequency: 'Weekly'
			}
		],
		[],
		[],
		[
			{
				id: 1,
				location: 'Pine Valley',
				time: '7:00 PM - 12:00 AM',
				hours: '5 hours',
				frequency: 'Weekly'
			}
		],
		[
			{
				id: 2,
				location: 'Pine Valley',
				time: '4:30 PM - 12:00 AM',
				hours: '7.5 hours',
				frequency: 'Weekly'
			}
		],
		[
			{
				id: 3,
				location: 'Pine Valley',
				time: '4:30 PM - 12:00 AM',
				hours: '7.5 hours',
				frequency: 'Weekly'
			}
		],
		[
			{
				id: 4,
				location: 'Pine Valley',
				time: '8:00 PM - 12:00 AM',
				hours: '4 hours',
				frequency: 'Weekly'
			}
		]
	];

	const days: ShiftDay[] = $derived(
		getWeekDays(weekStart).map((date, index) => ({
			id: date.toString(),
			label: formatDayLabel(date),
			shifts: demoShiftsByDay[index] ?? []
		}))
	);

	const getDayHours = (day: ShiftDay) =>
		day.shifts.reduce((total, shift) => total + Number.parseFloat(shift.hours), 0);

	const formatHours = (hours: number) => `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;

	const formatShiftCount = (count: number) => `${count} ${count === 1 ? 'shift' : 'shifts'}`;
</script>

<section aria-label="Weekly shift grid" class="grid grid-cols-7 gap-3">
	{#each days as day (day.id)}
		<div aria-labelledby={day.id} class="min-w-0 rounded-lg border bg-card shadow-sm">
			<header class="border-b bg-muted/35 px-3 py-3">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<h2 id={day.id} class="truncate font-heading text-base font-bold">{day.label}</h2>
						<p class="mt-1 text-xs font-semibold text-muted-foreground">
							{formatHours(getDayHours(day))} · {formatShiftCount(day.shifts.length)}
						</p>
					</div>

					<Button
						variant="ghost"
						size="icon-sm"
						class="shrink-0"
						aria-label="Add shift for {day.label}"
					>
						<Plus class="size-4" />
					</Button>
				</div>
			</header>

			<div class="min-h-[23rem] space-y-2.5 p-2.5">
				{#if day.shifts.length === 0}
					<div
						class="grid min-h-32 place-items-center rounded-lg border border-dashed bg-muted/20 px-4 text-center"
					>
						<p class="text-xs font-semibold text-muted-foreground">No shifts scheduled</p>
					</div>
				{:else}
					{#each day.shifts as shift (shift.id)}
						<article
							class="rounded-lg border border-l-4 border-l-primary bg-background p-3 shadow-sm transition-colors duration-200 hover:bg-muted/35"
						>
							<header class="space-y-1.5">
								<h3 class="truncate text-sm font-bold">
									{shift.location}
								</h3>
								<p
									class="flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted-foreground uppercase"
								>
									<RefreshCw class="size-3" />
									{shift.frequency}
								</p>
							</header>

							<div class="mt-3 flex items-start gap-2 border-t pt-3">
								<Clock3 class="mt-0.5 size-3.5 shrink-0 text-primary" />
								<div class="min-w-0">
									<p class="text-xs leading-snug font-semibold">{shift.time}</p>
									<p class="mt-1 text-xs font-medium text-muted-foreground">
										{shift.hours} total
									</p>
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	{/each}
</section>
