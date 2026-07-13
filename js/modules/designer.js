import { createCollectionView } from '../components/collectionView.js';
import { store } from '../store.js';
import { PLATFORMS, RARITIES } from '../schema.js';
import { rngFor } from '../generators/procedural.js';
import { pick } from '../util.js';

const SUBTYPES = [
  { key: 'pillar', label: 'Game Pillar', icon: '🏛️' },
  { key: 'core-loop', label: 'Core Loop', icon: '🔁' },
  { key: 'usp', label: 'USP', icon: '💎' },
  { key: 'audience', label: 'Target Audience', icon: '🎯' },
  { key: 'difficulty', label: 'Difficulty', icon: '📈' },
  { key: 'monetization', label: 'Monetisation', icon: '💰' },
  { key: 'session-length', label: 'Session Length', icon: '⏱️' },
  { key: 'replayability', label: 'Replayability', icon: '♻️' },
  { key: 'platform-analysis', label: 'Platform Analysis', icon: '🖥️' },
  { key: 'competitor', label: 'Competitor Analysis', icon: '🏳️' },
  { key: 'persona', label: 'Player Persona', icon: '🙋' },
  { key: 'risk', label: 'Risk Analysis', icon: '⚠️' },
  { key: 'swot', label: 'SWOT', icon: '🧩' },
  { key: 'success-metric', label: 'Success Metric', icon: '📏' },
  { key: 'economy', label: 'Economy Report', icon: '💱' },
];

