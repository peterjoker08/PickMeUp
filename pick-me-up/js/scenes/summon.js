// ═══════════════════════════════════════════════════════════
// GACHA ENGINE + SUMMON SCENE
// ═══════════════════════════════════════════════════════════

const BASE_RATES = [30, 25, 22, 15, 6, 1.5, 0.5]; // index 0 = 1★

const BANNER_DATA = {
  standard: { title: 'Standard Summon',           subtitle: 'A world full of heroes awaits.',  featuredUnit: null },
  limited:  { title: 'Limited: Shay Lathasterie', subtitle: 'The Silver Knight descends.',     featuredUnit: { name: 'Shay Lathasterie', rarity: 5, class: 'Knight' } },
  weapon:   { title: 'Weapon Summon',              subtitle: 'Forge your legend.',              featuredUnit: null },
};

const RARITY_COLORS = {
  1: '#888888', 2: '#BBBBBB', 3: '#4488FF',
  4: '#BB44FF', 5: '#FFD700', 6: '#FFA500', 7: '#FF6020'
};
const RARITY_FLASH = {
  1: 'rgba(180,180,180,0.28)', 2: 'rgba(220,220,220,0.33)',
  3: 'rgba(68,136,255,0.50)',  4: 'rgba(160,60,255,0.50)',
  5: 'rgba(255,210,0,0.62)',   6: 'rgba(255,160,0,0.72)',
  7: 'rgba(255,255,255,0.92)'
};
const RARITY_CARD_BG = {
  1: '#1A1A2E', 2: '#1C221C', 3: '#0B1840',
  4: '#1A0D33', 5: '#291800', 6: '#200E00', 7: '#180000'
};

// Rarity border colors for hero roster cards — now in js/ui/helpers.js
// RARITY_BORDER, talentColor, talentTierLabel live there.

// Base stats at level 1, indexed by rarity
const BASE_STATS = {
  1: { str:  8, int:  8, hp:  8, agi:  8 },
  2: { str: 12, int: 12, hp: 12, agi: 12 },
  3: { str: 18, int: 18, hp: 18, agi: 18 },
  4: { str: 26, int: 26, hp: 26, agi: 26 },
  5: { str: 36, int: 36, hp: 36, agi: 36 },
  6: { str: 50, int: 50, hp: 50, agi: 50 },
  7: { str: 70, int: 70, hp: 70, agi: 70 },
};

// Talent generation ranges per rarity: [{ p, min, max }, ...]
const TALENT_RANGES = {
  1: [{p:0.70,min:0.0,max:2.0},{p:0.28,min:2.1,max:4.0}, {p:0.02,min:4.1,max:10.0}],
  2: [{p:0.65,min:0.0,max:2.0},{p:0.30,min:2.1,max:4.0}, {p:0.05,min:4.1,max:10.0}],
  3: [{p:0.55,min:0.0,max:2.0},{p:0.35,min:2.1,max:4.0}, {p:0.10,min:4.1,max:10.0}],
  4: [{p:0.45,min:0.0,max:2.0},{p:0.35,min:2.1,max:5.0}, {p:0.20,min:5.1,max:10.0}],
  5: [{p:0.30,min:0.0,max:2.0},{p:0.35,min:2.1,max:6.0}, {p:0.35,min:6.1,max:10.0}],
  6: [{p:0.20,min:0.0,max:2.0},{p:0.30,min:2.1,max:7.0}, {p:0.50,min:7.1,max:10.0}],
  7: [{p:0.10,min:0.0,max:2.0},{p:0.20,min:2.1,max:7.0}, {p:0.70,min:7.1,max:10.0}],
};

const HERO_CLASSES = ['Knight','Mage','Rogue','Archer','Healer','Berserker','Summoner'];

// 1★ heroes are commoners — random villagers with almost no combat skill.
// Rare chance (~5%) they have prior weapon experience (gets a class instead).
const COMMONER_CLASSES = ['Villager','Chef','Maid','Farmer','Merchant','Blacksmith','Herbalist','Tailor','Bard','Stable Hand'];

const WEAPON_TYPES = ['Sword','Staff','Dagger','Bow','Axe','Spear','Tome'];
const pullCounters = {};

