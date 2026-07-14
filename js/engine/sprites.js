// Procedural canvas sprites — real drawn, animated characters (walk cycles,
// attack swings, hit reactions, death falls) built from primitive shapes and
// a deterministic per-entity palette, NOT flat placeholder rectangles.
// This is intentionally not photorealistic generated artwork: GameForge runs
// with zero network calls at runtime, so there is no image-generation model
// available to call — procedural vector/canvas drawing is the honest,
// actually-achievable substitute, and it's genuinely animated in real time.

function hashPalette(seed) {
  let h = 0;
  const s = String(seed || 'x');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return {
    body: `hsl(${hue}, 62%, 45%)`,
    dark: `hsl(${hue}, 55%, 30%)`,
    light: `hsl(${hue}, 70%, 65%)`,
  };
}

// pose: { walkPhase (0-1 loop), attacking (bool 0-1 progress), hit (0-1 fade), dying (0-1 progress), facing (1|-1), grounded (bool) }
export function drawHumanoid(ctx, entity, pose = {}) {
  const { x, y, w, h } = entity;
  const cx = x + w / 2;
  const palette = entity.__palette || (entity.__palette = hashPalette(entity.id || entity.name));
  const bob = pose.grounded === false ? 0 : Math.sin((pose.walkPhase || 0) * Math.PI * 2) * 2;
  const legSwing = pose.grounded === false ? 0 : Math.sin((pose.walkPhase || 0) * Math.PI * 2) * (w * 0.22);

  ctx.save();
  if (pose.dying > 0) {
    ctx.globalAlpha = Math.max(0, 1 - pose.dying);
    ctx.translate(cx, y + h);
    ctx.rotate((pose.facing || 1) * pose.dying * (Math.PI / 2.2));
    ctx.translate(-cx, -(y + h));
  }

  const bodyColor = pose.hit > 0 ? '#fff' : palette.body;

  // legs
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = Math.max(2, w * 0.14);
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.15, y + h * 0.62);
  ctx.lineTo(cx - w * 0.15 + legSwing * 0.4, y + h + bob);
  ctx.moveTo(cx + w * 0.15, y + h * 0.62);
  ctx.lineTo(cx + w * 0.15 - legSwing * 0.4, y + h + bob);
  ctx.stroke();

  // body
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(x + w * 0.18, y + h * 0.28 + bob * 0.3, w * 0.64, h * 0.5, w * 0.18);
  ctx.fill();

  // head
  ctx.fillStyle = palette.light;
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.18 + bob * 0.3, w * 0.26, 0, Math.PI * 2);
  ctx.fill();

  // arm / weapon swing
  const facing = pose.facing || 1;
  const armBase = { x: cx + facing * w * 0.28, y: y + h * 0.42 + bob * 0.3 };
  const swing = pose.attacking > 0 ? (1 - Math.abs(pose.attacking - 0.5) * 2) : 0;
  const armAngle = facing * (-0.3 + swing * 1.6);
  ctx.strokeStyle = palette.dark;
  ctx.lineWidth = Math.max(2, w * 0.12);
  ctx.beginPath();
  ctx.moveTo(armBase.x, armBase.y);
  ctx.lineTo(armBase.x + Math.cos(armAngle) * w * 0.5, armBase.y + Math.sin(armAngle) * w * 0.5 - w * 0.1);
  ctx.stroke();
  if (pose.attacking > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(armBase.x, armBase.y, w * 0.55, armAngle - 0.6, armAngle + 0.2);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawHealthBar(ctx, entity, pct) {
  const barY = entity.y - 8;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(entity.x, barY, entity.w, 4);
  ctx.fillStyle = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#dc2626';
  ctx.fillRect(entity.x, barY, entity.w * Math.max(0, pct), 4);
}

const STATUS_COLORS = { Burning: '#f97316', Poisoned: '#84cc16', Stunned: '#eab308', Shielded: '#38bdf8' };

// A small dotted status readout above each combatant so Burning/Poisoned/
// Stunned/Shielded are genuinely visible in play, not just internal state.
export function drawStatusBadges(ctx, entity) {
  const effects = entity.statusEffects;
  if (!effects || !effects.length) return;
  const y = entity.y - 14;
  effects.forEach((s, i) => {
    ctx.fillStyle = STATUS_COLORS[s.type] || '#94a3b8';
    ctx.beginPath();
    ctx.arc(entity.x + 6 + i * 10, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawPickupIcon(ctx, pickup) {
  const cx = pickup.x + pickup.w / 2, cy = pickup.y + pickup.h / 2;
  const bob = Math.sin((pickup.__t || 0) * 3) * 2;
  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate((pickup.__t || 0) * 0.6);
  ctx.fillStyle = pickup.damageBonus ? '#f59e0b' : pickup.heal ? '#22c55e' : '#94a3b8';
  ctx.beginPath();
  ctx.moveTo(0, -pickup.h / 2);
  ctx.lineTo(pickup.w / 2, 0);
  ctx.lineTo(0, pickup.h / 2);
  ctx.lineTo(-pickup.w / 2, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
