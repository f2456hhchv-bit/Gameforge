import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createProject, openModule, collectConsoleErrors } from './helpers.js';

test.describe('Master document compilation', () => {
  test('compiles every doc type into one exportable document', async ({ page }, testInfo) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Compile Test', 'Fantasy Action RPG');
    await openModule(page, 'Documentation');
    await page.getByRole('button', { name: '📚 Compile Master Document' }).click();
    await page.waitForTimeout(300);

    const preview = page.locator('#modal-root textarea');
    const content = await preview.inputValue();
    expect(content).toContain('Master Design Compendium');
    expect(content).toContain('Game Design Document');
    expect(content).toContain('Technical Design Document');
    expect(content).toContain('Lore Bible');
    expect(content).toContain('Patch Notes');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: '⬇ Markdown (.md)' }).click(),
    ]);
    const savePath = testInfo.outputPath('master-compendium.md');
    await download.saveAs(savePath);
    expect(fs.readFileSync(savePath, 'utf-8').length).toBeGreaterThan(500);
    expect(errors).toEqual([]);
  });
});