let activeBanner   = 'standard';
let pendingResults = [];

// ─── TUTORIAL GUARANTEED HERO ─────────────────────────────
function createShayHero() {
  var uid = 'shay_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  var weaponProf = typeof _initProficiency === 'function' ? _initProficiency() : {};
  var hero = {
    id: uid, type: 'hero', name: 'Shay Radasterry', rarity: 4, class: 'Knight',
    level: 1, exp: 0, talent: generateTalent(4),
    stats: {
      strength: 18, intelligence: 10, health: 160, agility: 20,
      critRate: 5.0, critDamage: 140.0, reactionTime: 0.82,
    },
    equippedWeapons: { mainHand: null, offHand: null },
    inParty: false, inDungeon: false,
    skills: [
      { name: 'Tactical Combat', level: 1 },
      { name: 'Intermediate Swordsmanship', level: 1 },
      { name: "Knight's Resolve", level: 1 },
    ],
    isNew: true, isCommoner: false, isTutorialHero: true,
    weaponProficiency: weaponProf,
    activePenalty: null,
    statusEffects: [],
    spriteId: null,
  };
  if (typeof applyInnateProf === 'function') applyInnateProf(hero);
  return hero;
}

// ─── TALENT HELPERS ───────────────────────────────────────
function generateTalent(rarity) {
  const tiers = TALENT_RANGES[rarity] || TALENT_RANGES[1];
  const rand  = Math.random();
  let cum = 0;
  for (const t of tiers) {
    cum += t.p;
    if (rand < cum) return Math.round((t.min + Math.random() * (t.max - t.min)) * 10) / 10;
  }
  return 0.0;
}

function buildHeroStats(rarity, talent) {
  const b = BASE_STATS[rarity] || BASE_STATS[1];
  return {
    strength:     b.str,
    intelligence: b.int,
    health:       b.hp,
    agility:      b.agi,
    critRate:     Math.round((2 + talent * 1.5) * 10) / 10,
    critDamage:   Math.round((120 + talent * 8)  * 10) / 10,
    reactionTime: Math.round((1.0 - talent * 0.07) * 100) / 100,
  };
}

// talentColor / talentTierLabel — now in js/ui/helpers.js


// ─── GACHA ENGINE ─────────────────────────────────────────
function getCeiling(floor) {
  if (floor < 5)   return 2;    // early game: 1★–2★ only
  if (floor <= 10) return 4;
  if (floor <= 30) return 5;
  if (floor <= 50) return 6;
  return 7;
}

/**
 * Compute adjusted rates for a given floor + banner type.
 * Returns an array of 7 percentages summing to ~100.
 *
 * Early-game (floor < 5):
 *   2★ = 5.1%, 3★ = 0.6% (3★ gets zeroed by ceiling cap but kept in base)
 *   Remaining goes to 1★ (~94.3%)
 */
function computeRates(floor, bannerKey) {
  let r;

  // Early-game override: floors 1–4 have fixed beginner rates
  if (floor < 5) {
    r = [94.3, 5.1, 0.6, 0, 0, 0, 0];
  } else {
    r = [...BASE_RATES];
  }

  // Weapon banner: +1% each for 5/6/7★, taken from 1/2/3★ proportionally
  if (bannerKey === 'weapon' && floor >= 5) {
    const bonus    = 3;
    const lowerSum = r[0] + r[1] + r[2];
    for (let i = 0; i < 3; i++) r[i] -= bonus * (r[i] / lowerSum);
    r[4] += 1; r[5] += 1; r[6] += 1;
  }

  const ceiling = getCeiling(floor);

  // Zero out above ceiling; collect excess
  let pool = 0;
  for (let i = ceiling; i < 7; i++) { pool += r[i]; r[i] = 0; }

  // Apply soft-floor caps for 1★/2★ on high floors; collect excess
  const caps = [Infinity, Infinity, Infinity, Infinity, Infinity, Infinity, Infinity];
  if (floor >= 31 && floor <= 50) { caps[0] = 3; caps[1] = 3; }
  if (floor >= 51)                { caps[0] = 1; caps[1] = 1; }

  for (let i = 0; i < ceiling; i++) {
    if (r[i] > caps[i]) { pool += r[i] - caps[i]; r[i] = caps[i]; }
  }

  // Redistribute pool proportionally to uncapped, non-zero tiers below ceiling
  if (pool > 0) {
    let eligSum = 0;
    for (let i = 0; i < ceiling; i++) if (r[i] > 0 && r[i] < caps[i]) eligSum += r[i];
    if (eligSum > 0) {
      for (let i = 0; i < ceiling; i++) {
        if (r[i] > 0 && r[i] < caps[i]) r[i] += pool * (r[i] / eligSum);
      }
    }
  }

  return r;
}

