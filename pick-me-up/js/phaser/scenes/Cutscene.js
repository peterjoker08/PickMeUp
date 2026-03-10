// ═══════════════════════════════════════════════════════════
// PHASER CUTSCENE SCENE (Placeholder)
// Scripted dialogue sequences with character animations
// ═══════════════════════════════════════════════════════════

class PhaserSceneCutscene extends Phaser.Scene {
  constructor() {
    super({ key: 'Cutscene' });
  }

  init(data) {
    this.cutsceneId = data.id || 'intro';
    this.onComplete = data.onComplete || null;
  }

  create() {
    // Placeholder for cutscene
    this.add.text(640, 360, `Cutscene: ${this.cutsceneId}\n\n[Press SPACE to skip]`, {
      fontSize: '32px',
      fill: '#ffffff',
      align: 'center'
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown-SPACE', () => {
      this.endCutscene();
    });
  }

  endCutscene() {
    if (this.onComplete) {
      this.onComplete();
    }
    PhaserGame.hide();
  }
}

if (typeof window !== 'undefined') {
  window.PhaserSceneCutscene = PhaserSceneCutscene;
}
