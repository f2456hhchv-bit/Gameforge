import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { store } from '../store.js';
import { PLATFORMS } from '../schema.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'ui-text', label: 'UI Text', icon: '🖥️' },
  { key: 'dialogue-line', label: 'Dialogue Line', icon: '💬' },
  { key: 'item-name', label: 'Item Name/Flavor', icon: '🗡️' },
  { key: 'quest-text', label: 'Quest Text', icon: '📯' },
  { key: 'achievement-text', label: 'Achievement Text', icon: '🏆' },
  { key: 'error-message', label: 'Error Message', icon: '⚠️' },
  { key: 'marketing-copy', label: 'Marketing Copy', icon: '📣' },
  { key: 'tutorial-text', label: 'Tutorial Text', icon: '🎓' },
  { key: 'legal-text', label: 'Legal Text', icon: '⚖️' },
  { key: 'store-listing-copy', label: 'Store Listing Copy', icon: '🛍️' },
  { key: 'patch-notes-text', label: 'Patch Notes Text', icon: '📝' },
  { key: 'voice-script', label: 'Voice Script', icon: '🎙️' },
  { key: 'subtitle-timing-text', label: 'Subtitle Timing Text', icon: '💬' },
  { key: 'credits-text', label: 'Credits Text', icon: '🎬' },
];

const LANGUAGES = ['French', 'German', 'Spanish (LatAm)', 'Spanish (Spain)', 'Japanese', 'Korean', 'Simplified Chinese', 'Brazilian Portuguese', 'Russian', 'Italian', 'Polish', 'Turkish'];
const STATUSES = ['Not Started', 'In Progress', 'Translated', 'In Review', 'Approved', 'Needs Update'];
const UI_TEXT_SAMPLES = ['Continue', 'Are you sure you want to quit?', 'Settings saved.', 'Insufficient currency.', 'New item received!', 'Connection lost. Reconnecting…'];
const ERROR_MESSAGES = ['Save file could not be loaded.', 'Network connection timed out.', 'Purchase failed — please try again.', 'This save is from an incompatible version.', 'Unable to connect to matchmaking servers.'];
const MARKETING_COPY = ['Wishlist now and never miss launch day.', 'Available on all platforms this fall.', 'Join millions of players in the adventure of a lifetime.', 'Pre-order today for exclusive bonus content.'];
const TUTORIAL_TEXT = ['Press A to jump over obstacles.', 'Hold the trigger to charge your attack.', 'Open the map to see nearby objectives.', 'Sprint by double-tapping the movement stick.'];
const LEGAL_TEXT = ['By continuing, you agree to the End User License Agreement.', 'This product includes third-party software under separate license terms.', 'Privacy Policy — see how your data is collected and used.', 'Terms of Service — last updated this release.'];
const STORE_LISTING_COPY = ['An unforgettable adventure awaits.', 'Critically acclaimed — now available.', 'Build, explore, conquer — the choice is yours.', 'Rated one of the year\'s best by players worldwide.'];
const PATCH_NOTES_TEXT = ['Fixed an issue causing save corruption on exit.', 'Rebalanced enemy difficulty in the third act.', 'Added new accessibility options to Settings.', 'Improved network stability during co-op sessions.'];
const VOICE_SCRIPT_SAMPLES = ['[ANGRY] You\'ll regret crossing me.', '[WHISPER] Someone\'s coming — stay quiet.', '[EXHAUSTED] We made it. Barely.', '[SARCASTIC] Oh, great plan. Really thought that one through.'];
const SUBTITLE_TEXT = ['[door creaks open]', '[distant explosion]', 'Speaker: We need to move, now!', '[tense music swells]'];
const CREDITS_TEXT = ['Lead Game Designer', 'Special Thanks', 'Voice Cast', 'Community Playtesters', 'Localization Team'];

