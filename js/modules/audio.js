import { createCollectionView } from '../components/collectionView.js';
import { AUDIO_TYPES, MOODS } from '../generators/wordbank.js';
import { rngFor } from '../generators/procedural.js';
import { pick } from '../util.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = AUDIO_TYPES.map(t => ({
  key: t.key,
  label: t.label,
  icon: {
    music: '🎵', sfx: '💥', ambience: '🌫️', voice: '🎙️', 'ui-sound': '🔘',
    stinger: '⚡', jingle: '🎺', 'boss-theme': '🐉', 'cutscene-score': '🎬', 'ambient-voice-bed': '👥',
    leitmotif: '🎼', 'voice-line-set': '🗣️', 'foley-pack': '👞', 'radio-chatter': '📻',
    'tutorial-narration': '🎓', 'cutscene-dialogue': '💬', 'victory-fanfare': '🏆',
    'defeat-stinger': '💀', 'weather-ambience': '🌦️', 'crowd-reaction': '📣',
  }[t.key] || '🔊',
}));

const COMMON_FIELDS = [
  { key: 'mood', label: 'Mood', type: 'select', options: MOODS },
  { key: 'triggerCondition', label: 'Trigger Condition', type: 'text', placeholder: 'e.g. On level start, on hit, on menu hover' },
  { key: 'lengthSeconds', label: 'Length', type: 'text', placeholder: 'e.g. 2:30 (loopable) or 0.3s (one-shot)' },
  { key: 'loopable', label: 'Loopable?', type: 'select', options: ['No', 'Yes — seamless loop', 'Yes — with intro tail'] },
];

const LINK_FIELDS = [
  { key: 'linkedCharacter', label: 'Linked Character', type: 'relation', target: 'characters' },
  { key: 'linkedItem', label: 'Linked Item', type: 'relation', target: 'items' },
  { key: 'linkedLevel', label: 'Linked Level', type: 'relation', target: 'levels' },
  { key: 'linkedCombatEntry', label: 'Linked Ability/Effect', type: 'relation', target: 'combatEntries' },
  { key: 'mixingNotes', label: 'Mixing Notes', type: 'textarea', cols: 2, placeholder: 'Ducking rules, priority, spatialization, bus routing…' },
];

