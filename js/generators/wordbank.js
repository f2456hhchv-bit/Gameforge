// Shared word banks for procedural text generation across all studio modules.
// Deliberately broad/generic (not tied to one IP) so it fits any genre/setting.
// Deliberately large: combinatorics across these lists is what keeps generated
// content from ever feeling like it's repeating itself.

export const NAME_SYLLABLES = [
  'ka', 'ren', 'tho', 'mir', 'dra', 'val', 'en', 'shi', 'kor', 'lun', 'ae', 'fen', 'gorr', 'ith', 'ul',
  'zar', 'vex', 'nym', 'oth', 'rae', 'iss', 'wyn', 'dor', 'han', 'kel', 'ari', 'bel', 'cor', 'dex', 'ely',
  'mor', 'sil', 'tar', 'quin', 'ras', 'nir', 'oda', 'lys', 'vash', 'thal', 'brin', 'cael', 'dun', 'esk', 'fyr',
  'gwyn', 'hale', 'ivor', 'jael', 'kess', 'lorn', 'myra', 'nesh', 'orin', 'pyre', 'quor', 'renn', 'sae', 'tyr', 'una',
  'vor', 'wren', 'xar', 'yss', 'zeph', 'ash', 'bryn', 'cyra', 'dros', 'eryn', 'faye', 'grim', 'holt', 'ivar', 'jora',
  'lek', 'mox', 'nael', 'oro', 'pex', 'quil', 'rix', 'sorn', 'tavi', 'urn',
  'vyn', 'wex', 'xen', 'yol', 'zin', 'abra', 'bexi', 'crin', 'dael', 'eon',
  'fal', 'gael', 'hax', 'iri', 'jyn', 'kex', 'lir', 'moth', 'nyx', 'oren',
  'plith', 'quen', 'rho', 'syx', 'tul', 'uxa', 'vess', 'wyr', 'xyl', 'yara',
  'zol', 'ambri', 'brek', 'crys', 'dath', 'emil', 'fryn', 'gost', 'hilt', 'ixor',
  'jara', 'kiel', 'lonn', 'mev', 'norr', 'ova', 'pyx', 'quix', 'ryne', 'sova',
  'tesh', 'ulf', 'vane', 'wick', 'xara', 'yrn', 'zex', 'arna', 'biel', 'chor',
  'dovi', 'elen', 'fenn', 'gora', 'harn', 'irix', 'jol', 'kesa', 'luma', 'myn',
];

export const EPITHETS = [
  'the Silent', 'the Unbroken', 'of the Hollow Crown', 'the Ashwalker', 'the Last Light',
  'the Forsworn', 'the Voidtouched', 'the Ember-Born', 'the Grey Warden', 'the Nameless',
  'the Ironclad', 'the Wanderer', 'the Bonecaller', 'the Starforged', 'the Dread Herald',
  'the Oathbreaker', 'of the Drowned Court', 'the Widow-Maker', 'the Quiet Storm', 'the Last Ember',
  'the Hollowborn', 'of a Thousand Cuts', 'the Gravewalker', 'the Sunless', 'the Ever-Fasting',
  'the Bloodless', 'the Cinder King', 'of the Salt Coast', 'the Moonless', 'the Undertow',
  'the Ashen Vow', 'the Ninth Sorrow', 'of the Shattered Vale', 'the Rootless', 'the Iron Psalm',
  'the Wolf at the Door', 'the Faded Banner', 'the Hushed', 'of No Country', 'the Longest Night',
  'the Last Vow', 'of the Broken Chain', 'the Everburning', 'the Quietly Damned', 'the Tideborn',
  'the Unspoken', 'of the Fallen Choir', 'the Grave Cartographer', 'the Half-Remembered', 'the Duskbound',
  'the Ledger-Keeper', 'of the Last Census', 'the Softly Cruel', 'the Waking Ruin', 'the Un-Forgiven',
  'of the Empty Throne', 'the Ninefold', 'the Coldest Mercy', 'of the Last Harvest', 'the Loud Silence',
  'the Salt-Sworn', 'of the Drifting Isles', 'the Kindly Rot', 'the Everlate', 'of the Broken Compass',
];

export const BIOME_ADJECTIVES = [
  'Sunken', 'Ashen', 'Frostbound', 'Whispering', 'Verdant', 'Forsaken', 'Molten', 'Glimmering',
  'Withered', 'Crystalline', 'Storm-Wracked', 'Silent', 'Petrified', 'Bloodmoon', 'Emerald',
  'Shattered', 'Endless', 'Drowned', 'Charred', 'Hollow',
  'Gilded', 'Rusted', 'Weeping', 'Umbral', 'Radiant', 'Fractured', 'Sable', 'Ivory', 'Bramblewild', 'Salt-Bitten',
  'Everfrost', 'Sunscorched', 'Mistveiled', 'Bonelit', 'Thornbound', 'Duskfallen', 'Windswept', 'Mirrored', 'Cindered', 'Loambound',
  'Starlit', 'Grieving', 'Ossified', 'Amberlit', 'Feral', 'Unquiet', 'Halcyon', 'Ruinous', 'Cursed', 'Tidewrought',
  'Smouldering', 'Glasslit', 'Wolfbitten', 'Sootstained', 'Featherlight', 'Ironveiled', 'Sunwarped', 'Chainbound', 'Mossgrown', 'Nightfallen',
  'Copperlit', 'Threnodic', 'Windgnawed', 'Bramblesnared', 'Ghostlit', 'Bittersweet', 'Marrowdeep', 'Sungutted', 'Palewater', 'Farflung',
];

