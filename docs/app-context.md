# ShiftGrid App Context

> ShiftGrid is a SvelteKit scheduling app for building and reviewing weekly shift coverage. This document is written primarily for coding agents and should stay concise, current, and implementation-oriented.

## Product Shape

ShiftGrid currently centers on a shared weekly schedule view. Users choose a week, review scheduled shifts by day, and users with scheduler permissions add shifts from the individual day column where the shift will appear.

The app is operational rather than marketing-focused: the main screen is the working schedule grid and week navigation.

## Current User Features

- Invite-only access using Better Auth email/password authentication.
- Public registration is disabled; the initial owner account is seeded with `pnpm auth:seed-owner` using `SHIFTGRID_OWNER_*` or `AUTH_SEED_*` environment variables.
- User roles are `system_admin`, `scheduler`, and `receptionist`.
- `system_admin` and `scheduler` users can create team members and create/edit/delete shifts. `receptionist` users can view the schedule.
- Weekly schedule grid with one column per day.
- On smaller viewports the weekly grid keeps readable day-column widths inside horizontal scrolling instead of compressing all seven columns.
- Week navigation for previous week, next week, current week, and date-based week selection.
- Mobile users can reach schedule and team-member navigation from the account menu.
- Per-day add-shift buttons that open a modal form anchored to that week/day.
- Schedulers create and manage shared team members from the `/team-members` page.
- The team members page supports create, edit, and delete for unassigned team members.
- Team members assigned to existing shift rows cannot be deleted; the delete dialog disables the destructive action and directs schedulers to edit the name/color or remove shifts first.
- Shift form fields for team member, date, start time, end time, recurrence, repeat-until, selected days, and shift notes.
- Recurring shift forms include repeat-until presets for 2 weeks, 1 month, and 3 months while keeping the exact date input editable.
- Shift cards show team member, recurrence label, time range, total hours, and notes when present.
- Shift cards include a three-dot actions menu with edit and delete actions.
- Overnight shifts are supported by treating an end time earlier than or equal to the start time as next-day coverage.
- Light and dark theme support through the existing theme toggle.

## Scheduling Rules

- Shifts cannot overlap existing coverage for the same team member, including overnight boundaries.
- Overlap checks compare expanded occurrence ranges for the assigned team member, so one-time shifts cannot collide with that team member's recurring occurrences and recurring shifts cannot collide with that team member's existing one-time or recurring shifts.
- Recurrence frequencies are currently `none`, `weekly`, and `biweekly`.
- Non-recurring add-shift submissions can select one or more weekdays in the anchored week; each selected weekday is inserted as a standalone one-time shift row.
- Weekly and biweekly shifts require a repeat-until date.
- Weekly and biweekly shifts require at least one selected repeat weekday.
- Repeat-until cannot be before the shift date and is capped at `RECURRENCE_LIMIT_YEARS`.
- Recurring shifts are stored as one database row representing the rule, then expanded into visible occurrences for the requested week.
- Editing a recurring shift can apply changes to the selected occurrence or the whole stored rule.
- Editing one recurring occurrence creates a cancellation exception for the original occurrence and inserts the edited entry as a standalone non-recurring shift.
- Editing a recurring series updates the stored rule. If the recurrence pattern changes, existing per-date cancellation exceptions are cleared because they no longer describe the same set of occurrences.
- Deleting a single recurring shift creates a cancellation exception for that occurrence date. Deleting a series deletes the stored rule and cascades its exceptions.
- Bulk recurring creation is all-or-nothing: any overlap blocks the new recurring rule rather than silently skipping dates.

## Data Model

- Database scripts read `DATABASE_URL` from dotenv files. `pnpm db:migrate` uses `.env`, `pnpm db:migrate:test` uses `.env.test`, and `pnpm db:migrate:production` uses `.env.production`.
- Playwright E2E scripts preload `.env.test` so test seed data is created in the test database, not production.
- `pnpm db:copy:test-to-production` replaces production users and scheduling data with rows from test using `.env.test` and `.env.production`. It copies `user`, `account`, `team_members`, `shifts`, and shift exception child rows, excludes the E2E login plus `E2E ...` team members and their child data, truncates sessions, and does not copy live session rows.
- `user.role` stores the role enum used for application-level permissions.
- `team_members` stores the shared assignable people list: `id`, `name`, `color`, audit user ids, and timestamps.
- `shifts` stores the scheduling rule: `team_member_id`, base date, start/end time, recurrence frequency, recurrence-until, recurrence weekdays, optional shift notes, audit user ids, and timestamps.
- `shifts.team_member_id` references the shared `team_members` table. Shift overlap validation is scoped to that team member.
- `shift_exceptions` stores per-occurrence changes for recurring series. It currently supports constrained `cancelled` occurrences.
- Better Auth tables (`user`, `session`, `account`, `verification`) support email/password login. Password credentials are stored in `account` rows with `provider_id = 'credential'`.

