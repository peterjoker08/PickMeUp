# Changelog

All notable changes to PickMeUp 3.0 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.2.0] - 2026-03-14

### Added
- **Login Rewards scene** (`js/scenes/loginRewards.js`): full-screen 16:9 overlay matching Figma design — 28-day calendar grid, progress milestone track (days 5/10/15/20), amber/purple/dark-amber card states (claimed/unlocked/locked), bottom nav tabs stub.
- `gameState.loginDays`: new field tracking total lifetime login days, persisted to localStorage.
- `triggerLoginRewards()`: global function to open the Login Rewards overlay from anywhere.
- **City scene** (`js/scenes/city.js`): replaces manor.js — Mystic Spire (levels 0–5, costs Building Schematics) and Bakery (unlocks at Spire L3, produces bread at 1 loaf/8 min up to cap 200).
- **New currencies**: Building Schematics (BD), Wishes (pull tickets), Bread (dungeon stamina) — all persisted and migrated from old saves.
- **Tutorial system** (`js/systems/tutorial.js`): full guide-mode walkthrough with highlight, dialogue, and choice steps; `clearNewbieTag()` unlocks on first tower floor clear.
- **Lobby buildings** rendered in hub main area: Mystic Spire (animated pulse glow) and Bakery tile; both navigate to City scene.
- `applyReward()` helper in `js/ui/helpers.js`: unified reward application across daily quests, tower rewards, affinity milestones.
- Daily quest rewards now applied inline via `applyReward()` instead of via mailbox — instant gratification without a mailbox visit.
- Daily quest `towerChallenge` and `expedition` rewards now also grant Schematics (+5 each); all-complete bonus now grants +20 Schematics.

### Changed
- `index.html`: manor.js replaced by city.js; loginRewards.js added before main.js.
- `js/main.js`: `registerSceneManor()` → `registerSceneCity()`; `registerSceneLoginRewards()` added.
- Restart button in hub now also clears `pickmeup_tut_bd_granted` localStorage key.

### Removed
- `js/scenes/manor.js`: replaced entirely by city.js.

## [0.1.1.0] - 2026-03-13

### Added
- **Daily Quest System** (`js/systems/dailyQuests.js`): 6 daily quests reset at midnight UTC — complete tower challenge, summon, claim tower reward, dispatch expedition, purchase from shop, talk to a hero. Each quest has an individual mail reward; completing all 6 grants a bonus of 💎150 + 🪙500.
- **Quest badge** on hub HUD: gold badge on the Quest button shows count of incomplete quests; hides when all are done.
- **Quest scene** accessible from hub nav: full quest panel showing progress, individual claim buttons, and all-complete bonus claim.
- **Hero Affinity system** (`js/scenes/heroes.js`): heroes accumulate affinity (+20 per talk, once per day). 11 milestone thresholds (100 → 8000) auto-grant gem rewards, talent boosts, and backstory unlocks via mail.
- **[♥ AFFINITY] button** in hero detail overlay opens an affinity panel showing progress bar, dialogue, TALK action, and milestone list.
- `talkToHero(heroId)` function: enforces one-talk-per-day gate, triggers quest hook, checks milestones, refreshes UI.
- Quest hooks injected into: `arena.js` (tower fight win), `summon.js` (inventory commit), `tower.js` (daily reward claim), `gameState.js` (dungeon dispatch, shop purchase).

### Changed
- `summon.js`: extracted `_commitPendingResults()` helper — both [ADD TO INVENTORY] and [SUMMON AGAIN] paths now share a single flush implementation (DRY fix).
- Tower cleared-floor panel: [REVISIT] button now accompanied by [CLAIM DAILY REWARD] button (30 gems + 300 gold, once per day).
- `gameState.js`: `loadGame` catch block now logs the error instead of silently swallowing it.
- `gameState.js`: `purchaseItem` gems deduction uses `|| 0` NaN guard.
- `js/ui/helpers.js`: `affinity-panel-overlay` added to escape-key overlay list (z-index 1650).

### Fixed
- Tower daily reward popup: OK button now correctly dismisses the popup via ID-based lookup (matched `_closePreCombat` pattern).
- `_grantAffinityMilestone`: gem rewards delivered exclusively via `sendMail` — removed prior double-award path that both mutated `gameState.gems` and sent mail.

## [0.1.0.0] - 2026-03-10

### Added
- Initial tracked release: gacha/summon system, heroes roster, tower of trials, dungeon/expedition system, combat engine, shop, mailbox, AFK idle rewards, synthesis, promotion, debug mode.
