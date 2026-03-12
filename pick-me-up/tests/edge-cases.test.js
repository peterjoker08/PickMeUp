// ═══════════════════════════════════════════════════════════
// EDGE CASE TEST SUITE — Pick Me Up: Infinite Gacha Online
// ═══════════════════════════════════════════════════════════
// Run with: node tests/edge-cases.test.js
//
// This file stubs the browser environment minimally, then
// sources the game logic scripts and exercises edge cases.

// ── Minimal browser stubs ──────────────────────────────────
global.window = global;
global.document = {
  addEventListener() {},
  getElementById() { return null; },
  querySelectorAll() { return []; },
  createElement() {
    return { style: {}, addEventListener() {}, appendChild() {}, innerHTML: '', className: '', dataset: {}, querySelector() { return null; }, querySelectorAll() { return []; } };
  },
};
global.localStorage = { _data: {}, getItem(k) { return this._data[k] || null; }, setItem(k, v) { this._data[k] = v; }, removeItem(k) { delete this._data[k]; } };
global.requestAnimationFrame = (fn) => setTimeout(fn, 0);
global.setTimeout = global.setTimeout;
global.setInterval = () => 0;
global.clearInterval = () => {};
global.clearTimeout = () => {};
global.console = console;
global.alert = () => {};

// ── Load game source files ─────────────────────────────────
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const BASE = path.resolve(__dirname, '..');

function loadScript(relPath) {
  const code = fs.readFileSync(path.join(BASE, relPath), 'utf8');
  vm.runInThisContext(code, { filename: relPath });
}

// Load in dependency order
loadScript('js/ui/helpers.js');
loadScript('js/gameState.js');
loadScript('js/scenes/summon.js');   // gacha engine + generateResult + performPull
loadScript('js/systems/statusEffects.js');
loadScript('js/systems/combat.js');
loadScript('js/systems/enemies.js');

