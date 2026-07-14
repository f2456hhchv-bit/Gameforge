import { createCollectionView } from '../components/collectionView.js';
import { rngFor, generateWeaponName, weaponStats, rarityRoll } from '../generators/procedural.js';
import { h, pick, pickN } from '../util.js';
import { RARITIES, badgeForRarity } from '../schema.js';
import { WEAPON_BASE, ARMOR_PIECES, ACCESSORY_TYPES, CONSUMABLE_TYPES, CURRENCY_TYPES, QUEST_ITEM_TYPES, AFFIXES, RESOURCE_BASE, LEGENDARY_TITLES, MOUNT_TYPES } from '../generators/wordbank.js';
import { autoTask } from '../taskHooks.js';
import { openModal } from '../components/ui.js';
import { barChart } from '../components/charts.js';

const RARITY_TABLE_WEIGHTS = { Common: 45, Uncommon: 28, Rare: 16, Epic: 7, Legendary: 3, Mythic: 1 };
const RARITY_TABLE_TOTAL = Object.values(RARITY_TABLE_WEIGHTS).reduce((a, b) => a + b, 0);
const COSMETIC_ADJECTIVES = ['Radiant', 'Shadow', 'Gilded', 'Verdant', 'Crimson', 'Obsidian', 'Frostbound', 'Sunlit'];
const VISUAL_SLOTS = ['Helmet', 'Chest', 'Weapon Skin', 'Mount Skin', 'Back/Cape', 'Emote', 'Full Outfit'];
const THROWABLE_TYPES = ['Frag Grenade', 'Smoke Bomb', 'Fire Bottle', 'Poison Vial', 'Flashbang', 'Throwing Knife', 'Caltrops', 'Net Trap'];
const AMMO_TYPES = ['Arrows', 'Bolts', 'Bullets', 'Shells', 'Throwing Darts', 'Sling Stones'];
const AMMO_QUALITY = ['Standard', 'Piercing', 'Explosive', 'Elemental', 'Silver', 'Cursed'];
const TOOL_TYPES = ['Lockpick Set', 'Grappling Hook', 'Torch', 'Rope', 'Climbing Pick', 'Diving Mask', 'Compass', 'Spyglass'];
const GEM_TYPES = ['Ruby', 'Sapphire', 'Emerald', 'Topaz', 'Amethyst', 'Onyx', 'Opal', 'Garnet'];
const GEM_TIERS = ['Chipped', 'Flawed', 'Regular', 'Flawless', 'Perfect'];
const DEPLOYABLE_TYPES = ['Sentry Turret', 'War Totem', 'Healing Ward', 'Bear Trap', 'Barricade', 'Decoy'];
const BANNER_TYPES = ['Guild Banner', 'Victory Trophy', 'War Standard', 'Ceremonial Flag', 'Hunting Trophy'];
const TRANSPORT_TYPES = ['Rowboat', 'Sailing Ship', 'Wagon', 'Airship', 'Submarine', 'Caravan'];
const CONTAINER_TYPES = ['Wooden Chest', 'Iron Lockbox', 'Ornate Coffer', 'Reinforced Crate', 'Ancient Urn'];
const RELIC_NOUNS = ['Shard', 'Crown', 'Reliquary', 'Idol', 'Tablet', 'Sigil', 'Chalice', 'Diadem'];

function openDropRateSimulator() {
  const state = { runs: 1000 };
  const runInput = h('input', { class: 'input w-28', type: 'number', min: 100, max: 100000, value: state.runs });
  const resultsWrap = h('div', { class: 'flex flex-col gap-2' });

  function simulate() {
    const n = Math.max(100, Math.min(100000, Number(runInput.value) || 1000));
    const rng = rngFor(Math.random());
    const counts = Object.fromEntries(RARITIES.map(r => [r, 0]));
    for (let i = 0; i < n; i++) counts[rarityRoll(rng)]++;
    resultsWrap.innerHTML = '';
    resultsWrap.appendChild(h('p', { class: 'text-xs text-slate-400' }, `${n.toLocaleString()} simulated rolls using the generator's real weighted table.`));
    resultsWrap.appendChild(barChart(
      RARITIES.map(r => ({ label: r, value: counts[r] })),
      { formatValue: v => `${v.toLocaleString()} (${((v / n) * 100).toFixed(1)}%)` },
    ));
    resultsWrap.appendChild(h('p', { class: 'text-xs text-slate-400 pt-2 border-t border-surface-3/60' },
      `Table weights: ${RARITIES.map(r => `${r} ${((RARITY_TABLE_WEIGHTS[r] / RARITY_TABLE_TOTAL) * 100).toFixed(1)}%`).join(' · ')}`));
  }

  const content = h('div', { class: 'flex flex-col gap-4' }, [
    h('p', { class: 'text-sm text-slate-500' }, 'Preview the exact rarity distribution "Generate Item" will produce, before generating any real items.'),
    h('div', { class: 'flex items-end gap-2' }, [
      h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, 'Simulated rolls'), runInput]),
      h('button', { class: 'btn-primary', onclick: simulate }, 'Simulate'),
    ]),
    resultsWrap,
  ]);
  simulate();
  openModal(content, { title: '🎲 Drop Rate Simulator', width: '480px' });
}

