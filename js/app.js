// Screens, menus, shop, options, saving and the connection between UI and gameplay.
(function () {
  const { Assets, Input, Level, SPR, LEVELS, STAGES, stageConfig, starRating, GEAR, SHIELD_MAX } = window.SV;
  const types = () => window.SV.TYPES;   // monsters of the level being played
  const goal = () => window.SV.GOAL;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // ---------------- Save data ----------------
  const DEFAULT_SAVE = {
    crystals: 10,
    owned: {},
    best: {},
    stages: {},     // 'w1s3' -> { stars, time } for every cleared level
    dex: {},        // alien id -> times caught (all time)
    dexNew: {},     // aliens caught but not yet viewed in the guide
    options: { sound: 'on', assist: 2, hand: 'right', sens: 1, smoothing: 'normal', quality: 'auto', fps: 'off' },
  };
  let save = load();

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('starvoyager.save'));
      if (s) return { ...JSON.parse(JSON.stringify(DEFAULT_SAVE)), ...s, options: { ...DEFAULT_SAVE.options, ...(s.options || {}) } };
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }
  function persist() {
    try { localStorage.setItem('starvoyager.save', JSON.stringify(save)); } catch (e) {}
  }

  const SHOP = [
    { id: 'magazine',    name: 'Bigger magazine',  text: '12 shots before reloading instead of 8.', price: 25 },
    { id: 'quickReload', name: 'Quick reload',     text: 'Reloading takes half the time.', price: 30 },
    { id: 'steadyAim',   name: 'Steady aim',       text: 'Stronger aim assist when it is switched on.', price: 35 },
    { id: 'medkit',      name: 'Emergency medkit', text: 'Heals 30% once per level when health drops to 30%.', price: 40 },
    { id: 'grenadePouch', name: 'Grenade pouch',   text: 'Start each level with 5 net grenades instead of 3.', price: 30 },
    { id: 'timeGrenade', name: 'Time grenades',    text: '2 time grenades per level. Everything slows down for 3 seconds.', price: 45 },
    { id: 'timePouch',   name: 'Time grenade pouch', text: '4 time grenades per level instead of 2.', price: 35, needs: 'timeGrenade' },
  ];

  // ---------------- Stage scaling ----------------
  const stage = $('#stage');
  function fitStage() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `scale(${s}) translate(-50%, -50%)`;
    stage.style.transformOrigin = '0 0';
    stage.style.left = '50%'; stage.style.top = '50%';
  }
  // translate(-50%,-50%) after scale keeps the stage centred at any window size
  addEventListener('resize', fitStage);
  fitStage();

  // ---------------- Screens ----------------
  let current = 'loading';
  function go(name) {
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    current = name;
    if (name === 'shop') renderShop();
    if (name === 'options') renderOptions();
    if (name === 'levels') renderLevels();
    if (name === 'connect') { Net.start(); Net.renderQr(); updatePhoneUi(); }
    if (name === 'dex') { Dex.hide(); Dex.render(); }
    if (name === 'start') updatePhoneUi();
    // Hand pointer works on every menu screen; inside a level the game handles it
    if (name !== 'game' && name !== 'loading') MenuPointer.start(); else MenuPointer.stop();
    setTimeout(focusFirst, 30);
  }

  function focusables() {
    const overlay = $$('#screen-' + current + ' .overlay.show').pop();
    const root = overlay || $('#screen-' + current);
    if (!root) return [];
    return $$('button, input', root).filter((el) => !el.disabled && el.offsetParent !== null && !(overlay === undefined && el.closest('.overlay')));
  }
  function focusFirst() {
    const f = focusables();
    const primary = f.find((el) => el.classList.contains('pink')) || f[0];
    if (primary && document.activeElement !== primary) primary.focus({ preventScroll: true });
  }

  // ---------------- Buttons ----------------
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go], [data-action]');
    if (!el || el.disabled) return;
    Sfx.select();
    if (el.dataset.go) return go(el.dataset.go);
    actions[el.dataset.action] && actions[el.dataset.action](el);
  });

  let resetArmed = false;
  const actions = {
    quit() {
      try { window.close(); } catch (e) {}
      go('quit');
    },
    connect() { go('connect'); },
    'connect-back'() { go('levels'); },
    'play-phone'() { startLevel('phone', pending.world, pending.stage); },
    'play-mouse'() { startLevel('mouse', pending.world, pending.stage); },
    'world-close'() { $('#ov-world').classList.remove('show'); openWorldId = null; setTimeout(focusFirst, 30); },
    next() {
      const n = nextStage(lastWorld, lastStage);
      if (!n) return;
      hideOverlays();
      startLevel(lastMode, n.world, n.stage);
    },
    'options-game'() { optionsFromGame = true; Level.menuSuspended = true; go('options'); },
    'options-back'() { closeOptions(); },
    'skip-cal'() { Level.skipCalibration(); },
    menu() { Level.pause(); },
    'dex-close'() { Dex.hide(); setTimeout(focusFirst, 30); },
    resume() { Level.resume(); },
    restart() { hideOverlays(); startLevel(lastMode, lastWorld, lastStage); },
    abandon() { Level.stop(); hideOverlays(); go('start'); },
    again() { hideOverlays(); startLevel(lastMode, lastWorld, lastStage); },
    'to-levels'() { Level.stop(); hideOverlays(); go('levels'); openWorld(lastWorld); },
    reset(el) {
      if (!resetArmed) {
        resetArmed = true;
        el.querySelector('span').textContent = 'Press again to confirm';
        setTimeout(() => { resetArmed = false; el.querySelector('span').textContent = 'Reset progress'; }, 3000);
        return;
      }
      const opts = save.options;
      save = JSON.parse(JSON.stringify(DEFAULT_SAVE));
      Dex.setSave(save);
      save.options = opts;
      persist();
      resetArmed = false;
      el.querySelector('span').textContent = 'Progress reset';
    },
  };

  // Choosing a level: with a phone connected the level starts right away, otherwise show the pairing screen
  let pending = { world: 1, stage: 1 };
  function chooseStage(world, stage) {
    if (!stageUnlocked(world, stage)) return;
    Sfx.select();
    pending = { world, stage };
    if (Net.isConnected()) startLevel('phone', world, stage);
    else go('connect');
  }

  // Options can be opened from the title screen or from the in-game menu
  let optionsFromGame = false;
  function closeOptions() {
    if (optionsFromGame) {
      optionsFromGame = false;
      Sfx.enabled = save.options.sound === 'on';
      Level.applyOptions(save.options);
      go('game');
      Level.menuSuspended = false;
    } else go('start');
  }

  // ---------------- Worlds and levels ----------------
  // A world is unlocked when every level of the previous world is cleared;
  // a level is unlocked when the level before it is cleared.
  const WORLD_IDS = Object.keys(LEVELS).map(Number);
  const key = (w, s) => `w${w}s${s}`;
  const stageStars = (w, s) => ((save.stages || {})[key(w, s)] || {}).stars || 0;
  const stageCleared = (w, s) => stageStars(w, s) > 0;
  const worldCleared = (w) => Array.from({ length: STAGES }, (_, i) => i + 1).every((s) => stageCleared(w, s));
  const worldUnlocked = (w) => w === WORLD_IDS[0] || worldCleared(w - 1);
  const stageUnlocked = (w, s) => worldUnlocked(w) && (s === 1 || stageCleared(w, s - 1));
  const worldStars = (w) => Array.from({ length: STAGES }, (_, i) => stageStars(w, i + 1)).reduce((a, b) => a + b, 0);
  function nextStage(w, s) {
    if (s < STAGES) return stageUnlocked(w, s + 1) ? { world: w, stage: s + 1 } : null;
    return LEVELS[w + 1] && stageUnlocked(w + 1, 1) ? { world: w + 1, stage: 1 } : null;
  }

  const STAR_PATH = 'M12 2.2l2.95 6.2 6.75.8-5 4.7 1.35 6.7L12 17.3l-6.05 3.3 1.35-6.7-5-4.7 6.75-.8z';
  const starSvg = (on) => `<svg class="star${on ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
  const starsHtml = (n) => [1, 2, 3].map((i) => starSvg(i <= n)).join('');
  const LOCK_SVG = '<svg class="lock-ico" viewBox="0 0 24 24" fill="none" stroke="#bff9ff" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const CROWN_SVG = '<svg class="boss-crown" viewBox="0 0 64 40"><path d="M4 36V10l14 12L32 4l14 18 14-12v26z" fill="#ffd27a" stroke="#fff4c9" stroke-width="2.5" stroke-linejoin="round"/></svg>';

  function renderLevels() {
    const box = $('#worlds');
    box.innerHTML = '';
    for (const w of WORLD_IDS) {
      const cfg = LEVELS[w];
      const open = worldUnlocked(w);
      const b = document.createElement('button');
      b.className = 'level-card' + (open ? '' : ' locked');
      b.disabled = !open;
      b.dataset.world = w;
      const sub = open ? `<span class="card-stars">${starSvg(true)} ${worldStars(w)}/${STAGES * 3}</span>` : `<small>Clear ${LEVELS[w - 1].name} first</small>`;
      b.innerHTML = `<div class="face"><img src="${cfg.bg}" alt="">${open ? '' : LOCK_SVG}<div class="label"><b>${cfg.name}</b>${sub}</div></div>`;
      b.setAttribute('aria-label', open ? `${cfg.name}, ${worldStars(w)} of ${STAGES * 3} stars` : `${cfg.name}, locked`);
      b.addEventListener('click', () => { if (worldUnlocked(w)) { Sfx.select(); openWorld(w); } });
      box.appendChild(b);
    }
    updatePhoneUi();
  }

  // Opening a world: its background zooms in and the 5 levels pop out of the centre along a dotted path
  let openWorldId = null;
  const NODE_POS = [[300, 640], [630, 500], [960, 650], [1290, 500], [1610, 590]];
  function openWorld(w) {
    if (!LEVELS[w]) return;
    openWorldId = w;
    const cfg = LEVELS[w];
    const ov = $('#ov-world');
    $('#world-bg').src = cfg.bg;
    $('#world-title').textContent = cfg.name;
    $('#world-stars').innerHTML = `${starSvg(true)} ${worldStars(w)}/${STAGES * 3}`;
    const map = $('#stage-map');
    map.innerHTML = '';
    const line = $('#stage-path-line');
    line.setAttribute('d', 'M' + NODE_POS.map(([x, y]) => `${x} ${y}`).join(' L'));
    line.classList.remove('on');
    for (let s = 1; s <= STAGES; s++) {
      const [x, y] = NODE_POS[s - 1];
      const unlocked = stageUnlocked(w, s), stars = stageStars(w, s), boss = s === STAGES;
      const n = document.createElement('button');
      n.className = 'stage-node pre' + (boss ? ' boss' : '') + (unlocked ? '' : ' locked') + (stars ? ' cleared' : '');
      n.disabled = !unlocked;
      n.style.left = x + 'px'; n.style.top = y + 'px';
      n.style.setProperty('--fx', (960 - x) + 'px'); n.style.setProperty('--fy', (560 - y) + 'px');
      n.style.transitionDelay = (0.12 + (s - 1) * 0.11) + 's';
      const inner = unlocked ? (boss ? CROWN_SVG + s : s) : LOCK_SVG.replace('lock-ico', '');
      const sc = stageConfig(w, s);
      const label = boss ? `Boss: ${cfg.boss.name}` : `Level ${s}`;
      n.innerHTML = (boss ? '<span class="boss-warn">⚠ BOSS</span>' : '')
        + `<div class="hex"><div>${inner}</div></div><div class="node-stars">${starsHtml(stars)}</div><div class="node-label">${label}</div>`;
      n.setAttribute('aria-label', `${label}${unlocked ? '' : ', locked'}${stars ? `, ${stars} stars` : ''}. Catch ${sc.goal} of each.`);
      n.addEventListener('click', () => chooseStage(w, s));
      map.appendChild(n);
    }
    ov.classList.add('show');
    // next frame: remove the start position so the levels fly out (the delays stagger them)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      $$('#stage-map .stage-node').forEach((n) => n.classList.remove('pre'));
      line.classList.add('on');
    }));
    setTimeout(() => {
      $$('#stage-map .stage-node').forEach((n) => { n.style.transitionDelay = '0s'; });
      const firstOpen = $$('#stage-map .stage-node:not([disabled])').pop();
      if (firstOpen) firstOpen.focus({ preventScroll: true });
    }, 900);
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  // ---------------- Shop ----------------
  function renderShop() {
    $('#shop-crystals').textContent = save.crystals;
    const grid = $('#shop-grid');
    grid.innerHTML = '';
    for (const item of SHOP) {
      if (item.needs && !save.owned[item.needs]) continue;     // shown once the first item is bought
      const owned = !!save.owned[item.id];
      const div = document.createElement('div');
      div.className = 'item' + (owned ? ' owned' : '');
      div.innerHTML = `<b>${item.name}</b><p>${item.text}</p>`;
      const btn = document.createElement('button');
      btn.className = 'btn small' + (owned ? '' : ' pink');
      btn.innerHTML = `<span>${owned ? 'Owned' : '<i class="crystal"></i> ' + item.price}</span>`;
      btn.disabled = owned || save.crystals < item.price;
      btn.setAttribute('aria-label', owned ? item.name + ', owned' : `Buy ${item.name} for ${item.price} crystals`);
      btn.addEventListener('click', () => {
        if (owned || save.crystals < item.price) return;
        save.crystals -= item.price;
        save.owned[item.id] = true;
        persist();
        Sfx.reload();
        renderShop();
        focusFirst();
      });
      div.appendChild(btn);
      grid.appendChild(div);
    }
  }

  // ---------------- Options ----------------
  function renderOptions() {
    const o = save.options;
    $$('[data-opt]').forEach((seg) => {
      const val = String(o[seg.dataset.opt]);
      $$('button', seg).forEach((b) => {
        b.classList.toggle('on', b.dataset.v === val);
        b.setAttribute('aria-pressed', b.dataset.v === val);
      });
    });
  }
  $$('[data-opt] button').forEach((b) => b.addEventListener('click', () => {
    const key = b.parentElement.dataset.opt;
    let v = b.dataset.v;
    if (key === 'assist' || key === 'sens') v = Number(v);
    save.options[key] = v;
    if (key === 'sound') Sfx.enabled = v === 'on';
    persist(); renderOptions(); Sfx.select();
  }));

  // ---------------- Phone connection ----------------
  const statusText = { off: 'Phone not connected', starting: 'Setting up connection…', waiting: 'Waiting for phone…', connected: 'Phone connected', lost: 'Phone disconnected', error: 'Connection problem' };
  let phoneText = statusText.off;

  function updatePhoneUi() {
    const st = Net.status;
    $$('[data-phone-dot]').forEach((d) => {
      d.classList.toggle('on', st === 'connected');
      d.classList.toggle('wait', st === 'waiting' || st === 'starting');
    });
    const p2 = Net.isConnected(2) ? ' · Player 2 connected' : '';
    $$('[data-phone-text]').forEach((t) => { t.textContent = phoneText + p2; });
    $('#btn-play-phone').disabled = st !== 'connected';
    $('#phone-chip').style.display = lastMode === 'phone' ? 'flex' : 'none';
    $('#start-connect').style.display = st === 'connected' ? 'none' : 'flex';
  }

  Net.onStatus = (status, text) => {
    phoneText = text || statusText[status];
    updatePhoneUi();
    if (status === 'connected' && current === 'connect') setTimeout(focusFirst, 30);
    if (status === 'connected' && current !== 'game' && current !== 'loading') MenuPointer.start();
    if (status !== 'connected' && current === 'game' && lastMode === 'phone' && Level.state === 'play') {
      Level.pause('Phone disconnected. Reconnect the phone, then resume.');
    }
  };
  // Camera controller sends body points; gamepad and tilt controllers send a pointer and buttons
  Net.onData = (d, player = 1) => {
    if (!d) return;
    const inp = window.SV.inputs[player - 1];
    if (!inp) return;
    if (d.m === 'pad' || d.m === 'tilt' || d.m === 'hello') inp.onPointer(d);
    else inp.onPose(d);
  };
  // A second phone joins or leaves: add or remove Player 2's gun, also in the middle of a level
  Net.onPlayer = (player, joined) => {
    updatePhoneUi();
    if (player === 2) {
      if (joined) window.SV.inputs[1].reset();
      if (current === 'game' && Level.running) { if (joined) Level.addPlayer(2); else Level.removePlayer(2); }
      else if (joined) showToastMenu('Player 2 connected');
    }
  };
  function showToastMenu(text) {
    let t = $('#menu-toast');
    if (!t) { t = document.createElement('div'); t.id = 'menu-toast'; t.className = 'menu-toast'; stage.appendChild(t); }
    t.textContent = text; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // ---------------- HUD ----------------
  function buildHud() {
    const segs = $('#health-segs');
    segs.innerHTML = '';
    for (let i = 0; i < 20; i++) { const c = document.createElement('i'); c.className = 'seg-cell'; segs.appendChild(c); }
  }
  // Catch counters for the monsters of the level being played
  function buildCatches() {
    const catches = $('#catches');
    catches.innerHTML = '';
    for (const t of types()) {
      const d = document.createElement('div');
      d.className = 'catch'; d.dataset.type = t;
      d.style.setProperty('--c', SPR[t].color);
      d.innerHTML = `<canvas width="132" height="132"></canvas><div><b>0</b><small>/${goal()}</small></div>`;
      Level.drawPortrait($('canvas', d), t);
      catches.appendChild(d);
    }
  }

  let toastTimer = null;
  function onHud(kind, value, L) {
    if (kind === 'all' || kind === 'health') {
      const on = Math.round(L.health / 5);
      $$('#health-segs .seg-cell').forEach((c, i) => c.classList.toggle('off', i >= on));
      $('#health-num').textContent = L.health;
      const h = $('#health');
      h.classList.toggle('low', L.health <= 30);
      if (kind === 'health') {
        h.classList.remove('hit'); void h.offsetWidth; h.classList.add('hit');
        const dmg = $('#damage'); dmg.classList.remove('flash'); void dmg.offsetWidth; dmg.classList.add('flash');
      }
    }
    const P1 = L.players && L.players[0];
    if ((kind === 'all' || kind === 'ammo' || kind === 'gear' || kind === 'players') && P1) {
      // With two players each player's ammo is drawn next to their gear button instead
      $('.ammo').classList.toggle('two', L.players.length > 1);
    }
    if ((kind === 'all' || kind === 'ammo') && P1) {
      const pips = $('#pips');
      if (pips.children.length !== L.magSize) {
        pips.innerHTML = '';
        for (let i = 0; i < L.magSize; i++) { const p = document.createElement('i'); p.className = 'pip'; pips.appendChild(p); }
      }
      [...pips.children].forEach((p, i) => p.classList.toggle('off', i >= P1.ammo));
    }
    if (kind === 'all' || kind === 'catch') {
      for (const t of types()) {
        const el = $(`.catch[data-type="${t}"]`);
        if (!el) continue;
        $('b', el).textContent = L.caught[t];
        el.classList.toggle('done', L.caught[t] >= goal());
      }
      $('#hud-crystals').textContent = save.crystals + L.earned;
    }
    if ((kind === 'all' || kind === 'gear') && P1) {
      const label = P1.equipped === 'grenade' ? `Net grenade · ${P1.grenades} left`
        : P1.equipped === 'shield' ? `Shield ${P1.shieldHP}/${SHIELD_MAX}`
        : 'Blaster';
      $('#gear-label').textContent = label;
      $('#pips').style.opacity = P1.equipped === 'gun' ? 1 : 0.25;
    }
    if (kind === 'fps') {
      const el = $('#fps');
      el.style.display = save.options.fps === 'on' ? 'block' : 'none';
      el.textContent = `${value} FPS · ${L.quality}`;
    }
    if (kind === 'cursor') {
      const cur = $('#menu-cursor');
      if (!value || !value.show) { cur.classList.remove('show'); }
      else {
        cur.classList.add('show');
        cur.style.left = value.x + 'px'; cur.style.top = value.y + 'px';
        cur.style.setProperty('--p', value.p.toFixed(3));
      }
    }
    if (kind === 'caught') {
      if (Dex.record(value)) setTimeout(() => showToast(`New in the alien guide: ${SPR[value].name}!`), 900);
    }
    if (kind === 'prompt') {
      const p = $('#prompt');
      if (value) p.textContent = value;
      p.classList.toggle('show', !!value);
    }
    if (kind === 'toast') {
      const t = $('#toast');
      t.textContent = value; t.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
    }
    if (kind === 'cal') {
      $('#ov-calibrate').classList.add('show');
      $('#cal-status').textContent = value;
    }
    if (kind === 'countdown') {
      $('#ov-calibrate').classList.remove('show');
      $('#ov-count').classList.add('show');
      const n = String(Math.max(1, value));
      if ($('#count-num').textContent !== n) { $('#count-num').textContent = n; Sfx.select(); }
    }
    if (kind === 'go') {
      $('#ov-count').classList.remove('show');
      showToast(lastMode !== 'phone' ? 'Click a monster to fire' : Input.isCam() ? 'Hold the circle on a monster to fire' : 'Aim and press Fire');
    }
    if (kind === 'pause') {
      $('#pause-reason').textContent = value || 'Take a breather.';
      $('#pause-hint').style.display = lastMode === 'phone' ? 'block' : 'none';
      $('#pause-hint').textContent = Input.isCam() ? 'Point at a button and hold to choose it.' : 'Move the circle to a button and press Fire. Menu returns to the game.';
      $('#ov-pause').classList.add('show');
      setTimeout(focusFirst, 30);
    }
    if (kind === 'resume') $('#ov-pause').classList.remove('show');
  }
  function showToast(text) { onHud('toast', text, Level); }

  // Buttons the hand cursor can press while paused or on the end screen, in stage coordinates
  function getMenuButtons() {
    const overlay = $$('#ov-pause.show, #ov-end.show')[0];
    if (!overlay) return [];
    const sr = stage.getBoundingClientRect();
    const s = sr.width / 1920;
    return $$('button', overlay).filter((b) => !b.disabled).map((b) => {
      const r = b.getBoundingClientRect();
      return { el: b, x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s };
    });
  }

  function hideOverlays() { $$('#screen-game .overlay').forEach((o) => o.classList.remove('show')); }

  // ---------------- Level flow ----------------
  let lastMode = 'mouse', lastWorld = 1, lastStage = 1;
  function startLevel(mode, world = lastWorld, stage = lastStage) {
    if (!stageUnlocked(world, stage)) return;
    lastMode = mode; lastWorld = world; lastStage = stage;
    $('#ov-world').classList.remove('show');
    optionsFromGame = false;
    hideOverlays();
    go('game');
    $('#cal-hand').textContent = save.options.hand;
    updatePhoneUi();
    $('#prompt').classList.remove('show');
    Level.start({ level: world, stage, mode, players: Net.isConnected(2) ? 2 : 1, save, options: save.options, onEnd: endLevel, onHud, getMenuButtons });
    buildCatches();
    onHud('all', null, Level);
    if (mode === 'phone' && Input.isCam()) onHud('cal', 'Looking for you…', Level);
    else onHud('countdown', 3, Level);
  }

  function endLevel(r) {
    const bonus = r.won ? 15 : 0;
    save.crystals += r.earned + bonus;
    const rating = starRating(r);
    if (r.won) {
      if (!save.stages) save.stages = {};
      const k = key(r.world, r.stage);
      const prev = save.stages[k] || { stars: 0 };
      save.stages[k] = { stars: Math.max(prev.stars || 0, rating.stars), time: Math.min(prev.time || Infinity, r.time) };
    }
    persist();
    $('#prompt').classList.remove('show');
    const cfgName = LEVELS[r.world].name;
    $('#end-title').textContent = r.won ? (r.stage === STAGES ? `${cfgName} cleared!` : `Level ${r.stage} clear`) : 'Your shields are down';
    $('#end-stars').innerHTML = r.won ? starsHtml(rating.stars) : '';
    // A friendly tip on what would give more stars
    let tip = '';
    if (r.won && rating.stars < 3) {
      const p = rating.parts, weakest = Object.entries(p).sort((a, b) => a[1] - b[1])[0][0];
      tip = { health: 'Tip: take less damage for more stars', accuracy: 'Tip: aim carefully, fewer missed shots give more stars', time: `Tip: be a bit quicker, the target time is ${fmtTime(r.par)}` }[weakest];
    }
    $('#end-tip').textContent = tip;
    const caught = types().map((t) => `<span>${SPR[t].name}</span><b>${r.caught[t]}/${goal()}</b>`).join('')
      + (r.boss ? `<span>${r.boss.name}</span><b>${r.boss.caught ? 'Caught!' : 'Got away'}</b>` : '');
    $('#end-stats').innerHTML = `
      <span>Time</span><b>${fmtTime(r.time)} <small>(target ${fmtTime(r.par)})</small></b>
      ${caught}
      <span>Accuracy</span><b>${r.accuracy}%</b>
      <span>Health left</span><b>${r.health}%</b>
      <span>Crystals earned</span><b>${r.earned + bonus}</b>`;
    const n = r.won ? nextStage(r.world, r.stage) : null;
    const nb = $('#btn-next');
    nb.hidden = !n;
    if (n) nb.querySelector('span').textContent = n.world !== r.world ? 'Next world' : 'Next level';
    $('#ov-end').classList.add('show');
    if (r.won) setTimeout(() => Sfx.select(), 300);
    setTimeout(focusFirst, 30);
  }

  // ---------------- Keyboard and TV remote ----------------
  document.addEventListener('keydown', (e) => {
    Sfx.unlock();
    const inGame = current === 'game' && Level.state === 'play';
    if (inGame && (e.key === 'r' || e.key === 'R')) { Level.keyReload(); return; }
    if (inGame && ['1', '2', '3', '4'].includes(e.key)) { Level.keyEquipIndex(Number(e.key) - 1); return; }
    if (inGame && (e.key === 'g' || e.key === 'G')) { Level.toggleBelt(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Backspace' || e.key === 'GoBack') {
      if (inGame) {
        e.preventDefault();
        if (Level.paused) Level.resume(); else Level.pause();
        return;
      }
      if (current === 'levels' && $('#ov-world').classList.contains('show')) { e.preventDefault(); actions['world-close'](); return; }
      if (current === 'dex' && Dex.detailOpen()) { e.preventDefault(); Dex.hide(); setTimeout(focusFirst, 30); return; }
      if (current === 'options') { e.preventDefault(); closeOptions(); return; }
      const back = { options: 'start', levels: 'start', shop: 'levels', connect: 'levels', quit: 'start', dex: 'levels', home: 'levels' }[current];
      if (back) { e.preventDefault(); go(back); }
      return;
    }
    const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (dir && !(document.activeElement && document.activeElement.type === 'range' && Math.abs(dir) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'))) {
      const f = focusables();
      if (!f.length) return;
      e.preventDefault();
      const i = f.indexOf(document.activeElement);
      f[(i + dir + f.length) % f.length].focus({ preventScroll: true });
    }
  });
  document.addEventListener('pointerdown', () => Sfx.unlock(), { once: false });

  // ---------------- Hand pointer for menu screens (alien guide) ----------------
  // Uses the phone's aim outside of a level: point at a button and hold to press it.
  const MenuPointer = {
    active: false, pos: { x: 960, y: 540 }, target: null, t: 0, last: 0,
    DWELL: 1.0,
    start() {
      if (this.active || !Net.isConnected()) return;
      Input.mode = 'phone';
      Input.hand = save.options.hand;
      Input.sens = save.options.sens;
      Input.setSmoothing(save.options.smoothing || 'normal');
      this.active = true; this.target = null; this.t = 0;
      this.last = performance.now();
      requestAnimationFrame(this.loop);
    },
    stop() {
      if (!this.active) return;
      this.active = false;
      $('#menu-cursor').classList.remove('show');
      $$('.pointed').forEach((el) => el.classList.remove('pointed'));
    },
    loop: (now) => {
      const mp = MenuPointer;
      if (!mp.active) return;
      if (current === 'game' || current === 'loading') { mp.stop(); return; }
      const dt = Math.min(0.05, (now - mp.last) / 1000);
      mp.last = now;
      if (Input.hasAim) {
        const k = Math.min(1, dt * (Input.isCam() ? 14 : 40));
        mp.pos.x += (Input.aim.x * 1920 - mp.pos.x) * k;
        mp.pos.y += (Input.aim.y * 1080 - mp.pos.y) * k;
      }
      const fresh = Input.hasAim && Input.poseFresh();
      const screen = $('#screen-' + current);
      const overlay = $('.overlay.show', screen);
      const root = overlay || screen;
      const sr = stage.getBoundingClientRect(), s = sr.width / 1920;
      const hit = $$('button', root).filter((b) => !b.disabled && b.offsetParent !== null && (overlay || !b.closest('.overlay'))).find((b) => {
        const r = b.getBoundingClientRect();
        const x = (r.left - sr.left) / s, y = (r.top - sr.top) / s;
        return mp.pos.x >= x && mp.pos.x <= x + r.width / s && mp.pos.y >= y && mp.pos.y <= y + r.height / s;
      });
      const el = fresh ? hit || null : null;
      if (el !== mp.target) {
        if (mp.target) mp.target.classList.remove('pointed');
        if (el) { el.classList.add('pointed'); Sfx.lock(); }
        mp.target = el; mp.t = 0;
      } else if (el) mp.t += dt;
      const cur = $('#menu-cursor');
      cur.classList.toggle('show', fresh);
      cur.style.left = mp.pos.x + 'px'; cur.style.top = mp.pos.y + 'px';
      cur.style.setProperty('--p', el ? Math.min(1, mp.t / mp.DWELL).toFixed(3) : 0);
      // Camera: hold still on a button. Gamepad/tilt: press Fire to choose, Menu to go back.
      const cam = Input.isCam();
      if (!cam) cur.style.setProperty('--p', 0);
      const events = Input.takeEvents();
      window.SV.inputs[1].takeEvents();     // Player 2 doesn't control the menus
      if (cam && el && mp.t >= mp.DWELL) {
        el.classList.remove('pointed');
        mp.target = null; mp.t = -0.6;
        Sfx.select();
        el.click();
      } else if (!cam) {
        for (const e of events) {
          if (e === 'fire' && el) { el.classList.remove('pointed'); mp.target = null; Sfx.select(); el.click(); break; }
          if (e === 'menu') { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); break; }
        }
      }
      requestAnimationFrame(mp.loop);
    },
  };

  // ---------------- Boot ----------------
  Sfx.enabled = save.options.sound === 'on';
  Dex.init({ save, persist });
  Level.init($('#game-canvas'));
  Assets.load((p) => { $('#load-text').textContent = `Loading artwork… ${Math.round(p * 100)}%`; })
    .then(() => {
      buildHud();
      go('start');
      Net.start();   // get the room ready so pairing is instant
    })
    .catch((err) => {
      $('#load-text').textContent = err.message + '. Check that the assets folder was uploaded.';
    });
})();
