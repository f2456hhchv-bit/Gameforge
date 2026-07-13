import { h, uid, timeAgo } from '../util.js';
import { store } from '../store.js';
import { PRIORITIES, DIFFICULTIES, TASK_STATUSES, badgeForPriority, COLLECTIONS } from '../schema.js';
import { openModal, closeTopModal, toast, confirmModal } from '../components/ui.js';
import { openEntity } from '../router.js';

const STATUS_LABELS = { backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };
const CATEGORIES = ['design', 'art', 'code', 'audio', 'writing', 'qa', 'general'];
const CATEGORY_ICON = { design: '🧭', art: '🎨', code: '💻', audio: '🔊', writing: '📝', qa: '🧪', general: '🔧' };

export function mountTasks(container) {
  const state = { view: 'kanban', search: '', category: 'all', priority: 'all', assignee: '' };

  function filteredTasks() {
    let tasks = store.list('tasks');
    if (state.category !== 'all') tasks = tasks.filter(t => t.category === state.category);
    if (state.priority !== 'all') tasks = tasks.filter(t => t.priority === state.priority);
    if (state.assignee.trim()) tasks = tasks.filter(t => (t.assignee || '').toLowerCase().includes(state.assignee.toLowerCase()));
    if (state.search.trim()) {
      const term = state.search.toLowerCase();
      tasks = tasks.filter(t => t.title.toLowerCase().includes(term) || (t.description || '').toLowerCase().includes(term));
    }
    return tasks;
  }

  function openTaskModal(task) {
    const isNew = !task;
    const draft = task ? JSON.parse(JSON.stringify(task)) : {
      id: uid('task'), title: '', description: '', priority: 'medium', status: 'backlog',
      category: 'general', difficulty: 'medium', estimateHours: 2, sprint: '', assignee: '',
      links: { dependencies: [] }, createdAt: new Date().toISOString(),
    };
    draft.links = draft.links || { dependencies: [] };
    if (!draft.links.dependencies) draft.links.dependencies = [];

    const titleInput = h('input', { class: 'input text-base font-medium', placeholder: 'Task title', value: draft.title });
    const descTa = h('textarea', { class: 'textarea', placeholder: 'What needs to happen?' });
    descTa.value = draft.description || '';
    const prioritySelect = h('select', { class: 'select' }, PRIORITIES.map(p => h('option', { value: p, selected: draft.priority === p }, p)));
    const statusSelect = h('select', { class: 'select' }, TASK_STATUSES.map(s => h('option', { value: s, selected: draft.status === s }, STATUS_LABELS[s])));
    const categorySelect = h('select', { class: 'select' }, CATEGORIES.map(c => h('option', { value: c, selected: draft.category === c }, c)));
    const difficultySelect = h('select', { class: 'select' }, DIFFICULTIES.map(d => h('option', { value: d, selected: draft.difficulty === d }, d)));
    const hoursInput = h('input', { class: 'input', type: 'number', min: 0, step: 0.5, value: draft.estimateHours });
    const sprintInput = h('input', { class: 'input', placeholder: 'e.g. Sprint 4', value: draft.sprint || '' });
    const assigneeInput = h('input', { class: 'input', placeholder: 'e.g. Alex', value: draft.assignee || '' });

    const depsWrap = h('div', { class: 'flex flex-col gap-2' });
    function redrawDeps() {
      depsWrap.innerHTML = '';
      const chips = h('div', { class: 'flex flex-wrap gap-1.5' });
      draft.links.dependencies.forEach(depId => {
        const dep = store.get('tasks', depId);
        chips.appendChild(h('span', { class: 'badge-accent gap-1' }, [
          h('span', {}, dep ? dep.title : '(missing)'),
          h('button', { class: 'hover:text-rose-500', onclick: () => { draft.links.dependencies = draft.links.dependencies.filter(x => x !== depId); redrawDeps(); } }, '✕'),
        ]));
      });
      const options = store.list('tasks').filter(t => t.id !== draft.id && !draft.links.dependencies.includes(t.id));
      const select = h('select', { class: 'select' }, [h('option', { value: '' }, '+ Add dependency…'), ...options.map(t => h('option', { value: t.id }, t.title))]);
      select.addEventListener('change', () => { if (select.value) { draft.links.dependencies.push(select.value); redrawDeps(); } });
      depsWrap.append(chips, select);
    }
    redrawDeps();

    const sourceRefNode = draft.sourceRef ? h('button', {
      class: 'text-xs text-accent hover:underline flex items-center gap-1',
      onclick: () => { closeTopModal(); openEntity(draft.sourceRef.collection, draft.sourceRef.id); },
    }, [h('span', {}, COLLECTIONS[draft.sourceRef.collection]?.icon || '🔗'), h('span', {}, `Auto-created from "${draft.sourceRef.label}"`)]) : null;

    const field = (label, node) => h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, label), node]);

    const content = h('div', { class: 'flex flex-col gap-4' }, [
      titleInput,
      sourceRefNode,
      descTa,
      h('div', { class: 'field-grid' }, [
        field('Status', statusSelect), field('Priority', prioritySelect),
        field('Category', categorySelect), field('Difficulty', difficultySelect),
        field('Estimate (hours)', hoursInput), field('Sprint', sprintInput),
        field('Assigned Developer', assigneeInput),
      ]),
      field('Dependencies', depsWrap),
      h('div', { class: 'flex justify-between gap-2 pt-2' }, [
        !isNew ? h('button', {
          class: 'btn-danger', onclick: async () => {
            const ok = await confirmModal({ title: 'Delete task?' });
            if (!ok) return;
            store.remove('tasks', draft.id, { label: 'Delete task' });
            closeTopModal(); render();
          },
        }, 'Delete') : h('span', {}),
        h('div', { class: 'flex gap-2' }, [
          h('button', { class: 'btn-secondary', onclick: () => closeTopModal() }, 'Cancel'),
          h('button', {
            class: 'btn-primary', onclick: () => {
              if (!titleInput.value.trim()) { titleInput.focus(); return; }
              draft.title = titleInput.value.trim();
              draft.description = descTa.value;
              draft.priority = prioritySelect.value;
              draft.status = statusSelect.value;
              draft.category = categorySelect.value;
              draft.difficulty = difficultySelect.value;
              draft.estimateHours = Number(hoursInput.value) || 0;
              draft.sprint = sprintInput.value;
              draft.assignee = assigneeInput.value;
              store.upsert('tasks', draft, { label: isNew ? 'Create task' : 'Save task' });
              closeTopModal(); render();
              toast(isNew ? 'Task created' : 'Task saved', { type: 'success' });
            },
          }, isNew ? 'Create Task' : 'Save'),
        ]),
      ]),
    ]);
    openModal(content, { title: isNew ? 'New Task' : 'Edit Task', width: '560px' });
    setTimeout(() => titleInput.focus(), 30);
  }

  function taskCard(t) {
    return h('div', {
      class: 'kanban-card flex flex-col gap-2', draggable: true,
      onclick: () => openTaskModal(t),
      ondragstart: e => { e.dataTransfer.setData('text/plain', t.id); e.dataTransfer.effectAllowed = 'move'; },
    }, [
      h('div', { class: 'flex items-start justify-between gap-2' }, [
        h('span', { class: 'text-sm font-medium leading-snug' }, t.title),
        h('span', { class: badgeForPriority(t.priority) }, t.priority),
      ]),
      t.description && h('p', { class: 'text-xs text-slate-400 line-clamp-2' }, t.description),
      h('div', { class: 'flex items-center gap-1.5 flex-wrap' }, [
        h('span', { class: 'badge-gray' }, `${CATEGORY_ICON[t.category] || ''} ${t.category}`),
        h('span', { class: 'badge-gray' }, `${t.estimateHours}h`),
        t.sourceRef && h('span', { class: 'badge-blue' }, 'auto'),
      ].filter(Boolean)),
      h('div', { class: 'flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-surface-3/60' }, [
        h('span', {}, t.assignee || 'Unassigned'),
        h('span', {}, t.sprint || ''),
      ]),
    ]);
  }

  function renderKanban() {
    const board = h('div', { class: 'flex gap-3 p-4 overflow-x-auto flex-1' });
    const tasks = filteredTasks();
    TASK_STATUSES.forEach(status => {
      const colTasks = tasks.filter(t => t.status === status);
      const col = h('div', {
        class: 'kanban-col',
        ondragover: e => e.preventDefault(),
        ondrop: e => {
          e.preventDefault();
          const id = e.dataTransfer.getData('text/plain');
          const task = store.get('tasks', id);
          if (task && task.status !== status) {
            store.snapshot();
            task.status = status;
            store.commit(`Move task to ${STATUS_LABELS[status]}`);
            render();
          }
        },
      }, [
        h('div', { class: 'flex items-center justify-between px-3 py-2.5 border-b border-surface-3/60' }, [
          h('span', { class: 'font-semibold text-sm' }, STATUS_LABELS[status]),
          h('span', { class: 'badge-gray' }, colTasks.length),
        ]),
        h('div', { class: 'flex flex-col gap-2 p-2 overflow-y-auto scroll-thin flex-1' }, colTasks.map(taskCard)),
      ]);
      board.appendChild(col);
    });
    return board;
  }

  function renderList() {
    const tasks = filteredTasks();
    const rows = tasks.map(t => h('tr', { class: 'hover:bg-surface-2 cursor-pointer', onclick: () => openTaskModal(t) }, [
      h('td', { class: 'px-3 py-2 font-medium' }, t.title),
      h('td', { class: 'px-3 py-2' }, h('span', { class: badgeForPriority(t.priority) }, t.priority)),
      h('td', { class: 'px-3 py-2' }, STATUS_LABELS[t.status]),
      h('td', { class: 'px-3 py-2' }, t.category),
      h('td', { class: 'px-3 py-2' }, `${t.estimateHours}h`),
      h('td', { class: 'px-3 py-2' }, t.assignee || '—'),
      h('td', { class: 'px-3 py-2 text-slate-400 text-xs' }, timeAgo(t.updatedAt)),
    ]));
    return h('div', { class: 'flex-1 overflow-auto scroll-thin p-4' }, [
      h('table', { class: 'w-full text-sm card overflow-hidden' }, [
        h('thead', { class: 'bg-surface-2 text-left text-xs uppercase text-slate-500' }, [
          h('tr', {}, ['Title', 'Priority', 'Status', 'Category', 'Est.', 'Assignee', 'Updated'].map(c => h('th', { class: 'px-3 py-2 font-semibold' }, c))),
        ]),
        h('tbody', { class: 'divide-y divide-surface-3/60' }, rows),
      ]),
    ]);
  }

  function render() {
    container.innerHTML = '';
    const tasks = store.list('tasks');
    const done = tasks.filter(t => t.status === 'done').length;
    const totalHours = tasks.reduce((s, t) => s + (Number(t.estimateHours) || 0), 0);

    const searchInput = h('input', { class: 'input w-56', placeholder: 'Search tasks…', value: state.search });
    searchInput.addEventListener('input', () => { state.search = searchInput.value; render(); });
    const categorySelect = h('select', { class: 'select w-auto' }, [h('option', { value: 'all' }, 'All Categories'), ...CATEGORIES.map(c => h('option', { value: c, selected: state.category === c }, c))]);
    categorySelect.addEventListener('change', () => { state.category = categorySelect.value; render(); });
    const prioritySelect = h('select', { class: 'select w-auto' }, [h('option', { value: 'all' }, 'All Priorities'), ...PRIORITIES.map(p => h('option', { value: p, selected: state.priority === p }, p))]);
    prioritySelect.addEventListener('change', () => { state.priority = prioritySelect.value; render(); });

    const toolbar = h('div', { class: 'flex items-center justify-between px-4 py-3 border-b border-surface-3/60 flex-wrap gap-2' }, [
      h('div', { class: 'flex items-center gap-2' }, [
        h('span', { class: 'text-xl' }, '✅'), h('h2', { class: 'text-lg font-semibold' }, 'Task Manager'),
        h('span', { class: 'badge-gray' }, `${done}/${tasks.length} done`),
        h('span', { class: 'badge-gray' }, `${totalHours}h total`),
      ]),
      h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
        searchInput, categorySelect, prioritySelect,
        h('div', { class: 'flex rounded-lg overflow-hidden border border-surface-3' }, [
          h('button', { class: `px-3 py-1.5 text-sm ${state.view === 'kanban' ? 'bg-accent text-white' : 'bg-surface-0'}`, onclick: () => { state.view = 'kanban'; render(); } }, '▤ Board'),
          h('button', { class: `px-3 py-1.5 text-sm ${state.view === 'list' ? 'bg-accent text-white' : 'bg-surface-0'}`, onclick: () => { state.view = 'list'; render(); } }, '☰ List'),
        ]),
        h('button', { class: 'btn-primary', onclick: () => openTaskModal(null) }, '+ New Task'),
      ]),
    ]);

    container.append(toolbar, state.view === 'kanban' ? renderKanban() : renderList());
  }

  render();
  const unsub = store.on(() => render());
  return () => unsub();
}
