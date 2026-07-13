import { createCollectionView } from '../components/collectionView.js';
import { ROOM_TYPES, LORE_HOOKS } from '../generators/wordbank.js';
import { rngFor, generateQuestName, generateBiomeName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { autoTask } from '../taskHooks.js';

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
  { key: 'proceduralRules', label: 'Procedural Generation Rules', type: 'textarea', cols: 2 },
  { key: 'enemies', label: 'Enemies Present', type: 'relation-multi', target: 'characters' },
  { key: 'lootTable', label: 'Loot Table', type: 'relation-multi', target: 'items' },
];

function cardMeta(item) {
  return [item.layoutType, item.estimatedPlaytime].filter(Boolean).join(' · ');
}

export function generateLevel(rng) {
  const roomCount = 4 + Math.floor(rng() * 5);
  return {
    name: `${generateBiomeName(rng)} — Level`,
    description: `A ${pick(['tense', 'sprawling', 'claustrophobic', 'vertical', 'labyrinthine'], rng)} level ${pick(LORE_HOOKS, rng)}.`,
    layoutType: pick(['Linear', 'Open World', 'Hub-and-Spoke', 'Metroidvania', 'Procedural Dungeon', 'Arena'], rng),
    estimatedPlaytime: `${5 * Math.round((10 + rng() * 20) / 5)} minutes`,
    rooms: pickN(ROOM_TYPES, roomCount, rng),
    objectives: [generateQuestName(rng)],
    events: [],
    secrets: rng() < 0.6 ? ['Hidden vault behind a breakable wall'] : [],
    puzzles: rng() < 0.4 ? ['Pressure-plate sequence puzzle'] : [],
    checkpoints: ['Level Start', 'Midpoint', 'Pre-Boss'],
    rewardPlacement: 'Main path rewards are guaranteed; side paths hide higher-rarity loot.',
    navigationNotes: 'Critical path is lit warmer; optional branches are cooler-toned.',
    proceduralRules: '',
    links: {},
  };
}

const GENERATORS = [
  { label: 'Generate Level', run: () => generateLevel(rngFor(Math.random())) },
];

export function mountLevels(container, opts) {
  const view = createCollectionView({
    key: 'levels', singular: 'Level', plural: 'Levels', icon: '🗺️',
    subtypes: null,
    fields: FIELDS,
    makeDefaults: () => ({ rooms: [], objectives: [], events: [], secrets: [], puzzles: [], checkpoints: [] }),
    cardBadges: () => [],
    cardMeta,
    generators: GENERATORS,
    onCreate: (item) => autoTask('levels', item, {
      category: 'design', estimateHours: 10, title: (i) => `Build level: ${i.name}`,
      description: `Whitebox, populate and playtest "${item.name}" (${item.layoutType || 'level'}).`,
    }),
    helpText: 'Levels with rooms, objectives, events, secrets, puzzles, checkpoints, reward placement and navigation notes.',
  });
  return view.mount(container, opts);
}
