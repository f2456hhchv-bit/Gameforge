// Minimal keyboard input manager for the Play Engine. Self-contained per
// instance (no module-level state) so mounting/unmounting the engine never
// leaks listeners or shares state across sessions.
export function createInput() {
  const keys = new Set();
  const pressedEdge = new Set();
  const PREVENT_DEFAULT_CODES = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'KeyW', 'KeyA', 'KeyS', 'KeyD']);

  function onKeyDown(e) {
    if (PREVENT_DEFAULT_CODES.has(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressedEdge.add(e.code);
    keys.add(e.code);
  }
  function onKeyUp(e) {
    keys.delete(e.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    isDown: (code) => keys.has(code),
    // Edge-triggered: true once per physical press, until consumed.
    consumePressed(code) {
      if (pressedEdge.has(code)) {
        pressedEdge.delete(code);
        return true;
      }
      return false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      keys.clear();
      pressedEdge.clear();
    },
  };
}
