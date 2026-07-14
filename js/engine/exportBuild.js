// Real asset-pipeline step: packages the CURRENT scene (already built from
// this project's actual Level/Character/Item data) plus a compact,
// dependency-free vanilla-JS runtime into one self-contained HTML file —
// downloadable, emailable, or hostable anywhere, with no dependency on
// GameForge Studio, IndexedDB, or a server. Supports the two real-time
// modes (arena, platformer); dialogue playback is Studio-only since it
// reads the live project store, which isn't part of the export.
import { escapeHtml } from '../util.js';

// The exported runtime intentionally re-implements only what it needs
// (movement, gravity/collision, melee combat, pickups, script triggers,
// procedural sprite rendering) in plain JS — it does not import the
// Studio's ES modules, so the output file works standalone via file://.
const RUNTIME_JS = `
const SCENE = window.__EXPORTED_SCENE__;
const MODE = window.__EXPORTED_MODE__;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const hud = { hp: document.getElementById('hp'), hpFill: document.getElementById('hpFill'), timer: document.getElementById('timer'), items: document.getElementById('items'), enemies: document.getElementById('enemies'), msg: document.getElementById('msg'), overlay: document.getElementById('overlay') };

const keys = new Set();
window.addEventListener('keydown', e => { if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault(); if (!keys.has(e.code)) pressedEdge.add(e.code); keys.add(e.code); });
window.addEventListener('keyup', e => keys.delete(e.code));
const pressedEdge = new Set();
function consumePressed(code) { if (pressedEdge.has(code)) { pressedEdge.delete(code); return true; } return false; }

function rectsOverlap(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
function centerDistance(a, b) { const dx = (a.x + a.w/2) - (b.x + b.w/2); const dy = (a.y + a.h/2) - (b.y + b.h/2); return Math.hypot(dx, dy); }
function clampToBounds(e, b) { e.x = Math.max(b.x, Math.min(b.x + b.w - e.w, e.x)); e.y = Math.max(b.y, Math.min(b.y + b.h - e.y, e.y)); }

function hashPalette(seed) { let h = 0; const s = String(seed || 'x'); for (let i = 0; i < s.length; i++) h = (h*31 + s.charCodeAt(i)) >>> 0; const hue = h % 360; return { body: 'hsl('+hue+',62%,45%)', dark: 'hsl('+hue+',55%,30%)', light: 'hsl('+hue+',70%,65%)' }; }
function drawHumanoid(entity, pose) {
  const x=entity.x,y=entity.y,w=entity.w,h=entity.h,cx=x+w/2;
  const palette = entity.__palette || (entity.__palette = hashPalette(entity.id||entity.name));
  const bob = Math.sin((pose.walkPhase||0)*Math.PI*2)*2;
  const legSwing = Math.sin((pose.walkPhase||0)*Math.PI*2)*(w*0.22);
  ctx.save();
  ctx.fillStyle = pose.hit > 0 ? '#fff' : palette.body;
  ctx.strokeStyle = palette.dark; ctx.lineWidth = Math.max(2, w*0.14);
  ctx.beginPath(); ctx.moveTo(cx-w*0.15,y+h*0.62); ctx.lineTo(cx-w*0.15+legSwing*0.4,y+h+bob); ctx.moveTo(cx+w*0.15,y+h*0.62); ctx.lineTo(cx+w*0.15-legSwing*0.4,y+h+bob); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(x+w*0.18, y+h*0.28+bob*0.3, w*0.64, h*0.5, w*0.18); ctx.fill();
  ctx.fillStyle = palette.light; ctx.beginPath(); ctx.arc(cx, y+h*0.18+bob*0.3, w*0.26, 0, Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawHealthBar(entity, pct) { const barY = entity.y - 8; ctx.fillStyle='rgba(0,0,0,.35)'; ctx.fillRect(entity.x, barY, entity.w, 4); ctx.fillStyle = pct>0.5?'#22c55e':pct>0.25?'#f59e0b':'#dc2626'; ctx.fillRect(entity.x, barY, entity.w*Math.max(0,pct), 4); }

const GRAVITY = 1400, TERMINAL_VELOCITY = 900, JUMP_VELOCITY = -520;
const ATTACK_RANGE = 46, ATTACK_COOLDOWN_MS = 350, ENEMY_ATTACK_RANGE = 30, ENEMY_ATTACK_COOLDOWN_MS = 800;

let status = 'playing';
let lastTs = 0;
const scene = SCENE;

function fireScriptEvent(trigger) {
  for (const rule of scene.scriptRules) {
    if (rule.trigger !== trigger) continue;
    if ((trigger === 'start' || trigger === 'allEnemiesDefeated') && rule.fired) continue;
    rule.fired = true;
    runAction(rule.actionText);
  }
}
function pollScriptConditions() {
  for (const rule of scene.scriptRules) {
    if (rule.fired) continue;
    if (rule.trigger === 'timer' && rule.arg != null && scene.elapsedMs/1000 >= rule.arg) { rule.fired = true; runAction(rule.actionText); }
    else if (rule.trigger === 'playerHpBelow' && rule.arg != null && scene.player.hp < rule.arg) { rule.fired = true; runAction(rule.actionText); }
  }
}
function runAction(text) {
  let m;
  if ((m = text.match(/^message\\s+"(.*)"$/))) showMessage(m[1]);
  else if ((m = text.match(/^heal\\s+player\\s+(\\d+)$/))) scene.player.hp = Math.min(scene.player.maxHp, scene.player.hp + Number(m[1]));
  else if ((m = text.match(/^damage\\s+player\\s+(\\d+)$/))) scene.player.hp -= Number(m[1]);
  else if ((m = text.match(/^healEnemies\\s+(\\d+)$/))) scene.enemies.forEach(e => { if (e.alive) e.hp = Math.min(e.maxHp, e.hp + Number(m[1])); });
  else if (text === 'spawnHeal') scene.pickups.push({ id: 'script-heal-'+Date.now(), x: scene.arena.x+40+Math.random()*(scene.arena.w-80), y: scene.arena.y+40+Math.random()*(scene.arena.h-80), w:20,h:20, collected:false, heal:25, damageBonus:0, __t:0 });
  else if (text === 'winLevel') endGame(true);
  else if (text === 'loseLevel') endGame(false);
}
let msgTimer = 0;
function showMessage(text) { hud.msg.textContent = text; hud.msg.style.opacity = '1'; msgTimer = 2500; }

function updateHud() {
  const pct = Math.max(0, scene.player.hp / scene.player.maxHp);
  hud.hpFill.style.width = (pct*100)+'%';
  hud.hp.textContent = Math.max(0, Math.round(scene.player.hp)) + ' / ' + Math.round(scene.player.maxHp) + ' HP';
  hud.timer.textContent = (scene.elapsedMs/1000).toFixed(1) + 's';
  hud.items.textContent = scene.itemsCollected + ' item(s)';
  hud.enemies.textContent = scene.enemies.filter(e=>e.alive).length + '/' + scene.enemies.length + ' enemies';
}

function endGame(won) {
  status = won ? 'won' : 'lost';
  hud.overlay.style.display = 'flex';
  hud.overlay.querySelector('h2').textContent = won ? 'Level Clear!' : 'Defeated';
  hud.overlay.querySelector('p').textContent = scene.objectiveText + ' (' + (scene.elapsedMs/1000).toFixed(1) + 's, ' + scene.itemsCollected + ' item(s))';
}

function updateArena(dt) {
  const { player, enemies, pickups, arena } = scene;
  let dx=0,dy=0;
  if (keys.has('ArrowLeft')||keys.has('KeyA')) dx-=1;
  if (keys.has('ArrowRight')||keys.has('KeyD')) dx+=1;
  if (keys.has('ArrowUp')||keys.has('KeyW')) dy-=1;
  if (keys.has('ArrowDown')||keys.has('KeyS')) dy+=1;
  if (dx||dy) { const len=Math.hypot(dx,dy)||1; player.x += (dx/len)*player.speed*dt; player.y += (dy/len)*player.speed*dt; clampToBounds(player, arena); player.walkPhase = (player.walkPhase||0) + dt*3; player.facing = dx !== 0 ? (dx>0?1:-1) : (player.facing||1); }
  if (player.attackCooldown>0) player.attackCooldown -= dt*1000;
  if (player.attackFlash>0) player.attackFlash -= dt*1000;
  if ((consumePressed('Space')||consumePressed('Enter')) && player.attackCooldown<=0) {
    player.attackCooldown = ATTACK_COOLDOWN_MS; player.attackFlash = 120;
    for (const e of enemies) if (e.alive && centerDistance(player,e) <= ATTACK_RANGE) { e.hp -= Math.max(1, player.damage - (e.defense||0)); e.hitFlash=150; if (e.hp<=0) { e.alive=false; fireScriptEvent('enemyDefeated'); } }
  }
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.hitFlash>0) e.hitFlash -= dt*1000;
    const d = centerDistance(e, player);
    if (d > ENEMY_ATTACK_RANGE) { const ang = Math.atan2((player.y+player.h/2)-(e.y+e.h/2), (player.x+player.w/2)-(e.x+e.w/2)); e.x += Math.cos(ang)*e.speed*dt; e.y += Math.sin(ang)*e.speed*dt; clampToBounds(e, arena); e.walkPhase = (e.walkPhase||0) + dt*3; }
    else { e.attackTimer -= dt*1000; if (e.attackTimer<=0) { e.attackTimer = ENEMY_ATTACK_COOLDOWN_MS; player.hp -= Math.max(1, e.damage - player.defense); fireScriptEvent('playerDamaged'); } }
  }
  for (const p of pickups) { if (p.collected) continue; if (rectsOverlap(player,p)) { p.collected=true; scene.itemsCollected++; if (p.damageBonus) player.damage+=p.damageBonus; if (p.heal) player.hp=Math.min(player.maxHp, player.hp+p.heal); fireScriptEvent('itemCollected'); } }
  if (player.hp<=0) { endGame(false); return; }
  if (enemies.length && enemies.every(e=>!e.alive)) { fireScriptEvent('allEnemiesDefeated'); endGame(true); return; }
}

function updatePlatformer(dt) {
  const { player, enemies, pickups, platforms, groundY, goal } = scene;
  let dx=0;
  if (keys.has('ArrowLeft')||keys.has('KeyA')) dx-=1;
  if (keys.has('ArrowRight')||keys.has('KeyD')) dx+=1;
  player.x += dx*player.speed*dt;
  player.x = Math.max(scene.arena.x, Math.min(scene.arena.x+scene.arena.w-player.w, player.x));
  if (dx) { player.walkPhase=(player.walkPhase||0)+dt*3; player.facing = dx>0?1:-1; }
  if ((consumePressed('Space')||consumePressed('ArrowUp')||consumePressed('KeyW')) && player.onGround) { player.vy = JUMP_VELOCITY; player.onGround=false; }
  player.vy = Math.min(TERMINAL_VELOCITY, player.vy + GRAVITY*dt);
  player.y += player.vy*dt;
  player.onGround = false;
  if (player.y+player.h >= groundY) { player.y = groundY-player.h; player.vy=0; player.onGround=true; }
  for (const p of platforms) { const withinX = player.x+player.w>p.x && player.x<p.x+p.w; if (withinX && player.vy>=0 && player.y+player.h>=p.y && player.y+player.h<=p.y+p.h+12) { player.y=p.y-player.h; player.vy=0; player.onGround=true; } }
  if (player.attackCooldown>0) player.attackCooldown -= dt*1000;
  if (player.attackFlash>0) player.attackFlash -= dt*1000;
  if (consumePressed('Enter') && player.attackCooldown<=0) {
    player.attackCooldown = ATTACK_COOLDOWN_MS; player.attackFlash=120;
    for (const e of enemies) if (e.alive && centerDistance(player,e)<=ATTACK_RANGE) { e.hp -= Math.max(1, player.damage-(e.defense||0)); e.hitFlash=150; if (e.hp<=0) { e.alive=false; fireScriptEvent('enemyDefeated'); } }
  }
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.hitFlash>0) e.hitFlash -= dt*1000;
    e.x += e.patrolDir*e.speed*0.4*dt;
    if (Math.abs(e.x - e.patrolCenter) > 60) e.patrolDir *= -1;
    const overlapping = rectsOverlap(player, e);
    if (overlapping) {
      if (player.vy > 60 && player.y+player.h - e.y < 16) { e.hp = 0; e.alive=false; player.vy = -300; fireScriptEvent('enemyDefeated'); }
      else { e.attackTimer -= dt*1000; if (e.attackTimer<=0) { e.attackTimer=ENEMY_ATTACK_COOLDOWN_MS; player.hp -= Math.max(1, e.damage-player.defense); fireScriptEvent('playerDamaged'); } }
    }
  }
  for (const p of pickups) { if (p.collected) continue; if (rectsOverlap(player,p)) { p.collected=true; scene.itemsCollected++; if (p.damageBonus) player.damage+=p.damageBonus; if (p.heal) player.hp=Math.min(player.maxHp, player.hp+p.heal); fireScriptEvent('itemCollected'); } }
  if (player.hp<=0) { endGame(false); return; }
  if (goal && rectsOverlap(player, goal)) { fireScriptEvent('allEnemiesDefeated'); endGame(true); return; }
  if (enemies.length && enemies.every(e=>!e.alive)) { fireScriptEvent('allEnemiesDefeated'); endGame(true); return; }
}

function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='rgba(148,163,184,0.15)'; ctx.fillRect(scene.arena.x, scene.arena.y, scene.arena.w, scene.arena.h);
  ctx.strokeStyle='rgba(148,163,184,0.4)'; ctx.strokeRect(scene.arena.x, scene.arena.y, scene.arena.w, scene.arena.h);
  if (MODE === 'platformer') {
    ctx.fillStyle='rgba(100,116,139,0.5)'; ctx.fillRect(scene.arena.x, scene.groundY, scene.arena.w, scene.arena.y+scene.arena.h-scene.groundY);
    for (const p of scene.platforms) { ctx.fillStyle='rgba(100,116,139,0.7)'; ctx.fillRect(p.x,p.y,p.w,p.h); }
    if (scene.goal) { ctx.fillStyle='#facc15'; ctx.fillRect(scene.goal.x, scene.goal.y, scene.goal.w, scene.goal.h); }
  }
  for (const p of scene.pickups) { if (p.collected) continue; ctx.fillStyle = p.damageBonus?'#f59e0b':p.heal?'#22c55e':'#94a3b8'; ctx.fillRect(p.x,p.y,p.w,p.h); }
  for (const e of scene.enemies) { if (!e.alive) continue; drawHumanoid(e, { walkPhase: e.walkPhase, hit: e.hitFlash, facing: e.patrolDir||1, grounded:true }); drawHealthBar(e, e.hp/e.maxHp); }
  drawHumanoid(scene.player, { walkPhase: scene.player.walkPhase, attacking: scene.player.attackFlash>0 ? 0.5 : 0, hit:0, facing: scene.player.facing||1, grounded: scene.player.onGround !== false });
}

function loop(ts) {
  const dt = Math.min(0.05, (ts-lastTs)/1000); lastTs = ts;
  if (status === 'playing') {
    scene.elapsedMs += dt*1000;
    if (MODE === 'platformer') updatePlatformer(dt); else updateArena(dt);
    pollScriptConditions();
    if (msgTimer > 0) { msgTimer -= dt*1000; if (msgTimer<=0) hud.msg.style.opacity='0'; }
    updateHud();
    draw();
  }
  requestAnimationFrame(loop);
}
fireScriptEvent('start');
updateHud();
draw();
requestAnimationFrame(loop);
`;

