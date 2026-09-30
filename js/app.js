// Screens, menus, shop, options, saving and the connection between UI and gameplay.
(function () {
  const { Assets, Input, Level, SPR, LEVELS, STAGES, stageConfig, starRating, GEAR, TROPHIES } = window.SV;
  const types = () => window.SV.TYPES;   // monsters of the level being played
  const goal = (t) => window.SV.goalOf(t);
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  // ---------------- Save data ----------------
  const DEFAULT_SAVE = {
    crystals: 10,
    mats: { shard: 0, goo: 0, dust: 0 },   // materials dropped by aliens
    trophies: {},                           // boss trophies
    upg: { blaster: 1, net: 1, shield: 1 }, // Workshop upgrade levels
    mods: {}, loadout: {},                  // region abilities: levels, and the equipped drone ability / weapon mod
    base: {},                               // Home base building levels (+ sanctuary timer)
    owned: {},
    best: {},
    stages: {},     // 'w1s3' -> { stars, time } for every cleared level
    dex: {},        // alien id -> times caught (all time)
    dexNew: {},     // aliens caught but not yet viewed in the guide
    options: { sound: 'on', assist: 2, hand: 'right', sens: 1, smoothing: 'normal', quality: 'auto', fps: 'off', unlockAll: 'off', frameRate: '60', effects: 'full' },
  };
  let save = load();
  // Older saves: the extra platformer level used to be world 6 (now world 7)
  if (!save.v2) {
    const st = save.stages || {};
    if (st.w6s1) { st.w7s1 = st.w6s1; delete st.w6s1; }
    save.v2 = true;
  }
  if (!save.mats) save.mats = { shard: 0, goo: 0, dust: 0 };
  if (!save.trophies) save.trophies = {};
  if (!save.upg) save.upg = { blaster: 1, net: 1, shield: 1 };
  if (!save.base) save.base = {};
  if (!save.mods) save.mods = {};
  if (!save.loadout) save.loadout = {};
  try { localStorage.setItem('starvoyager.save', JSON.stringify(save)); } catch (e) {}

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem('starvoyager.save'));
      if (s) return { ...JSON.parse(JSON.stringify(DEFAULT_SAVE)), ...s, options: { ...DEFAULT_SAVE.options, ...(s.options || {}) } };
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAULT_SAVE));
  }
  function persist() {
    save.meta = { updated: Date.now() };
    try { localStorage.setItem('starvoyager.save', JSON.stringify(save)); } catch (e) {}
    if (window.Cloud) window.Cloud.queueSave();       // also online, when a parent is signed in
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
    // expand mode: the stage is 1080 high and as wide as the screen's shape (at least 16:9, at most ~24:10)
    const sw = Math.round(Math.max(1920, Math.min(2600, 1080 * innerWidth / Math.max(1, innerHeight))));
    stage.style.width = sw + 'px';
    document.documentElement.style.setProperty('--stage-w', sw + 'px');
    if (window.SV && window.SV.Level) window.SV.Level.setViewWidth(sw);
    const s = Math.min(innerWidth / sw, innerHeight / 1080);
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
    if (name === 'connect') { if (window.SV_TOUCH) return go('levels'); Net.start(); Net.renderQr(); updatePhoneUi(); }
    if (window.Touch && Touch.editing && name !== 'touchedit') Touch.edit(false);
    if (name === 'touchedit' && window.Touch) Touch.edit(true, $('#screen-touchedit'));
    if (name === 'dex') { Dex.hide(); Dex.render(); }
    if (name === 'workshop') renderWorkshop();
    if (name === 'home') renderHome();
    if (name === 'goals') renderGoals();
    if (name === 'planets') showPlanets();
    if (name === 'start') optionsFrom = 'start';
    if (name === 'account') renderAccount();
    if (name === 'mods') renderMods();
    if (name === 'levels') Progress.updateDot();
    if (name === 'game') renderMatsHud();
    if (name === 'start') updatePhoneUi();
    // Hand pointer works on every menu screen; inside a level the game handles it
    if (name !== 'game' && name !== 'loading') MenuPointer.start(); else MenuPointer.stop();
    if (name !== 'game') Net.setLayout('normal');
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
    if (el.dataset.go === 'workshop') workshopFrom = el.dataset.from || 'levels';
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
    'planet-options'() { optionsFrom = 'planets'; go('options'); },
    'options-game'() { optionsFromGame = true; Level.menuSuspended = true; go('options'); },
    'options-back'() { closeOptions(); },
    'skip-cal'() { Level.skipCalibration(); },
    menu() { Level.pause(); },
    'start-game'() { playIntro(); },
    'use-controller'() { location.href = 'controller.html'; },
    'intro-skip'() { endIntro(); },
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
    if (window.SV_TOUCH) startLevel('phone', world, stage);        // on-screen gamepad: start right away
    else if (Net.isConnected()) startLevel('phone', world, stage);
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
    } else go(optionsFrom);
  }

  // ---------------- Worlds and levels ----------------
  // A world is unlocked when every level of the previous world is cleared;
  // a level is unlocked when the level before it is cleared.
  const WORLD_IDS = Object.keys(LEVELS).map(Number);
  const key = (w, s) => `w${w}s${s}`;
  const stageStars = (w, s) => ((save.stages || {})[key(w, s)] || {}).stars || 0;
  const stageCleared = (w, s) => stageStars(w, s) > 0;
  const worldCleared = (w) => Array.from({ length: STAGES }, (_, i) => i + 1).every((s) => stageCleared(w, s));
  // Options → "Unlock all levels" opens everything (handy for testing or for younger players)
  const unlockAll = () => save.options.unlockAll === 'on';
  // Endless opens after the first world is cleared
  const needsLicence = (w) => !isFreeWorld(w) && !hasFullGame();
  const worldUnlocked = (w) => !needsLicence(w) && (unlockAll() || w === WORLD_IDS[0] || !!LEVELS[w].experimental
    || (LEVELS[w].endless ? worldCleared(1) : worldCleared(w - 1)));
  const stageUnlocked = (w, s) => unlockAll() || (worldUnlocked(w) && (s === 1 || stageCleared(w, s - 1)));
  const worldStars = (w) => Array.from({ length: STAGES }, (_, i) => stageStars(w, i + 1)).reduce((a, b) => a + b, 0);
  function nextStage(w, s) {
    if (LEVELS[w].endless || (LEVELS[w + 1] && LEVELS[w + 1].endless && s === STAGES && LEVELS[w].plat)) return null;
    if (LEVELS[w].plat || (LEVELS[w + 1] && LEVELS[w + 1].experimental && s === STAGES)) return null;
    if (s < STAGES) return stageUnlocked(w, s + 1) ? { world: w, stage: s + 1 } : null;
    return LEVELS[w + 1] && stageUnlocked(w + 1, 1) ? { world: w + 1, stage: 1 } : null;
  }

  const STAR_PATH = 'M12 2.2l2.95 6.2 6.75.8-5 4.7 1.35 6.7L12 17.3l-6.05 3.3 1.35-6.7-5-4.7 6.75-.8z';
  const starSvg = (on) => `<svg class="star${on ? ' on' : ''}" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR_PATH}"/></svg>`;
  const starsHtml = (n) => [1, 2, 3].map((i) => starSvg(i <= n)).join('');
  const LOCK_SVG = '<svg class="lock-ico" viewBox="0 0 24 24" fill="none" stroke="#bff9ff" stroke-width="1.8"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
  const CROWN_SVG = '<svg class="boss-crown" viewBox="0 0 64 40"><path d="M4 36V10l14 12L32 4l14 18 14-12v26z" fill="#ffd27a" stroke="#fff4c9" stroke-width="2.5" stroke-linejoin="round"/></svg>';

  let currentPlanet = 1;
  function renderLevels() {
    const box = $('#worlds');
    box.innerHTML = '';
    const planet = PLANETS.find((p) => p.id === currentPlanet);
    // the world screen shows the chosen planet's own scenery
    const bgImg = $('#screen-levels > img.fill');
    bgImg.src = planet && planet.worlds ? planet.worlds[planet.worlds.length - 1].bg : 'assets/level1.jpg';
    $('#screen-levels').classList.toggle('planet-soon', !!(planet && planet.worlds));
    if (planet && planet.worlds) {
      // a planet whose worlds are not ready yet: show them, locked, as "soon available"
      planet.worlds.forEach((wd, i) => {
        const b = document.createElement('button');
        b.className = 'level-card locked soon-card';
        b.style.setProperty('--i', i);
        b.innerHTML = `<div class="face"><img src="${wd.bg}" alt="">${LOCK_SVG}<div class="label"><b>${t(wd.name)}</b><small class="needs-lic">${t('Soon available')}</small></div></div>`;
        b.addEventListener('click', () => { Sfx.clink(); showToast(t('Soon available')); });
        box.appendChild(b);
      });
      updatePhoneUi();
      return;
    }
    for (const w of WORLD_IDS) {
      const cfg = LEVELS[w];
      const open = worldUnlocked(w);
      const lic = needsLicence(w);        // needs the full game (licence)
      const b = document.createElement('button');
      b.className = 'level-card' + (open ? '' : ' locked');
      b.disabled = !open && !lic;
      if (lic) b.classList.add('lic-lock');
      b.dataset.world = w;
      b.style.setProperty('--i', box.children.length);
      const maxStars = cfg.plat ? 3 : STAGES * 3;
      const eb = save.endlessBest || {};
      const sub = lic ? `<small class="needs-lic">${t('Full game')}</small>`
        : cfg.endless ? (open ? `<small>${t('Best')}: ${t('wave')} ${eb.wave || 0}</small><span class="card-stars">${(eb.score || 0).toLocaleString()}</span>` : `<small>Clear ${LEVELS[1].name} first</small>`)
        : cfg.experimental && open ? `<small>Extra level</small><span class="card-stars">${starSvg(true)} ${worldStars(w)}/${maxStars}</span>`
        : open ? `<span class="card-stars">${starSvg(true)} ${worldStars(w)}/${maxStars}</span>` : `<small>Clear ${LEVELS[w - 1].name} first</small>`;
      b.innerHTML = `<div class="face"><img src="${cfg.bg}" alt="">${open ? '' : LOCK_SVG}<div class="label"><b>${cfg.name}</b>${sub}</div></div>`;
      b.setAttribute('aria-label', open ? `${cfg.name}, ${worldStars(w)} of ${STAGES * 3} stars` : `${cfg.name}, locked`);
      // the experimental platformer is a single level: start it right away
      b.addEventListener('click', () => {
        if (needsLicence(w)) { Sfx.select(); accountFrom = 'levels'; go('account'); return; }     // shows how to unlock the full game
        if (!worldUnlocked(w)) return;
        Sfx.select(); if (cfg.plat || cfg.endless) chooseStage(w, 1); else openWorld(w);
      });
      box.appendChild(b);
    }
    updatePhoneUi();
  }

  // Opening a world: its background zooms in and the 5 levels pop out of the centre along a dotted path
  let openWorldId = null;
  // 10 levels along a winding path across the screen (the boss level last, on the right)
  // spread over the full (possibly wider) screen width
  const nodePos = () => {
    const sw = window.SV.viewW(), m = 170, step = (sw - 2 * m) / 9;
    return Array.from({ length: 10 }, (_, i) => [Math.round(m + i * step), Math.round(610 + Math.sin(i * 1.15) * 125)]);
  };
  // A flowing, curved path through the levels: extra bends between the levels, then a smooth
  // curve (Catmull-Rom) through all points
  function smoothPath(nodes) {
    const pts = [];
    nodes.forEach(([x, y], i) => {
      pts.push([x, y]);
      const n = nodes[i + 1];
      if (n) {
        const mx = (x + n[0]) / 2, my = (y + n[1]) / 2;
        const dx = n[0] - x, dy = n[1] - y, len = Math.hypot(dx, dy) || 1;
        const side = i % 2 ? 1 : -1;                  // bend alternately up and down
        pts.push([mx - (dy / len) * 70 * side, my + (dx / len) * 70 * side]);
      }
    });
    let d = `M${pts[0][0]} ${pts[0][1]}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0]} ${p2[1]}`;
    }
    return d;
  }

  function openWorld(w) {
    if (!LEVELS[w] || LEVELS[w].plat || LEVELS[w].endless) return;     // single-level cards have no level map
    openWorldId = w;
    const cfg = LEVELS[w];
    const ov = $('#ov-world');
    $('#world-bg').src = cfg.bg;
    $('#world-title').textContent = cfg.name;
    $('#world-stars').innerHTML = `${starSvg(true)} ${worldStars(w)}/${STAGES * 3}`;
    const map = $('#stage-map');
    map.innerHTML = '';
    const line = $('#stage-path-line');
    const NODE_POS = nodePos();
    $('#stage-path').setAttribute('viewBox', `0 0 ${window.SV.viewW()} 1080`);
    line.setAttribute('d', smoothPath(NODE_POS));
    line.classList.remove('on');
    for (let s = 1; s <= STAGES; s++) {
      const [x, y] = NODE_POS[s - 1];
      const unlocked = stageUnlocked(w, s), stars = stageStars(w, s), boss = s === STAGES;
      const n = document.createElement('button');
      n.className = 'stage-node pre' + (boss ? ' boss' : '') + (unlocked ? '' : ' locked') + (stars ? ' cleared' : '');
      n.disabled = !unlocked;
      n.style.left = x + 'px'; n.style.top = y + 'px';
      n.style.setProperty('--fx', (window.SV.viewW() / 2 - x) + 'px'); n.style.setProperty('--fy', (560 - y) + 'px');
      n.style.transitionDelay = (0.12 + (s - 1) * 0.11) + 's';
      const inner = unlocked ? (boss ? CROWN_SVG + s : s) : LOCK_SVG.replace('lock-ico', '');
      const sc = stageConfig(w, s);
      const label = boss ? `Boss: ${cfg.boss.name}` : `Level ${s}`;
      n.innerHTML = (boss ? '<span class="boss-warn">⚠ BOSS</span>' : '')
        + `<div class="hex"><div>${inner}</div></div><div class="node-stars">${starsHtml(stars)}</div><div class="node-label">${label}</div>`
        + (((save.stages || {})[key(w, s)] || {}).score ? `<div class="node-score">${save.stages[key(w, s)].score.toLocaleString()}</div>` : '');
      n.setAttribute('aria-label', `${label}${unlocked ? '' : ', locked'}${stars ? `, ${stars} stars` : ''}. Catch ${sc.total} aliens.`);
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
    }, 1800);
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60), r = Math.floor(s % 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  // ---------------- Shop ----------------
  // ---------------- Materials, trophies and the Workshop ----------------
  const MAT_NAMES = { shard: 'Crystal shards', goo: 'Alien goo', dust: 'Star dust',
    mist: 'Nebula mist', spark: 'Ember sparks', pearl: 'Lagoon shells', glass: 'Prism glass', echo: 'Echo crystals', vdust: 'Vortex dust' };
  const TROPHY_NAMES = { nebulaCrown: 'Nebula Crown', emberCore: 'Ember Core', tidePearl: 'Tide Pearl', prismHeart: 'Prism Heart', echoBell: 'Echo Bell', vortexEye: 'Vortex Eye' };
  // Placeholder icons (to be replaced by artwork)
  const MAT_SVG = {
    mist: '<svg class="mat" viewBox="0 0 24 24"><circle cx="8" cy="13" r="5" fill="#c9b6ff"/><circle cx="14" cy="11" r="6" fill="#c9b6ff"/><circle cx="18" cy="15" r="4" fill="#c9b6ff"/></svg>',
    spark: '<svg class="mat" viewBox="0 0 24 24"><path d="M12 2c5 6 6 9 6 12a6 6 0 0 1-12 0c0-3 1-6 6-12z" fill="#ff9a3a" stroke="#fff" stroke-width="1.3"/></svg>',
    pearl: '<svg class="mat" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#fde8ff" stroke="#fff" stroke-width="1.3"/><circle cx="9" cy="9" r="2" fill="#fff"/></svg>',
    glass: '<svg class="mat" viewBox="0 0 24 24"><path d="M12 3l9 17H3z" fill="#bff9ff" stroke="#fff" stroke-width="1.3"/></svg>',
    echo: '<svg class="mat" viewBox="0 0 24 24" fill="none" stroke="#b99bff" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="10"/></svg>',
    vdust: '<svg class="mat" viewBox="0 0 24 24" fill="none" stroke="#ff8ad8" stroke-width="2.2"><path d="M12 12a2 2 0 1 1 2 2 4 4 0 1 1-4-4 6 6 0 1 1 6 6 8 8 0 0 1-8-8"/></svg>',
    crystal: '<i class="crystal"></i>',
    shard: '<svg class="mat" viewBox="0 0 24 24"><path d="M12 2l6 10-6 10-6-10z" fill="#62f0ff" stroke="#fff" stroke-width="1.5"/></svg>',
    goo: '<svg class="mat" viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="#7dffb0" stroke="#fff" stroke-width="1.5"/><circle cx="9.5" cy="11" r="2.2" fill="#ff8ad8"/></svg>',
    dust: '<svg class="mat" viewBox="0 0 24 24"><path d="M12 1.5l2.2 7.3 7.3 2.2-7.3 2.2L12 20.5l-2.2-7.3-7.3-2.2 7.3-2.2z" fill="#ffd27a" stroke="#fff" stroke-width="1.2"/></svg>',
    trophy: '<svg class="mat" viewBox="0 0 24 24"><path d="M3 18V7l5 5 4-8 4 8 5-5v11z" fill="#ffd27a" stroke="#fff" stroke-width="1.3" stroke-linejoin="round"/><circle cx="12" cy="14" r="2" fill="#b99bff"/></svg>',
  };

  function renderMatsHud() {
    const m = save.mats || {};
    const reg = window.SV.REGION_MAT[Level.regionWorld || lastWorld];
    $('#mats-hud').innerHTML = ['shard', 'goo', 'dust', ...(reg ? [reg] : [])].map((k) => `<span>${MAT_SVG[k]}<b>${m[k] || 0}</b></span>`).join('');
  }

  // Upgrade paths: cost of each next level (crystals + materials, the last blaster level also needs a boss trophy)
  const UPGRADES = [
    { id: 'blaster', name: 'Blaster', max: 5,
      stats: (l) => `${t('Damage')} ${[1, 1, 2, 2, 3][l - 1]} · ${t('Lock-on')} ${[0.45, 0.4, 0.35, 0.31, 0.27][l - 1]}s · ${t('Fire rate')} +${[0, 10, 20, 30, 40][l - 1]}%`,
      cost: [null, { crystal: 40, shard: 5 }, { crystal: 80, shard: 10, goo: 3 }, { crystal: 140, shard: 15, goo: 6, dust: 2 }, { crystal: 220, shard: 20, goo: 10, dust: 5, trophy: 'nebulaCrown' }] },
    { id: 'net', name: 'Net grenade', max: 3,
      stats: (l) => `${t('Net size')} +${(l - 1) * 15}% · ${t('Damage')} ${2 + l}`,
      cost: [null, { crystal: 50, shard: 6, goo: 2 }, { crystal: 120, shard: 12, goo: 6, dust: 2 }] },
    { id: 'shield', name: 'Shield', max: 3,
      stats: (l) => `${t('Blocks')} ${10 + 4 * (l - 1)} ${t('hits')}`,
      cost: [null, { crystal: 50, shard: 8, goo: 2 }, { crystal: 120, shard: 14, goo: 5, dust: 3 }] },
  ];
  const have = (k, trophyId) => k === 'crystal' ? save.crystals : k === 'trophy' ? (save.trophies[trophyId] || 0) : (save.mats[k] || 0);
  function canPay(cost) { return Object.entries(cost).every(([k, v]) => k === 'trophy' ? have('trophy', v) > 0 : have(k) >= v); }
  function pay(cost) {
    for (const [k, v] of Object.entries(cost)) {
      if (k === 'crystal') save.crystals -= v;
      else if (k !== 'trophy') save.mats[k] -= v;       // trophies are only needed, not used up
    }
  }

  function renderWorkshop() {
    if (!save.upg) save.upg = { blaster: 1, net: 1, shield: 1 };
    const inv = [['crystal', save.crystals, 'Crystals'], ...['shard', 'goo', 'dust'].map((k) => [k, save.mats[k] || 0, MAT_NAMES[k]]),
      ...Object.values(window.SV.REGION_MAT).filter((k) => save.mats[k] > 0).map((k) => [k, save.mats[k], MAT_NAMES[k]])];
    const trophies = Object.entries(save.trophies || {}).filter(([, n]) => n > 0);
    $('#inventory').innerHTML = inv.map(([k, n, name]) => `<span class="inv">${MAT_SVG[k]}<b>${n}</b><small>${t(name)}</small></span>`).join('')
      + (trophies.length ? trophies.map(([id]) => `<span class="inv trophy">${MAT_SVG.trophy}<small>${t(TROPHY_NAMES[id] || id)}</small></span>`).join('')
        : `<span class="inv muted"><small>${t('Boss trophies appear here')}</small></span>`);
    const box = $('#upgrades');
    box.innerHTML = '';
    for (const u of UPGRADES) {
      const lvl = save.upg[u.id] || 1, maxed = lvl >= u.max, cost = maxed ? null : u.cost[lvl];
      const card = document.createElement('div');
      card.className = 'upgrade';
      const pips = Array.from({ length: u.max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('');
      const costHtml = cost ? Object.entries(cost).map(([k, v]) => {
        const ok = k === 'trophy' ? have('trophy', v) > 0 : have(k) >= v;
        return `<span class="${ok ? '' : 'short'}">${k === 'trophy' ? MAT_SVG.trophy + t(TROPHY_NAMES[v]) : MAT_SVG[k] + v}</span>`;
      }).join('') : '';
      card.innerHTML = `<b>${t(u.name)} <em>Mk ${lvl}</em></b><div class="pips">${pips}</div>
        <p>${u.stats(lvl)}</p>${cost ? `<p class="next">${t('Next')}: ${u.stats(lvl + 1)}</p><div class="cost">${costHtml}</div>` : `<p class="next">${t('Fully upgraded!')}</p>`}`;
      const btn = document.createElement('button');
      btn.className = 'btn small' + (maxed ? '' : ' pink');
      btn.innerHTML = `<span>${maxed ? t('Max') : t('Upgrade')}</span>`;
      btn.disabled = maxed || !canPay(cost);
      btn.addEventListener('click', () => {
        if (maxed || !canPay(cost)) return;
        pay(cost);
        save.upg[u.id] = lvl + 1;
        persist(); Sfx.win(); renderWorkshop(); focusFirst();
      });
      card.appendChild(btn);
      box.appendChild(card);
    }
  }

  // ---------------- Achievements and missions ----------------
  // Statistics are counted from game events; achievements unlock once, missions reset daily/weekly.
  const REWARD = (r) => Object.entries(r).map(([k, v]) => `${MAT_SVG[k === 'crystal' ? 'crystal' : k]}${v}`).join(' ');
  const totalStarsAll = () => Object.values(save.stages || {}).reduce((a, s) => a + (s.stars || 0), 0);
  const ACHIEVEMENTS = [
    { id: 'first', name: 'First catch', desc: 'Catch your first alien', val: (s) => s.catches, goal: 1, reward: { crystal: 20 } },
    { id: 'c100', name: 'Alien catcher', desc: 'Catch 100 aliens', val: (s) => s.catches, goal: 100, reward: { crystal: 60, shard: 5 } },
    { id: 'c500', name: 'Alien expert', desc: 'Catch 500 aliens', val: (s) => s.catches, goal: 500, reward: { crystal: 150, goo: 5 } },
    { id: 'c1000', name: 'Alien master', desc: 'Catch 1000 aliens', val: (s) => s.catches, goal: 1000, reward: { crystal: 300, dust: 3 } },
    { id: 'elite25', name: 'Armour breaker', desc: 'Catch 25 armoured aliens', val: (s) => s.elites, goal: 25, reward: { shard: 10 } },
    { id: 'shiny1', name: 'Something shiny', desc: 'Catch a shiny alien', val: (s) => s.shinies, goal: 1, reward: { crystal: 50, goo: 3 } },
    { id: 'shiny10', name: 'Gold collector', desc: 'Catch 10 shiny aliens', val: (s) => s.shinies, goal: 10, reward: { dust: 3 } },
    { id: 'combo10', name: 'Combo star', desc: 'Reach a combo of 10', val: (s) => s.bestCombo, goal: 10, reward: { crystal: 50 } },
    { id: 'combo25', name: 'Combo legend', desc: 'Reach a combo of 25', val: (s) => s.bestCombo, goal: 25, reward: { dust: 2 } },
    { id: 'net5', name: 'Big net', desc: 'Catch 5 aliens with one net grenade', val: (s) => s.netBest, goal: 5, reward: { crystal: 80 } },
    { id: 'boss1', name: 'Boss catcher', desc: 'Catch your first boss', val: (s) => Object.keys(s.bosses).length, goal: 1, reward: { crystal: 100 } },
    { id: 'bossAll', name: 'Crown collector', desc: 'Catch all 6 bosses', val: (s) => Object.keys(s.bosses).length, goal: 6, reward: { crystal: 500, dust: 5 } },
    { id: 'bossClean', name: 'Untouchable', desc: 'Catch a boss without taking damage', val: (s) => s.bossNoDamage, goal: 1, reward: { crystal: 200, goo: 5 } },
    { id: 'stars30', name: 'Rising star', desc: 'Collect 30 stars', val: () => totalStarsAll(), goal: 30, reward: { crystal: 100 } },
    { id: 'stars100', name: 'Superstar', desc: 'Collect 100 stars', val: () => totalStarsAll(), goal: 100, reward: { crystal: 300, dust: 3 } },
    { id: 'score10k', name: 'High scorer', desc: 'Score 10,000 in one level', val: (s) => s.bestScore, goal: 10000, reward: { crystal: 100 } },
    { id: 'base5', name: 'Builder', desc: 'Reach base level 5', val: () => baseLevel(), goal: 5, reward: { crystal: 100 } },
    { id: 'base20', name: 'Architect', desc: 'Reach base level 20', val: () => baseLevel(), goal: 20, reward: { crystal: 400, dust: 3 } },
    { id: 'mk5', name: 'Fully charged', desc: 'Upgrade the blaster to Mk 5', val: () => (save.upg || {}).blaster || 1, goal: 5, reward: { dust: 5 } },
    { id: 'dex13', name: 'Alien scientist', desc: 'Discover all 13 kinds of aliens', val: () => Object.keys(save.dex || {}).filter((k) => save.dex[k] > 0).length, goal: 13, reward: { crystal: 300 } },
    { id: 'wave10', name: 'Survivor', desc: 'Reach wave 10 in Endless', val: (s) => s.bestWave, goal: 10, reward: { crystal: 200 } },
    { id: 'wave25', name: 'Unstoppable', desc: 'Reach wave 25 in Endless', val: (s) => s.bestWave, goal: 25, reward: { dust: 5 } },
  ];
  // Mission templates: sum = counts up, max = best value in one go
  const MISSIONS = [
    { id: 'catch', text: 'Catch {n} aliens', ev: 'catch', mode: 'sum', d: 40, w: 250 },
    { id: 'elite', text: 'Catch {n} armoured aliens', ev: 'catchElite', mode: 'sum', d: 6, w: 30 },
    { id: 'net', text: 'Catch {n} aliens with net grenades', ev: 'catchNet', mode: 'sum', d: 8, w: 40 },
    { id: 'combo', text: 'Reach a combo of {n}', ev: 'combo', mode: 'max', d: 8, w: 15 },
    { id: 'clear', text: 'Clear {n} levels', ev: 'clear', mode: 'sum', d: 3, w: 15 },
    { id: 'stars', text: 'Earn {n} stars', ev: 'stars', mode: 'sum', d: 6, w: 30 },
    { id: 'score', text: 'Score {n} in one level', ev: 'score', mode: 'max', d: 3000, w: 8000 },
    { id: 'boss', text: 'Catch {n} bosses', ev: 'boss', mode: 'sum', d: 1, w: 3 },
    { id: 'shiny', text: 'Catch a shiny alien', ev: 'shiny', mode: 'sum', d: 1, w: 3, weeklyOnly: true },
    { id: 'wave', text: 'Reach wave {n} in Endless', ev: 'wave', mode: 'max', d: 5, w: 12 },
  ];
  const DAILY_REWARD = { crystal: 40, shard: 3 }, WEEKLY_REWARD = { crystal: 150, goo: 4, dust: 1 };

  const Progress = {
    stats() {
      if (!save.stats) save.stats = {};
      const s = save.stats;
      for (const k of ['catches', 'elites', 'shinies', 'bestCombo', 'netBest', 'bossNoDamage', 'bestScore', 'bestWave']) if (s[k] == null) s[k] = 0;
      if (!s.bosses) s.bosses = {};
      return s;
    },
    // today's and this week's missions (picked the same way for everyone on that day, so they stay put)
    missions() {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      const week = monday.toISOString().slice(0, 10);
      if (!save.missions) save.missions = {};
      const m = save.missions;
      const pick = (seed, n, weekly) => {
        let h = 0; for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        const pool = MISSIONS.filter((q) => weekly || !q.weeklyOnly).slice();
        const out = [];
        while (out.length < n && pool.length) { h = (h * 1103515245 + 12345) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
        return out.map((q) => ({ id: q.id, target: weekly ? q.w : q.d, prog: 0, claimed: false }));
      };
      if (m.day !== day) { m.day = day; m.daily = pick('d' + day, 3, false); }
      if (m.week !== week) { m.week = week; m.weekly = pick('w' + week, 3, true); }
      return m;
    },
    bump(evName, amount, isMax) {
      const m = this.missions();
      for (const list of [m.daily, m.weekly]) for (const q of list) {
        const def = MISSIONS.find((d) => d.id === q.id);
        if (!def || def.ev !== evName || q.claimed) continue;
        q.prog = def.mode === 'max' ? Math.max(q.prog, amount) : q.prog + amount;
      }
    },
    event(e) {
      const s = this.stats();
      if (e.ev === 'catch') {
        s.catches++; this.bump('catch', 1);
        if (e.elite) { s.elites++; this.bump('catchElite', 1); }
        if (e.shiny) { s.shinies++; this.bump('shiny', 1); }
        if (e.netted) this.bump('catchNet', 1);
      }
      if (e.ev === 'net') s.netBest = Math.max(s.netBest, e.n);
      if (e.ev === 'combo') { s.bestCombo = Math.max(s.bestCombo, e.n); this.bump('combo', e.n, true); }
      if (e.ev === 'boss') { s.bosses[e.sprite] = (s.bosses[e.sprite] || 0) + 1; if (e.noDamage) s.bossNoDamage++; this.bump('boss', 1); }
      if (e.ev === 'wave') { s.bestWave = Math.max(s.bestWave, e.n); this.bump('wave', e.n, true); }
      if (e.ev === 'clear') { this.bump('clear', 1); this.bump('stars', e.stars); this.bump('score', e.score, true); s.bestScore = Math.max(s.bestScore, e.score); }
      if (e.ev === 'endlessEnd') { s.bestScore = Math.max(s.bestScore, e.score); }
      this.checkAchievements();
      persist();
    },
    checkAchievements() {
      const s = this.stats();
      if (!save.ach) save.ach = {};
      for (const a of ACHIEVEMENTS) {
        if (save.ach[a.id]) continue;
        if (a.val(s) >= a.goal) {
          save.ach[a.id] = Date.now();
          this.give(a.reward);
          Sfx.win();
          showToast(t('Achievement') + ': ' + t(a.name) + '!');
        }
      }
    },
    give(r) {
      for (const [k, v] of Object.entries(r)) {
        if (k === 'crystal') save.crystals += v;
        else save.mats[k] = (save.mats[k] || 0) + v;
      }
    },
    claimable() {
      const m = this.missions();
      return [...m.daily, ...m.weekly].filter((q) => !q.claimed && q.prog >= q.target).length;
    },
    updateDot() { const d = $('#goal-dot'); if (d) d.classList.toggle('on', this.claimable() > 0); },
  };

  function renderGoals() {
    Progress.checkAchievements();
    const m = Progress.missions();
    const now = new Date();
    const hoursLeft = 24 - now.getHours();
    const mission = (q, weekly) => {
      const def = MISSIONS.find((d) => d.id === q.id);
      const done = q.prog >= q.target;
      const reward = weekly ? WEEKLY_REWARD : DAILY_REWARD;
      return `<div class="mission${q.claimed ? ' claimed' : done ? ' done' : ''}">
        <b>${t(def.text).replace('{n}', q.target.toLocaleString())}</b>
        <div class="bar"><i style="width:${Math.min(100, (q.prog / q.target) * 100)}%"></i></div>
        <span class="prog">${Math.min(q.prog, q.target).toLocaleString()} / ${q.target.toLocaleString()}</span>
        <span class="reward">${REWARD(reward)}</span>
        ${q.claimed ? `<span class="claimed-tag">${t('Claimed')}</span>` : `<button class="btn small${done ? ' pink' : ''}" data-claim="${weekly ? 'w' : 'd'}:${q.id}" ${done ? '' : 'disabled'}><span>${t('Claim')}</span></button>`}
      </div>`;
    };
    $('#missions').innerHTML = `<h2>${t('Daily missions')} <small>${t('new in')} ${hoursLeft} h</small></h2>${m.daily.map((q) => mission(q, false)).join('')}
      <h2>${t('Weekly missions')}</h2>${m.weekly.map((q) => mission(q, true)).join('')}`;
    const s = Progress.stats();
    const got = ACHIEVEMENTS.filter((a) => save.ach && save.ach[a.id]).length;
    $('#ach-count').textContent = `${got} / ${ACHIEVEMENTS.length}`;
    $('#achievements').innerHTML = ACHIEVEMENTS.map((a) => {
      const done = save.ach && save.ach[a.id];
      const v = Math.min(a.val(s), a.goal);
      return `<div class="ach${done ? ' done' : ''}">
        <svg class="medal" viewBox="0 0 40 40"><circle cx="20" cy="22" r="14" fill="${done ? 'url(#starGold)' : 'rgba(255,255,255,0.12)'}" stroke="${done ? '#fff4c9' : 'rgba(159,183,232,0.5)'}" stroke-width="2"/><path d="M20 13l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="${done ? '#fff' : 'rgba(255,255,255,0.3)'}"/><path d="M12 3l5 9M28 3l-5 9" stroke="${done ? '#ff8ad8' : 'rgba(255,255,255,0.2)'}" stroke-width="4"/></svg>
        <div><b>${t(a.name)}</b><p>${t(a.desc)}</p><small>${done ? t('Unlocked') : `${v.toLocaleString()} / ${a.goal.toLocaleString()}`} · ${REWARD(a.reward)}</small></div>
      </div>`;
    }).join('');
    $$('[data-claim]').forEach((btn) => btn.addEventListener('click', () => {
      const [kind, id] = btn.dataset.claim.split(':');
      const list = kind === 'w' ? m.weekly : m.daily;
      const q = list.find((x) => x.id === id);
      if (!q || q.claimed || q.prog < q.target) return;
      q.claimed = true;
      Progress.give(kind === 'w' ? WEEKLY_REWARD : DAILY_REWARD);
      persist(); Sfx.win(); renderGoals(); focusFirst();
    }));
    Progress.updateDot();
  }

  // ---------------- Home base ----------------
  // Buildings on the base picture. Building and upgrading them costs crystals, materials and
  // sometimes a boss trophy; each level gives a permanent bonus in every level you play.
  const discovered = () => Object.keys(save.dex || {}).filter((k) => save.dex[k] > 0).length;
  const sanctRate = (l) => (2 + discovered()) * l;          // crystals per hour
  const sanctCap = (l) => 40 * l;
  function sanctPending() {
    const l = save.base.sanctuary || 0;
    if (!l || !save.base.sanctT) return 0;
    const hours = (Date.now() - save.base.sanctT) / 3600000;
    return Math.min(sanctCap(l), Math.floor(hours * sanctRate(l)));
  }
  const MODULES = [
    { id: 'sanctuary', name: 'Alien sanctuary', pos: [331, 275], max: 5,
      desc: 'Your caught aliens live here. They slowly make crystals for you, even while you are not playing.',
      effect: (l) => `${sanctRate(l)} ${t('crystals per hour')} (${t('max')} ${sanctCap(l)})`,
      cost: [{ crystal: 60, shard: 6 }, { crystal: 120, shard: 12, goo: 3 }, { crystal: 200, shard: 18, goo: 6, dust: 2 }, { crystal: 300, shard: 25, goo: 10, dust: 4 }, { crystal: 450, shard: 30, goo: 14, dust: 6, trophy: 'tidePearl' }] },
    { id: 'observatory', name: 'Observatory', pos: [1156, 188], max: 3,
      desc: 'Scans the skies for rare aliens: more shiny aliens and more drops.',
      effect: (l) => `${t('Shiny aliens')} +${50 * l}% · ${t('drops')} +${20 * l}%`,
      cost: [{ crystal: 150, shard: 10, goo: 4, dust: 1 }, { crystal: 260, shard: 16, goo: 8, dust: 3 }, { crystal: 400, shard: 24, goo: 12, dust: 6, trophy: 'echoBell' }] },
    { id: 'medbay', name: 'Med bay', pos: [1519, 425], max: 5,
      desc: 'Repairs your suit while you play: your health slowly comes back.',
      effect: (l) => `+1% ${t('health every')} ${[0, 10, 8, 6, 5, 4][l]} s`,
      cost: [{ crystal: 80, shard: 8 }, { crystal: 140, shard: 12, goo: 4 }, { crystal: 220, shard: 16, goo: 7, dust: 2 }, { crystal: 320, shard: 22, goo: 10, dust: 4, trophy: 'emberCore' }, { crystal: 450, shard: 28, goo: 14, dust: 6 }] },
    { id: 'lab', name: 'Lab', pos: [1762, 762], max: 5,
      desc: 'Research for your gear: extra grenades and a faster shield.',
      effect: (l) => `+${Math.floor(l / 2)} ${t('net grenades')} · ${t('shield recharges in')} ${20 - 2 * l} s${l >= 3 ? ' · +1 ' + t('time grenade') : ''}`,
      cost: [{ crystal: 70, shard: 8, goo: 1 }, { crystal: 130, shard: 12, goo: 4 }, { crystal: 210, shard: 16, goo: 7, dust: 2 }, { crystal: 310, shard: 22, goo: 10, dust: 4 }, { crystal: 450, shard: 28, goo: 14, dust: 6, trophy: 'prismHeart' }] },
    { id: 'hangar', name: 'Hangar', pos: [1387, 887], max: 5,
      desc: 'Tunes your helper drones (from the Star shop): they fire more often and hit harder.',
      effect: (l) => `${t('Drones fire every')} ${10 - l} s · ${t('damage')} ${3 + Math.floor(l / 2)}`,
      cost: [{ crystal: 100, shard: 10, goo: 2 }, { crystal: 170, shard: 14, goo: 5 }, { crystal: 250, shard: 18, goo: 8, dust: 2 }, { crystal: 350, shard: 24, goo: 11, dust: 4 }, { crystal: 480, shard: 30, goo: 15, dust: 6, trophy: 'vortexEye' }] },
    { id: 'workshop', name: 'Workshop', pos: [588, 900], open: 'workshop', desc: 'Upgrade your blaster, net grenade and shield.' },
    { id: 'command', name: 'Command center', pos: [875, 550], command: true, desc: 'The heart of your base.' },
    { id: 'quarters', name: 'Crew quarters', pos: [219, 638], soon: true, desc: 'Coming soon.' },
  ];
  const baseLevel = () => MODULES.filter((m) => m.max).reduce((a, m) => a + (save.base[m.id] || 0), 0);

  function renderHome() {
    $('#base-level').innerHTML = `${t('Base level')} <b>${baseLevel()}</b>`;
    const inv = [['crystal', save.crystals], ...['shard', 'goo', 'dust'].map((k) => [k, save.mats[k] || 0])];
    $('#home-inv').innerHTML = inv.map(([k, n]) => `<span class="inv">${MAT_SVG[k]}<b>${n}</b></span>`).join('');
    const box = $('#buildings');
    box.innerHTML = '';
    for (const m of MODULES) {
      const l = save.base[m.id] || 0;
      const b = document.createElement('button');
      b.className = 'bld' + (m.max && !l ? ' unbuilt' : '') + (m.soon ? ' soon' : '') + (m.max && l >= m.max ? ' maxed' : '') + (!m.max && !m.soon ? ' fixed' : '');
      b.style.left = m.pos[0] + 'px'; b.style.top = m.pos[1] + 'px';
      b.style.setProperty('--lv', m.max ? l / m.max : 1);
      const pend = m.id === 'sanctuary' ? sanctPending() : 0;
      const tag = m.soon ? t('Coming soon') : m.max ? (l ? `${t('Level')} ${l}` : t('Build')) : '';
      b.innerHTML = `<span class="bld-ring"></span><span class="bld-label">${t(m.name)}${tag ? `<small>${tag}</small>` : ''}</span>`
        + (pend > 0 ? `<span class="bld-pend">+${pend}</span>` : '');
      b.addEventListener('click', () => { Sfx.select(); if (m.open) { workshopFrom = 'home'; go(m.open); } else openModule(m); });
      box.appendChild(b);
    }
  }

  function openModule(m) {
    const panel = $('#base-panel');
    const l = save.base[m.id] || 0;
    let html = `<h2>${t(m.name)}</h2><p class="muted">${t(m.desc)}</p>`;
    let btn = null;
    if (m.command) {
      html += `<div class="base-list">` + MODULES.filter((q) => q.max).map((q) => {
        const ql = save.base[q.id] || 0;
        return `<span>${t(q.name)}</span><b>${ql ? `${t('Level')} ${ql}/${q.max}` : t('Not built yet')}</b>`;
      }).join('') + `</div><p>${t('Base level')} <b>${baseLevel()}</b></p>`;
    } else if (m.max) {
      const maxed = l >= m.max, cost = maxed ? null : m.cost[l];
      const pips = Array.from({ length: m.max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
      html += `<div class="pips">${pips}</div>`;
      html += `<p>${l ? m.effect(l) : t('Not built yet')}</p>`;
      if (!maxed) {
        html += `<p class="next">${t(l ? 'Next' : 'When built')}: ${m.effect(l + 1)}</p>`;
        html += `<div class="cost">${Object.entries(cost).map(([k, v]) => {
          const ok = k === 'trophy' ? have('trophy', v) > 0 : have(k) >= v;
          return `<span class="${ok ? '' : 'short'}">${k === 'trophy' ? MAT_SVG.trophy + t(TROPHY_NAMES[v]) : MAT_SVG[k] + v}</span>`;
        }).join('')}</div>`;
      } else html += `<p class="next">${t('Fully upgraded!')}</p>`;
      if (m.id === 'sanctuary' && l) {
        const aliens = Object.keys(save.dex || {}).filter((k) => save.dex[k] > 0);
        html += `<div class="sanct">${aliens.map((a, i) => `<img src="assets/dex/${a}.png" alt="" style="animation-delay:${(i * 0.37) % 3}s">`).join('')}</div>`;
      }
      btn = document.createElement('button');
      btn.className = 'btn small' + (maxed ? '' : ' pink');
      btn.innerHTML = `<span>${maxed ? t('Max') : l ? t('Upgrade') : t('Build')}</span>`;
      btn.disabled = maxed || !canPay(cost);
      btn.addEventListener('click', () => {
        if (maxed || !canPay(cost)) return;
        pay(cost);
        save.base[m.id] = l + 1;
        if (m.id === 'sanctuary' && !save.base.sanctT) save.base.sanctT = Date.now();
        persist(); Sfx.win(); renderHome(); openModule(m);
      });
    }
    panel.innerHTML = html;
    const row = document.createElement('div');
    row.className = 'row';
    if (btn) row.appendChild(btn);
    if (m.id === 'hangar') {
      const d = document.createElement('button');
      d.className = 'btn small';
      d.innerHTML = `<span>${t('Drone abilities')}</span>`;
      d.addEventListener('click', () => { $('#ov-base').classList.remove('show'); openMods('drone', 'home'); });
      row.appendChild(d);
    }
    if (m.id === 'sanctuary' && sanctPending() > 0) {
      const c = document.createElement('button');
      c.className = 'btn small pink';
      c.innerHTML = `<span>${t('Collect')} ${sanctPending()} ${t('crystals')}</span>`;
      c.addEventListener('click', () => {
        const n = sanctPending();
        save.crystals += n; save.base.sanctT = Date.now();
        persist(); Sfx.reload(); renderHome(); openModule(m);
      });
      row.appendChild(c);
    }
    const close = document.createElement('button');
    close.className = 'btn small'; close.dataset.action = 'base-close';
    close.innerHTML = `<span>${t('Close')}</span>`;
    row.appendChild(close);
    panel.appendChild(row);
    $('#ov-base').classList.add('show');
    setTimeout(focusFirst, 30);
  }
  // The Workshop can be opened from the world screen or from its building on the Home base
  let workshopFrom = 'levels';
  actions['workshop-back'] = () => go(workshopFrom);
  // Touch mode (Android app): arranging the on-screen gamepad
  actions['arrange-touch'] = () => go('touchedit');
  actions['touch-done'] = () => go('options');
  actions['touch-reset'] = () => { if (window.Touch) Touch.resetLayout(); };
  if (window.SV_TOUCH && window.Touch) {
    document.body.classList.add('touch');
    Touch.active = true;
    Touch.init({
      getLayout: () => save.options.touchLayout,
      saveLayout: (L) => { if (L) save.options.touchLayout = L; else delete save.options.touchLayout; persist(); },
      Level, Net, owns: (id) => !!(save.owned || {})[id],
    });
  }
  actions['open-mods'] = () => openMods('weapon', 'workshop');
  actions['base-close'] = () => { $('#ov-base').classList.remove('show'); setTimeout(focusFirst, 30); };

  // ---------------- Account & saves ----------------
  // Replace the progress on this device (keeps this device's own options such as graphics and language)
  function replaceSave(data) {
    const opts = save.options;
    Object.keys(save).forEach((k) => { delete save[k]; });
    Object.assign(save, JSON.parse(JSON.stringify(DEFAULT_SAVE)), data, { options: opts });
    if (!save.mats) save.mats = { shard: 0, goo: 0, dust: 0 };
    if (!save.trophies) save.trophies = {};
    if (!save.upg) save.upg = { blaster: 1, net: 1, shield: 1 };
    if (!save.base) save.base = {};
    if (!save.mods) save.mods = {};
    if (!save.loadout) save.loadout = {};
    try { localStorage.setItem('starvoyager.save', JSON.stringify(save)); } catch (e) {}
    renderLevels();
  }

  // ---------------- Licences ----------------
  // With licensing switched on (js/config.js), only the free worlds are open without a licence.
  // A licence is written by the server (after a payment) or by hand in the Firebase console:
  // Firestore → licenses → document named after the account ID → field full = true (or until = a date).
  const LIC = (window.SV_CONFIG || {}).licensing || {};
  function hasFullGame() {
    if (!LIC.enabled) return true;
    const l = window.Cloud && window.Cloud.license;
    if (!l) return false;
    if (l.full === true) return true;
    const until = l.until && (l.until.toDate ? l.until.toDate() : new Date(l.until));
    return !!(until && until > new Date());
  }
  const isFreeWorld = (w) => !LIC.enabled || (LIC.freeWorlds || [1]).includes(Number(w));
  function licenceHtml() {
    if (!LIC.enabled) return '';
    const C = window.Cloud;
    if (hasFullGame()) return `<p class="lic ok">${t('Licence')}: <b>${t('Full game')}</b></p>`;
    const id = C && C.user ? C.user.uid : '';
    return `<p class="lic">${t('Licence')}: <b>${t('Free version')}</b></p>
      ${LIC.buyUrl ? `<div class="row"><button class="btn small pink" data-acc="buy"><span>${t('Unlock the full game')}</span></button></div>` : `<p class="muted small">${t('The full game can be bought soon.')}</p>`}
      ${id ? `<p class="muted small">${t('Account ID')}: <code>${id}</code></p>` : ''}`;
  }

  let accMsg = '', accGate = null, accountFrom = 'options';
  const summaryText = (p) => `${p.stars} ★ · ${p.crystals} ${t('crystals')} · ${p.aliens} ${t('aliens')}`;

  function renderAccount() {
    const box = $('#acc-cloud');
    const C = window.Cloud;
    let html = `<h2>${t('Parent account')}</h2>`;
    if (!C || !C.enabled) {
      html += `<p class="muted">${t('Online accounts are not switched on yet for this game.')}</p>
        <p class="muted small">${t('The game owner can switch them on in js/config.js (see README).')}</p>`;
    } else if (C.status === 'loading') {
      html += `<p>${t('Connecting…')}</p>`;
    } else if (C.status === 'error' && !C.user) {
      html += `<p class="bad">${t('Could not reach the account service.')}</p><p class="muted small">${C.error}</p>`;
    } else if (C.user) {
      const when = C.lastSync ? new Date(C.lastSync).toLocaleTimeString() : '–';
      html += `<p>${t('Signed in as')} <b>${C.user.email || ''}</b></p>
        <p class="muted">${C.status === 'syncing' ? t('Saving…') : C.status === 'error' ? `<span class="bad">${t('Could not save online')}</span>` : `${t('Saved online')} · ${when}`}</p>
        <p class="muted small">${t('Your progress is saved on this device and online, so you can continue on another TV or laptop.')}</p>
        ${licenceHtml()}
        <div class="row"><button class="btn small pink" data-acc="sync"><span>${t('Save now')}</span></button>
        <button class="btn small" data-acc="signout"><span>${t('Sign out')}</span></button></div>`;
    } else {
      // Signing in / creating an account is for grown-ups: a small sum first (parental gate)
      html += `<p class="muted small">${t('For parents: sign in to save progress online and continue on other devices.')}</p>
        <label class="field"><span>${t('Email')}</span><input id="acc-email" type="email" autocomplete="email"></label>
        <label class="field"><span>${t('Password')}</span><input id="acc-pw" type="password" autocomplete="current-password"></label>`;
      if (accGate) html += `<label class="field"><span>${t('Grown-ups only')}: ${accGate.a} + ${accGate.b} =</span><input id="acc-gate" inputmode="numeric"></label>`;
      html += `<div class="row">
        <button class="btn small pink" data-acc="signin"><span>${t('Sign in')}</span></button>
        <button class="btn small" data-acc="signup"><span>${accGate ? t('Create account') : t('New account')}</span></button>
        <button class="btn small" data-acc="reset"><span>${t('Forgot password')}</span></button></div>`;
    }
    if (accMsg) html += `<p class="acc-msg">${accMsg}</p>`;
    box.innerHTML = html;

    bindAccount();
  }

  function bindAccount() {
    const C = window.Cloud;
    const val = (id) => (($(id) || {}).value || '').trim();
    const say = (m) => { accMsg = m; renderAccount(); };
    const errText = (e) => {
      const code = (e && e.code) || '';
      if (code.includes('wrong-password') || code.includes('invalid-credential') || code.includes('user-not-found')) return t('Email or password is not correct.');
      if (code.includes('email-already-in-use')) return t('There is already an account with this email.');
      if (code.includes('weak-password')) return t('Choose a password of at least 6 characters.');
      if (code.includes('invalid-email')) return t('This email address is not valid.');
      return t('Something went wrong. Please try again.');
    };
    $$('[data-acc]').forEach((b) => b.addEventListener('click', async () => {
      const a = b.dataset.acc;
      try {
        if (a === 'signin') { accMsg = ''; await C.signIn(val('#acc-email'), val('#acc-pw')); say(''); }
        if (a === 'signup') {
          if (!accGate) { accGate = { a: 7 + Math.floor(Math.random() * 12), b: 5 + Math.floor(Math.random() * 9) }; return say(t('Grown-ups: please solve the sum to create an account.')); }
          if (Number(val('#acc-gate')) !== accGate.a + accGate.b) { accGate = null; return say(t('That is not right. Please ask a grown-up.')); }
          await C.signUp(val('#acc-email'), val('#acc-pw')); accGate = null; say(t('Account created!'));
        }
        if (a === 'reset') { if (!val('#acc-email')) return say(t('Enter your email first.')); await C.resetPassword(val('#acc-email')); say(t('We sent an email to reset your password.')); }
        if (a === 'signout') { await C.signOut(); say(''); }
        if (a === 'buy' && LIC.buyUrl) {
          // the payment page gets the account ID, so the payment can be linked to this account
          const u = LIC.buyUrl + (LIC.buyUrl.includes('?') ? '&' : '?') + 'account=' + encodeURIComponent(C.user.uid) + '&email=' + encodeURIComponent(C.user.email || '');
          window.open(u, '_blank');
        }
        if (a === 'sync') { await C.push(); say(''); }
      } catch (e) { say(errText(e)); }
      Sfx.select();
    }));
  }

  // Asked once, after signing in, if this device and the cloud have different progress
  function askSaveChoice(local, cloud) {
    return new Promise((resolve) => {
      const box = $('#choice-box');
      box.innerHTML = `<h2>${t('Which progress do you want to keep?')}</h2>
        <div class="choice">
          <button class="btn pink" data-choice="cloud"><span>${t('Online')}: ${summaryText(cloud)}</span></button>
          <button class="btn" data-choice="local"><span>${t('This device')}: ${summaryText(local)}</span></button>
        </div>
        <p class="muted small">${t('The other one is replaced.')}</p>`;
      if (current !== 'account') go('account');
      $('#ov-choice').classList.add('show');
      $$('[data-choice]').forEach((b) => b.addEventListener('click', () => {
        $('#ov-choice').classList.remove('show');
        resolve(b.dataset.choice);
      }));
      setTimeout(focusFirst, 30);
    });
  }

  actions['open-account'] = () => { accountFrom = 'options'; go('account'); };
  actions['account-back'] = () => { accMsg = ''; accGate = null; go(accountFrom); };
  if (window.Cloud) {
    window.Cloud.onChange(() => { if (current === 'account') renderAccount(); if (current === 'levels') renderLevels(); });
    window.Cloud.init({ getLocal: () => save, useCloud: (data) => replaceSave(data), ask: askSaveChoice });
  }

  // ---------------- Region abilities: weapon mods and drone abilities ----------------
  // Each world: one drone ability and one weapon mod, made with that world's material and its boss trophy.
  const REGION_BY_WORLD = window.SV.REGION_MAT;
  const MODS = [
    { id: 'mirror', kind: 'drone', world: 1, name: 'Mirror drones', desc: 'Your drones make hologram copies of themselves. Aliens get confused and stop throwing.',
      eff: (l) => t('{a} copies · aliens confused {b} s · every {c} s').replace('{a}', [2, 3, 4][l - 1]).replace('{b}', [3, 4, 5][l - 1]).replace('{c}', [14, 12, 10][l - 1]) },
    { id: 'bubble', kind: 'weapon', world: 1, name: 'Bubble shot', desc: 'Armoured aliens you hit are trapped in a floating bubble: they cannot move or throw.',
      eff: (l) => t('Bubble {a} s').replace('{a}', [2, 3, 4][l - 1]) + (l === 3 ? ' · ' + t('+1 damage to bubbled aliens') : '') },
    { id: 'flare', kind: 'drone', world: 2, name: 'Flare drone', desc: 'The drone fires a fan of sparks that also hits other aliens.',
      eff: (l) => t('Hits {a} extra aliens').replace('{a}', [2, 3, 3][l - 1]) + (l === 3 ? ' · ' + t('double damage') : '') },
    { id: 'ember', kind: 'weapon', world: 2, name: 'Ember rounds', desc: 'Your shots set armoured aliens on fire, so they lose extra armour.',
      eff: (l) => t('Burns after {a} s').replace('{a}', [2, 1.5, 1][l - 1]) + (l >= 2 ? ' · ' + t('the flame jumps to a neighbour') : '') },
    { id: 'wave', kind: 'drone', world: 3, name: 'Wave drone', desc: 'Sends a wave that pushes all aliens back and washes away flying rocks.',
      eff: (l) => t('Every {a} s · pushes back {b}%').replace('{a}', [12, 10, 8][l - 1]).replace('{b}', [15, 20, 25][l - 1]) },
    { id: 'whirl', kind: 'weapon', world: 3, name: 'Whirlpool net', desc: 'The net grenade leaves a whirlpool that keeps catching aliens.',
      eff: (l) => t('Whirlpool {a} s').replace('{a}', [2, 3, 4][l - 1]) },
    { id: 'prismd', kind: 'drone', world: 4, name: 'Prism drone', desc: 'Prism beams strip the armour off armoured aliens.',
      eff: (l) => t('Up to {a} armoured aliens per shot').replace('{a}', [2, 3, 4][l - 1]) },
    { id: 'pshield', kind: 'weapon', world: 4, name: 'Prism shield', desc: 'Rocks you block with the shield bounce back and hit an alien.',
      eff: (l) => t('{a} damage per bounce').replace('{a}', l) },
    { id: 'sonar', kind: 'drone', world: 5, name: 'Sonar drone', desc: 'A sonar pulse stuns nearby aliens and lights up the dark.',
      eff: (l) => t('Stun {a} s · every {b} s').replace('{a}', [1.5, 2, 2.5][l - 1]).replace('{b}', [10, 8, 6][l - 1]) },
    { id: 'homing', kind: 'weapon', world: 5, name: 'Homing shot', desc: 'Your shots find aliens more easily.',
      eff: (l) => t('+{a}% hit area').replace('{a}', [20, 35, 50][l - 1]) },
    { id: 'blades', kind: 'drone', world: 6, name: 'Blade drone', desc: 'Throws blades that destroy rocks flying at you.',
      eff: (l) => t('A rock every {a} s').replace('{a}', [4, 3, 2][l - 1]) },
    { id: 'vnet', kind: 'weapon', world: 6, name: 'Vortex net', desc: 'The net grenade pulls in aliens from much further away.',
      eff: (l) => t('Net {a}% bigger').replace('{a}', [25, 40, 60][l - 1]) },
  ];
  const WORLD_TROPHY = { 1: 'nebulaCrown', 2: 'emberCore', 3: 'tidePearl', 4: 'prismHeart', 5: 'echoBell', 6: 'vortexEye' };
  function modCost(m, lvl) {       // cost of getting level `lvl` (1..3)
    const c = { crystal: [80, 150, 250][lvl - 1], [REGION_BY_WORLD[m.world]]: [6, 12, 20][lvl - 1] };
    if (lvl >= 2) c.goo = [0, 4, 8][lvl - 1];
    if (lvl >= 3) c.dust = 3;
    if (lvl === 1) c.trophy = WORLD_TROPHY[m.world];
    return c;
  }
  let modsTab = 'weapon', modsFrom = 'workshop';
  actions['mods-weapon'] = () => { modsTab = 'weapon'; renderMods(); };
  actions['mods-drone'] = () => { modsTab = 'drone'; renderMods(); };
  actions['mods-back'] = () => go(modsFrom);
  function openMods(tab, from) { modsTab = tab; modsFrom = from; go('mods'); }

  function renderMods() {
    if (!save.mods) save.mods = {};
    if (!save.loadout) save.loadout = {};
    $('#tab-mw').classList.toggle('pink', modsTab === 'weapon');
    $('#tab-md').classList.toggle('pink', modsTab === 'drone');
    const name = (id) => { const m = MODS.find((q) => q.id === id); return m ? t(m.name) : t('None'); };
    $('#loadout').innerHTML = `<span>${t('Loadout')}:</span> <b>${name(save.loadout.weapon)}</b> + <b>${name(save.loadout.drone)}</b>`;
    const hasDrone = save.owned.helperDrone || save.owned.droneTwo;
    $('#mods-note').textContent = modsTab === 'drone' && !hasDrone ? t('Needs a helper drone from the Star shop') : '';
    const inv = Object.values(REGION_BY_WORLD).map((k) => `<span class="inv">${MAT_SVG[k]}<b>${save.mats[k] || 0}</b></span>`).join('');
    $('#mods-inv').innerHTML = inv;
    const grid = $('#mods-grid');
    grid.innerHTML = '';
    for (const m of MODS.filter((q) => q.kind === modsTab)) {
      const lvl = save.mods[m.id] || 0, maxed = lvl >= 3;
      const cost = maxed ? null : modCost(m, lvl + 1);
      const locked = !lvl && !(save.trophies[WORLD_TROPHY[m.world]] > 0);
      const equipped = save.loadout[m.kind] === m.id;
      const card = document.createElement('div');
      card.className = 'mod' + (locked ? ' locked' : '') + (equipped ? ' equipped' : '');
      const pips = [1, 2, 3].map((i) => `<i class="${i <= lvl ? 'on' : ''}"></i>`).join('');
      const bossName = LEVELS[m.world].boss.name;
      card.innerHTML = `<div class="mod-head">${MAT_SVG[REGION_BY_WORLD[m.world]]}<div><b>${t(m.name)}</b><small>${t(LEVELS[m.world].name)}</small></div></div>
        <div class="pips">${pips}</div><p>${t(m.desc)}</p>
        ${lvl ? `<p class="now">${m.eff(lvl)}</p>` : ''}
        ${locked ? `<p class="lock">${t('Beat the {a} to unlock').replace('{a}', bossName)}</p>`
          : cost ? `<p class="next">${t(lvl ? 'Next' : 'When built')}: ${m.eff(lvl + 1)}</p><div class="cost">${Object.entries(cost).map(([k, v]) => {
            const ok = k === 'trophy' ? have('trophy', v) > 0 : have(k) >= v;
            return `<span class="${ok ? '' : 'short'}">${k === 'trophy' ? MAT_SVG.trophy + t(TROPHY_NAMES[v]) : MAT_SVG[k] + v}</span>`;
          }).join('')}</div>` : `<p class="next">${t('Fully upgraded!')}</p>`}`;
      const row = document.createElement('div');
      row.className = 'row';
      if (!locked && !maxed) {
        const b = document.createElement('button');
        b.className = 'btn small pink';
        b.innerHTML = `<span>${lvl ? t('Upgrade') : t('Build')}</span>`;
        b.disabled = !canPay(cost);
        b.addEventListener('click', () => {
          if (!canPay(cost)) return;
          pay(cost); save.mods[m.id] = lvl + 1;
          if (!save.loadout[m.kind]) save.loadout[m.kind] = m.id;      // the first one you make is equipped
          persist(); Sfx.win(); renderMods(); focusFirst();
        });
        row.appendChild(b);
      }
      if (lvl) {
        const e = document.createElement('button');
        e.className = 'btn small';
        e.innerHTML = `<span>${equipped ? t('Equipped') : t('Equip')}</span>`;
        e.addEventListener('click', () => {
          save.loadout[m.kind] = equipped ? null : m.id;
          persist(); Sfx.select(); renderMods(); focusFirst();
        });
        row.appendChild(e);
      }
      card.appendChild(row);
      grid.appendChild(card);
    }
  }

  // Star items: special upgrades bought with the stars you earn on levels
  const STAR_SHOP = [
    { id: 'goldBlaster',  name: 'Golden blaster',  text: 'Your blaster turns shiny gold.', price: 3 },
    { id: 'rainbowLaser', name: 'Rainbow lasers',  text: 'Every shot sparkles in all colours.', price: 2 },
    { id: 'crystalMagnet', name: 'Crystal magnet', text: 'Every alien you catch gives 2 crystals instead of 1.', price: 4 },
    { id: 'secondChance', name: 'Second chance',   text: 'Once per level: when your health runs out, come back with 50%.', price: 5 },
    { id: 'helperDrone',  name: 'Helper drone',    text: 'A little drone that catches an alien for you every 10 seconds.', price: 8 },
    { id: 'droneTwo',     name: 'Drone 2',         text: 'A second helper drone that flies and catches aliens on its own.', price: 10 },
  ];
  const totalStars = () => Object.values(save.stages || {}).reduce((a, s) => a + (s.stars || 0), 0);
  const starsLeft = () => totalStars() - (save.starSpent || 0);
  let shopTab = 'crystal';
  actions['shop-crystal'] = () => { shopTab = 'crystal'; renderShop(); };
  actions['shop-star'] = () => { shopTab = 'star'; renderShop(); };

  function renderShop() {
    const star = shopTab === 'star';
    $('#tab-crystal').classList.toggle('pink', !star);
    $('#tab-star').classList.toggle('pink', star);
    $('#shop-wallet').innerHTML = star
      ? `${starSvg(true)} <span>${starsLeft()}</span> ${t('stars to spend')}`
      : `<i class="crystal"></i><span>${save.crystals}</span> ${t('crystals')}`;
    const grid = $('#shop-grid');
    grid.innerHTML = '';
    for (const item of star ? STAR_SHOP : SHOP) {
      if (item.needs && !save.owned[item.needs]) continue;     // shown once the first item is bought
      const owned = !!save.owned[item.id];
      const money = star ? starsLeft() : save.crystals;
      const div = document.createElement('div');
      div.className = 'item' + (owned ? ' owned' : '') + (star ? ' star-item' : '');
      div.innerHTML = `<b>${t(item.name)}</b><p>${t(item.text)}</p>`;
      const btn = document.createElement('button');
      btn.className = 'btn small' + (owned ? '' : ' pink');
      btn.innerHTML = `<span>${owned ? t('Owned') : (star ? starSvg(true) : '<i class="crystal"></i>') + ' ' + item.price}</span>`;
      btn.disabled = owned || money < item.price;
      btn.setAttribute('aria-label', owned ? item.name + ', owned' : `Buy ${item.name} for ${item.price} ${star ? 'stars' : 'crystals'}`);
      btn.addEventListener('click', () => {
        if (owned || (star ? starsLeft() : save.crystals) < item.price) return;
        if (star) save.starSpent = (save.starSpent || 0) + item.price;
        else save.crystals -= item.price;
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
    if (key === 'lang') { I18N.setLang(v); [1, 2].forEach((pl) => Net.sendTo(pl, { m: 'welcome', player: pl, lang: v })); }
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
      d.innerHTML = `<canvas width="132" height="132"></canvas><div><b>0</b><small>/${goal(t)}</small></div>`;
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
        el.classList.toggle('done', L.caught[t] >= goal(t));
      }
      $('#hud-crystals').textContent = save.crystals + L.earned;
    }
    if ((kind === 'all' || kind === 'gear') && P1) {
      const label = P1.equipped === 'grenade' ? `Net grenade · ${P1.grenades} left`
        : P1.equipped === 'shield' ? `Shield ${P1.shieldHP}/${window.SV.shieldMax()}`
        : 'Blaster';
      $('#gear-label').textContent = label;
      $('#pips').style.opacity = P1.equipped === 'gun' ? 1 : 0.25;
    }
    if (kind === 'fps') {
      const el = $('#fps');
      el.style.display = save.options.fps === 'on' ? 'block' : 'none';
      // speed test: frames per second, and where the time goes (game logic / drawing, in milliseconds per frame)
      const v = typeof value === 'object' ? value : { fps: value };
      el.innerHTML = `<b>${v.fps} FPS</b> · ${L.quality}${L.frameCap ? ' · 30 cap' : ''}`
        + (v.logic != null ? `<br>logic ${v.logic.toFixed(1)} ms · draw ${v.draw.toFixed(1)} ms<br>slow ${v.slow}% · worst ${v.gap} ms` : '');
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
    if (kind === 'all' || kind === 'score') $('#score').textContent = (L.score || 0).toLocaleString();
    if (kind === 'combo') {
      const el = $('#combo');
      if (!value) el.classList.remove('show');
      else {
        el.innerHTML = `×${value.mult} <small>${value.combo} ${t('combo')}</small>`;
        el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      }
    }
    if (kind === 'stat') Progress.event(value);
    if (kind === 'drop') {
      // materials are saved right away, so they are kept even if you leave the level
      if (value.startsWith('trophy:')) {
        const id = value.slice(7);
        save.trophies[id] = (save.trophies[id] || 0) + 1;
        showToast(t('Boss trophy') + ': ' + t(TROPHY_NAMES[id] || id) + '!');
      } else {
        save.mats[value] = (save.mats[value] || 0) + 1;
        if (value === 'goo') showToast(t('Rare drop') + ': ' + t('Alien goo'));
        if (value === 'dust') showToast(t('Epic drop') + ': ' + t('Star dust'));
      }
      persist();
      renderMatsHud();
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
      if (!Level.plat) showToast(lastMode !== 'phone' ? 'Click a monster to fire' : Input.isCam() ? 'Hold the circle on a monster to fire' : 'Aim and press Fire');
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
    currentPlanet = 1;
    if (!stageUnlocked(world, stage)) return;
    lastMode = mode; lastWorld = world; lastStage = stage;
    $('#ov-world').classList.remove('show');
    optionsFromGame = false;
    hideOverlays();
    go('game');
    $('#cal-hand').textContent = save.options.hand;
    updatePhoneUi();
    $('#prompt').classList.remove('show');
    if (window.SV_TOUCH && window.Touch) Touch.prepare();
    Level.touchMode = !!window.SV_TOUCH;
    Level.start({ level: world, stage, mode, players: !window.SV_TOUCH && Net.isConnected(2) ? 2 : 1, save, options: save.options, onEnd: endLevel, onHud, getMenuButtons });
    buildCatches();
    onHud('all', null, Level);
    $('#screen-game').classList.toggle('plat', !!Level.plat);
    $('#screen-game').classList.toggle('endless', !!Level.endless);
    Net.setLayout(Level.plat ? 'plat' : 'normal');
    if (mode === 'phone' && Input.isCam()) onHud('cal', 'Looking for you…', Level);
    else onHud('countdown', 3, Level);
  }

  function endLevel(r) {
    const bonus = r.won ? 15 : 0;
    save.crystals += r.earned + bonus;
    const rating = starRating(r);
    if (r.endless) {
      const eb = save.endlessBest || { wave: 0, score: 0 };
      r.newBest = r.score > (eb.score || 0) && (eb.score || 0) > 0;
      save.endlessBest = { wave: Math.max(eb.wave || 0, r.wave), score: Math.max(eb.score || 0, r.score) };
    }
    if (r.won) {
      if (!save.stages) save.stages = {};
      const k = key(r.world, r.stage);
      const prev = save.stages[k] || { stars: 0 };
      save.stages[k] = { stars: Math.max(prev.stars || 0, rating.stars), time: Math.min(prev.time || Infinity, r.time), score: Math.max(prev.score || 0, r.score || 0) };
      r.newBest = (r.score || 0) > (prev.score || 0) && (prev.score || 0) > 0;
    }
    if (r.won) Progress.event({ ev: 'clear', stars: rating.stars, score: r.score });
    else if (r.endless) Progress.event({ ev: 'endlessEnd', score: r.score });
    persist();
    $('#prompt').classList.remove('show');
    const cfgName = LEVELS[r.world].name;
    $('#end-title').textContent = r.endless ? `${t('Endless')}: ${t('wave')} ${r.wave}` : !r.won ? 'Your shields are down' : LEVELS[r.world].plat ? `${cfgName} cleared!` : r.stage === STAGES ? `${cfgName} cleared!` : `Level ${r.stage} clear`;
    $('#end-stars').innerHTML = r.won ? starsHtml(rating.stars) : '';
    // A friendly tip on what would give more stars
    let tip = '';
    if (r.won && rating.stars < 3) {
      const p = rating.parts, weakest = Object.entries(p).sort((a, b) => a[1] - b[1])[0][0];
      tip = { health: 'Tip: take less damage for more stars', accuracy: 'Tip: aim carefully, fewer missed shots give more stars', time: `Tip: be a bit quicker, the target time is ${fmtTime(r.par)}` }[weakest];
    }
    $('#end-tip').textContent = tip;
    const caught = r.endless ? `<span>${t('Wave')}</span><b>${r.wave}</b>` : types().map((t) => `<span>${SPR[t].name}</span><b>${r.caught[t]}/${goal(t)}</b>`).join('')
      + (r.boss ? `<span>${r.boss.name}</span><b>${r.boss.caught ? 'Caught!' : 'Got away'}</b>` : '');
    const bonusRows = r.won && r.bonus ? `
      <span>${t('No damage bonus')}</span><b>${r.bonus.noDamage.toLocaleString()}</b>
      <span>${t('Accuracy bonus')}</span><b>${r.bonus.accuracy.toLocaleString()}</b>
      <span>${t('Speed bonus')}</span><b>${r.bonus.time.toLocaleString()}</b>` : '';
    const dropText = Object.entries(r.drops || {}).map(([k, n]) => `${n}× ${t(k.startsWith('trophy:') ? (TROPHY_NAMES[k.slice(7)] || k) : MAT_NAMES[k] || k)}`).join(', ');
    $('#end-score').innerHTML = `<span class="end-score-num">${(r.score || 0).toLocaleString()}</span>`
      + (r.newBest ? `<span class="new-best">${t('New high score!')}</span>` : '')
      + (r.bestCombo > 1 ? `<small>${t('Best combo')}: ${r.bestCombo}</small>` : '');
    $('#end-stats').innerHTML = `${bonusRows}
      ${dropText ? `<span>${t('Drops')}</span><b>${dropText}</b>` : ''}
      <span>Time</span><b>${fmtTime(r.time)}${r.endless ? '' : ` <small>(target ${fmtTime(r.par)})</small>`}</b>
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
    // typing in a text field (email, password, save code): leave the keys alone, except Escape
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Escape') return;
    const inGame = current === 'game' && Level.state === 'play';
    if (inGame && (e.key === 'r' || e.key === 'R')) { Level.keyReload(); return; }
    if (inGame && ['1', '2', '3', '4'].includes(e.key)) { Level.keyEquipIndex(Number(e.key) - 1); return; }
    if (inGame && (e.key === 'g' || e.key === 'G')) { Level.toggleBelt(); return; }
    if (current === 'intro' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); endIntro(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Backspace' || e.key === 'GoBack') {
      if (inGame) {
        e.preventDefault();
        if (Level.paused) Level.resume(); else Level.pause();
        return;
      }
      if (current === 'levels' && $('#ov-world').classList.contains('show')) { e.preventDefault(); actions['world-close'](); return; }
      if (current === 'dex' && Dex.detailOpen()) { e.preventDefault(); Dex.hide(); setTimeout(focusFirst, 30); return; }
      if (current === 'options') { e.preventDefault(); closeOptions(); return; }
      if (current === 'intro') { e.preventDefault(); endIntro(); return; }
      if (current === 'home' && $('#ov-base').classList.contains('show')) { e.preventDefault(); actions['base-close'](); return; }
      const back = { options: 'start', levels: 'planets', planets: 'start', shop: 'planets', connect: 'levels', quit: 'start', dex: 'levels', home: 'planets', workshop: workshopFrom, goals: 'planets', mods: modsFrom, account: accountFrom, touchedit: 'options' }[current];
      if (back) { e.preventDefault(); go(back); }
      return;
    }
    if (inGame && Level.plat) return;     // the platformer uses the arrow keys for moving
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

  // Android app: the phone's back button. On the title screen it closes the app, elsewhere it acts like Escape.
  window.SVBack = () => {
    if (current === 'start') return 'exit';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return 'ok';
  };
  if (window.SV_APP) document.body.classList.add('in-app');

  // ---------------- Planet choice ----------------
  // Each planet spins slowly: its 12 frames blend into each other while the picture turns a little.
  // Novara holds all current worlds; Cindera is the next planet (coming soon).
  let optionsFrom = 'start';
  const PLANETS = [
    { id: 1, name: 'Novara', img: 'assets/planet1.png', cell: 340, frames: 12, open: true },
    { id: 2, name: 'Cindera', img: 'assets/planet2.png', cell: 400, frames: 12, open: true, soon: true,
      worlds: [{ name: 'Glimmer Coast', bg: 'assets/cindera1.jpg' }, { name: 'Emberfall Rift', bg: 'assets/cindera2.jpg' },
        { name: 'Thunder Spires', bg: 'assets/cindera3.jpg' }] },
    { id: 3, name: 'Prismara', img: 'assets/planet3.png', cell: 370, frames: 12, open: false },
  ];
  PLANETS.forEach((p) => { p.image = new Image(); p.image.src = p.img; });
  let planetLoop = 0, planetZoom = false;

  // the next level to play: the first one not yet cleared, in order
  function nextToPlay() {
    for (const w of WORLD_IDS) {
      const cfg = LEVELS[w];
      if (cfg.plat || cfg.endless) continue;
      for (let s = 1; s <= STAGES; s++) if (!stageCleared(w, s) && stageUnlocked(w, s)) return { world: w, stage: s };
    }
    const endless = WORLD_IDS.find((w) => LEVELS[w].endless);
    return endless && worldUnlocked(endless) ? { world: endless, stage: 1 } : null;
  }
  actions['continue'] = () => { const n = nextToPlay(); if (n) chooseStage(n.world, n.stage); };

  function showPlanets() {
    const totalStars = Object.values(save.stages || {}).reduce((a, s) => a + (s.stars || 0), 0);
    const worlds = Object.values(LEVELS).filter((l) => !l.plat && !l.endless);
    const aliens = new Set(worlds.flatMap((l) => l.types)).size;
    const row = $('#planet-row');
    row.innerHTML = '';
    for (const p of PLANETS) {
      const b = document.createElement('button');
      b.className = 'planet' + (p.open ? '' : ' locked') + (p.soon ? ' soon' : '');
      b.dataset.planet = p.id;
      const info = p.soon
        ? `<span class="planet-info">${(p.worlds || []).length} ${t('worlds')}</span><span class="planet-info soon">${t('Soon available')}</span>`
        : p.open
        ? `<span class="planet-info">${worlds.length} ${t('worlds')} · ${aliens} ${t('aliens')} · ${worlds.length} ${t('bosses')}</span>
           <span class="planet-info stars">${starSvg(true)} ${totalStars}/${worlds.length * STAGES * 3}</span>`
        : `<span class="planet-info soon">${t('Coming soon')}</span>`;
      b.innerHTML = `<canvas class="planet-canvas" width="560" height="560"></canvas><span class="planet-name">${t(p.name)}</span>${info}`;
      b.setAttribute('aria-label', p.open ? p.name : `${p.name}, ${t('Coming soon')}`);
      b.addEventListener('click', () => {
        if (p.open) choosePlanet(b, p);
        else { Sfx.clink(); showToast(t('Coming soon')); }
      });
      row.appendChild(b);
      p.canvas = b.querySelector('canvas');
    }
    // Continue: straight to the next level
    const n = nextToPlay();
    $('#continue-btn').style.display = n ? '' : 'none';
    if (n) $('#continue-where').textContent = LEVELS[n.world].endless ? t('Endless') : `${t(LEVELS[n.world].name)} · ${t('Level')} ${n.stage}`;
    Progress.updateDot();
    planetZoom = false;
    const id = ++planetLoop;
    const draw = (now) => {
      if (id !== planetLoop || current !== 'planets') return;
      const t2 = now / 1000;
      PLANETS.forEach((p, idx) => {
        const cv = p.canvas, c = cv.getContext('2d');
        c.clearRect(0, 0, cv.width, cv.height);
        if (!p.image.complete || !p.image.naturalWidth) return;
        // slow: a new frame every ~1.4 s, and a very gentle turn
        const pos = (t2 * 0.7 + idx * 4) % p.frames, i = Math.floor(pos), k = pos - i;
        const size = cv.width * 0.94;
        c.save();
        c.translate(cv.width / 2, cv.height / 2 + Math.sin(t2 * 0.9 + idx) * 7);
        c.rotate(Math.sin(t2 * 0.08 + idx) * 0.12);
        const frame = (n2, alpha) => { c.globalAlpha = alpha; c.drawImage(p.image, n2 * p.cell, 0, p.cell, p.cell, -size / 2, -size / 2, size, size); };
        frame(i, 1);
        frame((i + 1) % p.frames, k);
        c.restore();
      });
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    setTimeout(focusFirst, 30);
  }
  // choosing the planet: it grows toward you with a flash, then its worlds appear
  // Screen changes with a soft fade (instead of a hard cut); `enter` plays the arrival animation
  function fadeTo(name, { tint = '#050a24', out = 450, hold = 120 } = {}) {
    const f = $('#fade');
    f.style.background = tint;
    f.classList.add('on');
    return new Promise((resolve) => setTimeout(() => {
      go(name);
      const scr = $('#screen-' + name);
      scr.classList.remove('enter'); void scr.offsetWidth; scr.classList.add('enter');
      setTimeout(() => scr.classList.remove('enter'), 2200);
      setTimeout(() => { f.classList.remove('on'); resolve(); }, hold);
    }, out));
  }

  // choosing a planet: it grows toward you, the screen fills with its glow, then its worlds appear
  function choosePlanet(el, p) {
    if (planetZoom) return;
    planetZoom = true;
    currentPlanet = p ? p.id : 1;
    Sfx.select();
    el.classList.add('zoom');
    setTimeout(() => fadeTo('levels', { tint: 'radial-gradient(circle, #bff9ff 0%, #6a5cff 45%, #0a1440 100%)', out: 380, hold: 150 }), 350);
  }

  // ---------------- Intro video ----------------
  // After Start, the intro video plays full screen; when it ends (or Skip is pressed) a bright
  // warp transition leads to the world screen.
  let introDone = true;
  function playIntro() {
    const v = $('#intro-video');
    introDone = false;
    go('intro');
    try {
      v.currentTime = 0;
      v.muted = save.options.sound !== 'on';
      const p = v.play();
      // Browsers only allow video *with sound* after a real click or key press on the TV/laptop itself.
      // Pressing Start with the phone controller doesn't count, so then the intro plays without sound
      // instead of being skipped.
      if (p && p.catch) p.catch(() => {
        if (introDone) return;
        v.muted = true;
        const p2 = v.play();
        if (p2 && p2.catch) p2.catch(() => endIntro());    // could not play at all: go straight on
      });
    } catch (e) { endIntro(); }
  }
  function endIntro() {
    if (introDone) return;
    introDone = true;
    const v = $('#intro-video');
    // the video (and its sound) fades out into the dark, then the planets appear out of the stars
    const start = performance.now(), vol = v.volume;
    const fadeSound = () => { const k = Math.min(1, (performance.now() - start) / 600); try { v.volume = vol * (1 - k); } catch (e) {} if (k < 1) requestAnimationFrame(fadeSound); };
    fadeSound();
    fadeTo('planets', { tint: '#02040f', out: 650, hold: 200 }).then(() => { try { v.pause(); v.volume = vol; } catch (e) {} });
  }
  // touching the screen anywhere during the intro skips it
  $('#screen-intro').addEventListener('pointerdown', (e) => { if (!e.target.closest('.intro-skip')) endIntro(); });
  $('#intro-video').addEventListener('ended', endIntro);
  $('#intro-video').addEventListener('error', endIntro);

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
  if (!save.options.lang) save.options.lang = I18N.guess();
  I18N.setLang(save.options.lang);
  I18N.watch();
  Dex.init({ save, persist });
  Level.init($('#game-canvas'));
  Assets.load((p) => { $('#load-text').textContent = `Loading artwork… ${Math.round(p * 100)}%`; })
    .then(() => {
      buildHud();
      go('start');
      if (!window.SV_TOUCH) Net.start();   // get the room ready so pairing is instant (not needed with touch controls)
    })
    .catch((err) => {
      $('#load-text').textContent = err.message + '. Check that the assets folder was uploaded.';
    });
})();
