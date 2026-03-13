// ═══════════════════════════════════════════════════════════
// MAIN — canvas setup + entry point
// ═══════════════════════════════════════════════════════════

// Canvas setup
const canvas = document.getElementById('gameCanvas');
canvas.width  = 1280;
canvas.height = 720;
canvas.style.width  = '100vw';
canvas.style.height = '100vh';
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

function drawBackground(showGrid) {
  ctx.fillStyle = '#0D0010';
  ctx.fillRect(0, 0, 1280, 720);
  if (showGrid) {
    ctx.strokeStyle = '#1A0025'; ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke(); }
    for (let y = 0; y < 720; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke(); }
  }
}

drawBackground(false);

// Register all scenes (sets up event listeners and any init logic)
registerSceneBoot();
registerSceneIntro();
registerSceneHub();
registerSceneHeroes();
registerSceneSummon();
registerSceneTower();
registerSceneDungeons();
registerSceneTutorial();
registerSceneSynthesis();
registerScenePromotion();
registerSceneShop();
registerSceneManor();
registerSceneInventory();
registerSceneArena();

// Entry point
(function init() {
  // Pre-warm common enemy sprites in the background (non-blocking)
  if (typeof SpriteGen !== 'undefined') {
    SpriteGen.prewarmEnemySprites();

    // Generate sprites for any heroes missing them (e.g. from older saves)
    gameState.inventory.forEach(function (item) {
      if (item.type === 'hero' && !item.spriteId) {
        SpriteGen.generateHeroSprite(item).then(function (data) {
          item.spriteId = data.spriteId;
          saveGame();
          console.log('[Main] Generated missing sprite for', item.name, data.spriteId);
        }).catch(function () { /* server not running */ });
      }
    });
  }

  if (loadGame()) {
    document.getElementById('boot-ui').style.display = 'none';
    showHub();
    // Check AFK idle rewards after hub is shown
    if (typeof AfkRewards !== 'undefined') {
      AfkRewards.checkAfkRewards();
    }
  } else {
    runIntroFlow();
  }

  // Start AFK timer for all sessions (stamps time periodically + on unload)
  if (typeof AfkRewards !== 'undefined') {
    AfkRewards.startAfkTimer();
  }
})();
