// Shared helper so every content module can auto-create a production task
// the moment a new entity is added — matching the "every generated feature
// automatically creates a task" requirement without duplicating logic.
import { store } from './store.js';

export function autoTask(collectionKey, item, opts = {}) {
  store.addTask({
    title: opts.title ? opts.title(item) : `Implement: ${item.name}`,
    category: opts.category || 'general',
    priority: opts.priority || 'medium',
    estimateHours: opts.estimateHours ?? 2,
    difficulty: opts.difficulty || 'medium',
    description: opts.description || `Auto-created when "${item.name}" was added.`,
    sourceRef: { collection: collectionKey, id: item.id, label: item.name },
  });
}
