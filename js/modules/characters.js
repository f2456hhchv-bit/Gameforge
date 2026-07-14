import { createCollectionView } from '../components/collectionView.js';
import { rngFor, generateCharacterName, generateCreatureName, statBlockForLevel, generateAbilityName } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { DAMAGE_TYPES, NPC_OCCUPATIONS, LEGENDARY_TITLES, PERSONALITY_TRAITS } from '../generators/wordbank.js';
import { generateFactionName } from '../generators/procedural.js';
import { autoTask } from '../taskHooks.js';
import { store } from '../store.js';

export const SUBTYPES = [
  { key: 'player', label: 'Player Character', icon: '🦸' },
  { key: 'enemy', label: 'Enemy', icon: '👹' },
  { key: 'boss', label: 'Boss', icon: '🐲' },
  { key: 'npc', label: 'NPC', icon: '🧑' },
  { key: 'merchant', label: 'Merchant', icon: '🛒' },
  { key: 'companion', label: 'Companion', icon: '🐾' },
  { key: 'wildlife', label: 'Wildlife', icon: '🦌' },
  { key: 'summon', label: 'Summon / Pet', icon: '✨' },
  { key: 'rival', label: 'Rival', icon: '😤' },
  { key: 'mentor', label: 'Mentor', icon: '🧙' },
  { key: 'informant', label: 'Informant', icon: '🕵️' },
  { key: 'hostage', label: 'Hostage / Captive', icon: '⛓️' },
  { key: 'elite', label: 'Elite Enemy', icon: '💀' },
  { key: 'horde-minion', label: 'Horde Minion', icon: '🧟' },
  { key: 'guard', label: 'Guard', icon: '💂' },
  { key: 'cultist', label: 'Cultist', icon: '🕯️' },
  { key: 'specialist-vendor', label: 'Specialist Vendor', icon: '⚒️' },
  { key: 'tamed-pet', label: 'Tamed Pet', icon: '🐕' },
  { key: 'boss-add', label: 'Boss Add', icon: '👥' },
  { key: 'narrator', label: 'Narrator / Voice-Only', icon: '📻' },
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
  { key: 'personalityTraits', label: 'Personality Traits', type: 'list', placeholder: 'e.g. Stoic, Loyal, Quick-tempered' },
  { key: 'dialogueBank', label: 'Sample Dialogue Lines', type: 'list', cols: 2, placeholder: 'e.g. "You again? Fine. Let\'s get this over with."' },
  { key: 'factionAllegiance', label: 'Faction Allegiance', type: 'relation', target: 'biomes', subtype: 'faction' },
  { key: 'relationshipNotes', label: 'Relationship Notes', type: 'textarea', cols: 2, placeholder: 'Ties to other characters — rivalries, family, mentorship…' },
  { key: 'drops', label: 'Drops (Loot)', type: 'relation-multi', target: 'items' },
  { key: 'spawnBiome', label: 'Spawn Location', type: 'relation', target: 'biomes' },
];

const CULT_RANKS = ['Initiate', 'Acolyte', 'Zealot', 'High Priest'];
const INTEL_RELIABILITY = ['Reliable', 'Unreliable', 'Untested'];
const VENDOR_SPECIALTIES = ['Blacksmith', 'Alchemist', 'Enchanter', 'Jeweler', 'Cook', 'Shipwright'];
const LOYALTY_LEVELS = ['Wary', 'Warming Up', 'Loyal', 'Devoted'];

