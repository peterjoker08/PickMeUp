// ═══════════════════════════════════════════════════════════
// DUNGEON SCENE
// ═══════════════════════════════════════════════════════════

// ─── DUNGEON TEMPLATES (stub) ─────────────────────────────
window.DUNGEON_TEMPLATES = [];
// populated in a later prompt
// each template will have: id, name, type, duration,
// difficulty, rewardProfile

function getDungeonById(id) {
  return DUNGEON_TEMPLATES.find(d => d.id === id) || null;
}
window.getDungeonById = getDungeonById;

// ─── TIMER STATE ──────────────────────────────────────────
let _dungeonIntervals = [];
let _dungeonsActiveTab = 'available';

function _clearDungeonTimers() {
  _dungeonIntervals.forEach(id => clearInterval(id));
  _dungeonIntervals = [];
}

// ─── TIME FORMATTING ──────────────────────────────────────
function _formatDuration(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

function _msUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight - now;
}

// ─── SCENE ENTRY ──────────────────────────────────────────
function showDungeonsScene() {
  _clearDungeonTimers();
  migrateInventory();
  checkDungeonResets();
  _dungeonsActiveTab = 'available';

  const main = document.getElementById('hub-main');
  main.className = 'hub-main--list';

  main.innerHTML = `
    <div id="dungeons-scene" style="width:100%;padding:28px 36px;min-height:100%">

      <!-- HEADER -->
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="width:90px"></div>
        <div style="color:#FFFFFF;font-size:18px;letter-spacing:3px;font-family:'Courier New',monospace">[ DUNGEONS ]</div>
        <div style="width:90px"></div>
      </div>
      <div style="color:#E8D5FF;font-size:11px;letter-spacing:1px;text-align:center;margin-bottom:24px;font-family:'Courier New',monospace">
        Send heroes to explore and return with rewards.
      </div>

      <!-- TABS -->
      <div id="dng-tabs" style="display:flex;border-bottom:2px solid #C0C0D0;margin-bottom:28px">
        <button class="summon-tab" data-dngtab="available">[ AVAILABLE ]</button>
        <button class="summon-tab" data-dngtab="active">[ ACTIVE RUNS ]</button>
      </div>

      <!-- TAB CONTENT -->
      <div id="dng-tab-content"></div>
    </div>`;

  document.querySelectorAll('[data-dngtab]').forEach(btn => {
    btn.addEventListener('click', () => _switchDungeonTab(btn.dataset.dngtab));
  });

  _switchDungeonTab('available');
}

function _switchDungeonTab(tab) {
  _clearDungeonTimers();
  _dungeonsActiveTab = tab;
  document.querySelectorAll('[data-dngtab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dngtab === tab);
  });
  const content = document.getElementById('dng-tab-content');
  if (!content) return;
  content.innerHTML = '';
  if (tab === 'available') _showAvailableTab(content);
  else if (tab === 'active') _showActiveRunsTab(content);
}

// ═══════════════════════════════════════════════════════════
// AVAILABLE TAB
// ═══════════════════════════════════════════════════════════

function _showAvailableTab(container) {
  container.innerHTML = `
    <!-- DAILY DUNGEONS -->
    <div style="margin-bottom:36px">
      <div style="color:#C0C0D0;font-size:14px;letter-spacing:2px;margin-bottom:18px;font-family:'Courier New',monospace">
        [ DAILY DUNGEONS ]
      </div>
      <div id="dng-daily-grid" style="display:grid;grid-template-columns:repeat(3,280px);gap:16px"></div>
    </div>

    <!-- BONUS DUNGEON -->
    <div>
      <div style="color:#F1C40F;font-size:14px;letter-spacing:2px;margin-bottom:18px;font-family:'Courier New',monospace">
        [ BONUS DUNGEON ]
      </div>
      <div id="dng-bonus-area"></div>
    </div>`;

  _renderDailyDungeonCards();
  _renderBonusDungeonCard();
}