export const BIOME_NOUNS = [
  'Marsh', 'Expanse', 'Reach', 'Hollow', 'Wastes', 'Vale', 'Spire', 'Depths', 'Highlands',
  'Barrens', 'Grove', 'Basin', 'Cradle', 'Rift', 'Frontier', 'Steppe', 'Sanctum', 'Wilds',
  'Fen', 'Crags', 'Throat', 'Maw', 'Delta', 'Thicket', 'Bastion', 'Shoals', 'Chasm', 'Weald',
  'Tor', 'Moor', 'Glade', 'Trench', 'Bluffs', 'Warren', 'Palisade', 'Hollows', 'Straits', 'Furrows',
  'Roost', 'Cairn', 'Fold', 'Span', 'Verge', 'Reliquary', 'Undercroft', 'Causeway', 'Shelf', 'Watch',
  'Mire', 'Escarpment', 'Hollowway', 'Barrow', 'Sump', 'Overlook', 'Gullet', 'Threshold', 'Girdle', 'Bight',
  'Karst', 'Coombe', 'Flats', 'Notch', 'Terraces', 'Sinkway', 'Gorge', 'Shelfland', 'Hearthland', 'Marches',
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
  forest: ['Dappled sunlight', 'Heavy fog', 'Sudden rain', 'Pollen storms', 'Windfall gusts', 'Firefly swarms at dusk', 'Canopy-filtered mist', 'Rustling leaf-fall squalls', 'Morning dew haze', 'Thunder rolling through the canopy'],
  desert: ['Sandstorms', 'Scorching heat haze', 'Cold clear nights', 'Mirages', 'Dust devils', 'Static-charged air', 'Bone-dry lightning', 'Shifting dune winds', 'Cracked-earth heat shimmer', 'Rare, brief cloudbursts'],
  tundra: ['Blizzards', 'Aurora skies', 'Whiteout conditions', 'Bitter wind', 'Ice fog', 'Cracking permafrost', 'Silent snowfall', 'Frost-glittered still air', 'Howling katabatic gusts', 'Sundogs at midday'],
  swamp: ['Thick mist', 'Acid rain', 'Stagnant humidity', 'Bioluminescent nights', 'Methane bubbles', 'Sudden downpours', 'Insect clouds', 'Rotting-vegetation haze', 'Croaking dusk chorus', 'Sinking morning fog'],
  volcanic: ['Ashfall', 'Ember winds', 'Sulfur clouds', 'Tremor quakes', 'Lava glow haze', 'Superheated updrafts', 'Obsidian rain', 'Cracked-crust steam vents', 'Rolling pyroclastic haze', 'Molten-glow twilight'],
  coastal: ['Tidal surges', 'Salt storms', 'Rolling fog banks', 'Monsoon rains', 'Riptide warnings', 'Bioluminescent surf', 'Gale-force squalls', 'Whipping sea-spray winds', 'Flat dead calm', 'Distant waterspouts'],
  mountain: ['Thin air', 'Rockslide tremors', 'Snow squalls', 'Lightning storms', 'Sudden whiteouts', 'Katabatic winds', 'Ice-glazed cliffs', 'Cloud-wreathed peaks', 'Avalanche rumbles', 'Freezing overnight gales'],
  underground: ['Still, dead air', 'Spore clouds', 'Dripping condensation', 'Echo winds', 'Mineral dust falls', 'Phosphorescent fungus bloom', 'Pressure shifts', 'Sudden cave-drafts', 'Crystal-resonance hum', 'Trickling underground streams'],
  urban: ['Smog', 'Acid drizzle', 'Neon haze', 'Curfew silence', 'Ash-grey rain', 'Signal static storms', 'Power-grid flicker', 'Rooftop wind funnels', 'Sodium-lit fog', 'Distant sirens on the wind'],
  celestial: ['Gravity flux', 'Starfall', 'Chromatic auroras', 'Time distortion', 'Zero-g drift pockets', 'Solar flare bursts', 'Silent void calm', 'Nebula drift haze', 'Meteor showers', 'Reality-thin shimmer fields'],
};

export const RESOURCE_BASE = [
  'Iron Ore', 'Silver Vein', 'Ancient Timber', 'Volatile Crystal', 'Purified Water',
  'Spirit Essence', 'Rare Herb', 'Beast Hide', 'Enchanted Dust', 'Obsidian Shard',
  'Sunstone', 'Moonpetal', 'Coral Fragment', 'Rune-etched Bone', 'Refined Coal',
  'Starmetal Ingot', 'Ghost Resin', 'Thornroot', 'Glacial Ice Core', 'Bloodamber',
  'Wyrm Scale', 'Cursed Ash', 'Living Vine', 'Deepstone', 'Voidglass',
  'Phoenix Down', 'Salt Crystal', 'Tempered Bronze', 'Nightshade Extract', 'Prism Dust',
  'Frost Lichen', 'Molten Glass', 'Verdigris Ingot', 'Whale-Oil Reserve', 'Sky Coral',
  'Petrified Wood', 'Sunbaked Clay', 'Marrow Ash', 'Woven Silk-Thread', 'Amethyst Cluster',
];

export const HAZARD_BASE = [
  'Poison spores', 'Collapsing terrain', 'Extreme temperature', 'Toxic gas vents',
  'Predator ambush zones', 'Cursed ground', 'Unstable footing', 'Radiation pockets',
  'Flash floods', 'Falling debris', 'Magnetic anomalies', 'Corrupted wildlife',
  'Quicksand pits', 'Electrified pools', 'Spore-triggered traps', 'Landslide zones',
  'Territorial apex predators', 'Unstable rifts', 'Ambient curse fields', 'Frostbite winds',
  'Sinkholes', 'Contaminated water sources', 'Sound-triggered rockfalls', 'Feral spirit hauntings',
  'Whisper-induced madness', 'Static-charged storm cells', 'Carnivorous flora', 'Time-slip pockets',
  'Suffocating spore blooms', 'Migratory stampede paths', 'Parasitic infestation zones', 'Echoing avalanche triggers',
];

