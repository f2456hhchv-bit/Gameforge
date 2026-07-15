import { ROOM_TYPES, BUILDABLE_ORDER, RESOURCE_META, STAT_NAMES } from './data.js';
import { roomCost, upgradeCost, digFloorCost, findRoom, floorHasElevator } from './rooms.js';
import { roomCapacity, colonistsInRoom } from './colonists.js';
import { isRoomOnFire, availableColonists } from './incidents.js';
import { popCap } from './state.js';

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text !== undefined) e.textContent = text;
  return e;
}

export function buildUI(root, callbacks) {
  root.innerHTML = '';
  const wrap = el('div', 'al-wrap');

  const topbar = el('div', 'al-topbar');
  wrap.appendChild(topbar);

  const gameArea = el('div', 'al-gamearea');
  const canvasWrap = el('div', 'al-canvaswrap');
  const canvas = document.createElement('canvas');
  canvas.id = 'al-canvas';
  canvasWrap.appendChild(canvas);
  gameArea.appendChild(canvasWrap);

  const sidepanel = el('div', 'al-sidepanel');
  gameArea.appendChild(sidepanel);
  wrap.appendChild(gameArea);

  const buildbar = el('div', 'al-buildbar');
  wrap.appendChild(buildbar);

  const logfeed = el('div', 'al-logfeed');
  wrap.appendChild(logfeed);

  root.appendChild(wrap);

  const refs = { topbar, canvas, canvasWrap, sidepanel, buildbar, logfeed };
  renderBuildBar(refs, callbacks);
  return refs;
}

function renderBuildBar(refs, callbacks) {
  refs.buildbar.innerHTML = '';
  const title = el('div', 'al-buildbar-title', 'Build:');
  refs.buildbar.appendChild(title);

  for (const type of BUILDABLE_ORDER) {
    const def = ROOM_TYPES[type];
    const btn = el('button', 'al-build-btn');
    btn.dataset.type = type;
    const cost = def.costFixed || def.costPerWidth * (def.fixedWidth || 3);
    btn.innerHTML = '';
    btn.appendChild(el('span', 'al-build-icon', def.icon));
    btn.appendChild(el('span', 'al-build-name', def.name));
    btn.appendChild(el('span', 'al-build-cost', `${cost}c`));
    btn.title = def.desc;
    btn.addEventListener('click', () => callbacks.onSelectBuildTool(type));
    refs.buildbar.appendChild(btn);
  }

  const digBtn = el('button', 'al-build-btn al-dig-btn');
  digBtn.appendChild(el('span', 'al-build-icon', '⛏'));
  digBtn.appendChild(el('span', 'al-build-name', 'Dig Floor'));
  digBtn.appendChild(el('span', 'al-build-cost al-dig-cost'));
  digBtn.addEventListener('click', () => callbacks.onDigFloor());
  refs.buildbar.appendChild(digBtn);
  refs._digBtn = digBtn;
}

export function renderTopbar(refs, state, callbacks) {
  refs.topbar.innerHTML = '';
  for (const key of ['power', 'food', 'water', 'air']) {
    const meta = RESOURCE_META[key];
    const res = state.resources[key];
    const pill = el('div', 'al-respill');
    const pct = res.cap > 0 ? res.amount / res.cap : 0;
    if (pct <= 0.05) pill.classList.add('al-respill-crit');
    else if (pct <= 0.25) pill.classList.add('al-respill-low');
    pill.appendChild(el('span', 'al-res-icon', meta.icon));
    pill.appendChild(el('span', 'al-res-amt', `${Math.floor(res.amount)}/${res.cap}`));
    refs.topbar.appendChild(pill);
  }
  const creditsPill = el('div', 'al-respill al-credits');
  creditsPill.appendChild(el('span', 'al-res-icon', '¢'));
  creditsPill.appendChild(el('span', 'al-res-amt', `${Math.floor(state.credits)}`));
  refs.topbar.appendChild(creditsPill);

  const popPill = el('div', 'al-respill al-pop');
  popPill.appendChild(el('span', 'al-res-icon', '👤'));
  popPill.appendChild(el('span', 'al-res-amt', `${state.colonists.length}/${popCap(state)}`));
  refs.topbar.appendChild(popPill);

  const spacer = el('div', 'al-topbar-spacer');
  refs.topbar.appendChild(spacer);

  const saveBtn = el('button', 'al-topbtn', '💾 Save');
  saveBtn.addEventListener('click', () => callbacks.onSave());
  refs.topbar.appendChild(saveBtn);

  const resetBtn = el('button', 'al-topbtn al-topbtn-danger', '↺ New Game');
  resetBtn.addEventListener('click', () => callbacks.onResetGame());
  refs.topbar.appendChild(resetBtn);
}

