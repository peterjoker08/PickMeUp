// ═══════════════════════════════════════════════════════════
// PHASER TOWER SCENE (Placeholder)
// Tower floor exploration and combat
// ═══════════════════════════════════════════════════════════

class PhaserSceneTower extends Phaser.Scene {
  constructor() {
    super({ key: 'Tower' });
  }

  init(data) {
    this.floor = data.floor || 1;
  }

  create() {
    // Placeholder for tower scene
    this.add.text(640, 360, `Tower Floor ${this.floor}\n\n[Press ESC to exit]`, {
      fontSize: '32px',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-ESC', () => {
      PhaserGame.hide();
      if (typeof hubNav === 'function') hubNav('Tower');
    });
  }
}

if (typeof window !== 'undefined') {
  window.PhaserSceneTower = PhaserSceneTower;
}
