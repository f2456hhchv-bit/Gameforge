# GameForge Studio

A complete, browser-based game design & development studio — think Unity + Notion + Figma + Trello + a local AI assistant, focused on pre-production and production planning. Runs **entirely locally**: no backend, no account, no network calls at runtime. Every project is stored in your browser's IndexedDB.

## Running it

No build step is required to use the app — it's static HTML/CSS/JS.

```bash
npm run serve       # serves the app at http://localhost:8080 (any static server works)
```

Then open `http://localhost:8080/index.html`. Note: opening `index.html` directly via `file://` does **not** work in this multi-file form — browsers block `<script type="module">` from importing other files across a `file://` origin, so `js/app.js`'s imports fail with a CORS error. Use a static server (`npm run serve`, or any other), or see [Distributing it to other people](#distributing-it-to-other-people) below for a version that does work from a double-clicked file.

## Modules

- **Dashboard** — project stats, progress by area, milestones, recent activity.
- **Game Designer** — pillars, core loop, USP, audience, difficulty, monetisation, session length, replayability, platform/competitor analysis, personas, risk analysis, SWOT, success metrics.
- **World Builder** — biomes, regions, cities, settlements, landmarks/POIs, planets, galaxies, factions with weather, climate, lore, resources, hazards, procedural rules, and (for factions) political structure and reputation tiers.
- **Character Studio** — player characters, enemies, bosses, NPCs, merchants, companions, wildlife, summons/pets — biography, stats, abilities, AI notes, loot, animations, voice, personality traits, sample dialogue, faction allegiance and relationship notes.
- **Item Studio** — weapons, armour, accessories, consumables, materials, quest items, currencies, mounts, cosmetics/skins and blueprints/schematics with rarity, stats, affixes, upgrade trees, item sets, socket slots, durability and blueprint recipe unlocks.
- **Combat Designer** — abilities, status effects, damage types, AI behaviour trees, boss mechanics, attack patterns, wave/spawn systems, difficulty scaling, combo strings, parry/counter windows, environmental hazards, stealth takedowns and mount/vehicle combat.
- **Level Designer** — levels with rooms, objectives, events, secrets, puzzles, checkpoints, reward placement, navigation, pacing curve, difficulty spikes and backtrack shortcuts.
- **Art Director** — production-ready image-AI prompts across 16 asset types (character/item/environment/VFX/UI/concept/key art, plus cinematics, box art, icons, achievement icons, weapon skins, mood boards, texture/lighting studies and character turnarounds) — style/lighting/palette/camera/materials/scale/mood/animation/transparency/export format/aspect ratio/resolution/post-processing/negative prompt, with one-click turnaround-set, time-of-day mood-board and full VFX-moveset generators. Never generates images itself.
- **UI Designer** — 21 screen types (menus, HUD, inventory, settings, skill trees, popups, tutorials, notifications, dialogue, crafting, leaderboards, social, achievements, pause, game-over, character creation, quest log and more) with accessibility, controller, transition, sound-cue, localization and typography notes, plus a one-click full menu-flow generator.
- **Audio Designer** — music, SFX, ambience, voice direction, UI sounds, stingers, jingles, boss themes, cutscene scores and ambient voice beds, each with subtype-specific fields (adaptive layers, variation/randomization, layer density, VO line count, debounce/priority), triggers and mixing notes. One-click generators draft a full adaptive music layer set or a complete UI sound kit.
- **Quest Designer** — main/side/faction/world-event/repeatable/escort/collection/investigation/timed-event quests with stages, dialogue, branching outcomes, companion approval effects, failure conditions, rewards and prerequisite chains.
- **Task Manager** — kanban board + list view; every generated asset automatically creates a linked production task.
- **Achievements** — Bronze/Silver/Gold/Platinum trophies with unlock criteria, points, hidden-achievement flags and rarity notes, linkable to the quest or boss that grants each one.
- **Documentation** — GDD, TDD, Art/Audio/Lore Bibles, coding & asset-naming standards, folder structure, production plan, QA doc, release/patch notes, marketing one-pager, accessibility statement, post-mortem, and an Industry Research Brief — all generated live from the project database, plus a one-click "Compile Master Document" that stitches all of them into one exportable file.
- **Relationship Graph** — every entity in the project as a node, every reference as an edge, laid out with a real force-directed algorithm — pan/zoom/drag, click a node to jump to it.
- **AI Assistant** — a persistent chat panel (local, deterministic command parser — no external LLM) that can generate content in bulk, balance enemies, draft quests, tune progression, and rewrite lore on request.