const MUSIC_EXTRA = [
  { key: 'adaptiveLayers', label: 'Adaptive Layers', type: 'list', cols: 2, placeholder: 'e.g. Exploration bed, Combat layer, Tension stinger' },
  { key: 'intensityCurve', label: 'Intensity Curve Notes', type: 'textarea', cols: 2, placeholder: 'How layers fade in/out with gameplay intensity…' },
];
const SFX_EXTRA = [
  { key: 'variationCount', label: 'Variation Count', type: 'number', placeholder: 'e.g. 4' },
  { key: 'randomizationNotes', label: 'Randomization Notes', type: 'text', placeholder: 'e.g. Pitch ±5%, volume ±3dB, round-robin of 4' },
];
const AMBIENCE_EXTRA = [
  { key: 'layerDensity', label: 'Layer Density', type: 'text', placeholder: 'e.g. 3 layers: wind bed, distant fauna, occasional creaks' },
  { key: 'distanceFalloff', label: 'Distance / Occlusion Notes', type: 'textarea', cols: 2, placeholder: 'How this attenuates or muffles with distance/walls…' },
];
const VOICE_EXTRA = [
  { key: 'lineCount', label: 'VO Line Count', type: 'number', placeholder: 'e.g. 12' },
  { key: 'emotionDirection', label: 'Emotion Direction', type: 'text', placeholder: 'e.g. Weary but resolute, hides fear' },
];
const UI_SOUND_EXTRA = [
  { key: 'debounceMs', label: 'Debounce (ms)', type: 'number', placeholder: 'e.g. 80' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Low', 'Normal', 'High', 'Critical (interrupts others)'] },
];
const STINGER_EXTRA = [
  { key: 'blendsWithMusic', label: 'Blends With Current Music?', type: 'select', options: ['Yes — matches key/tempo', 'No — cuts through intentionally'] },
];
const SYNC_EXTRA = [
  { key: 'syncPoints', label: 'Sync Points', type: 'list', cols: 2, placeholder: 'e.g. 0:12 — camera cut to villain' },
];
const LEITMOTIF_EXTRA = [
  { key: 'linkedEntityName', label: 'Represents', type: 'text', placeholder: 'e.g. The Ashwalker, The Sunken City' },
  { key: 'variationNotes', label: 'Variation Notes', type: 'textarea', cols: 2, placeholder: 'How this theme is re-orchestrated across contexts (solo piano in quiet scenes, full orchestra in battle)…' },
];
const FOLEY_PACK_EXTRA = [
  { key: 'surfaceTypes', label: 'Surface Types', type: 'list', placeholder: 'e.g. Grass, Stone, Metal, Water' },
  { key: 'actionTypes', label: 'Action Types', type: 'list', placeholder: 'e.g. Footstep, Land, Slide' },
];
const RADIO_CHATTER_EXTRA = [
  { key: 'chatterFrequency', label: 'Chatter Frequency', type: 'text', placeholder: 'e.g. Every 60-120s, randomized' },
  { key: 'factionVoice', label: 'Faction Voice', type: 'relation', target: 'biomes', subtype: 'faction' },
];
const CROWD_REACTION_EXTRA = [
  { key: 'reactionType', label: 'Reaction Type', type: 'select', options: ['Cheer', 'Boo', 'Gasp', 'Silence'] },
  { key: 'crowdSize', label: 'Crowd Size', type: 'text', placeholder: 'e.g. 500+ layered voices' },
];

const EXTRA_FIELDS_BY_SUBTYPE = {
  music: MUSIC_EXTRA,
  'boss-theme': [...MUSIC_EXTRA, { key: 'phaseTransitionNotes', label: 'Phase Transition Notes', type: 'textarea', cols: 2, placeholder: 'How the theme escalates/re-instruments per boss phase…' }],
  'cutscene-score': [...MUSIC_EXTRA, ...SYNC_EXTRA],
  sfx: SFX_EXTRA,
  ambience: AMBIENCE_EXTRA,
  'ambient-voice-bed': [...AMBIENCE_EXTRA, { key: 'crowdSize', label: 'Crowd Size', type: 'text', placeholder: 'e.g. 20-30 distinct voice layers, looped and pitch-varied' }],
  voice: VOICE_EXTRA,
  'ui-sound': UI_SOUND_EXTRA,
  stinger: STINGER_EXTRA,
  jingle: STINGER_EXTRA,
  leitmotif: LEITMOTIF_EXTRA,
  'voice-line-set': [...VOICE_EXTRA, { key: 'barkCategory', label: 'Bark Category', type: 'select', options: ['Combat', 'Idle', 'Death', 'Greeting', 'Reaction'] }],
  'foley-pack': FOLEY_PACK_EXTRA,
  'radio-chatter': RADIO_CHATTER_EXTRA,
  'tutorial-narration': [...VOICE_EXTRA, { key: 'pacingNotes', label: 'Pacing Notes', type: 'textarea', cols: 2, placeholder: 'When lines trigger relative to player action, timeout/skip behaviour…' }],
  'cutscene-dialogue': [...SYNC_EXTRA, { key: 'speakerCount', label: 'Speaker Count', type: 'number' }],
  'victory-fanfare': STINGER_EXTRA,
  'defeat-stinger': STINGER_EXTRA,
  'weather-ambience': [...AMBIENCE_EXTRA, { key: 'weatherType', label: 'Weather Type', type: 'text', placeholder: 'e.g. Rain, Thunderstorm, Blizzard' }],
  'crowd-reaction': CROWD_REACTION_EXTRA,
};

function fieldsFor(subtype) {
  return [...COMMON_FIELDS, ...(EXTRA_FIELDS_BY_SUBTYPE[subtype] || []), ...LINK_FIELDS];
}

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
  stinger: ['On discovery of a secret', 'On puzzle solved', 'On narrow escape'],
  jingle: ['On achievement unlocked', 'On level complete', 'On quest turn-in'],
  'boss-theme': ['On boss encounter start', 'On boss phase transition', 'On boss enrage'],
  'cutscene-score': ['Underscores a specific cutscene', 'Stings on a scripted camera cut'],
  'ambient-voice-bed': ['Looping in a populated hub area', 'Crossfades with crowd density changes'],
  leitmotif: ['Plays when the associated character/location is present', 'Woven into the score during related story beats'],
  'voice-line-set': ['Random idle bark', 'On combat engagement', 'On player action'],
  'foley-pack': ['Triggered by player/NPC movement animations'],
  'radio-chatter': ['Random ambient radio/comms chatter', 'Triggered by nearby faction presence'],
  'tutorial-narration': ['Triggered by first-time player action', 'On tutorial step start'],
  'cutscene-dialogue': ['Underscores a specific cutscene beat'],
  'victory-fanfare': ['On level/mission victory', 'On quest completion'],
  'defeat-stinger': ['On player death', 'On mission failure'],
  'weather-ambience': ['Crossfades in as weather changes', 'Loops while active weather persists'],
  'crowd-reaction': ['On player success in view of an audience', 'On player failure in view of an audience'],
};

