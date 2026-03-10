// ═══════════════════════════════════════════════════════════
// POPUP SYSTEM + INTRO SCENES
// ═══════════════════════════════════════════════════════════

function createPopup(id) {
  const container = document.getElementById('popup-container');
  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.id = id + '-overlay';
  const panel = document.createElement('div');
  panel.className = 'popup-panel';
  panel.id = id + '-panel';
  overlay.appendChild(panel);
  container.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('visible')));
  return panel;
}

function destroyPopup(id, callback) {
  const overlay = document.getElementById(id + '-overlay');
  const panel   = document.getElementById(id + '-panel');
  if (!overlay) { if (callback) callback(); return; }
  panel.classList.remove('visible');
  panel.classList.add('hiding');
  setTimeout(() => { overlay.remove(); if (callback) callback(); }, 180);
}

function typewriter(el, text, speed, onDone, skipFlag) {
  let i = 0, done = false;
  el.textContent = '';
  function tick() {
    if (done) return;
    if (skipFlag && skipFlag.value) {
      el.textContent = text; done = true; if (onDone) onDone(); return;
    }
    if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speed); }
    else { done = true; if (onDone) onDone(); }
  }
  setTimeout(tick, speed);
  return { skip: () => { if (!done) skipFlag.value = true; } };
}

// ─── SCENE 2 — NICKNAME ───────────────────────────────────
function showNicknamePopup(onComplete) {
  const panel = createPopup('nick');
  const skipFlag = { value: false };
  panel.innerHTML = `
    <div class="popup-header">[SYSTEM NOTICE]</div>
    <div class="popup-body" id="nick-body"></div>
    <div class="popup-input-wrap" id="nick-input-wrap" style="display:none">
      <input class="popup-input" id="nick-input" type="text" maxlength="6" placeholder="Enter nickname..." autocomplete="off" />
      <div class="popup-error" id="nick-error"></div>
      <div class="popup-btn-row">
        <button class="popup-btn" id="nick-confirm-btn" disabled>[CONFIRM]</button>
      </div>
    </div>`;
  const overlay = document.getElementById('nick-overlay');
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target === panel) skipFlag.value = true;
  });
  const bodyEl = document.getElementById('nick-body');
  const text = "[Please register your name, Master.]\n(2–6 characters. No spaces or special characters.)";
  let setupDone = false;

  function doSetup() {
    if (setupDone) return; setupDone = true;
    const input      = document.getElementById('nick-input');
    const confirmBtn = document.getElementById('nick-confirm-btn');
    const errorEl    = document.getElementById('nick-error');
    document.getElementById('nick-input-wrap').style.display = 'block';
    const re = /^[A-Za-z0-9]{2,6}$/;
    input.addEventListener('input', () => {
      const v = input.value;
      if (re.test(v)) { confirmBtn.disabled = false; errorEl.textContent = ''; }
      else { confirmBtn.disabled = true; errorEl.textContent = v.length > 0 ? '✗ 2–6 alphanumeric characters only.' : ''; }
    });
    const doConfirm = () => {
      if (confirmBtn.disabled) return;
      const v = input.value.trim();
      if (!re.test(v)) return;
      gameState.playerNickname = v;
      destroyPopup('nick', onComplete);
    };
    confirmBtn.addEventListener('click', doConfirm);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') doConfirm(); });
    input.focus();
  }

  typewriter(bodyEl, text, 34, () => {
    requestAnimationFrame(() => requestAnimationFrame(doSetup));
  }, skipFlag);

  const checkSkip = setInterval(() => {
    if (skipFlag.value) { clearInterval(checkSkip); requestAnimationFrame(() => requestAnimationFrame(doSetup)); }
  }, 50);
}