Everything is linked: characters reference biomes and drop items, levels reference enemies and loot tables, tasks reference whatever entity spawned them — click through via the "Referenced By" section on any entity, or see the whole web at once in the Relationship Graph. The Dashboard's **Auto-Link Suggestions** panel (and the assistant's "auto-link things" command) finds gaps with exactly one sane fix — e.g. a quest with a location but no giver, when only one NPC spawns there — and applies them with one click; anything ambiguous is left for you to decide by hand.

## Starter templates

Creating a project (first run, or "+ New Project") offers a template picker with **33 genre packs plus Blank Project**. Each non-blank template seeds real, cross-linked pillars, world, characters, items, a quest chain and a level in one step — a genuine starting point, not placeholder text. Picking a template is a single undo step (Ctrl+Z returns to blank).

- **Core genres:** Fantasy Action RPG, Sci-Fi Shooter, Metroidvania, Cozy Life Sim.
- **Extended genres:** Horror Survival, Puzzle-Platformer, Tower Defense, Roguelike, Visual Novel, Strategy/4X, Card Game/Deckbuilder, Farming Sim, Battle Royale.
- **Research-backed hybrids** — genre-mechanic combinations conspicuously rare or absent at an award-winning level, identified from 20 years of Game Awards/D.I.C.E./BAFTA/Metacritic history (see the Documentation module's **Industry Research Brief**): Cozy Extraction, Grand Tactics, Narrative Roguelite, Deckbuilder Explorer, Branching Asymmetric Horror, Co-op Soulslike, Living Farm, Simulated Siege, Settled Walking Sim, Duelist's Court, Annexed Frontier, Systemic Empire, Rhythm Soulslike, Chronicle Royale, Asymmetric Deckbuilder, Seasonal Puzzle World, Roguelite Circuit, Diplomatic Hearts, Extraction Homestead, Seasonal Sandbox — all 20 researched genre gaps now have a full starter template.

## Economy balancing

Item Studio has a **Drop Rate Simulator** (🎲 in the toolbar) that runs thousands of simulated rarity rolls using the exact same weighted table the generator uses, charting the resulting distribution before you generate any real items. Game Designer can generate a data-driven **Economy Report** — total item value in circulation, total quest reward XP, rarity distribution, and a first-pass sources/sinks breakdown — computed live from the current project rather than filled in by hand.

## Distributing it to other people

Two supported ways to hand this to someone who isn't cloning the repo themselves — pick based on whether they should get a URL or a file:

**Hosted (a URL, recommended for most cases).** Pushing to this repo deploys automatically via `.github/workflows/deploy-pages.yml` once GitHub Pages is turned on (one-time: repo Settings → Pages → Source: "GitHub Actions"). Whoever you send the link to just opens it — nothing to install, works on any device, always up to date with the latest push. The one thing to know: each visitor's projects live in *their own browser's* IndexedDB — there's no shared/synced data between people, so this is "everyone gets their own copy of the tool," not "a team share one project."

**Standalone file (an .html file, for offline/no-hosting use).** `npm run build:standalone` bundles the entire app — every JS module, the compiled CSS, and the vendored JSZip — into one self-contained `gameforge-standalone.html` (via esbuild, ~290 KB). Unlike the plain `index.html`, this one really does work opened straight from disk (double-click, email attachment, USB stick, no server) because the bundler removes the `type="module"` imports that `file://` blocks. Regenerate it any time after changing the app:

```bash
npm install
npm run build:standalone   # writes ./gameforge-standalone.html
```

## Exports

Markdown, JSON, CSV and HTML are native. PDF uses the browser's print pipeline. DOCX and XLSX are real OOXML packages built with a vendored JSZip (`vendor/jszip.min.js`) — no server round-trip required. The project backup menu (⋮ in the top bar) can also export the **entire project as one multi-sheet Excel workbook** (one sheet per content area), and Art Director has a one-click **batch export of every art prompt** to a single text file.

## Customization

- **Accent colour** — the 🎨 button in the top bar swaps the whole UI's accent colour (7 presets), independent of light/dark mode, and persists across sessions.
- **Command palette** (`Ctrl K` or `/`) searches modules, every entity, *and* quick actions (new project, toggle theme, export to Excel, run a project audit, and more) from one box.
- Extra shortcuts: `Ctrl J` toggles the AI Assistant, `Ctrl S` forces an immediate save. Press `?` any time for the full cheatsheet.

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