export const ACHIEVEMENT_CATEGORIES = ['Standard', 'Speedrun', 'Collection', 'Secret', 'Seasonal', 'Community', 'Challenge', 'Story', 'Multiplayer', 'New Game+'];
export const MOUNT_TYPES = ['Warhorse', 'Direwolf', 'Griffon', 'Armored Boar', 'Skeletal Steed', 'Giant Lizard', 'Storm Hawk', 'War Elephant', 'Sand Drake', 'Frost Elk',
  'Battle Ram', 'Sky Manta', 'War Camel', 'Tundra Mammoth', 'Reef Serpent Mount', 'Clockwork Steed'];
export const PERSONALITY_TRAITS = ['Stoic', 'Loyal', 'Quick-tempered', 'Wry', 'Guarded', 'Idealistic', 'Pragmatic', 'Superstitious', 'Blunt', 'Warm',
  'Ambitious', 'Anxious', 'Fiercely independent', 'Overly formal', 'Reckless', 'Patient', 'Suspicious of strangers', 'Secretly sentimental', 'Competitive', 'Self-deprecating',
  'Chronically curious', 'Quietly grieving', 'Overconfident', 'Deeply superstitious', 'Effortlessly charming', 'Prone to grudges', 'Unshakeably calm', 'Compulsively honest',
  'Easily starstruck', 'Restless', 'Fatalistic', 'Generous to a fault', 'Slow to trust', 'Quick to forgive', 'Obsessively tidy'];
export const CLIMATES = ['Arid desert', 'Tropical humid', 'Temperate seasonal', 'Subarctic', 'Polar', 'Mediterranean', 'Monsoon', 'Alpine', 'Continental', 'Oceanic',
  'Semi-arid steppe', 'Tropical monsoon', 'Highland plateau', 'Volcanic microclimate', 'Coastal fog belt'];
export const POLITICAL_STRUCTURES = ['Monarchy', 'Council/Oligarchy', 'Theocracy', 'Democracy', 'Military Junta', 'Corporate', 'Anarchic/Leaderless'];
export const REPUTATION_TIERS = ['Hostile', 'Unfriendly', 'Neutral', 'Friendly', 'Honored', 'Allied'];

export const FACTION_PREFIXES = ['Iron', 'Silver', 'Ember', 'Shadow', 'Storm', 'Blood', 'Gilded', 'Grey', 'Sun', 'Void',
  'Ash', 'Coral', 'Onyx', 'Copper', 'Ivory', 'Crimson', 'Frost', 'Thorn', 'Amber', 'Obsidian',
  'Dawn', 'Dusk', 'Salt', 'Wolf', 'Raven', 'Cinder', 'Moss', 'Starling', 'Bramble', 'Hollow',
  'Granite', 'Ebon', 'Sable', 'Wraith', 'Marrow', 'Glass', 'Tallow', 'Rust', 'Talon', 'Cobalt',
  'Ochre', 'Vulture', 'Nettle', 'Slate', 'Bone', 'Halcyon', 'Wyrm', 'Umber', 'Verdant', 'Nightfall'];
export const FACTION_SUFFIXES = ['Concord', 'Syndicate', 'Order', 'Legion', 'Circle', 'Cartel', 'Vanguard', 'Covenant', 'Dominion', 'Brotherhood',
  'Compact', 'Accord', 'Guild', 'Assembly', 'Union', 'Cabal', 'Consortium', 'Enclave', 'Fellowship', 'Council',
  'Warband', 'Chapter', 'Hegemony', 'Confederacy', 'Sodality', 'Coalition', 'Directorate', 'Company', 'League', 'Tribunal',
  'Ascendancy', 'Remnant', 'Pact', 'Choir', 'Court', 'Syndicacy', 'Reformation', 'Vigil', 'Wardens', 'Concordat',
  'Collective', 'Praesidium', 'Kinship', 'Reliquary', 'Dynasty', 'Faction', 'Ministry', 'Free Company', 'Marches', 'Trust'];
export const FACTION_IDEOLOGIES = [
  'Believes strength and order must be restored to a broken world.',
  'Preaches that the old ways must burn so something new can grow.',
  'Exists to protect the last uncorrupted resources at any cost.',
  'Trades in secrets and favors, loyal only to profit.',
  'Sees itself as the rightful stewards of a forgotten inheritance.',
  'Follows a prophecy that only they believe is close to fulfillment.',
  'United by a shared grievance against a common, more powerful enemy.',
  'Practices a faith that demands sacrifice for the good of the many.',
  'A loose network bound by survival, not ideology.',
  'Believes the current order is a slow-motion catastrophe that must be stopped.',
  'Holds that knowledge too dangerous to share must be hoarded, not destroyed.',
  'Views itself as the last honest voice in a world of liars.',
  'Believes bloodlines and birthright still matter more than deeds.',
  'Was founded on a debt that can never truly be repaid.',
  'Trusts nothing it cannot verify with its own eyes.',
  'Considers mercy a luxury the world can no longer afford.',
  'Was built to outlast every empire that comes after it.',
  'Believes the border between worlds is thinner than anyone admits.',
  'Exists to atone for a sin its founders never named aloud.',
  'Sees every alliance as temporary and every rival as future prey.',
];

