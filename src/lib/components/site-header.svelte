<script lang="ts">
	import { CalendarDays } from '@lucide/svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
</script>

<header class="border-b border-black/10 bg-white text-black dark:border-white/10 dark:bg-[#242426] dark:text-white">
	<div class="container flex h-[120px] items-center justify-between gap-5 px-5">
		<div class="flex items-center gap-5">
			<div class="flex size-[60px] items-center justify-center rounded-[18px] bg-[#006698] text-white">
				<CalendarDays class="size-8 stroke-[2.4]" />
			</div>

			<p class="text-3xl font-black leading-none">ShiftGrid</p>
		</div>

		<ThemeToggle />
	</div>
</header>
