// ═══════════════════════════════════════════════════════════
// DAILY QUEST KEYS
// ═══════════════════════════════════════════════════════════
// Defined here (before gameState) so loadGame() can iterate them
// before dailyQuests.js loads. dailyQuests.js reads this same array.
// ── Daily reset pattern (3rd use — see checkShopReset, checkDungeonResets).
// If a 4th reset appears, extract to checkDailyReset(stateKey, resetFn) in helpers.js.
window.QUEST_KEYS = [
  'towerChallenge',  // complete a new tower floor
  'summon',          // commit pendingResults to inventory
  'towerRewards',    // claim daily reward on a cleared floor
  'expedition',      // dispatch a dungeon run
  'shopPurchase',    // purchaseItem() success
  'talkToHero',      // talkToHero() first talk of day
];

// ═══════════════════════════════════════════════════════════
// GAME STATE
// ═══════════════════════════════════════════════════════════
window.gameState = {
  playerNickname:   '',
  tutorialAccepted: false,
  tutorialStep:     0,       // 0 = not started, -1 = completed
  gems:             0,
  gold:             0,
  currentFloor:     1,
  inventory:        [],
  party:            [],   // ordered array of up to 6 hero IDs (slot 1–6)
  banners: {
    standard: { pityCount: 0 },
    limited:  { pityCount: 0 },
    weapon:   { pityCount: 0 },
  },
  tower: {
    currentFloor:       1,
    clearedFloors:      [],
    floorRevisitClaimed: {}, // reserved — future per-floor granularity (currently unused; lastRevisitReset is active)
    lastRevisitReset:   null,
  },
  materials: [],
  dungeons: {
    activeRuns:     [],
    completedRuns:  [],
    dailyBonus: {
      dungeonId:  null,
      lastReset:  null,
    },
  },
  synthesisHistory: [],
  shop: {
    dailyStock:       [],
    lastStockReset:   null,
    purchaseHistory:  [],
  },
  mailbox: [],
  items:   [],
  firstPullDone: false,  synergy: { level: 0 },
  afkRewards: {
    lastCollectTime: null,   // timestamp of last AFK reward collection / login
  },
  dailyQuests: {
    lastReset:          null,   // "YYYY-MM-DD" ISO string, null = never reset
    progress:           {},     // { [questKey]: 0|1 } — populated by migrateInventory
    claimed:            {},     // { [questKey]: bool } — populated by migrateInventory
    allCompleteClaimed: false,  // all-6 bonus claimed today
  },
};

// ─── SAVE / LOAD ───────────────────────────────────────────
function saveGame() {
  localStorage.setItem('pickmeup_save', JSON.stringify({
    playerNickname:   gameState.playerNickname,
    tutorialAccepted: gameState.tutorialAccepted,
    tutorialStep:     gameState.tutorialStep,
    gems:             gameState.gems,
    gold:             gameState.gold,
    currentFloor:     gameState.currentFloor,
    inventory:        gameState.inventory,
    party:            gameState.party,
    banners:          gameState.banners,
    tower:            gameState.tower,
    materials:        gameState.materials,
    dungeons:         gameState.dungeons,
    synthesisHistory: gameState.synthesisHistory,
    shop:             gameState.shop,
    mailbox:          gameState.mailbox,
    items:            gameState.items,
    firstPullDone:    gameState.firstPullDone,
    synergy:          gameState.synergy,
    afkRewards:       gameState.afkRewards,
    dailyQuests:      gameState.dailyQuests,
  }));
}

