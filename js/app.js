import { h, uid, debounce, timeAgo, download } from './util.js';
import { DB, isUsingFallbackStorage } from './db.js';
import { store } from './store.js';
import { MODULES, resolveModuleKey, getModule } from './modules/registry.js';
import { setNavigationHandler } from './router.js';
import { openModal, closeTopModal, toast, promptModal, confirmModal } from './components/ui.js';
import { COLLECTIONS } from './schema.js';
import { TEMPLATES } from './templates.js';
import { exportXLSXMultiSheet } from './modules/exportManager.js';
import { runProjectAudit } from './audit.js';
import { generateMashupBrief } from './mashup.js';

const LIVE_SITE_URL = 'https://f2456hhchv-bit.github.io/Gameforge/';

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

function templatePickerContent(onPick) {
  return h('div', { class: 'grid grid-cols-1 sm:grid-cols-2 gap-3' }, TEMPLATES.map(t => h('button', {
    class: 'card p-4 text-left flex flex-col gap-1.5 hover:border-accent hover:shadow-md transition-all',
    onclick: () => onPick(t),
  }, [
    h('div', { class: 'text-2xl' }, t.icon),
    h('div', { class: 'font-semibold text-sm' }, t.label),
    h('div', { class: 'text-xs text-slate-400 leading-relaxed' }, t.description),
  ])));
}

async function createProjectWithTemplate(name) {
  const template = await new Promise(resolve => {
    openModal(templatePickerContent(t => { closeTopModal(); resolve(t); }), { title: `Choose a starting point for "${name}"`, width: '640px' });
  });
  const project = store.newProject(name, template.meta || {});
  if (template.key !== 'blank') {
    store.snapshot();
    template.apply();
    store.commit(`Apply ${template.label} starter pack`);
  }
  await DB.setSetting('lastActiveProjectId', project.id);
  return project;
}

// If IndexedDB is unavailable (Firefox blocks it entirely under file://;
// some locked-down browsers/extensions do too), db.js transparently falls
// back to an in-memory store so the app still works this session — but
// nothing will survive a reload/close, so make that unmissable rather than
// letting people lose work silently.
function fallbackStorageBanner() {
  if (!isUsingFallbackStorage()) return null;
  const banner = h('div', { class: 'shrink-0 bg-amber-500 text-amber-950 text-sm px-4 py-2 flex items-center justify-between gap-3' }, [
    h('span', {}, '⚠️ This browser/mode blocked local storage — nothing here will be saved after you close or reload the page. For real persistence, open this file in Chrome or Edge instead, or use the hosted version.'),
    h('button', { class: 'shrink-0 hover:opacity-70', 'aria-label': 'Dismiss warning', onclick: () => banner.remove() }, '✕'),
  ]);
  return banner;
}

function renderWelcome() {
  root.innerHTML = '';
  const nameInput = h('input', { class: 'input text-base', placeholder: 'e.g. Ashfall Chronicles', onkeydown: e => { if (e.key === 'Enter') create(); } });
  async function create() {
    if (!nameInput.value.trim()) { nameInput.focus(); return; }
    await createProjectWithTemplate(nameInput.value.trim());
    renderShell();
  }
  root.appendChild(h('div', { class: 'h-screen flex flex-col' }, [
    fallbackStorageBanner(),
    h('div', { class: 'flex-1 flex items-center justify-center overflow-auto' }, [
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
    ]),
  ].filter(Boolean)));
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
        onclick: () => { openTab(mod.key); closeMobileSidebar(); },
      }, [h('span', {}, mod.icon), h('span', {}, mod.label)]));
    }
  }
}

// ---------- Mobile sidebar (off-canvas below the md breakpoint) ----------
const mobileSidebarState = { open: false };

function setMobileSidebar(open) {
  mobileSidebarState.open = open;
  document.getElementById('sidebar-aside')?.classList.toggle('-translate-x-full', !open);
  document.getElementById('sidebar-backdrop')?.classList.toggle('hidden', !open);
}
function toggleMobileSidebar() { setMobileSidebar(!mobileSidebarState.open); }
function closeMobileSidebar() { if (mobileSidebarState.open) setMobileSidebar(false); }

