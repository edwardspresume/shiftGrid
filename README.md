# sv

Everything you need to build a Svelte project, powered by [`sv`](https://github.com/sveltejs/cli).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
pnpm dlx sv@0.15.4 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:forms,typography" sveltekit-adapter="adapter:vercel" drizzle="database:postgresql+postgresql:neon" better-auth="demo:password" mcp="ide:other+setup:remote" --install pnpm shiftGrid
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
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

To replace production users and scheduling data with test data after both schemas are migrated, run:

```sh
pnpm db:copy:test-to-production
```

That command truncates production `user`, `account`, `session`, `team_members`, `shifts`, and
`shift_exceptions` data before copying `user`, `account`, `team_members`, `shifts`, and
`shift_exceptions` rows from `.env.test`. It does not copy live sessions, so users may need to
sign in again.

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
