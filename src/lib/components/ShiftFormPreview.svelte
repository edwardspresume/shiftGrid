<script lang="ts">
	import { Clock3 } from '@lucide/svelte';

	let {
		labelClass,
		teamMemberColor,
		teamMemberName,
		formattedTimeRange,
		formattedHours
	}: {
		labelClass: string;
		teamMemberColor?: string;
		teamMemberName?: string;
		formattedTimeRange: string;
		formattedHours: string;
	} = $props();
</script>

<div class="space-y-2">
	<p class={labelClass}>Preview</p>
	<div
		class="rounded-lg border border-l-4 bg-background p-3 shadow-sm"
		style:border-left-color={teamMemberColor}
	>
		<p class="text-sm font-bold">{teamMemberName ?? 'Team member'}</p>
		<p class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
			<Clock3 class="size-3.5" />
			{formattedTimeRange}
		</p>
		<p class="mt-1 text-xs font-medium text-muted-foreground">{formattedHours} total</p>
	</div>
</div>
