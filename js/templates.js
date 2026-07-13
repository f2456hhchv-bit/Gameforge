// One-click genre starter packs. Each seeds a realistic slice of pillars,
// world, characters, items, quests, a level and combat abilities into a
// brand-new project so a zero-code user sees a populated, linked project
// immediately instead of a blank slate.
import { uid, nowISO, pick, pickN } from './util.js';
import { store } from './store.js';
import { rngFor } from './generators/procedural.js';
import { autoTask } from './taskHooks.js';
import { generatePlace, generateFaction, generateContinent } from './modules/world.js';
import { generateCharacter } from './modules/characters.js';
import { generateItem } from './modules/items.js';
import { generateQuest } from './modules/quests.js';
import { generateLevel } from './modules/levels.js';
import { generateAbility } from './modules/combat.js';
import {
  HORROR_THREATS, PUZZLE_MECHANICS, TOWER_DEFENSE_ENEMY_WAVES, ROGUELIKE_RUN_MODIFIERS,
  CARD_KEYWORDS, STRATEGY_RESOURCE_TYPES, FARMING_CROPS, BATTLE_ROYALE_ZONES, VISUAL_NOVEL_ARCS,
} from './generators/wordbank.js';
import { GENRE_GAPS } from './generators/genreResearch.js';

const gap = (name) => GENRE_GAPS.find(g => g.name === name);

const TASK_DEFAULTS = {
  characters: { category: 'art', estimateHours: 5, title: (i) => `Model, rig & animate: ${i.name}` },
  items: { category: 'art', estimateHours: 2, title: (i) => `Create icon/model art: ${i.name}` },
  biomes: { category: 'design', estimateHours: 5, title: (i) => `Build out: ${i.name}` },
  quests: { category: 'writing', estimateHours: 5, title: (i) => `Write & implement quest: ${i.name}` },
  levels: { category: 'design', estimateHours: 10, title: (i) => `Build level: ${i.name}` },
  combatEntries: { category: 'code', estimateHours: 3, title: (i) => `Implement: ${i.name}` },
};

