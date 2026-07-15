import { ROOM_TYPES, FLOOR_WIDTH, TICK_MS } from './data.js';
import { newGame, save, load, clearSave } from './state.js';
import { buildRoom, upgradeRoom, digFloor, occupiedCells } from './rooms.js';
import { assignColonist, unassignColonist, tickColonists } from './colonists.js';
import { tickResources } from './resources.js';
import { tickIncidents, dispatchFirefighters } from './incidents.js';
import { draw, canvasSize, cellFromPoint, roomAt } from './render.js';
import { buildUI, renderTopbar, updateBuildBarState, renderSidePanel, renderLog, showToast } from './ui.js';

let state = load() || newGame();

const root = document.getElementById('app');
const callbacks = {
  onSelectBuildTool(type) {
    state.selection = (state.selection && state.selection.mode === 'build' && state.selection.roomType === type)
      ? null
      : { mode: 'build', roomType: type };
    renderAll();
  },
  onDigFloor() {
    const result = digFloor(state);
    showToast(result.ok ? 'New floor excavated.' : result.reason, result.ok ? 'success' : 'error');
    renderAll();
  },
  onSave() {
    const ok = save(state);
    showToast(ok ? 'Progress saved.' : 'Save failed.', ok ? 'success' : 'error');
  },
  onResetGame() {
    if (!confirm('Start a new outpost? Your current progress will be lost unless already saved.')) return;
    clearSave();
    state = newGame();
    state.selection = null;
    renderAll();
  },
  onAssignColonist(colonistId, roomId) {
    const result = assignColonist(state, colonistId, roomId);
    if (!result.ok) showToast(result.reason, 'error');
    renderAll();
  },
  onUnassign(colonistId) {
    unassignColonist(state, colonistId);
    renderAll();
  },
  onUpgradeRoom(roomId) {
    const result = upgradeRoom(state, roomId);
    if (!result.ok) showToast(result.reason, 'error');
    renderAll();
  },
  onDispatchFirefighters(roomId, colonistIds) {
    dispatchFirefighters(state, roomId, colonistIds);
    renderAll();
  },
  onDeselect() {
    state.selection = null;
    renderAll();
  },
};

const refs = buildUI(root, callbacks);
const ctx = refs.canvas.getContext('2d');
let hoverCell = null;

function computeBuildPlacement(floorIndex, col, maxWidth) {
  const floor = state.floors[floorIndex];
  const cells = occupiedCells(floor);
  if (cells[col] !== null) return null;
  let left = col, right = col;
  while (left - 1 >= 0 && cells[left - 1] === null) left--;
  while (right + 1 < FLOOR_WIDTH && cells[right + 1] === null) right++;
  const runLength = right - left + 1;
  const width = Math.min(maxWidth, runLength);
  let startX = col;
  if (startX + width - 1 > right) startX = right - width + 1;
  if (startX < left) startX = left;
  return { startX, width };
}

function drawCanvas() {
  const { width, height } = canvasSize(state);
  refs.canvas.width = width;
  refs.canvas.height = height;

  let buildPreview = null;
  if (state.selection && state.selection.mode === 'build' && hoverCell) {
    const def = ROOM_TYPES[state.selection.roomType];
    const maxWidth = def.fixedWidth || 3;
    const placement = computeBuildPlacement(hoverCell.floorIndex, hoverCell.col, maxWidth);
    if (placement) {
      buildPreview = {
        floorIndex: hoverCell.floorIndex,
        x: placement.startX,
        width: placement.width,
        valid: true,
      };
    } else {
      buildPreview = { floorIndex: hoverCell.floorIndex, x: hoverCell.col, width: 1, valid: false };
    }
  }

  draw(ctx, state, {
    buildPreview,
    selectedRoomId: state.selection && state.selection.mode === 'room' ? state.selection.roomId : null,
  });
}

function renderAll() {
  renderTopbar(refs, state, callbacks);
  updateBuildBarState(refs, state);
  renderSidePanel(refs, state, callbacks);
  renderLog(refs, state);
  drawCanvas();
}

refs.canvas.addEventListener('mousemove', (e) => {
  const rect = refs.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (refs.canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (refs.canvas.height / rect.height);
  const cell = cellFromPoint(state, x, y);
  if (JSON.stringify(cell) !== JSON.stringify(hoverCell)) {
    hoverCell = cell;
    if (state.selection && state.selection.mode === 'build') drawCanvas();
  }
});

refs.canvas.addEventListener('mouseleave', () => {
  hoverCell = null;
  if (state.selection && state.selection.mode === 'build') drawCanvas();
});

refs.canvas.addEventListener('click', (e) => {
  const rect = refs.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (refs.canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (refs.canvas.height / rect.height);
  const cell = cellFromPoint(state, x, y);
  if (!cell) return;

  if (state.selection && state.selection.mode === 'build') {
    const type = state.selection.roomType;
    const def = ROOM_TYPES[type];
    const maxWidth = def.fixedWidth || 3;
    const placement = computeBuildPlacement(cell.floorIndex, cell.col, maxWidth);
    if (!placement) {
      showToast('No space there.', 'error');
      return;
    }
    const result = buildRoom(state, cell.floorIndex, placement.startX, placement.width, type);
    if (result.ok) {
      showToast(`Built ${def.name}.`, 'success');
      state.selection = null;
    } else {
      showToast(result.reason, 'error');
    }
    renderAll();
    return;
  }

  const room = roomAt(state, cell.floorIndex, cell.col);
  state.selection = room ? { mode: 'room', roomId: room.id } : null;
  renderAll();
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && state.selection) {
    state.selection = null;
    renderAll();
  }
});

let accumulatorMs = 0;
let lastTime = performance.now();
let ticksSinceSave = 0;

function loop(now) {
  const dt = now - lastTime;
  lastTime = now;
  accumulatorMs += dt;

  let ticked = false;
  while (accumulatorMs >= TICK_MS) {
    accumulatorMs -= TICK_MS;
    state.tick += 1;
    tickColonists(state);
    tickResources(state);
    tickIncidents(state);
    ticked = true;
    ticksSinceSave += 1;
  }

  if (ticked) {
    renderAll();
    if (ticksSinceSave >= 15) {
      ticksSinceSave = 0;
      save(state);
    }
  }

  requestAnimationFrame(loop);
}

renderAll();
requestAnimationFrame(loop);

window.addEventListener('beforeunload', () => save(state));
