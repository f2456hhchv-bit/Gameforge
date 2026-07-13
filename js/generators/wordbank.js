// Shared word banks for procedural text generation across all studio modules.
// Deliberately broad/generic (not tied to one IP) so it fits any genre/setting.

export const NAME_SYLLABLES = [
  'ka','ren','tho','mir','dra','val','en','shi','kor','lun','ae','fen','gorr','ith','ul',
  'zar','vex','nym','oth','rae','iss','wyn','dor','han','kel','ari','bel','cor','dex','ely',
];

export const EPITHETS = [
  'the Silent', 'the Unbroken', 'of the Hollow Crown', 'the Ashwalker', 'the Last Light',
  'the Forsworn', 'the Voidtouched', 'the Ember-Born', 'the Grey Warden', 'the Nameless',
  'the Ironclad', 'the Wanderer', 'the Bonecaller', 'the Starforged', 'the Dread Herald',
];

export const BIOME_ADJECTIVES = [
  'Sunken', 'Ashen', 'Frostbound', 'Whispering', 'Verdant', 'Forsaken', 'Molten', 'Glimmering',
  'Withered', 'Crystalline', 'Storm-Wracked', 'Silent', 'Petrified', 'Bloodmoon', 'Emerald',
  'Shattered', 'Endless', 'Drowned', 'Charred', 'Hollow',
];

export const BIOME_NOUNS = [
  'Marsh', 'Expanse', 'Reach', 'Hollow', 'Wastes', 'Vale', 'Spire', 'Depths', 'Highlands',
  'Barrens', 'Grove', 'Basin', 'Cradle', 'Rift', 'Frontier', 'Steppe', 'Sanctum', 'Wilds',
];

export const BIOME_TYPES = [
  { key: 'forest', label: 'Forest / Jungle' },
  { key: 'desert', label: 'Desert / Wasteland' },
  { key: 'tundra', label: 'Tundra / Ice' },
  { key: 'swamp', label: 'Swamp / Bog' },
  { key: 'volcanic', label: 'Volcanic' },
  { key: 'coastal', label: 'Coastal / Ocean' },
  { key: 'mountain', label: 'Mountain / Highlands' },
  { key: 'underground', label: 'Underground / Caves' },
  { key: 'urban', label: 'Urban / Ruins' },
  { key: 'celestial', label: 'Celestial / Otherworldly' },
];

export const WEATHER_BY_BIOME = {
  forest: ['Dappled sunlight', 'Heavy fog', 'Sudden rain', 'Pollen storms'],
  desert: ['Sandstorms', 'Scorching heat haze', 'Cold clear nights', 'Mirages'],
  tundra: ['Blizzards', 'Aurora skies', 'Whiteout conditions', 'Bitter wind'],
  swamp: ['Thick mist', 'Acid rain', 'Stagnant humidity', 'Bioluminescent nights'],
  volcanic: ['Ashfall', 'Ember winds', 'Sulfur clouds', 'Tremor quakes'],
  coastal: ['Tidal surges', 'Salt storms', 'Rolling fog banks', 'Monsoon rains'],
  mountain: ['Thin air', 'Rockslide tremors', 'Snow squalls', 'Lightning storms'],
  underground: ['Still, dead air', 'Spore clouds', 'Dripping condensation', 'Echo winds'],
  urban: ['Smog', 'Acid drizzle', 'Neon haze', 'Curfew silence'],
  celestial: ['Gravity flux', 'Starfall', 'Chromatic auroras', 'Time distortion'],
};

export const RESOURCE_BASE = [
  'Iron Ore', 'Silver Vein', 'Ancient Timber', 'Volatile Crystal', 'Purified Water',
  'Spirit Essence', 'Rare Herb', 'Beast Hide', 'Enchanted Dust', 'Obsidian Shard',
  'Sunstone', 'Moonpetal', 'Coral Fragment', 'Rune-etched Bone', 'Refined Coal',
];

export const HAZARD_BASE = [
  'Poison spores', 'Collapsing terrain', 'Extreme temperature', 'Toxic gas vents',
  'Predator ambush zones', 'Cursed ground', 'Unstable footing', 'Radiation pockets',
  'Flash floods', 'Falling debris', 'Magnetic anomalies', 'Corrupted wildlife',
];