export const CREATURE_BASES = [
  'Wolf', 'Serpent', 'Golem', 'Wraith', 'Drake', 'Spider', 'Boar', 'Hound', 'Revenant',
  'Harpy', 'Troll', 'Sprite', 'Behemoth', 'Chimera', 'Wisp', 'Basilisk', 'Ghoul', 'Yeti',
  'Wyvern', 'Mantis', 'Kraken', 'Banshee', 'Gargoyle', 'Hydra', 'Imp', 'Lich', 'Mimic', 'Nightmare',
  'Ogre', 'Phantom', 'Roc', 'Salamander', 'Treant', 'Unicorn', 'Viper', 'Wendigo', 'Cerberus', 'Djinn',
  'Elemental', 'Fiend', 'Gorgon', 'Hellhound', 'Illithid', 'Jackal', 'Kobold', 'Leviathan', 'Manticore', 'Naga',
  'Basilisk Whelp', 'Carrion Bat', 'Direwolf', 'Frost Wight', 'Sand Stalker', 'Bog Crawler', 'Ash Wraith', 'Thornback Beetle',
  'Moon Stag', 'Cave Lurker', 'Reef Serpent', 'Storm Roc', 'Bone Collector', 'Cinder Wisp', 'Grave Moth', 'Iron Tortoise',
  'Void Hound', 'Rot Fiend', 'Skyray', 'Marsh Hag', 'Tundra Bear', 'Cliff Drake', 'Sewer Ooze', 'Star Serpent', 'Ember Sprite',
];
export const CREATURE_MODIFIERS = [
  'Blightfang', 'Ironhide', 'Emberscale', 'Frostbitten', 'Voidborn', 'Ashen', 'Corrupted',
  'Ancient', 'Feral', 'Runic', 'Venomous', 'Molten', 'Spectral', 'Armored', 'Savage',
  'Deepdwelling', 'Sunless', 'Thornhide', 'Plaguebearer', 'Starving', 'Gilded', 'Rotting',
  'Shrieking', 'Petrified', 'Bloodstarved', 'Chitinous', 'Wraithbound', 'Sableclaw', 'Direblood', 'Cinderborn',
  'Sunscorched', 'Marrowdeep', 'Ironscale', 'Tidewrought', 'Nightgnawed', 'Boneplated', 'Fungal-Bound', 'Storm-Wreathed',
  'Ravenous', 'Silt-Caked', 'Ossified', 'Duskcrawling', 'Screeching', 'Glasswing', 'Rimefrost', 'Bloodrust',
  'Charhide', 'Hollow-Eyed', 'Mireborn', 'Skyfallen', 'Warforged',
];

export const WEAPON_BASE = {
  sword: ['Sword', 'Blade', 'Saber', 'Longsword', 'Rapier', 'Greatsword', 'Falchion', 'Cutlass', 'Broadsword', 'Katana', 'Estoc', 'Claymore', 'Zweihander', 'Scimitar'],
  axe: ['Axe', 'Hatchet', 'Cleaver', 'Waraxe', 'Tomahawk', 'Battleaxe', 'Bearded Axe', 'Great Axe', 'Sparth Axe'],
  bow: ['Bow', 'Longbow', 'Crossbow', 'Recurve', 'Shortbow', 'Repeating Crossbow', 'Compound Bow', 'Hand Crossbow', 'War Bow'],
  staff: ['Staff', 'Wand', 'Rod', 'Scepter', 'Focus', 'Grimoire', 'Orb', 'Cane', 'Baton'],
  gun: ['Pistol', 'Rifle', 'Cannon', 'Blaster', 'Shotgun', 'Railgun', 'Revolver', 'SMG', 'Carbine', 'Sidearm'],
  dagger: ['Dagger', 'Knife', 'Shiv', 'Kris', 'Stiletto', 'Dirk', 'Tanto', 'Push Dagger'],
  hammer: ['Hammer', 'Mace', 'Maul', 'Warhammer', 'Flail', 'Morningstar', 'War Pick', 'Sledge'],
  polearm: ['Spear', 'Halberd', 'Lance', 'Glaive', 'Naginata', 'Pike', 'Trident', 'Partisan', 'Bill-hook'],
  fist: ['Gauntlet', 'Knuckles', 'Claw', 'Talon', 'Fist-Wraps', 'Knuckle-Duster'],
  whip: ['Whip', 'Chain-blade', 'Lash', 'Bullwhip', 'Flail-Chain'],
};
export const WEAPON_PREFIXES = ['Ashen', 'Rune-Forged', 'Serpent\'s', 'Widowmaker', 'Sunder', 'Duskbound', 'Hollow', 'Ember', 'Frostbrand', 'Ironvein', 'Wraithbane', 'Starlit',
  'Gravehollow', 'Sunfall', 'Nightshade', 'Cinderborn', 'Oathkeeper\'s', 'Bloodletter\'s', 'Stormcaller\'s', 'Voidkissed', 'Ashfallen', 'Direwrought',
  'Kingsbane', 'Moonshadow', 'Ironclad', 'Thornforged', 'Emberfall', 'Deathwhisper', 'Starforged', 'Duskfire',
  'Gravebound', 'Sunscorned', 'Widowveil', 'Ashborn', 'Ironthorn', 'Bloodmoon', 'Wyrmsbane', 'Frostkiss', 'Ravenhollow', 'Duskthorn',
  'Gloamfang', 'Sablewrought', 'Runeveil', 'Emberkissed', 'Voidforged', 'Starless', 'Kinbane', 'Grimhollow', 'Coldforge', 'Ashenveil'];

export const ARMOR_PIECES = ['Helm', 'Chestplate', 'Gauntlets', 'Greaves', 'Pauldrons', 'Cloak', 'Boots', 'Shield', 'Vambraces', 'Cuirass', 'Girdle', 'Bracers',
  'Sabatons', 'Tabard', 'Hood', 'Mantle', 'Breastplate', 'Coif', 'Gorget', 'Kneecops'];
export const ACCESSORY_TYPES = ['Ring', 'Amulet', 'Talisman', 'Charm', 'Bracer', 'Sigil', 'Earring', 'Belt', 'Brooch', 'Circlet', 'Pendant', 'Signet',
  'Anklet', 'Torc', 'Rosary', 'Medallion', 'Choker', 'Bangle', 'Diadem', 'Fetish'];
