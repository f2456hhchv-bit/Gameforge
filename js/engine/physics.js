// Tiny AABB helpers shared by the Play Engine's movement/collision/combat range checks.

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function centerDistance(a, b) {
  const dx = (a.x + a.w / 2) - (b.x + b.w / 2);
  const dy = (a.y + a.h / 2) - (b.y + b.h / 2);
  return Math.hypot(dx, dy);
}

export function clampToBounds(entity, bounds) {
  entity.x = Math.max(bounds.x, Math.min(bounds.x + bounds.w - entity.w, entity.x));
  entity.y = Math.max(bounds.y, Math.min(bounds.y + bounds.h - entity.h, entity.y));
}

// Parses a stat row's value (e.g. "42", "18%", "1.35") into a number,
// falling back when the stat is missing or unparsable. Character/item
// statistics are stored as { key, value } string pairs (see procedural.js).
export function statNum(stats, key, fallback) {
  const row = (stats || []).find(s => s.key === key);
  if (!row) return fallback;
  const n = parseFloat(String(row.value).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}
