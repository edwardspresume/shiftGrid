import { defineConfig } from '@playwright/test';

export default defineConfig({
	testMatch: '**/*.e2e.{ts,js}',
	fullyParallel: true,
	retries: process.env.CI ? 2 : 0,
	reporter: process.env.CI ? 'github' : 'html',
	use: {
		baseURL: 'http://localhost:4173',
		screenshot: 'only-on-failure',
		trace: 'on-first-retry',
		video: 'retain-on-failure'
	},
	webServer: {
		command: 'pnpm build && pnpm preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	}
});