const COMMON_FIELDS = [
  { key: 'sourceText', label: 'Source Text (English)', type: 'textarea', cols: 2 },
  { key: 'context', label: 'Context', type: 'text', placeholder: 'Where/when this string appears' },
  { key: 'stringId', label: 'String ID', type: 'text', placeholder: 'e.g. LOC_UI_CONTINUE_001' },
  { key: 'characterLimit', label: 'Character Limit', type: 'number' },
  { key: 'targetLanguages', label: 'Target Languages', type: 'tags' },
  { key: 'translationStatus', label: 'Translation Status', type: 'select', options: STATUSES },
  { key: 'pluralizationNotes', label: 'Pluralization / Grammar Notes', type: 'textarea', placeholder: 'e.g. Needs gendered variants in Spanish/French' },
  { key: 'voiceoverNeeded', label: 'Voiceover Needed?', type: 'select', options: ['No', 'Yes'] },
  { key: 'sourceReference', label: 'Source Reference', type: 'text', placeholder: 'Which entity this string belongs to' },
];

const EXTRA_FIELDS_BY_SUBTYPE = {
  'legal-text': [{ key: 'requiresLegalReview', label: 'Requires Legal Review?', type: 'select', options: ['Yes', 'No'] }],
  'store-listing-copy': [{ key: 'platformTarget', label: 'Platform Target', type: 'select', options: PLATFORMS }],
  'patch-notes-text': [{ key: 'linkedVersion', label: 'Linked Build Version', type: 'text', placeholder: 'e.g. 0.5.1' }],
  'voice-script': [{ key: 'recordingNotes', label: 'Recording Notes', type: 'textarea', placeholder: 'Direction for the voice actor…' }],
  'subtitle-timing-text': [{ key: 'timecodeStart', label: 'Timecode In', type: 'text', placeholder: 'e.g. 00:01:23.400' }, { key: 'timecodeEnd', label: 'Timecode Out', type: 'text', placeholder: 'e.g. 00:01:26.100' }],
  'credits-text': [{ key: 'creditRole', label: 'Credit Role / Section', type: 'text' }],
};

const FIELDS = (subtype) => [...COMMON_FIELDS, ...(EXTRA_FIELDS_BY_SUBTYPE[subtype] || [])];

const STATUS_CLASS = { 'Not Started': 'badge-gray', 'In Progress': 'badge-blue', Translated: 'badge-blue', 'In Review': 'badge-amber', Approved: 'badge-green', 'Needs Update': 'badge-rose' };

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.translationStatus) badges.push({ text: item.translationStatus, cls: STATUS_CLASS[item.translationStatus] || 'badge-gray' });
  return badges;
}

function stringIdFor(subtype, rng) {
  return `LOC_${subtype.replace(/-/g, '_').toUpperCase()}_${Math.floor(100 + rng() * 900)}`;
}

