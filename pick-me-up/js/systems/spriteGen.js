// ═══════════════════════════════════════════════════════════
// SPRITE GENERATION CLIENT
// Browser-side client for the sprite generation server.
// Handles request queueing, IndexedDB caching, and image loading.
// ═══════════════════════════════════════════════════════════
(function () {

  var SERVER_URL = 'http://localhost:3777';
  var DB_NAME    = 'pickmeup_sprites';
  var DB_VERSION = 1;
  var STORE_NAME = 'sprites';

  // ─── IndexedDB Cache ─────────────────────────────────────
  var _db = null;

  function openDB() {
    return new Promise(function (resolve, reject) {
      if (_db) { resolve(_db); return; }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'spriteId' });
        }
      };
      req.onsuccess = function (e) { _db = e.target.result; resolve(_db); };
      req.onerror   = function (e) { reject(e.target.error); };
    });
  }

  function getCachedSprite(spriteId) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx    = db.transaction(STORE_NAME, 'readonly');
        var store = tx.objectStore(STORE_NAME);
        var req   = store.get(spriteId);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror   = function () { resolve(null); };
      });
    });
  }

  function cacheSprite(spriteId, base64, layers) {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        var tx    = db.transaction(STORE_NAME, 'readwrite');
        var store = tx.objectStore(STORE_NAME);
        store.put({ spriteId: spriteId, base64: base64, layers: layers, cachedAt: Date.now() });
        tx.oncomplete = function () { resolve(); };
        tx.onerror    = function () { resolve(); };
      });
    });
  }

  // ─── Image Loading ───────────────────────────────────────
  // Converts base64 PNG to a loaded Image element
  var _imageCache = {};

  function base64ToImage(base64) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload  = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load sprite image')); };
      img.src = 'data:image/png;base64,' + base64;
    });
  }

  function getSpriteImage(spriteId) {
    if (_imageCache[spriteId]) return Promise.resolve(_imageCache[spriteId]);
    return getCachedSprite(spriteId).then(function (cached) {
      if (!cached) return null;
      return base64ToImage(cached.base64).then(function (img) {
        _imageCache[spriteId] = img;
        return img;
      });
    });
  }

  // ─── Server Communication ────────────────────────────────
  var _pending = {};  // spriteId → Promise

  function serverAvailable() {
    return fetch(SERVER_URL + '/health', { method: 'GET' })
      .then(function (r) { return r.json(); })
      .then(function (d) { return d.status === 'ok'; })
      .catch(function () { return false; });
  }

  /**
   * Request sprite generation for a hero.
   * Returns a Promise<{ spriteId, image }> — the image is a loaded Image element.
   *
   * @param {object} heroData  — hero object from gameState.inventory
   * @returns {Promise<{spriteId: string, image: HTMLImageElement}>}
   */
  function generateHeroSprite(heroData) {
    // If hero already has a spriteId, try loading from cache
    if (heroData.spriteId) {
      return getSpriteImage(heroData.spriteId).then(function (img) {
        if (img) return { spriteId: heroData.spriteId, image: img };
        // Cache miss — regenerate
        return _requestGeneration({ heroData: _sanitizeHero(heroData) }, heroData.spriteId);
      });
    }

    return _requestGeneration({ heroData: _sanitizeHero(heroData) });
  }

  /**
   * Request sprite generation for an enemy by template key.
   * @param {string} enemyKey — e.g. 'goblin', 'skeleton', 'orc'
   * @returns {Promise<{spriteId: string, image: HTMLImageElement}>}
   */
  function generateEnemySprite(enemyKey) {
    return _requestGeneration({ enemyKey: enemyKey });
  }

  /**
   * Generate sprite for a specific class (randomizes cosmetics).
   * @param {string} className — e.g. 'Knight', 'Mage', 'Villager'
   * @returns {Promise<{spriteId: string, image: HTMLImageElement}>}
   */
  function generateClassSprite(className) {
    return fetch(SERVER_URL + '/generate-class/' + encodeURIComponent(className))
      .then(function (r) {
        if (!r.ok) throw new Error('Server error ' + r.status);
        return r.json();
      })
      .then(function (data) {
        return cacheSprite(data.spriteId, data.base64, data.layers).then(function () {
          return base64ToImage(data.base64);
        }).then(function (img) {
          _imageCache[data.spriteId] = img;
          return { spriteId: data.spriteId, image: img };
        });
      });
  }

  /**
   * Generate sprite from free text description.
   * @param {string} description
   * @returns {Promise<{spriteId: string, image: HTMLImageElement}>}
   */
  function generateFromDescription(description) {
    return _requestGeneration({ description: description });
  }

  function _sanitizeHero(hero) {
    // Only send the fields the server needs
    return {
      name: hero.name,
      rarity: hero.rarity,
      class: hero.class,
      isCommoner: hero.isCommoner,
    };
  }

  function _requestGeneration(body, existingSpriteId) {
    return fetch(SERVER_URL + '/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    .then(function (r) {
      if (!r.ok) throw new Error('Server error ' + r.status);
      return r.json();
    })
    .then(function (data) {
      if (data.error) throw new Error(data.error);
      return cacheSprite(data.spriteId, data.base64, data.layers).then(function () {
        return base64ToImage(data.base64);
      }).then(function (img) {
        _imageCache[data.spriteId] = img;
        return { spriteId: data.spriteId, image: img };
      });
    });
  }

  // ─── LPC Frame Extraction ───────────────────────────────
  // The LPC Universal-Expanded spritesheet is 832×2944 = 13 cols × 46 rows of 64×64 frames.
  //
  // Row layout (direction order within each group: Up/N, Left/W, Down/S, Right/E):
  //   Rows  0-3:  Spellcast    (4 dirs, 7 frames each)
  //   Rows  4-7:  Thrust       (4 dirs, 8 frames each)
  //   Rows  8-11: Walk         (4 dirs, 9 frames each)
  //   Rows 12-15: Slash        (4 dirs, 6 frames each)
  //   Rows 16-19: Shoot        (4 dirs, 13 frames each)
  //   Row  20:    Hurt         (1 dir, 6 frames)
  //   Row  21:    Climb        (1 dir, 6 frames)
  //   Rows 22-25: Idle         (4 dirs, 2 frames each)
  //   Rows 26-29: Jump         (4 dirs, 5 frames each)
  //   Rows 30-33: Sit          (4 dirs, 3 frames each)
  //   Rows 34-37: Emote        (4 dirs, 3 frames each)
  //   Rows 38-41: Run          (4 dirs, 8 frames each)
  //   Rows 42-45: Combat Idle  (4 dirs, 2 frames each)

  var LPC_ANIMS = {
    // Spellcast (rows 0-3)
    spellcast_up:    { row:  0, frames: 7 },
    spellcast_left:  { row:  1, frames: 7 },
    spellcast_down:  { row:  2, frames: 7 },
    spellcast_right: { row:  3, frames: 7 },
    // Thrust (rows 4-7)
    thrust_up:       { row:  4, frames: 8 },
    thrust_left:     { row:  5, frames: 8 },
    thrust_down:     { row:  6, frames: 8 },
    thrust_right:    { row:  7, frames: 8 },
    // Walk (rows 8-11)
    walk_up:         { row:  8, frames: 9 },
    walk_left:       { row:  9, frames: 9 },
    walk_down:       { row: 10, frames: 9 },
    walk_right:      { row: 11, frames: 9 },
    // Slash (rows 12-15)
    slash_up:        { row: 12, frames: 6 },
    slash_left:      { row: 13, frames: 6 },
    slash_down:      { row: 14, frames: 6 },
    slash_right:     { row: 15, frames: 6 },
    // Shoot (rows 16-19)
    shoot_up:        { row: 16, frames: 13 },
    shoot_left:      { row: 17, frames: 13 },
    shoot_down:      { row: 18, frames: 13 },
    shoot_right:     { row: 19, frames: 13 },
    // Hurt (row 20)
    hurt:            { row: 20, frames: 6 },
    // Climb (row 21)
    climb:           { row: 21, frames: 6 },
    // Idle (rows 22-25)
    idle_up:         { row: 22, frames: 2 },
    idle_left:       { row: 23, frames: 2 },
    idle_down:       { row: 24, frames: 2 },
    idle_right:      { row: 25, frames: 2 },
    // Jump (rows 26-29)
    jump_up:         { row: 26, frames: 5 },
    jump_left:       { row: 27, frames: 5 },
    jump_down:       { row: 28, frames: 5 },
    jump_right:      { row: 29, frames: 5 },
    // Sit (rows 30-33)
    sit_up:          { row: 30, frames: 3 },
    sit_left:        { row: 31, frames: 3 },
    sit_down:        { row: 32, frames: 3 },
    sit_right:       { row: 33, frames: 3 },
    // Emote (rows 34-37)
    emote_up:        { row: 34, frames: 3 },
    emote_left:      { row: 35, frames: 3 },
    emote_down:      { row: 36, frames: 3 },
    emote_right:     { row: 37, frames: 3 },
    // Run (rows 38-41)
    run_up:          { row: 38, frames: 8 },
    run_left:        { row: 39, frames: 8 },
    run_down:        { row: 40, frames: 8 },
    run_right:       { row: 41, frames: 8 },
    // Combat Idle (rows 42-45)
    combat_idle_up:    { row: 42, frames: 2 },
    combat_idle_left:  { row: 43, frames: 2 },
    combat_idle_down:  { row: 44, frames: 2 },
    combat_idle_right: { row: 45, frames: 2 },
  };

  // Common aliases for game use
  var ANIM_ALIASES = {
    idle:   'idle_down',       // standing pose = idle facing down
    walk:   'walk_right',
    run:    'run_right',
    attack: 'slash_right',
    hurt:   'hurt',
    cast:   'spellcast_right',
    shoot:  'shoot_right',
    jump:   'jump_down',
    sit:    'sit_down',
    combat: 'combat_idle_right',
  };

  /**
   * Draw a specific animation frame from an LPC spritesheet onto a canvas.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {HTMLImageElement} spriteSheet — the full 832×2944 LPC sheet
   * @param {string} animName — animation key (e.g. 'walk_right', 'idle', 'attack')
   * @param {number} frameIndex — which frame of the animation (0-based)
   * @param {number} dx — destination X
   * @param {number} dy — destination Y
   * @param {number} dw — destination width
   * @param {number} dh — destination height
   * @param {boolean} [flip] — horizontally flip the sprite
   */
  function drawLPCFrame(ctx, spriteSheet, animName, frameIndex, dx, dy, dw, dh, flip) {
    var anim = LPC_ANIMS[animName] || LPC_ANIMS[ANIM_ALIASES[animName]] || LPC_ANIMS['walk_down'];
    var frame = frameIndex % anim.frames;
    var sx = frame * 64;
    var sy = anim.row * 64;

    ctx.save();
    if (flip) {
      ctx.translate(dx + dw, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(spriteSheet, sx, sy, 64, 64, 0, 0, dw, dh);
    } else {
      ctx.drawImage(spriteSheet, sx, sy, 64, 64, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  /**
   * Create an animated sprite controller.
   * Returns an object with update() and draw() methods.
   */
  function createSpriteAnimator(spriteSheet) {
    return {
      sheet: spriteSheet,
      anim: 'idle',
      frame: 0,
      frameTimer: 0,
      frameDelay: 150,  // ms per frame

      setAnimation: function (name) {
        var actual = ANIM_ALIASES[name] || name;
        if (this.anim !== actual) {
          this.anim = actual;
          this.frame = 0;
          this.frameTimer = 0;
        }
      },

      update: function (dt) {
        this.frameTimer += dt;
        if (this.frameTimer >= this.frameDelay) {
          this.frameTimer -= this.frameDelay;
          var animDef = LPC_ANIMS[this.anim] || LPC_ANIMS['walk_down'];
          this.frame = (this.frame + 1) % animDef.frames;
        }
      },

      draw: function (ctx, x, y, w, h, flip) {
        drawLPCFrame(ctx, this.sheet, this.anim, this.frame, x, y, w, h, flip);
      },
    };
  }

  // ─── Pre-warm common enemy sprites ───────────────────────
  // Call this on game start to pre-cache common enemy sprites
  var _prewarmPromise = null;

  function prewarmEnemySprites() {
    if (_prewarmPromise) return _prewarmPromise;

    var commonEnemies = ['goblin', 'skeleton', 'orc', 'zombie', 'mage', 'knight'];
    _prewarmPromise = serverAvailable().then(function (ok) {
      if (!ok) {
        console.warn('[SpriteGen] Server not available — skipping prewarm');
        return;
      }
      return commonEnemies.reduce(function (chain, key) {
        return chain.then(function () {
          return generateEnemySprite(key).catch(function (e) {
            console.warn('[SpriteGen] Prewarm failed for', key, e.message);
          });
        });
      }, Promise.resolve());
    });

    return _prewarmPromise;
  }

  // ─── Public API ──────────────────────────────────────────
  window.SpriteGen = {
    // Generation
    generateHeroSprite:      generateHeroSprite,
    generateEnemySprite:     generateEnemySprite,
    generateClassSprite:     generateClassSprite,
    generateFromDescription: generateFromDescription,
    prewarmEnemySprites:     prewarmEnemySprites,
    serverAvailable:         serverAvailable,

    // Cache
    getSpriteImage: getSpriteImage,

    // Rendering helpers
    drawLPCFrame:        drawLPCFrame,
    createSpriteAnimator: createSpriteAnimator,
    LPC_ANIMS:           LPC_ANIMS,
    ANIM_ALIASES:        ANIM_ALIASES,

    // Constants
    FRAME_SIZE: 64,
    SHEET_WIDTH: 832,
    SHEET_HEIGHT: 2944,
    SHEET_COLS: 13,
    SHEET_ROWS: 46,
  };

})();