function renderTopbar() {
  const bar = document.getElementById('topbar');
  bar.innerHTML = '';
  const project = store.project;

  const menuBtn = h('button', { class: 'btn-icon md:hidden', title: 'Menu', 'aria-label': 'Open navigation menu', onclick: toggleMobileSidebar }, '☰');

  const projSwitch = h('button', {
    class: 'flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-surface-2 text-sm font-semibold min-w-0',
    onclick: openProjectSwitcher,
  }, [h('span', {}, '🎮'), h('span', { class: 'max-w-[64px] sm:max-w-[220px] truncate' }, project?.name || 'No project'), h('span', { class: 'text-xs text-slate-400' }, '▾')]);

  const saveIndicator = h('span', { id: 'save-indicator', class: 'text-xs text-slate-400 flex items-center gap-1' }, [h('span', {}, '●'), h('span', { class: 'hidden md:inline' }, ' Saved')]);

  const undoBtn = h('button', {
    class: 'btn-icon', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', disabled: !store.canUndo(),
    onclick: () => { store.undo(); },
  }, '↺');
  const redoBtn = h('button', {
    class: 'btn-icon', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', disabled: !store.canRedo(),
    onclick: () => { store.redo(); },
  }, '↻');

  const isDark = document.documentElement.classList.contains('dark');
  const themeBtn = h('button', { class: 'btn-icon', title: 'Toggle dark mode', 'aria-label': isDark ? 'Switch to light mode' : 'Switch to dark mode', onclick: toggleTheme }, isDark ? '☀️' : '🌙');
  const accentBtn = h('button', { class: 'btn-icon', title: 'Accent colour', 'aria-label': 'Choose accent colour', onclick: openAccentPicker }, '🎨');
  const searchBtn = h('button', { class: 'btn-secondary text-xs text-slate-400', 'aria-label': 'Search', onclick: openCommandPalette }, [
    h('span', {}, '🔍'), h('span', { class: 'hidden sm:inline' }, ' Search…'),
    h('kbd', { class: 'ml-2 text-[10px] bg-surface-2 px-1.5 py-0.5 rounded hidden sm:inline' }, 'Ctrl K'),
  ]);
  const backupBtn = h('button', { class: 'btn-icon', title: 'Backup / restore project, live site link', 'aria-label': 'Project backup menu', onclick: openBackupMenu }, '⋮');
  const helpBtn = h('button', { class: 'btn-icon', title: 'Keyboard shortcuts (?)', 'aria-label': 'Keyboard shortcuts', onclick: openShortcutsModal }, '⌨');
  const assistantBtn = h('button', { class: 'btn-secondary text-sm', title: 'AI Assistant', onclick: toggleAssistant }, [h('span', {}, '🤖'), h('span', { class: 'hidden sm:inline' }, ' Assistant')]);

  bar.append(
    h('div', { class: 'flex items-center gap-1 shrink-0' }, [menuBtn, projSwitch]),
    h('div', { class: 'flex-1 min-w-0 flex justify-center' }, [searchBtn]),
    h('div', { class: 'flex items-center gap-1 shrink-0' }, [
      saveIndicator, undoBtn, redoBtn,
      // Theme/accent/help are reachable via the search/command-palette's
      // Quick Actions, so they're desktop-only chrome — no room for them on
      // a phone-width topbar. The ⋮ menu (incl. the live site link) stays
      // visible on every screen size since it's a single compact icon.
      h('div', { class: 'hidden md:flex items-center gap-1' }, [themeBtn, accentBtn, helpBtn]),
      backupBtn,
      assistantBtn,
    ]),
  );
}

