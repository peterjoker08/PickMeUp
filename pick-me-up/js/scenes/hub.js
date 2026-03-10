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
  if (typeof updateMailBadge === 'function') updateMailBadge();
  resetHubMain();
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

function resetHubMain() {
  var main = document.getElementById('hub-main');
  main.className = '';           // strip scene mode classes
  main.style.cssText = '';       // clear any inline overrides
  main.innerHTML =
    '<div style="color:var(--text-muted);text-align:center">' +
      '<div style="font-size:13px;letter-spacing:2px;margin-bottom:8px">— LOBBY —</div>' +
      '<div style="font-size:11px;opacity:0.6">Your summoned heroes idle here</div>' +
    '</div>';
  document.querySelectorAll('.hub-nav-btn').forEach(b => b.classList.remove('active'));
  showFloatingButtons(true);
  startIselleLobbyFloat();
}

/**
 * Exit from Phaser scenes back to the HTML Hub UI.
 * Called by Phaser scenes (Lobby, Tower, etc.) when user presses ESC or exits.
 */
function exitToHub() {
  if (typeof PhaserGame !== 'undefined') {
    PhaserGame.hide();
  }
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
    // Show Phaser walkable lobby instead of static HTML
    if (typeof PhaserGame !== 'undefined') {
      PhaserGame.show('Lobby');
    }
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
