import { createCollectionView } from '../components/collectionView.js';
import { rngFor, generateCharacterName, generateCreatureName, statBlockForLevel, generateAbilityName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { DAMAGE_TYPES } from '../generators/wordbank.js';

const SUBTYPES = [
  { key: 'player', label: 'Player Character', icon: '🦸' },
  { key: 'enemy', label: 'Enemy', icon: '👹' },
  { key: 'boss', label: 'Boss', icon: '🐲' },
  { key: 'npc', label: 'NPC', icon: '🧑' },
  { key: 'merchant', label: 'Merchant', icon: '🛒' },
  { key: 'companion', label: 'Companion', icon: '🐾' },
  { key: 'wildlife', label: 'Wildlife', icon: '🦌' },
];

const FIELDS = [
  { key: 'biography', label: 'Biography', type: 'textarea', cols: 2, placeholder: 'Backstory, personality, role in the story…' },
  { key: 'visualDescription', label: 'Visual Description', type: 'textarea', cols: 2, placeholder: 'Physical appearance, silhouette, distinguishing features…' },
  { key: 'level', label: 'Level', type: 'number' },
  { key: 'statistics', label: 'Statistics', type: 'stats' },
  { key: 'scaling', label: 'Scaling Notes', type: 'textarea', cols: 2, placeholder: 'How stats scale with player level / NG+ / difficulty…' },
  { key: 'abilities', label: 'Abilities', type: 'list', cols: 2, placeholder: 'e.g. Flame Strike' },
  { key: 'behaviour', label: 'Behaviour', type: 'textarea', cols: 2, placeholder: 'General combat/social behaviour…' },
  { key: 'ai', label: 'AI Notes', type: 'textarea', cols: 2, placeholder: 'State machine / behaviour tree summary…' },
  { key: 'weaknesses', label: 'Weaknesses', type: 'list' },
  { key: 'variants', label: 'Variants', type: 'list' },
  { key: 'animations', label: 'Animations', type: 'list', placeholder: 'e.g. Idle, Attack A, Death' },
  { key: 'voice', label: 'Voice Direction', type: 'text', placeholder: 'e.g. Gravelly, sparse dialogue' },
  { key: 'sound', label: 'Sound Cues', type: 'list', placeholder: 'e.g. Footsteps, roar' },
  { key: 'drops', label: 'Drops (Loot)', type: 'relation-multi', target: 'items' },
  { key: 'spawnBiome', label: 'Spawn Location', type: 'relation', target: 'biomes' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.level) badges.push({ text: `Lv ${item.level}`, cls: 'badge-gray' });
  return badges;
}

const BEHAVIOUR_BY_SUBTYPE = {
  enemy: 'Aggroes on sight within range; attacks in short bursts then repositions.',
  boss: 'Multi-phase encounter; telegraphs heavy attacks; enrages below 30% health.',
  npc: 'Idles on a daily schedule; reacts to reputation changes with the player.',
  merchant: 'Stationary; opens a trade menu on interaction; restocks periodically.',
  companion: 'Follows the player; assists in combat; can be given simple commands.',
  wildlife: 'Flees from the player unless cornered or provoked.',
  player: 'Fully player-controlled; no autonomous behaviour.',
};

function generateCharacter(rng, subtype) {
  const level = 1 + Math.floor(rng() * 20);
  const isCombat = ['enemy', 'boss', 'wildlife'].includes(subtype);
  const name = subtype === 'enemy' || subtype === 'boss' || subtype === 'wildlife' ? generateCreatureName(rng) : generateCharacterName(rng, subtype);
  return {
    name, level,
    description: `${SUBTYPES.find(s => s.key === subtype)?.label || 'Character'} encountered in the world.`,
    biography: '',
    visualDescription: '',
    statistics: isCombat ? statBlockForLevel(rng, level, subtype === 'boss' ? 4 : 1) : [],
    scaling: isCombat ? 'Stats scale linearly with player level; bosses gain +1 phase per NG+ cycle.' : '',
    abilities: isCombat ? pickN([generateAbilityName(rng), generateAbilityName(rng), generateAbilityName(rng)], 2, rng) : [],
    behaviour: BEHAVIOUR_BY_SUBTYPE[subtype] || '',
    ai: isCombat ? 'Idle → Aggro → Attack Loop → Reposition → (Enrage if boss)' : '',
    weaknesses: isCombat ? pickN(DAMAGE_TYPES, 2, rng) : [],
    variants: [],
    animations: isCombat ? ['Idle', 'Move', 'Attack', 'Hit React', 'Death'] : ['Idle', 'Talk'],
    voice: '',
    sound: [],
    links: {},
  };
}

const GENERATORS = [
  { label: 'Generate Character', run: ({ subtype }) => generateCharacter(rngFor(Math.random()), subtype || 'npc') },
];

export function mountCharacters(container, opts) {
  const view = createCollectionView({
    key: 'characters', singular: 'Character', plural: 'Characters', icon: '🧑‍🎤',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: (subtype) => ({ level: 1, statistics: [], abilities: [], weaknesses: [], variants: [], animations: [], sound: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    helpText: 'Player characters, enemies, bosses, NPCs, merchants, companions and wildlife all live here — each fully statted and linkable to loot and biomes.',
  });
  return view.mount(container, opts);
}
