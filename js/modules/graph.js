// Visual relationship graph: every content entity in the project as a node,
// every links.* reference as an edge. Fruchterman-Reingold force layout
// (no external dependency), pan/zoom, drag-to-reposition, click to navigate.
import { h } from '../util.js';
import { store } from '../store.js';
import { COLLECTIONS } from '../schema.js';
import { openEntity } from '../router.js';

const GRAPH_COLLECTIONS = ['biomes', 'characters', 'items', 'combatEntries', 'levels', 'quests', 'artPrompts', 'uiScreens', 'audioEntries'];

function buildGraphData(enabledCollections) {
  const nodes = [];
  const nodeIds = new Set();
  for (const key of enabledCollections) {
    for (const item of store.list(key)) {
      nodes.push({ id: item.id, collection: key, name: item.name || item.title || '(unnamed)', degree: 0 });
      nodeIds.add(item.id);
    }
  }
  const edges = [];
  const seenPairs = new Set();
  for (const key of enabledCollections) {
    for (const item of store.list(key)) {
      if (!item.links) continue;
      for (const val of Object.values(item.links)) {
        const targets = Array.isArray(val) ? val : (val ? [val] : []);
        for (const targetId of targets) {
          if (!nodeIds.has(targetId) || targetId === item.id) continue;
          const pairKey = [item.id, targetId].sort().join('|');
          if (seenPairs.has(pairKey)) continue;
          seenPairs.add(pairKey);
          edges.push({ source: item.id, target: targetId });
        }
      }
    }
  }
  const byId = new Map(nodes.map(n => [n.id, n]));
  for (const e of edges) {
    const a = byId.get(e.source), b = byId.get(e.target);
    if (a) a.degree++;
    if (b) b.degree++;
  }
  return { nodes, edges };
}

// Fruchterman-Reingold force-directed layout with a cooling temperature —
// stable and simple, no external physics library needed.
function layout(nodes, edges, width, height, iterations = 250) {
  if (!nodes.length) return;
  const area = width * height;
  const k = Math.sqrt(area / nodes.length) * 0.85;
  const byId = new Map(nodes.map(n => [n.id, n]));
  nodes.forEach(n => {
    n.x = width / 2 + (Math.random() - 0.5) * width * 0.6;
    n.y = height / 2 + (Math.random() - 0.5) * height * 0.6;
  });
  let temp = width / 10;
  const cooling = temp / iterations;

  for (let iter = 0; iter < iterations; iter++) {
    const disp = new Map(nodes.map(n => [n.id, { x: 0, y: 0 }]));
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let dx = a.x - b.x, dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (k * k) / dist;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        disp.get(a.id).x += fx; disp.get(a.id).y += fy;
        disp.get(b.id).x -= fx; disp.get(b.id).y -= fy;
      }
    }
    for (const e of edges) {
      const a = byId.get(e.source), b = byId.get(e.target);
      if (!a || !b) continue;
      let dx = a.x - b.x, dy = a.y - b.y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const force = (dist * dist) / k;
      const fx = (dx / dist) * force, fy = (dy / dist) * force;
      disp.get(a.id).x -= fx; disp.get(a.id).y -= fy;
      disp.get(b.id).x += fx; disp.get(b.id).y += fy;
    }
    for (const n of nodes) {
      const d = disp.get(n.id);
      const dlen = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
      const lim = Math.min(dlen, temp);
      n.x += (d.x / dlen) * lim;
      n.y += (d.y / dlen) * lim;
      n.x = Math.max(24, Math.min(width - 24, n.x));
      n.y = Math.max(24, Math.min(height - 24, n.y));
    }
    temp = Math.max(temp - cooling, 0.01);
  }
}

