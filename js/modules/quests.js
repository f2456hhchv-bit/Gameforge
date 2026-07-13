import { createCollectionView } from '../components/collectionView.js';
import { rngFor, generateQuestName } from '../generators/procedural.js';
import { QUEST_VERBS, QUEST_TARGETS, QUEST_CHAIN_THEMES } from '../generators/wordbank.js';
import { pick, pickN } from '../util.js';
import { store } from '../store.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'main', label: 'Main Quest', icon: '⭐' },
  { key: 'side', label: 'Side Quest', icon: '🔸' },
  { key: 'faction', label: 'Faction Quest', icon: '🚩' },
  { key: 'world-event', label: 'World Event', icon: '🌐' },
  { key: 'repeatable', label: 'Repeatable / Daily', icon: '🔁' },
];

const FIELDS = [
  { key: 'giver', label: 'Quest Giver', type: 'relation', target: 'characters' },
  { key: 'location', label: 'Location', type: 'relation', target: 'biomes' },
  { key: 'level', label: 'Level', type: 'relation', target: 'levels' },
  { key: 'stages', label: 'Stages', type: 'list', cols: 2, placeholder: 'e.g. Stage 1: Talk to the innkeeper' },
  { key: 'objectives', label: 'Objectives', type: 'list', cols: 2 },
  { key: 'dialogue', label: 'Key Dialogue', type: 'textarea', cols: 2, placeholder: 'Important lines, quest-giver hooks, closing beats…' },
  { key: 'branching', label: 'Branching / Player Choice', type: 'textarea', cols: 2, placeholder: 'Choices available and how they change the outcome…' },
  { key: 'failureConditions', label: 'Failure Conditions', type: 'list' },
  { key: 'rewards', label: 'Item Rewards', type: 'relation-multi', target: 'items' },
  { key: 'rewardXP', label: 'Reward XP', type: 'number' },
  { key: 'repeatable', label: 'Repeatable?', type: 'select', options: ['No', 'Daily', 'Weekly', 'Unlimited'] },
  { key: 'prerequisiteQuests', label: 'Prerequisite Quests', type: 'relation-multi', target: 'quests' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
}

function cardMeta(item) {
  return (item.objectives || [])[0] || item.description;
}

function generateQuest(rng, subtype) {
  const givers = store.list('characters').filter(c => ['npc', 'merchant'].includes(c.subtype));
  const locations = store.list('biomes').filter(b => b.subtype !== 'faction');
  const giver = givers.length ? pick(givers, rng) : null;
  const location = locations.length ? pick(locations, rng) : null;
  const verb = pick(QUEST_VERBS, rng);
  const target = pick(QUEST_TARGETS, rng);
  const links = {};
  if (giver) links.giver = giver.id;
  if (location) links.location = location.id;
  return {
    name: generateQuestName(rng),
    description: `${verb} ${target}.`,
    stages: [`Stage 1: Speak with ${giver ? giver.name : 'the quest giver'}`, `Stage 2: ${verb} ${target}`, 'Stage 3: Return and report'],
    objectives: [`${verb} ${target}`],
    dialogue: giver ? `"${giver.name}" briefs the player on why ${target} matters.` : '',
    branching: rng() < 0.4 ? 'Player may choose to negotiate instead of fighting, altering the reward and faction standing.' : '',
    failureConditions: rng() < 0.3 ? ['Quest giver dies before completion', 'Time limit expires'] : [],
    rewards: [],
    rewardXP: Math.round(50 + rng() * 450),
    repeatable: subtype === 'repeatable' ? pick(['Daily', 'Weekly'], rng) : 'No',
    prerequisiteQuests: [],
    links,
  };
}

let chainState = { theme: null, chainStart: 0 };

export function generateQuestChainEntry({ index, subtype, existing }) {
  const rng = rngFor(Math.random());
  if (index === 0 || index - chainState.chainStart >= chainState.theme.beats.length) {
    chainState.theme = pick(QUEST_CHAIN_THEMES, rng);
    chainState.chainStart = index;
  }
  const stageNum = index - chainState.chainStart + 1;
  const total = chainState.theme.beats.length;
  const beat = chainState.theme.beats[stageNum - 1];
  const quest = generateQuest(rng, subtype || 'main');
  const label = `${chainState.theme.name} (${stageNum}/${total})`;
  quest.name = `${label}: ${quest.name}`;
  quest.description = beat;
  quest.objectives = [beat];
  quest.stages = [`Stage 1: ${beat}`, 'Stage 2: Return and report'];
  const prevLabel = `${chainState.theme.name} (${stageNum - 1}/${total}):`;
  const prev = stageNum > 1 ? existing.find(q => (q.name || '').startsWith(prevLabel)) : null;
  quest.prerequisiteQuests = prev ? [prev.id] : [];
  return quest;
}

const GENERATORS = [
  { label: 'Generate Quest', run: ({ subtype }) => generateQuest(rngFor(Math.random()), subtype || 'side') },
  { label: 'Quest Chain (linked multi-stage story arc)', run: generateQuestChainEntry },
];

export function mountQuests(container, opts) {
  const view = createCollectionView({
    key: 'quests', singular: 'Quest', plural: 'Quests', icon: '📯',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ stages: [], objectives: [], failureConditions: [], rewards: [], prerequisiteQuests: [] }),
    cardBadges: badgeFor,
    cardMeta,
    generators: GENERATORS,
    onCreate: (item) => autoTask('quests', item, {
      category: 'writing', estimateHours: 5, title: (i) => `Write & implement quest: ${i.name}`,
      description: `Script dialogue, wire up quest state, and playtest "${item.name}".`,
    }),
    helpText: 'Main quests, side quests, faction quests, world events and repeatables — with stages, dialogue, branching, rewards and prerequisites.',
  });
  return view.mount(container, opts);
}

export { generateQuest };