function loadGame() {
  const raw = localStorage.getItem('pickmeup_save');
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    if (d.playerNickname && /^[A-Za-z0-9]{2,6}$/.test(d.playerNickname)) {
      gameState.playerNickname   = d.playerNickname;
      gameState.tutorialAccepted = !!d.tutorialAccepted;
      gameState.tutorialStep     = typeof d.tutorialStep === 'number' ? d.tutorialStep : 0;
      gameState.gems             = typeof d.gems === 'number' ? d.gems : 0;
      gameState.gold             = typeof d.gold === 'number' ? d.gold : 0;
      gameState.currentFloor     = d.currentFloor || 1;
      gameState.inventory        = Array.isArray(d.inventory) ? d.inventory : [];
      gameState.party            = Array.isArray(d.party)     ? d.party     : [];
      if (d.banners) {
        ['standard', 'limited', 'weapon'].forEach(k => {
          if (d.banners[k]) gameState.banners[k] = { pityCount: d.banners[k].pityCount || 0 };
        });
      }
      if (d.tower) {
        gameState.tower.currentFloor       = d.tower.currentFloor       || 1;
        gameState.tower.clearedFloors      = Array.isArray(d.tower.clearedFloors) ? d.tower.clearedFloors : [];
        gameState.tower.floorRevisitClaimed = d.tower.floorRevisitClaimed || {};
        gameState.tower.lastRevisitReset   = d.tower.lastRevisitReset   || null;
      }
      gameState.materials = Array.isArray(d.materials) ? d.materials : [];
      if (d.dungeons) {
        gameState.dungeons.activeRuns    = Array.isArray(d.dungeons.activeRuns)    ? d.dungeons.activeRuns    : [];
        gameState.dungeons.completedRuns = Array.isArray(d.dungeons.completedRuns) ? d.dungeons.completedRuns : [];
        if (d.dungeons.dailyBonus) {
          gameState.dungeons.dailyBonus.dungeonId = d.dungeons.dailyBonus.dungeonId || null;
          gameState.dungeons.dailyBonus.lastReset = d.dungeons.dailyBonus.lastReset || null;
        }
      }
      gameState.synthesisHistory = Array.isArray(d.synthesisHistory) ? d.synthesisHistory : [];
      gameState.mailbox = Array.isArray(d.mailbox) ? d.mailbox : [];
      gameState.items   = Array.isArray(d.items)   ? d.items   : [];
      gameState.firstPullDone = !!d.firstPullDone || !!d.firstTenPullDone; // backwards compat
      if (d.synergy) {
        gameState.synergy = { level: typeof d.synergy.level === 'number' ? d.synergy.level : 0 };
      }
      if (d.afkRewards) {
        gameState.afkRewards.lastCollectTime = d.afkRewards.lastCollectTime || null;
      }
      if (d.shop) {
        gameState.shop.dailyStock      = Array.isArray(d.shop.dailyStock)      ? d.shop.dailyStock      : [];
        gameState.shop.lastStockReset  = d.shop.lastStockReset  || null;
        gameState.shop.purchaseHistory = Array.isArray(d.shop.purchaseHistory) ? d.shop.purchaseHistory : [];
      }
      if (d.dailyQuests) {
        gameState.dailyQuests.lastReset          = d.dailyQuests.lastReset          || null;
        gameState.dailyQuests.allCompleteClaimed = !!d.dailyQuests.allCompleteClaimed;
        if (d.dailyQuests.progress) {
          QUEST_KEYS.forEach(k => {
            gameState.dailyQuests.progress[k] =
              typeof d.dailyQuests.progress[k] === 'number' ? d.dailyQuests.progress[k] : 0;
          });
        }
        if (d.dailyQuests.claimed) {
          QUEST_KEYS.forEach(k => {
            gameState.dailyQuests.claimed[k] = !!d.dailyQuests.claimed[k];
          });
        }
      }
      migrateInventory();
      checkDungeonResets();
      checkShopReset();
      return true;
    }
  } catch (e) { console.error('[loadGame]', e); }
  return false;
}

// ═══════════════════════════════════════════════════════════
// WEAPON CONSTANTS
// ═══════════════════════════════════════════════════════════
window.WEAPON_ICONS = {
  Sword:  '⚔',  Staff:  '🪄', Bow:    '🏹',
  Dagger: '🗡', Shield: '🛡', Spear:  '🔱',
  Axe:    '🪓', Tome:   '📖',  // fallback for legacy pulls
};

const _ALL_WEAPON_TYPES = ['Sword','Staff','Bow','Dagger','Shield','Spear','Axe'];

// Flat stat ranges [min, max] by rarity
const _FLAT_RANGES = {
  1:[3,8], 2:[8,18], 3:[18,35], 4:[35,60],
  5:[60,100], 6:[100,160], 7:[160,250],
};

// Pct bonus ranges [minPct, maxPct] in whole-percent numbers (3 → 3% → 0.03 stored)
const _PCT_RANGES = {
  1:[0,0], 2:[0,0], 3:[1,3], 4:[1,3], 5:[3,6], 6:[5,9], 7:[8,14],
};

function _randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}
function _rollFlat(rarity, mult) {
  if (!mult) return 0;
  const [mn, mx] = _FLAT_RANGES[rarity] || _FLAT_RANGES[1];
  return Math.max(0, Math.round(_randInt(mn, mx) * mult));
}
function _rollPct(rarity) {
  const [mn, mx] = _PCT_RANGES[rarity] || _PCT_RANGES[1];
  if (mn === 0) return 0;
  const pctWhole = mn + Math.random() * (mx - mn);
  return Math.round(pctWhole * 100) / 100 / 100; // e.g. 3.5 → 0.035
}