export function updateBuildBarState(refs, state) {
  refs.buildbar.querySelectorAll('.al-build-btn').forEach(btn => {
    const type = btn.dataset.type;
    if (!type) return;
    const def = ROOM_TYPES[type];
    const cost = def.costFixed || def.costPerWidth * (def.fixedWidth || 3);
    btn.classList.toggle('al-affordable', state.credits >= cost);
    btn.classList.toggle('al-selected', state.selection && state.selection.mode === 'build' && state.selection.roomType === type);
  });
  const cost = digFloorCost(state);
  refs._digBtn.querySelector('.al-dig-cost').textContent = `${cost}c`;
  const deepest = state.floors[state.floors.length - 1];
  refs._digBtn.classList.toggle('al-affordable', state.credits >= cost && floorHasElevator(deepest));
  refs._digBtn.disabled = !floorHasElevator(deepest);
  refs._digBtn.title = floorHasElevator(deepest) ? 'Excavate a new floor.' : 'Build an Elevator Shaft on the bottom floor first.';
}

export function renderLog(refs, state) {
  refs.logfeed.innerHTML = '';
  const title = el('div', 'al-log-title', 'Outpost Log');
  refs.logfeed.appendChild(title);
  const list = el('div', 'al-log-list');
  for (const entry of state.log.slice(0, 30)) {
    list.appendChild(el('div', 'al-log-entry', entry.message));
  }
  refs.logfeed.appendChild(list);
}

function statBar(label, value) {
  const row = el('div', 'al-statrow');
  row.appendChild(el('span', 'al-statlabel', label));
  const track = el('div', 'al-stattrack');
  const fill = el('div', 'al-statfill');
  fill.style.width = `${Math.max(0, Math.min(100, value))}%`;
  track.appendChild(fill);
  row.appendChild(track);
  return row;
}

export function renderSidePanel(refs, state, callbacks) {
  const panel = refs.sidepanel;
  panel.innerHTML = '';
  const sel = state.selection;

  if (sel && sel.mode === 'room') {
    const room = findRoom(state, sel.roomId);
    if (room) {
      renderRoomDetail(panel, state, room, callbacks);
      return;
    }
  }

  if (sel && sel.mode === 'build') {
    const def = ROOM_TYPES[sel.roomType];
    panel.appendChild(el('div', 'al-panel-title', `Placing: ${def.name}`));
    panel.appendChild(el('div', 'al-panel-desc', def.desc));
    panel.appendChild(el('div', 'al-panel-hint', 'Click an empty stretch of floor to build. Esc to cancel.'));
    return;
  }

  renderRoster(panel, state, callbacks);
}

