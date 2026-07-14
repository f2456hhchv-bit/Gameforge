import { createCollectionView } from '../components/collectionView.js';
import { ROOM_TYPES, LORE_HOOKS } from '../generators/wordbank.js';
import { rngFor, generateQuestName, generateBiomeName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'tutorial', label: 'Tutorial', icon: '🎓' },
  { key: 'boss-arena', label: 'Boss Arena', icon: '🐉' },
  { key: 'hub', label: 'Hub', icon: '🏛️' },
  { key: 'vertical-slice', label: 'Vertical Slice', icon: '🍰' },
  { key: 'stealth', label: 'Stealth Level', icon: '🥷' },
  { key: 'escort-level', label: 'Escort Level', icon: '🚶' },
  { key: 'horde-survival', label: 'Horde Survival', icon: '🧟' },
  { key: 'racing-track', label: 'Racing Track', icon: '🏁' },
  { key: 'social-hub', label: 'Social Hub', icon: '☕' },
  { key: 'dungeon-crawl', label: 'Dungeon Crawl', icon: '🕯️' },
  { key: 'open-world-region', label: 'Open World Region', icon: '🌍' },
  { key: 'linear-corridor', label: 'Linear Corridor', icon: '➡️' },
  { key: 'arena-pvp', label: 'PvP Arena', icon: '⚔️' },
];

const FIELDS = [
  { key: 'biome', label: 'Biome / Setting', type: 'relation', target: 'biomes' },
  { key: 'layoutType', label: 'Layout Type', type: 'select', options: ['Linear', 'Open World', 'Hub-and-Spoke', 'Metroidvania', 'Procedural Dungeon', 'Arena'] },
  { key: 'estimatedPlaytime', label: 'Estimated Playtime', type: 'text', placeholder: 'e.g. 15-20 minutes' },
  { key: 'rooms', label: 'Rooms / Layout', type: 'list', cols: 2, placeholder: 'e.g. Entry Hall (Combat Arena)' },
  { key: 'objectives', label: 'Objectives', type: 'list', cols: 2 },
  { key: 'events', label: 'Scripted Events', type: 'list', cols: 2 },
  { key: 'secrets', label: 'Secrets', type: 'list' },
  { key: 'puzzles', label: 'Puzzle Systems', type: 'list' },
  { key: 'checkpoints', label: 'Checkpoints', type: 'list' },
  { key: 'rewardPlacement', label: 'Reward Placement', type: 'textarea', cols: 2 },
  { key: 'navigationNotes', label: 'Navigation / Wayfinding', type: 'textarea', cols: 2 },
  { key: 'pacingCurve', label: 'Pacing Curve', type: 'textarea', cols: 2, placeholder: 'How tension/intensity rises and falls across the level…' },
  { key: 'difficultySpikeNotes', label: 'Difficulty Spike Notes', type: 'textarea', cols: 2, placeholder: 'Where difficulty spikes above the surrounding baseline, and why…' },
  { key: 'backtrackShortcuts', label: 'Backtrack Shortcuts', type: 'list', placeholder: 'e.g. Locked door near the entrance opens from the far side after the midpoint' },
  { key: 'proceduralRules', label: 'Procedural Generation Rules', type: 'textarea', cols: 2 },
  { key: 'enemies', label: 'Enemies Present', type: 'relation-multi', target: 'characters' },
  { key: 'lootTable', label: 'Loot Table', type: 'relation-multi', target: 'items' },
  {
    key: 'levelScript', label: 'Level Script (Play Engine)', type: 'textarea', cols: 2,
    placeholder: 'on start: message "Welcome"\non allEnemiesDefeated: message "Area secure!"\non timer 30: damage player 5\non playerHpBelow 20: message "Low health!"',
    hint: 'A tiny real scripting language the Play Engine runs. One rule per line: "on <trigger>[ <number>]: <action>". Triggers: start, enemyDefeated, allEnemiesDefeated, roomCleared (Arena mode\'s multi-room levels), bossEnraged (a boss-subtype enemy drops to <=30% HP), itemCollected, playerDamaged, timer <seconds>, playerHpBelow <n>. Actions: message "text", heal player <n>, damage player <n>, healEnemies <n>, spawnHeal, winLevel, loseLevel.',
  },
];