/**
 * Apply pity modifier to rates array.
 * Mutates a copy. Soft pity: +3% to ceiling rarity per pull ≥45.
 * Hard pity at pull 60 → 100% ceiling.
 */
function applyPity(rates, pityCount, ceiling) {
  const r    = [...rates];
  const cidx = ceiling - 1;

  if (pityCount >= 60) {
    const out = Array(7).fill(0);
    out[cidx] = 100;
    return out;
  }
  if (pityCount >= 45) {
    const bonus    = Math.min((pityCount - 44) * 3, 100 - r[cidx]);
    const lowerSum = r.slice(0, cidx).reduce((a, b) => a + b, 0);
    if (lowerSum > 0) {
      for (let i = 0; i < cidx; i++) r[i] = Math.max(0, r[i] - bonus * (r[i] / lowerSum));
    }
    r[cidx] = Math.min(100, r[cidx] + bonus);
  }
  return r;
}

function rollRarity(rates) {
  let rand = Math.random() * 100, cum = 0;
  for (let i = 0; i < rates.length; i++) {
    cum += rates[i];
    if (rand < cum) return i + 1;
  }
  return 1;
}

function generateResult(bannerKey, rarity) {
  const key = `${bannerKey}_${rarity}`;
  pullCounters[key] = (pullCounters[key] || 0) + 1;
  const num = String(pullCounters[key]).padStart(3, '0');
  const uid = `${bannerKey}_${rarity}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  if (bannerKey === 'weapon') {
    const wt = WEAPON_TYPES[Math.floor(Math.random() * WEAPON_TYPES.length)];
    return { id: uid, type: 'weapon', name: `Weapon_${rarity}★_${num}`, rarity, weaponType: wt, isNew: true };
  }

  // 1★ heroes: 80% Novice (blank slate), 15% commoner class, 5% rare real class.
  let cls;
  if (rarity === 1) {
    const roll = Math.random();
    if (roll < 0.05) {
      cls = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)];   // rare prior experience
    } else if (roll < 0.20) {
      cls = COMMONER_CLASSES[Math.floor(Math.random() * COMMONER_CLASSES.length)];
    } else {
      cls = 'Novice';  // blank slate — good at nothing, bad at nothing
    }
  } else {
    cls = HERO_CLASSES[Math.floor(Math.random() * HERO_CLASSES.length)];
  }

  const floor   = gameState.currentFloor;
  const ceiling = getCeiling(floor);
  let name      = `Hero_${rarity}★_${num}`;

  // Limited 50/50
  if (bannerKey === 'limited' && rarity === ceiling) {
    const fu = BANNER_DATA.limited.featuredUnit;
    if (fu && Math.random() < 0.5) name = fu.name;
  }

  const talent = generateTalent(rarity);
  const stats  = buildHeroStats(rarity, talent);

  // 1★ heroes are summoned WITHOUT a weapon; higher rarities get null too
  // (weapons come from weapon banner or drops), but we mark commoner origin
  const weaponProf = typeof _initProficiency === 'function' ? _initProficiency() : {};
  const hero = {
    id: uid, type: 'hero', name, rarity, class: cls,
    level: 1, exp: 0, talent, stats,
    equippedWeapons: { mainHand: null, offHand: null },
    inParty: false, inDungeon: false,
    skills: [], isNew: true,
    isCommoner: rarity === 1,
    weaponProficiency: weaponProf,
    activePenalty: null,
    statusEffects: [],
    spriteId: null,  // filled async by sprite server
  };
  if (typeof applyInnateProf === 'function') applyInnateProf(hero);
  return hero;
}

function performPull(bannerKey, count) {
  const floor   = gameState.currentFloor;
  const ceiling = getCeiling(floor);
  const bState  = gameState.banners[bannerKey];
  const results = [];

  for (let i = 0; i < count; i++) {
    bState.pityCount++;
    const baseRates = computeRates(floor, bannerKey);
    const adjRates  = applyPity(baseRates, bState.pityCount, ceiling);
    let rarity      = rollRarity(adjRates);

    // Hard pity override
    if (bState.pityCount >= 60) rarity = ceiling;

    // Reset pity on ceiling hit
    if (rarity === ceiling) bState.pityCount = 0;

    results.push(generateResult(bannerKey, rarity));
  }

  // Tutorial first summon: guaranteed 4★ Shay Radasterry (single pull)
  if (!gameState.firstPullDone) {
    gameState.firstPullDone = true;
    results[0] = createShayHero();
  }

  saveGame();
  return results;
}

// ─── SUMMON SCENE UI ──────────────────────────────────────
function showSummonScene() {
  const main = document.getElementById('hub-main');
  main.className = 'hub-main--list';
  main.innerHTML = `
    <div id="summon-scene" style="width:100%;padding:28px 36px">
      <div id="summon-tabs" style="display:flex;border-bottom:2px solid #C0C0D0;margin-bottom:28px">
        <button class="summon-tab" data-banner="standard">[ Standard ]</button>
        <button class="summon-tab" data-banner="limited">[ Limited ]</button>
        <button class="summon-tab" data-banner="weapon">[ Weapon ]</button>
      </div>
      <div id="summon-content"></div>
    </div>`;

  document.querySelectorAll('.summon-tab').forEach(t => {
    t.addEventListener('click', () => { activeBanner = t.dataset.banner; refreshSummonContent(); });
  });

  refreshSummonContent();
}

function refreshSummonContent() {
  // Update active tab styles
  document.querySelectorAll('.summon-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.banner === activeBanner);
  });

  const floor    = gameState.currentFloor;
  const ceiling  = getCeiling(floor);
  const bData    = BANNER_DATA[activeBanner];
  const bState   = gameState.banners[activeBanner];
  const softPity = bState.pityCount >= 45;
  const pityCol  = softPity ? '#FFD700' : '#C0C0D0';
  const pityNote = softPity ? ' <span style="color:#FFD700;font-size:11px">(Soft Pity Active)</span>' : '';

  const featuredHTML = activeBanner === 'limited' && bData.featuredUnit
    ? `<div style="color:#C8C8E0;font-size:11px;margin-top:8px;border-top:1px solid #2A003A;padding-top:8px">
         Featured: <span style="color:#FFD700">${bData.featuredUnit.name}</span>
         &nbsp;·&nbsp; ${bData.featuredUnit.rarity}★ ${bData.featuredUnit.class}
         &nbsp;·&nbsp; 50% on highest rarity roll
       </div>` : '';

  // Tutorial first pull: guaranteed badge
  const guaranteedBadge = !gameState.firstPullDone
    ? ' <span style="color:#FFD700;font-size:10px">(GUARANTEED!)</span>'
    : '';

  document.getElementById('summon-content').innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:22px">

      <div style="background:#12001A;border:2px solid #C0C0D0;box-shadow:0 0 15px #7B2FBE;padding:26px;width:440px">
        <div style="color:#FFFFFF;font-size:17px;letter-spacing:2px;margin-bottom:6px">${bData.title}</div>
        <div style="color:#E8D5FF;font-size:12px;margin-bottom:18px">${bData.subtitle}</div>
        <div style="background:#080010;border:1px solid #2A003A;height:150px;display:flex;align-items:center;justify-content:center;margin-bottom:18px">
          <span style="color:#1A0025;font-size:14px;letter-spacing:3px">[ Banner Art ]</span>
        </div>
        <div style="color:${pityCol};font-size:13px">Pity: ${bState.pityCount} / 60${pityNote}</div>
        <div style="color:#888;font-size:11px;margin-top:4px">Floor bracket: ${floor<5?'1–4 (max 2★ · beginner)':floor<=10?'5–10 (max 4★)':floor<=30?'11–30 (max 5★)':floor<=50?'31–50 (max 6★)':'51–100 (all rarities)'}</div>
        ${featuredHTML}
      </div>

      <div style="display:flex;gap:16px">
        <button class="pull-btn" id="pull-1x-btn">[ SUMMON ×1 — 150 💎 ]${guaranteedBadge}</button>
        <button class="pull-btn" id="pull-10x-btn">[ SUMMON ×10 — 1500 💎 ]</button>
      </div>

      <div style="color:#C0C0D0;font-size:13px" id="summon-gems-display">Gems: ${gameState.gems}</div>
      <div id="pull-error-msg" style="color:#FF4444;font-size:12px;min-height:18px;letter-spacing:1px"></div>
    </div>`;

  document.getElementById('pull-1x-btn').addEventListener('click',  () => handlePull(1));
  document.getElementById('pull-10x-btn').addEventListener('click', () => handlePull(10));
}