function generateWeaponStats(rarity, weaponType) {
  const s = { flatSTR:0, flatINT:0, flatHP:0, flatAGI:0,
              pctSTR:0,  pctINT:0,  pctHP:0,  pctAGI:0 };
  const p = () => _rollPct(rarity);
  switch (weaponType) {
    case 'Sword':
      s.flatSTR = _rollFlat(rarity, 1.0);
      s.flatAGI = _rollFlat(rarity, 0.3);
      s.pctSTR  = p(); break;
    case 'Staff':
      s.flatINT = _rollFlat(rarity, 1.0);
      s.pctINT  = p(); break;
    case 'Bow':
      s.flatSTR = _rollFlat(rarity, 0.6);
      s.flatAGI = _rollFlat(rarity, 1.0);
      s.pctAGI  = p(); break;
    case 'Dagger':
      s.flatAGI = _rollFlat(rarity, 1.0);
      s.pctAGI  = p();
      s.pctSTR  = p(); break;
    case 'Shield':
      s.flatHP  = _rollFlat(rarity, 1.0);
      s.pctHP   = p(); break;
    case 'Spear':
      s.flatSTR = _rollFlat(rarity, 0.6);
      s.flatAGI = _rollFlat(rarity, 0.6);
      s.pctSTR  = p(); break;
    case 'Axe':
      s.flatSTR = _rollFlat(rarity, 1.3);
      s.pctSTR  = p();
      s.flatAGI = -(5 * rarity); break;
    default: // Tome or unknown legacy type
      s.flatINT = _rollFlat(rarity, 0.8);
      s.pctINT  = p(); break;
  }
  return s;
}

// ─── PROFICIENCY HELPERS ───────────────────────────────────
function makeProfSkill(weaponType) {
  return {
    id:         `prof_${weaponType}_beginner`,
    name:       `Beginner ${weaponType} Proficiency`,
    type:       'proficiency',
    weaponType,
    tier:       'Beginner',
    effect:     `Reduces combat penalty when using ${weaponType} without familiarity.`,
  };
}

function _initProficiency() {
  const obj = {};
  _ALL_WEAPON_TYPES.forEach(wt => { obj[wt] = { battles: 0, dungeonRuns: 0, tier: null }; });
  return obj;
}

function applyInnateProf(hero) {
  if (!hero.weaponProficiency || !Array.isArray(hero.skills)) return;
  const r = hero.rarity;
  let slots = 0;
  const roll = Math.random();
  if      (r === 7) { slots = 1 + (Math.random() < 0.40 ? 1 : 0); }
  else if (r === 6) { slots = 1 + (Math.random() < 0.15 ? 1 : 0); }
  else if (r === 5) { slots = roll < 0.70 ? 1 : 0; }
  else if (r === 4) { slots = roll < 0.50 ? 1 : 0; }
  else if (r === 3) { slots = roll < 0.30 ? 1 : 0; }
  if (slots === 0) return;

  const shuffled = [..._ALL_WEAPON_TYPES].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(slots, shuffled.length); i++) {
    const wt = shuffled[i];
    if (!hero.weaponProficiency[wt]) continue;
    hero.weaponProficiency[wt].tier = 'Beginner';
    const skillId = `prof_${wt}_beginner`;
    if (!hero.skills.some(s => (typeof s === 'object' && s !== null ? s.id : null) === skillId)) {
      hero.skills.push(makeProfSkill(wt));
    }
  }
}

// ─── ACTIVE PENALTY ───────────────────────────────────────
function updateActivePenalty(hero) {
  if (!hero.equippedWeapons || !hero.weaponProficiency) { hero.activePenalty = null; return; }
  for (const slot of ['mainHand', 'offHand']) {
    const wId = hero.equippedWeapons[slot];
    if (!wId) continue;
    const w = gameState.inventory.find(i => i.id === wId && i.type === 'weapon');
    if (!w) continue;
    const prof = hero.weaponProficiency[w.weaponType];
    if (prof && prof.tier === null) {
      hero.activePenalty = { weaponType: w.weaponType, penaltyPct: 0.35 };
      return;
    }
  }
  hero.activePenalty = null;
}

