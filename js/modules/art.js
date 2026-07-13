import { createCollectionView } from '../components/collectionView.js';
import { ART_STYLES } from '../schema.js';
import { MOODS, LIGHTING, CAMERA_ANGLES, PALETTES, MATERIALS } from '../generators/wordbank.js';
import { rngFor, buildArtPromptText } from '../generators/procedural.js';
import { pick, download } from '../util.js';
import { store } from '../store.js';
import { toast } from '../components/ui.js';

export const SUBTYPES = [
  { key: 'character', label: 'Character Art', icon: '🧑‍🎨' },
  { key: 'item', label: 'Item Art', icon: '🗡️' },
  { key: 'environment', label: 'Environment Art', icon: '🏞️' },
  { key: 'vfx', label: 'VFX', icon: '✨' },
  { key: 'ui', label: 'UI Art', icon: '🖼️' },
  { key: 'concept', label: 'Concept Art', icon: '✏️' },
  { key: 'key-art', label: 'Key Art / Marketing', icon: '🖌️' },
];

const TRANSPARENCY_OPTIONS = ['Opaque background', 'Transparent PNG (alpha channel)', 'Green screen (chroma key removable)'];
const EXPORT_FORMATS = ['PNG (raster)', 'JPEG (raster, no alpha)', 'SVG (vector)', 'Sprite Sheet (PNG + JSON atlas)', 'GLTF/GLB (3D model)', 'PSD (layered)'];

const FIELDS = [
  { key: 'style', label: 'Art Style', type: 'select', options: ART_STYLES },
  { key: 'mood', label: 'Mood', type: 'select', options: MOODS },
  { key: 'lighting', label: 'Lighting', type: 'select', options: LIGHTING },
  { key: 'camera', label: 'Camera', type: 'select', options: CAMERA_ANGLES },
  { key: 'palette', label: 'Colour Palette', type: 'select', options: PALETTES },
  { key: 'materials', label: 'Materials / Textures', type: 'select', options: MATERIALS },
  { key: 'scale', label: 'Scale / Proportions', type: 'text', placeholder: 'e.g. Hero-sized, fills 80% of frame' },
  { key: 'animationRequirements', label: 'Animation Requirements', type: 'list', placeholder: 'e.g. Idle loop, 8-directional' },
  { key: 'transparency', label: 'Transparency', type: 'select', options: TRANSPARENCY_OPTIONS },
  { key: 'exportFormat', label: 'Export Format', type: 'select', options: EXPORT_FORMATS },
  { key: 'linkedCharacter', label: 'Linked Character', type: 'relation', target: 'characters' },
  { key: 'linkedItem', label: 'Linked Item', type: 'relation', target: 'items' },
  { key: 'linkedBiome', label: 'Linked Biome', type: 'relation', target: 'biomes' },
  { key: 'promptText', label: 'Generated Prompt (for image AI)', type: 'textarea', cols: 2 },
];

function badgeFor(item) {
  const s = SUBTYPES.find(s => s.key === item.subtype);
  return [{ text: s ? `${s.icon} ${s.label}` : item.subtype, cls: 'badge-accent' }, item.style && { text: item.style, cls: 'badge-gray' }].filter(Boolean);
}

function buildPromptFor(item) {
  return buildArtPromptText({
    subjectName: item.name,
    subjectDesc: item.description,
    style: item.style, mood: item.mood, lighting: item.lighting, camera: item.camera,
    palette: item.palette, materials: item.materials, scale: item.scale,
    animation: (item.animationRequirements || []).join(', '),
    transparency: item.transparency, exportFormat: item.exportFormat,
  });
}

export function generatePrompt(rng, subtype) {
  const base = {
    style: pick(ART_STYLES, rng), mood: pick(MOODS, rng), lighting: pick(LIGHTING, rng),
    camera: pick(CAMERA_ANGLES, rng), palette: pick(PALETTES, rng), materials: pick(MATERIALS, rng),
    scale: 'Fills roughly 70-80% of frame, centered', animationRequirements: [],
    transparency: subtype === 'ui' || subtype === 'item' || subtype === 'vfx' ? TRANSPARENCY_OPTIONS[1] : TRANSPARENCY_OPTIONS[0],
    exportFormat: subtype === 'ui' ? 'SVG (vector)' : subtype === 'vfx' ? 'Sprite Sheet (PNG + JSON atlas)' : 'PNG (raster)',
  };
  const name = `${SUBTYPES.find(s => s.key === subtype)?.label || 'Art'} Prompt`;
  const description = '';
  const promptText = buildArtPromptText({ subjectName: name, subjectDesc: description, ...base, animation: '' });
  return { name, description, ...base, promptText, links: {} };
}

const GENERATORS = [
  { label: 'Generate Prompt', run: ({ subtype }) => generatePrompt(rngFor(Math.random()), subtype || 'concept') },
];

function exportAllPrompts() {
  const prompts = store.list('artPrompts');
  if (!prompts.length) { toast('No art prompts yet — generate some first.', { type: 'error' }); return; }
  const body = prompts.map((p, i) => {
    const s = SUBTYPES.find(s => s.key === p.subtype);
    return `# ${i + 1}. ${p.name} (${s ? s.label : p.subtype})\n\n${p.promptText || buildPromptFor(p)}\n`;
  }).join('\n---\n\n');
  download(`${store.project.name.replace(/[^a-z0-9]+/gi, '-')}-art-prompts.txt`, body, 'text/plain');
  toast(`Exported ${prompts.length} art prompts`, { type: 'success' });
}

export function mountArt(container, opts) {
  const view = createCollectionView({
    key: 'artPrompts', singular: 'Art Prompt', plural: 'Art Prompts', icon: '🎨',
    subtypes: SUBTYPES,
    fields: FIELDS,
    makeDefaults: () => ({ animationRequirements: [] }),
    cardBadges: badgeFor,
    cardMeta: item => item.description,
    generators: GENERATORS,
    toolbarActions: [{ icon: '📋', label: 'Export All Prompts (.txt)', onClick: exportAllPrompts }],
    extraActions: (item) => [{
      icon: '🪄', label: 'Rebuild prompt text from fields',
      onClick: (it) => {
        it.promptText = buildPromptFor(it);
        store.upsert('artPrompts', it, { label: 'Rebuild art prompt' });
        toast('Prompt text rebuilt from current fields', { type: 'success' });
      },
    }],
    helpText: 'GameForge never generates images — only production-ready prompts for whatever image AI you use. Every prompt captures style, lighting, palette, camera, materials, scale, mood, animation and export requirements.',
  });
  return view.mount(container, opts);
}
