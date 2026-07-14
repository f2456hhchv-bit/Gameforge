import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { store } from '../store.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'internal-test', label: 'Internal Test', icon: '🏢' },
  { key: 'external-test', label: 'External Test', icon: '🌐' },
  { key: 'focus-group', label: 'Focus Group', icon: '👥' },
  { key: 'alpha', label: 'Alpha', icon: '🅰️' },
  { key: 'beta', label: 'Beta', icon: '🅱️' },
  { key: 'usability-test', label: 'Usability Test', icon: '🖱️' },
  { key: 'bug-bash', label: 'Bug Bash', icon: '🐞' },
];

const METHODOLOGIES = ['Moderated in-person', 'Unmoderated remote', 'Survey only', 'Analytics-only', 'Focus group', 'Live-streamed', 'Bug bash / dedicated QA sweep'];
const METHOD_BY_SUBTYPE = {
  'internal-test': 'Moderated in-person', 'external-test': 'Unmoderated remote', 'focus-group': 'Focus group',
  alpha: 'Analytics-only', beta: 'Live-streamed', 'usability-test': 'Moderated in-person', 'bug-bash': 'Bug bash / dedicated QA sweep',
};
const COUNT_RANGE_BY_SUBTYPE = {
  'internal-test': [4, 10], 'external-test': [15, 60], 'focus-group': [6, 12], alpha: [20, 100],
  beta: [100, 5000], 'usability-test': [5, 8], 'bug-bash': [3, 15],
};
const FINDINGS = [
  'Players consistently missed the tutorial prompt for the dodge mechanic.',
  'The difficulty spike at the third boss caused a noticeable drop-off.',
  'Most testers didn\'t realize the crafting menu could be opened from the pause screen.',
  'Combat felt satisfying, but enemy telegraphs were too subtle at higher difficulties.',
  'Several testers got lost navigating back to the main hub after a side quest.',
  'The inventory sort function was rated the single most-requested missing feature.',
  'Onboarding pacing was praised — testers felt oriented within the first five minutes.',
  'Audio mixing made dialogue hard to hear over combat music.',
  'The save/load flow confused new players; icons weren\'t self-explanatory.',
  'Testers loved the companion banter but wanted more of it during exploration.',
  'Frame pacing issues were reported during large enemy encounters.',
  'The reward pacing for side quests felt too generous compared to main quests.',
];
const BUGS = [
  'Player can clip through geometry near the docks area', 'Quest marker sometimes points to the wrong objective',
  'Inventory duplicates an item after a rapid sell/buy sequence', 'Boss occasionally soft-locks during phase transition',
  'Settings menu resets audio sliders on relaunch', 'Companion AI gets stuck on stairs',
  'Achievement unlock toast overlaps with dialogue subtitles', 'Save file corrupts if the app is closed during autosave',
];
const QUOTES = [
  '"I didn\'t want to stop playing — I lost track of time."', '"The art style really pulled me in from the first minute."',
  '"That boss fight was the highlight of the whole session."', '"I loved how the world reacted to my choices."',
  '"The controls felt great once I got past the first ten minutes."',
];
const FOLLOWUPS = [
  'Add a clearer visual cue for the dodge window and re-test with the same cohort.',
  'Rebalance the difficulty curve around the reported spike before the next build.',
  'Redesign the crafting menu entry point and add a contextual hint.',
  'Prioritize the reported soft-lock bug before external testing resumes.',
  'Schedule a follow-up focus group once the onboarding changes ship.',
];

const FIELDS = [
  { key: 'buildVersion', label: 'Build Version', type: 'text', placeholder: 'e.g. 0.4.2' },
  { key: 'sessionDate', label: 'Session Date', type: 'text', placeholder: 'YYYY-MM-DD' },
  { key: 'testerCount', label: 'Number of Testers', type: 'number' },
  { key: 'testerProfile', label: 'Tester Profile', type: 'text', placeholder: 'e.g. 5 core gamers, 3 non-gamers' },
  { key: 'sessionLength', label: 'Session Length', type: 'text', placeholder: 'e.g. 45 min' },
  { key: 'methodology', label: 'Methodology', type: 'select', options: METHODOLOGIES },
  { key: 'objectives', label: 'Objectives', type: 'textarea', placeholder: 'What this session was meant to learn…' },
  { key: 'keyFindings', label: 'Key Findings', type: 'textarea', cols: 2 },
  { key: 'bugsFound', label: 'Bugs Found', type: 'list' },
  { key: 'positiveQuotes', label: 'Positive Quotes', type: 'list' },
  { key: 'sentimentScore', label: 'Sentiment Score (1-10)', type: 'number' },
  { key: 'criticalIssuesCount', label: 'Critical Issues Count', type: 'number' },
  { key: 'followUpActions', label: 'Follow-Up Actions', type: 'textarea', cols: 2 },
  { key: 'levelTested', label: 'Level Tested', type: 'relation', target: 'levels' },
  { key: 'questsTested', label: 'Quests Tested', type: 'relation-multi', target: 'quests' },
];

