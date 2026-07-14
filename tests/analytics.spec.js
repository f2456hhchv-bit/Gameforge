import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Analytics Designer module', () => {
  test('generates telemetry events across subtypes with snake_case names and typed parameters', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Analytics Module Test');
    await openModule(page, 'Analytics Designer');
    for (let i = 0; i < 14; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.telemetryEvents).toBe(14);

    const events = await page.evaluate(() => window.__gfStore.project.collections.telemetryEvents);
    for (const e of events) {
      expect(e.eventName).toMatch(/^[a-z]+(_[a-z]+)*$/);
      expect(e.parameters.length).toBeGreaterThan(0);
      expect(e.funnelStage).toBeTruthy();
      expect(e.platformScope.length).toBeGreaterThan(0);
    }
    expect(new Set(events.map(e => e.subtype)).size).toBe(14);
    expect(errors).toEqual([]);
  });

  test('assistant "generate 4 telemetry events" command works and auto-creates a code task', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Analytics Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate 4 telemetry events');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return { events: p.collections.telemetryEvents.length, tasks: p.collections.tasks.filter(t => t.sourceRef?.collection === 'telemetryEvents' && t.category === 'code').length };
    });
    expect(state.events).toBe(4);
    expect(state.tasks).toBe(4);
    expect(errors).toEqual([]);
  });
});
