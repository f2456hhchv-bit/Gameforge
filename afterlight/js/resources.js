import { ROOM_TYPES, RESOURCE_META } from './data.js';
import { allRooms } from './rooms.js';
import { statBonusMultiplier, colonistsInRoom, injureColonist } from './colonists.js';
import { isRoomOnFire } from './incidents.js';
import { pushLog } from './state.js';

const BASE_CAP = 100;
const CONSUMPTION_PER_COLONIST = { food: 0.12, water: 0.12, air: 0.18 };
const PASSIVE_CREDITS_PER_TICK = 0.15;
const LOOT_CHANCE_PER_PRODUCING_ROOM = 0.01;

const RESOURCE_ROOM = { power: 'reactor', food: 'hydroponics', water: 'reclaimer', air: 'atmosphere' };

export function totalCap(state, resourceKey) {
  const cargoBonus = allRooms(state)
    .filter(r => r.type === 'cargo')
    .reduce((sum, r) => sum + ROOM_TYPES.cargo.storagePerWidth * r.width * r.level, 0);
  return BASE_CAP + cargoBonus;
}

export function tickResources(state) {
  const population = state.colonists.length;
  const powerRoom = state.resources.power;
  const powered = powerRoom.amount > 0.01;

  for (const key of ['power', 'food', 'water', 'air']) {
    const cap = totalCap(state, key);
    state.resources[key].cap = cap;
    const type = RESOURCE_ROOM[key];
    let produced = 0;
    for (const room of allRooms(state)) {
      if (room.type !== type) continue;
      if (isRoomOnFire(room)) continue;
      const workers = colonistsInRoom(state, room);
      if (workers.length === 0) continue;
      if (key !== 'power' && !powered) continue; // blackout halts non-power production
      const mult = statBonusMultiplier(room, state);
      produced += ROOM_TYPES[type].baseOutputPerWidth * room.width * room.level * Math.max(0.2, mult);
      if (Math.random() < LOOT_CHANCE_PER_PRODUCING_ROOM) {
        state.credits += Math.round(3 + Math.random() * 8);
      }
    }
    let consumed = 0;
    if (key !== 'power') consumed = CONSUMPTION_PER_COLONIST[key] * population;
    else consumed = 0.4 * Math.max(1, state.floors.reduce((n, f) => n + f.rooms.length, 0)) * 0.15; // base grid draw

    state.resources[key].amount = Math.max(0, Math.min(cap, state.resources[key].amount + produced - consumed));
  }

  state.credits += PASSIVE_CREDITS_PER_TICK;

  applyDeficitEffects(state);
}

function applyDeficitEffects(state) {
  const { power, food, water, air } = state.resources;
  let happinessPenalty = 0;

  if (power.amount <= 0.01) happinessPenalty += 15;
  if (food.amount <= 0.01) happinessPenalty += 10;
  if (water.amount <= 0.01) happinessPenalty += 10;

  if (air.amount <= 0.01) {
    happinessPenalty += 20;
    for (const colonist of state.colonists) {
      injureColonist(state, colonist.id, 1.2);
    }
    if (state.tick % 20 === 0) pushLog(state, 'Air reserves are empty — colonists are suffocating!');
  } else if (air.amount < air.cap * 0.15 && state.tick % 40 === 0) {
    pushLog(state, 'Air reserves critically low.');
  }

  if (food.amount <= 0.01 || water.amount <= 0.01) {
    for (const colonist of state.colonists) {
      injureColonist(state, colonist.id, 0.15);
    }
  }

  state._happinessTarget = Math.max(10, 75 - happinessPenalty);
}

export { RESOURCE_META };
