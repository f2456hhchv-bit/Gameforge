import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, projectState } from './helpers.js';

test.describe('Starter templates', () => {
  test('Fantasy Action RPG seeds cross-linked content and one undo step', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Fantasy Template Test', 'Fantasy Action RPG');
    const state = await projectState(page);
    expect(state.meta.genre).toBe('Action RPG');
    expect(state.counts.characters).toBeGreaterThan(0);
    expect(state.counts.items).toBeGreaterThan(0);
    expect(state.counts.quests).toBeGreaterThan(0);

    const boss = await page.evaluate(() => window.__gfStore.project.collections.characters.find(c => c.subtype === 'boss'));
    expect(boss.links.drops.length).toBeGreaterThan(0);
    expect(boss.links.spawnBiome).toBeTruthy();

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    const afterUndo = await projectState(page);
    expect(afterUndo.counts.characters).toBe(0);
    expect(afterUndo.counts.items).toBe(0);

    await page.keyboard.press('Control+Shift+z');
    await page.waitForTimeout(200);
    const afterRedo = await projectState(page);
    expect(afterRedo.counts.characters).toBe(state.counts.characters);

    expect(errors).toEqual([]);
  });

  test('Sci-Fi Shooter, Metroidvania and Cozy Life Sim all seed without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    for (const label of ['Sci-Fi Shooter', 'Metroidvania', 'Cozy Life Sim']) {
      await createProject(page, `${label} Test`, label);
      const state = await projectState(page);
      expect(state.counts.characters).toBeGreaterThan(0);
      expect(state.counts.designDocs).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });

  test('all 9 new genre templates seed without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const labels = [
      'Horror Survival', 'Puzzle-Platformer', 'Tower Defense', 'Roguelike', 'Visual Novel',
      'Strategy / 4X', 'Card Game / Deckbuilder', 'Farming Sim', 'Battle Royale',
    ];
    for (const label of labels) {
      await createProject(page, `${label} Test`, label);
      const state = await projectState(page);
      expect(state.counts.designDocs, `${label}: designDocs`).toBeGreaterThan(0);
      expect(state.counts.quests, `${label}: quests`).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });

  test('all 6 research-backed hybrid templates seed without errors', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    const labels = [
      'Cozy Extraction', 'Grand Tactics', 'Narrative Roguelite',
      'Deckbuilder Explorer', 'Branching Asymmetric Horror', 'Co-op Soulslike',
    ];
    for (const label of labels) {
      await createProject(page, `${label} Test`, label);
      const state = await projectState(page);
      expect(state.counts.designDocs, `${label}: designDocs`).toBeGreaterThan(0);
      expect(state.counts.quests, `${label}: quests`).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });

  test('Blank Project starts empty and records no undo step', async ({ page }) => {
    await createProject(page, 'Blank Template Test', 'Blank Project');
    const state = await projectState(page);
    for (const [key, count] of Object.entries(state.counts)) {
      if (key === 'activityLog') continue;
      expect(count, `${key} should start empty`).toBe(0);
    }
    const canUndo = await page.evaluate(() => window.__gfStore.canUndo());
    expect(canUndo).toBe(false);
  });
});
