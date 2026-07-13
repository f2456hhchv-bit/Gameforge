import { createCollectionView } from '../components/collectionView.js';
import { DAMAGE_TYPES, STATUS_EFFECTS } from '../generators/wordbank.js';
import { rngFor, generateAbilityName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';

export const SUBTYPES = [
  { key: 'ability', label: 'Ability', icon: '⚡' },
  { key: 'status-effect', label: 'Status Effect', icon: '☠️' },
  { key: 'damage-type', label: 'Damage Type', icon: '💥' },
  { key: 'behavior-tree', label: 'AI Behaviour Tree', icon: '🌳' },
  { key: 'boss-mechanic', label: 'Boss Mechanic', icon: '🐉' },
  { key: 'attack-pattern', label: 'Attack Pattern', icon: '🎯' },
  { key: 'wave-system', label: 'Wave System', icon: '🌊' },
  { key: 'spawn-system', label: 'Spawn System', icon: '📍' },
  { key: 'difficulty-scaling', label: 'Difficulty Scaling', icon: '📈' },
];

const FIELDS_BY_SUBTYPE = {
  ability: [
    { key: 'damageType', label: 'Damage Type', type: 'select', options: DAMAGE_TYPES },
    { key: 'cooldown', label: 'Cooldown (seconds)', type: 'number' },
    { key: 'resourceCost', label: 'Resource Cost', type: 'text', placeholder: 'e.g. 25 Mana' },
    { key: 'range', label: 'Range', type: 'text' },
    { key: 'appliesEffects', label: 'Applies Status Effects', type: 'list' },
    { key: 'balancingNotes', label: 'Balancing Notes', type: 'textarea', cols: 2 },
  ],
  'status-effect': [
    { key: 'effectType', label: 'Effect Type', type: 'select', options: ['Damage over Time', 'Control', 'Buff', 'Debuff'] },
    { key: 'duration', label: 'Duration', type: 'text', placeholder: 'e.g. 4s, stacks up to 5' },
    { key: 'stacking', label: 'Stacks?', type: 'select', options: ['No', 'Yes — refreshes duration', 'Yes — independent stacks'] },
    { key: 'mechanicalEffect', label: 'Mechanical Effect', type: 'textarea', cols: 2 },
  ],
  'damage-type': [
    { key: 'resistedBy', label: 'Resisted By', type: 'list' },
    { key: 'strongAgainst', label: 'Strong Against', type: 'list' },
    { key: 'notes', label: 'Notes', type: 'textarea', cols: 2 },
  ],
  'behavior-tree': [
    { key: 'nodes', label: 'Tree Nodes (in order)', type: 'list', cols: 2, placeholder: 'e.g. Selector: Is Player In Range?' },
    { key: 'triggerConditions', label: 'Trigger Conditions', type: 'textarea', cols: 2 },
    { key: 'linkedCharacter', label: 'Used By', type: 'relation', target: 'characters' },
  ],
  'boss-mechanic': [
    { key: 'phase', label: 'Phase #', type: 'number' },
    { key: 'trigger', label: 'Trigger', type: 'text', placeholder: 'e.g. Below 50% HP' },
    { key: 'telegraph', label: 'Telegraph', type: 'text' },
    { key: 'counterplay', label: 'Counterplay', type: 'textarea', cols: 2 },
    { key: 'linkedBoss', label: 'Boss', type: 'relation', target: 'characters', subtype: 'boss' },
  ],
  'attack-pattern': [
    { key: 'sequence', label: 'Attack Sequence', type: 'list', cols: 2, placeholder: 'e.g. Windup → Slam → Recovery' },
    { key: 'telegraphTime', label: 'Telegraph Time', type: 'text' },
    { key: 'damageWindow', label: 'Damage Window', type: 'text' },
    { key: 'linkedCharacter', label: 'Used By', type: 'relation', target: 'characters' },
  ],
  'wave-system': [
    { key: 'waveCount', label: 'Number of Waves', type: 'number' },
    { key: 'enemyComposition', label: 'Enemy Composition', type: 'relation-multi', target: 'characters' },
    { key: 'escalationRule', label: 'Escalation Rule', type: 'textarea', cols: 2 },
  ],
  'spawn-system': [
    { key: 'spawnRule', label: 'Spawn Rule', type: 'textarea', cols: 2, placeholder: 'e.g. 1 spawn point per 10x10 area, max 6 concurrent' },
    { key: 'maxConcurrent', label: 'Max Concurrent Enemies', type: 'number' },
    { key: 'linkedBiome', label: 'Biome', type: 'relation', target: 'biomes' },
  ],
  'difficulty-scaling': [
    { key: 'axis', label: 'Scaling Axis', type: 'select', options: ['Enemy Health', 'Enemy Damage', 'Spawn Rate', 'Player Assist', 'Resource Drops'] },
    { key: 'curveDescription', label: 'Curve Description', type: 'textarea', cols: 2 },
    { key: 'values', label: 'Values by Difficulty', type: 'stats' },
  ],
};

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
}

export function generateAbility(rng) {
  return {
    subtype: 'ability', name: generateAbilityName(rng),
    description: 'A combat ability ready for balancing.',
    damageType: pick(DAMAGE_TYPES, rng), cooldown: Math.round(3 + rng() * 12),
    resourceCost: `${Math.round(10 + rng() * 40)} Energy`, range: pick(['Melee', '5m', '10m', '20m (ranged)'], rng),
    appliesEffects: rng() < 0.5 ? [pick(STATUS_EFFECTS, rng).name] : [],
    balancingNotes: 'Initial pass — validate against DPS budget during playtesting.',
  };
}

const GENERATORS = [
  {
    label: 'Generate Ability', run: () => generateAbility(rngFor(Math.random())),
  },
  {
    label: 'Generate Status Effect (from library)', run: ({ index }) => {
      const s = STATUS_EFFECTS[index % STATUS_EFFECTS.length];
      return { subtype: 'status-effect', name: s.name, description: s.desc, effectType: s.type, duration: '4s', stacking: 'No', mechanicalEffect: s.desc };
    },
  },
  {
    label: 'Generate Damage Type (from list)', run: ({ index }) => {
      const d = DAMAGE_TYPES[index % DAMAGE_TYPES.length];
      return { subtype: 'damage-type', name: d, description: `${d} damage type.`, resistedBy: [], strongAgainst: [], notes: '' };
    },
  },
  {
    label: 'Draft Boss Mechanic', run: ({ index }) => ({
      subtype: 'boss-mechanic', name: `Phase ${index + 1} Mechanic`,
      description: 'Boss encounter mechanic draft.',
      phase: index + 1, trigger: index === 0 ? 'Encounter start' : `Below ${100 - (index + 1) * 25}% HP`,
      telegraph: 'Red ground indicator + roar animation', counterplay: 'Dodge roll through the indicator or break line of sight.',
    }),
  },
];

export function mountCombat(container, opts) {
  const view = createCollectionView({
    key: 'combatEntries', singular: 'Combat Entry', plural: 'Combat Systems', icon: '⚔️',
    subtypes: SUBTYPES,
    fields: (subtype) => FIELDS_BY_SUBTYPE[subtype] || [],
    makeDefaults: () => ({}),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    helpText: 'Abilities, status effects, damage types, AI behaviour trees, boss mechanics, attack patterns, wave/spawn systems and difficulty scaling.',
  });
  return view.mount(container, opts);
}
