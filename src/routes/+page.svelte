<script lang="ts">
	import AddShiftForm from '$lib/components/AddShiftForm.svelte';
	import ShiftWeekGrid from '$lib/components/ShiftWeekGrid.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import WeekSelector from '$lib/components/WeekSelector.svelte';
	import {
		DEFAULT_WEEK_STARTS_ON,
		getCurrentWeekStart,
		getWeekStart,
		type WeekStartsOn
	} from '$lib/schedule/week';
	import type { DateValue } from '@internationalized/date';
	import { BriefcaseBusiness, Clock3, MapPin, Plus } from '@lucide/svelte';

	const weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON;
	let weekStart = $state(getCurrentWeekStart(weekStartsOn));
	let isAddShiftFormOpen = $state(false);

	const demoLocations = [
		{
			id: 1,
			name: 'Northern Met',
			color: '#16a34a',
			address: '110 Northern Met Plaza'
		},
		{
			id: 2,
			name: 'Pine Valley',
			color: '#2563eb',
			address: '42 Pine Valley Road'
		}
	];

	const summaryStats = [
		{
			label: 'Total hours',
			value: '40h',
			icon: Clock3
		},
		{
			label: 'Scheduled shifts',
			value: '6',
			icon: BriefcaseBusiness
		},
		{
			label: 'Locations',
			value: '2',
			icon: MapPin
		}
	];

	function goToPreviousWeek() {
		weekStart = weekStart.subtract({ days: 7 });
	}

	function goToNextWeek() {
		weekStart = weekStart.add({ days: 7 });
	}

	function goToThisWeek() {
		weekStart = getCurrentWeekStart(weekStartsOn);
	}

	function applySelectedDate(date: DateValue) {
		weekStart = getWeekStart(date, weekStartsOn);
	}

	function openAddShiftForm() {
		isAddShiftFormOpen = true;
	}

	function closeAddShiftForm() {
		isAddShiftFormOpen = false;
	}
</script>

<SiteHeader />

<main class="mx-auto max-w-[1600px] px-6 py-6">
	<header class="mb-6 border-b pb-6">
		<div class="flex items-end justify-between gap-6">
			<div class="space-y-4">
				<p class="font-heading text-2xl leading-none font-black tracking-normal">Weekly schedule</p>

				<WeekSelector
					{weekStart}
					{weekStartsOn}
					onPreviousWeek={goToPreviousWeek}
					onNextWeek={goToNextWeek}
					onThisWeek={goToThisWeek}
					onApplyDate={applySelectedDate}
				/>
			</div>

			<Button size="lg" aria-expanded={isAddShiftFormOpen} onclick={openAddShiftForm}>
				<Plus class="size-4" />
				Add Shift
			</Button>
		</div>

		<section aria-label="Weekly summary" class="mt-5 grid grid-cols-3 gap-3">
			{#each summaryStats as stat (stat.label)}
				{@const Icon = stat.icon}
				<div class="flex items-center gap-3 border-l px-4 py-1">
					<div class="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
						<Icon class="size-4" />
					</div>

					<div>
						<p class="text-xs font-semibold text-muted-foreground uppercase">
							{stat.label}
						</p>
						<p class="mt-0.5 font-heading text-2xl leading-none font-black">{stat.value}</p>
					</div>
				</div>
			{/each}
		</section>
	</header>

	{#if isAddShiftFormOpen}
		<AddShiftForm
			locations={demoLocations}
			initialDate={weekStart.toString()}
			onCancel={closeAddShiftForm}
		/>
	{/if}

	<ShiftWeekGrid {weekStart} />
</main>
