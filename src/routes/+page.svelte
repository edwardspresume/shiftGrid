<script lang="ts">
	import ShiftWeekGrid from '$lib/components/ShiftWeekGrid.svelte';
	import SiteHeader from '$lib/components/SiteHeader.svelte';
	import { Button } from '$lib/components/ui/button';
	import WeekSelector from '$lib/components/WeekSelector.svelte';
	import { Plus } from '@lucide/svelte';
</script>

<SiteHeader />

<main class="container mx-auto mt-6">
	<header class="border-b pb-4">
		<WeekSelector />

		<section class="mt-4 flex items-center justify-between gap-4">
			<div>
				<p class="text-sm font-semibold">Total hours this week:</p>
				<div class="mt-1 flex items-baseline gap-2">
					<p class="text-3xl leading-none font-black">38.5h</p>
					<span>·</span>
					<p class="font-semibold">6 shifts</p>
				</div>
			</div>

			<Button variant="outline" size="lg">
				<Plus class="size-6" />
				Add Shift
			</Button>
		</section>
	</header>

	<ShiftWeekGrid />
</main>