## Remote Data Flow

- Remote functions live in `src/lib/schedule/shifts.remote.ts`.
- Auth form remote functions live in `src/lib/auth/auth.remote.ts`.
- Current-user role/capability lookup uses `getCurrentUser()` in `src/lib/auth/auth.remote.ts`; it intentionally avoids route `load` data.
- Schedule queries require an authenticated Better Auth session and read the shared schedule.
- Schedule mutations require `system_admin` or `scheduler`.
- `getSchedule(week)` returns only the requested week's expanded shift occurrences and lightweight summary data for internal use.
- `getTeamMembers()` is separate from `getSchedule()` so adding a shift refreshes only schedule data instead of reloading relatively static team member data.
- `saveTeamMember` validates a shared team member name/color, requires `system_admin` or `scheduler`, relies on the global unique team-member name constraint to block duplicates, stores audit user ids, and refreshes `getTeamMembers()`.
- `deleteTeamMember` requires `system_admin` or `scheduler` and only deletes team members with no assigned shift rows.
- `addShift` validates input, checks team member existence, checks same-team-member overlap windows, inserts one or more shift rows depending on selected days/recurrence, and accepts one requested `getSchedule` refresh.
- `editShift` validates the same scheduling rules, updates standalone shifts and recurring series in place, or individualizes one recurring occurrence by cancelling the source occurrence and inserting a non-recurring shift. Series edits clear cancellation exceptions when the recurrence pattern changes and accept one requested `getSchedule` refresh.
- `deleteShift` deletes one-time shifts directly, deletes recurring series directly, or creates a cancelled occurrence exception for a single recurring shift.
- Shift add/edit/delete operations run inside a pooled Postgres transaction with a shared schedule advisory transaction lock so overlap validation and writes are serialized for the shared schedule.
- Shift forms submit with `form.submit().updates(getSchedule(currentWeekQuery))`, keeping refresh scoped to the visible schedule query and avoiding a full app invalidation.

## Important Source Areas

- `src/routes/+page.svelte`: main schedule page, week state, modal state, and remote query usage.
- `src/routes/team-members/+page.svelte`: shared team member list with create/edit/delete management.
- `src/routes/login/+page.svelte`: invite-only email/password login form.
- `src/lib/auth/auth.remote.ts`: login/logout remote forms backed by Better Auth.
- `scripts/seed-owner.mjs`: environment-driven owner account seeding for invite-only deployments.
- `src/lib/server/roles.ts`: role capability helpers and server-side mutation guards.
- `src/lib/components/AddTeamMemberForm.svelte`: add-team-member remote form UI.
- `src/lib/components/ShiftWeekGrid.svelte`: weekly grid, day columns, shift cards, and day-level add actions.
- `src/lib/components/AddShiftForm.svelte`: add-shift remote form UI, field defaults, recurrence controls, and scoped post-submit refresh.
- `src/lib/components/EditShiftForm.svelte`: edit-shift remote form UI for updating standalone shifts, updating recurring series, or individualizing a recurring occurrence.
- `src/lib/components/ShiftFormPreview.svelte`: shared shift form preview card for add/edit dialogs.
- `src/lib/schedule/shiftFormHelpers.ts`: shared repeat-until preset and weekday helpers used by add/edit shift forms.
- `src/lib/schedule/shifts.remote.ts`: schedule queries, recurrence expansion, overlap validation, and shift mutations.
- `src/lib/schedule/shiftValidation.ts`: Valibot schema for add-shift form validation.
- `src/lib/schedule/time.ts`: clock parsing, display formatting, hours calculation, and overlap math.
- `src/lib/schedule/week.ts`: week-start and day-list helpers.
- `src/lib/server/db/schema.ts`: Drizzle schema for team members, shifts, and auth exports.
- `src/routes/page.svelte.e2e.ts`: durable Playwright coverage for add-shift and recurrence behavior.

## Known Product Gaps

- There is no "this and future shifts" edit/delete behavior yet. That requires splitting a recurring rule at the selected occurrence date.
- Recurrence supports weekly and biweekly weekday patterns; monthly and end-after-N-occurrences rules do not exist yet.
- Team member deletion is hard-delete only for unassigned team members. There is no archive/deactivate state yet.

## Maintenance Notes For Agents

- Keep this document current when changing user-visible app behavior, scheduling rules, data model shape, or important source ownership.
- Prefer concise updates over broad rewrites. This file is meant to reduce context loading, not duplicate the full codebase.
- When adding recurrence edit/delete behavior, document the chosen series semantics here before or alongside the implementation.