const FIELDS_BY_SUBTYPE = {
  'pillar': [
    { key: 'statement', label: 'Pillar Statement', type: 'textarea', cols: 2, placeholder: 'e.g. "Every fight is a puzzle" — the non-negotiable design promise.' },
    { key: 'evidence', label: 'Supporting Mechanics', type: 'list', cols: 2, placeholder: 'e.g. parryable attacks' },
  ],
  'core-loop': [
    { key: 'loopSteps', label: 'Loop Steps (in order)', type: 'list', cols: 2, placeholder: 'e.g. Explore' },
    { key: 'loopLengthMinutes', label: 'Loop Length (minutes)', type: 'number' },
    { key: 'rewardFeedback', label: 'Reward / Feedback', type: 'text' },
  ],
  'usp': [
    { key: 'statement', label: 'Unique Selling Proposition', type: 'textarea', cols: 2 },
    { key: 'proofPoints', label: 'Proof Points', type: 'list', cols: 2 },
  ],
  'audience': [
    { key: 'ageRange', label: 'Age Range', type: 'text' },
    { key: 'demographics', label: 'Demographics', type: 'text' },
    { key: 'psychographics', label: 'Psychographics', type: 'textarea', cols: 2 },
    { key: 'motivations', label: 'Motivations', type: 'list', cols: 2 },
  ],
  'difficulty': [
    { key: 'modes', label: 'Difficulty Modes', type: 'list', cols: 2, placeholder: 'e.g. Story, Normal, Hard' },
    { key: 'scalingNotes', label: 'Scaling Notes', type: 'textarea', cols: 2 },
    { key: 'accessibilityOptions', label: 'Accessibility Options', type: 'list', cols: 2 },
  ],
  'monetization': [
    { key: 'model', label: 'Model', type: 'select', options: ['Premium (one-time purchase)', 'Free-to-Play + IAP', 'Subscription', 'DLC / Expansions', 'Battle Pass', 'Ad-Supported', 'Hybrid'] },
    { key: 'pricePoint', label: 'Price Point', type: 'text' },
    { key: 'ethicalNotes', label: 'Fairness / Ethics Notes', type: 'textarea', cols: 2 },
  ],
  'session-length': [
    { key: 'targetSessionLength', label: 'Target Session Length', type: 'text', placeholder: 'e.g. 20-40 minutes' },
    { key: 'saveSystemNotes', label: 'Save/Checkpoint Notes', type: 'textarea', cols: 2 },
  ],
  'replayability': [
    { key: 'mechanisms', label: 'Replay Mechanisms', type: 'list', cols: 2, placeholder: 'e.g. procedural levels' },
    { key: 'newGamePlus', label: 'New Game+ Notes', type: 'textarea', cols: 2 },
  ],
  'platform-analysis': [
    { key: 'platform', label: 'Platform', type: 'select', options: PLATFORMS },
    { key: 'pros', label: 'Pros', type: 'list' },
    { key: 'cons', label: 'Cons', type: 'list' },
    { key: 'technicalNotes', label: 'Technical Constraints', type: 'textarea', cols: 2 },
  ],
  'competitor': [
    { key: 'strengths', label: 'Their Strengths', type: 'list' },
    { key: 'weaknesses', label: 'Their Weaknesses', type: 'list' },
    { key: 'marketPosition', label: 'Market Position', type: 'text', cols: 2 },
    { key: 'differentiation', label: 'How We Differentiate', type: 'textarea', cols: 2 },
  ],
  'persona': [
    { key: 'age', label: 'Age', type: 'text' },
    { key: 'occupation', label: 'Occupation', type: 'text' },
    { key: 'goals', label: 'Goals', type: 'list' },
    { key: 'frustrations', label: 'Frustrations', type: 'list' },
    { key: 'playHabits', label: 'Play Habits', type: 'textarea', cols: 2 },
    { key: 'quote', label: 'Representative Quote', type: 'text', cols: 2 },
  ],
  'risk': [
    { key: 'category', label: 'Category', type: 'select', options: ['Technical', 'Design', 'Market', 'Team', 'Financial', 'Scope'] },
    { key: 'likelihood', label: 'Likelihood', type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'impact', label: 'Impact', type: 'select', options: ['Low', 'Medium', 'High'] },
    { key: 'mitigation', label: 'Mitigation Plan', type: 'textarea', cols: 2 },
  ],
  'swot': [
    { key: 'strengths', label: 'Strengths', type: 'list' },
    { key: 'weaknesses', label: 'Weaknesses', type: 'list' },
    { key: 'opportunities', label: 'Opportunities', type: 'list' },
    { key: 'threats', label: 'Threats', type: 'list' },
  ],
  'success-metric': [
    { key: 'metricType', label: 'Type', type: 'select', options: ['KPI', 'Business', 'Engagement', 'Quality', 'Retention'] },
    { key: 'target', label: 'Target Value', type: 'text' },
    { key: 'measurementMethod', label: 'How We Measure It', type: 'textarea', cols: 2 },
  ],
  'economy': [
    { key: 'currencyTypes', label: 'Currency Types', type: 'list' },
    { key: 'totalItemValue', label: 'Total Item Value in Circulation', type: 'number' },
    { key: 'totalQuestRewardXP', label: 'Total Quest Reward XP', type: 'number' },
    { key: 'rarityDistribution', label: 'Item Rarity Distribution', type: 'list', cols: 2 },
    { key: 'sources', label: 'Sources (where currency/value enters)', type: 'list', cols: 2, placeholder: 'e.g. quest rewards, boss drops' },
    { key: 'sinks', label: 'Sinks (where currency/value leaves)', type: 'list', cols: 2, placeholder: 'e.g. crafting costs, shop purchases' },
    { key: 'notes', label: 'Balance Notes', type: 'textarea', cols: 2 },
  ],
};

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
}

