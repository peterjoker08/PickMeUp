// ═══════════════════════════════════════════════════════════
// DEBUG
// ═══════════════════════════════════════════════════════════
window.debugMode    = true;
window.currentScene = '';

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'D') {
    e.preventDefault();
    debugMode = !debugMode;
    const toast = document.getElementById('debug-toast');
    toast.textContent = debugMode ? '[ DEBUG MODE ON ]' : '[ DEBUG MODE OFF ]';
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 1500);
    // Live refresh if heroes scene is open
    if (currentScene === 'Heroes') refreshHeroGrid();
  }
});
