<script lang="ts">
	import { getCurrentUser } from '$lib/auth/auth.remote';
	import AddTeamMemberForm from '$lib/components/AddTeamMemberForm.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Dialog, DialogContent } from '$lib/components/ui/dialog';
	import { getTeamMembers } from '$lib/schedule/shifts.remote';
	import { Plus, UserRound } from '@lucide/svelte';

	const currentUser = $derived(await getCurrentUser());
	const teamMembers = $derived(await getTeamMembers());
	const canManageTeamMembers = $derived(Boolean(currentUser?.capabilities.canManageTeamMembers));
	let isAddTeamMemberFormOpen = $state(false);

	function openAddTeamMemberForm() {
		isAddTeamMemberFormOpen = true;
	}

	function closeAddTeamMemberForm() {
		isAddTeamMemberFormOpen = false;
	}
</script>

<SiteHeader />

<main class="mx-auto max-w-5xl px-6 py-6">
	<header
		class="mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between"
	>
		<div>
			<p class="font-heading text-2xl leading-none font-black tracking-normal">Team members</p>
			<p class="mt-2 text-sm font-medium text-muted-foreground">
				People who can be assigned to shifts on the shared schedule.
			</p>
		</div>

		{#if canManageTeamMembers}
			<Button type="button" class="gap-2" onclick={openAddTeamMemberForm}>
				<Plus class="size-4" />
				Add team member
			</Button>
		{/if}
	</header>

	<Dialog bind:open={isAddTeamMemberFormOpen}>
		<DialogContent class="gap-0 overflow-hidden p-0 sm:max-w-md">
			<AddTeamMemberForm onCancel={closeAddTeamMemberForm} />
		</DialogContent>
	</Dialog>

	<section aria-label="Team member list" class="rounded-lg border bg-card shadow-sm">
		{#if teamMembers.length === 0}
			<div class="grid min-h-56 place-items-center px-6 text-center">
				<div>
					<div
						class="mx-auto grid size-12 place-items-center rounded-lg bg-muted text-muted-foreground"
					>
						<UserRound class="size-5" />
					</div>
					<p class="mt-4 text-sm font-semibold">No team members yet</p>
					<p class="mt-1 text-sm text-muted-foreground">
						Add team members before creating assigned shifts.
					</p>
				</div>
			</div>
		{:else}
			<div class="divide-y">
				{#each teamMembers as teamMember (teamMember.id)}
					<article class="flex min-h-16 items-center gap-3 px-4 py-3">
						<span
							class="size-4 rounded-full border shadow-sm"
							style:background-color={teamMember.color}
						></span>
						<div class="min-w-0">
							<p class="truncate text-sm font-bold">{teamMember.name}</p>
							<p class="mt-1 text-xs font-medium text-muted-foreground">{teamMember.color}</p>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
</main>
