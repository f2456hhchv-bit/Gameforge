import { ROOM_TYPES } from './data.js';
import { allRooms, findRoom } from './rooms.js';
import { colonistsInRoom, injureColonist, unassignColonist } from './colonists.js';
import { pushLog, nextId } from './state.js';

const BASE_FIRE_CHANCE = 0.0018;
const MAX_CONCURRENT_FIRES = 4;

export function isRoomOnFire(room) {
  return !!room.fire && room.fire.severity > 0;
}

export function tickIncidents(state) {
  maybeSpawnFire(state);

  for (const room of allRooms(state)) {
    if (!isRoomOnFire(room)) continue;
    const fire = room.fire;
    const fighters = fire.firefighterIds
      .map(id => state.colonists.find(c => c.id === id))
      .filter(c => c && c.health > 0);
    fire.firefighterIds = fighters.map(c => c.id);

    const suppression = fighters.reduce((sum, c) => sum + c.stats.str, 0) * 0.9;
    fire.severity = Math.max(0, fire.severity + fire.growth - suppression);

    // Anyone stationed and working in a burning room (not firefighting) takes damage.
    const occupants = colonistsInRoom(state, room).filter(c => c.status !== 'firefighting');
    for (const occupant of occupants) {
      injureColonist(state, occupant.id, 0.6 * (fire.severity / 100));
    }

    if (fire.severity >= 100 && !fire.spread) {
      fire.spread = true;
      spreadFire(state, room);
    }

    if (fire.severity <= 0) {
      pushLog(state, `The fire in ${ROOM_TYPES[room.type].name} (floor ${room.floor + 1}) was put out.`);
      for (const id of fire.firefighterIds) {
        const c = state.colonists.find(x => x.id === id);
        if (c) c.status = c.roomId ? 'working' : 'idle';
      }
      room.fire = null;
    }
  }
}

function maybeSpawnFire(state) {
  const activeFires = allRooms(state).filter(isRoomOnFire).length;
  if (activeFires >= MAX_CONCURRENT_FIRES) return;
  const candidates = allRooms(state).filter(r => r.type !== 'elevator' && !isRoomOnFire(r));
  if (candidates.length === 0) return;
  const powerDeficit = state.resources.power.amount <= 0.01;
  const chance = BASE_FIRE_CHANCE * (powerDeficit ? 4 : 1);
  if (Math.random() > chance * candidates.length) return;
  const room = candidates[Math.floor(Math.random() * candidates.length)];
  startFire(state, room);
}

function startFire(state, room) {
  room.fire = {
    id: nextId('fire'),
    severity: 15 + Math.random() * 10,
    growth: 1.2 + Math.random() * 0.8,
    firefighterIds: [],
    spread: false,
  };
  pushLog(state, `Fire alert! ${ROOM_TYPES[room.type].name} on floor ${room.floor + 1} is burning.`);
}

function spreadFire(state, sourceRoom) {
  const floor = state.floors[sourceRoom.floor];
  const neighbors = floor.rooms.filter(r =>
    r.id !== sourceRoom.id && r.type !== 'elevator' && !isRoomOnFire(r) &&
    (Math.abs(r.x - sourceRoom.x) <= sourceRoom.width || Math.abs((r.x + r.width) - (sourceRoom.x + sourceRoom.width)) <= r.width)
  );
  if (neighbors.length === 0) return;
  const target = neighbors[Math.floor(Math.random() * neighbors.length)];
  startFire(state, target);
}

export function dispatchFirefighters(state, roomId, colonistIds) {
  const room = findRoom(state, roomId);
  if (!room || !isRoomOnFire(room)) return { ok: false, reason: 'No fire in that room.' };
  for (const id of colonistIds) {
    const colonist = state.colonists.find(c => c.id === id);
    if (!colonist || colonist.health <= 0) continue;
    if (colonist.status === 'firefighting') continue;
    unassignColonist(state, id, { silent: true });
    colonist.status = 'firefighting';
    if (!room.fire.firefighterIds.includes(id)) room.fire.firefighterIds.push(id);
  }
  return { ok: true };
}

export function availableColonists(state) {
  return state.colonists.filter(c => c.status === 'idle' && c.health > 20);
}
