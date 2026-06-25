import { form, getRequestEvent } from '$app/server';
import { auth } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import * as v from 'valibot';

const loginSchema = v.object({
	email: v.pipe(v.string(), v.trim(), v.email('Enter a valid email address.')),
	_password: v.pipe(v.string(), v.minLength(8, 'Password must be at least 8 characters.'))
});

const logoutSchema = v.object({});

export const loginUser = form(loginSchema, async ({ email, _password }) => {
	const event = getRequestEvent();

	try {
		await auth.api.signInEmail({
			body: {
				email,
				password: _password
			},
			headers: event.request.headers
		});
	} catch (error) {
		if (error instanceof APIError) {
			return {
				success: false,
				message: 'Invalid email or password.'
			};
		}

		console.error('Unexpected login error', error);

		return {
			success: false,
			message: 'Unable to sign in right now. Try again later.'
		};
	}

	redirect(303, '/');
});

export const logoutUser = form(logoutSchema, async () => {
	const event = getRequestEvent();

	await auth.api.signOut({
		headers: event.request.headers
	});

	event.locals.user = undefined;
	event.locals.session = undefined;

	redirect(303, '/login');
});
