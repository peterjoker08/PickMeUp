// ═══════════════════════════════════════════════════════════
// SHARED UI HELPERS
// ═══════════════════════════════════════════════════════════
// Canonical constants and utility functions used across
// multiple scenes. Loaded before all scene scripts.

// ── Rarity border colours (hero cards + weapon cards) ─────
const RARITY_BORDER = {
  1: '#888899', 2: '#4CAF50', 3: '#4A90D9',
  4: '#9B59B6', 5: '#F1C40F', 6: '#E67E22', 7: '#FF6020'
};

// ── HTML-safe escape ──────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Talent display colour (0-10 scale) ────────────────────
function talentColor(t) {
  if (t < 3.0) return '#FF4444';
  if (t < 6.0) return '#FFD700';
  if (t < 9.0) return '#90EE90';
  return '#00FFFF';
}

// ── Talent tier label (0-10 scale) ────────────────────────
function talentTierLabel(t) {
  if (t < 3.0) return 'WEAK';
  if (t < 6.0) return 'AVERAGE';
  if (t < 9.0) return 'STRONG';
  return 'EXCEPTIONAL';
}

// ── Countdown formatter (ms → HH:MM:SS or MM:SS) ─────────
function formatCountdown(ms) {
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

// ── Global Escape key handler ─────────────────────────────
// Closes the topmost overlay inside #ui-layer on Escape.
// Overlays must have [data-closeable] or a known ID pattern.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const uiLayer = document.getElementById('ui-layer');
  if (!uiLayer) return;

  // Ordered from highest z-index to lowest — close the topmost one only.
  // IMPORTANT: this list is maintained manually; add new overlays in z-index order.
  const knownOverlays = [
    'combat-overlay',
    'arena-floor-picker',
    'weapon-picker-overlay',
    'weapon-detail-overlay',
    'hero-picker-overlay',
    'tower-combat-overlay',
    'tower-precombat-overlay',
    'affinity-panel-overlay',   // z-index 1650
    'synth-result-overlay',
    'synth-confirm-overlay',
    'synth-picker-overlay',
    'promo-result-overlay',
    'promo-confirm-overlay',
    'promo-picker-overlay',
  ];

  for (const id of knownOverlays) {
    const el = document.getElementById(id);
    if (el) { el.remove(); return; }
  }

  // hero-detail-overlay uses display toggle, not remove
  const heroDetail = document.getElementById('hero-detail-overlay');
  if (heroDetail && heroDetail.style.display !== 'none') {
    if (typeof closeHeroDetail === 'function') closeHeroDetail();
    return;
  }
});

// ── Toast notification (moved from heroes.js) ─────────────
// Single-line text notification using #debug-toast.
// Colour defaults to cyan. Auto-fades after 2 s.
var _toastTimer = null;
function showToast(msg, color) {
  var toast = document.getElementById('debug-toast');
  if (!toast) return;
  toast.textContent   = msg;
  toast.style.color   = color || '#00FFFF';
  toast.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function () { toast.style.opacity = '0'; }, 2000);
}

// ── saveGame() — localStorage quota guard ─────────────────
// Wraps the saveGame() declared in gameState.js.
// NOTE: gameState.js must load before helpers.js for this wrapper to function.
// Re-throws any error that is NOT a storage-quota error.
(function () {
  var _orig = window.saveGame;
  window.saveGame = function () {
    try {
      _orig.apply(this, arguments);
    } catch (e) {
      var isQuota = (e instanceof DOMException) &&
                   (e.name === 'QuotaExceededError' || e.code === 22);
      if (isQuota) {
        showToast('Storage full — clear some data', '#FF4444');
        console.error('[saveGame] localStorage quota exceeded:', e);
      } else {
        throw e;
      }
    }
  };
}());

