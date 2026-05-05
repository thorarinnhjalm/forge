import { test, expect } from '@playwright/test';

test('landing page loads successfully', async ({ page }) => {
  await page.goto('/is');
  await expect(page.getByRole('heading', { name: 'Hættu að dreyma, byrjaðu að smíða' })).toBeVisible();
});

test('can switch to english', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: 'Stop dreaming, start building' })).toBeVisible();
});

test('sign in navigates to dashboard', async ({ page }) => {
  await page.goto('/is');
  await page.getByRole('button', { name: 'Skrá inn' }).click();
  await expect(page).toHaveURL(/.*\/dashboard/);
});
