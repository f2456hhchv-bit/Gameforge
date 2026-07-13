// Real, sourced research into 20 years of award-winning/critically-acclaimed
// games (2005-2025) — Game Awards, D.I.C.E., BAFTA, and Metacritic history —
// used to ground the "Industry Research Brief" doc and the Genre Mashup
// Generator in actual precedent rather than invented genre labels.
// Compiled July 2026 from Wikipedia, Metacritic, OpenCritic, GameSpot, PC
// Gamer, GamesRadar, Kotaku, Forbes, Deadline, NPR, and official award-body
// sources. Design-innovation notes are analytical characterizations of
// well-documented mechanics, not disputed facts.

// Primary source: D.I.C.E. Award for Game of the Year (the only major
// ceremony that ran continuously across this whole span) for 2005-2013,
// The Game Awards (the modern industry-standard GOTY) from 2014 on. Where
// the two ceremonies disagreed in the same year, both winners are listed —
// disagreement itself is a useful signal of genre diversity at the top.
export const GOTY_HISTORY = [
  { year: 2005, game: 'God of War', genre: 'Character-action hack-and-slash', source: 'D.I.C.E. Award', innovation: 'Context-sensitive QTE finishers woven into the core combat rhythm, plus a magic-meter resource layered onto the combo system.' },
  { year: 2006, game: 'Gears of War', genre: 'Cover-based third-person military shooter', source: 'D.I.C.E. Award', innovation: 'Popularized the regenerative-health cover-to-cover combat loop and an "Active Reload" skill-timing minigame.' },
  { year: 2007, game: 'Call of Duty 4: Modern Warfare', genre: 'Contemporary military FPS', source: 'D.I.C.E. Award', innovation: 'Persistent multiplayer XP/perks/killstreak progression that became the shooter-genre template for over a decade.' },
  { year: 2008, game: 'LittleBigPlanet', genre: 'Physics platformer / UGC creation platform', source: 'D.I.C.E. Award', innovation: '"Play, Create, Share" built-in level editor as a core pillar, with a community sharing/rating ecosystem for player-built levels.' },
  { year: 2009, game: 'Uncharted 2: Among Thieves', genre: 'Cinematic third-person action-adventure', source: 'D.I.C.E. Award', innovation: 'Set-piece traversal (the collapsing train) blurring the line between cutscene and playable action, with no load breaks.' },
  { year: 2010, game: 'Mass Effect 2', genre: 'Sci-fi action-RPG/shooter hybrid', source: 'D.I.C.E. Award', innovation: 'A "loyalty mission" recruitment structure culminating in a choice-driven, variable-survival finale.' },
  { year: 2011, game: 'The Elder Scrolls V: Skyrim', genre: 'Open-world action-RPG', source: 'D.I.C.E. Award', innovation: 'Perk "constellation" trees replacing fixed classes, plus Radiant AI/quest systems generating emergent side content.' },
  { year: 2012, game: 'Journey', genre: 'Atmospheric adventure / "art game"', source: 'D.I.C.E. Award', innovation: 'Wordless, anonymous drop-in co-op with a silent stranger companion, and sand-surfing progression tied to emotional pacing rather than combat/XP.' },
  { year: 2013, game: 'The Last of Us', genre: 'Narrative survival-action', source: 'D.I.C.E. Award', innovation: 'Scarcity-driven crafting making combat resource-tense, with an AI companion (Ellie) engineered never to break the player\'s stealth.' },
  { year: 2014, game: 'Dragon Age: Inquisition', genre: 'Western fantasy action-RPG', source: 'The Game Awards (inaugural) + D.I.C.E.', innovation: 'The "War Table" — an asynchronous strategic layer where advisors resolve timed missions between play sessions.' },
  { year: 2015, game: 'The Witcher 3: Wild Hunt (TGA) / Fallout 4 (D.I.C.E.)', genre: 'Open-world action-RPG', source: 'Ceremonies disagreed', innovation: 'Witcher 3: delayed, systemic consequence design where side-quest choices ripple for dozens of hours. Fallout 4: deep settlement-building layered onto RPG exploration.' },
  { year: 2016, game: 'Overwatch', genre: 'Hero shooter', source: 'The Game Awards + D.I.C.E.', innovation: 'Fixed, non-interchangeable hero kits forcing team-composition strategy over create-your-own loadouts.' },
  { year: 2017, game: 'The Legend of Zelda: Breath of the Wild', genre: 'Open-world action-adventure', source: 'The Game Awards + D.I.C.E.', innovation: 'A universal physics/elemental "chemistry engine" applied everywhere, replacing scripted per-puzzle logic.' },
  { year: 2018, game: 'God of War', genre: 'Action-adventure', source: 'The Game Awards + D.I.C.E.', innovation: 'A single unbroken "one-shot" camera for the entire game, with an AI companion (Atreus) usable in both combat and puzzles.' },
  { year: 2019, game: 'Sekiro: Shadows Die Twice (TGA) / Untitled Goose Game (D.I.C.E.)', genre: 'Action Soulslike / physical-comedy stealth-puzzle', source: 'Ceremonies disagreed', innovation: 'Sekiro: a posture/deflection system replacing stamina-dodge combat with aggressive parries. Goose Game: a single nonviolent grab/honk/steal verb set driving emergent slapstick puzzles.' },
  { year: 2020, game: 'The Last of Us Part II (TGA) / Hades (D.I.C.E.)', genre: 'Action-adventure survival horror / narrative roguelike', source: 'Ceremonies disagreed', innovation: 'TLOU2: a dual-protagonist structure recontextualizing player allegiance mid-campaign. Hades: death itself as a story mechanic, with permanent dialogue/relationship progress across runs.' },
  { year: 2021, game: 'It Takes Two', genre: 'Co-op-only action platformer', source: 'The Game Awards + D.I.C.E.', innovation: 'Mandatory two-player design where nearly every level introduces a wholly new, single-use mechanic pair, never repeated.' },
  { year: 2022, game: 'Elden Ring', genre: 'Open-world Soulslike action-RPG', source: 'The Game Awards + D.I.C.E. + BAFTA', innovation: 'Dense, interlocking "Legacy Dungeon" level design embedded inside a fully open, horse-traversable overworld.' },
  { year: 2023, game: "Baldur's Gate 3", genre: 'Turn-based CRPG', source: 'Swept all 5 major GOTY ceremonies', innovation: 'Fully reactive environmental simulation (fire, water, height, shove) carried into turn-based tactics, plus playable "origin" companions with full personal storylines.' },
  { year: 2024, game: 'Astro Bot', genre: '3D collect-a-thon platformer', source: 'The Game Awards + D.I.C.E.', innovation: 'DualSense haptics integrated directly into core platforming feel rather than isolated to bonus tech-demo rooms.' },
  { year: 2025, game: 'Clair Obscur: Expedition 33', genre: 'Turn-based RPG with real-time action layered in', source: 'The Game Awards + D.I.C.E.', innovation: 'Real-time dodge/parry/jump windows grafted onto menu-based turn selection, turning defense into an active skill test.' },
];

