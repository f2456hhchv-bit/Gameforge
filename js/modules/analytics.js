import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { PLATFORMS, PRIORITIES } from '../schema.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'session-event', label: 'Session Event', icon: '🔑' },
  { key: 'progression-event', label: 'Progression Event', icon: '📈' },
  { key: 'monetization-event', label: 'Monetization Event', icon: '💰' },
  { key: 'engagement-event', label: 'Engagement Event', icon: '🔥' },
  { key: 'error-event', label: 'Error Event', icon: '⚠️' },
  { key: 'social-event', label: 'Social Event', icon: '👥' },
  { key: 'tutorial-event', label: 'Tutorial Event', icon: '🎓' },
  { key: 'combat-event', label: 'Combat Event', icon: '⚔️' },
  { key: 'ui-interaction-event', label: 'UI Interaction Event', icon: '🖱️' },
  { key: 'ad-event', label: 'Ad Event', icon: '📺' },
  { key: 'accessibility-event', label: 'Accessibility Event', icon: '♿' },
  { key: 'performance-event', label: 'Performance Event', icon: '⚡' },
  { key: 'onboarding-funnel-event', label: 'Onboarding Funnel Event', icon: '🚪' },
  { key: 'churn-prediction-event', label: 'Churn Prediction Event', icon: '📉' },
];

const FUNNEL_STAGES = ['Acquisition', 'Onboarding', 'Core Loop', 'Monetization', 'Retention', 'Churn Risk'];
const FUNNEL_BY_SUBTYPE = {
  'session-event': 'Retention', 'progression-event': 'Core Loop', 'monetization-event': 'Monetization',
  'engagement-event': 'Retention', 'error-event': 'Churn Risk', 'social-event': 'Retention',
  'tutorial-event': 'Onboarding', 'combat-event': 'Core Loop',
  'ui-interaction-event': 'Core Loop', 'ad-event': 'Monetization', 'accessibility-event': 'Onboarding',
  'performance-event': 'Churn Risk', 'onboarding-funnel-event': 'Onboarding', 'churn-prediction-event': 'Churn Risk',
};
const EVENT_NAMES_BY_SUBTYPE = {
  'session-event': ['session_start', 'session_end', 'app_foreground', 'app_background'],
  'progression-event': ['level_start', 'level_complete', 'level_fail', 'checkpoint_reached', 'quest_accepted', 'quest_completed'],
  'monetization-event': ['store_opened', 'purchase_initiated', 'purchase_completed', 'purchase_failed', 'iap_viewed'],
  'engagement-event': ['daily_login', 'streak_achieved', 'social_share', 'friend_invited'],
  'error-event': ['client_crash', 'network_error', 'save_corrupted', 'asset_load_failure'],
  'social-event': ['party_formed', 'friend_added', 'chat_message_sent', 'guild_joined'],
  'tutorial-event': ['tutorial_step_started', 'tutorial_step_completed', 'tutorial_skipped'],
  'combat-event': ['enemy_defeated', 'player_death', 'boss_phase_change', 'ability_used'],
  'ui-interaction-event': ['button_clicked', 'menu_opened', 'menu_closed', 'tooltip_viewed'],
  'ad-event': ['ad_requested', 'ad_shown', 'ad_completed', 'ad_skipped', 'ad_reward_granted'],
  'accessibility-event': ['colourblind_mode_enabled', 'subtitle_size_changed', 'remap_applied', 'screen_reader_enabled'],
  'performance-event': ['fps_drop_detected', 'memory_warning', 'load_time_recorded', 'thermal_throttle_detected'],
  'onboarding-funnel-event': ['onboarding_started', 'onboarding_step_reached', 'onboarding_completed', 'onboarding_abandoned'],
  'churn-prediction-event': ['session_gap_detected', 'engagement_score_computed', 'win_back_offer_shown', 'win_back_offer_accepted'],
};
const PARAM_TEMPLATES_BY_SUBTYPE = {
  'session-event': [{ key: 'session_id', value: 'string' }, { key: 'duration_ms', value: 'int' }],
  'progression-event': [{ key: 'level_id', value: 'string' }, { key: 'attempt_number', value: 'int' }, { key: 'duration_ms', value: 'int' }],
  'monetization-event': [{ key: 'sku_id', value: 'string' }, { key: 'price_usd', value: 'float' }, { key: 'currency', value: 'string' }],
  'engagement-event': [{ key: 'streak_count', value: 'int' }, { key: 'platform', value: 'string' }],
  'error-event': [{ key: 'error_code', value: 'string' }, { key: 'stack_trace_id', value: 'string' }],
  'social-event': [{ key: 'party_size', value: 'int' }, { key: 'guild_id', value: 'string' }],
  'tutorial-event': [{ key: 'step_id', value: 'string' }, { key: 'skipped', value: 'bool' }],
  'combat-event': [{ key: 'enemy_id', value: 'string' }, { key: 'ability_id', value: 'string' }, { key: 'damage_dealt', value: 'int' }],
  'ui-interaction-event': [{ key: 'element_id', value: 'string' }, { key: 'screen_name', value: 'string' }],
  'ad-event': [{ key: 'ad_network', value: 'string' }, { key: 'placement_id', value: 'string' }, { key: 'reward_type', value: 'string' }],
  'accessibility-event': [{ key: 'setting_name', value: 'string' }, { key: 'new_value', value: 'string' }],
  'performance-event': [{ key: 'fps', value: 'int' }, { key: 'memory_mb', value: 'int' }, { key: 'device_model', value: 'string' }],
  'onboarding-funnel-event': [{ key: 'step_index', value: 'int' }, { key: 'time_to_reach_ms', value: 'int' }],
  'churn-prediction-event': [{ key: 'days_since_last_session', value: 'int' }, { key: 'churn_risk_score', value: 'float' }],
};
const TRIGGERS_BY_SUBTYPE = {
  'session-event': 'Fired on app foreground/background transitions and clean session boundaries.',
  'progression-event': 'Fired when a player enters, completes or fails a piece of trackable content.',
  'monetization-event': 'Fired at each step of the purchase funnel, including failures.',
  'engagement-event': 'Fired on daily-return and social-sharing actions.',
  'error-event': 'Fired automatically by the crash/error handler — never user-initiated.',
  'social-event': 'Fired on party, friend and guild social actions.',
  'tutorial-event': 'Fired at the start/end of each onboarding step.',
  'combat-event': 'Fired on notable combat state changes (kills, deaths, phase changes, ability use).',
  'ui-interaction-event': 'Fired on notable UI interactions to build heatmaps of menu usage.',
  'ad-event': 'Fired at each stage of a rewarded/interstitial ad impression.',
  'accessibility-event': 'Fired whenever a player changes an accessibility setting — used to prioritize future a11y work.',
  'performance-event': 'Fired automatically when device performance drops below target thresholds.',
  'onboarding-funnel-event': 'Fired at each onboarding step to compute drop-off rates per step.',
  'churn-prediction-event': 'Fired by the backend churn model, never client-initiated.',
};

