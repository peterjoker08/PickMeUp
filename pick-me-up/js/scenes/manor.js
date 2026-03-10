// ═══════════════════════════════════════════════════════════
// MANOR SCENE — Town Hall / base management (Clash-of-Clans style hub)
// ═══════════════════════════════════════════════════════════
(function () {

  function showManorScene() {
    resetHubMain();
    const main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';
    main.innerHTML = `
      <div class="scene-header">
        <div class="scene-header-title">
          <h2>⛏ MANOR</h2>
          <p>Manage your base, upgrade buildings, collect resources</p>
        </div>
      </div>

      <div style="flex:1;display:flex;align-items:center;justify-content:center;
                  color:var(--text-muted);font-size:14px;letter-spacing:2px">
        [ Manor — Coming Soon ]
      </div>
    `;
  }

  function registerSceneManor() {
    // future: manor event listeners, building data, etc.
  }

  window.showManorScene    = showManorScene;
  window.registerSceneManor = registerSceneManor;
})();
