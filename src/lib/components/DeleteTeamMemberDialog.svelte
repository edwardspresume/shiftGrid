<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import {
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';
	import {
		deleteTeamMember,
		getTeamMembers,
		type TeamMemberOption
	} from '$lib/schedule/shifts.remote';
	import { Trash2 } from '@lucide/svelte';

	let {
		teamMember,
		onCancel
	}: {
		teamMember: TeamMemberOption;
		onCancel: () => void;
	} = $props();

	const hasAssignedShifts = $derived(teamMember.shiftCount > 0);
	const assignedShiftText = $derived(
		`${teamMember.shiftCount} ${teamMember.shiftCount === 1 ? 'shift' : 'shifts'}`
	);
</script>

<form
	{...deleteTeamMember.enhance(async (form) => {
		const submitted = await form.submit().updates(getTeamMembers());
		if (!submitted) return;

		form.element.reset();
		onCancel();
	})}
>
	<input {...deleteTeamMember.fields.id.as('hidden', teamMember.id.toString())} />

	<DialogHeader class="border-b p-4">
		<DialogTitle>Delete team member</DialogTitle>
		<DialogDescription class="sr-only">
			Delete a team member when they are not assigned to shifts.
		</DialogDescription>
	</DialogHeader>

	<div class="space-y-4 p-4">
		<div
			class="rounded-lg border border-l-4 bg-background p-3"
			style:border-left-color={teamMember.color}
		>
			<p class="text-sm font-bold">{teamMember.name}</p>
			<p class="mt-1 text-xs font-medium text-muted-foreground">
				{hasAssignedShifts ? `Assigned to ${assignedShiftText}` : 'Not assigned to any shifts'}
			</p>
		</div>

		{#if hasAssignedShifts}
			<p class="text-sm text-muted-foreground">
				This team member cannot be deleted while shifts still reference them. Edit their name or
				color instead, or remove their shifts first.
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">
				This will remove the team member from the shared assignment list.
			</p>
		{/if}

		{#each deleteTeamMember.fields.id.issues() ?? [] as issue (issue.message)}
			<p class="text-xs font-medium text-destructive">{issue.message}</p>
		{/each}
	</div>

	<DialogFooter class="mx-0 mb-0 rounded-none border-t px-4 py-4">
		<Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
		<Button
			type="submit"
			variant="destructive"
			disabled={hasAssignedShifts || deleteTeamMember.pending > 0}
		>
			<Trash2 class="size-4" />
			{deleteTeamMember.pending > 0 ? 'Deleting...' : 'Delete team member'}
		</Button>
	</DialogFooter>
</form>
