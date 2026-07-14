// Converts a real Level Designer entity — plus whatever it links to in
// Character Studio / Item Studio — into a playable scene descriptor for the
// Play Engine. Falls back to sane project-wide defaults whenever a level
// hasn't been explicitly linked yet, so "Play" always produces something
// rather than an empty room.
import { store } from '../store.js';
import { pick, pickN } from '../util.js';
import { statNum } from './physics.js';

export const ARENA = { x: 20, y: 20, w: 760, h: 440 };
const ENTITY_SIZE = 28;
const MAX_ENEMIES = 6;
const MAX_PICKUPS = 5;

function buildPlayer() {
  const playerChar = store.list('characters').find(c => c.subtype === 'player');
  return {
    x: ARENA.x + 24, y: ARENA.y + ARENA.h / 2 - ENTITY_SIZE / 2, w: ENTITY_SIZE, h: ENTITY_SIZE,
    hp: statNum(playerChar?.statistics, 'Health', 100),
    maxHp: statNum(playerChar?.statistics, 'Health', 100),
    damage: statNum(playerChar?.statistics, 'Damage', 12),
    defense: statNum(playerChar?.statistics, 'Defense', 0),
    speed: 180,
    name: playerChar?.name || 'Player',
    attackCooldown: 0,
    attackFlash: 0,
  };
}

function buildEnemies(level) {
  let source = (level.links?.enemies || []).map(id => store.get('characters', id)).filter(Boolean);
  if (!source.length) source = store.list('characters').filter(c => ['enemy', 'boss', 'wildlife', 'elite'].includes(c.subtype));
  source = source.slice(0, MAX_ENEMIES);

  const cols = Math.max(1, Math.ceil(Math.sqrt(source.length)));
  return source.map((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const hp = statNum(c.statistics, 'Health', 30);
    return {
      id: c.id, name: c.name || 'Enemy', subtype: c.subtype,
      x: ARENA.x + ARENA.w - 70 - col * 70, y: ARENA.y + 40 + row * 70, w: ENTITY_SIZE, h: ENTITY_SIZE,
      hp, maxHp: hp,
      damage: statNum(c.statistics, 'Damage', 6),
      defense: statNum(c.statistics, 'Defense', 0),
      speed: Math.max(30, statNum(c.statistics, 'Speed', 4) * 18),
      attackTimer: 0, alive: true, hitFlash: 0,
    };
  });
}

function buildPickups(level, rng) {
  let source = (level.links?.lootTable || []).map(id => store.get('items', id)).filter(Boolean);
  if (!source.length) source = pickN(store.list('items'), Math.min(store.list('items').length, 3), rng);
  source = source.slice(0, MAX_PICKUPS);

  return source.map((it, i) => ({
    id: it.id, name: it.name || 'Item', subtype: it.subtype, rarity: it.rarity,
    x: ARENA.x + 40 + i * 70, y: ARENA.y + ARENA.h - 50, w: 20, h: 20,
    collected: false,
    damageBonus: it.subtype === 'weapon' ? Math.max(2, Math.round(statNum(it.statistics, 'Damage', 10) / 3)) : 0,
    heal: it.subtype === 'consumable' ? 25 : 0,
  }));
}

// rng: optional seeded rng (falls back to Math.random via util's pick/pickN defaults).
export function buildScene(level, rng = Math.random) {
  return {
    arena: ARENA,
    roomLabel: (level.rooms && level.rooms[0]) || level.name || 'Arena',
    objectiveText: (level.objectives && level.objectives[0]) || 'Clear the area.',
    player: buildPlayer(),
    enemies: buildEnemies(level),
    pickups: buildPickups(level, rng),
    elapsedMs: 0,
    itemsCollected: 0,
  };
}