// ═══════════════════════════════════════════════════════════
// MIGRATE INVENTORY
// ═══════════════════════════════════════════════════════════
function migrateInventory() {
  let changed = false;

  if (!Array.isArray(gameState.party))   { gameState.party   = []; changed = true; }
  if (!Array.isArray(gameState.mailbox)) { gameState.mailbox = []; changed = true; }
  if (!Array.isArray(gameState.items))   { gameState.items   = []; changed = true; }
  if (gameState.firstPullDone === undefined) { gameState.firstPullDone = false; changed = true; }

  // ── AFK Rewards migration ──
  if (!gameState.afkRewards) {
    gameState.afkRewards = { lastCollectTime: null };
    changed = true;
  }
  if (typeof gameState.afkRewards.lastCollectTime === 'undefined') {
    gameState.afkRewards.lastCollectTime = null;
    changed = true;
  }

  // ── Tower migration ──
  if (!gameState.tower) {
    gameState.tower = { currentFloor: 1, clearedFloors: [], floorRevisitClaimed: {}, lastRevisitReset: null }; // reserved — future per-floor granularity (currently unused; lastRevisitReset is active)
    changed = true;
  }
  if (!Array.isArray(gameState.materials)) { gameState.materials = []; changed = true; }
  // Sync legacy currentFloor → tower.currentFloor
  if (gameState.currentFloor > gameState.tower.currentFloor) {
    gameState.tower.currentFloor = gameState.currentFloor; changed = true;
  }

  // ── Dungeons migration ──
  if (!gameState.dungeons) {
    gameState.dungeons = { activeRuns: [], completedRuns: [], dailyBonus: { dungeonId: null, lastReset: null } };
    changed = true;
  }
  if (!Array.isArray(gameState.dungeons.activeRuns))    { gameState.dungeons.activeRuns    = []; changed = true; }
  if (!Array.isArray(gameState.dungeons.completedRuns)) { gameState.dungeons.completedRuns = []; changed = true; }
  if (!gameState.dungeons.dailyBonus) { gameState.dungeons.dailyBonus = { dungeonId: null, lastReset: null }; changed = true; }
  // ── Synthesis migration ──
  if (!Array.isArray(gameState.synthesisHistory)) { gameState.synthesisHistory = []; changed = true; }

  // ── Shop migration ──
  if (!gameState.shop) {
    gameState.shop = { dailyStock: [], lastStockReset: null, purchaseHistory: [] };
    changed = true;
  }
  if (!Array.isArray(gameState.shop.dailyStock))      { gameState.shop.dailyStock      = []; changed = true; }
  if (!Array.isArray(gameState.shop.purchaseHistory)) { gameState.shop.purchaseHistory = []; changed = true; }

  // ── Daily Quests migration ──
  if (!gameState.dailyQuests) {
    gameState.dailyQuests = { lastReset: null, progress: {}, claimed: {}, allCompleteClaimed: false };
    changed = true;
  }
  QUEST_KEYS.forEach(k => {
    if (typeof gameState.dailyQuests.progress[k] !== 'number') {
      gameState.dailyQuests.progress[k] = 0; changed = true;
    }
    if (typeof gameState.dailyQuests.claimed[k] !== 'boolean') {
      gameState.dailyQuests.claimed[k] = false; changed = true;
    }
  });
  if (typeof gameState.dailyQuests.allCompleteClaimed !== 'boolean') {
    gameState.dailyQuests.allCompleteClaimed = false; changed = true;
  }

  // Auto-complete any finished active runs
  gameState.dungeons.activeRuns.forEach(run => {
    if (run.status === 'active' && (run.startTime + run.duration) <= Date.now()) {
      run.status = 'completed'; changed = true;
    }
  });

  gameState.inventory.forEach(item => {
    // ── HERO migrations ──
    if (item.type === 'hero') {
      if (typeof item.talent === 'undefined') {
        item.talent = generateTalent(item.rarity); changed = true;
      }
      if (!item.stats) {
        item.stats = buildHeroStats(item.rarity, item.talent); changed = true;
      }
      // Old single-slot equippedWeapon → new dual-slot equippedWeapons
      if (typeof item.equippedWeapons === 'undefined') {
        item.equippedWeapons = { mainHand: null, offHand: null }; changed = true;
      }
      if ('equippedWeapon' in item) { delete item.equippedWeapon; changed = true; }

      if (typeof item.inParty === 'undefined')   { item.inParty   = false; changed = true; }
      if (typeof item.inDungeon === 'undefined') { item.inDungeon = false; changed = true; }
      if (!Array.isArray(item.skills))             { item.skills    = [];    changed = true; }

      if (typeof item.weaponProficiency === 'undefined') {
        item.weaponProficiency = _initProficiency();
        applyInnateProf(item);
        changed = true;
      }
      if (typeof item.activePenalty === 'undefined') {
        item.activePenalty = null;
        updateActivePenalty(item);
        changed = true;
      }
      if (!Array.isArray(item.statusEffects)) {
        item.statusEffects = [];
        changed = true;
      }

      // ── Affinity migration ──
      if (typeof item.affinity === 'undefined' || item.affinity === null) {
        item.affinity = 0; changed = true;
      }
      if (typeof item.talkDate === 'undefined') {
        item.talkDate = null; changed = true;
      }
      if (!Array.isArray(item.affinityMilestonesGranted)) {
        item.affinityMilestonesGranted = []; changed = true;
      }
    }

    // ── WEAPON migrations ──
    if (item.type === 'weapon') {
      if (typeof item.equippedTo === 'undefined') { item.equippedTo = null; changed = true; }
      if (!item.stats) {
        item.stats = generateWeaponStats(item.rarity, item.weaponType || 'Sword'); changed = true;
      }
    }
  });

  // Remove stale party entries
  const heroIds    = new Set(gameState.inventory.filter(i => i.type === 'hero').map(i => i.id));
  const cleanParty = gameState.party.filter(id => heroIds.has(id));
  if (cleanParty.length !== gameState.party.length) { gameState.party = cleanParty; changed = true; }

  // Sync inParty flags
  const partySet = new Set(gameState.party);
  gameState.inventory.forEach(item => {
    if (item.type !== 'hero') return;
    const should = partySet.has(item.id);
    if (!!item.inParty !== should) { item.inParty = should; changed = true; }
  });

  if (changed) saveGame();
}

