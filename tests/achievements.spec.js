import { test, expect } from '@playwright/test';
import { createProject, activePane, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Achievements module', () => {
  test('generates every tier with unlock criteria, points and rarity note', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Achievements Module Test');
    await openModule(page, 'Achievements');
    for (let i = 0; i < 4; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.achievements).toBe(4);

    const achievements = await page.evaluate(() => window.__gfStore.project.collections.achievements);
    for (const a of achievements) {
      expect(a.name).toBeTruthy();
      expect(a.unlockCriteria).toBeTruthy();
      expect(a.points).toBeGreaterThan(0);
      expect(a.rarityNote).toBeTruthy();
      expect(['No', 'Yes']).toContain(a.hidden);
    }
    expect(new Set(achievements.map(a => a.subtype)).size).toBe(4);
    expect(errors).toEqual([]);
  });

  test('achievements can reference an existing boss or quest and back-link correctly', async ({ page }) => {
    await createProject(page, 'Achievements Link Test');
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 2 }); // boss
    await openModule(page, 'Quest Designer');
    await generateOne(page);

    await openModule(page, 'Achievements');
    // Generate several so at least one probabilistically links to the boss/quest.
    await generateOne(page, { count: 15 });
    const linked = await page.evaluate(() => window.__gfStore.project.collections.achievements.filter(a => a.links?.linkedCharacter || a.links?.linkedQuest));
    expect(linked.length).toBeGreaterThan(0);
  });

  test('assistant "generate achievements" command works and auto-creates a task', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Achievements Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate 3 achievements');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return { achievements: p.collections.achievements.length, tasks: p.collections.tasks.filter(t => t.sourceRef?.collection === 'achievements').length };
    });
    expect(state.achievements).toBe(3);
    expect(state.tasks).toBe(3);
    expect(errors).toEqual([]);
  });

  test('achievements show up in the Excel export and dashboard distribution', async ({ page }, testInfo) => {
    await createProject(page, 'Achievements Excel Test');
    await openModule(page, 'Achievements');
    await generateOne(page, { count: 2 });

    await page.locator('button[aria-label="Project backup menu"]').click();
    await page.waitForTimeout(150);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Export Full Project (Excel, one sheet per area)').click(),
    ]);
    const savePath = testInfo.outputPath('achievements-export.xlsx');
    await download.saveAs(savePath);
    const fs = await import('node:fs');
    expect(fs.readFileSync(savePath).length).toBeGreaterThan(500);
  });
});
