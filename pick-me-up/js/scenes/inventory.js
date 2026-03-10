// ═══════════════════════════════════════════════════════════
// INVENTORY SCENE — Items, materials, consumables
// ═══════════════════════════════════════════════════════════
(function () {

  function showInventoryScene() {
    resetHubMain();
    const main = document.getElementById('hub-main');
    main.className = 'hub-main--scene';
    main.innerHTML = `
      <div class="scene-header">
        <div class="scene-header-title">
          <h2>📦 INVENTORY</h2>
          <p>Items, materials, and consumables</p>
        </div>
      </div>

      <div style="flex:1;display:flex;align-items:center;justify-content:center;
                  color:var(--text-muted);font-size:14px;letter-spacing:2px">
        [ Inventory — Coming Soon ]
      </div>
    `;
  }

  function registerSceneInventory() {
    // future: inventory event listeners, item data, etc.
  }

  window.showInventoryScene    = showInventoryScene;
  window.registerSceneInventory = registerSceneInventory;
})();
