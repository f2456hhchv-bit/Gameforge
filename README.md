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
- **Quest Designer** — main/side/faction/world-event/repeatable quests with stages, dialogue, branching, failure conditions, rewards and prerequisite chains.
- **Task Manager** — kanban board + list view; every generated asset automatically creates a linked production task.
- **Documentation** — GDD, TDD, Art/Audio/Lore Bibles, coding & asset-naming standards, folder structure, production plan, QA doc, release/patch notes — all generated live from the project database, plus a one-click "Compile Master Document" that stitches all of them into one exportable file.
- **Relationship Graph** — every entity in the project as a node, every reference as an edge, laid out with a real force-directed algorithm — pan/zoom/drag, click a node to jump to it.
- **AI Assistant** — a persistent chat panel (local, deterministic command parser — no external LLM) that can generate content in bulk, balance enemies, draft quests, tune progression, and rewrite lore on request.

Everything is linked: characters reference biomes and drop items, levels reference enemies and loot tables, tasks reference whatever entity spawned them — click through via the "Referenced By" section on any entity, or see the whole web at once in the Relationship Graph.

## Starter templates

Creating a project (first run, or "+ New Project") offers a template picker: **Fantasy Action RPG**, **Sci-Fi Shooter**, **Metroidvania**, **Cozy Life Sim**, or **Blank Project**. Each non-blank template seeds real, cross-linked pillars, world, characters, items, a quest chain and a level in one step — a genuine starting point, not placeholder text. Picking a template is a single undo step (Ctrl+Z returns to blank).

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

### Running the test suite

An end-to-end Playwright suite (`tests/*.spec.js`) covers app boot, every content module, the starter templates, the assistant, bulk actions/validation, exports, the relationship graph, search and the master document compiler:

```bash
npm install
npx playwright install   # only needed if you don't already have a Chromium build Playwright can find
npm run test:e2e         # or npm run test:e2e:ui for the interactive UI mode
```

The suite starts its own static server (`playwright.config.mjs`'s `webServer`), so `npm run serve` doesn't need to be running separately. If tests are flaky under heavy parallelism on a constrained machine, `npx playwright test --workers=1` is more reliable.

### Known design characteristic

Entity fields (name, description, tags, and every schema-driven field) are live-bound directly to the in-memory entity as you type — the same object that's already in the project, not a separate draft. "Save" persists that object to IndexedDB (and is required before a change survives a reload); it doesn't gate whether the in-memory object itself can be edited. Concretely: leaving a name blank and clicking Save shows a validation error and skips persistence, but the field still shows blank until you type a real name and save successfully or reload without saving.