export const CONSUMABLE_TYPES = ['Potion', 'Elixir', 'Tonic', 'Scroll', 'Draught', 'Salve', 'Brew', 'Philter', 'Tincture', 'Vial', 'Poultice',
  'Infusion', 'Concoction', 'Serum', 'Extract', 'Reagent Pack', 'Ration', 'Antidote', 'Distillate', 'Essence Flask'];
export const CURRENCY_TYPES = ['Gold Coin', 'Ancient Token', 'Soul Shard', 'Trade Chit', 'Crystal Mark', 'Silver Denier', 'War Bond', 'Faction Scrip', 'Void Coin',
  'Copper Mark', 'Guild Voucher', 'Bloodstone Sliver', 'Reputation Point', 'Salvage Credit', 'Prestige Token'];
export const QUEST_ITEM_TYPES = ['Sealed Letter', 'Ancient Relic', 'Broken Key', 'Faded Map', 'Family Locket', 'Cursed Idol', 'Signet Ring', 'Torn Journal Page', 'Reliquary Box', 'Prophetic Tablet',
  'Blood-Stained Ledger', 'Shattered Amulet Half', 'Encoded Dispatch', 'Ceremonial Dagger', 'Waterlogged Diary', 'Coded Star Chart', 'Confession Scroll', 'Stolen War Banner', 'Child\'s Drawing', 'Unopened Will'];

export const AFFIXES = [
  'of the Bear', 'of Swiftness', 'of the Void', 'of Embers', 'of Frost', 'of Vampirism',
  'of Precision', 'of the Titan', 'of Echoes', 'of the Storm', 'of Decay', 'of Renewal',
  'of the Serpent', 'of Retribution', 'of the Hunt', 'of Whispers', 'of Ruin', 'of the Phoenix',
  'of Silence', 'of the Deep', 'of Vengeance', 'of the Wild', 'of Sundering', 'of the Martyr',
  'of Alacrity', 'of the Undertow', 'of Wrath', 'of the Watcher', 'of Grace', 'of the Forsaken',
  'of the Cinder', 'of Hollow Ground', 'of the First Light', 'of Sorrow', 'of the Wanderer', 'of Iron Will',
  'of the Deepest Cut', 'of Unmaking', 'of the Coming Storm', 'of Quiet Ruin', 'of the Last Word', 'of Falling Stars',
  'of the Broken Oath', 'of Endless Winter',
];

export const ABILITY_VERBS = ['Strike', 'Blast', 'Surge', 'Rend', 'Shatter', 'Pulse', 'Barrage', 'Slam', 'Pierce', 'Detonate', 'Unleash', 'Channel',
  'Sever', 'Erupt', 'Cleave', 'Ignite', 'Fracture', 'Consume', 'Bind', 'Vanish', 'Rupture', 'Overwhelm', 'Siphon', 'Impale',
  'Crush', 'Scatter', 'Tear', 'Kindle', 'Collapse', 'Rend', 'Flay', 'Ensnare', 'Obliterate', 'Reap', 'Splinter', 'Warp',
  'Smother', 'Lash', 'Convert', 'Annihilate'];
export const ABILITY_NOUNS = ['Flame', 'Frost', 'Shadow', 'Storm', 'Void', 'Blood', 'Iron', 'Light', 'Venom', 'Earth', 'Chaos', 'Spirit',
  'Thunder', 'Ash', 'Bone', 'Star', 'Thorn', 'Tide', 'Ember', 'Gale', 'Rune', 'Curse', 'Dawn', 'Dusk',
  'Marrow', 'Glass', 'Frostfire', 'Abyss', 'Wyrm', 'Steel', 'Moon', 'Sun', 'Grave', 'Wind', 'Root', 'Tempest',
  'Sigil', 'Ruin', 'Comet', 'Silence'];

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
  { name: 'Corroded', type: 'Debuff', desc: 'Reduces armor/defense, stacking each application.' },
  { name: 'Charmed', type: 'Control', desc: 'Target temporarily fights for the caster.' },
  { name: 'Rooted', type: 'Control', desc: 'Target cannot move but can still act.' },
  { name: 'Blinded', type: 'Debuff', desc: 'Sharply reduces target accuracy and vision range.' },
  { name: 'Regenerating', type: 'Buff', desc: 'Heals a percentage of max health each tick.' },
  { name: 'Cursed', type: 'Debuff', desc: 'Reduces all healing received; may trigger on-death penalties.' },
  { name: 'Empowered', type: 'Buff', desc: 'Increases outgoing damage for a limited number of hits.' },
  { name: 'Fear', type: 'Control', desc: 'Target flees from the source for the duration.' },
  { name: 'Petrified', type: 'Control', desc: 'Target is immobile and immune to damage, but cannot act.' },
  { name: 'Exposed', type: 'Debuff', desc: 'Guarantees the next hit is a critical strike.' },
  { name: 'Enraged', type: 'Buff', desc: 'Increases damage dealt but also increases damage taken.' },
  { name: 'Disarmed', type: 'Control', desc: 'Prevents the use of the equipped weapon for a duration.' },
  { name: 'Sundered', type: 'Debuff', desc: 'Reduces armor and resistance to all damage types.' },
  { name: 'Overcharged', type: 'Buff', desc: 'Next ability used deals bonus damage but costs extra resource.' },
  { name: 'Slowed', type: 'Debuff', desc: 'Reduces movement and attack speed for a duration.' },
];

