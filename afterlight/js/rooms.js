import { ROOM_TYPES, FLOOR_WIDTH } from './data.js';
import { nextId, makeFloor, pushLog } from './state.js';

export function occupiedCells(floor) {
  const cells = new Array(FLOOR_WIDTH).fill(null);
  for (const room of floor.rooms) {
    for (let i = 0; i < room.width; i++) cells[room.x + i] = room.id;
  }
  return cells;
}

export function canPlace(floor, x, width) {
  if (x < 0 || x + width > FLOOR_WIDTH) return false;
  const cells = occupiedCells(floor);
  for (let i = x; i < x + width; i++) {
    if (cells[i] !== null) return false;
  }
  return true;
}

export function findFirstFit(floor, width) {
  for (let x = 0; x <= FLOOR_WIDTH - width; x++) {
    if (canPlace(floor, x, width)) return x;
  }
  return -1;
}

export function roomCost(type, width) {
  const def = ROOM_TYPES[type];
  if (def.costFixed) return def.costFixed;
  return Math.round(def.costPerWidth * width);
}

export function upgradeCost(room) {
  const def = ROOM_TYPES[room.type];
  return Math.round(def.costPerWidth * room.width * (room.level + 1) * 1.4);
}

export function buildRoom(state, floorIndex, x, width, type) {
  const floor = state.floors[floorIndex];
  if (!floor) return { ok: false, reason: 'No such floor.' };
  const def = ROOM_TYPES[type];
  if (!def) return { ok: false, reason: 'Unknown room type.' };
  const w = def.fixedWidth || width;
  if (!canPlace(floor, x, w)) return { ok: false, reason: 'That space is occupied or out of bounds.' };
  const cost = roomCost(type, w);
  if (state.credits < cost) return { ok: false, reason: `Not enough credits (need ${cost}).` };

  state.credits -= cost;
  const room = {
    id: nextId('room'),
    type, floor: floorIndex, x, width: w, level: 1,
    hp: 100, colonistIds: [], fire: null,
  };
  floor.rooms.push(room);
  pushLog(state, `Built ${def.name} on floor ${floorIndex + 1}.`);
  return { ok: true, room };
}

export function upgradeRoom(state, roomId) {
  const room = findRoom(state, roomId);
  if (!room) return { ok: false, reason: 'Room not found.' };
  if (room.type === 'elevator') return { ok: false, reason: 'Elevators cannot be upgraded.' };
  if (room.level >= 3) return { ok: false, reason: 'Already at max level.' };
  const cost = upgradeCost(room);
  if (state.credits < cost) return { ok: false, reason: `Not enough credits (need ${cost}).` };
  state.credits -= cost;
  room.level += 1;
  pushLog(state, `Upgraded ${ROOM_TYPES[room.type].name} to level ${room.level}.`);
  return { ok: true, room };
}

export function findRoom(state, roomId) {
  for (const floor of state.floors) {
    const room = floor.rooms.find(r => r.id === roomId);
    if (room) return room;
  }
  return null;
}

export function allRooms(state) {
  return state.floors.flatMap(f => f.rooms);
}

export function floorHasElevator(floor) {
  return floor.rooms.some(r => r.type === 'elevator');
}

export function digFloorCost(state) {
  return 120 + (state.floors.length - 1) * 90;
}

export function digFloor(state) {
  const deepest = state.floors[state.floors.length - 1];
  if (!floorHasElevator(deepest)) {
    return { ok: false, reason: 'Build an Elevator Shaft on the floor above before digging deeper.' };
  }
  const cost = digFloorCost(state);
  if (state.credits < cost) return { ok: false, reason: `Not enough credits (need ${cost}).` };
  state.credits -= cost;
  state.floors.push(makeFloor(state.floors.length));
  pushLog(state, `Excavated floor ${state.floors.length}.`);
  return { ok: true };
}
