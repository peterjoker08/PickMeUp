# PickMeUp TODOS

Items deferred from design reviews. One item per entry.
Format: **Priority** P1/P2/P3 | **Effort** S/M/L/XL | **Blocked by** prerequisite

---

## P1 — Must Ship Soon

### Dungeon Reward Application
**What:** `dungeons.js` reward stub logs "Apply rewards" but gives nothing. Complete the reward loop.
**Why:** Broken promise — players run dungeons expecting gold/materials/exp and receive nothing silently.
**Where to start:** `js/scenes/dungeons.js` near the "Apply rewards (stub)" comment. Map dungeon template tier → reward table (gold, materials, exp).
**Effort:** S | **Blocked by:** Material economy balance (can use rough values for now)

### Spire Passive Bonus Application
**What:** Define `getSpireBonus(stat)` helper in `city.js` and wire it into `combat.js` (for ATK/DEF% bonuses) and `afkRewards.js` (for AFK gold rate bonus). The bonus table exists in the architecture review but is not yet applied anywhere.
**Why:** Without the hook, Spire upgrades grant the cosmetic milestone reward but no actual gameplay benefit. Players who upgrade the Spire should see their Tower combat become slightly easier.
**Provisional bonus table:** L1: +2% AFK gold. L2: +2% party ATK in Tower. L3: +4% AFK gold. L4: +2% party DEF. L5: unlocks next building slot.
**Where to start:** `js/scenes/city.js` — add `window.getSpireBonus = function(stat) { ... }`. `js/systems/combat.js` line 155 (atkMod application). `js/systems/afkRewards.js` line 32 (towerGoldMult).
**Effort:** S | **Blocked by:** City MVP shipped (Spire levels must exist before bonuses can be read)

### Contextual Currency Display (Schematics, Bread, Wishes)
**What:** Show schematics in the city scene header only, bread count in the dungeon scene header only, wishes in the summon scene banner area only. Each in its natural context rather than crowding the global HUD topbar.
**Why:** The global topbar already shows gems + gold. Adding 3 more icons would make it unreadable on mobile. Contextual display is cleaner and educates players on where each currency is used.
**Where to start:** `js/scenes/city.js` (schems display), `js/scenes/dungeons.js` (bread display), `js/scenes/summon.js` (wishes display). Each scene header already exists.
**Effort:** S | **Blocked by:** City MVP + stat sprint (currencies must exist in gameState first)

### Combat Power (CP) Formula
**What:** Define the weighted formula that computes a single CP number from a hero's 21 stats. CP is shown on the hero card instead of individual stats.
**Why:** Without a formula, the hero card shows 0 or garbage. The formula must be calibrated so 6★ heroes read ~3× a 3★, and CP differences feel meaningful in party-building decisions.
**Suggested formula:** `CP = (HP × 0.3) + (Attack × 2.0) + (PhysDef × 1.5) + (MagDef × 1.5) + (CritRate × 10) + (CritDmg × 5) + (AtkSpeed × 8)`. Produces ~1000–50000 range across rarities. Cache on `hero.cp`, invalidate on any stat change.
**Where to start:** `js/gameState.js` — add `computeCombatPower(hero)` next to `buildHeroStats()`. Call it at end of `buildHeroStats()` and `getEffectiveStats()`.
**Effort:** S | **Blocked by:** stat system fields defined (21 stats added to buildHeroStats)

---

## P2 — High Value, Next Sprint

### Promotion Ceremony Animation
**What:** When a hero promotes, their card flashes white, stars increment one-by-one with a rising audio cue, then the hero delivers a single contextual personality line from their HERO_STORIES entry.
**Why:** Promotion is a milestone moment players grind toward. Silent button click wastes the peak emotional payoff.
**Where to start:** `js/scenes/heroes.js` — hook into `performPromotion()` success path. Reuse existing pull-animation flash pattern.
**Effort:** S | **Blocked by:** Phase 1 (Promotion complete), hero personality lines authored in HERO_STORIES

