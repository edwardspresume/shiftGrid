<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import { getLocations, addLocation } from '$lib/schedule/shifts.remote';
	import { locationColorValues } from '$lib/schedule/shiftValidation';
	import { MapPin, Palette } from '@lucide/svelte';

	let {
		onCancel
	}: {
		onCancel: () => void;
	} = $props();

	const defaultFormValues = {
		name: '',
		color: locationColorValues[0]
	};

	const fieldClass =
		'w-full rounded-lg border-input bg-background text-sm shadow-sm transition-colors focus:border-ring focus:ring-ring/50 disabled:cursor-not-allowed disabled:bg-muted/60 disabled:text-muted-foreground disabled:opacity-70';
	const labelClass = 'text-xs font-semibold text-muted-foreground uppercase';
	const issueClass = 'text-xs font-medium text-destructive';

	function resetForm(element: HTMLFormElement) {
		element.reset();
		addLocation.fields.set(defaultFormValues);
	}
</script>

<form
	{...addLocation.enhance(async (form) => {
		const submitted = await form.submit().updates(getLocations());
		if (!submitted) return;

		resetForm(form.element);
		onCancel();
	})}
>
	<DialogHeader class="border-b p-4">
		<DialogTitle>Add location</DialogTitle>
		<DialogDescription class="sr-only">
			Create a location that can be selected when scheduling shifts.
		</DialogDescription>
	</DialogHeader>

	<div class="grid gap-4 p-4">
		<label class="space-y-2">
			<span class={labelClass}>Name</span>
			<span class="relative block">
				<MapPin
					class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					{...addLocation.fields.name.as('text')}
					class={`${fieldClass} pl-9`}
					placeholder="Downtown clinic"
					autocomplete="off"
					required
				/>
			</span>
			{#each addLocation.fields.name.issues() ?? [] as issue (issue.message)}
				<p class={issueClass}>{issue.message}</p>
			{/each}
		</label>

		<fieldset class="space-y-2">
			<legend class={labelClass}>Color</legend>
			<div class="grid grid-cols-7 gap-2">
				{#each locationColorValues as color (color)}
					<label
						class="grid size-10 place-items-center rounded-lg border bg-background transition-colors has-checked:border-primary has-checked:ring-2 has-checked:ring-primary/35"
						aria-label="Location color {color}"
					>
						<input
							{...addLocation.fields.color.as('radio', color)}
							class="sr-only"
							checked={color === defaultFormValues.color}
						/>
						<span class="size-6 rounded-full border shadow-sm" style:background-color={color}
						></span>
					</label>
				{/each}
			</div>
			<p class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
				<Palette class="size-3.5" />
				Used as the accent color on shift cards.
			</p>
			{#each addLocation.fields.color.issues() ?? [] as issue (issue.message)}
				<p class={issueClass}>{issue.message}</p>
			{/each}
		</fieldset>
	</div>

	<DialogFooter class="mx-0 mb-0 rounded-none border-t px-4 py-4">
		<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
		<Button type="submit" disabled={addLocation.pending > 0}>
			{addLocation.pending > 0 ? 'Adding...' : 'Add location'}
		</Button>
	</DialogFooter>
</form>
