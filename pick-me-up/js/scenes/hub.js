// ═══════════════════════════════════════════════════════════
// LOBBY — bottom-nav + top-HUD layout
// ═══════════════════════════════════════════════════════════
// TODO: Animated pixel characters walk around the Lobby virtual space.
//       Summoned heroes appear as tiny sprites that idle/roam the Lobby.
//       Implementation TBD after art pass.

function showHub() {
  document.getElementById('tutorial-ui').style.display = 'none';
  drawBackground(true);
  const hubUI = document.getElementById('hub-ui');
  hubUI.style.display = 'block';
  document.getElementById('hub-player-name').textContent = gameState.playerNickname;
  updateGemsDisplay();
  updateGoldDisplay();
  if (typeof updateMailBadge  === 'function') updateMailBadge();
  if (typeof updateQuestBadge === 'function') updateQuestBadge();
  resetHubMain();
  _setupTutDialogueDim();
}

/* ── FLOATING ISELLE (lobby) ─────────────────── */
var _iselleLobbyCanvas = null;
var _iselleLobbyAnim   = null;
var _iselleLobbyImg    = null;

function startIselleLobbyFloat() {
  stopIselleLobbyFloat();
  var main = document.getElementById('hub-main');
  if (!main) return;
  main.style.position = 'relative';

  var canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  canvas.style.cssText =
    'position:absolute;width:64px;height:64px;' +
    'image-rendering:pixelated;image-rendering:crisp-edges;' +
    'pointer-events:none;z-index:5;';
  main.appendChild(canvas);
  _iselleLobbyCanvas = canvas;

  var img = new Image();
  img.onload = function () {
    _iselleLobbyImg = img;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // Row 3, Col 3 (0-indexed 2,2)
    ctx.drawImage(img, 128, 128, 64, 64, 0, 0, 64, 64);

    // Smooth floating path
    var t = Math.random() * 100;
    var rect = main.getBoundingClientRect();
    var mw = rect.width  - 64;
    var mh = rect.height - 64;
    var cx = mw * 0.5, cy = mh * 0.4;

    (function loop() {
      t += 0.006;
      var x = cx + Math.sin(t * 0.7) * (mw * 0.32);
      var y = cy + Math.sin(t * 1.1) * (mh * 0.22) + Math.sin(t * 2.3) * 6;
      canvas.style.left = x + 'px';
      canvas.style.top  = y + 'px';
      _iselleLobbyAnim = requestAnimationFrame(loop);
    })();
  };
  img.src = 'assets/character_assets/isellespritesheet.png';
}

function stopIselleLobbyFloat() {
  if (_iselleLobbyAnim) { cancelAnimationFrame(_iselleLobbyAnim); _iselleLobbyAnim = null; }
  if (_iselleLobbyCanvas && _iselleLobbyCanvas.parentNode) {
    _iselleLobbyCanvas.parentNode.removeChild(_iselleLobbyCanvas);
  }
  _iselleLobbyCanvas = null;
}

/* ── LOBBY BUILDINGS ─────────────────────────
   Placeholder buildings rendered in the lobby view.
   Spire uses data-nav="City" — the exact selector tutorial.js targets
   via highlightButton('[data-nav="City"]') in guide steps.
   Since there is no City nav button in the bottom bar, this element
   IS the first (and only) match for that selector. */