// ─── SCENE 3 — WELCOME ────────────────────────────────────
function showWelcomePopup(onComplete) {
  const panel = createPopup('welcome');
  const skipFlag = { value: false };
  panel.innerHTML = `
    <div class="popup-header">[SYSTEM NOTICE]</div>
    <div class="popup-body" id="welcome-body-a"></div>
    <div class="popup-body" id="welcome-body-b" style="margin-top:6px"></div>
    <div class="popup-btn-row" id="welcome-btn-row" style="display:none">
      <button class="popup-btn" id="welcome-ok-btn" disabled>[OK]</button>
    </div>`;
  const overlay = document.getElementById('welcome-overlay');
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target === panel) skipFlag.value = true;
  });
  const bodyA = document.getElementById('welcome-body-a');
  const bodyB = document.getElementById('welcome-body-b');
  const btnRow = document.getElementById('welcome-btn-row');
  const okBtn  = document.getElementById('welcome-ok-btn');
  const textA  = `[Nickname confirmed.]\n\nWelcome, ${gameState.playerNickname}, to the world of Pick Me Up!\n\nInitializing session data...\nConnecting to server...`;

  typewriter(bodyA, textA, 34, () => {
    const cursor = document.createElement('span');
    cursor.className = 'popup-cursor'; cursor.textContent = '▌';
    bodyA.appendChild(cursor);
    setTimeout(() => {
      cursor.remove();
      typewriter(bodyB, '[Connection established.]', 34, () => {
        setTimeout(() => {
          btnRow.style.display = 'flex';
          requestAnimationFrame(() => requestAnimationFrame(() => okBtn.disabled = false));
        }, 500);
      }, skipFlag);
    }, 1500);
  }, skipFlag);

  okBtn.addEventListener('click', () => {
    if (!okBtn.disabled) destroyPopup('welcome', onComplete);
  });
}

// ─── SCENE 4 — TUTORIAL PROMPT ────────────────────────────
function showTutorialPrompt(onYes, onNo) {
  const panel = createPopup('tprompt');
  const skipFlag = { value: false };
  panel.innerHTML = `
    <div class="popup-header">[SYSTEM NOTICE]</div>
    <div class="popup-body" id="tp-body"></div>
    <div class="popup-btn-row" id="tp-btn-row" style="display:none">
      <button class="popup-btn yes-btn" id="tp-yes" disabled>[YES]</button>
      <button class="popup-btn" id="tp-no" disabled>[NO]</button>
    </div>`;
  const overlay = document.getElementById('tprompt-overlay');
  overlay.addEventListener('click', e => {
    if (e.target === overlay || e.target === panel) skipFlag.value = true;
  });
  const bodyEl = document.getElementById('tp-body');
  const btnRow = document.getElementById('tp-btn-row');
  const yesBtn = document.getElementById('tp-yes');
  const noBtn  = document.getElementById('tp-no');
  typewriter(bodyEl, "[Would you like to proceed with the tutorial?]\n\nCompletion will reward you with a special gift.", 34, () => {
    btnRow.style.display = 'flex';
    requestAnimationFrame(() => requestAnimationFrame(() => { yesBtn.disabled = false; noBtn.disabled = false; }));
  }, skipFlag);
  yesBtn.addEventListener('click', () => {
    if (yesBtn.disabled) return;
    gameState.tutorialAccepted = true; saveGame();
    destroyPopup('tprompt', onYes);
  });
  noBtn.addEventListener('click', () => {
    if (noBtn.disabled) return;
    gameState.tutorialAccepted = false; saveGame();
    destroyPopup('tprompt', onNo);
  });
}

// ─── INTRO FLOW ───────────────────────────────────────────
function runIntroFlow() {
  runBootScreen(() => {
    showNicknamePopup(() => {
      showWelcomePopup(() => {
        showTutorialPrompt(
          () => {
            // Show hub underneath, then run tutorial cutscene overlaid
            showHub();
            setTimeout(() => runTutorial(), 400);
          },
          () => showHub()
        );
      });
    });
  });
}

function registerSceneIntro() {
  // All intro/popup functions are declared globally above.
}
