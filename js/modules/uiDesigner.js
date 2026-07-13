import { createCollectionView } from '../components/collectionView.js';
import { UI_SCREEN_TYPES } from '../generators/wordbank.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = UI_SCREEN_TYPES.map(t => ({ key: t.key, label: t.label, icon: '🖥️' }));

const ACCESSIBILITY_OPTIONS = ['Colourblind modes', 'Remappable controls', 'Subtitles / closed captions', 'UI scale slider', 'High-contrast mode', 'Screen reader labels', 'Reduced motion toggle', 'Hold-to-toggle for QTEs'];
const TRANSITION_STYLES = ['Fade in/out (200ms)', 'Slide in from edge (250ms ease-out)', 'Scale/pop-in (150ms)', 'Cross-dissolve with previous screen', 'Instant cut (menu-heavy games)', 'Elastic overshoot bounce-in'];
const SOUND_CUE_OPTIONS = ['Open/close whoosh', 'Confirm click', 'Cancel/back click', 'Error buzz', 'Hover tick', 'Success chime', 'Notification ping', 'Page-turn flip'];
const TYPOGRAPHY_NOTES = ['Display font for headers, body font for lists, min 14px body size', 'High-contrast text over busy backgrounds via drop shadow or scrim', 'Numerals use tabular figures so stat columns stay aligned', 'Long labels truncate with ellipsis + full text on hover/hold'];