export const FACTION_PREFIXES = ['Iron', 'Silver', 'Ember', 'Shadow', 'Storm', 'Blood', 'Gilded', 'Grey', 'Sun', 'Void'];
export const FACTION_SUFFIXES = ['Concord', 'Syndicate', 'Order', 'Legion', 'Circle', 'Cartel', 'Vanguard', 'Covenant', 'Dominion', 'Brotherhood'];

export const CREATURE_BASES = [
  'Wolf', 'Serpent', 'Golem', 'Wraith', 'Drake', 'Spider', 'Boar', 'Hound', 'Revenant',
  'Harpy', 'Troll', 'Sprite', 'Behemoth', 'Chimera', 'Wisp', 'Basilisk', 'Ghoul', 'Yeti',
];
export const CREATURE_MODIFIERS = [
  'Blightfang', 'Ironhide', 'Emberscale', 'Frostbitten', 'Voidborn', 'Ashen', 'Corrupted',
  'Ancient', 'Feral', 'Runic', 'Venomous', 'Molten', 'Spectral', 'Armored', 'Savage',
];

export const WEAPON_BASE = {
  sword: ['Sword', 'Blade', 'Saber', 'Longsword', 'Rapier', 'Greatsword'],
  axe: ['Axe', 'Hatchet', 'Cleaver', 'Waraxe'],
  bow: ['Bow', 'Longbow', 'Crossbow', 'Recurve'],
  staff: ['Staff', 'Wand', 'Rod', 'Scepter'],
  gun: ['Pistol', 'Rifle', 'Cannon', 'Blaster'],
  dagger: ['Dagger', 'Knife', 'Shiv', 'Kris'],
  hammer: ['Hammer', 'Mace', 'Maul', 'Warhammer'],
  polearm: ['Spear', 'Halberd', 'Lance', 'Glaive'],
};
export const WEAPON_PREFIXES = ['Ashen', 'Rune-Forged', 'Serpent\'s', 'Widowmaker', 'Sunder', 'Duskbound', 'Hollow', 'Ember', 'Frostbrand', 'Ironvein', 'Wraithbane', 'Starlit'];

export const ARMOR_PIECES = ['Helm', 'Chestplate', 'Gauntlets', 'Greaves', 'Pauldrons', 'Cloak', 'Boots', 'Shield'];
export const ACCESSORY_TYPES = ['Ring', 'Amulet', 'Talisman', 'Charm', 'Bracer', 'Sigil', 'Earring', 'Belt'];
export const CONSUMABLE_TYPES = ['Potion', 'Elixir', 'Tonic', 'Scroll', 'Draught', 'Salve', 'Brew'];
export const CURRENCY_TYPES = ['Gold Coin', 'Ancient Token', 'Soul Shard', 'Trade Chit', 'Crystal Mark'];
export const QUEST_ITEM_TYPES = ['Sealed Letter', 'Ancient Relic', 'Broken Key', 'Faded Map', 'Family Locket', 'Cursed Idol'];

export const AFFIXES = [
  'of the Bear', 'of Swiftness', 'of the Void', 'of Embers', 'of Frost', 'of Vampirism',
  'of Precision', 'of the Titan', 'of Echoes', 'of the Storm', 'of Decay', 'of Renewal',
];

export const ABILITY_VERBS = ['Strike', 'Blast', 'Surge', 'Rend', 'Shatter', 'Pulse', 'Barrage', 'Slam', 'Pierce', 'Detonate', 'Unleash', 'Channel'];
export const ABILITY_NOUNS = ['Flame', 'Frost', 'Shadow', 'Storm', 'Void', 'Blood', 'Iron', 'Light', 'Venom', 'Earth', 'Chaos', 'Spirit'];

