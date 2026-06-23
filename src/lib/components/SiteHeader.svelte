<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { CalendarDays } from '@lucide/svelte';
</script>

<header class="border-b">
	<div class="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3">
		<div class="flex items-center gap-2">
			<div class="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
				<CalendarDays class="size-5" />
			</div>

			<p class="font-heading text-2xl leading-none font-black">ShiftGrid</p>
		</div>

		<ThemeToggle />
	</div>
</header>