const FIELDS = [
  { key: 'layoutNotes', label: 'Layout Notes', type: 'textarea', cols: 2, placeholder: 'Where major elements sit, hierarchy, focal point…' },
  { key: 'elements', label: 'UI Elements', type: 'list', cols: 2, placeholder: 'e.g. Health bar, minimap, ability bar' },
  { key: 'accessibility', label: 'Accessibility Features', type: 'list', cols: 2, placeholder: 'e.g. Colourblind modes' },
  { key: 'controllerSupport', label: 'Controller Support', type: 'textarea', cols: 2, placeholder: 'Navigation scheme, button prompts, focus order…' },
  { key: 'responsiveNotes', label: 'Responsive Layout Notes', type: 'textarea', cols: 2, placeholder: 'How this adapts across resolutions / aspect ratios / safe areas…' },
  { key: 'transitionNotes', label: 'Animation / Transition Notes', type: 'text', placeholder: 'How this screen enters/exits' },
  { key: 'soundCues', label: 'Sound Cue Tie-ins', type: 'list', placeholder: 'e.g. Confirm click (see Audio Designer)' },
  { key: 'localizationNotes', label: 'Localization Notes', type: 'textarea', placeholder: 'Text expansion allowance, RTL layout mirroring, font fallback for non-Latin scripts…' },
  { key: 'typographyNotes', label: 'Typography & Colour Notes', type: 'textarea', placeholder: 'Font hierarchy, contrast, numeral treatment…' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
}

const ELEMENTS_BY_TYPE = {
  'main-menu': ['Play button', 'Continue button', 'Settings', 'Credits', 'Quit', 'Background art / animation'],
  'hud': ['Health bar', 'Resource bar', 'Minimap', 'Ability cooldowns', 'Objective tracker', 'Damage numbers'],
  'inventory': ['Item grid', 'Item tooltip', 'Sort/filter controls', 'Equip slots', 'Weight/capacity meter'],
  'settings': ['Tabs (Video/Audio/Controls/Accessibility)', 'Sliders', 'Toggle switches', 'Key rebind list', 'Apply/Reset buttons'],
  'skill-tree': ['Node graph', 'Points remaining counter', 'Tooltip on hover', 'Reset button', 'Path highlighting'],
  'popup': ['Title', 'Body text', 'Confirm/Cancel buttons', 'Icon'],
  'map': ['Zoomable world map', 'Fast travel points', 'Fog of war', 'Legend/key'],
  'shop': ['Item list', 'Price display', 'Buy/Sell toggle', 'Currency counter', 'Item preview'],
  'character-sheet': ['Stat list', 'Equipped gear', 'Portrait', 'Level/XP bar'],
  'loading': ['Progress bar', 'Tip text', 'Background art', 'Spinner'],
  'tutorial': ['Highlighted focus ring', 'Step counter (1 of N)', 'Skip button', 'Contextual hint text', 'Next/Back buttons'],
  'notification': ['Icon', 'Title + short body', 'Auto-dismiss timer bar', 'Stacking/queue behaviour', 'Tap-to-dismiss'],
  'dialogue': ['Speaker portrait/name', 'Text box with reveal animation', 'Response choices', 'Continue indicator', 'Log/history button'],
  'crafting': ['Recipe list', 'Ingredient slots', 'Result preview', 'Craft button + quantity stepper', 'Missing-ingredient highlight'],
  'leaderboard': ['Rank column', 'Player name/avatar', 'Score/time column', 'Filter (friends/global/weekly)', 'Player\'s own row pinned'],
  'social': ['Friends list', 'Online/offline status', 'Invite/add button', 'Party/group panel', 'Block/report option'],
  'achievements-ui': ['Trophy grid', 'Locked/unlocked/hidden states', 'Progress bar per achievement', 'Rarity/points display', 'Filter by category'],
  'pause': ['Resume button', 'Settings shortcut', 'Quit to menu', 'Save indicator', 'Darkened/blurred game view behind'],
  'game-over': ['Result headline (victory/defeat)', 'Stats summary', 'Retry/Continue button', 'Rewards earned list', 'Share/screenshot button'],
  'character-creation': ['Preview viewport', 'Appearance sliders', 'Preset selector', 'Name input', 'Confirm/Randomize buttons'],
  'quest-log': ['Active/completed tabs', 'Quest list with tracked toggle', 'Objective checklist', 'Rewards preview', 'Map ping button'],
};

const MENU_FLOW_SEQUENCE = ['main-menu', 'settings', 'character-creation', 'pause'];

export function generateScreen(rng, subtype) {
  const type = UI_SCREEN_TYPES.find(t => t.key === subtype) || UI_SCREEN_TYPES[0];
  return {
    name: type.label,
    description: `${type.label} screen.`,
    layoutNotes: 'Primary action bottom-right; secondary/back top-left; consistent with rest of UI.',
    elements: ELEMENTS_BY_TYPE[type.key] || [],
    accessibility: pickN(ACCESSIBILITY_OPTIONS, 3, rng),
    controllerSupport: 'D-pad/left-stick navigates focusable elements; A/Cross confirms, B/Circle backs out.',
    responsiveNotes: 'Anchors to safe area; scales down gracefully to 16:9 and ultrawide; touch targets ≥ 44px on mobile.',
    transitionNotes: pick(TRANSITION_STYLES, rng),
    soundCues: pickN(SOUND_CUE_OPTIONS, 2, rng),
    localizationNotes: 'All labels support 30% text expansion for German/Polish; RTL languages mirror the whole layout, not just text.',
    typographyNotes: pick(TYPOGRAPHY_NOTES, rng),
    links: {},
  };
}

function generateMenuFlowEntry(rng, index) {
  const key = MENU_FLOW_SEQUENCE[index % MENU_FLOW_SEQUENCE.length];
  const base = generateScreen(rng, key);
  base.description = `Step ${(index % MENU_FLOW_SEQUENCE.length) + 1} of the core menu flow: ${base.description}`;
  return { ...base, subtype: key };
}

const GENERATORS = [
  { label: 'Generate Screen', run: ({ subtype }) => generateScreen(rngFor(Math.random()), subtype || UI_SCREEN_TYPES[0].key) },
  { label: 'Generate Full Menu Flow Set (4 screens)', run: ({ index }) => generateMenuFlowEntry(rngFor(Math.random() + index), index || 0) },
];

export function mountUIDesigner(container, opts) {
  const view = createCollectionView({
    key: 'uiScreens', singular: 'UI Screen', plural: 'UI Screens', icon: '🖥️',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ elements: [], accessibility: [], soundCues: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('uiScreens', item, {
      category: 'code', estimateHours: 4, title: (i) => `Implement UI screen: ${i.name}`,
      description: `Build and wire up the "${item.name}" screen.`,
    }),
    helpText: 'Menus, HUD, inventory, tutorials, notifications, dialogue, crafting, leaderboards, social, achievements, pause, game-over, character creation and quest log screens — every one with accessibility, controller support, transition, sound-cue, localization and typography notes built in. Use "Generate Full Menu Flow Set" with a count of 4 to draft the whole core menu chain in one click.',
  });
  return view.mount(container, opts);
}
