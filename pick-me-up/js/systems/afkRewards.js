// ═══════════════════════════════════════════════════════════
// AFK IDLE REWARDS SYSTEM
// ═══════════════════════════════════════════════════════════
// Calculates and grants rewards based on offline time.
// Rewards scale with tower progression and party power.

window.AfkRewards = (function () {

  // ── CONFIGURATION ─────────────────────────────────────────
  const MIN_AFK_MINUTES   = 1;        // minimum offline time to show popup
  const MAX_AFK_HOURS     = 24;       // cap for reward accumulation
  const MAX_AFK_MS        = MAX_AFK_HOURS * 60 * 60 * 1000;

  // Base rates (per minute)
  const BASE_GOLD_PER_MIN = 5;
  const BASE_EXP_PER_MIN  = 2;

  // Tower floor scaling: each floor adds a % bonus
  const TOWER_GOLD_SCALE  = 0.08;     // +8% per cleared floor
  const TOWER_EXP_SCALE   = 0.05;     // +5% per cleared floor

  // Party power multiplier: total party stats / 100 as bonus %
  const PARTY_POWER_DIV   = 200;

  // ── CALCULATE REWARDS ─────────────────────────────────────
  function calculateRewards(elapsedMs) {
    const minutes = Math.min(elapsedMs, MAX_AFK_MS) / 60000;
    if (minutes < MIN_AFK_MINUTES) return null;

    // Tower bonus
    const towerFloor = (gameState.tower && gameState.tower.currentFloor) || 1;
    const towerGoldMult = 1 + (towerFloor - 1) * TOWER_GOLD_SCALE;
    const towerExpMult  = 1 + (towerFloor - 1) * TOWER_EXP_SCALE;

    // Party power bonus
    let partyPower = 0;
    if (typeof getPartyHeroes === 'function') {
      const heroes = getPartyHeroes().filter(Boolean);
      heroes.forEach(function (h) {
        if (h.stats) {
          partyPower += (h.stats.strength || 0) + (h.stats.intelligence || 0)
                      + (h.stats.health || 0) + (h.stats.agility || 0);
        }
      });
    }
    const partyMult = 1 + partyPower / PARTY_POWER_DIV;

    const gold = Math.floor(BASE_GOLD_PER_MIN * minutes * towerGoldMult * partyMult);
    const exp  = Math.floor(BASE_EXP_PER_MIN  * minutes * towerExpMult  * partyMult);

    return {
      gold:        gold,
      exp:         exp,
      minutes:     Math.floor(minutes),
      towerFloor:  towerFloor,
      partyPower:  Math.floor(partyPower),
    };
  }

  // ── APPLY REWARDS ─────────────────────────────────────────
  function applyRewards(rewards) {
    if (!rewards) return;
    gameState.gold += rewards.gold;

    // Distribute EXP evenly across party heroes
    if (rewards.exp > 0) {
      var heroes = (typeof getPartyHeroes === 'function')
        ? getPartyHeroes().filter(Boolean)
        : [];
      if (heroes.length > 0) {
        var perHero = Math.floor(rewards.exp / heroes.length);
        heroes.forEach(function (hero) {
          if (!hero.level) hero.level = 1;
          if (typeof hero.exp === 'undefined') hero.exp = 0;
          hero.exp += perHero;
          // Level up loop
          var needed = typeof getExpToNext === 'function' ? getExpToNext(hero.level) : Infinity;
          while (hero.exp >= needed && hero.level < 999) {
            hero.exp -= needed;
            hero.level++;
            // Stat growth on level up (small flat boost)
            if (hero.stats) {
              hero.stats.strength     += 1;
              hero.stats.intelligence += 1;
              hero.stats.health       += 2;
              hero.stats.agility      += 1;
            }
            needed = typeof getExpToNext === 'function' ? getExpToNext(hero.level) : Infinity;
          }
        });
      }
    }

    // Update last collect time
    gameState.afkRewards.lastCollectTime = Date.now();
    saveGame();
  }

  // ── FORMAT TIME STRING ────────────────────────────────────
  function formatAfkTime(minutes) {
    if (minutes < 60) return minutes + 'm';
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    if (m === 0) return h + 'h';
    return h + 'h ' + m + 'm';
  }

  // ── SHOW WELCOME BACK POPUP ───────────────────────────────
  function showAfkPopup(rewards) {
    // Remove existing popup if any
    var existing = document.getElementById('afk-rewards-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'afk-rewards-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;' +
      'justify-content:center;background:rgba(0,0,0,0.85);';

    var panel = document.createElement('div');
    panel.style.cssText =
      'background:#1a1025;border:2px solid #FFD700;border-radius:12px;' +
      'padding:28px 36px;max-width:380px;width:90%;text-align:center;' +
      'font-family:monospace;color:#e0d8f0;box-shadow:0 0 40px rgba(255,215,0,0.25);';

    var title = document.createElement('div');
    title.style.cssText =
      'font-size:20px;color:#FFD700;letter-spacing:3px;margin-bottom:6px;font-weight:bold;';
    title.textContent = 'WELCOME BACK';

    var timeLabel = document.createElement('div');
    timeLabel.style.cssText = 'font-size:12px;color:#888;margin-bottom:18px;';
    timeLabel.textContent = 'You were away for ' + formatAfkTime(rewards.minutes);

    var rewardBox = document.createElement('div');
    rewardBox.style.cssText =
      'background:#120a1a;border:1px solid #333;border-radius:8px;' +
      'padding:16px;margin-bottom:18px;text-align:left;';

    var rewardTitle = document.createElement('div');
    rewardTitle.style.cssText = 'font-size:13px;color:#FFD700;margin-bottom:10px;letter-spacing:1px;';
    rewardTitle.textContent = '— IDLE REWARDS —';

    var goldRow = document.createElement('div');
    goldRow.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;';
    goldRow.innerHTML = '<span style="color:#aaa">Gold</span><span style="color:#F1C40F;font-weight:bold">+' +
      rewards.gold.toLocaleString() + '</span>';

    var expRow = document.createElement('div');
    expRow.style.cssText = 'display:flex;justify-content:space-between;margin-bottom:6px;font-size:14px;';
    expRow.innerHTML = '<span style="color:#aaa">EXP (Party)</span><span style="color:#90EE90;font-weight:bold">+' +
      rewards.exp.toLocaleString() + '</span>';

    rewardBox.appendChild(rewardTitle);
    rewardBox.appendChild(goldRow);
    rewardBox.appendChild(expRow);

    // Bonus info
    var bonusInfo = document.createElement('div');
    bonusInfo.style.cssText = 'font-size:10px;color:#666;margin-top:10px;border-top:1px solid #222;padding-top:8px;';
    bonusInfo.innerHTML =
      'Tower Floor ' + rewards.towerFloor + ' · Party Power ' + rewards.partyPower +
      '<br>Rewards scale with progression!';
    rewardBox.appendChild(bonusInfo);

    var claimBtn = document.createElement('button');
    claimBtn.style.cssText =
      'background:linear-gradient(135deg,#FFD700,#FFA500);color:#1a1025;' +
      'border:none;border-radius:6px;padding:12px 32px;font-size:15px;' +
      'font-weight:bold;cursor:pointer;letter-spacing:1px;font-family:monospace;' +
      'transition:transform 0.1s;width:100%;';
    claimBtn.textContent = '[ CLAIM REWARDS ]';
    claimBtn.onmousedown = function () { claimBtn.style.transform = 'scale(0.96)'; };
    claimBtn.onmouseup   = function () { claimBtn.style.transform = ''; };
    claimBtn.onclick = function () {
      applyRewards(rewards);
      overlay.remove();
      // Update HUD displays
      if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
      if (typeof updateGemsDisplay === 'function') updateGemsDisplay();
      if (typeof showToast === 'function') {
        showToast('Idle rewards claimed! +' + rewards.gold.toLocaleString() + ' Gold, +' + rewards.exp.toLocaleString() + ' EXP', '#FFD700');
      }
    };

    panel.appendChild(title);
    panel.appendChild(timeLabel);
    panel.appendChild(rewardBox);
    panel.appendChild(claimBtn);
    overlay.appendChild(panel);

    document.body.appendChild(overlay);
  }

  // ── CHECK ON LOGIN ────────────────────────────────────────
  // Called when the game loads a save. Shows popup if offline long enough.
  function checkAfkRewards() {
    if (!gameState.afkRewards) return;

    var lastTime = gameState.afkRewards.lastCollectTime;
    if (!lastTime) {
      // First time — just set the timestamp, no rewards
      gameState.afkRewards.lastCollectTime = Date.now();
      saveGame();
      return;
    }

    var elapsed = Date.now() - lastTime;
    var rewards = calculateRewards(elapsed);
    if (!rewards) {
      // Not enough time — just update timestamp
      gameState.afkRewards.lastCollectTime = Date.now();
      saveGame();
      return;
    }

    // Show popup (rewards applied on claim)
    showAfkPopup(rewards);
  }

  // ── STAMP TIME ON EXIT ────────────────────────────────────
  // Update timestamp periodically and on page unload so the timer is accurate
  function startAfkTimer() {
    // Update every 60 seconds while active (in case user stays in-game)
    setInterval(function () {
      if (gameState.afkRewards) {
        gameState.afkRewards.lastCollectTime = Date.now();
        saveGame();
      }
    }, 60000);

    // Also save on page unload
    window.addEventListener('beforeunload', function () {
      if (gameState.afkRewards) {
        gameState.afkRewards.lastCollectTime = Date.now();
        saveGame();
      }
    });
  }

  // ── PUBLIC API ────────────────────────────────────────────
  return {
    checkAfkRewards: checkAfkRewards,
    startAfkTimer:   startAfkTimer,
    calculateRewards: calculateRewards,
    applyRewards:    applyRewards,
  };

})();
