// A genuine, playable browser game runtime — a canvas 2D game loop, input,
// AABB/platformer physics, simple enemy AI, melee combat resolution, a
// dialogue-graph walker, procedurally-animated sprites and a real
// trigger/action scripting language — built entirely from a project's own
// real data (Level Designer's linked enemies/loot + authored Level Script,
// Character Studio stat blocks, Item Studio stats, Dialogue Tree Designer
// nodes). Three genre modes (Arena / Platformer / Turn-Based) and a real
// "Export Playable Build" pipeline that packages the scene into a
// standalone HTML file. Not a mockup: pick a level, hit Play, it runs.
import { h, uid, nowISO, download } from '../util.js';
import { store } from '../store.js';
import { toast } from '../components/ui.js';
import { createInput } from '../engine/input.js';
import { rectsOverlap, centerDistance, clampToBounds, applyGravity, resolveVerticalCollision, JUMP_VELOCITY } from '../engine/physics.js';
import { buildScene } from '../engine/sceneBuilder.js';
import { pickIntroDialogueNode, renderDialogueOverlay } from '../engine/dialogueRunner.js';
import { drawHumanoid, drawHealthBar, drawPickupIcon } from '../engine/sprites.js';
import { fireEvent, pollConditions } from '../engine/scripting.js';
import { buildStandaloneHTML } from '../engine/exportBuild.js';
import { sfxAttack, sfxHit, sfxDefeat, sfxPickup, sfxJump, sfxDamaged, sfxRoomCleared, sfxWin, sfxLose } from '../engine/audio.js';

const CANVAS_W = 800, CANVAS_H = 480;
const ATTACK_RANGE = 46;
const ATTACK_COOLDOWN_MS = 350;
const ENEMY_ATTACK_RANGE = 30;
const ENEMY_ATTACK_COOLDOWN_MS = 800;

const MODES = [
  { key: 'arena', label: 'Top-Down Arena' },
  { key: 'platformer', label: 'Platformer' },
  { key: 'turnbased', label: 'Turn-Based Encounter' },
];