const EXTRA_FIELDS_BY_SUBTYPE = {
  rival: [{ key: 'rivalryArc', label: 'Rivalry Arc', type: 'textarea', cols: 2, placeholder: 'How the rivalry escalates across the story, and how it can resolve…' }],
  mentor: [{ key: 'teachesAbilities', label: 'Teaches Abilities', type: 'list', cols: 2, placeholder: 'e.g. Parry, Double Jump' }],
  informant: [
    { key: 'intelType', label: 'Intel Type', type: 'text', placeholder: 'e.g. Enemy patrol routes, black market prices' },
    { key: 'intelReliability', label: 'Intel Reliability', type: 'select', options: INTEL_RELIABILITY },
  ],
  hostage: [
    { key: 'captiveConditions', label: 'Captive Conditions', type: 'text', placeholder: 'e.g. Chained in a guarded cell, drugged and unconscious' },
    { key: 'rescueConditions', label: 'Rescue Conditions', type: 'textarea', cols: 2, placeholder: 'What must happen to free and safely extract them…' },
  ],
  elite: [{ key: 'eliteModifiers', label: 'Elite Modifiers', type: 'list', placeholder: 'e.g. +50% health, adds a shield-break phase' }],
  'horde-minion': [
    { key: 'swarmSize', label: 'Typical Swarm Size', type: 'text', placeholder: 'e.g. 6-12 per encounter' },
    { key: 'swarmBehavior', label: 'Swarm Behaviour', type: 'textarea', placeholder: 'How the group moves/attacks together…' },
  ],
  guard: [
    { key: 'guardPost', label: 'Guard Post / Patrol Route', type: 'text', placeholder: 'e.g. Paces the east rampart, checks the gate every 40s' },
    { key: 'alertRadius', label: 'Alert Radius', type: 'text', placeholder: 'e.g. 8m, calls 2 nearby guards when alerted' },
  ],
  cultist: [
    { key: 'cultRank', label: 'Cult Rank', type: 'select', options: CULT_RANKS },
    { key: 'ritualRole', label: 'Ritual Role', type: 'text', placeholder: 'e.g. Chants to empower the boss during the fight' },
  ],
  'specialist-vendor': [
    { key: 'specialty', label: 'Specialty', type: 'select', options: VENDOR_SPECIALTIES },
    { key: 'craftingServices', label: 'Crafting Services', type: 'list', placeholder: 'e.g. Upgrade weapon rarity, socket a gem' },
  ],
  'tamed-pet': [
    { key: 'tamingMethod', label: 'Taming Method', type: 'textarea', placeholder: 'e.g. Feed 3x Rare Meat while crouched nearby, then survive one retaliation attack.' },
    { key: 'loyaltyLevel', label: 'Loyalty Level', type: 'select', options: LOYALTY_LEVELS },
  ],
  'boss-add': [
    { key: 'parentBoss', label: 'Parent Boss', type: 'relation', target: 'characters', subtype: 'boss' },
    { key: 'spawnTrigger', label: 'Spawn Trigger', type: 'text', placeholder: 'e.g. Phase 2 start, every 25% HP threshold' },
  ],
  narrator: [
    { key: 'crossoverSource', label: 'Appears In / Crossover Source', type: 'text', placeholder: 'e.g. Radio contact only, referenced in lore but never seen' },
  ],
};

function fieldsFor(subtype) {
  return [...FIELDS, ...(EXTRA_FIELDS_BY_SUBTYPE[subtype] || [])];
}

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
  summon: 'Acts autonomously per simple AI rules for a limited duration or until dismissed; despawns on death (no loot).',
  rival: 'Reappears at scripted story beats, growing stronger each encounter; may become an ally depending on player choices.',
  mentor: 'Stationary or found at a home base; teaches new abilities/skills through dialogue or training sequences.',
  informant: 'Provides rumors/intel for a price or favor; may mislead if reputation is low.',
  hostage: 'Immobile or fearful until rescued; may need to be escorted to safety afterward.',
  elite: 'Tougher variant of a standard enemy with an extra affix/ability; telegraphs a signature move.',
  'horde-minion': 'Spawns and attacks in large numbers with low individual health; overwhelms through volume, not skill.',
  guard: 'Patrols a fixed post or route; investigates disturbances and calls for backup when alerted.',
  cultist: 'Performs rituals when undisturbed; fights fanatically, ignoring self-preservation.',
  'specialist-vendor': 'Stationary; offers a narrow crafting/upgrade service the generic merchant does not.',
  'tamed-pet': 'Loyal to the player after taming; fights alongside them and can be issued simple commands.',
  'boss-add': 'Spawned by a boss during a specific phase; exists to divide player attention or resources.',
  narrator: 'Voice/text-only presence with no physical body; comments on events or provides exposition.',
};

const CREATURE_NAME_SUBTYPES = ['enemy', 'boss', 'wildlife', 'elite', 'horde-minion', 'boss-add', 'tamed-pet'];
const COMBAT_SUBTYPES = ['enemy', 'boss', 'wildlife', 'summon', 'elite', 'horde-minion', 'boss-add', 'rival', 'tamed-pet'];
const SOCIAL_SUBTYPES = ['npc', 'merchant', 'companion', 'mentor', 'informant', 'hostage', 'guard', 'cultist', 'specialist-vendor', 'narrator', 'rival'];