function handlePull(count) {
  const cost  = count * 150;
  const errEl = document.getElementById('pull-error-msg');
  if (gameState.gems < cost) {
    if (errEl) { errEl.textContent = '[ Insufficient Gems ]'; setTimeout(() => { if (errEl) errEl.textContent = ''; }, 3000); }
    return;
  }
  gameState.gems -= cost;
  updateGemsDisplay();
  const gemDisp = document.getElementById('summon-gems-display');
  if (gemDisp) gemDisp.textContent = `Gems: ${gameState.gems}`;

  const results = performPull(activeBanner, count);

  // Run pull animation then show results
  runPullAnimation(results, function () {
    showResultsPanel(results);
  });
}

// ─── PULL ANIMATION ───────────────────────────────────────
function runPullAnimation(results, onComplete) {
  const overlay   = document.getElementById('pull-anim-overlay');
  const flash     = document.getElementById('pull-flash');
  const cardsArea = document.getElementById('pull-cards-area');
  const tapPrompt = document.getElementById('pull-tap-prompt');
  const shakeEl   = document.getElementById('pull-shake-container');

  cardsArea.innerHTML = '';
  tapPrompt.style.display = 'none';
  overlay.style.display        = 'flex';
  overlay.style.pointerEvents  = 'auto';
  overlay.style.zIndex         = '9999';

  requestAnimationFrame(() => requestAnimationFrame(() => {
    overlay.classList.add('visible');
    setTimeout(() => {
      if (results.length === 1) animSingle(results[0]);
      else                      animMulti(results);
    }, 300);
  }));

  function doFlash(rarity, cb) {
    flash.style.background = RARITY_FLASH[rarity];
    flash.style.opacity    = '1';
    setTimeout(() => { flash.style.opacity = '0'; setTimeout(cb, 140); }, 140);
  }

  function doShake(rarity) {
    if (rarity >= 6) { shakeEl.classList.add('shake-hard'); setTimeout(() => shakeEl.classList.remove('shake-hard'), 700); }
    else if (rarity >= 5) { shakeEl.classList.add('shake'); setTimeout(() => shakeEl.classList.remove('shake'), 500); }
  }

  function showTap(clickCb) {
    tapPrompt.style.display = 'block';
    const handler = () => { tapPrompt.removeEventListener('click', handler); clickCb(); };
    tapPrompt.addEventListener('click', handler);
  }

  function closeThenCallback() {
    tapPrompt.style.display     = 'none';
    overlay.style.pointerEvents = 'none';
    overlay.classList.remove('visible');
    setTimeout(() => { overlay.style.display = 'none'; onComplete(); }, 320);
  }

  function makeCard(result, single) {
    const card  = document.createElement('div');
    card.className = 'pull-card' + (single ? ' single' : '');
    const stars = '★'.repeat(result.rarity);
    const col   = RARITY_COLORS[result.rarity];
    const bg    = RARITY_CARD_BG[result.rarity];
    const sub   = result.type === 'weapon' ? result.weaponType : result.class;
    card.innerHTML = `
      <div class="pull-card-face pull-card-back">
        <div class="pull-card-back-symbol">✦</div>
      </div>
      <div class="pull-card-face pull-card-front" style="background:${bg};box-shadow:0 0 18px ${col}44">
        <div class="pull-card-stars" style="color:${col}">${stars}</div>
        <div class="pull-card-name">${result.name}</div>
        <div class="pull-card-sub" style="color:${col}">${sub}</div>
      </div>`;
    return card;
  }

  function animSingle(result) {
    const card = makeCard(result, true);
    cardsArea.appendChild(card);

    // Extended timing: energy buildup phase masks sprite generation latency
    // Higher rarity = longer anticipation
    const buildupMs = result.rarity >= 5 ? 2500 : result.rarity >= 3 ? 1800 : 1200;
    const holdMs    = result.rarity === 7 ? 1500 : result.rarity >= 5 ? 700 : 200;

    // Start with a slow pulsing glow on the card back
    card.style.transition = 'filter ' + (buildupMs / 1000) + 's ease-in';
    card.style.filter = 'brightness(1)';
    requestAnimationFrame(function () {
      card.style.filter = 'brightness(1.6) drop-shadow(0 0 20px ' + (RARITY_COLORS[result.rarity] || '#fff') + ')';
    });

    setTimeout(() => {
      card.style.filter = '';
      card.style.transition = '';
      doFlash(result.rarity, () => {
        doShake(result.rarity);
        setTimeout(() => {
          card.classList.add('flipped');
          setTimeout(() => showTap(closeThenCallback), 650);
        }, holdMs);
      });
    }, buildupMs);
  }

  function animMulti(results) {
    const cards = results.map(r => {
      const c = makeCard(r, false);
      cardsArea.appendChild(c);
      return c;
    });

    // Energy buildup before first card reveals
    const buildupMs = 1500;
    setTimeout(function () {
      let i = 0;
      function next() {
        if (i >= cards.length) { showTap(closeThenCallback); return; }
        const r    = results[i];
        const card = cards[i];
        const hold = r.rarity >= 7 ? 500 : r.rarity >= 5 ? 250 : 0;
        const gap  = r.rarity >= 5 ? 500 : 220;
        setTimeout(() => {
          doFlash(r.rarity, () => {
            doShake(r.rarity);
            card.classList.add('flipped');
            i++;
            setTimeout(next, gap);
          });
        }, hold);
      }
      next();
    }, buildupMs);
  }
}

