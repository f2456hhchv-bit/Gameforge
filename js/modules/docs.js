import { h, uid, fmtDate, timeAgo } from '../util.js';
import { store } from '../store.js';
import { exportMarkdown, exportHTML, printToPDF, exportDOCX, markdownToHTML } from './exportManager.js';
import { toast } from '../components/ui.js';

function list(key) { return store.list(key); }
function bulletList(items, empty = '_None yet._') {
  if (!items || !items.length) return empty;
  return items.map(i => `- ${i}`).join('\n');
}
function section(title, body) { return `## ${title}\n\n${body || '_Not yet defined._'}\n`; }

function findDesignDoc(subtype) { return list('designDocs').find(d => d.subtype === subtype); }
function allDesignDocs(subtype) { return list('designDocs').filter(d => d.subtype === subtype); }

function genGDD(project) {
  const pillars = allDesignDocs('pillar');
  const loop = findDesignDoc('core-loop');
  const usp = findDesignDoc('usp');
  const audience = findDesignDoc('audience');
  const difficulty = findDesignDoc('difficulty');
  const monetizations = allDesignDocs('monetization');
  const sessionLength = findDesignDoc('session-length');
  const replay = findDesignDoc('replayability');
  const personas = allDesignDocs('persona');

  return `# ${project.name} — Game Design Document

*Generated ${fmtDate(new Date().toISOString())} from the live GameForge Studio project database.*

**Genre:** ${project.meta.genre || '—'} · **Platforms:** ${(project.meta.platform || []).join(', ') || '—'} · **Engine:** ${project.meta.engine || '—'}

${section('Game Pillars', pillars.map(p => `**${p.name}** — ${p.statement || p.description || ''}`).join('\n\n'))}
${section('Core Loop', loop ? `${(loop.loopSteps || []).join(' → ')}\n\n${loop.rewardFeedback || ''}` : null)}
${section('Unique Selling Proposition', usp?.statement)}
${section('Target Audience', audience ? `${audience.ageRange || ''} ${audience.demographics || ''}\n\n${audience.psychographics || ''}` : null)}
${section('Difficulty', difficulty ? `Modes: ${(difficulty.modes || []).join(', ')}\n\n${difficulty.scalingNotes || ''}` : null)}
${section('Monetisation', monetizations.map(m => `- **${m.model}** ${m.pricePoint ? `(${m.pricePoint})` : ''}`).join('\n'))}
${section('Session Length & Replayability', `${sessionLength?.targetSessionLength || ''}\n\n${(replay?.mechanisms || []).join(', ')}`)}
${section('Player Personas', personas.map(p => `**${p.name}** (${p.age || '?'}, ${p.occupation || '?'}) — "${p.quote || ''}"`).join('\n\n'))}
${section('World Overview', list('biomes').map(b => `- **${b.name}**: ${b.description || ''}`).join('\n'))}
${section('Characters', list('characters').map(c => `- **${c.name}** (${c.subtype}): ${c.description || ''}`).join('\n'))}
${section('Items & Economy', list('items').map(i => `- **${i.name}** (${i.subtype}, ${i.rarity || 'Common'}): ${i.description || ''}`).join('\n'))}
${section('Quests', list('quests').map(q => `- **${q.name}** (${q.subtype}): ${q.description || ''}`).join('\n'))}
${section('Levels', list('levels').map(l => `- **${l.name}**: ${l.description || ''}`).join('\n'))}
`;
}

function genTDD(project) {
  const platforms = allDesignDocs('platform-analysis');
  return `# ${project.name} — Technical Design Document

**Engine:** ${project.meta.engine || '—'} · **Version:** ${project.meta.version || '—'}

${section('Platform Analysis', platforms.map(p => `**${p.platform}**\nPros: ${(p.pros || []).join(', ')}\nCons: ${(p.cons || []).join(', ')}\n${p.technicalNotes || ''}`).join('\n\n'))}
${section('Combat & Systems Architecture', list('combatEntries').map(c => `- **${c.name}** (${c.subtype}): ${c.description || ''}`).join('\n'))}
${section('Level Streaming / Procedural Rules', list('levels').filter(l => l.proceduralRules).map(l => `- **${l.name}**: ${l.proceduralRules}`).join('\n'))}
${section('Task Backlog Snapshot', `${list('tasks').filter(t => t.category === 'code').length} engineering tasks tracked (see Task Manager for live board).`)}
`;
}

