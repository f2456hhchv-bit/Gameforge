import { test, expect } from '@playwright/test';
import { createProject, openModule, generateOne, collectConsoleErrors, activePane } from './helpers.js';

// Reads the live scene the engine exposes for devtools/test introspection.
function readScene(page) {
  return page.evaluate(() => window.__gfPlayScene);
}

async function startPlaying(page) {
  const pane = activePane(page);
  await pane.locator('select.select').first().selectOption({ index: 1 });
  await pane.getByRole('button', { name: '▶ Play' }).click();
  await page.waitForTimeout(200);
  // Dismiss an intro dialogue overlay if the project has dialogue nodes.
  for (let i = 0; i < 12; i++) {
    const btn = page.locator('.card button.btn-primary, .card button.btn-secondary').first();
    if (!(await btn.count())) break;
    const text = (await btn.textContent()) || '';
    if (!text.includes('Continue') && !text.includes('Begin')) break;
    await btn.click();
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(200);
}

// Holds movement keys toward the enemy/pickup's current position until within
// `range` px of it (or a timeout), re-reading live positions each tick so the
// test tracks the entity rather than assuming a fixed layout.
async function moveTowards(page, getTargetPos, range, maxMs = 6000) {
  const step = 150;
  let elapsed = 0;
  while (elapsed < maxMs) {
    const scene = await readScene(page);
    const target = await getTargetPos(scene);
    if (!target) return scene;
    const player = scene.player;
    const dx = (target.x + (target.w || 0) / 2) - (player.x + player.w / 2);
    const dy = (target.y + (target.h || 0) / 2) - (player.y + player.h / 2);
    if (Math.hypot(dx, dy) <= range) return scene;
    const keys = [];
    if (Math.abs(dx) > 4) keys.push(dx > 0 ? 'KeyD' : 'KeyA');
    if (Math.abs(dy) > 4) keys.push(dy > 0 ? 'KeyS' : 'KeyW');
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(step);
    for (const k of keys) await page.keyboard.up(k);
    elapsed += step;
  }
  return readScene(page);
}

test.describe('Play Engine module', () => {
  test('renders a playable scene from a real level and responds to movement', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Movement Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    await expect(page.locator('canvas')).toBeVisible();

    const before = await readScene(page);
    expect(before).toBeTruthy();
    expect(before.player.hp).toBeGreaterThan(0);

    await page.keyboard.down('KeyD');
    await page.waitForTimeout(500);
    await page.keyboard.up('KeyD');
    const after = await readScene(page);
    expect(after.player.x).toBeGreaterThan(before.player.x);

    const hudText = await activePane(page).innerText();
    expect(hudText).toContain('HP');
    expect(errors).toEqual([]);
  });

  test('attacking a real enemy reduces its HP using its actual stat block', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Combat Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 }); // enemy
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    const initial = await readScene(page);
    const enemyId = initial.enemies[0].id;
    const initialHp = initial.enemies[0].hp;

    await moveTowards(page, s => s.enemies.find(e => e.id === enemyId), 40);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(380);
    }
    const finalScene = await readScene(page);
    const enemy = finalScene.enemies.find(e => e.id === enemyId);
    expect(enemy.hp).toBeLessThan(initialHp);
    expect(errors).toEqual([]);
  });

  test('walking over a weapon pickup collects it and boosts player damage', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Pickup Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Item Studio');
    await generateOne(page, { subtypeIndex: 0 }); // weapon
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    const initial = await readScene(page);
    const pickupId = initial.pickups[0].id;
    const initialDamage = initial.player.damage;

    await moveTowards(page, s => { const p = s.pickups.find(x => x.id === pickupId); return p && !p.collected ? p : null; }, 6);
    await page.waitForTimeout(200);

    const after = await readScene(page);
    const pickup = after.pickups.find(p => p.id === pickupId);
    expect(pickup.collected).toBe(true);
    expect(after.player.damage).toBeGreaterThan(initialDamage);

    const hudText = await activePane(page).innerText();
    expect(hudText).toMatch(/1 item/);
    expect(errors).toEqual([]);
  });

  test('a dialogue intro plays before combat when the project has dialogue nodes', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Dialogue Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Dialogue Tree Designer');
    await generateOne(page, { subtypeIndex: 0 }); // opening-line
    await openModule(page, 'Play Engine');

    const pane = activePane(page);
    await pane.locator('select.select').first().selectOption({ index: 1 });
    await pane.getByRole('button', { name: '▶ Play' }).click();
    await page.waitForTimeout(300);

    // Dialogue overlay should appear before the game is controllable.
    await expect(page.locator('.card button:has-text("Begin")')).toBeVisible();
    await page.locator('.card button:has-text("Begin")').click();
    await page.waitForTimeout(300);
    await expect(page.locator('canvas')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('defeating every enemy wins the level and can log a real playtest session', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Win Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 }); // exactly one enemy, no player character
    // The generator rolls a random level 1-20 (wildly variable HP) — pin its
    // stats down so the test's kill budget below is deterministic rather
    // than dependent on which level happened to roll.
    await page.evaluate(() => {
      const store = window.__gfStore;
      const enemy = store.project.collections.characters[0];
      enemy.statistics = enemy.statistics.map(s => (s.key === 'Health' ? { ...s, value: '20' } : s.key === 'Defense' ? { ...s, value: '0' } : s));
      store.touch();
    });
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    const initial = await readScene(page);
    const enemyId = initial.enemies[0].id;
    expect(initial.enemies[0].maxHp).toBe(20);

    // Chase once, then attack until the single (now-weak) enemy is dead.
    await moveTowards(page, s => { const e = s.enemies.find(x => x.id === enemyId); return e && e.alive ? e : null; }, 40, 6000);
    for (let i = 0; i < 10; i++) {
      const scene = await readScene(page);
      const enemy = scene?.enemies.find(e => e.id === enemyId);
      if (!enemy || !enemy.alive) break;
      await page.keyboard.press('Space');
      await page.waitForTimeout(380);
    }

    await expect(page.getByText('Level Clear!')).toBeVisible({ timeout: 5000 });
    const before = await page.evaluate(() => window.__gfStore.project.collections.playtestSessions.length);
    await page.getByRole('button', { name: '📋 Log Playtest' }).click();
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => window.__gfStore.project.collections.playtestSessions.length);
    expect(after).toBe(before + 1);
    expect(errors).toEqual([]);
  });
});