export function generateCharacter(rng, subtype) {
  const level = 1 + Math.floor(rng() * 20);
  const isCombat = COMBAT_SUBTYPES.includes(subtype);
  const isSocial = SOCIAL_SUBTYPES.includes(subtype);
  const name = CREATURE_NAME_SUBTYPES.includes(subtype) ? generateCreatureName(rng) : generateCharacterName(rng, subtype);
  const entry = {
    name, level,
    description: `${SUBTYPES.find(s => s.key === subtype)?.label || 'Character'} encountered in the world.`,
    biography: '',
    visualDescription: '',
    statistics: isCombat ? statBlockForLevel(rng, level, subtype === 'boss' ? 4 : subtype === 'elite' ? 2 : subtype === 'horde-minion' ? 0.4 : 1) : [],
    scaling: isCombat ? 'Stats scale linearly with player level; bosses gain +1 phase per NG+ cycle.' : '',
    abilities: isCombat ? pickN([generateAbilityName(rng), generateAbilityName(rng), generateAbilityName(rng)], 2, rng) : [],
    behaviour: BEHAVIOUR_BY_SUBTYPE[subtype] || '',
    ai: isCombat ? 'Idle → Aggro → Attack Loop → Reposition → (Enrage if boss)' : '',
    weaknesses: isCombat ? pickN(DAMAGE_TYPES, 2, rng) : [],
    variants: [],
    animations: isCombat ? ['Idle', 'Move', 'Attack', 'Hit React', 'Death'] : ['Idle', 'Talk'],
    voice: '',
    sound: [],
    personalityTraits: isSocial ? pickN(PERSONALITY_TRAITS, 2, rng) : [],
    dialogueBank: [],
    relationshipNotes: '',
    links: {},
  };
  if (subtype === 'elite') entry.eliteModifiers = pickN(['+50% health', '+25% damage', 'Adds a shield-break phase', 'Gains a dash-slam attack', 'Immune to one status effect'], 2, rng);
  if (subtype === 'horde-minion') { entry.swarmSize = `${4 + Math.floor(rng() * 8)} per encounter`; entry.swarmBehavior = 'Advances as a loose group; a few always break off to flank.'; }
  if (subtype === 'cultist') { entry.cultRank = pick(CULT_RANKS, rng); entry.ritualRole = 'Chants to buff nearby allies while undisturbed.'; }
  if (subtype === 'specialist-vendor') { entry.specialty = pick(VENDOR_SPECIALTIES, rng); entry.craftingServices = ['Upgrade item rarity', 'Add a socket', 'Reroll an affix']; }
  if (subtype === 'tamed-pet') { entry.tamingMethod = 'Approach slowly and feed it, then survive one retaliation attempt.'; entry.loyaltyLevel = 'Wary'; }
  if (subtype === 'informant') { entry.intelType = 'Rumors about nearby points of interest.'; entry.intelReliability = pick(INTEL_RELIABILITY, rng); }
  if (subtype === 'hostage') { entry.captiveConditions = 'Bound and guarded; will not flee on their own.'; entry.rescueConditions = 'Defeat or sneak past the guards, then escort them to the nearest safe zone.'; }
  if (subtype === 'guard') { entry.guardPost = 'Patrols a fixed route near the entrance.'; entry.alertRadius = '8m; calls nearby guards when alerted.'; }
  if (subtype === 'mentor') entry.teachesAbilities = [generateAbilityName(rng)];
  if (subtype === 'rival') entry.rivalryArc = 'Appears as a lesser threat early on, escalating across 2-3 encounters into a genuine late-game challenge.';
  if (subtype === 'narrator') entry.crossoverSource = 'Voice/text-only — never physically present.';
  return entry;
}

let factionRosterState = { name: '', size: 6 };

export function generateFactionRosterMember({ index }) {
  const rng = rngFor(Math.random());
  if (index % factionRosterState.size === 0) {
    factionRosterState.name = generateFactionName(rng);
  }
  const isLeader = index % factionRosterState.size === 0;
  const occupation = isLeader ? 'Leader' : pick(NPC_OCCUPATIONS, rng);
  const char = generateCharacter(rng, 'npc');
  char.subtype = 'npc';
  char.description = `${occupation} of ${factionRosterState.name}.`;
  char.biography = isLeader
    ? `Founded and commands ${factionRosterState.name}.`
    : `Serves ${factionRosterState.name} as ${occupation.toLowerCase()}.`;
  return char;
}

