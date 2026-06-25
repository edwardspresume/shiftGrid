<script lang="ts">
	import { loginUser } from '$lib/auth/auth.remote';
	import { Button } from '$lib/components/ui/button';
	import { CalendarDays, LogIn } from '@lucide/svelte';

	const loginError = $derived(loginUser.result?.success === false ? loginUser.result.message : '');
</script>

<svelte:head>
	<title>Sign in | ShiftGrid</title>
</svelte:head>

<main class="grid min-h-dvh place-items-center bg-muted/30 px-4 py-10">
	<section class="w-full max-w-sm border bg-background p-6 shadow-sm">
		<div class="mb-6 flex items-center gap-3">
			<div class="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
				<CalendarDays class="size-5" />
			</div>

			<div>
				<p class="font-heading text-2xl leading-none font-black">ShiftGrid</p>
				<p class="mt-1 text-sm text-muted-foreground">Sign in to manage weekly shifts.</p>
			</div>
		</div>

		<form
			class="space-y-4"
			{...loginUser.enhance(async ({ submit }) => {
				await submit();
			})}
		>
			<fieldset class="space-y-1.5">
				<label for="email" class="text-sm font-medium">Email</label>
				<input
					{...loginUser.fields.email.as('email')}
					id="email"
					autocomplete="email"
					class="h-10 w-full rounded-lg border bg-background px-3 text-sm"
				/>

				{#each loginUser.fields.email.issues() as issue, index (index)}
					<p class="text-sm text-destructive">{issue.message}</p>
				{/each}
			</fieldset>

			<fieldset class="space-y-1.5">
				<label for="password" class="text-sm font-medium">Password</label>
				<input
					{...loginUser.fields._password.as('password')}
					id="password"
					autocomplete="current-password"
					class="h-10 w-full rounded-lg border bg-background px-3 text-sm"
				/>

				{#each loginUser.fields._password.issues() as issue, index (index)}
					<p class="text-sm text-destructive">{issue.message}</p>
				{/each}
			</fieldset>

			{#if loginError}
				<p
					class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{loginError}
				</p>
			{/if}

			<Button type="submit" class="h-10 w-full" disabled={!!loginUser.pending}>
				<LogIn class="size-4" />
				{loginUser.pending ? 'Signing in...' : 'Sign in'}
			</Button>
		</form>

		<p class="mt-5 text-center text-sm text-muted-foreground">
			Accounts are invite-only. Ask an administrator for access.
		</p>
	</section>
</main>