// ---------- Accent colour customization ----------
// --accent/--accent-muted are RGB-triple CSS custom properties (see
// css/input.css); applying them as an inline style on <html> beats the
// class-based .dark/:root declarations in specificity, so this works without
// touching the compiled stylesheet or needing a rebuild.
const ACCENT_PRESETS = [
  { key: 'indigo', label: 'Indigo', light: '79 70 229', lightMuted: '224 222 253', dark: '129 140 248', darkMuted: '49 46 84' },
  { key: 'blue', label: 'Blue', light: '37 99 235', lightMuted: '219 234 254', dark: '96 165 250', darkMuted: '30 58 95' },
  { key: 'emerald', label: 'Emerald', light: '5 150 105', lightMuted: '209 250 229', dark: '52 211 153', darkMuted: '6 78 59' },
  { key: 'rose', label: 'Rose', light: '225 29 72', lightMuted: '255 228 230', dark: '251 113 133', darkMuted: '76 5 25' },
  { key: 'amber', label: 'Amber', light: '217 119 6', lightMuted: '254 243 199', dark: '251 191 36', darkMuted: '69 51 4' },
  { key: 'violet', label: 'Violet', light: '124 58 237', lightMuted: '237 233 254', dark: '167 139 250', darkMuted: '53 40 100' },
  { key: 'teal', label: 'Teal', light: '13 148 136', lightMuted: '204 251 241', dark: '45 212 191', darkMuted: '19 66 63' },
];
let currentAccentKey = 'indigo';

function applyAccent(key) {
  const preset = ACCENT_PRESETS.find(p => p.key === key) || ACCENT_PRESETS[0];
  const isDark = document.documentElement.classList.contains('dark');
  document.documentElement.style.setProperty('--accent', isDark ? preset.dark : preset.light);
  document.documentElement.style.setProperty('--accent-muted', isDark ? preset.darkMuted : preset.lightMuted);
  currentAccentKey = preset.key;
}

function openAccentPicker() {
  const content = h('div', { class: 'grid grid-cols-2 gap-2' }, ACCENT_PRESETS.map(p => h('button', {
    class: `btn-secondary justify-start gap-2 ${currentAccentKey === p.key ? 'ring-2 ring-accent' : ''}`,
    onclick: async () => {
      applyAccent(p.key);
      await DB.setSetting('accentColor', p.key);
      closeTopModal();
      renderTopbar();
    },
  }, [
    h('span', { class: 'inline-block w-4 h-4 rounded-full', style: `background: rgb(${document.documentElement.classList.contains('dark') ? p.dark : p.light})` }),
    h('span', {}, p.label),
  ])));
  openModal(content, { title: 'Accent Colour', width: '360px' });
}

const EXCEL_EXPORT_COLLECTIONS = ['designDocs', 'biomes', 'characters', 'items', 'combatEntries', 'levels', 'quests', 'artPrompts', 'uiScreens', 'audioEntries', 'tasks'];

function flattenForSheet(item) {
  const row = { id: item.id, name: item.name || item.title || '', subtype: item.subtype || '' };
  for (const [k, v] of Object.entries(item)) {
    if (['id', 'name', 'title', 'subtype', 'links'].includes(k)) continue;
    if (Array.isArray(v)) row[k] = v.map(x => (typeof x === 'object' && x ? (x.key || x.name || JSON.stringify(x)) : x)).join('|');
    else if (v && typeof v === 'object') row[k] = JSON.stringify(v);
    else row[k] = v ?? '';
  }
  return row;
}

function exportFullProjectExcel() {
  const sheets = EXCEL_EXPORT_COLLECTIONS
    .map(key => ({ name: COLLECTIONS[key].label, rows: store.list(key).map(flattenForSheet) }))
    .filter(s => s.rows.length);
  if (!sheets.length) { toast('Nothing to export yet — generate some content first.', { type: 'error' }); return; }
  exportXLSXMultiSheet(`${store.project.name.replace(/[^a-z0-9]+/gi, '-')}-full-project`, sheets);
  toast(`Exported ${sheets.length} sheets to Excel`, { type: 'success' });
}

