<script lang="ts">
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import { CalendarDays } from '@lucide/svelte';
</script>

<header class="border-b">
	<div class="container mx-auto flex items-center justify-between gap-5 py-2">
		<div class="flex items-center gap-3">
			<div class="flex size-8 items-center justify-center rounded-lg bg-[#006698] text-white">
				<CalendarDays class="size-4" />
			</div>

			<p class="text-3xl font-black leading-none">ShiftGrid</p>
		</div>

		<ThemeToggle />
	</div>
</header>