### Latent Talent Visual Badge
**What:** When `hero.latentTalent === true`, show a gold ◆ badge on roster card. In combat, when the hero's `latentTalentDef` effect procs, float a brief `LATENT` text above the hit.
**Why:** The 4500 affinity milestone should feel like a visible transformation, not a hidden stat tweak. Players need to see their investment.
**Where to start:** Roster card render in `js/scenes/heroes.js`. Combat floating text in `js/systems/combat.js`.
**Effort:** S | **Blocked by:** Phase 2 (Latent Talent mechanic complete)

### Special Shop Tab Content
**What:** The Special shop tab exists in UI with zero items. Suggested catalog: cosmetic hero portrait frames (bought with affinity tokens), rare promotion shard packs, limited banner currency.
**Why:** Empty UI tab is a broken promise. Also: Special shop is a natural sink for affinity tokens once that currency exists.
**Where to start:** `js/scenes/shop.js`. Define an item catalog config. Reuse existing shop purchase flow.
**Effort:** M | **Blocked by:** Affinity token currency system (not yet implemented), material economy balance

### Split intro engine from script data
**What:** Separate `js/data/introScript.js` (the 23-step STEPS array and all dialogue content) from `tutorial.js` (the engine: `showDialogue`, `highlightButton`, `waitForNav`, sprite rendering).
**Why:** tutorial.js is already 1520 lines. The new intro will push it past 2000. Editing dialogue will require understanding the engine. Two separate files are independently maintainable.
**Where to start:** Create `js/data/introScript.js` containing only the `STEPS` array and any intro-specific data. `tutorial.js` imports and runs it. Do this during the intro rewrite sprint, not as a separate task.
**Effort:** S | **Blocked by:** Nothing — do this as part of the intro rewrite

---

## P3 — Vision / After Multiple Heroes Are Authored

### Iselle Roaming City Animation
**What:** Phase 2 of the city system. Iselle flies along a bezier path around the unlocked city, pauses near heroes present in the city, and triggers short contextual NPC dialogue exchanges. Tapping Iselle at any point gives daily 50 gold.
**Why:** The MVP has Iselle stationary at the Spire center. Roaming Iselle makes the city feel alive and creates organic moments of delight. Every new building unlocked expands Iselle's roaming territory.
**Where to start:** City scene canvas layer (or CSS animation over the city view). Define `ISELLE_PATH_NODES` per building count. Iselle sprite already exists at `assets/character_assets/isellespritesheet.png`.
**Effort:** L | **Blocked by:** City MVP shipped, hero-in-city placement system

### Heroes Visible in City
**What:** Heroes not currently on dungeon runs appear as small sprites in the city's open regions. Tapping a hero in the city opens their hero detail panel. High-affinity heroes have slightly larger sprites.
**Why:** Makes Townia feel like a real home — you can see your team living there. Creates an incentive to roster-build beyond pure combat power. Deepens the Townia-as-home emotional hook.
**Where to start:** City scene, after Iselle roaming exists. Requires: city region definitions (areas where heroes can appear), LPC sprite rendering at small scale (already partially exists in combat.js), tap detection.
**Effort:** L | **Blocked by:** City MVP shipped, Iselle roaming, hero sprite system

### Party Chemistry Bonds
**What:** When two heroes with defined relationship history are both in the active party, a small bond icon appears in the Party tab. Tapping it plays a short text exchange between them.
**Why:** Deepens the hero roster as a cast of characters rather than a collection of stat blocks. Players will intentionally build parties around hero relationships.
**Where to start:** Requires a `relationships: [{ heroId, type, lines }]` field in `HERO_STORIES`. UI hook in `js/scenes/heroes.js` party tab render.
**Effort:** M | **Blocked by:** 5+ heroes with authored HERO_STORIES entries
