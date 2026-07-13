import { h, timeAgo, fmtDate, uid } from '../util.js';
import { store } from '../store.js';
import { COLLECTIONS, PLATFORMS, ENGINES, TASK_STATUSES, RARITIES } from '../schema.js';
import { openModal, closeTopModal, toast } from '../components/ui.js';
import { openEntity } from '../router.js';
import { barChart, areaSparkline } from '../components/charts.js';
import { runProjectAudit } from '../audit.js';
import { SUBTYPES as ITEM_SUBTYPES } from './items.js';
import { SUBTYPES as CHARACTER_SUBTYPES } from './characters.js';
import { SUBTYPES as QUEST_SUBTYPES } from './quests.js';

const TASK_CATEGORIES = ['design', 'art', 'code', 'audio', 'writing', 'qa', 'general'];
const STATUS_LABELS = { backlog: 'Backlog', todo: 'To Do', 'in-progress': 'In Progress', review: 'Review', done: 'Done' };
const CONTENT_COLLECTIONS = ['designDocs', 'biomes', 'characters', 'items', 'combatEntries', 'levels', 'quests', 'artPrompts', 'uiScreens', 'audioEntries'];

function taskStatusBreakdown(tasks) {
  return TASK_STATUSES.map(s => ({ label: STATUS_LABELS[s], value: tasks.filter(t => t.status === s).length }));
}

function contentGrowthSeries(project, days = 14) {
  const buckets = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    buckets.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value: 0 });
  }
  const byKey = Object.fromEntries(buckets.map(b => [b.key, b]));
  for (const key of CONTENT_COLLECTIONS) {
    for (const item of project.collections[key]) {
      if (!item.createdAt) continue;
      const dayKey = item.createdAt.slice(0, 10);
      if (byKey[dayKey]) byKey[dayKey].value += 1;
    }
  }
  return buckets;
}

function distributionOf(list, subtypes) {
  return subtypes.map(s => ({ label: s.label, value: list.filter(i => i.subtype === s.key).length }));
}

function rarityDistribution(items) {
  return RARITIES.map(r => ({ label: r, value: items.filter(i => i.rarity === r).length }));
}

function pct(done, total) {
  if (!total) return 0;
  return Math.round((done / total) * 100);
}

function computeStats(project) {
  const tasks = project.collections.tasks;
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.status === 'done').length;
  const estHours = tasks.reduce((s, t) => s + (Number(t.estimateHours) || 0), 0);
  const remainingHours = tasks.filter(t => t.status !== 'done').reduce((s, t) => s + (Number(t.estimateHours) || 0), 0);

  const byCategory = {};
  for (const cat of TASK_CATEGORIES) {
    const catTasks = tasks.filter(t => t.category === cat);
    byCategory[cat] = pct(catTasks.filter(t => t.status === 'done').length, catTasks.length);
  }

  const featureProgress = pct(project.collections.designDocs.length, 14); // 14 design-doc kinds in the spec
  const assetCount = project.collections.characters.length + project.collections.items.length +
    project.collections.biomes.length + project.collections.levels.length + project.collections.quests.length;
  const assetProgress = Math.min(100, Math.round((assetCount / 75) * 100));
  const codeProgress = byCategory.code;
  const taskProgress = pct(doneTasks, totalTasks);

  const overall = Math.round((featureProgress + assetProgress + codeProgress + taskProgress) / 4);

  return { totalTasks, doneTasks, estHours, remainingHours, byCategory, featureProgress, assetProgress, codeProgress, taskProgress, overall };
}

function statCard(label, value, sub) {
  return h('div', { class: 'stat-card' }, [
    h('span', { class: 'label' }, label),
    h('span', { class: 'text-2xl font-bold' }, value),
    sub && h('span', { class: 'text-xs text-slate-400' }, sub),
  ].filter(Boolean));
}

function progressRow(label, value) {
  return h('div', { class: 'flex flex-col gap-1' }, [
    h('div', { class: 'flex justify-between text-xs text-slate-500 dark:text-slate-400' }, [
      h('span', {}, label), h('span', { class: 'font-semibold' }, `${value}%`),
    ]),
    h('div', { class: 'progress-track' }, [h('div', { class: 'progress-fill', style: `width:${value}%` })]),
  ]);
}

