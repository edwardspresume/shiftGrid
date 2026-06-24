# ShiftGrid App Context

> ShiftGrid is a SvelteKit scheduling app for building and reviewing weekly shift coverage. This document is written primarily for coding agents and should stay concise, current, and implementation-oriented.

## Product Shape

ShiftGrid currently centers on a single weekly schedule view. Users choose a week, review scheduled shifts by day, and add shifts from the individual day column where the shift will appear.

The app is operational rather than marketing-focused: the main screen is the working schedule grid, a compact weekly summary, and week navigation.

## Current User Features

- Weekly schedule grid with one column per day.
- Week navigation for previous week, next week, current week, and date-based week selection.
- Summary stats for total scheduled hours, shift count, and active location count.
- Per-day add-shift buttons that open a modal form with the date fixed to that day.
- Shift form fields for location, date, break, start time, end time, recurrence, repeat-until, repeat days, and shift notes.
- Shift cards show location, recurrence label, time range, and total hours.
- Shift cards include a three-dot actions menu with edit available. Delete is not implemented yet.
- Overnight shifts are supported by treating an end time earlier than or equal to the start time as next-day coverage.
- Light and dark theme support through the existing theme toggle.

## Scheduling Rules

- Shifts cannot overlap existing coverage, including overnight boundaries.
- Overlap checks compare expanded occurrence ranges, so one-time shifts cannot collide with recurring occurrences and recurring shifts cannot collide with existing one-time or recurring shifts.
- Recurrence frequencies are currently `none`, `weekly`, and `biweekly`.
- Weekly and biweekly shifts require a repeat-until date.
- Weekly and biweekly shifts require at least one selected repeat weekday.
- Repeat-until cannot be before the shift date and is capped at `RECURRENCE_LIMIT_YEARS`.
- Recurring shifts are stored as one database row representing the rule, then expanded into visible occurrences for the requested week.
- Editing a recurring shift currently edits the whole stored rule. Single-occurrence edits require recurrence exceptions and are not implemented yet.
- Bulk recurring creation is all-or-nothing: any overlap blocks the new recurring rule rather than silently skipping dates.

## Data Model

- `locations` stores `id`, `name`, `color`, and timestamps.
- `shifts` stores the scheduling rule: location, base date, start/end time, break minutes, recurrence frequency, recurrence-until, recurrence weekdays, optional shift notes, and timestamps.
- Better Auth demo tables still exist separately under the auth schema.

## Remote Data Flow

- Remote functions live in `src/lib/schedule/shifts.remote.ts`.
- `getSchedule(week)` returns only the requested week's expanded shift occurrences and weekly summary.
- `getLocations()` is separate from `getSchedule()` so adding a shift refreshes only schedule data instead of reloading relatively static location data.
- `addShift` validates input, checks location existence, checks overlap windows, inserts the shift rule, and accepts one requested `getSchedule` refresh.
- `editShift` validates the same scheduling rules, excludes the edited rule during overlap checks, updates the stored rule, and accepts one requested `getSchedule` refresh.
- Shift forms submit with `form.submit().updates(getSchedule(currentWeekQuery))`, keeping refresh scoped to the visible schedule query and avoiding a full app invalidation.

## Important Source Areas

- `src/routes/+page.svelte`: main schedule page, week state, modal state, and remote query usage.
- `src/lib/components/ShiftWeekGrid.svelte`: weekly grid, day columns, shift cards, and day-level add actions.
- `src/lib/components/AddShiftForm.svelte`: add-shift remote form UI, field defaults, recurrence controls, and scoped post-submit refresh.
- `src/lib/components/EditShiftForm.svelte`: edit-shift remote form UI for updating stored shift rules.
- `src/lib/schedule/shifts.remote.ts`: schedule queries, recurrence expansion, overlap validation, and shift mutations.
- `src/lib/schedule/shiftValidation.ts`: Valibot schema for add-shift form validation.
- `src/lib/schedule/time.ts`: clock parsing, display formatting, hours calculation, and overlap math.
- `src/lib/schedule/week.ts`: week-start and day-list helpers.
- `src/lib/server/db/schema.ts`: Drizzle schema for locations, shifts, and auth exports.
- `src/routes/page.svelte.e2e.ts`: durable Playwright coverage for add-shift and recurrence behavior.

## Known Product Gaps

- There is no shift delete flow yet, including delete-this-occurrence, delete-this-and-future, or delete-entire-series behavior.
- Recurrence exceptions are not modeled yet. Add a `shift_exceptions`-style table before supporting single-occurrence deletes or edits.
- Recurrence supports weekly and biweekly weekday patterns; monthly and end-after-N-occurrences rules do not exist yet.
- Location management UI is not present in the main scheduling workflow.

## Maintenance Notes For Agents

- Keep this document current when changing user-visible app behavior, scheduling rules, data model shape, or important source ownership.
- Prefer concise updates over broad rewrites. This file is meant to reduce context loading, not duplicate the full codebase.
- When adding recurrence edit/delete behavior, document the chosen series semantics here before or alongside the implementation.
