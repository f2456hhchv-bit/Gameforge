# GameForge Studio

A complete, browser-based game design & development studio — think Unity + Notion + Figma + Trello + a local AI assistant, focused on pre-production and production planning. Runs **entirely locally**: no backend, no account, no network calls at runtime. Every project is stored in your browser's IndexedDB.

## Running it

No build step is required to use the app — it's static HTML/CSS/JS.

```bash
npm run serve       # serves the app at http://localhost:8080 (any static server works)
```

Then open `http://localhost:8080/index.html`. You can also open `index.html` directly via `file://` in most browsers (IndexedDB works fine there).

## Modules

- **Dashboard** — project stats, progress by area, milestones, recent activity.
- **Game Designer** — pillars, core loop, USP, audience, difficulty, monetisation, session length, replayability, platform/competitor analysis, personas, risk analysis, SWOT, success metrics.
- **World Builder** — biomes, regions, cities, planets, galaxies, factions with weather, lore, resources, hazards and procedural rules.
- **Character Studio** — player characters, enemies, bosses, NPCs, merchants, companions, wildlife — biography, stats, abilities, AI notes, loot, animations, voice.
- **Item Studio** — weapons, armour, accessories, consumables, materials, quest items, currencies with rarity, stats, affixes and upgrade trees.
- **Combat Designer** — abilities, status effects, damage types, AI behaviour trees, boss mechanics, attack patterns, wave/spawn systems, difficulty scaling.
- **Level Designer** — levels with rooms, objectives, events, secrets, puzzles, checkpoints, reward placement and navigation.
- **Art Director** — production-ready image-AI prompts (style/lighting/palette/camera/materials/scale/mood/animation/transparency/export format). Never generates images itself.
- **UI Designer** — menus, HUD, inventory, settings, skill trees, popups with accessibility and controller support notes.
- **Audio Designer** — music, SFX, ambience, voice direction, triggers and mixing notes.
- **Task Manager** — kanban board + list view; every generated asset automatically creates a linked production task.
- **Documentation** — GDD, TDD, Art/Audio/Lore Bibles, coding & asset-naming standards, folder structure, production plan, QA doc, release/patch notes — all generated live from the project database.
- **AI Assistant** — a persistent chat panel (local, deterministic command parser — no external LLM) that can generate content in bulk, balance enemies, draft quests, tune progression, and rewrite lore on request.

Everything is linked: characters reference biomes and drop items, levels reference enemies and loot tables, tasks reference whatever entity spawned them — click through via the "Referenced By" section on any entity.

## Exports

Markdown, JSON, CSV and HTML are native. PDF uses the browser's print pipeline. DOCX and XLSX are real OOXML packages built with a vendored JSZip (`vendor/jszip.min.js`) — no server round-trip required.

## Architecture

- `js/db.js` — IndexedDB persistence (one record per project).
- `js/store.js` — in-memory reactive project store: undo/redo, autosave, generic CRUD, cross-entity backlink resolution.
- `js/schema.js` — collection registry shared across the app.
- `js/components/collectionView.js` — schema-driven generic list/detail engine reused by 8 of the content modules.
- `js/components/entityForm.js` — schema-driven field renderer (text/textarea/number/select/tags/list/stats/relation/relation-multi).
- `js/generators/` — word banks + procedural generation helpers shared by every module and the assistant.
- `js/modules/` — one file per module; each exports a `mountX(container, opts)` function registered in `js/modules/registry.js`.
- `js/taskHooks.js` — shared helper so any module can auto-create a linked production task.

### Rebuilding CSS

Styling is real Tailwind, compiled to a static `css/tailwind.css` so the shipped app has zero runtime dependency on a CDN or build step. If you edit `css/input.css` or add new utility classes in JS, rebuild with:

```bash
npm install       # once, to get the tailwindcss devDependency
npm run build:css
```