const FIELDS = [
  { key: 'eventName', label: 'Event Name', type: 'text', placeholder: 'e.g. level_complete (snake_case)' },
  { key: 'parameters', label: 'Parameters', type: 'stats' },
  { key: 'triggerCondition', label: 'Trigger Condition', type: 'textarea', cols: 2 },
  { key: 'funnelStage', label: 'Funnel Stage', type: 'select', options: FUNNEL_STAGES },
  { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES },
  { key: 'platformScope', label: 'Platform Scope', type: 'tags' },
  { key: 'sampleValue', label: 'Sample Payload', type: 'textarea', placeholder: 'e.g. { "level_id": "1-3", "duration_ms": 84210 }' },
  { key: 'linkedFeature', label: 'Linked Design Doc', type: 'relation', target: 'designDocs' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.funnelStage) badges.push({ text: item.funnelStage, cls: 'badge-gray' });
  return badges;
}

export function generateTelemetryEvent(rng, subtype) {
  const key = subtype || 'session-event';
  const eventName = pick(EVENT_NAMES_BY_SUBTYPE[key] || EVENT_NAMES_BY_SUBTYPE['session-event'], rng);
  const params = (PARAM_TEMPLATES_BY_SUBTYPE[key] || []).map(p => ({ ...p }));
  return {
    name: eventName,
    description: `Telemetry event for ${key.replace(/-/g, ' ')} analytics.`,
    eventName,
    parameters: params,
    triggerCondition: TRIGGERS_BY_SUBTYPE[key] || '',
    funnelStage: FUNNEL_BY_SUBTYPE[key] || pick(FUNNEL_STAGES, rng),
    priority: pick(PRIORITIES, rng),
    platformScope: pickN(PLATFORMS, 2 + Math.floor(rng() * 3), rng),
    sampleValue: params.length ? `{ ${params.map(p => `"${p.key}": <${p.value}>`).join(', ')} }` : '{}',
    links: {},
  };
}

const GENERATORS = [
  { label: 'Generate Telemetry Event', run: ({ subtype }) => generateTelemetryEvent(rngFor(Math.random()), subtype || 'session-event') },
];

export function mountAnalytics(container, opts) {
  const view = createCollectionView({
    key: 'telemetryEvents', singular: 'Telemetry Event', plural: 'Telemetry Events', icon: '📈',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ parameters: [], platformScope: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.triggerCondition,
    generators: GENERATORS,
    onCreate: (item) => autoTask('telemetryEvents', item, {
      category: 'code', estimateHours: 1, title: (i) => `Implement telemetry event: ${i.name}`,
      description: `Wire up the "${item.eventName}" event with its parameters across the target platforms.`,
    }),
    helpText: '14 event types — session, progression, monetization, engagement, error, social, tutorial, combat, UI interaction, ad, accessibility, performance, onboarding-funnel and churn-prediction telemetry events — snake_case event name, typed parameters, trigger condition, funnel stage, priority, platform scope and a sample payload, linkable to the design doc that specifies the feature.',
  });
  return view.mount(container, opts);
}
