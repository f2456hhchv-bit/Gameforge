// Generic schema-driven list+detail engine reused by World/Characters/Items/
// Combat/Levels/Art/UI/Audio modules. One engine, many schemas.
import { h, uid, timeAgo, download, toCSV, nowISO } from '../util.js';
import { store } from '../store.js';
import { buildForm } from './entityForm.js';
import { toast, confirmModal, openModal, closeTopModal } from './ui.js';
import { openEntity } from '../router.js';
import { COLLECTIONS } from '../schema.js';

export function createCollectionView(config) {
  const {
    key, singular, plural, icon,
    subtypes = null,
    fields = [],
    makeDefaults = () => ({}),
    generators = [],
    cardBadges = () => [],
    cardMeta = () => '',
    onCreate = () => {},
    extraActions = () => [],
    helpText = '',
  } = config;

  let state = { search: '', subtypeFilter: 'all', sort: 'updated', selectedId: null, tagFilter: null, listWidth: 320 };
  let unsubscribe = null;
  let rootEl = null;

  function filteredItems() {
    let items = store.list(key);
    if (state.subtypeFilter !== 'all') items = items.filter(i => i.subtype === state.subtypeFilter);
    if (state.tagFilter) items = items.filter(i => (i.tags || []).includes(state.tagFilter));
    if (state.search.trim()) {
      const term = state.search.toLowerCase();
      items = items.filter(i =>
        (i.name || '').toLowerCase().includes(term) ||
        (i.description || '').toLowerCase().includes(term) ||
        (i.tags || []).some(t => t.toLowerCase().includes(term))
      );
    }
    const sorters = {
      updated: (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''),
      created: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
      name: (a, b) => (a.name || '').localeCompare(b.name || ''),
    };
    return [...items].sort(sorters[state.sort] || sorters.updated);
  }

  function createEntity(subtypeKey, overrides = {}) {
    const defaults = makeDefaults(subtypeKey) || {};
    const item = {
      id: uid(key),
      name: overrides.name || `New ${subtypeKey ? subtypes.find(s => s.key === subtypeKey)?.label : singular}`,
      subtype: subtypeKey || undefined,
      description: '',
      tags: [],
      links: {},
      ...defaults,
      ...overrides,
    };
    store.upsert(key, item, { label: `Create ${singular}` });
    onCreate(item, store);
    store.logActivity(`Created ${singular.toLowerCase()} "${item.name}"`, { collection: key, id: item.id, icon });
    return item;
  }

  function handleNewClick(ev) {
    if (!subtypes) {
      const item = createEntity(null);
      state.selectedId = item.id;
      render();
      toast(`${singular} created`, { type: 'success' });
      return;
    }
    const menu = h('div', { class: 'flex flex-col gap-1 min-w-[200px]' },
      subtypes.map(s => h('button', {
        class: 'ctx-menu-item justify-start',
        onclick: () => { closeTopModal(); const item = createEntity(s.key); state.selectedId = item.id; render(); toast(`${s.label} created`, { type: 'success' }); },
      }, [h('span', {}, s.icon || '•'), h('span', {}, s.label)]))
    );
    openModal(menu, { title: `New ${singular}`, width: '280px' });
  }

  function handleGenerateClick() {
    if (!generators.length) return;
    const countInput = h('input', { class: 'input w-24', type: 'number', min: 1, max: 200, value: 1 });
    let chosenGenerator = generators[0];
    let chosenSubtype = subtypes ? subtypes[0].key : null;
    const genSelect = h('select', { class: 'select' }, generators.map((g, i) => h('option', { value: i }, g.label)));
    genSelect.addEventListener('change', () => { chosenGenerator = generators[genSelect.value]; });
    const subtypeSelect = subtypes && h('select', { class: 'select' }, subtypes.map(s => h('option', { value: s.key }, s.label)));
    if (subtypeSelect) subtypeSelect.addEventListener('change', () => { chosenSubtype = subtypeSelect.value; });

    const content = h('div', { class: 'flex flex-col gap-4' }, [
      h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, 'Generator'), genSelect]),
      subtypes && h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, 'Type'), subtypeSelect]),
      h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, 'How many?'), countInput]),
      h('p', { class: 'text-xs text-slate-400' }, 'Generated items are fully editable afterwards — nothing here is final.'),
      h('div', { class: 'flex justify-end gap-2 pt-1' }, [
        h('button', { class: 'btn-secondary', onclick: () => closeTopModal() }, 'Cancel'),
        h('button', {
          class: 'btn-primary', onclick: () => {
            const n = Math.max(1, Math.min(200, Number(countInput.value) || 1));
            closeTopModal();
            runGenerator(chosenGenerator, n, chosenSubtype);
          },
        }, 'Generate'),
      ]),
    ]);
    openModal(content, { title: `Generate ${plural}`, width: '380px' });
  }

  function runGenerator(generator, count, subtypeKey) {
    store.snapshot();
    const created = [];
    for (let i = 0; i < count; i++) {
      const partial = generator.run({ index: i, subtype: subtypeKey, existing: store.list(key) }) || {};
      const item = {
        id: uid(key),
        subtype: subtypeKey || partial.subtype,
        tags: [],
        links: {},
        description: '',
        ...makeDefaults(subtypeKey),
        ...partial,
        createdAt: nowISO(),
        updatedAt: nowISO(),
      };
      store.project.collections[key].push(item);
      onCreate(item, store);
      created.push(item);
    }
    store.commit(`Generate ${count} ${plural}`);
    store.logActivity(`Generated ${count} ${plural.toLowerCase()} via "${generator.label}"`, { collection: key, icon });
    if (created.length === 1) state.selectedId = created[0].id;
    render();
    toast(`${count} ${plural} generated`, { type: 'success' });
  }

  async function handleDelete(item) {
    const ok = await confirmModal({ title: `Delete "${item.name}"?`, body: 'This cannot be undone from here (but Ctrl+Z will restore it).' });
    if (!ok) return;
    store.remove(key, item.id, { label: `Delete ${item.name}` });
    if (state.selectedId === item.id) state.selectedId = null;
    render();
    toast('Deleted', { type: 'info' });
  }

  function exportCSV() {
    const items = filteredItems();
    if (!items.length) return toast('Nothing to export', { type: 'warn' });
    const rows = items.map(i => ({ name: i.name, subtype: i.subtype || '', description: i.description || '', tags: (i.tags || []).join('|') }));
    download(`${key}.csv`, toCSV(rows), 'text/csv');
  }

  function renderList() {
    const items = filteredItems();
    const listEl = h('div', { class: 'flex flex-col gap-1.5 overflow-y-auto scroll-thin flex-1 p-2' });
    if (!items.length) {
      listEl.appendChild(h('div', { class: 'empty-state' }, [
        h('div', { class: 'text-3xl' }, icon),
        h('p', {}, `No ${plural.toLowerCase()} yet.`),
      ]));
    }
    items.forEach(item => {
      const badges = cardBadges(item) || [];
      const row = h('div', {
        class: `rounded-lg px-3 py-2.5 cursor-pointer border transition-colors ${state.selectedId === item.id ? 'bg-accent-muted border-accent/40' : 'border-transparent hover:bg-surface-2'}`,
        onclick: () => { state.selectedId = item.id; render(); },
        oncontextmenu: e => {
          e.preventDefault();
          import('./ui.js').then(({ contextMenu }) => contextMenu([
            { label: 'Duplicate', icon: '⧉', action: () => { store.duplicate(key, item.id); render(); } },
            { label: 'Delete', icon: '🗑', danger: true, action: () => handleDelete(item) },
          ], e.clientX, e.clientY));
        },
      }, [
        h('div', { class: 'flex items-center justify-between gap-2' }, [
          h('span', { class: 'font-medium text-sm truncate' }, item.name || '(unnamed)'),
        ]),
        h('div', { class: 'flex items-center gap-1.5 mt-1 flex-wrap' }, badges.map(b => h('span', { class: b.cls || 'badge-gray' }, b.text))),
        cardMeta(item) && h('div', { class: 'text-xs text-slate-400 mt-1 truncate' }, cardMeta(item)),
      ]);
      listEl.appendChild(row);
    });
    return listEl;
  }

  function renderFilters() {
    const searchInput = h('input', { class: 'input', placeholder: `Search ${plural.toLowerCase()}…`, value: state.search });
    searchInput.addEventListener('input', () => { state.search = searchInput.value; renderListOnly(); });
    const sortSelect = h('select', { class: 'select w-auto' }, [
      h('option', { value: 'updated', selected: state.sort === 'updated' }, 'Recently Updated'),
      h('option', { value: 'created', selected: state.sort === 'created' }, 'Recently Created'),
      h('option', { value: 'name', selected: state.sort === 'name' }, 'Name A–Z'),
    ]);
    sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; renderListOnly(); });
    const bar = h('div', { class: 'flex flex-col gap-2 p-2 border-b border-surface-3/60' }, [
      h('div', { class: 'flex gap-2' }, [searchInput, sortSelect]),
    ]);
    if (subtypes) {
      const chips = h('div', { class: 'flex gap-1.5 flex-wrap' }, [
        h('button', { class: `badge ${state.subtypeFilter === 'all' ? 'badge-accent' : 'badge-gray'}`, onclick: () => { state.subtypeFilter = 'all'; renderListOnly(); } }, 'All'),
        ...subtypes.map(s => h('button', {
          class: `badge ${state.subtypeFilter === s.key ? 'badge-accent' : 'badge-gray'}`,
          onclick: () => { state.subtypeFilter = s.key; renderListOnly(); },
        }, `${s.icon || ''} ${s.label}`)),
      ]);
      bar.appendChild(chips);
    }
    const allTags = [...new Set(store.list(key).flatMap(i => i.tags || []))];
    if (allTags.length) {
      const tagChips = h('div', { class: 'flex gap-1.5 flex-wrap' }, [
        ...(state.tagFilter ? [h('button', { class: 'badge badge-accent', onclick: () => { state.tagFilter = null; renderListOnly(); } }, `✕ ${state.tagFilter}`)] : []),
        ...allTags.filter(t => t !== state.tagFilter).slice(0, 12).map(t => h('button', {
          class: 'badge badge-gray', onclick: () => { state.tagFilter = t; renderListOnly(); },
        }, `#${t}`)),
      ]);
      bar.appendChild(tagChips);
    }
    return bar;
  }

  // Drag state lives for the whole mount lifetime; only the handle element is
  // recreated per render, so the window-level listeners are wired up exactly
  // once (in mount()) to avoid piling up duplicate listeners on every render.
  let resizeDragging = false;
  let currentListPanel = null;
  function onResizeMouseMove(e) {
    if (!resizeDragging || !currentListPanel) return;
    const rect = rootEl.getBoundingClientRect();
    state.listWidth = Math.max(220, Math.min(560, e.clientX - rect.left));
    currentListPanel.style.width = `${state.listWidth}px`;
  }
  function onResizeMouseUp() {
    if (!resizeDragging) return;
    resizeDragging = false;
    document.body.style.cursor = '';
  }
  function attachResizer(handle, listPanel) {
    currentListPanel = listPanel;
    handle.addEventListener('mousedown', e => {
      resizeDragging = true;
      e.preventDefault();
      document.body.style.cursor = 'col-resize';
    });
  }

  let listContainer, filterContainer;
  function renderListOnly() {
    if (!listContainer) return;
    listContainer.replaceChildren(renderList());
  }

  function renderDetail() {
    const item = state.selectedId && store.get(key, state.selectedId);
    if (!item) {
      return h('div', { class: 'empty-state flex-1' }, [
        h('div', { class: 'text-4xl' }, icon),
        h('p', { class: 'font-medium text-slate-500' }, `Select a ${singular.toLowerCase()} to view details`),
        helpText && h('p', { class: 'text-xs max-w-sm' }, helpText),
      ]);
    }

    const nameInput = h('input', { class: 'text-lg font-semibold bg-transparent focus:outline-none border-b border-transparent focus:border-accent flex-1', value: item.name || '' });
    nameInput.addEventListener('input', () => { item.name = nameInput.value; });

    const descTa = h('textarea', { class: 'textarea', placeholder: 'Description…' });
    descTa.value = item.description || '';
    descTa.addEventListener('input', () => { item.description = descTa.value; });

    const tagsWrap = h('div', { class: 'flex flex-wrap gap-1.5' });
    function redrawTags() {
      tagsWrap.innerHTML = '';
      (item.tags || []).forEach((t, i) => tagsWrap.appendChild(h('span', { class: 'badge-gray gap-1' }, [
        h('span', {}, t), h('button', { class: 'hover:text-rose-500', onclick: () => { item.tags.splice(i, 1); redrawTags(); } }, '✕'),
      ])));
      const tagInput = h('input', { class: 'text-xs bg-transparent focus:outline-none w-20', placeholder: '+ tag' });
      tagInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && tagInput.value.trim()) {
          item.tags = item.tags || [];
          item.tags.push(tagInput.value.trim());
          redrawTags();
        }
      });
      tagsWrap.appendChild(tagInput);
    }
    redrawTags();

    const activeFields = typeof fields === 'function' ? fields(item.subtype) : fields;
    const formGrid = buildForm(activeFields, item);

    const backlinks = store.backlinks(item.id);
    const backlinksSection = backlinks.length ? h('div', { class: 'flex flex-col gap-1.5' }, [
      h('h4', { class: 'label' }, 'Referenced By'),
      h('div', { class: 'flex flex-col gap-1' }, backlinks.map(b => h('button', {
        class: 'text-left text-sm px-2 py-1.5 rounded-lg hover:bg-surface-2 flex items-center gap-2',
        onclick: () => openEntity(b.collection, b.item.id),
      }, [h('span', { class: 'badge-gray' }, COLLECTIONS[b.collection]?.icon || '•'), h('span', {}, b.item.name), h('span', { class: 'text-slate-400 text-xs' }, COLLECTIONS[b.collection]?.label)]))),
    ]) : null;

    const saveBtn = h('button', {
      class: 'btn-primary', onclick: () => {
        store.upsert(key, item, { label: `Save ${item.name}` });
        render();
        toast('Saved', { type: 'success' });
      },
    }, '💾 Save');

    const header = h('div', { class: 'flex items-start justify-between gap-3 p-4 border-b border-surface-3/60' }, [
      h('div', { class: 'flex flex-col gap-2 flex-1 min-w-0' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          nameInput,
          item.subtype && subtypes && h('span', { class: 'badge-accent shrink-0' }, subtypes.find(s => s.key === item.subtype)?.label || item.subtype),
        ]),
        h('div', { class: 'flex items-center gap-3 text-xs text-slate-400' }, [
          h('span', {}, `Updated ${timeAgo(item.updatedAt)}`),
        ]),
        tagsWrap,
      ]),
      h('div', { class: 'flex gap-2 shrink-0' }, [
        saveBtn,
        h('button', { class: 'btn-ghost', title: 'Duplicate', onclick: () => { store.duplicate(key, item.id); render(); } }, '⧉'),
        ...(extraActions(item) || []).map(a => h('button', { class: 'btn-ghost', title: a.label, onclick: () => a.onClick(item) }, a.icon || a.label)),
        h('button', { class: 'btn-ghost text-rose-500', title: 'Delete', onclick: () => handleDelete(item) }, '🗑'),
      ]),
    ]);

    return h('div', { class: 'flex flex-col flex-1 overflow-hidden' }, [
      header,
      h('div', { class: 'flex-1 overflow-y-auto scroll-thin p-4 flex flex-col gap-5' }, [
        descTa,
        formGrid,
        backlinksSection,
      ].filter(Boolean)),
    ]);
  }

  function render() {
    if (!rootEl) return;
    rootEl.innerHTML = '';
    const toolbar = h('div', { class: 'flex items-center justify-between px-4 py-3 border-b border-surface-3/60' }, [
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'text-xl' }, icon),
        h('h2', { class: 'text-lg font-semibold' }, plural),
        h('span', { class: 'badge-gray' }, store.list(key).length),
      ]),
      h('div', { class: 'flex gap-2' }, [
        generators.length > 0 && h('button', { class: 'btn-secondary', onclick: handleGenerateClick }, '✨ Generate'),
        h('button', { class: 'btn-secondary', onclick: exportCSV }, '⬇ CSV'),
        h('button', { class: 'btn-primary', onclick: handleNewClick }, `+ New ${singular}`),
      ].filter(Boolean)),
    ]);

    filterContainer = renderFilters();
    listContainer = renderList();
    const listPanel = h('div', { class: 'shrink-0 border-r border-surface-3/60 flex flex-col', style: `width:${state.listWidth}px` }, [filterContainer, listContainer]);
    const resizeHandle = h('div', { class: 'w-1 shrink-0 cursor-col-resize hover:bg-accent/50 transition-colors', title: 'Drag to resize' });
    attachResizer(resizeHandle, listPanel);
    const detailPanel = renderDetail();

    const body = h('div', { class: 'flex flex-1 overflow-hidden' }, [listPanel, resizeHandle, detailPanel]);
    rootEl.append(toolbar, body);
  }

  return {
    mount(container, opts = {}) {
      rootEl = h('div', { class: 'flex flex-col h-full' });
      container.appendChild(rootEl);
      if (opts.selectId) state.selectedId = opts.selectId;
      render();
      unsubscribe = store.on(() => render());
      window.addEventListener('mousemove', onResizeMouseMove);
      window.addEventListener('mouseup', onResizeMouseUp);
      return () => {
        unsubscribe && unsubscribe();
        window.removeEventListener('mousemove', onResizeMouseMove);
        window.removeEventListener('mouseup', onResizeMouseUp);
      };
    },
    select(id) { state.selectedId = id; render(); },
  };
}
