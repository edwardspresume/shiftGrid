# Agent Instructions

## UI Verification

- Use the project-local Playwright install for web UI checks; do not rely on a global Playwright install.
- After UI-facing changes, run `pnpm check` and an appropriate Playwright command.
- Use `pnpm test:e2e` for the normal end-to-end suite.
- Use `pnpm test:e2e:headed` when visual behavior needs live browser inspection.
- Use `pnpm test:e2e:trace` when debugging an interaction or layout failure that needs a trace artifact.
- Use `pnpm test:e2e:ui` for local interactive Playwright review when helpful.
- Keep durable regression coverage in committed `*.e2e.ts` files rather than only doing ad-hoc browser checks.
- Prefer user-facing Playwright locators such as roles, labels, text, and test ids over CSS selectors tied to layout internals.
