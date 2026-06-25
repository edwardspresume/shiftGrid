# ShiftGrid Security Best Practices Report

Date: 2026-06-25

## Executive Summary

I did not find a confirmed application-level authz bypass, SQL injection, or DOM XSS issue in the reviewed SvelteKit code. The main server-side schedule and team-member mutations require an authenticated user and then enforce scheduler/system-admin roles before writes.

The highest-priority issue is dependency hygiene: `pnpm audit` currently reports 9 advisories across locked packages, including 2 high-severity findings. The next most important app hardening gap is that no production security headers are visible in the repo, especially CSP and clickjacking controls.

Scope reviewed: SvelteKit hooks/routes/components, Better Auth setup, remote functions, Drizzle schema/query paths, owner seed script, env/git hygiene, frontend XSS/navigation/storage sinks, and `pnpm audit` current npm advisories.

## Critical Findings

No critical findings identified.

## High Findings

### F-01: Vulnerable Locked Dependencies

- Rule ID: JS-SUPPLY-001
- Severity: High
- Location: `package.json` dependency declarations at lines 33, 50, 54, and 55; `pnpm-lock.yaml` locked versions around lines 18-20, 69-71, 1791-1795, 1989, 2416, 3478-3496, 4503-4522, 4768, and 5229.
- Evidence:
  - `package.json:33` pins `@better-auth/cli` to `~1.4.21`.
  - `package.json:50` pins `better-auth` to `~1.4.21`; the lock resolves runtime `better-auth` to `1.4.22`.
  - `package.json:54` uses `drizzle-kit`; the lock includes transitive `esbuild@0.18.20`.
  - `pnpm audit --audit-level low --json` reported 9 total vulnerabilities: 2 low, 5 moderate, 2 high.
  - High advisories from audit:
    - `lodash@4.17.21` via `@better-auth/cli > @mrleebo/prisma-ast > chevrotain > lodash`: GHSA-r5fr-rjxr-66jc.
    - `drizzle-orm@0.41.0` via `@better-auth/cli > drizzle-orm`: GHSA-gpj5-g38j-94v9.
  - Moderate runtime advisory:
    - `better-auth <1.6.2`: GHSA-wxw3-q3m9-c3jr. Current app config in `src/lib/server/auth.ts:18-28` uses email/password and does not configure OAuth providers, so the specific OAuth-state advisory does not appear directly exploitable in this app today. The package is still affected and should be updated.
- Impact: Vulnerable build/auth dependencies can expose the app to known exploit paths if affected code paths are used now or added later; dev tooling advisories also raise risk during local development and CI.
- Fix: Upgrade `better-auth` and `@better-auth/cli` to at least versions that clear GHSA-wxw3-q3m9-c3jr, then regenerate the lockfile and rerun `pnpm audit --audit-level moderate`. If upstream still pulls vulnerable `lodash` or `drizzle-orm`, use a narrowly scoped `pnpm.overrides` entry only after confirming compatibility.
- Mitigation: Keep `@better-auth/cli` out of production runtime bundles and do not expose Drizzle/Better Auth code-generation tooling in deployed environments.
- False positive notes: Several findings are transitive/dev-tooling paths. They are still actionable because this repository runs those tools against real schema/env configuration.

## Medium Findings

### F-02: No Production Security Headers Visible in Repo

- Rule ID: JS-CSP-001 / JS-CSP-002
- Severity: Medium
- Location: `src/app.html:3-9`, `svelte.config.js:12-16`, `src/hooks.server.ts:9-29`.
- Evidence:
  - The app shell only defines basic metadata in `src/app.html:3-9`.
  - `svelte.config.js:12-16` enables the Vercel adapter and remote functions, but no CSP/security header configuration is present.
  - `src/hooks.server.ts:9-29` resolves requests through Better Auth but does not attach headers such as `Content-Security-Policy`, `X-Frame-Options`/`frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`, or `X-Content-Type-Options`.
  - Repo search did not find `Content-Security-Policy`, `frame-ancestors`, `Referrer-Policy`, or `Permissions-Policy`.
