import { createCollectionView } from '../components/collectionView.js';
import { ART_STYLES } from '../schema.js';
import { MOODS, LIGHTING, CAMERA_ANGLES, PALETTES, MATERIALS } from '../generators/wordbank.js';
import { rngFor, buildArtPromptText } from '../generators/procedural.js';
import { pick, pickN, download } from '../util.js';
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
  { key: 'cutscene', label: 'Cinematic / Cutscene', icon: '🎬' },
  { key: 'box-art', label: 'Box Art / Cover', icon: '📦' },
  { key: 'icon', label: 'App Icon / Thumbnail', icon: '🔳' },
  { key: 'achievement-icon', label: 'Achievement Icon', icon: '🏅' },
  { key: 'weapon-skin', label: 'Weapon Skin Variant', icon: '🌟' },
  { key: 'mood-board', label: 'Mood Board', icon: '🧩' },
  { key: 'texture-study', label: 'Texture Study', icon: '🧵' },
  { key: 'lighting-study', label: 'Lighting Study', icon: '💡' },
  { key: 'turnaround', label: 'Character Turnaround Set', icon: '🔄' },
];

const TRANSPARENCY_OPTIONS = ['Opaque background', 'Transparent PNG (alpha channel)', 'Green screen (chroma key removable)'];
const EXPORT_FORMATS = ['PNG (raster)', 'JPEG (raster, no alpha)', 'SVG (vector)', 'Sprite Sheet (PNG + JSON atlas)', 'GLTF/GLB (3D model)', 'PSD (layered)'];
const ASPECT_RATIOS = ['1:1 Square', '16:9 Widescreen', '9:16 Vertical/Mobile', '4:3 Classic', '21:9 Ultrawide', '3:4 Portrait Cover'];
const RESOLUTIONS = ['512×512 (icon/thumbnail)', '1024×1024 (standard asset)', '2048×2048 (hero asset)', '1920×1080 (HD key art)', '3840×2160 (4K marketing)', '4096×4096 (tiling texture sheet)'];
const POST_PROCESSING_OPTIONS = ['Film grain', 'Chromatic aberration', 'Bloom / glow', 'Vignette', 'Colour grade LUT', 'Depth of field blur', 'Halftone print effect', 'Outline / cel-shade pass'];
const TURNAROUND_ANGLES = ['Front view, T-pose', 'Side profile view, T-pose', 'Back view, T-pose', '3/4 view, relaxed pose'];
const TIME_OF_DAY = ['Dawn', 'Midday', 'Dusk', 'Night'];
const VFX_MOMENTS = ['Cast / charge-up', 'Impact / hit', 'Travel / projectile trail', 'Death / dissipate'];

// Subtype-aware smart defaults so a fresh prompt already looks production-ready.
const SUBTYPE_DEFAULTS = {
  ui: { transparency: 1, exportFormat: 'SVG (vector)', aspectRatio: '1:1 Square', resolution: '1024×1024 (standard asset)' },
  item: { transparency: 1, exportFormat: 'PNG (raster)', aspectRatio: '1:1 Square', resolution: '1024×1024 (standard asset)' },
  vfx: { transparency: 1, exportFormat: 'Sprite Sheet (PNG + JSON atlas)', aspectRatio: '1:1 Square', resolution: '2048×2048 (hero asset)' },
  'weapon-skin': { transparency: 1, exportFormat: 'PNG (raster)', aspectRatio: '1:1 Square', resolution: '2048×2048 (hero asset)' },
  icon: { transparency: 1, exportFormat: 'PNG (raster)', aspectRatio: '1:1 Square', resolution: '512×512 (icon/thumbnail)' },
  'achievement-icon': { transparency: 1, exportFormat: 'PNG (raster)', aspectRatio: '1:1 Square', resolution: '512×512 (icon/thumbnail)' },
  'box-art': { transparency: 0, exportFormat: 'PNG (raster)', aspectRatio: '3:4 Portrait Cover', resolution: '1920×1080 (HD key art)' },
  'key-art': { transparency: 0, exportFormat: 'PNG (raster)', aspectRatio: '16:9 Widescreen', resolution: '3840×2160 (4K marketing)' },
  cutscene: { transparency: 0, exportFormat: 'PNG (raster)', aspectRatio: '21:9 Ultrawide', resolution: '3840×2160 (4K marketing)' },
  'texture-study': { transparency: 0, exportFormat: 'PNG (raster)', aspectRatio: '1:1 Square', resolution: '4096×4096 (tiling texture sheet)' },
  'mood-board': { transparency: 0, exportFormat: 'JPEG (raster, no alpha)', aspectRatio: '16:9 Widescreen', resolution: '2048×2048 (hero asset)' },
  'lighting-study': { transparency: 0, exportFormat: 'PNG (raster)', aspectRatio: '4:3 Classic', resolution: '2048×2048 (hero asset)' },
  turnaround: { transparency: 1, exportFormat: 'PNG (raster)', aspectRatio: '4:3 Classic', resolution: '2048×2048 (hero asset)' },
};
function defaultsFor(subtype) {
  const d = SUBTYPE_DEFAULTS[subtype];
  return {
    transparency: TRANSPARENCY_OPTIONS[d ? d.transparency : 0],
    exportFormat: d ? d.exportFormat : 'PNG (raster)',
    aspectRatio: d ? d.aspectRatio : '1:1 Square',
    resolution: d ? d.resolution : '1024×1024 (standard asset)',
  };
}

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
  { key: 'aspectRatio', label: 'Aspect Ratio', type: 'select', options: ASPECT_RATIOS },
  { key: 'resolution', label: 'Target Resolution', type: 'select', options: RESOLUTIONS },
  { key: 'postProcessing', label: 'Post-Processing', type: 'list', placeholder: 'e.g. Film grain, Bloom / glow' },
  { key: 'variantCount', label: 'Variant Count Needed', type: 'number', placeholder: 'e.g. 4' },
  { key: 'referenceNotes', label: 'Reference / Inspiration Notes', type: 'textarea', cols: 2, placeholder: 'Real-world or existing-game references to draw from…' },
  { key: 'negativePrompt', label: 'Negative Prompt (avoid)', type: 'textarea', cols: 2, placeholder: 'e.g. no text, no watermark, no extra limbs, no logos' },
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
    aspectRatio: item.aspectRatio, resolution: item.resolution,
    postProcessing: (item.postProcessing || []).join(', '),
    variantCount: item.variantCount,
    referenceNotes: item.referenceNotes, negativePrompt: item.negativePrompt,
  });
}

