// ═══════════════════════════════════════════════════════════
// MAILBOX / REWARD SYSTEM
// ═══════════════════════════════════════════════════════════
// gameState.mailbox[] — array of mail objects.
// Each mail: { id, from, subject, body, rewards, read, claimed, expires, timestamp }

(function () {

  /**
   * Send a mail to the player's mailbox.
   * @param {Object} opts — { from, subject, body, rewards: { gems, gold, items: [{id,name,count}] }, expires }
   */
  function sendMail(opts) {
    if (!Array.isArray(gameState.mailbox)) gameState.mailbox = [];
    var mail = {
      id:        opts.id || ('mail_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      from:      opts.from || 'System',
      subject:   opts.subject || 'No Subject',
      body:      opts.body || '',
      rewards:   opts.rewards || null,
      read:      false,
      claimed:   false,
      expires:   opts.expires || null,
      timestamp: Date.now(),
    };
    gameState.mailbox.push(mail);
    saveGame();
    updateMailBadge();
    return mail;
  }

  /** Claim rewards from a mail. */
  function claimMail(mailId) {
    var mail = (gameState.mailbox || []).find(function (m) { return m.id === mailId; });
    if (!mail)         return { ok: false, reason: 'Mail not found.' };
    if (mail.claimed)  return { ok: false, reason: 'Already claimed.' };

    if (mail.rewards) {
      if (mail.rewards.gems) {
        gameState.gems += mail.rewards.gems;
        if (typeof updateGemsDisplay === 'function') updateGemsDisplay();
      }
      if (mail.rewards.gold) {
        gameState.gold += mail.rewards.gold;
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
      }
      if (Array.isArray(mail.rewards.items)) {
        if (!Array.isArray(gameState.items)) gameState.items = [];
        mail.rewards.items.forEach(function (ri) {
          var existing = gameState.items.find(function (i) { return i.id === ri.id; });
          if (existing) {
            existing.count += (ri.count || 1);
          } else {
            gameState.items.push({ id: ri.id, name: ri.name || ri.id, count: ri.count || 1 });
          }
        });
      }
    }

    mail.claimed = true;
    mail.read    = true;
    saveGame();
    updateMailBadge();
    return { ok: true };
  }

  /** Mark mail as read. */
  function readMail(mailId) {
    var mail = (gameState.mailbox || []).find(function (m) { return m.id === mailId; });
    if (mail && !mail.read) {
      mail.read = true;
      saveGame();
      updateMailBadge();
    }
  }

  /** Delete a mail. */
  function deleteMail(mailId) {
    if (!Array.isArray(gameState.mailbox)) return false;
    var idx = gameState.mailbox.findIndex(function (m) { return m.id === mailId; });
    if (idx === -1) return false;
    gameState.mailbox.splice(idx, 1);
    saveGame();
    updateMailBadge();
    return true;
  }

  /** Get count of unread mails. */
  function getUnreadCount() {
    if (!Array.isArray(gameState.mailbox)) return 0;
    return gameState.mailbox.filter(function (m) { return !m.read; }).length;
  }

  /** Get count of unclaimed mails with rewards. */
  function getUnclaimedCount() {
    if (!Array.isArray(gameState.mailbox)) return 0;
    return gameState.mailbox.filter(function (m) { return !m.claimed && m.rewards; }).length;
  }

  /** Remove expired mails. */
  function checkExpiredMail() {
    if (!Array.isArray(gameState.mailbox)) return;
    var now = Date.now();
    var before = gameState.mailbox.length;
    gameState.mailbox = gameState.mailbox.filter(function (m) {
      return !m.expires || m.expires > now;
    });
    if (gameState.mailbox.length < before) saveGame();
    updateMailBadge();
  }

  /** Update the mail badge on the topbar icon. */
  function updateMailBadge() {
    var badge = document.getElementById('mail-badge');
    if (!badge) return;
    var count = getUnclaimedCount() || getUnreadCount();
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ══════════════════════════════════════════════════════════
  // MAILBOX SCENE — rendered inside hub-main
  // ══════════════════════════════════════════════════════════

  function showMailScene() {
    var main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';
    main.innerHTML = '';
    checkExpiredMail();

    // Header
    var header = document.createElement('div');
    header.style.cssText = 'display:flex;align-items:center;justify-content:center;margin-bottom:18px;width:100%;';
    header.innerHTML =
      '<div style="flex:1;text-align:center;">' +
        '<div style="color:#fff;font-size:18px;letter-spacing:3px;font-weight:bold;">[ MAILBOX ]</div>' +
        '<div style="color:#B8A9D0;font-size:12px;margin-top:4px;">Rewards and messages</div>' +
      '</div>';
    main.appendChild(header);

    // Claim-all button
    var unclaimed = (gameState.mailbox || []).filter(function (m) { return !m.claimed && m.rewards; });
    if (unclaimed.length > 0) {
      var claimAllBtn = document.createElement('button');
      claimAllBtn.className = 'popup-btn';
      claimAllBtn.style.cssText = 'margin-bottom:14px;align-self:flex-end;font-size:12px;padding:6px 16px;';
      claimAllBtn.textContent = '[ CLAIM ALL (' + unclaimed.length + ') ]';
      claimAllBtn.addEventListener('click', function () {
        unclaimed.forEach(function (m) { claimMail(m.id); });
        showMailScene();
      });
      main.appendChild(claimAllBtn);
    }

    // Mail list
    var mailbox = (gameState.mailbox || []).slice().reverse();
    if (mailbox.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'color:#B8A9D0;font-size:12px;text-align:center;padding:40px 0;width:100%;';
      empty.textContent = '[ No mail. ]';
      main.appendChild(empty);
      return;
    }

    var list = document.createElement('div');
    list.style.cssText = 'width:100%;display:flex;flex-direction:column;gap:8px;';

    mailbox.forEach(function (mail) {
      var card = document.createElement('div');
      card.style.cssText =
        'background:' + (mail.read ? '#12001A' : '#1A0030') + ';' +
        'border:1px solid ' + (mail.claimed ? '#C0C0D033' : (mail.read ? '#C0C0D0' : '#FFD700')) + ';' +
        'padding:12px 16px;font-family:"Courier New",monospace;cursor:pointer;' +
        'transition:box-shadow 0.2s;';
      card.addEventListener('mouseenter', function () { card.style.boxShadow = '0 0 10px #7B2FBE44'; });
      card.addEventListener('mouseleave', function () { card.style.boxShadow = 'none'; });

      var date = new Date(mail.timestamp).toLocaleDateString();

      // Build reward string
      var rewardParts = [];
      if (mail.rewards) {
        if (mail.rewards.gems) rewardParts.push(mail.rewards.gems + ' gems');
        if (mail.rewards.gold) rewardParts.push(mail.rewards.gold + ' gold');
        if (Array.isArray(mail.rewards.items)) {
          mail.rewards.items.forEach(function (i) {
            rewardParts.push((i.name || i.id) + ' \u00d7' + (i.count || 1));
          });
        }
      }
      var rewardStr = rewardParts.join(', ');

      card.innerHTML =
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">' +
          '<div style="color:' + (mail.read ? '#C0C0D0' : '#FFD700') + ';font-size:13px;font-weight:bold;">' +
            (mail.read ? '' : '\u25cf ') + escHtml(mail.subject) +
          '</div>' +
          '<div style="color:#B8A9D0;font-size:10px;">' + date + '</div>' +
        '</div>' +
        '<div style="color:#E8D5FF;font-size:11px;margin-bottom:4px;">' + escHtml(mail.from) + '</div>' +
        '<div style="color:#C0C0D0;font-size:11px;line-height:1.5;">' + escHtml(mail.body) + '</div>' +
        (rewardStr ? '<div style="color:#FFD700;font-size:11px;margin-top:6px;">\uD83D\uDCE6 ' + escHtml(rewardStr) + '</div>' : '') +
        (mail.claimed ? '<div style="color:#44FF44;font-size:10px;margin-top:4px;">\u2713 Claimed</div>' : '');

      // Claim button if unclaimed with rewards
      if (!mail.claimed && mail.rewards) {
        var claimBtn = document.createElement('button');
        claimBtn.className = 'popup-btn';
        claimBtn.style.cssText = 'margin-top:8px;font-size:11px;padding:4px 14px;';
        claimBtn.textContent = '[ CLAIM ]';
        claimBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          claimMail(mail.id);
          showMailScene();
        });
        card.appendChild(claimBtn);
      }

      // Mark read on click
      card.addEventListener('click', function () {
        readMail(mail.id);
        card.style.borderColor = mail.claimed ? '#C0C0D033' : '#C0C0D0';
      });

      list.appendChild(card);
    });

    main.appendChild(list);
  }

  // Exports
  window.sendMail          = sendMail;
  window.claimMail         = claimMail;
  window.readMail          = readMail;
  window.deleteMail        = deleteMail;
  window.getUnreadCount    = getUnreadCount;
  window.getUnclaimedCount = getUnclaimedCount;
  window.checkExpiredMail  = checkExpiredMail;
  window.updateMailBadge   = updateMailBadge;
  window.showMailScene     = showMailScene;

})();
