// ═══════════════════════════════════════════════════════════
// SHARED UI HELPERS
// ═══════════════════════════════════════════════════════════
// Canonical constants and utility functions used across
// multiple scenes. Loaded before all scene scripts.

// ── Rarity border colours (hero cards + weapon cards) ─────
const RARITY_BORDER = {
  1: '#888899', 2: '#4CAF50', 3: '#4A90D9',
  4: '#9B59B6', 5: '#F1C40F', 6: '#E67E22', 7: '#FF6020'
};

// ── HTML-safe escape ──────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Talent display colour (0-10 scale) ────────────────────
function talentColor(t) {
  if (t < 3.0) return '#FF4444';
  if (t < 6.0) return '#FFD700';
  if (t < 9.0) return '#90EE90';
  return '#00FFFF';
}

// ── Talent tier label (0-10 scale) ────────────────────────
function talentTierLabel(t) {
  if (t < 3.0) return 'WEAK';
  if (t < 6.0) return 'AVERAGE';
  if (t < 9.0) return 'STRONG';
  return 'EXCEPTIONAL';
}

// ── Countdown formatter (ms → HH:MM:SS or MM:SS) ─────────
function formatCountdown(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${String(h).padStart(2, '0')}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

// ── Global Escape key handler ─────────────────────────────
// Closes the topmost overlay inside #ui-layer on Escape.
// Overlays must have [data-closeable] or a known ID pattern.
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  const uiLayer = document.getElementById('ui-layer');
  if (!uiLayer) return;

  // Ordered from highest z-index to lowest — close the topmost one only
  const knownOverlays = [
    'combat-overlay',
    'arena-floor-picker',
    'weapon-picker-overlay',
    'weapon-detail-overlay',
    'hero-picker-overlay',
    'tower-combat-overlay',
    'tower-precombat-overlay',
    'synth-result-overlay',
    'synth-confirm-overlay',
    'synth-picker-overlay',
    'promo-result-overlay',
    'promo-confirm-overlay',
    'promo-picker-overlay',
  ];

  for (const id of knownOverlays) {
    const el = document.getElementById(id);
    if (el) { el.remove(); return; }
  }

  // hero-detail-overlay uses display toggle, not remove
  const heroDetail = document.getElementById('hero-detail-overlay');
  if (heroDetail && heroDetail.style.display !== 'none') {
    if (typeof closeHeroDetail === 'function') closeHeroDetail();
    return;
  }
});
