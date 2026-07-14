import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { store } from '../store.js';
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
];

const LANGUAGES = ['French', 'German', 'Spanish (LatAm)', 'Spanish (Spain)', 'Japanese', 'Korean', 'Simplified Chinese', 'Brazilian Portuguese', 'Russian', 'Italian', 'Polish', 'Turkish'];
const STATUSES = ['Not Started', 'In Progress', 'Translated', 'In Review', 'Approved', 'Needs Update'];
const UI_TEXT_SAMPLES = ['Continue', 'Are you sure you want to quit?', 'Settings saved.', 'Insufficient currency.', 'New item received!', 'Connection lost. Reconnecting…'];
const ERROR_MESSAGES = ['Save file could not be loaded.', 'Network connection timed out.', 'Purchase failed — please try again.', 'This save is from an incompatible version.', 'Unable to connect to matchmaking servers.'];
const MARKETING_COPY = ['Wishlist now and never miss launch day.', 'Available on all platforms this fall.', 'Join millions of players in the adventure of a lifetime.', 'Pre-order today for exclusive bonus content.'];
const TUTORIAL_TEXT = ['Press A to jump over obstacles.', 'Hold the trigger to charge your attack.', 'Open the map to see nearby objectives.', 'Sprint by double-tapping the movement stick.'];

const FIELDS = [
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
    const byType = { 'ui-text': UI_TEXT_SAMPLES, 'error-message': ERROR_MESSAGES, 'marketing-copy': MARKETING_COPY, 'tutorial-text': TUTORIAL_TEXT };
    sourceText = pick(byType[key] || UI_TEXT_SAMPLES, rng);
    sourceReference = '';
    context = pick(['Main menu', 'HUD', 'Settings screen', 'Store page', 'Pause menu', 'Onboarding flow'], rng);
  }
  return {
    name: sourceText.length > 48 ? sourceText.slice(0, 45) + '…' : sourceText,
    description: `${key.replace(/-/g, ' ')} localization string.`,
    sourceText,
    context,
    stringId: stringIdFor(key, rng),
    characterLimit: key === 'ui-text' ? 24 : key === 'error-message' ? 80 : 0,
    targetLanguages: pickN(LANGUAGES, 4 + Math.floor(rng() * 5), rng),
    translationStatus: 'Not Started',
    pluralizationNotes: rng() < 0.25 ? 'May need plural/gendered variants depending on count and target language grammar.' : '',
    voiceoverNeeded: key === 'dialogue-line' ? 'Yes' : 'No',
    sourceReference,
  };
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
    helpText: 'Translatable strings across UI text, dialogue, item names/flavor, quest text, achievement text, error messages, marketing copy and tutorial text — source text, context, character limits, target languages, translation status and voiceover needs. When real content already exists (items, quests, achievements, dialogue nodes), the generator pulls actual project text instead of a placeholder.',
  });
  return view.mount(container, opts);
}