function openBackupMenu() {
  const fileInput = h('input', { type: 'file', accept: 'application/json', class: 'hidden' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const project = JSON.parse(text);
      if (!project.id || !project.collections) throw new Error('Not a valid GameForge project file.');
      project.id = uid('proj'); // avoid clobbering an existing record with the same id
      await DB.saveProject(project);
      await DB.setSetting('lastActiveProjectId', project.id);
      closeTopModal();
      await store.load(project.id);
      resetShellForProject();
      toast('Project imported', { type: 'success' });
    } catch (err) {
      toast(`Import failed: ${err.message}`, { type: 'error' });
    }
  });
  const content = h('div', { class: 'flex flex-col gap-3' }, [
    h('a', {
      href: LIVE_SITE_URL, target: '_blank', rel: 'noopener noreferrer',
      class: 'btn-secondary justify-start', onclick: () => closeTopModal(),
    }, '🔗 Open Live Site'),
    h('button', {
      class: 'btn-secondary justify-start', onclick: () => {
        download(`${store.project.name.replace(/[^a-z0-9]+/gi, '-')}.json`, JSON.stringify(store.project, null, 2), 'application/json');
        closeTopModal();
      },
    }, '⬇ Export Project (JSON backup)'),
    h('button', {
      class: 'btn-secondary justify-start', onclick: () => { exportFullProjectExcel(); closeTopModal(); },
    }, '⬇ Export Full Project (Excel, one sheet per area)'),
    h('button', { class: 'btn-secondary justify-start', onclick: () => fileInput.click() }, '⬆ Import Project (JSON backup)'),
    fileInput,
    h('p', { class: 'text-xs text-slate-400' }, 'Backups contain everything — every character, item, biome, task and document. Great for switching devices or keeping a snapshot before a big change.'),
  ]);
  openModal(content, { title: 'Project Backup & Links', width: '420px' });
}

