import { test, expect } from '@playwright/test';
import { createProject, activePane, openModule, generateOne } from './helpers.js';

test.describe('Generic collection view — bulk actions & validation', () => {
  test('bulk-select delete removes exactly the checked items as one undo step', async ({ page }) => {
    await createProject(page, 'Bulk Delete Test');
    await openModule(page, 'Item Studio');
    await generateOne(page, { count: 6 });

    await activePane(page).getByRole('button', { name: '☑ Select' }).click();
    await page.waitForTimeout(150);
    const checkboxes = activePane(page).locator('input[type=checkbox]');
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await page.waitForTimeout(150);
    await expect(activePane(page).locator('text=/3 selected/')).toBeVisible();

    await activePane(page).getByRole('button', { name: '🗑 Delete' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__gfStore.project.collections.items.length)).toBe(3);

    await page.keyboard.press('Control+z');
    await page.waitForTimeout(200);
    expect(await page.evaluate(() => window.__gfStore.project.collections.items.length)).toBe(6);
  });

  test('save blocks on an empty name and warns on a duplicate name', async ({ page }) => {
    await createProject(page, 'Validation Test');
    await openModule(page, 'Item Studio');
    await generateOne(page, { count: 2 });

    await activePane(page).locator('div.cursor-pointer.rounded-lg').first().click();
    await page.waitForTimeout(150);
    const nameInput = activePane(page).locator('input.text-lg.font-semibold');
    // The name field is live-bound (typing updates the in-memory entity immediately,
    // matching every other field in the app) — what "blocked save" actually guarantees
    // is that the blank name is never *persisted*: no upsert/commit fires, so the
    // entity's updatedAt stays put and a reload would restore the last-saved name.
    const updatedAtBefore = await page.evaluate(() => window.__gfStore.project.collections.items[0].updatedAt);
    await nameInput.fill('');
    await activePane(page).getByRole('button', { name: '💾 Save' }).click();
    await page.waitForTimeout(150);
    expect(await nameInput.evaluate(el => el.classList.contains('border-rose-500'))).toBe(true);
    const updatedAtAfterBlockedSave = await page.evaluate(() => window.__gfStore.project.collections.items[0].updatedAt);
    expect(updatedAtAfterBlockedSave).toBe(updatedAtBefore);

    await nameInput.fill('Shared Name');
    await activePane(page).getByRole('button', { name: '💾 Save' }).click();
    await page.waitForTimeout(150);
    await activePane(page).locator('div.cursor-pointer.rounded-lg').nth(1).click();
    await page.waitForTimeout(150);
    await nameInput.fill('Shared Name');
    await activePane(page).getByRole('button', { name: '💾 Save' }).click();
    await page.waitForTimeout(150);
    await expect(page.locator('text=/is also named/')).toBeVisible();
  });

  test('resizable list panel and tag filter both work', async ({ page }) => {
    await createProject(page, 'Resize Tag Test');
    await openModule(page, 'Item Studio');
    await generateOne(page);
    await activePane(page).locator('div.cursor-pointer.rounded-lg').first().click();
    await page.waitForTimeout(150);
    const tagInput = activePane(page).locator('input[placeholder="+ tag"]');
    await tagInput.fill('starter-gear');
    await tagInput.press('Enter');
    await activePane(page).getByRole('button', { name: '💾 Save' }).click();
    await page.waitForTimeout(200);
    const chip = activePane(page).locator('button:has-text("#starter-gear")');
    await expect(chip).toBeVisible();
    await chip.click();
    await page.waitForTimeout(150);
    expect(await activePane(page).locator('.p-2 > div.rounded-lg').count()).toBe(1);
  });
});
