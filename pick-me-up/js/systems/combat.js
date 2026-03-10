// ═══════════════════════════════════════════════════════════
// COMBAT ENGINE — Real-time auto-battle system
// ═══════════════════════════════════════════════════════════
// Tick-based combat: each unit accumulates time based on
// their speed/reactionTime. When their timer fills, they act.
// Inspired by AFK Journey's auto-battle flow.

(function () {

  // ─── CONSTANTS ────────────────────────────────────────────
  const TICK_INTERVAL   = 100;    // ms per combat tick
  const ACTION_THRESHOLD = 1000;  // accumulated time needed to act
  const MAX_COMBAT_TICKS = 600;   // 60s hard timeout
  const ENERGY_PER_HIT   = 10;   // energy gained when attacking
  const ENERGY_PER_TAKEN  = 5;   // energy gained when taking damage
  const ENERGY_FOR_ULTIMATE = 100;

  // ─── FORMATION BONUSES ──────────────────────────────────
  // Front row: +15% DEF, -5% ATK  |  Back row: +10% ATK, -10% DEF
  const FORMATION_MODS = {
    front: { atkMod: -0.05, defMod: 0.15 },
    back:  { atkMod:  0.10, defMod: -0.10 },
  };

  // Synergy bonuses scale with synergy level (0-10)
  // synergy grows via random events triggered by the master
  function getSynergyBonus(synergyLevel) {
    return {
      atkMod: synergyLevel * 0.02,   // +2% ATK per synergy level
      defMod: synergyLevel * 0.015,  // +1.5% DEF per synergy level
      spdMod: synergyLevel * 0.01,   // +1% speed per synergy level
    };
  }

  // ─── COMBAT UNIT FACTORY ──────────────────────────────────
  // Wraps a hero or enemy into a combat-ready unit
  function makeHeroCombatUnit(hero, slotIndex) {
    const eff = getEffectiveStats(hero);
    const row = slotIndex < 3 ? 'front' : 'back';

    // Talent-derived stats
    const talent = hero.talent || 0;
    const resistChance = talent > 4 ? (talent - 4) * 0.10 : 0;   // up to 60% at talent 10
    const panicChance  = talent < 2 ? (2 - talent) * 0.25 : 0;   // up to 50% at talent 0

    return {
      id:            hero.id,
      name:          hero.name,
      isHero:        true,
      side:          'player',
      row:           row,
      slotIndex:     slotIndex,
      rarity:        hero.rarity,
      class:         hero.class,
      talent:        talent,

      // Core stats
      maxHP:         eff.effectiveHP,
      currentHP:     eff.effectiveHP,
      baseSTR:       eff.effectiveSTR,
      baseINT:       eff.effectiveINT,
      baseAGI:       eff.effectiveAGI,

      // Combat derived
      critRate:      hero.stats.critRate,
      critDamage:    hero.stats.critDamage,
      reactionTime:  hero.stats.reactionTime,

      // Energy (for ultimates)
      energy:        0,
      maxEnergy:     ENERGY_FOR_ULTIMATE,

      // Talent mechanics
      resistChance:  resistChance,
      panicChance:   panicChance,

      // Status
      activePenalty: hero.activePenalty,
      statusEffects: JSON.parse(JSON.stringify(hero.statusEffects || [])),

      // Turn accumulator
      accumulatedTime: 0,

      // Alive?
      alive:         true,

      // Reference back to hero data
      _heroRef:      hero,
    };
  }

  function makeEnemyCombatUnit(enemy, slotIndex) {
    const row = slotIndex < 3 ? 'front' : 'back';
    return {
      id:            enemy.id,
      name:          enemy.name,
      isHero:        false,
      side:          'enemy',
      row:           row,
      slotIndex:     slotIndex,
      rarity:        enemy.rarity || 1,
      class:         enemy.class  || 'Monster',
      talent:        enemy.talent || 3,

      maxHP:         enemy.hp,
      currentHP:     enemy.hp,
      baseSTR:       enemy.str,
      baseINT:       enemy.int || 0,
      baseAGI:       enemy.agi,

      critRate:      enemy.critRate     || 5,
      critDamage:    enemy.critDamage   || 130,
      reactionTime:  enemy.reactionTime || 1.0,

      energy:        0,
      maxEnergy:     ENERGY_FOR_ULTIMATE,

      resistChance:  0,
      panicChance:   0,

      activePenalty: null,
      statusEffects: [],

      accumulatedTime: 0,
      alive:         true,

      _enemyRef:     enemy,
    };
  }

  // ─── DAMAGE CALCULATION ───────────────────────────────────
  function calculateDamage(attacker, defender, formationMods, synergyLevel) {
    const synergy = getSynergyBonus(synergyLevel || 0);

    // Base damage: STR * random(0.8 - 1.2)
    let damage = attacker.baseSTR * (0.8 + Math.random() * 0.4);

    // Crit check
    let isCrit = false;
    if (Math.random() * 100 < attacker.critRate) {
      damage *= (attacker.critDamage / 100);
      isCrit = true;
    }

    // Active penalty (unfamiliar weapon)
    if (attacker.activePenalty) {
      damage *= (1 - attacker.activePenalty.penaltyPct);
    }

    // Formation modifier
    const fMod = FORMATION_MODS[attacker.row] || { atkMod: 0 };
    damage *= (1 + fMod.atkMod);

    // Synergy bonus (only for player side)
    if (attacker.side === 'player') {
      damage *= (1 + synergy.atkMod);
    }

    // Status effect modifiers on attacker
    const atkMods = _getUnitEffectMods(attacker);
    damage *= (1 + atkMods.atkMod);

    // Talent panic check: low talent units may lose damage under pressure
    if (attacker.currentHP < attacker.maxHP * 0.3 && attacker.panicChance > 0) {
      if (Math.random() < attacker.panicChance) {
        damage *= 0.5;  // panic halves damage
        return { damage: Math.max(1, Math.floor(damage)), isCrit, isPanic: true, isResisted: false };
      }
    }

    // Defender's defense from formation
    const dMod = FORMATION_MODS[defender.row] || { defMod: 0 };
    const defMods = _getUnitEffectMods(defender);
    const defReduction = Math.max(0, 0.02 * defender.baseAGI * (1 + dMod.defMod + defMods.defMod));
    damage = Math.max(1, damage - defReduction);

    return {
      damage:     Math.max(1, Math.floor(damage)),
      isCrit:     isCrit,
      isPanic:    false,
      isResisted: false,
    };
  }

  // Get combined stat mods from a combat unit's status effects
  function _getUnitEffectMods(unit) {
    var mods = { atkMod: 0, defMod: 0, spdMod: 0, dotPct: 0 };
    if (!unit.statusEffects || unit.statusEffects.length === 0) return mods;

    unit.statusEffects.forEach(function (effect) {
      var def = window.STATUS_EFFECT_DEFS ? window.STATUS_EFFECT_DEFS[effect.id] : null;
      if (!def) return;
      var tier = def.levels.find(function (l) { return l.level === effect.level; }) || def.levels[0];
      if (tier.atkMod) mods.atkMod += tier.atkMod;
      if (tier.defMod) mods.defMod += tier.defMod;
      if (tier.spdMod) mods.spdMod += tier.spdMod;
      if (tier.dotPct) mods.dotPct += tier.dotPct;
    });
    return mods;
  }

  // ─── TALENT: RESIST NEGATIVE STATUS ─────────────────────
  function tryApplyStatusToUnit(unit, effectId, level) {
    // High talent units can resist negative effects
    if (unit.resistChance > 0) {
      var def = window.STATUS_EFFECT_DEFS ? window.STATUS_EFFECT_DEFS[effectId] : null;
      if (def) {
        // Check if it's a negative effect (has negative atkMod or dotPct)
        var tier = def.levels[Math.min(level, def.levels.length) - 1];
        var isNegative = (tier.atkMod && tier.atkMod < 0) || (tier.dotPct && tier.dotPct > 0);
        if (isNegative && Math.random() < unit.resistChance) {
          return { applied: false, resisted: true };
        }
      }
    }

    // Apply the effect
    if (!Array.isArray(unit.statusEffects)) unit.statusEffects = [];
    var existing = unit.statusEffects.find(function (e) { return e.id === effectId; });
    var defData = window.STATUS_EFFECT_DEFS ? window.STATUS_EFFECT_DEFS[effectId] : null;
    if (!defData) return { applied: false, resisted: false };

    var tierIdx = Math.min(level || 1, defData.levels.length) - 1;
    var tierData = defData.levels[tierIdx];

    if (existing) {
      existing.level = tierData.level;
      existing.label = tierData.label;
      existing.appliedAt = Date.now();
    } else {
      unit.statusEffects.push({
        id: effectId, name: defData.name, icon: defData.icon,
        level: tierData.level, label: tierData.label,
        appliedAt: Date.now(), duration: defData.maxDuration,
      });
    }
    return { applied: true, resisted: false };
  }

  // ─── DOT (Damage Over Time) ─────────────────────────────
  function applyDOT(unit) {
    var mods = _getUnitEffectMods(unit);
    if (mods.dotPct <= 0) return 0;
    var dotDamage = Math.max(1, Math.floor(unit.maxHP * mods.dotPct));
    unit.currentHP = Math.max(0, unit.currentHP - dotDamage);
    if (unit.currentHP <= 0) unit.alive = false;
    return dotDamage;
  }

  // ─── TARGET SELECTION ─────────────────────────────────────
  // Prefers front-row targets, falls back to back row
  function selectTarget(attacker, allUnits) {
    var enemies = allUnits.filter(function (u) {
      return u.alive && u.side !== attacker.side;
    });
    if (enemies.length === 0) return null;

    // Prefer front row
    var frontEnemies = enemies.filter(function (u) { return u.row === 'front'; });
    if (frontEnemies.length > 0) {
      return frontEnemies[Math.floor(Math.random() * frontEnemies.length)];
    }
    return enemies[Math.floor(Math.random() * enemies.length)];
  }

  // ─── SPEED CALCULATION ──────────────────────────────────
  function getUnitSpeed(unit) {
    // Lower reactionTime = faster. Convert to speed points per tick.
    // reactionTime is in seconds (0.3 - 1.0 range)
    // Speed = (1 / reactionTime) * base + AGI contribution
    var baseSpeed = (1 / Math.max(0.1, unit.reactionTime)) * 100;
    var agiBonus  = unit.baseAGI * 0.5;
    var mods      = _getUnitEffectMods(unit);
    var totalSpeed = (baseSpeed + agiBonus) * (1 + mods.spdMod);
    return Math.max(10, Math.floor(totalSpeed));
  }

  // ─── COMBAT INSTANCE ─────────────────────────────────────
  // Creates a self-contained combat that can be ticked
  function createCombat(partyHeroes, enemies, options) {
    options = options || {};
    var synergyLevel = options.synergyLevel || 0;

    // Build combat units
    var playerUnits = [];
    partyHeroes.forEach(function (hero, idx) {
      if (hero) playerUnits.push(makeHeroCombatUnit(hero, idx));
    });

    var enemyUnits = [];
    enemies.forEach(function (enemy, idx) {
      enemyUnits.push(makeEnemyCombatUnit(enemy, idx));
    });

    var allUnits = playerUnits.concat(enemyUnits);
    var combatLog = [];
    var tickCount = 0;
    var state = 'running';  // running | victory | defeat | timeout

    function logEvent(evt) {
      evt.tick = tickCount;
      combatLog.push(evt);
    }

    // Perform one tick of combat
    function tick() {
      if (state !== 'running') return state;
      tickCount++;

      if (tickCount > MAX_COMBAT_TICKS) {
        state = 'timeout';
        logEvent({ type: 'timeout', message: 'Combat timed out!' });
        return state;
      }

      // Apply DOT effects
      allUnits.forEach(function (unit) {
        if (!unit.alive) return;
        var dotDmg = applyDOT(unit);
        if (dotDmg > 0) {
          logEvent({
            type: 'dot', unitId: unit.id, unitName: unit.name,
            side: unit.side, damage: dotDmg,
            message: unit.name + ' takes ' + dotDmg + ' DoT damage!',
          });
        }
      });

      // Check victory/defeat after DOT
      if (_checkCombatEnd()) return state;

      // Accumulate time for all living units
      allUnits.forEach(function (unit) {
        if (!unit.alive) return;
        unit.accumulatedTime += getUnitSpeed(unit);
      });

      // Find units ready to act (sorted by accumulated time, descending)
      var readyUnits = allUnits.filter(function (u) {
        return u.alive && u.accumulatedTime >= ACTION_THRESHOLD;
      }).sort(function (a, b) { return b.accumulatedTime - a.accumulatedTime; });

      // Each ready unit performs an action
      readyUnits.forEach(function (unit) {
        if (!unit.alive) return;
        if (state !== 'running') return;

        unit.accumulatedTime -= ACTION_THRESHOLD;

        // Select target
        var target = selectTarget(unit, allUnits);
        if (!target) return;

        // Calculate damage
        var result = calculateDamage(unit, target, FORMATION_MODS, synergyLevel);

        // Apply damage
        target.currentHP = Math.max(0, target.currentHP - result.damage);

        // Energy gains
        unit.energy = Math.min(unit.maxEnergy, unit.energy + ENERGY_PER_HIT);
        target.energy = Math.min(target.maxEnergy, target.energy + ENERGY_PER_TAKEN);

        // Log the attack
        var msg = unit.name + ' attacks ' + target.name + ' for ' + result.damage + ' damage';
        if (result.isCrit)  msg += ' (CRIT!)';
        if (result.isPanic) msg += ' (PANIC!)';

        logEvent({
          type:       'attack',
          attackerId: unit.id,
          attackerName: unit.name,
          attackerSide: unit.side,
          defenderId: target.id,
          defenderName: target.name,
          defenderSide: target.side,
          damage:     result.damage,
          isCrit:     result.isCrit,
          isPanic:    result.isPanic,
          targetHP:   target.currentHP,
          targetMaxHP: target.maxHP,
          message:    msg,
        });

        // Check if target died
        if (target.currentHP <= 0) {
          target.alive = false;
          logEvent({
            type: 'death', unitId: target.id, unitName: target.name,
            side: target.side,
            message: target.name + ' has been defeated!',
          });
        }

        // Talent panic: low talent enemies might get feared
        if (unit.isHero && unit.talent >= 7 && target.alive && target.currentHP < target.maxHP * 0.2) {
          if (Math.random() < 0.15) {
            var fearResult = tryApplyStatusToUnit(target, 'fear', 1);
            if (fearResult.applied) {
              logEvent({
                type: 'status', unitId: target.id, unitName: target.name,
                effect: 'fear', side: target.side,
                message: target.name + ' is overwhelmed with fear!',
              });
            }
          }
        }

        _checkCombatEnd();
      });

      return state;
    }

    function _checkCombatEnd() {
      var playersAlive = playerUnits.some(function (u) { return u.alive; });
      var enemiesAlive = enemyUnits.some(function (u) { return u.alive; });

      if (!enemiesAlive) {
        state = 'victory';
        logEvent({ type: 'result', result: 'victory', message: 'Victory!' });
        return true;
      }
      if (!playersAlive) {
        state = 'defeat';
        logEvent({ type: 'result', result: 'defeat', message: 'Defeat...' });
        return true;
      }
      return false;
    }

    // Run combat to completion (for instant resolution)
    function runToEnd() {
      while (state === 'running') { tick(); }
      return { state: state, log: combatLog, ticks: tickCount };
    }

    return {
      playerUnits:  playerUnits,
      enemyUnits:   enemyUnits,
      allUnits:     allUnits,
      combatLog:    combatLog,
      synergyLevel: synergyLevel,

      getState:     function () { return state; },
      getTick:      function () { return tickCount; },
      tick:         tick,
      runToEnd:     runToEnd,
    };
  }

  // ─── COMBAT REWARDS ─────────────────────────────────────
  function calculateRewards(floorNum, combatResult) {
    var rewards = { gems: 0, gold: 0, exp: 0 };
    if (combatResult !== 'victory') return rewards;

    var type = getFloorType(floorNum);
    rewards.gems = type === 'boss' ? 300 : type === 'miniboss' ? 150 : 100;
    rewards.gold = Math.floor(50 + floorNum * 10);
    rewards.exp  = Math.floor(20 + floorNum * 5);

    return rewards;
  }

  // ─── FORMATION EVENTS (Master-triggered) ────────────────
  // Random dialog events that grow synergy
  var FORMATION_EVENTS = [
    {
      id: 'campfire_stories',
      title: 'Campfire Stories',
      description: 'Your heroes gather around a campfire. Do you encourage them to share their stories?',
      choices: [
        { text: '[ Share Stories ]',     synergyGain: 1, response: 'The party grows closer through shared tales. (+1 Synergy)' },
        { text: '[ Rest in Silence ]',   synergyGain: 0, response: 'Everyone rests quietly. No change.' },
      ],
    },
    {
      id: 'training_together',
      title: 'Training Session',
      description: 'Two of your heroes are arguing about tactics. How do you resolve it?',
      choices: [
        { text: '[ Mediate Calmly ]',    synergyGain: 2, response: 'Through discussion, they find common ground! (+2 Synergy)' },
        { text: '[ Let Them Fight ]',    synergyGain: -1, response: 'The argument escalates... (-1 Synergy)' },
        { text: '[ Ignore It ]',         synergyGain: 0, response: 'The tension fades on its own.' },
      ],
    },
    {
      id: 'shared_meal',
      title: 'Shared Meal',
      description: 'Your party finds fresh ingredients. Who should cook?',
      choices: [
        { text: '[ Cook Together ]',     synergyGain: 2, response: 'Working together in the kitchen builds trust! (+2 Synergy)' },
        { text: '[ Assign the Best ]',   synergyGain: 1, response: 'A delicious meal lifts spirits. (+1 Synergy)' },
      ],
    },
    {
      id: 'ambush_drill',
      title: 'Ambush Drill',
      description: 'You spot an opportunity for a surprise practice drill. Run it?',
      choices: [
        { text: '[ Run the Drill ]',     synergyGain: 2, response: 'The team coordinates beautifully! (+2 Synergy)' },
        { text: '[ Skip It ]',           synergyGain: 0, response: 'You decide to save energy.' },
      ],
    },
    {
      id: 'moral_dilemma',
      title: 'A Moral Dilemma',
      description: 'You find an injured enemy soldier. Your heroes look to you for guidance.',
      choices: [
        { text: '[ Show Mercy ]',        synergyGain: 2, response: 'Your compassion inspires the team. (+2 Synergy)' },
        { text: '[ Leave Them ]',        synergyGain: 0, response: 'You move on. Mixed feelings remain.' },
        { text: '[ Interrogate ]',       synergyGain: -1, response: 'Some heroes are uneasy... (-1 Synergy)' },
      ],
    },
    {
      id: 'weather_challenge',
      title: 'Sudden Storm',
      description: 'A violent storm strikes! How does the party handle it?',
      choices: [
        { text: '[ Build Shelter Together ]', synergyGain: 3, response: 'Teamwork at its finest! (+3 Synergy)' },
        { text: '[ Each For Themselves ]',    synergyGain: -2, response: 'Trust erodes when it matters most. (-2 Synergy)' },
      ],
    },
  ];

  function getRandomFormationEvent() {
    return FORMATION_EVENTS[Math.floor(Math.random() * FORMATION_EVENTS.length)];
  }

  // ─── EXPORTS ──────────────────────────────────────────────
  window.CombatEngine = {
    createCombat:           createCombat,
    calculateRewards:       calculateRewards,
    makeHeroCombatUnit:     makeHeroCombatUnit,
    makeEnemyCombatUnit:    makeEnemyCombatUnit,
    calculateDamage:        calculateDamage,
    getUnitSpeed:           getUnitSpeed,
    tryApplyStatusToUnit:   tryApplyStatusToUnit,
    getSynergyBonus:        getSynergyBonus,
    getRandomFormationEvent: getRandomFormationEvent,
    FORMATION_EVENTS:       FORMATION_EVENTS,
    TICK_INTERVAL:          TICK_INTERVAL,
    ENERGY_FOR_ULTIMATE:    ENERGY_FOR_ULTIMATE,
  };

})();
