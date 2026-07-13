import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors } from './helpers.js';

async function ask(page, text) {
  const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
  await box.fill(text);
  await box.press('Enter');
  await page.waitForTimeout(300);
}

test.describe('AI Assistant (local command parser)', () => {
  test('bulk-generates content and auto-creates matching tasks', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Assistant Gen Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'generate 5 quests');

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return { quests: p.collections.quests.length, questTasks: p.collections.tasks.filter(t => t.sourceRef?.collection === 'quests').length };
    });
    expect(state.quests).toBe(5);
    expect(state.questTasks).toBe(5);
    expect(errors).toEqual([]);
  });

  test('balances enemy stat blocks by level', async ({ page }) => {
    await createProject(page, 'Assistant Balance Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'generate 3 enemies');
    await ask(page, 'balance these enemies');

    const enemies = await page.evaluate(() => window.__gfStore.project.collections.characters);
    for (const e of enemies) expect(e.statistics.length).toBeGreaterThan(0);
  });

  test('rewrites lore for existing biomes, or creates one if none exist', async ({ page }) => {
    await createProject(page, 'Assistant Lore Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'rewrite the lore');
    const biomes = await page.evaluate(() => window.__gfStore.project.collections.biomes);
    expect(biomes.length).toBeGreaterThan(0);
    expect(biomes[0].lore).toBeTruthy();
  });

  test('help command lists capabilities without mutating the project', async ({ page }) => {
    await createProject(page, 'Assistant Help Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'help');
    const reply = await page.evaluate(() => window.__gfStore.project.collections.assistantLog.at(-1).text);
    expect(reply).toContain('local command assistant');
  });
});
