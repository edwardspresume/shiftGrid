import { building } from '$app/environment';
import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import type { Handle } from '@sveltejs/kit';

const PUBLIC_ROUTES = new Set(['/login', '/demo/playwright']);

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	if (event.route?.id && !event.url.pathname.startsWith('/api/auth')) {
		const isPublicRoute = PUBLIC_ROUTES.has(event.url.pathname);

		if (!event.locals.user && !isPublicRoute) {
			redirect(303, '/login');
		}

		if (event.locals.user && isPublicRoute) {
			redirect(303, '/');
		}
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

export const handle: Handle = handleBetterAuth;
