// ═══════════════════════════════════════════════════════════
// STATUS EFFECTS SYSTEM
// ═══════════════════════════════════════════════════════════
// hero.statusEffects[] — runtime array of active effects on a hero.
// Each effect: { id, name, icon, level, label, appliedAt, duration }

(function () {

  const STATUS_EFFECT_DEFS = {
    fear: {
      id: 'fear',
      name: 'Fear',
      icon: '😨',
      description: 'Hero is overwhelmed with terror. All combat attributes reduced.',
      levels: [
        { level: 1, label: 'Trembling',  atkMod: -0.30, defMod: -0.30, spdMod: -0.20 },
        { level: 2, label: 'Panicking',  atkMod: -0.50, defMod: -0.50, spdMod: -0.40 },
        { level: 3, label: 'Paralyzed',  atkMod: -0.80, defMod: -0.80, spdMod: -0.80 },
      ],
      removedBy: ['fear_prevention_potion'],
      maxDuration: null, // permanent until removed
    },
    poison: {
      id: 'poison',
      name: 'Poison',
      icon: '☠',
      description: 'Hero takes damage over time.',
      levels: [
        { level: 1, label: 'Mild',   dotPct: 0.02 },
        { level: 2, label: 'Severe', dotPct: 0.05 },
      ],
      removedBy: ['antidote'],
      maxDuration: 5 * 60 * 1000,
    },
    burn: {
      id: 'burn',
      name: 'Burn',
      icon: '🔥',
      description: 'Hero suffers burn damage over time.',
      levels: [
        { level: 1, label: 'Singed', dotPct: 0.03 },
        { level: 2, label: 'Ablaze', dotPct: 0.07 },
      ],
      removedBy: ['burn_salve'],
      maxDuration: 3 * 60 * 1000,
    },
    bless: {
      id: 'bless',
      name: 'Blessing',
      icon: '✨',
      description: 'Hero receives a divine blessing. All attributes increased.',
      levels: [
        { level: 1, label: 'Minor Blessing', atkMod: 0.10, defMod: 0.10, spdMod: 0.10 },
        { level: 2, label: 'Major Blessing', atkMod: 0.25, defMod: 0.25, spdMod: 0.25 },
      ],
      removedBy: [],
      maxDuration: 10 * 60 * 1000,
    },
  };

  /**
   * Apply a status effect to a hero.
   * If the hero already has this effect, it upgrades the level.
   */
  function applyStatusEffect(hero, effectId, level) {
    if (!hero) return false;
    if (!Array.isArray(hero.statusEffects)) hero.statusEffects = [];
    level = level || 1;

    const def = STATUS_EFFECT_DEFS[effectId];
    if (!def) { console.warn('[StatusFX] Unknown effect:', effectId); return false; }

    const tierIdx = Math.min(level, def.levels.length) - 1;
    const tier = def.levels[tierIdx];

    // Check if already has this effect → upgrade
    const existing = hero.statusEffects.find(function (e) { return e.id === effectId; });
    if (existing) {
      existing.level     = tier.level;
      existing.label     = tier.label;
      existing.appliedAt = Date.now();
      return true;
    }

    hero.statusEffects.push({
      id:        effectId,
      name:      def.name,
      icon:      def.icon,
      level:     tier.level,
      label:     tier.label,
      appliedAt: Date.now(),
      duration:  def.maxDuration,
    });
    return true;
  }

  /** Remove a specific status effect from a hero. */
  function removeStatusEffect(hero, effectId) {
    if (!hero || !Array.isArray(hero.statusEffects)) return false;
    var idx = hero.statusEffects.findIndex(function (e) { return e.id === effectId; });
    if (idx === -1) return false;
    hero.statusEffects.splice(idx, 1);
    return true;
  }

  /** Check if a hero has a specific status effect. */
  function hasStatusEffect(hero, effectId) {
    if (!hero || !Array.isArray(hero.statusEffects)) return false;
    return hero.statusEffects.some(function (e) { return e.id === effectId; });
  }

  /** Get all active status effects for a hero. */
  function getActiveEffects(hero) {
    if (!hero || !Array.isArray(hero.statusEffects)) return [];
    return hero.statusEffects;
  }

  /**
   * Get combined stat modifiers from all active effects.
   * Returns { atkMod, defMod, spdMod, dotPct } — all additive.
   */
  function getEffectModifiers(hero) {
    var mods = { atkMod: 0, defMod: 0, spdMod: 0, dotPct: 0 };
    if (!hero || !Array.isArray(hero.statusEffects)) return mods;

    hero.statusEffects.forEach(function (effect) {
      var def = STATUS_EFFECT_DEFS[effect.id];
      if (!def) return;
      var tier = def.levels.find(function (l) { return l.level === effect.level; }) || def.levels[0];
      if (tier.atkMod) mods.atkMod += tier.atkMod;
      if (tier.defMod) mods.defMod += tier.defMod;
      if (tier.spdMod) mods.spdMod += tier.spdMod;
      if (tier.dotPct) mods.dotPct += tier.dotPct;
    });
    return mods;
  }

  /** Remove all status effects from a hero. */
  function clearAllEffects(hero) {
    if (!hero) return;
    hero.statusEffects = [];
  }

  /** Tick expired effects (call periodically). Removes effects past their duration. */
  function tickEffects(hero) {
    if (!hero || !Array.isArray(hero.statusEffects)) return;
    var now = Date.now();
    hero.statusEffects = hero.statusEffects.filter(function (e) {
      if (!e.duration) return true; // permanent
      return (now - e.appliedAt) < e.duration;
    });
  }

  /** Check if a given item can remove a specific effect. */
  function canItemRemoveEffect(itemId, effectId) {
    var def = STATUS_EFFECT_DEFS[effectId];
    if (!def) return false;
    return def.removedBy.includes(itemId);
  }

  // Exports
  window.STATUS_EFFECT_DEFS   = STATUS_EFFECT_DEFS;
  window.applyStatusEffect    = applyStatusEffect;
  window.removeStatusEffect   = removeStatusEffect;
  window.hasStatusEffect      = hasStatusEffect;
  window.getActiveEffects     = getActiveEffects;
  window.getEffectModifiers   = getEffectModifiers;
  window.clearAllEffects      = clearAllEffects;
  window.tickEffects          = tickEffects;
  window.canItemRemoveEffect  = canItemRemoveEffect;

})();
