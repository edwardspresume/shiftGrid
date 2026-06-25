import 'dotenv/config';

import { neon } from '@neondatabase/serverless';
import { expect, test, type Page } from '@playwright/test';
import { hashPassword } from 'better-auth/crypto';
import { and, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { account, user } from '../lib/server/db/auth.schema';
import { locations } from '../lib/server/db/schema';

const E2E_EMAIL = 'e2e@shiftgrid.local';
const E2E_PASSWORD = 'ShiftGridE2E123!';

async function ensureE2EUser() {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL is not set');
	}

	const db = drizzle(neon(process.env.DATABASE_URL));
	const now = new Date();
	const [seededUser] = await db
		.insert(user)
		.values({
			id: crypto.randomUUID(),
			name: 'ShiftGrid E2E',
			email: E2E_EMAIL,
			emailVerified: true,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: user.email,
			set: {
				name: 'ShiftGrid E2E',
				emailVerified: true,
				updatedAt: now
			}
		})
		.returning({ id: user.id });

	if (!seededUser) {
		throw new Error('Failed to seed E2E user');
	}

	const userId = seededUser.id;
	const accountId = `${userId}:credential`;

	const password = await hashPassword(E2E_PASSWORD);
	await db
		.insert(account)
		.values({
			id: accountId,
			accountId: userId,
			providerId: 'credential',
			userId,
			password,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: account.id,
			set: {
				accountId: userId,
				password,
				updatedAt: now
			}
		});

	await db
		.update(account)
		.set({
			accountId: userId,
			password,
			updatedAt: now
		})
		.where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));

	const [existingLocation] = await db
		.select({ id: locations.id })
		.from(locations)
		.where(and(eq(locations.userId, userId), eq(locations.name, 'E2E Location')))
		.limit(1);

	if (existingLocation) {
		await db
			.update(locations)
			.set({
				color: '#16a34a',
				updatedAt: now
			})
			.where(eq(locations.id, existingLocation.id));
	} else {
		await db.insert(locations).values({
			userId,
			name: 'E2E Location',
			color: '#16a34a',
			createdAt: now,
			updatedAt: now
		});
	}
}

async function signIn(page: Page) {
	await page.goto('/login');
	await page.getByLabel('Email').fill(E2E_EMAIL);
	await page.getByLabel('Password').fill(E2E_PASSWORD);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await expect(page.getByText('Weekly schedule')).toBeVisible();
}

test.beforeAll(async () => {
	await ensureE2EUser();
});

test.beforeEach(async ({ page }) => {
	await signIn(page);
});

function formatDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
	const nextDate = new Date(`${date}T00:00:00.000Z`);
	nextDate.setUTCDate(nextDate.getUTCDate() + days);

	return formatDate(nextDate);
}

function getIsolatedFutureSunday() {
	const seed = Date.now() + Math.floor(Math.random() * 1_000_000);
	const candidate = new Date(Date.UTC(2090, 0, 1 + (seed % 50_000)));
	const sunday = new Date(candidate);

	sunday.setUTCDate(candidate.getUTCDate() - candidate.getUTCDay());

	return formatDate(sunday);
}

function formatHourInput(hour: number) {
	return `${hour.toString().padStart(2, '0')}:00`;
}

function formatHourLabel(hour: number) {
	const displayHour = hour % 12 || 12;
	const period = hour >= 12 ? 'PM' : 'AM';

	return `${displayHour}:00 ${period}`;
}

async function openDayAddShiftDialog(page: Page, dayIndex = 0) {
	const addShiftButton = page.getByRole('button', { name: /^Add shift for/ }).nth(dayIndex);
	const dialog = page.getByRole('dialog', { name: 'Add shift' });

	await expect(addShiftButton).toBeVisible();

	for (let attempt = 0; attempt < 3; attempt += 1) {
		await addShiftButton.click();

		if (await dialog.isVisible()) {
			break;
		}

		await page.waitForTimeout(250);
	}

	return dialog;
}

async function openFirstDayAddShiftDialog(page: Page) {
	return openDayAddShiftDialog(page);
}

async function openShiftActions(page: Page, shiftLabel: string, index = 0) {
	await page
		.getByRole('region', { name: 'Weekly shift grid' })
		.getByRole('button', { name: new RegExp(`Shift actions for .* ${shiftLabel}`) })
		.nth(index)
		.click();
}

test('opens the add shift dialog from a day action', async ({ page }) => {
	await page.goto('/');
	const dialog = await openFirstDayAddShiftDialog(page);

	await expect(dialog).toBeVisible();
	await expect(dialog.getByLabel('Location')).toBeVisible();
	await expect(dialog.getByLabel('Date')).toBeVisible();
	await expect(dialog.getByLabel('Break')).toHaveValue('0');
	await expect(dialog.getByLabel('Start time')).toBeVisible();
	await expect(dialog.getByLabel('End time')).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Add shift' })).toBeVisible();
});

