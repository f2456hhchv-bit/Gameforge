// A small, real, data-driven scripting language for Play Engine levels.
// Designers write plain-text rules on the Level entity (Level Designer's
// "Level Script" field); this module parses and executes them. Deliberately
// NOT a raw eval() of arbitrary JS — a constrained trigger/condition/action
// grammar that's safe to run, easy to author, and easy to reason about.
//
// Syntax (one rule per line, blank lines and "#" comments ignored):
//   on <trigger>[ <number>]: <action>
//
// Triggers:
//   start                      fires once when the level begins
//   enemyDefeated              fires every time any enemy is defeated
//   allEnemiesDefeated         fires once when the last enemy is defeated
//   itemCollected              fires every time a pickup is collected
//   playerDamaged              fires every time the player takes damage
//   timer <seconds>            fires once when elapsed time reaches <seconds>
//   playerHpBelow <n>          fires once the first time player HP drops below <n>
//
// Actions:
//   message "<text>"           shows a toast-style message
//   heal player <n>
//   damage player <n>
//   healEnemies <n>
//   spawnHeal                  drops a healing pickup at a random arena position
//   winLevel
//   loseLevel

const RULE_RE = /^on\s+([a-zA-Z]+)(?:\s+(-?\d+(?:\.\d+)?))?\s*:\s*(.+)$/;

export function parseScript(text) {
  const rules = [];
  for (const raw of String(text || '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(RULE_RE);
    if (!m) continue;
    rules.push({ trigger: m[1], arg: m[2] != null ? Number(m[2]) : null, actionText: m[3].trim(), fired: false, raw: line });
  }
  return rules;
}

export function parseAction(text) {
  let m;
  if ((m = text.match(/^message\s+"(.*)"$/))) return { type: 'message', text: m[1] };
  if ((m = text.match(/^heal\s+player\s+(\d+)$/))) return { type: 'healPlayer', amount: Number(m[1]) };
  if ((m = text.match(/^damage\s+player\s+(\d+)$/))) return { type: 'damagePlayer', amount: Number(m[1]) };
  if ((m = text.match(/^healEnemies\s+(\d+)$/))) return { type: 'healEnemies', amount: Number(m[1]) };
  if (text === 'spawnHeal') return { type: 'spawnHeal' };
  if (text === 'winLevel') return { type: 'winLevel' };
  if (text === 'loseLevel') return { type: 'loseLevel' };
  return null;
}

// Fires every rule matching a discrete event trigger. One-shot triggers
// (allEnemiesDefeated, start) only ever fire once across the rule's lifetime.
const ONE_SHOT_TRIGGERS = new Set(['start', 'allEnemiesDefeated']);

export function fireEvent(rules, triggerName) {
  const actions = [];
  for (const rule of rules) {
    if (rule.trigger !== triggerName) continue;
    if (ONE_SHOT_TRIGGERS.has(triggerName) && rule.fired) continue;
    rule.fired = true;
    const action = parseAction(rule.actionText);
    if (action) actions.push(action);
  }
  return actions;
}

// Polled every tick for the two numeric-condition triggers.
export function pollConditions(rules, { elapsedSeconds, playerHp }) {
  const actions = [];
  for (const rule of rules) {
    if (rule.fired) continue;
    if (rule.trigger === 'timer' && rule.arg != null && elapsedSeconds >= rule.arg) {
      rule.fired = true;
      const action = parseAction(rule.actionText);
      if (action) actions.push(action);
    } else if (rule.trigger === 'playerHpBelow' && rule.arg != null && playerHp < rule.arg) {
      rule.fired = true;
      const action = parseAction(rule.actionText);
      if (action) actions.push(action);
    }
  }
  return actions;
}
