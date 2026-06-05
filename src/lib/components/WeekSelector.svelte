<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
</script>

<nav class="flex items-center gap-2">
	<section
		aria-label="Week selector"
		class="flex items-center gap-1 rounded-lg border bg-card/60 p-1"
	>
		<Button size="sm"
					variant="outline"
					class="h-9 px-3" aria-label="Previous week">
			<ChevronLeft class="size-7" />
		</Button>

		<Button variant="outline">
			<span class="font-heading leading-none">Jun 1-7, 2026</span>
			<CalendarDays class="size-4" />
		</Button>

		<Button size="sm"
					variant="outline"
					class="h-9 px-3" aria-label="Next week">
			<ChevronRight class="size-7" />
		</Button>
	</section>

	<Button variant="outline">This Week</Button>
</nav>