function updateSaveIndicator(reason) {
  const el = document.getElementById('save-indicator');
  if (!el) return;
  if (reason === 'dirty') el.innerHTML = '<span class="text-amber-500">●</span><span class="hidden md:inline"> Saving…</span>';
  else if (reason === 'saved') el.innerHTML = '<span class="text-emerald-500">●</span><span class="hidden md:inline"> Saved</span>';
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
        await createProjectWithTemplate(name);
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

// ---------- Assistant panel (persistent side drawer, not part of the tab system) ----------
const assistantState = { open: false, mounted: false };

async function toggleAssistant() {
  assistantState.open = !assistantState.open;
  const panel = document.getElementById('assistant-panel');
  panel.classList.toggle('w-96', assistantState.open);
  panel.classList.toggle('w-0', !assistantState.open);
  panel.classList.toggle('border-l', assistantState.open);
  if (assistantState.open && !assistantState.mounted) {
    assistantState.mounted = true;
    const { mountAssistant } = await import('./modules/assistant.js');
    mountAssistant(document.getElementById('assistant-panel-body'));
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  DB.setSetting('theme', isDark ? 'dark' : 'light');
  applyAccent(currentAccentKey);
  renderTopbar();
}

const SEARCHABLE_COLLECTIONS = Object.keys(COLLECTIONS).filter(k => !['activityLog', 'assistantLog'].includes(k));

function searchEntities(term) {
  if (!term.trim() || !store.project) return [];
  const lower = term.toLowerCase();
  const results = [];
  for (const key of SEARCHABLE_COLLECTIONS) {
    for (const item of store.list(key)) {
      const name = item.name || item.title || '';
      if (name.toLowerCase().includes(lower)) results.push({ collection: key, item, name });
      if (results.length >= 40) return results;
    }
  }
  return results;
}

const QUICK_ACTIONS = [
  { label: 'New Project', icon: '➕', run: async () => { const name = await promptModal({ title: 'New Project', label: 'Project name' }); if (!name) return; await createProjectWithTemplate(name); resetShellForProject(); } },
  { label: 'Switch Project', icon: '🎮', run: () => openProjectSwitcher() },
  { label: 'Toggle Dark / Light Mode', icon: '🌓', run: () => toggleTheme() },
  { label: 'Choose Accent Colour', icon: '🎨', run: () => openAccentPicker() },
  { label: 'Toggle AI Assistant', icon: '🤖', run: () => toggleAssistant() },
  { label: 'Project Backup / Restore', icon: '⋮', run: () => openBackupMenu() },
  { label: 'Export Full Project to Excel', icon: '📊', run: () => exportFullProjectExcel() },
  { label: 'Keyboard Shortcuts', icon: '⌨', run: () => openShortcutsModal() },
  { label: 'Open Live Site', icon: '🔗', run: () => window.open(LIVE_SITE_URL, '_blank', 'noopener,noreferrer') },
  { label: 'Run Project Audit', icon: '🩺', run: () => { const { summary } = runProjectAudit(); toast(summary, { type: 'info' }); openTab('dashboard'); } },
  { label: 'Suggest a Genre Mashup', icon: '🧬', run: () => { const { combo } = generateMashupBrief(); toast(`Genre mashup: ${combo.name} (${combo.combo.join(' + ')})`, { type: 'success' }); openTab('designer'); } },
];

function openCommandPalette() {
  const input = h('input', { class: 'input text-base', placeholder: 'Search modules, entities, or quick actions…' });
  const results = h('div', { class: 'flex flex-col gap-0.5 mt-3 max-h-[420px] overflow-y-auto' });
  function draw(term = '') {
    results.innerHTML = '';
    const lower = term.toLowerCase();
    const modules = MODULES.filter(m => m.label.toLowerCase().includes(lower));
    modules.forEach(m => results.appendChild(h('div', {
      class: 'ctx-menu-item', onclick: () => { closeTopModal(); openTab(m.key); },
    }, [h('span', {}, m.icon), h('span', {}, m.label)])));

    const actions = QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(lower));
    if (actions.length) {
      results.appendChild(h('div', { class: 'nav-group-label' }, 'Quick Actions'));
      actions.forEach(a => results.appendChild(h('div', {
        class: 'ctx-menu-item', onclick: () => { closeTopModal(); a.run(); },
      }, [h('span', {}, a.icon), h('span', {}, a.label)])));
    }

    const entities = searchEntities(term).slice(0, 20);
    if (entities.length) {
      results.appendChild(h('div', { class: 'nav-group-label' }, 'Entities'));
      entities.forEach(({ collection, item, name }) => results.appendChild(h('div', {
        class: 'ctx-menu-item',
        onclick: () => { closeTopModal(); openTab(resolveModuleKey(collection), item.id); },
      }, [
        h('span', {}, COLLECTIONS[collection]?.icon || '•'),
        h('span', { class: 'flex-1 truncate' }, name),
        h('span', { class: 'text-xs text-slate-400 shrink-0' }, COLLECTIONS[collection]?.label),
      ])));
    }
    if (!modules.length && !actions.length && !entities.length && term.trim()) {
      results.appendChild(h('p', { class: 'text-sm text-slate-400 px-2 py-3' }, `No matches for "${term}".`));
    }
  }
  input.addEventListener('input', () => draw(input.value));
  draw();
  openModal(h('div', {}, [input, results]), { title: 'Search', width: '520px' });
  setTimeout(() => input.focus(), 30);
}

function isTypingTarget(el) {
  return el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}

const SHORTCUTS = [
  { keys: 'Ctrl K', desc: 'Open search (modules, entities & quick actions)' },
  { keys: '/', desc: 'Open search (when not typing in a field)' },
  { keys: 'Ctrl Z', desc: 'Undo' },
  { keys: 'Ctrl Shift Z', desc: 'Redo (Ctrl Y also works)' },
  { keys: 'Ctrl J', desc: 'Toggle the AI Assistant panel' },
  { keys: 'Ctrl S', desc: 'Save now (autosave already runs continuously)' },
  { keys: '?', desc: 'Show this shortcuts cheatsheet' },
  { keys: 'Esc', desc: 'Close the topmost modal' },
];

function openShortcutsModal() {
  const content = h('div', { class: 'flex flex-col gap-1' }, SHORTCUTS.map(s => h('div', { class: 'flex items-center justify-between py-1.5 border-b border-surface-3/60 last:border-0' }, [
    h('span', { class: 'text-sm text-slate-600 dark:text-slate-300' }, s.desc),
    h('kbd', { class: 'text-xs bg-surface-2 px-2 py-1 rounded font-mono' }, s.keys),
  ])));
  openModal(content, { title: 'Keyboard Shortcuts', width: '420px' });
}

function wireKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    const meta = e.ctrlKey || e.metaKey;
    if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); store.undo(); }
    else if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); store.redo(); }
    else if (meta && e.key.toLowerCase() === 'k') { e.preventDefault(); openCommandPalette(); }
    else if (meta && e.key.toLowerCase() === 'j') { e.preventDefault(); toggleAssistant(); }
    else if (meta && e.key.toLowerCase() === 's') {
      e.preventDefault();
      if (store.project) store.saveNow().then(() => toast('Saved', { type: 'success' }));
    }
    else if (e.key === '/' && !isTypingTarget(e.target)) { e.preventDefault(); openCommandPalette(); }
    else if (e.key === '?' && !isTypingTarget(e.target)) { e.preventDefault(); openShortcutsModal(); }
  });
}

