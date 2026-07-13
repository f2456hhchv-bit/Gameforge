// In-memory reactive project store: single source of truth for the active project.
// Wraps DB persistence (autosave, debounced) and undo/redo (command-snapshot based).

import { DB } from './db.js';
import { uid, nowISO, debounce } from './util.js';
import { COLLECTIONS } from './schema.js';

const MAX_HISTORY = 60;

class Store {
  constructor() {
    this.project = null;
    this.listeners = new Set();
    this.undoStack = [];
    this.redoStack = [];
    this._autosave = debounce(() => this._persist(), 600);
    this.dirty = false;
    this.lastSavedAt = null;
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  emit(reason = 'update') {
    for (const fn of this.listeners) fn(this.project, reason);
  }

  newProject(name, meta = {}) {
    const project = {
      id: uid('proj'),
      name: name || 'Untitled Project',
      createdAt: nowISO(),
      updatedAt: nowISO(),
      meta: {
        genre: meta.genre || '',
        platform: meta.platform || [],
        engine: meta.engine || '',
        version: meta.version || '0.1.0',
        budget: meta.budget || '',
        targetRelease: meta.targetRelease || '',
        ...meta,
      },
      collections: Object.fromEntries(Object.keys(COLLECTIONS).map(k => [k, []])),
    };
    this.project = project;
    this.undoStack = [];
    this.redoStack = [];
    this.logActivity(`Project "${project.name}" created`, { icon: 'sparkles' });
    this._persist();
    this.emit('load');
    return project;
  }

  async load(id) {
    const project = await DB.getProject(id);
    if (!project) return null;
    // Ensure forward-compat: any collections added since project was saved exist.
    for (const key of Object.keys(COLLECTIONS)) {
      if (!project.collections[key]) project.collections[key] = [];
    }
    this.project = project;
    this.undoStack = [];
    this.redoStack = [];
    this.emit('load');
    return project;
  }

  async _persist() {
    if (!this.project) return;
    await DB.saveProject(this.project);
    this.dirty = false;
    this.lastSavedAt = new Date();
    this.emit('saved');
  }

  touch() {
    this.dirty = true;
    this.project.updatedAt = nowISO();
    this.emit('dirty');
    this._autosave();
  }

  // --- Undo/redo: call snapshot() before a logical mutation, commit() after. ---
  snapshot() {
    this._pending = JSON.stringify(this.project);
  }

  commit(label = 'Change') {
    if (this._pending) {
      this.undoStack.push(this._pending);
      if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
      this.redoStack = [];
      this._pending = null;
    }
    this.touch();
    this.emit('mutate:' + label);
  }

  canUndo() { return this.undoStack.length > 0; }
  canRedo() { return this.redoStack.length > 0; }

  undo() {
    if (!this.undoStack.length) return;
    this.redoStack.push(JSON.stringify(this.project));
    this.project = JSON.parse(this.undoStack.pop());
    this.touch();
    this.emit('undo');
  }

  redo() {
    if (!this.redoStack.length) return;
    this.undoStack.push(JSON.stringify(this.project));
    this.project = JSON.parse(this.redoStack.pop());
    this.touch();
    this.emit('redo');
  }

  // --- Generic collection CRUD ---
  list(collectionKey) {
    return this.project?.collections[collectionKey] || [];
  }

  get(collectionKey, id) {
    return this.list(collectionKey).find(i => i.id === id) || null;
  }

  upsert(collectionKey, item, { commit = true, label } = {}) {
    if (commit) this.snapshot();
    const arr = this.project.collections[collectionKey];
    const idx = arr.findIndex(i => i.id === item.id);
    item.updatedAt = nowISO();
    if (idx === -1) {
      item.createdAt = item.createdAt || nowISO();
      arr.push(item);
    } else {
      arr[idx] = item;
    }
    if (commit) this.commit(label || `Save ${COLLECTIONS[collectionKey]?.label || collectionKey}`);
    return item;
  }

  remove(collectionKey, id, { commit = true, label } = {}) {
    if (commit) this.snapshot();
    const arr = this.project.collections[collectionKey];
    const idx = arr.findIndex(i => i.id === id);
    if (idx !== -1) arr.splice(idx, 1);
    // Clean dangling relation references across all collections.
    for (const key of Object.keys(this.project.collections)) {
      for (const item of this.project.collections[key]) {
        for (const field of Object.values(item.links || {})) {
          // no-op placeholder; relation arrays cleaned in cleanRelations()
        }
      }
    }
    this.cleanRelations(collectionKey, id);
    if (commit) this.commit(label || `Delete from ${collectionKey}`);
  }

  cleanRelations(removedCollection, removedId) {
    for (const key of Object.keys(this.project.collections)) {
      for (const item of this.project.collections[key]) {
        if (!item.links) continue;
        for (const [linkKey, val] of Object.entries(item.links)) {
          if (Array.isArray(val)) {
            item.links[linkKey] = val.filter(v => v !== removedId);
          } else if (val === removedId) {
            item.links[linkKey] = null;
          }
        }
      }
    }
  }

  duplicate(collectionKey, id) {
    const item = this.get(collectionKey, id);
    if (!item) return null;
    const copy = JSON.parse(JSON.stringify(item));
    copy.id = uid(collectionKey);
    copy.name = (copy.name || 'Untitled') + ' (Copy)';
    copy.createdAt = nowISO();
    this.upsert(collectionKey, copy, { label: `Duplicate ${copy.name}` });
    return copy;
  }

  // Backlinks: find every entity across the project that references `id` via a links.* array/value.
  backlinks(id) {
    const results = [];
    for (const [key, arr] of Object.entries(this.project.collections)) {
      for (const item of arr) {
        if (!item.links) continue;
        for (const val of Object.values(item.links)) {
          const hit = Array.isArray(val) ? val.includes(id) : val === id;
          if (hit) { results.push({ collection: key, item }); break; }
        }
      }
    }
    return results;
  }

  logActivity(message, meta = {}) {
    if (!this.project) return;
    this.project.collections.activityLog.unshift({
      id: uid('log'),
      message,
      meta,
      createdAt: nowISO(),
    });
    if (this.project.collections.activityLog.length > 300) {
      this.project.collections.activityLog.length = 300;
    }
  }

  addTask(task) {
    const full = {
      id: uid('task'),
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'medium',
      status: task.status || 'backlog',
      category: task.category || 'general',
      difficulty: task.difficulty || 'medium',
      estimateHours: task.estimateHours ?? 2,
      sprint: task.sprint || '',
      assignee: task.assignee || '',
      dependencies: task.dependencies || [],
      links: task.links || { dependencies: [] },
      sourceRef: task.sourceRef || null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    this.project.collections.tasks.push(full);
    this.touch();
    return full;
  }
}

export const store = new Store();
window.__gfStore = store; // handy for debugging in devtools
