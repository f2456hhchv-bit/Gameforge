// Local, deterministic command assistant — no external LLM, no network calls.
// It parses a constrained set of natural-language-ish commands and performs
// real mutations through the same store/generator functions the UI modules
// use, so "generate 50 weapons" in chat does exactly what the Item Studio
// generator button does. Conversation history is persisted per-project.
import { h, uid, timeAgo, pick, nowISO } from '../util.js';
import { store } from '../store.js';
import { toast } from '../components/ui.js';
import { COLLECTIONS } from '../schema.js';
import { rngFor, generateBiomeLore, statBlockForLevel } from '../generators/procedural.js';
import { BIOME_TYPES } from '../generators/wordbank.js';
import { autoTask } from '../taskHooks.js';

import { generatePlace, generateFaction } from './world.js';
import { generateCharacter } from './characters.js';
import { generateItem } from './items.js';
import { generateLevel } from './levels.js';
import { generateAbility } from './combat.js';
import { generatePrompt } from './art.js';
import { generateScreen, SUBTYPES as UI_SUBTYPES } from './uiDesigner.js';
import { generateAudio } from './audio.js';
import { generateQuest } from './quests.js';

// Ordered most-specific-first so e.g. "weapon" matches before generic "item".
// `taskFor` mirrors the onCreate hook each module's own UI wires into
// collectionView, so a chat-generated entity gets exactly the same
// auto-created production task as one made through the module's own button.
const CONTENT_TYPES = [
  { keywords: ['weapon'], collection: 'items', subtype: 'weapon', generate: (rng) => generateItem(rng, 'weapon'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['armor', 'armour'], collection: 'items', subtype: 'armor', generate: (rng) => generateItem(rng, 'armor'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['accessor'], collection: 'items', subtype: 'accessory', generate: (rng) => generateItem(rng, 'accessory'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['consumable', 'potion'], collection: 'items', subtype: 'consumable', generate: (rng) => generateItem(rng, 'consumable'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['material', 'resource'], collection: 'items', subtype: 'material', generate: (rng) => generateItem(rng, 'material'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['currency', 'currencies'], collection: 'items', subtype: 'currency', generate: (rng) => generateItem(rng, 'currency'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['item'], collection: 'items', subtype: 'weapon', generate: (rng) => generateItem(rng, 'weapon'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['boss'], collection: 'characters', subtype: 'boss', generate: (rng) => generateCharacter(rng, 'boss'), taskFor: (i) => ({ category: 'art', estimateHours: 12, difficulty: 'hard', title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['enem'], collection: 'characters', subtype: 'enemy', generate: (rng) => generateCharacter(rng, 'enemy'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['npc'], collection: 'characters', subtype: 'npc', generate: (rng) => generateCharacter(rng, 'npc'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['companion'], collection: 'characters', subtype: 'companion', generate: (rng) => generateCharacter(rng, 'companion'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['merchant', 'vendor'], collection: 'characters', subtype: 'merchant', generate: (rng) => generateCharacter(rng, 'merchant'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['wildlife', 'creature', 'animal'], collection: 'characters', subtype: 'wildlife', generate: (rng) => generateCharacter(rng, 'wildlife'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['character'], collection: 'characters', subtype: 'npc', generate: (rng) => generateCharacter(rng, 'npc'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['faction'], collection: 'biomes', subtype: 'faction', generate: (rng) => generateFaction(rng), taskFor: (i) => ({ category: 'design', estimateHours: 3, title: `Build out: ${i.name}` }) },
  { keywords: ['biome'], collection: 'biomes', subtype: 'biome', generate: (rng) => generatePlace(rng, 'biome'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['region'], collection: 'biomes', subtype: 'region', generate: (rng) => generatePlace(rng, 'region'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['city', 'cities'], collection: 'biomes', subtype: 'city', generate: (rng) => generatePlace(rng, 'city'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['planet'], collection: 'biomes', subtype: 'planet', generate: (rng) => generatePlace(rng, 'planet'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['galax'], collection: 'biomes', subtype: 'galaxy', generate: (rng) => generatePlace(rng, 'galaxy'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['quest'], collection: 'quests', subtype: 'side', generate: (rng) => generateQuest(rng, 'side'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['level', 'dungeon'], collection: 'levels', subtype: null, generate: (rng) => generateLevel(rng), taskFor: (i) => ({ category: 'design', estimateHours: 10, title: `Build level: ${i.name}` }) },
  { keywords: ['ability', 'abilities'], collection: 'combatEntries', subtype: 'ability', generate: (rng) => generateAbility(rng), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['ui screen', 'menu screen', 'hud'], collection: 'uiScreens', subtype: null, generate: (rng) => generateScreen(rng, UI_SUBTYPES[0].key), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['audio', 'sound', 'sfx', 'music track'], collection: 'audioEntries', subtype: null, generate: (rng) => generateAudio(rng, 'sfx'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['art prompt', 'concept art'], collection: 'artPrompts', subtype: 'concept', generate: (rng) => generatePrompt(rng, 'concept') },
];

function extractCount(text) {
  const m = text.match(/\b(\d{1,3})\b/);
  if (!m) return 1;
  return Math.max(1, Math.min(200, parseInt(m[1], 10)));
}

function matchContentType(text) {
  const lower = text.toLowerCase();
  return CONTENT_TYPES.find(ct => ct.keywords.some(kw => lower.includes(kw)));
}

function runBulkGenerate(ct, count) {
  store.snapshot();
  const created = [];
  for (let i = 0; i < count; i++) {
    const rng = rngFor(Math.random() + i);
    const partial = ct.generate(rng) || {};
    const item = { id: uid(ct.collection), tags: [], links: {}, description: '', ...partial, subtype: ct.subtype || partial.subtype, createdAt: nowISO(), updatedAt: nowISO() };
    store.project.collections[ct.collection].push(item);
    if (ct.taskFor) autoTask(ct.collection, item, ct.taskFor(item));
    created.push(item);
  }
  store.commit(`Assistant: generate ${count} ${COLLECTIONS[ct.collection].label}`);
  store.logActivity(`Assistant generated ${count} ${COLLECTIONS[ct.collection].label.toLowerCase()}`, { icon: '🤖' });
  return created;
}

function rebalanceEnemies() {
  const combatChars = store.list('characters').filter(c => ['enemy', 'boss', 'wildlife'].includes(c.subtype));
  if (!combatChars.length) return { changed: 0 };
  store.snapshot();
  for (const c of combatChars) {
    const rng = rngFor(c.id);
    c.statistics = statBlockForLevel(rng, c.level || 1, c.subtype === 'boss' ? 4 : 1);
  }
  store.commit('Assistant: rebalance enemy stat blocks');
  store.logActivity(`Assistant rebalanced ${combatChars.length} combat characters' stat blocks by level`, { icon: '🤖' });
  return { changed: combatChars.length };
}

function improveProgression() {
  store.snapshot();
  let doc = store.list('designDocs').find(d => d.subtype === 'difficulty');
  const suggestion = 'Assistant suggestion: widen the early curve (first 20% of content should ramp slowly to build confidence), then introduce a mid-game spike tied to a new mechanic every 3-4 hours, and taper late-game difficulty via player-chosen modifiers rather than raw stat inflation.';
  if (doc) {
    doc.scalingNotes = doc.scalingNotes ? `${doc.scalingNotes}\n\n${suggestion}` : suggestion;
  } else {
    doc = { id: uid('designDocs'), subtype: 'difficulty', name: 'Difficulty', description: 'Auto-drafted by the assistant.', modes: ['Story', 'Normal', 'Hard'], scalingNotes: suggestion, accessibilityOptions: [], tags: [], links: {}, createdAt: nowISO(), updatedAt: nowISO() };
    store.project.collections.designDocs.push(doc);
  }
  const task = store.addTask({ title: 'Tune progression curve based on assistant suggestions', category: 'design', priority: 'medium', estimateHours: 3, description: suggestion });
  store.commit('Assistant: improve progression');
  store.logActivity('Assistant updated the Difficulty design doc and added a follow-up task', { icon: '🤖' });
  return { doc, task };
}

function rewriteLore() {
  const biomes = store.list('biomes').filter(b => b.subtype !== 'faction');
  store.snapshot();
  if (!biomes.length) {
    const rng = rngFor(Math.random());
    const fresh = { id: uid('biomes'), tags: [], links: {}, description: '', ...generatePlace(rng, 'biome'), createdAt: nowISO(), updatedAt: nowISO() };
    store.project.collections.biomes.push(fresh);
    store.commit('Assistant: create a biome and write its lore');
    store.logActivity('Assistant created a new biome (none existed) and wrote its lore', { icon: '🤖' });
    return { updated: [fresh] };
  }
  for (const b of biomes) {
    const rng = rngFor(b.id + Math.random());
    const type = BIOME_TYPES.find(t => t.key === b.biomeType) || pick(BIOME_TYPES, rng);
    b.lore = generateBiomeLore(rng, type.label);
  }
  store.commit('Assistant: rewrite lore');
  store.logActivity(`Assistant rewrote lore for ${biomes.length} world entries`, { icon: '🤖' });
  return { updated: biomes };
}

const HELP_TEXT = `I'm a local command assistant — everything I do runs entirely in your browser, no external AI service involved. Try things like:

• "generate 50 weapons" / "generate 10 enemies" / "create a new biome" / "generate 5 quests"
• "balance these enemies" (rescales enemy/boss stat blocks by level)
• "improve progression" (updates the Difficulty doc + adds a task)
• "rewrite the lore" (regenerates lore for every world entry)

I can generate: weapons, armour, accessories, consumables, materials, currencies, enemies, bosses, NPCs, companions, merchants, wildlife, biomes, regions, cities, planets, galaxies, factions, quests, levels, abilities, UI screens, audio cues and art prompts.`;

function handleCommand(text) {
  const lower = text.toLowerCase().trim();

  if (/\b(help|what can you do|commands)\b/.test(lower)) {
    return HELP_TEXT;
  }
  if (/\bbalance\b/.test(lower) && /(enem|boss|combat)/.test(lower)) {
    const { changed } = rebalanceEnemies();
    return changed ? `Rebalanced stat blocks for ${changed} enemy/boss/wildlife characters based on their level. Open Character Studio to review.` : "You don't have any enemies, bosses or wildlife yet — generate some in Character Studio first.";
  }
  if (/\bprogression\b/.test(lower) && /(improve|better|tune|fix)/.test(lower)) {
    improveProgression();
    return 'Updated the Difficulty design document with progression-curve suggestions and added a follow-up task to Task Manager.';
  }
  if (/\blore\b/.test(lower) && /(rewrite|improve|update|regenerate)/.test(lower)) {
    const { updated } = rewriteLore();
    return `Rewrote lore for ${updated.length} world ${updated.length === 1 ? 'entry' : 'entries'}: ${updated.map(b => b.name).join(', ')}. Open World Builder to fine-tune.`;
  }
  if (/\b(generate|create|add|make)\b/.test(lower)) {
    const ct = matchContentType(lower);
    if (ct) {
      const count = extractCount(lower);
      const created = runBulkGenerate(ct, count);
      const names = created.slice(0, 5).map(c => c.name).join(', ');
      const more = created.length > 5 ? ` (+${created.length - 5} more)` : '';
      return `Created ${created.length} ${COLLECTIONS[ct.collection].label.toLowerCase()}: ${names}${more}. Open ${COLLECTIONS[ct.collection].label} to review and edit.`;
    }
  }
  return `I didn't quite catch what to build. ${HELP_TEXT}`;
}

export function mountAssistant(container) {
  function render() {
    container.innerHTML = '';
    const log = store.list('assistantLog');

    const messages = h('div', { class: 'flex-1 overflow-y-auto scroll-thin p-3 flex flex-col gap-3' });
    if (!log.length) {
      messages.appendChild(h('div', { class: 'empty-state flex-1' }, [
        h('div', { class: 'text-3xl' }, '🤖'),
        h('p', { class: 'text-sm' }, 'Ask me to create content, balance enemies, draft quests, or rewrite lore.'),
      ]));
    }
    [...log].reverse().forEach(msg => {
      messages.appendChild(h('div', { class: `flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}` }, [
        h('div', {
          class: `max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-accent text-white' : 'bg-surface-2'}`,
        }, msg.text),
        h('span', { class: 'text-[10px] text-slate-400 px-1' }, timeAgo(msg.createdAt)),
      ]));
    });

    const input = h('textarea', {
      class: 'textarea flex-1 !min-h-0', rows: 2, placeholder: 'e.g. "generate 20 enemies" or "rewrite the lore"…',
      onkeydown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } },
    });
    function send() {
      const text = input.value.trim();
      if (!text) return;
      store.project.collections.assistantLog.push({ id: uid('msg'), role: 'user', text, createdAt: new Date().toISOString() });
      const reply = handleCommand(text);
      store.project.collections.assistantLog.push({ id: uid('msg'), role: 'assistant', text: reply, createdAt: new Date().toISOString() });
      store.touch();
      input.value = '';
      render();
      toast('Assistant updated the project', { type: 'success' });
    }

    const inputRow = h('div', { class: 'flex gap-2 p-3 border-t border-surface-3/60' }, [
      input,
      h('button', { class: 'btn-primary self-end', onclick: send }, '➤'),
    ]);

    container.append(
      h('div', { class: 'flex items-center justify-between px-3 py-2.5 border-b border-surface-3/60' }, [
        h('div', { class: 'flex items-center gap-2 font-semibold' }, [h('span', {}, '🤖'), h('span', {}, 'Assistant')]),
        h('button', { class: 'btn-ghost text-xs', onclick: () => { input.value = 'help'; send(); } }, '? Help'),
      ]),
      messages, inputRow,
    );
    messages.scrollTop = 0;
  }
  render();
  const unsub = store.on((project, reason) => { if (reason.startsWith('mutate') || reason === 'undo' || reason === 'redo' || reason === 'load') render(); });
  return () => unsub();
}
