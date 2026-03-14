// ═══════════════════════════════════════════════════════════
// DAILY QUESTS SYSTEM
// ═══════════════════════════════════════════════════════════
// Reads QUEST_KEYS from gameState.js (defined before this loads).
// Loaded after helpers.js so applyReward() is available.
//
// Quest flow:
//   Scene hooks → progressDailyQuest(key) → progress[key]=1 → badge
//   Quest panel → [ CLAIM ] → claimQuestReward(key) → applyReward → claimed[key]=true
//   All 6 done → [ CLAIM BONUS ] → claimAllCompleteBonus() → applyReward
//
// Daily reset (3rd use of ISO-date pattern after checkShopReset, checkDungeonResets):
//   new Date().toISOString().slice(0,10) compared to lastReset

(function () {

  // ── Quest definitions ─────────────────────────────────────
  // Keys must match window.QUEST_KEYS in gameState.js exactly.
  // reward fields map 1-to-1 to applyReward() — any currency key is valid.
  var QUEST_DEFS = {
    towerChallenge: { label: 'Complete Tower Challenge',   reward: { gems: 30, schematics: 5 } },
    summon:         { label: 'Summon from Any Banner',     reward: { gems: 30 } },
    towerRewards:   { label: 'Claim Tower Daily Reward',   reward: { gold: 500 } },
    expedition:     { label: 'Dispatch an Expedition',     reward: { gold: 300, schematics: 5 } },
    shopPurchase:   { label: 'Purchase from Shop',         reward: { gems: 20 } },
    talkToHero:     { label: 'Talk to a Hero',             reward: { gems: 20 } },
  };

  var ALL_COMPLETE_BONUS = { gems: 150, gold: 500, schematics: 20 };

  // ── Daily reset ───────────────────────────────────────────
  // Follows checkShopReset() pattern exactly (3rd instance).
  function checkDailyQuestReset() {
    if (!gameState.dailyQuests) return;
    var today = new Date().toISOString().slice(0, 10);
    if (gameState.dailyQuests.lastReset !== today) {
      QUEST_KEYS.forEach(function (k) {
        gameState.dailyQuests.progress[k] = 0;
        gameState.dailyQuests.claimed[k]  = false;
      });
      gameState.dailyQuests.allCompleteClaimed = false;
      gameState.dailyQuests.lastReset          = today;
      saveGame();
      console.log('[DailyQuests] Reset for', today);
    }
  }

  // ── Progress a quest ──────────────────────────────────────
  // Called from scene hooks (arena.js, summon.js, tower.js, gameState.js).
  // No-ops if quest already complete today.
  function progressDailyQuest(key) {
    if (!gameState.dailyQuests) return;
    checkDailyQuestReset();
    if (gameState.dailyQuests.progress[key] === 1) return;
    gameState.dailyQuests.progress[key] = 1;
    saveGame();
    updateQuestBadge();
    console.log('[DailyQuests] Progressed:', key);
  }

  // ── Claim an individual quest reward ─────────────────────
  // Double-claim guard: checks both progress and claimed flags.
  // Delivers reward inline via applyReward() (instant, no mailbox visit).
  function claimQuestReward(key) {
    if (!gameState.dailyQuests) return;
    if (gameState.dailyQuests.progress[key] !== 1) return;  // not yet done
    if (gameState.dailyQuests.claimed[key])         return;  // already claimed

    gameState.dailyQuests.claimed[key] = true;
    saveGame();

    var def = QUEST_DEFS[key];
    if (def) {
      applyReward(def.reward);
    }

    updateQuestBadge();
    _renderQuestPanel();
  }

  // ── Claim all-complete bonus ──────────────────────────────
  function claimAllCompleteBonus() {
    if (!gameState.dailyQuests) return;
    if (gameState.dailyQuests.allCompleteClaimed) return;

    var allDone = QUEST_KEYS.every(function (k) {
      return gameState.dailyQuests.progress[k] === 1;
    });
    if (!allDone) return;

    gameState.dailyQuests.allCompleteClaimed = true;
    saveGame();

    applyReward(ALL_COMPLETE_BONUS);

    _renderQuestPanel();
  }

  // ── Reward display string ─────────────────────────────────
  // Builds a human-readable reward summary from any applyReward()-compatible
  // object. Supports all currency fields; skips zero/falsy values.
  // Returns '—' when reward is empty.
  function _rewardStr(reward) {
    var parts = [];
    if (reward.gems)       parts.push('💎 ' + reward.gems       + ' Gems');
    if (reward.gold)       parts.push('🪙 ' + reward.gold       + ' Gold');
    if (reward.schematics) parts.push('🔩 ' + reward.schematics + ' BD');
    if (reward.wishes)     parts.push('🌟 ' + reward.wishes     + ' Wish');
    if (reward.bread)      parts.push('🍞 ' + reward.bread      + ' Bread');
    return parts.length > 0 ? parts.join(' · ') : '—';
  }

  // ── Quest badge ───────────────────────────────────────────
  // Shows count of quests not yet completed (progress !== 1).
  // Called after every progressDailyQuest and from showHub().
  function updateQuestBadge() {
    var el = document.getElementById('quest-badge');
    if (!el || !gameState.dailyQuests) return;
    checkDailyQuestReset();
    var incomplete = QUEST_KEYS.filter(function (k) {
      return gameState.dailyQuests.progress[k] !== 1;
    }).length;
    el.textContent   = incomplete;
    el.style.display = incomplete > 0 ? 'inline-block' : 'none';
  }

  // ── Quest scene ───────────────────────────────────────────
  function showQuestScene() {
    migrateInventory();
    checkDailyQuestReset();
    var main = document.getElementById('hub-main');
    main.className = 'hub-main--list';
    main.innerHTML = '<div id="quest-scene" style="width:100%;padding:28px 36px;min-height:100%"></div>';
    _renderQuestPanel();
  }

  function _renderQuestPanel() {
    var container = document.getElementById('quest-scene');
    if (!container) return;

    var dq        = gameState.dailyQuests;
    var doneCount = QUEST_KEYS.filter(function (k) { return dq.progress[k] === 1; }).length;
    var allDone   = doneCount === QUEST_KEYS.length;

    var questRowsHTML = QUEST_KEYS.map(function (key) {
      var def       = QUEST_DEFS[key];
      var done      = dq.progress[key] === 1;
      var claimed   = dq.claimed[key];
      var rewardStr = _rewardStr(def.reward);
      var statusCol  = done ? '#4CAF50' : '#888899';
      var statusText = done ? '[ ✓ DONE ]' : '[  ○  ]';

      var btnHTML;
      if (done && !claimed) {
        btnHTML = `<button class="quest-claim-btn" data-key="${escHtml(key)}"
          style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
                 font-family:'Courier New',monospace;font-size:11px;padding:5px 14px;
                 cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
          onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
          onmouseout="this.style.boxShadow=''">[ CLAIM ]</button>`;
      } else if (claimed) {
        btnHTML = `<span style="color:#4CAF50;font-size:11px;letter-spacing:1px;min-width:80px;display:inline-block;text-align:right">[ ✓ ]</span>`;
      } else {
        btnHTML = `<span style="color:#333348;font-size:11px;letter-spacing:1px;min-width:80px;display:inline-block;text-align:right">[ CLAIM ]</span>`;
      }

      return `
        <div style="display:flex;align-items:center;justify-content:space-between;
                    padding:12px 0;border-bottom:1px solid #2A003A">
          <div style="display:flex;align-items:center;gap:14px;flex:1">
            <span style="color:${statusCol};font-size:12px;min-width:72px;font-family:'Courier New',monospace">${statusText}</span>
            <div>
              <div style="color:#FFFFFF;font-size:13px;letter-spacing:1px">${escHtml(def.label)}</div>
              <div style="color:#888899;font-size:11px;letter-spacing:1px;margin-top:2px">${rewardStr}</div>
            </div>
          </div>
          <div style="margin-left:16px">${btnHTML}</div>
        </div>`;
    }).join('');

    var bonusHTML;
    if (allDone && !dq.allCompleteClaimed) {
      bonusHTML = `
        <div style="margin-top:20px;padding:16px;border:2px solid #F1C40F;background:rgba(241,196,15,0.06)">
          <div style="color:#F1C40F;font-size:13px;letter-spacing:2px;margin-bottom:8px">[ ALL QUESTS COMPLETE! ]</div>
          <div style="color:#E8D5FF;font-size:11px;margin-bottom:12px">Bonus Reward: ${_rewardStr(ALL_COMPLETE_BONUS)}</div>
          <button id="quest-all-claim-btn"
            style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
                   font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
                   cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
            onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
            onmouseout="this.style.boxShadow=''">[ CLAIM BONUS ]</button>
        </div>`;
    } else if (allDone && dq.allCompleteClaimed) {
      bonusHTML = `
        <div style="margin-top:20px;padding:16px;border:2px solid #2A003A;text-align:center">
          <span style="color:#4CAF50;font-size:13px;letter-spacing:2px">[ ★ ALL BONUSES CLAIMED ★ ]</span>
        </div>`;
    } else {
      bonusHTML = `
        <div style="margin-top:20px;padding:14px 16px;border:1px solid #2A003A">
          <div style="color:#888899;font-size:12px;letter-spacing:1px;display:flex;justify-content:space-between">
            <span>Complete all ${QUEST_KEYS.length} for bonus: ${_rewardStr(ALL_COMPLETE_BONUS)}</span>
            <span style="color:#E8D5FF">${doneCount} / ${QUEST_KEYS.length}</span>
          </div>
        </div>`;
    }

    container.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
        <div style="width:90px"></div>
        <div style="color:#FFFFFF;font-size:18px;letter-spacing:3px;font-family:'Courier New',monospace">[ DAILY QUESTS ]</div>
        <div style="color:#E8D5FF;font-size:12px;letter-spacing:1px;font-family:'Courier New',monospace">${doneCount} / ${QUEST_KEYS.length}</div>
      </div>

      <div style="background:#12001A;border:2px solid #C0C0D0;
                  box-shadow:0 0 15px rgba(123,47,190,0.5);padding:24px 28px;">
        <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:4px">[ TODAY'S QUESTS ]</div>
        <div style="color:#555566;font-size:10px;letter-spacing:1px;margin-bottom:16px">Resets at midnight UTC</div>
        ${questRowsHTML}
        ${bonusHTML}
      </div>`;

    // Wire claim buttons
    container.querySelectorAll('.quest-claim-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;  // double-claim guard on the UI side
        claimQuestReward(btn.dataset.key);
      });
    });

    var allBtn = container.querySelector('#quest-all-claim-btn');
    if (allBtn) {
      allBtn.addEventListener('click', function () {
        allBtn.disabled = true;
        claimAllCompleteBonus();
      });
    }
  }

  // ── Exports ───────────────────────────────────────────────
  window.progressDailyQuest   = progressDailyQuest;
  window.claimQuestReward     = claimQuestReward;
  window.checkDailyQuestReset = checkDailyQuestReset;
  window.updateQuestBadge     = updateQuestBadge;
  window.showQuestScene       = showQuestScene;

}());