// ═══════════════════════════════════════════════════════════
// PARTY FUNCTIONS
// ═══════════════════════════════════════════════════════════
function addToParty(heroId) {
  if (gameState.party.length >= 6)      return { ok: false, reason: 'full' };
  if (gameState.party.includes(heroId)) return { ok: false, reason: 'duplicate' };
  gameState.party.push(heroId);
  const hero = gameState.inventory.find(h => h.id === heroId);
  if (hero) hero.inParty = true;
  saveGame();
  return { ok: true };
}

function removeFromParty(heroId) {
  gameState.party = gameState.party.filter(id => id !== heroId);
  const hero = gameState.inventory.find(h => h.id === heroId);
  if (hero) hero.inParty = false;
  saveGame();
}

function swapPartySlot(slotIndex, heroId) {
  const oldId = gameState.party[slotIndex];
  if (oldId) {
    const oldHero = gameState.inventory.find(h => h.id === oldId);
    if (oldHero) oldHero.inParty = false;
  }

  // Remove heroId from any existing slot to prevent duplicates
  const existingSlot = gameState.party.indexOf(heroId);
  if (existingSlot !== -1 && existingSlot !== slotIndex) {
    // Swap: put the old occupant of target slot into the hero's previous slot
    if (oldId) {
      gameState.party[existingSlot] = oldId;
      const oldHero = gameState.inventory.find(h => h.id === oldId);
      if (oldHero) oldHero.inParty = true;
    } else {
      gameState.party[existingSlot] = undefined;
    }
  }

  gameState.party[slotIndex] = heroId;
  const newHero = gameState.inventory.find(h => h.id === heroId);
  if (newHero) newHero.inParty = true;

  // Clean up undefined slots at the end
  while (gameState.party.length > 0 && gameState.party[gameState.party.length - 1] === undefined) {
    gameState.party.pop();
  }

  saveGame();
}

function getPartyHeroes() {
  const slots = Array(6).fill(null);
  gameState.party.forEach((id, i) => {
    if (i < 6) slots[i] = gameState.inventory.find(h => h.id === id) || null;
  });
  return slots;
}

// ═══════════════════════════════════════════════════════════
// EQUIPMENT FUNCTIONS
// ═══════════════════════════════════════════════════════════

function equipWeapon(heroId, weaponId, slot) {
  if (slot !== 'mainHand' && slot !== 'offHand') return { ok: false };
  const hero   = gameState.inventory.find(i => i.id === heroId   && i.type === 'hero');
  const weapon = gameState.inventory.find(i => i.id === weaponId && i.type === 'weapon');
  if (!hero || !weapon) return { ok: false };

  // Unequip whatever is currently in the slot
  const existingId = hero.equippedWeapons[slot];
  if (existingId) {
    const existing = gameState.inventory.find(i => i.id === existingId);
    if (existing) existing.equippedTo = null;
  }

  // If weapon is already in the other slot on the same hero, clear it
  const otherSlot = slot === 'mainHand' ? 'offHand' : 'mainHand';
  if (hero.equippedWeapons[otherSlot] === weaponId) {
    hero.equippedWeapons[otherSlot] = null;
  }

  // If weapon is already on a different hero, remove it from there
  if (weapon.equippedTo && weapon.equippedTo !== heroId) {
    const prevHero = gameState.inventory.find(i => i.id === weapon.equippedTo && i.type === 'hero');
    if (prevHero && prevHero.equippedWeapons) {
      if (prevHero.equippedWeapons.mainHand === weaponId) prevHero.equippedWeapons.mainHand = null;
      if (prevHero.equippedWeapons.offHand  === weaponId) prevHero.equippedWeapons.offHand  = null;
      updateActivePenalty(prevHero);
    }
  }

  weapon.equippedTo            = heroId;
  hero.equippedWeapons[slot]   = weaponId;
  updateActivePenalty(hero);
  saveGame();
  return { ok: true };
}

function unequipWeapon(heroId, slot) {
  const hero = gameState.inventory.find(i => i.id === heroId && i.type === 'hero');
  if (!hero || !hero.equippedWeapons) return;
  const wId = hero.equippedWeapons[slot];
  if (wId) {
    const w = gameState.inventory.find(i => i.id === wId);
    if (w) w.equippedTo = null;
  }
  hero.equippedWeapons[slot] = null;
  updateActivePenalty(hero);
  saveGame();
}

const HP_MULTIPLIER = 10;  // health stat × 10 = combat HP

