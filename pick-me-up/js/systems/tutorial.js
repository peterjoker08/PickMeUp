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
    return new Promise(resolve => {
      const overlay = getEl('tut-overlay');
      function handler() { overlay.removeEventListener('click', handler); resolve(); }
      overlay.addEventListener('click', handler);
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

    // Send tutorial reward mail
    if (typeof sendMail === 'function') {
      sendMail({
        from: 'Iselle',
        subject: 'Tutorial Battle Reward',
        body: 'Congratulations on completing your first battle, Master! Here is a small gift to help you on your journey.',
        rewards: { gems: 50, gold: 200, items: [{ id: 'fear_prevention_potion', name: 'Fear Prevention Potion', count: 1 }] },
      });
    }

    await showDialogue('SYSTEM', "A reward has been sent to your mailbox.", { autoMs: 2000 });

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

    if (typeof sendMail === 'function') {
      sendMail({
        from: 'Iselle',
        subject: 'Tutorial Quest 2 Reward',
        body: 'Well done, Master! Your party fought bravely against the goblin horde. Here are your rewards.',
        rewards: { gems: 80, gold: 500, items: [] },
      });
    }

    await showDialogue('SYSTEM', "Rewards have been granted. Please check your mailbox.", { autoMs: 2000 });
    await showDialogue('SYSTEM', "MVP \u2013 'Shay (\u2605\u2605\u2605\u2605)'", { autoMs: 2000 });

    scene.style.display = 'none';
  }

  /* ── TUTORIAL STEP SCRIPT ─────────────────────── */
  const STEPS = [
    // -- PROLOGUE NARRATION (BLACK SCREEN CUTSCENE PLACEHOLDER) --
    { type: 'blackScreen', text: '[ Animated Cutscene — Coming Soon ]' },
    { type: 'narration', speaker: 'SYSTEM', text: 'In a small village in the Heim region, there was a boy named \'Han Israt.\'' },
    { type: 'narration', speaker: 'SYSTEM', text: 'The land of harmony between humans and nonhumans \u2014 Townia.' },
    { type: 'narration', speaker: 'SYSTEM', text: 'An unknown enemy has invaded the continent of peace.' },
    { type: 'narration', speaker: 'Iselle', text: 'You, Master! If you wish to save the world... Climb the tower!' },
    { type: 'narration', speaker: 'Iselle', text: 'A myriad of heroes will be there with you.' },

    // -- TUTORIAL QUEST 1: COMBAT --
    { type: 'narration', speaker: 'SYSTEM', text: 'Tutorial Quest 1: Defeat the skeleton invading the village!' },
    { type: 'narration', speaker: 'Iselle', text: 'The battle will proceed automatically. Enjoy high-level combat implemented by the hero\'s internal AI!' },
    { type: 'combat' },

    // -- POST-COMBAT: GUIDE TO SUMMON --
    { type: 'narration', speaker: 'Iselle', text: 'Master, should we summon a companion before proceeding to the next stage?' },
    {
      type: 'guide',
      speaker: 'Iselle',
      text: 'Please touch the \'Summon\' tab in the menu! As a special service for beginners, you\'ll receive gems for a guaranteed summon!',
      target: '[data-nav="Summon"]',
      navWait: 'Summon',
      reward: { gems: 150 },
    },
    { type: 'narration', speaker: 'Iselle', text: 'Your first summon is guaranteed to give you a powerful ally! Press the ×1 button to summon.' },
    { type: 'tutorialSummon' },

    // -- POST-SUMMON: CHECK HEROES --
    { type: 'narration', speaker: 'SYSTEM', text: "Master, you're lucky! Check the hero you summoned. Please touch the 'Knights' tab in the menu." },
    {
      type: 'guide',
      speaker: 'SYSTEM',
      text: "Please touch the 'Knights' tab to view your heroes.",
      target: '[data-nav="Knights"]',
      navWait: 'Knights',
    },

    // -- LOBBY SCENE: HAN MEETS SHAY --
    { type: 'narration', speaker: 'Han', text: '...So there are other heroes here too?' },
    { type: 'narration', speaker: 'Shay', text: "That's right. My name is Shay Radasterry \u2014 a Knight. I've been summoned by the Master." },
    { type: 'narration', speaker: 'Han', text: "I'm Han... just a villager from the Heim region. I can barely hold a sword." },
    { type: 'narration', speaker: 'Shay', text: "A villager? Don't sell yourself short. Every great knight started as someone ordinary." },
    { type: 'narration', speaker: 'Han', text: 'Really? Even you?' },
    { type: 'narration', speaker: 'Shay', text: "Well... no. I was born into a knight family. But that's beside the point! Let's fight together." },

    // -- PARTY FORMATION: Wait for Master to add Shay --
    { type: 'narration', speaker: 'SYSTEM', text: 'Would you like to form a party with the summoned heroes? Add Shay to your party to proceed!' },
    { type: 'waitForShay', speaker: 'SYSTEM', text: 'Select the [ PARTY ] tab above, then tap an empty slot to add Shay Radasterry to your party.' },

    // -- SECOND COMBAT --
    { type: 'narration', speaker: 'Iselle', text: "If you have formed a party, let's go into battle!" },
    { type: 'narration', speaker: 'SYSTEM', text: 'Tutorial Quest 2: Defend the village from the goblin horde!' },
    { type: 'narration', speaker: 'Iselle', text: 'This time both heroes will fight together. Watch the difference in power between a 1-star and a 4-star!' },
    { type: 'secondCombat' },

    // -- POST-COMBAT REFLECTIONS --
    { type: 'narration', speaker: 'Iselle', text: 'Incredible! Did you see the difference, Master? A 4-star hero is far more powerful than a 1-star commoner.' },
    { type: 'narration', speaker: 'Iselle', text: "But don't worry \u2014 every hero can grow stronger through training, promotion, and synthesis." },

    // -- SYNTHESIS TUTORIAL --
    { type: 'narration', speaker: 'SYSTEM', text: 'Master, your heroes did an excellent job in the battle. The final tutorial awaits. The method of strengthening heroes, Synthesis! The door will open!' },
    {
      type: 'guide',
      speaker: 'SYSTEM',
      text: "Touch the 'Synthesis' tab in the menu.",
      target: '[data-nav="Synthesis"]',
      navWait: 'Synthesis',
    },
    { type: 'narration', speaker: 'SYSTEM', text: 'Drag and drop the hero you want to synthesize onto the hero you want to offer as a sacrifice. You can gain experience points. The sacrificed hero will disappear.' },
    { type: 'tutorialSynthesis' },

    // -- TUTORIAL CLOSING --
    { type: 'narration', speaker: 'SYSTEM', text: 'This is how heroes become stronger through synthesis.' },
    { type: 'narration', speaker: 'SYSTEM', text: "Master, believe in your bond with the hero. The future of the world is in the Master\u2019s hands!" },
    { type: 'narration', speaker: 'SYSTEM', text: 'The tutorial has ended.' },
    { type: 'narration', speaker: 'Iselle', text: "Tips from Iselle will always help you. Don\u2019t miss out on the valuable information to become a powerful Master!" },
    { type: 'narration', speaker: 'SYSTEM', text: 'For more detailed strategies, please check the official forum.' },
    { type: 'narration', speaker: 'SYSTEM', text: 'You will receive rewards. Please always check your mailbox.' },
    { type: 'narration', speaker: 'SYSTEM', text: 'Welcome to the world of Pick Me Up!' },
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
      '<div style="color:#B8A9D088;font-size:11px;margin-top:16px;font-family:\'Courier New\',monospace">[ Tap to continue ]</div>';
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
      '<div style="color:#B8A9D088;font-size:11px;margin-top:20px;font-family:\'Courier New\',monospace">[ Tap to continue ]</div>';
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

    // Send tutorial completion mail
    if (typeof sendMail === 'function') {
      sendMail({
        from: 'Tutorial Guide',
        subject: 'Tutorial Complete \u2014 Welcome to Pick Me Up!',
        body: 'Congratulations on completing the tutorial, Master! The world awaits. Here are your welcome rewards.',
        rewards: { gems: 300, gold: 1000 },
      });
    }

    saveGame();
  }

  /* ── MAIN RUN FUNCTION ───────────────────────── */
  async function runTutorial() {
    const overlay = getEl('tut-overlay');
    overlay.style.display = 'block';

    // Preload Iselle portrait sprite
    await loadIselleSprite();

    // Give starter hero Han
    addStarterHero();

    for (stepIndex = 0; stepIndex < STEPS.length; stepIndex++) {
      const step = STEPS[stepIndex];
      gameState.tutorialStep = stepIndex;

      if (step.type === 'narration') {
        await showDialogue(step.speaker, step.text);
      }
      else if (step.type === 'blackScreen') {
        hideDialogue();
        await showBlackScreen(step.text);
      }
      else if (step.type === 'combat') {
        hideDialogue();
        await runCombatCutscene();
      }
      else if (step.type === 'guide') {
        // Apply reward
        if (step.reward) {
          if (step.reward.gems) gameState.gems += step.reward.gems;
          saveGame();
          updateGemsDisplay();
        }

        await showDialogue(step.speaker, step.text);
        hideDialogue();

        // Now show hub and highlight the button
        overlay.style.display = 'none';
        highlightButton(step.target);
        await waitForNav(step.navWait);
        overlay.style.display = 'block';
      }
      else if (step.type === 'tutorialSummon') {
        hideDialogue();
        overlay.style.display = 'none';
        // Highlight the 1x pull button (guaranteed summon)
        await sleep(400);
        var pullBtn = document.getElementById('pull-1x-btn');
        if (pullBtn) pullBtn.classList.add('tut-highlight');
        await waitForPull();
        if (pullBtn) pullBtn.classList.remove('tut-highlight');
        overlay.style.display = 'block';
      }
      else if (step.type === 'partyFormation') {
        await showDialogue(step.speaker, step.text);
        hideDialogue();
        overlay.style.display = 'none';
        await waitForPartySize(step.minSize || 2);
        overlay.style.display = 'block';
      }
      else if (step.type === 'waitForShay') {
        await showDialogue(step.speaker, step.text);
        hideDialogue();
        overlay.style.display = 'none';
        await waitForShayInParty();
        overlay.style.display = 'block';
      }
      else if (step.type === 'secondCombat') {
        hideDialogue();
        await runSecondCombat();
      }
      else if (step.type === 'tutorialSynthesis') {
        hideDialogue();
        await runSynthesisTutorial();
      }
      else if (step.type === 'end') {
        break;
      }
    }

    // Cleanup
    hideDialogue();
    clearHighlights();
    overlay.style.display = 'none';
    gameState.tutorialStep = -1;  // completed
    saveGame();

    // Return to lobby
    if (typeof resetHubMain === 'function') resetHubMain();
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
  window.registerSceneTutorial = registerSceneTutorial;
})();
