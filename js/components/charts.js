// Minimal, dependency-free chart primitives following the studio's dataviz
// guidelines: single accent hue for single-series data (no legend needed),
// thin marks, direct labels, recessive gridlines, real hover interaction.
import { h } from '../util.js';

// Horizontal bar chart. items: [{label, value}]. Single series -> one hue,
// direct value label at the bar tip, no legend box needed.
export function barChart(items, { formatValue = String, emptyText = 'No data yet.' } = {}) {
  const wrap = h('div', { class: 'flex flex-col gap-2.5' });
  if (!items.length || items.every(i => !i.value)) {
    return h('p', { class: 'text-sm text-slate-400' }, emptyText);
  }
  const max = Math.max(...items.map(i => i.value), 1);
  items.forEach(i => {
    const pct = Math.max((i.value / max) * 100, i.value > 0 ? 2 : 0);
    const row = h('div', { class: 'flex items-center gap-3 group' }, [
      h('span', { class: 'w-28 shrink-0 text-xs text-slate-500 dark:text-slate-400 truncate' }, i.label),
      h('div', { class: 'flex-1 h-4 rounded bg-surface-2 relative overflow-visible' }, [
        h('div', {
          class: 'h-full bg-accent rounded-r transition-all duration-300 group-hover:brightness-110',
          style: `width:${pct}%`,
          title: `${i.label}: ${formatValue(i.value)}`,
        }),
      ]),
      h('span', { class: 'w-10 shrink-0 text-xs text-right font-medium text-slate-600 dark:text-slate-300' }, formatValue(i.value)),
    ]);
    wrap.appendChild(row);
  });
  return wrap;
}

// Area sparkline with a real crosshair + tooltip. points: [{label, value}] in
// chronological order. Single series -> one hue, wash fill at ~10% opacity.
export function areaSparkline(points, { width = 560, height = 120, formatValue = String, emptyText = 'Not enough activity yet.' } = {}) {
  if (!points.length || points.every(p => !p.value)) {
    return h('p', { class: 'text-sm text-slate-400' }, emptyText);
  }
  const pad = { top: 10, right: 8, bottom: 20, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(...points.map(p => p.value), 1);
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: pad.left + i * stepX,
    y: pad.top + innerH - (p.value / max) * innerH,
    ...p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${(pad.top + innerH).toFixed(1)} L${coords[0].x.toFixed(1)},${(pad.top + innerH).toFixed(1)} Z`;

  const svgNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const el = document.createElementNS(svgNS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  const svg = svgEl('svg', { viewBox: `0 0 ${width} ${height}`, width: '100%', height: `${height}`, class: 'overflow-visible' });
  const baseline = svgEl('line', { x1: pad.left, x2: width - pad.right, y1: pad.top + innerH, y2: pad.top + innerH, class: 'stroke-surface-3', 'stroke-width': 1 });
  const area = svgEl('path', { d: areaPath, class: 'fill-accent', 'fill-opacity': '0.1', stroke: 'none' });
  const line = svgEl('path', { d: linePath, class: 'stroke-accent', 'stroke-width': 2, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
  svg.append(baseline, area, line);

  // First/last labels directly on the chart (sparing direct labels per guidance).
  const firstLabel = svgEl('text', { x: coords[0].x, y: height - 4, class: 'fill-slate-400 text-[10px]', 'text-anchor': 'start' });
  firstLabel.textContent = coords[0].label;
  const lastLabel = svgEl('text', { x: coords[coords.length - 1].x, y: height - 4, class: 'fill-slate-400 text-[10px]', 'text-anchor': 'end' });
  lastLabel.textContent = coords[coords.length - 1].label;
  svg.append(firstLabel, lastLabel);

  const crosshair = svgEl('line', { x1: 0, x2: 0, y1: pad.top, y2: pad.top + innerH, class: 'stroke-slate-400', 'stroke-width': 1, opacity: 0 });
  const dot = svgEl('circle', { r: 4, class: 'fill-accent stroke-surface-0', 'stroke-width': 2, opacity: 0 });
  svg.append(crosshair, dot);

  const tooltip = h('div', {
    class: 'pointer-events-none absolute hidden card px-2.5 py-1.5 text-xs shadow-lg z-10 whitespace-nowrap',
  });

  const container = h('div', { class: 'relative' }, [svg, tooltip]);

  svg.addEventListener('pointermove', e => {
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    let idx = Math.round((relX - pad.left) / (stepX || 1));
    idx = Math.max(0, Math.min(coords.length - 1, idx));
    const c = coords[idx];
    crosshair.setAttribute('x1', c.x); crosshair.setAttribute('x2', c.x); crosshair.setAttribute('opacity', 1);
    dot.setAttribute('cx', c.x); dot.setAttribute('cy', c.y); dot.setAttribute('opacity', 1);
    tooltip.textContent = '';
    tooltip.appendChild(h('span', { class: 'font-semibold text-slate-700 dark:text-slate-100' }, formatValue(c.value)));
    tooltip.appendChild(h('span', { class: 'text-slate-400 ml-1.5' }, c.label));
    tooltip.classList.remove('hidden');
    const leftPct = (c.x / width) * 100;
    tooltip.style.left = `${leftPct}%`;
    tooltip.style.top = '0px';
    tooltip.style.transform = leftPct > 70 ? 'translateX(-100%)' : leftPct < 15 ? 'translateX(0)' : 'translateX(-50%)';
  });
  svg.addEventListener('pointerleave', () => {
    crosshair.setAttribute('opacity', 0);
    dot.setAttribute('opacity', 0);
    tooltip.classList.add('hidden');
  });

  return container;
}
