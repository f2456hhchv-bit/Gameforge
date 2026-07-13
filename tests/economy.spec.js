import { test, expect } from '@playwright/test';
import { createProject, activePane, collectConsoleErrors, openModule, generateOne } from './helpers.js';

test.describe('Economy balancing tools', () => {
  test('Drop Rate Simulator previews the real rarity weights without creating any items', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Drop Rate Test');
    await openModule(page, 'Item Studio');
    await activePane(page).getByRole('button', { name: 'Drop Rate Simulator' }).click();
    await page.waitForTimeout(200);
    await expect(page.locator('#modal-root')).toContainText('Drop Rate Simulator');
    await expect(page.locator('#modal-root')).toContainText('Table weights');

    const itemCount = await page.evaluate(() => window.__gfStore.project.collections.items.length);
    expect(itemCount).toBe(0);

    // Re-run with a custom sample size.
    await page.locator('#modal-root input[type=number]').fill('500');
    await page.getByRole('button', { name: 'Simulate', exact: true }).click();
    await page.waitForTimeout(150);
    await expect(page.locator('#modal-root')).toContainText('500 simulated rolls');
    expect(errors).toEqual([]);
  });

  test('Economy Report generator computes real totals from live project data', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Economy Report Test');

    await openModule(page, 'Item Studio');
    await generateOne(page, { count: 5 });
    await openModule(page, 'Quest Designer');
    await generateOne(page, { count: 3 });

    await openModule(page, 'Game Designer');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root select').first().selectOption({ label: 'Generate Economy Report (from live project data)' });
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    const report = await page.evaluate(() => window.__gfStore.project.collections.designDocs.find(d => d.subtype === 'economy'));
    expect(report).toBeTruthy();
    expect(report.totalQuestRewardXP).toBeGreaterThan(0);
    expect(report.rarityDistribution.length).toBe(6);
    expect(report.sources.length).toBeGreaterThan(0);
    expect(report.sinks.length).toBeGreaterThan(0);
    expect(errors).toEqual([]);
  });
});