export function buildStandaloneHTML(scene, mode, title) {
  const safeTitle = escapeHtml(title || 'GameForge Play Export');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safeTitle}</title>
<meta name="description" content="A standalone playable prototype exported from GameForge Studio. No server, no dependencies — just open this file." />
<style>
  html,body{margin:0;height:100%;background:#0f1115;color:#e2e8f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif;}
  #wrap{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px;}
  h1{font-size:16px;font-weight:600;margin:0;}
  #stage{position:relative;}
  canvas{border-radius:12px;border:1px solid #334155;background:#1e2430;display:block;}
  #hudbar{position:absolute;top:8px;left:8px;right:8px;background:rgba(15,17,21,0.85);border:1px solid #334155;border-radius:10px;padding:8px 12px;display:flex;gap:14px;align-items:center;flex-wrap:wrap;font-size:12px;}
  #hpTrack{flex:1;min-width:140px;height:8px;background:#334155;border-radius:999px;overflow:hidden;}
  #hpFill{height:100%;background:#4f46e5;transition:width .2s;}
  #msg{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);background:rgba(15,17,21,0.9);border:1px solid #334155;border-radius:10px;padding:8px 14px;font-size:13px;opacity:0;transition:opacity .3s;}
  #overlay{position:absolute;inset:0;display:none;align-items:center;justify-content:center;flex-direction:column;gap:8px;background:rgba(15,17,21,0.85);border-radius:12px;text-align:center;padding:16px;}
  #overlay h2{margin:0;font-size:22px;}
  .hint{font-size:12px;color:#94a3b8;max-width:560px;text-align:center;}
</style>
</head>
<body>
<div id="wrap">
  <h1>${safeTitle}</h1>
  <p class="hint">${mode === 'platformer' ? 'A/D or arrows to move, W/Up/Space to jump, Enter to attack. Stomp enemies from above or reach the yellow goal.' : 'WASD/arrows to move, Space to attack.'} Exported standalone from GameForge Studio — no server or install needed.</p>
  <div id="stage">
    <canvas id="game" width="800" height="480"></canvas>
    <div id="hudbar">
      <div id="hpTrack"><div id="hpFill"></div></div>
      <span id="hp"></span><span id="enemies"></span><span id="items"></span><span id="timer"></span>
    </div>
    <div id="msg"></div>
    <div id="overlay"><h2></h2><p></p></div>
  </div>
</div>
<script>
window.__EXPORTED_SCENE__ = ${JSON.stringify(scene)};
window.__EXPORTED_MODE__ = ${JSON.stringify(mode)};
</script>
<script>
${RUNTIME_JS}
</script>
</body>
</html>
`;
}
