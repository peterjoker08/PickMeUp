// ═══════════════════════════════════════════════════════════
// SYNTHESIS SCENE
// ═══════════════════════════════════════════════════════════
// Sacrifice a hero to strengthen another.

(function () {

  let _selectedBase      = null;   // hero ID
  let _selectedSacrifice = null;   // hero ID
  let _pickMode          = 'base'; // 'base' | 'sacrifice' | null

  // ── helpers (shared from js/ui/helpers.js: RARITY_BORDER, escHtml, talentColor) ──

  // ── compact hero card for the slots ──
  function buildSlotCard(hero, opts = {}) {
    const col   = RARITY_BORDER[hero.rarity] || '#C0C0D0';
    const stars = '★'.repeat(Math.min(hero.rarity, 7));

    const el = document.createElement('div');
    el.style.cssText = `
      width:100%;height:100%;display:flex;flex-direction:column;
      align-items:center;justify-content:center;gap:4px;
      font-family:'Courier New',monospace;position:relative;`;

    const artBg = opts.redTint ? 'rgba(255,0,0,0.06)' : '#080010';
    el.innerHTML =
      '<div style="width:100%;height:60px;background:' + artBg + ';display:flex;align-items:center;justify-content:center;font-size:10px;color:#1A0025;letter-spacing:1px;border-bottom:1px solid ' + (opts.redTint ? '#FF444444' : col + '44') + '">[ Art ]</div>' +
      '<div style="color:#fff;font-size:11px;text-align:center;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:4px">' + escHtml(hero.name) + '</div>' +
      '<div style="color:' + (opts.redTint ? '#FF4444' : col) + ';font-size:10px;letter-spacing:1px">' + stars + '</div>' +
      '<div style="color:#B8A9D0;font-size:9px">' + escHtml(hero.class) + '</div>' +
      '<div style="color:#C0C0D066;font-size:9px">Lv. ' + hero.level + '</div>';

    // × deselect button
    if (opts.showDeselect) {
      const x = document.createElement('div');
      x.style.cssText = 'position:absolute;top:2px;right:4px;cursor:pointer;font-size:14px;color:#FF4444;font-family:\'Courier New\',monospace;font-weight:bold;z-index:5;';
      x.textContent = '×';
      x.title = 'Deselect';
      x.addEventListener('click', e => {
        e.stopPropagation();
        if (opts.onDeselect) opts.onDeselect();
      });
      el.appendChild(x);
    }

    return el;
  }

  // ══════════════════════════════════════════════════════════
  // MAIN SCENE
  // ══════════════════════════════════════════════════════════

  function showSynthesisScene() {
    _pickMode = _selectedBase ? (_selectedSacrifice ? null : 'sacrifice') : 'base';

    const main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';
    main.innerHTML = '';

    // ── Header ──
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:14px;width:100%;';
    header.innerHTML =
      '<div style="color:#fff;font-size:16px;letter-spacing:3px;font-weight:bold;font-family:\'Courier New\',monospace">[ SYNTHESIS ]</div>' +
      '<div style="color:#B8A9D0;font-size:11px;margin-top:4px;font-family:\'Courier New\',monospace">Sacrifice a hero to strengthen another.</div>';
    main.appendChild(header);

    // ── Slots row ──
    const slotsRow = document.createElement('div');
    slotsRow.style.cssText = 'display:flex;align-items:stretch;justify-content:center;gap:20px;margin-bottom:14px;width:100%;';

    // Base slot
    const baseWrap = document.createElement('div');
    baseWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
    const baseLabel = document.createElement('div');
    baseLabel.style.cssText = 'color:' + (_pickMode === 'base' ? '#FFD700' : '#C0C0D0') + ';font-size:11px;letter-spacing:2px;font-family:\'Courier New\',monospace;transition:color 0.2s';
    baseLabel.textContent = '[ BASE ]';
    baseWrap.appendChild(baseLabel);

    const baseSlot = document.createElement('div');
    baseSlot.id = 'synth-base-slot';
    const baseSelected = _selectedBase && gameState.inventory.find(i => i.id === _selectedBase && i.type === 'hero');
    if (baseSelected) {
      baseSlot.style.cssText = 'width:130px;height:150px;border:2px solid #C0C0D0;background:#12001A;overflow:hidden;';
      baseSlot.appendChild(buildSlotCard(baseSelected, {
        showDeselect: true,
        onDeselect: () => { _selectedBase = null; showSynthesisScene(); },
      }));
    } else {
      baseSlot.style.cssText = 'width:130px;height:150px;border:2px dashed ' + (_pickMode === 'base' ? '#FFD700' : '#C0C0D044') + ';display:flex;align-items:center;justify-content:center;color:#B8A9D066;font-size:11px;cursor:pointer;font-family:\'Courier New\',monospace;background:#12001A;transition:border-color 0.2s;';
      baseSlot.textContent = '[ Select ]';
      baseSlot.addEventListener('click', () => { _pickMode = 'base'; showSynthesisScene(); });
    }
    baseWrap.appendChild(baseSlot);
    slotsRow.appendChild(baseWrap);

    // Arrow
    const arrow = document.createElement('div');
    arrow.style.cssText = 'font-size:20px;color:#FFD700;font-family:\'Courier New\',monospace;font-weight:bold;align-self:center;margin-top:14px;';
    arrow.textContent = '←';
    slotsRow.appendChild(arrow);

    // Sacrifice slot
    const sacWrap = document.createElement('div');
    sacWrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;';
    const sacLabel = document.createElement('div');
    sacLabel.style.cssText = 'color:' + (_pickMode === 'sacrifice' ? '#FF4444' : '#FF444488') + ';font-size:11px;letter-spacing:2px;font-family:\'Courier New\',monospace;transition:color 0.2s';
    sacLabel.textContent = '[ SACRIFICE ]';
    sacWrap.appendChild(sacLabel);

    const sacSlot = document.createElement('div');
    sacSlot.id = 'synth-sac-slot';
    const sacSelected = _selectedSacrifice && gameState.inventory.find(i => i.id === _selectedSacrifice && i.type === 'hero');
    if (sacSelected) {
      sacSlot.style.cssText = 'width:130px;height:150px;border:2px solid #FF4444;background:#12001A;overflow:hidden;';
      sacSlot.appendChild(buildSlotCard(sacSelected, {
        redTint: true,
        showDeselect: true,
        onDeselect: () => { _selectedSacrifice = null; showSynthesisScene(); },
      }));
    } else {
      sacSlot.style.cssText = 'width:130px;height:150px;border:2px dashed ' + (_pickMode === 'sacrifice' ? '#FF4444' : '#FF444433') + ';display:flex;align-items:center;justify-content:center;color:#FF444444;font-size:11px;cursor:pointer;font-family:\'Courier New\',monospace;background:#12001A;transition:border-color 0.2s;';
      sacSlot.textContent = '[ Select ]';
      sacSlot.addEventListener('click', () => { _pickMode = 'sacrifice'; showSynthesisScene(); });
    }
    sacWrap.appendChild(sacSlot);
    slotsRow.appendChild(sacWrap);

    main.appendChild(slotsRow);

    // ── Synthesize button ──
    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;justify-content:center;margin-bottom:14px;width:100%;';
    const synthBtn = document.createElement('button');
    synthBtn.id = 'synth-action-btn';
    const ready = !!_selectedBase && !!_selectedSacrifice;
    synthBtn.textContent = '[ SYNTHESIZE ]';
    synthBtn.disabled = !ready;
    synthBtn.style.cssText =
      'background:#0D0010;border:2px solid #FFD700;color:#fff;' +
      'font-family:\'Courier New\',monospace;font-size:14px;' +
      'padding:7px 28px;cursor:pointer;letter-spacing:2px;' +
      'opacity:' + (ready ? '1' : '0.3') + ';transition:opacity 0.2s, box-shadow 0.2s;';
    synthBtn.addEventListener('mouseenter', () => { if (!synthBtn.disabled) synthBtn.style.boxShadow = '0 0 14px #7B2FBE'; });
    synthBtn.addEventListener('mouseleave', () => { synthBtn.style.boxShadow = 'none'; });
    synthBtn.addEventListener('click', () => { if (!synthBtn.disabled) openConfirmOverlay(); });
    btnRow.appendChild(synthBtn);
    main.appendChild(btnRow);

    // ── Divider + pick-mode indicator ──
    const divider = document.createElement('div');
    const pickLabel = _pickMode === 'base'
      ? '<span style="color:#FFD700">Select a base hero</span> — this hero will be strengthened.'
      : _pickMode === 'sacrifice'
        ? '<span style="color:#FF4444">Select a sacrifice hero</span> — this hero will be consumed.'
        : '<span style="color:#4CAF50">Ready to synthesize.</span>';
    divider.style.cssText = 'width:100%;border-top:1px solid #C0C0D022;padding-top:10px;margin-bottom:10px;font-family:\'Courier New\',monospace;font-size:11px;color:#B8A9D0;text-align:center;';
    divider.innerHTML = pickLabel;
    main.appendChild(divider);

    // ── Hero Grid (inline, no overlay) ──
    const grid = document.createElement('div');
    grid.id = 'synth-hero-grid';
    grid.style.cssText =
      'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));' +
      'gap:8px;width:100%;overflow-y:auto;flex:1;padding-bottom:12px;';

    const heroes = gameState.inventory.filter(i => {
      if (i.type !== 'hero') return false;
      if (i.id === _selectedBase) return false;
      if (i.id === _selectedSacrifice) return false;
      return true;
    });

    if (heroes.length === 0) {
      grid.innerHTML = '<div style="color:#B8A9D066;font-size:11px;grid-column:1/-1;text-align:center;padding:24px 0;font-family:\'Courier New\',monospace">[ No heroes available ]</div>';
    } else {
      heroes.forEach(hero => {
        const col = RARITY_BORDER[hero.rarity] || '#C0C0D0';
        const stars = '★'.repeat(Math.min(hero.rarity, 7));
        const isSac = _pickMode === 'sacrifice';

        const card = document.createElement('div');
        card.style.cssText =
          'background:#12001A;border:1px solid ' + (isSac ? '#FF444444' : '#C0C0D022') + ';' +
          'cursor:pointer;font-family:\'Courier New\',monospace;padding:8px 6px;' +
          'display:flex;flex-direction:column;align-items:center;gap:3px;' +
          'transition:border-color 0.15s,box-shadow 0.15s;';

        card.innerHTML =
          '<div style="color:#fff;font-size:11px;text-align:center;max-width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escHtml(hero.name) + '</div>' +
          '<div style="color:' + col + ';font-size:10px;letter-spacing:1px">' + stars + '</div>' +
          '<div style="color:#B8A9D0;font-size:9px">' + escHtml(hero.class) + '</div>' +
          '<div style="color:#C0C0D044;font-size:9px">Lv. ' + hero.level + '</div>';

        card.addEventListener('mouseenter', () => {
          card.style.borderColor = isSac ? '#FF4444' : '#FFD700';
          card.style.boxShadow = '0 0 8px ' + (isSac ? '#FF444444' : '#FFD70044');
        });
        card.addEventListener('mouseleave', () => {
          card.style.borderColor = isSac ? '#FF444444' : '#C0C0D022';
          card.style.boxShadow = 'none';
        });

        card.addEventListener('click', () => {
          if (_pickMode === 'base') {
            _selectedBase = hero.id;
            _pickMode = _selectedSacrifice ? null : 'sacrifice';
          } else if (_pickMode === 'sacrifice') {
            _selectedSacrifice = hero.id;
            _pickMode = _selectedBase ? null : 'base';
          } else {
            // Both slots full — do nothing (must deselect first)
            return;
          }
          showSynthesisScene();
        });

        grid.appendChild(card);
      });
    }

    main.appendChild(grid);
  }

  // ══════════════════════════════════════════════════════════
  // CONFIRM OVERLAY
  // ══════════════════════════════════════════════════════════

  function openConfirmOverlay() {
    const base = gameState.inventory.find(i => i.id === _selectedBase && i.type === 'hero');
    const sac  = gameState.inventory.find(i => i.id === _selectedSacrifice && i.type === 'hero');
    if (!base || !sac) return;

    const overlay = document.createElement('div');
    overlay.id = 'synth-confirm-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:950;' +
      'background:rgba(0,0,0,0.9);' +
      'display:flex;align-items:center;justify-content:center;' +
      'pointer-events:all;';

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#12001A;border:1px solid #C0C0D0;' +
      'padding:24px 28px;max-width:420px;width:90%;' +
      'font-family:\'Courier New\',monospace;text-align:center;';

    const baseName = escHtml(base.name);
    const sacName  = escHtml(sac.name);

    panel.innerHTML =
      '<div style="color:#fff;font-size:15px;letter-spacing:2px;margin-bottom:16px">[ CONFIRM SYNTHESIS ]</div>' +
      '<div style="color:#C0C0D0;font-size:13px;margin-bottom:10px">' + baseName + ' will absorb ' + sacName + '.</div>' +
      '<div style="color:#FF4444;font-size:12px;margin-bottom:6px">This action cannot be undone.</div>' +
      '<div style="color:#FF4444;font-size:12px;margin-bottom:22px">[ ' + sacName + ' will be permanently deleted. ]</div>' +
      '<div style="display:flex;justify-content:center;gap:16px;">' +
        '<button id="synth-confirm-yes" style="background:#0D0010;border:2px solid #FF4444;color:#fff;font-family:\'Courier New\',monospace;font-size:14px;padding:6px 24px;cursor:pointer;letter-spacing:1px">[ CONFIRM ]</button>' +
        '<button id="synth-confirm-no" style="background:#0D0010;border:1px solid #C0C0D0;color:#C0C0D0;font-family:\'Courier New\',monospace;font-size:14px;padding:6px 24px;cursor:pointer;letter-spacing:1px">[ CANCEL ]</button>' +
      '</div>';

    overlay.appendChild(panel);
    document.getElementById('ui-layer').appendChild(overlay);

    document.getElementById('synth-confirm-no').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    document.getElementById('synth-confirm-yes').addEventListener('click', () => {
      overlay.remove();
      executeSynthesis();
    });
  }

  // ══════════════════════════════════════════════════════════
  // EXECUTE + RESULT OVERLAY
  // ══════════════════════════════════════════════════════════

  function executeSynthesis() {
    const result = performSynthesis(_selectedBase, _selectedSacrifice);
    if (!result.ok) {
      console.warn('[Synthesis] Failed:', result.reason);
      // Show error feedback to the user
      var errOverlay = document.createElement('div');
      errOverlay.id = 'synth-error-overlay';
      errOverlay.style.cssText =
        'position:fixed;inset:0;z-index:960;' +
        'background:rgba(0,0,0,0.85);' +
        'display:flex;align-items:center;justify-content:center;' +
        'pointer-events:all;';
      var errPanel = document.createElement('div');
      errPanel.style.cssText =
        'background:#12001A;border:1px solid #FF4444;' +
        'padding:24px 28px;max-width:400px;width:90%;' +
        "font-family:'Courier New',monospace;text-align:center;";
      errPanel.innerHTML =
        '<div style="color:#FF4444;font-size:15px;letter-spacing:2px;margin-bottom:14px">[ SYNTHESIS FAILED ]</div>' +
        '<div style="color:#C0C0D0;font-size:12px;margin-bottom:18px">' + escHtml(result.reason) + '</div>' +
        '<button id="synth-error-ok" style="background:#0D0010;border:2px solid #C0C0D0;color:#fff;' +
        "font-family:'Courier New',monospace;font-size:13px;padding:6px 24px;cursor:pointer;letter-spacing:1px\">[ OK ]</button>";
      errOverlay.appendChild(errPanel);
      document.getElementById('ui-layer').appendChild(errOverlay);
      document.getElementById('synth-error-ok').addEventListener('click', function () { errOverlay.remove(); });
      errOverlay.addEventListener('click', function (e) { if (e.target === errOverlay) errOverlay.remove(); });
      return;
    }
    openResultOverlay(result.result);
  }

  function openResultOverlay(result) {
    const base = gameState.inventory.find(i => i.id === _selectedBase && i.type === 'hero');
    const baseName = base ? escHtml(base.name) : 'Hero';

    const overlay = document.createElement('div');
    overlay.id = 'synth-result-overlay';
    overlay.style.cssText =
      'position:fixed;inset:0;z-index:960;' +
      'background:rgba(0,0,0,0.9);' +
      'display:flex;align-items:center;justify-content:center;' +
      'pointer-events:all;';

    const panel = document.createElement('div');
    panel.style.cssText =
      'background:#12001A;border:1px solid #FFD700;' +
      'padding:24px 28px;max-width:420px;width:90%;' +
      'font-family:\'Courier New\',monospace;text-align:center;';

    panel.innerHTML =
      '<div style="color:#FFD700;font-size:15px;letter-spacing:2px;margin-bottom:16px">[ SYNTHESIS COMPLETE ]</div>' +
      '<div style="color:#fff;font-size:13px;margin-bottom:14px">' + baseName + ' has been strengthened!</div>' +
      '<div style="border-top:1px solid #C0C0D022;padding-top:10px;font-size:12px;color:#B8A9D0;text-align:left;">' +
        '<div style="margin-bottom:6px">Stat boosts: <span style="color:#C0C0D0">[ To be calculated ]</span></div>' +
        '<div style="margin-bottom:6px">Skill inherited: <span style="color:#C0C0D0">[ To be implemented ]</span></div>' +
        '<div style="margin-bottom:6px">Talent influence: <span style="color:#C0C0D0">[ To be implemented ]</span></div>' +
      '</div>' +
      '<div style="margin-top:18px">' +
        '<button id="synth-result-ok" style="background:#0D0010;border:2px solid #FFD700;color:#fff;font-family:\'Courier New\',monospace;font-size:14px;padding:6px 28px;cursor:pointer;letter-spacing:1px">[ OK ]</button>' +
      '</div>';

    overlay.appendChild(panel);
    document.getElementById('ui-layer').appendChild(overlay);

    document.getElementById('synth-result-ok').addEventListener('click', () => {
      overlay.remove();
      _selectedBase      = null;
      _selectedSacrifice = null;
      showSynthesisScene();
    });
  }

  // ══════════════════════════════════════════════════════════
  // SCENE REGISTRATION
  // ══════════════════════════════════════════════════════════

  window.showSynthesisScene = showSynthesisScene;

  window.registerSceneSynthesis = function () {
    console.log('[Synthesis] Scene registered.');
  };

})();
