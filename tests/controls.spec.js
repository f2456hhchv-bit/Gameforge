import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Controls Mapping module', () => {
  test('generates bindings across all input subtypes with a default binding', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Controls Module Test');
    await openModule(page, 'Controls Mapping');
    for (let i = 0; i < 8; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.controlBindings).toBe(8);

    const bindings = await page.evaluate(() => window.__gfStore.project.collections.controlBindings);
    for (const b of bindings) {
      expect(b.actionName).toBeTruthy();
      expect(b.defaultBinding).toBeTruthy();
      expect(b.context).toBeTruthy();
    }
    expect(new Set(bindings.map(b => b.subtype)).size).toBe(8);
    expect(errors).toEqual([]);
  });

  test('the standard action set generator drafts 6 core actions in sequence', async ({ page }) => {
    await createProject(page, 'Controls Set Test');
    await openModule(page, 'Controls Mapping');
    const pane = page.locator('#workspace > div[style*="flex"]');
    await pane.getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root select').nth(0).selectOption({ index: 1 }); // "Generate Standard Action Set"
    await page.locator('#modal-root input[type=number]').fill('6');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(250);

    const bindings = await page.evaluate(() => window.__gfStore.project.collections.controlBindings);
    expect(bindings.length).toBe(6);
    const names = new Set(bindings.map(b => b.actionName));
    expect(names.has('Jump')).toBe(true);
    expect(names.has('Pause Menu')).toBe(true);
  });

  test('assistant "generate 3 control bindings" command works', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Controls Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate 3 control bindings');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => window.__gfStore.project.collections.controlBindings.length);
    expect(state).toBe(3);
    expect(errors).toEqual([]);
  });
});
