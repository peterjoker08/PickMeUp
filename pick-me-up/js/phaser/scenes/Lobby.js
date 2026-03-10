// ═══════════════════════════════════════════════════════════
// PHASER LOBBY SCENE
// Walkable town hub with NPCs and building entrances
// Supports LDtk tilemaps - create maps at https://ldtk.io
// ═══════════════════════════════════════════════════════════

class PhaserSceneLobby extends Phaser.Scene {
  constructor() {
    super({ key: 'Lobby' });
    
    this.player = null;
    this.cursors = null;
    this.wasd = null;
    this.playerSpeed = 160;
    this.currentAnim = 'idle_down';
    
    // LDtk map data
    this.ldtkLevel = null;
    this.useLDtk = false; // Set to true once you have a .ldtk file
    
    // LPC animation config (matching your spriteGen.js)
    this.LPC_ANIMS = {
      walk_up:    { row: 8,  frames: 9 },
      walk_left:  { row: 9,  frames: 9 },
      walk_down:  { row: 10, frames: 9 },
      walk_right: { row: 11, frames: 9 },
      idle_up:    { row: 22, frames: 2 },
      idle_left:  { row: 23, frames: 2 },
      idle_down:  { row: 24, frames: 2 },
      idle_right: { row: 25, frames: 2 },
    };
  }

  // ─── Preload Assets ──────────────────────────────────────
  preload() {
    this.load.on('progress', (value) => {
      console.log(`[Lobby] Loading: ${Math.round(value * 100)}%`);
    });

    // Check if LDtk map exists, otherwise use placeholder
    this.load.on('loaderror', (file) => {
      if (file.key === 'ldtk_lobby') {
        console.log('[Lobby] No LDtk map found, using placeholder graphics');
        this.useLDtk = false;
      }
    });

    // Try to load LDtk map
    LDtkLoader.preload(this, 'ldtk_lobby', 'assets/maps/lobby.ldtk');
    
    // Load tilesets (used by both LDtk and placeholder)
    this.load.image('tiles_grass', 'assets/tilesets/grass.png');
    this.load.spritesheet('tiles_town', 'assets/tilesets/town.png', {
      frameWidth: 32,
      frameHeight: 32
    });

    // Player sprite will be loaded dynamically from your sprite server
    this.loadPlayerSprite();
  }

  // ─── Load Player Sprite from SpriteGen ───────────────────
  loadPlayerSprite() {
    // Try to get player's first hero sprite, or generate a default
    const heroes = gameState?.inventory?.filter(i => i.type === 'hero') || [];
    const playerHero = heroes[0];
    
    if (playerHero?.spriteData) {
      // Use cached sprite data
      this.textures.addBase64('player', playerHero.spriteData);
    } else {
      // Load a default player sprite from the server
      const defaultUrl = 'http://localhost:3777/generate-class/Villager';
      
      // We'll handle this in create() since Phaser load is tricky with dynamic URLs
      this.playerSpriteUrl = defaultUrl;
    }
  }

  // ─── Create Scene ────────────────────────────────────────
  async create() {
    console.log('[Lobby] Creating scene...');
    
    // Try to load LDtk map, fall back to placeholder
    if (this.cache.json.exists('ldtk_lobby')) {
      this.useLDtk = true;
      this.createLDtkLevel();
    } else {
      this.useLDtk = false;
      this.createSimpleGround();
    }
    
    // Load player sprite
    await this.createPlayer();
    
    // Setup input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    
    // Setup camera
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
    
    // Add exit zones / building entrances (if not using LDtk entities)
    if (!this.useLDtk) {
      this.createZones();
    }
    
    // Instructions
    this.add.text(16, 16, 'WASD/Arrows to move\nESC to return to menu', {
      fontSize: '14px',
      fill: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 }
    }).setScrollFactor(0).setDepth(1000);
    
    // ESC to exit back to HTML UI
    this.input.keyboard.on('keydown-ESC', () => {
      this.exitToHub();
    });

