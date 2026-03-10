// ═══════════════════════════════════════════════════════════
// SHOP SCENE
// ═══════════════════════════════════════════════════════════
// Spend your hard-earned Gems wisely, Master.
// Framework skeleton — no real items, no pricing balance.

(function () {

  let _activeTab    = 'daily';
  let _countdownRef = null;   // setInterval ID for daily countdown

  // helpers: escHtml from js/ui/helpers.js

  function cleanupTimers() {
    if (_countdownRef) { clearInterval(_countdownRef); _countdownRef = null; }
  }

  // ── time until midnight helper ──
  function timeUntilMidnight() {
    const now  = new Date();
    const tmrw = new Date(now);
    tmrw.setHours(24, 0, 0, 0);
    const diff = tmrw - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  // ══════════════════════════════════════════════════════════
  // MAIN SCENE RENDER
  // ══════════════════════════════════════════════════════════

  function showShopScene() {
    cleanupTimers();
    _activeTab = 'daily';

    const main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';
    main.innerHTML = '';

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:14px;margin-bottom:18px;width:100%;';
    header.innerHTML = `
      <div style="width:90px;flex-shrink:0;"></div>
      <div style="flex:1;text-align:center;">
        <div style="color:#fff;font-size:18px;letter-spacing:3px;font-weight:bold;">[ SHOP ]</div>
        <div style="color:#B8A9D0;font-size:12px;margin-top:4px;">Spend your hard-earned Gems wisely, Master.</div>
      </div>
      <div id="shop-gem-display" style="
        color:#FFD700;font-size:14px;flex-shrink:0;
        font-family:'Courier New',monospace;letter-spacing:1px;">
        \uD83D\uDC8E ${gameState.gems} Gems
      </div>`;
    main.appendChild(header);

    // ── Tabs ──
    const tabBar = document.createElement('div');
    tabBar.id = 'shop-tab-bar';
    tabBar.style.cssText = 'display:flex;gap:8px;margin-bottom:18px;width:100%;';

    ['daily', 'special', 'history'].forEach(tab => {
      const label = tab === 'daily' ? 'DAILY' : tab === 'special' ? 'SPECIAL' : 'HISTORY';
      const btn = document.createElement('button');
      btn.dataset.tab = tab;
      btn.textContent = `[ ${label} ]`;
      btn.style.cssText = `
        background:none;font-family:'Courier New',monospace;font-size:13px;
        padding:4px 16px;cursor:pointer;letter-spacing:1px;
        border:1px solid ${tab === _activeTab ? '#FFD700' : '#C0C0D044'};
        color:${tab === _activeTab ? '#FFD700' : '#C0C0D0'};`;
      btn.addEventListener('click', () => {
        _activeTab = tab;
        // Update tab styles
        tabBar.querySelectorAll('button').forEach(b => {
          const active = b.dataset.tab === tab;
          b.style.borderColor = active ? '#FFD700' : '#C0C0D044';
          b.style.color       = active ? '#FFD700' : '#C0C0D0';
        });
        renderTabContent();
      });
      tabBar.appendChild(btn);
    });
    main.appendChild(tabBar);

    // ── Tab content container ──
    const content = document.createElement('div');
    content.id = 'shop-tab-content';
    content.style.cssText = 'width:100%;flex:1;';
    main.appendChild(content);

    renderTabContent();
  }

  // ══════════════════════════════════════════════════════════
  // TAB RENDERING
  // ══════════════════════════════════════════════════════════

  function renderTabContent() {
    cleanupTimers();
    const el = document.getElementById('shop-tab-content');
    if (!el) return;
    el.innerHTML = '';

    if (_activeTab === 'daily')   renderDailyTab(el);
    if (_activeTab === 'special') renderSpecialTab(el);
    if (_activeTab === 'history') renderHistoryTab(el);
  }

  // ── DAILY TAB ──
  function renderDailyTab(container) {
    // Header with countdown
    const hdr = document.createElement('div');
    hdr.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;width:100%;';
    hdr.innerHTML = `
      <div style="color:#C0C0D0;font-size:14px;letter-spacing:2px;">[ DAILY STOCK ]</div>
      <div style="color:#B8A9D0;font-size:12px;">
        Resets in: <span id="shop-daily-timer" style="color:#FFD700;">${timeUntilMidnight()}</span>
      </div>`;
    container.appendChild(hdr);

    // Start countdown
    _countdownRef = setInterval(() => {
      const el = document.getElementById('shop-daily-timer');
      if (el) el.textContent = timeUntilMidnight();
      else cleanupTimers();
    }, 1000);

    // Placeholder item grid — 6 cards
    const grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
      gap:14px;margin-bottom:14px;width:100%;`;

    for (let i = 0; i < 6; i++) {
      const card = document.createElement('div');
      card.style.cssText = `
        background:#12001A;border:1px solid #C0C0D0;
        padding:16px;font-family:'Courier New',monospace;
        display:flex;flex-direction:column;align-items:center;
        gap:8px;min-height:160px;
        transition:box-shadow 0.2s;cursor:default;`;
      card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 0 10px #7B2FBE44'; });
      card.addEventListener('mouseleave', () => { card.style.boxShadow = 'none'; });

      card.innerHTML = `
        <div style="font-size:28px;color:#C0C0D044;margin:8px 0;">[ ? ]</div>
        <div style="color:#fff;font-size:13px;">[ Coming Soon ]</div>
        <div style="color:#B8A9D0;font-size:11px;">Item</div>
        <div style="color:#FFD700;font-size:12px;">\u2014 \uD83D\uDC8E</div>
        <button disabled style="
          background:#0D0010;border:1px solid #FFD70044;color:#C0C0D044;
          font-family:'Courier New',monospace;font-size:12px;
          padding:4px 16px;cursor:default;letter-spacing:1px;
          opacity:0.4;">[ PURCHASE ]</button>`;
      grid.appendChild(card);
    }
    container.appendChild(grid);

    // Note
    const note = document.createElement('div');
    note.style.cssText = 'color:#B8A9D0;font-size:11px;text-align:center;width:100%;';
    note.textContent = '[ Daily stock will be available in a future update. ]';
    container.appendChild(note);
  }

  // ── SPECIAL TAB ──
  function renderSpecialTab(container) {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'margin-bottom:14px;width:100%;';
    hdr.innerHTML = '<div style="color:#FFD700;font-size:14px;letter-spacing:2px;">[ SPECIAL OFFERS ]</div>';
    container.appendChild(hdr);

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;width:100%;';

    // ── Fear Prevention Potion ──
    const potionOwned = (gameState.items || []).find(function (i) { return i.id === 'fear_prevention_potion'; });
    const potionCount = potionOwned ? potionOwned.count : 0;
    const purchaseHist = (gameState.shop && gameState.shop.purchaseHistory) || [];
    const hasFreePotion = !purchaseHist.some(function (p) { return p.itemId === 'fear_prevention_potion_free'; });

    const card = document.createElement('div');
    card.style.cssText =
      'background:#12001A;border:1px solid #7B2FBE;' +
      'padding:16px;font-family:\"Courier New\",monospace;' +
      'display:flex;flex-direction:column;align-items:center;gap:8px;' +
      'min-height:180px;transition:box-shadow 0.2s;cursor:default;';
    card.addEventListener('mouseenter', function () { card.style.boxShadow = '0 0 12px #7B2FBE66'; });
    card.addEventListener('mouseleave', function () { card.style.boxShadow = 'none'; });

    card.innerHTML =
      '<div style="font-size:32px;">\uD83E\uDDEA</div>' +
      '<div style="color:#fff;font-size:13px;font-weight:bold;">Fear Prevention Potion</div>' +
      '<div style="color:#B8A9D0;font-size:11px;text-align:center;line-height:1.4;">' +
        'Removes fear status from a hero.<br>Can be used before or during combat.' +
      '</div>' +
      '<div style="color:#C0C0D0;font-size:11px;">Owned: ' + potionCount + '</div>' +
      '<div style="color:#FFD700;font-size:12px;">' + (hasFreePotion ? 'FREE (first one!)' : '50 \uD83D\uDC8E') + '</div>';

    var buyBtn = document.createElement('button');
    buyBtn.style.cssText =
      'background:#1A0025;border:1px solid #FFD700;color:#FFD700;' +
      'font-family:\"Courier New\",monospace;font-size:12px;' +
      'padding:6px 20px;cursor:pointer;letter-spacing:1px;' +
      'transition:box-shadow 0.2s;margin-top:4px;';
    buyBtn.textContent = hasFreePotion ? '[ CLAIM FREE ]' : '[ PURCHASE ]';
    buyBtn.addEventListener('mouseenter', function () { buyBtn.style.boxShadow = '0 0 10px #FFD70066'; });
    buyBtn.addEventListener('mouseleave', function () { buyBtn.style.boxShadow = 'none'; });
    buyBtn.addEventListener('click', function () {
      var cost = hasFreePotion ? 0 : 50;
      if (!hasFreePotion && gameState.gems < cost) {
        alert('Not enough gems!');
        return;
      }
      gameState.gems -= cost;
      if (!Array.isArray(gameState.items)) gameState.items = [];
      var existing = gameState.items.find(function (i) { return i.id === 'fear_prevention_potion'; });
      if (existing) {
        existing.count++;
      } else {
        gameState.items.push({ id: 'fear_prevention_potion', name: 'Fear Prevention Potion', count: 1 });
      }
      // Record purchase
      purchaseHist.push({
        itemId: hasFreePotion ? 'fear_prevention_potion_free' : 'fear_prevention_potion',
        itemName: 'Fear Prevention Potion',
        type: 'consumable',
        cost: cost,
        timestamp: Date.now(),
      });
      saveGame();
      refreshShopGems();
      renderTabContent();
    });

    card.appendChild(buyBtn);
    grid.appendChild(card);

    // Placeholder for more items
    var soonCard = document.createElement('div');
    soonCard.style.cssText =
      'background:#12001A;border:1px solid #C0C0D033;' +
      'padding:24px;font-family:\"Courier New\",monospace;' +
      'text-align:center;display:flex;align-items:center;justify-content:center;' +
      'min-height:180px;';
    soonCard.innerHTML = '<div style="color:#B8A9D0;font-size:13px;">[ More items coming soon. ]</div>';
    grid.appendChild(soonCard);

    container.appendChild(grid);
  }

  // ── HISTORY TAB ──
  function renderHistoryTab(container) {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'margin-bottom:14px;width:100%;';
    hdr.innerHTML = '<div style="color:#C0C0D0;font-size:14px;letter-spacing:2px;">[ PURCHASE HISTORY ]</div>';
    container.appendChild(hdr);

    const hist = (gameState.shop && gameState.shop.purchaseHistory) || [];

    if (hist.length === 0) {
      const empty = document.createElement('div');
      empty.style.cssText = 'color:#B8A9D0;font-size:12px;text-align:center;padding:20px 0;width:100%;';
      empty.textContent = '[ No purchases made yet. ]';
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.style.cssText = 'width:100%;font-family:\'Courier New\',monospace;';
    const recent = hist.slice(-20).reverse();
    recent.forEach(entry => {
      const date = new Date(entry.timestamp).toLocaleDateString();
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #C0C0D011;font-size:12px;';
      row.innerHTML = `
        <span style="color:#C0C0D0;">${escHtml(entry.itemName || 'Unknown')} \u2014 ${entry.cost || 0} \uD83D\uDC8E</span>
        <span style="color:#B8A9D0;font-size:11px;">${date}</span>`;
      list.appendChild(row);
    });
    container.appendChild(list);
  }

  // ══════════════════════════════════════════════════════════
  // GEM DISPLAY REFRESH
  // ══════════════════════════════════════════════════════════

  function refreshShopGems() {
    const el = document.getElementById('shop-gem-display');
    if (el) el.textContent = `\uD83D\uDC8E ${gameState.gems} Gems`;
    updateGemsDisplay();   // bottom bar too
  }

  // ══════════════════════════════════════════════════════════
  // SCENE REGISTRATION
  // ══════════════════════════════════════════════════════════

  window.showShopScene    = showShopScene;
  window.refreshShopGems  = refreshShopGems;

  window.registerSceneShop = function () {
    console.log('[Shop] Scene registered.');
  };

})();
