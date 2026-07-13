import { h, uid, debounce, timeAgo } from './util.js';
import { DB } from './db.js';
import { store } from './store.js';
import { MODULES, resolveModuleKey, getModule } from './modules/registry.js';
import { setNavigationHandler } from './router.js';
import { openModal, closeTopModal, toast, promptModal, confirmModal } from './components/ui.js';

const root = document.getElementById('app');

// ---------- Boot: pick or create a project ----------
async function boot() {
  const summaries = await DB.listProjectSummaries();
  const lastId = await DB.getSetting('lastActiveProjectId');
  if (!summaries.length) {
    renderWelcome();
    return;
  }
  const toLoad = summaries.find(s => s.id === lastId) || summaries[0];
  await store.load(toLoad.id);
  renderShell();
}

function renderWelcome() {
  root.innerHTML = '';
  const nameInput = h('input', { class: 'input text-base', placeholder: 'e.g. Ashfall Chronicles', onkeydown: e => { if (e.key === 'Enter') create(); } });
  function create() {
    if (!nameInput.value.trim()) { nameInput.focus(); return; }
    const project = store.newProject(nameInput.value.trim());
    DB.setSetting('lastActiveProjectId', project.id).then(renderShell);
  }
  root.appendChild(h('div', { class: 'h-screen flex items-center justify-center' }, [
    h('div', { class: 'card p-10 w-[440px] flex flex-col gap-5 items-center text-center' }, [
      h('div', { class: 'text-5xl' }, '🎮'),
      h('h1', { class: 'text-2xl font-bold' }, 'GameForge Studio'),
      h('p', { class: 'text-sm text-slate-400' }, 'A complete pre-production & production planning toolkit. Everything is stored locally in your browser — nothing leaves this device.'),
      h('div', { class: 'w-full flex flex-col gap-2 text-left' }, [
        h('label', { class: 'label' }, 'Name your first project'),
        nameInput,
      ]),
      h('button', { class: 'btn-primary w-full justify-center py-2', onclick: create }, '✨ Create Project'),
    ]),
  ]));
  setTimeout(() => nameInput.focus(), 50);
}

// ---------- Shell ----------
const tabState = { tabs: [], activeKey: null }; // {tabKey, moduleKey, title, icon, container, controller}

function tabKeyFor(moduleKey) { return moduleKey; } // one tab per module for now

async function openTab(moduleKey, selectId) {
  const mod = getModule(moduleKey);
  if (!mod) return toast(`Unknown module: ${moduleKey}`, { type: 'error' });
  let tab = tabState.tabs.find(t => t.tabKey === tabKeyFor(moduleKey));
  if (!tab) {
    const container = h('div', { class: 'absolute inset-0 overflow-hidden flex flex-col' });
    document.getElementById('workspace').appendChild(container);
    tab = { tabKey: tabKeyFor(moduleKey), moduleKey, title: mod.label, icon: mod.icon, container, controller: null };
    tabState.tabs.push(tab);
    try {
      const mountFn = await mod.load();
      const ret = mountFn(container, { selectId });
      tab.controller = typeof ret === 'function' ? { unmount: ret } : (ret || {});
    } catch (err) {
      console.error(err);
      container.appendChild(h('div', { class: 'empty-state h-full justify-center' }, [
        h('div', { class: 'text-4xl' }, '🚧'),
        h('p', { class: 'font-medium' }, `${mod.label} is still under construction.`),
        h('p', { class: 'text-xs text-slate-400 max-w-sm' }, String(err.message || err)),
      ]));
    }
  } else if (selectId && tab.controller?.select) {
    tab.controller.select(selectId);
  }
  tabState.activeKey = tab.tabKey;
  renderTabbar();
  showActiveContainer();
}

function closeTab(tabKey) {
  const idx = tabState.tabs.findIndex(t => t.tabKey === tabKey);
  if (idx === -1) return;
  const [tab] = tabState.tabs.splice(idx, 1);
  tab.controller?.unmount?.();
  tab.container.remove();
  if (tabState.activeKey === tabKey) {
    const next = tabState.tabs[idx] || tabState.tabs[idx - 1];
    tabState.activeKey = next ? next.tabKey : null;
  }
  renderTabbar();
  showActiveContainer();
}