export function generateGauntletBoss({ index }) {
  const rng = rngFor(Math.random());
  const tier = index + 1;
  const char = generateCharacter(rng, 'boss');
  char.subtype = 'boss';
  char.level = 10 + tier * 5;
  char.name = `${char.name}, ${pick(LEGENDARY_TITLES, rng)}`;
  char.description = `Gauntlet boss #${tier} — difficulty scales with encounter order in the sequence.`;
  char.statistics = statBlockForLevel(rng, char.level, 4 + tier * 0.5);
  char.scaling = `Tier ${tier} of the gauntlet; stats scale up sharply with each successive boss.`;
  return char;
}

let rivalArcState = { name: '' };
const RIVAL_ARC_BEATS = [
  'First meeting — outmatches or embarrasses the player in a minor way.',
  'Second clash — a genuine, evenly-matched fight with real stakes.',
  'Final confrontation — climactic showdown; can resolve as defeat, death, or reconciliation.',
];

export function generateRivalArcEntry({ index }) {
  const rng = rngFor(Math.random() + index);
  const stageNum = index % RIVAL_ARC_BEATS.length;
  if (stageNum === 0) rivalArcState.name = generateCharacterName(rng, 'rival');
  const char = generateCharacter(rng, 'rival');
  char.subtype = 'rival';
  char.name = rivalArcState.name;
  char.level = 3 + (index % RIVAL_ARC_BEATS.length) * 8;
  char.description = `Rivalry beat ${stageNum + 1}/${RIVAL_ARC_BEATS.length}: ${RIVAL_ARC_BEATS[stageNum]}`;
  char.rivalryArc = RIVAL_ARC_BEATS[stageNum];
  char.statistics = statBlockForLevel(rng, char.level, 1.5 + stageNum);
  return char;
}

export function generateBossAddWave({ index }) {
  const rng = rngFor(Math.random() + index);
  const bosses = store.list('characters').filter(c => c.subtype === 'boss');
  const parentBoss = bosses.length ? pick(bosses, rng) : null;
  const char = generateCharacter(rng, 'boss-add');
  char.subtype = 'boss-add';
  char.name = `${parentBoss ? parentBoss.name + "'s " : ''}Summoned Add`;
  char.description = parentBoss ? `Add spawned during ${parentBoss.name}'s fight.` : 'Add spawned during a boss fight.';
  char.spawnTrigger = ['Phase 2 start', 'Every 25% HP threshold', 'On a timer every 20s'][index % 3];
  if (parentBoss) char.links.parentBoss = parentBoss.id;
  return char;
}

const GENERATORS = [
  { label: 'Generate Character', run: ({ subtype }) => generateCharacter(rngFor(Math.random()), subtype || 'npc') },
  { label: 'Faction Roster (leader + members, same faction)', run: generateFactionRosterMember },
  { label: 'Boss Gauntlet (escalating difficulty sequence)', run: generateGauntletBoss },
  { label: 'Rival Arc (3 escalating encounters, same character)', run: generateRivalArcEntry },
  { label: 'Boss Add Wave (linked to an existing boss)', run: generateBossAddWave },
];

export function mountCharacters(container, opts) {
  const view = createCollectionView({
    key: 'characters', singular: 'Character', plural: 'Characters', icon: '🧑‍🎤',
    subtypes: SUBTYPES,
    fields: fieldsFor,
    makeDefaults: (subtype) => ({ level: 1, statistics: [], abilities: [], weaknesses: [], variants: [], animations: [], sound: [], personalityTraits: [], dialogueBank: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('characters', item, {
      category: 'art', estimateHours: item.subtype === 'boss' ? 12 : item.subtype === 'elite' ? 7 : 5,
      difficulty: ['boss', 'elite'].includes(item.subtype) ? 'hard' : 'medium',
      title: (i) => `Model, rig & animate: ${i.name}`,
      description: `Art + animation pass for ${item.subtype || 'character'} "${item.name}".`,
    }),
    helpText: 'Player characters, enemies, bosses, elites, horde minions, boss adds, NPCs, merchants, specialist vendors, companions, tamed pets, wildlife, summons, rivals, mentors, informants, hostages, guards, cultists and voice-only narrators all live here — each fully statted and linkable to loot, biomes and faction allegiance.',
  });
  return view.mount(container, opts);
}