- Impact: If an XSS or content-injection issue is introduced later, the browser has fewer defense-in-depth controls. Without clickjacking controls, the authenticated UI may be frameable unless the hosting layer sets headers.
- Fix: Add production response headers at the SvelteKit/Vercel layer. Start with a CSP that avoids `unsafe-eval`, uses nonces/hashes for any required inline scripts, and sets `frame-ancestors 'none'` or a strict allowlist. Also set `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` with unused features disabled, and `X-Content-Type-Options: nosniff`.
- Mitigation: If headers are managed outside the repo, document that deployment responsibility in `docs/app-context.md` and verify it against the deployed URL.
- False positive notes: These headers may be configured in Vercel project settings or an upstream proxy outside this repository. I could not verify external deployment config from the local workspace.

## Low Findings

### F-03: Public Demo Route Remains Allowlisted

- Rule ID: APP-ROUTE-001
- Severity: Low
- Location: `src/hooks.server.ts:7`, `src/routes/demo/playwright/+page.svelte:1`.
- Evidence:
  - `src/hooks.server.ts:7` includes `'/demo/playwright'` in `PUBLIC_ROUTES`.
  - `src/routes/demo/playwright/+page.svelte:1` is a public static demo page.
- Impact: Current impact is minimal because the route only renders a static heading. The risk is future drift: demo routes often accumulate test-only behavior and can become public attack surface by accident.
- Fix: Remove the route and allowlist entry before production, or gate the allowlist behind a development/test environment flag.
- Mitigation: Add an e2e or server test asserting the intended public route set.
- False positive notes: If `/demo/playwright` is intentionally public for health checks or demos, document that intent.

### F-04: Owner Seed Script Can Re-Promote and Reset an Existing Account

- Rule ID: OPS-SEED-001
- Severity: Low
- Location: `scripts/seed-owner.mjs:13-26`, `scripts/seed-owner.mjs:71-80`, `scripts/seed-owner.mjs:93-115`, `package.json:30`.
- Evidence:
  - The script reads owner email/password from environment variables at `scripts/seed-owner.mjs:13-26`.
  - If the user already exists, it sets `role: 'system_admin'` and `emailVerified: true` at `scripts/seed-owner.mjs:71-80`.
  - It always hashes the supplied password and updates or inserts the credential account at `scripts/seed-owner.mjs:93-115`.
  - `package.json:30` exposes this as `pnpm auth:seed-owner`.
- Impact: This is not remotely exploitable through the app, but a misconfigured production job, leaked seed env vars, or accidental command execution can reset privileged access.
- Fix: Make production seeding explicitly one-time or require a second confirmation env var for existing-account password resets, such as `SHIFTGRID_ALLOW_OWNER_RESET=true`. Consider logging to an audit channel when it updates an existing owner.
- Mitigation: Do not keep owner seed password variables in long-lived production environments after seeding.
- False positive notes: This behavior is useful for bootstrap and recovery; the issue is operational guardrail strength, not password handling. The script hashes passwords and does not print the password.

## Positive Observations

- `src/hooks.server.ts:17-26` redirects unauthenticated users away from protected app routes.
- `src/lib/schedule/shifts.remote.ts:327-385`, `569-571`, `641-643`, and `753-755` enforce authenticated scheduler/system-admin roles before team-member and shift mutations.
- `src/lib/schedule/shiftValidation.ts:25-233` validates IDs, dates, recurrence days, notes length, team-member colors, recurrence horizon, and enumerated values server-side.
- User-controlled shift notes and names are rendered through Svelte text interpolation, for example `src/lib/components/ShiftWeekGrid.svelte:96-103` and `151-157`; I did not find `innerHTML`, `eval`, string timers, `postMessage`, or token storage sinks in app code.
- `.env` is ignored by git via `.gitignore:15-19`; `git ls-files .env .env.example` shows only `.env.example` is tracked.

## Verification Performed

- Loaded security-best-practices JavaScript frontend guidance.
- Inspected SvelteKit auth hook, Better Auth configuration, remote functions, validation schemas, Drizzle schema, core UI rendering, seed script, env/git hygiene, and demo routes.
- Ran `pnpm audit --audit-level moderate`; sandbox DNS failed, then the command was rerun with network approval and returned 9 vulnerabilities.
- Ran `pnpm audit --audit-level low --json` with network approval for detailed advisory paths.

## Suggested Fix Order

1. Upgrade vulnerable dependencies and rerun `pnpm audit --audit-level moderate`.
2. Add production security headers and verify them against a running deployment.
3. Remove or environment-gate the public demo route.
4. Add an explicit guardrail to `scripts/seed-owner.mjs` for existing privileged-account resets.
