// ═══════════════════════════════════════════════════════════
// TOWER SCENE
// ═══════════════════════════════════════════════════════════

let _towerViewFloor = 1;
let _combatTimeout  = null;   // guard against nav-away

// ─── SCENE ENTRY ──────────────────────────────────────────
function showTowerScene() {
  migrateInventory();
  if (_combatTimeout) { clearTimeout(_combatTimeout); _combatTimeout = null; }
  _towerViewFloor = gameState.tower.currentFloor;

  const main = document.getElementById('hub-main');
  main.className = 'hub-main--list';

  main.innerHTML = `
    <div id="tower-scene" style="width:100%;padding:28px 36px;min-height:100%">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div style="width:90px"></div>
        <div style="color:#FFFFFF;font-size:18px;letter-spacing:3px;font-family:'Courier New',monospace">[ THE TOWER ]</div>
        <div style="color:#E8D5FF;font-size:12px;letter-spacing:1px;font-family:'Courier New',monospace">
          Floor ${gameState.tower.currentFloor} / 100
        </div>
      </div>

      <!-- FLOOR PANELS -->
      <div id="tower-panels" style="display:flex;gap:24px;justify-content:center;margin-bottom:28px"></div>

      <!-- NAVIGATION ARROWS -->
      <div id="tower-nav" style="display:flex;gap:16px;justify-content:center"></div>
    </div>`;

  _renderTowerPanels();
  _renderTowerNav();
}

