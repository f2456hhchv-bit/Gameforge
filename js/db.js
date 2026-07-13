// IndexedDB persistence layer. Each project is stored as a single record
// (a JSON-serializable blob) so in-memory relations are trivial id lookups.
// No backend, no bundler - plain ES module, works from file:// or any static server.
//
// IndexedDB is not reliably available everywhere: Firefox blocks it entirely
// under a file:// origin, and some locked-down browser configs/extensions do
// too. If it's unavailable or fails to open, everything below transparently
// falls back to an in-memory store with the exact same async shape, so the
// app still boots and works for the session — it just can't persist across
// a reload/close. Call isUsingFallbackStorage() after any DB call to check.

const DB_NAME = 'gameforge-studio';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SETTINGS = 'settings';

let dbPromise = null;
let backend = null; // 'idb' | 'memory', decided once on first use

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined' || indexedDB === null) {
      reject(new Error('indexedDB is not available in this browser/context'));
      return;
    }
    let req;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
        db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function ensureBackend() {
  if (backend) return backend;
  try {
    await openDB();
    backend = 'idb';
  } catch (err) {
    console.warn('[GameForge] IndexedDB unavailable — falling back to in-memory storage. Your work will NOT persist across a reload/close in this session.', err);
    backend = 'memory';
  }
  return backend;
}

export function isUsingFallbackStorage() {
  return backend === 'memory';
}

function tx(storeName, mode) {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- In-memory fallback backend (same async shape as the IndexedDB path) ---
const memory = {
  projects: new Map(),
  settings: new Map(),
};

export const DB = {
  async listProjectSummaries() {
    await ensureBackend();
    if (backend === 'memory') {
      return [...memory.projects.values()]
        .map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt, meta: p.meta }))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    }
    const store = await tx(STORE_PROJECTS, 'readonly');
    const all = await reqToPromise(store.getAll());
    return all
      .map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt, meta: p.meta }))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async getProject(id) {
    await ensureBackend();
    if (backend === 'memory') return memory.projects.get(id) || null;
    const store = await tx(STORE_PROJECTS, 'readonly');
    return reqToPromise(store.get(id));
  },

  async saveProject(project) {
    project.updatedAt = new Date().toISOString();
    await ensureBackend();
    if (backend === 'memory') {
      memory.projects.set(project.id, project);
      return project;
    }
    const store = await tx(STORE_PROJECTS, 'readwrite');
    await reqToPromise(store.put(project));
    return project;
  },

  async deleteProject(id) {
    await ensureBackend();
    if (backend === 'memory') { memory.projects.delete(id); return; }
    const store = await tx(STORE_PROJECTS, 'readwrite');
    return reqToPromise(store.delete(id));
  },

  async getSetting(key, fallback = null) {
    await ensureBackend();
    if (backend === 'memory') return memory.settings.has(key) ? memory.settings.get(key) : fallback;
    const store = await tx(STORE_SETTINGS, 'readonly');
    const rec = await reqToPromise(store.get(key));
    return rec ? rec.value : fallback;
  },

  async setSetting(key, value) {
    await ensureBackend();
    if (backend === 'memory') { memory.settings.set(key, value); return; }
    const store = await tx(STORE_SETTINGS, 'readwrite');
    return reqToPromise(store.put({ key, value }));
  },
};
