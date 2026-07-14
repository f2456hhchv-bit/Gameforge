import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Playtesting Tracker module', () => {
  test('generates sessions across subtypes with findings, bugs and a sentiment score', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Playtests Module Test');
    await openModule(page, 'Playtesting Tracker');
    for (let i = 0; i < 13; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.playtestSessions).toBe(13);

    const sessions = await page.evaluate(() => window.__gfStore.project.collections.playtestSessions);
    for (const s of sessions) {
      expect(s.name).toBeTruthy();
      expect(s.keyFindings).toBeTruthy();
      expect(s.testerCount).toBeGreaterThan(0);
      expect(s.sentimentScore).toBeGreaterThanOrEqual(1);
      expect(s.sentimentScore).toBeLessThanOrEqual(10);
    }
    expect(new Set(sessions.map(s => s.subtype)).size).toBe(13);
    expect(errors).toEqual([]);
  });

  test('a playtest session can link to an existing level under test', async ({ page }) => {
    await createProject(page, 'Playtests Link Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Playtesting Tracker');
    await generateOne(page, { count: 15 });
    const linked = await page.evaluate(() => window.__gfStore.project.collections.playtestSessions.filter(s => s.links?.levelTested));
    expect(linked.length).toBeGreaterThan(0);
  });

  test('assistant "generate 2 playtests" command works and auto-creates a QA task', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Playtests Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate 2 playtests');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return { sessions: p.collections.playtestSessions.length, tasks: p.collections.tasks.filter(t => t.sourceRef?.collection === 'playtestSessions' && t.category === 'qa').length };
    });
    expect(state.sessions).toBe(2);
    expect(state.tasks).toBe(2);
    expect(errors).toEqual([]);
  });
});
