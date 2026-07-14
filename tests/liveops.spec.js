import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('LiveOps Calendar module', () => {
  test('generates events across subtypes with a theme, date range and rewards', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'LiveOps Module Test');
    await openModule(page, 'LiveOps Calendar');
    for (let i = 0; i < 8; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.liveOpsEvents).toBe(8);

    const events = await page.evaluate(() => window.__gfStore.project.collections.liveOpsEvents);
    for (const e of events) {
      expect(e.name).toBeTruthy();
      expect(e.startDate).toBeTruthy();
      expect(e.endDate).toBeTruthy();
      expect(e.rewards.length).toBeGreaterThan(0);
      expect(e.status).toBeTruthy();
    }
    expect(new Set(events.map(e => e.subtype)).size).toBe(8);
    expect(errors).toEqual([]);
  });

  test('a liveops event can feature existing items', async ({ page }) => {
    await createProject(page, 'LiveOps Link Test');
    await openModule(page, 'Item Studio');
    await generateOne(page, { count: 3 });
    await openModule(page, 'LiveOps Calendar');
    await generateOne(page, { count: 10 });
    const linked = await page.evaluate(() => window.__gfStore.project.collections.liveOpsEvents.filter(e => e.links?.featuredItems?.length));
    expect(linked.length).toBeGreaterThan(0);
  });

  test('assistant "generate a seasonal event" command works', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'LiveOps Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate a seasonal event');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => window.__gfStore.project.collections.liveOpsEvents.length);
    expect(state).toBe(1);
    expect(errors).toEqual([]);
  });
});
