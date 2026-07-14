# GameForge Studio

A complete, browser-based game design & development studio — think Unity + Notion + Figma + Trello + a local AI assistant, focused on pre-production and production planning, with a genuine lightweight play engine to actually try what you've designed. Runs **entirely locally**: no backend, no account, no network calls at runtime. Every project is stored in your browser's IndexedDB.

## Running it

No build step is required to use the app — it's static HTML/CSS/JS.

```bash
npm run serve       # serves the app at http://localhost:8080 (any static server works)
```

Then open `http://localhost:8080/index.html`. Note: opening `index.html` directly via `file://` does **not** work in this multi-file form — browsers block `<script type="module">` from importing other files across a `file://` origin, so `js/app.js`'s imports fail with a CORS error. Use a static server (`npm run serve`, or any other), or see [Distributing it to other people](#distributing-it-to-other-people) below for a version that does work from a double-clicked file.

## Modules

- **Dashboard** — project stats, progress by area, milestones, recent activity.
- **Play Engine** — a real, playable prototype built live from your actual project data, not a mockup, across three genre modes:
  - **Top-Down Arena** — WASD/arrows to move, Space to attack, AABB collision. Multi-room: if the level's generated `rooms` list has more than one entry, its enemies are split across them round-robin — clear the current room to advance to the next, with a HUD "Room N/M" indicator, rather than one flat pile of enemies in a single space.
  - **Platformer** — real gravity, jump arcs, ground/platform collision, stomp-to-defeat, and a goal to reach.
  - **Turn-Based Encounter** — a menu-driven battle (Attack/Use Item/Flee) for a slower, discrete-turn genre feel.

  Combat is resolved from Character Studio's real stat blocks (Health/Damage/Defense/Speed); item pickups come from Item Studio (weapons boost damage, consumables heal); a Dialogue Tree Designer conversation plays as a real intro when the project has one. Characters are drawn as procedurally-animated sprites (walk cycles, attack swings, hit flashes, death falls) with a deterministic per-entity color palette — genuinely drawn and moving, though intentionally not photorealistic art, since GameForge makes zero network calls at runtime and has no generative-image model to call. Real procedural sound effects (Web Audio oscillator synthesis, no audio files) play on attack, hit, defeat, pickup, jump, room-clear, win and loss. Press **Esc** to pause/resume either real-time mode.

  **Combat depth from Combat Designer**: a real status-effect simulation, not decoration — Burning/Poisoned tick genuine damage over time, Stunned skips an entity's turn/actions, and Shielded absorbs incoming damage before it ever touches real HP. Elite-subtype enemies carry an innate Shield from the moment they spawn (30% of their max HP); boss-subtype enemies instead get a one-time mechanical enrage phase at ≤30% HP (bonus damage and speed) rather than a shield, so the two subtypes actually play differently. The player has a cooldown-gated special ability (**E**, or the "✨ Special" button in Turn-Based) that deals bonus damage and applies Burning — its name is pulled from a real player character's Abilities list in Character Studio when one exists, falling back to "Special Strike" otherwise. Active status effects show as small colored badges above each combatant on the canvas, and as icons in the Turn-Based enemy/player rows.

  **Level Script**: a real, small scripting language, authored directly on the Level Designer entity — plain-text rules like `on timer 30: damage player 5` or `on allEnemiesDefeated: message "Area secure!"`, parsed and executed live (triggers: start, enemyDefeated, allEnemiesDefeated, roomCleared, bossEnraged, itemCollected, playerDamaged, timer, playerHpBelow; actions: message, heal/damage player, healEnemies, spawnHeal, winLevel, loseLevel).

  **Export Playable Build**: a real asset-pipeline step — packages the current scene into one self-contained standalone HTML file (compact vanilla-JS runtime, no dependency on GameForge or a server) that can be shared, emailed, or hosted anywhere.

  Falls back to any enemies/items in the project when a level hasn't been explicitly linked yet. Clearing or failing a level can log a real entry straight into Playtesting Tracker. This remains a lightweight runtime for fast iteration, not a full general-purpose engine — no arbitrary-code scripting (the Level Script is a small constrained DSL, not raw JS), no rigid-body physics, and no AI-generated art/animation.
