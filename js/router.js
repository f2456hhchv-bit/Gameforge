// Tiny indirection so feature modules can navigate (e.g. jump to a backlinked
// entity) without importing app.js directly and creating a circular dependency.

let handler = null;

export function setNavigationHandler(fn) {
  handler = fn;
}

// moduleKey: key into MODULES registry (js/modules/registry.js); entityId optional.
export function openEntity(moduleKey, entityId) {
  if (handler) handler(moduleKey, entityId);
}