export const DAMAGE_TYPES = ['Physical', 'Fire', 'Frost', 'Lightning', 'Poison', 'Shadow', 'Holy', 'Arcane', 'Bleed', 'True',
  'Acid', 'Psychic', 'Sonic', 'Radiant', 'Necrotic', 'Void', 'Nature', 'Chaos'];

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
  'is slowly sinking, and no one agrees on why',
  'was the site of a betrayal that still shapes local politics',
  'is claimed by five different maps, none of them accurate',
  'was quarantined generations ago for a reason most have forgotten',
  'grows a crop found nowhere else, and everyone wants a cut',
  'is where the sky reportedly cracked open once, briefly',
  'was won and lost in the same game of cards, twice',
  'houses a bell that, when rung, no one can quite remember why they came',
  'was promised to a people who no longer exist',
  'is the last place the old gods were seen walking openly',
  'was drawn on every map differently, and each cartographer swears theirs is right',
  'is where a treaty was signed that nobody now living has read in full',
  'was rebuilt seven times on the exact same foundations, for reasons no one explains',
  'is slowly being unwritten from every book that once mentioned it',
  'was the last stand of an army that technically never lost',
  'is inhabited by descendants of people who were never supposed to survive',
  'holds a debt ledger that several powerful families would kill to burn',
  'was the punchline of a joke that turned out to be prophecy',
  'is where the border between two nations quietly moves each year',
  'was gifted to the current inhabitants by an enemy, for reasons still unclear',
  'is slowly filling with something that was never native to this world',
  'has three names, in three languages, and none of them mean the same thing',
  'was the site of the only truce that has ever actually held',
  'is guarded by descendants of the very army that once tried to burn it down',
];

export const QUEST_VERBS = ['Recover', 'Escort', 'Investigate', 'Sabotage', 'Defend', 'Assassinate', 'Negotiate with', 'Cleanse', 'Steal from', 'Rescue',
  'Infiltrate', 'Expose', 'Broker peace between', 'Track down', 'Silence', 'Reclaim', 'Excavate', 'Smuggle', 'Depose', 'Vindicate',
  'Ambush', 'Bribe', 'Blackmail', 'Sabotage the supply lines of', 'Impersonate', 'Outbid', 'Duel', 'Pacify', 'Quarantine', 'Unmask',
  'Evacuate', 'Repossess', 'Decipher', 'Auction', 'Sabotage the ritual of'];
export const QUEST_TARGETS = ['the lost relic', 'the missing envoy', 'the corrupted shrine', 'the rival warlord', 'the besieged village', 'the sunken vault', 'the rogue experiment', 'the exiled heir', 'the smuggler convoy', 'the ancient seal',
  'the poisoned well', 'the false prophet', 'the border outpost', 'the stolen ledger', 'the collapsing mine', 'the haunted lighthouse', 'the deserting garrison', 'the black market ring', 'the forbidden archive', 'the plague ward',
  'the counterfeit ring', 'the exiled court', 'the wandering caravan', 'the drowned monastery', 'the fugitive scientist', 'the mutinous crew', 'the last surviving witness', 'the sealed reactor', 'the pilgrim procession', 'the traitor general',
  'the sunken treasury', 'the abandoned outpost', 'the cursed bloodline', 'the imprisoned oracle', 'the last free press'];

export const ROOM_TYPES = ['Combat Arena', 'Puzzle Chamber', 'Treasure Vault', 'Boss Arena', 'Rest Area', 'Narrative Room', 'Ambush Corridor', 'Secret Passage', 'Hub Room', 'Platforming Gauntlet',
  'Environmental Trap Room', 'Vertical Shaft', 'Flooded Chamber', 'Collapsed Corridor', 'Observation Deck', 'Shrine Room', 'Prisoner Cells', 'Archive Stacks', 'Garden Atrium', 'Sealed Vault',
  'Mirror Maze', 'Collapsing Bridge', 'Underground Market', 'Ritual Circle', 'Frozen Cavern', 'Overgrown Courtyard', 'Signal Relay Room', 'Cargo Hold', 'Sunken Chapel', 'Watchtower Landing'];

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
  { key: 'tutorial', label: 'Tutorial / Onboarding Overlay' },
  { key: 'notification', label: 'Notification / Toast' },
  { key: 'dialogue', label: 'Dialogue Box' },
  { key: 'crafting', label: 'Crafting UI' },
  { key: 'leaderboard', label: 'Leaderboard' },
  { key: 'social', label: 'Social / Friends List' },
  { key: 'achievements-ui', label: 'Achievements Screen' },
  { key: 'pause', label: 'Pause Menu' },
  { key: 'game-over', label: 'Game Over / Victory Screen' },
  { key: 'character-creation', label: 'Character Creation' },
  { key: 'quest-log', label: 'Quest Log / Codex' },
  { key: 'minimap', label: 'Minimap' },
  { key: 'error-dialog', label: 'Error Dialog' },
  { key: 'confirmation-dialog', label: 'Confirmation Dialog' },
  { key: 'item-comparison-tooltip', label: 'Item Comparison Tooltip' },
  { key: 'crafting-queue', label: 'Crafting Queue' },
  { key: 'world-map-legend', label: 'World Map Legend' },
  { key: 'chat-window', label: 'Chat Window' },
  { key: 'party-frame', label: 'Party Frame' },
  { key: 'boss-health-overlay', label: 'Boss Health Overlay' },
  { key: 'subtitle-overlay', label: 'Subtitle Overlay' },
  { key: 'photo-mode', label: 'Photo Mode UI' },
  { key: 'accessibility-settings', label: 'Accessibility Settings Panel' },
];

export const AUDIO_TYPES = [
  { key: 'music', label: 'Music' },
  { key: 'sfx', label: 'Sound Effect' },
  { key: 'ambience', label: 'Ambience' },
  { key: 'voice', label: 'Voice Direction' },
  { key: 'ui-sound', label: 'UI Sound' },
  { key: 'stinger', label: 'Stinger' },
  { key: 'jingle', label: 'Jingle / Fanfare' },
  { key: 'boss-theme', label: 'Boss Theme' },
  { key: 'cutscene-score', label: 'Cutscene Score' },
  { key: 'ambient-voice-bed', label: 'Crowd / Ambient Voice Bed' },
  { key: 'leitmotif', label: 'Leitmotif' },
  { key: 'voice-line-set', label: 'Voice Line Set' },
  { key: 'foley-pack', label: 'Foley Pack' },
  { key: 'radio-chatter', label: 'Radio Chatter' },
  { key: 'tutorial-narration', label: 'Tutorial Narration' },
  { key: 'cutscene-dialogue', label: 'Cutscene Dialogue' },
  { key: 'victory-fanfare', label: 'Victory Fanfare' },
  { key: 'defeat-stinger', label: 'Defeat Stinger' },
  { key: 'weather-ambience', label: 'Weather Ambience' },
  { key: 'crowd-reaction', label: 'Crowd Reaction' },
];

