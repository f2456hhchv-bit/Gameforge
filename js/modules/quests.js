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
  { key: 'escort', label: 'Escort', icon: '🚶' },
  { key: 'collection', label: 'Collection', icon: '📦' },
  { key: 'investigation', label: 'Investigation / Mystery', icon: '🔍' },
  { key: 'timed-event', label: 'Timed Event', icon: '⏱️' },
  { key: 'delivery', label: 'Delivery', icon: '📬' },
  { key: 'rescue', label: 'Rescue', icon: '🆘' },
  { key: 'defense', label: 'Defense / Siege', icon: '🛡️' },
  { key: 'heist', label: 'Heist', icon: '🎭' },
  { key: 'race', label: 'Race', icon: '🏁' },
  { key: 'puzzle', label: 'Puzzle', icon: '🧩' },
  { key: 'diplomacy', label: 'Diplomacy', icon: '🕊️' },
  { key: 'bounty', label: 'Bounty', icon: '🎯' },
  { key: 'crafting', label: 'Crafting', icon: '🔨' },
  { key: 'exploration', label: 'Exploration', icon: '🧭' },
  { key: 'moral-choice', label: 'Moral Choice', icon: '⚖️' },
  { key: 'infiltration', label: 'Infiltration', icon: '🥷' },
  { key: 'sabotage', label: 'Sabotage', icon: '🧨' },
  { key: 'tournament', label: 'Tournament', icon: '🏆' },
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
  { key: 'branchingOutcomes', label: 'Branching Outcomes', type: 'list', cols: 2, placeholder: 'e.g. Spare the warlord: faction gains a spy; Kill the warlord: faction gains territory' },
  { key: 'companionApproval', label: 'Companion Approval Effects', type: 'textarea', cols: 2, placeholder: 'Which companions approve/disapprove of each choice, and by how much…' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
}

function cardMeta(item) {
  return (item.objectives || [])[0] || item.description;
}

const SUBTYPE_QUEST_FLAVOR = {
  escort: { verb: 'Escort', failureConditions: ['Escort target dies before reaching the destination'], branching: 'Player may take the safe long route or the dangerous shortcut, trading time for risk.' },
  collection: { verb: 'Recover', failureConditions: [], branching: '' },
  investigation: { verb: 'Investigate', failureConditions: ['Key witness dies or flees before being questioned'], branching: 'Player may accuse the wrong suspect if evidence is misread, locking out the true culprit\'s resolution.' },
  'timed-event': { verb: 'Defend', failureConditions: ['Time limit expires before the objective completes'], branching: '' },
  delivery: { verb: 'Deliver', failureConditions: ['Item is lost, stolen or destroyed before delivery', 'Recipient moves on if delivery is too late'], branching: 'Player may open and inspect the package en route, altering recipient trust.' },
  rescue: { verb: 'Rescue', failureConditions: ['Captive is executed or moved before rescue', 'Captive dies during extraction'], branching: 'Player may negotiate the captive\'s release instead of a direct rescue, at a resource cost.' },
  defense: { verb: 'Defend', failureConditions: ['Defended objective or location falls before the assault ends'], branching: 'Player may commit reserves early for safety or hold them back for a stronger late push.' },
  heist: { verb: 'Steal from', failureConditions: ['Alarm triggered and guards mobilize before extraction', 'Stolen goods dropped or recovered by guards'], branching: 'Player may take the safe, slow route or a fast, loud one with better loot but higher risk.' },
  race: { verb: 'Race to', failureConditions: ['Finish outside the time/placement threshold'], branching: '' },
  puzzle: { verb: 'Solve', failureConditions: [], branching: 'Multiple valid solution paths exist; the one chosen colors the reward/reputation gained.' },
  diplomacy: { verb: 'Broker peace between', failureConditions: ['Talks collapse if reputation with either side is too low'], branching: 'Player may favor one side\'s terms over the other, altering long-term faction relations.' },
  bounty: { verb: 'Track down', failureConditions: ['Target escapes the region before being found', 'Target is killed by someone else first'], branching: 'Player may bring the target in alive for a bonus, or dead for speed.' },
  crafting: { verb: 'Craft', failureConditions: [], branching: '' },
  exploration: { verb: 'Chart', failureConditions: [], branching: '' },
  'moral-choice': { verb: 'Decide the fate of', failureConditions: [], branching: 'Every resolution is morally ambiguous — there is no clean "good" outcome, only tradeoffs.' },
  infiltration: { verb: 'Infiltrate', failureConditions: ['Detected and forcibly ejected before reaching the objective'], branching: 'Player may impersonate staff for easier access, or stay hidden entirely for a higher reward.' },
  sabotage: { verb: 'Sabotage', failureConditions: ['Sabotage discovered and reversed before it takes effect'], branching: 'Player may make the sabotage look like an accident, avoiding blame, or leave an obvious message.' },
  tournament: { verb: 'Compete in', failureConditions: ['Eliminated before the final round'], branching: 'Player may throw an early match strategically to avoid a tough opponent later.' },
};