const GENERATORS = [
  {
    label: 'Draft SWOT Analysis', run: () => {
      const rng = rngFor('swot');
      return {
        subtype: 'swot', name: 'SWOT Analysis',
        description: 'Auto-drafted starting point — refine with real project specifics.',
        strengths: ['Strong core pillar clarity', 'Small, focused scope'],
        weaknesses: ['Limited marketing budget', 'Unproven genre mashup'],
        opportunities: ['Underserved niche audience', 'Growing platform storefront visibility'],
        threats: ['Larger studios entering the genre', 'Platform certification risk'],
      };
    },
  },
  {
    label: 'Draft 3 Player Personas', run: ({ index }) => {
      const rng = rngFor('persona' + index);
      const names = ['The Completionist', 'The Casual Explorer', 'The Competitive Optimizer'];
      const name = names[index % names.length];
      return {
        subtype: 'persona', name,
        age: pick(['18-24', '25-34', '35-44'], rng),
        occupation: pick(['Student', 'Software Engineer', 'Teacher', 'Freelancer'], rng),
        goals: ['See all the content', 'Relax after work', 'Master every system'],
        frustrations: ['Repetitive grind', 'Unclear objectives', 'Unbalanced difficulty spikes'],
        playHabits: 'Plays in short bursts most weekdays, longer sessions on weekends.',
        quote: 'I just want to feel like my time was respected.',
      };
    },
  },
  {
    label: 'Generate Risk Register', run: ({ index }) => {
      const risks = [
        { name: 'Scope creep threatens milestone dates', category: 'Scope', likelihood: 'High', impact: 'High' },
        { name: 'Core combat loop may not be fun in first playtest', category: 'Design', likelihood: 'Medium', impact: 'High' },
        { name: 'Key engine feature unsupported on target platform', category: 'Technical', likelihood: 'Low', impact: 'High' },
        { name: 'Small team bandwidth for art production', category: 'Team', likelihood: 'Medium', impact: 'Medium' },
        { name: 'Monetization model underperforms projections', category: 'Financial', likelihood: 'Medium', impact: 'Medium' },
      ];
      const r = risks[index % risks.length];
      return { subtype: 'risk', name: r.name, category: r.category, likelihood: r.likelihood, impact: r.impact, mitigation: 'Review at next milestone checkpoint; assign an owner.' };
    },
  },
  {
    label: 'Draft Core Loop', run: () => ({
      subtype: 'core-loop', name: 'Core Gameplay Loop',
      loopSteps: ['Explore', 'Encounter Challenge', 'Overcome / Fail & Retry', 'Collect Reward', 'Upgrade', 'Return to Explore'],
      loopLengthMinutes: 8, rewardFeedback: 'Visible power growth + narrative beat every 2-3 loops.',
    }),
  },
  {
    label: 'Draft Success Metrics', run: ({ index }) => {
      const metrics = [
        { name: 'Day 1 Retention', metricType: 'Retention', target: '≥ 40%' },
        { name: 'Average Session Length', metricType: 'Engagement', target: '25+ minutes' },
        { name: 'Tutorial Completion Rate', metricType: 'Quality', target: '≥ 85%' },
        { name: 'Review Score', metricType: 'Business', target: '≥ 80 Metacritic' },
      ];
      const m = metrics[index % metrics.length];
      return { subtype: 'success-metric', name: m.name, metricType: m.metricType, target: m.target, measurementMethod: 'Tracked via analytics dashboard / storefront reviews.' };
    },
  },
  {
    label: 'Generate Economy Report (from live project data)', run: () => {
      const items = store.list('items');
      const quests = store.list('quests');
      const currencyItems = items.filter(i => i.subtype === 'currency');
      const totalItemValue = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
      const totalQuestRewardXP = quests.reduce((s, q) => s + (Number(q.rewardXP) || 0), 0);
      const rarityDistribution = RARITIES.map(r => `${r}: ${items.filter(i => i.rarity === r).length}`);
      const craftedItems = items.filter(i => (i.craftedFrom || []).length);
      const sources = [
        `${quests.length} quest(s) grant XP rewards (${totalQuestRewardXP.toLocaleString()} total)`,
        `${currencyItems.length} currency item type(s) worth ${currencyItems.reduce((s, i) => s + (Number(i.value) || 0), 0).toLocaleString()} combined`,
        `${items.filter(i => i.subtype !== 'currency').length} non-currency item(s) with a combined value of ${totalItemValue.toLocaleString()}`,
      ];
      const sinks = craftedItems.length
        ? [`${craftedItems.length} item(s) consume crafting materials (see each item's "Crafted From" relation)`]
        : ['No crafting-cost items defined yet — add "Crafted From" relations in Item Studio to model sinks here.'];
      return {
        subtype: 'economy', name: 'Economy Report',
        description: 'Auto-computed from the live project — regenerate after adding more items/quests to refresh.',
        currencyTypes: currencyItems.map(i => i.name),
        totalItemValue, totalQuestRewardXP, rarityDistribution, sources, sinks,
        notes: '',
      };
    },
  },
];

export function mountDesigner(container, opts) {
  const view = createCollectionView({
    key: 'designDocs', singular: 'Design Document', plural: 'Design Documents', icon: '🧭',
    subtypes: SUBTYPES,
    fields: (subtype) => FIELDS_BY_SUBTYPE[subtype] || [],
    makeDefaults: () => ({}),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    helpText: 'Pillars, core loop, USP, audience, monetisation, SWOT, personas, risk analysis, success metrics, and a data-driven economy report all live here.',
  });
  return view.mount(container, opts);
}