function sentimentClass(score) {
  if (score >= 7) return 'badge-green';
  if (score >= 4) return 'badge-amber';
  return 'badge-rose';
}

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.sentimentScore) badges.push({ text: `Sentiment ${item.sentimentScore}/10`, cls: sentimentClass(item.sentimentScore) });
  return badges;
}

export function generatePlaytestSession(rng, subtype) {
  const key = subtype || 'internal-test';
  const [lo, hi] = COUNT_RANGE_BY_SUBTYPE[key] || [5, 20];
  const testerCount = Math.round(lo + rng() * (hi - lo));
  const buildVersion = `0.${Math.floor(1 + rng() * 9)}.${Math.floor(rng() * 20)}`;
  const sentimentScore = Math.max(1, Math.min(10, Math.round(4 + rng() * 6)));
  const levels = store.list('levels');
  const quests = store.list('quests');
  const links = {};
  if (levels.length) links.levelTested = pick(levels, rng).id;
  if (quests.length) links.questsTested = pickN(quests, Math.min(quests.length, 1 + Math.floor(rng() * 2)), rng).map(q => q.id);
  return {
    name: `${SUBTYPES.find(s => s.key === key)?.label || 'Playtest'} — Build ${buildVersion} (${testerCount} testers)`,
    description: `A ${key.replace(/-/g, ' ')} session on build ${buildVersion}.`,
    buildVersion,
    sessionDate: '',
    testerCount,
    testerProfile: pick(['Mostly core genre fans', 'Mixed core and casual players', 'Non-gamer control group', 'Existing community beta cohort', 'QA strike team'], rng),
    sessionLength: pick(['30 min', '45 min', '1 hour', '90 min', 'Full session (2+ hours)'], rng),
    methodology: METHOD_BY_SUBTYPE[key] || pick(METHODOLOGIES, rng),
    objectives: pick(['Validate the new onboarding flow.', 'Stress-test the difficulty curve.', 'Surface blocking bugs before the next milestone.', 'Gauge first-hour retention and clarity.', 'Collect qualitative feedback on the core loop.'], rng),
    keyFindings: pickN(FINDINGS, 2, rng).join(' '),
    bugsFound: pickN(BUGS, 1 + Math.floor(rng() * 3), rng),
    positiveQuotes: pickN(QUOTES, 1 + Math.floor(rng() * 2), rng),
    sentimentScore,
    criticalIssuesCount: Math.floor(rng() * 4),
    followUpActions: pick(FOLLOWUPS, rng),
    links,
  };
}

const GENERATORS = [
  { label: 'Generate Playtest Session', run: ({ subtype }) => generatePlaytestSession(rngFor(Math.random()), subtype || 'internal-test') },
];

export function mountPlaytests(container, opts) {
  const view = createCollectionView({
    key: 'playtestSessions', singular: 'Playtest Session', plural: 'Playtest Sessions', icon: '🧪',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ testerCount: 5, sentimentScore: 5, criticalIssuesCount: 0, bugsFound: [], positiveQuotes: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.keyFindings,
    generators: GENERATORS,
    onCreate: (item) => autoTask('playtestSessions', item, {
      category: 'qa', estimateHours: 2, title: (i) => `Triage playtest findings: ${i.name}`,
      description: `Review bugs, findings and follow-up actions from "${item.name}" and turn them into concrete fixes.`,
    }),
    helpText: 'Internal, external, focus-group, alpha, beta, usability and bug-bash sessions — tester profile, methodology, findings, bugs, positive quotes, sentiment score and follow-up actions, linkable to the level or quests that were tested.',
  });
  return view.mount(container, opts);
}
