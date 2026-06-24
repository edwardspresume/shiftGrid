import { expect, test } from '@playwright/test';

test('opens the add shift dialog from the global action', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Add Shift', exact: true }).click();

	const dialog = page.getByRole('dialog', { name: 'Add shift' });

	await expect(dialog).toBeVisible();
	await expect(dialog.getByLabel('Location')).toBeVisible();
	await expect(dialog.getByLabel('Date')).toBeVisible();
	await expect(dialog.getByLabel('Break')).toHaveValue('0');
	await expect(dialog.getByLabel('Start time')).toBeVisible();
	await expect(dialog.getByLabel('End time')).toBeVisible();
	await expect(dialog.getByRole('button', { name: 'Add shift' })).toBeVisible();
});