async function initTheme() {
  const saved = await DB.getSetting('theme', 'dark');
  if (saved === 'dark') document.documentElement.classList.add('dark');
  const accent = await DB.getSetting('accentColor', 'indigo');
  applyAccent(accent);
}

function renderShell() {
  root.innerHTML = '';
  // Sidebar is a fixed off-canvas drawer below the md breakpoint (mobile/
  // portrait phones), toggled by the topbar's ☰ button, and reverts to a
  // normal static column at md+ regardless of the drawer's open/closed state.
  const shellRow = h('div', { class: 'flex flex-1 overflow-hidden relative' }, [
    h('div', {
      id: 'sidebar-backdrop', class: 'hidden fixed inset-0 bg-black/50 z-20 md:hidden',
      onclick: closeMobileSidebar,
    }),
    h('aside', {
      id: 'sidebar-aside',
      class: 'fixed inset-y-0 left-0 z-30 w-64 -translate-x-full transition-transform duration-200 md:static md:translate-x-0 md:z-auto md:w-56 shrink-0 border-r border-surface-3/60 flex flex-col bg-surface-0',
    }, [
      h('div', { class: 'flex items-center gap-2 px-4 h-14 border-b border-surface-3/60 shrink-0' }, [
        h('span', { class: 'text-xl' }, '🎮'), h('span', { class: 'font-bold' }, 'GameForge'),
      ]),
      h('nav', { id: 'sidebar-nav', class: 'flex-1 overflow-y-auto scroll-thin px-2 py-2' }),
    ]),
    h('div', { class: 'flex-1 flex flex-col overflow-hidden min-w-0' }, [
      h('header', { id: 'topbar', class: 'h-14 shrink-0 border-b border-surface-3/60 flex items-center justify-between gap-2 px-3 bg-surface-0 overflow-x-auto' }),
      h('div', { id: 'tabbar', class: 'h-9 shrink-0 border-b border-surface-3/60 flex overflow-x-auto bg-surface-1' }),
      h('main', { id: 'workspace', class: 'flex-1 relative overflow-hidden bg-surface-1' }),
    ]),
    h('aside', { id: 'assistant-panel', class: 'w-0 shrink-0 overflow-hidden flex flex-col bg-surface-0 border-surface-3/60 transition-all duration-150' }, [
      h('div', { id: 'assistant-panel-body', class: 'flex flex-col h-full w-96' }),
    ]),
  ]);
  root.appendChild(h('div', { class: 'h-screen flex flex-col' }, [fallbackStorageBanner(), shellRow].filter(Boolean)));
  renderSidebar();
  renderTopbar();
  store.on((project, reason) => {
    if (reason === 'dirty' || reason === 'saved') updateSaveIndicator(reason);
    else renderTopbar();
  });
  openTab('dashboard');
}

setNavigationHandler((target, entityId) => openTab(resolveModuleKey(target), entityId));

(async function main() {
  await initTheme();
  wireKeyboardShortcuts();
  document.getElementById('toast-root');
  await boot();
})();
