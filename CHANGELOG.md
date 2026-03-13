# Changelog

All notable changes to PickMeUp 3.0 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

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
