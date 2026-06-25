<script lang="ts">
	import { getCurrentUser, logoutUser } from '$lib/auth/auth.remote';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { CalendarDays, LogOut, UserRound, UsersRound } from '@lucide/svelte';

	const user = $derived(await getCurrentUser());
	const canManageTeamMembers = $derived(Boolean(user?.capabilities.canManageTeamMembers));
</script>

<header class="border-b">
	<div class="mx-auto grid max-w-[1600px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 py-3">
		<div class="flex min-w-0 items-center gap-2 justify-self-start">
			<div class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
				<CalendarDays class="size-5" />
			</div>

			<p class="font-heading text-2xl leading-none font-black">ShiftGrid</p>
		</div>

		{#if user}
			<nav
				aria-label="Primary navigation"
				class="hidden items-center gap-1 justify-self-center sm:flex"
			>
				<Button
					href="/"
					variant={page.url.pathname === '/' ? 'secondary' : 'ghost'}
					size="sm"
					class="gap-1.5"
				>
					<CalendarDays class="size-3.5" />
					Schedule
				</Button>
				{#if canManageTeamMembers}
					<Button
						href="/team-members"
						variant={page.url.pathname === '/team-members' ? 'secondary' : 'ghost'}
						size="sm"
						class="gap-1.5"
					>
						<UsersRound class="size-3.5" />
						Team members
					</Button>
				{/if}
			</nav>
		{:else}
			<div></div>
		{/if}

		<div class="flex items-center gap-2 justify-self-end">
			<ThemeToggle />

			{#if user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="outline" size="icon" aria-label="Open account menu">
							<UserRound class="size-4" />
						</Button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Content align="end" sideOffset={6} class="w-56">
						<DropdownMenu.Item class="sm:hidden">
							<a href={resolve('/')} class="flex w-full items-center gap-2">
								<CalendarDays class="size-4" />
								Schedule
							</a>
						</DropdownMenu.Item>
						{#if canManageTeamMembers}
							<DropdownMenu.Item class="sm:hidden">
								<a href={resolve('/team-members')} class="flex w-full items-center gap-2">
									<UsersRound class="size-4" />
									Team members
								</a>
							</DropdownMenu.Item>
						{/if}
						<DropdownMenu.Separator class="sm:hidden" />

						<div class="px-2 py-1.5">
							<p class="truncate text-sm font-medium">{user.name}</p>
							<p class="mt-1 truncate text-xs text-muted-foreground">{user.email}</p>
						</div>

						<DropdownMenu.Separator />

						<DropdownMenu.Item>
							<form class="w-full" {...logoutUser}>
								<button type="submit" class="flex w-full items-center gap-2 text-left">
									<LogOut class="size-4" />
									Sign out
								</button>
							</form>
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	</div>
</header>