function showActiveContainer() {
  for (const t of tabState.tabs) t.container.style.display = t.tabKey === tabState.activeKey ? 'flex' : 'none';
  renderSidebar();
}

function renderTabbar() {
  const bar = document.getElementById('tabbar');
  bar.innerHTML = '';
  if (!tabState.tabs.length) {
    bar.classList.add('hidden');
    return;
  }
  bar.classList.remove('hidden');
  for (const t of tabState.tabs) {
    bar.appendChild(h('div', {
      class: `tab ${t.tabKey === tabState.activeKey ? 'active' : ''}`,
      onclick: () => { tabState.activeKey = t.tabKey; renderTabbar(); showActiveContainer(); },
    }, [
      h('span', {}, t.icon), h('span', { class: 'truncate' }, t.title),
      h('button', { class: 'hover:text-rose-500 ml-1', onclick: e => { e.stopPropagation(); closeTab(t.tabKey); } }, '✕'),
    ]));
  }
}

function renderSidebar() {
  const nav = document.getElementById('sidebar-nav');
  nav.innerHTML = '';
  const groups = [...new Set(MODULES.map(m => m.group))];
  for (const group of groups) {
    nav.appendChild(h('div', { class: 'nav-group-label' }, group));
    for (const mod of MODULES.filter(m => m.group === group)) {
      nav.appendChild(h('div', {
        class: `nav-item ${tabState.activeKey === mod.key ? 'active' : ''}`,
        onclick: () => openTab(mod.key),
      }, [h('span', {}, mod.icon), h('span', {}, mod.label)]));
    }
  }
}

function renderTopbar() {
  const bar = document.getElementById('topbar');
  bar.innerHTML = '';
  const project = store.project;

  const projSwitch = h('button', {
    class: 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-sm font-semibold',
    onclick: openProjectSwitcher,
  }, [h('span', {}, '🎮'), h('span', { class: 'max-w-[220px] truncate' }, project?.name || 'No project'), h('span', { class: 'text-xs text-slate-400' }, '▾')]);

  const saveIndicator = h('span', { id: 'save-indicator', class: 'text-xs text-slate-400 flex items-center gap-1' }, ['●', ' Saved']);

  const undoBtn = h('button', { class: 'btn-icon', title: 'Undo (Ctrl+Z)', onclick: () => { store.undo(); } }, '↺');
  const redoBtn = h('button', { class: 'btn-icon', title: 'Redo (Ctrl+Shift+Z)', onclick: () => { store.redo(); } }, '↻');

  const themeBtn = h('button', { class: 'btn-icon', title: 'Toggle dark mode', onclick: toggleTheme }, document.documentElement.classList.contains('dark') ? '☀️' : '🌙');
  const searchBtn = h('button', { class: 'btn-secondary text-xs text-slate-400', onclick: openCommandPalette }, ['🔍 Search…', h('kbd', { class: 'ml-2 text-[10px] bg-surface-2 px-1.5 py-0.5 rounded' }, 'Ctrl K')]);

  bar.append(
    h('div', { class: 'flex items-center gap-1' }, [projSwitch]),
    h('div', { class: 'flex-1 flex justify-center' }, [searchBtn]),
    h('div', { class: 'flex items-center gap-1' }, [saveIndicator, undoBtn, redoBtn, themeBtn]),
  );
}

function updateSaveIndicator(reason) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  if (reason === 'dirty') el.innerHTML = '<span class="text-amber-500">●</span> Saving…';
  else if (reason === 'saved') el.innerHTML = '<span class="text-emerald-500">●</span> Saved';
}

