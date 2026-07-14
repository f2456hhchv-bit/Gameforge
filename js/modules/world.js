import { createCollectionView } from '../components/collectionView.js';
import { BIOME_TYPES, WEATHER_BY_BIOME, RESOURCE_BASE, HAZARD_BASE, FACTION_PREFIXES, FACTION_SUFFIXES, CONTINENT_ADJECTIVES, CONTINENT_NOUNS, CLIMATES, POLITICAL_STRUCTURES, REPUTATION_TIERS } from '../generators/wordbank.js';
import { rngFor, generateBiomeName, generateBiomeLore, generateFactionName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'biome', label: 'Biome', icon: '🌳' },
  { key: 'region', label: 'Region', icon: '🗺️' },
  { key: 'city', label: 'City', icon: '🏙️' },
  { key: 'settlement', label: 'Settlement', icon: '🏘️' },
  { key: 'landmark', label: 'Landmark / POI', icon: '🗿' },
  { key: 'planet', label: 'Planet', icon: '🪐' },
  { key: 'galaxy', label: 'Galaxy', icon: '🌌' },
  { key: 'faction', label: 'Faction', icon: '🚩' },
  { key: 'continent', label: 'Continent', icon: '🌎' },
  { key: 'dimension', label: 'Dimension / Plane', icon: '🌀' },
  { key: 'shrine', label: 'Shrine / Temple', icon: '⛩️' },
  { key: 'ruins', label: 'Ruins', icon: '🏚️' },
  { key: 'trade-route', label: 'Trade Route', icon: '🛤️' },
  { key: 'capital-city', label: 'Capital City', icon: '👑' },
  { key: 'colony', label: 'Colony', icon: '🏕️' },
  { key: 'wilderness-preserve', label: 'Wilderness Preserve', icon: '🦉' },
  { key: 'underwater-zone', label: 'Underwater Zone', icon: '🐠' },
  { key: 'sky-zone', label: 'Sky Zone / Floating Isle', icon: '☁️' },
];

const PLACE_FIELDS = [
  { key: 'biomeType', label: 'Biome Type', type: 'select', options: [{ value: '', label: '— N/A —' }, ...BIOME_TYPES.map(b => ({ value: b.key, label: b.label }))] },
  { key: 'weather', label: 'Weather Patterns', type: 'list', placeholder: 'e.g. Sandstorms' },
  { key: 'climate', label: 'Climate', type: 'text', placeholder: 'e.g. Arid, temperate, subarctic' },
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
  { key: 'politicalStructure', label: 'Political Structure', type: 'select', options: POLITICAL_STRUCTURES },
  { key: 'reputationTiers', label: 'Reputation Tiers', type: 'list', placeholder: 'e.g. Hostile, Neutral, Friendly, Allied' },
  { key: 'goals', label: 'Goals', type: 'list' },
  { key: 'allies', label: 'Allies', type: 'list' },
  { key: 'enemies', label: 'Enemies', type: 'list' },
];

const PLACE_EXTRA_FIELDS_BY_SUBTYPE = {
  shrine: [{ key: 'patronDeity', label: 'Patron Deity / Power', type: 'text', placeholder: 'e.g. The Ashen Mother' }],
  ruins: [
    { key: 'formerCivilization', label: 'Former Civilization', type: 'text', placeholder: 'e.g. The Sunken Concord' },
    { key: 'ruinAge', label: 'Age', type: 'text', placeholder: 'e.g. Roughly 800 years' },
  ],
  'trade-route': [{ key: 'connectedSettlements', label: 'Connected Settlements', type: 'relation-multi', target: 'biomes' }],
  'capital-city': [{ key: 'governingFaction', label: 'Governing Faction', type: 'relation', target: 'biomes', subtype: 'faction' }],
  colony: [{ key: 'parentSettlement', label: 'Parent Settlement', type: 'relation', target: 'biomes' }],
  'wilderness-preserve': [{ key: 'protectedSpecies', label: 'Protected Species', type: 'list', placeholder: 'e.g. Frost elk herds' }],
  'underwater-zone': [
    { key: 'maxDepth', label: 'Max Depth', type: 'text', placeholder: 'e.g. 400m' },
    { key: 'oxygenNotes', label: 'Oxygen / Pressure Notes', type: 'text', placeholder: 'e.g. Requires a diving suit past 50m' },
  ],
  'sky-zone': [
    { key: 'altitude', label: 'Altitude', type: 'text', placeholder: 'e.g. 3000m above sea level' },
    { key: 'floatingMechanism', label: 'Floating Mechanism', type: 'text', placeholder: 'e.g. Levitation crystal veins' },
  ],
  dimension: [
    { key: 'accessMethod', label: 'Access Method', type: 'text', placeholder: 'e.g. A ritual circle activated at midnight' },
    { key: 'temporalRules', label: 'Temporal / Physical Rule Differences', type: 'textarea', cols: 2, placeholder: 'How time, gravity or physics differ here…' },
  ],
};

