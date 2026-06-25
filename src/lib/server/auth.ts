import { betterAuth } from 'better-auth/minimal';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { sveltekitCookies } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';
import { getRequestEvent } from '$app/server';
import { db } from '$lib/server/db';

function requireAuthEnv(name: 'ORIGIN' | 'BETTER_AUTH_SECRET') {
	const value = env[name];

	if (!value) {
		throw new Error(`${name} is not set`);
	}

	return value;
}

export const auth = betterAuth({
	baseURL: requireAuthEnv('ORIGIN'),
	secret: requireAuthEnv('BETTER_AUTH_SECRET'),
	database: drizzleAdapter(db, { provider: 'pg' }),
	emailAndPassword: {
		enabled: true,
		disableSignUp: true
	},
	plugins: [
		sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
	]
});
