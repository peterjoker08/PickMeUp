// ═══════════════════════════════════════════════════════════
// CITY SCENE — Townia city-building loop
// ═══════════════════════════════════════════════════════════
// Renamed from manor.js. index.html script tag updated in Session 7.
// hub.js hubNav('Lobby') wired to showCityScene() in Session 7.
//
// Buildings:
//   Mystic Spire  — always unlocked; levels 0–5; costs Building Schematics (BD)
//   Bakery        — unlocked at Spire L3; produces 1 🍞/8 min; capped at 200
//
// Bread model: fixed-origin (no setInterval). See collectBread() for diagram.

(function () {

  // ── Spire cost table ──────────────────────────────────────
  // Index = target level (index 0 unused; level 0 = built at game start).
  var SPIRE_COSTS = [0, 10, 25, 50, 100, 200];
  var SPIRE_MAX   = SPIRE_COSTS.length - 1;   // 5

  // Passive bonuses per reached level — display only.
  // Actual stat wiring deferred to TODOS.md P1 (Spire Passive Bonus Application).
  var SPIRE_BONUSES = {
    1: '+2% party ATK in Tower',
    2: '+2% party DEF in Tower',
    3: '+5% AFK gold rate  \u00b7  unlocks Bakery',
    4: '(coming soon)',
    5: '(coming soon)',
  };

  // ── Bread constants ───────────────────────────────────────
  var BREAD_TICK_MS = 8 * 60 * 1000;   // 480 000 ms — 1 loaf per 8 min
  var BREAD_CAP     = 200;

  // ══════════════════════════════════════════════════════════
  // ENTRY POINT
  // ══════════════════════════════════════════════════════════
  function showCityScene() {
    migrateInventory();
    // No silent collect on open — player sees the pending count and presses
    // the button themselves (preserves the collect dopamine moment).
    _render();
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  function _render() {
    var main = document.getElementById('hub-main');
    if (!main) return;

    var city   = gameState.city;
    var spire  = city.buildings.mysticSpire;
    var bakery = city.buildings.bakery;
    // CRITICAL: escHtml on all user-supplied strings (city name XSS prevention).
    var cityName = city.name ? escHtml(city.name) : 'TOWNIA';

    main.className = 'hub-main--scene';
    main.style.cssText = 'overflow-y:auto;padding:0';
    main.innerHTML =
      _headerHTML(cityName) +
      '<div style="padding:24px 28px;display:flex;flex-direction:column;gap:20px">' +
        _spireHTML(spire) +
        _bakeryHTML(bakery) +
      '</div>';

    _wireButtons();
  }

  // ── Scene header ─────────────────────────────────────────
  // Contextual currencies: BD (spent on upgrades) + Wishes (reviewed here).
  // Bread shown inline in the Bakery card, not the header.
  function _headerHTML(cityName) {
    var schem  = gameState.schematics || 0;
    var wishes = gameState.wishes     || 0;
    return (
      '<div style="' +
        'background:#12001A;border-bottom:2px solid #C0C0D0;' +
        'padding:16px 28px;display:flex;align-items:center;' +
        'justify-content:space-between;flex-shrink:0' +
      '">' +
        '<div>' +
          '<div style="color:#FFFFFF;font-size:18px;letter-spacing:3px;' +
               'font-family:\'Courier New\',monospace">' +
            '[ ' + cityName + ' ]' +
          '</div>' +
          '<div style="color:#888899;font-size:10px;letter-spacing:2px;margin-top:2px">' +
            'CITY MANAGEMENT' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:20px;align-items:center;' +
             'font-family:\'Courier New\',monospace;font-size:13px">' +
          '<span style="color:#E8D5FF">' +
            '\ud83d\udd29 ' + schem +
            '<span style="color:#888899;font-size:10px;margin-left:4px">BD</span>' +
          '</span>' +
          '<span style="color:#E8D5FF">' +
            '\u2b50 ' + wishes +
            '<span style="color:#888899;font-size:10px;margin-left:4px">WISH</span>' +
          '</span>' +
        '</div>' +
      '</div>'
    );
  }

  // ── Mystic Spire card ─────────────────────────────────────
  function _spireHTML(spire) {
    var lvl       = spire.level;
    var atMax     = lvl >= SPIRE_MAX;
    var cost      = atMax ? 0 : SPIRE_COSTS[lvl + 1];
    var canAfford = !atMax && (gameState.schematics || 0) >= cost;

    // Stars row
    var stars = '';
    for (var s = 0; s < SPIRE_MAX; s++) {
      stars += '<span style="color:' + (s < lvl ? '#F1C40F' : '#333348') + ';font-size:14px">\u2605</span>';
    }

    // Earned bonuses (all levels <= current)
    var bonusLines = '';
    for (var i = 1; i <= lvl; i++) {
      bonusLines +=
        '<div style="color:#4CAF50;font-size:11px;letter-spacing:1px;margin-top:4px">' +
          '\u2713 L' + i + ': ' + escHtml(SPIRE_BONUSES[i] || '') +
        '</div>';
    }
    // Next bonus preview
    if (!atMax) {
      bonusLines +=
        '<div style="color:#888899;font-size:11px;letter-spacing:1px;margin-top:4px">' +
          '\u25cb L' + (lvl + 1) + ': ' + escHtml(SPIRE_BONUSES[lvl + 1] || '') +
        '</div>';
    }

    // Upgrade button
    var btnHTML;
    if (atMax) {
      btnHTML =
        '<div style="color:#4CAF50;font-size:12px;letter-spacing:2px;' +
             'text-align:center;padding:8px 0">[ \u2605 MAX LEVEL \u2605 ]</div>';
    } else {
      var borderCol = canAfford ? '#F1C40F' : '#555566';
      var textCol   = canAfford ? '#FFFFFF'  : '#555566';
      var cursor    = canAfford ? 'pointer'  : 'default';
      var hover     = canAfford
        ? ' onmouseover="this.style.boxShadow=\'0 0 12px #7B2FBE\'"' +
          ' onmouseout="this.style.boxShadow=\'\'"'
        : '';
      btnHTML =
        '<button id="city-spire-upgrade-btn"' +
          ' style="background:#1A0025;border:2px solid ' + borderCol + ';' +
            'color:' + textCol + ';' +
            'font-family:\'Courier New\',monospace;font-size:12px;' +
            'padding:8px 20px;cursor:' + cursor + ';' +
            'letter-spacing:1px;width:100%;transition:box-shadow 0.2s"' +
          hover +
        '>[ UPGRADE  \ud83d\udd29 ' + cost + ' BD ]</button>';
    }

    return (
      '<div style="' +
        'background:#12001A;border:2px solid #C0C0D0;' +
        'box-shadow:0 0 15px rgba(123,47,190,0.4);padding:20px 24px' +
      '">' +
        '<div style="display:flex;align-items:flex-start;' +
             'justify-content:space-between;margin-bottom:12px">' +
          '<div>' +
            '<div style="color:#FFFFFF;font-size:15px;letter-spacing:2px;' +
                 'font-family:\'Courier New\',monospace">\ud83d\uddfb MYSTIC SPIRE</div>' +
            '<div style="margin-top:6px">' + stars + '</div>' +
            '<div style="color:#888899;font-size:10px;letter-spacing:1px;margin-top:4px">' +
              'LEVEL ' + lvl + ' / ' + SPIRE_MAX +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="margin-bottom:16px">' + bonusLines + '</div>' +
        btnHTML +
      '</div>'
    );
  }

  // ── Bakery card ───────────────────────────────────────────
  function _bakeryHTML(bakery) {
    if (!bakery.unlocked) {
      return (
        '<div style="' +
          'background:#12001A;border:2px solid #2A003A;' +
          'padding:20px 24px;opacity:0.5' +
        '">' +
          '<div style="color:#888899;font-size:15px;letter-spacing:2px;' +
               'font-family:\'Courier New\',monospace">\ud83c\udf5e BAKERY</div>' +
          '<div style="color:#555566;font-size:11px;letter-spacing:1px;margin-top:8px">' +
            '[ LOCKED \u2014 Upgrade Mystic Spire to Level 3 ]' +
          '</div>' +
        '</div>'
      );
    }

    var bread   = gameState.bread || 0;
    var pending = _pendingLoaves();
    var barPct  = Math.min(100, Math.round(bread / BREAD_CAP * 100));

    var pendingTag = pending > 0
      ? '<span style="color:#F1C40F">(' + pending + ' ready)</span>'
      : '';

    var borderCol = pending > 0 ? '#F1C40F' : '#333348';
    var textCol   = pending > 0 ? '#FFFFFF'  : '#555566';
    var cursor    = pending > 0 ? 'pointer'  : 'default';
    var hover     = pending > 0
      ? ' onmouseover="this.style.boxShadow=\'0 0 12px #7B2FBE\'"' +
        ' onmouseout="this.style.boxShadow=\'\'"'
      : '';
    var btnLabel = pending > 0
      ? '[ COLLECT  \ud83c\udf5e \u00d7' + pending + ' ]'
      : '[ NO BREAD READY ]';

    return (
      '<div style="' +
        'background:#12001A;border:2px solid #C0C0D0;' +
        'box-shadow:0 0 15px rgba(123,47,190,0.4);padding:20px 24px' +
      '">' +
        '<div style="color:#FFFFFF;font-size:15px;letter-spacing:2px;' +
             'font-family:\'Courier New\',monospace;margin-bottom:14px">' +
          '\ud83c\udf5e BAKERY' +
        '</div>' +
        // Bread bar
        '<div style="margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;' +
               'font-family:\'Courier New\',monospace;font-size:12px;margin-bottom:6px">' +
            '<span style="color:#E8D5FF">Bread</span>' +
            '<span style="color:#E8D5FF">' + bread + ' / ' + BREAD_CAP + '</span>' +
          '</div>' +
          '<div style="background:#0D0010;border:1px solid #2A003A;height:8px;border-radius:2px">' +
            '<div style="background:#E67E22;height:100%;width:' + barPct + '%;' +
                 'border-radius:2px;transition:width 0.3s"></div>' +
          '</div>' +
        '</div>' +
        '<div style="color:#888899;font-size:11px;letter-spacing:1px;margin-bottom:14px">' +
          '1 \ud83c\udf5e every 8 min  \u00b7  cap ' + BREAD_CAP + '  ' + pendingTag +
        '</div>' +
        '<button id="city-bread-collect-btn"' +
          ' style="background:#1A0025;border:2px solid ' + borderCol + ';' +
            'color:' + textCol + ';' +
            'font-family:\'Courier New\',monospace;font-size:12px;' +
            'padding:8px 20px;cursor:' + cursor + ';' +
            'letter-spacing:1px;width:100%;transition:box-shadow 0.2s"' +
          hover +
        '>' + btnLabel + '</button>' +
      '</div>'
    );
  }

  // ── Wire buttons ──────────────────────────────────────────
  function _wireButtons() {
    var upgradeBtn = document.getElementById('city-spire-upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', function () {
        upgradeBtn.disabled = true;   // double-click guard
        upgradeMysticSpire();
      });
    }

    var collectBtn = document.getElementById('city-bread-collect-btn');
    if (collectBtn) {
      collectBtn.addEventListener('click', function () {
        collectBtn.disabled = true;   // double-click guard
        collectBread(true);           // animated — shows floating pill
        _render();
      });
    }
  }

  // ══════════════════════════════════════════════════════════
  // UPGRADE MYSTIC SPIRE
  // ══════════════════════════════════════════════════════════
  function upgradeMysticSpire() {
    var spire = gameState.city.buildings.mysticSpire;

    if (spire.level >= SPIRE_MAX) return;

    var cost = SPIRE_COSTS[spire.level + 1];
    if ((gameState.schematics || 0) < cost) {
      showToast('Not enough BD \u2014 need \ud83d\udd29 ' + cost, '#FF4444');
      _render();
      return;
    }

    gameState.schematics -= cost;
    spire.level++;

    // Unlock Bakery at Spire L3.
    // Guard: only stamp lastBreadTime once — idempotent if somehow called twice.
    if (spire.level >= 3 && !gameState.city.buildings.bakery.unlocked) {
      gameState.city.buildings.bakery.unlocked = true;
      if (!gameState.lastBreadTime) {
        gameState.lastBreadTime = Date.now();
      }
    }

    saveGame();
    showToast('Mystic Spire \u2192 Level ' + spire.level + '!', '#F1C40F');
    _render();
  }

  // ══════════════════════════════════════════════════════════
  // COLLECT BREAD (fixed-origin timer, no setInterval)
  // ══════════════════════════════════════════════════════════
  //
  //   Bakery unlock ──▶  lastBreadTime = Date.now()     (stamped ONCE)
  //                                    │
  //                                    ▼
  //   collectBread() called            │
  //   (on button press)                │
  //        │                           │
  //        ▼                           │
  //   elapsed = now − lastBreadTime ◀──┘
  //        │
  //        ▼
  //   loaves = floor(elapsed / 480_000)    [1 per 8 min]
  //        │
  //        ├─ loaves === 0 ──▶ nothing to do; return
  //        │
  //        ▼  loaves > 0
  //   lastBreadTime += loaves × 480_000   ← advance origin, NOT reset to now()
  //   ↑ CRITICAL: resetting to now() would erase un-accumulated fractional time
  //        │
  //        ▼
  //   actualLoaves = min(loaves, BREAD_CAP − bread)   [hard cap]
  //        │
  //        ├─ actualLoaves === 0 ──▶ already at cap; save + return
  //        │
  //        ▼
  //   animate?
  //     YES → applyReward({ bread: actualLoaves })     [saves + shows pill]
  //     NO  → gameState.bread += actualLoaves; saveGame()
  //
  function collectBread(animate) {
    if (!gameState.city.buildings.bakery.unlocked) return;

    // Safety: stamp origin if missing after unlock.
    if (!gameState.lastBreadTime) {
      gameState.lastBreadTime = Date.now();
      saveGame();
      return;
    }

    var now     = Date.now();
    var elapsed = now - gameState.lastBreadTime;
    var loaves  = Math.floor(elapsed / BREAD_TICK_MS);
    if (loaves <= 0) return;

    // Advance origin by ALL elapsed ticks — bread past cap is simply wasted
    // (standard gacha behavior; the timer keeps running regardless of cap).
    gameState.lastBreadTime += loaves * BREAD_TICK_MS;

    var current      = gameState.bread || 0;
    var actualLoaves = Math.min(loaves, BREAD_CAP - current);

    if (actualLoaves <= 0) {
      // Cap already full — origin was advanced above, just persist.
      saveGame();
      return;
    }

    if (animate) {
      applyReward({ bread: actualLoaves });   // saves + shows floating pill
    } else {
      gameState.bread = Math.min(current + actualLoaves, BREAD_CAP);
      saveGame();
    }
  }

  // ── Pending loaves (read-only, for UI) ───────────────────
  // Does NOT modify state — safe to call during render.
  function _pendingLoaves() {
    if (!gameState.city.buildings.bakery.unlocked) return 0;
    if (!gameState.lastBreadTime) return 0;
    var elapsed = Date.now() - gameState.lastBreadTime;
    var loaves  = Math.floor(elapsed / BREAD_TICK_MS);
    return Math.min(loaves, BREAD_CAP - (gameState.bread || 0));
  }

  // ── Exports ───────────────────────────────────────────────
  window.showCityScene      = showCityScene;
  window.upgradeMysticSpire = upgradeMysticSpire;
  window.collectBread       = collectBread;

  function registerSceneCity() {
    // future: city-specific event listeners, Iselle roaming
  }
  window.registerSceneCity = registerSceneCity;

}());
