<script lang="ts">
	import AddShiftForm from '$lib/components/AddShiftForm.svelte';
	import EditShiftForm from '$lib/components/EditShiftForm.svelte';
	import ShiftWeekGrid from '$lib/components/ShiftWeekGrid.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { Dialog, DialogContent } from '$lib/components/ui/dialog';
	import WeekSelector from '$lib/components/WeekSelector.svelte';
	import { getLocations, getSchedule, type ScheduledShift } from '$lib/schedule/shifts.remote';
	import {
		DEFAULT_WEEK_STARTS_ON,
		getCurrentWeekStart,
		getWeekStart,
		type WeekStartsOn
	} from '$lib/schedule/week';
	import { parseDate, type CalendarDate, type DateValue } from '@internationalized/date';
	import { BriefcaseBusiness, Clock3, MapPin } from '@lucide/svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON;
	const schedule = $derived(await getSchedule(page.url.searchParams.get('week')));
	const locations = $derived(await getLocations());
	const weekStart: CalendarDate = $derived(parseDate(schedule.weekStart));
	let isAddShiftFormOpen = $state(false);
	let isEditShiftFormOpen = $state(false);
	let selectedShiftDate = $state('');
	let selectedShift = $state<ScheduledShift | null>(null);

	const summaryStats = $derived([
		{
			label: 'Total hours',
			value: `${Number.isInteger(schedule.summary.totalHours) ? schedule.summary.totalHours : schedule.summary.totalHours.toFixed(1)}h`,
			icon: Clock3
		},
		{
			label: 'Scheduled shifts',
			value: schedule.summary.scheduledShifts.toString(),
			icon: BriefcaseBusiness
		},
		{
			label: 'Locations',
			value: locations.length.toString(),
			icon: MapPin
		}
	]);

	function applyWeekStart(date: CalendarDate) {
		goto(resolve(`/?week=${date.toString()}`), {
			keepFocus: true,
			noScroll: true
		});
	}

	function goToPreviousWeek() {
		applyWeekStart(weekStart.subtract({ days: 7 }));
	}

	function goToNextWeek() {
		applyWeekStart(weekStart.add({ days: 7 }));
	}

	function goToThisWeek() {
		applyWeekStart(getCurrentWeekStart(weekStartsOn));
	}

	function applySelectedDate(date: DateValue) {
		applyWeekStart(getWeekStart(date, weekStartsOn));
	}

	function openAddShiftForm(shiftDate: string) {
		selectedShiftDate = shiftDate;
		isAddShiftFormOpen = true;
	}

	function closeAddShiftForm() {
		isAddShiftFormOpen = false;
	}

	function openEditShiftForm(shift: ScheduledShift) {
		selectedShift = shift;
		isEditShiftFormOpen = true;
	}

	function closeEditShiftForm() {
		isEditShiftFormOpen = false;
	}
</script>

<SiteHeader />

<main class="mx-auto max-w-[1600px] px-6 py-6">
	<header class="mb-6 border-b pb-6">
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

	<Dialog bind:open={isAddShiftFormOpen}>
		<DialogContent
			class="max-h-[min(44rem,calc(100dvh-2rem))] max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl"
		>
			<AddShiftForm
				{locations}
				initialDate={selectedShiftDate || weekStart.toString()}
				visibleWeekStart={weekStart.toString()}
				currentWeekQuery={page.url.searchParams.get('week')}
				onCancel={closeAddShiftForm}
			/>
		</DialogContent>
	</Dialog>

	<Dialog bind:open={isEditShiftFormOpen}>
		<DialogContent
			class="max-h-[min(44rem,calc(100dvh-2rem))] max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl"
		>
			{#if selectedShift}
				<EditShiftForm
					{locations}
					shift={selectedShift}
					visibleWeekStart={weekStart.toString()}
					currentWeekQuery={page.url.searchParams.get('week')}
					onCancel={closeEditShiftForm}
				/>
			{/if}
		</DialogContent>
	</Dialog>

	<ShiftWeekGrid
		{weekStart}
		shifts={schedule.shifts}
		onAddShift={openAddShiftForm}
		onEditShift={openEditShiftForm}
	/>
</main>
