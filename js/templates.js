// One-click genre starter packs. Each seeds a realistic slice of pillars,
// world, characters, items, quests, a level and combat abilities into a
// brand-new project so a zero-code user sees a populated, linked project
// immediately instead of a blank slate.
import { uid, nowISO } from './util.js';
import { store } from './store.js';
import { rngFor } from './generators/procedural.js';
import { autoTask } from './taskHooks.js';
import { generatePlace, generateFaction } from './modules/world.js';
import { generateCharacter } from './modules/characters.js';
import { generateItem } from './modules/items.js';
import { generateQuest } from './modules/quests.js';
import { generateLevel } from './modules/levels.js';
import { generateAbility } from './modules/combat.js';

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
];
