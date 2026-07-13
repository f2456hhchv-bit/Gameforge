import { test, expect } from '@playwright/test';
import { createProject, openModule, activePane, collectConsoleErrors } from './helpers.js';

test.describe('Smart auto-linking suggestions', () => {
  test('dashboard suggests and applies an unambiguous quest-giver link', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Auto Link Dashboard Test');

    // Generate the quest FIRST (while no characters/biomes exist yet, so the
    // base quest generator can't auto-assign a giver/location itself) — then
    // add a biome and an NPC spawned there, and set only the quest's location,
    // leaving the giver as the one real gap for auto-linking to fill.
    await openModule(page, 'Quest Designer');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    await openModule(page, 'World Builder');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);
    const biomeId = await page.evaluate(() => window.__gfStore.project.collections.biomes[0].id);

    await openModule(page, 'Character Studio');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root select').nth(1).selectOption({ label: 'NPC' });
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);
    await page.evaluate((bid) => {
      const npc = window.__gfStore.project.collections.characters[0];
      npc.links.spawnBiome = bid;
      window.__gfStore.touch();
    }, biomeId);

    await page.evaluate((bid) => {
      const quest = window.__gfStore.project.collections.quests[0];
      quest.links.location = bid;
      quest.links.giver = null;
      window.__gfStore.touch();
    }, biomeId);

    await openModule(page, 'Dashboard');
    await page.waitForTimeout(300);
    await expect(page.getByRole('heading', { name: 'Auto-Link Suggestions' })).toBeVisible();

    const linkCard = page.locator('.card', { has: page.getByRole('heading', { name: 'Auto-Link Suggestions' }) });
    await expect(linkCard.locator('text=/→ giver:/')).toBeVisible();
    await linkCard.getByRole('button', { name: 'Apply' }).first().click();
    await page.waitForTimeout(300);

    const quest = await page.evaluate(() => window.__gfStore.project.collections.quests[0]);
    expect(quest.links.giver).toBeTruthy();
    expect(errors).toEqual([]);
  });

  test('assistant "auto-link" command applies suggestions in bulk', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Auto Link Assistant Test');

    await openModule(page, 'World Builder');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    await openModule(page, 'Character Studio');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root select').nth(1).selectOption({ label: 'Enemy' });
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('auto-link things');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const enemy = await page.evaluate(() => window.__gfStore.project.collections.characters[0]);
    expect(enemy.links.spawnBiome).toBeTruthy();
    expect(errors).toEqual([]);
  });
});
