// ═══════════════════════════════════════════════════════════
// HEROES SCENE — ROSTER + PARTY + WEAPONS
// ═══════════════════════════════════════════════════════════

let heroesActiveTab   = 'roster';
let heroSortMode      = 'recent';
let pickerSortMode    = 'rarity';
let currentPickerSlot = -1;
// Weapon picker (EQUIP button in hero detail)
let _wpHeroId     = null;
let _wpSlot       = null;
let _wpSortMode   = 'rarity';
let _wpFilterType = 'All';

// Weapon inventory tab
let _wiSortMode   = 'rarity';
let _wiFilterType = 'All';

// ─── AFFINITY SYSTEM ──────────────────────────────────────
// Milestones auto-grant rewards; stored on hero.affinityMilestonesGranted[]
const AFFINITY_MILESTONES = [
  { threshold: 100,  label: 'First Bond',      reward: { gems: 50 } },
  { threshold: 300,  label: 'Growing Trust',   reward: { backstory: true } },
  { threshold: 500,  label: 'Trusted Friend',  reward: { talentBoost: 0.5 } },
  { threshold: 700,  label: 'Cherished Bond',  reward: { gems: 50 } },
  { threshold: 1000, label: 'Close Companion', reward: { backstory: true } },
  { threshold: 1300, label: 'Devoted',         reward: { gems: 300 } },
  { threshold: 1700, label: "Heart's Friend",  reward: { talentBoost: 0.5 } },
  { threshold: 2200, label: 'Soul Bound',      reward: { backstory: true } },
  { threshold: 3000, label: 'Eternal Bond',    reward: { gems: 100 } },
  { threshold: 4500, label: 'Transcendent',    reward: { gems: 300, latentTalent: true } },
  { threshold: 8000, label: 'Legend',          reward: { gems: 300, skillTierUp: true } },
];
const _AFFINITY_MAX = 8000;

// Hero detail
let _currentDetailHero = null;

// ─── TOAST ────────────────────────────────────────────────
function showToast(msg, color) {
  const toast = document.getElementById('debug-toast');
  toast.textContent   = msg;
  toast.style.color   = color || '#00FFFF';
  toast.style.opacity = '1';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// ─── SCENE ENTRY ──────────────────────────────────────────
function showHeroesScene() {
  migrateInventory(); // ensure newly-pulled items are fully initialised
  heroesActiveTab = 'roster';
  const main = document.getElementById('hub-main');
  main.className = 'hub-main--list';
  main.innerHTML = `
    <div id="heroes-scene" style="width:100%;padding:28px 36px;min-height:100%">
      <div id="heroes-tabs" style="display:flex;border-bottom:2px solid #C0C0D0;margin-bottom:28px">
        <button class="summon-tab" data-htab="roster">[ ROSTER ]</button>
        <button class="summon-tab" data-htab="party">[ PARTY ]</button>
        <button class="summon-tab" data-htab="weapons">[ WEAPONS ]</button>
      </div>
      <div id="heroes-tab-content"></div>
    </div>`;

  document.querySelectorAll('[data-htab]').forEach(btn => {
    btn.addEventListener('click', () => switchHeroTab(btn.dataset.htab));
  });

  switchHeroTab('roster');
}

function switchHeroTab(tab) {
  heroesActiveTab = tab;
  document.querySelectorAll('[data-htab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.htab === tab);
  });
  const content = document.getElementById('heroes-tab-content');
  if (!content) return;
  content.innerHTML = '';
  if      (tab === 'roster')  showRosterTabContent(content);
  else if (tab === 'party')   showPartyTabContent(content);
  else if (tab === 'weapons') showWeaponsTabContent(content);
}

