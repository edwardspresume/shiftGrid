<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
</script>

<div class="flex items-center gap-2">
	<section
		aria-label="Week selector"
		class="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1e1e20] p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.28)]"
	>
		<Button size="icon" variant="outline" aria-label="Previous week">
			<ChevronLeft class="size-7" />
		</Button>

		<Button variant="outline">
			<span class="font-heading leading-none">Jun 1-7, 2026</span>
			<CalendarDays class="size-4" />
		</Button>

		<Button size="icon" variant="outline" aria-label="Next week">
			<ChevronRight class="size-7" />
		</Button>
	</section>

	<Button variant="outline">This Week</Button>
</div>
