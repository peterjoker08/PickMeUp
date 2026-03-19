// ═══════════════════════════════════════════════════════════
// TUTORIAL ENGINE
// Genshin-style cutscene dialogue + guided button highlights
// ═══════════════════════════════════════════════════════════
(function () {

  /* ── SPRITE SHEET CONFIG ──────────────────────── */
  const SPRITES = {
    soldier: {
      idle:   'assets/character_assets/Characters(100x100)/Soldier/Soldier/Soldier-Idle.png',
      attack: 'assets/character_assets/Characters(100x100)/Soldier/Soldier/Soldier-Attack01.png',
      hurt:   'assets/character_assets/Characters(100x100)/Soldier/Soldier/Soldier-Hurt.png',
      death:  'assets/character_assets/Characters(100x100)/Soldier/Soldier/Soldier-Death.png',
      walk:   'assets/character_assets/Characters(100x100)/Soldier/Soldier/Soldier-Walk.png',
    },
    orc: {
      idle:   'assets/character_assets/Characters(100x100)/Orc/Orc/Orc-Idle.png',
      attack: 'assets/character_assets/Characters(100x100)/Orc/Orc/Orc-Attack01.png',
      hurt:   'assets/character_assets/Characters(100x100)/Orc/Orc/Orc-Hurt.png',
      death:  'assets/character_assets/Characters(100x100)/Orc/Orc/Orc-Death.png',
      walk:   'assets/character_assets/Characters(100x100)/Orc/Orc/Orc-Walk.png',
    },
    iselle: {
      idle: 'assets/character_assets/isellespritesheet.png',
    },
  };

  /* Iselle portrait frame config (64×64 per frame, idle row 0) */
  const ISELLE_FRAME = { w: 64, h: 64, idleFrames: 7 };

  /* Combat sprite frame config (100×100 per frame) */
  const COMBAT_SPRITE_FRAME = { w: 100, h: 100, idleFrames: 4 };

  /* ── STATE ────────────────────────────────────── */
  let stepIndex   = 0;
  let _animFrame  = null;
  let _spriteCache = {};
  let _iselleImg = null;
  let _portraitFrame = 0;
  let _portraitInterval = null;
  let _combatPortraitImg = null;
  let _combatPortraitFrame = 0;
  let _combatPortraitInterval = null;

  /* ── HELPERS ──────────────────────────────────── */
  function getEl(id) { return document.getElementById(id); }

  function loadImg(src) {
    if (_spriteCache[src]) return Promise.resolve(_spriteCache[src]);
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => { _spriteCache[src] = img; res(img); };
      img.onerror = rej;
      img.src = src;
    });
  }

  async function loadIselleSprite() {
    _iselleImg = await loadImg(SPRITES.iselle.idle);
  }

  function showPortrait() {
    const canvas = getEl('tut-portrait');
    if (!canvas || !_iselleImg) return;
    canvas.style.display = 'block';
    canvas.width  = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    _portraitFrame = 0;
    _drawPortrait(ctx);
    // Static idle pose — no animation interval
  }

  /* Row 3, Col 3 of the 64×64 grid (0-indexed: row 2, col 2) */
  const ISELLE_SRC_X = 2 * 64;   // 128
  const ISELLE_SRC_Y = 2 * 64;   // 128

  function _drawPortrait(ctx) {
    if (!_iselleImg) return;
    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(_iselleImg, ISELLE_SRC_X, ISELLE_SRC_Y,
      64, 64, 0, 0, 64, 64);
  }

  function hidePortrait() {
    if (_portraitInterval) { clearInterval(_portraitInterval); _portraitInterval = null; }
    const canvas = getEl('tut-portrait');
    if (canvas) canvas.style.display = 'none';
  }

  /* ── COMBAT SPRITE PORTRAIT (right side) ─────── */
  async function showCombatPortrait(spriteType) {
    const canvas = getEl('tut-combat-portrait');
    if (!canvas) return;
    
    const spriteSet = SPRITES[spriteType];
    if (!spriteSet) return;
    
    _combatPortraitImg = await loadImg(spriteSet.idle);
    canvas.style.display = 'block';
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    _combatPortraitFrame = 0;
    _drawCombatPortrait(ctx, spriteType === 'orc');
    _combatPortraitInterval = setInterval(() => {
      const frameCount = Math.floor(_combatPortraitImg.width / COMBAT_SPRITE_FRAME.w);
      _combatPortraitFrame = (_combatPortraitFrame + 1) % frameCount;
      _drawCombatPortrait(ctx, spriteType === 'orc');
    }, 150);
  }

  function _drawCombatPortrait(ctx, flip) {
    if (!_combatPortraitImg) return;
    ctx.clearRect(0, 0, 100, 100);
    ctx.save();
    if (flip) {
      ctx.translate(100, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(_combatPortraitImg, _combatPortraitFrame * COMBAT_SPRITE_FRAME.w, 0,
      COMBAT_SPRITE_FRAME.w, COMBAT_SPRITE_FRAME.h, 0, 0, 100, 100);
    ctx.restore();
  }

  function hideCombatPortrait() {
    if (_combatPortraitInterval) { clearInterval(_combatPortraitInterval); _combatPortraitInterval = null; }
    const canvas = getEl('tut-combat-portrait');
    if (canvas) canvas.style.display = 'none';
    _combatPortraitImg = null;
  }

  /** Typewriter into element, returns promise. Tap overlay to skip. */
  function twType(el, text, speed) {
    return new Promise(resolve => {
      let i = 0, skipped = false;
      el.textContent = '';
      const overlay = getEl('tut-overlay');
      function finish() { el.textContent = text; resolve(); }
      function skipHandler() { skipped = true; overlay.removeEventListener('click', skipHandler); finish(); }
      overlay.addEventListener('click', skipHandler);
      (function tick() {
        if (skipped) return;
        if (i < text.length) { el.textContent += text[i++]; setTimeout(tick, speed); }
        else { overlay.removeEventListener('click', skipHandler); resolve(); }
      })();
    });
  }

  /** Show Iselle dialogue (bottom half, semi-translucent) */
  async function showDialogue(speaker, text, opts) {
    const box     = getEl('tut-dialogue');
    const nameEl  = getEl('tut-speaker-name');
    const bodyEl  = getEl('tut-dialogue-text');
    const contEl  = getEl('tut-continue');

    box.style.display = 'flex';
    nameEl.textContent = speaker;
    nameEl.className = 'tut-speaker ' + (speaker === 'SYSTEM' ? 'tut-speaker--system' : 'tut-speaker--iselle');
    contEl.style.display = 'none';
    bodyEl.textContent = '';

    // Show/hide Iselle portrait (only for Iselle)
    if (speaker === 'Iselle') {
      showPortrait();
      hideCombatPortrait();
    } else {
      hidePortrait();
    }

    // Show combat sprite portrait for Han/Shay/enemies
    if (speaker === 'Han') {
      await showCombatPortrait('soldier');
    } else if (speaker === 'Shay') {
      await showCombatPortrait('soldier'); // using soldier sprite for now
    } else if (speaker !== 'Iselle') {
      hideCombatPortrait();
    }

    // Color-code different speakers
    nameEl.style.color = '';
    if (speaker === 'Han') nameEl.style.color = '#C0C0D0';
    else if (speaker === 'Shay') nameEl.style.color = '#BB44FF';

    await twType(bodyEl, text, 28);

    // If auto-advance, wait then continue
    if (opts && opts.autoMs) {
      await sleep(opts.autoMs);
      return;
    }

    // Show "> tap to continue" and wait
    contEl.style.display = 'block';
    await waitTap();
    contEl.style.display = 'none';
  }

  function hideDialogue() {
    getEl('tut-dialogue').style.display = 'none';
    hidePortrait();
    hideCombatPortrait();
  }

  /** Show a Yes/No choice. Returns 'yes' or 'no'. */
  function showChoice(text) {
    return new Promise(resolve => {
      const box    = getEl('tut-choice');
      const txtEl  = getEl('tut-choice-text');
      const yesBtn = getEl('tut-yes');
      const noBtn  = getEl('tut-no');
      txtEl.textContent = text;
      box.style.display = 'flex';
      function pick(val) {
        yesBtn.removeEventListener('click', pickYes);
        noBtn.removeEventListener('click', pickNo);
        box.style.display = 'none';
        resolve(val);
      }
      function pickYes() { pick('yes'); }
      function pickNo()  { pick('no'); }
      yesBtn.addEventListener('click', pickYes);
      noBtn.addEventListener('click', pickNo);
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  function waitTap() {
    // Listen on document (not just #tut-overlay) so taps on modal content
    // inside #tut-combat-scene resolve correctly even if bubbling is cut short.
    // { once: true } auto-removes the listener after the first tap.
    return new Promise(resolve => {
      document.addEventListener('click', resolve, { once: true });
    });
  }

  /* ── BUTTON HIGHLIGHT SYSTEM ──────────────────── */
  function highlightButton(selector) {
    // Disable ALL interactive hub elements
    document.querySelectorAll('.hub-nav-btn, .hub-float-btn, .hub-topbar-icon').forEach(btn => {
      btn.classList.add('tut-disabled');
    });
    // Enable + highlight the target
    const target = document.querySelector(selector);
    if (target) {
      target.classList.remove('tut-disabled');
      target.classList.add('tut-highlight');
    }
    return target;
  }

  function clearHighlights() {
    document.querySelectorAll('.tut-disabled').forEach(b => b.classList.remove('tut-disabled'));
    document.querySelectorAll('.tut-highlight').forEach(b => b.classList.remove('tut-highlight'));
  }

  /** Wait for a specific hub nav button to be clicked */
  function waitForNav(navName) {
    return new Promise(resolve => {
      const origNav = window.hubNav;
      window.hubNav = function(name) {
        if (name === navName) {
          window.hubNav = origNav;
          clearHighlights();
          origNav(name);
          resolve();
        }
        // else: ignore — button is disabled anyway
      };
    });
  }

  /* ── COMBAT CUTSCENE ──────────────────────────── */
  async function runCombatCutscene() {
    const scene = getEl('tut-combat-scene');
    scene.style.display = 'flex';

    // Load sprites
    const [soldierIdle, soldierAttack, soldierHurt, soldierDeath, orcIdle, orcAttack, orcHurt, orcDeath] = await Promise.all([
      loadImg(SPRITES.soldier.idle),
      loadImg(SPRITES.soldier.attack),
      loadImg(SPRITES.soldier.hurt),
      loadImg(SPRITES.soldier.death),
      loadImg(SPRITES.orc.idle),
      loadImg(SPRITES.orc.attack),
      loadImg(SPRITES.orc.hurt),
      loadImg(SPRITES.orc.death),
    ]);

    const combatCanvas = getEl('tut-combat-canvas');
    combatCanvas.width  = 800;
    combatCanvas.height = 360;
    const cctx = combatCanvas.getContext('2d');
    cctx.imageSmoothingEnabled = false;

    // Simple sprite frame animator
    const FRAME_W = 100, FRAME_H = 100;
    let frame = 0, tick = 0;

    // Character states
    let heroState = 'idle', orcState = 'idle';
    let heroHp = 100, orcHp = 80;
    let heroMaxHp = 100, orcMaxHp = 80;
    let heroFear = 0;   // 0, 30, 50
    let heroAlpha = 1, orcAlpha = 1;
    let combatLog = [];

    function getSheet(who, state) {
      if (who === 'hero') {
        if (state === 'attack') return soldierAttack;
        if (state === 'hurt')   return soldierHurt;
        if (state === 'death')  return soldierDeath;
        return soldierIdle;
      }
      if (state === 'attack') return orcAttack;
      if (state === 'hurt')   return orcHurt;
      if (state === 'death')  return orcDeath;
      return orcIdle;
    }

    function getFrameCount(sheet) {
      return Math.floor(sheet.width / FRAME_W);
    }

    function drawCombat() {
      cctx.clearRect(0, 0, 800, 360);

      // Fire/smoke background effect
      drawFireBackground(cctx, tick);

      // Draw hero (left side, facing right)
      const heroSheet = getSheet('hero', heroState);
      const heroFrames = getFrameCount(heroSheet);
      const hf = Math.floor(frame / 8) % heroFrames;
      cctx.globalAlpha = heroAlpha;
      cctx.save();
      cctx.drawImage(heroSheet, hf * FRAME_W, 0, FRAME_W, FRAME_H, 120, 140, 150, 150);
      cctx.restore();

      // Fear overlay on hero
      if (heroFear > 0) {
        cctx.fillStyle = `rgba(128, 0, 128, ${heroFear / 200})`;
        cctx.fillRect(120, 140, 150, 150);
      }

      // Draw orc (right side, flipped)
      const orcSheet = getSheet('orc', orcState);
      const orcFrames = getFrameCount(orcSheet);
      const of = Math.floor(frame / 8) % orcFrames;
      cctx.globalAlpha = orcAlpha;
      cctx.save();
      cctx.translate(680, 140);
      cctx.scale(-1, 1);
      cctx.drawImage(orcSheet, of * FRAME_W, 0, FRAME_W, FRAME_H, 0, 0, 150, 150);
      cctx.restore();
      cctx.globalAlpha = 1;

      // HP bars
      drawHpBar(cctx, 120, 125, 150, 10, heroHp, heroMaxHp, '#44FF44', `Han(★) Lv.1`);
      drawHpBar(cctx, 530, 125, 150, 10, orcHp, orcMaxHp, '#FF4444', 'Skeleton Lv.1');

      // Combat log (bottom of canvas)
      cctx.fillStyle = 'rgba(0,0,0,0.6)';
      cctx.fillRect(0, 300, 800, 60);
      cctx.font = '12px "Courier New"';
      cctx.fillStyle = '#C0C0D0';
      const recentLog = combatLog.slice(-3);
      recentLog.forEach((msg, i) => {
        cctx.fillText(msg, 16, 318 + i * 16);
      });

      frame++;
      tick++;
    }

    function drawHpBar(ctx, x, y, w, h, hp, max, color, label) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#1A0025';
      ctx.fillRect(x, y, w, h);
      const pct = Math.max(0, hp / max);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w * pct, h);
      ctx.font = '10px "Courier New"';
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y - 4);
      ctx.textAlign = 'left';
    }

    function drawFireBackground(ctx, t) {
      // Dark smoky background with animated fire particles
      ctx.fillStyle = '#0A0005';
      ctx.fillRect(0, 0, 800, 360);

      // Smoke wisps
      for (let i = 0; i < 12; i++) {
        const x = (i * 73 + t * 0.3) % 820 - 10;
        const y = 200 + Math.sin(t * 0.02 + i) * 40;
        const r = 20 + Math.sin(t * 0.01 + i * 2) * 10;
        ctx.fillStyle = `rgba(80, 20, 20, ${0.15 + Math.sin(t * 0.03 + i) * 0.08})`;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Ground fire glow
      const grad = ctx.createLinearGradient(0, 280, 0, 360);
      grad.addColorStop(0, 'rgba(255, 80, 0, 0)');
      grad.addColorStop(1, `rgba(255, 60, 0, ${0.15 + Math.sin(t * 0.05) * 0.08})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 280, 800, 80);

      // Fire particles
      for (let i = 0; i < 8; i++) {
        const px = 100 + (i * 97 + t * 0.5) % 600;
        const py = 320 - ((t * 0.8 + i * 40) % 120);
        const size = 2 + Math.sin(t * 0.1 + i) * 1.5;
        ctx.fillStyle = `rgba(255, ${100 + i * 20}, 0, ${0.6 - (320 - py) / 200})`;
        ctx.fillRect(px, py, size, size);
      }
    }

    // Start render loop
    function renderLoop() {
      drawCombat();
      _animFrame = requestAnimationFrame(renderLoop);
    }
    _animFrame = requestAnimationFrame(renderLoop);

    // -- SCRIPTED COMBAT SEQUENCE --

    await sleep(800);
    combatLog.push('» A Skeleton appears from the burning ruins!');
    await sleep(1200);

    // System: Han feels fear
    await showDialogue('SYSTEM', "'Han(★)' feels fear! All attributes decrease by 30%.");
    heroFear = 30;
    combatLog.push('» Han(★) is trembling... ATK/DEF -30%');
    await sleep(600);

    await showDialogue('Iselle', "Tips: Heroes sometimes experience fear when facing enemies for the first time. Don't worry, there are ways to help them!");
    await sleep(400);

    // System: Han panics
    await showDialogue('SYSTEM', "'Han(★)' is in panic! All attributes decrease by 50%.");
    heroFear = 50;
    combatLog.push('» Han(★) is panicking! ATK/DEF -50%');
    await sleep(600);

    // Iselle potion tip
    await showDialogue('Iselle', "Master, please use the fear prevention potion on the hero in crisis! The fear prevention potion can be purchased for 50 gems from the shop, but the first time is provided for free.");
    await sleep(300);

    // Choice: use potion?
    hideDialogue();
    const choice = await showChoice('Would you like to use the Fear Prevention Potion?');

    if (choice === 'yes') {
      // ═══════ YES PATH: Fear removed, extended combat ═══════
      // Han deals 8-12 dmg per attack, Skeleton has 80 HP = ~7-8 exchanges
      combatLog.push('» Used Fear Prevention Potion on Han(★)!');
      heroFear = 0;
      await showDialogue('SYSTEM', "Fear removed! Han(★)'s attributes restored.", { autoMs: 1200 });

      // Han snaps out of it — panicked reaction
      await showDialogue('Han', "W-what?! What happened?! Where am I?!");
      await showDialogue('Han', "Who... who are you people?! What's going on?!");
      await showDialogue('Iselle', "Easy now, Han. You were overcome with fear. We used a potion to bring you back.");
      await showDialogue('Han', "I... I don't know who you are, but... thank you for saving me.");
      await showDialogue('Han', "That skeleton... it's still here. Stand back — let me handle this!");
      combatLog.push('» Han(★) regains composure!');

      // Exchange 1: Skeleton attacks first
      await sleep(400);
      orcState = 'attack';
      combatLog.push('» Skeleton attacks Han(★)!');
      await sleep(500);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 12);
      combatLog.push('» Han(★) takes 12 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(400);
      heroState = 'idle';

      // Exchange 2: Han strikes back
      await sleep(300);
      heroState = 'attack';
      combatLog.push('» Han(★) strikes back!');
      await sleep(500);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 10);
      combatLog.push('» Skeleton takes 10 damage! (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(400);
      orcState = 'idle';

      // Exchange 3: Skeleton attacks
      await sleep(300);
      orcState = 'attack';
      combatLog.push('» Skeleton lunges at Han(★)!');
      await sleep(500);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 10);
      combatLog.push('» Han(★) takes 10 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(400);
      heroState = 'idle';

      // Exchange 4: Han attacks
      await sleep(300);
      heroState = 'attack';
      combatLog.push('» Han(★) swings his sword!');
      await sleep(500);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 12);
      combatLog.push('» Skeleton takes 12 damage! (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(400);
      orcState = 'idle';

      // Exchange 5: Skeleton attacks
      await sleep(300);
      orcState = 'attack';
      combatLog.push('» Skeleton swipes at Han(★)!');
      await sleep(500);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 14);
      combatLog.push('» Han(★) takes 14 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(400);
      heroState = 'idle';

      // Exchange 6: Han attacks
      await sleep(300);
      heroState = 'attack';
      combatLog.push('» Han(★) presses forward!');
      await sleep(500);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 9);
      combatLog.push('» Skeleton takes 9 damage! (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(400);
      orcState = 'idle';

      // Exchange 7: Skeleton attacks
      await sleep(300);
      orcState = 'attack';
      combatLog.push('» Skeleton retaliates!');
      await sleep(500);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 11);
      combatLog.push('» Han(★) takes 11 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(400);
      heroState = 'idle';

      // Exchange 8: Han attacks
      await sleep(300);
      heroState = 'attack';
      combatLog.push('» Han(★) grits his teeth and attacks!');
      await sleep(500);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 11);
      combatLog.push('» Skeleton takes 11 damage! (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(400);
      orcState = 'idle';

      // Exchange 9: Skeleton attacks
      await sleep(300);
      orcState = 'attack';
      combatLog.push('» Skeleton slashes wildly!');
      await sleep(500);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 13);
      combatLog.push('» Han(★) takes 13 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(400);
      heroState = 'idle';

      // Exchange 10: Han attacks
      await sleep(300);
      heroState = 'attack';
      combatLog.push('» Han(★) sees an opening!');
      await sleep(500);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 10);
      combatLog.push('» Skeleton takes 10 damage! (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(400);
      orcState = 'idle';

      // Exchange 11: Skeleton attacks (weak)
      await sleep(300);
      orcState = 'attack';
      combatLog.push('» Skeleton staggers but attacks!');
      await sleep(500);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 8);
      combatLog.push('» Han(★) takes 8 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(400);
      heroState = 'idle';

      // Exchange 12: Han finishes
      await sleep(300);
      heroState = 'attack';
      combatLog.push('» Han(★) lands the finishing blow!');
      await sleep(500);
      heroState = 'idle'; orcState = 'death';
      orcHp = 0;
      combatLog.push('» Skeleton defeated!');
      await sleep(700);

    } else {
      // ═══════ NO PATH: Han dies → Iselle revives ═══════
      combatLog.push('» Han(★) fights through the fear...');
      await showDialogue('Iselle', "Brave choice, Master. Han will have to push through!", { autoMs: 1200 });

      // Exchange 1: Orc attacks (devastating with 50% fear)
      await sleep(500);
      orcState = 'attack';
      combatLog.push('» Skeleton attacks Han(★)!');
      await sleep(600);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 35);
      combatLog.push('» Han(★) takes 35 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(500);
      heroState = 'idle';

      // Exchange 2: Han's pathetic attack
      await sleep(400);
      heroState = 'attack';
      combatLog.push('» Han(★) attacks desperately!');
      await sleep(600);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 3);
      combatLog.push('» Skeleton takes 3 damage... (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(500);
      orcState = 'idle';

      // Exchange 3: Orc attacks again
      await sleep(400);
      orcState = 'attack';
      combatLog.push('» Skeleton strikes again!');
      await sleep(600);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = Math.max(0, heroHp - 35);
      combatLog.push('» Han(★) takes 35 damage! (HP: ' + heroHp + '/' + heroMaxHp + ')');
      await sleep(500);
      heroState = 'idle';

      // Exchange 4: Orc finishes Han
      await sleep(400);
      orcState = 'attack';
      combatLog.push('» Skeleton delivers a crushing blow!');
      await sleep(600);
      orcState = 'idle'; heroState = 'hurt';
      heroHp = 0;
      combatLog.push('» Han(★) has been defeated!');
      await sleep(600);

      // Han death animation
      heroState = 'death';
      await sleep(1500);

      // Fade out hero
      for (let a = 1; a >= 0; a -= 0.04) {
        heroAlpha = a;
        await sleep(50);
      }

      // Dramatic pause
      await sleep(600);
      await showDialogue('SYSTEM', "'Han(★)' has fallen in battle.");

      await showDialogue('Iselle', "Master...! This is what fear does to a hero unprepared for battle. Without the right tools, even the bravest will fall.");
      await showDialogue('Iselle', "But as your guide, I won't let this end here. Just this once...");

      await showDialogue('SYSTEM', "Iselle used [ Emergency Revival ]!", { autoMs: 1800 });

      // Revive Han
      heroState = 'idle';
      heroHp = 50;
      heroFear = 0;
      heroAlpha = 1;
      combatLog.push('» Iselle revives Han(★)! HP restored. Fear cleansed!');
      await sleep(400);

      await showDialogue('Iselle', "The fear is gone now. Finish this, Han!");
      hideDialogue();
      await sleep(400);

      // Exchange 5: Han attacks with renewed vigor
      heroState = 'attack';
      combatLog.push('» Han(★) attacks with renewed vigor!');
      await sleep(600);
      heroState = 'idle'; orcState = 'hurt';
      orcHp = Math.max(0, orcHp - 15);
      combatLog.push('» Skeleton takes 15 damage! (HP: ' + orcHp + '/' + orcMaxHp + ')');
      await sleep(500);
      orcState = 'idle';

      // Exchange 6: Han finishes the orc
      await sleep(400);
      heroState = 'attack';
      combatLog.push('» Han(★) strikes the final blow!');
      await sleep(600);
      heroState = 'idle'; orcState = 'death';
      orcHp = 0;
      combatLog.push('» Skeleton defeated!');
      await sleep(800);
    }

    // ═══════ COMMON: Victory sequence ═══════
    // Fade out orc
    for (let a = 1; a >= 0; a -= 0.05) {
      orcAlpha = a;
      await sleep(40);
    }

    // Stop render loop
    if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }

    // Victory messages
    await showDialogue('SYSTEM', "Stage cleared!", { autoMs: 1500 });
    await showDialogue('SYSTEM', "'Han(★)' leveled up!", { autoMs: 1500 });

    // Apply tutorial battle reward (60 gems, 100 gold per intro script)
    applyReward({ gems: 60, gold: 100 });

    await showDialogue('Iselle', "You did it! Rough around the edges, but that\u2019s what we\u2019re here to fix. Here\u2019s a small gift \u2014 you\u2019ve earned it.", { autoMs: 2500 });

    scene.style.display = 'none';
  }

  /* ── TUTORIAL SUMMON HELPERS ─────────────────── */
  function waitForPull() {
    return new Promise(function (resolve) {
      window._tutorialPullResolve = resolve;
    });
  }

  function waitForPartySize(minSize) {
    return new Promise(function (resolve) {
      if (gameState.party.length >= minSize) { resolve(); return; }
      var check = setInterval(function () {
        if (gameState.party.length >= minSize) {
          clearInterval(check);
          resolve();
        }
      }, 500);
    });
  }

  /* ── SECOND COMBAT CUTSCENE (Han + Shay vs 5 Goblins) ── */
  async function runSecondCombat() {
    var scene = getEl('tut-combat-scene');
    scene.style.display = 'flex';

    var soldierIdle   = await loadImg(SPRITES.soldier.idle);
    var soldierAttack = await loadImg(SPRITES.soldier.attack);
    var soldierHurt   = await loadImg(SPRITES.soldier.hurt);
    var soldierDeath  = await loadImg(SPRITES.soldier.death);
    var orcIdle       = await loadImg(SPRITES.orc.idle);
    var orcAttack     = await loadImg(SPRITES.orc.attack);
    var orcHurt       = await loadImg(SPRITES.orc.hurt);
    var orcDeath      = await loadImg(SPRITES.orc.death);

    var canvas = getEl('tut-combat-canvas');
    canvas.width = 800; canvas.height = 360;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    var FW = 100, FH = 100, frame = 0, tick = 0;

    // Character states - 5 goblins now
    var hanSt = 'idle', shaySt = 'idle';
    var gASt = 'idle', gBSt = 'idle', gCSt = 'idle', gDSt = 'idle', gESt = 'idle';
    var hanHp = 80, hanMax = 80;
    var shayHp = 160, shayMax = 160;
    var gAHp = 40, gBHp = 40, gCHp = 40, gDHp = 40, gEHp = 40, gMax = 40;
    var hanA = 1, shayA = 1, gAA = 1, gBA = 1, gCA = 1, gDA = 1, gEA = 1;
    var combatLog = [];

    function heroSheet(st) {
      if (st === 'attack') return soldierAttack;
      if (st === 'hurt')   return soldierHurt;
      if (st === 'death')  return soldierDeath;
      return soldierIdle;
    }
    function enemySheet(st) {
      if (st === 'attack') return orcAttack;
      if (st === 'hurt')   return orcHurt;
      if (st === 'death')  return orcDeath;
      return orcIdle;
    }
    function fc(s) { return Math.floor(s.width / FW); }

    // Smaller sprites for 5 goblins
    var SZ = 90;
    var HX = 50, HY = 60, SX = 50, SY = 185;
    // 5 goblin positions (stacked on right side)
    var GAX = 550, GAY = 5;
    var GBX = 620, GBY = 65;
    var GCX = 550, GCY = 125;
    var GDX = 620, GDY = 185;
    var GEX = 550, GEY = 245;

    function drawHpBar2(x, y, w, h, hp, max, col, label) {
      ctx.fillStyle = '#000';
      ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
      ctx.fillStyle = '#1A0025';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = col;
      ctx.fillRect(x, y, w * Math.max(0, hp / max), h);
      ctx.font = '8px "Courier New"';
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText(label, x + w / 2, y - 2);
      ctx.textAlign = 'left';
    }

    function drawFire2(t) {
      ctx.fillStyle = '#0A0005';
      ctx.fillRect(0, 0, 800, 360);
      for (var i = 0; i < 15; i++) {
        var x = (i * 58 + t * 0.4) % 830 - 10;
        var y = 180 + Math.sin(t * 0.025 + i) * 50;
        var r = 18 + Math.sin(t * 0.012 + i * 2) * 10;
        ctx.fillStyle = 'rgba(100, 30, 10, ' + (0.18 + Math.sin(t * 0.035 + i) * 0.09) + ')';
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
      var grad = ctx.createLinearGradient(0, 270, 0, 360);
      grad.addColorStop(0, 'rgba(255,80,0,0)');
      grad.addColorStop(1, 'rgba(255,60,0,' + (0.2 + Math.sin(t * 0.05) * 0.1) + ')');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 270, 800, 90);
      for (var j = 0; j < 12; j++) {
        var px = 50 + (j * 72 + t * 0.6) % 700;
        var py = 330 - ((t * 0.9 + j * 35) % 140);
        var sz = 2 + Math.sin(t * 0.1 + j) * 1.5;
        ctx.fillStyle = 'rgba(255,' + (90 + j * 15) + ',0,' + (0.7 - (330 - py) / 220) + ')';
        ctx.fillRect(px, py, sz, sz);
      }
    }

    function drawGob(st, alpha, gx, gy) {
      var gs = enemySheet(st), gf = Math.floor(frame / 8) % fc(gs);
      ctx.globalAlpha = alpha;
      ctx.save(); ctx.translate(gx + SZ, gy); ctx.scale(-1, 1);
      ctx.drawImage(gs, gf * FW, 0, FW, FH, 0, 0, SZ, SZ);
      ctx.restore();
    }

    function drawAll() {
      ctx.clearRect(0, 0, 800, 360);
      drawFire2(tick);
      var f = Math.floor(frame / 8);

      // Han
      var hs = heroSheet(hanSt), hf = f % fc(hs);
      ctx.globalAlpha = hanA;
      ctx.drawImage(hs, hf * FW, 0, FW, FH, HX, HY, SZ + 10, SZ + 10);

      // Shay (golden aura)
      var ss = heroSheet(shaySt), sf = f % fc(ss);
      ctx.globalAlpha = shayA;
      ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 10;
      ctx.drawImage(ss, sf * FW, 0, FW, FH, SX, SY, SZ + 10, SZ + 10);
      ctx.shadowBlur = 0;

      // 5 Goblins (flipped)
      drawGob(gASt, gAA, GAX, GAY);
      drawGob(gBSt, gBA, GBX, GBY);
      drawGob(gCSt, gCA, GCX, GCY);
      drawGob(gDSt, gDA, GDX, GDY);
      drawGob(gESt, gEA, GEX, GEY);

      ctx.globalAlpha = 1;

      // HP bars
      drawHpBar2(HX, HY - 12, SZ, 6, hanHp, hanMax, '#44FF44', 'Han(\u2605) Lv.2');
      drawHpBar2(SX, SY - 12, SZ, 6, shayHp, shayMax, '#FFD700', 'Shay(\u2605\u2605\u2605\u2605) Lv.1');
      if (gAA > 0.1) drawHpBar2(GAX, GAY - 10, SZ, 5, gAHp, gMax, '#FF4444', 'Gob A');
      if (gBA > 0.1) drawHpBar2(GBX, GBY - 10, SZ, 5, gBHp, gMax, '#FF4444', 'Gob B');
      if (gCA > 0.1) drawHpBar2(GCX, GCY - 10, SZ, 5, gCHp, gMax, '#FF4444', 'Gob C');
      if (gDA > 0.1) drawHpBar2(GDX, GDY - 10, SZ, 5, gDHp, gMax, '#FF4444', 'Gob D');
      if (gEA > 0.1) drawHpBar2(GEX, GEY - 10, SZ, 5, gEHp, gMax, '#FF4444', 'Gob E');

      // Log
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 300, 800, 60);
      ctx.font = '11px "Courier New"';
      ctx.fillStyle = '#C0C0D0';
      combatLog.slice(-3).forEach(function (msg, i) { ctx.fillText(msg, 12, 316 + i * 15); });

      frame++; tick++;
    }

    _animFrame = requestAnimationFrame(function loop() { drawAll(); _animFrame = requestAnimationFrame(loop); });

    // -- SCRIPTED BATTLE vs 5 GOBLINS --
    await sleep(800);
    combatLog.push('\u00BB Burning village! People flee in all directions!');
    await sleep(1000);
    combatLog.push('\u00BB A horde of goblins swarms from the hills!');
    await sleep(1200);

    // Round 1: Goblin A attacks Han
    gASt = 'attack'; await sleep(400);
    gASt = 'idle'; hanSt = 'hurt';
    hanHp = Math.max(0, hanHp - 14);
    combatLog.push('\u00BB Goblin A attacks Han(\u2605)! -14 HP (' + hanHp + '/' + hanMax + ')');
    await sleep(400); hanSt = 'idle';

    // Round 2: Han attacks Goblin A — pathetic
    await sleep(250);
    hanSt = 'attack';
    combatLog.push('\u00BB Han(\u2605) attacks Goblin A!');
    await sleep(400); hanSt = 'idle'; gASt = 'hurt';
    gAHp = Math.max(0, gAHp - 4);
    combatLog.push('\u00BB Goblin A takes 4 damage... (' + gAHp + '/' + gMax + ')');
    await sleep(350); gASt = 'idle';

    // Round 3: Shay attacks Goblin A — DEVASTATING
    await sleep(250);
    shaySt = 'attack';
    combatLog.push('\u00BB Shay(\u2605\u2605\u2605\u2605) attacks Goblin A!');
    await sleep(400); shaySt = 'idle'; gASt = 'hurt';
    gAHp = Math.max(0, gAHp - 25);
    combatLog.push('\u00BB Goblin A takes 25 damage! (' + gAHp + '/' + gMax + ')');
    await sleep(350); gASt = 'idle';

    await showDialogue('SYSTEM', "The difference in power is overwhelming!", { autoMs: 1200 });

    // Round 4: Goblin B attacks Shay — barely scratches
    gBSt = 'attack'; await sleep(400);
    gBSt = 'idle'; shaySt = 'hurt';
    shayHp = Math.max(0, shayHp - 5);
    combatLog.push('\u00BB Goblin B attacks Shay(\u2605\u2605\u2605\u2605)! -5 HP (' + shayHp + '/' + shayMax + ')');
    await sleep(350); shaySt = 'idle';

    // Round 5: Shay finishes Goblin A
    await sleep(250);
    shaySt = 'attack';
    combatLog.push('\u00BB Shay(\u2605\u2605\u2605\u2605) strikes Goblin A!');
    await sleep(400); shaySt = 'idle'; gASt = 'death';
    gAHp = 0;
    combatLog.push('\u00BB Goblin A defeated!');
    await sleep(500);
    for (var a1 = 1; a1 >= 0; a1 -= 0.08) { gAA = a1; await sleep(25); }

    // Round 6: Goblin C attacks Han
    gCSt = 'attack'; await sleep(400);
    gCSt = 'idle'; hanSt = 'hurt';
    hanHp = Math.max(0, hanHp - 16);
    combatLog.push('\u00BB Goblin C attacks Han(\u2605)! -16 HP (' + hanHp + '/' + hanMax + ')');
    await sleep(350); hanSt = 'idle';

    // Round 7: Goblin D attacks Han
    gDSt = 'attack'; await sleep(400);
    gDSt = 'idle'; hanSt = 'hurt';
    hanHp = Math.max(0, hanHp - 12);
    combatLog.push('\u00BB Goblin D attacks Han(\u2605)! -12 HP (' + hanHp + '/' + hanMax + ')');
    await sleep(350); hanSt = 'idle';

    // Round 8: Han attacks Goblin B — weak
    await sleep(250);
    hanSt = 'attack';
    combatLog.push('\u00BB Han(\u2605) attacks Goblin B!');
    await sleep(400); hanSt = 'idle'; gBSt = 'hurt';
    gBHp = Math.max(0, gBHp - 5);
    combatLog.push('\u00BB Goblin B takes 5 damage... (' + gBHp + '/' + gMax + ')');
    await sleep(350); gBSt = 'idle';

    // Round 9: Shay kills Goblin B
    await sleep(250);
    shaySt = 'attack';
    combatLog.push('\u00BB Shay(\u2605\u2605\u2605\u2605) attacks Goblin B!');
    await sleep(400); shaySt = 'idle'; gBSt = 'death';
    gBHp = 0;
    combatLog.push('\u00BB Goblin B defeated!');
    await sleep(500);
    for (var a2 = 1; a2 >= 0; a2 -= 0.08) { gBA = a2; await sleep(25); }

    // Round 10: Goblin E attacks Shay
    gESt = 'attack'; await sleep(400);
    gESt = 'idle'; shaySt = 'hurt';
    shayHp = Math.max(0, shayHp - 6);
    combatLog.push('\u00BB Goblin E attacks Shay(\u2605\u2605\u2605\u2605)! -6 HP (' + shayHp + '/' + shayMax + ')');
    await sleep(350); shaySt = 'idle';

    // Round 11: Shay attacks Goblin C
    await sleep(250);
    shaySt = 'attack';
    combatLog.push('\u00BB Shay(\u2605\u2605\u2605\u2605) attacks Goblin C!');
    await sleep(400); shaySt = 'idle'; gCSt = 'death';
    gCHp = 0;
    combatLog.push('\u00BB Goblin C defeated!');
    await sleep(500);
    for (var a3 = 1; a3 >= 0; a3 -= 0.08) { gCA = a3; await sleep(25); }

    // Round 12: Goblin D attacks Shay
    gDSt = 'attack'; await sleep(400);
    gDSt = 'idle'; shaySt = 'hurt';
    shayHp = Math.max(0, shayHp - 7);
    combatLog.push('\u00BB Goblin D attacks Shay(\u2605\u2605\u2605\u2605)! -7 HP (' + shayHp + '/' + shayMax + ')');
    await sleep(350); shaySt = 'idle';

    // Round 13: Han attacks Goblin D
    await sleep(250);
    hanSt = 'attack';
    combatLog.push('\u00BB Han(\u2605) attacks Goblin D!');
    await sleep(400); hanSt = 'idle'; gDSt = 'hurt';
    gDHp = Math.max(0, gDHp - 6);
    combatLog.push('\u00BB Goblin D takes 6 damage (' + gDHp + '/' + gMax + ')');
    await sleep(350); gDSt = 'idle';

    // Round 14: Shay finishes Goblin D
    await sleep(250);
    shaySt = 'attack';
    combatLog.push('\u00BB Shay(\u2605\u2605\u2605\u2605) attacks Goblin D!');
    await sleep(400); shaySt = 'idle'; gDSt = 'death';
    gDHp = 0;
    combatLog.push('\u00BB Goblin D defeated!');
    await sleep(500);
    for (var a4 = 1; a4 >= 0; a4 -= 0.08) { gDA = a4; await sleep(25); }

    // Round 15: Goblin E attacks Han (desperate)
    gESt = 'attack'; await sleep(400);
    gESt = 'idle'; hanSt = 'hurt';
    hanHp = Math.max(0, hanHp - 10);
    combatLog.push('\u00BB Goblin E attacks Han(\u2605)! -10 HP (' + hanHp + '/' + hanMax + ')');
    await sleep(350); hanSt = 'idle';

    // Round 16: Shay finishes Goblin E
    await sleep(250);
    shaySt = 'attack';
    combatLog.push('\u00BB Shay(\u2605\u2605\u2605\u2605) delivers the final blow!');
    await sleep(400); shaySt = 'idle'; gESt = 'death';
    gEHp = 0;
    combatLog.push('\u00BB Goblin E defeated!');
    await sleep(500);
    for (var a5 = 1; a5 >= 0; a5 -= 0.08) { gEA = a5; await sleep(25); }

    // Stop render
    if (_animFrame) { cancelAnimationFrame(_animFrame); _animFrame = null; }

    // Victory sequence
    await showDialogue('SYSTEM', "Stage cleared!", { autoMs: 1500 });
    await showDialogue('SYSTEM', "'Shay (\u2605\u2605\u2605\u2605)' leveled up!", { autoMs: 1500 });

    applyReward({ gems: 80, gold: 500 });

    await showDialogue('SYSTEM', "Victory! Your party fought bravely against the goblin horde.", { autoMs: 2000 });
    await showDialogue('SYSTEM', "MVP \u2013 'Shay (\u2605\u2605\u2605\u2605)'", { autoMs: 2000 });

    scene.style.display = 'none';
  }

  /* ── TUTORIAL STEP SCRIPT ─────────────────────── */
  //
  //  Beat map (15 narrative beats):
  //
  //   0  Wake-up          Iselle intro + camera shake + Han cutscene
  //   1  Repair Spire     guide → City tab
  //   2  Help Han         [View] tap prompt
  //   3  Heal Han         Potion + Bread action prompts → 10 BD reward
  //   4  Han thanks       dialogue chain
  //   5  First combat     runCombatCutscene (60 gems, 100 gold)
  //   6  Return to city   guide → Lobby tab
  //   7  City lore        Iselle sad/hopeful + spire guidance dialogue
  //   8  Spire built      guide → City + _showSpireBuilt (200 gold + Bakery)
  //   9  City name        _showCityNamePrompt + Iselle city-name dialogue
  //  10  Bakery unlock    _showBakeryUnlock (200 gold cost → 1 Wish + 40 BD)
  //  11  Summon/Tower     guide → Summon → tutorialSummon → Heroes → Shay → Tower
  //  12  Epilogue         Post-tower Iselle + Han dialogue
  //  (end)
  //
  var STEPS = [

    // ── 0: WAKE-UP ───────────────────────────────────────────────
    { type: 'narration',        speaker: 'Iselle', text: "You\u2019re awake at last. I\u2019m Iselle, your companion." },
    { type: 'narration',        speaker: 'Iselle', text: "Things are bad\u2026 Monsters have broken through the defenses and are invading Townia. We need to hurry! Oh, no!" },
    { type: 'cameraShake' },
    { type: 'cutscene',         text: '[ The volcano erupts \u2014 goblin hordes storm from the hillside! ]' },
    { type: 'cutscene',         text: '[ Han runs through the burning streets and hides in a corner, trembling\u2026 ]' },

    // ── 1: REPAIR MYSTIC SPIRE ────────────────────────────────────
    { type: 'guide',            speaker: 'Iselle',
      text: "We must restore Townia\u2019s power! Head to the city \u2014 tap the Mystic Spire to begin repairs.",
      target: '[data-nav="City"]', navWait: 'City' },

    // ── 2: HELP HAN ───────────────────────────────────────────────
    { type: 'narration',        speaker: 'Iselle', text: "Oh no, that poor boy! We need to help him!" },
    { type: 'actionPrompt',     label: '[ View ]', reward: null, rewardHint: null },

    // ── 3: HEAL HAN — potion + bread → 10 BD reward ──────────────
    { type: 'narration',        speaker: 'Iselle',
      text: "Looks like his stats have decreased from hunger and fear! Here \u2014 use the fear prevention potion. It can be purchased for 50 gems from the shop, but the first time is provided for free." },
    { type: 'actionPrompt',     label: '[ Potion ]', reward: null, rewardHint: null },
    { type: 'narration',        speaker: 'Han',   text: "W-What is happening to me? Who\u2026 Who are you!" },
    { type: 'narration',        speaker: 'Iselle', text: "Hmm\u2026 He hasn\u2019t stopped shaking yet\u2026 Here. Use this bread." },
    { type: 'actionPrompt',     label: '[ Bread ]', reward: { schematics: 10 },
      rewardHint: "Building Schematics can be acquired in Townia. Fulfilling the roles of Master can restore the power sealed within the Mystic Spire." },

    // ── 4: HAN THANKS MASTER ─────────────────────────────────────
    { type: 'narration',        speaker: 'Han',
      text: "Oh god\u2026 Thank you! You saved my life! I\u2019m Han Islat \u2014 and you?" },
    { type: 'narrationDynamic', speaker: 'Iselle',
      text: function () { return "They\u2019re " + (gameState.playerNickname || 'Master') + ", who have come to save you from this peril."; } },
    { type: 'narration',        speaker: 'Han',
      text: "Master\u2026 Thank you! Help me fight against these goblins, please!" },
    { type: 'narration',        speaker: 'Iselle',
      text: "Master! Let\u2019s help this boy fight against the goblins!" },

    // ── 5: FIRST COMBAT ───────────────────────────────────────────
    { type: 'combat' },   // reward 60 gems + 100 gold — set in runCombatCutscene

    // ── 6: RETURN TO CITY ─────────────────────────────────────────
    { type: 'narration',        speaker: 'Iselle',
      text: "Congratulations Master! Let\u2019s take Han back to our city for now! We\u2019ve earned some Building Schematics \u2014 now we can restore the Mystic Spire!" },
    { type: 'guide',            speaker: 'Iselle', text: "Head to the Lobby \u2014 our city awaits!",
      target: '[data-nav="Lobby"]', navWait: 'Lobby' },

    // ── 7: CITY INTRO LORE + SPIRE GUIDANCE ─────────────────────
    { type: 'narration',        speaker: 'Iselle',
      text: "I\u2019m sorry Master, I\u2019ve kept this city unkept for far too long\u2026" },
    { type: 'narration',        speaker: 'Iselle',
      text: "But don\u2019t worry! With your help, Townia will face glory once again!" },
    { type: 'narration',        speaker: 'Iselle',
      text: "You will need Building Schematics to upgrade the Spire, so make sure to grab some more along the way." },
    { type: 'narration',        speaker: 'Iselle',
      text: "Now, let\u2019s repair the Spire again." },

    // ── 8: SPIRE BUILT → BAKERY UNLOCKED + 200 GOLD ──────────────
    { type: 'guide',            speaker: 'Iselle', text: "Tap the Repair button to restore the Mystic Spire!",
      target: '[data-nav="City"]', navWait: 'City' },
    { type: 'spireBuilt',       reward: { gold: 200 } },

    // ── 9: CITY NAME ──────────────────────────────────────────────
    { type: 'narration',        speaker: 'Iselle',
      text: "The Mystic Spire is regaining its power\u2026 Our City is now ready to rise from the ashes!" },
    { type: 'cityName' },
    { type: 'narrationDynamic', speaker: 'Iselle',
      text: function () { return (gameState.city && gameState.city.name ? gameState.city.name : 'This city') + " is not just our home; it stands as the last line of defense against the forces of evil!"; } },
    { type: 'narration',        speaker: 'Iselle',
      text: "Master, you must bring back peace here as quickly as possible. Only then can the rest of the world be protected from the darkness and chaos\u2026" },

    // ── 10: BAKERY UNLOCK ─────────────────────────────────────────
    { type: 'narration',        speaker: 'Iselle', text: "Let\u2019s access the Bakery we unlocked earlier!" },
    { type: 'bakeryUnlock' },

    // ── 11: SUMMON + HEROES + TOWER GUIDANCE ─────────────────────
    { type: 'narration',        speaker: 'Iselle',
      text: "Master, Han Islat is from the land of harmony between humans and nonhumans \u2014 Townia." },
    { type: 'narration',        speaker: 'Iselle',
      text: "But a few years ago\u2026 An unknown enemy invaded the continent of peace." },
    { type: 'narration',        speaker: 'Iselle',
      text: "You, Master! If you wish to save the world\u2026 Climb the tower!" },
    { type: 'narration',        speaker: 'Iselle',
      text: "Han Islat\u2019s strength alone might not be enough\u2026 Should we summon a companion before proceeding?" },
    { type: 'guide',            speaker: 'Iselle',
      text: "Master! You can recruit companions through the Summoning Station here!",
      target: '[data-nav="Summon"]', navWait: 'Summon' },
    { type: 'tutorialSummon' },
    { type: 'guide',            speaker: 'Iselle',
      text: "Please touch the \u2018Heroes\u2019 tab to view your newly summoned hero.",
      target: '[data-nav="Knights"]', navWait: 'Knights' },
    { type: 'narration',        speaker: 'Iselle',
      text: "Would you like to form a party? Add Shay to your party to proceed!" },
    { type: 'waitForShay' },
    { type: 'guide',            speaker: 'Iselle', text: "Let\u2019s head to the Tower, Master!",
      target: '[data-nav="Tower"]', navWait: 'Tower' },

    // ── 12: POST-TOWER EPILOGUE ───────────────────────────────────
    { type: 'narration',        speaker: 'Iselle',
      text: "The Tower remained strong even when enemies flooded the continent! It\u2019s all thanks to Goddess Durin\u2019s magic!" },
    { type: 'narration',        speaker: 'Iselle',
      text: "You can also send your heroes in to collect resources on your behalf." },
    { type: 'narration',        speaker: 'Han',   text: "Yes, yes! Madam Iselle is so smart!" },
    { type: 'narration',        speaker: 'Han',
      text: "If you can summon more heroes, we can clear out the dangerous creatures in the tower! I can also train alongside them \u2014 we\u2019ll clear more floors! Meaning more resources!" },
    { type: 'narration',        speaker: 'Iselle',
      text: "Master, you can use these materials to level up your heroes!" },

    { type: 'end' },
  ];

  /* ── WAIT FOR SHAY IN PARTY ──────────────────── */
  function waitForShayInParty() {
    return new Promise(function (resolve) {
      // Check if Shay is already in party
      var shay = gameState.inventory.find(function(h) {
        return h.type === 'hero' && h.name === 'Shay Radasterry';
      });
      if (shay && shay.inParty) { resolve(); return; }

      // Poll for Shay being added to party
      var check = setInterval(function () {
        var shayHero = gameState.inventory.find(function(h) {
          return h.type === 'hero' && h.name === 'Shay Radasterry';
        });
        if (shayHero && shayHero.inParty) {
          clearInterval(check);
          resolve();
        }
      }, 500);
    });
  }

  /* ── BLACK SCREEN CUTSCENE PLACEHOLDER ────────── */
  async function showBlackScreen(text) {
    const scene = getEl('tut-combat-scene');
    scene.style.display = 'flex';
    scene.style.background = '#000000';

    const canvas = getEl('tut-combat-canvas');
    canvas.width = 800;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Full black with centered placeholder text
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 800, 360);
    ctx.fillStyle = '#333348';
    ctx.font = '16px "Courier New"';
    ctx.textAlign = 'center';
    ctx.fillText(text, 400, 180);
    ctx.textAlign = 'left';

    await sleep(2000);
    await waitTap();

    scene.style.display = 'none';
  }

  /* ── SYNTHESIS TUTORIAL (fully scripted) ──────── */
  async function runSynthesisTutorial() {
    const overlay = getEl('tut-overlay');
    const scene   = getEl('tut-combat-scene');

    // Find heroes
    const han  = gameState.inventory.find(h => h.type === 'hero' && h.isStarter);
    const shay = gameState.inventory.find(h => h.type === 'hero' && h.name === 'Shay Radasterry');
    if (!han || !shay) { console.warn('[Tutorial] Missing Han or Shay for synthesis'); return; }

    // Level Han to 2 for the tutorial (scripted progression)
    han.level = 2;
    han.exp   = 7;
    han.stats.strength     = 11;
    han.stats.intelligence = 11;
    han.stats.health       = 11;
    han.stats.agility      = 11;
    saveGame();

    // ── NOW LOADING ──
    hideDialogue();
    scene.style.display = 'flex';
    scene.style.cssText = 'display:flex;justify-content:center;align-items:center;flex-direction:column;background:#0D0010;width:100%;min-height:320px;gap:0;';
    scene.innerHTML =
      '<div style="color:#B8A9D0;font-size:16px;font-family:\'Courier New\',monospace;letter-spacing:3px">' +
        '[ Now Loading... ]' +
      '</div>';
    await sleep(2000);

    // ── HAN'S STAT CARD ──
    const hanStars = '\u2605'.repeat(han.rarity);
    scene.innerHTML =
      '<div style="background:#12001A;border:1px solid #C0C0D0;padding:20px 28px;font-family:\'Courier New\',monospace;min-width:280px;max-width:400px;">' +
        '<div style="color:#FFD700;font-size:14px;letter-spacing:2px;margin-bottom:12px;text-align:center">[ HERO STATUS ]</div>' +
        '<div style="color:#fff;font-size:14px;margin-bottom:4px">' + escHtml(han.name) + ' (' + hanStars + ') Lv. ' + han.level + ' (Exp ' + han.exp + '/20)</div>' +
        '<div style="color:#B8A9D0;font-size:13px;margin-bottom:12px">Class: ' + escHtml(han.class) + '</div>' +
        '<div style="color:#C0C0D0;font-size:12px;line-height:2">' +
          'Strength: ' + han.stats.strength + '/' + han.stats.strength + '<br>' +
          'Intelligence: ' + han.stats.intelligence + '/' + han.stats.intelligence + '<br>' +
          'Health: ' + han.stats.health + '/' + han.stats.health + '<br>' +
          'Agility: ' + han.stats.agility + '/' + han.stats.agility +
        '</div>' +
        '<div style="color:#B8A9D0;font-size:12px;margin-top:8px">Skills: None</div>' +
      '</div>' +
      '<div style="color:#B8A9D088;font-size:11px;margin-top:16px;font-family:\'Courier New\',monospace;animation:blink 1s step-end infinite;cursor:pointer">[ Tap to continue ]</div>';
    await waitTap();

    // ── SYNTHESIS LAYOUT: Shay (base) ← Han (sacrifice) ──
    const shayStars = '\u2605'.repeat(shay.rarity);
    scene.innerHTML =
      '<div style="color:#FFD700;font-size:15px;font-family:\'Courier New\',monospace;letter-spacing:2px;margin-bottom:20px">[ SYNTHESIS ]</div>' +
      '<div style="display:flex;align-items:center;gap:24px;">' +
        '<div style="text-align:center;">' +
          '<div style="color:#C0C0D0;font-size:11px;letter-spacing:2px;margin-bottom:6px">[ BASE HERO ]</div>' +
          '<div style="background:#12001A;border:2px solid #C0C0D0;padding:14px 18px;min-width:140px;font-family:\'Courier New\',monospace">' +
            '<div style="color:#fff;font-size:13px">' + escHtml(shay.name) + '</div>' +
            '<div style="color:#C0C0D0;font-size:12px">' + shayStars + ' \u00b7 ' + escHtml(shay.class) + '</div>' +
            '<div style="color:#B8A9D0;font-size:11px;margin-top:4px">Lv. ' + shay.level + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="color:#FFD700;font-size:28px;font-family:\'Courier New\',monospace;font-weight:bold">\u2190</div>' +
        '<div style="text-align:center;">' +
          '<div style="color:#FF4444;font-size:11px;letter-spacing:2px;margin-bottom:6px">[ SACRIFICE ]</div>' +
          '<div style="background:#12001A;border:2px solid #FF4444;padding:14px 18px;min-width:140px;font-family:\'Courier New\',monospace">' +
            '<div style="color:#fff;font-size:13px">' + escHtml(han.name) + '</div>' +
            '<div style="color:#FF4444;font-size:12px">' + hanStars + ' \u00b7 ' + escHtml(han.class) + '</div>' +
            '<div style="color:#B8A9D0;font-size:11px;margin-top:4px">Lv. ' + han.level + '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div style="color:#B8A9D088;font-size:11px;margin-top:20px;font-family:\'Courier New\',monospace;animation:blink 1s step-end infinite;cursor:pointer">[ Tap to continue ]</div>';
    await waitTap();

    // ── D20 ROLL CHOICE ──
    const riggedValue = 3 + Math.floor(Math.random() * 6);  // 3–8 (always fails)
    scene.innerHTML =
      '<div style="color:#FFD700;font-size:15px;font-family:\'Courier New\',monospace;letter-spacing:2px;margin-bottom:16px">[ SYNTHESIS ROLL ]</div>' +
      '<div style="color:#B8A9D0;font-size:12px;font-family:\'Courier New\',monospace;margin-bottom:24px;text-align:center;max-width:400px;line-height:1.8">' +
        'Roll the D20 to determine synthesis outcome.<br>' +
        '10 or higher = Success. Below 10 = Reversal.' +
      '</div>' +
      '<div style="display:flex;gap:16px;">' +
        '<button id="tut-roll-btn" style="background:#0D0010;border:2px solid #FFD700;color:#FFD700;font-family:\'Courier New\',monospace;font-size:15px;padding:12px 28px;cursor:pointer;letter-spacing:1px;box-shadow:0 0 12px #FFD70044;transition:box-shadow 0.2s">' +
          '[ \uD83C\uDFB2 ROLL THE DIE ]' +
        '</button>' +
        '<button id="tut-safe-btn" style="background:#0D0010;border:1px solid #C0C0D066;color:#C0C0D066;font-family:\'Courier New\',monospace;font-size:12px;padding:12px 18px;cursor:pointer;letter-spacing:1px">' +
          '[ Choose 10 ]' +
        '</button>' +
      '</div>';

    await new Promise(resolve => {
      getEl('tut-roll-btn').addEventListener('click', () => resolve('roll'));
      getEl('tut-safe-btn').addEventListener('click', () => resolve('safe'));
    });

    // ── ANIMATE D20 ROLL (rigged) ──
    scene.innerHTML =
      '<div style="color:#FFD700;font-size:15px;font-family:\'Courier New\',monospace;letter-spacing:2px;margin-bottom:24px">[ ROLLING... ]</div>' +
      '<div id="tut-d20-num" style="font-size:72px;color:#FFD700;font-family:\'Courier New\',monospace;font-weight:bold;min-width:100px;text-align:center">\u2014</div>';

    const numEl = getEl('tut-d20-num');
    let spinCount = 0;
    const totalSpins = 20 + Math.floor(Math.random() * 10);

    await new Promise(resolve => {
      function spin() {
        spinCount++;
        numEl.textContent = Math.floor(Math.random() * 20) + 1;
        if (spinCount >= totalSpins) {
          numEl.textContent = riggedValue;
          numEl.style.color = '#FF4444';
          numEl.style.textShadow = '0 0 24px #FF4444';
          setTimeout(resolve, 1200);
          return;
        }
        const delay = spinCount > totalSpins - 8
          ? 50 + (spinCount - totalSpins + 8) * 90
          : 50;
        setTimeout(spin, delay);
      }
      spin();
    });

    // ── FAILURE RESULT ──
    await sleep(400);
    scene.innerHTML =
      '<div style="font-family:\'Courier New\',monospace;text-align:center;">' +
        '<div style="color:#FF4444;font-size:56px;font-weight:bold;margin-bottom:12px">' + riggedValue + '</div>' +
        '<div style="color:#FF4444;font-size:16px;letter-spacing:3px;margin-bottom:12px">[ SYNTHESIS FAILED ]</div>' +
        '<div style="color:#B8A9D0;font-size:12px;margin-bottom:24px">The base hero has been consumed instead of the sacrifice.</div>' +
        '<div id="tut-shay-fade" style="color:#FF4444;font-size:14px;letter-spacing:1px;opacity:0;transition:opacity 1.5s">' +
          "'" + escHtml(shay.name) + ' (' + shayStars + ")' has turned into light and disappeared." +
        '</div>' +
      '</div>';

    // Fade in Shay message
    await sleep(300);
    const fadeEl = getEl('tut-shay-fade');
    if (fadeEl) fadeEl.style.opacity = '1';
    await sleep(2500);
    await waitTap();

    // ── FAREWELL DIALOGUE ──
    scene.style.display = 'none';
    showPortrait();

    await showDialogue('Shay', 'So this is how it ends for me... What a twist of fate.');
    await showDialogue('Han', "Shay?! No \u2014 this can't be happening!");
    await showDialogue('Shay', "Don't be sad, Han. My strength... it flows into you now. I can feel it.");
    await showDialogue('Han', "I won't let this be for nothing. I promise.");
    await showDialogue('Shay', "You'd better not. Grow strong, Han Israt... Show them what a Novice can become.");
    await showDialogue('Iselle', "I'm sorry, Master... The roll was too low. When synthesis fails, the base hero is consumed instead of the sacrifice.");
    await showDialogue('Iselle', "But Shay's power wasn't lost. It lives on in Han now.");

    // ── UPDATE GAME STATE ──
    // Remove Shay from inventory
    const shayIdx = gameState.inventory.findIndex(h => h.id === shay.id);
    if (shayIdx !== -1) gameState.inventory.splice(shayIdx, 1);

    // Remove from party
    const partyIdx = gameState.party.indexOf(shay.id);
    if (partyIdx !== -1) gameState.party.splice(partyIdx, 1);

    // Han absorbs Shay's residual power
    han.exp += 15;

    // Tutorial completion reward (no mailbox — instant via applyReward)
    applyReward({ gems: 300, gold: 1000 });

    saveGame();
  }

  /* ── END TUTORIAL ─────────────────────────────── */
  function endTutorial() {
    hideDialogue();
    clearHighlights();
    var ol = getEl('tut-overlay');
    if (ol) ol.style.display = 'none';
    gameState.tutorialStep = -1;
    saveGame();
    if (typeof resetHubMain === 'function') resetHubMain();
    console.log('[Tutorial] Complete.');
  }

  /* ── CITY NAME PROMPT ─────────────────────────── */
  async function showCityNamePrompt() {
    var scene = getEl('tut-combat-scene');
    scene.style.cssText = 'display:flex;justify-content:center;align-items:center;' +
      'flex-direction:column;background:#0D0010;width:100%;min-height:320px;';
    scene.innerHTML =
      '<div style="font-family:\'Courier New\',monospace;text-align:center;padding:36px 44px;">' +
        '<div style="color:#FFFFFF;font-size:18px;letter-spacing:3px;margin-bottom:8px">[ NAME YOUR CITY ]</div>' +
        '<div style="color:#888899;font-size:11px;letter-spacing:1px;margin-bottom:24px">What shall this city be called?</div>' +
        '<input id="tut-city-input" maxlength="16" placeholder="City name\u2026"' +
          ' style="background:#12001A;border:2px solid #C0C0D0;color:#FFFFFF;' +
          'font-family:\'Courier New\',monospace;font-size:15px;padding:10px 16px;' +
          'width:200px;text-align:center;letter-spacing:2px;outline:none;"/>' +
        '<br><br>' +
        '<button id="tut-city-confirm"' +
          ' style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;' +
          'font-family:\'Courier New\',monospace;font-size:13px;padding:9px 28px;' +
          'cursor:pointer;letter-spacing:1px;margin-top:8px;">[ CONFIRM ]</button>' +
      '</div>';
    await new Promise(function (resolve) {
      document.getElementById('tut-city-confirm').addEventListener('click', function () {
        var raw  = (document.getElementById('tut-city-input').value || '').trim();
        var name = raw || 'Townia';
        if (gameState.city) gameState.city.name = name;
        saveGame();
        resolve();
      });
    });
    scene.style.display = 'none';
  }

  /* ── CAMERA SHAKE ─────────────────────────────── */
  async function doShake() {
    var ol = getEl('tut-overlay');
    if (!ol) return;
    var offsets = [[-6,3],[6,-3],[-4,5],[4,-2],[-3,4],[0,0]];
    ol.style.transition = 'transform 0.08s ease';
    for (var i = 0; i < offsets.length; i++) {
      ol.style.transform = 'translate(' + offsets[i][0] + 'px,' + offsets[i][1] + 'px)';
      await sleep(80);
    }
    ol.style.transform  = '';
    ol.style.transition = '';
  }

  /* ── ACTION PROMPT (Potion / Bread / View) ────── */
  async function _showActionPrompt(label, reward, hint) {
    var scene = getEl('tut-combat-scene');
    scene.style.cssText = 'display:flex;justify-content:center;align-items:center;' +
      'flex-direction:column;background:#0D0010;width:100%;min-height:200px;gap:12px;';
    scene.innerHTML =
      '<button id="tut-action-btn"' +
        ' style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;' +
        'font-family:\'Courier New\',monospace;font-size:14px;padding:12px 32px;' +
        'cursor:pointer;letter-spacing:2px;box-shadow:0 0 12px rgba(123,47,190,0.5);">' +
        escHtml(label) +
      '</button>';
    await new Promise(function (resolve) {
      document.getElementById('tut-action-btn').addEventListener('click', function () {
        if (reward) {
          applyReward(reward);
        }
        resolve();
      });
    });
    if (hint) {
      scene.innerHTML =
        '<div id="tut-hint-panel" style="background:#12001A;border:1px solid #C0C0D0;padding:20px 28px;' +
          'max-width:420px;font-family:\'Courier New\',monospace;cursor:pointer;">' +
          '<div style="color:#E8D5FF;font-size:12px;line-height:1.8;letter-spacing:1px">' + escHtml(hint) + '</div>' +
          '<div style="color:#888899;font-size:11px;margin-top:16px;text-align:center;animation:blink 1s step-end infinite;">[ Tap to close ]</div>' +
        '</div>';
      await new Promise(function (resolve) {
        document.getElementById('tut-hint-panel').addEventListener('click', resolve, { once: true });
      });
    }
    scene.style.display = 'none';
  }

  /* ── SPIRE BUILT ──────────────────────────────── */
  async function _showSpireBuilt(reward) {
    var scene = getEl('tut-combat-scene');
    scene.style.cssText = 'display:flex;justify-content:center;align-items:center;' +
      'flex-direction:column;background:#0D0010;width:100%;min-height:280px;';
    var goldLine = (reward && reward.gold)
      ? '<div style="color:#F1C40F;font-size:13px;letter-spacing:1px;margin:12px 0">\uD83E\uDE99 ' + reward.gold + ' Gold</div>'
      : '';
    scene.innerHTML =
      '<div style="font-family:\'Courier New\',monospace;text-align:center;padding:32px 40px;">' +
        '<div style="color:#4CAF50;font-size:15px;letter-spacing:3px;margin-bottom:8px">[ MYSTIC SPIRE BUILT ]</div>' +
        '<div style="color:#E8D5FF;font-size:11px;letter-spacing:2px;margin-bottom:16px">&lt; New Building &gt; Bakery</div>' +
        goldLine +
        '<div id="tut-gold-info-btn" style="color:#C0C0D066;font-size:10px;letter-spacing:1px;cursor:pointer;' +
          'margin-top:8px;border-bottom:1px dashed #C0C0D044;display:inline-block">(i) Gold</div>' +
        '<div id="tut-gold-tip" style="display:none;color:#888899;font-size:11px;max-width:340px;' +
          'text-align:left;margin-top:12px;line-height:1.8;">' +
          'During the invasion, Townia experienced a severe resource sabotage. ' +
          'Yet the Princess sacrificed her blood to the Goddess, and produced these.' +
        '</div>' +
        '<div style="color:#888899;font-size:11px;margin-top:20px;animation:blink 1s step-end infinite;cursor:pointer">[ Tap to close ]</div>' +
      '</div>';
    document.getElementById('tut-gold-info-btn').addEventListener('click', function () {
      var tip = document.getElementById('tut-gold-tip');
      if (tip) tip.style.display = tip.style.display === 'none' ? 'block' : 'none';
    });
    if (reward) {
      applyReward(reward);
    }
    if (gameState.city && gameState.city.buildings) {
      gameState.city.buildings.bakery.unlocked = true;
      saveGame();
    }
    await waitTap();
    scene.style.display = 'none';
  }

  /* ── BAKERY UNLOCK ────────────────────────────── */
  async function _showBakeryUnlock() {
    var scene = getEl('tut-combat-scene');
    scene.style.cssText = 'display:flex;justify-content:center;align-items:center;' +
      'flex-direction:column;background:#0D0010;width:100%;min-height:280px;';
    var gold      = gameState.gold || 0;
    var canAfford = gold >= 200;
    scene.innerHTML =
      '<div style="font-family:\'Courier New\',monospace;text-align:center;padding:32px 40px;min-width:280px;">' +
        '<div style="color:#FFFFFF;font-size:15px;letter-spacing:3px;margin-bottom:16px">[ BAKERY ]</div>' +
        '<div style="color:#888899;font-size:11px;letter-spacing:1px;margin-bottom:16px">\u2014 Resource Cost \u2014</div>' +
        '<div style="color:#F1C40F;font-size:13px;margin-bottom:20px">\uD83E\uDE99 ' + gold + ' / 200</div>' +
        '<button id="tut-bakery-btn"' +
          (canAfford ? '' : ' disabled') +
          ' style="background:#1A0025;border:2px solid ' + (canAfford ? '#F1C40F' : '#555566') + ';' +
          'color:' + (canAfford ? '#FFFFFF' : '#555566') + ';' +
          'font-family:\'Courier New\',monospace;font-size:13px;padding:9px 28px;' +
          'cursor:' + (canAfford ? 'pointer' : 'default') + ';letter-spacing:1px;">[ UNLOCK ]</button>' +
      '</div>';
    await new Promise(function (resolve) {
      var btn = document.getElementById('tut-bakery-btn');
      if (!btn || !canAfford) {
        if (!gameState.lastBreadTime) {
          gameState.lastBreadTime = Date.now();
          saveGame();
          if (typeof showToast === 'function') {
            showToast('Not enough gold \u2014 bread production started with 0 inventory.', '#F1C40F');
          }
        }
        setTimeout(resolve, 1500);
        return;
      }
      btn.addEventListener('click', function () {
        gameState.gold = Math.max(0, (gameState.gold || 0) - 200);
        if (typeof updateGoldDisplay === 'function') updateGoldDisplay();
        var r = { wishes: 1, schematics: 40 };
        applyReward(r);
        gameState.lastBreadTime = Date.now();
        saveGame();
        resolve();
      });
    });
    scene.innerHTML =
      '<div id="tut-bakery-close" style="font-family:\'Courier New\',monospace;text-align:center;padding:32px 40px;min-width:280px;cursor:pointer;">' +
        '<div style="color:#4CAF50;font-size:13px;letter-spacing:2px;margin-bottom:16px">[ REPAIR REWARDS ]</div>' +
        '<div style="color:#E8D5FF;font-size:12px;line-height:2.2;text-align:left;display:inline-block">' +
          '1. \uD83C\uDF1F One Wish \u2014 Recruit heroes at the Summoning Station.<br>' +
          '2. \uD83C\uDF5E Bread Production \u2014 1 unit per 8 minutes.<br>' +
          '3. \uD83D\uDD29 40 Building Schematics.' +
        '</div>' +
        '<div style="color:#888899;font-size:11px;margin-top:20px;animation:blink 1s step-end infinite;">[ Tap to close ]</div>' +
      '</div>';
    await new Promise(function (resolve) {
      document.getElementById('tut-bakery-close').addEventListener('click', resolve, { once: true });
    });
    scene.style.display = 'none';
  }

  /* ── MAIN RUN FUNCTION ───────────────────────── */
  async function runTutorial() {
    var overlay = getEl('tut-overlay');
    overlay.style.display = 'block';

    await loadIselleSprite();
    addStarterHero();

    // ── CRITICAL GAP 3: Pre-grant 15 BD (idempotent across page reloads) ─
    // Uses both gameState flag (session) and localStorage key (cross-reload)
    // because tutorialSchematicsGranted is not in saveGame() field list.
    var _TUT_BD_KEY = 'pickmeup_tut_bd_granted';
    if (!localStorage.getItem(_TUT_BD_KEY) && !gameState.tutorialSchematicsGranted) {
      gameState.schematics = (gameState.schematics || 0) + 15;
      gameState.tutorialSchematicsGranted = true;
      localStorage.setItem(_TUT_BD_KEY, '1');
      saveGame();
    }

    // ── CRITICAL GAP 4: Bounds check + resume support ─────────────────────
    //
    //   runTutorial entry
    //        │
    //        ▼
    //   startStep = max(0, saved tutorialStep)
    //        │
    //        ▼
    //   startStep >= STEPS.length? ──YES──▶ endTutorial()   ← OOB guard
    //        │
    //       NO
    //        ▼
    //   ┌──────────── step loop ───────────────────────────────────────────┐
    //   │  OOB guard → save step → resolve text fn → dispatch type        │
    //   │  stepIndex++ ──▶ next iteration                                 │
    //   └─────────────────────────────────────────────────────────────────┘
    //        │ (exits on 'end' type or stepIndex >= STEPS.length)
    //        ▼
    //   endTutorial()
    //
    var startStep = (typeof gameState.tutorialStep === 'number' && gameState.tutorialStep > 0)
      ? gameState.tutorialStep : 0;

    if (startStep >= STEPS.length) { endTutorial(); return; }   // OOB guard

    for (stepIndex = startStep; stepIndex < STEPS.length; stepIndex++) {
      if (stepIndex >= STEPS.length) { break; }   // belt-and-suspenders

      var s    = STEPS[stepIndex];
      var text = typeof s.text === 'function' ? s.text() : (s.text || '');
      gameState.tutorialStep = stepIndex;
      saveGame();

      if (s.type === 'narration' || s.type === 'narrationDynamic') {
        await showDialogue(s.speaker, text);
      }
      else if (s.type === 'cameraShake') {
        hideDialogue();
        await doShake();
      }
      else if (s.type === 'cutscene') {
        hideDialogue();
        await showBlackScreen(text);
      }
      else if (s.type === 'guide') {
        await showDialogue(s.speaker, text);
        hideDialogue();
        overlay.style.display = 'none';
        highlightButton(s.target);
        await waitForNav(s.navWait);
        overlay.style.display = 'block';
      }
      else if (s.type === 'actionPrompt') {
        hideDialogue();
        await _showActionPrompt(s.label, s.reward, s.rewardHint);
      }
      else if (s.type === 'combat') {
        hideDialogue();
        await runCombatCutscene();
      }
      else if (s.type === 'spireBuilt') {
        hideDialogue();
        await _showSpireBuilt(s.reward);
      }
      else if (s.type === 'cityName') {
        hideDialogue();
        await showCityNamePrompt();
      }
      else if (s.type === 'bakeryUnlock') {
        hideDialogue();
        await _showBakeryUnlock();
      }
      else if (s.type === 'tutorialSummon') {
        hideDialogue();
        overlay.style.display = 'none';
        await sleep(400);
        var pullBtn = document.getElementById('pull-1x-btn');
        if (pullBtn) pullBtn.classList.add('tut-highlight');
        await waitForPull();
        if (pullBtn) pullBtn.classList.remove('tut-highlight');
        overlay.style.display = 'block';
      }
      else if (s.type === 'waitForShay') {
        hideDialogue();
        overlay.style.display = 'none';
        await waitForShayInParty();
        overlay.style.display = 'block';
      }
      else if (s.type === 'end') {
        break;
      }
    }

    endTutorial();
  }

  /* ── STARTER HERO ─────────────────────────────── */
  function addStarterHero() {
    const han = {
      id: 'starter_han_' + Date.now(),
      type: 'hero',
      name: 'Han Israt',
      rarity: 1,
      class: 'Novice',
      level: 1,
      exp: 0,
      talent: 1.2,
      stats: {
        strength: 8, intelligence: 8, health: 8, agility: 8,
        critRate: 3.8, critDamage: 129.6, reactionTime: 0.92,
      },
      equippedWeapon: null,
      inParty: false,
      skills: [],
      isNew: true,
      isCommoner: true,
      isStarter: true,
      spriteId: null,
    };

    // Only add if not already present
    if (!gameState.inventory.find(h => h.isStarter)) {
      gameState.inventory.push(han);
      gameState.party.push(han.id);
      saveGame();

      // Fire async sprite generation for Han
      if (typeof SpriteGen !== 'undefined') {
        SpriteGen.generateHeroSprite(han).then(function (data) {
          han.spriteId = data.spriteId;
          saveGame();
          console.log('[Tutorial] Han sprite generated:', data.spriteId);
        }).catch(function () { /* sprite server not running */ });
      }
    }
  }

  /* ── REGISTER ─────────────────────────────────── */
  function registerSceneTutorial() {
    // Will be called from main.js
  }

  window.runTutorial           = runTutorial;
  window.endTutorial           = endTutorial;
  window.showCityNamePrompt    = showCityNamePrompt;
  // isNewbie: true while tutorial is in progress (tutorialStep !== -1)
  // clearNewbieTag: called from recordFloorClear() when Tower floor 1 clears
  window.isNewbie              = function () { return gameState.tutorialStep !== -1; };
  window.clearNewbieTag        = function () {
    if (gameState.tutorialStep !== -1) { gameState.tutorialStep = -1; saveGame(); }
  };
  window.registerSceneTutorial = registerSceneTutorial;
})();