export const STATUS_EFFECTS = [
  { name: 'Burning', type: 'Damage over Time', desc: 'Deals fire damage each turn/tick and can spread to nearby flammable surfaces.' },
  { name: 'Poisoned', type: 'Damage over Time', desc: 'Deals stacking nature damage over time; stacks refresh duration.' },
  { name: 'Frozen', type: 'Control', desc: 'Target cannot act; shatters for bonus damage if hit by a physical attack.' },
  { name: 'Stunned', type: 'Control', desc: 'Target cannot act or move for a short duration.' },
  { name: 'Weakened', type: 'Debuff', desc: 'Reduces outgoing damage dealt by the target.' },
  { name: 'Shielded', type: 'Buff', desc: 'Absorbs incoming damage up to a threshold before breaking.' },
  { name: 'Hasted', type: 'Buff', desc: 'Increases attack speed and movement speed for a duration.' },
  { name: 'Bleeding', type: 'Damage over Time', desc: 'Deals physical damage over time, increased by movement.' },
  { name: 'Silenced', type: 'Control', desc: 'Prevents the use of abilities/spells.' },
  { name: 'Marked', type: 'Debuff', desc: 'Target takes increased damage from all sources.' },
];

export const DAMAGE_TYPES = ['Physical', 'Fire', 'Frost', 'Lightning', 'Poison', 'Shadow', 'Holy', 'Arcane', 'Bleed', 'True'];

export const LORE_HOOKS = [
  'was built atop the bones of a fallen god',
  'has been fought over by three warring factions for a century',
  'was sealed away after a catastrophic ritual went wrong',
  'holds the last uncorrupted spring in the known world',
  'is slowly being reclaimed by something ancient and hungry',
  'was once the capital of an empire that vanished overnight',
  'exists in a fragile truce between rival guilds',
  'is haunted by the echoes of a war no one living remembers',
  'is the only known passage between two hostile realms',
  'was terraformed by a long-dead precursor civilization',
];

export const QUEST_VERBS = ['Recover', 'Escort', 'Investigate', 'Sabotage', 'Defend', 'Assassinate', 'Negotiate with', 'Cleanse', 'Steal from', 'Rescue'];
export const QUEST_TARGETS = ['the lost relic', 'the missing envoy', 'the corrupted shrine', 'the rival warlord', 'the besieged village', 'the sunken vault', 'the rogue experiment', 'the exiled heir', 'the smuggler convoy', 'the ancient seal'];

export const ROOM_TYPES = ['Combat Arena', 'Puzzle Chamber', 'Treasure Vault', 'Boss Arena', 'Rest Area', 'Narrative Room', 'Ambush Corridor', 'Secret Passage', 'Hub Room', 'Platforming Gauntlet'];

export const UI_SCREEN_TYPES = [
  { key: 'main-menu', label: 'Main Menu' },
  { key: 'hud', label: 'HUD' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'settings', label: 'Settings' },
  { key: 'skill-tree', label: 'Skill Tree' },
  { key: 'popup', label: 'Popup / Dialog' },
  { key: 'map', label: 'Map Screen' },
  { key: 'shop', label: 'Shop / Vendor' },
  { key: 'character-sheet', label: 'Character Sheet' },
  { key: 'loading', label: 'Loading Screen' },
];

export const AUDIO_TYPES = [
  { key: 'music', label: 'Music' },
  { key: 'sfx', label: 'Sound Effect' },
  { key: 'ambience', label: 'Ambience' },
  { key: 'voice', label: 'Voice Direction' },
  { key: 'ui-sound', label: 'UI Sound' },
];

export const MOODS = ['Tense', 'Triumphant', 'Melancholic', 'Whimsical', 'Foreboding', 'Serene', 'Chaotic', 'Nostalgic', 'Heroic', 'Eerie'];
export const LIGHTING = ['Golden hour rim light', 'Harsh noon overhead', 'Moody low-key', 'Bioluminescent glow', 'Overcast diffuse', 'Neon backlight', 'Torch-lit warm', 'Cold blue moonlight'];
export const CAMERA_ANGLES = ['3/4 hero shot', 'Top-down isometric', 'Full-body T-pose reference', 'Dynamic action pose', 'Close-up portrait', 'Wide establishing shot', 'Side profile orthographic'];
export const PALETTES = ['Muted earth tones', 'High-contrast complementary', 'Monochrome with one accent', 'Pastel desaturated', 'Neon cyberpunk', 'Warm autumnal', 'Cool arctic blues', 'Analogous jewel tones'];
export const MATERIALS = ['Weathered leather and iron', 'Polished chrome and glass', 'Cracked stone and moss', 'Silk and gold filigree', 'Rough-hewn wood and rope', 'Bio-organic chitin', 'Painted cel-shaded surfaces'];
