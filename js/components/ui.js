import { h } from '../util.js';

let toastRoot;
export function toast(message, { type = 'info', timeout = 3200 } = {}) {
  if (!toastRoot) {
    toastRoot = document.getElementById('toast-root');
  }
  const icon = { info: 'ℹ️', success: '✅', error: '⛔', warn: '⚠️' }[type] || 'ℹ️';
  const node = h('div', { class: 'toast' }, [
    h('span', {}, icon),
    h('span', { class: 'text-slate-700 dark:text-slate-200' }, message),
  ]);
  toastRoot.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    node.style.transition = 'opacity .2s';
    setTimeout(() => node.remove(), 200);
  }, timeout);
}

function focusableIn(el) {
  return [...el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(n => !n.disabled && n.offsetParent !== null);
}

let modalRoot;
let modalStack = [];
export function openModal(contentEl, { title, width = '560px', onClose } = {}) {
  if (!modalRoot) modalRoot = document.getElementById('modal-root');
  const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;
  const previouslyFocused = document.activeElement;
  const backdrop = h('div', { class: 'modal-backdrop' });
  const panel = h('div', {
    class: 'modal-panel flex flex-col',
    style: `width:min(92vw, ${width}); max-height:86vh; top:7vh; left:50%; transform:translateX(-50%);`,
    role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId,
  });
  const closeBtn = h('button', { class: 'btn-icon', 'aria-label': 'Close dialog', onclick: () => close() }, '✕');
  const header = h('div', { class: 'flex items-center justify-between px-5 py-3.5 border-b border-surface-3/60 shrink-0' }, [
    h('h3', { class: 'font-semibold text-slate-800 dark:text-slate-100', id: titleId }, title || ''),
    closeBtn,
  ]);
  const body = h('div', { class: 'p-5 overflow-y-auto scroll-thin' }, [contentEl]);
  panel.append(header, body);
  function close() {
    backdrop.remove();
    panel.remove();
    document.removeEventListener('keydown', onKeydown);
    modalStack.pop();
    onClose && onClose();
    if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
  }
  function onKeydown(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab') {
      const focusable = focusableIn(panel);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  backdrop.addEventListener('click', close);
  document.addEventListener('keydown', onKeydown);
  modalRoot.append(backdrop, panel);
  modalStack.push(close);
  const toFocus = focusableIn(panel)[0];
  if (toFocus) setTimeout(() => toFocus.focus(), 20);
  return { close, panel, body };
}

export function closeTopModal() {
  const fn = modalStack[modalStack.length - 1];
  if (fn) fn();
}

export function confirmModal({ title = 'Are you sure?', body = '', confirmLabel = 'Delete', danger = true }) {
  return new Promise(resolve => {
    const content = h('div', { class: 'flex flex-col gap-4' }, [
      body && h('p', { class: 'text-sm text-slate-500 dark:text-slate-400' }, body),
      h('div', { class: 'flex justify-end gap-2 pt-1' }, [
        h('button', { class: 'btn-secondary', onclick: () => { modal.close(); resolve(false); } }, 'Cancel'),
        h('button', {
          class: danger ? 'btn-danger' : 'btn-primary',
          onclick: () => { modal.close(); resolve(true); },
        }, confirmLabel),
      ]),
    ]);
    const modal = openModal(content, { title, width: '420px' });
  });
}

export function promptModal({ title = 'Input', label = '', placeholder = '', value = '' }) {
  return new Promise(resolve => {
    const input = h('input', { class: 'input', value, placeholder, onkeydown: e => { if (e.key === 'Enter') submit(); } });
    const content = h('div', { class: 'flex flex-col gap-3' }, [
      label && h('label', { class: 'label' }, label),
      input,
      h('div', { class: 'flex justify-end gap-2 pt-1' }, [
        h('button', { class: 'btn-secondary', onclick: () => { modal.close(); resolve(null); } }, 'Cancel'),
        h('button', { class: 'btn-primary', onclick: () => submit() }, 'OK'),
      ]),
    ]);
    function submit() { modal.close(); resolve(input.value); }
    const modal = openModal(content, { title, width: '420px' });
    setTimeout(() => input.focus(), 30);
  });
}

let ctxMenuEl;
export function contextMenu(items, x, y) {
  closeContextMenu();
  ctxMenuEl = h('div', { class: 'ctx-menu', style: `left:${x}px; top:${y}px;` },
    items.map(it => it.divider
      ? h('div', { class: 'h-px bg-surface-3 my-1' })
      : h('div', {
          class: 'ctx-menu-item' + (it.danger ? ' text-rose-600 dark:text-rose-400' : ''),
          onclick: () => { closeContextMenu(); it.action(); },
        }, [it.icon && h('span', {}, it.icon), h('span', {}, it.label)])
    ));
  document.body.appendChild(ctxMenuEl);
  const rect = ctxMenuEl.getBoundingClientRect();
  if (rect.right > window.innerWidth) ctxMenuEl.style.left = `${x - rect.width}px`;
  if (rect.bottom > window.innerHeight) ctxMenuEl.style.top = `${y - rect.height}px`;
  setTimeout(() => document.addEventListener('click', closeContextMenu, { once: true }), 0);
}

export function closeContextMenu() {
  if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; }
}