function _buildDungeonPlaceholderCard(index, isBonusCard) {
  const borderCol = isBonusCard ? '#F1C40F' : '#C0C0D0';
  const bonusBadge = isBonusCard
    ? `<div style="position:absolute;top:8px;right:8px;color:#F1C40F;font-size:9px;
                    letter-spacing:1px;font-family:'Courier New',monospace">[ Daily Bonus ]</div>`
    : '';

  return `
    <div class="dng-card" data-dng-idx="${index}" style="
      position:relative;width:280px;min-height:160px;background:#12001A;border:2px solid ${borderCol};
      padding:20px 16px;font-family:'Courier New',monospace;cursor:pointer;
      transition:box-shadow 0.2s;display:flex;flex-direction:column;gap:6px;"
      onmouseover="this.style.boxShadow='0 0 14px #7B2FBE'"
      onmouseout="this.style.boxShadow=''">
      ${bonusBadge}
      <div style="color:#FFFFFF;font-size:13px;letter-spacing:1px">[ Dungeon Name ]</div>
      <div style="color:#E8D5FF;font-size:11px">Type: —</div>
      <div style="color:#E8D5FF;font-size:11px">Duration: —</div>
      <div style="color:#E8D5FF;font-size:11px">Difficulty: —</div>
      <button class="dng-dispatch-btn" data-dng-idx="${index}"
        style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:11px;padding:7px 16px;
               cursor:pointer;letter-spacing:1px;margin-top:8px;transition:box-shadow 0.2s;align-self:flex-start"
        onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ DISPATCH ]</button>
      <div style="color:#E8D5FF;font-size:9px;letter-spacing:1px;margin-top:4px">[ Dungeon content coming soon ]</div>
    </div>`;
}

function _renderDailyDungeonCards() {
  const grid = document.getElementById('dng-daily-grid');
  if (!grid) return;
  let html = '';
  for (let i = 0; i < 3; i++) {
    html += _buildDungeonPlaceholderCard(i, false);
  }
  grid.innerHTML = html;

  grid.querySelectorAll('.dng-dispatch-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _openDispatchOverlay(null);
    });
  });
}

function _renderBonusDungeonCard() {
  const area = document.getElementById('dng-bonus-area');
  if (!area) return;

  area.innerHTML = `
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div>${_buildDungeonPlaceholderCard('bonus', true)}</div>
      <div id="dng-bonus-timer" style="color:#F1C40F;font-size:12px;letter-spacing:1px;
           font-family:'Courier New',monospace;padding-top:20px"></div>
    </div>`;

  // Attach dispatch btn
  area.querySelectorAll('.dng-dispatch-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      _openDispatchOverlay(null);
    });
  });

  // Midnight countdown
  _updateBonusTimer();
  const tid = setInterval(_updateBonusTimer, 1000);
  _dungeonIntervals.push(tid);
}

function _updateBonusTimer() {
  const el = document.getElementById('dng-bonus-timer');
  if (!el) return;
  el.textContent = `Resets in: ${_formatDuration(_msUntilMidnight())}`;
}

// ═══════════════════════════════════════════════════════════
// DISPATCH OVERLAY
// ═══════════════════════════════════════════════════════════