const EXTRA_FIELDS_BY_SUBTYPE = {
  tutorial: [{ key: 'onboardingMechanics', label: 'Mechanics Introduced', type: 'list', cols: 2, placeholder: 'e.g. Basic attack, dodge roll, first pickup' }],
  'boss-arena': [
    { key: 'linkedBoss', label: 'Boss', type: 'relation', target: 'characters', subtype: 'boss' },
    { key: 'arenaHazards', label: 'Arena Hazards', type: 'list', placeholder: 'e.g. Collapsing floor section' },
  ],
  hub: [
    { key: 'connectedLevels', label: 'Connected Levels', type: 'relation-multi', target: 'levels' },
    { key: 'hubServices', label: 'Hub Services', type: 'list', placeholder: 'e.g. Merchant, Blacksmith, Fast Travel' },
  ],
  'vertical-slice': [{ key: 'sliceGoals', label: 'Slice Goals', type: 'list', cols: 2, placeholder: 'What this slice must prove to stakeholders/investors…' }],
  stealth: [
    { key: 'detectionMechanics', label: 'Detection Mechanics', type: 'textarea', cols: 2, placeholder: 'Vision cones, noise radius, alert states…' },
    { key: 'guardPatrolNotes', label: 'Guard Patrol Notes', type: 'textarea', cols: 2 },
  ],
  'escort-level': [
    { key: 'escortedCharacter', label: 'Escorted Character', type: 'relation', target: 'characters' },
    { key: 'escortPacingNotes', label: 'Escort Pacing Notes', type: 'textarea', cols: 2 },
  ],
  'horde-survival': [
    { key: 'waveCount', label: 'Wave Count', type: 'number' },
    { key: 'survivalDuration', label: 'Survival Duration', type: 'text', placeholder: 'e.g. 10 minutes or 15 waves' },
  ],
  'racing-track': [
    { key: 'trackLength', label: 'Track Length', type: 'text', placeholder: 'e.g. 3.2km, 2 laps' },
    { key: 'trackHazards', label: 'Track Hazards', type: 'list', placeholder: 'e.g. Oil slick, jump ramp, shortcut' },
  ],
  'social-hub': [{ key: 'socialActivities', label: 'Social Activities', type: 'list', cols: 2, placeholder: 'e.g. Fishing spot, music venue, market stalls' }],
  'dungeon-crawl': [{ key: 'trapDensity', label: 'Trap Density', type: 'text', placeholder: 'e.g. 1 trap per 2 rooms' }],
  'open-world-region': [
    { key: 'regionSize', label: 'Region Size', type: 'text', placeholder: 'e.g. 2km x 2km' },
    { key: 'pointsOfInterest', label: 'Points of Interest', type: 'list', cols: 2 },
  ],
  'linear-corridor': [{ key: 'setPieceMoments', label: 'Set-Piece Moments', type: 'list', cols: 2, placeholder: 'e.g. Collapsing bridge chase' }],
  'arena-pvp': [
    { key: 'maxPlayers', label: 'Max Players', type: 'number' },
    { key: 'spawnPointCount', label: 'Spawn Point Count', type: 'number' },
    { key: 'symmetry', label: 'Map Symmetry', type: 'select', options: ['Symmetric', 'Asymmetric'] },
  ],
};

function fieldsFor(subtype) {
  return [...FIELDS, ...(EXTRA_FIELDS_BY_SUBTYPE[subtype] || [])];
}

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [s && { text: `${s.icon} ${s.label}`, cls: 'badge-accent' }, item.layoutType && { text: item.layoutType, cls: 'badge-gray' }].filter(Boolean);
}

function cardMeta(item) {
  return [item.layoutType, item.estimatedPlaytime].filter(Boolean).join(' · ');
}

const LAYOUT_BY_SUBTYPE = {
  'boss-arena': 'Arena', hub: 'Hub-and-Spoke', 'vertical-slice': 'Linear', stealth: 'Open World',
  'escort-level': 'Linear', 'horde-survival': 'Arena', 'racing-track': 'Linear', 'social-hub': 'Hub-and-Spoke',
  'dungeon-crawl': 'Procedural Dungeon', 'open-world-region': 'Open World', 'linear-corridor': 'Linear', 'arena-pvp': 'Arena',
  tutorial: 'Linear',
};