function genArtBible(project) {
  const prompts = list('artPrompts');
  return `# ${project.name} — Art Bible

${section('Art Direction', `Primary styles in use: ${[...new Set(prompts.map(p => p.style))].join(', ') || '—'}`)}
${section('Reference Prompts', prompts.map(p => `### ${p.name}\n\`\`\`\n${p.promptText || ''}\n\`\`\``).join('\n\n'))}
${section('Character Visual Descriptions', list('characters').map(c => `- **${c.name}**: ${c.visualDescription || '—'}`).join('\n'))}
${section('Item Visual Descriptions', list('items').map(i => `- **${i.name}**: ${i.description || '—'}`).join('\n'))}
`;
}

function genAudioBible(project) {
  const audio = list('audioEntries');
  return `# ${project.name} — Audio Bible

${section('Music Direction', audio.filter(a => a.subtype === 'music').map(a => `- **${a.name}**: ${a.description || ''}`).join('\n'))}
${section('Sound Effects', audio.filter(a => a.subtype === 'sfx').map(a => `- **${a.name}**: ${a.description || ''}`).join('\n'))}
${section('Ambience', audio.filter(a => a.subtype === 'ambience').map(a => `- **${a.name}**: ${a.description || ''}`).join('\n'))}
${section('Voice Direction', audio.filter(a => a.subtype === 'voice').map(a => `- **${a.name}**: ${a.description || ''}`).join('\n'))}
${section('Mixing Notes', audio.map(a => a.mixingNotes).filter(Boolean).join('\n\n'))}
`;
}

function genLoreBible(project) {
  const biomes = list('biomes').filter(b => b.subtype !== 'faction');
  const factionEntries = list('biomes').filter(b => b.subtype === 'faction');
  const mentionedFactions = [...new Set(biomes.flatMap(b => b.factionsPresent || []))];
  return `# ${project.name} — Lore Bible

${section('World History', biomes.map(b => `**${b.name}**: ${b.lore || b.description || ''}`).join('\n\n'))}
${section('Factions', factionEntries.length
    ? factionEntries.map(f => `**${f.name}** — ${f.ideology || f.description || ''}`).join('\n\n')
    : bulletList(mentionedFactions))}
${section('Characters & Their Stories', list('characters').filter(c => c.biography).map(c => `**${c.name}**\n\n${c.biography}`).join('\n\n'))}
${section('Quest Narratives', list('quests').filter(q => q.dialogue).map(q => `**${q.name}**\n\n${q.dialogue}`).join('\n\n'))}
`;
}

function genCodingStandards(project) {
  return `# ${project.name} — Coding Standards

${section('Language & Engine', `Primary engine: ${project.meta.engine || 'TBD'}.`)}
${section('Naming Conventions', bulletList(['PascalCase for classes/components', 'camelCase for variables/functions', 'UPPER_SNAKE_CASE for constants', 'Prefix booleans with is/has/can']))}
${section('Version Control', bulletList(['Feature branches off main/develop', 'Conventional commit messages', 'PR review required before merge']))}
${section('Testing', bulletList(['Unit tests for core systems (combat, inventory, save/load)', 'Playtest checklist before each milestone build']))}
`;
}

function genAssetNaming(project) {
  return `# ${project.name} — Asset Naming Standards

${section('General Pattern', '`[type]_[name]_[variant]_[version]` — e.g. `char_hero_default_v01`')}
${section('Prefixes', bulletList(['char_ — characters', 'enemy_ — enemies/creatures', 'wpn_ — weapons', 'itm_ — items', 'env_ — environment props', 'fx_ — visual effects', 'sfx_ — sound effects', 'mus_ — music', 'ui_ — interface elements']))}
${section('Current Roster (for reference)', [...list('characters'), ...list('items')].slice(0, 40).map(x => `- ${x.name} → \`${(x.subtype || 'asset')}_${(x.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_')}\``).join('\n'))}
`;
}

function genFolderStructure(project) {
  return `# ${project.name} — Folder Structure

\`\`\`
/Assets
  /Characters
  /Enemies
  /Items
  /Environments
  /Audio
    /Music
    /SFX
    /Voice
  /UI
  /VFX
/Design
  /Docs
  /Data
/Code
  /Core
  /Systems
  /UI
  /Tests
/Levels
/Builds
\`\`\`

${section('Notes', 'Mirror this structure inside the engine project and in the raw asset source-control repo so exports map 1:1.')}
`;
}