function generateQuest(rng, subtype) {
  const givers = store.list('characters').filter(c => ['npc', 'merchant'].includes(c.subtype));
  const locations = store.list('biomes').filter(b => b.subtype !== 'faction');
  const giver = givers.length ? pick(givers, rng) : null;
  const location = locations.length ? pick(locations, rng) : null;
  const flavor = SUBTYPE_QUEST_FLAVOR[subtype];
  const verb = flavor ? flavor.verb : pick(QUEST_VERBS, rng);
  const target = pick(QUEST_TARGETS, rng);
  const links = {};
  if (giver) links.giver = giver.id;
  if (location) links.location = location.id;
  const collectionCount = subtype === 'collection' ? 3 + Math.floor(rng() * 5) : null;
  return {
    name: generateQuestName(rng),
    description: `${verb} ${target}.`,
    stages: subtype === 'collection'
      ? [`Stage 1: Speak with ${giver ? giver.name : 'the quest giver'}`, `Stage 2: Recover ${collectionCount}x ${target}`, 'Stage 3: Return and report']
      : [`Stage 1: Speak with ${giver ? giver.name : 'the quest giver'}`, `Stage 2: ${verb} ${target}`, 'Stage 3: Return and report'],
    objectives: subtype === 'collection' ? [`Recover ${collectionCount}x ${target}`] : [`${verb} ${target}`],
    dialogue: giver ? `"${giver.name}" briefs the player on why ${target} matters.` : '',
    branching: flavor ? flavor.branching : (rng() < 0.4 ? 'Player may choose to negotiate instead of fighting, altering the reward and faction standing.' : ''),
    failureConditions: flavor ? flavor.failureConditions : (rng() < 0.3 ? ['Quest giver dies before completion', 'Time limit expires'] : []),
    rewards: [],
    rewardXP: Math.round(50 + rng() * 450),
    repeatable: subtype === 'repeatable' ? pick(['Daily', 'Weekly'], rng) : 'No',
    prerequisiteQuests: [],
    branchingOutcomes: flavor && flavor.branching ? [flavor.branching] : [],
    companionApproval: '',
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
    makeDefaults: () => ({ stages: [], objectives: [], failureConditions: [], rewards: [], prerequisiteQuests: [], branchingOutcomes: [] }),
    cardBadges: badgeFor,
    cardMeta,
    generators: GENERATORS,
    onCreate: (item) => autoTask('quests', item, {
      category: 'writing', estimateHours: 5, title: (i) => `Write & implement quest: ${i.name}`,
      description: `Script dialogue, wire up quest state, and playtest "${item.name}".`,
    }),
    helpText: 'Main, side, faction, world-event, repeatable, escort, collection, investigation, timed-event, delivery, rescue, defense/siege, heist, race, puzzle, diplomacy, bounty, crafting, exploration, moral-choice, infiltration, sabotage and tournament quests — with stages, dialogue, branching outcomes, companion approval effects, rewards and prerequisites.',
  });
  return view.mount(container, opts);
}

export { generateQuest };