    console.log('[Lobby] Scene ready');
  }

  // ─── Create Level from LDtk ──────────────────────────────
  createLDtkLevel() {
    console.log('[Lobby] Loading LDtk level...');
    
    // Map tileset identifiers to loaded texture keys
    const tilesetMap = {
      'grass': 'tiles_grass',
      'town': 'tiles_town',
      'Grass': 'tiles_grass',
      'Town': 'tiles_town',
    };
    
    // Create the level
    this.ldtkLevel = LDtkLoader.createLevel(this, 'ldtk_lobby', 0, tilesetMap);
    
    if (this.ldtkLevel) {
      // Set world bounds
      this.physics.world.setBounds(
        this.ldtkLevel.bounds.x,
        this.ldtkLevel.bounds.y,
        this.ldtkLevel.bounds.width,
        this.ldtkLevel.bounds.height
      );
      
      // Process entities for buildings/NPCs
      this.processLDtkEntities();
      
      console.log(`[Lobby] LDtk level loaded: ${this.ldtkLevel.bounds.width}x${this.ldtkLevel.bounds.height}`);
    }
  }

  // ─── Process LDtk Entities ───────────────────────────────
  processLDtkEntities() {
    if (!this.ldtkLevel?.entities) return;
    
    this.buildingZones = [];
    
    this.ldtkLevel.entities.forEach(entity => {
      if (entity.id === 'Building' || entity.id === 'Entrance') {
        // Create interaction zone
        const zone = this.add.zone(
          entity.x + entity.width/2,
          entity.y + entity.height,
          entity.width,
          32
        );
        zone.setData('nav', entity.fields.navTarget || entity.fields.Nav || 'Hub');
        zone.setData('label', entity.fields.label || entity.fields.Label || entity.id);
        this.buildingZones.push(zone);
        
        // Add label
        this.add.text(entity.x + entity.width/2, entity.y - 8, entity.fields.label || entity.id, {
          fontSize: '12px',
          fill: '#ffffff'
        }).setOrigin(0.5);
      }
      
      if (entity.id === 'PlayerSpawn') {
        this.playerSpawnX = entity.x;
        this.playerSpawnY = entity.y;
      }
      
      if (entity.id === 'NPC') {
        // TODO: Create NPC sprites
        console.log(`[Lobby] NPC found: ${entity.fields.name || 'Unknown'}`);
      }
    });
  }

  // ─── Create Simple Ground (placeholder until tilemap) ───
  createSimpleGround() {
    const graphics = this.add.graphics();
    
    // Draw grass tiles
    for (let x = -640; x < 1920; x += 32) {
      for (let y = -360; y < 1080; y += 32) {
        const shade = Phaser.Math.Between(40, 60);
        graphics.fillStyle(Phaser.Display.Color.GetColor(20, shade, 20));
        graphics.fillRect(x, y, 32, 32);
      }
    }
    
    // Draw some placeholder buildings
    const buildings = [
      { x: 200, y: 100, w: 128, h: 96, label: 'TOWER', nav: 'Tower' },
      { x: 500, y: 100, w: 96, h: 80, label: 'ARENA', nav: 'Arena' },
      { x: 800, y: 100, w: 112, h: 88, label: 'DUNGEON', nav: 'Dungeon' },
      { x: 200, y: 400, w: 80, h: 64, label: 'SHOP', nav: 'Shop' },
      { x: 500, y: 400, w: 80, h: 64, label: 'SYNTHESIS', nav: 'Synthesis' },
    ];
    
    this.buildingZones = [];
    
    buildings.forEach(b => {
      // Building body
      graphics.fillStyle(0x4a3728);
      graphics.fillRect(b.x, b.y, b.w, b.h);
      
      // Roof
      graphics.fillStyle(0x8b4513);
      graphics.fillRect(b.x - 8, b.y - 16, b.w + 16, 24);
      
      // Door
      graphics.fillStyle(0x2d1f14);
      graphics.fillRect(b.x + b.w/2 - 12, b.y + b.h - 32, 24, 32);
      
      // Label
      this.add.text(b.x + b.w/2, b.y - 24, b.label, {
        fontSize: '12px',
        fill: '#ffffff'
      }).setOrigin(0.5);
      
      // Interaction zone
      const zone = this.add.zone(b.x + b.w/2, b.y + b.h, b.w, 32);
      zone.setData('nav', b.nav);
      zone.setData('label', b.label);
      this.buildingZones.push(zone);
    });
  }

  // ─── Create Player ───────────────────────────────────────
  async createPlayer() {
    // Get player sprite from server
    let spriteData = null;
    
    try {
      // Check if we have a hero with sprite
      const heroes = gameState?.inventory?.filter(i => i.type === 'hero') || [];
      const playerHero = heroes[0];
      
      if (playerHero?.spriteData) {
        spriteData = playerHero.spriteData;
      } else {
        // Fetch from server
        const response = await fetch('http://localhost:3777/generate-class/Villager');
        const data = await response.json();
        spriteData = 'data:image/png;base64,' + data.base64;
      }
      
      // Load the texture
      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          this.textures.addImage('player_sprite', img);
          resolve();
        };
        img.onerror = reject;
        img.src = spriteData;
      });
      
    } catch (err) {
      console.warn('[Lobby] Could not load player sprite, using placeholder', err);
      // Create placeholder
      const graphics = this.make.graphics({ x: 0, y: 0, add: false });
      graphics.fillStyle(0x4488ff);
      graphics.fillRect(0, 0, 64, 64);
      graphics.generateTexture('player_sprite', 64, 64);
    }
    
    // Create sprite with LPC sheet dimensions (832x2944 = 13 cols x 46 rows of 64x64)
    this.player = this.physics.add.sprite(640, 360, 'player_sprite');
    this.player.setSize(32, 32);
    this.player.setOffset(16, 32);
    
    // Create animations from LPC spritesheet
    this.createPlayerAnimations();
    
    // Play idle animation
    this.player.play('idle_down');
  }

  // ─── Create LPC Animations ───────────────────────────────
  createPlayerAnimations() {
    const frameWidth = 64;
    const frameHeight = 64;
    const cols = 13;
    
    Object.entries(this.LPC_ANIMS).forEach(([key, config]) => {
      const frames = [];
      for (let i = 0; i < config.frames; i++) {
        frames.push({
          key: 'player_sprite',
          frame: config.row * cols + i
        });
      }
      
      // Check if animation already exists
      if (this.anims.exists(key)) return;
      
      this.anims.create({
        key: key,
        frames: this.anims.generateFrameNumbers('player_sprite', {
          start: config.row * cols,
          end: config.row * cols + config.frames - 1
        }),
        frameRate: key.startsWith('idle') ? 4 : 10,
        repeat: -1
      });
    });
  }

  // ─── Create Interaction Zones ────────────────────────────
  createZones() {
    // These are handled in createSimpleGround for now
  }

  // ─── Update Loop ─────────────────────────────────────────
  update() {
    if (!this.player) return;
    
    const speed = this.playerSpeed;
    let velocityX = 0;
    let velocityY = 0;
    let direction = null;
    
    // Check input
    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      velocityX = -speed;
      direction = 'left';
    } else if (this.cursors.right.isDown || this.wasd.right.isDown) {
      velocityX = speed;
      direction = 'right';
    }
    
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      velocityY = -speed;
      direction = 'up';
    } else if (this.cursors.down.isDown || this.wasd.down.isDown) {
      velocityY = speed;
      direction = 'down';
    }
    
    // Apply velocity
    this.player.setVelocity(velocityX, velocityY);
    
    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      this.player.setVelocity(velocityX * 0.707, velocityY * 0.707);
    }
    
    // Update animation
    if (velocityX !== 0 || velocityY !== 0) {
      const animKey = `walk_${direction}`;
      if (this.currentAnim !== animKey) {
        this.player.play(animKey);
        this.currentAnim = animKey;
      }
    } else {
      // Idle in last direction
      const idleKey = this.currentAnim.replace('walk_', 'idle_');
      if (this.currentAnim.startsWith('walk_')) {
        this.player.play(idleKey);
        this.currentAnim = idleKey;
      }
    }
    
    // Check zone overlaps
    this.checkZoneOverlaps();
  }

  // ─── Check if player is near a building ──────────────────
  checkZoneOverlaps() {
    if (!this.buildingZones) return;
    
    const playerBounds = this.player.getBounds();
    
    this.buildingZones.forEach(zone => {
      const zoneBounds = zone.getBounds();
      
      if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, zoneBounds)) {
        // Show interaction prompt
        const nav = zone.getData('nav');
        this.showInteractionPrompt(zone);
        
        // Check for interaction key (Space or E)
        if (Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('E')) ||
            Phaser.Input.Keyboard.JustDown(this.input.keyboard.addKey('SPACE'))) {
          this.enterBuilding(nav);
        }
      }
    });
  }

  // ─── Show interaction prompt ─────────────────────────────
  showInteractionPrompt(zone) {
    if (this.interactionText) {
      this.interactionText.destroy();
    }
    
    const label = zone.getData('label');
    this.interactionText = this.add.text(zone.x, zone.y - 40, `[E] Enter ${label}`, {
      fontSize: '10px',
      fill: '#ffff00',
      backgroundColor: '#000000cc',
      padding: { x: 4, y: 2 }
    }).setOrigin(0.5).setDepth(999);
    
    // Auto-remove after a frame
    this.time.delayedCall(100, () => {
      if (this.interactionText) {
        this.interactionText.destroy();
        this.interactionText = null;
      }
    });
  }

  // ─── Enter a building (switch to HTML UI) ────────────────
  enterBuilding(navTarget) {
    console.log(`[Lobby] Entering: ${navTarget}`);
    
    // Hide Phaser, show HTML UI
    PhaserGame.hide();
    
    // Navigate to the appropriate HTML scene
    if (typeof hubNav === 'function') {
      hubNav(navTarget);
    }
  }

  // ─── Exit to Hub Menu ────────────────────────────────────
  exitToHub() {
    PhaserGame.hide();
    
    if (typeof showHub === 'function') {
      showHub();
    }
  }
}

// Export for use
if (typeof window !== 'undefined') {
  window.PhaserSceneLobby = PhaserSceneLobby;
}
