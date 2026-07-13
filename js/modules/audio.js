import { createCollectionView } from '../components/collectionView.js';
import { AUDIO_TYPES, MOODS } from '../generators/wordbank.js';
import { rngFor } from '../generators/procedural.js';
import { pick } from '../util.js';

export const SUBTYPES = AUDIO_TYPES.map(t => ({ key: t.key, label: t.label, icon: { music: '🎵', sfx: '💥', ambience: '🌫️', voice: '🎙️', 'ui-sound': '🔘' }[t.key] || '🔊' }));

const FIELDS = [
  { key: 'mood', label: 'Mood', type: 'select', options: MOODS },
  { key: 'triggerCondition', label: 'Trigger Condition', type: 'text', placeholder: 'e.g. On level start, on hit, on menu hover' },
  { key: 'lengthSeconds', label: 'Length', type: 'text', placeholder: 'e.g. 2:30 (loopable) or 0.3s (one-shot)' },
  { key: 'loopable', label: 'Loopable?', type: 'select', options: ['No', 'Yes — seamless loop', 'Yes — with intro tail'] },
  { key: 'linkedCharacter', label: 'Linked Character', type: 'relation', target: 'characters' },
  { key: 'linkedItem', label: 'Linked Item', type: 'relation', target: 'items' },
  { key: 'linkedLevel', label: 'Linked Level', type: 'relation', target: 'levels' },
  { key: 'linkedCombatEntry', label: 'Linked Ability/Effect', type: 'relation', target: 'combatEntries' },
  { key: 'mixingNotes', label: 'Mixing Notes', type: 'textarea', cols: 2, placeholder: 'Ducking rules, priority, spatialization, bus routing…' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }, item.mood && { text: item.mood, cls: 'badge-gray' }].filter(Boolean);
}

const TRIGGER_TEMPLATES = {
  music: ['On level start', 'On boss encounter start', 'On victory', 'On defeat', 'Main menu loop'],
  sfx: ['On hit landed', 'On item pickup', 'On ability cast', 'On footstep', 'On door open'],
  ambience: ['Looping while in this biome', 'Crossfades on weather change', 'Layered with distance-based intensity'],
  voice: ['On quest given', 'On low health', 'On enemy spotted', 'Idle bark (random interval)'],
  'ui-sound': ['On button hover', 'On button click', 'On menu open/close', 'On error/invalid action'],
};

export function generateAudio(rng, subtype) {
  const type = AUDIO_TYPES.find(t => t.key === subtype) || AUDIO_TYPES[0];
  const triggers = TRIGGER_TEMPLATES[type.key] || TRIGGER_TEMPLATES.sfx;
  return {
    name: `${type.label} Cue`,
    description: `${type.label} entry ready for composition/implementation.`,
    mood: pick(MOODS, rng),
    triggerCondition: pick(triggers, rng),
    lengthSeconds: type.key === 'music' || type.key === 'ambience' ? '2:00 (loopable)' : `${(0.2 + rng() * 1.5).toFixed(1)}s`,
    loopable: type.key === 'music' || type.key === 'ambience' ? 'Yes — seamless loop' : 'No',
    mixingNotes: type.key === 'music' ? 'Ducks under dialogue by -6dB; crossfade 2s between combat/exploration states.' : 'Route to SFX bus; randomize pitch ±5% to avoid repetition fatigue.',
    links: {},
  };
}

const GENERATORS = [
  { label: 'Generate Audio Entry', run: ({ subtype }) => generateAudio(rngFor(Math.random()), subtype || 'sfx') },
];

export function mountAudio(container, opts) {
  const view = createCollectionView({
    key: 'audioEntries', singular: 'Audio Entry', plural: 'Audio', icon: '🔊',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({}),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    helpText: 'Music direction, sound effects, ambience and voice direction — with triggers linked to the characters, items, levels and abilities that fire them.',
  });
  return view.mount(container, opts);
}
