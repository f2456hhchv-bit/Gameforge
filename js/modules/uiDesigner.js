import { createCollectionView } from '../components/collectionView.js';
import { UI_SCREEN_TYPES } from '../generators/wordbank.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';

export const SUBTYPES = UI_SCREEN_TYPES.map(t => ({ key: t.key, label: t.label, icon: '🖥️' }));

const ACCESSIBILITY_OPTIONS = ['Colourblind modes', 'Remappable controls', 'Subtitles / closed captions', 'UI scale slider', 'High-contrast mode', 'Screen reader labels', 'Reduced motion toggle', 'Hold-to-toggle for QTEs'];

const FIELDS = [
  { key: 'layoutNotes', label: 'Layout Notes', type: 'textarea', cols: 2, placeholder: 'Where major elements sit, hierarchy, focal point…' },
  { key: 'elements', label: 'UI Elements', type: 'list', cols: 2, placeholder: 'e.g. Health bar, minimap, ability bar' },
  { key: 'accessibility', label: 'Accessibility Features', type: 'list', cols: 2, placeholder: 'e.g. Colourblind modes' },
  { key: 'controllerSupport', label: 'Controller Support', type: 'textarea', cols: 2, placeholder: 'Navigation scheme, button prompts, focus order…' },
  { key: 'responsiveNotes', label: 'Responsive Layout Notes', type: 'textarea', cols: 2, placeholder: 'How this adapts across resolutions / aspect ratios / safe areas…' },
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
};

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
    links: {},
  };
}

const GENERATORS = [
  { label: 'Generate Screen', run: ({ subtype }) => generateScreen(rngFor(Math.random()), subtype || UI_SCREEN_TYPES[0].key) },
];

export function mountUIDesigner(container, opts) {
  const view = createCollectionView({
    key: 'uiScreens', singular: 'UI Screen', plural: 'UI Screens', icon: '🖥️',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ elements: [], accessibility: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    helpText: 'Menus, HUD, inventory, settings, skill trees and popups — with accessibility and controller support built into every screen.',
  });
  return view.mount(container, opts);
}
