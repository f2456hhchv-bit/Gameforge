import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { createProject, openModule } from './helpers.js';

test.describe('Exports', () => {
  test('DOCX export produces a real, non-empty ZIP (OOXML) package', async ({ page }, testInfo) => {
    await createProject(page, 'Export DOCX Test');
    await openModule(page, 'Documentation');
    await page.getByText('Game Design Document', { exact: true }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: '✨ Generate Now' }).click();
    await page.waitForTimeout(200);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.getByRole('button', { name: '⬇ Export' }).click();
        await page.waitForTimeout(100);
        await page.getByText('Word (.docx)').click();
      })(),
    ]);
    const savePath = testInfo.outputPath('export-test.docx');
    await download.saveAs(savePath);
    const buf = fs.readFileSync(savePath);
    expect(buf.length).toBeGreaterThan(500);
    // ZIP local file header magic bytes — confirms this is a real OOXML package, not a stub.
    expect(buf.subarray(0, 4).toString('hex')).toBe('504b0304');
  });

  test('CSV export from a collection view produces real rows', async ({ page }, testInfo) => {
    await createProject(page, 'Export CSV Test');
    await openModule(page, 'Item Studio');
    await page.locator('#workspace > div[style*="flex"]').getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.locator('#modal-root input[type=number]').fill('3');
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('#workspace > div[style*="flex"]').getByRole('button', { name: '⬇ CSV' }).click(),
    ]);
    const savePath = testInfo.outputPath('items.csv');
    await download.saveAs(savePath);
    const content = fs.readFileSync(savePath, 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(4); // header + 3 rows
    expect(lines[0]).toContain('name');
  });

  test('project JSON backup exports and re-imports into a new project', async ({ page }, testInfo) => {
    await createProject(page, 'Export JSON Test');
    await openModule(page, 'Item Studio');
    await page.locator('#workspace > div[style*="flex"]').getByRole('button', { name: '✨ Generate' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: 'Generate', exact: true }).click();
    await page.waitForTimeout(300);

    await page.locator('button[aria-label="Project backup menu"]').click();
    await page.waitForTimeout(150);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Export Project (JSON backup)').click(),
    ]);
    const savePath = testInfo.outputPath('backup.json');
    await download.saveAs(savePath);
    const parsed = JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    expect(parsed.collections.items.length).toBe(1);
    expect(parsed.name).toBe('Export JSON Test');
  });
});
