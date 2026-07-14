// Walks a real Dialogue Tree Designer node graph (via links.nextNode /
// links.branchTargets) and renders it as a simple visual-novel-style
// overlay — the same data structure the Relationship Graph draws edges
// for, now actually played through rather than just documented.
import { h } from '../util.js';
import { store } from '../store.js';

const MAX_STEPS = 12;

export function pickIntroDialogueNode() {
  const nodes = store.list('dialogueNodes');
  if (!nodes.length) return null;
  return nodes.find(n => n.subtype === 'opening-line') || nodes[0];
}

// Renders into `container` (which must be positioned) and calls onDone()
// once the player reaches a dead end or the step cap is hit.
export function renderDialogueOverlay(container, startNode, onDone) {
  let node = startNode;
  let steps = 0;
  const wrap = h('div', { class: 'absolute inset-x-0 bottom-0 p-4 flex justify-center pointer-events-none z-10' });
  container.appendChild(wrap);

  function finish() {
    wrap.remove();
    onDone();
  }

  function render() {
    wrap.innerHTML = '';
    if (!node || steps >= MAX_STEPS) { finish(); return; }
    steps++;
    const speaker = node.links?.speaker ? store.get('characters', node.links.speaker) : null;
    const branchIds = node.links?.branchTargets || [];

    const actions = branchIds.length
      ? h('div', { class: 'flex flex-col gap-1.5' }, branchIds.map(id => {
        const choice = store.get('dialogueNodes', id);
        return h('button', {
          class: 'btn-secondary justify-start text-left',
          onclick: () => { node = choice; render(); },
        }, choice?.choiceLabel || choice?.name || 'Continue');
      }))
      : h('button', {
        class: 'btn-primary self-end',
        onclick: () => {
          const nextId = node.links?.nextNode;
          node = nextId ? store.get('dialogueNodes', nextId) : null;
          render();
        },
      }, node.links?.nextNode ? 'Continue ▶' : 'Begin ▶');

    wrap.appendChild(h('div', { class: 'card p-4 max-w-lg w-full pointer-events-auto shadow-2xl' }, [
      h('p', { class: 'text-xs font-semibold text-accent mb-1' }, speaker?.name || 'Narrator'),
      h('p', { class: 'text-sm mb-3' }, node.lineText || node.choiceLabel || '…'),
      actions,
    ]));
  }
  render();
  return { skip: finish };
}
