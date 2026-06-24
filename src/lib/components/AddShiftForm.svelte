<script lang="ts" module>
	export type LocationOption = {
		id: number;
		name: string;
		color: string;
		address?: string;
	};
</script>

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { CalendarDays, Clock3, MapPin, NotebookPen, Repeat2, Utensils } from '@lucide/svelte';

	let {
		locations,
		initialDate,
		onCancel
	}: {
		locations: LocationOption[];
		initialDate: string;
		onCancel: () => void;
	} = $props();

	let startTime = $state('09:00');
	let endTime = $state('17:00');
	let breakMinutes = $state('30');
	let recurrenceFrequency = $state('none');
	let selectedLocationId = $state('');

	const fieldClass =
		'w-full rounded-lg border-input bg-background text-sm shadow-sm transition-colors focus:border-ring focus:ring-ring/50';
	const labelClass = 'text-xs font-semibold text-muted-foreground uppercase';

	function getShiftMinutes() {
		const [startHour, startMinute] = startTime.split(':').map(Number);
		const [endHour, endMinute] = endTime.split(':').map(Number);
		const parsedBreak = Number.parseInt(breakMinutes, 10) || 0;

		let startTotal = startHour * 60 + startMinute;
		let endTotal = endHour * 60 + endMinute;

		if (endTotal <= startTotal) {
			endTotal += 24 * 60;
		}

		return Math.max(endTotal - startTotal - parsedBreak, 0);
	}

	const totalHours = $derived(getShiftMinutes() / 60);
	const formattedHours = $derived(
		`${Number.isInteger(totalHours) ? totalHours : totalHours.toFixed(1)}h`
	);
	const activeLocationId = $derived(selectedLocationId || (locations[0]?.id.toString() ?? ''));
	const selectedLocation = $derived(
		locations.find((location) => location.id.toString() === activeLocationId) ?? locations[0]
	);

	function preventPlaceholderSubmit(event: SubmitEvent) {
		event.preventDefault();
	}

	function updateSelectedLocation(event: Event) {
		selectedLocationId = (event.currentTarget as HTMLSelectElement).value;
	}
</script>

<form onsubmit={preventPlaceholderSubmit}>
	<header class="border-b px-4 py-4 pr-12">
		<DialogHeader>
			<DialogTitle>Add shift</DialogTitle>
			<DialogDescription class="sr-only">
				Create a scheduled shift with location, date, time, break, recurrence, and notes.
			</DialogDescription>
			<p class="text-sm font-medium text-muted-foreground">{formattedHours} total</p>
		</DialogHeader>
	</header>

	<div class="grid max-h-[calc(100dvh-12rem)] gap-5 overflow-y-auto p-4 lg:grid-cols-[1fr_18rem]">
		<div class="grid gap-4 md:grid-cols-2">
			<label class="space-y-2 md:col-span-2">
				<span class={labelClass}>Location</span>
				<span class="relative block">
					<MapPin
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						class={`${fieldClass} pl-9`}
						name="locationId"
						value={activeLocationId}
						onchange={updateSelectedLocation}
						required
					>
						{#each locations as location (location.id)}
							<option value={location.id}>{location.name}</option>
						{/each}
					</select>
				</span>
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Date</span>
				<span class="relative block">
					<CalendarDays
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						class={`${fieldClass} pl-9`}
						name="shiftDate"
						type="date"
						value={initialDate}
						required
					/>
				</span>
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Break</span>
				<span class="relative block">
					<Utensils
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select bind:value={breakMinutes} class={`${fieldClass} pl-9`} name="breakMinutes">
						<option value="0">No break</option>
						<option value="15">15 minutes</option>
						<option value="30">30 minutes</option>
						<option value="45">45 minutes</option>
						<option value="60">60 minutes</option>
					</select>
				</span>
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Start time</span>
				<span class="relative block">
					<Clock3
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						bind:value={startTime}
						class={`${fieldClass} pl-9`}
						name="startTime"
						type="time"
						required
					/>
				</span>
			</label>

			<label class="space-y-2">
				<span class={labelClass}>End time</span>
				<span class="relative block">
					<Clock3
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<input
						bind:value={endTime}
						class={`${fieldClass} pl-9`}
						name="endTime"
						type="time"
						required
					/>
				</span>
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Recurrence</span>
				<span class="relative block">
					<Repeat2
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
					/>
					<select
						bind:value={recurrenceFrequency}
						class={`${fieldClass} pl-9`}
						name="recurrenceFrequency"
					>
						<option value="none">None</option>
						<option value="weekly">Weekly</option>
						<option value="biweekly">Biweekly</option>
					</select>
				</span>
			</label>

			<label class="space-y-2">
				<span class={labelClass}>Repeat until</span>
				<input
					class={fieldClass}
					disabled={recurrenceFrequency === 'none'}
					name="recurrenceUntil"
					type="date"
				/>
			</label>
		</div>

		<aside class="space-y-4 rounded-lg border bg-muted/20 p-4">
			<div class="space-y-2">
				<p class={labelClass}>Preview</p>
				<div
					class="rounded-lg border border-l-4 bg-background p-3 shadow-sm"
					style:border-left-color={selectedLocation?.color}
				>
					<p class="text-sm font-bold">{selectedLocation?.name ?? 'Location'}</p>
					{#if selectedLocation?.address}
						<p class="mt-1 truncate text-xs font-medium text-muted-foreground">
							{selectedLocation.address}
						</p>
					{/if}
					<p class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
						<Clock3 class="size-3.5" />
						{startTime} - {endTime}
					</p>
					<p class="mt-1 text-xs font-medium text-muted-foreground">{formattedHours} total</p>
				</div>
			</div>

			<label class="block space-y-2">
				<span class={labelClass}>Notes</span>
				<span class="relative block">
					<NotebookPen
						class="pointer-events-none absolute top-3 left-3 size-4 text-muted-foreground"
					/>
					<textarea
						class={`${fieldClass} min-h-32 resize-none pl-9`}
						name="notes"
						placeholder="Coverage, handoff, or staffing notes"
					></textarea>
				</span>
			</label>
		</aside>
	</div>

	<DialogFooter class="mx-0 mb-0 rounded-none border-t px-4 py-4">
		<Button variant="outline" onclick={onCancel}>Cancel</Button>
		<Button type="submit">Add shift</Button>
	</DialogFooter>
</form>
