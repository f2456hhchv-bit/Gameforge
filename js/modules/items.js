import { createCollectionView } from '../components/collectionView.js';
import { rngFor, generateWeaponName, weaponStats, rarityRoll } from '../generators/procedural.js';
import { h, pick, pickN } from '../util.js';
import { RARITIES, badgeForRarity } from '../schema.js';
import { WEAPON_BASE, ARMOR_PIECES, ACCESSORY_TYPES, CONSUMABLE_TYPES, CURRENCY_TYPES, QUEST_ITEM_TYPES, AFFIXES, RESOURCE_BASE, LEGENDARY_TITLES } from '../generators/wordbank.js';
import { autoTask } from '../taskHooks.js';
import { openModal } from '../components/ui.js';
import { barChart } from '../components/charts.js';

const RARITY_TABLE_WEIGHTS = { Common: 45, Uncommon: 28, Rare: 16, Epic: 7, Legendary: 3, Mythic: 1 };
const RARITY_TABLE_TOTAL = Object.values(RARITY_TABLE_WEIGHTS).reduce((a, b) => a + b, 0);

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
    fields: FIELDS,
    makeDefaults: () => ({ rarity: 'Common', statistics: [], affixes: [], enchantments: [], upgradeTree: [], craftedFrom: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    toolbarActions: [{ icon: '🎲', label: 'Drop Rate Simulator', onClick: openDropRateSimulator }],
    onCreate: (item) => autoTask('items', item, {
      category: 'art', estimateHours: 2, title: (i) => `Create icon/model art: ${i.name}`,
      description: `Art pass for ${item.subtype || 'item'} "${item.name}" (${item.rarity || 'Common'}).`,
    }),
    helpText: 'Weapons, armour, accessories, consumables, crafting materials, quest items and currencies — rarity, stats and affixes are all fully editable.',
  });
  return view.mount(container, opts);
}