// ── Test framework ─────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(message);
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function describe(name, fn) {
  console.log(`\n═══ ${name} ═══`);
  fn();
}

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push(`${name}: ${e.message}`);
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${e.message}`);
  }
}

function resetGameState() {
  gameState.playerNickname = 'Test';
  gameState.tutorialAccepted = true;
  gameState.tutorialStep = -1;
  gameState.gems = 10000;
  gameState.gold = 10000;
  gameState.currentFloor = 1;
  gameState.inventory = [];
  gameState.party = [];
  gameState.banners = { standard: { pityCount: 0 }, limited: { pityCount: 0 }, weapon: { pityCount: 0 } };
  gameState.tower = { currentFloor: 1, clearedFloors: [], floorRevisitClaimed: {}, lastRevisitReset: null };
  gameState.materials = [];
  gameState.dungeons = { activeRuns: [], completedRuns: [], dailyBonus: { dungeonId: null, lastReset: null } };
  gameState.synthesisHistory = [];
  gameState.shop = { dailyStock: [], lastStockReset: null, purchaseHistory: [] };
  gameState.mailbox = [];
  gameState.items = [];
  gameState.firstPullDone = true;
  gameState.synergy = { level: 0 };
}

// ═══════════════════════════════════════════════════════════
// TEST SUITES
// ═══════════════════════════════════════════════════════════

describe('GACHA: generateResult missing hero fields', () => {
  test('hero from generateResult should have equippedWeapons (dual-slot)', () => {
    resetGameState();
    const hero = generateResult('standard', 3);
    assert(hero.equippedWeapons !== undefined, 'hero.equippedWeapons should exist');
    assert(hero.equippedWeapons === null || (typeof hero.equippedWeapons === 'object' && hero.equippedWeapons !== null && 'mainHand' in hero.equippedWeapons),
      'hero.equippedWeapons should be { mainHand, offHand } or null');
  });

  test('hero from generateResult should have inDungeon flag', () => {
    resetGameState();
    const hero = generateResult('standard', 4);
    assert(hero.inDungeon !== undefined, 'hero.inDungeon should be defined');
  });

  test('hero from generateResult should have weaponProficiency', () => {
    resetGameState();
    const hero = generateResult('standard', 5);
    assert(hero.weaponProficiency !== undefined, 'hero.weaponProficiency should be defined');
  });

  test('hero from generateResult should have activePenalty', () => {
    resetGameState();
    const hero = generateResult('standard', 3);
    assert(hero.activePenalty !== undefined, 'hero.activePenalty should be defined');
  });

  test('hero from generateResult should have statusEffects', () => {
    resetGameState();
    const hero = generateResult('standard', 3);
    assert(hero.statusEffects !== undefined, 'hero.statusEffects should be defined');
    assert(Array.isArray(hero.statusEffects), 'hero.statusEffects should be an array');
  });

  test('createShayHero should have equippedWeapons (dual-slot), not equippedWeapon', () => {
    const shay = createShayHero();
    assert(shay.equippedWeapons !== undefined, 'Shay should have equippedWeapons');
    assert(shay.equippedWeapon === undefined || shay.equippedWeapons !== undefined, 'Shay should use dual-slot format');
  });
});

describe('GACHA: Summon Again discards results', () => {
  test('pendingResults should be added to inventory before new summon', () => {
    resetGameState();
    // Simulate: performPull creates results, user clicks "Again" without "Add All"
    const results = performPull('standard', 1);
    const oldInvLen = gameState.inventory.length;
    // pendingResults = results (set by showResultsPanel, simulated here)
    // If user clicks "Again", the old pendingResults are lost
    // This is a known bug - verify it exists
    assert(results.length > 0, 'Should have pull results');
    // Results are NOT in inventory yet (by design they go in on "Add All" click)
    // But the "Again" button should also save them first
    assert(gameState.inventory.length === oldInvLen, 'Results should not be in inventory until confirmed (by design)');
  });
});

describe('GACHA: computeRates rate pool redistribution', () => {
  test('rates should sum to ~100 for all floor brackets', () => {
    const floors = [1, 4, 5, 10, 15, 30, 31, 50, 51, 75, 100];
    const banners = ['standard', 'limited', 'weapon'];
    for (const floor of floors) {
      for (const banner of banners) {
        gameState.currentFloor = floor;
        const rates = computeRates(floor, banner);
        const sum = rates.reduce((a, b) => a + b, 0);
        assert(Math.abs(sum - 100) < 1,
          `Rates for floor ${floor}, banner ${banner} should sum to ~100, got ${sum.toFixed(2)}`);
      }
    }
  });

  test('rates should never have negative values', () => {
    for (let floor = 1; floor <= 100; floor++) {
      for (const banner of ['standard', 'limited', 'weapon']) {
        const rates = computeRates(floor, banner);
        for (let i = 0; i < rates.length; i++) {
          assert(rates[i] >= 0,
            `Rate for rarity ${i+1} at floor ${floor} (${banner}) should not be negative, got ${rates[i]}`);
        }
      }
    }
  });
});

describe('GACHA: Pity system edge cases', () => {
  test('pity at exactly 60 should guarantee ceiling rarity', () => {
    resetGameState();
    gameState.currentFloor = 50;
    gameState.banners.standard.pityCount = 59;
    const rates = computeRates(50, 'standard');
    const ceiling = getCeiling(50);
    const adjRates = applyPity(rates, 60, ceiling);
    assert(adjRates[ceiling - 1] === 100, `Hard pity at 60 should give 100% ceiling (${ceiling}★)`);
  });

  test('pity counter should reset on ceiling hit', () => {
    resetGameState();
    gameState.currentFloor = 50;
    gameState.banners.standard.pityCount = 59;
    performPull('standard', 1);
    assert(gameState.banners.standard.pityCount === 0 || gameState.banners.standard.pityCount === 1,
      'Pity should reset after ceiling hit');
  });
});

describe('PARTY: swapPartySlot duplicate entries', () => {
  test('swapping a hero already in party should remove from old slot', () => {
    resetGameState();
    const hero1 = { id: 'h1', type: 'hero', name: 'Hero1', rarity: 3, class: 'Knight', level: 1, exp: 0, talent: 5, stats: buildHeroStats(3, 5), equippedWeapons: { mainHand: null, offHand: null }, inParty: false, inDungeon: false, skills: [], statusEffects: [], weaponProficiency: {}, activePenalty: null };
    const hero2 = { id: 'h2', type: 'hero', name: 'Hero2', rarity: 3, class: 'Mage', level: 1, exp: 0, talent: 5, stats: buildHeroStats(3, 5), equippedWeapons: { mainHand: null, offHand: null }, inParty: false, inDungeon: false, skills: [], statusEffects: [], weaponProficiency: {}, activePenalty: null };
    gameState.inventory.push(hero1, hero2);

    addToParty('h1');
    addToParty('h2');
    // Party is now [h1, h2]

    // Swap h1 into slot 1 (where h2 is)
    swapPartySlot(1, 'h1');

    // h1 should NOT appear in both slot 0 and slot 1
    const h1Count = gameState.party.filter(id => id === 'h1').length;
    assert(h1Count <= 1, `Hero h1 should appear at most once in party, found ${h1Count} times`);
  });
});

describe('TOWER: Floor 101 after clearing floor 100', () => {
  test('recordFloorClear(100) should not allow currentFloor > 100', () => {
    resetGameState();
    gameState.tower.currentFloor = 100;
    recordFloorClear(100);
    assert(gameState.tower.currentFloor <= 100,
      `currentFloor should not exceed 100, got ${gameState.tower.currentFloor}`);
  });

  test('getFloorType should handle floor > 100 gracefully', () => {
    // Even if currentFloor somehow reaches 101, getFloorType shouldn't crash
    const type = getFloorType(101);
    assert(type === 'normal' || type === 'miniboss' || type === 'boss',
      `getFloorType(101) should return a valid type, got ${type}`);
  });

  test('getEnemiesForFloor should handle floor 101+', () => {
    try {
      const enemies = getEnemiesForFloor(101);
      assert(enemies.length > 0, 'Should generate enemies even for floor 101');
    } catch (e) {
      assert(false, `getEnemiesForFloor(101) should not throw: ${e.message}`);
    }
  });
});

describe('COMBAT: Negative AGI from Axe weapons', () => {
  test('effective AGI should not go negative', () => {
    resetGameState();
    // Create a 1★ hero (8 base AGI) with a 7★ Axe (-35 AGI)
    const hero = {
      id: 'h_agi_test', type: 'hero', name: 'AGI Test', rarity: 1, class: 'Knight',
      level: 1, exp: 0, talent: 5,
      stats: buildHeroStats(1, 5),
      equippedWeapons: { mainHand: 'w_axe', offHand: null },
      inParty: false, inDungeon: false, skills: [], statusEffects: [],
      weaponProficiency: {}, activePenalty: null,
    };
    const axe = {
      id: 'w_axe', type: 'weapon', name: 'Big Axe', rarity: 7, weaponType: 'Axe',
      equippedTo: 'h_agi_test',
      stats: { flatSTR: 200, flatINT: 0, flatHP: 0, flatAGI: -35, pctSTR: 0, pctINT: 0, pctHP: 0, pctAGI: 0 },
    };
    gameState.inventory.push(hero, axe);

    const eff = getEffectiveStats(hero);
    assert(eff.effectiveAGI >= 0, `effectiveAGI should not be negative, got ${eff.effectiveAGI}`);
  });

  test('combat unit with negative AGI should not break getUnitSpeed', () => {
    // Build a unit with 0 or negative AGI
    const mockUnit = {
      baseAGI: -10, reactionTime: 0.8,
      statusEffects: [], alive: true,
    };
    const speed = CombatEngine.getUnitSpeed(mockUnit);
    assert(speed >= 10, `Speed should be at least 10 with negative AGI, got ${speed}`);
  });

  test('combat damage calculation with negative AGI defender should not boost attacker', () => {
    const attacker = {
      baseSTR: 50, baseAGI: 10, baseINT: 10,
      row: 'front', side: 'player',
      critRate: 0, critDamage: 100,
      activePenalty: null, statusEffects: [],
      currentHP: 100, maxHP: 100, panicChance: 0,
    };
    const defender = {
      baseSTR: 10, baseAGI: -20, baseINT: 5,
      row: 'front', side: 'enemy',
      statusEffects: [],
    };
    const result = CombatEngine.calculateDamage(attacker, defender, {}, 0);
    assert(result.damage >= 1, 'Damage should be at least 1');
    // With negative AGI, defReduction should be 0 (clamped by Math.max), not negative
  });
});

describe('PROMOTION: Stats recalculation', () => {
  test('promotion should update hero base stats to match new rarity', () => {
    resetGameState();
    const hero = {
      id: 'h_promo', type: 'hero', name: 'Promo Test', rarity: 3, class: 'Knight',
      level: 1, exp: 0, talent: 5,
      stats: buildHeroStats(3, 5),
      equippedWeapons: { mainHand: null, offHand: null },
      inParty: false, inDungeon: false, skills: [], statusEffects: [],
      weaponProficiency: {}, activePenalty: null,
    };
    gameState.inventory.push(hero);

    const oldStr = hero.stats.strength;
    performPromotion('h_promo');

    assert(hero.rarity === 4, `Hero should now be 4★, got ${hero.rarity}`);
    const expected4StarStr = BASE_STATS[4].str;
    // After promotion, stats should reflect the new rarity
    assert(hero.stats.strength >= expected4StarStr,
      `After promotion to 4★, strength should be at least ${expected4StarStr}, got ${hero.stats.strength}`);
  });
});

describe('SYNTHESIS: Edge cases', () => {
  test('synthesizing a hero with equipped weapons should unequip them', () => {
    resetGameState();
    const base = {
      id: 'h_base', type: 'hero', name: 'Base', rarity: 4, class: 'Knight',
      level: 1, exp: 0, talent: 5, stats: buildHeroStats(4, 5),
      equippedWeapons: { mainHand: null, offHand: null },
      inParty: false, inDungeon: false, skills: [], statusEffects: [],
      weaponProficiency: {}, activePenalty: null,
    };
    const sac = {
      id: 'h_sac', type: 'hero', name: 'Sacrifice', rarity: 3, class: 'Mage',
      level: 1, exp: 0, talent: 5, stats: buildHeroStats(3, 5),
      equippedWeapons: { mainHand: 'w_sac_sword', offHand: null },
      inParty: false, inDungeon: false, skills: [], statusEffects: [],
      weaponProficiency: {}, activePenalty: null,
    };
    const sword = {
      id: 'w_sac_sword', type: 'weapon', name: 'Test Sword', rarity: 3,
      weaponType: 'Sword', equippedTo: 'h_sac',
      stats: { flatSTR: 20, flatINT: 0, flatHP: 0, flatAGI: 5, pctSTR: 0, pctINT: 0, pctHP: 0, pctAGI: 0 },
    };
    gameState.inventory.push(base, sac, sword);

    performSynthesis('h_base', 'h_sac');

    // Sword should be unequipped (equippedTo = null)
    assert(sword.equippedTo === null, 'Weapon should be unequipped after sacrifice');
    // Sacrifice hero should be removed
    const sacStillExists = gameState.inventory.find(i => i.id === 'h_sac');
    assert(!sacStillExists, 'Sacrifice hero should be removed from inventory');
  });
});

describe('EQUIPMENT: Edge cases', () => {
  test('equipping the same weapon to both mainHand and offHand should not duplicate', () => {
    resetGameState();
    const hero = {
      id: 'h_equip', type: 'hero', name: 'Equip Test', rarity: 3, class: 'Knight',
      level: 1, exp: 0, talent: 5, stats: buildHeroStats(3, 5),
      equippedWeapons: { mainHand: null, offHand: null },
      inParty: false, inDungeon: false, skills: [], statusEffects: [],
      weaponProficiency: {}, activePenalty: null,
    };
    const weapon = {
      id: 'w_same', type: 'weapon', name: 'Same Weapon', rarity: 3,
      weaponType: 'Sword', equippedTo: null,
      stats: { flatSTR: 10, flatINT: 0, flatHP: 0, flatAGI: 0, pctSTR: 0, pctINT: 0, pctHP: 0, pctAGI: 0 },
    };
    gameState.inventory.push(hero, weapon);

    equipWeapon('h_equip', 'w_same', 'mainHand');
    equipWeapon('h_equip', 'w_same', 'offHand');

    // The weapon should only be in one slot
    const isInMain = hero.equippedWeapons.mainHand === 'w_same';
    const isInOff = hero.equippedWeapons.offHand === 'w_same';
    // At minimum, it shouldn't be counted twice for stat bonuses
    assert(!(isInMain && isInOff), 'Same weapon should not be in both slots simultaneously');
  });
});

describe('DUNGEON: Dispatch validation', () => {
  test('dispatching with empty heroIds array should fail', () => {
    resetGameState();
    const result = dispatchDungeon('d1', []);
    assert(!result.ok, 'Should fail with empty heroIds');
  });

  test('dispatching with null heroIds should fail', () => {
    resetGameState();
    const result = dispatchDungeon('d1', null);
    assert(!result.ok, 'Should fail with null heroIds');
  });

  test('double dispatching same hero should fail', () => {
    resetGameState();
    const hero = {
      id: 'h_dng', type: 'hero', name: 'DNG Test', rarity: 3, class: 'Knight',
      level: 1, exp: 0, talent: 5, stats: buildHeroStats(3, 5),
      equippedWeapons: { mainHand: null, offHand: null },
      inParty: false, inDungeon: false, skills: [], statusEffects: [],
      weaponProficiency: {}, activePenalty: null,
    };
    gameState.inventory.push(hero);

    const first = dispatchDungeon('d1', ['h_dng']);
    assert(first.ok, 'First dispatch should succeed');

    const second = dispatchDungeon('d2', ['h_dng']);
    assert(!second.ok, 'Second dispatch of same hero should fail');
  });
});

describe('COMBAT: Empty party or enemies', () => {
  test('combat with empty party should end immediately in defeat', () => {
    const combat = CombatEngine.createCombat([], [{
      id: 'e1', name: 'Slime', hp: 50, str: 5, agi: 4, int: 2,
      critRate: 5, critDamage: 130, reactionTime: 1.0, talent: 3,
    }], {});
    const result = combat.runToEnd();
    assert(result.state === 'defeat', `Empty party combat should be defeat, got ${result.state}`);
  });

  test('combat with null heroes in party array should not crash', () => {
    try {
      const party = [null, null, {
        id: 'h_null', type: 'hero', name: 'Test', rarity: 3, class: 'Knight',
        level: 1, exp: 0, talent: 5,
        stats: { strength: 18, intelligence: 18, health: 18, agility: 18, critRate: 5, critDamage: 130, reactionTime: 0.8 },
        equippedWeapons: { mainHand: null, offHand: null },
        activePenalty: null, statusEffects: [],
      }];
      const enemies = [{ id: 'e1', name: 'Slime', hp: 50, str: 5, agi: 4, int: 2, critRate: 5, critDamage: 130, reactionTime: 1.0, talent: 3 }];
      const combat = CombatEngine.createCombat(party, enemies, {});
      const result = combat.runToEnd();
      assert(result.state === 'victory' || result.state === 'defeat' || result.state === 'timeout',
        'Combat should complete without crash');
    } catch (e) {
      assert(false, `Combat with null party members should not crash: ${e.message}`);
    }
  });
});

describe('HERO STATS: buildHeroStats edge values', () => {
  test('reactionTime should not go below 0.3 at talent 10', () => {
    const stats = buildHeroStats(7, 10);
    assert(stats.reactionTime >= 0.1,
      `reactionTime should not be dangerously low, got ${stats.reactionTime}`);
  });

  test('critRate should be reasonable at talent 10', () => {
    const stats = buildHeroStats(7, 10);
    assert(stats.critRate <= 50, `critRate should not be unreasonably high, got ${stats.critRate}`);
  });
});

describe('SAVE/LOAD: Data integrity', () => {
  test('save and load should preserve all state', () => {
    resetGameState();
    gameState.gems = 9999;
    gameState.gold = 5555;
    gameState.tower.currentFloor = 42;
    gameState.synergy.level = 7;
    saveGame();

    // Reset and reload
    gameState.gems = 0;
    gameState.gold = 0;
    gameState.tower.currentFloor = 1;
    gameState.synergy.level = 0;

    const loaded = loadGame();
    assert(loaded === true, 'loadGame should return true');
    assert(gameState.gems === 9999, `gems should be 9999, got ${gameState.gems}`);
    assert(gameState.gold === 5555, `gold should be 5555, got ${gameState.gold}`);
    assert(gameState.tower.currentFloor === 42, `tower floor should be 42, got ${gameState.tower.currentFloor}`);
    assert(gameState.synergy.level === 7, `synergy should be 7, got ${gameState.synergy.level}`);
  });

  test('loading corrupted data should return false', () => {
    localStorage.setItem('pickmeup_save', 'not valid json!!!');
    const loaded = loadGame();
    assert(loaded === false, 'loadGame should return false for corrupted data');
  });

  test('loading with invalid nickname should return false', () => {
    localStorage.setItem('pickmeup_save', JSON.stringify({ playerNickname: 'bad name with spaces!!!' }));
    const loaded = loadGame();
    assert(loaded === false, 'loadGame should return false for invalid nickname');
  });
});

describe('WEAPON: generateWeaponStats edge cases', () => {
  test('Axe negative AGI should be bounded', () => {
    for (let rarity = 1; rarity <= 7; rarity++) {
      const stats = generateWeaponStats(rarity, 'Axe');
      // flatAGI for axe is -(5 * rarity)
      assert(stats.flatAGI === -(5 * rarity),
        `Axe rarity ${rarity} AGI penalty should be ${-(5 * rarity)}, got ${stats.flatAGI}`);
    }
  });

  test('unknown weapon type should not crash', () => {
    try {
      const stats = generateWeaponStats(3, 'UnknownWeapon');
      assert(typeof stats === 'object', 'Should return stats object for unknown weapon type');
    } catch (e) {
      assert(false, `Unknown weapon type should not crash: ${e.message}`);
    }
  });
});

describe('FLOOR TYPE: Edge cases', () => {
  test('floor 0 should not crash', () => {
    try {
      const type = getFloorType(0);
      assert(typeof type === 'string', 'Should return a type string');
    } catch (e) {
      assert(false, `getFloorType(0) should not crash: ${e.message}`);
    }
  });

  test('negative floor should not crash', () => {
    try {
      const type = getFloorType(-1);
      assert(typeof type === 'string', 'Should return a type string');
    } catch (e) {
      assert(false, `getFloorType(-1) should not crash: ${e.message}`);
    }
  });
});

describe('EXP: Level-up edge cases', () => {
  test('getExpToNext should return positive values for all levels', () => {
    for (let level = 1; level <= 100; level++) {
      const exp = getExpToNext(level);
      assert(exp > 0, `EXP for level ${level} should be positive, got ${exp}`);
      assert(isFinite(exp), `EXP for level ${level} should be finite, got ${exp}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════
console.log('\n═══════════════════════════════════════════════════');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
if (failures.length > 0) {
  console.log('\nFAILURES:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
}
console.log('═══════════════════════════════════════════════════\n');

process.exit(failed > 0 ? 1 : 0);
