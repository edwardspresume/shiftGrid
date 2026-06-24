<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { ScheduledShift } from '$lib/schedule/shifts.remote';
	import { formatDayLabel, getWeekDays } from '$lib/schedule/week';
	import type { CalendarDate } from '@internationalized/date';
	import { Clock3, MoreVertical, Pencil, Plus, RefreshCw, Trash2 } from '@lucide/svelte';

	type ShiftDay = {
		id: string;
		label: string;
		shifts: ScheduledShift[];
	};

	let {
		weekStart,
		shifts,
		onAddShift,
		onEditShift
	}: {
		weekStart: CalendarDate;
		shifts: ScheduledShift[];
		onAddShift: (shiftDate: string) => void;
		onEditShift: (shift: ScheduledShift) => void;
	} = $props();

	const days: ShiftDay[] = $derived(
		getWeekDays(weekStart).map((date) => ({
			id: date.toString(),
			label: formatDayLabel(date),
			shifts: shifts.filter((shift) => shift.shiftDate === date.toString())
		}))
	);

	const getDayHours = (day: ShiftDay) =>
		day.shifts.reduce((total, shift) => total + shift.hoursValue, 0);

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
						onclick={() => onAddShift(day.id)}
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
							class="rounded-lg border border-l-4 bg-background p-3 shadow-sm transition-colors duration-200 hover:bg-muted/35"
							style:border-left-color={shift.locationColor}
						>
							<header class="flex items-start justify-between gap-2">
								<div class="min-w-0 space-y-1.5">
									<h3 class="truncate text-sm font-bold">
										{shift.location}
									</h3>
									<p
										class="flex items-center gap-1.5 text-[0.7rem] font-semibold text-muted-foreground uppercase"
									>
										<RefreshCw class="size-3 shrink-0" />
										<span class="truncate">{shift.frequency}</span>
									</p>
								</div>

								<DropdownMenu.Root>
									<DropdownMenu.Trigger>
										{#snippet child({ props })}
											<Button
												{...props}
												variant="ghost"
												size="icon-xs"
												class="-mt-1 shrink-0"
												aria-label="Shift actions for {shift.location} {shift.time}"
											>
												<MoreVertical class="size-4" />
											</Button>
										{/snippet}
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item onSelect={() => onEditShift(shift)}>
											<Pencil class="size-4" />
											Edit
										</DropdownMenu.Item>
										<DropdownMenu.Separator />
										<DropdownMenu.Item disabled variant="destructive">
											<Trash2 class="size-4" />
											Delete
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
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
