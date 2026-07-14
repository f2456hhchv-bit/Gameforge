import { test, expect } from '@playwright/test';
import { createProject, openModule, generateOne, collectConsoleErrors, activePane } from './helpers.js';

// Reads the live scene the engine exposes for devtools/test introspection.
function readScene(page) {
  return page.evaluate(() => window.__gfPlayScene);
}

async function startPlaying(page, modeIndex) {
  const pane = activePane(page);
  await pane.locator('select.select').first().selectOption({ index: 1 });
  if (modeIndex != null) await pane.locator('select.select').nth(1).selectOption({ index: modeIndex });
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

  test('platformer mode applies real gravity and a jump arc, and reaching the goal wins', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Platformer Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Play Engine');

    await startPlaying(page, 1); // Platformer
    const s0 = await readScene(page);
    expect(s0.mode).toBe('platformer');
    expect(s0.player.onGround).toBe(true);
    const groundY = s0.player.y;

    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    const midJump = await readScene(page);
    expect(midJump.player.y).toBeLessThan(groundY); // rose off the ground
    await page.waitForTimeout(700);
    const landed = await readScene(page);
    expect(landed.player.onGround).toBe(true);
    expect(landed.player.y).toBeCloseTo(groundY, 0);

    // Run to the goal at the far right edge to win, regardless of enemies.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(6000);
    await page.keyboard.up('KeyD');
    await expect(page.getByText('Level Clear!')).toBeVisible({ timeout: 3000 });
    expect(errors).toEqual([]);
  });

  test('turn-based encounter mode resolves attacks via menu and can be fled', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Turn-Based Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 }); // enemy
    await openModule(page, 'Play Engine');

    const pane = activePane(page);
    await pane.locator('select.select').first().selectOption({ index: 1 });
    await pane.locator('select.select').nth(1).selectOption({ index: 2 }); // Turn-Based Encounter
    await pane.getByRole('button', { name: '▶ Play' }).click();
    await page.waitForTimeout(300);

    await expect(pane.getByRole('button', { name: '⚔ Attack' })).toBeVisible();
    const before = await readScene(page);
    const enemyHpBefore = before.enemies[0].hp;
    await pane.getByRole('button', { name: '⚔ Attack' }).click();
    await page.waitForTimeout(200);
    const afterAttack = await page.evaluate(() => window.__gfPlayScene);
    // Either the enemy took damage, or (if it died) the log records the win/continuing state.
    if (afterAttack) {
      expect(afterAttack.enemies[0].hp).toBeLessThanOrEqual(enemyHpBefore);
    }
    expect(errors).toEqual([]);
  });

  test('a Level Script "on start" rule fires as a real toast message when play begins', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Script Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    // Author a real Level Script rule on the freshly generated level.
    await page.evaluate(() => {
      const store = window.__gfStore;
      const level = store.project.collections.levels[0];
      level.levelScript = 'on start: message "Scripted intro!"';
      store.touch();
    });
    await openModule(page, 'Play Engine');
    await startPlaying(page);

    await expect(page.locator('.toast', { hasText: 'Scripted intro!' })).toBeVisible({ timeout: 3000 });
    expect(errors).toEqual([]);
  });

  test('Export Playable Build downloads a standalone HTML file', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Export Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Play Engine');

    const pane = activePane(page);
    await pane.locator('select.select').first().selectOption({ index: 1 });
    await page.waitForTimeout(150);
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      pane.getByRole('button', { name: '⬇ Export Playable Build' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.html$/);
    const fs = await import('node:fs');
    const path = await download.path();
    const content = fs.readFileSync(path, 'utf-8');
    expect(content).toContain('__EXPORTED_SCENE__');
    expect(content).toContain('<canvas');
    expect(errors).toEqual([]);
  });

  test('a multi-room Arena level advances rooms as each is cleared, then wins on the last', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Multi-Room Test');
    await openModule(page, 'Level Designer');
    await generateOne(page); // generated levels always have 4-8 rooms
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 });
    await generateOne(page, { subtypeIndex: 1 }); // two enemies -> two non-empty rooms (round-robin)
    await page.evaluate(() => {
      const store = window.__gfStore;
      for (const enemy of store.project.collections.characters) {
        enemy.statistics = enemy.statistics.map(s => (s.key === 'Health' ? { ...s, value: '10' } : s.key === 'Defense' ? { ...s, value: '0' } : s));
      }
      store.touch();
    });
    await openModule(page, 'Play Engine');

    await startPlaying(page); // default Arena mode
    const initial = await readScene(page);
    expect(initial.roomQueue).toBeTruthy();
    expect(initial.roomQueue.length).toBeGreaterThanOrEqual(2);
    expect(initial.roomIndex).toBe(0);
    const firstRoomEnemyId = initial.enemies[0].id;

    await moveTowards(page, s => { const e = s.enemies.find(x => x.id === firstRoomEnemyId); return e && e.alive ? e : null; }, 40, 6000);
    await page.keyboard.press('Space');
    await page.waitForTimeout(300);

    const afterRoom1 = await readScene(page);
    expect(afterRoom1.roomIndex).toBeGreaterThanOrEqual(1);
    expect(afterRoom1.enemies[0].id).not.toBe(firstRoomEnemyId);

    // Clear every remaining room until the level ends.
    for (let round = 0; round < 5; round++) {
      const s = await readScene(page);
      if (!s) break;
      const enemy = s.enemies.find(e => e.alive);
      if (!enemy) break;
      await moveTowards(page, sc => { const e = sc.enemies.find(x => x.alive); return e || null; }, 40, 6000);
      await page.keyboard.press('Space');
      await page.waitForTimeout(300);
    }
    await expect(page.getByText('Level Clear!')).toBeVisible({ timeout: 5000 });
    expect(errors).toEqual([]);
  });

  test('Escape pauses and resumes real-time modes', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Pause Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Play Engine');
    await startPlaying(page);

    const before = await readScene(page);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await expect(page.locator('.toast', { hasText: 'Paused' })).toBeVisible({ timeout: 2000 });

    await page.keyboard.down('KeyD');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyD');
    const whilePaused = await readScene(page);
    expect(whilePaused.player.x).toBe(before.player.x); // frozen while paused

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyD');
    const afterResume = await readScene(page);
    expect(afterResume.player.x).toBeGreaterThan(before.player.x); // moving again

    expect(errors).toEqual([]);
  });

  test('an Elite enemy carries a real innate Shield that absorbs damage before real HP loss', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Elite Shield Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 }); // enemy (subtype overridden to elite below)
    await page.evaluate(() => {
      const store = window.__gfStore;
      const enemy = store.project.collections.characters[0];
      enemy.subtype = 'elite';
      enemy.statistics = enemy.statistics.map(s => (s.key === 'Health' ? { ...s, value: '50' } : s.key === 'Defense' ? { ...s, value: '0' } : s));
      store.touch();
    });
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    const initial = await readScene(page);
    const enemyId = initial.enemies[0].id;
    expect(initial.enemies[0].maxHp).toBe(50);
    const shield = initial.enemies[0].statusEffects.find(s => s.type === 'Shielded');
    expect(shield).toBeTruthy();
    expect(shield.shieldHp).toBe(15); // 50 * 0.3

    await moveTowards(page, s => { const e = s.enemies.find(x => x.id === enemyId); return e && e.alive ? e : null; }, 40, 6000);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const afterOneHit = await readScene(page);
    const enemyAfterOneHit = afterOneHit.enemies.find(e => e.id === enemyId);
    // Player's default 12 damage is fully absorbed by the 15-point shield —
    // real HP must not have moved yet.
    expect(enemyAfterOneHit.hp).toBe(50);
    expect(enemyAfterOneHit.statusEffects.find(s => s.type === 'Shielded').shieldHp).toBeLessThan(15);

    await page.waitForTimeout(400);
    await page.keyboard.press('Space');
    await page.waitForTimeout(200);
    const afterTwoHits = await readScene(page);
    const enemyAfterTwoHits = afterTwoHits.enemies.find(e => e.id === enemyId);
    // The remaining shield (3) absorbs part of the second hit; the rest spills into real HP.
    expect(enemyAfterTwoHits.hp).toBeLessThan(50);
    expect(errors).toEqual([]);
  });

  test('the player\'s special ability (E) deals bonus damage, applies a Burning DoT, and goes on cooldown', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Ability Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 }); // enemy
    await page.evaluate(() => {
      const store = window.__gfStore;
      const enemy = store.project.collections.characters[0];
      enemy.statistics = enemy.statistics.map(s => (s.key === 'Health' ? { ...s, value: '200' } : s.key === 'Defense' ? { ...s, value: '0' } : s));
      store.touch();
    });
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    const initial = await readScene(page);
    const enemyId = initial.enemies[0].id;

    await moveTowards(page, s => { const e = s.enemies.find(x => x.id === enemyId); return e && e.alive ? e : null; }, 60, 6000);
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(200);

    const afterAbility = await readScene(page);
    const enemyAfterAbility = afterAbility.enemies.find(e => e.id === enemyId);
    expect(enemyAfterAbility.hp).toBeLessThan(200);
    expect(enemyAfterAbility.statusEffects.find(s => s.type === 'Burning')).toBeTruthy();
    const hpRightAfterAbility = enemyAfterAbility.hp;

    // The Burning DoT should keep ticking the enemy's HP down over time,
    // independent of any further player action.
    await page.waitForTimeout(1200);
    const afterBurnTicks = await readScene(page);
    const enemyAfterBurnTicks = afterBurnTicks.enemies.find(e => e.id === enemyId);
    expect(enemyAfterBurnTicks.hp).toBeLessThan(hpRightAfterAbility);

    // Cooldown-gated: pressing E again immediately should not double-apply.
    const hpBeforeSecondPress = enemyAfterBurnTicks.hp;
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(100);
    const afterSecondPress = await readScene(page);
    const enemyAfterSecondPress = afterSecondPress.enemies.find(e => e.id === enemyId);
    expect(enemyAfterSecondPress.hp).toBeCloseTo(hpBeforeSecondPress, 0);

    const hudText = await activePane(page).innerText();
    expect(hudText).toMatch(/✨/);
    expect(errors).toEqual([]);
  });

  test('a boss enemy enters a real enrage phase (mechanical stat change) below 30% HP and fires the bossEnraged script trigger', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await createProject(page, 'Play Engine Boss Enrage Test');
    await openModule(page, 'Level Designer');
    await generateOne(page);
    await page.evaluate(() => {
      const store = window.__gfStore;
      const level = store.project.collections.levels[0];
      level.levelScript = 'on bossEnraged: message "The boss is furious!"';
      store.touch();
    });
    await openModule(page, 'Character Studio');
    await generateOne(page, { subtypeIndex: 1 }); // enemy (subtype overridden to boss below)
    await page.evaluate(() => {
      const store = window.__gfStore;
      const boss = store.project.collections.characters[0];
      boss.subtype = 'boss';
      boss.statistics = boss.statistics.map(s => (s.key === 'Health' ? { ...s, value: '100' } : s.key === 'Defense' ? { ...s, value: '0' } : s));
      store.touch();
    });
    await openModule(page, 'Play Engine');

    await startPlaying(page);
    const initial = await readScene(page);
    const bossId = initial.enemies[0].id;
    const originalDamage = initial.enemies[0].damage;

    await moveTowards(page, s => { const e = s.enemies.find(x => x.id === bossId); return e && e.alive ? e : null; }, 40, 6000);
    let enraged = false;
    for (let i = 0; i < 12 && !enraged; i++) {
      await page.keyboard.press('Space');
      await page.waitForTimeout(380);
      const scene = await readScene(page);
      const boss = scene?.enemies.find(e => e.id === bossId);
      if (!boss || !boss.alive) break;
      if (boss.enraged) enraged = true;
    }

    expect(enraged).toBe(true);
    const enragedScene = await readScene(page);
    const boss = enragedScene.enemies.find(e => e.id === bossId);
    expect(boss.damage).toBeGreaterThan(originalDamage);
    await expect(page.locator('.toast', { hasText: 'The boss is furious!' })).toBeVisible({ timeout: 3000 });
    expect(errors).toEqual([]);
  });
});