function _lobbyBuildingsHTML() {
  _ensureLobbyStyles();

  var spire  = gameState.city && gameState.city.buildings && gameState.city.buildings.mysticSpire;
  var bakery = gameState.city && gameState.city.buildings && gameState.city.buildings.bakery;
  var spireLevel     = spire  ? (spire.level   || 0) : 0;
  var bakeryUnlocked = bakery ? !!bakery.unlocked    : false;
  var bread          = gameState.bread || 0;
  var BREAD_CAP      = 200;

  var spireLevelLine = spireLevel > 0
    ? '<div style="color:#888899;font-size:11px;letter-spacing:1px;margin-top:6px">Level ' + spireLevel + '</div>'
    : '<div style="color:#555566;font-size:11px;letter-spacing:1px;margin-top:6px">[ Not yet upgraded ]</div>';

  var breadLine = bakeryUnlocked
    ? '<div style="color:#F1C40F;font-size:12px;margin-top:6px">\uD83C\uDF5E Bread: ' + bread + '\u200A/\u200A' + BREAD_CAP + '</div>'
    : '';

  return (
    '<div style="display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px 16px;">' +

      // ── MYSTIC SPIRE ─────────────────────────────────────────────────────
      // data-nav="City" → exact selector tutorial.js uses: '[data-nav="City"]'
      // TODO: replace with actual Spire asset when available
      '<div id="lobby-spire" data-nav="City"' +
        ' onclick="hubNav(\'City\')"' +
        ' style="cursor:pointer;background:#12001A;border:2px solid #7B2FBE;' +
               'padding:22px 40px;text-align:center;font-family:\'Courier New\',monospace;' +
               'min-width:180px;user-select:none;' +
               'animation:lobby-spire-pulse 1.6s ease-in-out infinite alternate;">' +
        '<div style="font-size:26px;margin-bottom:8px">\u2728</div>' +
        '<div style="color:#FFFFFF;font-size:14px;letter-spacing:2px">\u2728 Mystic Spire</div>' +
        spireLevelLine +
      '</div>' +

      // ── LOGIN REWARDS ────────────────────────────────────────────────────
      '<div id="lobby-login-rewards"' +
        ' onclick="if(typeof showLoginRewardsScene===\'function\'){showLoginRewardsScene();}"' +
        ' style="cursor:pointer;background:#12001A;border:2px solid #EAB308;' +
               'padding:16px 32px;text-align:center;font-family:\'Courier New\',monospace;' +
               'min-width:180px;user-select:none;">' +
        '<div style="font-size:22px;margin-bottom:8px">\uD83C\uDF81</div>' +
        '<div style="color:#FFFFFF;font-size:13px;letter-spacing:2px">Login Rewards</div>' +
      '</div>' +

      // ── BAKERY ───────────────────────────────────────────────────────────
      // Hidden until gameState.city.buildings.bakery.unlocked === true
      // TODO: replace with actual Bakery asset when available
      '<div id="lobby-bakery"' +
        ' onclick="hubNav(\'City\')"' +
        ' style="cursor:pointer;background:#12001A;border:2px solid #E67E22;' +
               'padding:16px 32px;text-align:center;font-family:\'Courier New\',monospace;' +
               'min-width:180px;user-select:none;' +
               'display:' + (bakeryUnlocked ? 'block' : 'none') + ';">' +
        '<div style="font-size:22px;margin-bottom:8px">\uD83C\uDF5E</div>' +
        '<div style="color:#FFFFFF;font-size:13px;letter-spacing:2px">\uD83C\uDF5E Bakery</div>' +
        breadLine +
      '</div>' +

    '</div>'
  );
}

/* Inject lobby-specific keyframes once into the document. */
var _lobbyStylesInjected = false;
function _ensureLobbyStyles() {
  if (_lobbyStylesInjected) return;
  _lobbyStylesInjected = true;
  var s = document.createElement('style');
  s.textContent =
    '@keyframes lobby-spire-pulse {' +
      '0%   { box-shadow: 0 0  6px #7B2FBE, 0 0 12px rgba(123,47,190,0.3); border-color: #7B2FBE; }' +
      '100% { box-shadow: 0 0 22px #7B2FBE, 0 0 40px rgba(123,47,190,0.6); border-color: #BB66FF; }' +
    '}';
  document.head.appendChild(s);
}

function resetHubMain() {
  var main = document.getElementById('hub-main');
  main.className = '';           // strip scene mode classes
  main.style.cssText = '';       // clear any inline overrides
  main.innerHTML =
    '<div style="color:var(--text-muted);text-align:center;padding-top:8px">' +
      '<div style="font-size:13px;letter-spacing:2px;margin-bottom:6px">— LOBBY —</div>' +
      '<div style="font-size:11px;opacity:0.6">Your summoned heroes idle here</div>' +
    '</div>' +
    _lobbyBuildingsHTML();
  document.querySelectorAll('.hub-nav-btn').forEach(b => b.classList.remove('active'));
  showFloatingButtons(true);
  startIselleLobbyFloat();
}