export function mountGraph(container) {
  const state = {
    enabled: new Set(GRAPH_COLLECTIONS),
    search: '',
    scale: 1, panX: 0, panY: 0,
    dragNode: null, dragPan: null,
    nodes: [], edges: [],
  };

  function recompute() {
    const { nodes, edges } = buildGraphData([...state.enabled]);
    state.nodes = nodes;
    state.edges = edges;
    // The layout is O(n^2) per iteration, so scale iterations down smoothly as
    // the project grows rather than a hard cutoff — every entity still renders
    // as a node (nothing is ever dropped), it just settles less precisely.
    const iterations = Math.max(30, Math.min(220, Math.round(28000 / Math.max(nodes.length, 1))));
    layout(nodes, edges, 900, 640, iterations);
  }

  const svgNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs = {}) {
    const el = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function render() {
    container.innerHTML = '';
    recompute();

    const toolbar = h('div', { class: 'flex items-center justify-between px-4 py-3 border-b border-surface-3/60 flex-wrap gap-2' }, [
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'text-xl' }, '🕸️'),
        h('h2', { class: 'text-lg font-semibold' }, 'Relationship Graph'),
        h('span', { class: 'badge-gray' }, `${state.nodes.length} entities · ${state.edges.length} links`),
      ]),
      h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
        ...GRAPH_COLLECTIONS.map(key => {
          const count = store.list(key).length;
          const active = state.enabled.has(key);
          return h('button', {
            class: `badge ${active ? 'badge-accent' : 'badge-gray'}`,
            onclick: () => { active ? state.enabled.delete(key) : state.enabled.add(key); render(); },
          }, `${COLLECTIONS[key].icon} ${count}`);
        }),
        h('button', { class: 'btn-secondary text-xs', onclick: () => { state.scale = 1; state.panX = 0; state.panY = 0; render(); } }, '⟲ Reset View'),
      ]),
    ]);

    const canvasWrap = h('div', { class: 'flex-1 relative overflow-hidden bg-surface-1' });
    const width = 900, height = 640;
    const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, class: 'w-full h-full cursor-grab active:cursor-grabbing' });
    const world = svgEl('g', { transform: `translate(${state.panX} ${state.panY}) scale(${state.scale})` });
    svg.appendChild(world);

    if (!state.nodes.length) {
      canvasWrap.appendChild(h('div', { class: 'empty-state h-full justify-center' }, [
        h('div', { class: 'text-4xl' }, '🕸️'),
        h('p', { class: 'font-medium' }, 'Nothing to graph yet.'),
        h('p', { class: 'text-xs max-w-sm' }, 'Generate some characters, items, biomes or quests, then link them — drops, spawn locations, quest givers — and they\'ll appear here.'),
      ]));
      container.append(toolbar, canvasWrap);
      return;
    }

    const byId = new Map(state.nodes.map(n => [n.id, n]));
    const term = state.search.trim().toLowerCase();

    const edgeLines = [];
    for (const e of state.edges) {
      const a = byId.get(e.source), b = byId.get(e.target);
      if (!a || !b) continue;
      const line = svgEl('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, class: 'stroke-surface-3', 'stroke-width': 1.5 });
      world.appendChild(line);
      edgeLines.push({ line, a, b });
    }

    const nodeEls = new Map();
    const showLabelsAlways = state.nodes.length <= 30;

    for (const n of state.nodes) {
      const matches = term && n.name.toLowerCase().includes(term);
      const dim = term && !matches;
      const g = svgEl('g', { class: 'cursor-pointer', style: dim ? 'opacity:0.25' : '' });
      const r = 6 + Math.min(n.degree, 8) * 1.2;
      const circle = svgEl('circle', { cx: n.x, cy: n.y, r, class: matches ? 'fill-accent' : 'fill-accent', 'fill-opacity': matches ? '1' : '0.75', stroke: 'rgb(var(--surface-0))', 'stroke-width': 2 });
      const icon = svgEl('text', { x: n.x, y: n.y + 4, 'text-anchor': 'middle', 'font-size': 10 });
      icon.textContent = COLLECTIONS[n.collection]?.icon || '•';
      g.append(circle, icon);
      if (showLabelsAlways || matches) {
        const label = svgEl('text', { x: n.x, y: n.y + r + 12, 'text-anchor': 'middle', class: 'fill-slate-400 text-[10px]' });
        label.textContent = n.name;
        g.appendChild(label);
      }
      g.addEventListener('pointerenter', () => {
        if (!showLabelsAlways) {
          const tip = svgEl('text', { x: n.x, y: n.y + r + 12, 'text-anchor': 'middle', class: 'fill-slate-400 text-[10px]', 'data-hover-label': '1' });
          tip.textContent = n.name;
          g.appendChild(tip);
        }
        circle.setAttribute('fill-opacity', '1');
      });
      g.addEventListener('pointerleave', () => {
        if (!showLabelsAlways) {
          g.querySelectorAll('[data-hover-label]').forEach(el => el.remove());
        }
        circle.setAttribute('fill-opacity', matches ? '1' : '0.75');
      });

      g.addEventListener('pointerdown', e => {
        e.stopPropagation();
        state.dragNode = n;
        state.dragMoved = false;
      });
      g.addEventListener('click', () => {
        if (state.dragMoved) return;
        openEntity(n.collection, n.id);
      });
      world.appendChild(g);
      nodeEls.set(n.id, { g, circle, icon });
    }

    svg.addEventListener('pointermove', e => {
      if (state.dragNode) {
        state.dragMoved = true;
        const rect = svg.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * width;
        const y = ((e.clientY - rect.top) / rect.height) * height;
        const n = state.dragNode;
        n.x = (x - state.panX) / state.scale;
        n.y = (y - state.panY) / state.scale;
        const el = nodeEls.get(n.id);
        if (el) { el.circle.setAttribute('cx', n.x); el.circle.setAttribute('cy', n.y); el.icon.setAttribute('x', n.x); el.icon.setAttribute('y', n.y + 4); }
        for (const { line, a, b } of edgeLines) {
          if (a === n) { line.setAttribute('x1', n.x); line.setAttribute('y1', n.y); }
          if (b === n) { line.setAttribute('x2', n.x); line.setAttribute('y2', n.y); }
        }
        return;
      }
      if (state.dragPan) {
        state.dragMoved = true;
        state.panX = state.dragPan.panX0 + (e.clientX - state.dragPan.x0);
        state.panY = state.dragPan.panY0 + (e.clientY - state.dragPan.y0);
        world.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.scale})`);
      }
    });
    svg.addEventListener('pointerdown', e => {
      state.dragPan = { x0: e.clientX, y0: e.clientY, panX0: state.panX, panY0: state.panY };
    });
    svg.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      state.scale = Math.max(0.3, Math.min(3, state.scale * delta));
      world.setAttribute('transform', `translate(${state.panX} ${state.panY}) scale(${state.scale})`);
    }, { passive: false });

    const searchBox = h('input', { class: 'input absolute top-3 left-3 w-56 shadow-md', placeholder: '🔍 Highlight by name…', value: state.search });
    searchBox.addEventListener('input', () => { state.search = searchBox.value; render(); });

    canvasWrap.append(svg, searchBox);
    container.append(toolbar, canvasWrap);
  }

  function onWindowPointerUp() {
    state.dragNode = null;
    state.dragPan = null;
  }

  render();
  window.addEventListener('pointerup', onWindowPointerUp);
  const unsub = store.on((project, reason) => { if (reason.startsWith('mutate') || reason === 'undo' || reason === 'redo' || reason === 'load') render(); });
  return () => { unsub(); window.removeEventListener('pointerup', onWindowPointerUp); };
}
