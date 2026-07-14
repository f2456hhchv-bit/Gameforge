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

import { generatePlace, generateFaction, generateContinent } from './world.js';
import { generateCharacter, generateFactionRosterMember, generateGauntletBoss } from './characters.js';
import { generateItem, generateLegendarySetItem, generateStarterLoadoutItem } from './items.js';
import { generateLevel } from './levels.js';
import { generateAbility, generateComboString, generateEnvironmentalHazard } from './combat.js';
import { generatePrompt } from './art.js';
import { generateAchievement } from './achievements.js';
import { generateScreen, SUBTYPES as UI_SUBTYPES } from './uiDesigner.js';
import { generateAudio } from './audio.js';
import { generateQuest, generateQuestChainEntry } from './quests.js';
import { runProjectAudit } from '../audit.js';
import { suggestLinks, applyAllLinkSuggestions } from '../linking.js';
import { generateMashupBrief } from '../mashup.js';
import { generateDialogueNode } from './dialogue.js';
import { generatePlaytestSession } from './playtests.js';
import { generateLiveOpsEvent } from './liveops.js';
import { generateLocString } from './localization.js';
import { generateTelemetryEvent } from './analytics.js';
import { generateControlBinding } from './controls.js';

// Ordered most-specific-first so e.g. "weapon" matches before generic "item".
// `taskFor` mirrors the onCreate hook each module's own UI wires into
// collectionView, so a chat-generated entity gets exactly the same
// auto-created production task as one made through the module's own button.
const CONTENT_TYPES = [
  // Phase 30-35 additions, kept ahead of the generic single-word entries
  // below (e.g. "weapon", "boss", "character", "quest", "achievement") since
  // matchContentType picks the first array match and phrases like "weapon
  // skin" or "character creation" would otherwise be swallowed by those.
  { keywords: ['cutscene art', 'cinematic art'], collection: 'artPrompts', subtype: 'cutscene', generate: (rng) => generatePrompt(rng, 'cutscene') },
  { keywords: ['box art', 'cover art'], collection: 'artPrompts', subtype: 'box-art', generate: (rng) => generatePrompt(rng, 'box-art') },
  { keywords: ['app icon', 'game icon', 'thumbnail'], collection: 'artPrompts', subtype: 'icon', generate: (rng) => generatePrompt(rng, 'icon') },
  { keywords: ['achievement icon', 'trophy icon'], collection: 'artPrompts', subtype: 'achievement-icon', generate: (rng) => generatePrompt(rng, 'achievement-icon') },
  { keywords: ['weapon skin'], collection: 'artPrompts', subtype: 'weapon-skin', generate: (rng) => generatePrompt(rng, 'weapon-skin') },
  { keywords: ['mood board'], collection: 'artPrompts', subtype: 'mood-board', generate: (rng) => generatePrompt(rng, 'mood-board') },
  { keywords: ['texture study'], collection: 'artPrompts', subtype: 'texture-study', generate: (rng) => generatePrompt(rng, 'texture-study') },
  { keywords: ['lighting study'], collection: 'artPrompts', subtype: 'lighting-study', generate: (rng) => generatePrompt(rng, 'lighting-study') },
  { keywords: ['turnaround'], collection: 'artPrompts', subtype: 'turnaround', generate: (rng) => generatePrompt(rng, 'turnaround') },
  { keywords: ['tutorial screen', 'onboarding screen'], collection: 'uiScreens', subtype: 'tutorial', generate: (rng) => generateScreen(rng, 'tutorial'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['notification', 'toast'], collection: 'uiScreens', subtype: 'notification', generate: (rng) => generateScreen(rng, 'notification'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['dialogue box', 'dialog box'], collection: 'uiScreens', subtype: 'dialogue', generate: (rng) => generateScreen(rng, 'dialogue'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['crafting ui', 'crafting screen'], collection: 'uiScreens', subtype: 'crafting', generate: (rng) => generateScreen(rng, 'crafting'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['leaderboard'], collection: 'uiScreens', subtype: 'leaderboard', generate: (rng) => generateScreen(rng, 'leaderboard'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['social screen', 'friends list'], collection: 'uiScreens', subtype: 'social', generate: (rng) => generateScreen(rng, 'social'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['achievements screen'], collection: 'uiScreens', subtype: 'achievements-ui', generate: (rng) => generateScreen(rng, 'achievements-ui'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['pause menu'], collection: 'uiScreens', subtype: 'pause', generate: (rng) => generateScreen(rng, 'pause'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['game over screen', 'victory screen'], collection: 'uiScreens', subtype: 'game-over', generate: (rng) => generateScreen(rng, 'game-over'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['character creation'], collection: 'uiScreens', subtype: 'character-creation', generate: (rng) => generateScreen(rng, 'character-creation'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['quest log', 'codex'], collection: 'uiScreens', subtype: 'quest-log', generate: (rng) => generateScreen(rng, 'quest-log'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['stinger'], collection: 'audioEntries', subtype: 'stinger', generate: (rng) => generateAudio(rng, 'stinger'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['jingle', 'fanfare'], collection: 'audioEntries', subtype: 'jingle', generate: (rng) => generateAudio(rng, 'jingle'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['boss theme'], collection: 'audioEntries', subtype: 'boss-theme', generate: (rng) => generateAudio(rng, 'boss-theme'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['cutscene score'], collection: 'audioEntries', subtype: 'cutscene-score', generate: (rng) => generateAudio(rng, 'cutscene-score'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['voice bed', 'crowd ambience', 'crowd voice'], collection: 'audioEntries', subtype: 'ambient-voice-bed', generate: (rng) => generateAudio(rng, 'ambient-voice-bed'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['combo string'], collection: 'combatEntries', subtype: 'combo-string', generate: (rng) => generateComboString(rng), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['environmental hazard'], collection: 'combatEntries', subtype: 'environmental-hazard', generate: (rng) => generateEnvironmentalHazard(rng), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['escort quest', 'escort mission'], collection: 'quests', subtype: 'escort', generate: (rng) => generateQuest(rng, 'escort'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['collection quest'], collection: 'quests', subtype: 'collection', generate: (rng) => generateQuest(rng, 'collection'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['investigation quest', 'mystery quest'], collection: 'quests', subtype: 'investigation', generate: (rng) => generateQuest(rng, 'investigation'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['timed event quest', 'timed quest'], collection: 'quests', subtype: 'timed-event', generate: (rng) => generateQuest(rng, 'timed-event'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  // Phase 40-45 "10x" additions — same precedence rule: specific phrases
  // ahead of the generic single-word entries below (boss/enem/level/quest).
  { keywords: ['rival'], collection: 'characters', subtype: 'rival', generate: (rng) => generateCharacter(rng, 'rival'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['mentor'], collection: 'characters', subtype: 'mentor', generate: (rng) => generateCharacter(rng, 'mentor'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['elite enemy', 'elite variant'], collection: 'characters', subtype: 'elite', generate: (rng) => generateCharacter(rng, 'elite'), taskFor: (i) => ({ category: 'art', estimateHours: 7, difficulty: 'hard', title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['guard'], collection: 'characters', subtype: 'guard', generate: (rng) => generateCharacter(rng, 'guard'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['cultist', 'cult member'], collection: 'characters', subtype: 'cultist', generate: (rng) => generateCharacter(rng, 'cultist'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['tamed pet', 'tameable pet'], collection: 'characters', subtype: 'tamed-pet', generate: (rng) => generateCharacter(rng, 'tamed-pet'), taskFor: (i) => ({ category: 'art', estimateHours: 5, title: `Model, rig & animate: ${i.name}` }) },
  { keywords: ['relic', 'artifact'], collection: 'items', subtype: 'relic', generate: (rng) => generateItem(rng, 'relic'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['gem', 'rune stone'], collection: 'items', subtype: 'gem', generate: (rng) => generateItem(rng, 'gem'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['throwable', 'grenade'], collection: 'items', subtype: 'throwable', generate: (rng) => generateItem(rng, 'throwable'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['ammunition', 'ammo'], collection: 'items', subtype: 'ammunition', generate: (rng) => generateItem(rng, 'ammunition'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['utility tool', 'toolkit'], collection: 'items', subtype: 'tool', generate: (rng) => generateItem(rng, 'tool'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['deployable', 'turret'], collection: 'items', subtype: 'deployable', generate: (rng) => generateItem(rng, 'deployable'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['loot container', 'treasure chest'], collection: 'items', subtype: 'container', generate: (rng) => generateItem(rng, 'container'), taskFor: (i) => ({ category: 'art', estimateHours: 2, title: `Create icon/model art: ${i.name}` }) },
  { keywords: ['rescue'], collection: 'quests', subtype: 'rescue', generate: (rng) => generateQuest(rng, 'rescue'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['heist'], collection: 'quests', subtype: 'heist', generate: (rng) => generateQuest(rng, 'heist'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['bounty'], collection: 'quests', subtype: 'bounty', generate: (rng) => generateQuest(rng, 'bounty'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['infiltration', 'infiltrate'], collection: 'quests', subtype: 'infiltration', generate: (rng) => generateQuest(rng, 'infiltration'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['sabotage'], collection: 'quests', subtype: 'sabotage', generate: (rng) => generateQuest(rng, 'sabotage'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['tournament'], collection: 'quests', subtype: 'tournament', generate: (rng) => generateQuest(rng, 'tournament'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['diplomacy'], collection: 'quests', subtype: 'diplomacy', generate: (rng) => generateQuest(rng, 'diplomacy'), taskFor: (i) => ({ category: 'writing', estimateHours: 5, title: `Write & implement quest: ${i.name}` }) },
  { keywords: ['ultimate ability'], collection: 'combatEntries', subtype: 'ultimate', generate: (rng) => ({ subtype: 'ultimate', name: 'Ultimate Ability', description: 'A rare, high-impact ability with a long cooldown or buildup requirement.' }), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['aura'], collection: 'combatEntries', subtype: 'aura', generate: (rng) => ({ subtype: 'aura', name: 'Aura Effect', description: 'A persistent area effect radiating from its source.' }), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['execute', 'finisher move'], collection: 'combatEntries', subtype: 'execute-finisher', generate: (rng) => ({ subtype: 'execute-finisher', name: 'Execute / Finisher', description: 'A high-damage finishing move available below a health threshold.' }), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['enrage timer', 'enrage phase'], collection: 'combatEntries', subtype: 'enrage-timer', generate: (rng) => ({ subtype: 'enrage-timer', name: 'Enrage Timer', description: 'A time limit that dramatically empowers a boss if the fight runs too long.' }), taskFor: (i) => ({ category: 'code', estimateHours: 3, title: `Implement: ${i.name}` }) },
  { keywords: ['splash screen'], collection: 'artPrompts', subtype: 'splash-screen', generate: (rng) => generatePrompt(rng, 'splash-screen') },
  { keywords: ['promotional poster', 'promo poster'], collection: 'artPrompts', subtype: 'promo-poster', generate: (rng) => generatePrompt(rng, 'promo-poster') },
  { keywords: ['storyboard'], collection: 'artPrompts', subtype: 'storyboard', generate: (rng) => generatePrompt(rng, 'storyboard') },
  { keywords: ['skybox', 'panorama art'], collection: 'artPrompts', subtype: 'skybox', generate: (rng) => generatePrompt(rng, 'skybox') },
  { keywords: ['boss arena'], collection: 'levels', subtype: 'boss-arena', generate: (rng) => generateLevel(rng, 'boss-arena'), taskFor: (i) => ({ category: 'design', estimateHours: 10, title: `Build level: ${i.name}` }) },
  { keywords: ['hub level', 'level hub'], collection: 'levels', subtype: 'hub', generate: (rng) => generateLevel(rng, 'hub'), taskFor: (i) => ({ category: 'design', estimateHours: 10, title: `Build level: ${i.name}` }) },
  { keywords: ['stealth level'], collection: 'levels', subtype: 'stealth', generate: (rng) => generateLevel(rng, 'stealth'), taskFor: (i) => ({ category: 'design', estimateHours: 10, title: `Build level: ${i.name}` }) },
  { keywords: ['racing track', 'race track level'], collection: 'levels', subtype: 'racing-track', generate: (rng) => generateLevel(rng, 'racing-track'), taskFor: (i) => ({ category: 'design', estimateHours: 10, title: `Build level: ${i.name}` }) },
  { keywords: ['tutorial level'], collection: 'levels', subtype: 'tutorial', generate: (rng) => generateLevel(rng, 'tutorial'), taskFor: (i) => ({ category: 'design', estimateHours: 10, title: `Build level: ${i.name}` }) },
  // Round-2 "go again" additions (World Builder, Audio Designer, UI Designer).
  { keywords: ['shrine', 'temple'], collection: 'biomes', subtype: 'shrine', generate: (rng) => generatePlace(rng, 'shrine'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['ruins'], collection: 'biomes', subtype: 'ruins', generate: (rng) => generatePlace(rng, 'ruins'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['trade route'], collection: 'biomes', subtype: 'trade-route', generate: (rng) => generatePlace(rng, 'trade-route'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['capital city'], collection: 'biomes', subtype: 'capital-city', generate: (rng) => generatePlace(rng, 'capital-city'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['colony'], collection: 'biomes', subtype: 'colony', generate: (rng) => generatePlace(rng, 'colony'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['wilderness preserve'], collection: 'biomes', subtype: 'wilderness-preserve', generate: (rng) => generatePlace(rng, 'wilderness-preserve'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['underwater zone'], collection: 'biomes', subtype: 'underwater-zone', generate: (rng) => generatePlace(rng, 'underwater-zone'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['sky zone', 'floating isle'], collection: 'biomes', subtype: 'sky-zone', generate: (rng) => generatePlace(rng, 'sky-zone'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['dimension', 'plane of existence'], collection: 'biomes', subtype: 'dimension', generate: (rng) => generatePlace(rng, 'dimension'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) },
  { keywords: ['leitmotif'], collection: 'audioEntries', subtype: 'leitmotif', generate: (rng) => generateAudio(rng, 'leitmotif'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['foley pack', 'foley sounds'], collection: 'audioEntries', subtype: 'foley-pack', generate: (rng) => generateAudio(rng, 'foley-pack'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['radio chatter'], collection: 'audioEntries', subtype: 'radio-chatter', generate: (rng) => generateAudio(rng, 'radio-chatter'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['victory fanfare'], collection: 'audioEntries', subtype: 'victory-fanfare', generate: (rng) => generateAudio(rng, 'victory-fanfare'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['defeat stinger'], collection: 'audioEntries', subtype: 'defeat-stinger', generate: (rng) => generateAudio(rng, 'defeat-stinger'), taskFor: (i) => ({ category: 'audio', estimateHours: 2, title: `Produce audio: ${i.name}` }) },
  { keywords: ['minimap'], collection: 'uiScreens', subtype: 'minimap', generate: (rng) => generateScreen(rng, 'minimap'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['chat window'], collection: 'uiScreens', subtype: 'chat-window', generate: (rng) => generateScreen(rng, 'chat-window'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['party frame'], collection: 'uiScreens', subtype: 'party-frame', generate: (rng) => generateScreen(rng, 'party-frame'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['boss health overlay', 'boss health bar'], collection: 'uiScreens', subtype: 'boss-health-overlay', generate: (rng) => generateScreen(rng, 'boss-health-overlay'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  { keywords: ['photo mode'], collection: 'uiScreens', subtype: 'photo-mode', generate: (rng) => generateScreen(rng, 'photo-mode'), taskFor: (i) => ({ category: 'code', estimateHours: 4, title: `Implement UI screen: ${i.name}` }) },
  // Phase 53 additions — six brand-new modules (Dialogue, Playtesting,
  // LiveOps, Localization, Analytics, Controls), each with distinctive
  // multi-word phrases so they never need to out-rank a generic entry.
  { keywords: ['dialogue node', 'dialogue line', 'conversation node', 'branching dialogue', 'dialogue tree'], collection: 'dialogueNodes', subtype: 'npc-response', generate: (rng) => generateDialogueNode(rng, 'npc-response'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Write & VO-direct: ${i.name}` }) },
  { keywords: ['player choice', 'dialogue choice'], collection: 'dialogueNodes', subtype: 'player-choice', generate: (rng) => generateDialogueNode(rng, 'player-choice'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Write & VO-direct: ${i.name}` }) },
  { keywords: ['playtest', 'play test'], collection: 'playtestSessions', subtype: 'internal-test', generate: (rng) => generatePlaytestSession(rng, 'internal-test'), taskFor: (i) => ({ category: 'qa', estimateHours: 2, title: `Triage playtest findings: ${i.name}` }) },
  { keywords: ['liveops event', 'live ops event', 'liveops calendar', 'battle pass season', 'seasonal event', 'store rotation'], collection: 'liveOpsEvents', subtype: 'seasonal-event', generate: (rng) => generateLiveOpsEvent(rng, 'seasonal-event'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Plan LiveOps event: ${i.name}` }) },
  { keywords: ['localization string', 'loc string', 'translation string'], collection: 'locStrings', subtype: 'ui-text', generate: (rng) => generateLocString(rng, 'ui-text'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Translate: ${i.name}` }) },
  { keywords: ['telemetry event', 'analytics event', 'tracking event'], collection: 'telemetryEvents', subtype: 'progression-event', generate: (rng) => generateTelemetryEvent(rng, 'progression-event'), taskFor: (i) => ({ category: 'code', estimateHours: 1, title: `Implement telemetry event: ${i.name}` }) },
  { keywords: ['control binding', 'key binding', 'input binding', 'button mapping'], collection: 'controlBindings', subtype: 'keyboard-mouse', generate: (rng) => generateControlBinding(rng, 'keyboard-mouse'), taskFor: (i) => ({ category: 'code', estimateHours: 1, title: `Wire up input binding: ${i.name}` }) },
  // Phase 54 additions — deeper subtypes added to the six Phase 53 modules.
  { keywords: ['companion banter', 'banter pair'], collection: 'dialogueNodes', subtype: 'companion-banter', generate: (rng) => generateDialogueNode(rng, 'companion-banter'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Write & VO-direct: ${i.name}` }) },
  { keywords: ['monologue'], collection: 'dialogueNodes', subtype: 'monologue', generate: (rng) => generateDialogueNode(rng, 'monologue'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Write & VO-direct: ${i.name}` }) },
  { keywords: ['accessibility test', 'accessibility playtest'], collection: 'playtestSessions', subtype: 'accessibility-test', generate: (rng) => generatePlaytestSession(rng, 'accessibility-test'), taskFor: (i) => ({ category: 'qa', estimateHours: 2, title: `Triage playtest findings: ${i.name}` }) },
  { keywords: ['soft launch'], collection: 'playtestSessions', subtype: 'soft-launch', generate: (rng) => generatePlaytestSession(rng, 'soft-launch'), taskFor: (i) => ({ category: 'qa', estimateHours: 2, title: `Triage playtest findings: ${i.name}` }) },
  { keywords: ['esports tournament'], collection: 'liveOpsEvents', subtype: 'esports-tournament', generate: (rng) => generateLiveOpsEvent(rng, 'esports-tournament'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Plan LiveOps event: ${i.name}` }) },
  { keywords: ['charity event'], collection: 'liveOpsEvents', subtype: 'charity-event', generate: (rng) => generateLiveOpsEvent(rng, 'charity-event'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Plan LiveOps event: ${i.name}` }) },
  { keywords: ['emergency hotfix'], collection: 'liveOpsEvents', subtype: 'emergency-hotfix', generate: (rng) => generateLiveOpsEvent(rng, 'emergency-hotfix'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Plan LiveOps event: ${i.name}` }) },
  { keywords: ['voice script'], collection: 'locStrings', subtype: 'voice-script', generate: (rng) => generateLocString(rng, 'voice-script'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Translate: ${i.name}` }) },
  { keywords: ['patch notes text', 'patch note text'], collection: 'locStrings', subtype: 'patch-notes-text', generate: (rng) => generateLocString(rng, 'patch-notes-text'), taskFor: (i) => ({ category: 'writing', estimateHours: 1, title: `Translate: ${i.name}` }) },
  { keywords: ['ad event'], collection: 'telemetryEvents', subtype: 'ad-event', generate: (rng) => generateTelemetryEvent(rng, 'ad-event'), taskFor: (i) => ({ category: 'code', estimateHours: 1, title: `Implement telemetry event: ${i.name}` }) },
  { keywords: ['churn prediction'], collection: 'telemetryEvents', subtype: 'churn-prediction-event', generate: (rng) => generateTelemetryEvent(rng, 'churn-prediction-event'), taskFor: (i) => ({ category: 'code', estimateHours: 1, title: `Implement telemetry event: ${i.name}` }) },
  { keywords: ['steam deck', 'handheld binding'], collection: 'controlBindings', subtype: 'steam-deck-handheld', generate: (rng) => generateControlBinding(rng, 'steam-deck-handheld'), taskFor: (i) => ({ category: 'code', estimateHours: 1, title: `Wire up input binding: ${i.name}` }) },
  { keywords: ['motion control'], collection: 'controlBindings', subtype: 'motion-control-mobile', generate: (rng) => generateControlBinding(rng, 'motion-control-mobile'), taskFor: (i) => ({ category: 'code', estimateHours: 1, title: `Wire up input binding: ${i.name}` }) },
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
  { keywords: ['achievement', 'trophy', 'trophies'], collection: 'achievements', subtype: 'bronze', generate: (rng) => generateAchievement(rng, 'bronze'), taskFor: (i) => ({ category: 'design', estimateHours: 1, title: `Wire up unlock tracking: ${i.name}` }) },
];

function extractCount(text, def = 1) {
  const m = text.match(/\b(\d{1,3})\b/);
  if (!m) return def;
  return Math.max(1, Math.min(200, parseInt(m[1], 10)));
}

function formatAudit() {
  const { findings, summary } = runProjectAudit();
  if (!findings.length) return `Audit complete: ${summary}`;
  const lines = findings.map(f => `${f.severity === 'warning' ? '⚠️' : 'ℹ️'} ${f.message}`);
  return `Project audit — ${summary}:\n\n${lines.join('\n')}`;
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

// For the multi-entity generator variants (Legendary Set, Faction Roster,
// Boss Gauntlet, Quest Chain, ...) — these read `index`/`existing` to build
// batches of thematically-linked entities, mirroring collectionView.js's
// runGenerator rather than the one-shot `generate(rng)` shape above.
function runBulkGenerateVariant(collection, label, variantFn, count, subtypeKey) {
  store.snapshot();
  const created = [];
  for (let i = 0; i < count; i++) {
    const partial = variantFn({ index: i, subtype: subtypeKey, existing: store.list(collection) }) || {};
    const item = { id: uid(collection), tags: [], links: {}, description: '', ...partial, subtype: partial.subtype || subtypeKey, createdAt: nowISO(), updatedAt: nowISO() };
    store.project.collections[collection].push(item);
    created.push(item);
  }
  store.commit(`Assistant: ${label}`);
  store.logActivity(`Assistant generated a ${label.toLowerCase()} (${count} ${COLLECTIONS[collection].label.toLowerCase()})`, { icon: '🤖' });
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
• "audit the project" / "what's missing" (finds unlinked entities, missing rewards, empty descriptions and untouched design docs)
• "auto-link things" / "fix links" (links quest givers/locations, enemy spawn biomes, boss drops and level biomes/enemies wherever there's exactly one sane candidate)
• "generate a legendary set" (matched weapon+armor+accessory) / "generate a starter loadout"
• "generate a faction roster" (leader + themed members) / "generate a boss gauntlet" (escalating difficulty sequence)
• "generate a continent" (large, multi-biome world entry)
• "generate a quest chain" (a linked multi-stage story arc)
• "suggest a genre mashup" (seeds a pillar + USP from a real, researched untried genre combination — see the Industry Research Brief in Documentation)

I can generate: weapons, armour, accessories, consumables, materials, currencies, relics, gems, throwables, ammunition, tools, deployables, loot containers, enemies, bosses, elites, rivals, mentors, guards, cultists, tamed pets, NPCs, companions, merchants, wildlife, biomes, regions, cities, planets, galaxies, factions, shrines, ruins, trade routes, capital cities, colonies, wilderness preserves, underwater zones, sky zones, dimensions, quests (including escort/collection/investigation/timed-event/rescue/heist/bounty/infiltration/sabotage/tournament/diplomacy), levels (including boss arenas, hubs, stealth levels, racing tracks, tutorials), abilities, ultimates, auras, execute finishers, enrage timers, combo strings, environmental hazards, UI screens (including tutorials, notifications, dialogue boxes, crafting, leaderboards, pause menus, character creation, quest logs, minimaps, chat windows, party frames, boss health overlays, photo mode), audio cues (including stingers, jingles, boss themes, cutscene scores, leitmotifs, foley packs, radio chatter, victory fanfares, defeat stingers), art prompts (including box art, icons, weapon skins, mood boards, texture/lighting studies, turnarounds, splash screens, posters, storyboards, skyboxes), achievements/trophies, dialogue nodes and player choices, playtest sessions, LiveOps events (seasonal events, battle pass seasons, store rotations), localization strings, telemetry/analytics events and input control bindings — plus the themed multi-entity variants above.`;

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
  if (/\baudit\b/.test(lower) || /what'?s missing/.test(lower) || /\bgaps?\b/.test(lower)) {
    return formatAudit();
  }
  if (/\blink/.test(lower) && /(auto|suggest|fix|up)/.test(lower)) {
    const pending = suggestLinks();
    if (!pending.length) return "Nothing to auto-link right now — every unambiguous link is already set. Anything left needs a human judgment call.";
    const applied = applyAllLinkSuggestions();
    return `Applied ${applied} auto-link suggestion(s): ${pending.slice(0, 8).map(s => `${s.field} on an entity → ${s.valueLabel}`).join(', ')}${pending.length > 8 ? ` (+${pending.length - 8} more)` : ''}. Open the Dashboard's Auto-Link panel or Ctrl+Z to review/undo.`;
  }
  if (/legendary set|matched set/.test(lower)) {
    const count = extractCount(lower, 3);
    const created = runBulkGenerateVariant('items', 'Legendary Set', generateLegendarySetItem, count);
    return `Created a legendary set of ${created.length} matched items: ${created.map(c => c.name).join(', ')}. Open Item Studio to review.`;
  }
  if (/starter loadout/.test(lower)) {
    const count = extractCount(lower, 4);
    const created = runBulkGenerateVariant('items', 'Starter Loadout', generateStarterLoadoutItem, count);
    return `Created a starter loadout of ${created.length} items: ${created.map(c => c.name).join(', ')}. Open Item Studio to review.`;
  }
  if (/faction roster/.test(lower)) {
    const count = extractCount(lower, 6);
    const created = runBulkGenerateVariant('characters', 'Faction Roster', generateFactionRosterMember, count);
    return `Created a faction roster of ${created.length}: ${created.map(c => c.name).join(', ')}. Open Character Studio to review.`;
  }
  if (/boss gauntlet/.test(lower)) {
    const count = extractCount(lower, 5);
    const created = runBulkGenerateVariant('characters', 'Boss Gauntlet', generateGauntletBoss, count);
    return `Created a boss gauntlet of ${created.length} escalating bosses: ${created.map(c => c.name).join(', ')}. Open Character Studio to review.`;
  }
  if (/\bcontinent\b/.test(lower)) {
    const created = runBulkGenerate({ collection: 'biomes', subtype: 'region', generate: (rng) => generateContinent(rng, 'region'), taskFor: (i) => ({ category: 'design', estimateHours: 6, title: `Build out: ${i.name}` }) }, 1);
    return `Created a new continent: ${created[0].name}. Open World Builder to review.`;
  }
  if (/quest chain/.test(lower)) {
    const count = extractCount(lower, 5);
    const created = runBulkGenerateVariant('quests', 'Quest Chain', generateQuestChainEntry, count, 'main');
    return `Created a ${created.length}-stage quest chain: ${created.map(c => c.name).join(' → ')}. Open Quest Designer to review.`;
  }
  if (/mashup|genre blend|combine genres|blend genres/.test(lower)) {
    const { combo } = generateMashupBrief();
    return `Genre mashup suggestion: **${combo.name}** (${combo.combo.join(' + ')}). ${combo.rationale} Added as a pillar + USP in Game Designer — open it to build the concept out further.`;
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
