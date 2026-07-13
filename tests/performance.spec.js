import { test, expect } from '@playwright/test';
import { createProject, activePane, openModule } from './helpers.js';

// Generous thresholds — these exist to catch an accidental O(n^2) regression
// (e.g. a full list re-render on every keystroke) landing unnoticed, not to
// chase milliseconds. A healthy machine should clear all of these easily.
test.describe('Performance at scale', () => {
  test('200 items: list renders, search filters, and detail opens quickly', async ({ page }) => {
    await createProject(page, 'Perf Items Test');
    await openModule(page, 'Item Studio');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root input[type=number]').fill('200');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__gfStore.project.collections.items.length)).toBe(200);

    const searchInput = activePane(page).locator('input[placeholder*="Search"]');
    const t0 = Date.now();
    await searchInput.fill('a');
    await page.waitForTimeout(20);
    expect(Date.now() - t0).toBeLessThan(1000);

    const t1 = Date.now();
    await activePane(page).locator('div.cursor-pointer.rounded-lg').first().click();
    await page.waitForTimeout(20);
    expect(Date.now() - t1).toBeLessThan(1000);
  });

  test('550+ entities: relationship graph and task board still render promptly', async ({ page }) => {
    await createProject(page, 'Perf Graph Test');
    for (const [module, count, subtypeIndex] of [
      ['Item Studio', 150, null], ['Character Studio', 150, 1], ['World Builder', 80, 0], ['Quest Designer', 40, null],
    ]) {
      await openModule(page, module);
      await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
      await page.waitForTimeout(150);
      if (subtypeIndex != null) await page.locator('#modal-root select').nth(1).selectOption({ index: subtypeIndex });
      await page.locator('#modal-root input[type=number]').fill(String(count));
      await page.getByRole('button', { name: 'Generate', exact: true }).click();
      await page.waitForTimeout(400);
    }

    const t0 = Date.now();
    await openModule(page, 'Relationship Graph');
    await activePane(page).locator('svg circle').first().waitFor({ timeout: 10000 });
    expect(Date.now() - t0).toBeLessThan(5000);
    expect(await activePane(page).locator('svg circle').count()).toBeGreaterThan(400);

    const t1 = Date.now();
    await openModule(page, 'Task Manager');
    await page.waitForTimeout(50);
    expect(Date.now() - t1).toBeLessThan(2000);
  });
});
