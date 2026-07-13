import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors } from './helpers.js';

async function ask(page, text) {
  const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
  await box.fill(text);
  await box.press('Enter');
  await page.waitForTimeout(300);
}

test.describe('AI Assistant (local command parser)', () => {
  test('bulk-generates content and auto-creates matching tasks', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Assistant Gen Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'generate 5 quests');

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return { quests: p.collections.quests.length, questTasks: p.collections.tasks.filter(t => t.sourceRef?.collection === 'quests').length };
    });
    expect(state.quests).toBe(5);
    expect(state.questTasks).toBe(5);
    expect(errors).toEqual([]);
  });

  test('balances enemy stat blocks by level', async ({ page }) => {
    await createProject(page, 'Assistant Balance Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'generate 3 enemies');
    await ask(page, 'balance these enemies');

    const enemies = await page.evaluate(() => window.__gfStore.project.collections.characters);
    for (const e of enemies) expect(e.statistics.length).toBeGreaterThan(0);
  });

  test('rewrites lore for existing biomes, or creates one if none exist', async ({ page }) => {
    await createProject(page, 'Assistant Lore Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'rewrite the lore');
    const biomes = await page.evaluate(() => window.__gfStore.project.collections.biomes);
    expect(biomes.length).toBeGreaterThan(0);
    expect(biomes[0].lore).toBeTruthy();
  });

  test('help command lists capabilities without mutating the project', async ({ page }) => {
    await createProject(page, 'Assistant Help Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'help');
    const reply = await page.evaluate(() => window.__gfStore.project.collections.assistantLog.at(-1).text);
    expect(reply).toContain('local command assistant');
  });

  test('audits an empty-ish project and reports gaps', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Assistant Audit Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'generate 2 quests');
    await ask(page, 'audit the project');
    const reply = await page.evaluate(() => window.__gfStore.project.collections.assistantLog.at(-1).text);
    expect(reply).toContain('audit');
    expect(reply).toMatch(/quest giver|rewards/);
    expect(errors).toEqual([]);
  });

  test('"suggest a genre mashup" seeds a pillar + USP from real research', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Genre Mashup Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    await ask(page, 'suggest a genre mashup');

    const reply = await page.evaluate(() => window.__gfStore.project.collections.assistantLog.at(-1).text);
    expect(reply).toContain('Genre mashup suggestion');

    const docs = await page.evaluate(() => window.__gfStore.project.collections.designDocs);
    const pillar = docs.find(d => d.subtype === 'pillar' && d.name.startsWith('Mashup Concept:'));
    const usp = docs.find(d => d.subtype === 'usp' && d.name.startsWith('USP:'));
    expect(pillar).toBeTruthy();
    expect(usp).toBeTruthy();
    expect(pillar.statement.length).toBeGreaterThan(20);
    expect(errors).toEqual([]);
  });

  test('generates the new multi-entity variants: legendary set, faction roster, boss gauntlet, continent, quest chain', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Assistant Variants Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);

    await ask(page, 'generate a legendary set');
    await ask(page, 'generate a faction roster');
    await ask(page, 'generate a boss gauntlet');
    await ask(page, 'generate a continent');
    await ask(page, 'generate a quest chain');

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return {
        items: p.collections.items,
        characters: p.collections.characters,
        biomes: p.collections.biomes,
        quests: p.collections.quests,
      };
    });
    expect(state.items.length).toBe(3);
    expect(new Set(state.items.map(i => i.subtype)).size).toBe(3);
    expect(state.characters.filter(c => c.subtype === 'npc').length).toBe(6);
    expect(state.characters.filter(c => c.subtype === 'boss').length).toBe(5);
    expect(state.biomes.length).toBe(1);
    expect(state.quests.length).toBe(5);
    expect(state.quests[1].prerequisiteQuests[0]).toBe(state.quests[0].id);
    expect(errors).toEqual([]);
  });
});
