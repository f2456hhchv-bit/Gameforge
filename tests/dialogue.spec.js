import { test, expect } from '@playwright/test';
import { createProject, collectConsoleErrors, openModule, generateOne, projectState } from './helpers.js';

test.describe('Dialogue Tree Designer module', () => {
  test('generates every node type with a scene name and line/choice text', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Dialogue Module Test');
    await openModule(page, 'Dialogue Tree Designer');
    for (let i = 0; i < 6; i++) await generateOne(page, { subtypeIndex: i });
    const state = await projectState(page);
    expect(state.counts.dialogueNodes).toBe(6);

    const nodes = await page.evaluate(() => window.__gfStore.project.collections.dialogueNodes);
    for (const n of nodes) {
      expect(n.name).toBeTruthy();
      expect(n.sceneName).toBeTruthy();
      expect(n.tone).toBeTruthy();
    }
    expect(new Set(nodes.map(n => n.subtype)).size).toBe(6);
    expect(errors).toEqual([]);
  });

  test('a node can link to another node as its next node, forming a real graph edge', async ({ page }) => {
    await createProject(page, 'Dialogue Link Test');
    await openModule(page, 'Dialogue Tree Designer');
    await generateOne(page, { subtypeIndex: 0 });
    await generateOne(page, { subtypeIndex: 1 });

    const linked = await page.evaluate(() => {
      const nodes = window.__gfStore.project.collections.dialogueNodes;
      const [a, b] = nodes;
      a.links = a.links || {};
      a.links.nextNode = b.id;
      window.__gfStore.touch();
      return window.__gfStore.backlinks(b.id);
    });
    expect(linked.some(l => l.collection === 'dialogueNodes')).toBe(true);
  });

  test('assistant "generate 3 dialogue nodes" command works and auto-creates a task', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Dialogue Assistant Test');
    await page.getByRole('button', { name: '🤖 Assistant' }).click();
    await page.waitForTimeout(200);
    const box = page.locator('textarea[placeholder*="generate 20 enemies"]');
    await box.fill('generate 3 dialogue nodes');
    await box.press('Enter');
    await page.waitForTimeout(300);

    const state = await page.evaluate(() => {
      const p = window.__gfStore.project;
      return { dialogueNodes: p.collections.dialogueNodes.length, tasks: p.collections.tasks.filter(t => t.sourceRef?.collection === 'dialogueNodes').length };
    });
    expect(state.dialogueNodes).toBe(3);
    expect(state.tasks).toBe(3);
    expect(errors).toEqual([]);
  });
});