export const MOODS = ['Tense', 'Triumphant', 'Melancholic', 'Whimsical', 'Foreboding', 'Serene', 'Chaotic', 'Nostalgic', 'Heroic', 'Eerie',
  'Playful', 'Somber', 'Frantic', 'Mysterious', 'Defiant', 'Wistful', 'Grim', 'Hopeful', 'Menacing', 'Bittersweet',
  'Reverent', 'Manic', 'Melancholy-triumphant', 'Claustrophobic', 'Euphoric', 'Uneasy', 'Wondrous', 'Desolate', 'Cozy', 'Feverish',
  'Vengeful', 'Dreamlike', 'Anxious', 'Sardonic', 'Elegiac'];
export const LIGHTING = ['Golden hour rim light', 'Harsh noon overhead', 'Moody low-key', 'Bioluminescent glow', 'Overcast diffuse', 'Neon backlight', 'Torch-lit warm', 'Cold blue moonlight',
  'Volumetric god rays', 'Flickering candlelight', 'Stark fluorescent', 'Underlit horror glow', 'Soft studio three-point', 'Stormlit flashes',
  'Dappled canopy light', 'Harsh spotlight isolation', 'Ambient occlusion gloom', 'Warm hearth glow', 'Cathedral stained-glass light', 'Sickly green fluorescence',
  'Sunset silhouette backlight', 'Foggy diffused twilight', 'Sparking electrical flicker', 'Deep-sea bioluminescence'];
export const CAMERA_ANGLES = ['3/4 hero shot', 'Top-down isometric', 'Full-body T-pose reference', 'Dynamic action pose', 'Close-up portrait', 'Wide establishing shot', 'Side profile orthographic',
  'Low-angle heroic', 'Over-the-shoulder', 'Bird\'s eye tactical view', 'Extreme close-up detail',
  'Dutch tilt for unease', 'Worm\'s eye view', 'Reverse-angle reaction shot', 'Tracking shot along motion', 'Symmetrical centered composition',
  'Silhouette against light source', 'Macro detail shot', 'Fisheye distortion', 'Rear three-quarter view'];
export const PALETTES = ['Muted earth tones', 'High-contrast complementary', 'Monochrome with one accent', 'Pastel desaturated', 'Neon cyberpunk', 'Warm autumnal', 'Cool arctic blues', 'Analogous jewel tones',
  'Sunbleached desert tones', 'Deep jewel-toned gothic', 'Washed-out post-apocalyptic', 'Saturated candy-pop',
  'Muted teal and rust duotone', 'Bioluminescent violet and black', 'Sepia archival tones', 'Toxic acid-green and grey', 'Royal purple and gold',
  'Ashen greyscale with blood-red accent', 'Sun-washed pastel tropical', 'Ink-wash black and white'];
export const MATERIALS = ['Weathered leather and iron', 'Polished chrome and glass', 'Cracked stone and moss', 'Silk and gold filigree', 'Rough-hewn wood and rope', 'Bio-organic chitin', 'Painted cel-shaded surfaces',
  'Rusted scrap metal', 'Lacquered wood and brass', 'Frost-glazed crystal', 'Woven cloth and bone',
  'Hammered copper and leather straps', 'Volcanic glass and ash-dyed cloth', 'Sunbleached bone and sinew', 'Salvaged circuitry and duct tape', 'Carved jade and lacquer',
  'Waxed canvas and brass rivets', 'Coral-encrusted iron', 'Frayed rope and driftwood'];

// --- New: NPC flavor, faction rosters, legendary sets, continent naming ---
export const NPC_OCCUPATIONS = [
  'Blacksmith', 'Innkeeper', 'Herbalist', 'Guard Captain', 'Fisherfolk', 'Scribe', 'Alchemist',
  'Bounty Hunter', 'Farmer', 'Priest', 'Smuggler', 'Cartographer', 'Beastmaster', 'Miner',
  'Tavern Bard', 'Retired Soldier', 'Fortune Teller', 'Shipwright', 'Gravedigger', 'Apothecary',
  'Tax Collector', 'Messenger Rider', 'Stablehand', 'Weaver', 'Locksmith', 'Undertaker', 'Ferryman',
  'Beekeeper', 'Glassblower', 'Chandler', 'Moneylender', 'Court Jester', 'Falconer', 'Tanner',
  'Watchtower Signaler', 'Ratcatcher', 'Midwife', 'Woodcarver', 'Street Preacher', 'Caravan Guide',
];

export const LEGENDARY_TITLES = [
  'the Worldbreaker', 'of the First Dawn', 'the Kingslayer', 'of a Thousand Names', 'the Undying',
  'the Last of Its Kind', 'of the Sunken Throne', 'the Unmaking', 'of the Final Hour', 'the Eternal Vow',
  'the Godslayer', 'of the Shattered Sky', 'the Everlasting', 'of the Deepest Dark', 'the Worldsoul',
  'the Unwritten', 'of the Last Council', 'the Star-Eater', 'the Timeless', 'of the Final Reckoning',
];

export const CONTINENT_ADJECTIVES = ['Great', 'Broken', 'Endless', 'Forgotten', 'Sundered', 'Frozen', 'Burning', 'Silent', 'Wandering', 'Ancient',
  'Drowned', 'Shattered', 'Verdant', 'Distant', 'Hollow', 'Storm-Wracked', 'Golden', 'Withered'];
