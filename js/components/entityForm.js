// Schema-driven form renderer. Field descriptors:
// { key, label, type, options?, target?, subtype?, placeholder?, hint?, cols? }
// types: text | textarea | number | select | tags | list | stats | relation | relation-multi | checkbox
import { h } from '../util.js';
import { store } from '../store.js';

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    o[keys[i]] = o[keys[i]] ?? {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = value;
}

function fieldWrap(field, inner) {
  return h('div', { class: `flex flex-col gap-1 ${field.cols === 2 ? 'sm:col-span-2' : ''}` }, [
    h('label', { class: 'label' }, field.label),
    inner,
    field.hint && h('p', { class: 'text-xs text-slate-400 -mt-0.5' }, field.hint),
  ]);
}

function renderChipList(values, onChange, { placeholder = 'Add and press Enter…' } = {}) {
  const container = h('div', { class: 'flex flex-wrap gap-1.5 p-2 rounded-lg border border-surface-3 bg-surface-0 min-h-[42px]' });
  const input = h('input', {
    class: 'flex-1 min-w-[120px] bg-transparent text-sm focus:outline-none placeholder:text-slate-400',
    placeholder,
    onkeydown: e => {
      if (e.key === 'Enter' && input.value.trim()) {
        e.preventDefault();
        values.push(input.value.trim());
        input.value = '';
        onChange(values);
        redraw();
      } else if (e.key === 'Backspace' && !input.value && values.length) {
        values.pop();
        onChange(values);
        redraw();
      }
    },
  });
  function redraw() {
    container.innerHTML = '';
    values.forEach((v, i) => {
      container.appendChild(h('span', { class: 'badge-accent gap-1' }, [
        h('span', {}, v),
        h('button', { class: 'hover:text-rose-500', onclick: () => { values.splice(i, 1); onChange(values); redraw(); } }, '✕'),
      ]));
    });
    container.appendChild(input);
  }
  redraw();
  return container;
}

function renderStatsRows(rows, onChange) {
  const container = h('div', { class: 'flex flex-col gap-2' });
  function redraw() {
    container.innerHTML = '';
    rows.forEach((row, i) => {
      container.appendChild(h('div', { class: 'flex gap-2' }, [
        h('input', { class: 'input flex-1', placeholder: 'Stat (e.g. Damage)', value: row.key, oninput: e => { row.key = e.target.value; onChange(rows); } }),
        h('input', { class: 'input w-32', placeholder: 'Value', value: row.value, oninput: e => { row.value = e.target.value; onChange(rows); } }),
        h('button', { class: 'btn-icon shrink-0', onclick: () => { rows.splice(i, 1); onChange(rows); redraw(); } }, '✕'),
      ]));
    });
    container.appendChild(h('button', {
      class: 'btn-secondary self-start text-xs',
      onclick: () => { rows.push({ key: '', value: '' }); onChange(rows); redraw(); },
    }, '+ Add Stat'));
  }
  redraw();
  return container;
}

function renderRelation(field, draft) {
  const targetItems = store.list(field.target).filter(i => !field.subtype || i.subtype === field.subtype);
  const links = draft.links || (draft.links = {});
  const select = h('select', { class: 'select' }, [
    h('option', { value: '' }, '— None —'),
    ...targetItems.map(t => h('option', { value: t.id, selected: links[field.key] === t.id }, t.name || '(unnamed)')),
  ]);
  select.addEventListener('change', () => { links[field.key] = select.value || null; });
  return select;
}