// ─── ROSTER TAB ───────────────────────────────────────────
function showRosterTabContent(container) {
  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;flex-wrap:wrap;gap:10px">
      <div style="color:#FFFFFF;font-size:16px;letter-spacing:2px">[ HERO ROSTER ]</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="color:#E8D5FF;font-size:11px;margin-right:2px">Sort by:</span>
        <button class="sort-btn" data-sort="rarity" onclick="setHeroSort('rarity')">[ Rarity ★ ]</button>
        <button class="sort-btn" data-sort="level"  onclick="setHeroSort('level')">[ Level ]</button>
        <button class="sort-btn" data-sort="name"   onclick="setHeroSort('name')">[ Name A–Z ]</button>
        <button class="sort-btn" data-sort="recent" onclick="setHeroSort('recent')">[ Recent ]</button>
      </div>
    </div>
    <div id="hero-grid"></div>`;
  updateSortBtnState();
  refreshHeroGrid();
}

function setHeroSort(mode) {
  heroSortMode = mode;
  updateSortBtnState();
  refreshHeroGrid();
}

function updateSortBtnState() {
  document.querySelectorAll('[data-sort]').forEach(b => {
    b.classList.toggle('active', b.dataset.sort === heroSortMode);
  });
}

function refreshHeroGrid() {
  const grid = document.getElementById('hero-grid');
  if (!grid) return;

  const heroes = gameState.inventory.filter(i => i.type === 'hero');

  if (heroes.length === 0) {
    grid.style.display = 'block';
    grid.innerHTML = `<div style="color:#C0C0D0;font-size:14px;letter-spacing:1px;text-align:center;margin-top:60px">[ No heroes summoned yet. Visit the Summon menu. ]</div>`;
    return;
  }

  const sorted = [...heroes];
  switch (heroSortMode) {
    case 'rarity': sorted.sort((a, b) => b.rarity - a.rarity || heroes.indexOf(b) - heroes.indexOf(a)); break;
    case 'level':  sorted.sort((a, b) => b.level - a.level   || b.rarity - a.rarity); break;
    case 'name':   sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'recent': sorted.reverse(); break;
  }

  grid.style.display = '';
  grid.innerHTML = '';

  sorted.forEach(hero => {
    const wrapper = buildHeroCardEl(hero, true);
    wrapper.addEventListener('click', () => {
      if (hero.isNew) {
        hero.isNew = false;
        saveGame();
        wrapper.querySelector('.hero-card-badge.new')?.remove();
      }
      openHeroDetail(hero);
    });
    grid.appendChild(wrapper);
  });
}

// ─── HERO CARD BUILDER ────────────────────────────────────
function buildHeroCardEl(hero, showWeaponBadges) {
  const col   = RARITY_BORDER[hero.rarity] || '#C0C0D0';
  const stars = '★'.repeat(hero.rarity);
  const is7   = hero.rarity === 7;

  const wrapper = document.createElement('div');
  wrapper.className      = 'hero-card';
  wrapper.dataset.heroId = hero.id;

  if (is7) {
    wrapper.style.cssText += 'background:linear-gradient(135deg,#FF4500,#FFD700);padding:2px;';
  } else {
    wrapper.style.border = `2px solid ${col}`;
  }

  const inner = document.createElement('div');
  inner.style.cssText = is7
    ? 'width:100%;height:100%;background:#12001A;position:relative;display:flex;flex-direction:column;'
    : 'width:100%;height:100%;position:relative;display:flex;flex-direction:column;';

  const art = document.createElement('div');
  art.className = 'hero-card-art';
  art.style.borderBottomColor = is7 ? '#FF650044' : col + '44';
  art.textContent = '[ Art ]';
  inner.appendChild(art);

  const body = document.createElement('div');
  body.className = 'hero-card-body';
  body.innerHTML = `
    <div class="hero-card-name">${escHtml(hero.name)}</div>
    <div class="hero-card-stars" style="color:${col}">${stars}</div>
    <div class="hero-card-class">${escHtml(hero.class)}</div>
    <div class="hero-card-level">Lv. ${hero.level}</div>`;
  inner.appendChild(body);

  if (hero.isNew) {
    const nb = document.createElement('div');
    nb.className = 'hero-card-badge new'; nb.textContent = '[ NEW ]';
    inner.appendChild(nb);
  }
  if (hero.inParty) {
    const pb = document.createElement('div');
    pb.className = 'hero-card-badge party'; pb.textContent = '[ PARTY ]';
    inner.appendChild(pb);
  }
  if (hero.inDungeon) {
    const eb = document.createElement('div');
    eb.className = 'hero-card-badge party';
    eb.style.cssText = 'right:6px;top:auto;bottom:22px;background:#5A4400;color:#F1C40F;';
    eb.textContent = '[ EXP ]';
    inner.appendChild(eb);
    wrapper.style.opacity = '0.7';
  }
  if (debugMode) {
    const db = document.createElement('div');
    db.className   = 'hero-card-debug';
    db.style.color = talentColor(hero.talent);
    db.textContent = `T: ${hero.talent}`;
    inner.appendChild(db);
  }

  // Weapon slot badge row at bottom of card
  if (showWeaponBadges && hero.equippedWeapons) {
    const penalty  = !!hero.activePenalty;
    const badgeCol = penalty ? '#FF6666' : '#C0C0D0';
    const mhId = hero.equippedWeapons.mainHand;
    const ohId = hero.equippedWeapons.offHand;
    const mhW  = mhId ? gameState.inventory.find(i => i.id === mhId) : null;
    const ohW  = ohId ? gameState.inventory.find(i => i.id === ohId) : null;
    const mhIcon = mhW ? (WEAPON_ICONS[mhW.weaponType] || '?') : '·';
    const ohIcon = ohW ? (WEAPON_ICONS[ohW.weaponType] || '?') : '·';
    const mhOpacity = mhW ? '1' : '0.25';
    const ohOpacity = ohW ? '1' : '0.25';

    const wb = document.createElement('div');
    wb.style.cssText = `
      position:absolute;bottom:4px;left:0;right:0;
      display:flex;justify-content:space-between;padding:0 8px;
      pointer-events:none;`;
    wb.innerHTML = `
      <span style="font-size:12px;opacity:${mhOpacity};color:${badgeCol}" title="Main Hand">${mhIcon}</span>
      <span style="font-size:12px;opacity:${ohOpacity};color:${badgeCol}" title="Off Hand">${ohIcon}</span>`;
    inner.appendChild(wb);
  }

  wrapper.appendChild(inner);
  wrapper.addEventListener('mouseenter', () => { wrapper.style.boxShadow = '0 0 14px #7B2FBE'; });
  wrapper.addEventListener('mouseleave', () => { wrapper.style.boxShadow = ''; });
  return wrapper;
}

// ─── PARTY TAB ────────────────────────────────────────────
function showPartyTabContent(container) {
  container.innerHTML = `
    <div style="color:#FFFFFF;font-size:16px;letter-spacing:2px;margin-bottom:24px">[ PARTY FORMATION ]</div>
    <div id="party-slots-grid"
         style="display:grid;grid-template-columns:repeat(3,180px);gap:16px;justify-content:center;margin-bottom:32px">
    </div>
    <div id="party-stats-panel"></div>`;
  renderPartySlots();
  renderPartyStats();
}

function refreshPartyTab() {
  const content = document.getElementById('heroes-tab-content');
  if (!content || heroesActiveTab !== 'party') return;
  showPartyTabContent(content);
}

function renderPartySlots() {
  const grid = document.getElementById('party-slots-grid');
  if (!grid) return;
  grid.innerHTML = '';

  for (let i = 0; i < 6; i++) {
    const heroId = gameState.party[i];
    const hero   = heroId ? gameState.inventory.find(h => h.id === heroId) : null;
    const slot   = document.createElement('div');

    if (!hero) {
      slot.style.cssText = `
        position:relative;width:180px;height:220px;
        background:#0D0010;border:2px dashed #C0C0D0;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;font-family:'Courier New',monospace;transition:box-shadow 0.2s;`;
      slot.innerHTML = `
        <div style="position:absolute;top:6px;left:8px;color:#C0C0D0;font-size:9px;letter-spacing:1px">Slot ${i + 1}</div>
        <div style="color:#E8D5FF;font-size:13px;letter-spacing:2px">[ EMPTY ]</div>`;
      slot.addEventListener('mouseenter', () => { slot.style.boxShadow = '0 0 12px #7B2FBE'; });
      slot.addEventListener('mouseleave', () => { slot.style.boxShadow = ''; });
      slot.addEventListener('click', () => openHeroPicker(i));
    } else {
      const col  = RARITY_BORDER[hero.rarity] || '#C0C0D0';
      const stars = '★'.repeat(hero.rarity);
      const is7   = hero.rarity === 7;

      slot.style.cssText = `position:relative;width:180px;height:220px;cursor:pointer;font-family:'Courier New',monospace;transition:box-shadow 0.2s;`;
      if (is7) slot.style.cssText += 'background:linear-gradient(135deg,#FF4500,#FFD700);padding:2px;';
      else     slot.style.cssText += `border:2px solid ${col};`;

      const inner = document.createElement('div');
      inner.style.cssText = 'width:100%;height:100%;background:#12001A;position:relative;display:flex;flex-direction:column;';

      const art = document.createElement('div');
      art.className = 'hero-card-art';
      art.style.borderBottomColor = is7 ? '#FF650044' : col + '44';
      art.textContent = '[ Art ]';
      inner.appendChild(art);

      const body = document.createElement('div');
      body.className = 'hero-card-body';
      body.innerHTML = `
        <div class="hero-card-name">${escHtml(hero.name)}</div>
        <div class="hero-card-stars" style="color:${col}">${stars}</div>
        <div class="hero-card-class">${escHtml(hero.class)}</div>
        <div class="hero-card-level">Lv. ${hero.level}</div>`;
      inner.appendChild(body);

      const slotLabel = document.createElement('div');
      slotLabel.style.cssText = 'position:absolute;top:5px;left:6px;color:#C0C0D0;font-size:9px;letter-spacing:1px;pointer-events:none;';
      slotLabel.textContent = `Slot ${i + 1}`;
      inner.appendChild(slotLabel);

      if (debugMode) {
        const db = document.createElement('div');
        db.className   = 'hero-card-debug';
        db.style.color = talentColor(hero.talent);
        db.textContent = `T: ${hero.talent}`;
        inner.appendChild(db);
      }

      const removeBtn = document.createElement('button');
      removeBtn.textContent = '×';
      removeBtn.style.cssText = `
        position:absolute;top:5px;right:5px;background:#1A0025;border:1px solid #C0C0D0;
        color:#FFFFFF;font-family:'Courier New',monospace;font-size:13px;
        width:22px;height:22px;line-height:1;display:flex;align-items:center;
        justify-content:center;cursor:pointer;padding:0;transition:box-shadow 0.2s;`;
      removeBtn.addEventListener('mouseenter', () => { removeBtn.style.boxShadow = '0 0 6px #7B2FBE'; });
      removeBtn.addEventListener('mouseleave', () => { removeBtn.style.boxShadow = ''; });
      removeBtn.addEventListener('click', e => {
        e.stopPropagation();
        removeFromParty(hero.id);
        showToast(`[ ${escHtml(hero.name)} removed from party ]`, '#C0C0D0');
        refreshPartyTab();
        refreshHeroGrid();
      });
      inner.appendChild(removeBtn);

      slot.appendChild(inner);
      slot.addEventListener('mouseenter', () => { slot.style.boxShadow = '0 0 14px #7B2FBE'; });
      slot.addEventListener('mouseleave', () => { slot.style.boxShadow = ''; });
      slot.addEventListener('click', () => openHeroDetail(hero));
    }

    grid.appendChild(slot);
  }
}

