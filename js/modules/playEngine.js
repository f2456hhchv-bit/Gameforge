// A genuine, playable browser game runtime — a canvas 2D game loop, input,
// AABB collision, simple enemy AI, melee combat resolution and a
// dialogue-graph walker — built entirely from a project's own real data
// (Level Designer's linked enemies/loot, Character Studio stat blocks,
// Item Studio stats, Dialogue Tree Designer nodes). Not a mockup: pick a
// level, hit Play, and it runs.
import { h, uid, nowISO } from '../util.js';
import { store } from '../store.js';
import { toast } from '../components/ui.js';
import { createInput } from '../engine/input.js';
import { rectsOverlap, centerDistance, clampToBounds } from '../engine/physics.js';
import { buildScene } from '../engine/sceneBuilder.js';
import { pickIntroDialogueNode, renderDialogueOverlay } from '../engine/dialogueRunner.js';

const CANVAS_W = 800, CANVAS_H = 480;
const ATTACK_RANGE = 46;
const ATTACK_COOLDOWN_MS = 350;
const ENEMY_ATTACK_RANGE = 30;
const ENEMY_ATTACK_COOLDOWN_MS = 800;

export function mountPlayEngine(container, opts) {
  let status = 'idle'; // idle | dialogue | playing | won | lost
  let scene = null;
  let input = null;
  let raf = null;
  let lastTs = 0;
  let selectedLevelId = '';
  let endSummary = null;
  let hud = null;
  let canvasEl = null;

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  function teardownPlaySession() {
    stopLoop();
    if (input) { input.destroy(); input = null; }
  }

  function startGame(levelId) {
    const level = store.get('levels', levelId);
    if (!level) return;
    scene = buildScene(level);
    window.__gfPlayScene = scene; // devtools/test introspection, mirrors window.__gfStore
    endSummary = null;
    const introNode = pickIntroDialogueNode();
    if (introNode) {
      status = 'dialogue';
      renderShell();
      renderDialogueOverlay(document.getElementById('gf-play-stage'), introNode, () => {
        status = 'playing';
        beginLoop();
      });
    } else {
      status = 'playing';
      beginLoop();
    }
  }

  function beginLoop() {
    renderShell();
    input = createInput();
    lastTs = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function endGame(won) {
    teardownPlaySession();
    endSummary = { won, elapsedMs: scene.elapsedMs, itemsCollected: scene.itemsCollected, enemyCount: scene.enemies.length };
    status = won ? 'won' : 'lost';
    renderShell();
  }

  function stopGame() {
    teardownPlaySession();
    status = 'idle';
    scene = null;
    renderShell();
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    const stillPlaying = update(dt);
    if (!stillPlaying) return;
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
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
    }

    if (player.attackCooldown > 0) player.attackCooldown -= dt * 1000;
    if (player.attackFlash > 0) player.attackFlash -= dt * 1000;
    if ((input.consumePressed('Space') || input.consumePressed('Enter')) && player.attackCooldown <= 0) {
      player.attackCooldown = ATTACK_COOLDOWN_MS;
      player.attackFlash = 120;
      for (const e of enemies) {
        if (e.alive && centerDistance(player, e) <= ATTACK_RANGE) {
          e.hp -= Math.max(1, player.damage - (e.defense || 0));
          e.hitFlash = 150;
          if (e.hp <= 0) e.alive = false;
        }
      }
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
      } else {
        e.attackTimer -= dt * 1000;
        if (e.attackTimer <= 0) {
          e.attackTimer = ENEMY_ATTACK_COOLDOWN_MS;
          player.hp -= Math.max(1, e.damage - player.defense);
        }
      }
    }

    for (const p of pickups) {
      if (p.collected) continue;
      if (rectsOverlap(player, p)) {
        p.collected = true;
        scene.itemsCollected++;
        if (p.damageBonus) player.damage += p.damageBonus;
        if (p.heal) player.hp = Math.min(player.maxHp, player.hp + p.heal);
      }
    }

    updateHud();

    if (player.hp <= 0) { endGame(false); return false; }
    if (enemies.length && enemies.every(e => !e.alive)) { endGame(true); return false; }
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
  }

  function draw() {
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.fillStyle = 'rgba(148,163,184,0.15)';
    ctx.fillRect(scene.arena.x, scene.arena.y, scene.arena.w, scene.arena.h);
    ctx.strokeStyle = 'rgba(148,163,184,0.4)';
    ctx.strokeRect(scene.arena.x, scene.arena.y, scene.arena.w, scene.arena.h);

    for (const p of scene.pickups) {
      if (p.collected) continue;
      ctx.fillStyle = p.damageBonus ? '#f59e0b' : p.heal ? '#22c55e' : '#94a3b8';
      ctx.fillRect(p.x, p.y, p.w, p.h);
    }

    for (const e of scene.enemies) {
      if (!e.alive) continue;
      ctx.fillStyle = e.hitFlash > 0 ? '#fca5a5' : '#dc2626';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(e.x, e.y - 8, e.w, 4);
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(e.x, e.y - 8, e.w * pct, 4);
    }

    const { player } = scene;
    ctx.fillStyle = player.attackFlash > 0 ? '#c4b5fd' : '#4f46e5';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    if (player.attackFlash > 0) {
      ctx.strokeStyle = 'rgba(129,140,248,0.8)';
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, ATTACK_RANGE, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function logPlaytest() {
    if (!endSummary) return;
    const won = endSummary.won;
    const item = {
      id: uid('playtestSessions'),
      name: `Auto-Logged Play Session — ${won ? 'Cleared' : 'Failed'}`,
      description: 'Logged automatically from a Play Engine session.',
      subtype: 'internal-test',
      tags: [], links: {},
      buildVersion: store.project?.meta?.version || '0.1.0',
      sessionDate: '',
      testerCount: 1,
      testerProfile: 'Solo design-side playtest (via Play Engine)',
      sessionLength: `${Math.round(endSummary.elapsedMs / 1000)}s`,
      methodology: 'Analytics-only',
      objectives: 'Verify the level is completable with its currently-linked enemies and loot.',
      keyFindings: won
        ? `Cleared all ${endSummary.enemyCount} enemies in ${(endSummary.elapsedMs / 1000).toFixed(1)}s, collecting ${endSummary.itemsCollected} item(s).`
        : `Player was defeated after ${(endSummary.elapsedMs / 1000).toFixed(1)}s against ${endSummary.enemyCount} enemies.`,
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

  function renderShell() {
    container.innerHTML = '';
    const levels = store.list('levels');

    const levelSelect = h('select', { class: 'select w-auto', disabled: status === 'playing' || status === 'dialogue' }, [
      h('option', { value: '' }, levels.length ? 'Choose a level…' : 'No levels yet'),
      ...levels.map(l => h('option', { value: l.id, selected: l.id === selectedLevelId }, l.name || '(unnamed)')),
    ]);
    const playBtn = h('button', {
      class: 'btn-primary', disabled: !selectedLevelId || status === 'playing' || status === 'dialogue',
      onclick: () => startGame(selectedLevelId),
    }, '▶ Play');
    levelSelect.addEventListener('change', () => { selectedLevelId = levelSelect.value; playBtn.disabled = !selectedLevelId; });

    const stopBtn = (status === 'playing' || status === 'dialogue') && h('button', { class: 'btn-secondary', onclick: stopGame }, '⏹ Stop');

    const toolbar = h('div', { class: 'flex items-center gap-2 p-4 border-b border-surface-3/60 flex-wrap' }, [
      h('span', { class: 'text-xl' }, '🕹️'),
      h('h2', { class: 'text-lg font-semibold mr-2' }, 'Play Engine'),
      levelSelect, playBtn, stopBtn,
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
        h('p', { class: 'font-medium text-slate-500' }, 'Pick a level above and hit Play — a real, playable prototype built live from your project data.'),
        h('p', { class: 'text-xs max-w-md' }, 'WASD/arrow keys to move, Space to attack. Enemies and loot come from whatever\'s linked on the level — or your project\'s enemies/items if nothing\'s linked yet.'),
      ]));
    } else if (status === 'won' || status === 'lost') {
      body.appendChild(h('div', { class: 'empty-state' }, [
        h('div', { class: 'text-4xl' }, status === 'won' ? '🏆' : '💀'),
        h('p', { class: 'font-bold text-lg' }, status === 'won' ? 'Level Clear!' : 'Defeated'),
        h('p', { class: 'text-sm text-slate-500 max-w-md text-center' }, scene?.objectiveText || ''),
        h('p', { class: 'text-xs text-slate-400' }, `${(endSummary.elapsedMs / 1000).toFixed(1)}s · ${endSummary.itemsCollected} item(s) collected`),
        h('div', { class: 'flex gap-2 mt-2' }, [
          h('button', { class: 'btn-secondary', onclick: () => startGame(selectedLevelId) }, '↻ Play Again'),
          h('button', { class: 'btn-primary', onclick: logPlaytest }, '📋 Log Playtest'),
          h('button', { class: 'btn-ghost', onclick: stopGame }, 'Back'),
        ]),
      ]));
    } else {
      const stage = h('div', { id: 'gf-play-stage', class: 'relative', style: `width:${CANVAS_W}px` });
      canvasEl = h('canvas', { width: CANVAS_W, height: CANVAS_H, class: 'rounded-xl border border-surface-3 bg-surface-2 block' });
      stage.appendChild(canvasEl);

      hud = {
        hpFill: h('div', { class: 'progress-fill' }),
        hpText: h('span', { class: 'text-xs font-semibold' }),
        timerText: h('span', { class: 'text-xs text-slate-400' }),
        itemsText: h('span', { class: 'text-xs text-slate-400' }),
        enemiesText: h('span', { class: 'text-xs text-slate-400' }),
      };
      const hudBar = h('div', { class: 'absolute top-2 left-2 right-2 card px-3 py-2 flex items-center gap-3 flex-wrap' }, [
        h('div', { class: 'flex flex-col gap-0.5 flex-1 min-w-[140px]' }, [
          h('div', { class: 'progress-track' }, [hud.hpFill]),
          hud.hpText,
        ]),
        hud.enemiesText, hud.itemsText, hud.timerText,
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