function renderRelationMulti(field, draft) {
  const links = draft.links || (draft.links = {});
  if (!links[field.key]) links[field.key] = [];
  const targetItems = store.list(field.target).filter(i => !field.subtype || i.subtype === field.subtype);
  const container = h('div', { class: 'flex flex-col gap-2' });
  const chipRow = h('div', { class: 'flex flex-wrap gap-1.5 min-h-[32px]' });
  const select = h('select', { class: 'select' }, [
    h('option', { value: '' }, `+ Link ${field.label}…`),
    ...targetItems.filter(t => !links[field.key].includes(t.id)).map(t => h('option', { value: t.id }, t.name || '(unnamed)')),
  ]);
  select.addEventListener('change', () => {
    if (select.value) { links[field.key].push(select.value); redrawChips(); redrawSelect(); select.value = ''; }
  });
  function redrawChips() {
    chipRow.innerHTML = '';
    links[field.key].forEach(id => {
      const t = targetItems.find(x => x.id === id);
      chipRow.appendChild(h('span', { class: 'badge-accent gap-1' }, [
        h('span', {}, t ? (t.name || '(unnamed)') : '(missing)'),
        h('button', { class: 'hover:text-rose-500', onclick: () => { links[field.key] = links[field.key].filter(x => x !== id); redrawChips(); redrawSelect(); } }, '✕'),
      ]));
    });
  }
  function redrawSelect() {
    select.innerHTML = '';
    select.appendChild(h('option', { value: '' }, `+ Link ${field.label}…`));
    targetItems.filter(t => !links[field.key].includes(t.id)).forEach(t => select.appendChild(h('option', { value: t.id }, t.name || '(unnamed)')));
  }
  redrawChips();
  container.append(chipRow, select);
  return container;
}

export function renderField(field, draft) {
  const value = getPath(draft, field.key);
  switch (field.type) {
    case 'text': {
      const input = h('input', { class: 'input', type: 'text', value: value ?? '', placeholder: field.placeholder || '' });
      input.addEventListener('input', () => setPath(draft, field.key, input.value));
      return fieldWrap(field, input);
    }
    case 'number': {
      const input = h('input', { class: 'input', type: 'number', value: value ?? '', placeholder: field.placeholder || '' });
      input.addEventListener('input', () => setPath(draft, field.key, input.value === '' ? '' : Number(input.value)));
      return fieldWrap(field, input);
    }
    case 'textarea': {
      const ta = h('textarea', { class: 'textarea', placeholder: field.placeholder || '' }, []);
      ta.value = value ?? '';
      ta.addEventListener('input', () => setPath(draft, field.key, ta.value));
      return fieldWrap(field, ta);
    }
    case 'select': {
      const opts = field.options || [];
      const select = h('select', { class: 'select' }, opts.map(o => {
        const v = typeof o === 'string' ? o : o.value;
        const l = typeof o === 'string' ? o : o.label;
        return h('option', { value: v, selected: value === v }, l);
      }));
      select.addEventListener('change', () => setPath(draft, field.key, select.value));
      return fieldWrap(field, select);
    }
    case 'checkbox': {
      const wrap = h('label', { class: 'flex items-center gap-2 text-sm' });
      const cb = h('input', { type: 'checkbox', checked: !!value, class: 'h-4 w-4 rounded accent-accent' });
      cb.addEventListener('change', () => setPath(draft, field.key, cb.checked));
      wrap.append(cb, h('span', {}, field.label));
      return h('div', { class: 'flex items-end pb-1.5' }, [wrap]);
    }
    case 'tags':
    case 'list': {
      if (!Array.isArray(value)) setPath(draft, field.key, []);
      const arr = getPath(draft, field.key);
      const widget = renderChipList(arr, () => setPath(draft, field.key, arr), { placeholder: field.placeholder });
      return fieldWrap(field, widget);
    }
    case 'stats': {
      if (!Array.isArray(value)) setPath(draft, field.key, []);
      const arr = getPath(draft, field.key);
      const widget = renderStatsRows(arr, () => setPath(draft, field.key, arr));
      return fieldWrap(field, widget);
    }
    case 'relation':
      return fieldWrap(field, renderRelation(field, draft));
    case 'relation-multi':
      return fieldWrap(field, renderRelationMulti(field, draft));
    default:
      return fieldWrap(field, h('div', { class: 'text-xs text-rose-500' }, `Unknown field type: ${field.type}`));
  }
}

export function buildForm(fields, draft, { columns = 2 } = {}) {
  const grid = h('div', { class: columns === 1 ? 'flex flex-col gap-4' : 'field-grid' });
  fields.forEach(f => grid.appendChild(renderField(f, draft)));
  return grid;
}
