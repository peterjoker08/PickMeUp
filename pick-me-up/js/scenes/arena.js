// ═══════════════════════════════════════════════════════════
// ARENA SCENE — AFK Journey-style auto-battle combat
// ═══════════════════════════════════════════════════════════
// Full-screen combat overlay with:
//   - Canvas battlefield (BattleRenderer — animated pixel sprites)
//   - Hero cards at bottom (AFK Journey-style)
//   - Auto-battle with speed controls
//   - Combat log + floating damage numbers

(function () {

  var _combatInstance  = null;
  var _combatTimer     = null;
  var _combatSpeed     = 1;       // 1x, 2x, 4x
  var _combatPaused    = false;
  var _logIndex        = 0;
  var _floorNum        = 0;
  var _isArenaMode     = false;   // true = arena, false = tower combat
  var _onCombatEnd     = null;    // callback when combat ends

  // ═══════════════════════════════════════════════════════════
  // PUBLIC: Launch combat (called from Tower or Arena)
  // ═══════════════════════════════════════════════════════════
  function launchCombat(floorNum, options) {
    options = options || {};
    _floorNum    = floorNum;
    _isArenaMode = !!options.arenaMode;
    _onCombatEnd = options.onEnd || null;
    _combatSpeed = 1;
    _combatPaused = false;
    _logIndex    = 0;

    var party   = getPartyHeroes().filter(Boolean);
    var enemies = getEnemiesForFloor(floorNum);

    var synergyLevel = (gameState.synergy && gameState.synergy.level) || 0;
    _combatInstance = CombatEngine.createCombat(party, enemies, { synergyLevel: synergyLevel });

    _renderCombatUI();
    _startCombatLoop();
  }

  // ═══════════════════════════════════════════════════════════
  // RENDER: Full-screen combat overlay (AFK Journey layout)
  // ═══════════════════════════════════════════════════════════
  function _renderCombatUI() {
    var existing = document.getElementById('combat-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'combat-overlay';
    overlay.className = 'combat-overlay';

    var type = getFloorType(_floorNum);
    var typeLabel = type === 'boss' ? '⚔ BOSS' : type === 'miniboss' ? '⚔ ELITE' : '⚔ BATTLE';

    overlay.innerHTML =
      '<!-- TOP BAR -->' +
      '<div class="combat-topbar">' +
        '<div class="combat-topbar-left">' +
          '<button class="combat-speed-btn" id="combat-speed-btn">[ 1× ]</button>' +
          '<button class="combat-ctrl-btn" id="combat-pause-btn">[ ▶ AUTO ]</button>' +
        '</div>' +
        '<div class="combat-topbar-center">' +
          '<span class="combat-floor-label">' + typeLabel + ' — Floor ' + _floorNum + '</span>' +
        '</div>' +
        '<div class="combat-topbar-right">' +
          '<button class="combat-ctrl-btn" id="combat-flee-btn">[ RETREAT ]</button>' +
        '</div>' +
      '</div>' +

      '<!-- BATTLEFIELD (canvas rendered) -->' +
      '<div class="combat-battlefield" id="combat-battlefield">' +
        '<canvas id="battle-canvas" style="width:100%;height:100%;image-rendering:pixelated;image-rendering:crisp-edges;display:block"></canvas>' +
      '</div>' +

      '<!-- COMBAT LOG -->' +
      '<div class="combat-log-bar" id="combat-log-bar">' +
        '<span class="combat-log-text" id="combat-log-text">Battle begins!</span>' +
      '</div>' +

      '<!-- HERO CARDS (AFK Journey style) -->' +
      '<div class="combat-hero-cards" id="combat-hero-cards"></div>' +

      '<!-- RESULT OVERLAY (hidden) -->' +
      '<div class="combat-result-overlay" id="combat-result-overlay" style="display:none"></div>';

    document.getElementById('ui-layer').appendChild(overlay);

    // Init the canvas battle renderer
    var battleCanvas = document.getElementById('battle-canvas');
    BattleRenderer.init(battleCanvas, _combatInstance);

    // Render hero cards
    _renderHeroCards();

    // Attach controls
    document.getElementById('combat-speed-btn').addEventListener('click', _cycleSpeed);
    document.getElementById('combat-pause-btn').addEventListener('click', _togglePause);
    document.getElementById('combat-flee-btn').addEventListener('click', _handleRetreat);

    // Fade in
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('visible');
      });
    });
  }

  // ─── HERO CARDS (AFK Journey bottom bar) ────────────────
  function _renderHeroCards() {
    var container = document.getElementById('combat-hero-cards');
    if (!container) return;
    container.innerHTML = '';

    _combatInstance.playerUnits.forEach(function (unit) {
      container.appendChild(_buildHeroCard(unit));
    });
  }

  function _buildHeroCard(unit) {
    var col = RARITY_BORDER[unit.rarity] || '#C0C0D0';
    var stars = '';
    for (var i = 0; i < Math.min(unit.rarity, 7); i++) stars += '★';

    var card = document.createElement('div');
    card.className = 'combat-card' + (unit.alive ? '' : ' dead');
    card.id = 'combat-card-' + unit.id;
    card.style.borderColor = col;

    var hpPct = Math.max(0, Math.round((unit.currentHP / unit.maxHP) * 100));
    var energyPct = Math.max(0, Math.round((unit.energy / unit.maxEnergy) * 100));
    var hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FFA500' : '#FF4444';

    // Status effect icons
    var statusIcons = '';
    if (unit.statusEffects && unit.statusEffects.length > 0) {
      unit.statusEffects.forEach(function (eff) {
        statusIcons += '<span class="combat-card-status" title="' + escHtml(eff.name + ' (' + eff.label + ')') + '">' + eff.icon + '</span>';
      });
    }

    var talentCol = talentColor(unit.talent);

    // Class icon portrait
    var classIcons = {
      Warrior: '⚔', Mage: '🔮', Ranger: '🏹', Healer: '✨',
      Tank: '🛡', Assassin: '🗡', Knight: '⚔', Cleric: '✨',
    };
    var icon = classIcons[unit.class] || '⚔';

    card.innerHTML =
      '<div class="combat-card-portrait" style="border-bottom-color:' + col + '">' +
        '<div class="combat-card-art" style="font-size:28px;display:flex;align-items:center;justify-content:center">' + icon + '</div>' +
        '<div class="combat-card-stars" style="color:' + col + '">' + stars + '</div>' +
      '</div>' +
      '<div class="combat-card-info">' +
        '<div class="combat-card-name">' + escHtml(unit.name) + '</div>' +
        '<div class="combat-card-class">' + escHtml(unit.class) + '</div>' +
        '<div class="combat-card-bars">' +
          '<div class="combat-card-bar-wrap">' +
            '<div class="combat-card-bar-label">HP</div>' +
            '<div class="combat-card-bar">' +
              '<div class="combat-card-bar-fill hp-fill" style="width:' + hpPct + '%;background:' + hpColor + '"></div>' +
            '</div>' +
            '<div class="combat-card-bar-val">' + unit.currentHP + '/' + unit.maxHP + '</div>' +
          '</div>' +
          '<div class="combat-card-bar-wrap">' +
            '<div class="combat-card-bar-label">EN</div>' +
            '<div class="combat-card-bar">' +
              '<div class="combat-card-bar-fill energy-fill" style="width:' + energyPct + '%;background:#7B2FBE"></div>' +
            '</div>' +
            '<div class="combat-card-bar-val">' + unit.energy + '/' + unit.maxEnergy + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="combat-card-footer">' +
          '<div class="combat-card-statuses">' + statusIcons + '</div>' +
          (unit.activePenalty ? '<span class="combat-card-penalty" title="Weapon unfamiliarity">⚠</span>' : '') +
          '<span class="combat-card-talent" style="color:' + talentCol + '" title="Talent: ' + unit.talent + '">T' + unit.talent + '</span>' +
        '</div>' +
      '</div>';

    return card;
  }

  function _updateHeroCard(unit) {
    var card = document.getElementById('combat-card-' + unit.id);
    if (!card) return;

    if (!unit.alive) {
      card.classList.add('dead');
      return;
    }

    var hpPct = Math.max(0, Math.round((unit.currentHP / unit.maxHP) * 100));
    var energyPct = Math.max(0, Math.round((unit.energy / unit.maxEnergy) * 100));
    var hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FFA500' : '#FF4444';

    var hpFill = card.querySelector('.hp-fill');
    if (hpFill) {
      hpFill.style.width = hpPct + '%';
      hpFill.style.background = hpColor;
    }

    var hpVal = card.querySelectorAll('.combat-card-bar-val')[0];
    if (hpVal) hpVal.textContent = unit.currentHP + '/' + unit.maxHP;

    var enFill = card.querySelector('.energy-fill');
    if (enFill) enFill.style.width = energyPct + '%';

    var enVal = card.querySelectorAll('.combat-card-bar-val')[1];
    if (enVal) enVal.textContent = unit.energy + '/' + unit.maxEnergy;
  }

  // ─── COMBAT LOG ─────────────────────────────────────────
  function _updateLogBar(message) {
    var logText = document.getElementById('combat-log-text');
    if (logText) logText.textContent = message;
  }

  // ─── COMBAT LOOP ───────────────────────────────────────
  function _startCombatLoop() {
    if (_combatTimer) clearInterval(_combatTimer);
    _combatTimer = setInterval(function () {
      if (_combatPaused) return;

      var ticksPerFrame = _combatSpeed;
      for (var i = 0; i < ticksPerFrame; i++) {
        if (_combatInstance.getState() !== 'running') break;
        _combatInstance.tick();
      }

      // Process new log entries
      var log = _combatInstance.combatLog;
      while (_logIndex < log.length) {
        var entry = log[_logIndex];
        _logIndex++;

        if (entry.type === 'attack') {
          _updateLogBar(entry.message);

          // Trigger canvas battle animations
          BattleRenderer.onAttack(
            entry.attackerId, entry.defenderId,
            entry.damage, entry.isCrit, entry.isPanic
          );

          // Update hero cards
          var defender = _combatInstance.allUnits.find(function (u) { return u.id === entry.defenderId; });
          if (defender && defender.isHero) _updateHeroCard(defender);
          var attacker = _combatInstance.allUnits.find(function (u) { return u.id === entry.attackerId; });
          if (attacker && attacker.isHero) _updateHeroCard(attacker);
        }

        if (entry.type === 'death') {
          BattleRenderer.onDeath(entry.unitId);
          var deadUnit = _combatInstance.allUnits.find(function (u) { return u.id === entry.unitId; });
          if (deadUnit && deadUnit.isHero) _updateHeroCard(deadUnit);
          _updateLogBar(entry.message);
        }

        if (entry.type === 'dot') {
          BattleRenderer.onDOT(entry.unitId, entry.damage);
          var dotUnit = _combatInstance.allUnits.find(function (u) { return u.id === entry.unitId; });
          if (dotUnit && dotUnit.isHero) _updateHeroCard(dotUnit);
        }

        if (entry.type === 'status') {
          _updateLogBar(entry.message);
        }

        if (entry.type === 'result' || entry.type === 'timeout') {
          _endCombat(entry.result || 'timeout');
          return;
        }
      }
    }, CombatEngine.TICK_INTERVAL);
  }

  function _endCombat(result) {
    if (_combatTimer) { clearInterval(_combatTimer); _combatTimer = null; }
    BattleRenderer.stop();

    var rewards = CombatEngine.calculateRewards(_floorNum, result);
    var resultOverlay = document.getElementById('combat-result-overlay');
    if (!resultOverlay) return;

    var isVictory = result === 'victory';
    var bannerColor = isVictory ? '#4CAF50' : '#FF4444';
    var bannerText  = isVictory ? '✓ VICTORY' : result === 'timeout' ? '⏰ TIME OUT' : '✗ DEFEAT';

    // Build survivor summary
    var survivorHTML = '';
    _combatInstance.playerUnits.forEach(function (u) {
      var col = RARITY_BORDER[u.rarity] || '#C0C0D0';
      var hpPct = u.alive ? Math.round((u.currentHP / u.maxHP) * 100) : 0;
      var status = u.alive ? hpPct + '% HP' : 'FALLEN';
      var statusCol = u.alive ? (hpPct > 50 ? '#4CAF50' : '#FFA500') : '#FF4444';
      survivorHTML +=
        '<div class="combat-result-hero">' +
          '<span style="color:' + col + '">' + '★'.repeat(Math.min(u.rarity, 7)) + '</span> ' +
          '<span style="color:#FFFFFF">' + escHtml(u.name) + '</span> ' +
          '<span style="color:' + statusCol + '">[' + status + ']</span>' +
        '</div>';
    });

    // Formation event chance (15% on victory)
    var eventHTML = '';
    if (isVictory && Math.random() < 0.15) {
      var event = CombatEngine.getRandomFormationEvent();
      eventHTML = _buildFormationEventHTML(event);
    }

    resultOverlay.innerHTML =
      '<div class="combat-result-panel">' +
        '<div class="combat-result-banner" style="color:' + bannerColor + '">' + bannerText + '</div>' +
        '<div class="combat-result-floor">Floor ' + _floorNum + '</div>' +
        '<div class="combat-result-section">' +
          '<div class="combat-result-label">[ PARTY STATUS ]</div>' +
          survivorHTML +
        '</div>' +
        (isVictory ?
          '<div class="combat-result-section">' +
            '<div class="combat-result-label">[ REWARDS ]</div>' +
            '<div class="combat-result-reward">💎 ' + rewards.gems + ' Gems</div>' +
            '<div class="combat-result-reward">🪙 ' + rewards.gold + ' Gold</div>' +
            '<div class="combat-result-reward">⭐ ' + rewards.exp + ' EXP per hero</div>' +
          '</div>' : '') +
        eventHTML +
        '<div class="combat-result-buttons">' +
          (_isArenaMode && isVictory ? '<button class="scene-btn" id="combat-result-auto" style="border-color:#FFD700;color:#FFD700">[ ▶ AUTO REPEAT ]</button>' : '') +
          '<button class="scene-btn" id="combat-result-close">[ CONTINUE ]</button>' +
        '</div>' +
      '</div>';

    resultOverlay.style.display = 'flex';

    // Apply rewards
    if (isVictory) {
      gameState.gems += rewards.gems;
      gameState.gold  = (gameState.gold || 0) + rewards.gold;

      // Apply EXP to party heroes
      _combatInstance.playerUnits.forEach(function (u) {
        if (!u._heroRef) return;
        u._heroRef.exp = (u._heroRef.exp || 0) + rewards.exp;
        var expNeeded = getExpToNext(u._heroRef.level);
        while (u._heroRef.exp >= expNeeded) {
          u._heroRef.exp -= expNeeded;
          u._heroRef.level++;
          var talentBonus = Math.floor(u._heroRef.talent * 0.15);
          u._heroRef.stats.strength     += 2 + talentBonus;
          u._heroRef.stats.intelligence += 2 + talentBonus;
          u._heroRef.stats.health       += 15 + talentBonus * 3;
          u._heroRef.stats.agility      += 1 + talentBonus;
          expNeeded = getExpToNext(u._heroRef.level);
        }
        // Weapon familiarity
        if (u._heroRef.equippedWeapons) {
          ['mainHand', 'offHand'].forEach(function (slot) {
            var wId = u._heroRef.equippedWeapons[slot];
            if (!wId) return;
            var w = gameState.inventory.find(function (i) { return i.id === wId && i.type === 'weapon'; });
            if (w) incrementWeaponFamiliarity(u._heroRef.id, w.weaponType, 'battle');
          });
        }
      });

      if (!_isArenaMode) recordFloorClear(_floorNum);
      updateGemsDisplay();
      updateGoldDisplay();
      saveGame();
    }

    // Auto-repeat button (arena only)
    var autoBtn = document.getElementById('combat-result-auto');
    if (autoBtn) {
      autoBtn.addEventListener('click', function () {
        _closeCombatOverlay();
        setTimeout(function () {
          launchCombat(_floorNum, {
            arenaMode: true,
            onEnd: function (r) {
              setTimeout(function () { showArenaScene(); }, 200);
            },
          });
        }, 400);
      });
    }

    // Close button
    document.getElementById('combat-result-close').addEventListener('click', function () {
      _closeCombatOverlay();
      if (_onCombatEnd) _onCombatEnd(result);
    });

    // Attach formation event handlers if present
    _attachFormationEventHandlers();
  }

  // ─── FORMATION EVENT (post-combat dialog) ───────────────
  function _buildFormationEventHTML(event) {
    var choicesHTML = '';
    event.choices.forEach(function (choice, idx) {
      choicesHTML +=
        '<button class="scene-btn formation-choice-btn" data-choice-idx="' + idx + '" ' +
          'data-synergy-gain="' + choice.synergyGain + '" ' +
          'data-response="' + escHtml(choice.response) + '">' +
          choice.text +
        '</button>';
    });

    return (
      '<div class="combat-result-section" id="formation-event-section">' +
        '<div class="combat-result-label" style="color:#FFD700">[ ' + escHtml(event.title) + ' ]</div>' +
        '<div class="combat-result-event-desc">' + escHtml(event.description) + '</div>' +
        '<div class="combat-result-event-choices" id="formation-choices">' + choicesHTML + '</div>' +
        '<div class="combat-result-event-response" id="formation-response" style="display:none"></div>' +
      '</div>'
    );
  }

  function _attachFormationEventHandlers() {
    var buttons = document.querySelectorAll('.formation-choice-btn');
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var gain = parseInt(btn.dataset.synergyGain, 10) || 0;
        var response = btn.dataset.response;

        // Apply synergy change
        if (!gameState.synergy) gameState.synergy = { level: 0 };
        gameState.synergy.level = Math.max(0, Math.min(10, gameState.synergy.level + gain));
        saveGame();

        // Hide choices, show response
        var choicesContainer = document.getElementById('formation-choices');
        var responseContainer = document.getElementById('formation-response');
        if (choicesContainer) choicesContainer.style.display = 'none';
        if (responseContainer) {
          responseContainer.textContent = response;
          responseContainer.style.display = 'block';
          responseContainer.style.color = gain > 0 ? '#4CAF50' : gain < 0 ? '#FF4444' : '#E8D5FF';
        }
      });
    });
  }

  // ─── CONTROLS ───────────────────────────────────────────
  function _cycleSpeed() {
    if (_combatSpeed === 1) _combatSpeed = 2;
    else if (_combatSpeed === 2) _combatSpeed = 4;
    else _combatSpeed = 1;

    var btn = document.getElementById('combat-speed-btn');
    if (btn) btn.textContent = '[ ' + _combatSpeed + '× ]';
  }

  function _togglePause() {
    _combatPaused = !_combatPaused;
    var btn = document.getElementById('combat-pause-btn');
    if (btn) btn.textContent = _combatPaused ? '[ ❚❚ PAUSED ]' : '[ ▶ AUTO ]';
  }

  function _handleRetreat() {
    if (_combatTimer) { clearInterval(_combatTimer); _combatTimer = null; }
    BattleRenderer.stop();
    _closeCombatOverlay();
    if (_onCombatEnd) _onCombatEnd('retreat');
  }

  function _closeCombatOverlay() {
    var overlay = document.getElementById('combat-overlay');
    if (!overlay) return;
    overlay.classList.remove('visible');
    overlay.classList.add('closing');
    setTimeout(function () { overlay.remove(); }, 300);
    _combatInstance = null;
    if (_combatTimer) { clearInterval(_combatTimer); _combatTimer = null; }
  }

  // ═══════════════════════════════════════════════════════════
  // ARENA SCENE (hub menu entry)
  // ═══════════════════════════════════════════════════════════
  function showArenaScene() {
    resetHubMain();
    var main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';

    var party = getPartyHeroes().filter(Boolean);
    var isEmpty = party.length === 0;
    var synergyLevel = (gameState.synergy && gameState.synergy.level) || 0;

    var partyCardsHTML = '';
    if (party.length > 0) {
      party.forEach(function (h) {
        var col = RARITY_BORDER[h.rarity] || '#C0C0D0';
        var eff = getEffectiveStats(h);
        partyCardsHTML +=
          '<div style="background:#0D0010;border:2px solid ' + col + ';padding:12px;min-width:140px;font-size:11px">' +
            '<div style="color:#FFFFFF;font-weight:bold">' + escHtml(h.name) + '</div>' +
            '<div style="color:' + col + '">★'.repeat(h.rarity) + '</div>' +
            '<div style="color:#E8D5FF;font-size:10px">Lv.' + h.level + ' ' + escHtml(h.class) + '</div>' +
            '<div style="color:#C0C0D0;font-size:10px;margin-top:4px">' +
              'STR ' + eff.effectiveSTR + ' · HP ' + eff.effectiveHP +
            '</div>' +
            '<div style="color:' + talentColor(h.talent) + ';font-size:9px">Talent ' + h.talent + '</div>' +
          '</div>';
      });
    }

    main.innerHTML =
      '<div class="scene-header">' +
        '<div class="scene-header-title">' +
          '<h2>⚔ ARENA</h2>' +
          '<p>Challenge the Tower and battle enemies for glory</p>' +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:16px;margin-bottom:24px;justify-content:center;flex-wrap:wrap">' +
        '<div style="background:#12001A;border:2px solid #C0C0D0;padding:16px 24px;min-width:200px;text-align:center">' +
          '<div style="color:#E8D5FF;font-size:11px;letter-spacing:2px;margin-bottom:6px">CURRENT FLOOR</div>' +
          '<div style="color:#FFFFFF;font-size:24px;font-weight:bold">' + gameState.tower.currentFloor + '</div>' +
        '</div>' +
        '<div style="background:#12001A;border:2px solid #7B2FBE;padding:16px 24px;min-width:200px;text-align:center">' +
          '<div style="color:#E8D5FF;font-size:11px;letter-spacing:2px;margin-bottom:6px">PARTY SYNERGY</div>' +
          '<div style="color:#FFD700;font-size:24px;font-weight:bold">' + synergyLevel + ' / 10</div>' +
        '</div>' +
        '<div style="background:#12001A;border:2px solid #C0C0D0;padding:16px 24px;min-width:200px;text-align:center">' +
          '<div style="color:#E8D5FF;font-size:11px;letter-spacing:2px;margin-bottom:6px">PARTY SIZE</div>' +
          '<div style="color:#FFFFFF;font-size:24px;font-weight:bold">' + party.length + ' / 6</div>' +
        '</div>' +
      '</div>' +

      '<div style="margin-bottom:20px">' +
        '<div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:12px;text-align:center">[ YOUR PARTY ]</div>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">' +
          (party.length > 0 ? partyCardsHTML : '<div style="color:#FF4444;font-size:12px">[ No heroes in party. Assign heroes first! ]</div>') +
        '</div>' +
      '</div>' +

      '<div style="display:flex;gap:16px;justify-content:center;margin-top:20px">' +
        '<button class="scene-btn-gold" id="arena-quick-battle" ' + (isEmpty ? 'disabled' : '') + '>' +
          '[ ⚔ QUICK BATTLE — Floor ' + gameState.tower.currentFloor + ' ]</button>' +
        '<button class="scene-btn" id="arena-choose-floor" ' + (isEmpty ? 'disabled' : '') + '>' +
          '[ SELECT FLOOR ]</button>' +
      '</div>';

    // Quick battle
    if (!isEmpty) {
      document.getElementById('arena-quick-battle').addEventListener('click', function () {
        launchCombat(gameState.tower.currentFloor, {
          arenaMode: true,
          onEnd: function (result) {
            setTimeout(function () { showArenaScene(); }, 200);
          },
        });
      });

      document.getElementById('arena-choose-floor').addEventListener('click', function () {
        _openFloorPicker();
      });
    }
  }

  // ─── Floor picker for arena ─────────────────────────────
  function _openFloorPicker() {
    var overlay = document.createElement('div');
    overlay.id = 'arena-floor-picker';
    overlay.className = 'scene-overlay';

    var maxFloor = gameState.tower.currentFloor;
    var floorsHTML = '';
    for (var f = 1; f <= maxFloor; f++) {
      var type = getFloorType(f);
      var label = 'Floor ' + f;
      if (type === 'boss') label += ' [BOSS]';
      else if (type === 'miniboss') label += ' [ELITE]';
      var col = type === 'boss' ? '#FF4444' : type === 'miniboss' ? '#E67E22' : '#C0C0D0';
      floorsHTML +=
        '<button class="scene-btn arena-floor-btn" data-floor="' + f + '" ' +
          'style="border-color:' + col + ';font-size:11px;padding:6px 14px">' +
          label + '</button>';
    }

    overlay.innerHTML =
      '<div class="scene-panel" style="width:600px;max-height:80vh">' +
        '<div style="display:flex;justify-content:space-between;margin-bottom:16px">' +
          '<div style="color:#FFFFFF;font-size:14px;letter-spacing:2px">[ SELECT FLOOR ]</div>' +
          '<button class="scene-btn" id="floor-picker-close">[ × ]</button>' +
        '</div>' +
        '<div style="overflow-y:auto;max-height:60vh;display:flex;flex-wrap:wrap;gap:8px;justify-content:center">' +
          floorsHTML +
        '</div>' +
      '</div>';

    document.getElementById('ui-layer').appendChild(overlay);
    requestAnimationFrame(function () {
      overlay.querySelector('.scene-panel').classList.add('visible');
    });

    overlay.querySelector('#floor-picker-close').addEventListener('click', function () { overlay.remove(); });
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll('.arena-floor-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var floor = parseInt(btn.dataset.floor, 10);
        overlay.remove();
        launchCombat(floor, {
          arenaMode: true,
          onEnd: function () {
            setTimeout(function () { showArenaScene(); }, 200);
          },
        });
      });
    });
  }

  function registerSceneArena() {
    // All arena scene functions are declared above.
  }

  // ── Exports ─────────────────────────────────────────────
  window.showArenaScene     = showArenaScene;
  window.registerSceneArena = registerSceneArena;
  window.launchCombat       = launchCombat;

})();
