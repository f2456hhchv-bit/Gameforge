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
  { key: 'accessibility-test', label: 'Accessibility Test', icon: '♿' },
  { key: 'localization-test', label: 'Localization Test', icon: '🌐' },
  { key: 'performance-test', label: 'Performance Test', icon: '⚡' },
  { key: 'certification-test', label: 'Certification Test', icon: '✅' },
  { key: 'soft-launch', label: 'Soft Launch', icon: '🚀' },
  { key: 'closed-beta-wave', label: 'Closed Beta Wave', icon: '🌊' },
];

const METHODOLOGIES = ['Moderated in-person', 'Unmoderated remote', 'Survey only', 'Analytics-only', 'Focus group', 'Live-streamed', 'Bug bash / dedicated QA sweep', 'Assistive-technology audit', 'In-region native-speaker review', 'Automated performance capture', 'First-party certification checklist', 'Phased regional rollout'];
const METHOD_BY_SUBTYPE = {
  'internal-test': 'Moderated in-person', 'external-test': 'Unmoderated remote', 'focus-group': 'Focus group',
  alpha: 'Analytics-only', beta: 'Live-streamed', 'usability-test': 'Moderated in-person', 'bug-bash': 'Bug bash / dedicated QA sweep',
  'accessibility-test': 'Assistive-technology audit', 'localization-test': 'In-region native-speaker review',
  'performance-test': 'Automated performance capture', 'certification-test': 'First-party certification checklist',
  'soft-launch': 'Phased regional rollout', 'closed-beta-wave': 'Unmoderated remote',
};
const COUNT_RANGE_BY_SUBTYPE = {
  'internal-test': [4, 10], 'external-test': [15, 60], 'focus-group': [6, 12], alpha: [20, 100],
  beta: [100, 5000], 'usability-test': [5, 8], 'bug-bash': [3, 15],
  'accessibility-test': [3, 8], 'localization-test': [2, 6], 'performance-test': [1, 4],
  'certification-test': [1, 3], 'soft-launch': [500, 20000], 'closed-beta-wave': [50, 500],
};
const ASSISTIVE_DEVICES = ['Screen reader', 'Switch access controller', 'Eye-tracking input', 'Colourblind simulation filters', 'Voice control software'];
const CERT_BODIES = ['Platform TRC/Cert checklist', 'Age-rating board submission', 'First-party compliance review', 'Payment/IAP compliance audit'];
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

const COMMON_FIELDS = [
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

const EXTRA_FIELDS_BY_SUBTYPE = {
  'accessibility-test': [{ key: 'assistiveDeviceUsed', label: 'Assistive Device Used', type: 'select', options: ASSISTIVE_DEVICES }],
  'localization-test': [{ key: 'languagesCovered', label: 'Languages Covered', type: 'tags' }],
  'performance-test': [{ key: 'avgFPS', label: 'Average FPS', type: 'number' }, { key: 'frameTimeP99Ms', label: '99th-Percentile Frame Time (ms)', type: 'number' }],
  'certification-test': [{ key: 'certBody', label: 'Certification Body / Checklist', type: 'select', options: CERT_BODIES }],
  'soft-launch': [{ key: 'regionsLaunched', label: 'Regions Launched', type: 'tags' }],
  'closed-beta-wave': [{ key: 'waveNumber', label: 'Wave Number', type: 'number' }],
};

const FIELDS = (subtype) => [...COMMON_FIELDS, ...(EXTRA_FIELDS_BY_SUBTYPE[subtype] || [])];

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
  const entry = {
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
  if (key === 'accessibility-test') entry.assistiveDeviceUsed = pick(ASSISTIVE_DEVICES, rng);
  if (key === 'localization-test') entry.languagesCovered = pickN(['French', 'German', 'Japanese', 'Korean', 'Simplified Chinese', 'Brazilian Portuguese', 'Spanish (LatAm)'], 2 + Math.floor(rng() * 3), rng);
  if (key === 'performance-test') { entry.avgFPS = Math.round(30 + rng() * 90); entry.frameTimeP99Ms = Math.round(10 + rng() * 40); }
  if (key === 'certification-test') entry.certBody = pick(CERT_BODIES, rng);
  if (key === 'soft-launch') entry.regionsLaunched = pickN(['Philippines', 'Canada', 'Australia', 'New Zealand', 'Nordics', 'Netherlands'], 1 + Math.floor(rng() * 3), rng);
  if (key === 'closed-beta-wave') entry.waveNumber = 1 + Math.floor(rng() * 5);
  return entry;
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
    helpText: '13 session types — internal, external, focus-group, alpha, beta, usability, bug-bash, accessibility, localization, performance, certification, soft-launch and closed-beta-wave — tester profile, methodology, findings, bugs, positive quotes, sentiment score, follow-up actions and subtype-specific fields (assistive device, languages covered, FPS/frame time, cert body, regions launched, wave number), linkable to the level or quests that were tested.',
  });
  return view.mount(container, opts);
}
