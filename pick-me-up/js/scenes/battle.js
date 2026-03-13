// ═══════════════════════════════════════════════════════════
// BATTLE RENDERER — Canvas-based combat scene
// ═══════════════════════════════════════════════════════════
// Renders the battlefield on a <canvas>:
//   - Painted backdrop (grass field)
//   - Animated pixel characters (heroes left, enemies right)
//   - HP bars + name plates
//   - Floating damage numbers
//   - Attack/hurt/death animations with lunge + shake
//
// Called by arena.js; reads combat unit state every frame.

(function () {

  var _canvas = null;
  var _ctx    = null;
  var _animFrame = null;
  var _lastTime  = 0;
  var _active    = false;
  var _combatRef = null;

  var _sprites = [];   // array of SpriteData
  var _floats  = [];   // floating damage numbers

  // ─── LAYOUT CONFIG ────────────────────────────────────────
  var BATTLE_W = 960;
  var BATTLE_H = 420;
  var CHAR_SCALE = 1.4;   // 100px frames × 1.4 = 140px rendered

  // Slot positions (x/y as fraction of canvas dimensions)
  // Front row = slots 0-2, Back row = slots 3-5
  var HERO_SLOTS = [
    { x: 0.25, y: 0.06 },   // front top
    { x: 0.21, y: 0.36 },   // front mid
    { x: 0.25, y: 0.66 },   // front bottom
    { x: 0.08, y: 0.06 },   // back top
    { x: 0.12, y: 0.36 },   // back mid
    { x: 0.08, y: 0.66 },   // back bottom
  ];

  var ENEMY_SLOTS = [
    { x: 0.58, y: 0.06 },
    { x: 0.62, y: 0.36 },
    { x: 0.58, y: 0.66 },
    { x: 0.74, y: 0.06 },
    { x: 0.70, y: 0.36 },
    { x: 0.74, y: 0.66 },
  ];

  // ─── INIT ─────────────────────────────────────────────────
  function init(canvasEl, combatInstance) {
    _canvas = canvasEl;
    _ctx = canvasEl.getContext('2d');
    _ctx.imageSmoothingEnabled = false;
    _combatRef = combatInstance;

    _canvas.width  = BATTLE_W;
    _canvas.height = BATTLE_H;

    _sprites = [];
    _floats  = [];

    // Build sprite data for every combat unit
    combatInstance.playerUnits.forEach(function (unit, i) {
      var slot = HERO_SLOTS[unit.slotIndex] || HERO_SLOTS[i] || HERO_SLOTS[0];
      var spriteKey = (unit._heroRef && unit._heroRef.spriteKey) || 'soldier';
      var inst = SpriteAnimator.createInstance(spriteKey);
      if (inst) inst.play('idle');

      _sprites.push({
        unit:       unit,
        instance:   inst,
        baseX:      slot.x,
        baseY:      slot.y,
        isEnemy:    false,
        offsetX:    0,
        offsetY:    0,
        shakeTimer: 0,
        shakeAmt:   0,
        lungeTimer: 0,
        lungeDir:   1,
        alpha:      1,
        dead:       false,
      });
    });

    combatInstance.enemyUnits.forEach(function (unit, i) {
      var slot = ENEMY_SLOTS[unit.slotIndex] || ENEMY_SLOTS[i] || ENEMY_SLOTS[0];
      var spriteKey = (unit._enemyRef && unit._enemyRef.spriteKey) || 'orc';
      var inst = SpriteAnimator.createInstance(spriteKey);
      if (inst) inst.play('idle');

      _sprites.push({
        unit:       unit,
        instance:   inst,
        baseX:      slot.x,
        baseY:      slot.y,
        isEnemy:    true,
        offsetX:    0,
        offsetY:    0,
        shakeTimer: 0,
        shakeAmt:   0,
        lungeTimer: 0,
        lungeDir:   -1,
        alpha:      1,
        dead:       false,
      });
    });

    _active = true;
    _lastTime = performance.now();
    _loop();
  }

  function stop() {
    _active = false;
    if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }
  }

  // ─── COMBAT EVENT HANDLERS ────────────────────────────────

  function onAttack(attackerId, defenderId, damage, isCrit, isPanic) {
    var atk = _findSprite(attackerId);
    var def = _findSprite(defenderId);

    // Attacker: play attack anim → return to idle + lunge forward
    if (atk && !atk.dead && atk.instance) {
      atk.instance.play('attack', function () {
        if (!atk.dead) atk.instance.play('idle');
      });
      atk.lungeTimer = 350;
    }

    // Defender: play hurt anim → return to idle + shake
    if (def && !def.dead && def.instance) {
      def.instance.play('hurt', function () {
        if (!def.dead) def.instance.play('idle');
      });
      def.shakeTimer = 280;
      def.shakeAmt = isCrit ? 14 : 7;
    }

    // Spawn floating damage number
    if (def) {
      var fw = 100 * CHAR_SCALE;
      var fx = def.baseX * BATTLE_W + fw * 0.5;
      var fy = def.baseY * BATTLE_H - 8;

      var text = '-' + damage;
      if (isCrit) text = '💥 ' + text;
      if (isPanic) text += ' PANIC';

      _floats.push({
        x: fx + (Math.random() * 30 - 15),
        y: fy,
        text: text,
        color: isCrit ? '#FFD700' : isPanic ? '#FF4444' : '#FFFFFF',
        size: isCrit ? 20 : 15,
        age: 0,
        lifetime: 1200,
      });
    }
  }

  function onDeath(unitId) {
    var s = _findSprite(unitId);
    if (!s) return;
    s.dead = true;
    if (s.instance) {
      s.instance.play('death');
    }
  }

  function onDOT(unitId, damage) {
    var s = _findSprite(unitId);
    if (!s) return;

    s.shakeTimer = 160;
    s.shakeAmt = 4;

    var fw = 100 * CHAR_SCALE;
    _floats.push({
      x: s.baseX * BATTLE_W + fw * 0.5,
      y: s.baseY * BATTLE_H - 5,
      text: '-' + damage,
      color: '#8BC34A',
      size: 13,
      age: 0,
      lifetime: 900,
    });
  }

  function _findSprite(unitId) {
    for (var i = 0; i < _sprites.length; i++) {
      if (_sprites[i].unit.id === unitId) return _sprites[i];
    }
    return null;
  }

  // ─── RENDER LOOP ──────────────────────────────────────────

  function _loop() {
    if (!_active) return;
    _animFrame = requestAnimationFrame(_loop);

    var now = performance.now();
    var dt = Math.min(now - _lastTime, 100);
    _lastTime = now;

    _update(dt);
    _draw();
  }

  function _update(dt) {
    _sprites.forEach(function (s) {
      // Animate
      if (s.instance) s.instance.update(dt);

      // Shake
      if (s.shakeTimer > 0) {
        s.shakeTimer -= dt;
        s.offsetX = (Math.random() - 0.5) * s.shakeAmt;
        s.offsetY = (Math.random() - 0.5) * s.shakeAmt * 0.5;
        if (s.shakeTimer <= 0) { s.offsetX = 0; s.offsetY = 0; }
      }

      // Attack lunge
      if (s.lungeTimer > 0) {
        s.lungeTimer -= dt;
        var pct = s.lungeTimer / 350;
        s.offsetX = Math.sin(pct * Math.PI) * 30 * s.lungeDir;
      }

      // Death fade
      if (s.dead && s.instance && s.instance.finished) {
        s.alpha = Math.max(0.15, s.alpha - dt * 0.0008);
      }
    });

    // Floats
    _floats = _floats.filter(function (f) { f.age += dt; return f.age < f.lifetime; });
  }

  function _draw() {
    var w = BATTLE_W;
    var h = BATTLE_H;
    _ctx.clearRect(0, 0, w, h);

    _drawBackground(w, h);

    // Depth sort by Y
    var sorted = _sprites.slice().sort(function (a, b) { return a.baseY - b.baseY; });
    sorted.forEach(function (s) { _drawUnit(s, w, h); });

    _drawFloats();
  }

  // ─── BACKGROUND ───────────────────────────────────────────

  function _drawBackground(w, h) {
    // Sky
    var sky = _ctx.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#5B9A6F');
    sky.addColorStop(0.6, '#7BB88D');
    sky.addColorStop(1, '#A3D4A8');
    _ctx.fillStyle = sky;
    _ctx.fillRect(0, 0, w, h * 0.55);

    // Distant hills
    _ctx.fillStyle = '#6DAF7E';
    _ctx.beginPath();
    _ctx.moveTo(0, h * 0.45);
    _ctx.quadraticCurveTo(w * 0.2, h * 0.32, w * 0.4, h * 0.44);
    _ctx.quadraticCurveTo(w * 0.6, h * 0.36, w * 0.8, h * 0.42);
    _ctx.quadraticCurveTo(w * 0.95, h * 0.34, w, h * 0.40);
    _ctx.lineTo(w, h * 0.55);
    _ctx.lineTo(0, h * 0.55);
    _ctx.fill();

    // Ground
    var ground = _ctx.createLinearGradient(0, h * 0.5, 0, h);
    ground.addColorStop(0, '#5A8A44');
    ground.addColorStop(0.4, '#4A7535');
    ground.addColorStop(1, '#3B6028');
    _ctx.fillStyle = ground;
    _ctx.fillRect(0, h * 0.5, w, h * 0.5);

    // Dirt path
    _ctx.fillStyle = '#8B7355';
    _ctx.beginPath();
    _ctx.ellipse(w * 0.5, h * 0.65, w * 0.38, h * 0.07, 0, 0, Math.PI * 2);
    _ctx.fill();
    _ctx.fillStyle = '#9B8365';
    _ctx.beginPath();
    _ctx.ellipse(w * 0.5, h * 0.64, w * 0.32, h * 0.04, 0, 0, Math.PI * 2);
    _ctx.fill();

    // Grass tufts (deterministic)
    _ctx.fillStyle = '#4CAF50';
    for (var i = 0; i < 25; i++) {
      var gx = (i * 41 + 17) % w;
      var gy = h * 0.56 + ((i * 37 + 7) % Math.floor(h * 0.38));
      _ctx.fillRect(gx, gy, 2, 5);
      _ctx.fillRect(gx + 3, gy + 1, 2, 4);
    }

    // VS watermark
    _ctx.save();
    _ctx.fillStyle = 'rgba(255,255,255,0.08)';
    _ctx.font = 'bold 56px monospace';
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'middle';
    _ctx.fillText('VS', w * 0.5, h * 0.42);
    _ctx.restore();
  }

  // ─── DRAW UNIT ────────────────────────────────────────────

  function _drawUnit(s, w, h) {
    var def = SpriteAnimator.getDefinition(s.instance ? s.instance.defId : null);
    var charW = (def ? def.frameWidth : 100)  * CHAR_SCALE;
    var charH = (def ? def.frameHeight : 100) * CHAR_SCALE;

    var dx = s.baseX * w + s.offsetX;
    var dy = s.baseY * h + s.offsetY;

    _ctx.save();
    _ctx.globalAlpha = s.alpha;

    // Ground shadow
    _ctx.fillStyle = 'rgba(0,0,0,0.22)';
    _ctx.beginPath();
    _ctx.ellipse(dx + charW * 0.5, dy + charH - 4, charW * 0.32, 7, 0, 0, Math.PI * 2);
    _ctx.fill();

    // Draw animated sprite (flip for enemies so they face left)
    if (s.instance) {
      s.instance.draw(_ctx, dx, dy, CHAR_SCALE, s.isEnemy);
    }

    // HP bar
    var barW = charW * 0.65;
    var barH = 5;
    var barX = dx + (charW - barW) / 2;
    var barY = dy - 12;

    var hpPct = Math.max(0, s.unit.currentHP / s.unit.maxHP);
    var hpCol = hpPct > 0.6 ? '#4CAF50' : hpPct > 0.3 ? '#FFA500' : '#FF4444';

    _ctx.fillStyle = 'rgba(0,0,0,0.55)';
    _ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    _ctx.fillStyle = hpCol;
    _ctx.fillRect(barX, barY, barW * hpPct, barH);
    _ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    _ctx.lineWidth = 0.5;
    _ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Name plate
    var name = s.unit.name;
    if (name.length > 12) name = name.substring(0, 11) + '…';

    _ctx.font = '9px monospace';
    _ctx.textAlign = 'center';
    _ctx.textBaseline = 'bottom';
    _ctx.fillStyle = 'rgba(0,0,0,0.7)';
    _ctx.fillText(name, dx + charW / 2 + 1, barY - 3);
    _ctx.fillStyle = s.isEnemy ? '#FF9999' : '#BBDDFF';
    _ctx.fillText(name, dx + charW / 2, barY - 4);

    _ctx.restore();
  }

  // ─── FLOATING DAMAGE NUMBERS ──────────────────────────────

  function _drawFloats() {
    _floats.forEach(function (f) {
      var pct = f.age / f.lifetime;
      var alpha = Math.max(0, 1 - pct * 1.2);
      var yOff  = pct * -45;

      _ctx.save();
      _ctx.globalAlpha = alpha;
      _ctx.font = 'bold ' + f.size + 'px monospace';
      _ctx.textAlign = 'center';
      _ctx.textBaseline = 'middle';

      // Outline
      _ctx.strokeStyle = 'rgba(0,0,0,0.85)';
      _ctx.lineWidth = 3;
      _ctx.strokeText(f.text, f.x, f.y + yOff);

      // Fill
      _ctx.fillStyle = f.color;
      _ctx.fillText(f.text, f.x, f.y + yOff);

      _ctx.restore();
    });
  }

  // ─── EXPORTS ──────────────────────────────────────────────

  window.BattleRenderer = {
    init:     init,
    stop:     stop,
    onAttack: onAttack,
    onDeath:  onDeath,
    onDOT:    onDOT,
  };

})();
