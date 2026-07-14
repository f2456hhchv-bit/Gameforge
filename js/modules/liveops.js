import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { store } from '../store.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'seasonal-event', label: 'Seasonal Event', icon: '🎃' },
  { key: 'limited-time-mode', label: 'Limited-Time Mode', icon: '⏳' },
  { key: 'store-rotation', label: 'Store Rotation', icon: '🛒' },
  { key: 'battle-pass-season', label: 'Battle Pass Season', icon: '🎫' },
  { key: 'content-drop', label: 'Content Drop', icon: '📦' },
  { key: 'balance-patch', label: 'Balance Patch', icon: '⚖️' },
  { key: 'community-challenge', label: 'Community Challenge', icon: '🤝' },
  { key: 'double-xp-weekend', label: 'Double XP Weekend', icon: '⚡' },
];

const STATUSES = ['Planned', 'In Production', 'Live', 'Completed', 'Cancelled'];
const CHANNELS = ['In-game banner', 'Push notification', 'Social media', 'Email newsletter', 'Store front page', 'Influencer seeding', 'Community Discord announcement'];
const SEASON_NAMES = ['Frostfall', 'Emberlight', 'Verdant Bloom', 'Harvest Moon', 'Solstice', 'Shattered Skies', 'Tideturn', 'Ashen Dawn'];
const REWARDS = ['Exclusive cosmetic skin', 'Limited-edition mount', 'Currency bonus', 'Unique title/badge', 'Early access to next content drop', 'Special emote', 'Profile banner', 'Bonus loot box'];
const MONETIZATION_HOOKS = [
  'Bundle discount on the featured cosmetic set, time-boxed to the event window.',
  'Battle pass premium track unlocks the exclusive reward line immediately.',
  'Direct-purchase currency bundle sized for exactly one premium unlock.',
  'No monetization — purely a retention/goodwill event.',
  'Cross-promotion bundle with a returning-player discount.',
];
const KPI_TEMPLATES = [
  'DAU +15%, D7 retention +5% over baseline.', 'Conversion rate on featured bundle ≥ 3%.',
  'Session length +10 minutes average during the event window.', 'Churned-player win-back rate ≥ 8%.',
  'Social share rate on event completion ≥ 2%.',
];

const FIELDS = [
  { key: 'startDate', label: 'Start Date', type: 'text', placeholder: 'YYYY-MM-DD' },
  { key: 'endDate', label: 'End Date', type: 'text', placeholder: 'YYYY-MM-DD' },
  { key: 'theme', label: 'Theme', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: STATUSES },
  { key: 'rewards', label: 'Rewards', type: 'list' },
  { key: 'monetizationHooks', label: 'Monetization Hooks', type: 'textarea', cols: 2 },
  { key: 'targetKPI', label: 'Target KPI', type: 'text' },
  { key: 'channels', label: 'Marketing Channels', type: 'tags' },
  { key: 'prerequisiteQuests', label: 'Prerequisite / Featured Quests', type: 'relation-multi', target: 'quests' },
  { key: 'featuredItems', label: 'Featured Items', type: 'relation-multi', target: 'items' },
];

const STATUS_CLASS = { Planned: 'badge-gray', 'In Production': 'badge-blue', Live: 'badge-green', Completed: 'badge-gray', Cancelled: 'badge-rose' };

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.status) badges.push({ text: item.status, cls: STATUS_CLASS[item.status] || 'badge-gray' });
  return badges;
}

function offsetDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function generateLiveOpsEvent(rng, subtype) {
  const key = subtype || 'seasonal-event';
  const season = pick(SEASON_NAMES, rng);
  const nameBySubtype = {
    'seasonal-event': `${season} Festival`,
    'limited-time-mode': `${pick(['Chaos', 'Hardcore', 'Mirror', 'Gauntlet', 'Nightmare'], rng)} Mode`,
    'store-rotation': `Weekly Store Rotation — ${season}`,
    'battle-pass-season': `Season ${1 + Math.floor(rng() * 12)}: ${season}`,
    'content-drop': `${season} Content Drop`,
    'balance-patch': `Balance Patch ${Math.floor(rng() * 9)}.${Math.floor(rng() * 9)}`,
    'community-challenge': `Community Challenge: ${season}`,
    'double-xp-weekend': `${season} Double XP Weekend`,
  };
  const startOffset = Math.floor(rng() * 60);
  const duration = key === 'double-xp-weekend' ? 3 : key === 'battle-pass-season' ? 70 : 7 + Math.floor(rng() * 21);
  const items = store.list('items');
  const quests = store.list('quests');
  const links = {};
  if (items.length) links.featuredItems = pickN(items, Math.min(items.length, 1 + Math.floor(rng() * 3)), rng).map(i => i.id);
  if (quests.length) links.prerequisiteQuests = pickN(quests, Math.min(quests.length, 1 + Math.floor(rng() * 2)), rng).map(q => q.id);
  return {
    name: nameBySubtype[key],
    description: `A ${key.replace(/-/g, ' ')} centered on the ${season} theme.`,
    startDate: offsetDate(startOffset),
    endDate: offsetDate(startOffset + duration),
    theme: season,
    status: pick(STATUSES.slice(0, 3), rng),
    rewards: pickN(REWARDS, 2 + Math.floor(rng() * 2), rng),
    monetizationHooks: pick(MONETIZATION_HOOKS, rng),
    targetKPI: pick(KPI_TEMPLATES, rng),
    channels: pickN(CHANNELS, 2 + Math.floor(rng() * 2), rng),
    links,
  };
}

const GENERATORS = [
  { label: 'Generate LiveOps Event', run: ({ subtype }) => generateLiveOpsEvent(rngFor(Math.random()), subtype || 'seasonal-event') },
];

export function mountLiveOps(container, opts) {
  const view = createCollectionView({
    key: 'liveOpsEvents', singular: 'LiveOps Event', plural: 'LiveOps Events', icon: '📅',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ status: 'Planned', rewards: [], channels: [] }),
    cardBadges: badgeFor,
    cardMeta: item => `${item.theme || ''} · ${item.startDate || '?'} → ${item.endDate || '?'}`,
    generators: GENERATORS,
    onCreate: (item) => autoTask('liveOpsEvents', item, {
      category: 'design', estimateHours: 6, title: (i) => `Plan LiveOps event: ${i.name}`,
      description: `Schedule content, rewards and marketing channels for "${item.name}".`,
    }),
    helpText: 'Seasonal events, limited-time modes, store rotations, battle pass seasons, content drops, balance patches, community challenges and double-XP weekends — dates, theme, rewards, monetization hooks, target KPIs and marketing channels, linkable to the quests/items featured in the event.',
  });
  return view.mount(container, opts);
}