// ─── FLOOR PANEL BUILDER ──────────────────────────────────
function _buildFloorPanel(floorNum, isPreview) {
  const type      = getFloorType(floorNum);
  const cleared   = isFloorCleared(floorNum);
  const unlocked  = isFloorUnlocked(floorNum);
  const opacity   = isPreview ? '0.6' : '1';
  const width     = isPreview ? '300px' : '380px';

  // Floor type badge
  let badgeHTML = '';
  if (type === 'boss') {
    badgeHTML = `<div style="color:#FF4444;font-size:13px;letter-spacing:2px;margin-top:6px;font-weight:bold">[ BOSS ]</div>`;
  } else if (type === 'miniboss') {
    badgeHTML = `<div style="color:#E67E22;font-size:13px;letter-spacing:2px;margin-top:6px;font-weight:bold">[ MINI BOSS ]</div>`;
  }

  // Status
  let statusHTML = '';
  if (cleared) {
    statusHTML = `<div style="color:#4CAF50;font-size:12px;letter-spacing:1px;margin-top:14px">[ ✓ CLEARED ]</div>`;
  } else {
    statusHTML = `<div style="color:#E8D5FF;font-size:12px;letter-spacing:1px;margin-top:14px">[ NOT CLEARED ]</div>`;
  }

  // Action button (only for active panel)
  let actionHTML = '';
  if (!isPreview) {
    if (!cleared && unlocked) {
      actionHTML = `
        <button class="tower-action-btn" data-floor="${floorNum}" data-action="challenge"
          style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
                 font-family:'Courier New',monospace;font-size:13px;padding:10px 24px;
                 cursor:pointer;letter-spacing:1px;margin-top:18px;transition:box-shadow 0.2s"
          onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
          onmouseout="this.style.boxShadow=''">[ CHALLENGE FLOOR ]</button>`;
    } else if (cleared) {
      const today        = new Date().toISOString().slice(0, 10);
      const dailyClaimed = gameState.tower.lastRevisitReset === today;
      const claimBorder  = dailyClaimed ? '#333348' : '#4CAF50';
      const claimColor   = dailyClaimed ? '#333348' : '#FFFFFF';
      const claimCursor  = dailyClaimed ? 'not-allowed' : 'pointer';
      const claimLabel   = dailyClaimed ? '[ ✓ REWARD CLAIMED ]' : '[ CLAIM DAILY REWARD ]';
      actionHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:18px">
          <button class="tower-action-btn" data-floor="${floorNum}" data-action="revisit"
            style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
                   font-family:'Courier New',monospace;font-size:13px;padding:10px 24px;
                   cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
            onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
            onmouseout="this.style.boxShadow=''">[ REVISIT ]</button>
          <button class="tower-daily-claim-btn" data-floor="${floorNum}"
            style="background:#1A0025;border:2px solid ${claimBorder};color:${claimColor};
                   font-family:'Courier New',monospace;font-size:12px;padding:8px 20px;
                   cursor:${claimCursor};letter-spacing:1px;transition:box-shadow 0.2s"
            ${dailyClaimed ? 'disabled' : ''}
            onmouseover="if(!this.disabled)this.style.boxShadow='0 0 10px #4CAF50'"
            onmouseout="this.style.boxShadow=''">${claimLabel}</button>
        </div>`;
    }
  }

  // Tower complete message for floor 100+ preview
  let towerCompleteHTML = '';
  if (isPreview && floorNum > 100) {
    return `
      <div style="width:${width};opacity:${opacity};background:#12001A;border:2px solid #C0C0D0;
                  box-shadow:0 0 15px rgba(123,47,190,0.5);padding:28px 24px;
                  font-family:'Courier New',monospace;display:flex;flex-direction:column;align-items:center;">
        <div style="color:#FFD700;font-size:22px;letter-spacing:3px;margin-bottom:12px">★</div>
        <div style="color:#FFD700;font-size:14px;letter-spacing:2px">[ TOWER COMPLETE ]</div>
      </div>`;
  }

  return `
    <div style="width:${width};opacity:${opacity};background:#12001A;border:2px solid #C0C0D0;
                box-shadow:0 0 15px rgba(123,47,190,0.5);padding:28px 24px;
                font-family:'Courier New',monospace;display:flex;flex-direction:column;align-items:center;">

      <div style="color:#FFFFFF;font-size:22px;letter-spacing:3px;margin-bottom:4px">FLOOR ${floorNum}</div>
      ${badgeHTML}

      <div style="width:100%;margin-top:22px;padding-top:16px;border-top:1px solid #2A003A">
        <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:8px">[ ENEMIES ]</div>
        ${_getEnemyPreviewHTML(floorNum)}
      </div>

      <div style="width:100%;margin-top:16px;padding-top:16px;border-top:1px solid #2A003A">
        <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:8px">[ REWARDS ]</div>
        <div style="color:#E8D5FF;font-size:11px;letter-spacing:1px">
          💎 ${type === 'boss' ? 300 : type === 'miniboss' ? 150 : 100} Gems · 🪙 ${Math.floor(50 + floorNum * 10)} Gold · ⭐ ${Math.floor(20 + floorNum * 5)} EXP
        </div>
      </div>

      ${statusHTML}
      ${actionHTML}
    </div>`;
}

function _getEnemyPreviewHTML(floorNum) {
  if (typeof getFloorEnemyPreview !== 'function') return '<div style="color:#E8D5FF;font-size:11px">[ Unknown ]</div>';
  var preview = getFloorEnemyPreview(floorNum);
  var dangerCol = preview.danger === 'HIGH' ? '#FF4444' : preview.danger === 'MODERATE' ? '#E67E22' : '#4CAF50';
  var html = '<div style="color:#E8D5FF;font-size:11px;letter-spacing:1px">';
  if (preview.boss) html += '<div style="color:#FF4444;font-size:12px;margin-bottom:4px">' + preview.boss + '</div>';
  html += '<div>' + preview.count + '</div>';
  html += '<div style="color:' + dangerCol + ';margin-top:4px">Danger: ' + preview.danger + '</div>';
  html += '</div>';
  return html;
}

// ─── RENDER PANELS ────────────────────────────────────────
function _renderTowerPanels() {
  const container = document.getElementById('tower-panels');
  if (!container) return;

  const leftHTML  = _buildFloorPanel(_towerViewFloor, false);
  const rightHTML = _buildFloorPanel(_towerViewFloor + 1, true);

  container.innerHTML = leftHTML + rightHTML;

  // Attach action button listeners
  container.querySelectorAll('.tower-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const floor  = parseInt(btn.dataset.floor, 10);
      const action = btn.dataset.action;
      _openPreCombat(floor, action);
    });
  });

  // Attach daily reward claim listeners
  container.querySelectorAll('.tower-daily-claim-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.disabled = true;
      _claimTowerDailyReward(parseInt(btn.dataset.floor, 10));
    });
  });
}

// ─── RENDER NAV ARROWS ───────────────────────────────────
function _renderTowerNav() {
  const nav = document.getElementById('tower-nav');
  if (!nav) return;

  const canLeft  = _towerViewFloor > 1;
  const canRight = _towerViewFloor < gameState.tower.currentFloor;

  nav.innerHTML = `
    <button id="tower-nav-left"
      style="background:#1A0025;border:2px solid ${canLeft ? '#C0C0D0' : '#333348'};
             color:${canLeft ? '#FFFFFF' : '#333348'};
             font-family:'Courier New',monospace;font-size:16px;padding:8px 20px;
             cursor:${canLeft ? 'pointer' : 'not-allowed'};letter-spacing:1px;transition:box-shadow 0.2s"
      ${canLeft ? '' : 'disabled'}
      onmouseover="if(!this.disabled)this.style.boxShadow='0 0 10px #7B2FBE'"
      onmouseout="this.style.boxShadow=''">[ ← ]</button>
    <button id="tower-nav-right"
      style="background:#1A0025;border:2px solid ${canRight ? '#C0C0D0' : '#333348'};
             color:${canRight ? '#FFFFFF' : '#333348'};
             font-family:'Courier New',monospace;font-size:16px;padding:8px 20px;
             cursor:${canRight ? 'pointer' : 'not-allowed'};letter-spacing:1px;transition:box-shadow 0.2s"
      ${canRight ? '' : 'disabled'}
      onmouseover="if(!this.disabled)this.style.boxShadow='0 0 10px #7B2FBE'"
      onmouseout="this.style.boxShadow=''">[ → ]</button>`;

  document.getElementById('tower-nav-left').addEventListener('click', () => {
    if (_towerViewFloor > 1) {
      _towerViewFloor--;
      _renderTowerPanels();
      _renderTowerNav();
    }
  });
  document.getElementById('tower-nav-right').addEventListener('click', () => {
    if (_towerViewFloor < gameState.tower.currentFloor) {
      _towerViewFloor++;
      _renderTowerPanels();
      _renderTowerNav();
    }
  });
}

// ═══════════════════════════════════════════════════════════
// PRE-COMBAT OVERLAY
// ═══════════════════════════════════════════════════════════

function _openPreCombat(floorNum, action) {
  const type     = getFloorType(floorNum);
  const typeLabel = type === 'boss' ? 'BOSS' : type === 'miniboss' ? 'MINI BOSS' : 'NORMAL';
  const party    = getPartyHeroes().filter(Boolean);
  const isEmpty  = party.length === 0;

  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'tower-precombat-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:1700;
    display:flex;align-items:center;justify-content:center;pointer-events:all;`;

  // Panel
  const panel = document.createElement('div');
  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 20px #7B2FBE,inset 0 0 20px rgba(123,47,190,0.1);
    padding:30px 36px;width:560px;max-height:82vh;overflow-y:auto;
    font-family:'Courier New',monospace;
    opacity:0;transform:translateY(18px);transition:opacity 0.22s ease,transform 0.22s ease;`;

  // Party list
  let partyHTML = '';
  if (isEmpty) {
    partyHTML = `<div style="color:#FF4444;font-size:12px;letter-spacing:1px;margin-top:8px">
      [ ⚠ No heroes in party! Assign heroes before combat. ]</div>`;
  } else {
    partyHTML = party.map(h => {
      const col   = (typeof RARITY_BORDER !== 'undefined' && RARITY_BORDER[h.rarity]) || '#C0C0D0';
      const stars = '★'.repeat(h.rarity);
      return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #2A003A">
        <span style="color:${col};font-size:11px">${stars}</span>
        <span style="color:#FFFFFF;font-size:12px">${escHtml(h.name)}</span>
        <span style="color:#E8D5FF;font-size:10px">${escHtml(h.class)}</span>
        <span style="color:#C0C0D0;font-size:10px">Lv.${h.level}</span>
      </div>`;
    }).join('');
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
      <div style="color:#FFFFFF;font-size:15px;letter-spacing:2px">[ FLOOR ${floorNum} — ${typeLabel} ]</div>
    </div>

    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:18px">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:10px">[ YOUR PARTY ]</div>
      ${partyHTML}
    </div>

    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:22px">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:8px">[ ENEMIES ]</div>
      ${_getEnemyPreviewHTML(floorNum)}
    </div>

    <div style="display:flex;gap:12px;justify-content:flex-end">
      <button id="precombat-cancel-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
               cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ CANCEL ]</button>
      <button id="precombat-begin-btn"
        style="background:#1A0025;border:2px solid ${isEmpty ? '#333348' : '#F1C40F'};
               color:${isEmpty ? '#333348' : '#FFFFFF'};
               font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
               cursor:${isEmpty ? 'not-allowed' : 'pointer'};letter-spacing:1px;transition:box-shadow 0.2s"
        ${isEmpty ? 'disabled' : ''}
        onmouseover="if(!this.disabled)this.style.boxShadow='0 0 12px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ BEGIN COMBAT ]</button>
    </div>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  // Close on outside click
  overlay.addEventListener('click', e => { if (e.target === overlay) _closePreCombat(); });

  // Cancel
  panel.querySelector('#precombat-cancel-btn').addEventListener('click', _closePreCombat);

  // Begin
  if (!isEmpty) {
    panel.querySelector('#precombat-begin-btn').addEventListener('click', () => {
      _closePreCombat();
      setTimeout(() => {
        launchCombat(floorNum, {
          onEnd: function (result) {
            setTimeout(() => {
              _towerViewFloor = gameState.tower.currentFloor;
              showTowerScene();
            }, 200);
          },
        });
      }, 200);
    });
  }
}