function genProductionPlan(project) {
  const milestones = list('milestones');
  const tasks = list('tasks');
  return `# ${project.name} — Production Plan

**Target Release:** ${fmtDate(project.meta.targetRelease)} · **Budget:** ${project.meta.budget || '—'}

${section('Milestones', milestones.map(m => `- [${m.done ? 'x' : ' '}] **${m.name}** — ${fmtDate(m.targetDate)}`).join('\n'))}
${section('Task Summary', `${tasks.filter(t => t.status === 'done').length}/${tasks.length} tasks complete. Total estimated effort: ${tasks.reduce((s, t) => s + (Number(t.estimateHours) || 0), 0)}h.`)}
${section('By Sprint', [...new Set(tasks.map(t => t.sprint).filter(Boolean))].map(sprint => `**${sprint}**\n${tasks.filter(t => t.sprint === sprint).map(t => `- ${t.title} (${t.status})`).join('\n')}`).join('\n\n'))}
`;
}

function genQADoc(project) {
  const tasks = list('tasks').filter(t => t.category === 'qa');
  return `# ${project.name} — QA Document

${section('QA Task Checklist', tasks.map(t => `- [${t.status === 'done' ? 'x' : ' '}] ${t.title}`).join('\n'))}
${section('Known Systems to Verify', bulletList([...list('combatEntries').map(c => c.name), ...list('levels').map(l => `${l.name} (level flow)`), ...list('quests').map(q => `${q.name} (quest completion, all branches)`)]))}
${section('Regression Checklist', bulletList(['Save/Load integrity', 'Core loop end-to-end', 'All menus reachable via keyboard/controller', 'No blocking soft-locks in any level', 'All quest branches resolve without dead-ends']))}
`;
}

function genReleaseNotes(project) {
  return `# ${project.name} — Release Notes (v${project.meta.version || '0.1.0'})

${section('Highlights', bulletList(list('designDocs').filter(d => d.subtype === 'pillar').map(p => p.name)))}
${section('Content', `${list('characters').length} characters, ${list('items').length} items, ${list('levels').length} levels, ${list('biomes').length} world regions.`)}
${section('Known Issues', 'See QA Document for the current regression checklist.')}
`;
}

function genPatchNotes(project) {
  const recentActivity = list('activityLog').slice(0, 25);
  return `# ${project.name} — Patch Notes (v${project.meta.version || '0.1.0'})

${section('Recent Changes', recentActivity.map(a => `- ${a.message} _(${timeAgo(a.createdAt)})_`).join('\n'))}
`;
}

const DOC_TYPES = [
  { key: 'gdd', label: 'Game Design Document', icon: '📘', gen: genGDD },
  { key: 'tdd', label: 'Technical Design Document', icon: '🛠️', gen: genTDD },
  { key: 'art-bible', label: 'Art Bible', icon: '🎨', gen: genArtBible },
  { key: 'audio-bible', label: 'Audio Bible', icon: '🔊', gen: genAudioBible },
  { key: 'lore-bible', label: 'Lore Bible', icon: '📜', gen: genLoreBible },
  { key: 'coding-standards', label: 'Coding Standards', icon: '💻', gen: genCodingStandards },
  { key: 'asset-naming', label: 'Asset Naming Standards', icon: '🏷️', gen: genAssetNaming },
  { key: 'folder-structure', label: 'Folder Structure', icon: '📁', gen: genFolderStructure },
  { key: 'production-plan', label: 'Production Plan', icon: '📅', gen: genProductionPlan },
  { key: 'qa-doc', label: 'QA Document', icon: '🧪', gen: genQADoc },
  { key: 'release-notes', label: 'Release Notes', icon: '🚀', gen: genReleaseNotes },
  { key: 'patch-notes', label: 'Patch Notes', icon: '🩹', gen: genPatchNotes },
];