function randomBaseFields(rng, subtype) {
  return {
    style: pick(ART_STYLES, rng), mood: pick(MOODS, rng), lighting: pick(LIGHTING, rng),
    camera: pick(CAMERA_ANGLES, rng), palette: pick(PALETTES, rng), materials: pick(MATERIALS, rng),
    scale: 'Fills roughly 70-80% of frame, centered', animationRequirements: [],
    postProcessing: pickN(POST_PROCESSING_OPTIONS, 1 + Math.floor(rng() * 2), rng),
    variantCount: 1,
    referenceNotes: '', negativePrompt: 'no text, no watermark, no signature, no extra limbs',
    ...defaultsFor(subtype),
  };
}

export function generatePrompt(rng, subtype) {
  const base = randomBaseFields(rng, subtype);
  const name = `${SUBTYPES.find(s => s.key === subtype)?.label || 'Art'} Prompt`;
  const description = '';
  const promptText = buildArtPromptText({ subjectName: name, subjectDesc: description, ...base, animation: '' });
  return { name, description, ...base, promptText, links: {} };
}

function generateTurnaroundEntry(rng, index) {
  const base = randomBaseFields(rng, 'turnaround');
  const angle = TURNAROUND_ANGLES[index % TURNAROUND_ANGLES.length];
  base.camera = angle;
  const name = `Character Turnaround — ${angle.split(',')[0]}`;
  const promptText = buildArtPromptText({ subjectName: name, subjectDesc: 'Part of a full character turnaround reference set.', ...base, animation: '' });
  return { name, description: 'Part of a full character turnaround reference set.', subtype: 'turnaround', ...base, promptText, links: {} };
}

function generateMoodBoardEntry(rng, index) {
  const base = randomBaseFields(rng, 'mood-board');
  const time = TIME_OF_DAY[index % TIME_OF_DAY.length];
  base.lighting = `${time} lighting pass — ${pick(LIGHTING, rng)}`;
  const name = `Mood Board — ${time}`;
  const desc = `Same scene/subject rendered at ${time.toLowerCase()} for a time-of-day comparison pass.`;
  const promptText = buildArtPromptText({ subjectName: name, subjectDesc: desc, ...base, animation: '' });
  return { name, description: desc, subtype: 'mood-board', ...base, promptText, links: {} };
}

function generateVfxPassEntry(rng, index) {
  const base = randomBaseFields(rng, 'vfx');
  const moment = VFX_MOMENTS[index % VFX_MOMENTS.length];
  const name = `VFX Pass — ${moment.split(' / ')[0]}`;
  const desc = `${moment} moment of a single ability's full VFX lifecycle.`;
  base.animationRequirements = [moment];
  const promptText = buildArtPromptText({ subjectName: name, subjectDesc: desc, ...base, animation: moment });
  return { name, description: desc, subtype: 'vfx', ...base, promptText, links: {} };
}

const GENERATORS = [
  { label: 'Generate Prompt', run: ({ subtype }) => generatePrompt(rngFor(Math.random()), subtype || 'concept') },
  { label: 'Generate Turnaround Set (4 angles)', run: ({ index }) => generateTurnaroundEntry(rngFor(Math.random() + index), index || 0) },
  { label: 'Generate Mood Board Time-of-Day Pass (4)', run: ({ index }) => generateMoodBoardEntry(rngFor(Math.random() + index), index || 0) },
  { label: 'Generate VFX Full Moveset Pass (4)', run: ({ index }) => generateVfxPassEntry(rngFor(Math.random() + index), index || 0) },
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
    makeDefaults: () => ({ animationRequirements: [], postProcessing: [], variantCount: 1 }),
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
    helpText: 'GameForge never generates images — only production-ready prompts for whatever image AI you use. Every prompt captures style, lighting, palette, camera, materials, scale, mood, animation, aspect ratio, resolution, post-processing and export requirements. Use the turnaround/mood-board/VFX-pass generators with a count of 4 to build a coherent multi-angle or multi-moment set in one click.',
  });
  return view.mount(container, opts);
}