async function openProjectSwitcher() {
  const summaries = await DB.listProjectSummaries();
  const list = h('div', { class: 'flex flex-col gap-1' }, summaries.map(s => h('div', {
    class: `flex items-center justify-between gap-2 px-3 py-2 rounded-lg hover:bg-surface-2 cursor-pointer ${s.id === store.project.id ? 'bg-accent-muted' : ''}`,
  }, [
    h('div', { class: 'cursor-pointer flex-1', onclick: async () => { closeTopModal(); await store.load(s.id); await DB.setSetting('lastActiveProjectId', s.id); resetShellForProject(); } }, [
      h('div', { class: 'font-medium text-sm' }, s.name),
      h('div', { class: 'text-xs text-slate-400' }, `Updated ${timeAgo(s.updatedAt)}`),
    ]),
    h('button', {
      class: 'btn-icon text-rose-500', title: 'Delete project', onclick: async e => {
        e.stopPropagation();
        const ok = await confirmModal({ title: `Delete "${s.name}"?`, body: 'This permanently deletes the entire project.' });
        if (!ok) return;
        await DB.deleteProject(s.id);
        closeTopModal();
        openProjectSwitcher();
      },
    }, '🗑'),
  ])));
  const content = h('div', { class: 'flex flex-col gap-3' }, [
    list.children.length ? list : h('p', { class: 'text-sm text-slate-400' }, 'No projects yet.'),
    h('button', {
      class: 'btn-primary w-full justify-center', onclick: async () => {
        const name = await promptModal({ title: 'New Project', label: 'Project name' });
        if (!name) return;
        closeTopModal();
        const project = store.newProject(name);
        await DB.setSetting('lastActiveProjectId', project.id);
        resetShellForProject();
      },
    }, '+ New Project'),
  ]);
  openModal(content, { title: 'Switch Project', width: '440px' });
}

function resetShellForProject() {
  for (const t of tabState.tabs) { t.controller?.unmount?.(); t.container.remove(); }
  tabState.tabs = [];
  tabState.activeKey = null;
  renderTopbar();
  renderTabbar();
  openTab('dashboard');
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  DB.setSetting('theme', isDark ? 'dark' : 'light');
  renderTopbar();
}

function openCommandPalette() {
  const input = h('input', { class: 'input text-base', placeholder: 'Jump to a module… or type "new" to create an item' });
  const results = h('div', { class: 'flex flex-col gap-0.5 mt-3 max-h-[360px] overflow-y-auto' });
  function draw(term = '') {
    results.innerHTML = '';
    const items = MODULES.filter(m => m.label.toLowerCase().includes(term.toLowerCase()));
    items.forEach(m => results.appendChild(h('div', {
      class: 'ctx-menu-item', onclick: () => { closeTopModal(); openTab(m.key); },
    }, [h('span', {}, m.icon), h('span', {}, m.label)])));
  }
  input.addEventListener('input', () => draw(input.value));
  draw();
  openModal(h('div', {}, [input, results]), { title: 'Command Palette', width: '480px' });
  setTimeout(() => input.focus(), 30);
}

function wireKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
    else if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); }
    else if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); }
  });
}

async function initTheme() {
  const saved = await DB.getSetting('theme', 'dark');
  if (saved === 'dark') document.documentElement.classList.add('dark');
}

function renderShell() {
  root.innerHTML = '';
  root.appendChild(h('div', { class: 'flex h-screen overflow-hidden' }, [
    h('aside', { class: 'w-56 shrink-0 border-r border-surface-3/60 flex flex-col bg-surface-0' }, [
      h('div', { class: 'flex items-center gap-2 px-4 h-14 border-b border-surface-3/60 shrink-0' }, [
        h('span', { class: 'text-xl' }, '🎮'), h('span', { class: 'font-bold' }, 'GameForge'),
      ]),
      h('nav', { id: 'sidebar-nav', class: 'flex-1 overflow-y-auto scroll-thin px-2 py-2' }),
    ]),
    h('div', { class: 'flex-1 flex flex-col overflow-hidden' }, [
      h('header', { id: 'topbar', class: 'h-14 shrink-0 border-b border-surface-3/60 flex items-center justify-between px-3 bg-surface-0' }),
      h('div', { id: 'tabbar', class: 'h-9 shrink-0 border-b border-surface-3/60 flex overflow-x-auto bg-surface-1' }),
      h('main', { id: 'workspace', class: 'flex-1 relative overflow-hidden bg-surface-1' }),
    ]),
  ]));
  renderSidebar();
  renderTopbar();
  store.on((project, reason) => updateSaveIndicator(reason));
  openTab('dashboard');
}

setNavigationHandler((target, entityId) => openTab(resolveModuleKey(target), entityId));

(async function main() {
  await initTheme();
  wireKeyboardShortcuts();
  document.getElementById('toast-root');
  await boot();
})();
