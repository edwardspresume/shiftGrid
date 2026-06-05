<script lang="ts">
	import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
</script>

<section
	aria-label="Week selector"
	class="inline-flex max-w-full items-center gap-1.5 overflow-x-auto rounded-[18px] border border-white/10 bg-[#1e1e20] p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.28)]"
>
	<Button
		variant="outline"
		class="h-[54px] rounded-[12px] border-white/10 bg-[#252529] px-5 text-[20px] font-bold text-white/45 hover:bg-[#2b2b30] hover:text-white/65"
	>
		This Week
	</Button>

	<Button
		variant="outline"
		size="icon"
		aria-label="Previous week"
		class="size-[54px] rounded-[12px] border-white/20 bg-[#2a2a2d] text-white hover:bg-[#323238]"
	>
		<ChevronLeft class="size-7 stroke-[2.6]" />
	</Button>

	<Button
		variant="outline"
		class="h-[54px] gap-3 rounded-[12px] border-white/20 bg-[#2a2a2d] px-4 text-[25px] font-black text-white hover:bg-[#323238] hover:text-white"
	>
		<span class="font-heading leading-none">Jun 1-7, 2026</span>
		<CalendarDays class="size-[23px] stroke-[2.2]" />
	</Button>

	<Button
		variant="outline"
		size="icon"
		aria-label="Next week"
		class="size-[54px] rounded-[12px] border-white/20 bg-[#2a2a2d] text-white hover:bg-[#323238]"
	>
		<ChevronRight class="size-7 stroke-[2.6]" />
	</Button>
</section>
