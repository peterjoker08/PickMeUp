// ═══════════════════════════════════════════════════════════
// LOGIN REWARDS SCENE
// Daily login calendar matching the Figma design.
// ═══════════════════════════════════════════════════════════

(function () {

  const HERO_CARDS = [
    { day: 1 }, { day: 2 },
    { day: 3, badge: 'green' }, { day: 4, badge: 'gold' }, { day: 5, badge: 'gold' },
    { day: 6, badge: 'blue' }, { day: 7, badge: 'blue' }, { day: 8, badge: 'green' },
    { day: 9, badge: 'gold' }, { day: 10, badge: 'blue' }, { day: 11, badge: 'green' },
    { day: 12, badge: 'green' }, { day: 13, badge: 'blue' }, { day: 14, badge: 'gold' },
    { day: 15, badge: 'blue' }, { day: 16, badge: 'green' }, { day: 17, badge: 'blue' },
    { day: 18, badge: 'gold' }, { day: 19, badge: 'blue' }, { day: 20, badge: 'green' },
    { day: 21, badge: 'gold' }, { day: 22, badge: 'blue' }, { day: 23, badge: 'green' },
    { day: 24, badge: 'gold' }, { day: 25, badge: 'gold' }, { day: 26, badge: 'blue' },
    { day: 27, badge: 'green' }, { day: 28 },
  ];

  const BADGE_COLORS = { gold: '#eab308', blue: '#3b82f6', green: '#22c55e' };
  const MILESTONES   = [5, 10, 15, 20];

  // ── helpers ────────────────────────────────────────────────

  function _cardState(day, loginDays) {
    if (day <= loginDays) return 'claimed';
    if (day <= 27)        return 'unlocked';
    return 'locked';
  }

  function _cardHTML(card, loginDays) {
    const state    = _cardState(card.day, loginDays);
    const dayLabel = `<div style="font-size:9px;color:#756962;font-style:italic;font-weight:bold;text-align:center;margin-bottom:2px;">${card.day}</div>`;

    if (state === 'claimed') {
      return dayLabel + `
        <div style="position:relative;width:100%;padding-bottom:133%;">
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,#fde68a,#fcd34d);border-radius:5px;border:2px solid #f59e0b;display:flex;align-items:center;justify-content:center;">
            <span style="color:#92400e;font-size:16px;font-weight:bold;">&#10003;</span>
          </div>
        </div>`;
    }

    if (state === 'unlocked') {
      const badge = card.badge
        ? `<div style="position:absolute;bottom:3px;left:50%;transform:translateX(-50%);width:9px;height:9px;border-radius:50%;border:2px solid white;background:${BADGE_COLORS[card.badge]};"></div>`
        : '';
      return dayLabel + `
        <div style="position:relative;width:100%;padding-bottom:133%;">
          <div style="position:absolute;inset:0;background:linear-gradient(135deg,#a855f7,#7c3aed);border-radius:5px;border:2px solid #c4b5fd;overflow:hidden;">
            ${badge}
          </div>
        </div>`;
    }

    // locked
    return dayLabel + `
      <div style="position:relative;width:100%;padding-bottom:133%;">
        <div style="position:absolute;inset:0;background:linear-gradient(135deg,#b45309,#92400e);border-radius:5px;border:2px solid #d97706;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fbbf24;font-size:16px;">?</span>
        </div>
      </div>`;
  }

  function _milestoneHTML(milestone, loginDays) {
    const reached = loginDays >= milestone;
    const newBadge = milestone === 20 && !reached
      ? `<div style="position:absolute;top:-8px;right:-8px;background:#fbbf24;color:#78350f;padding:1px 5px;border-radius:999px;font-size:8px;font-weight:bold;white-space:nowrap;">New</div>`
      : '';

    return `
      <div style="position:relative;z-index:10;display:flex;flex-direction:column;align-items:center;">
        <div style="position:relative;">
          <div style="
            width:52px;height:70px;
            background:linear-gradient(135deg,${reached ? '#d97706,#92400e' : '#b45309,#92400e'});
            border-radius:7px;border:2px solid #ca8a04;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 3px 6px rgba(0,0,0,0.35);">
            ${milestone === 20
              ? `<div style="color:#fbbf24;font-size:8px;text-align:center;padding:2px;line-height:1.3;">Hero<br>Card</div>`
              : `<div style="color:#fbbf24;font-size:20px;">?</div>`}
          </div>
          ${newBadge}
          <div style="
            position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);
            width:24px;height:24px;border-radius:50%;
            background:${reached ? '#d97706' : '#4b5563'};
            border:2px solid ${reached ? '#ca8a04' : '#6b7280'};
            color:white;font-size:10px;font-weight:bold;
            display:flex;align-items:center;justify-content:center;">${milestone}</div>
        </div>
      </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  function showLoginRewardsScene() {
    const loginDays   = typeof gameState.loginDays === 'number' ? gameState.loginDays : 0;
    const progressPct = Math.min((loginDays / 20) * 100, 100);

    const overlay = document.getElementById('login-rewards-overlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;">
        <div style="
          width:100%;max-width:1200px;aspect-ratio:16/9;
          background:linear-gradient(135deg,rgba(251,191,36,.8),rgba(254,249,195,.6),rgba(251,146,60,.8));
          border-radius:24px;box-shadow:0 25px 50px rgba(0,0,0,0.55);
          overflow:hidden;display:flex;flex-direction:column;">

          <!-- ── HEADER ── -->
          <div style="height:38%;background:linear-gradient(135deg,#fbbf24,#f97316);flex-shrink:0;">
            <div style="height:100%;display:flex;flex-direction:column;justify-content:space-between;padding:18px 22px;">
              <!-- top bar -->
              <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                <div style="display:flex;align-items:center;gap:7px;color:#78350f;">
                  <span style="font-size:16px;">&#9432;</span>
                  <span style="font-size:14px;font-style:italic;font-family:Georgia,serif;">Login Every Day</span>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <div style="background:rgba(0,0,0,.82);color:white;padding:4px 12px;border-radius:999px;font-size:11px;display:flex;align-items:center;gap:5px;">
                    <div style="width:6px;height:6px;background:#fb923c;border-radius:50%;"></div>
                    Event Time: No Limit
                  </div>
                  <button style="background:rgba(0,0,0,.82);color:white;padding:5px 16px;border-radius:999px;font-size:11px;border:none;cursor:pointer;"
                    onmouseover="this.style.background='rgba(0,0,0,.6)'" onmouseout="this.style.background='rgba(0,0,0,.82)'">Rewards</button>
                </div>
              </div>
              <!-- title -->
              <div style="font-size:42px;font-weight:bold;font-style:italic;color:#dc2626;text-shadow:2px 2px 6px rgba(0,0,0,.3);font-family:Georgia,serif;">
                Get Free Heroes
              </div>
            </div>
          </div>

          <!-- ── MAIN AREA ── -->
          <div style="flex:1;background:#7d1b3d;padding:10px 14px;overflow:hidden;display:flex;flex-direction:column;gap:8px;min-height:0;">

            <!-- progress section -->
            <div style="background:linear-gradient(to right,rgba(136,19,55,.5),rgba(159,18,57,.5));border-radius:14px;padding:10px 14px;flex-shrink:0;">
              <div style="display:flex;align-items:center;gap:14px;">

                <!-- card stack + label -->
                <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                  <div style="position:relative;width:52px;height:70px;">
                    <div style="width:52px;height:70px;background:linear-gradient(135deg,#d97706,#92400e);border-radius:7px;transform:rotate(-6deg);position:absolute;top:0;left:0;opacity:.7;"></div>
                    <div style="width:52px;height:70px;background:linear-gradient(135deg,#b45309,#78350f);border-radius:7px;transform:rotate(3deg);position:absolute;top:0;left:3px;opacity:.8;"></div>
                    <div style="width:52px;height:70px;background:linear-gradient(135deg,#f59e0b,#d97706);border-radius:7px;position:relative;display:flex;align-items:center;justify-content:center;">
                      <span style="color:#78350f;font-size:8px;opacity:.7;">Card</span>
                    </div>
                  </div>
                  <div>
                    <div style="color:#fcd34d;font-size:11px;font-style:italic;">Total Logins</div>
                    <div style="color:#facc15;font-size:14px;font-weight:bold;font-style:italic;font-family:Georgia,serif;">Get S-Level Heroes</div>
                  </div>
                </div>

                <!-- progress track + milestones -->
                <div style="flex:1;display:flex;align-items:center;gap:10px;">
                  <!-- login count circle -->
                  <div style="position:relative;flex-shrink:0;">
                    <div style="width:70px;height:70px;background:linear-gradient(135deg,#fbbf24,#f97316);border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 10px rgba(0,0,0,.4);">
                      <div style="text-align:center;">
                        <div style="font-size:30px;font-weight:bold;color:#78350f;line-height:1;">${loginDays}</div>
                        <div style="font-size:9px;color:#78350f;font-style:italic;">Logins</div>
                      </div>
                    </div>
                    <div style="position:absolute;top:-7px;left:50%;transform:translateX(-50%);white-space:nowrap;">
                      <span style="background:#fbbf24;color:#78350f;padding:1px 7px;border-radius:999px;font-size:8px;font-weight:bold;">New</span>
                    </div>
                  </div>

                  <!-- milestones -->
                  <div style="flex:1;position:relative;display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;">
                    <!-- progress bar track -->
                    <div style="position:absolute;top:50%;left:0;right:0;height:8px;background:rgba(100,20,40,.5);border-radius:999px;transform:translateY(-50%);z-index:1;">
                      <div style="height:100%;width:${progressPct}%;background:linear-gradient(to right,#fb923c,#fbbf24);border-radius:999px;transition:width .5s;"></div>
                    </div>
                    ${MILESTONES.map(m => _milestoneHTML(m, loginDays)).join('')}
                  </div>
                </div>

              </div>
            </div>

            <!-- calendar grid -->
            <div style="background:#e9e5da;border-radius:14px;overflow:hidden;flex:1;display:flex;flex-direction:column;min-height:0;">
              <div style="background:#b35669;padding:6px;text-align:center;font-family:Georgia,serif;font-style:italic;font-size:12px;color:#000;font-weight:bold;flex-shrink:0;">
                Log in for 5 days to flip a card!
              </div>
              <div style="padding:6px;flex:1;display:grid;grid-template-columns:repeat(14,1fr);gap:3px;align-content:start;overflow:hidden;">
                ${HERO_CARDS.map(card => `<div style="min-width:0;">${_cardHTML(card, loginDays)}</div>`).join('')}
              </div>
            </div>

          </div>

          <!-- ── BOTTOM NAV ── -->
          <div style="background:linear-gradient(to right,rgba(136,19,55,.6),rgba(159,18,57,.6));padding:8px 14px;display:flex;align-items:center;gap:10px;height:66px;box-sizing:border-box;flex-shrink:0;">
            <button id="login-rewards-back" style="background:rgba(251,240,212,.9);padding:7px 14px;border-radius:10px;border:none;cursor:pointer;font-size:16px;box-shadow:0 2px 6px rgba(0,0,0,.2);flex-shrink:0;">&#8592;</button>
            <div style="flex:1;display:grid;grid-template-columns:repeat(3,1fr);gap:8px;">
              <button class="lr-tab-btn" data-tab="celebration" style="background:linear-gradient(135deg,#be123c,#881337);color:white;padding:7px;border-radius:10px;border:none;cursor:pointer;font-family:Georgia,serif;font-style:italic;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.2);">Celebration Gift</button>
              <button class="lr-tab-btn" data-tab="login" style="background:linear-gradient(135deg,#d97706,#c2410c);color:white;padding:7px;border-radius:10px;border:none;cursor:pointer;font-family:Georgia,serif;font-style:italic;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.2);">Log in to Get Heroes</button>
              <button class="lr-tab-btn" data-tab="zorya" style="position:relative;background:linear-gradient(135deg,#4b5563,#1f2937);color:white;padding:7px;border-radius:10px;border:none;cursor:pointer;font-family:Georgia,serif;font-style:italic;font-size:12px;box-shadow:0 2px 6px rgba(0,0,0,.2);">
                Zorya Rate Up
                <span style="position:absolute;top:-7px;right:-7px;background:#22c55e;color:white;padding:1px 5px;border-radius:4px;font-size:8px;font-weight:bold;font-style:normal;">New</span>
              </button>
            </div>
          </div>

        </div>
      </div>`;

    // wire back button
    document.getElementById('login-rewards-back').addEventListener('click', closeLoginRewardsScene);

    // wire tab buttons (stub — emit console event for future wiring)
    overlay.querySelectorAll('.lr-tab-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        console.log('[LoginRewards] tab:', btn.dataset.tab);
      });
    });

    overlay.style.display = 'flex';
  }

  function closeLoginRewardsScene() {
    const overlay = document.getElementById('login-rewards-overlay');
    if (overlay) overlay.style.display = 'none';
  }

  function registerSceneLoginRewards() {
    // No setup needed at registration time.
  }

  window.showLoginRewardsScene     = showLoginRewardsScene;
  window.closeLoginRewardsScene    = closeLoginRewardsScene;
  window.registerSceneLoginRewards = registerSceneLoginRewards;

})();
