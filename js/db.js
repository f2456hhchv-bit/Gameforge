// IndexedDB persistence layer. Each project is stored as a single record
// (a JSON-serializable blob) so in-memory relations are trivial id lookups.
// No backend, no bundler - plain ES module, works from file:// or any static server.

const DB_NAME = 'gameforge-studio';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SETTINGS = 'settings';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
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

function tx(storeName, mode) {
  return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const DB = {
  async listProjectSummaries() {
    const store = await tx(STORE_PROJECTS, 'readonly');
    const all = await reqToPromise(store.getAll());
    return all
      .map(p => ({ id: p.id, name: p.name, updatedAt: p.updatedAt, createdAt: p.createdAt, meta: p.meta }))
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  },

  async getProject(id) {
    const store = await tx(STORE_PROJECTS, 'readonly');
    return reqToPromise(store.get(id));
  },

  async saveProject(project) {
    project.updatedAt = new Date().toISOString();
    const store = await tx(STORE_PROJECTS, 'readwrite');
    await reqToPromise(store.put(project));
    return project;
  },

  async deleteProject(id) {
    const store = await tx(STORE_PROJECTS, 'readwrite');
    return reqToPromise(store.delete(id));
  },

  async getSetting(key, fallback = null) {
    const store = await tx(STORE_SETTINGS, 'readonly');
    const rec = await reqToPromise(store.get(key));
    return rec ? rec.value : fallback;
  },

  async setSetting(key, value) {
    const store = await tx(STORE_SETTINGS, 'readwrite');
    return reqToPromise(store.put({ key, value }));
  },
};
