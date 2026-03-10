// ═══════════════════════════════════════════════════════════
// ENEMY DATA — Floor-scaled enemy generation
// ═══════════════════════════════════════════════════════════

(function () {

  // ── Enemy templates by tier ─────────────────────────────
  var ENEMY_TEMPLATES = {
    // TIER 1: Floors 1-10 (weak creatures)
    slime:       { name: 'Slime',        icon: '🟢', class: 'Beast',    tier: 1, baseHP: 50,  baseSTR: 6,  baseAGI: 4,  baseINT: 2  },
    rat:         { name: 'Giant Rat',    icon: '🐀', class: 'Beast',    tier: 1, baseHP: 40,  baseSTR: 8,  baseAGI: 10, baseINT: 1  },
    goblin:      { name: 'Goblin',       icon: '👺', class: 'Humanoid', tier: 1, baseHP: 60,  baseSTR: 10, baseAGI: 8,  baseINT: 3  },
    skeleton:    { name: 'Skeleton',     icon: '💀', class: 'Undead',   tier: 1, baseHP: 45,  baseSTR: 9,  baseAGI: 5,  baseINT: 2  },
    bat:         { name: 'Cave Bat',     icon: '🦇', class: 'Beast',    tier: 1, baseHP: 30,  baseSTR: 5,  baseAGI: 14, baseINT: 1  },

    // TIER 2: Floors 11-30 (moderate enemies)
    orc:         { name: 'Orc Warrior',  icon: '👹', class: 'Humanoid', tier: 2, baseHP: 120, baseSTR: 20, baseAGI: 10, baseINT: 5  },
    wolf:        { name: 'Dire Wolf',    icon: '🐺', class: 'Beast',    tier: 2, baseHP: 90,  baseSTR: 18, baseAGI: 22, baseINT: 4  },
    zombie:      { name: 'Zombie',       icon: '🧟', class: 'Undead',   tier: 2, baseHP: 150, baseSTR: 15, baseAGI: 5,  baseINT: 2  },
    mage:        { name: 'Dark Mage',    icon: '🧙', class: 'Humanoid', tier: 2, baseHP: 80,  baseSTR: 10, baseAGI: 12, baseINT: 25 },
    spider:      { name: 'Giant Spider', icon: '🕷', class: 'Beast',    tier: 2, baseHP: 100, baseSTR: 16, baseAGI: 18, baseINT: 3  },

    // TIER 3: Floors 31-60 (strong enemies)
    knight:      { name: 'Dark Knight',  icon: '⚔',  class: 'Humanoid', tier: 3, baseHP: 250, baseSTR: 35, baseAGI: 20, baseINT: 12 },
    golem:       { name: 'Stone Golem',  icon: '🗿', class: 'Construct',tier: 3, baseHP: 400, baseSTR: 40, baseAGI: 6,  baseINT: 5  },
    wraith:      { name: 'Wraith',       icon: '👻', class: 'Undead',   tier: 3, baseHP: 180, baseSTR: 28, baseAGI: 30, baseINT: 22 },
    ogre:        { name: 'Ogre',         icon: '🦍', class: 'Humanoid', tier: 3, baseHP: 350, baseSTR: 45, baseAGI: 8,  baseINT: 4  },
    harpy:       { name: 'Harpy',        icon: '🦅', class: 'Beast',    tier: 3, baseHP: 160, baseSTR: 22, baseAGI: 35, baseINT: 15 },

    // TIER 4: Floors 61-90 (powerful enemies)
    demon:       { name: 'Demon',        icon: '😈', class: 'Demon',    tier: 4, baseHP: 500, baseSTR: 55, baseAGI: 30, baseINT: 35 },
    dragon_kin:  { name: 'Dragonkin',    icon: '🐲', class: 'Dragon',   tier: 4, baseHP: 600, baseSTR: 65, baseAGI: 25, baseINT: 30 },
    lich:        { name: 'Lich',         icon: '☠',  class: 'Undead',   tier: 4, baseHP: 350, baseSTR: 30, baseAGI: 20, baseINT: 60 },
    titan:       { name: 'Titan Guard',  icon: '🗡',  class: 'Construct',tier: 4, baseHP: 700, baseSTR: 70, baseAGI: 12, baseINT: 10 },

    // TIER 5: Floors 91-100 (endgame elites)
    overlord:    { name: 'Overlord',     icon: '👑', class: 'Demon',    tier: 5, baseHP: 900,  baseSTR: 80,  baseAGI: 35, baseINT: 50 },
    elder_dragon:{ name: 'Elder Dragon', icon: '🐉', class: 'Dragon',   tier: 5, baseHP: 1200, baseSTR: 100, baseAGI: 40, baseINT: 60 },
    death_lord:  { name: 'Death Lord',   icon: '💀', class: 'Undead',   tier: 5, baseHP: 800,  baseSTR: 70,  baseAGI: 45, baseINT: 70 },
  };

  // ── Boss templates (every 10th floor) ─────────────────
  var BOSS_TEMPLATES = {
    10:  { name: 'Goblin King',       icon: '👺', class: 'Humanoid', baseHP: 400,  baseSTR: 30,  baseAGI: 15, baseINT: 10, rarity: 3 },
    20:  { name: 'Orc Warlord',       icon: '👹', class: 'Humanoid', baseHP: 700,  baseSTR: 50,  baseAGI: 20, baseINT: 15, rarity: 4 },
    30:  { name: 'Spider Queen',      icon: '🕷', class: 'Beast',    baseHP: 900,  baseSTR: 45,  baseAGI: 35, baseINT: 20, rarity: 4 },
    40:  { name: 'The Black Knight',  icon: '⚔',  class: 'Humanoid', baseHP: 1200, baseSTR: 65,  baseAGI: 30, baseINT: 25, rarity: 5 },
    50:  { name: 'Golem Colossus',    icon: '🗿', class: 'Construct',baseHP: 1800, baseSTR: 80,  baseAGI: 10, baseINT: 15, rarity: 5 },
    60:  { name: 'Demon General',     icon: '😈', class: 'Demon',    baseHP: 2000, baseSTR: 90,  baseAGI: 40, baseINT: 50, rarity: 6 },
    70:  { name: 'Shadow Dragon',     icon: '🐲', class: 'Dragon',   baseHP: 2500, baseSTR: 110, baseAGI: 45, baseINT: 55, rarity: 6 },
    80:  { name: 'Lich Emperor',      icon: '☠',  class: 'Undead',   baseHP: 2200, baseSTR: 80,  baseAGI: 35, baseINT: 100,rarity: 6 },
    90:  { name: 'Titan Sovereign',   icon: '🗡',  class: 'Construct',baseHP: 3000, baseSTR: 130, baseAGI: 50, baseINT: 40, rarity: 7 },
    100: { name: 'The Void King',     icon: '👑', class: 'Demon',    baseHP: 5000, baseSTR: 180, baseAGI: 60, baseINT: 80, rarity: 7 },
  };

  function getFloorScale(floorNum) {
    return 1 + (floorNum - 1) * 0.08;
  }

  function getTierForFloor(floorNum) {
    if (floorNum <= 10) return 1;
    if (floorNum <= 30) return 2;
    if (floorNum <= 60) return 3;
    if (floorNum <= 90) return 4;
    return 5;
  }

  function getTemplatesForTier(tier) {
    var templates = [];
    for (var key in ENEMY_TEMPLATES) {
      if (ENEMY_TEMPLATES[key].tier === tier) templates.push(ENEMY_TEMPLATES[key]);
    }
    if (tier > 1) {
      for (var key2 in ENEMY_TEMPLATES) {
        if (ENEMY_TEMPLATES[key2].tier === tier - 1) templates.push(ENEMY_TEMPLATES[key2]);
      }
    }
    return templates;
  }

  function getEnemiesForFloor(floorNum) {
    var type  = window.getFloorType(floorNum);
    var scale = getFloorScale(floorNum);
    var tier  = getTierForFloor(floorNum);
    var enemies = [];

    if (type === 'boss') {
      var bossTemplate = BOSS_TEMPLATES[floorNum] || BOSS_TEMPLATES[Math.floor(floorNum / 10) * 10] || BOSS_TEMPLATES[10];
      enemies.push(_createEnemy(bossTemplate, scale * 1.2, floorNum, true));
      var templates = getTemplatesForTier(tier);
      for (var i = 0; i < 2; i++) {
        var t = templates[Math.floor(Math.random() * templates.length)];
        enemies.push(_createEnemy(t, scale * 0.8, floorNum, false));
      }
    } else if (type === 'miniboss') {
      var templates2 = getTemplatesForTier(tier);
      var miniboss = templates2[Math.floor(Math.random() * templates2.length)];
      enemies.push(_createEnemy(miniboss, scale * 1.1, floorNum, true));
      var count = 2 + (Math.random() < 0.5 ? 1 : 0);
      for (var j = 0; j < count; j++) {
        var t2 = templates2[Math.floor(Math.random() * templates2.length)];
        enemies.push(_createEnemy(t2, scale * 0.7, floorNum, false));
      }
    } else {
      var templates3 = getTemplatesForTier(tier);
      var count2 = 3 + Math.floor(Math.random() * 3);
      for (var k = 0; k < count2; k++) {
        var t3 = templates3[Math.floor(Math.random() * templates3.length)];
        enemies.push(_createEnemy(t3, scale * (0.7 + Math.random() * 0.3), floorNum, false));
      }
    }
    return enemies;
  }

  function _createEnemy(template, scale, floorNum, isBoss) {
    var uid = 'enemy_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    var rarityBonus = isBoss ? 1.5 : 1;

    // Determine the LPC template key from the enemy name
    var lpcKey = null;
    for (var key in ENEMY_TEMPLATES) {
      if (ENEMY_TEMPLATES[key].name === template.name) { lpcKey = key; break; }
    }
    if (!lpcKey) {
      for (var bKey in BOSS_TEMPLATES) {
        if (BOSS_TEMPLATES[bKey].name === template.name) { lpcKey = template.name.toLowerCase().replace(/\s+/g, '_'); break; }
      }
    }

    var enemy = {
      id:            uid,
      name:          template.name,
      icon:          template.icon,
      class:         template.class,
      rarity:        template.rarity || Math.min(7, Math.ceil(floorNum / 15)),
      isBoss:        isBoss,
      hp:            Math.floor(template.baseHP  * scale * rarityBonus),
      str:           Math.floor(template.baseSTR * scale * rarityBonus),
      agi:           Math.floor(template.baseAGI * scale),
      int:           Math.floor((template.baseINT || 0) * scale),
      critRate:      isBoss ? 12 : 5 + Math.floor(floorNum / 20),
      critDamage:    isBoss ? 160 : 130 + Math.floor(floorNum / 10) * 3,
      reactionTime:  isBoss ? 0.8 : Math.max(0.4, 1.0 - floorNum * 0.005),
      talent:        isBoss ? 5 + Math.floor(floorNum / 25) : 2 + Math.floor(floorNum / 30),
      spriteId:      null,
      lpcKey:        lpcKey,
    };

    // Fire async sprite generation (non-blocking)
    if (lpcKey && typeof SpriteGen !== 'undefined') {
      SpriteGen.generateEnemySprite(lpcKey).then(function (data) {
        enemy.spriteId = data.spriteId;
      }).catch(function () { /* no sprite server */ });
    }

    return enemy;
  }

  function getFloorEnemyPreview(floorNum) {
    var type = window.getFloorType(floorNum);
    if (type === 'boss') {
      var boss = BOSS_TEMPLATES[floorNum] || BOSS_TEMPLATES[Math.floor(floorNum / 10) * 10] || BOSS_TEMPLATES[10];
      return { type: 'boss', boss: boss.icon + ' ' + boss.name, count: '1 Boss + 2 Guards', danger: 'HIGH' };
    }
    if (type === 'miniboss') {
      return { type: 'miniboss', boss: null, count: '1 Elite + 2-3 Enemies', danger: 'MODERATE' };
    }
    return { type: 'normal', boss: null, count: '3-5 Enemies', danger: 'LOW' };
  }

  window.ENEMY_TEMPLATES      = ENEMY_TEMPLATES;
  window.BOSS_TEMPLATES       = BOSS_TEMPLATES;
  window.getEnemiesForFloor   = getEnemiesForFloor;
  window.getFloorEnemyPreview = getFloorEnemyPreview;

})();
