// ═══════════════════════════════════════════════════════════
// SPRITE ANIMATOR — Lightweight spritesheet animation system
// ═══════════════════════════════════════════════════════════
// Supports two spritesheet formats:
//   1. Individual strip PNGs (one horizontal row per animation file)
//   2. Combined sheets (multiple rows in one image)
//
// Usage:
//   SpriteAnimator.define('soldier', {
//     frameWidth: 100, frameHeight: 100,
//     animations: {
//       idle:   { src: 'path/Idle.png', frames: 6, speed: 150 },
//       attack: { src: 'path/Attack.png', frames: 6, speed: 100, loop: false },
//     }
//   });
//   var sprite = SpriteAnimator.createInstance('soldier');
//   sprite.play('idle');
//   // in render loop:
//   sprite.update(dt);
//   sprite.draw(ctx, x, y, scale, flip);

(function () {

var _definitions = {};   // id → config
var _imageCache  = {};   // src → HTMLImageElement
var _loadPromises = {};  // src → Promise

// ─── IMAGE LOADING ────────────────────────────────────────
function loadImage(src) {
  if (_imageCache[src]) return Promise.resolve(_imageCache[src]);
  if (_loadPromises[src]) return _loadPromises[src];
  _loadPromises[src] = new Promise(function (resolve) {
    var img = new Image();
    img.onload = function () {
      _imageCache[src] = img;
      resolve(img);
    };
    img.onerror = function () {
      console.warn('[SpriteAnimator] Failed to load:', src);
      resolve(null);
    };
    img.src = src;
  });
  return _loadPromises[src];
}

// ─── DEFINE A CHARACTER SPRITE ────────────────────────────
// config = {
//   frameWidth: 100,
//   frameHeight: 100,
//   // Option A — individual strip files:
//   animations: {
//     idle:   { src: 'path/Idle.png', frames: 6, speed: 150 },
//     attack: { src: 'path/Attack.png', frames: 6, speed: 100, loop: false },
//   }
//   // Option B — combined sheet:
//   sheet: 'path/Full.png',
//   animations: {
//     idle:   { row: 0, frames: 6, speed: 150 },
//     attack: { row: 2, frames: 6, speed: 100, loop: false },
//   }
// }
function define(id, config) {
  _definitions[id] = config;
  // Preload all referenced images
  if (config.sheet) loadImage(config.sheet);
  var anims = config.animations || {};
  for (var key in anims) {
    if (anims[key].src) loadImage(anims[key].src);
  }
}

// ─── CREATE ANIMATION INSTANCE ────────────────────────────
function createInstance(definitionId) {
  var def = _definitions[definitionId];
  if (!def) {
    return _createPlaceholderInstance();
  }

  return {
    defId: definitionId,
    currentAnim: 'idle',
    frame: 0,
    elapsed: 0,
    playing: true,
    finished: false,
    onComplete: null,

    play: function (animName, onComplete) {
      var anims = def.animations || {};
      if (!anims[animName]) {
        // Fallback: idle → first available
        if (anims.idle) animName = 'idle';
        else {
          var keys = Object.keys(anims);
          if (keys.length > 0) animName = keys[0];
          else return;
        }
      }
      this.currentAnim = animName;
      this.frame = 0;
      this.elapsed = 0;
      this.playing = true;
      this.finished = false;
      this.onComplete = onComplete || null;
    },

    update: function (dt) {
      if (!this.playing || this.finished) return;
      var anim = (def.animations || {})[this.currentAnim];
      if (!anim) return;

      this.elapsed += dt;
      var speed = anim.speed || 150;
      if (this.elapsed >= speed) {
        this.elapsed -= speed;
        this.frame++;
        var total = anim.frames || 1;
        var loop = anim.loop !== false; // default: true
        if (this.frame >= total) {
          if (loop) {
            this.frame = 0;
          } else {
            this.frame = total - 1;
            this.playing = false;
            this.finished = true;
            if (this.onComplete) this.onComplete();
          }
        }
      }
    },

    draw: function (ctx, x, y, scale, flip) {
      scale = scale || 1;
      var anim = (def.animations || {})[this.currentAnim];
      if (!anim) return;

      var fw = def.frameWidth;
      var fh = def.frameHeight;
      var img = anim.src ? _imageCache[anim.src] : _imageCache[def.sheet];
      if (!img) return; // not loaded yet

      // Source rectangle
      var sx, sy;
      if (anim.src) {
        sx = this.frame * fw;
        sy = 0;
      } else {
        sx = this.frame * fw;
        sy = (anim.row || 0) * fh;
      }

      var dw = fw * scale;
      var dh = fh * scale;

      ctx.save();
      if (flip) {
        ctx.translate(x + dw, y);
        ctx.scale(-1, 1);
        ctx.drawImage(img, sx, sy, fw, fh, 0, 0, dw, dh);
      } else {
        ctx.drawImage(img, sx, sy, fw, fh, x, y, dw, dh);
      }
      ctx.restore();
    },
  };
}

function _createPlaceholderInstance() {
  return {
    defId: null,
    currentAnim: 'idle',
    frame: 0, elapsed: 0, playing: false, finished: false,
    onComplete: null,
    play: function () {},
    update: function () {},
    draw: function (ctx, x, y, scale) {
      var size = 100 * (scale || 1);
      ctx.save();
      ctx.fillStyle = 'rgba(100, 60, 140, 0.5)';
      ctx.fillRect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8);
      ctx.strokeStyle = '#C0C0D0';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + size * 0.1, y + size * 0.1, size * 0.8, size * 0.8);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold ' + (size * 0.35) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + size / 2, y + size / 2);
      ctx.restore();
    },
  };
}