function editMetaModal(project, rerender) {
  const draft = { ...project.meta };
  const nameInput = h('input', { class: 'input', value: project.name });
  const field = (label, node) => h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, label), node]);
  const genreInput = h('input', { class: 'input', value: draft.genre || '' });
  const engineSelect = h('select', { class: 'select' }, [h('option', { value: '' }, '—'), ...ENGINES.map(e => h('option', { value: e, selected: draft.engine === e }, e))]);
  const versionInput = h('input', { class: 'input', value: draft.version || '' });
  const budgetInput = h('input', { class: 'input', value: draft.budget || '', placeholder: 'e.g. $50,000' });
  const releaseInput = h('input', { class: 'input', type: 'date', value: draft.targetRelease || '' });
  const platformWrap = h('div', { class: 'flex flex-wrap gap-2' }, PLATFORMS.map(p => {
    const active = (draft.platform || []).includes(p);
    const btn = h('button', {
      class: `badge ${active ? 'badge-accent' : 'badge-gray'}`,
      onclick: () => {
        draft.platform = draft.platform || [];
        if (draft.platform.includes(p)) draft.platform = draft.platform.filter(x => x !== p);
        else draft.platform.push(p);
        btn.className = `badge ${draft.platform.includes(p) ? 'badge-accent' : 'badge-gray'}`;
      },
    }, p);
    return btn;
  }));

  const content = h('div', { class: 'flex flex-col gap-4' }, [
    field('Project Name', nameInput),
    h('div', { class: 'field-grid' }, [
      field('Genre', genreInput),
      field('Engine', engineSelect),
      field('Version', versionInput),
      field('Budget', budgetInput),
      field('Target Release', releaseInput),
    ]),
    field('Platforms', platformWrap),
    h('div', { class: 'flex justify-end gap-2 pt-2' }, [
      h('button', { class: 'btn-secondary', onclick: () => closeTopModal() }, 'Cancel'),
      h('button', {
        class: 'btn-primary', onclick: () => {
          store.snapshot();
          project.name = nameInput.value;
          project.meta = { ...draft, genre: genreInput.value, engine: engineSelect.value, version: versionInput.value, budget: budgetInput.value, targetRelease: releaseInput.value };
          store.commit('Edit project details');
          closeTopModal();
          rerender();
          toast('Project details updated', { type: 'success' });
        },
      }, 'Save'),
    ]),
  ]);
  openModal(content, { title: 'Project Details', width: '520px' });
}

function addMilestoneModal(rerender) {
  const nameInput = h('input', { class: 'input', placeholder: 'e.g. Vertical Slice' });
  const dateInput = h('input', { class: 'input', type: 'date' });
  const content = h('div', { class: 'flex flex-col gap-4' }, [
    h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, 'Milestone'), nameInput]),
    h('div', { class: 'flex flex-col gap-1' }, [h('label', { class: 'label' }, 'Target Date'), dateInput]),
    h('div', { class: 'flex justify-end gap-2 pt-2' }, [
      h('button', { class: 'btn-secondary', onclick: () => closeTopModal() }, 'Cancel'),
      h('button', {
        class: 'btn-primary', onclick: () => {
          if (!nameInput.value.trim()) return;
          store.snapshot();
          store.project.collections.milestones.push({ id: uid('mile'), name: nameInput.value, targetDate: dateInput.value, done: false, createdAt: new Date().toISOString() });
          store.commit('Add milestone');
          closeTopModal();
          rerender();
        },
      }, 'Add'),
    ]),
  ]);
  openModal(content, { title: 'New Milestone', width: '400px' });
}

