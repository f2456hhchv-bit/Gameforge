import { createCollectionView } from '../components/collectionView.js';
import { rngFor } from '../generators/procedural.js';
import { pick } from '../util.js';
import { store } from '../store.js';
import { MOODS } from '../generators/wordbank.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'opening-line', label: 'Opening Line', icon: '🟢' },
  { key: 'npc-response', label: 'NPC Response', icon: '💬' },
  { key: 'player-choice', label: 'Player Choice', icon: '🔀' },
  { key: 'branch-point', label: 'Branch Point', icon: '🌿' },
  { key: 'closing-line', label: 'Closing Line', icon: '🔚' },
  { key: 'idle-bark', label: 'Idle Bark', icon: '💭' },
];

const SCENE_THEMES = [
  'A tense negotiation', 'A chance encounter', 'A reunion long overdue', 'A confession',
  'A warning', 'A farewell', 'An interrogation', 'A recruitment pitch', 'A confrontation',
  'A moment of doubt', 'An uneasy alliance', 'A plea for help', 'A veiled threat', 'A shared memory',
];
const CHOICE_LABELS = [
  'Agree', 'Refuse', 'Ask a question first', 'Demand more information', 'Lie', 'Stay silent',
  'Threaten', 'Offer a deal', 'Walk away', 'Apologize', 'Press for the truth', 'Change the subject',
];
const LINE_OPENERS = [
  'I wasn\'t expecting to see you here.', 'We need to talk — now.', 'You have no idea what you\'ve started.',
  'I\'ve been waiting a long time for this.', 'Don\'t come any closer.', 'There\'s something you should know.',
  'I trusted you. That was my mistake.', 'This isn\'t how I wanted this to go.', 'Everything changes after tonight.',
  'You look like you\'ve seen a ghost.', 'I can explain — just give me a chance.', 'It\'s too late to turn back now.',
];

const FIELDS = [
  { key: 'speaker', label: 'Speaker', type: 'relation', target: 'characters' },
  { key: 'sceneName', label: 'Scene / Conversation', type: 'text', placeholder: 'e.g. Docks Confrontation' },
  { key: 'lineText', label: 'Line Text', type: 'textarea', cols: 2, placeholder: 'What the speaker actually says…' },
  { key: 'tone', label: 'Tone', type: 'select', options: MOODS },
  { key: 'voiceDirection', label: 'Voice Direction', type: 'text', placeholder: 'e.g. Hushed, hesitant, then defiant' },
  { key: 'choiceLabel', label: 'Player Choice Label', type: 'text', placeholder: 'Shown on the response button (if this is a choice)' },
  { key: 'conditions', label: 'Conditions to Show', type: 'textarea', placeholder: 'e.g. Requires "met_captain" flag, reputation ≥ Friendly' },
  { key: 'consequences', label: 'Consequences', type: 'textarea', placeholder: 'e.g. Sets "betrayed_ally" flag, -10 reputation' },
  { key: 'nextNode', label: 'Next Node (linear)', type: 'relation', target: 'dialogueNodes' },
  { key: 'branchTargets', label: 'Branches To', type: 'relation-multi', target: 'dialogueNodes' },
  { key: 'localizationId', label: 'Localization String ID', type: 'text', placeholder: 'e.g. DLG_DOCKS_001' },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  const badges = [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }];
  if (item.tone) badges.push({ text: item.tone, cls: 'badge-gray' });
  return badges;
}

export function generateDialogueNode(rng, subtype) {
  const characters = store.list('characters');
  const speaker = characters.length ? pick(characters, rng) : null;
  const sceneName = pick(SCENE_THEMES, rng);
  const tone = pick(MOODS, rng);
  const isChoice = subtype === 'player-choice';
  const name = isChoice ? `Choice: ${pick(CHOICE_LABELS, rng)}` : `${sceneName} — ${(speaker?.name || 'Unknown Speaker')}`;
  return {
    name,
    description: `${subtype.replace(/-/g, ' ')} node in "${sceneName}".`,
    speaker: undefined,
    links: speaker ? { speaker: speaker.id } : {},
    sceneName,
    lineText: isChoice ? '' : pick(LINE_OPENERS, rng),
    tone,
    voiceDirection: pick(['Hushed and hesitant', 'Sharp and clipped', 'Warm, then guarded', 'Flat, controlled', 'Building intensity', 'Quiet resignation'], rng),
    choiceLabel: isChoice ? pick(CHOICE_LABELS, rng) : '',
    conditions: rng() < 0.3 ? `Requires having met ${speaker?.name || 'this NPC'} at least once.` : '',
    consequences: rng() < 0.3 ? 'Adjusts reputation and flags a follow-up beat later in the story.' : '',
    localizationId: `DLG_${sceneName.replace(/[^A-Za-z0-9]+/g, '_').toUpperCase().slice(0, 20)}_${Math.floor(rng() * 900 + 100)}`,
  };
}

const CONVERSATION_SEQUENCE = ['opening-line', 'npc-response', 'player-choice', 'closing-line'];
let conversationState = { sceneName: null };

function generateConversationEntry({ index }) {
  const rng = rngFor(Math.random() + index);
  const key = CONVERSATION_SEQUENCE[index % CONVERSATION_SEQUENCE.length];
  if (index % CONVERSATION_SEQUENCE.length === 0) conversationState.sceneName = pick(SCENE_THEMES, rng);
  const base = generateDialogueNode(rng, key);
  base.sceneName = conversationState.sceneName;
  base.description = `Beat ${(index % CONVERSATION_SEQUENCE.length) + 1} of 4 in the "${conversationState.sceneName}" conversation.`;
  return { ...base, subtype: key };
}

const GENERATORS = [
  { label: 'Generate Dialogue Node', run: ({ subtype }) => generateDialogueNode(rngFor(Math.random()), subtype || 'npc-response') },
  { label: 'Generate Conversation Starter Set (4 nodes)', run: generateConversationEntry },
];

export function mountDialogue(container, opts) {
  const view = createCollectionView({
    key: 'dialogueNodes', singular: 'Dialogue Node', plural: 'Dialogue Nodes', icon: '💬',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({}),
    cardBadges: badgeFor,
    cardMeta: item => item.lineText || item.choiceLabel || item.sceneName,
    generators: GENERATORS,
    onCreate: (item) => autoTask('dialogueNodes', item, {
      category: 'writing', estimateHours: 1, title: (i) => `Write & VO-direct: ${i.name}`,
      description: `Finalize the line, conditions and branch targets for "${item.name}".`,
    }),
    helpText: 'Branching conversation nodes — opening lines, NPC responses, player choices, branch points, closing lines and idle barks. Link a node\'s "Next Node" or "Branches To" fields to other dialogue nodes to build a real conversation graph (visible in the Relationship Graph too). Use "Generate Conversation Starter Set" to draft a whole 4-beat scene in one click.',
  });
  return view.mount(container, opts);
}