export const SUBTYPES = [
  { key: 'weapon', label: 'Weapon', icon: '🗡️' },
  { key: 'armor', label: 'Armour', icon: '🛡️' },
  { key: 'accessory', label: 'Accessory', icon: '💍' },
  { key: 'consumable', label: 'Consumable', icon: '🧪' },
  { key: 'material', label: 'Crafting Material', icon: '🪵' },
  { key: 'quest-item', label: 'Quest Item', icon: '📜' },
  { key: 'currency', label: 'Currency', icon: '🪙' },
  { key: 'mount', label: 'Mount', icon: '🐴' },
  { key: 'cosmetic', label: 'Cosmetic / Skin', icon: '🎭' },
  { key: 'blueprint', label: 'Blueprint / Schematic', icon: '📐' },
  { key: 'relic', label: 'Relic / Artifact', icon: '🏺' },
  { key: 'throwable', label: 'Throwable', icon: '💣' },
  { key: 'ammunition', label: 'Ammunition', icon: '🏹' },
  { key: 'tool', label: 'Tool / Utility', icon: '🔧' },
  { key: 'gem', label: 'Gem / Rune', icon: '💎' },
  { key: 'deployable', label: 'Deployable', icon: '🗼' },
  { key: 'recipe', label: 'Recipe', icon: '📖' },
  { key: 'banner', label: 'Banner / Trophy', icon: '🚩' },
  { key: 'transport', label: 'Transport', icon: '⛵' },
  { key: 'container', label: 'Container', icon: '📦' },
];

const FIELDS = [
  { key: 'rarity', label: 'Rarity', type: 'select', options: RARITIES },
  { key: 'value', label: 'Value (currency)', type: 'number' },
  { key: 'statistics', label: 'Statistics', type: 'stats' },
  { key: 'affixes', label: 'Affixes', type: 'list', placeholder: 'e.g. of the Bear' },
  { key: 'enchantments', label: 'Enchantments', type: 'list' },
  { key: 'upgradeTree', label: 'Upgrade Tree', type: 'list', cols: 2, placeholder: 'e.g. Tier 2: +10% damage, requires 3 Iron Ore' },
  { key: 'craftedFrom', label: 'Crafted From', type: 'relation-multi', target: 'items', subtype: 'material' },
  { key: 'randomGenRule', label: 'Random Generation Rule', type: 'textarea', cols: 2, placeholder: 'Notes on how this template rolls stats/affixes procedurally…' },
  { key: 'setName', label: 'Item Set', type: 'text', placeholder: 'e.g. Vanguard\'s Aegis (leave blank if not part of a set)' },
  { key: 'setBonus', label: 'Set Bonus', type: 'textarea', placeholder: 'e.g. 2pc: +10% armour. 4pc: reflect 15% melee damage.' },
  { key: 'socketSlots', label: 'Socket / Gem Slots', type: 'number', placeholder: 'e.g. 2' },
  { key: 'durability', label: 'Durability', type: 'number', placeholder: 'e.g. 100' },
  { key: 'unlocksRecipeFor', label: 'Unlocks Recipe For', type: 'relation', target: 'items' },
  { key: 'visualSlot', label: 'Visual Slot', type: 'select', options: VISUAL_SLOTS },
];

