import { createCollectionView } from '../components/collectionView.js';
import { DAMAGE_TYPES, STATUS_EFFECTS } from '../generators/wordbank.js';
import { rngFor, generateAbilityName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { autoTask } from '../taskHooks.js';

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
  { key: 'combo-string', label: 'Combo String', icon: '🥋' },
  { key: 'parry-window', label: 'Parry / Counter Window', icon: '🛡️' },
  { key: 'environmental-hazard', label: 'Environmental Hazard', icon: '💣' },
  { key: 'stealth-takedown', label: 'Stealth Takedown', icon: '🥷' },
  { key: 'mount-vehicle-combat', label: 'Mount / Vehicle Combat', icon: '🐎' },
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
  'combo-string': [
    { key: 'inputSequence', label: 'Input Sequence', type: 'list', cols: 2, placeholder: 'e.g. Light, Light, Heavy, Launcher' },
    { key: 'totalDamageMultiplier', label: 'Total Damage Multiplier', type: 'text', placeholder: 'e.g. 2.4x base hit' },
    { key: 'cancelWindows', label: 'Cancel Windows', type: 'textarea', cols: 2, placeholder: 'Which hits can be cancelled into a dodge/ability, and when…' },
  ],
  'parry-window': [
    { key: 'windowMs', label: 'Window (ms)', type: 'number', placeholder: 'e.g. 200' },
    { key: 'onSuccess', label: 'On Success', type: 'textarea', placeholder: 'e.g. Staggers attacker, opens a riposte' },
    { key: 'onFail', label: 'On Fail (missed parry)', type: 'textarea', placeholder: 'e.g. Full damage taken, brief vulnerability window' },
  ],
  'environmental-hazard': [
    { key: 'hazardType', label: 'Hazard Type', type: 'select', options: ['Explosive', 'Elemental', 'Structural Collapse', 'Trap'] },
    { key: 'triggerMechanism', label: 'Trigger Mechanism', type: 'text', placeholder: 'e.g. Shoot the barrel, step on the plate' },
    { key: 'areaOfEffect', label: 'Area of Effect', type: 'text', placeholder: 'e.g. 4m radius' },
    { key: 'linkedBiome', label: 'Biome', type: 'relation', target: 'biomes' },
  ],
  'stealth-takedown': [
    { key: 'detectionRisk', label: 'Detection Risk', type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'animationLength', label: 'Animation Length', type: 'text', placeholder: 'e.g. 1.8s' },
    { key: 'alertsNearbyEnemies', label: 'Alerts Nearby Enemies?', type: 'select', options: ['No', 'Yes — within a short radius'] },
  ],
  'mount-vehicle-combat': [
    { key: 'vehicleType', label: 'Vehicle / Mount Type', type: 'text', placeholder: 'e.g. War-horse, gunship, mech' },
    { key: 'controlScheme', label: 'Control Scheme', type: 'textarea', cols: 2, placeholder: 'Movement vs. weapon control split, dismount conditions…' },
    { key: 'weakPoints', label: 'Weak Points', type: 'list', placeholder: 'e.g. Rear engine, rider' },
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
  {
    label: 'Draft Combo String', run: () => {
      const rng = rngFor(Math.random());
      const hitCount = 3 + Math.floor(rng() * 3);
      const inputs = Array.from({ length: hitCount }, (_, i) => i === hitCount - 1 ? pick(['Heavy', 'Launcher', 'Finisher'], rng) : pick(['Light', 'Light', 'Medium'], rng));
      return {
        subtype: 'combo-string', name: `${inputs.join(' → ')}`,
        description: `A ${hitCount}-hit combo string ending in a ${inputs[inputs.length - 1].toLowerCase()}.`,
        inputSequence: inputs,
        totalDamageMultiplier: `${(1 + hitCount * 0.35).toFixed(1)}x base hit`,
        cancelWindows: 'The first two hits can be cancelled into a dodge; the finisher commits fully.',
      };
    },
  },
  {
    label: 'Draft Environmental Hazard', run: () => {
      const rng = rngFor(Math.random());
      const type = pick(['Explosive', 'Elemental', 'Structural Collapse', 'Trap'], rng);
      return {
        subtype: 'environmental-hazard', name: `${type} Hazard`,
        description: `A ${type.toLowerCase()} hazard placeable in levels for both player and AI to exploit.`,
        hazardType: type,
        triggerMechanism: pick(['Shoot to detonate', 'Step on pressure plate', 'Nearby fire spreads to it', 'Sustained damage breaks it'], rng),
        areaOfEffect: `${2 + Math.floor(rng() * 4)}m radius`,
      };
    },
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
    onCreate: (item) => autoTask('combatEntries', item, {
      category: 'code', estimateHours: 3, title: (i) => `Implement: ${i.name}`,
      description: `Programming + balancing pass for ${item.subtype || 'combat entry'} "${item.name}".`,
    }),
    helpText: 'Abilities, status effects, damage types, AI behaviour trees, boss mechanics, attack patterns, wave/spawn systems, difficulty scaling, combo strings, parry/counter windows, environmental hazards, stealth takedowns and mount/vehicle combat.',
  });
  return view.mount(container, opts);
}
