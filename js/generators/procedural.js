import { pick, pickN, pickWeighted, makeRNG } from '../util.js';
import * as WB from './wordbank.js';

export function rngFor(seedExtra = '') {
  return makeRNG(Date.now() + '_' + Math.random() + seedExtra);
}

export function generateName(rng, syllableCount = 2) {
  let name = '';
  for (let i = 0; i < syllableCount; i++) name += pick(WB.NAME_SYLLABLES, rng);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function generateCharacterName(rng, subtype = 'npc') {
  const base = generateName(rng, 2 + Math.floor(rng() * 2));
  const withEpithet = rng() < 0.35;
  return withEpithet ? `${base} ${pick(WB.EPITHETS, rng)}` : base;
}

export function generateBiomeName(rng) {
  return `${pick(WB.BIOME_ADJECTIVES, rng)} ${pick(WB.BIOME_NOUNS, rng)}`;
}

export function generateBiomeLore(rng, biomeTypeLabel) {
  return `This ${biomeTypeLabel.toLowerCase()} region ${pick(WB.LORE_HOOKS, rng)}.`;
}

export function generateFactionName(rng) {
  return `The ${pick(WB.FACTION_PREFIXES, rng)} ${pick(WB.FACTION_SUFFIXES, rng)}`;
}

export function generateCreatureName(rng) {
  return `${pick(WB.CREATURE_MODIFIERS, rng)} ${pick(WB.CREATURE_BASES, rng)}`;
}

export function generateWeaponName(rng, weaponType, rarity) {
  const family = WB.WEAPON_BASE[weaponType] || WB.WEAPON_BASE.sword;
  const base = pick(family, rng);
  const prefix = pick(WB.WEAPON_PREFIXES, rng);
  const useAffix = rarity && ['Rare', 'Epic', 'Legendary', 'Mythic'].includes(rarity) && rng() < 0.7;
  return useAffix ? `${prefix} ${base} ${pick(WB.AFFIXES, rng)}` : `${prefix} ${base}`;
}

export function generateAbilityName(rng) {
  return `${pick(WB.ABILITY_NOUNS, rng)} ${pick(WB.ABILITY_VERBS, rng)}`;
}

export function generateQuestName(rng) {
  return `${pick(WB.QUEST_VERBS, rng)} ${pick(WB.QUEST_TARGETS, rng)}`;
}

export function rarityRoll(rng) {
  return pickWeighted([
    ['Common', 45], ['Uncommon', 28], ['Rare', 16], ['Epic', 7], ['Legendary', 3], ['Mythic', 1],
  ], rng);
}

export function statBlockForLevel(rng, level = 1, mult = 1) {
  const scale = (base) => Math.round(base * (1 + level * 0.18) * mult);
  return [
    { key: 'Health', value: String(scale(40)) },
    { key: 'Damage', value: String(scale(6)) },
    { key: 'Defense', value: String(scale(4)) },
    { key: 'Speed', value: String(Math.round(4 + rng() * 4)) },
  ];
}

export function weaponStats(rng, rarity) {
  const rarityMult = { Common: 1, Uncommon: 1.15, Rare: 1.35, Epic: 1.6, Legendary: 2, Mythic: 2.6 }[rarity] || 1;
  return [
    { key: 'Damage', value: String(Math.round((8 + rng() * 12) * rarityMult)) },
    { key: 'Attack Speed', value: (0.8 + rng() * 0.8).toFixed(2) },
    { key: 'Crit Chance', value: `${Math.round(5 + rng() * 15)}%` },
    { key: 'Durability', value: String(Math.round(80 + rng() * 120)) },
  ];
}

export function buildArtPromptText({ subjectName, subjectDesc, style, mood, lighting, camera, palette, materials, scale, animation, transparency, exportFormat, referenceNotes, negativePrompt, aspectRatio, resolution, postProcessing, variantCount }) {
  return [
    `Subject: ${subjectName}${subjectDesc ? ' — ' + subjectDesc : ''}`,
    `Art Style: ${style}`,
    `Mood: ${mood}`,
    `Lighting: ${lighting}`,
    `Camera: ${camera}`,
    `Color Palette: ${palette}`,
    `Materials/Textures: ${materials}`,
    `Scale/Proportions: ${scale}`,
    animation && `Animation Requirements: ${animation}`,
    `Transparency: ${transparency}`,
    `Export Format: ${exportFormat}`,
    aspectRatio && `Aspect Ratio: ${aspectRatio}`,
    resolution && `Target Resolution: ${resolution}`,
    postProcessing && `Post-Processing: ${postProcessing}`,
    variantCount && `Variants Needed: ${variantCount}`,
    referenceNotes && `Reference/Inspiration: ${referenceNotes}`,
    negativePrompt && `Negative Prompt (avoid): ${negativePrompt}`,
  ].filter(Boolean).join('\n');
}