export function mountDashboard(container) {
  function render() {
    const project = store.project;
    if (!project) return;
    const stats = computeStats(project);
    container.innerHTML = '';

    const header = h('div', { class: 'flex items-start justify-between p-5 pb-3' }, [
      h('div', {}, [
        h('h1', { class: 'text-2xl font-bold' }, project.name),
        h('p', { class: 'text-sm text-slate-400 mt-0.5' }, [
          project.meta.genre || 'No genre set', ' · ', (project.meta.platform || []).join(', ') || 'No platform set',
          ' · ', project.meta.engine || 'No engine set',
        ]),
      ]),
      h('button', { class: 'btn-secondary', onclick: () => editMetaModal(project, render) }, '✎ Edit Details'),
    ]);

    const overviewGrid = h('div', { class: 'grid grid-cols-2 md:grid-cols-4 gap-3 px-5' }, [
      statCard('Completion', `${stats.overall}%`, 'Weighted across all areas'),
      statCard('Version', project.meta.version || '—'),
      statCard('Est. Hours', `${stats.remainingHours}h`, `${stats.estHours}h total`),
      statCard('Budget', project.meta.budget || '—'),
      statCard('Tasks Done', `${stats.doneTasks}/${stats.totalTasks}`),
      statCard('Characters', store.list('characters').length),
      statCard('Items', store.list('items').length),
      statCard('Target Release', fmtDate(project.meta.targetRelease)),
    ]);

    const progressPanel = h('div', { class: 'card p-5 flex flex-col gap-4' }, [
      h('h3', { class: 'font-semibold' }, 'Progress by Area'),
      progressRow('Feature Progress (Design Docs)', stats.featureProgress),
      progressRow('Task Progress', stats.taskProgress),
      progressRow('Asset Progress', stats.assetProgress),
      progressRow('Code Progress', stats.codeProgress),
    ]);

    const taskBreakdown = taskStatusBreakdown(project.collections.tasks);
    const taskChartPanel = h('div', { class: 'card p-5 flex flex-col gap-3' }, [
      h('h3', { class: 'font-semibold' }, 'Tasks by Status'),
      barChart(taskBreakdown, { emptyText: 'No tasks yet — generate some content and tasks appear automatically.' }),
    ]);

    const growth = contentGrowthSeries(project);
    const growthPanel = h('div', { class: 'card p-5 flex flex-col gap-3' }, [
      h('h3', { class: 'font-semibold' }, 'Content Created (Last 14 Days)'),
      areaSparkline(growth, { emptyText: 'Generate some characters, items or biomes to see activity here.' }),
    ]);

    const distributionPanel = h('div', { class: 'card p-5 flex flex-col gap-4' }, [
      h('h3', { class: 'font-semibold' }, 'Content Distribution'),
      h('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4' }, [
        h('div', { class: 'flex flex-col gap-2' }, [h('p', { class: 'text-xs font-medium text-slate-500 dark:text-slate-400' }, 'Items by Type'), barChart(distributionOf(store.list('items'), ITEM_SUBTYPES), { emptyText: 'No items yet.' })]),
        h('div', { class: 'flex flex-col gap-2' }, [h('p', { class: 'text-xs font-medium text-slate-500 dark:text-slate-400' }, 'Items by Rarity'), barChart(rarityDistribution(store.list('items')), { emptyText: 'No items yet.' })]),
        h('div', { class: 'flex flex-col gap-2' }, [h('p', { class: 'text-xs font-medium text-slate-500 dark:text-slate-400' }, 'Characters by Type'), barChart(distributionOf(store.list('characters'), CHARACTER_SUBTYPES), { emptyText: 'No characters yet.' })]),
        h('div', { class: 'flex flex-col gap-2' }, [h('p', { class: 'text-xs font-medium text-slate-500 dark:text-slate-400' }, 'Quests by Type'), barChart(distributionOf(store.list('quests'), QUEST_SUBTYPES), { emptyText: 'No quests yet.' })]),
      ]),
    ]);

    const audit = runProjectAudit();
    const auditPanel = h('div', { class: 'card p-5 flex flex-col gap-3' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        h('h3', { class: 'font-semibold' }, 'Project Audit'),
        h('span', { class: 'text-xs text-slate-400' }, audit.summary),
      ]),
      audit.findings.length
        ? h('div', { class: 'flex flex-col gap-3' }, audit.findings.map(f => h('div', { class: 'flex items-start gap-2 text-sm' }, [
          h('span', { class: 'shrink-0' }, f.severity === 'warning' ? '⚠️' : 'ℹ️'),
          h('div', { class: 'flex-1 min-w-0' }, [
            h('p', {}, f.message),
            f.refs.length ? h('div', { class: 'flex flex-wrap gap-1 mt-1.5' }, [
              ...f.refs.slice(0, 8).map(r => h('button', {
                class: 'badge badge-gray hover:opacity-70 transition-opacity cursor-pointer',
                onclick: () => openEntity(r.collection, r.id),
              }, r.name || 'Untitled')),
              f.refs.length > 8 && h('span', { class: 'text-xs text-slate-400 self-center' }, `+${f.refs.length - 8} more`),
            ].filter(Boolean)) : null,
          ].filter(Boolean)),
        ])))
        : h('p', { class: 'text-sm text-slate-400' }, 'No gaps found — everything checked looks linked and filled in. Nice work!'),
    ]);

    const milestones = project.collections.milestones;
    const milestonesPanel = h('div', { class: 'card p-5 flex flex-col gap-3' }, [
      h('div', { class: 'flex items-center justify-between' }, [
        h('h3', { class: 'font-semibold' }, 'Milestones'),
        h('button', { class: 'btn-ghost text-xs', onclick: () => addMilestoneModal(render) }, '+ Add'),
      ]),
      milestones.length ? h('div', { class: 'flex flex-col gap-2' }, milestones.map(m => h('div', { class: 'flex items-center gap-2' }, [
        h('input', {
          type: 'checkbox', checked: m.done, class: 'h-4 w-4 rounded accent-accent',
          onchange: e => { store.snapshot(); m.done = e.target.checked; store.commit('Toggle milestone'); },
        }),
        h('span', { class: `flex-1 text-sm ${m.done ? 'line-through text-slate-400' : ''}` }, m.name),
        h('span', { class: 'text-xs text-slate-400' }, fmtDate(m.targetDate)),
      ]))) : h('p', { class: 'text-sm text-slate-400' }, 'No milestones yet.'),
    ]);

    const activity = project.collections.activityLog.slice(0, 12);
    const activityPanel = h('div', { class: 'card p-5 flex flex-col gap-2' }, [
      h('h3', { class: 'font-semibold mb-1' }, 'Recent Activity'),
      activity.length ? h('div', { class: 'flex flex-col divide-y divide-surface-3/60' }, activity.map(a => h('div', { class: 'flex items-center gap-2 py-2 text-sm' }, [
        h('span', {}, a.meta?.icon || '•'),
        h('span', { class: 'flex-1' }, a.message),
        h('span', { class: 'text-xs text-slate-400 shrink-0' }, timeAgo(a.createdAt)),
      ]))) : h('p', { class: 'text-sm text-slate-400' }, 'Nothing yet — start building!'),
    ]);

    const quickLinks = h('div', { class: 'card p-5 flex flex-col gap-2' }, [
      h('h3', { class: 'font-semibold mb-1' }, 'Jump In'),
      h('div', { class: 'grid grid-cols-2 gap-2' }, [
        ['designer', '🧭 Game Designer'], ['world', '🌍 World Builder'], ['characters', '🧑‍🎤 Character Studio'],
        ['items', '🗡️ Item Studio'], ['combat', '⚔️ Combat Designer'], ['levels', '🗺️ Level Designer'],
        ['quests', '📯 Quest Designer'], ['tasks', '✅ Task Manager'],
        ['graph', '🕸️ Relationship Graph'], ['docs', '📄 Documentation'],
      ].map(([key, label]) => h('button', { class: 'btn-secondary justify-start', onclick: () => openEntity(key) }, label))),
    ]);

    const grid = h('div', { class: 'grid grid-cols-1 lg:grid-cols-3 gap-4 p-5' }, [
      h('div', { class: 'lg:col-span-2 flex flex-col gap-4' }, [progressPanel, distributionPanel, growthPanel, taskChartPanel, activityPanel]),
      h('div', { class: 'flex flex-col gap-4' }, [auditPanel, milestonesPanel, quickLinks]),
    ]);

    container.append(header, overviewGrid, grid);
  }
  render();
  const unsub = store.on((project, reason) => { if (reason.startsWith('mutate') || reason === 'undo' || reason === 'redo' || reason === 'load') render(); });
  return () => unsub();
}
