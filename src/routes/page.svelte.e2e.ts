import { expect, test, type Page } from '@playwright/test';

function formatDate(date: Date) {
	return date.toISOString().slice(0, 10);
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

async function openFirstDayAddShiftDialog(page: Page) {
	const addShiftButton = page.getByRole('button', { name: /^Add shift for/ }).first();
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

	dialog = await openFirstDayAddShiftDialog(page);
	await expect(dialog.getByLabel('Date')).toHaveValue(shiftDate);
	await dialog.getByLabel('Start time').fill(startTime);
	await dialog.getByLabel('End time').fill(endTime);
	await expect(dialog.getByText(shiftLabel)).toBeVisible();
	await dialog.getByRole('button', { name: 'Add shift' }).click();

	await expect(
		dialog.getByText(
			`This shift overlaps an existing shift from ${startLabel} to ${endLabel} on ${shiftDate}.`
		)
	).toBeVisible();
});