// Generator functions only return type-specific fields — the *subtype* is
// always applied by the caller (matching the pattern collectionView.js and
// assistant.js use), never assumed to already be present on the return value.
function seed(collection, partial, { subtype, withTask = true, overrides = {} } = {}) {
  const item = {
    id: uid(collection), tags: [], links: {}, description: '',
    ...partial,
    ...(subtype ? { subtype } : {}),
    ...overrides,
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  store.project.collections[collection].push(item);
  if (withTask && TASK_DEFAULTS[collection]) autoTask(collection, item, TASK_DEFAULTS[collection]);
  return item;
}

const seedPlace = (rng, subtype) => seed('biomes', generatePlace(rng, subtype), { subtype });
const seedFaction = (rng) => seed('biomes', generateFaction(rng), { subtype: 'faction' });
const seedCharacter = (rng, subtype, overrides = {}) => seed('characters', generateCharacter(rng, subtype), { subtype, overrides });
const seedItem = (rng, subtype) => seed('items', generateItem(rng, subtype), { subtype });
const seedQuest = (rng, subtype, overrides = {}) => seed('quests', generateQuest(rng, subtype), { subtype, overrides });
const seedLevel = (rng, overrides = {}) => seed('levels', generateLevel(rng), { overrides });
const seedAbility = (rng) => seed('combatEntries', generateAbility(rng), { subtype: 'ability' });

function seedPillar(name, statement, evidence = []) {
  return seed('designDocs', { name, statement, evidence }, { subtype: 'pillar', withTask: false });
}
function seedCoreLoop(steps, rewardFeedback, loopLengthMinutes = 8) {
  return seed('designDocs', { name: 'Core Gameplay Loop', loopSteps: steps, loopLengthMinutes, rewardFeedback }, { subtype: 'core-loop', withTask: false });
}
function seedUSP(statement, proofPoints = []) {
  return seed('designDocs', { name: 'Unique Selling Proposition', statement, proofPoints }, { subtype: 'usp', withTask: false });
}
function seedDifficulty(modes, scalingNotes) {
  return seed('designDocs', { name: 'Difficulty', modes, scalingNotes, accessibilityOptions: ['Colourblind modes', 'Remappable controls'] }, { subtype: 'difficulty', withTask: false });
}

export const TEMPLATES = [
  {
    key: 'blank', label: 'Blank Project', icon: '📄',
    description: 'Start from nothing and build it up yourself.',
    meta: {},
    apply: () => {},
  },
  {
    key: 'fantasy-rpg', label: 'Fantasy Action RPG', icon: '⚔️',
    description: 'Pillars, a starter world, a boss, a loot table, a quest chain and a level — ready to expand.',
    meta: { genre: 'Action RPG', platform: ['PC', 'PlayStation', 'Xbox'], engine: 'Unreal Engine' },
    apply: () => {
      const rng = rngFor('fantasy-rpg-' + Date.now());
      seedPillar('Every fight is a puzzle', 'Enemies telegraph clearly; player skill (dodge/parry/positioning) matters more than gear level.', ['Parryable heavy attacks', 'Elemental weaknesses']);
      seedPillar('The world remembers your choices', 'Faction reputation and quest outcomes visibly change how the world reacts to the player.');
      seedCoreLoop(['Explore', 'Encounter Challenge', 'Overcome or Retreat', 'Collect Loot', 'Upgrade Gear', 'Return to Explore'], 'Visible power growth + a narrative beat every 2-3 loops.');
      seedUSP('A tightly-scoped action RPG where every enemy encounter is a readable puzzle, not a stat check.', ['No difficulty spikes from gear gates', 'Full parry/dodge toolkit from hour one']);
      seedDifficulty(['Story', 'Normal', 'Hard', 'Nightmare'], 'Nightmare adds a 4th boss phase and removes healing-item auto-pickup.');

      const forest = seedPlace(rng, 'biome');
      const volcanic = seedPlace(rng, 'biome');
      seedFaction(rng);

      seedCharacter(rng, 'player', { name: 'The Wanderer' });
      const enemies = Array.from({ length: 3 }, () => seedCharacter(rng, 'enemy'));
      const boss = seedCharacter(rng, 'boss');
      const npc = seedCharacter(rng, 'npc');
      seedCharacter(rng, 'merchant');

      const weapons = Array.from({ length: 4 }, () => seedItem(rng, 'weapon'));
      const armor = Array.from({ length: 2 }, () => seedItem(rng, 'armor'));
      seedItem(rng, 'consumable');
      seedItem(rng, 'currency');

      boss.links.drops = weapons.slice(0, 2).map(w => w.id);
      enemies[0].links.drops = [armor[0].id];
      enemies.forEach(e => { e.links.spawnBiome = forest.id; });
      boss.links.spawnBiome = volcanic.id;

      const mainQuest = seedQuest(rng, 'main', { name: 'The Ember Crown' });
      mainQuest.links.giver = npc.id;
      mainQuest.links.location = volcanic.id;
      seedQuest(rng, 'side');

      const level = seedLevel(rng);
      level.links = { biome: forest.id, enemies: enemies.map(e => e.id), lootTable: weapons.map(w => w.id) };

      seedAbility(rng);
      seedAbility(rng);
      store.logActivity('Seeded project from the Fantasy Action RPG starter pack', { icon: '✨' });
    },
  },
  {
    key: 'scifi-shooter', label: 'Sci-Fi Shooter', icon: '🔫',
    description: 'Weapon sandbox, robotic enemies, a station biome and an arena level for fast iteration.',
    meta: { genre: 'FPS', platform: ['PC', 'PlayStation', 'Xbox'], engine: 'Unreal Engine' },
    apply: () => {
      const rng = rngFor('scifi-shooter-' + Date.now());
      seedPillar('Every weapon feels distinct', 'Recoil pattern, reload ritual and kill-feedback are unique per weapon archetype.');
      seedPillar('Momentum never stops', 'Movement (slide/mantle/dash) is always faster than standing still and shooting.');
      seedCoreLoop(['Drop In', 'Traverse for Position', 'Engage', 'Loot Fallen Enemies', 'Extract or Push'], 'Weapon mastery unlocks new attachments every few matches.', 12);
      seedUSP('Momentum-first arena shooter — mobility tech is as important as aim.', ['Wall-run + slide-cancel combo tech', 'No hitscan sniper one-shots below Hard']);
      seedDifficulty(['Casual', 'Standard', 'Hardcore'], 'Hardcore removes the minimap and HP regen.');

      const station = seedPlace(rng, 'city');

      const enemies = Array.from({ length: 4 }, () => seedCharacter(rng, 'enemy'));
      const boss = seedCharacter(rng, 'boss');
      enemies.forEach(e => { e.links.spawnBiome = station.id; });

      const weapons = Array.from({ length: 5 }, () => seedItem(rng, 'weapon'));
      seedItem(rng, 'armor');
      seedItem(rng, 'consumable');
      boss.links.drops = weapons.slice(0, 1).map(w => w.id);

      seedQuest(rng, 'world-event', { name: 'Signal from the Wreck' });

      const level = seedLevel(rng);
      level.links = { biome: station.id, enemies: enemies.map(e => e.id), lootTable: weapons.map(w => w.id) };

      seedAbility(rng);
      store.logActivity('Seeded project from the Sci-Fi Shooter starter pack', { icon: '✨' });
    },
  },
  {
    key: 'metroidvania', label: 'Metroidvania', icon: '🗺️',
    description: 'Interconnected biomes, ability-gated accessories, and a boss guarding the way forward.',
    meta: { genre: 'Metroidvania', platform: ['PC', 'Nintendo Switch'], engine: 'Godot' },
    apply: () => {
      const rng = rngFor('metroidvania-' + Date.now());
      seedPillar('Every new ability re-opens the whole map', 'Traversal upgrades (dash/double-jump/wall-climb) are the primary reward, not stat sticks.');
      seedPillar('Getting lost is part of the fun', 'Minimal hand-holding; the map itself teaches you where you haven\'t been.');
      seedCoreLoop(['Explore Until Blocked', 'Find/Earn New Ability', 'Backtrack With New Tech', 'Reach New Area', 'Repeat'], 'Every ability unlocks 2-3 previously-seen locked doors.', 10);
      seedUSP('A tightly interconnected map where backtracking is discovery, not busywork.', ['Every room reachable within 3 ability tiers', 'Fast-travel unlocks only after full map reveal']);
      seedDifficulty(['Explorer', 'Standard', 'Nightmare'], 'Explorer mode adds an optional on-screen path hint.');

      const caves = seedPlace(rng, 'underground');
      seedPlace(rng, 'biome');

      const wildlife = Array.from({ length: 2 }, () => seedCharacter(rng, 'wildlife'));
      const boss = seedCharacter(rng, 'boss');
      const npc = seedCharacter(rng, 'npc');
      wildlife.forEach(w => { w.links.spawnBiome = caves.id; });
      boss.links.spawnBiome = caves.id;

      const accessories = Array.from({ length: 3 }, () => seedItem(rng, 'accessory'));
      seedItem(rng, 'consumable');
      boss.links.drops = [accessories[0].id];

      const mainQuest = seedQuest(rng, 'main', { name: 'Descent Into the Hollow' });
      mainQuest.links.giver = npc.id;
      mainQuest.links.location = caves.id;

      const level = seedLevel(rng, { layoutType: 'Metroidvania' });
      level.links = { biome: caves.id, enemies: wildlife.map(w => w.id) };

      seedAbility(rng);
      store.logActivity('Seeded project from the Metroidvania starter pack', { icon: '✨' });
    },
  },
  {
    key: 'cozy-life-sim', label: 'Cozy Life Sim', icon: '🌻',
    description: 'A village, friendly NPCs, crafting materials and repeatable daily quests — no combat, no fail states.',
    meta: { genre: 'Life Sim', platform: ['PC', 'Nintendo Switch', 'Mobile (iOS)'], engine: 'Unity' },
    apply: () => {
      const rng = rngFor('cozy-life-sim-' + Date.now());
      seedPillar('There is no way to lose', 'No fail states, no time pressure that punishes exploration — only gentle momentum.');
      seedPillar('Every villager remembers you', 'NPC relationships deepen with repeated, specific interactions, not generic gifting.');
      seedCoreLoop(['Wake Up', 'Tend to Tasks (farm/craft/fish)', 'Visit Villagers', 'Gather Resources', 'Sleep'], 'A new recipe, relationship level, or town event roughly every 2-3 days.', 15);
      seedUSP('A life sim where relationships are the main progression system, not a side layer.', ['Deep per-NPC dialogue trees', 'No stamina system gating play time']);
      seedDifficulty(['Relaxed', 'Standard'], 'Relaxed removes all timers (crop spoilage, festival deadlines).');

      const village = seedPlace(rng, 'biome');

      const npcs = Array.from({ length: 4 }, () => seedCharacter(rng, 'npc'));
      seedCharacter(rng, 'merchant');
      seedCharacter(rng, 'companion');
      npcs.forEach(n => { n.links.spawnBiome = village.id; });

      Array.from({ length: 4 }, () => seedItem(rng, 'material'));
      seedItem(rng, 'currency');

      seedQuest(rng, 'repeatable', { name: 'Daily Harvest' });
      const questGiver = npcs[0];
      const q = seedQuest(rng, 'side', { name: `${questGiver.name}'s Request` });
      q.links.giver = questGiver.id;
      q.links.location = village.id;

      store.logActivity('Seeded project from the Cozy Life Sim starter pack', { icon: '✨' });
    },
  },
  {
    key: 'horror-survival', label: 'Horror Survival', icon: '🔦',
    description: 'A hostile location, a stalking threat, scarce resources and a tense main quest.',
    meta: { genre: 'Survival Horror', platform: ['PC', 'PlayStation'], engine: 'Unreal Engine' },
    apply: () => {
      const rng = rngFor('horror-survival-' + Date.now());
      const threat = pick(HORROR_THREATS, rng);
      seedPillar('Resources are always one step from empty', 'Ammo, healing and light sources are deliberately undersupplied so every encounter is a resource-management decision.');
      seedPillar('The threat is never fully understood', `The antagonist force is ${threat} — never fully explained, never fully defeated, only survived.`);
      seedCoreLoop(['Scavenge', 'Manage Resources', 'Evade or Confront the Threat', 'Find a Safehouse', 'Push Deeper'], 'Tension escalates continuously; relief is a safehouse, never a power spike.', 10);
      seedUSP(`A survival horror game built around ${threat}, where avoidance is usually smarter than confrontation.`, ['Limited-save system tied to found items', 'No combat UI feedback — you never know exact enemy HP']);
      seedDifficulty(['Story', 'Survivor', 'Nightmare'], 'Nightmare removes the map and halves found ammo.');

      const location = seedPlace(rng, 'city');
      const safehouse = seedPlace(rng, 'region');

      seedCharacter(rng, 'player', { name: 'The Survivor' });
      const threatChar = seedCharacter(rng, 'boss', { name: 'The Unseen', description: `An entity that is ${threat}.` });
      threatChar.links.spawnBiome = location.id;
      const survivorNpc = seedCharacter(rng, 'npc');
      survivorNpc.links.spawnBiome = safehouse.id;

      seedItem(rng, 'consumable');
      seedItem(rng, 'consumable');
      const keyItem = seedItem(rng, 'quest-item');
      seedItem(rng, 'material');

      const mainQuest = seedQuest(rng, 'main', { name: 'Get Out Alive' });
      mainQuest.links.giver = survivorNpc.id;
      mainQuest.links.location = location.id;
      mainQuest.rewards = [keyItem.id];

      const level = seedLevel(rng, { layoutType: 'Procedural Dungeon' });
      level.links = { biome: location.id, enemies: [threatChar.id] };
      level.secrets = [`A hidden note explaining more about ${threat}`];

      seedAbility(rng);
      store.logActivity('Seeded project from the Horror Survival starter pack', { icon: '✨' });
    },
  },
  {
    key: 'puzzle-platformer', label: 'Puzzle-Platformer', icon: '🧩',
    description: 'A mechanic-driven chamber, a small cast, and a level whose rooms are built from a single core puzzle idea.',
    meta: { genre: 'Puzzle-Platformer', platform: ['PC', 'Nintendo Switch', 'Mobile (iOS)'], engine: 'Godot' },
    apply: () => {
      const rng = rngFor('puzzle-platformer-' + Date.now());
      const mechanics = pickN(PUZZLE_MECHANICS, 2, rng);
      seedPillar('One mechanic, endless combinations', `The entire game is built on ${mechanics[0]}; new rooms recombine it rather than adding new systems.`);
      seedPillar('Failure teaches, it never punishes', 'Instant respawn at the room boundary; no lives, no resource loss on failure.');
      seedCoreLoop(['Enter Room', 'Read the Puzzle', 'Experiment', 'Solve', 'Unlock Exit'], 'A new twist on the core mechanic is introduced roughly every 4-5 rooms.', 6);
      seedUSP(`A single-mechanic puzzle-platformer built entirely around ${mechanics[0]} and ${mechanics[1]}.`, ['Zero UI during puzzle rooms', 'Every solution is discoverable through experimentation alone']);
      seedDifficulty(['Relaxed', 'Standard', 'Devious'], 'Devious removes the optional hint-glow on interactable objects.');

      const chamber = seedPlace(rng, 'region');
      seedCharacter(rng, 'player', { name: 'The Tinkerer' });
      const companion = seedCharacter(rng, 'companion', { description: 'A small drone that narrates hints without ever giving away the solution.' });
      companion.links.spawnBiome = chamber.id;

      const collectible = seedItem(rng, 'quest-item');
      seedItem(rng, 'quest-item');

      const mainQuest = seedQuest(rng, 'main', { name: 'The Last Mechanism' });
      mainQuest.links.location = chamber.id;
      mainQuest.rewards = [collectible.id];

      const level = seedLevel(rng, { layoutType: 'Linear', puzzles: mechanics });
      level.links = { biome: chamber.id };
      level.rewardPlacement = 'Optional rooms hide collectibles behind a harder variant of the same puzzle mechanic.';

      store.logActivity('Seeded project from the Puzzle-Platformer starter pack', { icon: '✨' });
    },
  },
  {
    key: 'tower-defense', label: 'Tower Defense', icon: '🏰',
    description: 'Escalating enemy waves, a chokepoint map, and abilities to model as placeable tower behaviours.',
    meta: { genre: 'Tower Defense', platform: ['PC', 'Mobile (iOS)', 'Mobile (Android)'], engine: 'Unity' },
    apply: () => {
      const rng = rngFor('tower-defense-' + Date.now());
      const waves = pickN(TOWER_DEFENSE_ENEMY_WAVES, 4, rng);
      seedPillar('Placement is the whole game', 'There is no player-controlled unit — every decision is where and when to place or upgrade a tower.');
      seedPillar('Waves telegraph their counter', `Each wave type (starting with ${waves[0]}) has a clear visual tell for which tower type answers it best.`);
      seedCoreLoop(['Plan Defenses', 'Survive the Wave', 'Earn Resources', 'Upgrade or Place Towers', 'Next Wave'], 'A new enemy wave type is introduced roughly every 3 waves.', 12);
      seedUSP(`A tower defense game with a small, deeply-upgradeable tower roster instead of a huge shallow one — ${waves.join(', ')} each demand a different counter.`, ['No filler towers — every tower has a clear niche', 'Waves are hand-tuned, not purely randomized']);
      seedDifficulty(['Casual', 'Standard', 'Endless'], 'Endless mode removes the wave cap and scales enemy density indefinitely.');

      const map = seedPlace(rng, 'region');
      const enemyChars = waves.map(name => seedCharacter(rng, 'enemy', { name, description: `A ${name} wave unit.` }));
      enemyChars.forEach(e => { e.links.spawnBiome = map.id; });
      const boss = seedCharacter(rng, 'boss', { name: 'Siege Titan' });
      boss.links.spawnBiome = map.id;

      seedItem(rng, 'currency');
      seedItem(rng, 'material');

      seedQuest(rng, 'main', { name: 'Hold the Line' }).links.location = map.id;

      const level = seedLevel(rng, { layoutType: 'Linear' });
      level.links = { biome: map.id, enemies: enemyChars.map(e => e.id) };
      level.objectives = ['Prevent any enemy from reaching the core'];

      seedAbility(rng);
      seedAbility(rng);
      seedAbility(rng);
      store.logActivity('Seeded project from the Tower Defense starter pack', { icon: '✨' });
    },
  },
  {
    key: 'roguelike', label: 'Roguelike', icon: '💀',
    description: 'A procedural dungeon, a permadeath run structure, and modifier-driven replayability.',
    meta: { genre: 'Roguelike', platform: ['PC', 'Nintendo Switch'], engine: 'Godot' },
    apply: () => {
      const rng = rngFor('roguelike-' + Date.now());
      const modifiers = pickN(ROGUELIKE_RUN_MODIFIERS, 3, rng);
      seedPillar('Every run is different, every death is final', 'Permadeath with procedural floor layouts means no two runs play the same, and mastery carries over as player skill, not save state.');
      seedPillar('Meta-progression unlocks variety, not power', 'Between-run unlocks add new starting options and modifiers rather than raw stat increases, to keep runs fair.');
      seedCoreLoop(['Enter Run', 'Explore Floor', 'Fight and Loot', 'Choose a Modifier', 'Descend or Die'], 'A new floor biome and enemy set roughly every 3-4 floors; a permanent unlock on run end regardless of outcome.', 20);
      seedUSP('A roguelike where run modifiers actively reshape the moment-to-moment loop rather than just adjusting numbers.', modifiers);
      seedDifficulty(['Standard', 'Hardcore (no meta-unlocks)'], 'Hardcore disables all meta-progression for a pure-skill run.');

      const dungeon = seedPlace(rng, 'region');
      const enemies = Array.from({ length: 3 }, () => seedCharacter(rng, 'enemy'));
      const boss = seedCharacter(rng, 'boss', { name: 'Floor Guardian' });
      enemies.forEach(e => { e.links.spawnBiome = dungeon.id; });
      boss.links.spawnBiome = dungeon.id;

      const weapons = Array.from({ length: 3 }, () => seedItem(rng, 'weapon'));
      seedItem(rng, 'consumable');
      boss.links.drops = [weapons[0].id];

      seedQuest(rng, 'main', { name: 'Reach the Bottom Floor' }).links.location = dungeon.id;

      const level = seedLevel(rng, { layoutType: 'Procedural Dungeon' });
      level.links = { biome: dungeon.id, enemies: enemies.map(e => e.id), lootTable: weapons.map(w => w.id) };
      level.proceduralRules = `Floor layout, enemy composition and item drops re-roll every run. Available run modifiers: ${modifiers.join(' / ')}.`;

      seedAbility(rng);
      store.logActivity('Seeded project from the Roguelike starter pack', { icon: '✨' });
    },
  },
  {
    key: 'visual-novel', label: 'Visual Novel', icon: '📖',
    description: 'A small cast, branching relationship quests, and a single story arc — no combat, no levels.',
    meta: { genre: 'Visual Novel', platform: ['PC', 'Mobile (iOS)', 'Mobile (Android)'], engine: 'Ren\'Py' },
    apply: () => {
      const rng = rngFor('visual-novel-' + Date.now());
      const arc = pick(VISUAL_NOVEL_ARCS, rng);
      seedPillar('Every choice is remembered', 'Dialogue choices accumulate into relationship and reputation values that quietly gate which endings are reachable.');
      seedPillar('Character over plot', `The central arc — ${arc} — exists to put pressure on relationships, not to resolve a mystery for its own sake.`);
      seedCoreLoop(['Read a Scene', 'Make a Choice', 'See the Immediate Reaction', 'Advance a Relationship', 'Next Chapter'], 'A new arc chapter and at least one meaningful choice appear every session.', 18);
      seedUSP(`A character-focused visual novel centered on: ${arc}.`, ['Multiple mutually-exclusive endings gated by cumulative choices, not a single final decision', 'Fully voiced key scenes']);
      seedDifficulty(['Standard (with choice hints)', 'No Hints'], 'No Hints removes the UI marker that flags choices with long-term consequences.');

      const setting = seedPlace(rng, 'city');
      seedCharacter(rng, 'player', { name: 'The Protagonist' });
      const cast = Array.from({ length: 3 }, () => seedCharacter(rng, 'npc'));
      cast.forEach(c => { c.links.spawnBiome = setting.id; });

      const keepsake = seedItem(rng, 'quest-item');

      const mainQuest = seedQuest(rng, 'main', { name: arc.slice(0, 40) });
      mainQuest.description = arc;
      mainQuest.links.giver = cast[0].id;
      mainQuest.links.location = setting.id;
      mainQuest.rewards = [keepsake.id];
      mainQuest.branching = 'Each chapter offers 2-3 dialogue choices; cumulative choices determine which of the cast becomes the closing-chapter focus.';

      cast.slice(1).forEach(c => {
        const q = seedQuest(rng, 'side', { name: `${c.name}'s Arc` });
        q.links.giver = c.id;
        q.links.location = setting.id;
      });

      store.logActivity('Seeded project from the Visual Novel starter pack', { icon: '✨' });
    },
  },
  {
    key: 'strategy-4x', label: 'Strategy / 4X', icon: '🌐',
    description: 'Rival factions, a resource economy across multiple territories, and an eXplore-eXpand-eXploit-eXterminate loop.',
    meta: { genre: '4X Strategy', platform: ['PC'], engine: 'Custom' },
    apply: () => {
      const rng = rngFor('strategy-4x-' + Date.now());
      const resources = pickN(STRATEGY_RESOURCE_TYPES, 4, rng);
      seedPillar('Every territory is a tradeoff', `Managing ${resources.join(', ')} across territories forces continuous prioritization — there is no single dominant strategy.`);
      seedPillar('Diplomacy is as viable as war', 'Rival factions can be out-teched, out-negotiated or out-fought — each is a complete win path.');
      seedCoreLoop(['Explore', 'Expand', 'Exploit', 'Exterminate (or Negotiate)'], 'A new territory, tech tier or diplomatic event roughly every 5-8 turns.', 25);
      seedUSP(`A 4X strategy game with a compact ${resources.length}-resource economy designed to stay readable at any map size.`, ['AI factions pursue distinct, telegraphed win conditions', 'Diplomacy has as many win paths as conquest']);
      seedDifficulty(['Peaceful (no AI aggression)', 'Standard', 'Apocalypse (all AI factions at war turn 1)'], 'Apocalypse difficulty starts every AI faction at war with the player.');

      const home = seedPlace(rng, 'region');
      const contested = seed('biomes', generateContinent(rng, 'region'), { subtype: 'region' });

      const factionA = seedFaction(rng);
      const factionB = seedFaction(rng);
      const leaderA = seedCharacter(rng, 'npc', { name: `${factionA.name} Sovereign` });
      const leaderB = seedCharacter(rng, 'npc', { name: `${factionB.name} Sovereign` });
      leaderA.links.spawnBiome = home.id;
      leaderB.links.spawnBiome = contested.id;

      resources.forEach(() => seedItem(rng, 'currency'));
      seedItem(rng, 'quest-item');

      seedQuest(rng, 'faction', { name: `Treaty with ${factionA.name}` }).links.giver = leaderA.id;
      seedQuest(rng, 'world-event', { name: `The Struggle for ${contested.name}` }).links.location = contested.id;

      store.logActivity('Seeded project from the Strategy / 4X starter pack', { icon: '✨' });
    },
  },
  {
    key: 'deckbuilder', label: 'Card Game / Deckbuilder', icon: '🃏',
    description: 'A starter deck, keyword-driven cards, and escalating opponents to balance against.',
    meta: { genre: 'Deckbuilder', platform: ['PC', 'Mobile (iOS)'], engine: 'Unity' },
    apply: () => {
      const rng = rngFor('deckbuilder-' + Date.now());
      const keywords = pickN(CARD_KEYWORDS, 3, rng);
      seedPillar('The deck is the character', 'There is no separate gear progression — every build decision happens through which cards you keep, cut or upgrade.');
      seedPillar('Keywords compound, not stack', `Cards using ${keywords.join(', ')} are designed to combo with each other, not simply add flat value.`);
      seedCoreLoop(['Draft or Buy Cards', 'Build/Refine Deck', 'Battle', 'Earn Rewards', 'Repeat With a Stronger Deck'], 'A new keyword or card rarity tier is introduced every 2-3 battles.', 8);
      seedUSP(`A deckbuilder where ${keywords[0]} is the signature mechanic every archetype bends around.`, ['No mandatory grind — deck power comes from synergy, not card count', 'Every card is viable in at least one archetype']);
      seedDifficulty(['Standard', 'Ascension (opponents draw first)'], 'Ascension gives every opponent an extra card in their opening hand.');

      const arena = seedPlace(rng, 'region');
      const opponent = seedCharacter(rng, 'enemy', { name: 'Rival Duelist' });
      const champion = seedCharacter(rng, 'boss', { name: 'The Grandmaster' });
      opponent.links.spawnBiome = arena.id;
      champion.links.spawnBiome = arena.id;

      const cards = Array.from({ length: 4 }, () => {
        const card = seedItem(rng, 'quest-item');
        card.affixes = [pick(keywords, rng)];
        card.description = `A playable card. Keyword: ${card.affixes[0]}.`;
        return card;
      });
      seedItem(rng, 'currency');

      seedQuest(rng, 'main', { name: 'Climb the Ranked Ladder' }).links.location = arena.id;

      seedAbility(rng).description = `A card ability using the ${keywords[0]} keyword.`;
      store.logActivity('Seeded project from the Card Game / Deckbuilder starter pack', { icon: '✨' });
    },
  },
  {
    key: 'farming-sim', label: 'Farming Sim', icon: '🌾',
    description: 'A working farm, a crop economy, and a small town to sell into — deeper crop systems than a life sim.',
    meta: { genre: 'Farming Sim', platform: ['PC', 'Nintendo Switch'], engine: 'Unity' },
    apply: () => {
      const rng = rngFor('farming-sim-' + Date.now());
      const crops = pickN(FARMING_CROPS, 4, rng);
      seedPillar('The farm is the progression system', `Growing, upgrading and cross-breeding crops like ${crops.join(', ')} is the primary loop — there is no separate skill tree.`);
      seedPillar('Seasons force planning, not memorization', 'Each crop has a season window; failing to plan around it costs a full cycle, not a single day.');
      seedCoreLoop(['Plant', 'Tend (water/fertilize)', 'Harvest', 'Sell or Craft', 'Reinvest in Land/Tools'], 'A new crop, tool tier or land plot unlocks roughly every in-game season.', 15);
      seedUSP(`A farming sim with real crop-economy depth — ${crops.length} distinct crops with their own price curves, seasons and cross-breeding options.`, ['Crop prices fluctuate with a simulated town market', 'Tool upgrades change harvest mechanics, not just speed']);
      seedDifficulty(['Relaxed (no crop failure)', 'Standard'], 'Relaxed mode removes crop death from missed watering.');

      const farm = seedPlace(rng, 'region');
      const town = seedPlace(rng, 'city');

      seedCharacter(rng, 'player', { name: 'The Farmer' });
      const merchant = seedCharacter(rng, 'merchant');
      merchant.links.spawnBiome = town.id;
      const neighbor = seedCharacter(rng, 'npc');
      neighbor.links.spawnBiome = farm.id;

      crops.forEach(name => {
        const item = seedItem(rng, 'material');
        item.name = name;
        item.description = `A harvestable crop grown on the farm.`;
      });
      seedItem(rng, 'currency');

      seedQuest(rng, 'repeatable', { name: 'Weekly Harvest Quota' }).links.location = town.id;
      seedQuest(rng, 'side', { name: `${neighbor.name}'s Favor` }).links.giver = neighbor.id;

      store.logActivity('Seeded project from the Farming Sim starter pack', { icon: '✨' });
    },
  },
  {
    key: 'battle-royale', label: 'Battle Royale', icon: '🪂',
    description: 'A shrinking map, scavenged loot, rival survivors, and a last-one-standing win condition.',
    meta: { genre: 'Battle Royale', platform: ['PC', 'PlayStation', 'Xbox'], engine: 'Unreal Engine' },
    apply: () => {
      const rng = rngFor('battle-royale-' + Date.now());
      const zones = pickN(BATTLE_ROYALE_ZONES, 4, rng);
      seedPillar('The map is the real opponent', `A shrinking play area forces confrontation between rotating hotspots like ${zones.join(', ')} — you cannot out-turtle the storm.`);
      seedPillar('All power comes from the map, not a loadout', 'Players start identical and equal; every advantage is found, never chosen at the start.');
      seedCoreLoop(['Drop In', 'Loot', 'Rotate With the Zone', 'Engage or Avoid', 'Survive to the Final Circle'], 'Loot quality and enemy density both increase every zone shrink.', 20);
      seedUSP(`A battle royale built around named landmark zones (${zones.join(', ')}) instead of generic map grids, so callouts are always memorable.`, ['Zone shrink is telegraphed 60s in advance, never a surprise', 'No pay-for-power cosmetic loop']);
      seedDifficulty(['Solo', 'Duos', 'Squads'], 'Squads increases total player count and adds a shared team-loot system.');

      const island = seedPlace(rng, 'region');
      const rivals = zones.map(name => seedCharacter(rng, 'enemy', { description: `A rival survivor last seen near ${name}.` }));
      rivals.forEach(r => { r.links.spawnBiome = island.id; });

      const weapons = Array.from({ length: 4 }, () => seedItem(rng, 'weapon'));
      seedItem(rng, 'armor');
      seedItem(rng, 'consumable');

      seedQuest(rng, 'world-event', { name: 'Final Circle' }).links.location = island.id;

      const level = seedLevel(rng, { layoutType: 'Open World', rooms: zones });
      level.links = { biome: island.id, enemies: rivals.map(r => r.id), lootTable: weapons.map(w => w.id) };
      level.objectives = ['Be the last survivor standing as the zone closes'];

      store.logActivity('Seeded project from the Battle Royale starter pack', { icon: '✨' });
    },
  },
  {
    key: 'cozy-extraction', label: 'Cozy Extraction', icon: '🧺',
    description: 'A researched-gap hybrid: extraction-shooter greed-vs-safety tension, minus the violence — risk your basket, not a rifle.',
    meta: { genre: 'Cozy Extraction', platform: ['PC', 'Nintendo Switch', 'Mobile (iOS)'], engine: 'Unity' },
    apply: () => {
      const rng = rngFor('cozy-extraction-' + Date.now());
      const g = gap('Cozy Extraction');
      seedPillar('Every trip is a choice, not a fight', g.rationale);
      seedPillar('Getting home is the real objective', 'The forage grounds only get more rewarding — and riskier to leave — the deeper you go; there is no combat, only the decision to turn back.');
      seedCoreLoop(['Gather', 'Assess the Risk', 'Extract or Push Deeper', 'Return Home', 'Process & Sell the Haul'], 'Each trip banks a full basket only if you make it home; pushing one zone deeper roughly doubles the haul and the chance of losing it all.', 12);
      seedUSP(`A cozy game with a genuine extraction-shooter tension loop: ${g.rationale}`, ['No combat — the only threat is losing what you\'re carrying', 'A "just one more zone" risk curve borrowed straight from extraction shooters']);
      seedDifficulty(['Relaxed (never lose your basket)', 'Standard'], 'Relaxed mode removes the loss-on-failure entirely, for players who just want the gathering loop.');

      const groundsNear = seedPlace(rng, 'region');
      const groundsFar = seedPlace(rng, 'region');
      const home = seedPlace(rng, 'city');

      seedCharacter(rng, 'player', { name: 'The Forager' });
      const rival = seedCharacter(rng, 'npc', { description: 'A rival forager who trades tips on the deepest, riskiest zones.' });
      rival.links.spawnBiome = home.id;

      Array.from({ length: 4 }, () => seedItem(rng, 'material'));
      seedItem(rng, 'currency');
      const rareGood = seedItem(rng, 'quest-item');

      const mainQuest = seedQuest(rng, 'main', { name: 'The Deepest Basket' });
      mainQuest.links.giver = rival.id;
      mainQuest.links.location = groundsFar.id;
      mainQuest.rewards = [rareGood.id];
      mainQuest.description = 'Reach the deepest forage zone and make it home with a full basket — without losing everything to the one setback that would cost you the whole trip.';

      seedQuest(rng, 'repeatable', { name: 'Daily Forage Run' }).links.location = groundsNear.id;

      store.logActivity('Seeded project from the Cozy Extraction starter pack', { icon: '✨' });
    },
  },
  {
    key: 'grand-tactics', label: 'Grand Tactics', icon: '🏰',
    description: 'A researched-gap hybrid: full 4X empire strategy where named heroes are fought directly by the player in real-time duels, not an abstracted battle screen.',
    meta: { genre: 'Grand Tactics', platform: ['PC'], engine: 'Custom' },
    apply: () => {
      const rng = rngFor('grand-tactics-' + Date.now());
      const g = gap('Grand Tactics');
      const resources = pickN(STRATEGY_RESOURCE_TYPES, 3, rng);
      seedPillar('The empire and the duel share one set of stakes', g.rationale);
      seedPillar('Every hero fought is an empire decision', `Losing a duel costs the empire real ${resources.join('/')} — there is no safety net between the strategy layer and the action layer.`);
      seedCoreLoop(['Command the Empire', 'Deploy a Hero', 'Fight a Real-Time Duel', 'Annex Territory on Victory', 'Reinforce and Expand'], 'Every 4X turn cycle can trigger a hero duel; winning expands territory, losing costs resources and morale.', 20);
      seedUSP(`A 4X strategy game with skill-based hero combat fought directly by the player: ${g.rationale}`, ['No abstracted "auto-resolve" combat — every hero duel is played, not calculated', 'Empire resource yields and hero build strength are the same economy']);
      seedDifficulty(['Strategist (auto-resolve duels available)', 'Champion (all duels must be played)'], 'Champion mode disables auto-resolve — every duel is fought by hand.');

      const homeland = seedPlace(rng, 'region');
      const contested = seed('biomes', generateContinent(rng, 'region'), { subtype: 'region' });
      const rivalFaction = seedFaction(rng);

      seedCharacter(rng, 'player', { name: 'The Champion' });
      const rivalHero = seedCharacter(rng, 'boss', { name: `${rivalFaction.name} Champion` });
      rivalHero.links.spawnBiome = contested.id;

      const weapons = Array.from({ length: 2 }, () => seedItem(rng, 'weapon'));
      resources.forEach(() => seedItem(rng, 'currency'));
      rivalHero.links.drops = [weapons[0].id];

      seedQuest(rng, 'faction', { name: `The Struggle for ${contested.name}` }).links.location = contested.id;

      const arena = seedLevel(rng, { layoutType: 'Arena' });
      arena.links = { biome: contested.id, enemies: [rivalHero.id], lootTable: weapons.map(w => w.id) };
      arena.objectives = ['Defeat the rival champion in single combat to annex this territory'];

      seedAbility(rng);
      seedAbility(rng);
      store.logActivity('Seeded project from the Grand Tactics starter pack', { icon: '✨' });
    },
  },
  {
    key: 'roguelite-visual-novel', label: 'Narrative Roguelite', icon: '📖',
    description: 'A researched-gap hybrid: permadeath run structure applied to branching narrative — each run is a compressed story arc whose unlocks reshape the next run\'s reachable branches.',
    meta: { genre: 'Roguelite Visual Novel', platform: ['PC', 'Mobile (iOS)'], engine: 'Ren\'Py' },
    apply: () => {
      const rng = rngFor('roguelite-visual-novel-' + Date.now());
      const g = gap('Roguelite Visual Novel');
      const arc = pick(VISUAL_NOVEL_ARCS, rng);
      const modifiers = pickN(ROGUELIKE_RUN_MODIFIERS, 2, rng);
      seedPillar('Every run is one full, compressed story', g.rationale);
      seedPillar('Dying (or failing) is a valid ending, not a loss screen', `A run that ends badly still unlocks new dialogue options and character knowledge for the next run — modeled loosely on run modifiers like "${modifiers[0]}".`);
      seedCoreLoop(['Begin a New Run', 'Make Choices Under Time Pressure', 'Reach an Ending', 'Bank Meta-Progress (memories, relationships)', 'Begin Again With New Options'], 'A new dialogue branch, character truth, or relationship option unlocks after nearly every run, regardless of ending quality.', 15);
      seedUSP(`A visual novel with genuine roguelite run structure: ${g.rationale}`, [`Central arc: ${arc}`, 'No single "true" playthrough — meta-progression is entirely about unlocking more of the story, not getting stronger']);
      seedDifficulty(['Standard', 'No Memory Carryover (one true run only)'], 'No Memory Carryover disables meta-progression for a single, high-stakes linear playthrough.');

      const setting = seedPlace(rng, 'city');
      seedCharacter(rng, 'player', { name: 'The Wanderer' });
      const cast = Array.from({ length: 3 }, () => seedCharacter(rng, 'npc'));
      cast.forEach(c => { c.links.spawnBiome = setting.id; });

      const keepsake = seedItem(rng, 'quest-item');

      const mainQuest = seedQuest(rng, 'main', { name: arc.slice(0, 40) });
      mainQuest.description = arc;
      mainQuest.links.giver = cast[0].id;
      mainQuest.links.location = setting.id;
      mainQuest.rewards = [keepsake.id];
      mainQuest.branching = `Each run replays this arc from a new angle; failure states unlock rather than block content. Run modifiers in rotation: ${modifiers.join(', ')}.`;

      store.logActivity('Seeded project from the Roguelite Visual Novel starter pack', { icon: '✨' });
    },
  },
  {
    key: 'deckbuilder-explorer', label: 'Deckbuilder Explorer', icon: '🗺️',
    description: 'A researched-gap hybrid: cards as traversal and environmental-puzzle tools across a full open world, not just a combat-encounter resource.',
    meta: { genre: 'Deckbuilder Explorer', platform: ['PC', 'Nintendo Switch'], engine: 'Unity' },
    apply: () => {
      const rng = rngFor('deckbuilder-explorer-' + Date.now());
      const g = gap('Deckbuilder Explorer');
      const keywords = pickN(CARD_KEYWORDS, 3, rng);
      seedPillar('Cards move you, not just your damage number', g.rationale);
      seedPillar('The whole world is a deckbuilding puzzle', `A ${keywords[0]} card might cross a chasm in one region and stagger a boss in another — the same card, read differently by the terrain.`);
      seedCoreLoop(['Explore the Open World', 'Draw Cards for Traversal or Combat', 'Discover a New Card/Region', 'Expand the Deck', 'Push Into a Harder Region'], 'A new traversal-capable card or open region unlocks roughly every hour of exploration.', 15);
      seedUSP(`A deckbuilder where the deck is the map key: ${g.rationale}`, [`Signature keywords: ${keywords.join(', ')}`, 'No separate "combat mode" — cards are drawn identically whether crossing terrain or fighting']);
      seedDifficulty(['Standard', 'Thin Deck (fewer cards, harder choices)'], 'Thin Deck mode starts with half the usual starting deck size.');

      const overworld = seedPlace(rng, 'region');
      const frontier = generateContinent(rng, 'region');
      const frontierEntry = seed('biomes', frontier, { subtype: 'region' });

      const guardian = seedCharacter(rng, 'boss', { description: 'Guards the path into the frontier; its attacks telegraph which card type answers them best.' });
      guardian.links.spawnBiome = frontierEntry.id;
      const enemy = seedCharacter(rng, 'enemy');
      enemy.links.spawnBiome = overworld.id;

      const cards = Array.from({ length: 4 }, () => {
        const card = seedItem(rng, 'quest-item');
        card.affixes = [pick(keywords, rng)];
        card.description = `A playable card usable for traversal or combat. Keyword: ${card.affixes[0]}.`;
        return card;
      });
      seedItem(rng, 'currency');
      guardian.links.drops = [cards[0].id];

      seedQuest(rng, 'main', { name: 'Beyond the Guarded Pass' }).links.location = frontierEntry.id;

      const level = seedLevel(rng, { layoutType: 'Open World' });
      level.links = { biome: overworld.id, enemies: [enemy.id], lootTable: cards.map(c => c.id) };

      store.logActivity('Seeded project from the Deckbuilder Explorer starter pack', { icon: '✨' });
    },
  },
  {
    key: 'branching-asymmetric-horror', label: 'Branching Asymmetric Horror', icon: '🔪',
    description: 'A researched-gap hybrid: one-vs-many asymmetric horror chases whose outcomes persist as branching narrative consequences across sessions, not just per-match stats.',
    meta: { genre: 'Branching Asymmetric Horror', platform: ['PC', 'PlayStation', 'Xbox'], engine: 'Unreal Engine' },
    apply: () => {
      const rng = rngFor('branching-asymmetric-horror-' + Date.now());
      const g = gap('Branching Asymmetric Horror');
      const threat = pick(HORROR_THREATS, rng);
      seedPillar('The chase is one session; the story is many', g.rationale);
      seedPillar('Every match writes the next one', `Whether the hunter — ${threat} — catches every survivor or none of them changes what NPCs say and what\'s possible next session, not just a scoreboard.`);
      seedCoreLoop(['Choose Hunter or Survivor', 'Play the Chase Under Time Pressure', 'Session Resolves', 'Branching Consequence Locks In', 'Next Session Reflects It'], 'Persistent world-state branches after every match, not just cosmetic unlocks.', 8);
      seedUSP(`An asymmetric horror game with Detective-style persistent branching consequences: ${g.rationale}`, [`The hunter is ${threat}`, 'Match outcomes are canon — they change future dialogue and map states, not just a rank number']);
      seedDifficulty(['Standard', 'Permanent Consequences Off (casual/practice mode)'], 'Practice mode plays matches normally but never commits their outcome to the persistent story-state.');

      const location = seedPlace(rng, 'city');
      const hunter = seedCharacter(rng, 'boss', { name: 'The Hunter', description: `An entity that is ${threat}.` });
      hunter.links.spawnBiome = location.id;
      const survivors = Array.from({ length: 3 }, () => seedCharacter(rng, 'npc'));
      survivors.forEach(s => { s.links.spawnBiome = location.id; });

      seedItem(rng, 'consumable');
      seedItem(rng, 'quest-item');

      const mainQuest = seedQuest(rng, 'main', { name: 'What the Chase Decided' });
      mainQuest.links.location = location.id;
      mainQuest.branching = 'Which survivors lived, and how the hunt ended, is tracked as persistent world-state referenced in every subsequent match\'s dialogue and objectives.';

      const level = seedLevel(rng, { layoutType: 'Arena' });
      level.links = { biome: location.id, enemies: [hunter.id] };

      store.logActivity('Seeded project from the Branching Asymmetric Horror starter pack', { icon: '✨' });
    },
  },
  {
    key: 'coop-soulslike', label: 'Co-op Soulslike', icon: '🗡️',
    description: 'A researched-gap hybrid: genuinely punishing Soulslike combat balanced from the ground up for two-player co-op, not an easy-mode co-op game or a solo Souls game with summons bolted on.',
    meta: { genre: 'Co-op Soulslike', platform: ['PC', 'PlayStation', 'Xbox'], engine: 'Unreal Engine' },
    apply: () => {
      const rng = rngFor('coop-soulslike-' + Date.now());
      const g = gap('Co-op Soulslike');
      seedPillar('Built for two from the ground up', g.rationale);
      seedPillar('Death is shared, not solo', 'Both players\' dropped currency piles up at the death location together; recovering it requires surviving back there as a pair, not just one player\'s risk.');
      seedCoreLoop(['Explore a Punishing Area Together', 'Die and Learn Its Patterns', 'Retrieve Shared Lost Currency', 'Defeat a Boss as a Duo', 'Unlock a Shortcut Back to the Hub'], 'Bonfire-style rest points respawn all non-boss enemies but are always co-located so neither player restocks alone.', 14);
      seedUSP(`A Soulslike balanced for two, not one-plus-a-summon: ${g.rationale}`, ['Boss movesets are authored around two simultaneous targets, not tuned for solo and patched for co-op', 'Shared risk: both players\' currency is lost and recovered together']);
      seedDifficulty(['Standard', 'Solo Viable (rebalanced for one)'], 'Solo Viable retunes boss aggression and health for a single player, since the base game assumes two.');

      const dungeon = seedPlace(rng, 'region');
      const enemies = Array.from({ length: 3 }, () => seedCharacter(rng, 'enemy'));
      const boss = seedCharacter(rng, 'boss', { name: 'The Twinned Warden' });
      enemies.forEach(e => { e.links.spawnBiome = dungeon.id; });
      boss.links.spawnBiome = dungeon.id;
      boss.description = 'A boss with two simultaneous attack patterns authored for exactly two players — never trivial to tank-and-spank.';

      const weapons = Array.from({ length: 2 }, () => seedItem(rng, 'weapon'));
      seedItem(rng, 'currency');
      boss.links.drops = weapons.map(w => w.id);

      seedQuest(rng, 'main', { name: 'The Twinned Warden\'s Vigil' }).links.location = dungeon.id;

      const level = seedLevel(rng, { layoutType: 'Procedural Dungeon' });
      level.links = { biome: dungeon.id, enemies: enemies.map(e => e.id), lootTable: weapons.map(w => w.id) };
      level.checkpoints = ['Shared Bonfire — Entrance', 'Shared Bonfire — Midpoint', 'Pre-Boss (co-located)'];

      seedAbility(rng);
      seedAbility(rng);
      store.logActivity('Seeded project from the Co-op Soulslike starter pack', { icon: '✨' });
    },
  },
];
