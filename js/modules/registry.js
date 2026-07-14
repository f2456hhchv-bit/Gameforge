// Central module registry: drives the sidebar nav and the tabbed workspace router.
// Each module lazily imports its mount function to keep initial load light.

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', icon: '📊', group: 'Overview', load: () => import('./dashboard.js').then(m => m.mountDashboard) },
  { key: 'graph', label: 'Relationship Graph', icon: '🕸️', group: 'Overview', load: () => import('./graph.js').then(m => m.mountGraph) },
  { key: 'designer', label: 'Game Designer', icon: '🧭', group: 'Design', load: () => import('./designer.js').then(m => m.mountDesigner) },
  { key: 'world', label: 'World Builder', icon: '🌍', group: 'Design', load: () => import('./world.js').then(m => m.mountWorld) },
  { key: 'characters', label: 'Character Studio', icon: '🧑‍🎤', group: 'Design', load: () => import('./characters.js').then(m => m.mountCharacters) },
  { key: 'items', label: 'Item Studio', icon: '🗡️', group: 'Design', load: () => import('./items.js').then(m => m.mountItems) },
  { key: 'combat', label: 'Combat Designer', icon: '⚔️', group: 'Design', load: () => import('./combat.js').then(m => m.mountCombat) },
  { key: 'levels', label: 'Level Designer', icon: '🗺️', group: 'Design', load: () => import('./levels.js').then(m => m.mountLevels) },
  { key: 'quests', label: 'Quest Designer', icon: '📯', group: 'Design', load: () => import('./quests.js').then(m => m.mountQuests) },
  { key: 'dialogue', label: 'Dialogue Tree Designer', icon: '💬', group: 'Design', load: () => import('./dialogue.js').then(m => m.mountDialogue) },
  { key: 'art', label: 'Art Director', icon: '🎨', group: 'Production', load: () => import('./art.js').then(m => m.mountArt) },
  { key: 'ui', label: 'UI Designer', icon: '🖥️', group: 'Production', load: () => import('./uiDesigner.js').then(m => m.mountUIDesigner) },
  { key: 'audio', label: 'Audio Designer', icon: '🔊', group: 'Production', load: () => import('./audio.js').then(m => m.mountAudio) },
  { key: 'controls', label: 'Controls Mapping', icon: '🎮', group: 'Production', load: () => import('./controls.js').then(m => m.mountControls) },
  { key: 'tasks', label: 'Task Manager', icon: '✅', group: 'Production', load: () => import('./tasks.js').then(m => m.mountTasks) },
  { key: 'achievements', label: 'Achievements', icon: '🏆', group: 'Production', load: () => import('./achievements.js').then(m => m.mountAchievements) },
  { key: 'docs', label: 'Documentation', icon: '📄', group: 'Production', load: () => import('./docs.js').then(m => m.mountDocs) },
  { key: 'playtests', label: 'Playtesting Tracker', icon: '🧪', group: 'Live Ops', load: () => import('./playtests.js').then(m => m.mountPlaytests) },
  { key: 'liveops', label: 'LiveOps Calendar', icon: '📅', group: 'Live Ops', load: () => import('./liveops.js').then(m => m.mountLiveOps) },
  { key: 'localization', label: 'Localization Manager', icon: '🌐', group: 'Live Ops', load: () => import('./localization.js').then(m => m.mountLocalization) },
  { key: 'analytics', label: 'Analytics Designer', icon: '📈', group: 'Live Ops', load: () => import('./analytics.js').then(m => m.mountAnalytics) },
];

export function getModule(key) {
  return MODULES.find(m => m.key === key);
}

// Maps a store *collection* key (used by backlinks/relations) to the module
// tab that should open to display it. Keys not listed map to themselves.
export const COLLECTION_TO_MODULE = {
  designDocs: 'designer',
  biomes: 'world',
  combatEntries: 'combat',
  artPrompts: 'art',
  uiScreens: 'ui',
  audioEntries: 'audio',
  dialogueNodes: 'dialogue',
  playtestSessions: 'playtests',
  liveOpsEvents: 'liveops',
  locStrings: 'localization',
  telemetryEvents: 'analytics',
  controlBindings: 'controls',
};

export function resolveModuleKey(target) {
  if (getModule(target)) return target;
  return COLLECTION_TO_MODULE[target] || target;
}
