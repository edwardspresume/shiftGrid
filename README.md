# ShiftGrid

ShiftGrid is an invite-only SvelteKit scheduling app for building and reviewing weekly shift coverage.

## Developing

Install dependencies, configure `.env`, and start the development server:

```sh
pnpm install
pnpm dev
```

## Checks

```sh
pnpm check
pnpm lint
pnpm test:unit --run
pnpm test:e2e
```

## Database migrations

The app and migration scripts read the database connection from `DATABASE_URL`.
Use separate local env files for each target database:

```sh
cp .env.example .env.test
cp .env.example .env.production
```

Set `DATABASE_URL` in each file to the matching test or production database.
Then run:

```sh
pnpm db:migrate:test
pnpm db:migrate:production
```

The Playwright end-to-end scripts explicitly load `.env.test` so E2E seed data stays out of production. Add dedicated `E2E_TEST_EMAIL` and `E2E_TEST_PASSWORD` values to `.env.test` only; never reuse production credentials for E2E tests.

Keep test and production databases separate. Do not use test-data copy utilities against production without an explicit review.

## Building

To create a production version of your app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
