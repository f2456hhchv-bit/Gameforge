// Genre Mashup Generator — turns one of the researched, untried genre-mechanic
// combinations (js/generators/genreResearch.js) into a concrete mini design
// brief seeded directly into the project: a pillar naming the combo and a USP
// arguing why it's worth building, both citing the real research rationale.
import { uid, nowISO, pick } from './util.js';
import { store } from './store.js';
import { rngFor } from './generators/procedural.js';
import { GENRE_GAPS } from './generators/genreResearch.js';

export function suggestMashup(excludeNames = []) {
  const pool = GENRE_GAPS.filter(g => !excludeNames.includes(g.name));
  return pick(pool.length ? pool : GENRE_GAPS, rngFor(Math.random()));
}

export function applyMashup(combo) {
  store.snapshot();
  const pillar = {
    id: uid('designDocs'), subtype: 'pillar', tags: [], links: {},
    name: `Mashup Concept: ${combo.name}`,
    statement: `${combo.combo.join(' + ')} — ${combo.rationale}`,
    evidence: [`Identified as an untried combination in the Industry Research Brief (${combo.combo.join(' × ')}).`],
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  const usp = {
    id: uid('designDocs'), subtype: 'usp', tags: [], links: {},
    name: `USP: ${combo.name}`,
    statement: `A ${combo.combo[0].toLowerCase()} built around a genuine ${combo.combo[1].toLowerCase()} mechanic — a combination with no direct AAA precedent.`,
    proofPoints: [combo.rationale],
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  store.project.collections.designDocs.push(pillar, usp);
  store.commit(`Suggest genre mashup: ${combo.name}`);
  store.logActivity(`Suggested a genre mashup: ${combo.name} (${combo.combo.join(' + ')})`, { icon: '🧬' });
  return { pillar, usp };
}

export function generateMashupBrief(excludeNames = []) {
  const combo = suggestMashup(excludeNames);
  const { pillar, usp } = applyMashup(combo);
  return { combo, pillar, usp };
}