test('creates a location and schedules a shift at it', async ({ page }) => {
	const shiftDate = getIsolatedFutureSunday();
	const locationName = `E2E North ${Date.now()}`;
	const startHour = 11 + Math.floor(Math.random() * 3);
	const endHour = startHour + 1;
	const startTime = formatHourInput(startHour);
	const endTime = formatHourInput(endHour);
	const shiftLabel = `${formatHourLabel(startHour)} - ${formatHourLabel(endHour)}`;
	const shiftNotes = `Cover east desk ${Date.now()}`;

	await page.goto(`/?week=${shiftDate}`);
	await page.getByRole('button', { name: 'Add location' }).click();

	const locationDialog = page.getByRole('dialog', { name: 'Add location' });
	await expect(locationDialog).toBeVisible();
	await locationDialog.getByLabel('Name').fill(locationName);
	await locationDialog.getByRole('button', { name: 'Add location' }).click();
	await expect(locationDialog).toBeHidden();

	const shiftDialog = await openFirstDayAddShiftDialog(page);
	await expect(shiftDialog.getByLabel('Date')).toHaveValue(shiftDate);
	await shiftDialog.getByLabel('Location').selectOption({ label: locationName });
	await shiftDialog.getByLabel('Start time').fill(startTime);
	await shiftDialog.getByLabel('End time').fill(endTime);
	await shiftDialog.getByLabel('Notes').fill(shiftNotes);
	await shiftDialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(shiftDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(locationName)
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftNotes)
	).toBeVisible();
});

