// Central registry of every data collection stored inside a project.
// Field-level schemas (used to render generic forms) live in each module file
// so this stays a lightweight index - it's imported by store.js so keep it dependency-free.

export const COLLECTIONS = {
  designDocs: { label: 'Design Documents', icon: '🧭', group: 'Design' },
  biomes: { label: 'World Entries', icon: '🌍', group: 'World' },
  characters: { label: 'Characters', icon: '🧑‍🎤', group: 'Characters' },
  items: { label: 'Items', icon: '🗡️', group: 'Items' },
  combatEntries: { label: 'Combat Systems', icon: '⚔️', group: 'Combat' },
  levels: { label: 'Levels', icon: '🗺️', group: 'Levels' },
  artPrompts: { label: 'Art Prompts', icon: '🎨', group: 'Art' },
  uiScreens: { label: 'UI Screens', icon: '🖥️', group: 'UI' },
  audioEntries: { label: 'Audio', icon: '🔊', group: 'Audio' },
  tasks: { label: 'Tasks', icon: '✅', group: 'Production' },
  docs: { label: 'Documentation', icon: '📄', group: 'Production' },
  milestones: { label: 'Milestones', icon: '🏁', group: 'Production' },
  activityLog: { label: 'Activity', icon: '🕘', group: 'System' },
  assistantLog: { label: 'Assistant Chat', icon: '🤖', group: 'System' },
};

// Shared vocab used across many field schemas.
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
export const PRIORITIES = ['low', 'medium', 'high', 'critical'];
export const TASK_STATUSES = ['backlog', 'todo', 'in-progress', 'review', 'done'];
export const DIFFICULTIES = ['trivial', 'easy', 'medium', 'hard', 'very-hard'];
export const PLATFORMS = ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile (iOS)', 'Mobile (Android)', 'Web', 'VR'];
export const ENGINES = ['Unity', 'Unreal Engine', 'Godot', 'GameMaker', 'Custom Engine', 'Construct', 'RPG Maker'];
export const ART_STYLES = ['2D Hand-Drawn', 'Pixel Art', 'Stylized 3D', 'Hand Painted', 'Nintendo-Style', 'Anime', 'Low Poly', 'Realistic', 'Voxel'];

export function badgeForPriority(p) {
  return { low: 'badge-gray', medium: 'badge-blue', high: 'badge-amber', critical: 'badge-rose' }[p] || 'badge-gray';
}
export function badgeForRarity(r) {
  return {
    Common: 'badge-gray', Uncommon: 'badge-green', Rare: 'badge-blue',
    Epic: 'badge-purple', Legendary: 'badge-amber', Mythic: 'badge-rose',
  }[r] || 'badge-gray';
}
