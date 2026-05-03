import { test, expect } from '@playwright/test';

test('landing page loads successfully', async ({ page }) => {
  await page.goto('/is');
  await expect(page.getByRole('heading', { name: 'Byrjaðu að smíða með Forge' })).toBeVisible();
});

test('can switch to english', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: 'Start building with Forge' })).toBeVisible();
});

test('auth modal opens', async ({ page }) => {
  await page.goto('/is');
  await page.getByRole('button', { name: 'Byrja núna' }).click();
  await expect(page.getByRole('heading', { name: 'Skrá inn á Forge' })).toBeVisible();
});
