import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick } from '../util.js';
import { store } from '../store.js';
import { ACHIEVEMENT_TITLES, ACHIEVEMENT_CRITERIA_TEMPLATES } from '../generators/wordbank.js';
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

const FIELDS = [
  { key: 'unlockCriteria', label: 'Unlock Criteria', type: 'textarea', cols: 2, placeholder: 'What must the player do to unlock this?' },
  { key: 'points', label: 'Points / Gamerscore', type: 'number' },
  { key: 'hidden', label: 'Hidden Until Unlocked?', type: 'select', options: ['No', 'Yes'] },
  { key: 'rarityNote', label: 'Rarity Note', type: 'text', placeholder: 'e.g. Ultra Rare — under 5% of players' },
  { key: 'flavorText', label: 'Unlock Flavor Text', type: 'textarea', placeholder: 'The quip shown when the player unlocks this…' },
  { key: 'linkedQuest', label: 'Linked Quest', type: 'relation', target: 'quests' },
  { key: 'linkedCharacter', label: 'Linked Character (e.g. a boss)', type: 'relation', target: 'characters' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.hidden === 'Yes') badges.push({ text: 'Hidden', cls: 'badge-gray' });
  return badges;
}

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
  return {
    name, description: `A ${tier} ${tier === 'platinum' ? 'trophy' : 'achievement'}.`,
    unlockCriteria,
    points: POINTS_BY_TIER[tier],
    hidden: rng() < 0.2 ? 'Yes' : 'No',
    rarityNote: RARITY_NOTE_BY_TIER[tier],
    flavorText: '',
    links,
  };
}

const GENERATORS = [
  { label: 'Generate Achievement', run: ({ subtype }) => generateAchievement(rngFor(Math.random()), subtype || 'bronze') },
];

export function mountAchievements(container, opts) {
  const view = createCollectionView({
    key: 'achievements', singular: 'Achievement', plural: 'Achievements', icon: '🏆',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ points: 10, hidden: 'No' }),
    cardBadges: badgeFor,
    cardMeta: item => item.unlockCriteria || item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('achievements', item, {
      category: 'design', estimateHours: 1, title: (i) => `Wire up unlock tracking: ${i.name}`,
      description: `Hook up the unlock condition and platform trophy/achievement metadata for "${item.name}".`,
    }),
    helpText: 'Bronze, Silver, Gold and Platinum achievements/trophies — unlock criteria, points, hidden status and rarity notes, linkable to the quest or boss that grants them.',
  });
  return view.mount(container, opts);
}
