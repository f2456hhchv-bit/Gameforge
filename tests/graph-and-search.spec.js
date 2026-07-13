import { test, expect } from '@playwright/test';
import { createProject, activePane, openModule, collectConsoleErrors } from './helpers.js';

test.describe('Relationship graph & global search', () => {
  test('graph reflects seeded template content and supports filtering + navigation', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Graph Test', 'Fantasy Action RPG');
    await openModule(page, 'Relationship Graph');
    await page.waitForTimeout(400);

    const nodeCount = await activePane(page).locator('svg circle').count();
    expect(nodeCount).toBeGreaterThan(0);

    await activePane(page).locator('button.badge', { hasText: '🗡️' }).click();
    await page.waitForTimeout(250);
    const nodeCountAfterFilter = await activePane(page).locator('svg circle').count();
    expect(nodeCountAfterFilter).toBeLessThan(nodeCount);

    await activePane(page).locator('svg circle').first().click({ force: true });
    await page.waitForTimeout(250);
    const activeModule = await page.evaluate(() => document.querySelector('#sidebar-nav .nav-item.active')?.textContent);
    expect(activeModule).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('command palette finds an entity by name and jumps to it', async ({ page }) => {
    await createProject(page, 'Search Test', 'Fantasy Action RPG');
    const questName = await page.evaluate(() => window.__gfStore.project.collections.quests[0].name);
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(200);
    await page.locator('#modal-root input').fill(questName.split(' ')[0]);
    await page.waitForTimeout(200);
    await page.locator('.ctx-menu-item', { hasText: questName }).first().click();
    await page.waitForTimeout(250);
    const activeModule = await page.evaluate(() => document.querySelector('#sidebar-nav .nav-item.active')?.textContent);
    expect(activeModule).toContain('Quest Designer');
  });
});
