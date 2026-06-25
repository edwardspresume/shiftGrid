<script lang="ts">
	import AddShiftForm from '$lib/components/AddShiftForm.svelte';
	import DeleteShiftDialog from '$lib/components/DeleteShiftDialog.svelte';
	import EditShiftForm from '$lib/components/EditShiftForm.svelte';
	import ShiftWeekGrid from '$lib/components/ShiftWeekGrid.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { Dialog, DialogContent } from '$lib/components/ui/dialog';
	import WeekSelector from '$lib/components/WeekSelector.svelte';
	import { getCurrentUser } from '$lib/auth/auth.remote';
	import { getSchedule, getTeamMembers, type ScheduledShift } from '$lib/schedule/shifts.remote';
	import {
		DEFAULT_WEEK_STARTS_ON,
		getCurrentWeekStart,
		getWeekStart,
		type WeekStartsOn
	} from '$lib/schedule/week';
	import { parseDate, type CalendarDate, type DateValue } from '@internationalized/date';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	const weekStartsOn: WeekStartsOn = DEFAULT_WEEK_STARTS_ON;
	const currentUser = $derived(await getCurrentUser());
	const schedule = $derived(await getSchedule(page.url.searchParams.get('week')));
	const teamMembers = $derived(await getTeamMembers());
	const weekStart: CalendarDate = $derived(parseDate(schedule.weekStart));
	const canManageShifts = $derived(Boolean(currentUser?.capabilities.canManageShifts));
	let isAddShiftFormOpen = $state(false);
	let isEditShiftFormOpen = $state(false);
	let isDeleteShiftDialogOpen = $state(false);
	let selectedShiftDate = $state('');
	let selectedShift = $state<ScheduledShift | null>(null);
	let selectedDeleteShift = $state<ScheduledShift | null>(null);

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

	function openDeleteShiftDialog(shift: ScheduledShift) {
		selectedDeleteShift = shift;
		isDeleteShiftDialogOpen = true;
	}

	function closeDeleteShiftDialog() {
		isDeleteShiftDialogOpen = false;
	}
</script>

<SiteHeader />

<main class="mx-auto max-w-[1600px] px-6 py-6">
	<header class="mb-6 border-b pb-6">
		<div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
		</div>
	</header>

	<Dialog bind:open={isAddShiftFormOpen}>
		<DialogContent
			class="max-h-[min(44rem,calc(100dvh-2rem))] max-w-5xl gap-0 overflow-hidden p-0 sm:max-w-5xl"
		>
			<AddShiftForm
				{teamMembers}
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
					{teamMembers}
					shift={selectedShift}
					visibleWeekStart={weekStart.toString()}
					currentWeekQuery={page.url.searchParams.get('week')}
					onCancel={closeEditShiftForm}
				/>
			{/if}
		</DialogContent>
	</Dialog>

	<Dialog bind:open={isDeleteShiftDialogOpen}>
		<DialogContent class="gap-0 overflow-hidden p-0 sm:max-w-lg">
			{#if selectedDeleteShift}
				<DeleteShiftDialog
					shift={selectedDeleteShift}
					currentWeekQuery={page.url.searchParams.get('week')}
					onCancel={closeDeleteShiftDialog}
				/>
			{/if}
		</DialogContent>
	</Dialog>

	<ShiftWeekGrid
		{weekStart}
		shifts={schedule.shifts}
		{canManageShifts}
		onAddShift={openAddShiftForm}
		onEditShift={openEditShiftForm}
		onDeleteShift={openDeleteShiftDialog}
	/>
</main>
