import { STARTING_CREDITS, randomName, STAT_KEYS } from './data.js';

const SAVE_KEY = 'afterlight.save.v1';
let idCounter = 1;
export function nextId(prefix) {
  return `${prefix}_${idCounter++}_${Math.floor(Math.random() * 1e6)}`;
}

function randomStat() {
  return 2 + Math.floor(Math.random() * 6); // 2-7
}

export function makeColonist(overrides = {}) {
  return {
    id: nextId('col'),
    name: randomName(),
    stats: {
      str: randomStat(), int: randomStat(), agi: randomStat(), chr: randomStat(),
    },
    health: 100,
    happiness: 80,
    roomId: null,
    status: 'idle', // idle | working | firefighting | injured
    ...overrides,
  };
}

export function makeFloor(index) {
  return { index, rooms: [] };
}

export function newGame() {
  const state = {
    version: 1,
    createdAt: Date.now(),
    credits: STARTING_CREDITS,
    resources: {
      power: { amount: 60, cap: 100 },
      food: { amount: 60, cap: 100 },
      water: { amount: 60, cap: 100 },
      air: { amount: 60, cap: 100 },
    },
    floors: [makeFloor(0)],
    colonists: [makeColonist(), makeColonist(), makeColonist()],
    incidents: [], // {id, roomId, severity, startedAt}
    log: [],
    tick: 0,
    selection: null, // {mode:'build', roomType} | {mode:'room', roomId} | {mode:'colonist', colonistId}
  };
  pushLog(state, 'The outpost powers up. Three colonists step out of cryo.');
  return state;
}

export function pushLog(state, message) {
  state.log.unshift({ id: nextId('log'), message, tick: state.tick, at: Date.now() });
  if (state.log.length > 200) state.log.length = 200;
}

export function popCap(state) {
  const quartersCap = state.floors.flatMap(f => f.rooms).filter(r => r.type === 'quarters')
    .reduce((sum, r) => sum + r.width * 2 * r.level, 0);
  return 3 + quartersCap; // base 3 starter colonists always housed
}

export function save(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.error('Afterlight save failed', e);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // bump idCounter clear of any loaded ids to avoid collisions
    idCounter += 100000;
    return parsed;
  } catch (e) {
    console.error('Afterlight load failed', e);
    return null;
  }
}

export function hasSave() {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* ignore */ }
}

export { STAT_KEYS };
