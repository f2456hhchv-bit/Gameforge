import { test, expect } from '@playwright/test';
import { createProject, activePane, collectConsoleErrors, openModule } from './helpers.js';

test.describe('App boot & shell', () => {
  test('creates a project from the welcome screen and shows the dashboard', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Smoke Test Project');
    await expect(page.locator('h1')).toHaveText('Smoke Test Project');
    expect(errors).toEqual([]);
  });

  test('every module tab opens without a fatal error', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Nav Test');
    const modules = [
      'Relationship Graph', 'Game Designer', 'World Builder', 'Character Studio', 'Item Studio',
      'Combat Designer', 'Level Designer', 'Quest Designer', 'Art Director', 'UI Designer',
      'Audio Designer', 'Task Manager', 'Documentation',
    ];
    for (const m of modules) {
      await openModule(page, m);
      await expect(page.locator('text=/still under construction/')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });

  test('dark mode toggle persists across reload', async ({ page }) => {
    await createProject(page, 'Theme Test');
    const wasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    await page.getByRole('button', { name: /Switch to (light|dark) mode/ }).click();
    await page.waitForTimeout(150);
    const isDarkNow = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkNow).toBe(!wasDark);
    await page.reload();
    await page.waitForTimeout(400);
    const isDarkAfterReload = await page.evaluate(() => document.documentElement.classList.contains('dark'));
    expect(isDarkAfterReload).toBe(isDarkNow);
  });

  test('project data persists across a full page reload', async ({ page }) => {
    await createProject(page, 'Persistence Test');
    await openModule(page, 'Item Studio');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root input[type=number]').fill('4');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(700); // allow the debounced autosave to flush

    const before = await page.evaluate(() => window.__gfStore.project.collections.items.length);
    await page.reload();
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => window.__gfStore.project.collections.items.length);
    expect(after).toBe(before);
    expect(before).toBe(4);
  });
});
