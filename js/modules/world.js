import { createCollectionView } from '../components/collectionView.js';
import { BIOME_TYPES, WEATHER_BY_BIOME, RESOURCE_BASE, HAZARD_BASE, FACTION_PREFIXES, FACTION_SUFFIXES } from '../generators/wordbank.js';
import { rngFor, generateBiomeName, generateBiomeLore, generateFactionName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';

export const SUBTYPES = [
  { key: 'biome', label: 'Biome', icon: '🌳' },
  { key: 'region', label: 'Region', icon: '🗺️' },
  { key: 'city', label: 'City', icon: '🏙️' },
  { key: 'planet', label: 'Planet', icon: '🪐' },
  { key: 'galaxy', label: 'Galaxy', icon: '🌌' },
  { key: 'faction', label: 'Faction', icon: '🚩' },
];

const PLACE_FIELDS = [
  { key: 'biomeType', label: 'Biome Type', type: 'select', options: [{ value: '', label: '— N/A —' }, ...BIOME_TYPES.map(b => ({ value: b.key, label: b.label }))] },
  { key: 'weather', label: 'Weather Patterns', type: 'list', placeholder: 'e.g. Sandstorms' },
  { key: 'lore', label: 'Lore & History', type: 'textarea', cols: 2, placeholder: 'Deep history, myths, past events…' },
  { key: 'resources', label: 'Resources', type: 'list', placeholder: 'e.g. Iron Ore' },
  { key: 'hazards', label: 'Hazards', type: 'list', placeholder: 'e.g. Poison spores' },
  { key: 'factionsPresent', label: 'Factions Present', type: 'list', placeholder: 'e.g. The Iron Concord' },
  { key: 'npcPopulation', label: 'NPC Population', type: 'list', placeholder: 'e.g. 200 Farmers, 12 Guards' },
  { key: 'proceduralRules', label: 'Procedural Generation Rules', type: 'textarea', cols: 2, placeholder: 'e.g. 40% chance of ambush encounter per screen; POIs every 3-5 rooms.' },
];

const FACTION_FIELDS = [
  { key: 'ideology', label: 'Ideology / Motto', type: 'textarea', cols: 2 },
  { key: 'leader', label: 'Leader', type: 'text' },
  { key: 'territory', label: 'Territory', type: 'text' },
  { key: 'goals', label: 'Goals', type: 'list' },
  { key: 'allies', label: 'Allies', type: 'list' },
  { key: 'enemies', label: 'Enemies', type: 'list' },
];

function fieldsFor(subtype) {
  return subtype === 'faction' ? FACTION_FIELDS : PLACE_FIELDS;
}

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.biomeType) badges.push({ text: BIOME_TYPES.find(b => b.key === item.biomeType)?.label || item.biomeType, cls: 'badge-gray' });
  return badges;
}

export function generatePlace(rng, subtype) {
  const type = pick(BIOME_TYPES, rng);
  return {
    name: generateBiomeName(rng),
    biomeType: subtype === 'biome' || subtype === 'region' ? type.key : '',
    description: `A ${type.label.toLowerCase()} ${subtype}.`,
    lore: generateBiomeLore(rng, type.label),
    weather: pickN(WEATHER_BY_BIOME[type.key] || [], 2, rng),
    resources: pickN(RESOURCE_BASE, 3, rng),
    hazards: pickN(HAZARD_BASE, 2, rng),
    factionsPresent: [],
    npcPopulation: [],
    proceduralRules: '',
  };
}

export function generateFaction(rng) {
  return {
    subtype: 'faction', name: generateFactionName(rng),
    description: 'An organized group with its own agenda.',
    ideology: 'Believes strength and order must be restored to a broken world.',
    leader: '', territory: '',
    goals: ['Expand influence', 'Secure resources', 'Eliminate rivals'],
    allies: [], enemies: [],
  };
}

const GENERATORS = [
  { label: 'Generate Place (biome/region/city/planet/galaxy)', run: ({ subtype }) => generatePlace(rngFor(Math.random()), subtype || 'biome') },
  { label: 'Generate Faction', run: () => generateFaction(rngFor(Math.random())) },
];

export function mountWorld(container, opts) {
  const view = createCollectionView({
    key: 'biomes', singular: 'World Entry', plural: 'World Entries', icon: '🌍',
    subtypes: SUBTYPES,
    fields: fieldsFor,
    makeDefaults: (subtype) => subtype === 'faction' ? { goals: [], allies: [], enemies: [] } : { weather: [], resources: [], hazards: [], factionsPresent: [], npcPopulation: [] },
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    helpText: 'Biomes, regions, cities, planets, galaxies and factions — everything else (characters, items, levels) can link back here.',
  });
  return view.mount(container, opts);
}