function renderPartyStats() {
  const panel = document.getElementById('party-stats-panel');
  if (!panel) return;

  const partyHeroes = getPartyHeroes().filter(Boolean);

  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 15px rgba(123,47,190,0.5);
    padding:22px 28px;max-width:580px;margin:0 auto;
    font-family:'Courier New',monospace;`;
  panel.innerHTML = '';

  const title = document.createElement('div');
  title.style.cssText  = 'color:#FFFFFF;font-size:13px;letter-spacing:2px;margin-bottom:16px;';
  title.textContent    = '[ PARTY STATS ]';
  panel.appendChild(title);

  if (partyHeroes.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'color:#E8D5FF;font-size:12px;text-align:center;padding:12px 0;letter-spacing:1px;';
    empty.textContent   = '[ Assemble your party to see stats ]';
    panel.appendChild(empty);
    return;
  }

  const n       = partyHeroes.length;
  const totStr  = partyHeroes.reduce((s, h) => s + (h.stats.strength     || 0), 0);
  const totInt  = partyHeroes.reduce((s, h) => s + (h.stats.intelligence || 0), 0);
  const totHp   = partyHeroes.reduce((s, h) => s + (h.stats.health       || 0), 0);
  const totAgi  = partyHeroes.reduce((s, h) => s + (h.stats.agility      || 0), 0);
  const avgCrit = Math.round(partyHeroes.reduce((s, h) => s + h.stats.critRate,     0) / n * 10) / 10;
  const avgDmg  = Math.round(partyHeroes.reduce((s, h) => s + h.stats.critDamage,   0) / n * 10) / 10;
  const avgReac = Math.round(partyHeroes.reduce((s, h) => s + h.stats.reactionTime, 0) / n * 100) / 100;

  const statsGrid = document.createElement('div');
  statsGrid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:8px 36px;font-size:12px;';
  statsGrid.innerHTML = `
    <div><span style="color:#E8D5FF">Total STR: </span><span style="color:#FFFFFF">${totStr}</span></div>
    <div><span style="color:#E8D5FF">Avg Crit Rate: </span><span style="color:#FFFFFF">${avgCrit}%</span></div>
    <div><span style="color:#E8D5FF">Total INT: </span><span style="color:#FFFFFF">${totInt}</span></div>
    <div><span style="color:#E8D5FF">Avg Crit DMG: </span><span style="color:#FFFFFF">${avgDmg}%</span></div>
    <div><span style="color:#E8D5FF">Total HP: </span><span style="color:#FFFFFF">${totHp}</span></div>
    <div><span style="color:#E8D5FF">Avg Reaction: </span><span style="color:#FFFFFF">${avgReac}s</span></div>
    <div><span style="color:#E8D5FF">Total AGI: </span><span style="color:#FFFFFF">${totAgi}</span></div>
    <div><span style="color:#E8D5FF">Heroes in Party: </span><span style="color:#FFFFFF">${gameState.party.length} / 6</span></div>`;
  panel.appendChild(statsGrid);

  if (debugMode) {
    const avgTalent = Math.round(partyHeroes.reduce((s, h) => s + h.talent, 0) / n * 10) / 10;
    const debugDiv  = document.createElement('div');
    debugDiv.style.cssText = `
      margin-top:14px;padding-top:12px;border-top:1px solid #00FFFF33;
      display:grid;grid-template-columns:1fr 1fr;gap:8px 36px;font-size:12px;`;
    debugDiv.innerHTML = `
      <div><span style="color:#E8D5FF">Avg Talent: </span>
        <span style="color:${talentColor(avgTalent)}">${avgTalent}</span></div>
      <div><span style="color:#E8D5FF">Talent Tier: </span>
        <span style="color:${talentColor(avgTalent)}">${talentTierLabel(avgTalent)}</span></div>`;
    panel.appendChild(debugDiv);
  }
}

// ─── HERO PICKER (party) ───────────────────────────────────
function openHeroPicker(slotIndex) {
  currentPickerSlot = slotIndex;
  pickerSortMode    = 'rarity';

  const overlay = document.createElement('div');
  overlay.id = 'hero-picker-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.82);z-index:1500;
    display:flex;align-items:center;justify-content:center;pointer-events:all;`;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 20px #7B2FBE,inset 0 0 20px rgba(123,47,190,0.1);
    padding:28px 36px;width:960px;max-height:82vh;
    display:flex;flex-direction:column;font-family:'Courier New',monospace;
    opacity:0;transform:translateY(18px);transition:opacity 0.22s ease,transform 0.22s ease;`;
  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;gap:12px">
      <div style="color:#FFFFFF;font-size:14px;letter-spacing:2px">[ SELECT HERO — Slot ${slotIndex + 1} ]</div>
      <button id="picker-close-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:12px;padding:6px 16px;
               cursor:pointer;letter-spacing:1px;white-space:nowrap;flex-shrink:0;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ × CLOSE ]</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:18px;flex-wrap:wrap">
      <span style="color:#E8D5FF;font-size:11px;margin-right:2px">Sort by:</span>
      <button class="sort-btn" data-psort="rarity" onclick="setPickerSort('rarity')">[ Rarity ★ ]</button>
      <button class="sort-btn" data-psort="level"  onclick="setPickerSort('level')">[ Level ]</button>
      <button class="sort-btn" data-psort="recent" onclick="setPickerSort('recent')">[ Recent ]</button>
    </div>
    <div id="picker-grid-wrap" style="overflow-y:auto;flex:1;padding:4px;"></div>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  panel.querySelector('#picker-close-btn').addEventListener('click', closeHeroPicker);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeHeroPicker(); });
  updatePickerSortBtns();
  refreshPickerGrid();
}

function closeHeroPicker() {
  const overlay = document.getElementById('hero-picker-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

function setPickerSort(mode) {
  pickerSortMode = mode;
  updatePickerSortBtns();
  refreshPickerGrid();
}

function updatePickerSortBtns() {
  document.querySelectorAll('[data-psort]').forEach(b => {
    b.classList.toggle('active', b.dataset.psort === pickerSortMode);
  });
}

function refreshPickerGrid() {
  const wrap = document.getElementById('picker-grid-wrap');
  if (!wrap) return;

  const available = gameState.inventory.filter(i => i.type === 'hero' && !i.inParty);
  if (available.length === 0) {
    wrap.innerHTML = `<div style="color:#E8D5FF;font-size:14px;text-align:center;padding:40px 0;letter-spacing:1px;">[ All available heroes are in the party ]</div>`;
    return;
  }

  const allHeroes = gameState.inventory.filter(i => i.type === 'hero');
  const sorted    = [...available];
  switch (pickerSortMode) {
    case 'rarity': sorted.sort((a, b) => b.rarity - a.rarity || allHeroes.indexOf(b) - allHeroes.indexOf(a)); break;
    case 'level':  sorted.sort((a, b) => b.level - a.level   || b.rarity - a.rarity); break;
    case 'recent': sorted.reverse(); break;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,180px);gap:16px;';
  sorted.forEach(hero => {
    const card = buildHeroCardEl(hero, false);
    card.addEventListener('click', () => {
      const result = addToParty(hero.id);
      if (result.ok) {
        closeHeroPicker();
        setTimeout(() => { refreshPartyTab(); refreshHeroGrid(); }, 180);
      } else if (result.reason === 'full')      showToast('[ Party is full ]',     '#FF4444');
      else if (result.reason === 'duplicate')   showToast('[ Already in party ]',  '#FF4444');
    });
    grid.appendChild(card);
  });

  wrap.innerHTML = '';
  wrap.appendChild(grid);
}

// ═══════════════════════════════════════════════════════════
// HERO DETAIL PANEL
// ═══════════════════════════════════════════════════════════

function openHeroDetail(hero) {
  _currentDetailHero = hero;
  const overlay = document.getElementById('hero-detail-overlay');
  const panel   = document.getElementById('hero-detail-panel');
  renderHeroDetailContent(hero, panel);
  overlay.style.display = 'flex';
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.add('visible')));

  // Remove any previous outside-click handler before adding a fresh one
  overlay._hdHandler && overlay.removeEventListener('click', overlay._hdHandler);
  overlay._hdHandler = function(e) {
    if (e.target === overlay) {
      closeHeroDetail();
      overlay.removeEventListener('click', overlay._hdHandler);
      overlay._hdHandler = null;
    }
  };
  overlay.addEventListener('click', overlay._hdHandler);
}

function refreshHeroDetail() {
  if (!_currentDetailHero) return;
  const panel = document.getElementById('hero-detail-panel');
  if (!panel) return;
  renderHeroDetailContent(_currentDetailHero, panel);
}

// ─── build full panel content ──────────────────────────────
function renderHeroDetailContent(hero, panel) {
  const col     = RARITY_BORDER[hero.rarity] || '#C0C0D0';
  const stars   = '★'.repeat(hero.rarity);
  const expNext = hero.level * 100;
  const eff     = getEffectiveStats(hero);

  // ── Affinity bar ──
  const affinity     = hero.affinity || 0;
  const _nextMs      = AFFINITY_MILESTONES.find(m => affinity < m.threshold);
  const _nextMsIdx   = _nextMs ? AFFINITY_MILESTONES.indexOf(_nextMs) : AFFINITY_MILESTONES.length;
  const _prevThresh  = _nextMsIdx > 0 ? AFFINITY_MILESTONES[_nextMsIdx - 1].threshold : 0;
  const _nextThresh  = _nextMs ? _nextMs.threshold : _AFFINITY_MAX;
  const _affinityMaxed = affinity >= _AFFINITY_MAX;
  const _affinityLabel = _affinityMaxed ? 'MAX' : (_nextMs ? _nextMs.label : '—');
  const _fillPct     = _affinityMaxed ? 100
    : Math.min(100, Math.round(((affinity - _prevThresh) / (_nextThresh - _prevThresh)) * 100));
  const _today       = new Date().toISOString().slice(0, 10);
  const affinityBarHTML = `
    <div style="border-bottom:1px solid #2A003A;padding:10px 0 12px;margin-bottom:16px;font-family:'Courier New',monospace">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="color:#C0C0D0;font-size:11px;letter-spacing:2px">[ AFFINITY ]</span>
        <span style="color:#E8D5FF;font-size:11px">${affinity} / ${_affinityMaxed ? _AFFINITY_MAX + ' ★ MAX' : _nextThresh + ' — ' + escHtml(_affinityLabel)}</span>
      </div>
      <div style="background:#2A003A;height:5px;border-radius:3px">
        <div style="background:#FF69B4;width:${_fillPct}%;height:5px;border-radius:3px"></div>
      </div>
    </div>`;

  // ── Base stats ──
  const baseGrid = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:9px 32px;font-size:12px;
                font-family:'Courier New',monospace;margin-bottom:22px">
      <div><span class="detail-label">Class: </span><span class="detail-value">${escHtml(hero.class)}</span></div>
      <div><span class="detail-label">Crit Rate: </span><span class="detail-value">${hero.stats.critRate}%</span></div>
      <div><span class="detail-label">Level: </span><span class="detail-value">${hero.level}
        <span style="color:#666;font-size:10px">(EXP: ${hero.exp} / ${expNext})</span></span></div>
      <div><span class="detail-label">Crit Damage: </span><span class="detail-value">${hero.stats.critDamage}%</span></div>
      <div><span class="detail-label">Strength: </span><span class="detail-value">${hero.stats.strength}</span></div>
      <div><span class="detail-label">Reaction: </span><span class="detail-value">${hero.stats.reactionTime}s</span></div>
      <div><span class="detail-label">Intelligence: </span><span class="detail-value">${hero.stats.intelligence}</span></div>
      <div><span class="detail-label">Party: </span><span class="detail-value">${hero.inParty ? 'In Party' : 'Not in Party'}</span></div>
      <div><span class="detail-label">Health: </span><span class="detail-value">${hero.stats.health}</span></div>
      <div><span class="detail-label">Agility: </span><span class="detail-value">${hero.stats.agility}</span></div>
    </div>`;

  // ── Equipment section ──
  const equipSection = _buildEquipSectionHTML(hero);

  // ── Effective stats ──
  const dSTR = eff.effectiveSTR - hero.stats.strength;
  const dINT = eff.effectiveINT - hero.stats.intelligence;
  const dHP  = eff.effectiveHP  - hero.stats.health;
  const dAGI = eff.effectiveAGI - hero.stats.agility;
  const _delta = (d) => d !== 0
    ? `<span style="color:${d > 0 ? '#FFD700' : '#FF6666'};font-size:10px;margin-left:4px">(${d > 0 ? '+' : ''}${d})</span>`
    : '';

  const penaltyWarn = hero.activePenalty
    ? `<div style="color:#FF4444;font-size:11px;margin-top:8px;letter-spacing:1px">
         ⚠ ${escHtml(hero.name)} is unfamiliar with ${escHtml(hero.activePenalty.weaponType)}!
         Combat effectiveness reduced by 35%.
       </div>` : '';

  const effSection = `
    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:20px;font-family:'Courier New',monospace">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:10px">[ EFFECTIVE STATS ]</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 32px;font-size:12px">
        <div><span class="detail-label">Effective STR: </span><span class="detail-value">${eff.effectiveSTR}</span>${_delta(dSTR)}</div>
        <div><span class="detail-label">Effective INT: </span><span class="detail-value">${eff.effectiveINT}</span>${_delta(dINT)}</div>
        <div><span class="detail-label">Effective HP: </span><span class="detail-value">${eff.effectiveHP}</span>${_delta(dHP)}</div>
        <div><span class="detail-label">Effective AGI: </span><span class="detail-value">${eff.effectiveAGI}</span>${_delta(dAGI)}</div>
      </div>
      ${penaltyWarn}
    </div>`;

  // ── Proficiency section ──
  const profSection = _buildProfSectionHTML(hero);

  // ── Skills ──
  const skillsHTML = (hero.skills && hero.skills.length > 0)
    ? hero.skills.map(s => {
        if (typeof s === 'string') {
          return `<div style="color:#FFFFFF;font-size:12px;padding:3px 0">${escHtml(s)}</div>`;
        }
        return `<div style="padding:4px 0">
          <span style="color:#4CAF50;font-size:11px;letter-spacing:1px">${escHtml(s.name)}</span>
          <span style="color:#E8D5FF;font-size:10px;margin-left:6px">${escHtml(s.effect)}</span>
        </div>`;
      }).join('')
    : '<div style="color:#E8D5FF;font-size:12px">[ No skills unlocked ]</div>';

  // ── Debug ──
  const debugHTML = debugMode ? `
    <div style="margin-top:22px;padding-top:16px;border-top:1px solid #00FFFF33">
      <div style="color:#00FFFF;font-size:12px;letter-spacing:2px;margin-bottom:12px">[ DEBUG ]</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px 28px;font-size:11px;font-family:'Courier New',monospace">
        <div><span class="detail-label">Talent Score: </span>
          <span style="color:${talentColor(hero.talent)}">${hero.talent} / 10</span></div>
        <div><span class="detail-label">Talent Tier: </span>
          <span style="color:${talentColor(hero.talent)}">${talentTierLabel(hero.talent)}</span></div>
        <div style="grid-column:1/-1"><span class="detail-label">Crit Rate src: </span>
          <span style="color:#00FFFF">2% + (${hero.talent} × 1.5%) = ${hero.stats.critRate}%</span></div>
        <div style="grid-column:1/-1"><span class="detail-label">Crit DMG src: </span>
          <span style="color:#00FFFF">120% + (${hero.talent} × 8%) = ${hero.stats.critDamage}%</span></div>
        <div style="grid-column:1/-1"><span class="detail-label">Reaction src: </span>
          <span style="color:#00FFFF">1.0s − (${hero.talent} × 0.07s) = ${hero.stats.reactionTime}s</span></div>
        <div style="grid-column:1/-1"><span class="detail-label">Lvl Bonus/lvl: </span>
          <span style="color:#00FFFF">+${Math.floor(hero.talent * 0.15)} per stat per level</span></div>
        <div style="grid-column:1/-1"><span class="detail-label">Affinity: </span>
          <span style="color:#FF69B4">${affinity} (talked: ${hero.talkDate || 'never'})</span></div>
      </div>
    </div>` : '';

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:22px;gap:12px">
      <div>
        <div style="color:#FFFFFF;font-size:17px;font-weight:bold;letter-spacing:1px">${escHtml(hero.name)}</div>
        <div style="color:${col};font-size:15px;margin-top:5px;letter-spacing:2px">${stars}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
        <button id="hd-close-btn"
          style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;font-family:'Courier New',monospace;
                 font-size:12px;padding:7px 18px;cursor:pointer;letter-spacing:1px;white-space:nowrap;
                 transition:box-shadow 0.2s"
          onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
          onmouseout="this.style.boxShadow=''">[ × CLOSE ]</button>
        <button id="hd-affinity-btn"
          style="background:#1A0025;border:2px solid #FF69B4;color:#FF69B4;font-family:'Courier New',monospace;
                 font-size:11px;padding:5px 14px;cursor:pointer;letter-spacing:1px;white-space:nowrap;
                 transition:box-shadow 0.2s"
          onmouseover="this.style.boxShadow='0 0 8px #FF69B4'"
          onmouseout="this.style.boxShadow=''">[ ♥ AFFINITY ]</button>
      </div>
    </div>

    <div style="background:#080010;border:1px solid #2A003A;height:160px;
                display:flex;align-items:center;justify-content:center;margin-bottom:16px">
      <span style="color:#1A0025;font-size:14px;letter-spacing:3px">[ Hero Art ]</span>
    </div>

    ${affinityBarHTML}

    ${hero.inDungeon ? `<div style="background:#2A1800;border:2px solid #F1C40F;padding:10px 16px;
      margin-bottom:18px;font-family:'Courier New',monospace;font-size:12px;color:#F1C40F;letter-spacing:1px">
      [ ⚗ Currently on dungeon expedition ]</div>` : ''}

    ${baseGrid}
    ${equipSection}
    ${effSection}
    ${profSection}

    <div style="border-top:1px solid #2A003A;padding-top:16px;font-family:'Courier New',monospace;margin-bottom:20px">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:10px">Possessed Skills</div>
      ${skillsHTML}
    </div>

    ${debugHTML}

    <div id="hd-party-btn-area" style="margin-top:20px;padding-top:16px;border-top:1px solid #2A003A;"></div>`;

  document.getElementById('hd-close-btn').addEventListener('click', closeHeroDetail);
  document.getElementById('hd-affinity-btn').addEventListener('click', () => openAffinityPanel(hero));
  _attachEquipListeners(hero, panel);
  renderHeroDetailPartyBtn(hero);
}

// ─── Equipment section HTML ────────────────────────────────
function _buildEquipSectionHTML(hero) {
  const eq = hero.equippedWeapons || { mainHand: null, offHand: null };

  function slotHTML(slot, label) {
    const wId = eq[slot];
    const w   = wId ? gameState.inventory.find(i => i.id === wId && i.type === 'weapon') : null;
    const col = w ? (RARITY_BORDER[w.rarity] || '#C0C0D0') : '#444460';

    if (!w) {
      return `
        <div style="flex:1;min-width:180px">
          <div style="color:#C8C8E0;font-size:10px;letter-spacing:1px;margin-bottom:6px">${label}</div>
          <div style="background:#080010;border:1px dashed #444460;padding:12px 8px;min-height:80px;
                      display:flex;align-items:center;justify-content:center;margin-bottom:8px">
            <span style="color:#8888AA;font-size:11px;letter-spacing:1px">[ — Empty — ]</span>
          </div>
          <button class="hd-equip-btn" data-slot="${slot}"
            style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
                   font-family:'Courier New',monospace;font-size:11px;padding:6px 14px;
                   cursor:pointer;letter-spacing:1px;width:100%;transition:box-shadow 0.2s">[ EQUIP ]</button>
        </div>`;
    }

    const stars = '★'.repeat(w.rarity);
    const icon  = WEAPON_ICONS[w.weaponType] || '?';
    const s     = w.stats || {};
    let statsPreview = '';
    if (s.flatSTR) statsPreview += `<span style="color:#C8C8E0">+${s.flatSTR} STR</span> `;
    if (s.flatINT) statsPreview += `<span style="color:#C8C8E0">+${s.flatINT} INT</span> `;
    if (s.flatHP)  statsPreview += `<span style="color:#C8C8E0">+${s.flatHP} HP</span> `;
    if (s.flatAGI && s.flatAGI !== 0) statsPreview += `<span style="color:${s.flatAGI < 0 ? '#FF6666' : '#C8C8E0'}">${s.flatAGI > 0 ? '+' : ''}${s.flatAGI} AGI</span> `;
    const pcts = [];
    if (s.pctSTR) pcts.push(`+${Math.round(s.pctSTR * 100)}% STR`);
    if (s.pctINT) pcts.push(`+${Math.round(s.pctINT * 100)}% INT`);
    if (s.pctHP)  pcts.push(`+${Math.round(s.pctHP  * 100)}% HP`);
    if (s.pctAGI) pcts.push(`+${Math.round(s.pctAGI * 100)}% AGI`);
    const pctPreview = pcts.length ? `<div style="color:#C8C8E0;font-size:9px;margin-top:2px">${escHtml(pcts.join('  '))}</div>` : '';

    return `
      <div style="flex:1;min-width:180px">
        <div style="color:#C8C8E0;font-size:10px;letter-spacing:1px;margin-bottom:6px">${label}</div>
        <div style="background:#080010;border:1px solid ${col};padding:10px 8px;min-height:80px;margin-bottom:8px">
          <div style="font-size:20px;text-align:center;margin-bottom:4px">${icon}</div>
          <div style="color:#FFFFFF;font-size:11px;text-align:center;margin-bottom:2px">${escHtml(w.name)}</div>
          <div style="color:${col};font-size:11px;text-align:center;margin-bottom:4px">${stars}</div>
          <div style="font-size:10px;text-align:center;line-height:1.6">${statsPreview}</div>
          ${pctPreview}
          <div style="color:#C8C8E0;font-size:9px;text-align:center;margin-top:4px">${icon} ${escHtml(w.weaponType)}</div>
        </div>
        <button class="hd-unequip-btn" data-slot="${slot}"
          style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
                 font-family:'Courier New',monospace;font-size:11px;padding:6px 14px;
                 cursor:pointer;letter-spacing:1px;width:100%;transition:box-shadow 0.2s">[ UNEQUIP ]</button>
      </div>`;
  }

  return `
    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:20px;font-family:'Courier New',monospace">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:12px">[ EQUIPMENT ]</div>
      <div style="display:flex;gap:16px;flex-wrap:wrap">
        ${slotHTML('mainHand', 'Main Hand')}
        ${slotHTML('offHand',  'Off Hand')}
      </div>
    </div>`;
}

function _attachEquipListeners(hero, panel) {
  panel.querySelectorAll('.hd-equip-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => { btn.style.boxShadow = '0 0 10px #7B2FBE'; });
    btn.addEventListener('mouseleave', () => { btn.style.boxShadow = ''; });
    btn.addEventListener('click', () => openWeaponPicker(hero.id, btn.dataset.slot));
  });
  panel.querySelectorAll('.hd-unequip-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => { btn.style.boxShadow = '0 0 10px #7B2FBE'; });
    btn.addEventListener('mouseleave', () => { btn.style.boxShadow = ''; });
    btn.addEventListener('click', () => {
      unequipWeapon(hero.id, btn.dataset.slot);
      refreshHeroDetail();
    });
  });
}

// ─── Proficiency section HTML ──────────────────────────────
function _buildProfSectionHTML(hero) {
  if (!hero.weaponProficiency) return '';
  const allTypes = ['Sword','Staff','Bow','Dagger','Shield','Spear','Axe'];

  const cells = allTypes.map(wt => {
    const prof    = hero.weaponProficiency[wt] || { battles: 0, dungeonRuns: 0, tier: null };
    const tierCol = prof.tier === 'Beginner' ? '#4CAF50' : '#666688';
    const tierStr = prof.tier || '—';
    const debugInfo = debugMode
      ? `<div style="color:#00FFFF;font-size:9px">${prof.battles}B / ${prof.dungeonRuns}D</div>`
      : '';
    return `
      <div style="background:#0D0010;border:1px solid #2A003A;padding:8px 6px;text-align:center;min-width:72px">
        <div style="font-size:16px">${WEAPON_ICONS[wt] || '?'}</div>
        <div style="color:#C8C8E0;font-size:9px;letter-spacing:1px;margin-top:2px">${wt}</div>
        <div style="color:${tierCol};font-size:10px;margin-top:3px">${tierStr}</div>
        ${debugInfo}
      </div>`;
  }).join('');

  return `
    <div style="border-top:1px solid #2A003A;padding-top:16px;margin-bottom:20px;font-family:'Courier New',monospace">
      <div style="color:#C0C0D0;font-size:12px;letter-spacing:2px;margin-bottom:10px">[ WEAPON PROFICIENCY ]</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">${cells}</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// WEAPON PICKER (from EQUIP button in hero detail)
// ═══════════════════════════════════════════════════════════

function openWeaponPicker(heroId, slot) {
  _wpHeroId     = heroId;
  _wpSlot       = slot;
  _wpSortMode   = 'rarity';
  _wpFilterType = 'All';

  document.getElementById('weapon-picker-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'weapon-picker-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:1700;
    display:flex;align-items:center;justify-content:center;pointer-events:all;`;

  const slotLabel = slot === 'mainHand' ? 'MAIN HAND' : 'OFF HAND';
  const allTypes  = ['Sword','Staff','Bow','Dagger','Shield','Spear','Axe'];

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 20px #7B2FBE,inset 0 0 20px rgba(123,47,190,0.1);
    padding:28px 36px;width:720px;max-height:82vh;
    display:flex;flex-direction:column;font-family:'Courier New',monospace;
    opacity:0;transform:translateY(18px);transition:opacity 0.22s ease,transform 0.22s ease;`;

  const filterBtns = ['All', ...allTypes].map(t =>
    `<button class="sort-btn wp-filter-btn" data-wpfilter="${t}"
       style="font-size:10px;padding:4px 10px">${t === 'All' ? '[ All ]' : `${WEAPON_ICONS[t] || ''} ${t}`}</button>`
  ).join('');

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px;gap:12px">
      <div style="color:#FFFFFF;font-size:14px;letter-spacing:2px">[ SELECT WEAPON — ${slotLabel} ]</div>
      <button id="wp-close-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:12px;padding:6px 16px;
               cursor:pointer;letter-spacing:1px;white-space:nowrap;flex-shrink:0;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ × CLOSE ]</button>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap">
      <span style="color:#E8D5FF;font-size:11px">Sort:</span>
      <button class="sort-btn" data-wpsort="rarity" onclick="_wpSetSort('rarity')">[ Rarity ★ ]</button>
      <button class="sort-btn" data-wpsort="type"   onclick="_wpSetSort('type')">[ Type ]</button>
      <button class="sort-btn" data-wpsort="recent" onclick="_wpSetSort('recent')">[ Recent ]</button>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:16px;flex-wrap:wrap">
      <span style="color:#E8D5FF;font-size:11px">Filter:</span>
      ${filterBtns}
    </div>
    <div id="wp-grid-wrap" style="overflow-y:auto;flex:1;padding:4px;"></div>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  panel.querySelector('#wp-close-btn').addEventListener('click', closeWeaponPicker);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeWeaponPicker(); });

  panel.querySelectorAll('.wp-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { _wpFilterType = btn.dataset.wpfilter; _wpRefreshGrid(); });
  });

  _wpUpdateSortBtns();
  _wpRefreshGrid();
}

