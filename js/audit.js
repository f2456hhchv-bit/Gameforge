// Project gap audit — read-only analysis of the current project for
// obviously-incomplete or disconnected content. Used by the AI Assistant's
// "audit" command and the Dashboard's gap-audit panel, so both stay in sync
// off one source of truth. Each finding carries `refs` ({collection, id,
// name}[]) so a UI can build "open" links without per-area special-casing.
import { store } from './store.js';
import { COLLECTIONS } from './schema.js';

function isOrphan(item) {
  const hasOutgoing = item.links && Object.values(item.links).some(v => (Array.isArray(v) ? v.length : v));
  if (hasOutgoing) return false;
  return store.backlinks(item.id).length === 0;
}

export function runProjectAudit() {
  const findings = [];
  const push = (area, severity, message, items = [], collection = area) => {
    const refs = items.map(item => ({ collection: item.collection || collection, id: item.id, name: item.name }));
    findings.push({ area, severity, message, refs, count: refs.length || undefined });
  };

  const characters = store.list('characters');
  const combatChars = characters.filter(c => ['enemy', 'boss', 'wildlife'].includes(c.subtype));
  const bosses = characters.filter(c => c.subtype === 'boss');
  const noSpawn = combatChars.filter(c => !c.links?.spawnBiome);
  if (noSpawn.length) push('characters', 'warning', `${noSpawn.length} enemy/boss/wildlife ${noSpawn.length === 1 ? 'character has' : 'characters have'} no spawn location set`, noSpawn);
  const bossesNoDrops = bosses.filter(b => !b.links?.drops?.length);
  if (bossesNoDrops.length) push('characters', 'warning', `${bossesNoDrops.length} ${bossesNoDrops.length === 1 ? 'boss has' : 'bosses have'} no loot drops linked`, bossesNoDrops);
  const bossesNoAbilities = bosses.filter(b => !b.abilities?.length);
  if (bossesNoAbilities.length) push('characters', 'info', `${bossesNoAbilities.length} ${bossesNoAbilities.length === 1 ? 'boss has' : 'bosses have'} no abilities listed`, bossesNoAbilities);

  const quests = store.list('quests');
  const questsNoGiver = quests.filter(q => !q.links?.giver);
  if (questsNoGiver.length) push('quests', 'warning', `${questsNoGiver.length} ${questsNoGiver.length === 1 ? 'quest has' : 'quests have'} no quest giver linked`, questsNoGiver);
  const questsNoLocation = quests.filter(q => !q.links?.location);
  if (questsNoLocation.length) push('quests', 'info', `${questsNoLocation.length} ${questsNoLocation.length === 1 ? 'quest has' : 'quests have'} no location linked`, questsNoLocation);
  const questsNoReward = quests.filter(q => !(q.rewards?.length) && !q.rewardXP);
  if (questsNoReward.length) push('quests', 'warning', `${questsNoReward.length} ${questsNoReward.length === 1 ? 'quest has' : 'quests have'} no rewards (no items, no XP)`, questsNoReward);

  const items = store.list('items');
  const itemsNoDesc = items.filter(i => !i.description || !i.description.trim());
  if (itemsNoDesc.length) push('items', 'info', `${itemsNoDesc.length} ${itemsNoDesc.length === 1 ? 'item has' : 'items have'} no description`, itemsNoDesc);

  const levels = store.list('levels');
  const levelsNoEnemies = levels.filter(l => !l.links?.enemies?.length && !l.links?.biome);
  if (levelsNoEnemies.length) push('levels', 'info', `${levelsNoEnemies.length} ${levelsNoEnemies.length === 1 ? 'level is' : 'levels are'} not linked to a biome or any enemies yet`, levelsNoEnemies);

  const designDocs = store.list('designDocs');
  const requiredDocs = [
    { subtype: 'pillar', label: 'a Design Pillar' },
    { subtype: 'core-loop', label: 'the Core Gameplay Loop' },
    { subtype: 'usp', label: 'a Unique Selling Proposition' },
    { subtype: 'difficulty', label: 'a Difficulty document' },
  ];
  const missingDocs = requiredDocs.filter(d => !designDocs.some(doc => doc.subtype === d.subtype));
  if (missingDocs.length) push('designDocs', 'warning', `Missing core design docs: ${missingDocs.map(d => d.label).join(', ')}`, []);

  const orphanCollections = ['characters', 'items', 'quests', 'biomes', 'levels'];
  const orphans = [];
  for (const key of orphanCollections) {
    for (const item of store.list(key)) {
      if (item.subtype === 'faction') continue;
      if (isOrphan(item)) orphans.push({ collection: key, id: item.id, name: item.name });
    }
  }
  if (orphans.length) push('links', 'info', `${orphans.length} ${orphans.length === 1 ? 'entity has' : 'entities have'} no links at all (not referenced by, or referencing, anything else)`, orphans);

  const tasks = store.list('tasks');
  const backlogTasks = tasks.filter(t => t.status === 'backlog');
  if (tasks.length >= 5 && backlogTasks.length / tasks.length > 0.5) {
    push('tasks', 'info', `${backlogTasks.length} of ${tasks.length} production tasks are still in Backlog (${Math.round(100 * backlogTasks.length / tasks.length)}%)`, backlogTasks);
  }

  const emptyCollections = Object.keys(COLLECTIONS)
    .filter(k => !['activityLog', 'assistantLog', 'tasks', 'docs', 'milestones'].includes(k))
    .filter(k => store.list(k).length === 0);
  if (emptyCollections.length) push('coverage', 'info', `No content yet in: ${emptyCollections.map(k => COLLECTIONS[k].label).join(', ')}`, []);

  const severityRank = { warning: 0, info: 1 };
  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  return {
    findings,
    summary: findings.length
      ? `${findings.filter(f => f.severity === 'warning').length} warning(s), ${findings.filter(f => f.severity === 'info').length} suggestion(s)`
      : 'No gaps found — everything checked looks linked and filled in.',
  };
}
