// ═══════════════════════════════════════════════════════════
// PROMOTION SCENE
// ═══════════════════════════════════════════════════════════
// Elevate your heroes beyond their limits.
// Framework skeleton — no material costs, no balance values.

(function () {

  let _selectedHero = null;   // hero ID

  // ── helpers (shared from js/ui/helpers.js: RARITY_BORDER, escHtml, talentColor) ──

  // ── mini hero card (replicates roster card style) ──
  function buildPromoCard(hero, opts = {}) {
    const col   = RARITY_BORDER[hero.rarity] || '#C0C0D0';
    const stars = '★'.repeat(hero.rarity);
    const is7   = hero.rarity === 7;

    const wrapper = document.createElement('div');
    wrapper.className = 'hero-card';
    wrapper.dataset.heroId = hero.id;
    wrapper.style.cursor = opts.clickable ? 'pointer' : 'default';

    if (is7) {
      wrapper.style.cssText += 'background:linear-gradient(135deg,#FF4500,#FFD700);padding:2px;';
    } else {
      wrapper.style.border = `2px solid ${col}`;
    }

    const inner = document.createElement('div');
    inner.style.cssText = is7
      ? 'width:100%;height:100%;background:#12001A;position:relative;display:flex;flex-direction:column;'
      : 'width:100%;height:100%;position:relative;display:flex;flex-direction:column;';

    const art = document.createElement('div');
    art.className = 'hero-card-art';
    art.style.borderBottomColor = is7 ? '#FF650044' : col + '44';
    art.textContent = '[ Art ]';
    inner.appendChild(art);

    const body = document.createElement('div');
    body.className = 'hero-card-body';
    body.innerHTML = `
      <div class="hero-card-name">${escHtml(hero.name)}</div>
      <div class="hero-card-stars" style="color:${col}">${stars}</div>
      <div class="hero-card-class">${escHtml(hero.class)}</div>
      <div class="hero-card-level">Lv. ${hero.level}</div>`;
    inner.appendChild(body);

    if (window.debugMode) {
      const db = document.createElement('div');
      db.className   = 'hero-card-debug';
      db.style.color = talentColor(hero.talent);
      db.textContent = `T: ${hero.talent}`;
      inner.appendChild(db);
    }

    wrapper.appendChild(inner);

    // × deselect button
    if (opts.showDeselect) {
      const xBtn = document.createElement('div');
      xBtn.style.cssText = `
        position:absolute;top:4px;right:6px;z-index:5;
        cursor:pointer;font-size:14px;color:#FF4444;
        font-family:'Courier New',monospace;font-weight:bold;`;
      xBtn.textContent = '×';
      xBtn.title = 'Deselect';
      xBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (opts.onDeselect) opts.onDeselect();
      });
      wrapper.appendChild(xBtn);
    }

    return wrapper;
  }

  // ── star row builder ──
  function buildStarRow(rarity) {
    const col   = RARITY_BORDER[rarity] || '#C0C0D0';
    const stars = '★'.repeat(rarity);
    return `<span style="color:${col};font-size:16px;letter-spacing:2px;">${stars}</span>`;
  }

  // ══════════════════════════════════════════════════════════
  // MAIN SCENE RENDER
  // ══════════════════════════════════════════════════════════

  function showPromotionScene() {
    const main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';

    main.innerHTML = '';

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;gap:14px;margin-bottom:18px;width:100%;';
    header.innerHTML = `
      <div style="width:90px;flex-shrink:0;"></div>
      <div style="flex:1;text-align:center;">
        <div style="color:#fff;font-size:18px;letter-spacing:3px;font-weight:bold;">[ PROMOTION ]</div>
        <div style="color:#B8A9D0;font-size:12px;margin-top:4px;">Elevate your heroes beyond their limits.</div>
      </div>
      <div style="width:90px;flex-shrink:0;"></div>`;
    main.appendChild(header);

    // ── Hero slot (centered) ──
    const slotSection = document.createElement('div');
    slotSection.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;margin-bottom:22px;width:100%;';
    slotSection.innerHTML = '<div style="color:#C0C0D0;font-size:13px;letter-spacing:2px;">[ SELECT HERO ]</div>';

    const heroSlot = document.createElement('div');
    heroSlot.id = 'promo-hero-slot';
    heroSlot.style.cssText = `
      width:180px;height:240px;
      border:2px dashed #C0C0D0;
      display:flex;align-items:center;justify-content:center;
      color:#B8A9D0;font-size:13px;cursor:pointer;
      font-family:'Courier New',monospace;
      background:#12001A;`;
    heroSlot.textContent = '[ Select Hero ]';
    heroSlot.addEventListener('click', () => openHeroPicker());
    slotSection.appendChild(heroSlot);
    main.appendChild(slotSection);

    // ── Preview panel ──
    const preview = document.createElement('div');
    preview.id = 'promo-preview';
    preview.style.cssText = `
      background:#12001A;border:1px solid #C0C0D0;
      padding:14px 18px;margin-bottom:18px;width:100%;
      box-sizing:border-box;font-family:'Courier New',monospace;
      box-shadow:0 0 8px #7B2FBE44;`;
    main.appendChild(preview);

    // ── Action button ──
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:center;margin-bottom:24px;width:100%;';
    const promoBtn = document.createElement('button');
    promoBtn.id = 'promo-action-btn';
    promoBtn.textContent = '[ PROMOTE ]';
    promoBtn.disabled = true;
    promoBtn.style.cssText = `
      background:#0D0010;border:2px solid #FFD700;color:#fff;
      font-family:'Courier New',monospace;font-size:15px;
      padding:8px 32px;cursor:pointer;letter-spacing:2px;
      opacity:0.4;transition:opacity 0.2s, box-shadow 0.2s;`;
    promoBtn.addEventListener('mouseenter', () => {
      if (!promoBtn.disabled) promoBtn.style.boxShadow = '0 0 14px #7B2FBE';
    });
    promoBtn.addEventListener('mouseleave', () => { promoBtn.style.boxShadow = 'none'; });
    promoBtn.addEventListener('click', () => { if (!promoBtn.disabled) openConfirmOverlay(); });
    btnRow.appendChild(promoBtn);
    main.appendChild(btnRow);

    // Initial render
    refreshSlot();
    refreshPreview();
  }

  // ══════════════════════════════════════════════════════════
  // SLOT REFRESH
  // ══════════════════════════════════════════════════════════

  function refreshSlot() {
    const slot = document.getElementById('promo-hero-slot');
    if (!slot) return;

    if (_selectedHero) {
      const hero = gameState.inventory.find(i => i.id === _selectedHero && i.type === 'hero');
      if (hero) {
        slot.innerHTML = '';
        slot.style.border = 'none';
        slot.style.cursor = 'default';
        const card = buildPromoCard(hero, {
          showDeselect: true,
          onDeselect: () => { _selectedHero = null; refreshAll(); }
        });
        slot.appendChild(card);
      } else {
        _selectedHero = null;
      }
    }

    if (!_selectedHero) {
      slot.innerHTML = '[ Select Hero ]';
      slot.style.border = '2px dashed #C0C0D0';
      slot.style.cursor = 'pointer';
      slot.onclick = () => openHeroPicker();
    }
  }

  // ══════════════════════════════════════════════════════════
  // PREVIEW PANEL
  // ══════════════════════════════════════════════════════════

  function refreshPreview() {
    const el = document.getElementById('promo-preview');
    if (!el) return;

    if (!_selectedHero) {
      el.innerHTML = `
        <div style="color:#C0C0D0;font-size:13px;letter-spacing:2px;margin-bottom:8px;">[ PROMOTION PREVIEW ]</div>
        <div style="color:#B8A9D0;font-size:12px;text-align:center;padding:12px 0;">
          [ Select a hero to preview promotion. ]
        </div>`;
      return;
    }

    const hero = gameState.inventory.find(i => i.id === _selectedHero && i.type === 'hero');
    if (!hero) return;

    const heroName = escHtml(hero.name);
    const isMax    = hero.rarity >= 7;
    const curStars = buildStarRow(hero.rarity);
    const newStars = isMax ? '' : buildStarRow(hero.rarity + 1);

    let rankHtml;
    if (isMax) {
      rankHtml = `
        <div style="margin-bottom:10px;">
          <span style="color:#B8A9D0;font-size:12px;">Current rank:</span>
          <span style="margin-left:8px;">${curStars}</span>
        </div>
        <div style="color:#FFD700;font-size:13px;margin-bottom:10px;">
          [ This hero has reached maximum rank. ]
        </div>`;
    } else {
      rankHtml = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap;">
          <div>
            <span style="color:#B8A9D0;font-size:12px;">Current rank:</span>
            <span style="margin-left:6px;">${curStars}</span>
          </div>
          <span style="color:#FFD700;font-size:16px;font-weight:bold;">\u2192</span>
          <div>
            <span style="color:#B8A9D0;font-size:12px;">After:</span>
            <span style="margin-left:6px;">${newStars}</span>
          </div>
        </div>`;
    }

    el.innerHTML = `
      <div style="color:#C0C0D0;font-size:13px;letter-spacing:2px;margin-bottom:10px;">[ PROMOTION PREVIEW ]</div>
      <div style="color:#fff;font-size:13px;margin-bottom:8px;">${heroName} \u2014 ${escHtml(hero.class)}</div>
      ${rankHtml}
      <div style="border-top:1px solid #C0C0D022;padding-top:8px;font-size:12px;color:#B8A9D0;">
        <div style="margin-bottom:4px;">Materials required: <span style="color:#C0C0D0;">[ To be implemented ]</span></div>
        <div style="margin-bottom:4px;">Memory recovery: <span style="color:#C0C0D0;">[ To be implemented ]</span></div>
        <div style="margin-bottom:4px;">New skills: <span style="color:#C0C0D0;">[ To be implemented ]</span></div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // ACTION BUTTON
  // ══════════════════════════════════════════════════════════

  function refreshActionButton() {
    const btn = document.getElementById('promo-action-btn');
    if (!btn) return;
    let ready = false;
    if (_selectedHero) {
      const hero = gameState.inventory.find(i => i.id === _selectedHero && i.type === 'hero');
      if (hero && hero.rarity < 7) ready = true;
    }
    btn.disabled = !ready;
    btn.style.opacity = ready ? '1' : '0.4';
    btn.style.display = '';
    // Hide button entirely if hero is 7★
    if (_selectedHero) {
      const hero = gameState.inventory.find(i => i.id === _selectedHero && i.type === 'hero');
      if (hero && hero.rarity >= 7) btn.style.display = 'none';
    }
  }

  function refreshAll() {
    refreshSlot();
    refreshPreview();
    refreshActionButton();
  }

  // ══════════════════════════════════════════════════════════
  // HERO PICKER
  // ══════════════════════════════════════════════════════════

  function openHeroPicker() {
    const eligible = gameState.inventory.filter(i => {
      if (i.type !== 'hero') return false;
      if (i.inParty)   return false;
      if (i.inDungeon) return false;
      if (i.rarity >= 7) return false;
      return true;
    });

    // Sort options
    let sortMode = 'rarity';

    const overlay = document.createElement('div');
    overlay.id = 'promo-picker-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:900;
      background:rgba(0,0,0,0.85);
      display:flex;align-items:center;justify-content:center;`;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#12001A;border:1px solid #C0C0D0;
      width:90%;max-width:680px;max-height:80vh;
      padding:18px;font-family:'Courier New',monospace;
      display:flex;flex-direction:column;`;

    // Header
    const headerDiv = document.createElement('div');
    headerDiv.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;';
    headerDiv.innerHTML = `
      <div style="color:#C0C0D0;font-size:14px;letter-spacing:2px;">[ SELECT HERO TO PROMOTE ]</div>
      <div id="promo-picker-close" style="color:#C0C0D0;cursor:pointer;font-size:16px;">[ \u00d7 ]</div>`;
    panel.appendChild(headerDiv);

    // Sort bar
    const sortBar = document.createElement('div');
    sortBar.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';
    ['rarity', 'level', 'recent'].forEach(mode => {
      const label = mode === 'rarity' ? 'Rarity \u2605' : mode === 'level' ? 'Level' : 'Recent';
      const btn = document.createElement('button');
      btn.textContent = `[ ${label} ]`;
      btn.style.cssText = `
        background:none;border:1px solid ${mode === sortMode ? '#FFD700' : '#C0C0D044'};
        color:${mode === sortMode ? '#FFD700' : '#C0C0D0'};
        font-family:'Courier New',monospace;font-size:11px;
        padding:2px 10px;cursor:pointer;`;
      btn.addEventListener('click', () => {
        sortMode = mode;
        renderGrid();
        sortBar.querySelectorAll('button').forEach(b => {
          const isActive = b.textContent.includes(label);
          b.style.borderColor = isActive ? '#FFD700' : '#C0C0D044';
          b.style.color       = isActive ? '#FFD700' : '#C0C0D0';
        });
      });
      sortBar.appendChild(btn);
    });
    panel.appendChild(sortBar);

    // Grid
    const grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
      gap:10px;overflow-y:auto;flex:1;padding-right:4px;`;
    panel.appendChild(grid);

    function renderGrid() {
      const sorted = [...eligible];
      if (sortMode === 'rarity')  sorted.sort((a, b) => b.rarity - a.rarity);
      if (sortMode === 'level')   sorted.sort((a, b) => b.level - a.level);
      // 'recent' keeps original order (newest last in inventory → reverse)
      if (sortMode === 'recent')  sorted.reverse();

      grid.innerHTML = '';
      if (sorted.length === 0) {
        grid.innerHTML = '<div style="color:#B8A9D0;font-size:12px;grid-column:1/-1;text-align:center;padding:20px 0;">[ No eligible heroes ]</div>';
        return;
      }
      sorted.forEach(hero => {
        const card = buildPromoCard(hero, { clickable: true });
        card.addEventListener('click', () => {
          _selectedHero = hero.id;
          overlay.remove();
          refreshAll();
        });
        grid.appendChild(card);
      });
    }

    renderGrid();

    overlay.appendChild(panel);
    document.getElementById('ui-layer').appendChild(overlay);

    // Close
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    panel.querySelector('#promo-picker-close').addEventListener('click', () => overlay.remove());
  }

  // ══════════════════════════════════════════════════════════
  // CONFIRM OVERLAY
  // ══════════════════════════════════════════════════════════

  function openConfirmOverlay() {
    const hero = gameState.inventory.find(i => i.id === _selectedHero && i.type === 'hero');
    if (!hero || hero.rarity >= 7) return;

    const overlay = document.createElement('div');
    overlay.id = 'promo-confirm-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:950;
      background:rgba(0,0,0,0.9);
      display:flex;align-items:center;justify-content:center;`;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#12001A;border:1px solid #C0C0D0;
      padding:24px 28px;max-width:420px;width:90%;
      font-family:'Courier New',monospace;text-align:center;`;

    const heroName = escHtml(hero.name);
    const curStars = buildStarRow(hero.rarity);
    const newStars = buildStarRow(hero.rarity + 1);

    panel.innerHTML = `
      <div style="color:#fff;font-size:15px;letter-spacing:2px;margin-bottom:16px;">[ CONFIRM PROMOTION ]</div>
      <div style="color:#C0C0D0;font-size:13px;margin-bottom:10px;">
        ${heroName} will be promoted from ${hero.rarity}\u2605 to ${hero.rarity + 1}\u2605
      </div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:14px;">
        ${curStars}
        <span style="color:#FFD700;font-size:18px;font-weight:bold;">\u2192</span>
        ${newStars}
      </div>
      <div style="color:#B8A9D0;font-size:12px;margin-bottom:18px;">
        Required materials: [ To be implemented ]
      </div>
      <div style="display:flex;justify-content:center;gap:16px;">
        <button id="promo-confirm-yes" style="
          background:#0D0010;border:2px solid #FFD700;color:#fff;
          font-family:'Courier New',monospace;font-size:14px;
          padding:6px 24px;cursor:pointer;letter-spacing:1px;">[ CONFIRM ]</button>
        <button id="promo-confirm-no" style="
          background:#0D0010;border:1px solid #C0C0D0;color:#C0C0D0;
          font-family:'Courier New',monospace;font-size:14px;
          padding:6px 24px;cursor:pointer;letter-spacing:1px;">[ CANCEL ]</button>
      </div>`;

    overlay.appendChild(panel);
    document.getElementById('ui-layer').appendChild(overlay);

    document.getElementById('promo-confirm-no').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('promo-confirm-yes').addEventListener('click', () => {
      overlay.remove();
      executePromotion();
    });
  }

  // ══════════════════════════════════════════════════════════
  // EXECUTE + RESULT OVERLAY
  // ══════════════════════════════════════════════════════════

  function executePromotion() {
    const result = performPromotion(_selectedHero);
    if (!result.ok) {
      console.warn('[Promotion] Failed:', result.reason);
      return;
    }
    openResultOverlay();
  }

  function openResultOverlay() {
    const hero = gameState.inventory.find(i => i.id === _selectedHero && i.type === 'hero');
    if (!hero) return;

    const heroName = escHtml(hero.name);
    const oldRarity = hero.rarity - 1;  // we already incremented
    const newRarity = hero.rarity;
    const oldStars  = buildStarRow(oldRarity);
    const newStars  = buildStarRow(newRarity);

    const overlay = document.createElement('div');
    overlay.id = 'promo-result-overlay';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:960;
      background:rgba(0,0,0,0.9);
      display:flex;align-items:center;justify-content:center;`;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background:#12001A;border:1px solid #FFD700;
      padding:24px 28px;max-width:420px;width:90%;
      font-family:'Courier New',monospace;text-align:center;`;

    panel.innerHTML = `
      <div style="color:#FFD700;font-size:15px;letter-spacing:2px;margin-bottom:16px;">[ PROMOTION COMPLETE ]</div>
      <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:14px;">
        ${oldStars}
        <span style="color:#FFD700;font-size:18px;font-weight:bold;">\u2192</span>
        <span id="promo-new-stars" style="opacity:0;transition:opacity 0.6s ease;">${newStars}</span>
      </div>
      <div style="color:#fff;font-size:14px;margin-bottom:14px;">
        ${heroName} is now ${newRarity}\u2605!
      </div>
      <div style="border-top:1px solid #C0C0D022;padding-top:10px;font-size:12px;color:#B8A9D0;text-align:left;">
        <div style="margin-bottom:6px;">Memory recovery: <span style="color:#C0C0D0;">[ To be implemented ]</span></div>
        <div style="margin-bottom:6px;">New skills: <span style="color:#C0C0D0;">[ To be implemented ]</span></div>
      </div>
      <div style="margin-top:18px;">
        <button id="promo-result-ok" style="
          background:#0D0010;border:2px solid #FFD700;color:#fff;
          font-family:'Courier New',monospace;font-size:14px;
          padding:6px 28px;cursor:pointer;letter-spacing:1px;">[ OK ]</button>
      </div>`;

    overlay.appendChild(panel);
    document.getElementById('ui-layer').appendChild(overlay);

    // Animate new stars fading in with a pulse
    requestAnimationFrame(() => {
      const newStarsEl = document.getElementById('promo-new-stars');
      if (newStarsEl) {
        setTimeout(() => {
          newStarsEl.style.opacity = '1';
          newStarsEl.style.textShadow = '0 0 16px #FFD700';
          setTimeout(() => { newStarsEl.style.textShadow = ''; }, 800);
        }, 300);
      }
    });

    document.getElementById('promo-result-ok').addEventListener('click', () => {
      overlay.remove();
      _selectedHero = null;
      showPromotionScene();
    });
  }

  // ══════════════════════════════════════════════════════════
  // SCENE REGISTRATION
  // ══════════════════════════════════════════════════════════

  window.showPromotionScene = showPromotionScene;

  window.registerScenePromotion = function () {
    console.log('[Promotion] Scene registered.');
  };

})();