// When real content already exists for a subtype (items, quests, achievements,
// dialogue), pull its actual text so the loc sheet reflects the real project
// instead of only ever showing generic placeholder strings.
export function generateLocString(rng, subtype) {
  const key = subtype || 'ui-text';
  let sourceText, sourceReference, context;
  if (key === 'item-name' && store.list('items').length) {
    const item = pick(store.list('items'), rng);
    sourceText = item.name;
    sourceReference = `Item: ${item.name}`;
    context = 'Item name shown in inventory/tooltip';
  } else if (key === 'quest-text' && store.list('quests').length) {
    const quest = pick(store.list('quests'), rng);
    sourceText = quest.name;
    sourceReference = `Quest: ${quest.name}`;
    context = 'Quest title shown in quest log';
  } else if (key === 'achievement-text' && store.list('achievements').length) {
    const ach = pick(store.list('achievements'), rng);
    sourceText = ach.unlockCriteria || ach.name;
    sourceReference = `Achievement: ${ach.name}`;
    context = 'Achievement unlock criteria text';
  } else if (key === 'dialogue-line' && store.list('dialogueNodes').length) {
    const node = pick(store.list('dialogueNodes'), rng);
    sourceText = node.lineText || node.choiceLabel || node.name;
    sourceReference = `Dialogue: ${node.name}`;
    context = `Dialogue node in "${node.sceneName || 'a conversation'}"`;
  } else {
    const byType = {
      'ui-text': UI_TEXT_SAMPLES, 'error-message': ERROR_MESSAGES, 'marketing-copy': MARKETING_COPY, 'tutorial-text': TUTORIAL_TEXT,
      'legal-text': LEGAL_TEXT, 'store-listing-copy': STORE_LISTING_COPY, 'patch-notes-text': PATCH_NOTES_TEXT,
      'voice-script': VOICE_SCRIPT_SAMPLES, 'subtitle-timing-text': SUBTITLE_TEXT, 'credits-text': CREDITS_TEXT,
    };
    sourceText = pick(byType[key] || UI_TEXT_SAMPLES, rng);
    sourceReference = '';
    context = pick(['Main menu', 'HUD', 'Settings screen', 'Store page', 'Pause menu', 'Onboarding flow'], rng);
  }
  const entry = {
    name: sourceText.length > 48 ? sourceText.slice(0, 45) + '…' : sourceText,
    description: `${key.replace(/-/g, ' ')} localization string.`,
    sourceText,
    context,
    stringId: stringIdFor(key, rng),
    characterLimit: key === 'ui-text' ? 24 : key === 'error-message' ? 80 : 0,
    targetLanguages: pickN(LANGUAGES, 4 + Math.floor(rng() * 5), rng),
    translationStatus: 'Not Started',
    pluralizationNotes: rng() < 0.25 ? 'May need plural/gendered variants depending on count and target language grammar.' : '',
    voiceoverNeeded: (key === 'dialogue-line' || key === 'voice-script') ? 'Yes' : 'No',
    sourceReference,
  };
  if (key === 'legal-text') entry.requiresLegalReview = 'Yes';
  if (key === 'store-listing-copy') entry.platformTarget = pick(PLATFORMS, rng);
  if (key === 'patch-notes-text') entry.linkedVersion = `0.${Math.floor(1 + rng() * 9)}.${Math.floor(rng() * 20)}`;
  if (key === 'voice-script') entry.recordingNotes = pick(['Deliver with a sharp, clipped cadence.', 'Warm but guarded — hold back real emotion until the last line.', 'Building intensity across the line.', 'Flat and controlled, almost bored.'], rng);
  if (key === 'subtitle-timing-text') { const start = Math.floor(rng() * 3600); entry.timecodeStart = new Date(start * 1000).toISOString().slice(11, 22); entry.timecodeEnd = new Date((start + 2 + Math.floor(rng() * 3)) * 1000).toISOString().slice(11, 22); }
  if (key === 'credits-text') entry.creditRole = pick(['Lead Game Designer', 'Special Thanks', 'Voice Cast', 'Community Playtesters', 'Localization Team', 'Engine Programmer'], rng);
  return entry;
}

const GENERATORS = [
  { label: 'Generate Localization String', run: ({ subtype }) => generateLocString(rngFor(Math.random()), subtype || 'ui-text') },
];

export function mountLocalization(container, opts) {
  const view = createCollectionView({
    key: 'locStrings', singular: 'Localization String', plural: 'Localization Strings', icon: '🌐',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ translationStatus: 'Not Started', targetLanguages: [], voiceoverNeeded: 'No' }),
    cardBadges: badgeFor,
    cardMeta: item => item.sourceText,
    generators: GENERATORS,
    onCreate: (item) => autoTask('locStrings', item, {
      category: 'writing', estimateHours: 1, title: (i) => `Translate: ${i.name}`,
      description: `Translate and review "${item.name}" across its target languages.`,
    }),
    helpText: '14 string types — UI text, dialogue, item names/flavor, quest text, achievement text, error messages, marketing copy, tutorial text, legal text, store listing copy, patch notes, voice scripts, subtitle timing and credits — source text, context, character limits, target languages, translation status, voiceover needs and subtype-specific fields (legal review flag, platform target, timecodes and more). When real content already exists (items, quests, achievements, dialogue nodes), the generator pulls actual project text instead of a placeholder.',
  });
  return view.mount(container, opts);
}
