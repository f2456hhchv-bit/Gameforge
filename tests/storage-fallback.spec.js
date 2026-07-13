import { test, expect } from '@playwright/test';
import { collectConsoleErrors, activePane } from './helpers.js';

// Firefox blocks IndexedDB entirely under a file:// origin, and some
// locked-down browsers/extensions do too. Without a fallback, the app used
// to go completely blank with only a silent console error. This guards
// against that regressing.
test.describe('Storage fallback (IndexedDB unavailable)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
    });
  });

  test('app still boots, warns, and stays usable when IndexedDB is unavailable', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/index.html');
    await page.waitForTimeout(500);

    await expect(page.locator('input[placeholder*="Ashfall"]')).toBeVisible();
    await expect(page.locator('text=/blocked local storage/')).toBeVisible();

    await page.locator('input[placeholder*="Ashfall"]').fill('Fallback Test');
    await page.locator('input[placeholder*="Ashfall"]').press('Enter');
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Blank Project")').click();
    await page.waitForTimeout(400);

    await expect(page.locator('h1').first()).toHaveText('Fallback Test');
    await expect(page.locator('text=/blocked local storage/')).toBeVisible();

    await page.locator('#sidebar-nav .nav-item', { hasText: 'Item Studio' }).click();
    await page.waitForTimeout(200);
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__gfStore.project.collections.items.length)).toBe(1);

    expect(errors).toEqual([]);
  });

  test('the warning banner is dismissible', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForTimeout(500);
    const banner = page.locator('text=/blocked local storage/');
    await expect(banner).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss warning' }).click();
    await expect(banner).toHaveCount(0);
  });
});