function extraDefaultsFor(rng, subtype) {
  switch (subtype) {
    case 'tutorial': return { onboardingMechanics: ['Basic movement', 'Primary attack', 'First item pickup'] };
    case 'boss-arena': return { arenaHazards: ['Collapsing floor section', 'Environmental fire pool'] };
    case 'hub': return { connectedLevels: [], hubServices: ['Merchant', 'Fast Travel Point'] };
    case 'vertical-slice': return { sliceGoals: ['Demonstrate the core combat loop', 'Show one full traversal ability'] };
    case 'stealth': return { detectionMechanics: 'Cone-of-vision guards with a 3-stage alert meter (Suspicious → Searching → Alerted).', guardPatrolNotes: 'Two overlapping patrol routes with a brief unguarded window roughly every 45s.' };
    case 'escort-level': return { escortPacingNotes: 'Escort target moves at a fixed pace slightly slower than the player, forcing periodic backtracking to clear the path ahead.' };
    case 'horde-survival': return { waveCount: 8 + Math.floor(rng() * 8), survivalDuration: `${8 + Math.floor(rng() * 12)} minutes` };
    case 'racing-track': return { trackLength: `${(1.5 + rng() * 3).toFixed(1)}km, ${1 + Math.floor(rng() * 3)} laps`, trackHazards: ['Oil slick corner', 'Jump ramp shortcut'] };
    case 'social-hub': return { socialActivities: ['Market stalls', 'Fishing spot'] };
    case 'dungeon-crawl': return { trapDensity: '1 trap per 2 rooms' };
    case 'open-world-region': return { regionSize: `${1 + Math.floor(rng() * 3)}km x ${1 + Math.floor(rng() * 3)}km`, pointsOfInterest: ['Abandoned watchtower', 'Hidden cave'] };
    case 'linear-corridor': return { setPieceMoments: ['Scripted structural-collapse chase'] };
    case 'arena-pvp': return { maxPlayers: 8, spawnPointCount: 8, symmetry: 'Symmetric' };
    default: return {};
  }
}

export function generateLevel(rng, subtype) {
  const roomCount = 4 + Math.floor(rng() * 5);
  const layoutType = LAYOUT_BY_SUBTYPE[subtype] || pick(['Linear', 'Open World', 'Hub-and-Spoke', 'Metroidvania', 'Procedural Dungeon', 'Arena'], rng);
  const entry = {
    name: `${generateBiomeName(rng)} — Level`,
    description: `A ${pick(['tense', 'sprawling', 'claustrophobic', 'vertical', 'labyrinthine'], rng)} level ${pick(LORE_HOOKS, rng)}.`,
    layoutType,
    estimatedPlaytime: `${5 * Math.round((10 + rng() * 20) / 5)} minutes`,
    rooms: pickN(ROOM_TYPES, roomCount, rng),
    objectives: [generateQuestName(rng)],
    events: [],
    secrets: rng() < 0.6 ? ['Hidden vault behind a breakable wall'] : [],
    puzzles: rng() < 0.4 ? ['Pressure-plate sequence puzzle'] : [],
    checkpoints: ['Level Start', 'Midpoint', 'Pre-Boss'],
    rewardPlacement: 'Main path rewards are guaranteed; side paths hide higher-rarity loot.',
    navigationNotes: 'Critical path is lit warmer; optional branches are cooler-toned.',
    pacingCurve: 'Opens quiet, ramps through two escalating combat beats, dips for a breather room, then peaks at the boss/finale.',
    difficultySpikeNotes: rng() < 0.5 ? 'A mid-level ambush spikes above the surrounding baseline to keep the player from coasting.' : '',
    backtrackShortcuts: rng() < 0.5 ? ['A shortcut near the midpoint reopens the path back to the hub, saving a full backtrack.'] : [],
    proceduralRules: '',
    links: {},
  };
  if (subtype) Object.assign(entry, extraDefaultsFor(rng, subtype));
  return entry;
}

const GENERATORS = [
  { label: 'Generate Level', run: ({ subtype }) => generateLevel(rngFor(Math.random()), subtype) },
];

export function mountLevels(container, opts) {
  const view = createCollectionView({
    key: 'levels', singular: 'Level', plural: 'Levels', icon: '🗺️',
    subtypes: SUBTYPES,
    fields: fieldsFor,
    makeDefaults: () => ({ rooms: [], objectives: [], events: [], secrets: [], puzzles: [], checkpoints: [], backtrackShortcuts: [], levelScript: '' }),
    cardBadges: badgeFor,
    cardMeta,
    generators: GENERATORS,
    onCreate: (item) => autoTask('levels', item, {
      category: 'design', estimateHours: 10, title: (i) => `Build level: ${i.name}`,
      description: `Whitebox, populate and playtest "${item.name}" (${item.layoutType || 'level'}).`,
    }),
    helpText: 'Tutorial, boss arena, hub, vertical slice, stealth, escort, horde survival, racing track, social hub, dungeon crawl, open-world region, linear corridor and PvP arena levels — with rooms, objectives, events, secrets, puzzles, checkpoints, reward placement, navigation notes, pacing curve, difficulty spikes and backtrack shortcuts.',
  });
  return view.mount(container, opts);
}
