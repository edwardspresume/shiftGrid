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

The Playwright end-to-end scripts explicitly load `.env.test` so E2E seed data stays out of
production.

To replace production users and scheduling data with test data after both schemas are migrated, run:

```sh
pnpm db:copy:test-to-production
```

That command truncates production `user`, `account`, `session`, `team_members`, `shifts`, and
`shift_exceptions` data before copying `user`, `account`, `team_members`, `shifts`, and
`shift_exceptions` rows from `.env.test`. It excludes the E2E login and `E2E ...` team members,
along with their shifts and shift exceptions. It does not copy live sessions, so users may need to
sign in again.

## Building

To create a production version of your app:

```sh
pnpm build
```

You can preview the production build with `pnpm preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
