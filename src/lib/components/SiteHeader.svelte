<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import { CalendarDays } from '@lucide/svelte';
</script>

<header class="border-b">
	<div class="container mx-auto flex items-center justify-between py-2">
		<div class="flex items-center gap-3">
			<div class="grid size-8 place-items-center rounded-lg bg-blue-600 text-white">
				<CalendarDays class="size-4" />
			</div>

			<p class="text-3xl font-black leading-none">ShiftGrid</p>
		</div>

		<ThemeToggle />
	</div>
</header>