// BAFTA's "Best Game" winners frequently diverge from The Game Awards/D.I.C.E.
// in the same year — proof that multiple genres can each be "the best game"
// of a given year depending on which lens is applied. Highlighted here are
// BAFTA winners NOT already represented above, because that divergence is
// itself the strongest evidence for genre diversity at the top.
export const BAFTA_DIVERGENT_WINNERS = [
  { year: 2005, game: 'Half-Life 2', genre: 'Narrative FPS', innovation: 'Physics-driven puzzles/combat via the Gravity Gun, plus an industry-leading facial-animation system for silent-protagonist storytelling.' },
  { year: 2010, game: 'Batman: Arkham Asylum', genre: 'Action-adventure stealth-brawler', innovation: 'The FreeFlow fluid combo-combat system and a Detective Vision mode blending stealth with investigation.' },
  { year: 2012, game: 'Portal 2', genre: 'First-person puzzle-platformer', innovation: 'Propulsion/Repulsion Gel mechanics layered onto portal traversal, plus a dedicated two-player cooperative puzzle campaign.' },
  { year: 2013, game: 'Dishonored', genre: 'Immersive-sim stealth-action', innovation: 'A Chaos system where lethal-vs-non-lethal play measurably alters world state and ending, fused with supernatural traversal powers (Blink).' },
  { year: 2015, game: 'Destiny', genre: 'Online action-RPG / looter-shooter', innovation: 'Seamless drop-in "public events" blending open-world PvE with MMO elements, plus raid design merging FPS combat with puzzle mechanics.' },
  { year: 2018, game: 'What Remains of Edith Finch', genre: 'Narrative walking sim / anthology', innovation: 'Each family member\'s death told via a radically different bespoke mini-mechanic (rhythm-QTE, dream sequences), all diegetically embedded in the house\'s architecture.' },
  { year: 2020, game: 'Outer Wilds', genre: 'Open-world space-exploration mystery', innovation: 'Knowledge-based progression with zero skill trees or items — the only upgrade is what the player has personally learned — inside a recurring 22-minute time loop.' },
  { year: 2022, game: 'Returnal', genre: 'Roguelike third-person shooter', innovation: 'A roguelike run structure fused with bullet-hell arcade shooting and deep DualSense haptic weapon feedback.' },
  { year: 2023, game: 'Vampire Survivors', genre: 'Roguelike "bullet heaven" auto-battler', innovation: 'Reversed bullet-hell design (the character auto-attacks; the player only moves/dodges) — the first solo-developer game ever to win a Best Game BAFTA, beating Elden Ring and God of War Ragnarök.' },
];