function closeWeaponPicker() {
  const overlay = document.getElementById('weapon-picker-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

function _wpSetSort(mode) {
  _wpSortMode = mode;
  _wpUpdateSortBtns();
  _wpRefreshGrid();
}

function _wpUpdateSortBtns() {
  document.querySelectorAll('[data-wpsort]').forEach(b => {
    b.classList.toggle('active', b.dataset.wpsort === _wpSortMode);
  });
  document.querySelectorAll('.wp-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.wpfilter === _wpFilterType);
  });
}

function _wpRefreshGrid() {
  const wrap = document.getElementById('wp-grid-wrap');
  if (!wrap) return;

  let weapons = gameState.inventory.filter(i => i.type === 'weapon');
  if (_wpFilterType !== 'All') weapons = weapons.filter(w => w.weaponType === _wpFilterType);

  if (weapons.length === 0) {
    wrap.innerHTML = `<div style="color:#E8D5FF;font-size:13px;text-align:center;padding:30px 0;letter-spacing:1px">[ No weapons match the current filter ]</div>`;
    return;
  }

  const all = gameState.inventory.filter(i => i.type === 'weapon');
  switch (_wpSortMode) {
    case 'rarity': weapons.sort((a, b) => b.rarity - a.rarity || all.indexOf(b) - all.indexOf(a)); break;
    case 'type':   weapons.sort((a, b) => a.weaponType.localeCompare(b.weaponType) || b.rarity - a.rarity); break;
    case 'recent': weapons = [...weapons].reverse(); break;
  }

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(4,160px);gap:12px;';

  weapons.forEach(w => {
    const card = _buildWeaponCardEl(w, true);
    card.addEventListener('click', () => {
      equipWeapon(_wpHeroId, w.id, _wpSlot);
      closeWeaponPicker();
      setTimeout(() => refreshHeroDetail(), 180);
    });
    grid.appendChild(card);
  });

  wrap.innerHTML = '';
  wrap.appendChild(grid);
  _wpUpdateSortBtns();
}

// ─── Weapon card builder (shared: picker + inventory) ──────
function _buildWeaponCardEl(w, showEquippedLabel) {
  const col   = RARITY_BORDER[w.rarity] || '#C0C0D0';
  const stars = '★'.repeat(w.rarity);
  const icon  = WEAPON_ICONS[w.weaponType] || '?';
  const s     = w.stats || {};

  // Best flat stat preview
  const flatEntries = [
    { label: 'STR', v: s.flatSTR || 0 },
    { label: 'INT', v: s.flatINT || 0 },
    { label: 'HP',  v: s.flatHP  || 0 },
    { label: 'AGI', v: s.flatAGI || 0 },
  ].filter(e => e.v !== 0).sort((a, b) => Math.abs(b.v) - Math.abs(a.v));

  const pctEntries = [
    { label: 'STR', v: s.pctSTR || 0 },
    { label: 'INT', v: s.pctINT || 0 },
    { label: 'HP',  v: s.pctHP  || 0 },
    { label: 'AGI', v: s.pctAGI || 0 },
  ].filter(e => e.v !== 0).sort((a, b) => b.v - a.v);

  const topFlat = flatEntries[0];
  const topPct  = pctEntries[0];

  let equippedBadge = '';
  if (showEquippedLabel && w.equippedTo) {
    const owner = gameState.inventory.find(i => i.id === w.equippedTo && i.type === 'hero');
    if (owner) {
      equippedBadge = `<div style="color:#FFD700;font-size:9px;text-align:center;margin-top:4px;letter-spacing:1px">[ Equipped: ${escHtml(owner.name)} ]</div>`;
    }
  }

  const card = document.createElement('div');
  card.style.cssText = `
    width:160px;min-height:180px;background:#12001A;border:2px solid ${col};
    cursor:pointer;font-family:'Courier New',monospace;transition:box-shadow 0.2s;
    display:flex;flex-direction:column;align-items:center;padding:12px 8px;box-sizing:border-box;`;
  card.innerHTML = `
    <div style="font-size:28px;margin-bottom:6px">${icon}</div>
    <div style="color:#FFFFFF;font-size:10px;text-align:center;margin-bottom:4px;line-height:1.3">${escHtml(w.name)}</div>
    <div style="color:${col};font-size:11px;margin-bottom:4px">${stars}</div>
    <div style="color:#C8C8E0;font-size:10px;margin-bottom:6px">${escHtml(w.weaponType)}</div>
    <div style="font-size:10px;text-align:center;color:#C8C8E0;line-height:1.5">
      ${topFlat ? `<div>${topFlat.v > 0 ? '+' : ''}${topFlat.v} ${topFlat.label}</div>` : ''}
      ${topPct  ? `<div>+${Math.round(topPct.v * 100)}% ${topPct.label}</div>` : ''}
    </div>
    ${equippedBadge}`;
  if (w.isNew) {
    const nb = document.createElement('div');
    nb.style.cssText = 'position:absolute;top:5px;left:5px;background:#CC0000;color:#FFFFFF;font-size:9px;padding:2px 4px;font-family:monospace;letter-spacing:1px;';
    nb.textContent   = '[ NEW ]';
    card.style.position = 'relative';
    card.appendChild(nb);
  }
  card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 0 12px #7B2FBE'; });
  card.addEventListener('mouseleave', () => { card.style.boxShadow = ''; });
  return card;
}

// ═══════════════════════════════════════════════════════════
// WEAPONS INVENTORY TAB
// ═══════════════════════════════════════════════════════════

function showWeaponsTabContent(container) {
  _wiSortMode   = 'rarity';
  _wiFilterType = 'All';

  const allTypes  = ['Sword','Staff','Bow','Dagger','Shield','Spear','Axe'];
  const filterBtns = ['All', ...allTypes].map(t =>
    `<button class="sort-btn wi-filter-btn" data-wifilter="${t}"
       style="font-size:10px;padding:4px 10px">${t === 'All' ? '[ All ]' : `${WEAPON_ICONS[t] || ''} ${t}`}</button>`
  ).join('');

  container.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;flex-wrap:wrap;gap:10px">
      <div style="color:#FFFFFF;font-size:16px;letter-spacing:2px">[ WEAPON INVENTORY ]</div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <span style="color:#E8D5FF;font-size:11px">Sort:</span>
        <button class="sort-btn" data-wisort="rarity" onclick="_wiSetSort('rarity')">[ Rarity ★ ]</button>
        <button class="sort-btn" data-wisort="type"   onclick="_wiSetSort('type')">[ Type ]</button>
        <button class="sort-btn" data-wisort="recent" onclick="_wiSetSort('recent')">[ Recent ]</button>
      </div>
    </div>
    <div style="display:flex;gap:6px;align-items:center;margin-bottom:20px;flex-wrap:wrap">
      <span style="color:#E8D5FF;font-size:11px">Filter:</span>
      ${filterBtns}
    </div>
    <div id="weapon-grid"></div>`;

  container.querySelectorAll('.wi-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => { _wiFilterType = btn.dataset.wifilter; refreshWeaponGrid(); });
  });

  _wiUpdateSortBtns();
  refreshWeaponGrid();
}

function _wiSetSort(mode) {
  _wiSortMode = mode;
  _wiUpdateSortBtns();
  refreshWeaponGrid();
}

function _wiUpdateSortBtns() {
  document.querySelectorAll('[data-wisort]').forEach(b => {
    b.classList.toggle('active', b.dataset.wisort === _wiSortMode);
  });
  document.querySelectorAll('.wi-filter-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.wifilter === _wiFilterType);
  });
}

function refreshWeaponGrid() {
  const grid = document.getElementById('weapon-grid');
  if (!grid) return;

  let weapons = gameState.inventory.filter(i => i.type === 'weapon');
  if (_wiFilterType !== 'All') weapons = weapons.filter(w => w.weaponType === _wiFilterType);

  if (weapons.length === 0) {
    grid.style.display = 'block';
    grid.innerHTML = `<div style="color:#C0C0D0;font-size:14px;letter-spacing:1px;text-align:center;margin-top:60px">[ No weapons in inventory. Visit the Summon menu. ]</div>`;
    return;
  }

  const all = gameState.inventory.filter(i => i.type === 'weapon');
  switch (_wiSortMode) {
    case 'rarity': weapons.sort((a, b) => b.rarity - a.rarity || all.indexOf(b) - all.indexOf(a)); break;
    case 'type':   weapons.sort((a, b) => a.weaponType.localeCompare(b.weaponType) || b.rarity - a.rarity); break;
    case 'recent': weapons = [...weapons].reverse(); break;
  }

  grid.style.cssText = 'display:grid;grid-template-columns:repeat(5,180px);gap:16px;';
  grid.innerHTML = '';

  weapons.forEach(w => {
    // Larger card for inventory (180px wide)
    const col   = RARITY_BORDER[w.rarity] || '#C0C0D0';
    const stars = '★'.repeat(w.rarity);
    const icon  = WEAPON_ICONS[w.weaponType] || '?';

    let ownerLine = '';
    if (w.equippedTo) {
      const owner = gameState.inventory.find(i => i.id === w.equippedTo && i.type === 'hero');
      ownerLine = owner
        ? `<div style="color:#FFD700;font-size:10px;margin-top:4px">[ ${escHtml(owner.name)} ]</div>`
        : '';
    } else {
      ownerLine = `<div style="color:#8888AA;font-size:10px;margin-top:4px">[ Unequipped ]</div>`;
    }

    const card = document.createElement('div');
    card.style.cssText = `
      width:180px;min-height:200px;background:#12001A;border:2px solid ${col};
      cursor:pointer;font-family:'Courier New',monospace;position:relative;
      transition:box-shadow 0.2s;display:flex;flex-direction:column;
      align-items:center;padding:14px 10px;box-sizing:border-box;`;
    card.innerHTML = `
      <div style="font-size:32px;margin-bottom:8px">${icon}</div>
      <div style="color:#FFFFFF;font-size:11px;text-align:center;margin-bottom:4px;line-height:1.3">${escHtml(w.name)}</div>
      <div style="color:${col};font-size:12px;margin-bottom:4px">${stars}</div>
      <div style="color:#C8C8E0;font-size:10px">${escHtml(w.weaponType)}</div>
      ${ownerLine}`;

    if (w.isNew) {
      const nb = document.createElement('div');
      nb.style.cssText = 'position:absolute;top:5px;left:5px;background:#CC0000;color:#FFFFFF;font-size:9px;padding:2px 4px;font-family:monospace;letter-spacing:1px;';
      nb.textContent   = '[ NEW ]';
      card.appendChild(nb);
    }

    card.addEventListener('mouseenter', () => { card.style.boxShadow = '0 0 14px #7B2FBE'; });
    card.addEventListener('mouseleave', () => { card.style.boxShadow = ''; });
    card.addEventListener('click', () => {
      if (w.isNew) { w.isNew = false; saveGame(); card.querySelector('[data-new]')?.remove(); }
      openWeaponDetail(w);
    });
    grid.appendChild(card);
  });
}

// ─── Weapon detail overlay ─────────────────────────────────
function openWeaponDetail(weapon) {
  document.getElementById('weapon-detail-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'weapon-detail-overlay';
  overlay.style.cssText = `
    position:fixed;top:0;left:0;width:100%;height:100%;
    background:rgba(0,0,0,0.88);z-index:1700;
    display:flex;align-items:center;justify-content:center;pointer-events:all;`;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background:#12001A;border:2px solid #C0C0D0;
    box-shadow:0 0 20px #7B2FBE,inset 0 0 20px rgba(123,47,190,0.1);
    padding:30px 36px;width:520px;max-height:82vh;overflow-y:auto;
    font-family:'Courier New',monospace;
    opacity:0;transform:translateY(18px);transition:opacity 0.22s ease,transform 0.22s ease;`;

  const col   = RARITY_BORDER[weapon.rarity] || '#C0C0D0';
  const stars = '★'.repeat(weapon.rarity);
  const icon  = WEAPON_ICONS[weapon.weaponType] || '?';
  const s     = weapon.stats || {};

  const statRows = [
    { label: 'Flat STR', v: s.flatSTR, pct: false },
    { label: 'Flat INT', v: s.flatINT, pct: false },
    { label: 'Flat HP',  v: s.flatHP,  pct: false },
    { label: 'Flat AGI', v: s.flatAGI, pct: false },
    { label: 'STR %',   v: s.pctSTR,  pct: true  },
    { label: 'INT %',   v: s.pctINT,  pct: true  },
    { label: 'HP %',    v: s.pctHP,   pct: true  },
    { label: 'AGI %',   v: s.pctAGI,  pct: true  },
  ].filter(r => r.v && r.v !== 0);

  const statsHTML = statRows.map(r => {
    const val  = r.pct ? `+${Math.round(r.v * 100)}%` : (r.v > 0 ? `+${r.v}` : `${r.v}`);
    const col2 = r.v < 0 ? '#FF6666' : '#FFFFFF';
    return `<div><span class="detail-label">${r.label}: </span><span style="color:${col2}">${val}</span></div>`;
  }).join('');

  let equippedLine = '— Not equipped —';
  if (weapon.equippedTo) {
    const owner = gameState.inventory.find(i => i.id === weapon.equippedTo && i.type === 'hero');
    if (owner) equippedLine = escHtml(owner.name);
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px;gap:12px">
      <div>
        <div style="color:#FFFFFF;font-size:17px;font-weight:bold">${escHtml(weapon.name)}</div>
        <div style="color:${col};font-size:14px;margin-top:4px">${stars}</div>
      </div>
      <button id="wd-close-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;font-family:'Courier New',monospace;
               font-size:12px;padding:7px 18px;cursor:pointer;letter-spacing:1px;white-space:nowrap;flex-shrink:0;
               transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 10px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ × CLOSE ]</button>
    </div>

    <div style="font-size:48px;text-align:center;margin-bottom:20px">${icon}</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 32px;font-size:12px;margin-bottom:20px">
      <div><span class="detail-label">Type: </span><span class="detail-value">${icon} ${escHtml(weapon.weaponType)}</span></div>
      <div><span class="detail-label">Rarity: </span><span style="color:${col}">${stars}</span></div>
      ${statsHTML}
      <div style="grid-column:1/-1"><span class="detail-label">Equipped to: </span><span class="detail-value">${equippedLine}</span></div>
    </div>

    <div id="wd-action-area"></div>`;

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  panel.querySelector('#wd-close-btn').addEventListener('click', closeWeaponDetail);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeWeaponDetail(); });

  _renderWeaponDetailActions(weapon, panel.querySelector('#wd-action-area'));
}

function closeWeaponDetail() {
  const overlay = document.getElementById('weapon-detail-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s ease, transform 0.16s ease';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

function _renderWeaponDetailActions(weapon, area) {
  area.innerHTML = '';

  if (weapon.equippedTo) {
    // Show unequip button
    const btn = document.createElement('button');
    btn.textContent = '[ UNEQUIP ]';
    btn.style.cssText = `
      background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
      font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
      cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s;`;
    btn.addEventListener('mouseenter', () => { btn.style.boxShadow = '0 0 12px #7B2FBE'; });
    btn.addEventListener('mouseleave', () => { btn.style.boxShadow = ''; });
    btn.addEventListener('click', () => {
      const owner = gameState.inventory.find(i => i.id === weapon.equippedTo && i.type === 'hero');
      if (owner && owner.equippedWeapons) {
        if (owner.equippedWeapons.mainHand === weapon.id) unequipWeapon(owner.id, 'mainHand');
        else if (owner.equippedWeapons.offHand === weapon.id) unequipWeapon(owner.id, 'offHand');
      }
      closeWeaponDetail();
      refreshWeaponGrid();
    });
    area.appendChild(btn);
  } else {
    // Show EQUIP TO HERO → hero list → slot picker flow
    const btn = document.createElement('button');
    btn.textContent = '[ EQUIP TO HERO ]';
    btn.style.cssText = `
      background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
      font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
      cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s;`;
    btn.addEventListener('mouseenter', () => { btn.style.boxShadow = '0 0 12px #7B2FBE'; });
    btn.addEventListener('mouseleave', () => { btn.style.boxShadow = ''; });
    btn.addEventListener('click', () => _showWdHeroPicker(weapon, area));
    area.appendChild(btn);
  }
}

function _showWdHeroPicker(weapon, area) {
  const heroes = gameState.inventory.filter(i => i.type === 'hero');
  if (heroes.length === 0) {
    area.innerHTML = `<div style="color:#E8D5FF;font-size:12px;letter-spacing:1px">[ No heroes in inventory ]</div>`;
    return;
  }
  area.innerHTML = `<div style="color:#C0C0D0;font-size:11px;letter-spacing:1px;margin-bottom:10px">Select a hero to equip to:</div>`;
  const grid = document.createElement('div');
  grid.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

  heroes.forEach(hero => {
    const col   = RARITY_BORDER[hero.rarity] || '#C0C0D0';
    const hbtn  = document.createElement('button');
    hbtn.style.cssText = `
      background:#0D0010;border:2px solid ${col};color:#FFFFFF;
      font-family:'Courier New',monospace;font-size:11px;
      padding:6px 12px;cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s;`;
    hbtn.textContent = `${'★'.repeat(hero.rarity)} ${hero.name}`;
    hbtn.addEventListener('mouseenter', () => { hbtn.style.boxShadow = `0 0 8px ${col}`; });
    hbtn.addEventListener('mouseleave', () => { hbtn.style.boxShadow = ''; });
    hbtn.addEventListener('click', () => _showWdSlotPicker(weapon, hero, area));
    grid.appendChild(hbtn);
  });
  area.appendChild(grid);
}

function _showWdSlotPicker(weapon, hero, area) {
  area.innerHTML = `
    <div style="color:#C0C0D0;font-size:11px;letter-spacing:1px;margin-bottom:10px">
      Equip to <span style="color:#FFFFFF">${escHtml(hero.name)}</span> — select slot:
    </div>
    <div style="display:flex;gap:10px">
      <button id="wd-slot-mh" style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
        font-family:'Courier New',monospace;font-size:12px;padding:8px 18px;cursor:pointer;
        letter-spacing:1px;transition:box-shadow 0.2s">[ Main Hand ]</button>
      <button id="wd-slot-oh" style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
        font-family:'Courier New',monospace;font-size:12px;padding:8px 18px;cursor:pointer;
        letter-spacing:1px;transition:box-shadow 0.2s">[ Off Hand ]</button>
    </div>`;

  area.querySelector('#wd-slot-mh').addEventListener('click', () => {
    equipWeapon(hero.id, weapon.id, 'mainHand');
    closeWeaponDetail();
    refreshWeaponGrid();
  });
  area.querySelector('#wd-slot-oh').addEventListener('click', () => {
    equipWeapon(hero.id, weapon.id, 'offHand');
    closeWeaponDetail();
    refreshWeaponGrid();
  });
}

// ─── HERO DETAIL PARTY BUTTON ──────────────────────────────
function renderHeroDetailPartyBtn(hero) {
  const area = document.getElementById('hd-party-btn-area');
  if (!area) return;

  if (hero.inParty) {
    area.innerHTML = `
      <button id="hd-party-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
               cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ − REMOVE FROM PARTY ]</button>`;
    document.getElementById('hd-party-btn').addEventListener('click', () => {
      removeFromParty(hero.id);
      showToast(`[ ${escHtml(hero.name)} removed from party ]`, '#C0C0D0');
      renderHeroDetailPartyBtn(hero);
      if (heroesActiveTab === 'party') refreshPartyTab();
      refreshHeroGrid();
    });
  } else if (hero.inDungeon) {
    area.innerHTML = `
      <button id="hd-party-btn" disabled
        style="background:#1A0025;border:2px solid #333348;color:#333348;
               font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
               cursor:not-allowed;letter-spacing:1px" title="Hero is on expedition"
        >[ + ADD TO PARTY ]</button>
      <div style="color:#F1C40F;font-size:10px;margin-top:6px;letter-spacing:1px;font-family:'Courier New',monospace">
        [ Hero is on expedition ]</div>`;
  } else {
    area.innerHTML = `
      <button id="hd-party-btn"
        style="background:#1A0025;border:2px solid #F1C40F;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:13px;padding:9px 22px;
               cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 12px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ + ADD TO PARTY ]</button>`;
    document.getElementById('hd-party-btn').addEventListener('click', () => {
      const result = addToParty(hero.id);
      if (result.ok) {
        showToast(`[ ${escHtml(hero.name)} added to party ]`, '#90EE90');
        renderHeroDetailPartyBtn(hero);
        if (heroesActiveTab === 'party') refreshPartyTab();
        refreshHeroGrid();
      } else if (result.reason === 'full') {
        showToast('[ Party is full ]', '#FF4444');
      }
    });
  }
}

function closeHeroDetail() {
  const overlay = document.getElementById('hero-detail-overlay');
  const panel   = document.getElementById('hero-detail-panel');
  panel.classList.remove('visible');
  panel.classList.add('hiding');
  setTimeout(() => {
    overlay.style.display = 'none';
    panel.classList.remove('hiding');
    _currentDetailHero = null;
  }, 180);
}

// ═══════════════════════════════════════════════════════════
// HERO AFFINITY SYSTEM
// ═══════════════════════════════════════════════════════════

// ─── AFFINITY PANEL OVERLAY ───────────────────────────────
// Opens on top of the hero detail panel (z-index 1650).
function openAffinityPanel(hero) {
  const existing = document.getElementById('affinity-panel-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'affinity-panel-overlay';
  overlay.style.cssText =
    'position:fixed;inset:0;z-index:1650;display:flex;align-items:center;' +
    'justify-content:center;background:rgba(0,0,0,0.80);pointer-events:all;';

  const panel = document.createElement('div');
  panel.id = 'affinity-panel-inner';
  panel.style.cssText =
    'background:#12001A;border:2px solid #FF69B4;' +
    'box-shadow:0 0 20px rgba(255,105,180,0.35),inset 0 0 20px rgba(255,105,180,0.05);' +
    'padding:28px 32px;width:480px;max-height:82vh;overflow-y:auto;' +
    'font-family:\'Courier New\',monospace;' +
    'opacity:0;transform:translateY(16px);transition:opacity 0.22s,transform 0.22s;';

  overlay.appendChild(panel);
  document.getElementById('ui-layer').appendChild(overlay);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0)';
  }));

  overlay.addEventListener('click', e => {
    if (e.target === overlay) _closeAffinityPanel();
  });

  _renderAffinityPanel(hero);
}

function _closeAffinityPanel() {
  const overlay = document.getElementById('affinity-panel-overlay');
  if (!overlay) return;
  const panel = overlay.firstElementChild;
  panel.style.transition = 'opacity 0.16s,transform 0.16s';
  panel.style.opacity    = '0';
  panel.style.transform  = 'translateY(-12px)';
  setTimeout(() => overlay.remove(), 170);
}

function _renderAffinityPanel(hero) {
  const panel = document.getElementById('affinity-panel-inner');
  if (!panel) return;

  const affinity      = hero.affinity || 0;
  const today         = new Date().toISOString().slice(0, 10);
  const talkAvail     = hero.talkDate !== today;
  const nextMs        = AFFINITY_MILESTONES.find(m => affinity < m.threshold);
  const nextMsIdx     = nextMs ? AFFINITY_MILESTONES.indexOf(nextMs) : AFFINITY_MILESTONES.length;
  const prevThresh    = nextMsIdx > 0 ? AFFINITY_MILESTONES[nextMsIdx - 1].threshold : 0;
  const nextThresh    = nextMs ? nextMs.threshold : _AFFINITY_MAX;
  const affinityMaxed = affinity >= _AFFINITY_MAX;
  const fillPct       = affinityMaxed ? 100
    : Math.min(100, Math.round(((affinity - prevThresh) / (nextThresh - prevThresh)) * 100));

  // Milestone rows
  const granted = Array.isArray(hero.affinityMilestonesGranted) ? hero.affinityMilestonesGranted : [];
  const msRowsHTML = AFFINITY_MILESTONES.map(m => {
    const reached   = affinity >= m.threshold;
    const rewarded  = granted.includes(m.threshold);
    const r         = m.reward;
    const rewardStr = r.gems && r.skillTierUp   ? `💎 ${r.gems} Gems + Skill Tier Up`
                    : r.gems && r.latentTalent  ? `💎 ${r.gems} Gems + Latent Talent`
                    : r.gems                    ? `💎 ${r.gems} Gems`
                    : r.talentBoost             ? `⭐ Talent +${r.talentBoost}`
                    : r.backstory               ? `📖 Backstory Unlocked`
                    : '—';
    const rowCol    = reached ? '#4CAF50' : '#555566';
    const checkmark = rewarded ? '✓ ' : reached ? '! ' : '  ';
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:7px 0;border-bottom:1px solid #1A0025;font-size:11px">
        <span style="color:${rowCol};min-width:24px">${checkmark}</span>
        <span style="color:${rowCol};min-width:60px">${m.threshold}</span>
        <span style="color:${reached ? '#E8D5FF' : '#555566'};flex:1">${escHtml(m.label)}</span>
        <span style="color:${reached ? '#F1C40F' : '#444460'};text-align:right">${rewardStr}</span>
      </div>`;
  }).join('');

  // Dialogue
  const dialogue = (typeof getHeroDialogue === 'function')
    ? getHeroDialogue(hero, affinity)
    : '...';

  const talkBorder = talkAvail ? '#FF69B4' : '#333348';
  const talkColor  = talkAvail ? '#FFFFFF' : '#333348';
  const talkCursor = talkAvail ? 'pointer' : 'not-allowed';
  const talkLabel  = talkAvail ? '[ TALK (+20 Affinity) ]' : '[ ✓ TALKED TODAY ]';

  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
      <div style="color:#FF69B4;font-size:15px;letter-spacing:2px">[ AFFINITY ]</div>
      <button id="affinity-close-btn"
        style="background:#1A0025;border:2px solid #C0C0D0;color:#FFFFFF;
               font-family:'Courier New',monospace;font-size:12px;padding:6px 16px;
               cursor:pointer;letter-spacing:1px;transition:box-shadow 0.2s"
        onmouseover="this.style.boxShadow='0 0 8px #7B2FBE'"
        onmouseout="this.style.boxShadow=''">[ × ]</button>
    </div>

    <div style="color:#FFFFFF;font-size:14px;letter-spacing:1px;margin-bottom:4px">${escHtml(hero.name)}</div>
    <div style="color:#E8D5FF;font-size:11px;margin-bottom:16px">
      ${affinity} / ${affinityMaxed ? _AFFINITY_MAX + ' ★ MAX' : nextThresh + ' — ' + escHtml(nextMs ? nextMs.label : '—')}
    </div>

    <div style="background:#2A003A;height:7px;border-radius:4px;margin-bottom:20px">
      <div style="background:#FF69B4;width:${fillPct}%;height:7px;border-radius:4px"></div>
    </div>

    <div style="border:1px solid #2A003A;padding:14px 16px;margin-bottom:20px;
                font-style:italic;color:#E8D5FF;font-size:12px;line-height:1.6;min-height:48px">
      "${escHtml(dialogue)}"
    </div>

    <button id="affinity-talk-btn"
      style="width:100%;background:#1A0025;border:2px solid ${talkBorder};color:${talkColor};
             font-family:'Courier New',monospace;font-size:13px;padding:10px;
             cursor:${talkCursor};letter-spacing:1px;margin-bottom:24px;transition:box-shadow 0.2s"
      ${talkAvail ? '' : 'disabled'}
      onmouseover="if(!this.disabled)this.style.boxShadow='0 0 12px #FF69B4'"
      onmouseout="this.style.boxShadow=''">${talkLabel}</button>

    <div style="color:#C0C0D0;font-size:11px;letter-spacing:2px;margin-bottom:10px">[ MILESTONES ]</div>
    ${msRowsHTML}`;

  panel.querySelector('#affinity-close-btn').addEventListener('click', _closeAffinityPanel);

  const talkBtn = panel.querySelector('#affinity-talk-btn');
  if (talkBtn && talkAvail) {
    talkBtn.addEventListener('click', () => {
      talkBtn.disabled = true;
      talkToHero(hero.id);
    });
  }
}

// ─── TALK TO HERO ─────────────────────────────────────────
// +20 affinity, once per day. Triggers quest hook and milestone check.
function talkToHero(heroId) {
  const hero = gameState.inventory.find(h => h.id === heroId && h.type === 'hero');
  if (!hero) return;

  const today = new Date().toISOString().slice(0, 10);
  if (hero.talkDate === today) return;  // already talked today

  hero.affinity = (hero.affinity || 0) + 20;
  hero.talkDate = today;
  saveGame();

  if (typeof progressDailyQuest === 'function') progressDailyQuest('talkToHero');

  _checkAffinityMilestones(hero);
  _renderAffinityPanel(hero);

  // Refresh the mini-bar in the hero detail (if still open)
  if (_currentDetailHero && _currentDetailHero.id === heroId) {
    refreshHeroDetail();
  }
}

// ─── MILESTONE CHECK ──────────────────────────────────────
// Auto-grants any milestone rewards the hero has newly reached.
function _checkAffinityMilestones(hero) {
  if (!Array.isArray(hero.affinityMilestonesGranted)) {
    hero.affinityMilestonesGranted = [];
  }
  const affinity = hero.affinity || 0;
  AFFINITY_MILESTONES.forEach(m => {
    if (affinity >= m.threshold && !hero.affinityMilestonesGranted.includes(m.threshold)) {
      hero.affinityMilestonesGranted.push(m.threshold);
      _grantAffinityMilestone(hero, m);
    }
  });
  saveGame();
}

function _grantAffinityMilestone(hero, milestone) {
  const r = milestone.reward;

  if (r.gems) {
    if (typeof sendMail === 'function') {
      sendMail({
        from:    hero.name,
        subject: 'Affinity Milestone: ' + milestone.label,
        body:    hero.name + ' has reached ' + milestone.threshold + ' affinity! You\'ve grown closer.',
        rewards: { gems: r.gems },
      });
    }
  }

  if (r.talentBoost) {
    hero.talent = Math.min(10, parseFloat(((hero.talent || 0) + r.talentBoost).toFixed(1)));
    console.log('[Affinity] Talent boost for', hero.name, '+', r.talentBoost, '→', hero.talent);
    // NOTE: full stat rebuild (buildHeroStats) deferred — see TODOS.md
  }

  if (r.backstory) {
    console.log('[Affinity] Backstory unlock stub for', hero.name, 'at', milestone.threshold);
    // TODO: open backstory modal — see TODOS.md
  }

  if (r.latentTalent) {
    console.log('[Affinity] Latent Talent stub for', hero.name);
    // TODO: implement Latent Talent system — see TODOS.md
  }

  if (r.skillTierUp) {
    console.log('[Affinity] Skill tier-up stub for', hero.name);
    // TODO: implement skill tier increase — see TODOS.md
  }
}

window.talkToHero = talkToHero;

// ─── UTILITY ──────────────────────────────────────────────
// escHtml, talentColor, talentTierLabel → js/ui/helpers.js

function registerSceneHeroes() {
  // All heroes scene functions are declared globally above.
}