function getEffectiveStats(hero) {
  let eSTR = (hero.stats || {}).strength     || 0;
  let eINT = (hero.stats || {}).intelligence || 0;
  let eHP  = ((hero.stats || {}).health      || 0) * HP_MULTIPLIER;
  let eAGI = (hero.stats || {}).agility      || 0;

  if (hero.equippedWeapons) {
    for (const slot of ['mainHand', 'offHand']) {
      const wId = hero.equippedWeapons[slot];
      if (!wId) continue;
      const w = gameState.inventory.find(i => i.id === wId && i.type === 'weapon');
      if (!w || !w.stats) continue;
      eSTR += w.stats.flatSTR + Math.floor((hero.stats.strength     || 0) * (w.stats.pctSTR || 0));
      eINT += w.stats.flatINT + Math.floor((hero.stats.intelligence || 0) * (w.stats.pctINT || 0));
      eHP  += w.stats.flatHP  + Math.floor((hero.stats.health       || 0) * (w.stats.pctHP  || 0));
      eAGI += w.stats.flatAGI + Math.floor((hero.stats.agility      || 0) * (w.stats.pctAGI || 0));
    }
  }

  if (hero.activePenalty) {
    const mult = 1 - hero.activePenalty.penaltyPct;
    eSTR = Math.floor(eSTR * mult);
    eINT = Math.floor(eINT * mult);
    eHP  = Math.floor(eHP  * mult);
    eAGI = Math.floor(eAGI * mult);
  }

  // Clamp stats to 0 minimum (Axe weapons can cause negative AGI)
  eSTR = Math.max(0, eSTR);
  eINT = Math.max(0, eINT);
  eHP  = Math.max(1, eHP);   // HP must be at least 1
  eAGI = Math.max(0, eAGI);

  return { effectiveSTR: eSTR, effectiveINT: eINT, effectiveHP: eHP, effectiveAGI: eAGI };
}

function incrementWeaponFamiliarity(heroId, weaponType, source) {
  const hero = gameState.inventory.find(i => i.id === heroId && i.type === 'hero');
  if (!hero || !hero.weaponProficiency) return;
  const prof = hero.weaponProficiency[weaponType];
  if (!prof) return;

  if (source === 'battle')  prof.battles++;
  if (source === 'dungeon') prof.dungeonRuns++;

  if (prof.tier === null && (prof.battles >= 10 || prof.dungeonRuns >= 3)) {
    prof.tier = 'Beginner';
    const skillId = `prof_${weaponType}_beginner`;
    if (!hero.skills.some(s => (typeof s === 'object' && s !== null ? s.id : null) === skillId)) {
      hero.skills.push(makeProfSkill(weaponType));
    }
    updateActivePenalty(hero);
    if (typeof showToast === 'function') {
      showToast(`[ ${hero.name} learned Beginner ${weaponType} Proficiency! ]`, '#FFD700');
    }
  }
  saveGame();
}

window.getEffectiveStats           = getEffectiveStats;
window.incrementWeaponFamiliarity  = incrementWeaponFamiliarity;

// ═══════════════════════════════════════════════════════════
// TOWER HELPERS
// ═══════════════════════════════════════════════════════════

function getFloorType(floorNum) {
  if (floorNum % 10 === 0) return 'boss';
  if (floorNum % 5  === 0) return 'miniboss';
  return 'normal';
}

function isFloorCleared(floorNum) {
  return gameState.tower.clearedFloors.includes(floorNum);
}

function isFloorUnlocked(floorNum) {
  return floorNum <= gameState.tower.currentFloor;
}

function recordFloorClear(floorNum) {
  if (!gameState.tower.clearedFloors.includes(floorNum)) {
    gameState.tower.clearedFloors.push(floorNum);
  }
  if (floorNum === gameState.tower.currentFloor && gameState.tower.currentFloor < 100) {
    gameState.tower.currentFloor++;
  }
  gameState.currentFloor = gameState.tower.currentFloor;
  saveGame();
}

function getExpToNext(level) {
  return Math.floor(10 * Math.pow(1.4, level - 1));
}

window.getFloorType      = getFloorType;
window.isFloorCleared    = isFloorCleared;
window.isFloorUnlocked   = isFloorUnlocked;
window.recordFloorClear  = recordFloorClear;
window.getExpToNext      = getExpToNext;

// ═══════════════════════════════════════════════════════════
// DUNGEON HELPERS
// ═══════════════════════════════════════════════════════════

