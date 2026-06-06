<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CalendarDays, Clock3, Plus, RefreshCw } from '@lucide/svelte';

	type Shift = {
		id: number;
		name: string;
		time: string;
		hours: string;
		frequency: 'Weekly' | 'One time';
		notes: string;
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
			shifts: [
				{
					id: 1,
					name: 'Avery Edwards',
					time: '9:00 AM - 5:00 PM',
					hours: '8 hours',
					frequency: 'Weekly',
					notes: 'Front desk coverage and end-of-day handoff.'
				},
				{
					id: 2,
					name: 'Kevin Brooks',
					time: '5:00 PM - 10:00 PM',
					hours: '5 hours',
					frequency: 'One time',
					notes: 'Covering the evening shift.'
				}
			]
		},
		{
			id: 'tue-jun-2',
			label: 'Tue, Jun 2',
			shifts: [
				{
					id: 3,
					name: 'James Carter',
					time: '7:00 AM - 3:00 PM',
					hours: '8 hours',
					frequency: 'Weekly',
					notes: 'Opening duties and morning inventory.'
				}
			]
		},
		{
			id: 'wed-jun-3',
			label: 'Wed, Jun 3',
			shifts: [
				{
					id: 4,
					name: 'Maya Patel',
					time: '10:00 AM - 6:00 PM',
					hours: '8 hours',
					frequency: 'Weekly',
					notes: 'Client support and afternoon closeout.'
				},
				{
					id: 5,
					name: 'Noah Williams',
					time: '6:00 PM - 11:00 PM',
					hours: '5 hours',
					frequency: 'One time',
					notes: 'Evening coverage for Maya.'
				}
			]
		},
		{
			id: 'thu-jun-4',
			label: 'Thu, Jun 4',
			shifts: [
				{
					id: 6,
					name: 'Sofia Martinez',
					time: '8:00 AM - 4:00 PM',
					hours: '8 hours',
					frequency: 'Weekly',
					notes: 'Training a new team member.'
				}
			]
		},
		{
			id: 'fri-jun-5',
			label: 'Fri, Jun 5',
			shifts: [
				{
					id: 7,
					name: 'Liam Johnson',
					time: '9:00 AM - 5:00 PM',
					hours: '8 hours',
					frequency: 'Weekly',
					notes: 'Weekly reporting and floor coverage.'
				},
				{
					id: 8,
					name: 'Emma Davis',
					time: '3:00 PM - 9:00 PM',
					hours: '6 hours',
					frequency: 'One time',
					notes: 'Extra support for the Friday rush.'
				}
			]
		},
		{
			id: 'sat-jun-6',
			label: 'Sat, Jun 6',
			shifts: [
				{
					id: 9,
					name: 'Oliver Wilson',
					time: '10:00 AM - 4:00 PM',
					hours: '6 hours',
					frequency: 'Weekly',
					notes: 'Weekend opening and customer support.'
				}
			]
		},
		{
			id: 'sun-jun-7',
			label: 'Sun, Jun 7',
			shifts: []
		}
	];
</script>

<section aria-label="Weekly shift grid">
	<div class="flex flex-wrap justify-center gap-4 px-3 pt-5 pb-6">
		{#each days as day (day.id)}
			<section
				aria-labelledby={day.id}
				class="w-[19.5rem] rounded-xl border bg-background shadow-sm"
			>
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
									<h3 class="text-lg font-bold text-black dark:text-gray-100">{shift.name}</h3>
									<p
										class="mt-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground"
									>
										{#if shift.frequency === 'Weekly'}
											<RefreshCw class="size-3.5" />
										{:else}
											<CalendarDays class="size-3.5" />
										{/if}
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

								<div class="border-t pt-3">
									<p
										class="text-[0.68rem] font-bold tracking-[0.14em] text-muted-foreground uppercase"
									>
										Notes
									</p>
									<p class="mt-1 text-sm leading-relaxed text-foreground/75">{shift.notes}</p>
								</div>
							</article>
						{/each}
					{/if}
				</div>
			</section>
		{/each}
	</div>
</section>