export function mountPlayEngine(container, opts) {
  let status = 'idle'; // idle | dialogue | playing | won | lost
  let scene = null;
  let mode = 'arena';
  let input = null;
  let raf = null;
  let lastTs = 0;
  let selectedLevelId = '';
  let endSummary = null;
  let hud = null;
  let canvasEl = null;
  let turnLog = [];
  let selectedTargetId = null;
  let paused = false;

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function teardownPlaySession() {
    stopLoop();
    if (input) { input.destroy(); input = null; }
  }

  function applyActions(actions) {
    if (!actions || !actions.length) return;
    for (const action of actions) {
      switch (action.type) {
        case 'message':
          toast(action.text, { type: 'info' });
          if (mode === 'turnbased') turnLog.unshift(action.text);
          break;
        case 'healPlayer': scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + action.amount); break;
        case 'damagePlayer': scene.player.hp -= action.amount; break;
        case 'healEnemies': scene.enemies.forEach(e => { if (e.alive) e.hp = Math.min(e.maxHp, e.hp + action.amount); }); break;
        case 'spawnHeal':
          scene.pickups.push({
            id: uid('pickup'), name: 'Script Heal', x: scene.arena.x + 40 + Math.random() * (scene.arena.w - 80),
            y: scene.arena.y + 40 + Math.random() * (scene.arena.h - 80), w: 20, h: 20, collected: false, heal: 25, damageBonus: 0, __t: 0,
          });
          break;
        case 'winLevel': scene.pendingEnd = 'won'; break;
        case 'loseLevel': scene.pendingEnd = 'lost'; break;
      }
    }
  }

  function startGame(levelId) {
    const level = store.get('levels', levelId);
    if (!level) return;
    scene = buildScene(level, Math.random, mode);
    window.__gfPlayScene = scene; // devtools/test introspection, mirrors window.__gfStore
    endSummary = null;
    turnLog = [];
    selectedTargetId = null;

    if (mode === 'turnbased') {
      status = 'playing';
      applyActions(fireEvent(scene.scriptRules, 'start'));
      renderShell();
      return;
    }
    const introNode = pickIntroDialogueNode();
    if (introNode) {
      status = 'dialogue';
      renderShell();
      renderDialogueOverlay(document.getElementById('gf-play-stage'), introNode, () => {
        status = 'playing';
        applyActions(fireEvent(scene.scriptRules, 'start'));
        beginLoop();
      });
    } else {
      status = 'playing';
      applyActions(fireEvent(scene.scriptRules, 'start'));
      beginLoop();
    }
  }

  function beginLoop() {
    renderShell();
    paused = false;
    input = createInput();
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function endGame(won) {
    teardownPlaySession();
    endSummary = { won, elapsedMs: scene.elapsedMs, itemsCollected: scene.itemsCollected, enemyCount: scene.enemies.length, mode };
    status = won ? 'won' : 'lost';
    if (won) sfxWin(); else sfxLose();
    renderShell();
  }

  function stopGame() {
    teardownPlaySession();
    status = 'idle';
    scene = null;
    renderShell();
  }

  function loop(ts) {
    if (input.consumePressed('Escape')) {
      paused = !paused;
      toast(paused ? 'Paused — press Esc to resume' : 'Resumed', { type: 'info' });
    }
    if (paused) {
      lastTs = ts;
      draw();
      drawPausedOverlay();
      raf = requestAnimationFrame(loop);
      return;
    }
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const stillPlaying = mode === 'platformer' ? updatePlatformer(dt) : updateArena(dt);
    if (!stillPlaying) return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function drawPausedOverlay() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    ctx.fillStyle = 'rgba(15,17,21,0.55)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', CANVAS_W / 2, CANVAS_H / 2);
    ctx.font = '13px sans-serif';
    ctx.fillText('Press Esc to resume', CANVAS_W / 2, CANVAS_H / 2 + 26);
    ctx.textAlign = 'left';
  }

  function checkScriptEnd() {
    if (scene.pendingEnd) { endGame(scene.pendingEnd === 'won'); return true; }
    return false;
  }

  function updateArena(dt) {
    const { player, enemies, pickups, arena } = scene;
    scene.elapsedMs += dt * 1000;

    let dx = 0, dy = 0;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dx -= 1;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) dx += 1;
    if (input.isDown('ArrowUp') || input.isDown('KeyW')) dy -= 1;
    if (input.isDown('ArrowDown') || input.isDown('KeyS')) dy += 1;
    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      player.x += (dx / len) * player.speed * dt;
      player.y += (dy / len) * player.speed * dt;
      clampToBounds(player, arena);
      player.walkPhase = (player.walkPhase || 0) + dt * 3;
      player.facing = dx !== 0 ? (dx > 0 ? 1 : -1) : (player.facing || 1);
    }

    if (player.attackCooldown > 0) player.attackCooldown -= dt * 1000;
    if (player.attackFlash > 0) player.attackFlash -= dt * 1000;
    if ((input.consumePressed('Space') || input.consumePressed('Enter')) && player.attackCooldown <= 0) {
      player.attackCooldown = ATTACK_COOLDOWN_MS;
      player.attackFlash = 120;
      let hitAny = false, defeatedAny = false;
      for (const e of enemies) {
        if (e.alive && centerDistance(player, e) <= ATTACK_RANGE) {
          hitAny = true;
          e.hp -= Math.max(1, player.damage - (e.defense || 0));
          e.hitFlash = 150;
          if (e.hp <= 0) { e.alive = false; defeatedAny = true; applyActions(fireEvent(scene.scriptRules, 'enemyDefeated')); }
        }
      }
      if (defeatedAny) sfxDefeat(); else if (hitAny) sfxHit();
      if (hitAny || defeatedAny) sfxAttack();
      if (checkScriptEnd()) return false;
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt * 1000;
      const d = centerDistance(e, player);
      if (d > ENEMY_ATTACK_RANGE) {
        const ang = Math.atan2((player.y + player.h / 2) - (e.y + e.h / 2), (player.x + player.w / 2) - (e.x + e.w / 2));
        e.x += Math.cos(ang) * e.speed * dt;
        e.y += Math.sin(ang) * e.speed * dt;
        clampToBounds(e, arena);
        e.walkPhase = (e.walkPhase || 0) + dt * 3;
      } else {
        e.attackTimer -= dt * 1000;
        if (e.attackTimer <= 0) {
          e.attackTimer = ENEMY_ATTACK_COOLDOWN_MS;
          player.hp -= Math.max(1, e.damage - player.defense);
          sfxDamaged();
          applyActions(fireEvent(scene.scriptRules, 'playerDamaged'));
          if (checkScriptEnd()) return false;
        }
      }
    }

    for (const p of pickups) {
      if (p.collected) { continue; }
      p.__t = (p.__t || 0) + dt * 3;
      if (rectsOverlap(player, p)) {
        p.collected = true;
        scene.itemsCollected++;
        if (p.damageBonus) player.damage += p.damageBonus;
        if (p.heal) player.hp = Math.min(player.maxHp, player.hp + p.heal);
        sfxPickup();
        applyActions(fireEvent(scene.scriptRules, 'itemCollected'));
        if (checkScriptEnd()) return false;
      }
    }

    applyActions(pollConditions(scene.scriptRules, { elapsedSeconds: scene.elapsedMs / 1000, playerHp: player.hp }));
    if (checkScriptEnd()) return false;

    updateHud();
    if (player.hp <= 0) { endGame(false); return false; }
    if (enemies.length && enemies.every(e => !e.alive)) {
      if (scene.roomQueue && scene.roomIndex < scene.roomQueue.length - 1) {
        scene.roomIndex++;
        const nextRoom = scene.roomQueue[scene.roomIndex];
        scene.enemies = nextRoom.enemies;
        scene.roomLabel = nextRoom.label;
        scene.player.x = scene.arena.x + 24;
        scene.player.y = scene.arena.y + scene.arena.h / 2 - scene.player.h / 2;
        sfxRoomCleared();
        toast(`Room cleared — entering "${scene.roomLabel}"`, { type: 'success' });
        applyActions(fireEvent(scene.scriptRules, 'roomCleared'));
        if (checkScriptEnd()) return false;
        return true;
      }
      applyActions(fireEvent(scene.scriptRules, 'allEnemiesDefeated'));
      if (checkScriptEnd()) return false;
      endGame(true);
      return false;
    }
    return true;
  }

  function updatePlatformer(dt) {
    const { player, enemies, pickups, platforms, groundY, goal, arena } = scene;
    scene.elapsedMs += dt * 1000;

    let dx = 0;
    if (input.isDown('ArrowLeft') || input.isDown('KeyA')) dx -= 1;
    if (input.isDown('ArrowRight') || input.isDown('KeyD')) dx += 1;
    player.x = Math.max(arena.x, Math.min(arena.x + arena.w - player.w, player.x + dx * player.speed * dt));
    if (dx) { player.walkPhase = (player.walkPhase || 0) + dt * 3; player.facing = dx > 0 ? 1 : -1; }

    if ((input.consumePressed('Space') || input.consumePressed('ArrowUp') || input.consumePressed('KeyW')) && player.onGround) {
      player.vy = JUMP_VELOCITY;
      player.onGround = false;
      sfxJump();
    }
    applyGravity(player, dt);
    player.y += player.vy * dt;
    player.onGround = resolveVerticalCollision(player, groundY, platforms);

    if (player.attackCooldown > 0) player.attackCooldown -= dt * 1000;
    if (player.attackFlash > 0) player.attackFlash -= dt * 1000;
    if (input.consumePressed('Enter') && player.attackCooldown <= 0) {
      player.attackCooldown = ATTACK_COOLDOWN_MS;
      player.attackFlash = 120;
      let hitAny = false, defeatedAny = false;
      for (const e of enemies) {
        if (e.alive && centerDistance(player, e) <= ATTACK_RANGE) {
          hitAny = true;
          e.hp -= Math.max(1, player.damage - (e.defense || 0));
          e.hitFlash = 150;
          if (e.hp <= 0) { e.alive = false; defeatedAny = true; applyActions(fireEvent(scene.scriptRules, 'enemyDefeated')); }
        }
      }
      if (defeatedAny) sfxDefeat(); else if (hitAny) sfxHit();
      if (hitAny || defeatedAny) sfxAttack();
      if (checkScriptEnd()) return false;
    }

    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.hitFlash > 0) e.hitFlash -= dt * 1000;
      e.x += e.patrolDir * e.speed * 0.4 * dt;
      if (Math.abs(e.x - e.patrolCenter) > 60) e.patrolDir *= -1;
      e.walkPhase = (e.walkPhase || 0) + dt * 3;
      if (rectsOverlap(player, e)) {
        if (player.vy > 60 && player.y + player.h - e.y < 16) {
          e.hp = 0; e.alive = false; player.vy = -300;
          sfxDefeat();
          applyActions(fireEvent(scene.scriptRules, 'enemyDefeated'));
          if (checkScriptEnd()) return false;
        } else {
          e.attackTimer -= dt * 1000;
          if (e.attackTimer <= 0) {
            e.attackTimer = ENEMY_ATTACK_COOLDOWN_MS;
            player.hp -= Math.max(1, e.damage - player.defense);
            sfxDamaged();
            applyActions(fireEvent(scene.scriptRules, 'playerDamaged'));
            if (checkScriptEnd()) return false;
          }
        }
      }
    }

    for (const p of pickups) {
      if (p.collected) continue;
      p.__t = (p.__t || 0) + dt * 3;
      if (rectsOverlap(player, p)) {
        p.collected = true;
        scene.itemsCollected++;
        if (p.damageBonus) player.damage += p.damageBonus;
        if (p.heal) player.hp = Math.min(player.maxHp, player.hp + p.heal);
        sfxPickup();
        applyActions(fireEvent(scene.scriptRules, 'itemCollected'));
        if (checkScriptEnd()) return false;
      }
    }

    applyActions(pollConditions(scene.scriptRules, { elapsedSeconds: scene.elapsedMs / 1000, playerHp: player.hp }));
    if (checkScriptEnd()) return false;

    updateHud();
    if (player.hp <= 0) { endGame(false); return false; }
    if (goal && rectsOverlap(player, goal)) {
      applyActions(fireEvent(scene.scriptRules, 'allEnemiesDefeated'));
      if (checkScriptEnd()) return false;
      endGame(true);
      return false;
    }
    if (enemies.length && enemies.every(e => !e.alive)) {
      applyActions(fireEvent(scene.scriptRules, 'allEnemiesDefeated'));
      if (checkScriptEnd()) return false;
      endGame(true);
      return false;
    }
    return true;
  }

  function updateHud() {
    if (!hud) return;
    const { player } = scene;
    const pct = Math.max(0, Math.round((player.hp / player.maxHp) * 100));
    hud.hpFill.style.width = `${pct}%`;
    hud.hpText.textContent = `${Math.max(0, Math.round(player.hp))} / ${Math.round(player.maxHp)} HP`;
    hud.timerText.textContent = `${(scene.elapsedMs / 1000).toFixed(1)}s`;
    hud.itemsText.textContent = `${scene.itemsCollected} item${scene.itemsCollected === 1 ? '' : 's'}`;
    hud.enemiesText.textContent = `${scene.enemies.filter(e => e.alive).length}/${scene.enemies.length} enemies`;
    hud.roomText.textContent = scene.roomQueue ? `Room ${scene.roomIndex + 1}/${scene.roomQueue.length}` : '';
    hud.roomText.style.display = scene.roomQueue ? '' : 'none';
  }

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(148,163,184,0.15)';
    ctx.fillRect(scene.arena.x, scene.arena.y, scene.arena.w, scene.arena.h);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.strokeRect(scene.arena.x, scene.arena.y, scene.arena.w, scene.arena.h);

    if (mode === 'platformer') {
      ctx.fillStyle = 'rgba(100,116,139,0.5)';
      ctx.fillRect(scene.arena.x, scene.groundY, scene.arena.w, scene.arena.y + scene.arena.h - scene.groundY);
      for (const p of scene.platforms) { ctx.fillStyle = 'rgba(100,116,139,0.7)'; ctx.fillRect(p.x, p.y, p.w, p.h); }
      if (scene.goal) { ctx.fillStyle = '#facc15'; ctx.fillRect(scene.goal.x, scene.goal.y, scene.goal.w, scene.goal.h); }
    }

    for (const p of scene.pickups) if (!p.collected) drawPickupIcon(ctx, p);

    for (const e of scene.enemies) {
      if (!e.alive) continue;
      drawHumanoid(ctx, e, { walkPhase: e.walkPhase || 0, hit: e.hitFlash > 0 ? 1 : 0, facing: e.patrolDir || 1, grounded: true });
      drawHealthBar(ctx, e, Math.max(0, e.hp / e.maxHp));
    }

    const { player } = scene;
    drawHumanoid(ctx, player, {
      walkPhase: player.walkPhase || 0, attacking: player.attackFlash > 0 ? 0.5 : 0, hit: 0,
      facing: player.facing || 1, grounded: player.onGround !== false,
    });
    if (player.attackFlash > 0) {
      ctx.strokeStyle = 'rgba(129,140,248,0.8)';
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, ATTACK_RANGE, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // --- Turn-based encounter mode: no canvas/loop, purely event-driven. ---
  function turnAttack() {
    const target = scene.enemies.find(e => e.alive && e.id === selectedTargetId) || scene.enemies.find(e => e.alive);
    if (!target) return;
    const dmg = Math.max(1, scene.player.damage - (target.defense || 0));
    target.hp -= dmg;
    turnLog.unshift(`You hit ${target.name} for ${dmg}.`);
    if (target.hp <= 0) {
      target.alive = false;
      turnLog.unshift(`${target.name} is defeated!`);
      sfxDefeat();
      applyActions(fireEvent(scene.scriptRules, 'enemyDefeated'));
    } else {
      sfxHit();
    }
    resolveTurn();
  }

  function turnUseItem(pickupId) {
    const item = scene.pickups.find(p => p.id === pickupId && !p.collected);
    if (!item) return;
    item.collected = true;
    scene.itemsCollected++;
    if (item.heal) { scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + item.heal); turnLog.unshift(`Used ${item.name} — healed ${item.heal}.`); }
    if (item.damageBonus) { scene.player.damage += item.damageBonus; turnLog.unshift(`Used ${item.name} — damage +${item.damageBonus}.`); }
    sfxPickup();
    applyActions(fireEvent(scene.scriptRules, 'itemCollected'));
    resolveTurn();
  }

  function turnFlee() {
    turnLog.unshift('You fled the encounter.');
    status = 'idle';
    scene = null;
    renderShell();
  }

  function resolveTurn() {
    if (scene.pendingEnd) { endGame(scene.pendingEnd === 'won'); return; }
    if (scene.enemies.length && scene.enemies.every(e => !e.alive)) {
      applyActions(fireEvent(scene.scriptRules, 'allEnemiesDefeated'));
      if (scene.pendingEnd) { endGame(scene.pendingEnd === 'won'); return; }
      endGame(true);
      return;
    }
    for (const e of scene.enemies) {
      if (!e.alive) continue;
      const dmg = Math.max(1, e.damage - scene.player.defense);
      scene.player.hp -= dmg;
      turnLog.unshift(`${e.name} hits you for ${dmg}.`);
      sfxDamaged();
      applyActions(fireEvent(scene.scriptRules, 'playerDamaged'));
    }
    applyActions(pollConditions(scene.scriptRules, { elapsedSeconds: 0, playerHp: scene.player.hp }));
    if (scene.pendingEnd) { endGame(scene.pendingEnd === 'won'); return; }
    if (scene.player.hp <= 0) { endGame(false); return; }
    renderShell();
  }

  function logPlaytest() {
    if (!endSummary) return;
    const won = endSummary.won;
    const item = {
      id: uid('playtestSessions'),
      name: `Auto-Logged Play Session — ${won ? 'Cleared' : 'Failed'} (${endSummary.mode})`,
      description: 'Logged automatically from a Play Engine session.',
      subtype: 'internal-test',
      tags: [], links: {},
      buildVersion: store.project?.meta?.version || '0.1.0',
      sessionDate: '',
      testerCount: 1,
      testerProfile: 'Solo design-side playtest (via Play Engine)',
      sessionLength: `${Math.round(endSummary.elapsedMs / 1000)}s`,
      methodology: 'Analytics-only',
      objectives: 'Verify the level is completable with its currently-linked enemies, loot and level script.',
      keyFindings: won
        ? `Cleared all ${endSummary.enemyCount} enemies in ${(endSummary.elapsedMs / 1000).toFixed(1)}s (${endSummary.mode} mode), collecting ${endSummary.itemsCollected} item(s).`
        : `Player was defeated after ${(endSummary.elapsedMs / 1000).toFixed(1)}s against ${endSummary.enemyCount} enemies (${endSummary.mode} mode).`,
      bugsFound: [], positiveQuotes: [],
      sentimentScore: won ? 8 : 4,
      criticalIssuesCount: won ? 0 : 1,
      followUpActions: won ? '' : 'Consider rebalancing enemy difficulty or player starting stats for this level.',
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    store.snapshot();
    store.project.collections.playtestSessions.push(item);
    store.commit('Log Play Engine session');
    store.logActivity('Logged a Play Engine session for review in Playtesting Tracker', { icon: '🕹️' });
    toast('Playtest session logged — see Playtesting Tracker', { type: 'success' });
  }

  function exportBuild() {
    const level = store.get('levels', selectedLevelId);
    if (!level) return;
    if (mode === 'turnbased') { toast('Export isn\'t available for Turn-Based Encounters yet — try Arena or Platformer.', { type: 'warn' }); return; }
    const exportScene = buildScene(level, Math.random, mode);
    const html = buildStandaloneHTML(exportScene, mode, `${level.name || 'GameForge Level'} — Play Export`);
    download(`${(level.name || 'gameforge-level').replace(/[^a-z0-9]+/gi, '-')}-play-export.html`, html, 'text/html');
    toast('Exported a standalone playable HTML file — open it anywhere, no server needed.', { type: 'success' });
  }

  function renderShell() {
    container.innerHTML = '';
    const levels = store.list('levels');

    const levelSelect = h('select', { class: 'select w-auto', disabled: status === 'playing' || status === 'dialogue' }, [
      h('option', { value: '' }, levels.length ? 'Choose a level…' : 'No levels yet'),
      ...levels.map(l => h('option', { value: l.id, selected: l.id === selectedLevelId }, l.name || '(unnamed)')),
    ]);
    const modeSelect = h('select', { class: 'select w-auto', disabled: status === 'playing' || status === 'dialogue' },
      MODES.map(m => h('option', { value: m.key, selected: m.key === mode }, m.label)));
    const playBtn = h('button', {
      class: 'btn-primary', disabled: !selectedLevelId || status === 'playing' || status === 'dialogue',
      onclick: () => startGame(selectedLevelId),
    }, '▶ Play');
    const exportBtn = h('button', {
      class: 'btn-secondary', title: 'Export a standalone playable HTML file', disabled: !selectedLevelId || status === 'playing' || status === 'dialogue',
      onclick: exportBuild,
    }, '⬇ Export Playable Build');
    levelSelect.addEventListener('change', () => { selectedLevelId = levelSelect.value; playBtn.disabled = !selectedLevelId; exportBtn.disabled = !selectedLevelId; });
    modeSelect.addEventListener('change', () => { mode = modeSelect.value; });

    const stopBtn = (status === 'playing' || status === 'dialogue') && h('button', { class: 'btn-secondary', onclick: stopGame }, '⏹ Stop');

    const toolbar = h('div', { class: 'flex items-center gap-2 p-4 border-b border-surface-3/60 flex-wrap' }, [
      h('span', { class: 'text-xl' }, '🕹️'),
      h('h2', { class: 'text-lg font-semibold mr-2' }, 'Play Engine'),
      levelSelect, modeSelect, playBtn, exportBtn, stopBtn,
    ].filter(Boolean));

    const body = h('div', { class: 'flex-1 overflow-y-auto scroll-thin p-4 flex flex-col items-center gap-4' });

    if (!levels.length) {
      body.appendChild(h('div', { class: 'empty-state' }, [
        h('div', { class: 'text-4xl' }, '🕹️'),
        h('p', { class: 'font-medium text-slate-500' }, 'Generate a level in Level Designer first, then come back here to play it.'),
      ]));
    } else if (status === 'idle') {
      body.appendChild(h('div', { class: 'empty-state' }, [
        h('div', { class: 'text-4xl' }, '🕹️'),
        h('p', { class: 'font-medium text-slate-500' }, 'Pick a level and a mode above, then hit Play — a real, playable prototype built live from your project data.'),
        h('p', { class: 'text-xs max-w-md text-center' }, 'Arena: WASD/arrows + Space to attack. Platformer: A/D + Space/W to jump, Enter to attack, stomp or reach the goal. Turn-Based: menu-driven encounter. Author an "on trigger: action" Level Script in Level Designer to script custom events. Export a level to a standalone HTML file to share it — no GameForge needed to play it.'),
      ]));
    } else if (status === 'won' || status === 'lost') {
      body.appendChild(h('div', { class: 'empty-state' }, [
        h('div', { class: 'text-4xl' }, status === 'won' ? '🏆' : '💀'),
        h('p', { class: 'font-bold text-lg' }, status === 'won' ? 'Level Clear!' : 'Defeated'),
        h('p', { class: 'text-sm text-slate-500 max-w-md text-center' }, scene?.objectiveText || ''),
        h('p', { class: 'text-xs text-slate-400' }, `${(endSummary.elapsedMs / 1000).toFixed(1)}s · ${endSummary.itemsCollected} item(s) collected · ${MODES.find(m => m.key === endSummary.mode)?.label || endSummary.mode}`),
        h('div', { class: 'flex gap-2 mt-2 flex-wrap justify-center' }, [
          h('button', { class: 'btn-secondary', onclick: () => startGame(selectedLevelId) }, '↻ Play Again'),
          h('button', { class: 'btn-primary', onclick: logPlaytest }, '📋 Log Playtest'),
          h('button', { class: 'btn-ghost', onclick: stopGame }, 'Back'),
        ]),
      ]));
    } else if (mode === 'turnbased') {
      const enemyRows = scene.enemies.map(e => h('div', {
        class: `flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${!e.alive ? 'opacity-40 line-through' : selectedTargetId === e.id ? 'border-accent bg-accent-muted' : 'border-surface-3/60'}`,
        onclick: () => { if (e.alive) { selectedTargetId = e.id; renderShell(); } },
      }, [
        h('span', { class: 'flex-1 text-sm' }, e.name),
        h('div', { class: 'w-24 progress-track' }, [h('div', { class: 'progress-fill', style: `width:${Math.max(0, Math.round((e.hp / e.maxHp) * 100))}%` })]),
        h('span', { class: 'text-xs text-slate-400 w-14 text-right' }, `${Math.max(0, Math.round(e.hp))}/${e.maxHp}`),
      ]));
      const itemButtons = scene.pickups.filter(p => !p.collected).map(p => h('button', {
        class: 'btn-secondary text-xs justify-start', onclick: () => turnUseItem(p.id),
      }, `${p.heal ? '🧪' : p.damageBonus ? '🗡️' : '📦'} ${p.name}`));

      body.appendChild(h('div', { class: 'w-full max-w-2xl flex flex-col gap-4' }, [
        h('p', { class: 'text-xs text-slate-400 text-center' }, scene.roomLabel),
        h('div', { class: 'card p-4 flex flex-col gap-2' }, [
          h('div', { class: 'flex justify-between text-sm font-medium' }, [h('span', {}, scene.player.name), h('span', {}, `${Math.max(0, Math.round(scene.player.hp))}/${scene.player.maxHp} HP`)]),
          h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${Math.max(0, Math.round((scene.player.hp / scene.player.maxHp) * 100))}%` })]),
        ]),
        h('div', { class: 'card p-4 flex flex-col gap-2' }, [h('h4', { class: 'label' }, 'Enemies'), ...enemyRows]),
        itemButtons.length ? h('div', { class: 'card p-4 flex flex-col gap-2' }, [h('h4', { class: 'label' }, 'Items'), h('div', { class: 'flex flex-wrap gap-2' }, itemButtons)]) : null,
        h('div', { class: 'flex gap-2 justify-center' }, [
          h('button', { class: 'btn-primary', onclick: turnAttack }, '⚔ Attack'),
          h('button', { class: 'btn-ghost', onclick: turnFlee }, '🏃 Flee'),
        ]),
        h('div', { class: 'card p-3 max-h-40 overflow-y-auto scroll-thin flex flex-col gap-1' }, turnLog.length
          ? turnLog.map(line => h('p', { class: 'text-xs text-slate-500' }, line))
          : [h('p', { class: 'text-xs text-slate-400' }, 'The encounter begins…')]),
      ].filter(Boolean)));
    } else {
      const stage = h('div', { id: 'gf-play-stage', class: 'relative', style: `width:${CANVAS_W}px` });
      canvasEl = h('canvas', { width: CANVAS_W, height: CANVAS_H, class: 'rounded-xl border border-surface-3 bg-surface-2 block' });
      stage.appendChild(canvasEl);

      hud = {
        hpFill: h('div', { class: 'progress-fill' }),
        hpText: h('span', { class: 'text-xs font-semibold' }),
        roomText: h('span', { class: 'badge-accent' }),
        timerText: h('span', { class: 'text-xs text-slate-400' }),
        itemsText: h('span', { class: 'text-xs text-slate-400' }),
        enemiesText: h('span', { class: 'text-xs text-slate-400' }),
      };
      const hudBar = h('div', { class: 'absolute top-2 left-2 right-2 card px-3 py-2 flex items-center gap-3 flex-wrap' }, [
        h('div', { class: 'flex flex-col gap-0.5 flex-1 min-w-[140px]' }, [
          h('div', { class: 'progress-track' }, [hud.hpFill]),
          hud.hpText,
        ]),
        hud.roomText, hud.enemiesText, hud.itemsText, hud.timerText,
      ]);
      stage.appendChild(hudBar);
      body.appendChild(h('p', { class: 'text-xs text-slate-400 -mb-2' }, scene.roomLabel));
      body.appendChild(stage);
      updateHud();
      draw();
    }

    container.append(toolbar, body);
  }

  renderShell();

  const unsub = store.on((project, reason) => {
    if (status === 'idle' && (reason.startsWith('mutate') || reason === 'undo' || reason === 'redo' || reason === 'load')) renderShell();
  });

  return () => {
    unsub();
    teardownPlaySession();
  };
}
