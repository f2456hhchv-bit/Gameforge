// Real procedural sound effects via the Web Audio API — synthesized
// oscillator envelopes, not audio files. Zero network calls, zero assets,
// consistent with the rest of GameForge's fully-local architecture. Safe
// to call from any user-gesture-triggered event (keypress); silently no-ops
// if the browser has no audio support at all (e.g. some sandboxed contexts).
let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { ctx = new AC(); } catch { ctx = null; }
  return ctx;
}

function beep({ freq = 440, freqEnd, duration = 0.1, type = 'sine', gain = 0.15 }) {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended') c.resume().catch(() => {});
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), c.currentTime + duration);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function sfxAttack() { beep({ freq: 220, freqEnd: 110, duration: 0.08, type: 'square', gain: 0.14 }); }
export function sfxHit() { beep({ freq: 150, freqEnd: 60, duration: 0.12, type: 'sawtooth', gain: 0.18 }); }
export function sfxDefeat() { beep({ freq: 300, freqEnd: 60, duration: 0.3, type: 'sawtooth', gain: 0.16 }); }
export function sfxPickup() { beep({ freq: 520, freqEnd: 880, duration: 0.14, type: 'sine', gain: 0.13 }); }
export function sfxJump() { beep({ freq: 300, freqEnd: 520, duration: 0.1, type: 'triangle', gain: 0.11 }); }
export function sfxDamaged() { beep({ freq: 180, freqEnd: 90, duration: 0.15, type: 'square', gain: 0.15 }); }
export function sfxRoomCleared() { [523, 659].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.16, type: 'triangle', gain: 0.15 }), i * 100)); }
export function sfxWin() { [440, 550, 660, 880].forEach((f, i) => setTimeout(() => beep({ freq: f, duration: 0.16, type: 'triangle', gain: 0.16 }), i * 120)); }
export function sfxLose() { beep({ freq: 220, freqEnd: 70, duration: 0.6, type: 'sawtooth', gain: 0.17 }); }
