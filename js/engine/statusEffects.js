// Real gameplay status effects — a genuine simulation layer wired to
// Combat Designer's status-effect vocabulary (Burning, Poisoned, Stunned,
// Shielded and more), not window dressing. Ticks damage-over-time, blocks
// stunned entities from acting, and absorbs damage through shields before
// it ever reaches real HP.

export function applyStatus(entity, type, opts = {}) {
  entity.statusEffects = entity.statusEffects || [];
  const existing = entity.statusEffects.find(s => s.type === type);
  if (existing) {
    existing.duration = Math.max(existing.duration, opts.duration || existing.duration);
    if (opts.shieldHp) existing.shieldHp = Math.max(existing.shieldHp || 0, opts.shieldHp);
    return;
  }
  entity.statusEffects.push({
    type,
    duration: opts.duration || 4,
    tickTimer: 0,
    dps: opts.dps || 0,
    shieldHp: opts.shieldHp || 0,
  });
}

export function hasStatus(entity, type) {
  return !!(entity.statusEffects || []).find(s => s.type === type);
}

// Advances every active status by dt seconds, invoking onDamage(amount) for
// each DoT tick (Burning/Poisoned). Returns whether the entity is currently
// Stunned so callers can skip movement/actions for the frame.
export function tickStatusEffects(entity, dt, onDamage) {
  if (!entity.statusEffects || !entity.statusEffects.length) return { stunned: false };
  let stunned = false;
  entity.statusEffects = entity.statusEffects.filter(s => {
    s.duration -= dt;
    if (s.type === 'Burning' || s.type === 'Poisoned') {
      s.tickTimer -= dt;
      if (s.tickTimer <= 0) { s.tickTimer = 1; onDamage(s.dps); }
    }
    if (s.type === 'Stunned') stunned = true;
    return s.duration > 0;
  });
  return { stunned };
}

// Routes incoming damage through any active Shielded absorption before it
// reaches real HP, consuming the shield pool as it soaks damage.
export function absorbDamage(entity, amount) {
  const shield = (entity.statusEffects || []).find(s => s.type === 'Shielded' && s.shieldHp > 0);
  if (!shield) return amount;
  const absorbed = Math.min(shield.shieldHp, amount);
  shield.shieldHp -= absorbed;
  return amount - absorbed;
}
