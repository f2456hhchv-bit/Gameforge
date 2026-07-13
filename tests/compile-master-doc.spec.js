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

  test('Marketing One-Pager, Accessibility Statement and Post-Mortem generate real project data', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'New Doc Types Test', 'Fantasy Action RPG');

    await openModule(page, 'Documentation');
    await page.locator('.rounded-lg', { hasText: 'Marketing One-Pager' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: /Generate Now/ }).click();
    await page.waitForTimeout(200);
    let content = await page.evaluate(() => window.__gfStore.project.collections.docs.find(d => d.subtype === 'marketing-one-pager').content);
    expect(content).toContain('Marketing One-Pager');
    expect(content).toContain('Elevator Pitch');

    await page.locator('.rounded-lg', { hasText: 'Accessibility Statement' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: /Generate Now/ }).click();
    await page.waitForTimeout(200);
    content = await page.evaluate(() => window.__gfStore.project.collections.docs.find(d => d.subtype === 'accessibility-statement').content);
    expect(content).toContain('Coverage Checklist');

    await page.locator('.rounded-lg', { hasText: 'Post-Mortem' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: /Generate Now/ }).click();
    await page.waitForTimeout(200);
    content = await page.evaluate(() => window.__gfStore.project.collections.docs.find(d => d.subtype === 'post-mortem').content);
    expect(content).toContain('Milestones Hit');
    expect(content).toContain('What Went Well');
    expect(errors).toEqual([]);
  });

  test('Industry Research Brief doc generates real GOTY history and gap analysis', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Research Brief Test');
    await openModule(page, 'Documentation');
    await page.locator('.rounded-lg', { hasText: 'Industry Research Brief' }).click();
    await page.waitForTimeout(150);
    await page.getByRole('button', { name: /Generate Now/ }).click();
    await page.waitForTimeout(200);

    const content = await page.evaluate(() => window.__gfStore.project.collections.docs.find(d => d.subtype === 'research-brief').content);
    expect(content).toContain('Baldur\'s Gate 3');
    expect(content).toContain('Elden Ring');
    expect(content).toContain('Untried Combinations');
    expect(errors).toEqual([]);
  });
});