// ── Reward Pill Animation ──────────────────────────────────
//
// showRewardAnimation({ gems:60, gold:100, schematics:10 })
//              │
//              ▼
//   build pill list — skip keys with 0 / falsy values
//              │
//       ┌──────┴──────┬──────────┐
//       │ pill 0      │ pill 1   │  ...  (one per currency / item)
//       └──────┬──────┴──────────┘
//              │ append to document.body  position:fixed
//              │ animation-delay = i × 150 ms  (CSS stagger)
//              ▼
//   @keyframes _rpill:
//     0%  → opacity:0  translateY(+8px)   ← enter from below
//    12%  → opacity:1  translateY(0)      ← fully visible
//    75%  → opacity:1  translateY(0)      ← hold
//   100%  → opacity:0  translateY(-18px)  ← exit upward
//              │
//              ▼  animationend fires on el
//   el.parentNode.removeChild(el)          ← clean DOM removal
//
//   ORPHAN PREVENTION:
//     animationend only fires while el is in the DOM.
//     No setTimeout used — no risk of post-removal callbacks.
//
//   Z-INDEX: 8500  (below combat 9000, pull-anim 9999, AFK 9999)
//
(function () {

  var ICONS  = { gems:'💎', gold:'🪙', schematics:'🔩', wishes:'🌟', bread:'🍞' };
  var LABELS = { gems:'Gems', gold:'Gold', schematics:'BD', wishes:'Wish', bread:'Bread' };

  // Inject keyframe rule once per page load.
  function _ensureStyles() {
    if (document.getElementById('_reward-anim-style')) return;
    var s = document.createElement('style');
    s.id = '_reward-anim-style';
    s.textContent =
      '@keyframes _rpill{' +
        '0%{opacity:0;transform:translate(-50%,8px)}' +
        '12%{opacity:1;transform:translate(-50%,0)}' +
        '75%{opacity:1;transform:translate(-50%,0)}' +
        '100%{opacity:0;transform:translate(-50%,-18px)}' +
      '}';
    document.head.appendChild(s);
  }

  function showRewardAnimation(rewards) {
    if (!rewards || typeof rewards !== 'object') return;

    _ensureStyles();

    // Build ordered pill list — skip zero / falsy amounts.
    var pills = [];
    ['gems', 'gold', 'schematics', 'wishes', 'bread'].forEach(function (key) {
      var amt = rewards[key];
      if (!amt || amt <= 0) return;
      pills.push({ icon: ICONS[key] || '📦', label: LABELS[key] || key, amount: amt });
    });
    if (Array.isArray(rewards.items)) {
      rewards.items.forEach(function (item) {
        if (!item || !item.name) return;
        pills.push({ icon: '📦', label: item.name, amount: item.count || 1 });
      });
    }

    if (pills.length === 0) return;

    pills.forEach(function (pill, i) {
      var el = document.createElement('div');

      // Position: centred horizontally, stacked top-to-bottom within the batch.
      el.style.cssText =
        'position:fixed;' +
        'left:50%;' +
        'top:' + (20 + i * 44) + 'px;' +
        'background:rgba(18,0,26,0.92);' +
        'border:1px solid #C0C0D0;' +
        'color:#E8D5FF;' +
        'font-family:"Courier New",monospace;' +
        'font-size:14px;' +
        'letter-spacing:1px;' +
        'padding:6px 18px;' +
        'border-radius:4px;' +
        'pointer-events:none;' +
        'white-space:nowrap;' +
        'z-index:8500;' +
        // CSS handles the full lifecycle — no setTimeout needed.
        'animation:_rpill 1.8s ease-out ' + (i * 150) + 'ms forwards;';

      el.textContent = pill.icon + '  ' + pill.label + '  \u00d7' + pill.amount;

      // Self-remove when animation finishes.  animationend only fires while
      // the element is in the DOM, so there is no orphan-callback risk.
      el.addEventListener('animationend', function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      });

      document.body.appendChild(el);
    });
  }

  // ── applyReward(rewardObj) ───────────────────────────────
  // Applies a reward object to gameState, persists, and animates.
  // All callers (quest claim, city upgrade, intro steps, etc.) go
  // through here — single source of truth for reward delivery.
  //
  //   rewardObj: { gems, gold, schematics, wishes, bread, items[] }
  //
  // NaN guard: (field || 0) treats undefined / NaN / null as 0.
  // bread is capped at 200 (Bakery max).
  function applyReward(rewards) {
    if (!rewards || typeof rewards !== 'object') return;

    gameState.gems       = (gameState.gems       || 0) + (rewards.gems       || 0);
    gameState.gold       = (gameState.gold        || 0) + (rewards.gold       || 0);
    gameState.schematics = (gameState.schematics  || 0) + (rewards.schematics || 0);
    gameState.wishes     = (gameState.wishes      || 0) + (rewards.wishes     || 0);
    gameState.bread      = Math.min(
      (gameState.bread || 0) + (rewards.bread || 0),
      200
    );

    // Consumable items → gameState.items[]
    if (Array.isArray(rewards.items)) {
      if (!Array.isArray(gameState.items)) gameState.items = [];
      rewards.items.forEach(function (item) {
        if (!item || !item.id) return;
        var existing = gameState.items.find(function (i) { return i.id === item.id; });
        if (existing) {
          existing.count = (existing.count || 1) + (item.count || 1);
        } else {
          gameState.items.push({ id: item.id, name: item.name || item.id, count: item.count || 1 });
        }
      });
    }

    saveGame();
    showRewardAnimation(rewards);
  }

  window.showRewardAnimation = showRewardAnimation;
  window.applyReward         = applyReward;

}());