// ─── UTILITIES ────────────────────────────────────────────
function preloadAll() {
  var promises = [];
  for (var id in _definitions) {
    var def = _definitions[id];
    if (def.sheet) promises.push(loadImage(def.sheet));
    var anims = def.animations || {};
    for (var key in anims) {
      if (anims[key].src) promises.push(loadImage(anims[key].src));
    }
  }
  return Promise.all(promises);
}

function getDefinition(id) {
  return _definitions[id] || null;
}

// ─── EXPORTS ──────────────────────────────────────────────
window.SpriteAnimator = {
  define:         define,
  createInstance: createInstance,
  getDefinition:  getDefinition,
  loadImage:      loadImage,
  preloadAll:     preloadAll,
};

// ═══════════════════════════════════════════════════════════
// DEFAULT SPRITE DEFINITIONS
// ═══════════════════════════════════════════════════════════
// Uses existing character assets from the Tiny RPG pack.
// Frame size: 100×100. Horizontal strip PNGs.

var BASE = 'assets/character_assets/Characters(100x100)/';

// SOLDIER — default hero sprite
define('soldier', {
  frameWidth: 100,
  frameHeight: 100,
  animations: {
    idle:   { src: BASE + 'Soldier/Soldier/Soldier-Idle.png',     frames: 6, speed: 150 },
    walk:   { src: BASE + 'Soldier/Soldier/Soldier-Walk.png',     frames: 8, speed: 100 },
    attack: { src: BASE + 'Soldier/Soldier/Soldier-Attack01.png', frames: 6, speed: 100, loop: false },
    hurt:   { src: BASE + 'Soldier/Soldier/Soldier-Hurt.png',     frames: 4, speed: 80,  loop: false },
    death:  { src: BASE + 'Soldier/Soldier/Soldier-Death.png',    frames: 4, speed: 150, loop: false },
  },
});

// ORC — default enemy sprite
define('orc', {
  frameWidth: 100,
  frameHeight: 100,
  animations: {
    idle:   { src: BASE + 'Orc/Orc/Orc-Idle.png',     frames: 6, speed: 150 },
    walk:   { src: BASE + 'Orc/Orc/Orc-Walk.png',     frames: 8, speed: 100 },
    attack: { src: BASE + 'Orc/Orc/Orc-Attack01.png', frames: 6, speed: 100, loop: false },
    hurt:   { src: BASE + 'Orc/Orc/Orc-Hurt.png',     frames: 4, speed: 80,  loop: false },
    death:  { src: BASE + 'Orc/Orc/Orc-Death.png',    frames: 4, speed: 150, loop: false },
  },
});

// Kick off preloading
preloadAll();

})();
