<script lang="ts">
	import { Button } from '$lib/components/ui/button';
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

	const days: ShiftDay[] = [
		{
			id: 'mon-jun-1',
			label: 'Mon, Jun 1',
			shifts: []
		},
		{
			id: 'tue-jun-2',
			label: 'Tue, Jun 2',
			shifts: []
		},
		{
			id: 'wed-jun-3',
			label: 'Wed, Jun 3',
			shifts: [
				{
					id: 1,
					location: 'Pine Valley',
					time: '7:00 PM - 12:00 AM',
					hours: '5 hours',
					frequency: 'Weekly'
				}
			]
		},
		{
			id: 'thu-jun-4',
			label: 'Thu, Jun 4',
			shifts: [
				{
					id: 2,
					location: 'Pine Valley',
					time: '4:30 PM - 12:00 AM',
					hours: '7.5 hours',
					frequency: 'Weekly'
				}
			]
		},
		{
			id: 'fri-jun-5',
			label: 'Fri, Jun 5',
			shifts: [
				{
					id: 3,
					location: 'Pine Valley',
					time: '4:30 PM - 12:00 AM',
					hours: '7.5 hours',
					frequency: 'Weekly'
				}
			]
		},
		{
			id: 'sat-jun-6',
			label: 'Sat, Jun 6',
			shifts: [
				{
					id: 4,
					location: 'Pine Valley',
					time: '8:00 PM - 12:00 AM',
					hours: '4 hours',
					frequency: 'Weekly'
				}
			]
		},
		{
			id: 'sun-jun-7',
			label: 'Sun, Jun 7',
			shifts: [
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
			]
		}
	];
</script>

<section aria-label="Weekly shift grid" class="flex flex-wrap gap-4">
	{#each days as day (day.id)}
		<div aria-labelledby={day.id} class="rounded-xl border shadow-sm">
			<header class="flex items-center justify-between gap-3 border-b px-3 py-2.5">
				<h2 id={day.id} class="font-heading text-lg font-bold">{day.label}</h2>

				<Button
					size="icon"
					class="size-9 rounded-full bg-blue-600 text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
					aria-label="Add shift for {day.label}"
				>
					<Plus class="size-5 stroke-[2.5]" />
				</Button>
			</header>

			<div class="space-y-3 p-3">
				{#if day.shifts.length === 0}
					<div
						class="grid min-h-40 place-items-center rounded-xl border border-dashed bg-muted/20 px-5 text-center"
					>
						<p class="text-sm font-medium text-muted-foreground">No shifts scheduled</p>
					</div>
				{:else}
					{#each day.shifts as shift (shift.id)}
						<article
							class="space-y-3 rounded-xl bg-blue-200 p-3 shadow-sm transition-shadow duration-200 hover:shadow-lg dark:bg-card"
						>
							<header>
								<h3 class="text-lg font-bold text-black dark:text-gray-100">
									{shift.location}
								</h3>
								<p
									class="mt-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground"
								>
									<RefreshCw class="size-3.5" />
									{shift.frequency}
								</p>
							</header>

							<div class="rounded-lg border bg-background/55 p-3 dark:bg-background/35">
								<div class="flex items-start gap-2.5">
									<Clock3 class="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
									<div class="min-w-0">
										<p class="text-sm font-semibold">{shift.time}</p>
										<p class="mt-1 text-xs font-medium text-muted-foreground">
											{shift.hours} total
										</p>
									</div>
								</div>
							</div>
						</article>
					{/each}
				{/if}
			</div>
		</div>
	{/each}
</section>
