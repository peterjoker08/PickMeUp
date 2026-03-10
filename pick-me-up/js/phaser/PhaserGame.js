// ═══════════════════════════════════════════════════════════
// PHASER GAME MANAGER
// Integrates Phaser alongside existing HTML UI
// ═══════════════════════════════════════════════════════════

const PhaserGame = (function() {
  let game = null;
  let isActive = false;

  // ─── Game Configuration ──────────────────────────────────
  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 1280,
    height: 720,
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [] // Scenes added dynamically
  };

  // ─── Initialize Phaser ───────────────────────────────────
  function init() {
    if (game) return game;

    // Create container for Phaser canvas
    let container = document.getElementById('phaser-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'phaser-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 5;
        display: none;
      `;
      document.body.insertBefore(container, document.getElementById('ui-layer'));
    }

    // Add all scenes to config
    config.scene = [
      PhaserSceneLobby,
      PhaserSceneTower,
      PhaserSceneCutscene
    ];

    game = new Phaser.Game(config);
    console.log('[Phaser] Game initialized');
    return game;
  }

  // ─── Show Phaser (hide vanilla canvas) ───────────────────
  function show(sceneName, sceneData) {
    if (!game) init();

    // Hide vanilla canvas, show Phaser container
    const vanillaCanvas = document.getElementById('gameCanvas');
    const phaserContainer = document.getElementById('phaser-container');
    
    if (vanillaCanvas) vanillaCanvas.style.display = 'none';
    if (phaserContainer) phaserContainer.style.display = 'block';

    // Start or switch to the requested scene
    if (sceneName) {
      game.scene.start(sceneName, sceneData || {});
    }

    isActive = true;
    console.log(`[Phaser] Showing scene: ${sceneName}`);
  }

  // ─── Hide Phaser (show vanilla canvas) ───────────────────
  function hide() {
    const vanillaCanvas = document.getElementById('gameCanvas');
    const phaserContainer = document.getElementById('phaser-container');

    if (phaserContainer) phaserContainer.style.display = 'none';
    if (vanillaCanvas) vanillaCanvas.style.display = 'block';

    // Stop all active Phaser scenes
    if (game) {
      game.scene.getScenes(true).forEach(scene => {
        game.scene.stop(scene.scene.key);
      });
    }

    isActive = false;
    console.log('[Phaser] Hidden, vanilla canvas restored');
  }

  // ─── Get current scene ───────────────────────────────────
  function getScene(key) {
    return game ? game.scene.getScene(key) : null;
  }

  // ─── Check if Phaser is active ───────────────────────────
  function active() {
    return isActive;
  }

  // ─── Public API ──────────────────────────────────────────
  return {
    init,
    show,
    hide,
    getScene,
    active,
    get game() { return game; }
  };
})();

// Initialize Phaser on load (but don't show it)
document.addEventListener('DOMContentLoaded', () => {
  // Delay init slightly to ensure Phaser CDN is loaded
  setTimeout(() => {
    if (typeof Phaser !== 'undefined') {
      PhaserGame.init();
    }
  }, 100);
});