// Precise mechanical signatures per subgenre, cross-checked against multiple
// sources — used to give generated content authentic, specific language
// instead of generic genre buzzwords.
export const GENRE_SIGNATURES = [
  { genre: 'Soulslike', peak: '2019–2022', examples: ['Demon\'s Souls', 'Dark Souls', 'Bloodborne', 'Sekiro', 'Elden Ring'], signature: 'Stamina-gated commitment combat, bonfire/checkpoint rest loops that respawn enemies, dropped-currency retrieval-on-death, and tightly interconnected level design with shortcuts looping back to earlier hubs.' },
  { genre: 'Immersive Sim', peak: '2007, 2012–2013', examples: ['Deus Ex', 'BioShock', 'Dishonored', 'Prey'], signature: 'Systemic, simulation-driven levels where physics, AI perception, and hazards interact; a verb-based toolset letting one objective be solved via combat, stealth, or environment manipulation.' },
  { genre: 'Metroidvania', peak: '2015–2020', examples: ['Ori and the Blind Forest', 'Hollow Knight', 'Blasphemous', 'Ori and the Will of the Wisps'], signature: 'Interconnected map with backtracking gated by ability-based traversal locks rather than keys; boss fights as skill-checks validating a newly acquired ability.' },
  { genre: 'Open-world Action-Adventure', peak: '2017–2018', examples: ['Breath of the Wild', 'Horizon Zero Dawn', 'Red Dead Redemption 2'], signature: 'Physics/chemistry-driven emergent systems paired with a traversal toolset, plus systemic weather/ecology/faction AI producing emergent narrative beyond scripted missions.' },
  { genre: 'CRPG Revival', peak: '2019, 2023', examples: ['Pillars of Eternity', 'Divinity: Original Sin 2', 'Disco Elysium', "Baldur's Gate 3"], signature: 'Turn-based/RTwP tactical combat with positional and elemental surface interactions; dialogue trees gated by build-tied skill checks; companion approval systems locking/unlocking content.' },
  { genre: 'Extraction Shooter', peak: '2019–2023 (commercially — never won a top GOTY)', examples: ['Escape from Tarkov', 'Hunt: Showdown', 'DayZ'], signature: 'Session-based raids with a hard extraction deadline; failure means permadeath of the entire carried loadout; PvPvE compounds the greed-vs-safety decision every raid.' },
  { genre: 'Live-Service Looter', peak: '2018', examples: ['Destiny 2: Forsaken', 'Warframe'], signature: 'Rarity-tiered loot with randomized perk rolls; seasonal content cadence; endgame builds assembled through gear/mod socketing rather than campaign content.' },
  { genre: 'Narrative Adventure / Walking Sim', peak: '2017–2019', examples: ['Firewatch', 'What Remains of Edith Finch', 'Return of the Obra Dinn'], signature: 'Story delivered through unhurried environmental exploration with combat minimized or absent; Obra Dinn\'s time-freeze death-reconstruction turned discovery into a logic puzzle.' },
  { genre: 'Roguelike/Roguelite', peak: '2018–2021', examples: ['Dead Cells', 'Slay the Spire', 'Hades'], signature: 'Procedurally generated runs ending in permadeath that resets in-run power but preserves meta-progression; run-scoped synergy systems (deck-building, boon-stacking) generate build identity.' },
  { genre: 'Party/Co-op', peak: '2021', examples: ['Overcooked', 'It Takes Two'], signature: 'Chaos-management under time pressure, or asymmetric constantly-rotating traversal gimmicks that must combine via real communication between players.' },
  { genre: 'Battle Royale', peak: '2019', examples: ['PUBG', 'Apex Legends', 'Fortnite'], signature: 'A shrinking safe-zone circle forcing convergence, last-player-standing win condition, and ground-scavenged loot with no fixed starting kit.' },
  { genre: 'Character Action', peak: '2019, 2022', examples: ['Devil May Cry 5', 'Bayonetta 3', 'Metal Gear Rising'], signature: 'A real-time style/combo ranking meter that scores hit variety and timing, punishing repetition; weapon-switching combo chains layered atop parry/counter windows.' },
  { genre: 'Survival Crafting', peak: '2018, 2021', examples: ['Subnautica', 'Valheim', 'Minecraft'], signature: 'Layered resource-to-crafting-tree progression gated by biome difficulty; depleting survival meters forcing cyclical return-to-base loops.' },
  { genre: 'Asymmetric Multiplayer Horror', peak: 'No critical peak — commercial longevity only', examples: ['Dead by Daylight', 'Evil Dead: The Game'], signature: 'Strict one-versus-many role split; chase mechanics built on pallet-stuns/window-vaults; a multi-stage sacrificial elimination state rescuable by teammates.' },
  { genre: 'Immersive Narrative Branching', peak: '2015, 2023', examples: ['The Witcher 3', 'Disco Elysium', "Baldur's Gate 3"], signature: 'Choice-and-consequence branching where early decisions surface as delayed downstream consequences dozens of hours later; multiple mutually-exclusive endings from accumulated choices.' },
];