function _closePreCombat() {
  const overlay = document.getElementById('tower-precombat-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

// ─── TOWER DAILY REWARD ────────────────────────────────────
// One claim per day (uses lastRevisitReset as ISO-date flag).
// Rewards auto-applied via popup — no mail (mail is for quest rewards only).
function _claimTowerDailyReward(floorNum) {
  const today = new Date().toISOString().slice(0, 10);
  if (gameState.tower.lastRevisitReset === today) return;  // double-claim guard

  const gems = 30;
  const gold = 300;
  gameState.gems = (gameState.gems || 0) + gems;
  gameState.gold = (gameState.gold || 0) + gold;
  gameState.tower.lastRevisitReset = today;
  saveGame();

  if (typeof updateGemsDisplay === 'function') updateGemsDisplay();
  if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
  if (typeof progressDailyQuest === 'function') progressDailyQuest('towerRewards');

  // Small popup — auto-applied, no claim action needed
  const overlay = document.createElement('div');
  overlay.id = 'tower-reward-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:1900;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,0.75);';

  const panel = document.createElement('div');
  panel.style.cssText =
    'background:#12001A;border:2px solid #4CAF50;' +
    'box-shadow:0 0 20px rgba(76,175,80,0.4);' +
    'padding:28px 36px;font-family:\'Courier New\',monospace;text-align:center;min-width:280px;' +
    'opacity:0;transform:translateY(16px);transition:opacity 0.22s,transform 0.22s;';

  panel.innerHTML = `
    <div style="color:#4CAF50;font-size:15px;letter-spacing:3px;margin-bottom:16px">[ DAILY REWARD ]</div>
    <div style="color:#E8D5FF;font-size:13px;margin-bottom:6px">Floor ${floorNum} — Cleared</div>
    <div style="color:#FFFFFF;font-size:18px;margin:14px 0">💎 +${gems} Gems</div>
    <div style="color:#FFFFFF;font-size:18px;margin-bottom:20px">🪙 +${gold} Gold</div>
    <div style="color:#888899;font-size:11px;letter-spacing:1px;margin-bottom:18px">Rewards added to your account</div>
    <button id="tower-reward-ok-btn"
      style="background:#1A0025;border:2px solid #4CAF50;color:#FFFFFF;
             font-family:'Courier New',monospace;font-size:13px;padding:9px 28px;
             cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
      onmouseover="this.style.boxShadow='0 0 12px #4CAF50'"
      onmouseout="this.style.boxShadow=''">[ OK ]</button>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  function _closeTowerRewardPopup() {
    const ov = document.getElementById('tower-reward-overlay');
    if (!ov) return;
    const pn = ov.firstElementChild;
    pn.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
    pn.style.opacity    = '0';
    pn.style.transform  = 'translateY(-12px)';
    setTimeout(() => {
      ov.remove();
      // Refresh panel to show claimed state
      _renderTowerPanels();
      _renderTowerNav();
    }, 170);
  }

  panel.querySelector('#tower-reward-ok-btn').addEventListener('click', _closeTowerRewardPopup);
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeTowerRewardPopup(); });
}

// ─── REGISTER ─────────────────────────────────────────────
function registerSceneTower() {
  // All tower scene functions are declared globally above.
}
