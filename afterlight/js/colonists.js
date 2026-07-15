import { ROOM_TYPES } from './data.js';
import { makeColonist, pushLog, popCap } from './state.js';
import { findRoom, allRooms } from './rooms.js';

export function roomCapacity(room) {
  if (room.type === 'elevator') return 0;
  return room.width * 2;
}

export function colonistsInRoom(state, room) {
  return room.colonistIds.map(id => state.colonists.find(c => c.id === id)).filter(Boolean);
}

export function assignColonist(state, colonistId, roomId) {
  const colonist = state.colonists.find(c => c.id === colonistId);
  const room = findRoom(state, roomId);
  if (!colonist) return { ok: false, reason: 'Colonist not found.' };
  if (!room) return { ok: false, reason: 'Room not found.' };
  if (room.type === 'elevator') return { ok: false, reason: 'Colonists cannot be stationed in an elevator.' };
  if (room.colonistIds.length >= roomCapacity(room)) return { ok: false, reason: 'That room is fully staffed.' };
  if (colonist.status === 'injured') return { ok: false, reason: `${colonist.name} is injured and needs the Med Bay.` };

  unassignColonist(state, colonistId, { silent: true });
  room.colonistIds.push(colonistId);
  colonist.roomId = room.id;
  colonist.status = 'working';
  return { ok: true };
}

export function unassignColonist(state, colonistId, opts = {}) {
  const colonist = state.colonists.find(c => c.id === colonistId);
  if (!colonist) return { ok: false, reason: 'Colonist not found.' };
  if (colonist.roomId) {
    const room = findRoom(state, colonist.roomId);
    if (room) room.colonistIds = room.colonistIds.filter(id => id !== colonistId);
  }
  colonist.roomId = null;
  if (colonist.status === 'working') colonist.status = 'idle';
  return { ok: true };
}

export function statBonusMultiplier(room, state) {
  const def = ROOM_TYPES[room.type];
  const workers = colonistsInRoom(state, room);
  if (workers.length === 0) return 0;
  const statSum = workers.reduce((sum, c) => sum + c.stats[def.statKey], 0);
  // Each point of the relevant stat adds 6% output; a full stat-10 crew roughly doubles base.
  return workers.length > 0 ? 1 + (statSum / workers.length - 4) * 0.06 * workers.length : 0;
}

const PAIR_CHANCE_PER_TICK = 0.0015;

export function tickColonists(state) {
  for (const colonist of state.colonists) {
    if (colonist.status === 'injured') {
      colonist.health = Math.min(100, colonist.health + 0.15);
      if (colonist.health >= 40) colonist.status = colonist.roomId ? 'working' : 'idle';
    }
  }

  // Med bay healing
  for (const room of allRooms(state)) {
    if (room.type !== 'medbay') continue;
    const workers = colonistsInRoom(state, room);
    if (workers.length === 0) continue;
    const healRate = 0.5 * room.level * workers.length;
    for (const patient of state.colonists) {
      if (patient.health < 100 && patient.roomId !== room.id) {
        patient.health = Math.min(100, patient.health + healRate * 0.15);
      }
    }
  }

  // Happiness drifts toward a target based on resource satisfaction (set by resources.js via state._happinessTarget)
  const target = state._happinessTarget ?? 75;
  for (const colonist of state.colonists) {
    colonist.happiness += (target - colonist.happiness) * 0.05;
    colonist.happiness = Math.max(0, Math.min(100, colonist.happiness));
  }

  // Pairing -> new recruits, only in Living Quarters with 2+ assigned and room under population cap
  const cap = popCap(state);
  if (state.colonists.length < cap) {
    for (const room of allRooms(state)) {
      if (room.type !== 'quarters') continue;
      const workers = colonistsInRoom(state, room);
      if (workers.length >= 2 && Math.random() < PAIR_CHANCE_PER_TICK * room.level) {
        const recruit = makeColonist();
        state.colonists.push(recruit);
        pushLog(state, `${recruit.name} was born aboard the outpost.`);
        break;
      }
    }
  }
}

export function injureColonist(state, colonistId, amount) {
  const colonist = state.colonists.find(c => c.id === colonistId);
  if (!colonist) return;
  colonist.health = Math.max(0, colonist.health - amount);
  if (colonist.health <= 0) {
    colonist.health = 0;
    colonist.status = 'injured';
    unassignColonist(state, colonistId, { silent: true });
    pushLog(state, `${colonist.name} collapsed and was rushed to stasis.`);
  } else if (colonist.health < 40 && colonist.status !== 'firefighting') {
    colonist.status = 'injured';
  }
}