function renderRoomDetail(panel, state, room, callbacks) {
  const def = ROOM_TYPES[room.type];
  panel.appendChild(el('div', 'al-panel-title', `${def.icon} ${def.name} — Lv ${room.level}`));
  panel.appendChild(el('div', 'al-panel-desc', def.desc));

  if (isRoomOnFire(room)) {
    const fireBox = el('div', 'al-firebox');
    fireBox.appendChild(el('div', 'al-fire-label', `🔥 Fire severity: ${Math.round(room.fire.severity)}`));
    const dispatchBtn = el('button', 'al-actionbtn al-danger', 'Dispatch idle colonists');
    dispatchBtn.addEventListener('click', () => {
      const ids = availableColonists(state).map(c => c.id);
      if (ids.length === 0) return;
      callbacks.onDispatchFirefighters(room.id, ids);
    });
    fireBox.appendChild(dispatchBtn);
    panel.appendChild(fireBox);
  }

  if (room.type !== 'elevator') {
    const cap = roomCapacity(room);
    panel.appendChild(el('div', 'al-panel-sub', `Crew: ${room.colonistIds.length}/${cap}`));

    const workers = colonistsInRoom(state, room);
    const crewList = el('div', 'al-crewlist');
    for (const c of workers) {
      const row = el('div', 'al-crewrow');
      row.appendChild(el('span', '', c.name));
      const unassignBtn = el('button', 'al-minibtn', 'Unassign');
      unassignBtn.addEventListener('click', () => callbacks.onUnassign(c.id));
      row.appendChild(unassignBtn);
      crewList.appendChild(row);
    }
    panel.appendChild(crewList);

    if (room.colonistIds.length < cap) {
      const idle = state.colonists.filter(c => c.status === 'idle');
      if (idle.length > 0) {
        const assignTitle = el('div', 'al-panel-sub', 'Assign idle colonist:');
        panel.appendChild(assignTitle);
        const list = el('div', 'al-crewlist');
        for (const c of idle) {
          const row = el('div', 'al-crewrow');
          row.appendChild(el('span', '', `${c.name} (${STAT_NAMES[def.statKey]} ${c.stats[def.statKey]})`));
          const assignBtn = el('button', 'al-minibtn', 'Assign');
          assignBtn.addEventListener('click', () => callbacks.onAssignColonist(c.id, room.id));
          row.appendChild(assignBtn);
          list.appendChild(row);
        }
        panel.appendChild(list);
      } else {
        panel.appendChild(el('div', 'al-panel-hint', 'No idle colonists available.'));
      }
    }

    if (room.level < 3) {
      const cost = upgradeCost(room);
      const upBtn = el('button', 'al-actionbtn');
      upBtn.textContent = `Upgrade to Lv${room.level + 1} (${cost}c)`;
      upBtn.disabled = state.credits < cost;
      upBtn.addEventListener('click', () => callbacks.onUpgradeRoom(room.id));
      panel.appendChild(upBtn);
    } else {
      panel.appendChild(el('div', 'al-panel-hint', 'Max level reached.'));
    }
  }

  const closeBtn = el('button', 'al-actionbtn al-secondary', 'Close');
  closeBtn.addEventListener('click', () => callbacks.onDeselect());
  panel.appendChild(closeBtn);
}

function renderRoster(panel, state, callbacks) {
  panel.appendChild(el('div', 'al-panel-title', `Colonists (${state.colonists.length}/${popCap(state)})`));
  const list = el('div', 'al-roster-list');
  for (const c of state.colonists) {
    const card = el('div', 'al-roster-card');
    if (c.status === 'injured') card.classList.add('al-roster-injured');
    const header = el('div', 'al-roster-header');
    header.appendChild(el('span', 'al-roster-name', c.name));
    header.appendChild(el('span', 'al-roster-status', c.status));
    card.appendChild(header);
    card.appendChild(statBar(`HP ${Math.round(c.health)}`, c.health));
    card.appendChild(statBar(`Mood ${Math.round(c.happiness)}`, c.happiness));
    const statsRow = el('div', 'al-roster-stats',
      `STR ${c.stats.str} · INT ${c.stats.int} · AGI ${c.stats.agi} · CHR ${c.stats.chr}`);
    card.appendChild(statsRow);
    list.appendChild(card);
  }
  panel.appendChild(list);
}

export function showToast(message, tone = 'info') {
  let root = document.getElementById('al-toast-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'al-toast-root';
    document.body.appendChild(root);
  }
  const toast = el('div', `al-toast al-toast-${tone}`, message);
  root.appendChild(toast);
  setTimeout(() => toast.classList.add('al-toast-out'), 2200);
  setTimeout(() => toast.remove(), 2600);
}