// ─── RESULTS PANEL ────────────────────────────────────────
function showResultsPanel(results) {
  pendingResults = results;
  const overlay = document.getElementById('results-overlay');
  const list    = document.getElementById('results-list');

  list.innerHTML = results.map(r => {
    const col   = RARITY_COLORS[r.rarity];
    const stars = '★'.repeat(r.rarity);
    const sub   = r.type === 'weapon' ? `[${r.weaponType}]` : `[${r.class}]`;
    return `<div class="result-row">
      <span class="result-stars" style="color:${col}">${stars}</span>
      <span class="result-name">${r.name}</span>
      <span class="result-sub">${sub}</span>
    </div>`;
  }).join('');

  overlay.classList.add('visible');

  const addBtn   = document.getElementById('res-add-btn');
  const againBtn = document.getElementById('res-again-btn');

  // Replace listeners cleanly
  const newAdd   = addBtn.cloneNode(true);
  const newAgain = againBtn.cloneNode(true);
  addBtn.replaceWith(newAdd);
  againBtn.replaceWith(newAgain);

  newAdd.addEventListener('click', () => {
    pendingResults.forEach(r => gameState.inventory.push(r));
    saveGame();
    pendingResults = [];
    overlay.classList.remove('visible');
    // Tutorial summon callback
    if (window._tutorialPullResolve) {
      var cb = window._tutorialPullResolve;
      window._tutorialPullResolve = null;
      setTimeout(cb, 200);
    }
  });

  newAgain.addEventListener('click', () => {
    // Auto-add pending results to inventory so they aren't lost
    if (pendingResults.length > 0) {
      pendingResults.forEach(r => gameState.inventory.push(r));
      saveGame();
      pendingResults = [];
    }
    overlay.classList.remove('visible');
    refreshSummonContent();
  });
}

function registerSceneSummon() {
  // All gacha/summon functions are declared globally above.
}