export function generateAudio(rng, subtype) {
  const type = AUDIO_TYPES.find(t => t.key === subtype) || AUDIO_TYPES[0];
  const triggers = TRIGGER_TEMPLATES[type.key] || TRIGGER_TEMPLATES.sfx;
  const isMusical = ['music', 'ambience', 'boss-theme', 'cutscene-score', 'ambient-voice-bed', 'leitmotif', 'weather-ambience'].includes(type.key);
  const entry = {
    name: `${type.label} Cue`,
    description: `${type.label} entry ready for composition/implementation.`,
    mood: pick(MOODS, rng),
    triggerCondition: pick(triggers, rng),
    lengthSeconds: isMusical ? '2:00 (loopable)' : `${(0.2 + rng() * 1.5).toFixed(1)}s`,
    loopable: isMusical ? 'Yes — seamless loop' : 'No',
    mixingNotes: type.key === 'music' || type.key === 'boss-theme' || type.key === 'cutscene-score'
      ? 'Ducks under dialogue by -6dB; crossfade 2s between combat/exploration states.'
      : 'Route to SFX bus; randomize pitch ±5% to avoid repetition fatigue.',
  };
  if (type.key === 'music' || type.key === 'boss-theme' || type.key === 'cutscene-score') {
    entry.adaptiveLayers = ['Base bed', 'Mid intensity', 'High intensity'];
    entry.intensityCurve = 'Layers crossfade over 2-4s as gameplay intensity rises/falls; never hard-cuts.';
  }
  if (type.key === 'boss-theme') entry.phaseTransitionNotes = 'Adds a percussion layer and modulates up a whole step on each phase transition.';
  if (type.key === 'cutscene-score') entry.syncPoints = ['0:00 — scene opens', '0:15 — reveal beat'];
  if (type.key === 'sfx') { entry.variationCount = 4; entry.randomizationNotes = 'Pitch ±5%, volume ±3dB, round-robin of 4 to avoid machine-gunning.'; }
  if (type.key === 'ambience' || type.key === 'ambient-voice-bed') {
    entry.layerDensity = type.key === 'ambient-voice-bed' ? '20-30 distinct voice layers, looped and pitch-varied' : '3 layers: base bed, mid-frequency detail, rare one-shots';
    entry.distanceFalloff = 'Low-pass filters and attenuates through walls/doors; full-band and full-volume in the open.';
    if (type.key === 'ambient-voice-bed') entry.crowdSize = '20-30 distinct voice layers, looped and pitch-varied';
  }
  if (type.key === 'voice') { entry.lineCount = 8; entry.emotionDirection = pick(['Weary but resolute', 'Barely-contained panic', 'Dry, sardonic', 'Warm and reassuring'], rng); }
  if (type.key === 'ui-sound') { entry.debounceMs = 80; entry.priority = 'Normal'; }
  if (type.key === 'stinger' || type.key === 'jingle' || type.key === 'victory-fanfare' || type.key === 'defeat-stinger') entry.blendsWithMusic = pick(['Yes — matches key/tempo', 'No — cuts through intentionally'], rng);
  if (type.key === 'leitmotif') { entry.linkedEntityName = 'A recurring story figure or location.'; entry.variationNotes = 'Re-orchestrated sparsely in quiet scenes, fully in climactic ones.'; }
  if (type.key === 'voice-line-set') { entry.lineCount = 6; entry.emotionDirection = pick(['Weary but resolute', 'Barely-contained panic', 'Dry, sardonic', 'Warm and reassuring'], rng); entry.barkCategory = pick(['Combat', 'Idle', 'Death', 'Greeting', 'Reaction'], rng); }
  if (type.key === 'foley-pack') { entry.surfaceTypes = ['Grass', 'Stone', 'Metal', 'Water']; entry.actionTypes = ['Footstep', 'Land', 'Slide']; }
  if (type.key === 'radio-chatter') entry.chatterFrequency = 'Every 60-120s, randomized.';
  if (type.key === 'tutorial-narration') { entry.lineCount = 4; entry.emotionDirection = 'Clear and encouraging'; entry.pacingNotes = 'Triggers on first attempt at the mechanic; skips if already completed.'; }
  if (type.key === 'cutscene-dialogue') { entry.syncPoints = ['0:00 — scene opens', '0:15 — key line']; entry.speakerCount = 2; }
  if (type.key === 'weather-ambience') { entry.layerDensity = '3 layers: base weather bed, gusts/thunder one-shots, transition swell'; entry.distanceFalloff = 'Muffled indoors, full-strength outdoors.'; entry.weatherType = 'Rain'; }
  if (type.key === 'crowd-reaction') { entry.reactionType = pick(['Cheer', 'Boo', 'Gasp', 'Silence'], rng); entry.crowdSize = '500+ layered voices'; }
  entry.links = {};
  return entry;
}

