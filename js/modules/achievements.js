import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick } from '../util.js';
import { store } from '../store.js';
import { ACHIEVEMENT_TITLES, ACHIEVEMENT_CRITERIA_TEMPLATES, ACHIEVEMENT_CATEGORIES } from '../generators/wordbank.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'bronze', label: 'Bronze', icon: '🥉' },
  { key: 'silver', label: 'Silver', icon: '🥈' },
  { key: 'gold', label: 'Gold', icon: '🥇' },
  { key: 'platinum', label: 'Platinum', icon: '🏆' },
];

const POINTS_BY_TIER = { bronze: 10, silver: 25, gold: 50, platinum: 100 };
const RARITY_NOTE_BY_TIER = {
  bronze: 'Common — most players unlock this',
  silver: 'Uncommon — a solid chunk of players get here',
  gold: 'Rare — a dedicated minority reach this',
  platinum: 'Ultra Rare — full completion only',
};

const PLATFORM_TYPES = ['Cross-platform', 'PlayStation Trophy', 'Xbox Achievement', 'Steam Achievement', 'Nintendo Achievement'];

const FIELDS = [
  { key: 'unlockCriteria', label: 'Unlock Criteria', type: 'textarea', cols: 2, placeholder: 'What must the player do to unlock this?' },
  { key: 'points', label: 'Points / Gamerscore', type: 'number' },
  { key: 'hidden', label: 'Hidden Until Unlocked?', type: 'select', options: ['No', 'Yes'] },
  { key: 'rarityNote', label: 'Rarity Note', type: 'text', placeholder: 'e.g. Ultra Rare — under 5% of players' },
  { key: 'flavorText', label: 'Unlock Flavor Text', type: 'textarea', placeholder: 'The quip shown when the player unlocks this…' },
  { key: 'category', label: 'Category', type: 'select', options: ACHIEVEMENT_CATEGORIES },
  { key: 'platformType', label: 'Platform Type', type: 'select', options: PLATFORM_TYPES },
  { key: 'unlockPercentage', label: 'Estimated Unlock %', type: 'number', placeholder: 'e.g. 12 (percent of players)' },
  { key: 'seasonalWindow', label: 'Seasonal Availability Window', type: 'text', placeholder: 'e.g. Available only during the Winter Event' },
  { key: 'speedrunTarget', label: 'Speedrun Time Target', type: 'text', placeholder: 'e.g. Complete the game in under 3 hours' },
  { key: 'linkedQuest', label: 'Linked Quest', type: 'relation', target: 'quests' },
  { key: 'linkedCharacter', label: 'Linked Character (e.g. a boss)', type: 'relation', target: 'characters' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.hidden === 'Yes') badges.push({ text: 'Hidden', cls: 'badge-gray' });
  return badges;
}

const UNLOCK_PERCENT_BY_TIER = { bronze: 55, silver: 25, gold: 8, platinum: 2 };

export function generateAchievement(rng, subtype) {
  const tier = subtype || 'bronze';
  const name = pick(ACHIEVEMENT_TITLES, rng);
  const bosses = store.list('characters').filter(c => c.subtype === 'boss');
  const quests = store.list('quests');
  const links = {};
  let unlockCriteria;
  const roll = rng();
  if (bosses.length && roll < 0.35) {
    const boss = pick(bosses, rng);
    links.linkedCharacter = boss.id;
    unlockCriteria = `Defeat ${boss.name}${rng() < 0.5 ? ' without taking damage.' : ' on the hardest difficulty.'}`;
  } else if (quests.length && roll < 0.7) {
    const quest = pick(quests, rng);
    links.linkedQuest = quest.id;
    unlockCriteria = `Complete "${quest.name}".`;
  } else {
    unlockCriteria = pick(ACHIEVEMENT_CRITERIA_TEMPLATES, rng).replace('{n}', String(Math.round(3 + rng() * 20)));
  }
  const category = pick(ACHIEVEMENT_CATEGORIES, rng);
  const entry = {
    name, description: `A ${tier} ${tier === 'platinum' ? 'trophy' : 'achievement'}.`,
    unlockCriteria,
    points: POINTS_BY_TIER[tier],
    hidden: rng() < 0.2 ? 'Yes' : 'No',
    rarityNote: RARITY_NOTE_BY_TIER[tier],
    flavorText: '',
    category,
    platformType: 'Cross-platform',
    unlockPercentage: UNLOCK_PERCENT_BY_TIER[tier],
    seasonalWindow: '', speedrunTarget: '',
    links,
  };
  if (category === 'Seasonal') entry.seasonalWindow = 'Available only during a limited-time seasonal event.';
  if (category === 'Speedrun') entry.speedrunTarget = `Complete ${pick(['the game', 'this level', 'this boss fight'], rng)} in under ${1 + Math.floor(rng() * 5)} hour(s).`;
  return entry;
}

const TIER_ORDER = ['bronze', 'silver', 'gold', 'platinum'];
const TIER_SET_GOALS = [
  { verb: 'Defeat', unit: 'enemies', counts: [10, 50, 150, 500] },
  { verb: 'Collect', unit: 'items', counts: [5, 25, 75, 200] },
  { verb: 'Complete', unit: 'quests', counts: [3, 10, 25, 50] },
];
let tierSetState = { goal: null };

export function generateAchievementTierSet({ index }) {
  const rng = rngFor(Math.random() + index);
  const tier = TIER_ORDER[index % TIER_ORDER.length];
  if (index % TIER_ORDER.length === 0) tierSetState.goal = pick(TIER_SET_GOALS, rng);
  const { verb, unit, counts } = tierSetState.goal;
  const count = counts[index % TIER_ORDER.length];
  const base = generateAchievement(rng, tier);
  base.name = `${verb} ${unit}: ${tier.charAt(0).toUpperCase() + tier.slice(1)}`;
  base.description = `Tier ${(index % TIER_ORDER.length) + 1} of 4 in the "${verb} ${unit}" achievement chain.`;
  base.unlockCriteria = `${verb} ${count} ${unit} across the game (cumulative).`;
  base.category = 'Standard';
  return { ...base, subtype: tier };
}

const GENERATORS = [
  { label: 'Generate Achievement', run: ({ subtype }) => generateAchievement(rngFor(Math.random()), subtype || 'bronze') },
  { label: 'Generate Tiered Achievement Set (Bronze→Platinum, one goal)', run: generateAchievementTierSet },
];

export function mountAchievements(container, opts) {
  const view = createCollectionView({
    key: 'achievements', singular: 'Achievement', plural: 'Achievements', icon: '🏆',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ points: 10, hidden: 'No', category: 'Standard', platformType: 'Cross-platform' }),
    cardBadges: badgeFor,
    cardMeta: item => item.unlockCriteria || item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('achievements', item, {
      category: 'design', estimateHours: 1, title: (i) => `Wire up unlock tracking: ${i.name}`,
      description: `Hook up the unlock condition and platform trophy/achievement metadata for "${item.name}".`,
    }),
    helpText: 'Bronze, Silver, Gold and Platinum achievements/trophies across 10 categories (Standard, Speedrun, Collection, Secret, Seasonal, Community, Challenge, Story, Multiplayer, New Game+) — unlock criteria, points, hidden status, rarity/unlock-percentage notes, platform type and category-specific fields (seasonal windows, speedrun targets), linkable to the quest or boss that grants them. Use "Generate Tiered Achievement Set" to draft a full Bronze→Platinum progression chain for one goal in a single click.',
  });
  return view.mount(container, opts);
}