export function mountDocs(container) {
  const state = { activeKey: DOC_TYPES[0].key, mode: 'edit' };

  function currentDoc(key) {
    return list('docs').find(d => d.subtype === key);
  }

  function regenerate(key) {
    const type = DOC_TYPES.find(t => t.key === key);
    const content = type.gen(store.project);
    let doc = currentDoc(key);
    store.snapshot();
    if (doc) { doc.content = content; }
    else {
      doc = { id: uid('doc'), subtype: key, name: type.label, content, tags: [], links: {} };
      store.project.collections.docs.push(doc);
    }
    store.commit(`Generate ${type.label}`);
    store.logActivity(`Generated documentation: ${type.label}`, { icon: '📄' });
    render();
    toast(`${type.label} generated`, { type: 'success' });
  }

  function render() {
    container.innerHTML = '';
    const type = DOC_TYPES.find(t => t.key === state.activeKey);
    const doc = currentDoc(state.activeKey);

    const listPanel = h('div', { class: 'w-72 shrink-0 border-r border-surface-3/60 overflow-y-auto scroll-thin p-2 flex flex-col gap-1' },
      DOC_TYPES.map(t => {
        const d = currentDoc(t.key);
        return h('div', {
          class: `rounded-lg px-3 py-2.5 cursor-pointer ${state.activeKey === t.key ? 'bg-accent-muted' : 'hover:bg-surface-2'}`,
          onclick: () => { state.activeKey = t.key; render(); },
        }, [
          h('div', { class: 'flex items-center gap-2' }, [h('span', {}, t.icon), h('span', { class: 'font-medium text-sm' }, t.label)]),
          h('div', { class: 'text-xs text-slate-400 mt-0.5' }, d ? `Generated ${timeAgo(d.updatedAt)}` : 'Not generated yet'),
        ]);
      }));

    let contentArea;
    if (!doc) {
      contentArea = h('div', { class: 'empty-state flex-1' }, [
        h('div', { class: 'text-4xl' }, type.icon),
        h('p', { class: 'font-medium' }, `${type.label} hasn't been generated yet.`),
        h('button', { class: 'btn-primary', onclick: () => regenerate(type.key) }, '✨ Generate Now'),
      ]);
    } else {
      const textarea = h('textarea', { class: 'textarea flex-1 font-mono text-xs leading-relaxed', style: 'min-height: 100%;' });
      textarea.value = doc.content;
      textarea.addEventListener('input', () => { doc.content = textarea.value; });
      const preview = h('div', { class: 'flex-1 overflow-y-auto scroll-thin prose prose-sm max-w-none', html: markdownToHTML(doc.content) });

      const toolbar = h('div', { class: 'flex items-center justify-between px-4 py-2.5 border-b border-surface-3/60 flex-wrap gap-2' }, [
        h('div', { class: 'flex items-center gap-2' }, [
          h('span', { class: 'font-semibold' }, type.label),
          h('span', { class: 'text-xs text-slate-400' }, `Last generated ${timeAgo(doc.updatedAt)}`),
        ]),
        h('div', { class: 'flex items-center gap-2 flex-wrap' }, [
          h('div', { class: 'flex rounded-lg overflow-hidden border border-surface-3' }, [
            h('button', { class: `px-3 py-1.5 text-xs ${state.mode === 'edit' ? 'bg-accent text-white' : 'bg-surface-0'}`, onclick: () => { state.mode = 'edit'; render(); } }, 'Edit'),
            h('button', { class: `px-3 py-1.5 text-xs ${state.mode === 'preview' ? 'bg-accent text-white' : 'bg-surface-0'}`, onclick: () => { state.mode = 'preview'; render(); } }, 'Preview'),
          ]),
          h('button', { class: 'btn-secondary text-xs', onclick: () => { store.upsert('docs', doc, { label: 'Save doc' }); toast('Saved', { type: 'success' }); } }, '💾 Save'),
          h('button', { class: 'btn-secondary text-xs', onclick: () => regenerate(type.key) }, '🔄 Regenerate'),
          h('div', { class: 'relative' }, [
            h('button', {
              class: 'btn-secondary text-xs', onclick: (e) => {
                const menu = e.currentTarget.nextSibling;
                menu.classList.toggle('hidden');
              },
            }, '⬇ Export'),
            h('div', { class: 'hidden absolute right-0 mt-1 card p-1 z-10 min-w-[160px]' }, [
              h('div', { class: 'ctx-menu-item', onclick: () => exportMarkdown(type.key, doc.content) }, 'Markdown (.md)'),
              h('div', { class: 'ctx-menu-item', onclick: () => exportHTML(type.key, type.label, doc.content) }, 'HTML (.html)'),
              h('div', { class: 'ctx-menu-item', onclick: () => printToPDF(type.label, doc.content) }, 'PDF (print)'),
              h('div', { class: 'ctx-menu-item', onclick: () => exportDOCX(type.key, type.label, doc.content) }, 'Word (.docx)'),
            ]),
          ]),
        ]),
      ]);
      contentArea = h('div', { class: 'flex flex-col flex-1 overflow-hidden' }, [toolbar, h('div', { class: 'flex-1 overflow-y-auto scroll-thin p-4 flex flex-col' }, [state.mode === 'edit' ? textarea : preview])]);
    }

    container.append(h('div', { class: 'flex h-full' }, [listPanel, h('div', { class: 'flex flex-col flex-1 overflow-hidden' }, [contentArea])]));
  }

  render();
  return () => {};
}
