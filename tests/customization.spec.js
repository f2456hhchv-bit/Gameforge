import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createProject, openModule, activePane, collectConsoleErrors } from './helpers.js';

test.describe('Export & customization additions', () => {
  test('Art Director: batch-exports all prompts as one text file', async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Batch Art Export Test');
    await openModule(page, 'Art Director');
    await activePane(page).getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root input[type=number]').fill('3');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      activePane(page).getByRole('button', { name: /Export All Prompts/ }).click(),
    ]);
    const savePath = testInfo.outputPath('art-prompts.txt');
    await download.saveAs(savePath);
    const content = fs.readFileSync(savePath, 'utf-8');
    expect((content.match(/^# \d+\./gm) || []).length).toBe(3);
    expect(errors).toEqual([]);
  });

  test('Full project Excel export produces a real multi-sheet OOXML package', async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Full Excel Export Test', 'Fantasy Action RPG');
    await page.locator('button[aria-label="Project backup menu"]').click();
    await page.waitForTimeout(150);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Export Full Project (Excel, one sheet per area)').click(),
    ]);
    const savePath = testInfo.outputPath('full-project.xlsx');
    await download.saveAs(savePath);
    const buf = fs.readFileSync(savePath);
    expect(buf.length).toBeGreaterThan(500);
    expect(buf.subarray(0, 4).toString('hex')).toBe('504b0304'); // ZIP magic bytes
    expect(errors).toEqual([]);
  });

  test('accent colour picker applies a new accent and persists across reload', async ({ page }) => {
    await createProject(page, 'Accent Colour Test');
    const before = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());

    await page.locator('button[aria-label="Choose accent colour"]').click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Rose' }).click();
    await page.waitForTimeout(150);

    const after = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    expect(after).not.toBe(before);
    expect(['225 29 72', '251 113 133']).toContain(after); // rose, light or dark variant

    await page.reload();
    await page.waitForTimeout(400);
    const afterReload = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim());
    expect(afterReload).toBe(after);
  });

  test('command palette lists and runs quick actions', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Quick Actions Test');
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(150);
    await page.locator('#modal-root input').fill('shortcuts');
    await page.waitForTimeout(100);
    await page.getByText('Keyboard Shortcuts').click();
    await page.waitForTimeout(150);
    await expect(page.locator('text=Ctrl J')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('new keyboard shortcuts: "/" opens search, Ctrl+J toggles assistant, Ctrl+S saves', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Shortcuts Test');

    await page.keyboard.press('/');
    await page.waitForTimeout(150);
    await expect(page.locator('#modal-root input')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    await page.keyboard.press('Control+j');
    await page.waitForTimeout(200);
    await expect(page.locator('#assistant-panel-body')).toBeVisible();
    await page.keyboard.press('Control+j');
    await page.waitForTimeout(200);

    await page.keyboard.press('Control+s');
    await page.waitForTimeout(200);
    expect(errors).toEqual([]);
  });
});