- **Game Designer** — pillars, core loop, USP, audience, difficulty, monetisation, session length, replayability, platform/competitor analysis, personas, risk analysis, SWOT, success metrics.
- **World Builder** — 18 place types: biomes, regions, cities, settlements, landmarks/POIs, planets, galaxies, factions, continents, dimensions/planes, shrines/temples, ruins, trade routes, capital cities, colonies, wilderness preserves, underwater zones and sky zones/floating isles — with weather, climate, lore, resources, hazards, procedural rules, subtype-specific fields (patron deities, former civilizations, connected settlements and more), and (for factions) political structure and reputation tiers.
- **Character Studio** — 20 character types: player, enemy, boss, elite, horde minion, boss add, NPC, merchant, specialist vendor, companion, tamed pet, wildlife, summon, rival, mentor, informant, hostage, guard, cultist and voice-only narrator — biography, stats, abilities, AI notes, loot, animations, voice, personality traits, sample dialogue, faction allegiance and relationship notes, plus subtype-specific fields (rivalry arcs, taming methods, intel reliability, elite modifiers and more).
- **Item Studio** — 20 item types: weapons, armour, accessories, consumables, materials, quest items, currencies, mounts, cosmetics/skins, blueprints, relics/artifacts, throwables, ammunition, tools, gems/runes, deployables, recipes, banners/trophies, transports and containers — rarity, stats, affixes, upgrade trees, item sets, socket slots, durability and recipe unlocks.
- **Combat Designer** — 28 entry types: abilities, status effects, damage types, AI behaviour trees, boss mechanics, attack patterns, wave/spawn systems, difficulty scaling, combo strings, parry/counter windows, environmental hazards, stealth takedowns, mount/vehicle combat, ultimates, passive traits, auras, channel abilities, dodge/block mechanics, execute finishers, elemental reactions, terrain interactions, weapon-switch combos, team combos, enrage timers, adds management and chain reactions.
- **Level Designer** — 13 level types: tutorial, boss arena, hub, vertical slice, stealth, escort, horde survival, racing track, social hub, dungeon crawl, open-world region, linear corridor and PvP arena — each with rooms, objectives, events, secrets, puzzles, checkpoints, reward placement, navigation, pacing curve, difficulty spikes, backtrack shortcuts and subtype-specific fields (boss links, track hazards, spawn points and more).
- **Art Director** — production-ready image-AI prompts across 28 asset types (character/item/environment/VFX/UI/concept/key art, cinematics, box art, icons, achievement icons, weapon skins, mood boards, texture/lighting studies, character turnarounds, splash screens, promo posters, sprite sheets, tilesets, skyboxes, creature concepts, prop art, foliage studies, color scripts, storyboards, emote icons and collectible art) — style/lighting/palette/camera/materials/scale/mood/animation/transparency/export format/aspect ratio/resolution/post-processing/negative prompt, with one-click turnaround-set, time-of-day mood-board, VFX-moveset and storyboard-sequence generators. Never generates images itself.
- **UI Designer** — 33 screen types (menus, HUD, inventory, settings, skill trees, popups, tutorials, notifications, dialogue, crafting, leaderboards, social, achievements, pause, game-over, character creation, quest log, minimap, error/confirmation dialogs, item comparison tooltip, crafting queue, world-map legend, chat window, party frame, boss health overlay, subtitle overlay, photo mode, accessibility settings and more) with accessibility, controller, transition, sound-cue, localization and typography notes, plus one-click full menu-flow and core-HUD-overlay-set generators.
- **Audio Designer** — 20 cue types: music, SFX, ambience, voice direction, UI sounds, stingers, jingles, boss themes, cutscene scores, ambient voice beds, leitmotifs, voice line sets, foley packs, radio chatter, tutorial narration, cutscene dialogue, victory fanfares, defeat stingers, weather ambience and crowd reactions — each with subtype-specific fields (adaptive layers, variation/randomization, layer density, VO line count, debounce/priority, bark category and more), triggers and mixing notes. One-click generators draft a full adaptive music layer set, a complete UI sound kit, or a victory/defeat stinger pair.
- **Quest Designer** — 23 quest types: main, side, faction, world-event, repeatable, escort, collection, investigation, timed-event, delivery, rescue, defense/siege, heist, race, puzzle, diplomacy, bounty, crafting, exploration, moral choice, infiltration, sabotage and tournament — with stages, dialogue, branching outcomes, companion approval effects, failure conditions, rewards and prerequisite chains.
- **Dialogue Tree Designer** — 12 node types: opening lines, NPC responses, player choices, branch points, closing lines, idle barks, monologues, flashback lines, narrator lines, quest hook lines, vendor barter lines and companion banter, linking to each other via "Next Node" and "Branches To" relations to form a real conversation graph visible in the Relationship Graph too. Speaker, tone, voice direction, show-conditions, consequences, localization string ID and subtype-specific fields (linked quest, time period, banter partner and more); one-click "Generate Conversation Starter Set" (4 beats) or "Generate Companion Banter Pair".
- **Task Manager** — kanban board + list view; every generated asset automatically creates a linked production task.
- **Achievements** — Bronze/Silver/Gold/Platinum trophies across 10 categories (Standard, Speedrun, Collection, Secret, Seasonal, Community, Challenge, Story, Multiplayer, New Game+) with unlock criteria, points, hidden-achievement flags, rarity/unlock-percentage notes, platform type and category-specific fields, linkable to the quest or boss that grants each one, plus a one-click Bronze→Platinum tiered achievement set generator.
- **Controls Mapping** — 8 input types: keyboard & mouse, gamepad, touch/mobile, VR motion, accessibility-remap, cloud gaming, Steam Deck/handheld and mobile motion control — action, default/alternate binding, context, rebindability, hold-vs-press behaviour, button-prompt icon notes, conflicts and accessibility notes; one-click "Generate Standard Action Set" drafts the 6 most common actions for a platform.
- **Documentation** — GDD, TDD, Art/Audio/Lore Bibles, coding & asset-naming standards, folder structure, production plan, QA doc, release/patch notes, marketing one-pager, accessibility statement, post-mortem, an Industry Research Brief, and a Live Ops / Content Roadmap — all generated live from the project database, plus a one-click "Compile Master Document" that stitches all of them into one exportable file.
- **Playtesting Tracker** — 13 session types: internal, external, focus-group, alpha, beta, usability, bug-bash, accessibility, localization, performance, certification, soft-launch and closed-beta-wave — tester profile, methodology, key findings, bugs found, positive quotes, a sentiment score, follow-up actions and subtype-specific fields (assistive device, languages covered, FPS/frame time, cert body, regions launched, wave number), linkable to the level or quests under test.
- **LiveOps Calendar** — 15 event types: seasonal events, limited-time modes, store rotations, battle pass seasons, content drops, balance patches, community challenges, double-XP weekends, anniversary events, crossover collabs, esports tournaments, charity events, server migrations, emergency hotfixes and roadmap teasers — dates, theme, rewards, monetization hooks, target KPIs, marketing channels and subtype-specific fields (prize pools, charity partners, downtime windows, severity and more), linkable to the quests/items featured in the event.
- **Localization Manager** — 14 string types: UI text, dialogue, item names/flavor, quest text, achievement text, error messages, marketing copy, tutorial text, legal text, store listing copy, patch notes, voice scripts, subtitle timing and credits — source text, context, character limits, target languages, translation status, voiceover needs and subtype-specific fields (legal review flag, platform target, timecodes and more). When real content already exists it pulls the actual project text (item names, quest titles, dialogue lines) instead of a generic placeholder.
- **Analytics Designer** — 14 event types: session, progression, monetization, engagement, error, social, tutorial, combat, UI interaction, ad, accessibility, performance, onboarding-funnel and churn-prediction telemetry events — snake_case event name, typed parameters, trigger condition, funnel stage, priority, platform scope and a sample payload.
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
- `js/generators/` — word banks + procedural generation helpers shared by every module and the assistant. `wordbank.js` alone carries 58 exported arrays/objects; the highest-leverage pools (name syllables, epithets, faction/creature/weapon vocab, lore hooks, quest verbs/targets, art/audio mood & lighting banks) were deliberately grown large so repeated one-click generation keeps producing fresh names, flavor text and prompts rather than visibly cycling.
- `js/modules/` — one file per module; each exports a `mountX(container, opts)` function registered in `js/modules/registry.js`.
- `js/engine/` — the Play Engine's runtime: `input.js` (keyboard manager), `physics.js` (AABB collision, gravity/jump/platform resolution, stat parsing), `statusEffects.js` (the DoT/stun/shield simulation layer — `applyStatus`/`tickStatusEffects`/`absorbDamage`, wired to Combat Designer's status-effect vocabulary), `sceneBuilder.js` (turns a real Level/Character/Item entity graph — plus its authored Level Script, multi-room layout, an elite's innate Shield and a player's ability name from a real Abilities list — into a playable scene for a given genre mode), `dialogueRunner.js` (walks a Dialogue Tree Designer node graph as a visual-novel-style overlay), `sprites.js` (procedural canvas-drawn animated humanoids/pickups with a deterministic per-entity palette, plus small status-effect badges), `scripting.js` (the Level Script parser/executor — a small trigger/condition/action DSL, not arbitrary code eval), `audio.js` (procedural sound effects synthesized via the Web Audio API — no audio files), `exportBuild.js` (packages a scene into a standalone playable HTML file with a compact inlined vanilla-JS runtime, including matching audio, room progression and the full status-effect/ability/boss-enrage simulation for parity). `js/modules/playEngine.js` owns the canvas game loop, HUD, pause and the turn-based UI.
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