// Genre-mechanic combinations that are conspicuously rare or absent at an
// AAA/critically-acclaimed level, based on the gap analysis above. Each is a
// concrete, buildable design brief seed — not a vague mashup label.
export const GENRE_GAPS = [
  { name: 'Cozy Extraction', combo: ['Cozy Sim', 'Extraction Shooter'], rationale: 'Borrow the extraction shooter\'s greed-vs-safety raid tension and permadeath-of-loadout stakes, but strip the violence — risk losing a full basket of rare foraged goods instead of a rifle.' },
  { name: 'Systemic Empire', combo: ['4X Strategy', 'Immersive Sim'], rationale: 'Empire-level 4X strategy where the SAME simulated systems (fire, weather, disease) that affect a single tactical battle also directly affect empire-wide resource yields — not two separate abstraction layers.' },
  { name: 'Rhythm Soulslike', combo: ['Rhythm Game', 'Soulslike'], rationale: 'Punishing, precise parry/dodge timing married to a music-reactive difficulty curve and stamina-gated combat, at genuine Soulslike build-crafting depth rather than a light rhythm-action spinoff.' },
  { name: 'Deckbuilder Explorer', combo: ['Deckbuilder', 'Open-world Exploration'], rationale: 'Cards as traversal/environmental-puzzle tools across a full open world, not just a combat-encounter resource — deck-building applied to movement and world interaction, not only damage.' },
  { name: 'Branching Asymmetric Horror', combo: ['Asymmetric Multiplayer Horror', 'Branching Narrative'], rationale: 'Dead by Daylight-style one-vs-many asymmetry combined with Detroit: Become Human-style persistent branching consequences that carry across sessions, not just per-match chase mechanics.' },
  { name: 'Roguelite Visual Novel', combo: ['Visual Novel', 'Roguelike/Roguelite'], rationale: 'Permadeath/meta-progression run structure applied to branching narrative choices — each "run" is a compressed story arc whose permanent unlocks reshape which narrative branches are reachable next run.' },
  { name: 'Grand Tactics', combo: ['4X Strategy', 'Character Action'], rationale: 'Zoomed-in, skill-based real-time combat for named hero units fought directly by the player, nested inside a full empire-simulation 4X layer — not a separate abstracted battle screen.' },
  { name: 'Living Farm', combo: ['Farming Sim', 'Immersive Sim'], rationale: 'Systemic crop/weather/pest simulation with real emergent cause-and-effect chains (a drought triggers pest migration triggers crop disease) instead of scripted seasonal events.' },
  { name: 'Narrative Battle Royale', combo: ['Battle Royale', 'Immersive Narrative Branching'], rationale: 'Matches feed into an evolving, branching meta-narrative that shifts based on aggregate player behavior across seasons, rather than battle royale\'s usual cosmetic-only meta-progression.' },
  { name: 'Simulated Siege', combo: ['Tower Defense', 'Immersive Sim'], rationale: 'Direct first/third-person control within the defense, with systemic environment interactions (fire spreads, terrain deforms, water floods trenches) instead of a top-down abstracted tower-placement layer.' },
  { name: 'Co-op Soulslike', combo: ['Party/Co-op', 'Soulslike'], rationale: 'Genuinely punishing, high-stakes Soulslike combat balanced from the ground up for local co-op — not an easy-mode co-op game, and not a Souls game with co-op bolted on as an optional summon.' },
  { name: 'Asymmetric Deckbuilder', combo: ['Deckbuilder', 'Asymmetric Multiplayer Horror'], rationale: 'One player draws from a "hunter" deck, others from "survivor" decks, resolved in real time — card-driven ability systems replacing Dead by Daylight\'s fixed perk system entirely.' },
  { name: 'Seasonal Puzzle World', combo: ['Puzzle-Platformer', 'Live-Service Looter'], rationale: 'A single evolving puzzle world updated with new seasonal RULES (new physics interactions, new mechanics) rather than new cosmetics or new levels bolted onto unchanged systems.' },
  { name: 'Settled Walking Sim', combo: ['Narrative Adventure / Walking Sim', 'Survival Crafting'], rationale: 'Slow, unhurried narrative-exploration pacing married to persistent base-building progression, entirely without combat or survival-meter pressure.' },
  { name: 'Duelist\'s Court', combo: ['Character Action', 'CRPG Revival'], rationale: 'CRPG-style party management and branching dialogue deciding WHICH character enters a real-time, style-ranked 1-on-1 duel — the party layer and the action layer share the same stakes and consequences.' },
  { name: 'Roguelite Circuit', combo: ['Survival Crafting', 'Battle Royale'], rationale: 'Procedurally generated race/course layouts with roguelite meta-progression — vehicle upgrades persist across a "season" of procedurally generated races instead of resetting each event.' },
  { name: 'Diplomatic Hearts', combo: ['4X Strategy', 'Immersive Narrative Branching'], rationale: 'Diplomacy modeled as deep, branching relationship-building with named leader characters (visual-novel depth) rather than an abstracted trust meter and treaty checklist.' },
  { name: 'Extraction Homestead', combo: ['Extraction Shooter', 'Farming Sim'], rationale: 'A high-risk "raid the overgrown ruins for rare seeds/relics" loop whose rewards feed directly back into a peaceful, persistent home-base farming sim.' },
  { name: 'Metroidvania Empire', combo: ['Metroidvania', '4X Strategy'], rationale: 'The Metroidvania map IS the empire\'s territory — new traversal abilities don\'t just open rooms, they annex new strategic resource zones directly into the player\'s empire-level economy.' },
  { name: 'Seasonal Sandbox', combo: ['Immersive Sim', 'Live-Service Looter'], rationale: 'A systemic, player-driven simulation sandbox (Dishonored/Prey-style) that receives live seasonal NARRATIVE content drops with new systemic tools, instead of only cosmetic seasons.' },
];