const ADAPTIVE_LAYER_ROLES = ['Exploration', 'Combat', 'Tension', 'Victory'];
function generateAdaptiveLayerEntry(rng, index) {
  const role = ADAPTIVE_LAYER_ROLES[index % ADAPTIVE_LAYER_ROLES.length];
  const base = generateAudio(rng, 'music');
  base.name = `Adaptive Music — ${role} Layer`;
  base.description = `Part of a single adaptive music system; this is the "${role}" layer, mixed in/out based on game state.`;
  base.adaptiveLayers = ADAPTIVE_LAYER_ROLES;
  base.triggerCondition = `Fades in when game state enters "${role}"`;
  return { ...base, subtype: 'music' };
}

const UI_SOUND_KIT_MOMENTS = ['Hover', 'Click / Confirm', 'Back / Cancel', 'Error / Invalid Action', 'Notification'];
function generateUISoundKitEntry(rng, index) {
  const moment = UI_SOUND_KIT_MOMENTS[index % UI_SOUND_KIT_MOMENTS.length];
  const base = generateAudio(rng, 'ui-sound');
  base.name = `UI Sound — ${moment}`;
  base.description = `Part of a complete UI sound kit — the "${moment}" cue.`;
  base.triggerCondition = `On ${moment.toLowerCase()}`;
  base.priority = moment === 'Error / Invalid Action' ? 'High' : 'Normal';
  return { ...base, subtype: 'ui-sound' };
}

function generateOutcomeStingerPair(rng, index) {
  const subtype = index % 2 === 0 ? 'victory-fanfare' : 'defeat-stinger';
  return { ...generateAudio(rng, subtype), subtype };
}

const GENERATORS = [
  { label: 'Generate Audio Entry', run: ({ subtype }) => generateAudio(rngFor(Math.random()), subtype || 'sfx') },
  { label: 'Generate Adaptive Music Layer Set (4 layers)', run: ({ index }) => generateAdaptiveLayerEntry(rngFor(Math.random() + index), index || 0) },
  { label: 'Generate Full UI Sound Kit (5 cues)', run: ({ index }) => generateUISoundKitEntry(rngFor(Math.random() + index), index || 0) },
  { label: 'Generate Victory/Defeat Stinger Pair (2 cues)', run: ({ index }) => generateOutcomeStingerPair(rngFor(Math.random() + index), index || 0) },
];

export function mountAudio(container, opts) {
  const view = createCollectionView({
    key: 'audioEntries', singular: 'Audio Entry', plural: 'Audio', icon: '🔊',
    subtypes: SUBTYPES,
    fields: fieldsFor,
    makeDefaults: () => ({}),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('audioEntries', item, {
      category: 'audio', estimateHours: 2, title: (i) => `Produce audio: ${i.name}`,
      description: `Compose/record and implement "${item.name}".`,
    }),
    helpText: 'Music, sound effects, ambience, voice direction, UI sounds, stingers, jingles, boss themes, cutscene scores, ambient voice beds, leitmotifs, voice line sets, foley packs, radio chatter, tutorial narration, cutscene dialogue, victory fanfares, defeat stingers, weather ambience and crowd reactions — with triggers linked to the characters, items, levels and abilities that fire them. Use the adaptive-layer, full-kit and stinger-pair generators to draft a coherent multi-cue set in one click.',
  });
  return view.mount(container, opts);
}
