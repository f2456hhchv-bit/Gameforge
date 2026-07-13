import { createCollectionView } from '../components/collectionView.js';
import { rngFor, generateWeaponName, weaponStats, rarityRoll } from '../generators/procedural.js';
import { pick, pickN } from '../util.js';
import { RARITIES, badgeForRarity } from '../schema.js';
import { WEAPON_BASE, ARMOR_PIECES, ACCESSORY_TYPES, CONSUMABLE_TYPES, CURRENCY_TYPES, QUEST_ITEM_TYPES, AFFIXES, RESOURCE_BASE } from '../generators/wordbank.js';
import { autoTask } from '../taskHooks.js';

export const SUBTYPES = [
  { key: 'weapon', label: 'Weapon', icon: '🗡️' },
  { key: 'armor', label: 'Armour', icon: '🛡️' },
  { key: 'accessory', label: 'Accessory', icon: '💍' },
  { key: 'consumable', label: 'Consumable', icon: '🧪' },
  { key: 'material', label: 'Crafting Material', icon: '🪵' },
  { key: 'quest-item', label: 'Quest Item', icon: '📜' },
  { key: 'currency', label: 'Currency', icon: '🪙' },
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
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [
    { text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' },
    item.rarity && { text: item.rarity, cls: badgeForRarity(item.rarity) },
  ].filter(Boolean);
}

const TYPE_NAME_BANK = {
  armor: ARMOR_PIECES, accessory: ACCESSORY_TYPES, consumable: CONSUMABLE_TYPES,
  currency: CURRENCY_TYPES, 'quest-item': QUEST_ITEM_TYPES,
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
    default:
      return [];
  }
}

export function generateItem(rng, subtype) {
  const rarity = rarityRoll(rng);
  let name, description;
  if (subtype === 'weapon') {
    const weaponType = pick(Object.keys(WEAPON_BASE), rng);
    name = generateWeaponName(rng, weaponType, rarity);
    description = `A ${rarity.toLowerCase()} ${weaponType} favored by those who survive.`;
  } else {
    const bank = TYPE_NAME_BANK[subtype] || ['Item'];
    const base = pick(bank, rng);
    const useAffix = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(rarity) && rng() < 0.6;
    name = useAffix ? `${base} ${pick(AFFIXES, rng)}` : (subtype === 'material' ? pick(RESOURCE_BASE, rng) : base);
    description = `A ${rarity.toLowerCase()} ${subtype.replace('-', ' ')}.`;
  }
  const stats = subtype === 'weapon' ? weaponStats(rng, rarity) : genericStats(rng, subtype, rarity);
  const affixes = ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(rarity) ? pickN(AFFIXES, rarity === 'Mythic' ? 2 : 1, rng) : [];
  return {
    name, description, rarity,
    value: Math.round((5 + rng() * 500) * ({ Common: 1, Uncommon: 2, Rare: 5, Epic: 12, Legendary: 30, Mythic: 80 }[rarity] || 1)),
    statistics: stats,
    affixes, enchantments: [], upgradeTree: [], craftedFrom: [],
    randomGenRule: `Rolls rarity via weighted table, then scales stats by rarity multiplier (${rarity}).`,
    links: {},
  };
}

const GENERATORS = [
  { label: 'Generate Item', run: ({ subtype }) => generateItem(rngFor(Math.random()), subtype || 'weapon') },
];

export function mountItems(container, opts) {
  const view = createCollectionView({
    key: 'items', singular: 'Item', plural: 'Items', icon: '🗡️',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ rarity: 'Common', statistics: [], affixes: [], enchantments: [], upgradeTree: [], craftedFrom: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    onCreate: (item) => autoTask('items', item, {
      category: 'art', estimateHours: 2, title: (i) => `Create icon/model art: ${i.name}`,
      description: `Art pass for ${item.subtype || 'item'} "${item.name}" (${item.rarity || 'Common'}).`,
    }),
    helpText: 'Weapons, armour, accessories, consumables, crafting materials, quest items and currencies — rarity, stats and affixes are all fully editable.',
  });
  return view.mount(container, opts);
}
