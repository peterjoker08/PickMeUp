// ═══════════════════════════════════════════════════════════
// BOOT SCENE
// ═══════════════════════════════════════════════════════════
function runBootScreen(onComplete) {
  const bootUI   = document.getElementById('boot-ui');
  const title    = document.getElementById('boot-title');
  const subtitle = document.getElementById('boot-subtitle');
  const rule     = document.getElementById('boot-rule');
  const statusEl = document.getElementById('boot-status');
  const barWrap  = document.getElementById('boot-bar-wrap');
  const barFill  = document.getElementById('boot-bar-fill');
  const fadeDrop = document.getElementById('boot-fade');
  bootUI.style.display = 'flex';

  setTimeout(() => title.style.opacity = '1', 200);
  setTimeout(() => subtitle.style.opacity = '1', 700);
  setTimeout(() => rule.style.opacity = '1', 1000);

  const statusText = "System Online  ·  Server: NEXUS-01  ·  Build 0.1.0";
  let si = 0;
  setTimeout(() => {
    function tickS() {
      if (si < statusText.length) { statusEl.textContent += statusText[si++]; setTimeout(tickS, 34); }
      else startBar();
    }
    tickS();
  }, 1200);

  function startBar() {
    barWrap.style.opacity = '1';
    let p = 0;
    const timer = setInterval(() => {
      p = Math.min(100, p + 100 / (1200 / 30));
      barFill.style.width = p + '%';
      if (p >= 100) { clearInterval(timer); setTimeout(fadeOutBoot, 400); }
    }, 30);
  }

  function fadeOutBoot() {
    fadeDrop.style.opacity = '1';
    setTimeout(() => {
      bootUI.style.display = 'none';
      fadeDrop.style.opacity = '0';
      onComplete();
    }, 500);
  }
}

function registerSceneBoot() {
  // runBootScreen() is stateless — called directly from runIntroFlow()
}
