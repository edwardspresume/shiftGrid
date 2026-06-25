<script lang="ts">
	import { logoutUser } from '$lib/auth/auth.remote';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { page } from '$app/state';
	import { CalendarDays, LogOut, UserRound } from '@lucide/svelte';

	const user = $derived(page.data.user);
</script>

<header class="border-b">
	<div class="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
		<div class="flex items-center gap-2">
			<div class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
				<CalendarDays class="size-5" />
			</div>

			<p class="font-heading text-2xl leading-none font-black">ShiftGrid</p>
		</div>

		<div class="flex items-center gap-2">
			<ThemeToggle />

			{#if user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button variant="outline" size="icon" aria-label="Open account menu">
							<UserRound class="size-4" />
						</Button>
					</DropdownMenu.Trigger>

					<DropdownMenu.Content align="end" sideOffset={6} class="w-56">
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