export const CONTINENT_NOUNS = ['Expanse', 'Continent', 'Landmass', 'Reach', 'Dominion', 'Territories', 'Isles', 'Frontier', 'Span', 'Realm',
  'Archipelago', 'Crescent', 'Basin', 'Sprawl', 'Rimlands', 'Marches', 'Belt', 'Wilds'];

export const QUEST_CHAIN_THEMES = [
  { name: 'The Rising Threat', beats: ['A strange occurrence is reported', 'Investigation reveals a pattern', 'The source is identified', 'A desperate plan is formed', 'Confrontation with the source'] },
  { name: 'The Fractured Alliance', beats: ['Two factions request help', 'Their conflict deepens', 'A hidden manipulator is revealed', 'A choice must be made', 'The alliance is remade or broken forever'] },
  { name: 'The Long Way Home', beats: ['A journey begins under duress', 'An unexpected ally joins', 'A great obstacle blocks the path', 'A personal sacrifice is required', 'Arrival changes everything'] },
  { name: 'The Buried Truth', beats: ['A mystery is uncovered', 'Clues point somewhere forbidden', 'A guardian or gatekeeper is faced', 'The truth is worse than expected', 'A reckoning with what was found'] },
  { name: 'The Debt Unpaid', beats: ['An old favor is called in', 'Fulfilling it opens a deeper obligation', 'The true cost of the debt is revealed', 'A chance to walk away is offered and refused', 'The debt is settled, at a price'] },
  { name: 'The Slow Betrayal', beats: ['A trusted ally asks a small favor', 'The favors escalate, each harder to refuse', 'A discrepancy reveals the ally\'s true goal', 'A confrontation forces a choice of loyalties', 'The fallout reshapes every relationship involved'] },
];

export const HORROR_THREATS = ['a presence that mimics voices', 'something that only moves when unwatched', 'a ritual half-finished', 'a hunger passed hand to hand', 'a door that shouldn\'t open twice', 'a name that shouldn\'t be said aloud'];
export const PUZZLE_MECHANICS = ['light-reflection routing', 'weight-based pressure plates', 'time-delayed switches', 'color-matching sequences', 'gravity-flip platforms', 'sound-based resonance locks', 'mirrored dual-character control'];
export const TOWER_DEFENSE_ENEMY_WAVES = ['Light Scouts', 'Armored Bulk Units', 'Fast Flankers', 'Shielded Bearers', 'Airborne Swarm', 'Siege Breakers', 'Elite Vanguard'];
export const ROGUELIKE_RUN_MODIFIERS = ['Double enemy density, +50% loot', 'No healing items, +damage', 'Permadeath companions', 'Randomized starting class', 'Boss rush finale', 'Cursed items only, high reward'];
export const CARD_KEYWORDS = ['Draw 2', 'Discard to Deal Damage', 'Exile on Play', 'Combo Chain', 'Mana Ramp', 'Sacrifice for Value', 'Counter Trap'];
export const STRATEGY_RESOURCE_TYPES = ['Food', 'Wood', 'Ore', 'Gold', 'Influence', 'Research Points', 'Population'];
export const FARMING_CROPS = ['Wheat', 'Pumpkin', 'Blueberry', 'Starfruit', 'Moon Melon', 'Silver Corn', 'Sunroot'];
export const BATTLE_ROYALE_ZONES = ['Landing Docks', 'Crumbling Overpass', 'Signal Tower', 'Sunken District', 'Storm Wall Edge', 'Abandoned Bunker'];
export const VISUAL_NOVEL_ARCS = ['A rivalry that becomes something else', 'A secret that threatens everyone\'s plans', 'A choice between duty and desire', 'An old promise coming due', 'A truth that changes who gets to stay'];

export const ACHIEVEMENT_TITLES = [
  'First Steps', 'No Stone Unturned', 'Against All Odds', 'The Long Way Round', 'Collector\'s Eye',
  'Master of None', 'Perfectionist', 'Speed Demon', 'Pacifist Run', 'Completionist', 'One More Try',
  'Legend in the Making', 'The Hard Way', 'Above and Beyond', 'Full Circle', 'Not Today', 'Untouchable',
  'The Grind Never Stops', 'Hidden in Plain Sight', 'Worth the Wait', 'Overkill', 'Clean Sweep',
  'By the Skin of Your Teeth', 'Down to the Wire', 'Nothing Left to Prove',
  'Rise and Grind', 'Uncharted Territory', 'The Point of No Return', 'Well, That Happened', 'Curiosity Rewarded',
  'Old Habits', 'The Scenic Route', 'Never Tell Me the Odds', 'Last One Standing', 'A Debt Repaid',
  'Reading the Room', 'The Quiet Part', 'No Survivors', 'All Bark, No Bite', 'A Small Mercy',
  'The Long Con', 'Burn It All Down', 'Second Wind',
];

export const ACHIEVEMENT_CRITERIA_TEMPLATES = [
  'Reach level {n} with any character.', 'Explore every region of the world.', 'Finish the game in under {n} hours.',
  'Craft {n} items using rare materials.', 'Max out a relationship with any NPC.', 'Discover a secret ending.',
  'Die {n} times to the same boss and still win.', 'Complete the game without changing equipment.',
  'Collect every currency type at least once.', 'Finish a level without triggering any alarms.',
  'Defeat {n} enemies without using a healing item.', 'Unlock every optional area on a single save file.',
  'Win {n} consecutive encounters without retreating.', 'Complete a full playthrough using only starting gear.',
  'Reach the end without ever opening the main menu shop.', 'Recruit all available companions in a single run.',
  'Finish {n} side quests before starting the main story\'s final act.', 'Survive a full in-game year without resting.',
];