function fieldsFor(subtype) {
  if (subtype === 'faction') return FACTION_FIELDS;
  return [...PLACE_FIELDS, ...(PLACE_EXTRA_FIELDS_BY_SUBTYPE[subtype] || [])];
}

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.biomeType) badges.push({ text: BIOME_TYPES.find(b => b.key === item.biomeType)?.label || item.biomeType, cls: 'badge-gray' });
  return badges;
}

function placeExtraDefaultsFor(rng, subtype) {
  switch (subtype) {
    case 'shrine': return { patronDeity: 'An old, half-remembered local power.' };
    case 'ruins': return { formerCivilization: 'A civilization whose name has been lost to time.', ruinAge: `Roughly ${100 + Math.floor(rng() * 900)} years` };
    case 'trade-route': return { connectedSettlements: [] };
    case 'capital-city': return { governingFaction: '' };
    case 'colony': return { parentSettlement: '' };
    case 'wilderness-preserve': return { protectedSpecies: pickN(RESOURCE_BASE, 1, rng) };
    case 'underwater-zone': return { maxDepth: `${100 + Math.floor(rng() * 400)}m`, oxygenNotes: 'Requires diving equipment past shallow depths.' };
    case 'sky-zone': return { altitude: `${1000 + Math.floor(rng() * 4000)}m above sea level`, floatingMechanism: 'Levitation crystal veins running through the bedrock.' };
    case 'dimension': return { accessMethod: 'A ritual or artifact-triggered rift.', temporalRules: 'Time and/or gravity behave differently here than in the base world.' };
    default: return {};
  }
}

export function generatePlace(rng, subtype) {
  const type = pick(BIOME_TYPES, rng);
  const entry = {
    name: generateBiomeName(rng),
    biomeType: subtype === 'biome' || subtype === 'region' ? type.key : '',
    description: `A ${type.label.toLowerCase()} ${subtype}.`,
    lore: generateBiomeLore(rng, type.label),
    weather: pickN(WEATHER_BY_BIOME[type.key] || [], 2, rng),
    climate: pick(CLIMATES, rng),
    resources: pickN(RESOURCE_BASE, 3, rng),
    hazards: pickN(HAZARD_BASE, 2, rng),
    factionsPresent: [],
    npcPopulation: [],
    proceduralRules: '',
  };
  if (subtype) Object.assign(entry, placeExtraDefaultsFor(rng, subtype));
  return entry;
}

export function generateFaction(rng) {
  return {
    subtype: 'faction', name: generateFactionName(rng),
    description: 'An organized group with its own agenda.',
    ideology: 'Believes strength and order must be restored to a broken world.',
    leader: '', territory: '',
    politicalStructure: pick(POLITICAL_STRUCTURES, rng),
    reputationTiers: [...REPUTATION_TIERS],
    goals: ['Expand influence', 'Secure resources', 'Eliminate rivals'],
    allies: [], enemies: [],
  };
}

export function generateContinent(rng, subtype) {
  const place = generatePlace(rng, subtype || 'continent');
  place.subtype = subtype || 'continent';
  place.name = `The ${pick(CONTINENT_ADJECTIVES, rng)} ${pick(CONTINENT_NOUNS, rng)}`;
  place.description = `A vast, continent-scale ${place.subtype} spanning multiple climates and biomes.`;
  place.resources = pickN(RESOURCE_BASE, 5, rng);
  place.hazards = pickN(HAZARD_BASE, 3, rng);
  place.proceduralRules = 'Composed of several distinct sub-biomes — consider generating individual Biome entries nested within this one and cross-linking them via lore.';
  return place;
}

const GENERATORS = [
  { label: 'Generate Place (biome/region/city/settlement/landmark/planet/galaxy)', run: ({ subtype }) => generatePlace(rngFor(Math.random()), subtype || 'biome') },
  { label: 'Generate Faction', run: () => generateFaction(rngFor(Math.random())) },
  { label: 'Generate Continent (large-scale, multi-biome)', run: ({ subtype }) => generateContinent(rngFor(Math.random()), subtype) },
];

export function mountWorld(container, opts) {
  const view = createCollectionView({
    key: 'biomes', singular: 'World Entry', plural: 'World Entries', icon: '🌍',
    subtypes: SUBTYPES,
    fields: fieldsFor,
    makeDefaults: (subtype) => subtype === 'faction' ? { goals: [], allies: [], enemies: [], reputationTiers: [] } : { weather: [], resources: [], hazards: [], factionsPresent: [], npcPopulation: [], connectedSettlements: [], protectedSpecies: [] },
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('biomes', item, {
      category: 'design', estimateHours: item.subtype === 'faction' ? 3 : 6,
      title: (i) => `Build out: ${i.name}`,
      description: `Environment/world-building pass for "${item.name}".`,
    }),
    helpText: 'Biomes, regions, cities, settlements, landmarks/POIs, planets, galaxies, factions, continents, dimensions/planes, shrines/temples, ruins, trade routes, capital cities, colonies, wilderness preserves, underwater zones and sky zones — everything else (characters, items, levels) can link back here. Factions track political structure and reputation tiers.',
  });
  return view.mount(container, opts);
}