test('adds a shift to the active week and blocks overlapping shift hours', async ({ page }) => {
	const shiftDate = getIsolatedFutureSunday();
	const startHour = 8 + Math.floor(Math.random() * 8);
	const endHour = startHour + 1;
	const startTime = formatHourInput(startHour);
	const endTime = formatHourInput(endHour);
	const startLabel = formatHourLabel(startHour);
	const endLabel = formatHourLabel(endHour);
	const shiftLabel = `${startLabel} - ${endLabel}`;

	await page.goto(`/?week=${shiftDate}`);
	let dialog = await openFirstDayAddShiftDialog(page);

	await expect(dialog.getByLabel('Date')).toHaveValue(shiftDate);
	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await expect(dialog.getByText(shiftLabel)).toBeVisible();
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toBeVisible();

	await openShiftActions(page, shiftLabel);
	await page.getByRole('menuitem', { name: 'Edit' }).click();

	let editDialog = page.getByRole('dialog', { name: 'Edit shift' });
	const editedStartHour = endHour;
	const editedEndHour = endHour + 1;
	const editedStartTime = formatHourInput(editedStartHour);
	const editedEndTime = formatHourInput(editedEndHour);
	const editedStartLabel = formatHourLabel(editedStartHour);
	const editedEndLabel = formatHourLabel(editedEndHour);
	const editedShiftLabel = `${editedStartLabel} - ${editedEndLabel}`;

	await expect(editDialog).toBeVisible();
	await editDialog.getByRole('button', { name: 'Save changes' }).click();
	await expect(editDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toBeVisible();

	await openShiftActions(page, shiftLabel);
	await page.getByRole('menuitem', { name: 'Edit' }).click();
	editDialog = page.getByRole('dialog', { name: 'Edit shift' });
	await expect(editDialog).toBeVisible();
	await editDialog.getByLabel('Start time').fill(editedStartTime);
	await editDialog.getByLabel('End time').fill(editedEndTime);
	await editDialog.getByRole('button', { name: 'Save changes' }).click();

	await expect(editDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(editedShiftLabel)
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(0);

	dialog = await openFirstDayAddShiftDialog(page);
	await expect(dialog.getByLabel('Date')).toHaveValue(shiftDate);
	await dialog.getByLabel('Start time').fill(editedStartTime);
	await dialog.getByLabel('End time').fill(editedEndTime);
	await expect(dialog.getByText(editedShiftLabel)).toBeVisible();
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(
		dialog.getByText(
			`This shift overlaps an existing shift from ${editedStartLabel} to ${editedEndLabel} on ${shiftDate}.`
		)
	).toBeVisible();
});

test('deletes a standalone shift', async ({ page }) => {
	const shiftDate = getIsolatedFutureSunday();
	const startHour = 6 + Math.floor(Math.random() * 2);
	const endHour = startHour + 1;
	const startTime = formatHourInput(startHour);
	const endTime = formatHourInput(endHour);
	const shiftLabel = `${formatHourLabel(startHour)} - ${formatHourLabel(endHour)}`;

	await page.goto(`/?week=${shiftDate}`);
	const dialog = await openFirstDayAddShiftDialog(page);

	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toBeVisible();

	await openShiftActions(page, shiftLabel);
	await page.getByRole('menuitem', { name: 'Delete' }).click();

	const deleteDialog = page.getByRole('dialog', { name: 'Delete shift' });
	await expect(deleteDialog).toBeVisible();
	await deleteDialog.getByRole('button', { name: 'Delete shift' }).click();

	await expect(deleteDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(0);
});

test('shows recurring shifts through repeat until and blocks occurrence overlaps', async ({
	page
}) => {
	const shiftDate = getIsolatedFutureSunday();
	const nextWeekDate = addDays(shiftDate, 7);
	const repeatUntil = addDays(shiftDate, 14);
	const startHour = 17 + Math.floor(Math.random() * 4);
	const endHour = startHour + 1;
	const startTime = formatHourInput(startHour);
	const endTime = formatHourInput(endHour);
	const startLabel = formatHourLabel(startHour);
	const endLabel = formatHourLabel(endHour);
	const shiftLabel = `${startLabel} - ${endLabel}`;

	await page.goto(`/?week=${shiftDate}`);
	let dialog = await openFirstDayAddShiftDialog(page);

	await expect(dialog.getByLabel('Date')).toHaveValue(shiftDate);
	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await dialog.getByLabel('Recurrence').selectOption('weekly');
	await expect(dialog.getByLabel('Repeat until')).toBeEnabled();
	await dialog.getByText('Mon', { exact: true }).click();
	await dialog.getByLabel('Repeat until').fill(repeatUntil);
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(2);

	await page.goto(`/?week=${nextWeekDate}`);
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(2);

	await openShiftActions(page, shiftLabel, 1);
	await page.getByRole('menuitem', { name: 'Delete' }).click();

	let deleteDialog = page.getByRole('dialog', { name: 'Delete shift' });
	await expect(deleteDialog).toBeVisible();
	await deleteDialog.getByRole('button', { name: 'Delete this shift' }).click();

	await expect(deleteDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(1);

	dialog = await openFirstDayAddShiftDialog(page);
	await expect(dialog.getByLabel('Date')).toHaveValue(nextWeekDate);
	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(
		dialog.getByText(
			`This shift overlaps an existing shift from ${startLabel} to ${endLabel} on ${nextWeekDate}.`
		)
	).toBeVisible();

	await dialog.getByRole('button', { name: 'Cancel' }).click();
	const deletedOccurrenceDate = addDays(nextWeekDate, 1);

	dialog = await openDayAddShiftDialog(page, 1);
	await expect(dialog.getByLabel('Date')).toHaveValue(deletedOccurrenceDate);
	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(2);

	await openShiftActions(page, shiftLabel);
	await page.getByRole('menuitem', { name: 'Delete' }).click();

	deleteDialog = page.getByRole('dialog', { name: 'Delete shift' });
	await expect(deleteDialog).toBeVisible();
	await deleteDialog.getByRole('button', { name: 'Delete series' }).click();

	await expect(deleteDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(1);

	await page.goto(`/?week=${shiftDate}`);
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(0);
});

test('edits one recurring occurrence as a standalone shift', async ({ page }) => {
	const shiftDate = getIsolatedFutureSunday();
	const nextWeekDate = addDays(shiftDate, 7);
	const repeatUntil = addDays(shiftDate, 14);
	const startHour = 12 + Math.floor(Math.random() * 3);
	const endHour = startHour + 1;
	const editedStartHour = endHour;
	const editedEndHour = editedStartHour + 1;
	const startTime = formatHourInput(startHour);
	const endTime = formatHourInput(endHour);
	const editedStartTime = formatHourInput(editedStartHour);
	const editedEndTime = formatHourInput(editedEndHour);
	const shiftLabel = `${formatHourLabel(startHour)} - ${formatHourLabel(endHour)}`;
	const editedShiftLabel = `${formatHourLabel(editedStartHour)} - ${formatHourLabel(editedEndHour)}`;
	const editedNotes = `Standalone occurrence ${Date.now()}`;

	await page.goto(`/?week=${shiftDate}`);
	let dialog = await openFirstDayAddShiftDialog(page);

	await expect(dialog.getByLabel('Date')).toHaveValue(shiftDate);
	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await dialog.getByLabel('Recurrence').selectOption('weekly');
	await dialog.getByLabel('Repeat until').fill(repeatUntil);
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(dialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toBeVisible();

	await page.goto(`/?week=${nextWeekDate}`);
	await openShiftActions(page, shiftLabel);
	await page.getByRole('menuitem', { name: 'Edit' }).click();

	const editDialog = page.getByRole('dialog', { name: 'Edit shift' });
	await expect(editDialog).toBeVisible();
	await expect(editDialog.getByRole('button', { name: 'This shift', exact: true })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(editDialog.getByLabel('Date')).toHaveValue(nextWeekDate);
	await editDialog.getByLabel('Start time').fill(editedStartTime);
	await editDialog.getByLabel('End time').fill(editedEndTime);
	await editDialog.getByLabel('Notes').fill(editedNotes);
	await editDialog.getByRole('button', { name: 'Save this shift' }).click();

	await expect(editDialog).toBeHidden();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(editedShiftLabel)
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(editedNotes)
	).toBeVisible();
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toHaveCount(0);

	await page.goto(`/?week=${shiftDate}`);
	await expect(
		page.getByRole('region', { name: 'Weekly shift grid' }).getByText(shiftLabel)
	).toBeVisible();
});
