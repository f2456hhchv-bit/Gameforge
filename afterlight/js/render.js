import { FLOOR_WIDTH, CELL_PX, FLOOR_PX, ROOM_TYPES } from './data.js';
import { occupiedCells, findFirstFit } from './rooms.js';
import { colonistsInRoom } from './colonists.js';
import { isRoomOnFire } from './incidents.js';

export const MARGIN_LEFT = 34;
export const MARGIN_TOP = 70;

export function canvasSize(state) {
  return {
    width: MARGIN_LEFT + FLOOR_WIDTH * CELL_PX + 16,
    height: MARGIN_TOP + state.floors.length * FLOOR_PX + 16,
  };
}

export function cellFromPoint(state, x, y) {
  const fx = x - MARGIN_LEFT;
  const fy = y - MARGIN_TOP;
  if (fx < 0 || fy < 0) return null;
  const floorIndex = Math.floor(fy / FLOOR_PX);
  const col = Math.floor(fx / CELL_PX);
  if (floorIndex < 0 || floorIndex >= state.floors.length) return null;
  if (col < 0 || col >= FLOOR_WIDTH) return null;
  return { floorIndex, col };
}

export function roomAt(state, floorIndex, col) {
  const floor = state.floors[floorIndex];
  if (!floor) return null;
  return floor.rooms.find(r => col >= r.x && col < r.x + r.width) || null;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function draw(ctx, state, opts = {}) {
  const { width, height } = canvasSize(state);
  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#0a0e16';
  ctx.fillRect(0, 0, width, height);

  // Exterior header: airlock hull
  ctx.fillStyle = '#151b26';
  ctx.fillRect(0, 0, width, MARGIN_TOP);
  ctx.fillStyle = '#2a3444';
  roundRect(ctx, width / 2 - 30, 14, 60, MARGIN_TOP - 24, 8);
  ctx.fill();
  ctx.strokeStyle = '#586378';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#9fd4ff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('🚀', width / 2, MARGIN_TOP - 24);
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#7a889c';
  ctx.fillText('AIRLOCK', width / 2, MARGIN_TOP - 8);

  // Left hull margin decoration
  ctx.fillStyle = '#12161f';
  ctx.fillRect(0, MARGIN_TOP, MARGIN_LEFT, state.floors.length * FLOOR_PX);
  ctx.strokeStyle = '#232c3a';
  for (let i = 0; i < state.floors.length * FLOOR_PX; i += 10) {
    ctx.beginPath();
    ctx.moveTo(2, MARGIN_TOP + i);
    ctx.lineTo(MARGIN_LEFT - 2, MARGIN_TOP + i + 6);
    ctx.stroke();
  }

  state.floors.forEach((floor, floorIndex) => {
    const floorY = MARGIN_TOP + floorIndex * FLOOR_PX;
    const cells = occupiedCells(floor);

    // Empty background strip for the floor
    ctx.fillStyle = '#0d1119';
    ctx.fillRect(MARGIN_LEFT, floorY, FLOOR_WIDTH * CELL_PX, FLOOR_PX);

    // Empty cell slots
    for (let col = 0; col < FLOOR_WIDTH; col++) {
      if (cells[col] !== null) continue;
      const x = MARGIN_LEFT + col * CELL_PX;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.strokeRect(x + 1, floorY + 1, CELL_PX - 2, FLOOR_PX - 2);
    }

    // Build preview
    if (opts.buildPreview && opts.buildPreview.floorIndex === floorIndex) {
      const { x: previewX, width: previewWidth, valid } = opts.buildPreview;
      ctx.fillStyle = valid ? 'rgba(95,193,119,0.35)' : 'rgba(224,96,122,0.35)';
      ctx.fillRect(MARGIN_LEFT + previewX * CELL_PX, floorY, previewWidth * CELL_PX, FLOOR_PX);
    }

    for (const room of floor.rooms) {
      drawRoom(ctx, state, room, floorY, opts);
    }
  });
}

function drawRoom(ctx, state, room, floorY, opts) {
  const def = ROOM_TYPES[room.type];
  const x = MARGIN_LEFT + room.x * CELL_PX;
  const w = room.width * CELL_PX;
  const h = FLOOR_PX - 6;
  const y = floorY + 3;
  const onFire = isRoomOnFire(room);
  const selected = opts.selectedRoomId === room.id;

  ctx.save();
  roundRect(ctx, x + 2, y, w - 4, h, 6);
  ctx.fillStyle = def.color;
  ctx.globalAlpha = room.type === 'elevator' ? 0.55 : 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.lineWidth = selected ? 3 : 1.5;
  ctx.strokeStyle = selected ? '#ffffff' : 'rgba(0,0,0,0.4)';
  ctx.stroke();
  ctx.restore();

  if (room.type !== 'elevator') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${def.icon} ${def.name} Lv${room.level}`, x + 8, y + 14);

    // Colonists as small dots
    const workers = colonistsInRoom(state, room);
    workers.forEach((c, i) => {
      const cx = x + 16 + i * 20;
      const cy = y + h - 16;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = c.status === 'injured' ? '#e0607a' : '#f2f2f2';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
    });

    // Capacity indicator
    const cap = room.width * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${workers.length}/${cap}`, x + w - 8, y + 14);
  } else {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⬍', x + w / 2, y + h / 2 + 5);
  }

  if (onFire) {
    ctx.font = `${16 + Math.min(14, room.fire.severity / 8)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('🔥', x + w - 18, y + h - 8);
  }
}
