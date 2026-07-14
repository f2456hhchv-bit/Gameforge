// Converts a real Level Designer entity — plus whatever it links to in
// Character Studio / Item Studio, and its authored Level Script — into a
// playable scene descriptor for the Play Engine. Falls back to sane
// project-wide defaults whenever a level hasn't been explicitly linked yet,
// so "Play" always produces something rather than an empty room.
import { store } from '../store.js';
import { pick, pickN } from '../util.js';
import { statNum } from './physics.js';
import { parseScript } from './scripting.js';

export const ARENA = { x: 20, y: 20, w: 760, h: 440 };
const ENTITY_SIZE = 28;
const MAX_ENEMIES = 6;
const MAX_PICKUPS = 5;
const GROUND_Y = ARENA.y + ARENA.h - 40;
const PLATFORMS = [
  { x: ARENA.x + 160, y: GROUND_Y - 90, w: 120, h: 16 },
  { x: ARENA.x + 360, y: GROUND_Y - 160, w: 120, h: 16 },
  { x: ARENA.x + 560, y: GROUND_Y - 90, w: 120, h: 16 },
];

function buildPlayer(mode) {
  const playerChar = store.list('characters').find(c => c.subtype === 'player');
  const base = {
    x: ARENA.x + 24, y: mode === 'platformer' ? GROUND_Y - ENTITY_SIZE : ARENA.y + ARENA.h / 2 - ENTITY_SIZE / 2,
    w: ENTITY_SIZE, h: ENTITY_SIZE,
    hp: statNum(playerChar?.statistics, 'Health', 100),
    maxHp: statNum(playerChar?.statistics, 'Health', 100),
    damage: statNum(playerChar?.statistics, 'Damage', 12),
    defense: statNum(playerChar?.statistics, 'Defense', 0),
    speed: 180,
    name: playerChar?.name || 'Player',
    attackCooldown: 0,
    attackFlash: 0,
    walkPhase: 0,
  };
  if (mode === 'platformer') { base.vy = 0; base.onGround = true; base.facing = 1; }
  return base;
}

function buildEnemies(level, mode) {
  let source = (level.links?.enemies || []).map(id => store.get('characters', id)).filter(Boolean);
  if (!source.length) source = store.list('characters').filter(c => ['enemy', 'boss', 'wildlife', 'elite'].includes(c.subtype));
  source = source.slice(0, MAX_ENEMIES);

  const cols = Math.max(1, Math.ceil(Math.sqrt(source.length)));
  return source.map((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const hp = statNum(c.statistics, 'Health', 30);
    const enemy = {
      id: c.id, name: c.name || 'Enemy', subtype: c.subtype,
      w: ENTITY_SIZE, h: ENTITY_SIZE,
      hp, maxHp: hp,
      damage: statNum(c.statistics, 'Damage', 6),
      defense: statNum(c.statistics, 'Defense', 0),
      speed: Math.max(30, statNum(c.statistics, 'Speed', 4) * 18),
      attackTimer: 0, alive: true, hitFlash: 0, walkPhase: i * 0.3,
    };
    if (mode === 'platformer') {
      enemy.x = ARENA.x + 220 + i * 130;
      enemy.y = GROUND_Y - ENTITY_SIZE;
      enemy.patrolCenter = enemy.x;
      enemy.patrolDir = 1;
      enemy.vy = 0;
    } else {
      enemy.x = ARENA.x + ARENA.w - 70 - col * 70;
      enemy.y = ARENA.y + 40 + row * 70;
    }
    return enemy;
  });
}

function buildPickups(level, mode, rng) {
  let source = (level.links?.lootTable || []).map(id => store.get('items', id)).filter(Boolean);
  if (!source.length) source = pickN(store.list('items'), Math.min(store.list('items').length, 3), rng);
  source = source.slice(0, MAX_PICKUPS);

  return source.map((it, i) => ({
    id: it.id, name: it.name || 'Item', subtype: it.subtype, rarity: it.rarity,
    x: mode === 'platformer' ? PLATFORMS[i % PLATFORMS.length].x + 48 : ARENA.x + 40 + i * 70,
    y: mode === 'platformer' ? PLATFORMS[i % PLATFORMS.length].y - 20 : ARENA.y + ARENA.h - 50,
    w: 20, h: 20,
    collected: false, __t: i,
    damageBonus: it.subtype === 'weapon' ? Math.max(2, Math.round(statNum(it.statistics, 'Damage', 10) / 3)) : 0,
    heal: it.subtype === 'consumable' ? 25 : 0,
  }));
}

const MAX_ROOMS = 4;

// In Arena mode, splits the level's own generated `rooms` list (previously
// just shown as a label) across the enemy roster so a level plays out as a
// real multi-room crawl: clear the current room's enemies to advance,
// rather than one flat pile of enemies in a single space.
function buildRoomQueue(level, allEnemies) {
  const roomNames = (level.rooms && level.rooms.length ? level.rooms : []).slice(0, MAX_ROOMS);
  if (roomNames.length < 2 || allEnemies.length < 2) return null;
  const queue = roomNames.map(() => []);
  allEnemies.forEach((e, i) => queue[i % queue.length].push(e));
  const nonEmpty = queue.map((enemies, i) => ({ label: roomNames[i], enemies })).filter(r => r.enemies.length);
  return nonEmpty.length > 1 ? nonEmpty : null;
}

// rng: optional seeded rng (falls back to Math.random via util's pick/pickN defaults).
// mode: 'arena' (default, top-down) | 'platformer' | 'turnbased'.
export function buildScene(level, rng = Math.random, mode = 'arena') {
  const allEnemies = buildEnemies(level, mode);
  const roomQueue = mode === 'arena' ? buildRoomQueue(level, allEnemies) : null;

  const scene = {
    mode,
    arena: ARENA,
    roomLabel: roomQueue ? roomQueue[0].label : ((level.rooms && level.rooms[0]) || level.name || 'Arena'),
    objectiveText: (level.objectives && level.objectives[0]) || 'Clear the area.',
    player: buildPlayer(mode),
    enemies: roomQueue ? roomQueue[0].enemies : allEnemies,
    pickups: buildPickups(level, mode, rng),
    elapsedMs: 0,
    itemsCollected: 0,
    scriptRules: parseScript(level.levelScript),
    log: [],
    roomQueue, roomIndex: 0,
  };
  if (mode === 'platformer') {
    scene.groundY = GROUND_Y;
    scene.platforms = PLATFORMS;
    scene.goal = { x: ARENA.x + ARENA.w - 40, y: GROUND_Y - 40, w: 24, h: 40 };
  }
  return scene;
}