// ── Newbie Arrow ──────────────────────────────────────────
//
// showNewbieArrow(selector)  — point a gentle bouncing arrow at a hub button
// hideNewbieArrow()          — remove the arrow
//
// Lifecycle:
//
//   showNewbieArrow(sel)
//        │
//        ▼
//   isNewbie()? ──NO──▶ return (no-op)
//        │
//       YES
//        │
//        ▼
//   _arrowTarget = sel
//   _doShow(sel) ──▶ position ▼ over target, bounce CSS
//        │
//        ├─ poll/500ms: isNewbie() false? ──YES──▶ hideNewbieArrow()
//        │
//        └─ idle timer: 3s no activity ──▶ _doShow(sel) if still newbie
//                                      OR  point to Quests if no explicit target
//
//   clearNewbieTag() sets tutorialStep = -1 → isNewbie() = false → poll fires
//
(function () {

  var _arrowEl    = null;
  var _arrowTgt   = null;   // current registered selector (null when cleared)
  var _pollId     = null;
  var _idleId     = null;
  var _lastActive = Date.now();
  var IDLE_MS     = 3000;

  // ── Activity tracker ────────────────────────────────────
  // On any activity: cancel pending idle timer, restart it.
  ['mousemove', 'touchstart', 'keydown', 'click'].forEach(function (evt) {
    document.addEventListener(evt, function () {
      _lastActive = Date.now();
      if (_idleId) { clearTimeout(_idleId); _idleId = null; }
      _scheduleIdleCheck();
    }, { passive: true });
  });

  function _scheduleIdleCheck() {
    if (_idleId) return;
    // Only bother if we might have something to show
    if (!_arrowTgt && !(typeof window.isNewbie === 'function' && window.isNewbie())) return;
    _idleId = setTimeout(function () {
      _idleId = null;
      if (typeof window.isNewbie === 'function' && !window.isNewbie()) return;
      if (_arrowTgt) {
        // Re-show the registered target (arrow may have been swept away)
        if (!_arrowEl) _doShow(_arrowTgt);
      } else {
        // Quest fallback: point at Quests nav if any quest is incomplete
        _tryQuestArrow();
      }
    }, IDLE_MS);
  }

  function _tryQuestArrow() {
    if (typeof gameState === 'undefined' || !gameState.dailyQuests) return;
    var keys = window.QUEST_KEYS || [];
    var hasIncomplete = keys.some(function (k) {
      return gameState.dailyQuests.progress[k] !== 1;
    });
    if (hasIncomplete) _doShow('[data-nav="Quests"]');
  }

  // ── CSS (injected once) ──────────────────────────────────
  function _ensureStyles() {
    if (document.getElementById('_newbie-arrow-style')) return;
    var s = document.createElement('style');
    s.id = '_newbie-arrow-style';
    // 7 px amplitude, 1.4 s period — visible but not aggressive
    s.textContent =
      '@keyframes _nbounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}' +
      '#newbie-arrow{' +
        'position:fixed;font-size:22px;z-index:7000;pointer-events:none;' +
        'animation:_nbounce 1.4s ease-in-out infinite;' +
        'text-shadow:0 0 8px rgba(241,196,15,0.7);line-height:1;' +
      '}';
    document.head.appendChild(s);
  }

  // ── Position helper ──────────────────────────────────────
  function _positionArrow(selector) {
    if (!_arrowEl) return;
    var target = document.querySelector(selector);
    if (!target) { _arrowEl.style.visibility = 'hidden'; return; }
    var rect = target.getBoundingClientRect();
    _arrowEl.style.left       = (rect.left + rect.width / 2 - 11) + 'px';
    _arrowEl.style.top        = Math.max(4, rect.top - 32) + 'px';
    _arrowEl.style.visibility = 'visible';
  }

  // ── Core show ────────────────────────────────────────────
  function _doShow(selector) {
    _ensureStyles();
    if (!_arrowEl) {
      _arrowEl = document.createElement('div');
      _arrowEl.id = 'newbie-arrow';
      _arrowEl.textContent = '\u25bc';   // ▼
      document.body.appendChild(_arrowEl);
    }
    _positionArrow(selector);

    // Poll: auto-hide when tutorial ends
    if (_pollId) clearInterval(_pollId);
    _pollId = setInterval(function () {
      if (typeof window.isNewbie === 'function' && !window.isNewbie()) {
        hideNewbieArrow();
      }
    }, 500);
  }

  // ── Public API ───────────────────────────────────────────
  function showNewbieArrow(selector) {
    if (typeof window.isNewbie === 'function' && !window.isNewbie()) return;
    _arrowTgt = selector;
    _doShow(selector);
    _scheduleIdleCheck();
  }

  function hideNewbieArrow() {
    if (_arrowEl && _arrowEl.parentNode) _arrowEl.parentNode.removeChild(_arrowEl);
    _arrowEl  = null;
    _arrowTgt = null;
    if (_pollId) { clearInterval(_pollId); _pollId = null; }
    if (_idleId) { clearTimeout(_idleId);  _idleId = null; }
  }

  window.showNewbieArrow = showNewbieArrow;
  window.hideNewbieArrow = hideNewbieArrow;

}());