function dispatchDungeon(dungeonId, heroIds) {
  if (!heroIds || heroIds.length === 0) return { ok: false, reason: 'No heroes selected' };

  // Validate none are already on a run
  const activeHeroIds = new Set();
  gameState.dungeons.activeRuns.forEach(run => {
    if (run.status !== 'collected') run.heroIds.forEach(id => activeHeroIds.add(id));
  });
  for (const hId of heroIds) {
    if (activeHeroIds.has(hId)) {
      const h = gameState.inventory.find(i => i.id === hId);
      return { ok: false, reason: `${h ? h.name : 'Hero'} is already on an expedition` };
    }
  }

  const run = {
    id:        `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    dungeonId: dungeonId,
    heroIds:   heroIds,
    startTime: Date.now(),
    duration:  5 * 60 * 1000,   // placeholder: 5 minutes
    status:    'active',
    rewards:   null,
  };
  gameState.dungeons.activeRuns.push(run);

  // Mark heroes as dispatched
  heroIds.forEach(hId => {
    const hero = gameState.inventory.find(i => i.id === hId && i.type === 'hero');
    if (hero) hero.inDungeon = true;
  });

  saveGame();
  if (typeof progressDailyQuest === 'function') progressDailyQuest('expedition');
  return { ok: true };
}

function collectDungeon(runId) {
  const idx = gameState.dungeons.activeRuns.findIndex(r => r.id === runId);
  if (idx === -1) return { ok: false, reason: 'Run not found' };
  const run = gameState.dungeons.activeRuns[idx];

  if (!isRunComplete(run)) return { ok: false, reason: 'Not ready yet' };

  run.status = 'collected';
  // Move to completed
  gameState.dungeons.completedRuns.push(run);
  gameState.dungeons.activeRuns.splice(idx, 1);

  // Free heroes
  run.heroIds.forEach(hId => {
    const hero = gameState.inventory.find(i => i.id === hId && i.type === 'hero');
    if (hero) hero.inDungeon = false;
  });

  // Apply rewards (stub — just log for now)
  console.log('[Dungeon] Rewards collected for run', runId, '— reward system TBD');

  saveGame();
  return { ok: true };
}

function getRunTimeRemaining(run) {
  return Math.max(0, (run.startTime + run.duration) - Date.now());
}

function isRunComplete(run) {
  return getRunTimeRemaining(run) === 0;
}

function checkDungeonResets() {
  if (!gameState.dungeons || !gameState.dungeons.dailyBonus) return;
  const today = new Date().toISOString().slice(0, 10);
  if (gameState.dungeons.dailyBonus.lastReset !== today) {
    gameState.dungeons.dailyBonus.dungeonId = null;
    gameState.dungeons.dailyBonus.lastReset = today;
    // Daily bonus dungeon ID assigned later when templates are defined
  }
}

window.dispatchDungeon     = dispatchDungeon;
window.collectDungeon      = collectDungeon;
window.getRunTimeRemaining = getRunTimeRemaining;
window.isRunComplete       = isRunComplete;
window.checkDungeonResets  = checkDungeonResets;

// ═══════════════════════════════════════════════════════════
// SYNTHESIS HELPERS
// ═══════════════════════════════════════════════════════════

function canSynthesize(baseHeroId, sacrificeHeroId) {
  if (!baseHeroId || !sacrificeHeroId) return { ok: false, reason: 'Both base and sacrifice heroes are required.' };
  if (baseHeroId === sacrificeHeroId)  return { ok: false, reason: 'Base and sacrifice must be different heroes.' };
  const base = gameState.inventory.find(i => i.id === baseHeroId && i.type === 'hero');
  const sac  = gameState.inventory.find(i => i.id === sacrificeHeroId && i.type === 'hero');
  if (!base) return { ok: false, reason: 'Base hero not found.' };
  if (!sac)  return { ok: false, reason: 'Sacrifice hero not found.' };
  if (base.inParty)   return { ok: false, reason: 'Base hero is in the party.' };
  if (base.inDungeon) return { ok: false, reason: 'Base hero is on an expedition.' };
  if (sac.inParty)    return { ok: false, reason: 'Sacrifice hero is in the party.' };
  if (sac.inDungeon)  return { ok: false, reason: 'Sacrifice hero is on an expedition.' };
  return { ok: true };
}

function performSynthesis(baseHeroId, sacrificeHeroId) {
  const check = canSynthesize(baseHeroId, sacrificeHeroId);
  if (!check.ok) return check;

  const base = gameState.inventory.find(i => i.id === baseHeroId && i.type === 'hero');
  const sac  = gameState.inventory.find(i => i.id === sacrificeHeroId && i.type === 'hero');

  // Snapshot sacrifice hero before deletion
  const sacrificeSnapshot = JSON.parse(JSON.stringify(sac));

  // Unequip any weapons the sacrifice hero has
  if (sac.equippedWeapons) {
    if (sac.equippedWeapons.mainHand) unequipWeapon(sac.id, 'mainHand');
    if (sac.equippedWeapons.offHand)  unequipWeapon(sac.id, 'offHand');
  }

  // Build synthesis result
  const result = {
    id:                    'synth_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
    timestamp:             Date.now(),
    baseHeroId:            baseHeroId,
    baseHeroName:          base.name,
    sacrificeHeroId:       sacrificeHeroId,
    sacrificeHeroSnapshot: sacrificeSnapshot,
    statBoosts:            {},           // stub — no formula yet
    skillInherited:        null,         // stub — always null for now
    talentInfluence:       0,            // stub — populated later
  };

  // Stub: log stat boosts (no formula yet)
  console.log('[Synthesis] Stat boosts: TBD', { base: base.name, sacrifice: sacrificeSnapshot.name });

  // Stub: check skill inheritance (always null for now)
  console.log('[Synthesis] Skill inheritance: TBD');

  // Stub: talent influence (log only)
  console.log('[Synthesis] Talent influence: TBD', { baseTalent: base.talent, sacTalent: sacrificeSnapshot.talent });

  // Push to history
  gameState.synthesisHistory.push(result);

  // PERMANENTLY delete sacrifice hero from inventory
  const sacIdx = gameState.inventory.findIndex(i => i.id === sacrificeHeroId);
  if (sacIdx !== -1) gameState.inventory.splice(sacIdx, 1);

  saveGame();
  return { ok: true, result };
}

window.canSynthesize    = canSynthesize;
window.performSynthesis = performSynthesis;

// ═══════════════════════════════════════════════════════════
// PROMOTION HELPERS
// ═══════════════════════════════════════════════════════════

function canPromote(heroId) {
  if (!heroId) return { ok: false, reason: 'No hero specified.' };
  const hero = gameState.inventory.find(i => i.id === heroId && i.type === 'hero');
  if (!hero)          return { ok: false, reason: 'Hero not found.' };
  if (hero.inParty)   return { ok: false, reason: 'Hero is in the party.' };
  if (hero.inDungeon) return { ok: false, reason: 'Hero is on an expedition.' };
  if (hero.rarity >= 7) return { ok: false, reason: 'Hero is already at maximum rank (7★).' };
  // Materials check: stub — always pass for now
  console.log('[Promotion] Materials check: stub — always true');
  return { ok: true };
}

function performPromotion(heroId) {
  const check = canPromote(heroId);
  if (!check.ok) return check;

  const hero = gameState.inventory.find(i => i.id === heroId && i.type === 'hero');

  const oldRarity = hero.rarity;
  hero.rarity++;

  // Recalculate base stats for new rarity (preserve level-up gains)
  if (typeof BASE_STATS !== 'undefined' && BASE_STATS[hero.rarity] && BASE_STATS[oldRarity]) {
    const oldBase = BASE_STATS[oldRarity];
    const newBase = BASE_STATS[hero.rarity];
    hero.stats.strength     += (newBase.str - oldBase.str);
    hero.stats.intelligence += (newBase.int - oldBase.int);
    hero.stats.health       += (newBase.hp  - oldBase.hp);
    hero.stats.agility      += (newBase.agi - oldBase.agi);
  }

  // Stub: unlock memory
  console.log(`[Promotion] Memory unlock for ${hero.name}: TBD (${oldRarity}★ → ${hero.rarity}★)`);

  // Stub: unlock skills
  console.log(`[Promotion] Skill unlock for ${hero.name}: TBD`);

  // Stub: consume materials (no cost yet)
  console.log('[Promotion] Material consumption: stub — no cost');

  saveGame();
  return { ok: true };
}

window.canPromote       = canPromote;
window.performPromotion = performPromotion;

// ═══════════════════════════════════════════════════════════
// SHOP HELPERS
// ═══════════════════════════════════════════════════════════

function canPurchase(itemId) {
  if (!gameState.shop || !Array.isArray(gameState.shop.dailyStock)) return { ok: false, reason: 'Shop not initialized.' };
  const item = gameState.shop.dailyStock.find(i => i.id === itemId);
  if (!item) return { ok: false, reason: 'Item not found in shop.' };
  if (item.purchased) return { ok: false, reason: 'Item already purchased.' };
  if (gameState.gems < item.cost) return { ok: false, reason: 'Not enough Gems.' };
  return { ok: true };
}

function purchaseItem(itemId) {
  const check = canPurchase(itemId);
  if (!check.ok) return check;

  const item = gameState.shop.dailyStock.find(i => i.id === itemId);

  // Deduct gems (|| 0 guard prevents NaN if gems somehow became non-numeric)
  gameState.gems = (gameState.gems || 0) - item.cost;

  // Mark purchased
  item.purchased = true;

  // Log to history
  gameState.shop.purchaseHistory.push({
    itemId:    item.id,
    itemName:  item.name,
    type:      item.type,
    cost:      item.cost,
    timestamp: Date.now(),
  });

  // Stub: apply item effect
  console.log('[Shop] Item effect applied (stub):', item.name, item.type);

  saveGame();
  if (typeof progressDailyQuest === 'function') progressDailyQuest('shopPurchase');
  return { ok: true };
}

function checkShopReset() {
  if (!gameState.shop) return;
  const today = new Date().toISOString().slice(0, 10);
  if (gameState.shop.lastStockReset !== today) {
    gameState.shop.dailyStock     = [];   // cleared — repopulated later when items exist
    gameState.shop.lastStockReset = today;
    console.log('[Shop] Daily stock reset for', today);
  }
}

window.purchaseItem  = purchaseItem;
window.checkShopReset = checkShopReset;