const EXTRA_FIELDS_BY_SUBTYPE = {
  relic: [{ key: 'relicLore', label: 'Relic Lore', type: 'textarea', cols: 2, placeholder: 'The unique history behind this one-of-a-kind item…' }],
  throwable: [
    { key: 'blastRadius', label: 'Blast / Effect Radius', type: 'text', placeholder: 'e.g. 4m' },
    { key: 'throwRange', label: 'Throw Range', type: 'text', placeholder: 'e.g. 15m' },
  ],
  ammunition: [{ key: 'ammoQuality', label: 'Ammo Quality', type: 'select', options: AMMO_QUALITY }],
  tool: [{ key: 'toolUse', label: 'Tool Use', type: 'text', placeholder: 'e.g. Picks level-1 locks, lights dark areas' }],
  gem: [
    { key: 'gemTier', label: 'Gem Tier', type: 'select', options: GEM_TIERS },
    { key: 'socketBonus', label: 'Socket Bonus (when slotted)', type: 'text', placeholder: 'e.g. +8% critical strike chance' },
  ],
  deployable: [
    { key: 'deployDuration', label: 'Deploy Duration', type: 'text', placeholder: 'e.g. 30s or until destroyed' },
    { key: 'deployCooldown', label: 'Redeploy Cooldown', type: 'text', placeholder: 'e.g. 45s' },
  ],
  banner: [{ key: 'displayLocation', label: 'Display Location', type: 'text', placeholder: 'e.g. Guild hall wall, ship mast' }],
  transport: [
    { key: 'crewCapacity', label: 'Crew / Passenger Capacity', type: 'number' },
    { key: 'transportSpeed', label: 'Speed', type: 'text', placeholder: 'e.g. 12 knots' },
  ],
  container: [
    { key: 'lootTableRef', label: 'Possible Contents', type: 'relation-multi', target: 'items' },
    { key: 'openMethod', label: 'Open Method', type: 'text', placeholder: 'e.g. Requires a key, bash open, pick the lock' },
  ],
};

function fieldsFor(subtype) {
  return [...FIELDS, ...(EXTRA_FIELDS_BY_SUBTYPE[subtype] || [])];
}

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [
    { text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' },
    item.rarity && { text: item.rarity, cls: badgeForRarity(item.rarity) },
  ].filter(Boolean);
}

const TYPE_NAME_BANK = {
  armor: ARMOR_PIECES, accessory: ACCESSORY_TYPES, consumable: CONSUMABLE_TYPES,
  currency: CURRENCY_TYPES, 'quest-item': QUEST_ITEM_TYPES, mount: MOUNT_TYPES,
  throwable: THROWABLE_TYPES, ammunition: AMMO_TYPES, tool: TOOL_TYPES,
  deployable: DEPLOYABLE_TYPES, banner: BANNER_TYPES, transport: TRANSPORT_TYPES, container: CONTAINER_TYPES,
};

function genericStats(rng, subtype, rarity) {
  const mult = { Common: 1, Uncommon: 1.15, Rare: 1.35, Epic: 1.6, Legendary: 2, Mythic: 2.6 }[rarity] || 1;
  switch (subtype) {
    case 'armor':
      return [
        { key: 'Defense', value: String(Math.round((6 + rng() * 10) * mult)) },
        { key: 'Weight', value: (1 + rng() * 4).toFixed(1) },
        { key: 'Resistance', value: `${Math.round(5 + rng() * 20)}%` },
      ];
    case 'accessory':
      return [{ key: 'Bonus Stat', value: `+${Math.round((3 + rng() * 10) * mult)}%` }];
    case 'consumable':
      return [
        { key: 'Effect Magnitude', value: String(Math.round((10 + rng() * 30) * mult)) },
        { key: 'Duration', value: `${Math.round(5 + rng() * 25)}s` },
      ];
    case 'material':
      return [{ key: 'Stack Size', value: String(Math.round(10 + rng() * 90)) }];
    case 'currency':
      return [{ key: 'Base Value', value: String(Math.round(1 + rng() * 100)) }];
    case 'mount':
      return [
        { key: 'Speed Bonus', value: `+${Math.round((20 + rng() * 40) * mult)}%` },
        { key: 'Stamina', value: String(Math.round((50 + rng() * 100) * mult)) },
      ];
    case 'throwable':
      return [
        { key: 'Damage', value: String(Math.round((15 + rng() * 35) * mult)) },
        { key: 'Blast Radius', value: `${2 + Math.floor(rng() * 4)}m` },
      ];
    case 'ammunition':
      return [
        { key: 'Damage Bonus', value: `+${Math.round((5 + rng() * 15) * mult)}%` },
        { key: 'Stack Size', value: String(Math.round(20 + rng() * 80)) },
      ];
    case 'gem':
      return [{ key: 'Bonus', value: `+${Math.round((3 + rng() * 12) * mult)}%` }];
    case 'deployable':
      return [
        { key: 'Health', value: String(Math.round((50 + rng() * 150) * mult)) },
        { key: 'Duration', value: `${10 + Math.floor(rng() * 50)}s` },
      ];
    case 'transport':
      return [
        { key: 'Speed', value: `${Math.round(8 + rng() * 20)} knots` },
        { key: 'Cargo Capacity', value: String(Math.round(50 + rng() * 450)) },
      ];
    default:
      return [];
  }
}