function _openDispatchOverlay(dungeonId) {
  _clearDungeonTimers();
  document.getElementById('dng-dispatch-overlay')?.remove();

  const selectedIds = new Set();

  const overlay = document.createElement('div');
  overlay.id = 'dng-dispatch-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:1700;
    display:flex;align-items:center;justify-content:center;pointer-events:all;`;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 20px #7B2FBE,inset 0 0 20px rgba(123,47,190,0.1);
    padding:28px 36px;width:820px;max-height:82vh;
    display:flex;flex-direction:column;font-family:'Courier New',monospace;
    opacity:0;transform:translateY(18px);transition:opacity 0.22s ease,transform 0.22s ease;`;

  // Get eligible heroes (not in dungeon, not in party)
  const eligible = gameState.inventory.filter(
    i => i.type === 'hero' && !i.inDungeon && !i.inParty
  );

  let heroGridHTML = '';
  if (eligible.length === 0) {
    heroGridHTML = `
      <div style="color:#FF4444;font-size:12px;letter-spacing:1px;text-align:center;padding:30px 0">
        [ No available heroes. Heroes in party or dungeon cannot be dispatched. ]
      </div>`;
  } else {
    heroGridHTML = `<div id="dispatch-hero-grid"
      style="display:grid;grid-template-columns:repeat(4,160px);gap:12px;overflow-y:auto;max-height:340px;padding:4px"></div>`;
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px">
      <div style="color:#FFFFFF;font-size:15px;letter-spacing:2px">[ DISPATCH HEROES ]</div>
      <button id="dispatch-close-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:12px;padding:6px 16px;
               cursor:pointer;letter-spacing:1px;white-space:nowrap;flex-shrink:0;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ × CLOSE ]</button>
    </div>

    ${heroGridHTML}

    <div style="display:flex;align-items:center;justify-content:space-between;margin-top:18px;flex-wrap:wrap;gap:12px">
      <div>
        <div id="dispatch-count" style="color:#C0C0D0;font-size:12px;letter-spacing:1px">[ 0 Heroes Selected ]</div>
        <div style="color:#E8D5FF;font-size:11px;margin-top:4px">[ Return in: — ]</div>
      </div>
      <div style="display:flex;gap:12px">
        <button id="dispatch-cancel-btn"
          style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
                 font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
                 cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
          onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
          onmouseout="this.style.boxShadow=''">[ CANCEL ]</button>
        <button id="dispatch-go-btn"
          style="background:#1A0025;border:2px solid #333348;color:#333348;
                 font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
                 cursor:not-allowed;letter-spacing:1px;transition:box-shadow 0.2s"
          disabled>[ DISPATCH ]</button>
      </div>
    </div>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  // Build hero cards
  const grid = panel.querySelector('#dispatch-hero-grid');
  if (grid && eligible.length > 0) {
    eligible.forEach(hero => {
      const col   = (typeof RARITY_BORDER !== 'undefined' && RARITY_BORDER[hero.rarity]) || '#C0C0D0';
      const stars = '★'.repeat(hero.rarity);
      const card  = document.createElement('div');
      card.dataset.heroId = hero.id;
      card.style.cssText = `
        width:160px;min-height:120px;background:#12001A;border:2px solid ${col};
        padding:12px 8px;font-family:'Courier New',monospace;cursor:pointer;
        transition:box-shadow 0.2s,border-color 0.2s;display:flex;flex-direction:column;
        align-items:center;gap:4px;box-sizing:border-box;`;
      card.innerHTML = `
        <div style="color:#FFFFFF;font-size:11px;text-align:center">${escHtml(hero.name)}</div>
        <div style="color:${col};font-size:10px">${stars}</div>
        <div style="color:#E8D5FF;font-size:10px">${escHtml(hero.class)}</div>
        <div style="color:#C0C0D0;font-size:10px">Lv.${hero.level}</div>`;
      card.addEventListener('mouseenter', () => { if (!selectedIds.has(hero.id)) card.style.boxShadow = '0 0 10px #7B2FBE'; });
      card.addEventListener('mouseleave', () => { if (!selectedIds.has(hero.id)) card.style.boxShadow = ''; });
      card.addEventListener('click', () => {
        if (selectedIds.has(hero.id)) {
          selectedIds.delete(hero.id);
          card.style.border = `2px solid ${col}`;
          card.style.boxShadow = '';
        } else {
          selectedIds.add(hero.id);
          card.style.border = '2px solid #F1C40F';
          card.style.boxShadow = '0 0 12px #F1C40F55';
        }
        _updateDispatchCount(selectedIds.size, panel);
      });
      grid.appendChild(card);
    });
  }

  // Close / Cancel
  overlay.addEventListener('click', e => { if (e.target === overlay) _closeDispatchOverlay(); });
  panel.querySelector('#dispatch-close-btn').addEventListener('click', _closeDispatchOverlay);
  panel.querySelector('#dispatch-cancel-btn').addEventListener('click', _closeDispatchOverlay);

  // Dispatch
  panel.querySelector('#dispatch-go-btn').addEventListener('click', () => {
    if (selectedIds.size === 0) return;
    const heroIds = [...selectedIds];
    const result = dispatchDungeon(dungeonId, heroIds);
    if (result.ok) {
      _closeDispatchOverlay();
      if (typeof showToast === 'function') showToast('[ Heroes dispatched! ]', '#4CAF50');
      setTimeout(() => _switchDungeonTab('active'), 200);
    } else {
      if (typeof showToast === 'function') showToast(`[ ${result.reason} ]`, '#FF4444');
    }
  });
}

