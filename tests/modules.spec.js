import { test, expect } from '@playwright/test';
import { createProject, activePane, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Content modules — generate, link, verify', () => {
  test('World Builder generates a linkable place', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'World Module Test');
    await openModule(page, 'World Builder');
    await generateOne(page);
    const state = await projectState(page);
    expect(state.counts.biomes).toBe(1);
    expect(errors).toEqual([]);
  });

  test('Character Studio generates every subtype without crashing', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Character Module Test');
    await openModule(page, 'Character Studio');
    for (let i = 0; i < 7; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.characters).toBe(7);
    expect(errors).toEqual([]);
  });

  test('Item Studio bulk-generates and assigns rarity + subtype', async ({ page }) => {
    await createProject(page, 'Item Module Test');
    await openModule(page, 'Item Studio');
    await generateOne(page, { count: 10 });
    const items = await page.evaluate(() => window.__gfStore.project.collections.items);
    expect(items.length).toBe(10);
    for (const it of items) {
      expect(it.subtype).toBeTruthy();
      expect(it.rarity).toBeTruthy();
      expect(it.createdAt).toBeTruthy();
    }
  });

  test('enemy loot drops link to items and show up as a backlink', async ({ page }) => {
    await createProject(page, 'Backlink Test');
    await openModule(page, 'Item Studio');
    await generateOne(page);
    await openModule(page, 'Character Studio');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root select').nth(1).selectOption('enemy');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    await activePane(page).locator('div.cursor-pointer.rounded-lg').first().click();
    await page.waitForTimeout(200);
    const dropsSelect = activePane(page).locator('select', { hasText: '+ Link Drops' });
    await dropsSelect.selectOption({ index: 1 });
    await activePane(page).getByRole('button', { name: '💾 Save' }).click();
    await page.waitForTimeout(250);

    await openModule(page, 'Item Studio');
    await activePane(page).locator('div.cursor-pointer.rounded-lg').first().click();
    await page.waitForTimeout(200);
    await expect(activePane(page).locator('text=Referenced By')).toBeVisible();
  });

  test('Quest Designer generates a quest with stages', async ({ page }) => {
    await createProject(page, 'Quest Module Test');
    await openModule(page, 'Quest Designer');
    await generateOne(page);
    const quests = await page.evaluate(() => window.__gfStore.project.collections.quests);
    expect(quests.length).toBe(1);
    expect(quests[0].stages.length).toBeGreaterThan(0);
  });

  test('Task Manager: generating content elsewhere auto-creates a linked task', async ({ page }) => {
    await createProject(page, 'Auto Task Test');
    await openModule(page, 'Item Studio');
    await generateOne(page);
    const tasks = await page.evaluate(() => window.__gfStore.project.collections.tasks);
    expect(tasks.length).toBe(1);
    expect(tasks[0].sourceRef?.collection).toBe('items');
  });

  test('Documentation: GDD generates and includes seeded content', async ({ page }) => {
    await createProject(page, 'Docs Test', 'Fantasy Action RPG');
    await openModule(page, 'Documentation');
    await page.getByText('Game Design Document', { exact: true }).click();
    await page.waitForTimeout(200);
    await page.getByRole('button', { name: '✨ Generate Now' }).click();
    await page.waitForTimeout(200);
    const content = await page.locator('textarea').first().inputValue();
    expect(content).toContain('Game Design Document');
    expect(content).toContain('Game Pillars');
  });
});