export function generateItem(rng, subtype) {
  const rarity = rarityRoll(rng);
  let name, description, visualSlot = '';
  if (subtype === 'weapon') {
    const weaponType = pick(Object.keys(WEAPON_BASE), rng);
    name = generateWeaponName(rng, weaponType, rarity);
    description = `A ${rarity.toLowerCase()} ${weaponType} favored by those who survive.`;
  } else if (subtype === 'cosmetic') {
    visualSlot = pick(VISUAL_SLOTS, rng);
    name = `${pick(COSMETIC_ADJECTIVES, rng)} ${visualSlot}`;
    description = `A ${rarity.toLowerCase()} cosmetic — purely visual, no stat impact.`;
  } else if (subtype === 'blueprint') {
    const weaponType = pick(Object.keys(WEAPON_BASE), rng);
    name = `Blueprint: ${weaponType}`;
    description = `A ${rarity.toLowerCase()} schematic that unlocks a new crafting recipe once learned.`;
  } else if (subtype === 'relic') {
    name = `${pick(LEGENDARY_TITLES, rng)} ${pick(RELIC_NOUNS, rng)}`;
    description = `A one-of-a-kind ${rarity.toLowerCase()} relic — narrative-significant, not procedurally re-rollable.`;
  } else if (subtype === 'gem') {
    const gemType = pick(GEM_TYPES, rng);
    name = `${pick(GEM_TIERS, rng)} ${gemType}`;
    description = `A ${rarity.toLowerCase()} ${gemType.toLowerCase()} that can be socketed into equipment with an open slot.`;
  } else if (subtype === 'recipe') {
    const consumableType = pick(CONSUMABLE_TYPES, rng);
    name = `Recipe: ${consumableType}`;
    description = `A ${rarity.toLowerCase()} recipe that unlocks crafting of ${consumableType} once learned.`;
  } else {
    const bank = TYPE_NAME_BANK[subtype] || ['Item'];
    const base = pick(bank, rng);
    const useAffix = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(rarity) && rng() < 0.6;
    name = useAffix ? `${base} ${pick(AFFIXES, rng)}` : (subtype === 'material' ? pick(RESOURCE_BASE, rng) : base);
    description = `A ${rarity.toLowerCase()} ${subtype.replace('-', ' ')}.`;
  }
  const stats = subtype === 'weapon' ? weaponStats(rng, rarity) : genericStats(rng, subtype, rarity);
  const affixes = subtype !== 'cosmetic' && subtype !== 'blueprint' && ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(rarity) ? pickN(AFFIXES, rarity === 'Mythic' ? 2 : 1, rng) : [];
  const isEquipment = ['weapon', 'armor'].includes(subtype);
  return {
    name, description, rarity,
    value: Math.round((5 + rng() * 500) * ({ Common: 1, Uncommon: 2, Rare: 5, Epic: 12, Legendary: 30, Mythic: 80 }[rarity] || 1)),
    statistics: stats,
    affixes, enchantments: [], upgradeTree: [], craftedFrom: [],
    randomGenRule: `Rolls rarity via weighted table, then scales stats by rarity multiplier (${rarity}).`,
    setName: '', setBonus: '',
    socketSlots: isEquipment ? Math.floor(rng() * 4) : 0,
    durability: isEquipment ? Math.round(80 + rng() * 120) : 0,
    unlocksRecipeFor: '',
    visualSlot,
    links: {},
    ...extraFieldsFor(rng, subtype),
  };
}

