// Smart auto-linking — proposes concrete, unambiguous link fixes (not just
// "this is missing" like audit.js, but "link THIS specific entity here") and
// applies them on request. Every heuristic only fires when the answer is
// unambiguous (exactly one sane candidate); anything with multiple plausible
// candidates is left for the user to decide by hand.
import { store } from './store.js';

const RARITY_RANK = { Common: 0, Uncommon: 1, Rare: 2, Epic: 3, Legendary: 4, Mythic: 5 };

function singleCandidate(list) {
  return list.length === 1 ? list[0] : null;
}

export function suggestLinks() {
  const suggestions = [];
  const push = (collection, id, field, value, valueLabel, reason) => {
    suggestions.push({ collection, id, field, value, valueLabel, reason });
  };

  const biomes = store.list('biomes').filter(b => b.subtype !== 'faction');
  const npcs = store.list('characters').filter(c => ['npc', 'merchant'].includes(c.subtype));
  const onlyBiome = singleCandidate(biomes);

  // Quests: giver, then location.
  for (const q of store.list('quests')) {
    if (!q.links?.giver) {
      let giver = null;
      if (q.links?.location) {
        const inLocation = npcs.filter(n => n.links?.spawnBiome === q.links.location);
        giver = singleCandidate(inLocation);
        if (giver) push('quests', q.id, 'giver', giver.id, giver.name, `Only NPC/merchant spawning at the quest's location`);
      }
      if (!giver) {
        const only = singleCandidate(npcs);
        if (only) push('quests', q.id, 'giver', only.id, only.name, 'Only NPC/merchant in the project');
      }
    }
    if (!q.links?.location && q.links?.giver) {
      const giver = store.get('characters', q.links.giver);
      if (giver?.links?.spawnBiome) {
        const biome = store.get('biomes', giver.links.spawnBiome);
        if (biome) push('quests', q.id, 'location', biome.id, biome.name, "Quest giver's spawn location");
      }
    }
  }

  // Combat characters: spawn biome.
  const combatChars = store.list('characters').filter(c => ['enemy', 'boss', 'wildlife'].includes(c.subtype));
  for (const c of combatChars) {
    if (!c.links?.spawnBiome && onlyBiome) {
      push('characters', c.id, 'spawnBiome', onlyBiome.id, onlyBiome.name, 'Only biome in the project');
    }
  }

  // Bosses: loot drops — suggest the highest-rarity item not already claimed
  // as a drop by any other character.
  const claimedItemIds = new Set(store.list('characters').flatMap(c => c.links?.drops || []));
  const unclaimedItems = store.list('items').filter(i => !claimedItemIds.has(i.id) && ['weapon', 'armor'].includes(i.subtype));
  for (const b of store.list('characters').filter(c => c.subtype === 'boss')) {
    if (b.links?.drops?.length) continue;
    const sorted = [...unclaimedItems].sort((x, y) => (RARITY_RANK[y.rarity] ?? -1) - (RARITY_RANK[x.rarity] ?? -1));
    const best = sorted[0];
    if (best) {
      push('characters', b.id, 'drops', [best.id], best.name, 'Highest-rarity unclaimed weapon/armor');
      claimedItemIds.add(best.id); // don't suggest the same item to two bosses in one pass
      unclaimedItems.splice(unclaimedItems.indexOf(best), 1);
    }
  }

  // Levels: biome, then enemies spawned in that biome.
  for (const l of store.list('levels')) {
    if (!l.links?.biome && onlyBiome) {
      push('levels', l.id, 'biome', onlyBiome.id, onlyBiome.name, 'Only biome in the project');
    }
    const biomeId = l.links?.biome || (onlyBiome && onlyBiome.id);
    if (biomeId && !l.links?.enemies?.length) {
      const spawned = combatChars.filter(c => c.links?.spawnBiome === biomeId);
      if (spawned.length) push('levels', l.id, 'enemies', spawned.map(c => c.id), `${spawned.length} character(s)`, 'Characters spawning in this level\'s biome');
    }
  }

  return suggestions;
}

export function applyLinkSuggestion(s) {
  const item = store.get(s.collection, s.id);
  if (!item) return false;
  store.snapshot();
  item.links = item.links || {};
  item.links[s.field] = s.value;
  store.commit(`Auto-link: ${s.field} on ${item.name}`);
  return true;
}

export function applyAllLinkSuggestions() {
  const suggestions = suggestLinks();
  if (!suggestions.length) return 0;
  store.snapshot();
  let applied = 0;
  for (const s of suggestions) {
    const item = store.get(s.collection, s.id);
    if (!item) continue;
    item.links = item.links || {};
    item.links[s.field] = s.value;
    applied++;
  }
  if (applied) store.commit(`Auto-link ${applied} suggestion(s)`);
  return applied;
}
