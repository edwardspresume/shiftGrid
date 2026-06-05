<script lang="ts">
	import SiteHeader from '$lib/components/site-header.svelte';
	import { Button } from '$lib/components/ui/button';
	import WeekSelector from '$lib/components/week-selector.svelte';
	import { Plus } from '@lucide/svelte';
</script>

<SiteHeader />

<main class="container mx-auto">
	<header class="border-b border-white/10 p-3">
		<WeekSelector />

		<section class="flex items-center justify-between gap-4 p-4">
			<div>
				<p class="text-sm font-semibold text-white/55">Total hours this week:</p>
				<div class="mt-1 flex items-baseline gap-2">
					<p class="text-3xl leading-none font-black">38.5h</p>
					<span class="text-white/35">·</span>
					<p class="text-base font-semibold text-white/65">6 shifts</p>
				</div>
			</div>

			<Button
				variant="outline"
				class="h-12 gap-2 rounded-[12px] border-white/20 bg-[#2a2a2d] px-4 text-base font-bold text-white hover:bg-[#323238]"
			>
				<Plus class="size-6 stroke-[2.5]" />
				Add Shift
			</Button>
		</section>
	</header>
</main>