function extraFieldsFor(rng, subtype) {
  switch (subtype) {
    case 'relic': return { relicLore: 'Its true origin is disputed — three different scholars have three different stories.' };
    case 'throwable': return { blastRadius: `${2 + Math.floor(rng() * 4)}m`, throwRange: `${8 + Math.floor(rng() * 12)}m` };
    case 'ammunition': return { ammoQuality: pick(AMMO_QUALITY, rng) };
    case 'tool': return { toolUse: 'Enables an otherwise-inaccessible traversal or interaction option.' };
    case 'gem': return { gemTier: pick(GEM_TIERS, rng), socketBonus: `+${Math.round(3 + rng() * 12)}% to a linked stat` };
    case 'deployable': return { deployDuration: `${10 + Math.floor(rng() * 50)}s or until destroyed`, deployCooldown: `${20 + Math.floor(rng() * 40)}s` };
    case 'banner': return { displayLocation: 'Player home base / guild hall.' };
    case 'transport': return { crewCapacity: 1 + Math.floor(rng() * 6), transportSpeed: `${Math.round(8 + rng() * 20)} knots` };
    case 'container': return { lootTableRef: [], openMethod: pick(['Requires a key', 'Bash open', 'Pick the lock', 'Opens freely'], rng) };
    default: return {};
  }
}

const LEGENDARY_SET_SLOTS = ['weapon', 'armor', 'accessory'];
let legendarySetState = { setName: '' };

export function generateLegendarySetItem({ index }) {
  const rng = rngFor(Math.random());
  if (index % LEGENDARY_SET_SLOTS.length === 0) {
    legendarySetState.setName = `Set ${pick(LEGENDARY_TITLES, rng)}`;
  }
  const slot = LEGENDARY_SET_SLOTS[index % LEGENDARY_SET_SLOTS.length];
  const item = generateItem(rng, slot);
  item.subtype = slot;
  item.rarity = 'Legendary';
  item.name = `${legendarySetState.setName}: ${item.name}`;
  item.description = `Part of "${legendarySetState.setName}" — a matched legendary set meant to be found and equipped together. ${item.description}`;
  return item;
}

const STARTER_LOADOUT_SLOTS = ['weapon', 'armor', 'consumable', 'currency'];

export function generateStarterLoadoutItem({ index }) {
  const rng = rngFor(Math.random());
  const slot = STARTER_LOADOUT_SLOTS[index % STARTER_LOADOUT_SLOTS.length];
  const item = generateItem(rng, slot);
  item.subtype = slot;
  item.rarity = 'Common';
  item.value = Math.round(item.value * 0.2);
  item.affixes = [];
  item.description = `Starter loadout gear — a basic ${slot} issued at the start of a run. ${item.description}`;
  return item;
}

const GENERATORS = [
  { label: 'Generate Item', run: ({ subtype }) => generateItem(rngFor(Math.random()), subtype || 'weapon') },
  { label: 'Legendary Set (weapon+armor+accessory, matched)', run: generateLegendarySetItem },
  { label: 'Starter Loadout (weapon/armor/consumable/currency)', run: generateStarterLoadoutItem },
];

export function mountItems(container, opts) {
  const view = createCollectionView({
    key: 'items', singular: 'Item', plural: 'Items', icon: '🗡️',
    subtypes: SUBTYPES,
    fields: fieldsFor,
    makeDefaults: () => ({ rarity: 'Common', statistics: [], affixes: [], enchantments: [], upgradeTree: [], craftedFrom: [], socketSlots: 0, durability: 0, lootTableRef: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    toolbarActions: [{ icon: '🎲', label: 'Drop Rate Simulator', onClick: openDropRateSimulator }],
    onCreate: (item) => autoTask('items', item, {
      category: 'art', estimateHours: 2, title: (i) => `Create icon/model art: ${i.name}`,
      description: `Art pass for ${item.subtype || 'item'} "${item.name}" (${item.rarity || 'Common'}).`,
    }),
    helpText: 'Weapons, armour, accessories, consumables, crafting materials, quest items, currencies, mounts, cosmetics/skins, blueprints, relics/artifacts, throwables, ammunition, tools, gems/runes, deployables, recipes, banners/trophies, transports and containers — rarity, stats, affixes, item sets, sockets, durability and recipe unlocks are all fully editable.',
  });
  return view.mount(container, opts);
}
