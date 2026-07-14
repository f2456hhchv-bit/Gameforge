import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Localization Manager module', () => {
  test('generates strings across subtypes with source text and target languages', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Localization Module Test');
    await openModule(page, 'Localization Manager');
    for (let i = 0; i < 14; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.locStrings).toBe(14);

    const strings = await page.evaluate(() => window.__gfStore.project.collections.locStrings);
    for (const s of strings) {
      expect(s.sourceText).toBeTruthy();
      expect(s.targetLanguages.length).toBeGreaterThan(0);
      expect(s.translationStatus).toBe('Not Started');
    }
    expect(new Set(strings.map(s => s.subtype)).size).toBe(14);
    expect(errors).toEqual([]);
  });

  test('an item-name loc string pulls the real name of an existing item', async ({ page }) => {
    await createProject(page, 'Localization Link Test');
    await openModule(page, 'Item Studio');
    await generateOne(page);
    const itemName = await page.evaluate(() => window.__gfStore.project.collections.items[0].name);

    await openModule(page, 'Localization Manager');
    await generateOne(page, { subtypeIndex: 2 }); // item-name
    const sourceText = await page.evaluate(() => window.__gfStore.project.collections.locStrings[0].sourceText);
    expect(sourceText).toBe(itemName);
  });

  test('assistant "generate 3 localization strings" command works', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Localization Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate 3 localization strings');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => window.__gfStore.project.collections.locStrings.length);
    expect(state).toBe(3);
    expect(errors).toEqual([]);
  });
});