/* ── TUTORIAL DIALOGUE DARKENING ─────────────────
   When #tut-dialogue becomes visible (display:flex), a semi-transparent
   dim div fades in behind it inside #tut-overlay. During guide steps the
   tutorial hides the entire overlay (overlay.style.display='none'), so
   the dim vanishes automatically — the highlighted building stays fully
   visible and tappable with no extra pointer-events work needed. */
var _dimObserverSetup = false;
function _setupTutDialogueDim() {
  if (_dimObserverSetup) return;
  _dimObserverSetup = true;

  var tutOverlay = document.getElementById('tut-overlay');
  var dialogue   = document.getElementById('tut-dialogue');
  if (!tutOverlay || !dialogue) return;

  // Insert dim as first child so DOM order puts it behind dialogue (no z-index needed).
  var dim = document.createElement('div');
  dim.id = 'tut-lobby-dim';
  dim.style.cssText =
    'position:absolute;inset:0;background:rgba(0,0,0,0.55);' +
    'pointer-events:none;opacity:0;transition:opacity 0.2s;';
  tutOverlay.insertBefore(dim, tutOverlay.firstChild);

  // Watch #tut-dialogue style changes (showDialogue sets display:flex, hideDialogue sets display:none).
  new MutationObserver(function () {
    dim.style.opacity = (dialogue.style.display === 'flex') ? '1' : '0';
  }).observe(dialogue, { attributes: true, attributeFilter: ['style'] });
}

/**
 * Exit from Phaser scenes back to the HTML Hub UI.
 * Called by Phaser scenes (Lobby, Tower, etc.) when user presses ESC or exits.
 */
function exitToHub() {
  showHub();
}

/* Show / hide the floating side buttons when entering / leaving a scene */
function showFloatingButtons(visible) {
  const left  = document.getElementById('hub-float-left');
  const right = document.getElementById('hub-float-right');
  if (left)  left.style.display  = visible ? 'flex' : 'none';
  if (right) right.style.display = visible ? 'flex' : 'none';
}

function hubNav(name) {
  // Launch Phaser Lobby for the walkable town hub
  if (name === 'Lobby') {
    resetHubMain();
    return;
  }

  /* Highlight matching bottom-nav button */
  document.querySelectorAll('.hub-nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.nav === name);
  });
  currentScene = name;
  showFloatingButtons(false);           // hide floats when inside a scene
  stopIselleLobbyFloat();               // stop lobby Iselle animation

  if      (name === 'Knights')    showHeroesScene();
  else if (name === 'Summon')     showSummonScene();
  else if (name === 'Inventory')  showInventoryScene();
  else if (name === 'Dungeon')    showDungeonsScene();
  else if (name === 'Arena')      showArenaScene();
  else if (name === 'Tower')      showTowerScene();
  else if (name === 'Quest')      showQuestScene();
  else if (name === 'Shop')       showShopScene();
  else if (name === 'Synthesis')  showSynthesisScene();
  else if (name === 'Promotion')  showPromotionScene();
  else if (name === 'Mail')       showMailScene();
  else if (name === 'Tutorial') {
    // DEV: temporary test button — remove when tutorial is finalized
    resetHubMain();
    setTimeout(() => runTutorial(), 300);
  }
  else {
    resetHubMain();
    console.log('Hub nav:', name);
  }
}

function updateGemsDisplay() {
  const el = document.getElementById('hub-gems');
  if (el) el.textContent = gameState.gems;
}

function updateGoldDisplay() {
  const el = document.getElementById('hub-gold');
  if (el) el.textContent = gameState.gold || 0;
}

function showTutorialScene() {
  drawBackground(true);
  document.getElementById('tutorial-ui').style.display = 'flex';
}

function registerSceneHub() {
  // Hidden gem refill: click hub-gems 5× within 2s
  let count = 0, timer = null;
  document.addEventListener('click', e => {
    if (!e.target || e.target.id !== 'hub-gems') return;
    count++;
    clearTimeout(timer);
    timer = setTimeout(() => count = 0, 2000);
    if (count >= 5) {
      count = 0;
      gameState.gems += 15000;
      updateGemsDisplay();
      saveGame();
      const el = document.getElementById('hub-gems');
      if (el) { el.style.color = '#FFD700'; setTimeout(() => el.style.color = '', 800); }
    }
  });
}