function _updateDispatchCount(count, panel) {
  const el   = panel.querySelector('#dispatch-count');
  const btn  = panel.querySelector('#dispatch-go-btn');
  if (el) el.textContent = `[ ${count} Hero${count !== 1 ? 'es' : ''} Selected ]`;
  if (btn) {
    if (count > 0) {
      btn.disabled = false;
      btn.style.border = '2px solid #F1C40F';
      btn.style.color  = '#FFFFFF';
      btn.style.cursor = 'pointer';
      btn.onmouseover  = function() { this.style.boxShadow = '0 0 12px #7B2FBE'; };
      btn.onmouseout   = function() { this.style.boxShadow = ''; };
    } else {
      btn.disabled = true;
      btn.style.border = '2px solid #333348';
      btn.style.color  = '#333348';
      btn.style.cursor = 'not-allowed';
      btn.onmouseover  = null;
      btn.onmouseout   = null;
      btn.style.boxShadow = '';
    }
  }
}

function _closeDispatchOverlay() {
  const overlay = document.getElementById('dng-dispatch-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

// ═══════════════════════════════════════════════════════════
// ACTIVE RUNS TAB
// ═══════════════════════════════════════════════════════════

function _showActiveRunsTab(container) {
  // Auto-mark completed runs
  gameState.dungeons.activeRuns.forEach(run => {
    if (run.status === 'active' && isRunComplete(run)) {
      run.status = 'completed';
    }
  });

  const runs = gameState.dungeons.activeRuns;

  if (runs.length === 0) {
    container.innerHTML = `
      <div style="color:#C0C0D0;font-size:14px;letter-spacing:2px;margin-bottom:18px;font-family:'Courier New',monospace">
        [ ACTIVE RUNS ]
      </div>
      <div style="color:#E8D5FF;font-size:13px;letter-spacing:1px;text-align:center;padding:60px 0;font-family:'Courier New',monospace">
        [ No heroes currently exploring. ]
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="color:#C0C0D0;font-size:14px;letter-spacing:2px;margin-bottom:18px;font-family:'Courier New',monospace">
      [ ACTIVE RUNS ]
    </div>
    <div id="dng-runs-list" style="display:flex;flex-direction:column;gap:14px"></div>`;

  const list = document.getElementById('dng-runs-list');
  runs.forEach(run => _renderRunCard(run, list));
}

function _renderRunCard(run, container) {
  const complete = run.status === 'completed' || isRunComplete(run);
  if (complete && run.status === 'active') run.status = 'completed';

  // Look up dungeon name (stub — will be null for now)
  const tmpl = getDungeonById(run.dungeonId);
  const name = tmpl ? tmpl.name : '[ Unknown Dungeon ]';

  // Hero name badges
  const heroBadges = run.heroIds.map(hId => {
    const hero = gameState.inventory.find(i => i.id === hId && i.type === 'hero');
    if (!hero) return `<span style="color:#888;font-size:10px">[ ? ]</span>`;
    const col = (typeof RARITY_BORDER !== 'undefined' && RARITY_BORDER[hero.rarity]) || '#C0C0D0';
    return `<span style="color:${col};font-size:10px;background:#0D0010;border:1px solid ${col};
                         padding:2px 6px;letter-spacing:1px">${escHtml(hero.name)}</span>`;
  }).join(' ');

  const card = document.createElement('div');
  card.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;padding:16px 20px;
    font-family:'Courier New',monospace;transition:box-shadow 0.2s;`;
  card.dataset.runId = run.id;

  // Timer element
  const timerId = `dng-timer-${run.id}`;

  let timerHTML = '';
  let actionHTML = '';
  if (complete) {
    timerHTML = `<div style="color:#4CAF50;font-size:12px;letter-spacing:1px;animation:blink 1.5s ease-in-out infinite">[ ✓ READY TO COLLECT ]</div>`;
    actionHTML = `
      <button class="dng-collect-btn" data-run-id="${run.id}"
        style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:12px;padding:8px 20px;
               cursor:pointer;letter-spacing:1px;margin-top:12px;width:100%;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ COLLECT REWARDS ]</button>`;
  } else {
    timerHTML = `<div id="${timerId}" style="color:#C0C0D0;font-size:12px;letter-spacing:1px">[ ${_formatDuration(getRunTimeRemaining(run))} remaining ]</div>`;
    actionHTML = `
      <button disabled
        style="background:#1A0025;border:2px solid #333348;color:#333348;
               font-family:'Courier New',monospace;font-size:12px;padding:8px 20px;
               cursor:not-allowed;letter-spacing:1px;margin-top:12px;width:100%">[ EXPLORING... ]</button>`;

    // Live timer
    const tid = setInterval(() => {
      const el = document.getElementById(timerId);
      if (!el) { clearInterval(tid); return; }
      const remaining = getRunTimeRemaining(run);
      if (remaining <= 0) {
        clearInterval(tid);
        run.status = 'completed';
        // Refresh the tab to show collect button
        const content = document.getElementById('dng-tab-content');
        if (content && _dungeonsActiveTab === 'active') {
          _clearDungeonTimers();
          content.innerHTML = '';
          _showActiveRunsTab(content);
        }
      } else {
        el.textContent = `[ ${_formatDuration(remaining)} remaining ]`;
      }
    }, 1000);
    _dungeonIntervals.push(tid);
  }

  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap">
      <div>
        <div style="color:#FFFFFF;font-size:13px;letter-spacing:1px;margin-bottom:4px">${name}</div>
        <div style="color:#666;font-size:9px;letter-spacing:1px">${run.id}</div>
      </div>
      <div style="text-align:right">${timerHTML}</div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">${heroBadges}</div>
    ${actionHTML}`;

  container.appendChild(card);

  // Attach collect handler
  card.querySelectorAll('.dng-collect-btn').forEach(btn => {
    btn.addEventListener('click', () => _openCollectOverlay(run));
  });
}

// ═══════════════════════════════════════════════════════════
// COLLECT OVERLAY
// ═══════════════════════════════════════════════════════════

function _openCollectOverlay(run) {
  _clearDungeonTimers();
  document.getElementById('dng-collect-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'dng-collect-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:1700;
    display:flex;align-items:center;justify-content:center;pointer-events:all;`;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 20px #7B2FBE,inset 0 0 20px rgba(123,47,190,0.1);
    padding:30px 36px;width:520px;max-height:82vh;overflow-y:auto;
    font-family:'Courier New',monospace;
    opacity:0;transform:translateY(18px);transition:opacity 0.22s ease,transform 0.22s ease;`;

  // Hero list
  const heroListHTML = run.heroIds.map(hId => {
    const hero = gameState.inventory.find(i => i.id === hId && i.type === 'hero');
    if (!hero) return `<div style="color:#888;font-size:11px;padding:4px 0">[ Unknown Hero ]</div>`;
    const col = (typeof RARITY_BORDER !== 'undefined' && RARITY_BORDER[hero.rarity]) || '#C0C0D0';
    return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0;border-bottom:1px solid #2A003A">
      <span style="color:${col};font-size:11px">${'★'.repeat(hero.rarity)}</span>
      <span style="color:#FFFFFF;font-size:12px">${escHtml(hero.name)}</span>
      <span style="color:#E8D5FF;font-size:10px">${escHtml(hero.class)}</span>
    </div>`;
  }).join('');

  panel.innerHTML = `
    <div style="color:#4CAF50;font-size:15px;letter-spacing:2px;margin-bottom:20px">[ EXPEDITION COMPLETE ]</div>

    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:18px">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:10px">[ HEROES ]</div>
      ${heroListHTML}
    </div>

    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:22px">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:8px">[ REWARDS ]</div>
      <div style="color:#E8D5FF;font-size:11px;letter-spacing:1px">[ To be implemented ]</div>
    </div>

    <div style="display:flex;justify-content:flex-end">
      <button id="collect-confirm-btn"
        style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
               cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ COLLECT ]</button>
    </div>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  overlay.addEventListener('click', e => { if (e.target === overlay) _closeCollectOverlay(); });

  panel.querySelector('#collect-confirm-btn').addEventListener('click', () => {
    const result = collectDungeon(run.id);
    if (result.ok) {
      _closeCollectOverlay();
      if (typeof showToast === 'function') showToast('[ Rewards collected! ]', '#4CAF50');
      setTimeout(() => _switchDungeonTab('active'), 200);
    } else {
      if (typeof showToast === 'function') showToast(`[ ${result.reason} ]`, '#FF4444');
    }
  });
}

function _closeCollectOverlay() {
  const overlay = document.getElementById('dng-collect-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

// ─── REGISTER ─────────────────────────────────────────────
function registerSceneDungeons() {
  // All dungeon scene functions are declared globally above.
}
