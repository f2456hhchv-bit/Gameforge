import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'keyboard-mouse', label: 'Keyboard & Mouse', icon: '⌨️' },
  { key: 'gamepad', label: 'Gamepad', icon: '🎮' },
  { key: 'touch-mobile', label: 'Touch / Mobile', icon: '📱' },
  { key: 'vr-motion', label: 'VR Motion Controller', icon: '🥽' },
  { key: 'accessibility-remap', label: 'Accessibility Remap', icon: '♿' },
];

const ACTIONS = [
  'Jump', 'Sprint', 'Crouch / Slide', 'Interact', 'Primary Attack', 'Secondary Attack / Block',
  'Dodge / Roll', 'Aim / Zoom', 'Reload', 'Use Item', 'Open Map', 'Open Inventory', 'Pause Menu',
  'Ping', 'Emote', 'Photo Mode Toggle', 'Quick Save', 'Switch Weapon', 'Melee', 'Special Ability',
];
const BINDINGS_BY_SUBTYPE = {
  'keyboard-mouse': ['Space', 'Left Shift', 'Left Ctrl', 'E', 'Left Mouse Button', 'Right Mouse Button', 'Left Alt', 'Tab', 'I', 'Esc', 'Q', 'B', 'F9', 'R', 'Middle Mouse Button'],
  gamepad: ['A / Cross', 'B / Circle', 'X / Square', 'Y / Triangle', 'Left Bumper', 'Right Bumper', 'Left Trigger', 'Right Trigger', 'Left Stick Click', 'Right Stick Click', 'D-Pad Up', 'Start / Options', 'Select / Share'],
  'touch-mobile': ['Tap right action button', 'Swipe up', 'On-screen joystick', 'Double-tap screen', 'Tap and hold', 'Two-finger tap', 'Tap left action button'],
  'vr-motion': ['Trigger squeeze', 'Grip button', 'Thumbstick push', 'Physical arm swing', 'Head-gaze + trigger', 'Controller point + trigger', 'Face button on controller'],
  'accessibility-remap': ['Single-switch scan input', 'Hold-to-toggle alternative', 'Sip-and-puff mapped input', 'Eye-tracking dwell click', 'One-handed remap preset', 'Voice command'],
};
const CONTEXTS = ['Gameplay', 'Menu / UI', 'Vehicle / Mount', 'Combat', 'Photo Mode', 'Global'];
const HOLD_OR_PRESS = ['Press', 'Hold', 'Double-tap', 'Toggle'];

const FIELDS = [
  { key: 'actionName', label: 'Action', type: 'text' },
  { key: 'defaultBinding', label: 'Default Binding', type: 'text' },
  { key: 'alternateBinding', label: 'Alternate Binding', type: 'text' },
  { key: 'context', label: 'Context', type: 'select', options: CONTEXTS },
  { key: 'rebindable', label: 'Rebindable?', type: 'select', options: ['Yes', 'No'] },
  { key: 'holdOrPress', label: 'Hold or Press?', type: 'select', options: HOLD_OR_PRESS },
  { key: 'iconNotes', label: 'Button-Prompt Icon Notes', type: 'text' },
  { key: 'conflictNotes', label: 'Conflict Notes', type: 'textarea' },
  { key: 'accessibilityNotes', label: 'Accessibility Notes', type: 'textarea', cols: 2 },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.context) badges.push({ text: item.context, cls: 'badge-gray' });
  return badges;
}

export function generateControlBinding(rng, subtype) {
  const key = subtype || 'keyboard-mouse';
  const actionName = pick(ACTIONS, rng);
  const pool = BINDINGS_BY_SUBTYPE[key] || BINDINGS_BY_SUBTYPE['keyboard-mouse'];
  const [defaultBinding, alternateBinding] = pickN(pool, 2, rng);
  return {
    name: `${actionName} (${SUBTYPES.find(s => s.key === key)?.label || key})`,
    description: `Input binding for "${actionName}" on ${key.replace(/-/g, ' ')}.`,
    actionName,
    defaultBinding,
    alternateBinding: alternateBinding || '',
    context: pick(CONTEXTS, rng),
    rebindable: key === 'accessibility-remap' ? 'Yes' : (rng() < 0.85 ? 'Yes' : 'No'),
    holdOrPress: pick(HOLD_OR_PRESS, rng),
    iconNotes: `Needs a ${SUBTYPES.find(s => s.key === key)?.label || key} button-prompt icon for "${defaultBinding}".`,
    conflictNotes: '',
    accessibilityNotes: key === 'accessibility-remap' ? 'Verify this remap works with the target assistive device before shipping.' : '',
  };
}

const STANDARD_ACTION_SET = ['Jump', 'Sprint', 'Interact', 'Primary Attack', 'Pause Menu', 'Open Inventory'];

function generateStandardActionSetEntry({ index, subtype }) {
  const rng = rngFor(Math.random() + index);
  const key = subtype || 'keyboard-mouse';
  const actionName = STANDARD_ACTION_SET[index % STANDARD_ACTION_SET.length];
  const pool = BINDINGS_BY_SUBTYPE[key] || BINDINGS_BY_SUBTYPE['keyboard-mouse'];
  const [defaultBinding, alternateBinding] = pickN(pool, 2, rng);
  return {
    name: `${actionName} (${SUBTYPES.find(s => s.key === key)?.label || key})`,
    description: `Core input binding ${(index % STANDARD_ACTION_SET.length) + 1} of ${STANDARD_ACTION_SET.length} in the standard action set.`,
    actionName, defaultBinding, alternateBinding: alternateBinding || '',
    context: 'Gameplay', rebindable: 'Yes', holdOrPress: pick(HOLD_OR_PRESS, rng),
    iconNotes: `Needs a ${SUBTYPES.find(s => s.key === key)?.label || key} button-prompt icon for "${defaultBinding}".`,
    conflictNotes: '', accessibilityNotes: '',
    subtype: key,
  };
}

const GENERATORS = [
  { label: 'Generate Control Binding', run: ({ subtype }) => generateControlBinding(rngFor(Math.random()), subtype || 'keyboard-mouse') },
  { label: 'Generate Standard Action Set (6 core actions)', run: generateStandardActionSetEntry },
];

export function mountControls(container, opts) {
  const view = createCollectionView({
    key: 'controlBindings', singular: 'Control Binding', plural: 'Control Bindings', icon: '🎮',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ rebindable: 'Yes', holdOrPress: 'Press' }),
    cardBadges: badgeFor,
    cardMeta: item => `${item.defaultBinding || '?'} → ${item.actionName || ''}`,
    generators: GENERATORS,
    onCreate: (item) => autoTask('controlBindings', item, {
      category: 'code', estimateHours: 1, title: (i) => `Wire up input binding: ${i.name}`,
      description: `Implement and expose "${item.actionName}" for rebinding on ${item.subtype?.replace(/-/g, ' ')}.`,
    }),
    helpText: 'Keyboard & mouse, gamepad, touch/mobile, VR motion and accessibility-remap input bindings — default/alternate binding, context, rebindability, hold-vs-press behaviour, button-prompt icon notes, conflicts and accessibility notes. Use "Generate Standard Action Set" to draft the 6 most common actions for a platform in one click.',
  });
  return view.mount(container, opts);
}
