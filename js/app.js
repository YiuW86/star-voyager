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
    options: { sound: 'on', vibrate: 'on', assist: 2, hand: 'right', sens: 1, smoothing: 'normal', quality: 'auto', fps: 'off', unlockAll: 'off', frameRate: '60', effects: 'full' },
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
    // items with `levels` can be upgraded again and again (save.shopLv); `effect(l)` describes level l
    { id: 'magazine',    name: 'Bigger magazine',  text: 'More shots before you have to reload.',
      levels: [25, 40, 60, 80, 110, 140, 180, 220], effect: (l) => `${[8, 12, 18, 24, 30, 36, 42, 48, 50][l]} ${t('shots')}` },
    { id: 'quickReload', name: 'Quick reload',     text: 'Reloading goes faster.',
      levels: [30, 60, 100], effect: (l) => `${t('Reload time')} ${[0.95, 0.48, 0.38, 0.3][l].toFixed(2)} s` },
    { id: 'steadyAim',   name: 'Steady aim',       text: 'Your aim is steadier and more precise: aliens are easier to hit.',
      levels: [35, 70, 120], effect: (l) => `${t('Aim help')} +${[0, 12, 22, 32][l]}% · ${t('hit area')} +${[0, 0, 10, 20][l]}%` },
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
    if (name !== 'game' && name !== 'connect' && name !== 'options') tutNext = false;
    if (name !== 'game' && !(name === 'options' && optionsFromGame)) Music.stop(600);
    if (current === 'equip' && name !== 'equip') stopEquip();
    if (current === 'cinema' && name !== 'cinema') closeFilm(true);
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
    if (name === 'ranch') { Habitat.start(); } else Habitat.stop();
    if (name === 'goals' || name === 'badges') renderGoals();
    if (name === 'planets') showPlanets();
    if (name === 'equip') startEquip();
    if (name === 'cinema') renderCinema();
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
      if (isVoidBoss(n.world, n.stage)) { Level.stop(); playVoidIntro(() => startLevel(lastMode, n.world, n.stage)); return; }
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
    'void-skip'() { endVoidIntro(); },
    'void-outro-skip'() { endVoidOutro(); },
    'dex-close'() { Dex.hide(); setTimeout(focusFirst, 30); },
    'dex-prev'() { if (Dex.step(-1)) Sfx.select(); },
    'dex-next'() { if (Dex.step(1)) Sfx.select(); },
    resume() { Level.resume(); },
    restart() { hideOverlays(); if (lastTut) tutNext = true; startLevel(lastMode, lastWorld, lastStage); },
    abandon() { Level.stop(); hideOverlays(); go('start'); },
    again() { hideOverlays(); if (lastTut) tutNext = true; startLevel(lastMode, lastWorld, lastStage); },
    training() { hideTutOverlay(); startTraining(); },
    'to-ranch'() { slidePage('ranch', 1); },
    'to-home'() { slidePage('home', -1); },
    'ranch-pick'() { Habitat.pick(); },
    'dex-tab-aliens'() { Dex.setMode('aliens'); Sfx.select(); },
    'dex-tab-bosses'() { Dex.setMode('bosses'); Sfx.select(); },
    'ranch-zoom-in'() { Habitat.zoomBy(1.4, null, null, true); Sfx.select(); },
    'ranch-zoom-out'() { Habitat.zoomBy(1 / 1.4, null, null, true); Sfx.select(); },
    'ranch-done'() { $('#ov-ranch').classList.remove('show'); Habitat.start(); setTimeout(focusFirst, 30); },
    'tut-start'() { hideTutOverlay(); startTraining(); },
    'tut-skip'() { save.tut = save.tut || 'skipped'; persist(); hideTutOverlay(); chooseStage(WORLD_IDS[0], 1, false, true); },
    'tut-adventure'() { hideTutOverlay(); Level.stop(); go('planets'); chooseStage(WORLD_IDS[0], 1, false, true); },
    'tut-back'() { hideTutOverlay(); Level.stop(); go('planets'); },
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
  function chooseStage(world, stage, filmDone, noTraining) {
    if (!stageUnlocked(world, stage)) return;
    // new players: Orbit offers the training before the very first level
    if (!noTraining && !save.tut && world === WORLD_IDS[0] && stage === 1) { showTutOverlay('intro'); return; }
    if (!filmDone && isVoidBoss(world, stage)) { lastWorld = world; lastStage = stage; playVoidIntro(() => chooseStage(world, stage, true)); return; }
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
  // "Unlock all" (Options): every upgrade, shop item, drone, trophy, ability, superpower and building,
  // plenty of crystals and materials. The real progress is kept aside and comes back when it is switched off.
  const UNLOCK_KEYS = ['upg', 'owned', 'trophies', 'mods', 'base', 'mats', 'crystals', 'loadout', 'shopLv', 'dex', 'badges', 'ranch'];
  function applyUnlockAll(on) {
    if (on && !save.unlockBackup) save.unlockBackup = JSON.parse(JSON.stringify(UNLOCK_KEYS.reduce((o, k) => { o[k] = save[k]; return o; }, {})));
    // keys added later (medals, ranch): keep the real ones aside too
    if (on && save.unlockBackup) UNLOCK_KEYS.forEach((k) => { if (!(k in save.unlockBackup)) save.unlockBackup[k] = save[k] === undefined ? null : JSON.parse(JSON.stringify(save[k])); });
    if (on) {
      save.upg = { blaster: 5, net: 3, shield: 3, health: 5 };
      save.owned = Object.assign({}, save.owned);
      [...SHOP, ...STAR_SHOP].forEach((it) => { save.owned[it.id] = true; });
      save.shopLv = {}; SHOP.forEach((it) => { if (it.levels) save.shopLv[it.id] = it.levels.length; });
      save.trophies = { nebulaCrown: 1, emberCore: 1, tidePearl: 1, prismHeart: 1, echoBell: 1, vortexEye: 1 };
      save.mods = {}; MODS.forEach((m) => { save.mods[m.id] = 3; });
      save.loadout = { weapon: save.loadout && save.loadout.weapon || 'bubble', drone: save.loadout && save.loadout.drone || 'mirror' };
      save.base = Object.assign({}, save.base);
      MODULES.forEach((m) => { if (m.max) save.base[m.id] = m.max; });
      if (!save.base.sanctT) save.base.sanctT = Date.now();
      save.mats = { shard: 999, goo: 999, dust: 999, mist: 999, spark: 999, pearl: 999, glass: 999, echo: 999, vdust: 999 };
      save.crystals = Math.max(save.crystals, 99999);
      save.dex = Object.assign({}, save.dex);
      Dex.ALIENS.forEach((a) => { if (!save.dex[a.id]) save.dex[a.id] = 1; });     // every creature in the alien guide
      // every medal on Platinum (so the ranch has all 20 places); your real medals come back when it is switched off
      save.badges = { cadet: true };
      BADGES.forEach((b) => { save.badges[b.id] = 4; });
      SV.ALL_TYPES.forEach((k) => { save.badges['kind:' + k] = 4; });
    } else if (!on && save.unlockBackup) {
      UNLOCK_KEYS.forEach((k) => { if (save.unlockBackup[k] !== undefined && save.unlockBackup[k] !== null) save[k] = save.unlockBackup[k]; else delete save[k]; });
      delete save.unlockBackup;
      // anything that was not there before goes back to its starting value
      if (!save.upg) save.upg = { blaster: 1, net: 1, shield: 1 };
      if (!save.owned) save.owned = {};
      if (!save.trophies) save.trophies = {};
      if (!save.mods) save.mods = {};
      if (!save.base) save.base = {};
      if (!save.loadout) save.loadout = {};
      if (!save.mats) save.mats = { shard: 0, goo: 0, dust: 0 };
      if (save.crystals == null) save.crystals = 0;
    }
    persist();
  }
  // Endless opens after the first world is cleared
  const needsLicence = (w) => !isFreeWorld(w) && !hasFullGame();
  const voidOpen = () => unlockAll() || worldCleared(6);     // the Void's planet opens after Starfall Wetlands
  const worldUnlocked = (w) => !needsLicence(w) && (unlockAll() || w === WORLD_IDS[0] || !!LEVELS[w].experimental || (!!LEVELS[w].free && (!LEVELS[w].void || voidOpen()))
    || (LEVELS[w].endless ? worldCleared(1) : worldCleared(LEVELS[w].after || w - 1)));
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
  setTimeout(() => $('#worlds').addEventListener('scroll', () => updateWorldArrows(), { passive: true }), 0);
  function renderLevels() {
    setTimeout(updateWorldArrows, 50);
    $('#worlds').scrollLeft = 0;
    const box = $('#worlds');
    box.innerHTML = '';
    const planet = PLANETS.find((p) => p.id === currentPlanet);
    // the world screen shows the chosen planet's own scenery
    const bgImg = $('#screen-levels > img.fill');
    bgImg.src = planet && planet.worlds ? planet.worlds[planet.worlds.length - 1].bg : 'assets/level1.jpg';
    const playable = planet && planet.worlds ? planet.worlds.filter((wd) => wd.world).map((wd) => wd.world) : [];
    $('#screen-levels').classList.toggle('planet-soon', !!(planet && planet.worlds) && !playable.length);
    if (planet && planet.worlds) {
      // this planet's playable worlds as normal cards, then the ones that are not ready yet ("soon available")
      playable.forEach((w) => box.appendChild(worldCard(w)));
      planet.worlds.filter((wd) => !wd.world).forEach((wd, i) => {
        const b = document.createElement('button');
        b.className = 'level-card locked soon-card';
        b.style.setProperty('--i', i + playable.length);
        b.innerHTML = `<div class="face"><img src="${wd.bg}" alt="">${LOCK_SVG}<div class="label"><b>${t(wd.name)}</b><small class="needs-lic">${t('Soon available')}</small></div></div>`;
        b.addEventListener('click', () => { Sfx.clink(); showToast(t('Soon available')); });
        box.appendChild(b);
      });
      updatePhoneUi();
      return;
    }
    for (const w of WORLD_IDS) if ((LEVELS[w].planet || 1) === 1) box.appendChild(worldCard(w));
    updatePhoneUi();
  }
  function worldCard(w) {
    {
      const box = { children: { length: 0 } };
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
        : open ? `<span class="card-stars">${starSvg(true)} ${worldStars(w)}/${maxStars}</span>` : `<small>Clear ${LEVELS[LEVELS[w].after || w - 1].name} first</small>`;
      b.innerHTML = `<div class="face"><img src="${cfg.bg}" alt="">${open ? '' : LOCK_SVG}<div class="label"><b>${cfg.name}</b>${sub}</div></div>`;
      b.setAttribute('aria-label', open ? `${cfg.name}, ${worldStars(w)} of ${STAGES * 3} stars` : `${cfg.name}, locked`);
      // the experimental platformer is a single level: start it right away
      b.addEventListener('click', () => {
        if (needsLicence(w)) { Sfx.select(); accountFrom = 'levels'; go('account'); return; }     // shows how to unlock the full game
        if (!worldUnlocked(w)) return;
        Sfx.select(); if (cfg.plat || cfg.endless) chooseStage(w, 1); else openWorld(w);
      });
      return b;
    }
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
    ov.classList.toggle('void-world', !!cfg.void);
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
      n.style.setProperty('--fx', '0px'); n.style.setProperty('--fy', '0px');     // pop up in place (see playMapIntro)
      const inner = unlocked ? (boss ? CROWN_SVG + s : s) : LOCK_SVG.replace('lock-ico', '');
      const sc = stageConfig(w, s);
      const label = boss ? `Boss: ${cfg.boss.name}` : `Level ${s}`;
      const spc = window.SV.specialOf(w, s), spInfo = spc && window.SV.SPECIAL_INFO[spc];
      if (spc) n.classList.add('special', 'sp-' + spc);
      n.innerHTML = (boss ? '<span class="boss-warn">⚠ BOSS</span>' : spc === 'mini' ? `<span class="boss-warn mini-warn">⚠ ${t('MINI-BOSS')}</span>` : '')
        + (spInfo && spc !== 'mini' ? `<span class="node-special">${t(spInfo.tag)}</span>` : '')
        + `<div class="hex"><div>${inner}</div></div><div class="node-stars">${starsHtml(stars)}</div><div class="node-label">${label}</div>`
        + (((save.stages || {})[key(w, s)] || {}).score ? `<div class="node-score">${save.stages[key(w, s)].score.toLocaleString()}</div>` : '');
      n.setAttribute('aria-label', `${label}${spInfo ? ' · ' + spInfo.tag : ''}${unlocked ? '' : ', locked'}${stars ? `, ${stars} stars` : ''}.${sc.total ? ` Catch ${sc.total} aliens.` : ''}`);
      n.addEventListener('click', () => chooseStage(w, s));
      map.appendChild(n);
    }
    ov.classList.add('show');
    playMapIntro(NODE_POS);
  }

  // The level map builds up one step at a time: level 1 pops up, the line draws to level 2,
  // level 2 pops up, the line draws on, and so on. Tap / any key shows everything at once.
  let mapIntro = null;
  function playMapIntro(nodePos) {
    if (mapIntro) mapIntro.stop(true);
    const nodes = $$('#stage-map .stage-node'), line = $('#stage-path-line'), mask = $('#stage-path-mask');
    mask.setAttribute('d', line.getAttribute('d'));
    const L = line.getTotalLength();
    // where along the line each level sits
    const at = [0];
    let from = 0;
    for (let i = 1; i < nodePos.length; i++) {
      const [x, y] = nodePos[i];
      let best = from, bd = Infinity;
      for (let l = from; l <= L; l += 4) { const p = line.getPointAtLength(l); const d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = l; } }
      at.push(best); from = best;
    }
    at[at.length - 1] = L;
    mask.style.strokeDasharray = `${L} ${L}`;
    const setLine = (len) => { mask.style.strokeDashoffset = String(L - len); };
    line.style.transition = 'none'; line.classList.add('on');
    const POP = 0.2, DRAW = 0.24;
    const state = { done: false, raf: 0 };
    const finish = () => {
      if (state.done) return;
      state.done = true; cancelAnimationFrame(state.raf);
      nodes.forEach((n) => n.classList.remove('pre')); setLine(L);
      document.removeEventListener('keydown', skip, true); $('#ov-world').removeEventListener('pointerdown', skip, true);
      const firstOpen = $$('#stage-map .stage-node:not([disabled])').pop();
      setTimeout(() => { if (firstOpen && openWorldId != null) firstOpen.focus({ preventScroll: true }); }, 300);
    };
    const skip = () => finish();
    state.stop = (silent) => { if (silent) { state.done = true; cancelAnimationFrame(state.raf); } else finish(); };
    mapIntro = state;
    setLine(0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('fx-reduced')) return finish();
    document.addEventListener('keydown', skip, true); $('#ov-world').addEventListener('pointerdown', skip, true);
    const t0 = performance.now() + 250, step = POP + DRAW;
    let shown = 0;
    const tick = (now) => {
      if (state.done) return;
      const t = Math.max(0, (now - t0) / 1000);
      const i = Math.min(nodes.length - 1, Math.floor(t / step));
      while (shown <= i) { nodes[shown].classList.remove('pre'); if (shown > 0 && window.Sfx) Sfx.tone(520 + shown * 60, 0.06, 'triangle', 0.04); shown++; }
      // the line grows from level i to level i+1 after level i has popped up
      const k = Math.max(0, Math.min(1, (t - i * step - POP) / DRAW));
      setLine(i >= nodes.length - 1 ? L : at[i] + (at[i + 1] - at[i]) * k);
      if (i >= nodes.length - 1) return finish();
      state.raf = requestAnimationFrame(tick);
    };
    state.raf = requestAnimationFrame(tick);
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
    { id: 'health', name: 'Armour suit', max: 5,
      stats: (l) => `${t('Health')} ${100 + 50 * (l - 1)} (+${50 * (l - 1)}%)`,
      cost: [null, { crystal: 60, shard: 8 }, { crystal: 140, shard: 14, goo: 4 }, { crystal: 240, shard: 20, goo: 8, dust: 2 }, { crystal: 380, shard: 28, goo: 12, dust: 5, trophy: 'emberCore' }] },
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
      ...[...new Set(Object.values(window.SV.REGION_MAT))].filter((k) => save.mats[k] > 0).map((k) => [k, save.mats[k], MAT_NAMES[k]])];
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
  // ---------------- Badges: Bronze, Silver, Gold and Platinum ----------------
  // Each badge has 4 goals; reaching one gives that tier and its reward (bigger for higher tiers).
  const TIERS = ['bronze', 'silver', 'gold', 'platinum'];
  const TIER_NAMES = ['Bronze', 'Silver', 'Gold', 'Platinum'];
  const TIER_REWARD = [{ crystal: 30 }, { crystal: 80, shard: 3 }, { crystal: 200, goo: 3 }, { crystal: 400, dust: 2 }];
  const KIND_REWARD = [{ crystal: 15 }, { crystal: 40 }, { crystal: 100, goo: 1 }, { crystal: 200, dust: 1 }];
  const levelsCleared = () => Object.values(save.stages || {}).filter((s) => s.stars > 0).length;
  const BADGES = [
    // catching
    { id: 'catch', group: 'Catching', name: 'Alien catcher', desc: 'Catch {n} aliens', val: (s) => s.catches, tiers: [50, 250, 1000, 3000] },
    { id: 'elite', group: 'Catching', name: 'Armour breaker', desc: 'Catch {n} armoured aliens', val: (s) => s.elites, tiers: [10, 50, 150, 400] },
    { id: 'shiny', group: 'Catching', name: 'Shiny hunter', desc: 'Catch {n} shiny aliens', val: (s) => s.shinies, tiers: [1, 5, 15, 40] },
    { id: 'boss', group: 'Catching', name: 'Boss catcher', desc: 'Catch {n} bosses', val: (s) => Object.values(s.bosses).reduce((a, b) => a + b, 0), tiers: [1, 5, 15, 40] },
    { id: 'rulers', group: 'Catching', name: 'Ruler friend', desc: 'Free {n} different rulers', val: (s) => Object.keys(s.bosses).length, tiers: [1, 3, 6, 10] },
    { id: 'mini', group: 'Catching', name: 'Giant tamer', desc: 'Catch {n} mini-bosses', val: (s) => s.minis || 0, tiers: [1, 5, 15, 40] },
    // skill
    { id: 'combo', group: 'Skill', name: 'Combo star', desc: 'Reach a combo of {n}', val: (s) => s.bestCombo, tiers: [10, 20, 35, 50] },
    { id: 'score', group: 'Skill', name: 'High scorer', desc: 'Score {n} in one level', val: (s) => s.bestScore, tiers: [5000, 15000, 30000, 60000] },
    { id: 'hyper', group: 'Skill', name: 'Hyper hero', desc: 'Start Hyper mode {n} times', val: (s) => s.hypers || 0, tiers: [1, 10, 50, 150] },
    { id: 'net', group: 'Skill', name: 'Big net', desc: 'Catch {n} aliens with one net grenade', val: (s) => s.netBest, tiers: [3, 5, 7, 10] },
    { id: 'clean', group: 'Skill', name: 'Untouchable', desc: 'Catch {n} bosses without taking damage', val: (s) => s.bossNoDamage, tiers: [1, 3, 6, 10] },
    { id: 'stars', group: 'Skill', name: 'Star collector', desc: 'Collect {n} stars', val: () => totalStarsAll(), tiers: [30, 90, 180, 270] },
    { id: 'wave', group: 'Skill', name: 'Survivor', desc: 'Reach wave {n} in Endless', val: (s) => s.bestWave, tiers: [5, 10, 20, 30] },
    // building and upgrades
    { id: 'base', group: 'Building', name: 'Builder', desc: 'Reach base level {n}', val: () => baseLevel(), tiers: [3, 8, 15, 26] },
    { id: 'gear', group: 'Building', name: 'Gear master', desc: 'Buy {n} Workshop upgrades', val: () => { const u = save.upg || {}; return ['blaster', 'net', 'shield', 'health'].reduce((a, k) => a + Math.max(0, (u[k] || 1) - 1), 0); }, tiers: [2, 5, 8, 12] },
    { id: 'super', group: 'Building', name: 'Super trainer', desc: 'Upgrade superpowers {n} times', val: () => Object.values(save.superLv || {}).reduce((a, l) => a + Math.max(0, l - 1), 0), tiers: [1, 3, 6, 10] },
    { id: 'levels', group: 'Building', name: 'Explorer', desc: 'Clear {n} levels', val: () => levelsCleared(), tiers: [10, 30, 60, 100] },
  ];
  const KIND_TIERS = [25, 100, 250, 500];
  const badgeTier = (val, tiers) => tiers.reduce((n, g) => (val >= g ? n + 1 : n), 0);
  const MEDAL_COL = ['rgba(255,255,255,0.14)', '#cd8a4a', '#d6dde8', '#ffd27a', '#aef4ff'];
  const MEDAL_EDGE = ['rgba(159,183,232,0.5)', '#ffd2a8', '#ffffff', '#fff4c9', '#ffffff'];
  function medalSvg(tier, inner) {
    const c = MEDAL_COL[tier], e = MEDAL_EDGE[tier];
    return `<svg class="medal tier${tier}" viewBox="0 0 48 48"><path d="M14 2l6 12M34 2l-6 12" stroke="${tier ? '#ff8ad8' : 'rgba(255,255,255,0.2)'}" stroke-width="5"/>
      <circle cx="24" cy="28" r="17" fill="${c}" stroke="${e}" stroke-width="2.5"/><circle cx="24" cy="28" r="12.5" fill="none" stroke="${tier ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.15)'}" stroke-width="1.5"/>
      ${inner || `<path d="M24 19l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2-4.5-4.4 6.2-.9z" fill="${tier ? '#fff' : 'rgba(255,255,255,0.3)'}"/>`}
      ${tier === 4 ? '<path d="M38 12l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#fff"/>' : ''}</svg>`;
  }

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
      if (e.ev === 'mini') s.minis = (s.minis || 0) + 1;
      if (e.ev === 'hyper') s.hypers = (s.hypers || 0) + 1;
      this.checkAchievements();
      persist();
    },
    // badges: a new tier gives its reward and a message; tiers that were already reached before
    // badges existed are filled in quietly (no double rewards for the old achievements)
    checkAchievements() {
      if (unlockAll()) return;
      const s = this.stats();
      if (!save.badges) save.badges = {};
      const quiet = !save.badgeV;
      const got = [];
      const check = (key, val, tiers, rewards, name) => {
        const have = save.badges[key] || 0, now = badgeTier(val, tiers);
        if (now <= have) return;
        save.badges[key] = now;
        if (quiet) return;
        for (let i = have; i < now; i++) this.give(rewards[i]);
        got.push(`${t(name)}: ${t(TIER_NAMES[now - 1])}`);
      };
      for (const b of BADGES) check(b.id, b.val(s), b.tiers, TIER_REWARD, b.name);
      for (const k of (window.SV ? SV.ALL_TYPES : [])) check('kind:' + k, (save.dex || {})[k] || 0, KIND_TIERS, KIND_REWARD, SPR[k] ? SPR[k].name : k);
      save.badgeV = 1;
      if (got.length) { Sfx.win(); showToast(`${t('Badge')}: ${got[got.length - 1]}!`); }
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
    const bdg = save.badges || {};
    const card = (key, name, desc, val, tiers, rewards, inner, kind) => {
      const tier = Math.min(4, bdg[key] || 0), next = tiers[tier];
      const pips = TIERS.map((tn, i) => `<i class="pip ${tn}${i < tier ? ' on' : ''}" title="${t(TIER_NAMES[i])}: ${tiers[i].toLocaleString()}"></i>`).join('');
      const prog = next == null ? `<small class="maxed">${t('Platinum')}! ${t('All tiers done')}</small>`
        : `<div class="bbar"><i style="width:${Math.min(100, (val / next) * 100)}%"></i></div><small>${Math.min(val, next).toLocaleString()} / ${next.toLocaleString()} · ${t('next')}: ${t(TIER_NAMES[tier])} ${REWARD(rewards[tier])}</small>`;
      return `<button type="button" class="badge t${tier}${kind ? ' kind' : ''}">${medalSvg(tier, inner)}<div class="bd"><b>${t(name)}</b><p>${t(desc).replace('{n}', (next != null ? next : tiers[3]).toLocaleString())}</p>${prog}<div class="pips">${pips}</div></div></button>`;
    };
    let total = 0, have = 0;
    const groups = {};
    for (const b of BADGES) { (groups[b.group] = groups[b.group] || []).push(card(b.id, b.name, b.desc, b.val(s), b.tiers, TIER_REWARD)); total += 4; have += Math.min(4, bdg[b.id] || 0); }
    const kinds = (window.SV ? SV.ALL_TYPES : []).map((k) => {
      total += 4; have += Math.min(4, bdg['kind:' + k] || 0);
      return card('kind:' + k, SPR[k].name, 'Catch {n} of this kind', (save.dex || {})[k] || 0, KIND_TIERS, KIND_REWARD, `<image href="assets/dex/${k}.png" x="11" y="15" width="26" height="26" preserveAspectRatio="xMidYMid slice" clip-path="circle(12px at 13px 13px)"/>`, true);
    });
    const cadet = (save.badges || {}).cadet;
    $('#ach-count').innerHTML = `${medalSvg(3)}<span>${have} / ${total}</span>`;
    // Goals shows a short summary; the full list lives on its own scrollable Badges screen
    const nextUp = BADGES.map((b) => ({ b, tier: Math.min(4, bdg[b.id] || 0), v: b.val(s) })).filter((x) => x.tier < 4)
      .sort((x, y) => (y.v / y.b.tiers[y.tier]) - (x.v / x.b.tiers[x.tier])).slice(0, 3);
    $('#achievements').innerHTML = `<h2>${t('Badges')}</h2><div class="badge-summary">${medalSvg(have >= total ? 4 : 3)}<div><b>${have} / ${total}</b><p>${t('badge tiers earned')}</p></div></div>`
      + (nextUp.length ? `<h3>${t('Almost there')}</h3>` + nextUp.map((x) => `<div class="badge-mini"><b>${t(x.b.name)}</b><div class="bbar"><i style="width:${Math.min(100, x.v / x.b.tiers[x.tier] * 100)}%"></i></div><small>${Math.min(x.v, x.b.tiers[x.tier]).toLocaleString()} / ${x.b.tiers[x.tier].toLocaleString()}</small></div>`).join('') : '')
      + `<button class="btn pink badges-open" data-go="badges"><span>${t('See all badges')}</span></button>`;
    $('#badges-count').innerHTML = `${medalSvg(3)}<span>${have} / ${total}</span>`;
    $('#badges-list').innerHTML = `<div class="badge special${cadet ? ' t3' : ' t0'}">${medalSvg(cadet ? 3 : 0, '<text x="24" y="34" text-anchor="middle" font-size="16" font-weight="800" fill="#fff">C</text>')}<div class="bd"><b>${t('Cadet')}</b><p>${t('Finish the training')}</p><small>${cadet ? t('Unlocked') : t('Planet screen → Training')}</small></div></div>`
      + Object.entries(groups).map(([g, list]) => `<h3>${t(g)}</h3><div class="badge-grid">${list.join('')}</div>`).join('')
      + `<h3>${t('Alien badges')}</h3><div class="badge-grid">${kinds.join('')}</div>`;
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
    { id: 'quarters', name: 'Crew quarters', pos: [219, 638], max: 3,
      desc: 'Your crew helps collecting: you get extra crystals after every level.',
      effect: (l) => `+${l * 10}% ${t('crystals per level')}`,
      cost: [{ crystal: 90, shard: 8 }, { crystal: 180, shard: 14, goo: 5 }, { crystal: 320, shard: 22, goo: 10, dust: 3 }] },
  ];
  const baseLevel = () => MODULES.filter((m) => m.max).reduce((a, m) => a + (save.base[m.id] || 0), 0);

  function renderHome() {
    $('#base-level').innerHTML = `${t('Base level')} <b>${baseLevel()}</b>`;
    const inv = [['crystal', save.crystals], ...['shard', 'goo', 'dust'].map((k) => [k, save.mats[k] || 0])];
    $('#home-inv').innerHTML = inv.map(([k, n]) => `<span class="inv">${MAT_SVG[k]}<b>${n}</b></span>`).join('');
    const box = $('#buildings');
    box.innerHTML = '';
    // statues of your Champions
    for (const [id, ch] of Object.entries(CHAMPIONS)) {
      if (!(save.champions || {})[id]) continue;
      const st = document.createElement('div');
      st.className = 'statue';
      st.style.left = ch.pos[0] + 'px'; st.style.top = ch.pos[1] + 'px';
      st.title = `${t('Champion')}: ${t(ch.name)}`;
      st.innerHTML = `<i style="background-image:url(${ch.img})"></i><span>${t(ch.name)}</span>`;
      box.appendChild(st);
    }
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

  // Spacedome <-> Ranch: the screens slide like pages; swiping left / right does the same
  function slidePage(name, dir) {
    Sfx.select();
    go(name);
    const scr = $('#screen-' + name);
    scr.classList.remove('slide-from-right', 'slide-from-left'); void scr.offsetWidth;
    scr.classList.add(dir > 0 ? 'slide-from-right' : 'slide-from-left');
    setTimeout(() => scr.classList.remove('slide-from-right', 'slide-from-left'), 500);
  }
  [['#screen-home', 'ranch', 1], ['#screen-ranch', 'home', -1]].forEach(([sel, to, dir]) => {
    const el = $(sel); let sx = null, sy = 0;
    el.addEventListener('pointerdown', (e) => { if (e.target.closest('.overlay.show')) return; sx = e.clientX; sy = e.clientY; });
    el.addEventListener('dragstart', (e) => e.preventDefault());
    el.addEventListener('pointercancel', () => { sx = null; });
    el.addEventListener('pointerup', (e) => {
      if (sx == null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy; sx = null;
      if (sel === '#screen-ranch' && Habitat.blockSwipe()) return;     // zoomed in: dragging looks around instead
      if (Math.abs(dx) > 140 && Math.abs(dy) < 160 && Math.sign(dx) === -dir) slidePage(to, dir);
    });
  });

  // ---------------- Living habitat: your caught aliens float around the Spacedome ----------------
  // 4 aliens to start, 2 more per level of the Alien sanctuary (max 14). Tap one: it hops, hearts, its name.
  const Habitat = {
    list: [], raf: 0, last: 0,
    // places on the ranch: 1 to start, +1 for every 4 badge tiers you earn (max 20)
    tiers() {
      const b = save.badges || {};
      return Object.entries(b).reduce((a, [k, v]) => a + (k === 'cadet' ? (v ? 1 : 0) : Math.min(4, Number(v) || 0)), 0);
    },
    slots() { return Math.min(20, 1 + Math.floor(this.tiers() / 4)); },
    caughtKinds() { return (window.SV ? SV.ALL_TYPES : []).filter((k) => ((save.dex || {})[k] || 0) > 0 && SV.SPR[k]); },
    roster() {
      const kinds = this.caughtKinds();
      if (!save.ranch) {
        // first visit: the alien you caught most moves in
        const best = kinds.slice().sort((a, b) => (save.dex[b] || 0) - (save.dex[a] || 0))[0];
        save.ranch = best ? [best] : [];
        persist();
      }
      return save.ranch.filter((k) => kinds.includes(k)).slice(0, this.slots());
    },
    // somewhere on the fields of the ranch island (outline measured on the ranch picture, 1920 x 1080)
    // only the fenced grass fields (well away from the island's edge and the barn), so nobody falls off
    FIELD: [[430, 520], [620, 440], [900, 470], [980, 560], [1340, 560], [1460, 560], [1600, 610], [1620, 690], [1540, 760], [1370, 850], [1150, 880], [720, 860], [530, 790], [430, 690]],
    inside(x, y) {
      const P = this.FIELD; let c = false;
      for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
      return c;
    },
    depth(y) { return 0.7 + (y - 330) / 580 * 0.55; },
    // the alien's whole footprint (left foot, right foot, middle) must stand on the field
    fits(x, y, w) { const hw = (w || 100) / 2 * this.depth(y) * 0.8; return this.inside(x, y) && this.inside(x - hw, y) && this.inside(x + hw, y) && this.inside(x, y - 12); },
    // the walk from (fx, fy) to (x, y) stays on the field all the way
    pathOk(fx, fy, x, y, w) { for (let i = 1; i <= 10; i++) { const k = i / 10; if (!this.fits(fx + (x - fx) * k, fy + (y - fy) * k, w)) return false; } return true; },
    spot(a, w) {
      for (let i = 0; i < 120; i++) {
        const x = 430 + Math.random() * 1190, y = 440 + Math.random() * 440;
        if (this.fits(x, y, w) && (!a || this.pathOk(a.x, a.y, x, y, w))) return { x, y };
      }
      return a ? { x: a.x, y: a.y } : { x: 1150, y: 700 };
    },
    // the sprite sheet's real grid (some aliens have 2 rows of pictures, others 3)
    sheet(k, m, el) {
      const cache = this.sheets || (this.sheets = {});
      const put = (g) => { el._g = g; el.style.backgroundSize = `${g.c * 100}% ${g.r * 100}%`; };
      if (cache[k]) return put(cache[k]);
      put({ c: 5, r: 3 });
      const im = new Image();
      im.onload = () => { cache[k] = { c: Math.max(1, Math.round(im.naturalWidth / m.fw)), r: Math.max(1, Math.round(im.naturalHeight / m.fh)) }; put(cache[k]); };
      im.src = m.src;
    },
    // ---- zoom: pinch, mouse wheel or the + / - buttons; drag to look around when zoomed in ----
    zoom: 1, panX: 0, panY: 0, ptrs: new Map(), pinch: null, gestT: 0, ZMAX: 2.5,
    applyView(ease) {
      const vw = window.SV ? SV.viewW() : 1920;
      this.zoom = Math.max(1, Math.min(this.ZMAX, this.zoom));
      const mx = (this.zoom - 1) * vw / 2, my = (this.zoom - 1) * 540;
      this.panX = Math.max(-mx, Math.min(mx, this.panX)); this.panY = Math.max(-my, Math.min(my, this.panY));
      const w = $('#ranch-world'); if (!w) return;
      w.classList.toggle('ease', !!ease);
      w.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoom})`;
      const zi = $('#ranch-zoom-in'), zo = $('#ranch-zoom-out');
      if (zi) zi.disabled = this.zoom >= this.ZMAX - 0.01;
      if (zo) zo.disabled = this.zoom <= 1.01;
    },
    // zoom by factor f, keeping the point (sx, sy) (stage pixels) in place
    zoomBy(f, sx, sy, ease) {
      const vw = window.SV ? SV.viewW() : 1920, cx = vw / 2, cy = 540;
      if (sx == null) { sx = cx; sy = cy; }
      const z0 = this.zoom, z1 = Math.max(1, Math.min(this.ZMAX, z0 * f));
      const wx = cx + (sx - cx - this.panX) / z0, wy = cy + (sy - cy - this.panY) / z0;
      this.zoom = z1; this.panX = sx - cx - z1 * (wx - cx); this.panY = sy - cy - z1 * (wy - cy);
      this.applyView(ease);
    },
    resetView() { this.zoom = 1; this.panX = 0; this.panY = 0; this.applyView(true); },
    blockSwipe() { return this.zoom > 1.02 || performance.now() - this.gestT < 400; },
    toStage(e) { const r = $('#stage').getBoundingClientRect(), k = r.width / (window.SV ? SV.viewW() : 1920); return { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }; },
    initGestures() {
      const el = $('#screen-ranch');
      if (!el || el.dataset.zoomy) return;
      el.dataset.zoomy = '1';
      const skip = (e) => e.target.closest('button:not(.hab-alien), .overlay.show');
      el.addEventListener('pointerdown', (e) => {
        if (skip(e)) return;
        this.ptrs.set(e.pointerId, this.toStage(e));
        if (this.ptrs.size === 2) {
          const [a, b] = [...this.ptrs.values()];
          this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: this.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
          this.gestT = performance.now();
        }
      });
      el.addEventListener('pointermove', (e) => {
        if (!this.ptrs.has(e.pointerId)) return;
        const prev = this.ptrs.get(e.pointerId), now = this.toStage(e);
        this.ptrs.set(e.pointerId, now);
        if (this.ptrs.size >= 2 && this.pinch) {
          const [a, b] = [...this.ptrs.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          this.panX += mx - this.pinch.mx; this.panY += my - this.pinch.my;     // two fingers also move the view
          this.pinch.mx = mx; this.pinch.my = my;
          this.zoomBy((this.pinch.z * d / this.pinch.d) / this.zoom, mx, my);
          this.gestT = performance.now();
        } else if (this.zoom > 1.01) {
          this.panX += now.x - prev.x; this.panY += now.y - prev.y;
          this.applyView();
          this.gestT = performance.now();
        }
      });
      const up = (e) => { this.ptrs.delete(e.pointerId); if (this.ptrs.size < 2) this.pinch = null; };
      el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('pointerleave', up);
      el.addEventListener('wheel', (e) => { e.preventDefault(); const p = this.toStage(e); this.zoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); this.gestT = performance.now(); }, { passive: false });
      el.addEventListener('dblclick', (e) => { if (skip(e)) return; if (this.zoom > 1.01) this.resetView(); else { const p = this.toStage(e); this.zoomBy(2, p.x, p.y, true); } });
    },
    start() {
      this.stop();
      const box = $('#habitat');
      if (!box) return;
      box.innerHTML = '';
      const S = window.SV && SV.SPR;
      const kinds = this.roster();
      this.renderSlots();
      this.initGestures();
      this.zoom = 1; this.panX = 0; this.panY = 0; this.ptrs.clear(); this.pinch = null; this.applyView();
      this.list = kinds.map((k) => {
        const m = S[k], size = 90 + Math.random() * 22, p = this.spot(null, size);
        const el = document.createElement('button');
        el.className = 'hab-alien'; el.tabIndex = -1; el.setAttribute('aria-label', SPR[k].name);
        el.style.width = size + 'px'; el.style.height = size * m.fh / m.fw + 'px';
        el.style.backgroundImage = `url(${m.src})`;
        this.sheet(k, m, el);
        el.innerHTML = '<i class="hab-shadow"></i>';
        const a = { k, m, el, size, x: p.x, y: p.y, tx: p.x, ty: p.y, speed: 35 + Math.random() * 35, wait: Math.random() * 2, t: Math.random() * 10, flip: false, happy: 0 };
        el.addEventListener('pointerdown', (e) => { e.stopPropagation(); this.tap(a); });
        box.appendChild(el);
        return a;
      });
      if (!this.list.length) box.innerHTML = `<div class="hab-empty">${t(this.caughtKinds().length ? 'Press "Choose aliens" to bring aliens to your ranch!' : 'Catch aliens and they will come to live here!')}</div>`;
      this.last = performance.now();
      const tick = (now) => { const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.update(dt); this.raf = requestAnimationFrame(tick); };
      this.raf = requestAnimationFrame(tick);
    },
    stop() { cancelAnimationFrame(this.raf); this.raf = 0; },
    frame(a, idx) {
      const g = a.el._g || { c: 5, r: 3 };
      idx = idx % (g.c * g.r);
      const col = idx % g.c, row = Math.floor(idx / g.c);
      a.el.style.backgroundPosition = `${g.c > 1 ? col / (g.c - 1) * 100 : 0}% ${g.r > 1 ? row / (g.r - 1) * 100 : 0}%`;
    },
    update(dt) {
      for (const a of this.list) {
        a.t += dt;
        if (a.happy > 0) { a.happy -= dt; continue; }
        const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
        let moving = false;
        if (d < 4) { a.wait -= dt; if (a.wait <= 0) { const p = this.spot(a, a.size); a.tx = p.x; a.ty = p.y; a.wait = 1 + Math.random() * 3; } }
        else { const s = Math.min(d, a.speed * dt); a.x += dx / d * s; a.y += dy / d * s; moving = Math.abs(dx) > 8; if (Math.abs(dx) > 2) a.flip = (dx < 0) !== !!a.m.faceLeft; }
        const frames = moving && a.m.side ? a.m.side : a.m.front;
        this.frame(a, frames[Math.floor(a.t * (moving ? 6 : 3)) % frames.length]);
        const bob = Math.sin(a.t * 2.2) * 8;
        // closer to the bottom = a little bigger (depth)
        const sc = this.depth(a.y);
        a.el.style.transform = `translate(${a.x}px, ${a.y + bob}px) translate(-50%, -100%) scale(${a.flip ? -sc : sc}, ${sc})`;
        a.el.style.zIndex = Math.round(a.y);
      }
    },
    renderSlots() {
      const n = this.slots(), used = Math.min(n, (save.ranch || []).length), tiers = this.tiers();
      const next = n < 20 ? 4 - (tiers % 4) : 0;
      $('#ranch-slots').innerHTML = `<b>${used} / ${n}</b><span>${t('places')}</span>`
        + (n < 20 ? `<small>${t('{n} more badge tiers for a new place', { n: next })}</small>` : `<small>${t('Your ranch is full size!')}</small>`);
    },
    pick() {
      const grid = $('#ranch-grid'), kinds = this.caughtKinds(), n = this.slots();
      const draw = () => {
        const r = save.ranch || [];
        $('#ranch-pick-info').textContent = `${t('Places')}: ${Math.min(r.length, n)} / ${n}. ${t('Earn badge tiers on the Goals screen for more places.')}`;
        grid.innerHTML = kinds.length ? kinds.map((k) => `<button class="ranch-opt${r.includes(k) ? ' in' : ''}" data-kind="${k}"><img src="assets/dex/${k}.png" alt=""><b>${SPR[k].name}</b><small>${t('Caught')}: ${((save.dex || {})[k] || 0).toLocaleString()}</small><i>${r.includes(k) ? '✓' : '+'}</i></button>`).join('')
          : `<p class="muted">${t('Catch aliens and they will come to live here!')}</p>`;
        grid.querySelectorAll('.ranch-opt').forEach((b) => b.addEventListener('click', () => {
          const k = b.dataset.kind, list = save.ranch || (save.ranch = []);
          if (list.includes(k)) { list.splice(list.indexOf(k), 1); Sfx.unequip(); }
          else if (list.length >= n) { Sfx.clink(); showToast(t('All places are taken. Earn more badge tiers for more room!')); return; }
          else { list.push(k); Sfx.equip(); }
          persist(); draw(); const again = grid.querySelector(`[data-kind="${k}"]`); if (again) again.focus();
        }));
      };
      draw();
      $('#ov-ranch').classList.add('show');
      setTimeout(focusFirst, 30);
    },
    tap(a) {
      a.happy = 1.1;
      a.el.classList.remove('hop'); void a.el.offsetWidth; a.el.classList.add('hop');
      Sfx.pop(); [880, 1175, 1568].forEach((f, i) => Sfx.tone(f, 0.12, 'triangle', 0.06, null, 0.08 + i * 0.07));
      window.Haptics && Haptics.buzz(25, 0.3);
      const box = $('#habitat-fx');
      for (let i = 0; i < 4; i++) {
        const h = document.createElement('i');
        h.className = 'hab-heart'; h.textContent = '♥';
        h.style.left = a.x + (Math.random() * 60 - 30) + 'px'; h.style.top = a.y - a.el.offsetHeight * 0.8 + 'px';
        h.style.animationDelay = i * 0.12 + 's';
        box.appendChild(h); setTimeout(() => h.remove(), 1600);
      }
      const n = (save.dex || {})[a.k] || 0, tier = Math.min(4, (save.badges || {})['kind:' + a.k] || 0);
      const old = box.querySelector('.hab-bubble'); if (old) old.remove();
      const b = document.createElement('div');
      b.className = 'hab-bubble';
      b.innerHTML = `<b>${SPR[a.k].name}</b><span>${t('Caught')}: ${n.toLocaleString()}</span>${tier ? `<span class="hb-tier t${tier}">${t(TIER_NAMES[tier - 1])}</span>` : ''}`;
      b.style.left = a.x + 'px'; b.style.top = a.y - a.el.offsetHeight * 0.95 + 'px';
      box.appendChild(b); setTimeout(() => b.remove(), 2600);
    },
  };

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
      const items = Object.keys(save.items || {}).filter((k) => ITEMS[k]);
      html += `<h3 class="coll-title">${t('Collection')}</h3>` + (items.length
        ? `<div class="collection">${items.map((k) => `<div class="coll-item"><i>${window.Story ? (ITEMS[k].svg && Story.ITEM_SVG ? Story.ITEM_SVG(ITEMS[k].svg) : Story.FRAGMENT_SVG) : ''}</i><div><b>${t(ITEMS[k].name)}</b><p class="muted small">${t(ITEMS[k].desc)}</p></div></div>`).join('')}</div>`
        : `<p class="muted small">${t('Nothing yet. Rulers you free may give you something to keep here.')}</p>`);
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
      toast: (m) => { if (current === 'game') showToast(t(m)); else showToastMenu(t(m)); },
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

  // ---------------- Superpowers: choosing one ----------------
  // Shockwave from the start; the others are earned by beating bosses (the rest come later).
  const SUPER_INFO = [
    { id: 'shockwave', desc: 'A huge ring blasts all aliens far back and smashes every flying rock.' },
    { id: 'barrier', desc: 'A glowing dome for 8 seconds: nothing gets through, not even fire walls or beams.', trophy: 'nebulaCrown' },
    { id: 'mindswirl', desc: 'For 8 seconds the aliens get dizzy and bump into each other, catching one another.', trophy: 'emberCore' },
    { id: 'blackhole', desc: 'A black hole pulls all aliens into one spot: one tap catches the whole bunch.', trophy: 'tidePearl' },
    { id: 'frost', desc: 'Every alien freezes for 5 seconds; frozen aliens are caught with one hit.', trophy: 'prismHeart' },
    { id: 'overdrive', desc: 'Rapid fire for 6 seconds: no reloading, double damage.', trophy: 'echoBell' },
    { id: 'meteor', desc: 'Crystal meteors rain from the sky and catch aliens all over the screen.', trophy: 'vortexEye' },
    { id: 'aurora', desc: 'A healing light: 40% health back, and a slow heal for a while.', stars: 60 },
  ];
  const superIcon = (id, cls = '') => `<i class="super-ico ${cls}" style="--si:${window.SV.SUPERS[id].i}"></i>`;
  const starsTotal = () => Object.values(save.stages || {}).reduce((a, x) => a + (x.stars || 0), 0);
  const superUnlocked = (s) => !s.soon && (unlockAll() || ((!s.trophy || (save.trophies || {})[s.trophy] > 0) && (!s.stars || starsTotal() >= s.stars)));

  // Superpowers: 4 big cards per page; one superpower in each hand (left and right)
  let superPage = 0;
  const SUPERS_PER_PAGE = 4;
  const superPicks = () => {
    const p = save.superPicks || [save.superPick || 'shockwave', null];
    return [p[0] || null, p[1] || null];
  };
  function equipSuper(id, hand) {
    const p = superPicks();
    if (p[hand] === id) p[hand] = null;            // tap again to take it off
    else { if (p[1 - hand] === id) p[1 - hand] = p[hand]; p[hand] = id; }   // already in the other hand: swap
    if (!p[0] && !p[1]) p[hand] = id;              // always keep at least one
    save.superPicks = p; delete save.superPick;
    persist(); Sfx.select(); renderMods(); focusFirst();
  }
  function renderSupers(grid) {
    const picks = superPicks();
    const pages = Math.ceil(SUPER_INFO.length / SUPERS_PER_PAGE);
    superPage = Math.min(superPage, pages - 1);
    for (const s of SUPER_INFO.slice(superPage * SUPERS_PER_PAGE, (superPage + 1) * SUPERS_PER_PAGE)) {
      const def = window.SV.SUPERS[s.id], open = superUnlocked(s);
      const hand = picks.indexOf(s.id);
      const card = document.createElement('div');
      card.className = 'mod super-card' + (open ? '' : ' locked') + (hand >= 0 ? ' equipped' : '');
      const why = s.soon ? t('Coming soon') : !open && s.stars ? t('Collect {a} stars to unlock').replace('{a}', s.stars) + ` (${starsTotal()}/${s.stars})` : !open ? t('Beat the {a} to unlock').replace('{a}', LEVELS[Object.keys(TROPHY_WORLD).find((w) => TROPHY_WORLD[w] === s.trophy)].boss.name) : '';
      card.innerHTML = `${superIcon(s.id, 'big')}<div class="super-txt"><b>${t(def.name)}</b>
        <p>${t(s.desc)}</p>${why ? `<p class="lock">${why}</p>` : ''}</div>`;
      if (open) {
        const row = document.createElement('div');
        row.className = 'row hands';
        [[0, 'Left hand'], [1, 'Right hand']].forEach(([h, label]) => {
          const on = picks[h] === s.id;
          const b = document.createElement('button');
          b.className = 'btn small ' + (on ? 'equip-on' : 'equip-off');
          b.innerHTML = `<span>${on ? '✓ ' : ''}${t(label)}</span>`;
          b.addEventListener('click', () => equipSuper(s.id, h));
          row.appendChild(b);
        });
        card.querySelector('.super-txt').appendChild(row);
      }
      grid.appendChild(card);
    }
    // page buttons
    const nav = document.createElement('div');
    nav.className = 'super-nav';
    nav.innerHTML = `<button class="carousel-arrow" data-sp="-1" ${superPage === 0 ? 'disabled' : ''}>‹</button>
      <span>${superPage + 1} / ${pages}</span>
      <button class="carousel-arrow" data-sp="1" ${superPage >= pages - 1 ? 'disabled' : ''}>›</button>
      <span class="hands-now">${t('Left hand')}: <b>${picks[0] ? t(window.SV.SUPERS[picks[0]].name) : '–'}</b> · ${t('Right hand')}: <b>${picks[1] ? t(window.SV.SUPERS[picks[1]].name) : '–'}</b></span>`;
    nav.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => { superPage += Number(b.dataset.sp); Sfx.select(); renderMods(); focusFirst(); }));
    grid.appendChild(nav);
  }
  const TROPHY_WORLD = { 1: 'nebulaCrown', 2: 'prismHeart', 3: 'tidePearl', 4: 'emberCore', 5: 'echoBell', 6: 'vortexEye' };   // boss of each world
  actions['mods-super'] = () => { modsTab = 'super'; renderMods(); };

  // the Super button in the game (and on the phone controller): fills up, glows when ready
  function updateSuperHud(v) {
    const ids = v.ids || [v.id || 'shockwave', null];
    const paint = (el, id) => {
      if (!el) return;
      el.classList.toggle('hidden', !!v.none || !id);
      el.classList.toggle('ready', !!v.ready);
      el.style.setProperty('--p', Math.round((v.p || 0) * 100));
      if (id && el.dataset.sid !== id) { el.innerHTML = superIcon(id) + `<span class="super-ring"></span>`; el.dataset.sid = id; }
    };
    // HUD buttons (left hand, right hand) and the touch gamepad
    paint($('#super-btn'), ids[0]); paint($('#super-btn2'), ids[1]);
    if (window.Touch && Touch.items) { paint(Touch.items.super, ids[0]); paint(Touch.items.super2, ids[1]); }
    [1, 2].forEach((pl) => { try { Net.sendTo(pl, { m: 'super', p: v.p || 0, r: !!v.ready, none: !!v.none, h: [!!ids[0], !!ids[1]] }); } catch (e) { /* no phone */ } });
  }
  actions['super'] = () => Level.activateSuper(0);
  actions['super2'] = () => Level.activateSuper(1);


  // ================= Equipment screen =================
  // Unlocking and upgrading happens in the Workshop, the shops and Abilities; here you only choose what to use.
  // The film plays the first time each session (tap or Skip jumps to the end), then the last frame stays
  // with the film's music looping; six slots around the astronaut open a picker.
  const markFilm = (id) => { if (!save.films) save.films = {}; if (!save.films[id]) { save.films[id] = true; persist(); } };
  const SUPER_TROPHY = { shockwave: 'nebulaCrown', aurora: 'vortexEye' };
  const superLv = (id) => Math.max(1, Math.min(3, (save.superLv || {})[id] || 1));
  function superCost(id, lvl) {
    if (lvl === 2) return { crystal: 150, shard: 10, goo: 4 };
    const info = SUPER_INFO.find((s) => s.id === id) || {};
    return { crystal: 300, shard: 20, goo: 8, dust: 3, trophy: info.trophy || SUPER_TROPHY[id] || 'nebulaCrown' };
  }
  const SUPER_LV_TEXT = {
    shockwave: ['Pushes aliens back and stuns them 1 s', 'Pushes further back, stuns 2 s', 'Pushes furthest back, stuns 3 s'],
    aurora: ['+40% health and a slow heal', '+50% health, heals 30% longer', '+60% health, heals 60% longer'],
  };
  const superLvText = (id, l) => (SUPER_LV_TEXT[id] ? SUPER_LV_TEXT[id][l - 1] : [t('Normal strength'), t('Lasts 30% longer'), t('Lasts 60% longer')][l - 1]);
  const canUpgradeSuper = (id) => { const s = SUPER_INFO.find((q) => q.id === id); const l = superLv(id); return s && superUnlocked(s) && l < 3 && canPay(superCost(id, l + 1)); };
  const equipNews = () => !(save.films || {}).equip || superPicks().some((id) => id && canUpgradeSuper(id));
  const botsOwned = () => (save.owned.helperDrone ? 1 : 0) + (save.owned.droneTwo && save.owned.helperDrone ? 1 : 0);
  const botsNow = () => Math.min(botsOwned(), save.bots != null ? save.bots : botsOwned());
  const styleNow = () => {
    const off = save.styleOff || {};
    return { gold: !!save.owned.goldBlaster && !off.goldBlaster, rainbow: !!save.owned.rainbowLaser && !off.rainbowLaser };
  };
  const STYLE_SVG = (gold, rainbow) => `<svg viewBox="0 0 64 64" class="eq-svg"><defs><linearGradient id="rbw${gold ? 1 : 0}${rainbow ? 1 : 0}" x1="0" x2="1"><stop offset="0" stop-color="#ff5a7e"/><stop offset="0.33" stop-color="#ffd27a"/><stop offset="0.66" stop-color="#7dffb0"/><stop offset="1" stop-color="#62f0ff"/></linearGradient></defs>
    <path d="M8 26h30l6-6h10v14H44l-4 4H22l-4 16H8l4-16H8z" fill="${gold ? '#ffd27a' : '#cfe8ff'}" stroke="#fff" stroke-width="2"/>
    <path d="M54 27h8" stroke="${rainbow ? `url(#rbw${gold ? 1 : 0}1)` : '#62f0ff'}" stroke-width="5" stroke-linecap="round"/></svg>`;
  const EQUIP_SLOTS = [
    { id: 'super0', side: 'left', label: 'Left hand' }, { id: 'weapon', side: 'left', label: 'Weapon mod' }, { id: 'style', side: 'left', label: 'Blaster look' },
    { id: 'super1', side: 'right', label: 'Right hand' }, { id: 'bots', side: 'right', label: 'Helper bots' }, { id: 'drone', side: 'right', label: 'Drone ability' },
  ];
  let equipFilmDone = false, equipFrom = 'planets', equipWorld = null, equipSlot = null;
  actions['open-equip'] = () => { equipFrom = 'planets'; equipWorld = null; go('equip'); };
  actions['open-equip-world'] = () => { equipFrom = 'levels'; equipWorld = openWorldId; go('equip'); };
  actions['equip-back'] = () => { const w = equipWorld; go(equipFrom); if (equipFrom === 'levels' && w) openWorld(w); };
  actions['equip-skip'] = () => finishEquipFilm();
  actions['equip-pick-close'] = () => { $('#ov-equip').classList.remove('show'); renderEquip(); setTimeout(() => { const b = $(`.eq-slot[data-slot="${equipSlot}"]`); if (b) b.focus(); }, 30); };
  actions['equip-tip-ok'] = () => { save.equipTip = true; persist(); $('#ov-equip-tip').classList.remove('show'); setTimeout(focusFirst, 30); };
  $('#screen-equip').addEventListener('pointerdown', (e) => { if (!equipFilmDone && !e.target.closest('.equip-skip')) finishEquipFilm(); });
  $('#equip-video').addEventListener('ended', () => finishEquipFilm());
  $('#equip-video').addEventListener('error', () => { if (current === 'equip') finishEquipFilm(); });

  function startEquip() {
    const scr = $('#screen-equip'), v = $('#equip-video');
    renderEquip();
    $('#ov-equip').classList.remove('show'); $('#ov-equip-tip').classList.remove('show');
    if (equipFilmDone) { scr.classList.add('ready'); playEquipMusic(); return; }
    scr.classList.remove('ready');
    markFilm('equip');
    try {
      v.currentTime = 0;
      v.muted = save.options.sound !== 'on';
      const pr = v.play();
      if (pr && pr.catch) pr.catch(() => { v.muted = true; const p2 = v.play(); if (p2 && p2.catch) p2.catch(() => finishEquipFilm()); });
    } catch (e) { finishEquipFilm(); }
  }
  function finishEquipFilm() {
    if (current !== 'equip') return;
    const scr = $('#screen-equip');
    if (scr.classList.contains('ready')) return;
    equipFilmDone = true;
    try { $('#equip-video').pause(); } catch (e) {}
    scr.classList.add('ready');
    playEquipMusic();
    if (!save.equipTip) setTimeout(() => { if (current === 'equip') { $('#ov-equip-tip').classList.add('show'); setTimeout(focusFirst, 30); } }, 700);
    else setTimeout(focusFirst, 400);
  }
  function playEquipMusic() {
    const a = $('#equip-music');
    if (save.options.sound !== 'on') return;
    try { a.volume = 0.7; a.currentTime = 0; const pr = a.play(); if (pr && pr.catch) pr.catch(() => {}); } catch (e) {}
  }
  function stopEquip() {
    try { $('#equip-video').pause(); } catch (e) {}
    try { $('#equip-music').pause(); } catch (e) {}
    $('#ov-equip').classList.remove('show'); $('#ov-equip-tip').classList.remove('show');
  }

  function slotView(id) {
    if (id === 'super0' || id === 'super1') {
      const sid = superPicks()[id === 'super0' ? 0 : 1];
      if (!sid) return { icon: '<span class="eq-plus">+</span>', name: t('Empty') };
      const l = superLv(sid);
      return { icon: superIcon(sid, 'big'), name: t(window.SV.SUPERS[sid].name), sub: `${t('Level')} ${l}/3`, up: canUpgradeSuper(sid) };
    }
    if (id === 'weapon' || id === 'drone') {
      const m = MODS.find((q) => q.id === (save.loadout || {})[id]);
      if (!m || !(save.mods || {})[m.id]) return { icon: '<span class="eq-plus">+</span>', name: t('None') };
      return { icon: MAT_SVG[REGION_BY_WORLD[m.world]], name: t(m.name), sub: `${t('Level')} ${save.mods[m.id]}/3` };
    }
    if (id === 'bots') {
      const n = botsNow();
      return { icon: n ? Array.from({ length: n }, (_, i) => `<img src="assets/bot${i + 1}-icon.png" alt="">`).join('') : '<span class="eq-plus">0</span>',
        name: n === 0 ? t('No bots') : n === 1 ? t('1 bot') : t('2 bots'), sub: botsOwned() ? `${t('You have')} ${botsOwned()}` : t('Star shop') };
    }
    const st = styleNow();
    return { icon: STYLE_SVG(st.gold, st.rainbow), name: st.gold && st.rainbow ? t('Gold + rainbow') : st.gold ? t('Golden blaster') : st.rainbow ? t('Rainbow lasers') : t('Standard') };
  }
  function renderEquip() {
    for (const side of ['left', 'right']) {
      const col = $('#equip-' + side);
      col.innerHTML = '';
      for (const s of EQUIP_SLOTS.filter((q) => q.side === side)) {
        const v = slotView(s.id);
        const b = document.createElement('button');
        b.className = 'eq-slot' + (v.up ? ' up' : '');
        b.dataset.slot = s.id;
        b.innerHTML = `<small class="eq-label">${t(s.label)}</small><span class="eq-box">${v.icon}${v.up ? '<i class="eq-up">▲</i>' : ''}</span>`
          + `<b class="eq-name">${v.name}</b>${v.sub ? `<small class="eq-sub">${v.sub}</small>` : ''}`;
        b.addEventListener('click', () => { Sfx.select(); openPick(s.id); });
        col.appendChild(b);
      }
    }
    const u = save.upg || {};
    const mag = [8, 12, 18, 24, 30, 36, 42, 48, 50][(save.shopLv || {}).magazine || 0];
    $('#equip-stats').innerHTML = [`${t('Blaster')} Mk ${u.blaster || 1}`, `${t('Net grenade')} Mk ${u.net || 1}`, `${t('Shield')} Mk ${u.shield || 1}`,
      `${mag} ${t('shots')}`, (save.badges || {}).cadet ? `★ ${t('Cadet')}` : null, save.owned.medkit ? t('Medkit') : null, save.owned.timeGrenade ? t('Time grenades') : null].filter(Boolean).map((x) => `<span>${x}</span>`).join('');
  }

  // the picker: every choice for one slot (locked ones show how to get them)
  function openPick(slot) {
    equipSlot = slot;
    const box = $('#equip-pick');
    const label = EQUIP_SLOTS.find((q) => q.id === slot).label;
    let html = `<h2>${t(label)}</h2><div class="pick-grid">`;
    const card = (o) => `<div class="pick${o.on ? ' on' : ''}${o.locked ? ' locked' : ''}">
        <button class="pick-main" data-pick="${o.key}" ${o.locked ? 'disabled' : ''}><span class="pick-ico">${o.icon}</span><b>${o.name}</b>${o.sub ? `<small>${o.sub}</small>` : ''}
        ${o.on ? `<em>✓ ${t('Equipped')}</em>` : ''}${o.locked ? `<em class="lock">${o.locked}</em>` : ''}</button>${o.extra || ''}</div>`;
    const opts = [];
    if (slot === 'super0' || slot === 'super1') {
      const hand = slot === 'super0' ? 0 : 1, picks = superPicks();
      for (const s of SUPER_INFO) {
        const open = superUnlocked(s), l = superLv(s.id), on = picks[hand] === s.id, other = picks[1 - hand] === s.id;
        const why = s.soon ? t('Coming soon') : !open && s.stars ? t('Collect {a} stars to unlock').replace('{a}', s.stars) + ` (${starsTotal()}/${s.stars})`
          : !open ? t('Beat the {a} to unlock').replace('{a}', t(Object.values(LEVELS).find((L) => L.boss && TROPHY_WORLD_OF(s.trophy) === L)?.boss.name || 'boss')) : '';
        let extra = '';
        if (open) {
          const pips = [1, 2, 3].map((i) => `<i class="${i <= l ? 'on' : ''}"></i>`).join('');
          extra = `<div class="pick-lv"><div class="pips">${pips}</div><p>${superLvText(s.id, l)}</p>`;
          if (l < 3) {
            const cost = superCost(s.id, l + 1), ok = canPay(cost);
            extra += `<p class="next">${t('Next')}: ${superLvText(s.id, l + 1)}</p><div class="cost">${Object.entries(cost).map(([k, v]) => {
              const okk = k === 'trophy' ? have('trophy', v) > 0 : have(k) >= v;
              return `<span class="${okk ? '' : 'short'}">${k === 'trophy' ? MAT_SVG.trophy + t(TROPHY_NAMES[v]) : MAT_SVG[k] + v}</span>`;
            }).join('')}</div><button class="btn small ${ok ? 'pink' : ''}" data-upsuper="${s.id}" ${ok ? '' : 'disabled'}><span>▲ ${t('Upgrade')}</span></button>`;
          } else extra += `<p class="next">${t('Fully upgraded!')}</p>`;
          extra += '</div>';
        }
        opts.push({ key: s.id, icon: superIcon(s.id, 'big'), name: t(window.SV.SUPERS[s.id].name), sub: other ? t('In your other hand') : t(s.desc), on, locked: open ? '' : why, extra });
      }
    } else if (slot === 'weapon' || slot === 'drone') {
      opts.push({ key: '-', icon: '<span class="eq-plus">–</span>', name: t('None'), on: !(save.loadout || {})[slot] });
      for (const m of MODS.filter((q) => q.kind === slot)) {
        const lvl = (save.mods || {})[m.id] || 0;
        opts.push({ key: m.id, icon: MAT_SVG[REGION_BY_WORLD[m.world]], name: t(m.name), sub: lvl ? `${t('Level')} ${lvl}/3 · ${m.eff(lvl)}` : t(m.desc),
          on: save.loadout[slot] === m.id && lvl > 0, locked: lvl ? '' : t('Make it in Abilities (Workshop)') });
      }
      if (slot === 'drone' && !botsNow()) html = html.replace('<div class="pick-grid">', `<p class="muted">${t('Drone abilities need at least 1 helper bot.')}</p><div class="pick-grid">`);
    } else if (slot === 'bots') {
      const own = botsOwned(), n = botsNow();
      [[0, t('No bots'), '<span class="eq-plus">0</span>'], [1, t('1 bot'), '<img src="assets/bot1-icon.webp" alt="">'], [2, t('2 bots'), '<img src="assets/bot1-icon.webp" alt=""><img src="assets/bot2-icon.webp" alt="">']].forEach(([k, name, icon]) => {
        opts.push({ key: String(k), icon, name, on: n === k, locked: k > own ? t(k === 1 ? 'Buy a Helper drone in the Star shop' : 'Buy Drone 2 in the Star shop') : '',
          sub: k === 0 ? t('Play on your own') : k === 1 ? t('Catches an alien every 10 s') : t('Two bots, one on each side') });
      });
    } else {
      const own = save.owned, st = styleNow();
      [['std', t('Standard'), false, false, ''], ['gold', t('Golden blaster'), true, false, own.goldBlaster ? '' : t('Star shop: Golden blaster')],
        ['rainbow', t('Rainbow lasers'), false, true, own.rainbowLaser ? '' : t('Star shop: Rainbow lasers')],
        ['both', t('Gold + rainbow'), true, true, own.goldBlaster && own.rainbowLaser ? '' : t('Needs both from the Star shop')]].forEach(([k, name, g, r, lock]) => {
        opts.push({ key: k, icon: STYLE_SVG(g, r), name, on: st.gold === g && st.rainbow === r, locked: lock });
      });
    }
    box.innerHTML = html + opts.map(card).join('') + '</div>';
    box.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => choosePick(slot, b.dataset.pick)));
    box.querySelectorAll('[data-upsuper]').forEach((b) => b.addEventListener('click', () => upgradeSuper(b.dataset.upsuper)));
    $('#ov-equip').classList.add('show');
    setTimeout(() => { const f = box.querySelector('.pick.on .pick-main') || box.querySelector('.pick-main:not([disabled])'); if (f) f.focus(); }, 30);
  }
  function choosePick(slot, key) {
    let on = true;
    if (slot === 'super0' || slot === 'super1') {
      const hand = slot === 'super0' ? 0 : 1, p = superPicks();
      if (p[hand] === key) {
        if (!p[1 - hand]) { Sfx.clink(); showToastMenu(t('Keep at least one superpower')); return; }
        p[hand] = null; on = false;
      } else { if (p[1 - hand] === key) p[1 - hand] = p[hand]; p[hand] = key; }
      save.superPicks = p; delete save.superPick;
    } else if (slot === 'weapon' || slot === 'drone') {
      if (key === '-' || save.loadout[slot] === key) { on = !!(key !== '-' && false); save.loadout[slot] = null; on = false; }
      else save.loadout[slot] = key;
    } else if (slot === 'bots') {
      const n = Number(key); on = n > botsNow(); save.bots = n;
      if (n === botsNow() && n === Number(key)) on = n > 0;
    } else {
      const off = save.styleOff || (save.styleOff = {});
      const g = key === 'gold' || key === 'both', r = key === 'rainbow' || key === 'both';
      on = key !== 'std';
      off.goldBlaster = !g; off.rainbowLaser = !r;
    }
    persist();
    if (on) Sfx.equip(); else Sfx.unequip();
    openPick(slot);
    const b = $(`#equip-pick [data-pick="${key}"]`); if (b) b.focus();
  }
  function upgradeSuper(id) {
    const l = superLv(id); if (l >= 3) return;
    const cost = superCost(id, l + 1);
    if (!canPay(cost)) return;
    pay(cost);
    save.superLv = { ...(save.superLv || {}), [id]: l + 1 };
    persist(); Sfx.win();
    showToastMenu(`${t(window.SV.SUPERS[id].name)}: ${t('Level')} ${l + 1}!`);
    openPick(equipSlot);
  }
  // the world whose boss gives a trophy
  function TROPHY_WORLD_OF(trophy) {
    const w = Object.entries(WORLD_TROPHY).find(([, tr]) => tr === trophy);
    return w ? LEVELS[w[0]] : null;
  }

  // ================= Cinema =================
  const CINEMA = [
    { id: 'promo', kind: 'film', name: 'Star Voyager trailer', src: 'assets/promo.mp4', thumb: 'assets/cine/promo.jpg', open: () => true },
    { id: 'intro', kind: 'film', name: 'The journey begins', src: 'assets/intro.mp4', thumb: 'assets/cine/intro.jpg', open: () => true },
    { id: 'kn', kind: 'talk', name: 'King Nebula', thumb: 'assets/cine/kn.jpg', open: () => !!(save.story || {}).kn, hint: 'Free King Nebula in Crystal Shores' },
    { id: 'el', kind: 'talk', name: 'Ember Lord', thumb: 'assets/cine/el.jpg', open: () => !!(save.story || {}).el, hint: 'Free the Ember Lord in Sunfire Dunes' },
    { id: 'pe', kind: 'talk', name: 'Prism Empress', thumb: 'assets/cine/pe.jpg', open: () => !!(save.story || {}).pe, hint: 'Free the Prism Empress in Glowwood Forest' },
    { id: 'tq', kind: 'talk', name: 'Tidequeen', thumb: 'assets/cine/tq.jpg', open: () => !!(save.story || {}).tq, hint: 'Free the Tidequeen in Sunken Lagoon' },
    { id: 'em', kind: 'talk', name: 'Echo Monarch', thumb: 'assets/cine/em.jpg', open: () => !!(save.story || {}).em, hint: 'Free the Echo Monarch in Moonlit Cavern' },
    { id: 'vk', kind: 'talk', name: 'Vortex King', thumb: 'assets/cine/vk.jpg', open: () => !!(save.story || {}).vk, hint: 'Free the Vortex King in Starfall Wetlands' },
    { id: 'sq', kind: 'talk', name: 'Skybloom Queen', thumb: 'assets/cine/sq.jpg', open: () => !!(save.story || {}).sq, hint: 'Free the Skybloom Queen in Bubble Shallows' },
    { id: 'op', kind: 'talk', name: 'Orbello Prime', thumb: 'assets/cine/op.jpg', open: () => !!(save.story || {}).op, hint: 'Free Orbello Prime in Moonglass Caves' },
    { id: 'mk', kind: 'talk', name: 'Mistwyrm King', thumb: 'assets/cine/mk.jpg', open: () => !!(save.story || {}).mk, hint: 'Free the Mistwyrm King in Petal Peaks' },
    { id: 'equip', kind: 'film', name: 'Suit up', src: 'assets/equip.mp4', thumb: 'assets/cine/equip.jpg', open: () => !!(save.films || {}).equip, hint: 'Open the Equipment screen' },
    { id: 'voidIntro', kind: 'film', name: 'The Void awakens', src: 'assets/void-intro.mp4', thumb: 'assets/cine/void-intro.jpg', open: () => !!(save.films || {}).voidIntro, hint: 'Reach the last level of ????' },
    { id: 'voidOutro', kind: 'film', name: 'The Void escapes', src: 'assets/void-outro.mp4', thumb: 'assets/cine/void-outro.jpg', open: () => !!(save.films || {}).voidOutro, hint: 'Defeat The Void' },
  ];
  function renderCinema() {
    const grid = $('#cine-grid');
    grid.innerHTML = '';
    for (const c of CINEMA) {
      const open = unlockAll() || c.open();          // "Unlock all" also opens every film and conversation
      const b = document.createElement('button');
      b.className = 'cine-tile' + (open ? '' : ' locked');
      b.innerHTML = `<span class="cine-pic" style="background-image:url('${c.thumb}')"></span>`
        + `<span class="cine-kind">${c.kind === 'film' ? '▶ ' + t('Film') : '💬 ' + t('Conversation')}</span>`
        + `<b>${open ? t(c.name) : '???'}</b>${open ? '' : `<small>${t(c.hint)}</small>`}`;
      b.setAttribute('aria-label', open ? t(c.name) : t('Locked') + ': ' + t(c.hint));
      b.addEventListener('click', () => {
        if (!open) { Sfx.clink(); showToastMenu(t(c.hint)); return; }
        Sfx.select();
        if (c.kind === 'talk' && window.Story) Story.play(c.id, () => setTimeout(focusFirst, 30), { replay: true });
        else playFilm(c.src);
      });
      grid.appendChild(b);
    }
  }
  let filmOn = false;
  function playFilm(src) {
    const box = $('#film-player'), v = $('#film-video');
    filmOn = true;
    v.src = src;
    box.classList.add('show');
    try {
      v.currentTime = 0; v.muted = save.options.sound !== 'on';
      const pr = v.play();
      if (pr && pr.catch) pr.catch(() => { v.muted = true; const p2 = v.play(); if (p2 && p2.catch) p2.catch(() => closeFilm()); });
    } catch (e) { closeFilm(); }
    setTimeout(() => { const b = box.querySelector('button'); if (b) b.focus(); }, 50);
  }
  function closeFilm(silent) {
    if (!filmOn) return;
    filmOn = false;
    const box = $('#film-player'), v = $('#film-video');
    try { v.pause(); } catch (e) {}
    box.classList.remove('show');
    if (!silent) setTimeout(focusFirst, 30);
  }
  actions['film-close'] = () => closeFilm();

  // Android shows a grey "play" icon on a video until its first picture has loaded. Every video gets a
  // poster instead: the film's own first frame where we have one, otherwise an invisible picture.
  // Videos made later (blurred copies, the moving forest) and new films in the player are handled too.
  const POSTERS = ['void-intro', 'void-outro', 'equip', 'intro', 'promo', 'glowwood'];
  const NO_POSTER = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
  function setPoster(v) {
    const src = v.getAttribute('src') || '';
    const name = (src.match(/([\w-]+)\.(mp4|webm)$/) || [])[1];
    const want = name && POSTERS.includes(name) ? `assets/poster/${name}.jpg` : NO_POSTER;
    if (v.getAttribute('poster') !== want) v.setAttribute('poster', want);
  }
  document.querySelectorAll('video').forEach(setPoster);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'attributes' && m.target.tagName === 'VIDEO') setPoster(m.target);
      else m.addedNodes.forEach((n) => { if (n.tagName === 'VIDEO') setPoster(n); else if (n.querySelectorAll) n.querySelectorAll('video').forEach(setPoster); });
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });

  // Films on screens wider than the film: a soft, blurred, darker copy of the same film fills the sides.
  // The copy is muted and follows the real film (play, pause, jumps). Where the film already fills the width it is hidden behind it.
  function blurTwin(media) {
    if (!media || media._twin) return;
    const isVid = media.tagName === 'VIDEO';
    const box = document.createElement('div'), t = document.createElement(isVid ? 'video' : 'img');
    box.className = 'blur-twin'; box.id = media.id + '-blur'; box.setAttribute('aria-hidden', 'true'); t.alt = '';
    box.appendChild(t);
    media.parentNode.insertBefore(box, media);
    media._twin = t;
    if (!isVid) { t.src = media.getAttribute('src'); return; }
    t.muted = true; t.playsInline = true; t.preload = 'none'; t.setAttribute('playsinline', '');
    const sync = (force) => {
      const src = media.currentSrc || media.src;
      if (src && t.src !== src) t.src = src;
      if (force || Math.abs(t.currentTime - media.currentTime) > 0.25) { try { t.currentTime = media.currentTime; } catch (e) {} }
    };
    media.addEventListener('play', () => { sync(true); const pr = t.play(); if (pr && pr.catch) pr.catch(() => {}); });
    media.addEventListener('pause', () => { t.pause(); sync(true); });
    media.addEventListener('seeked', () => sync(true));
    media.addEventListener('timeupdate', () => sync(false));
    media.addEventListener('ended', () => t.pause());
  }
  ['#void-video', '#void-outro-video', '#equip-video', '#equip-still', '#film-video'].forEach((q) => blurTwin($(q)));
  $('#film-video').addEventListener('ended', () => closeFilm());
  $('#film-video').addEventListener('error', () => { if (filmOn) closeFilm(); });
  $('#film-player').addEventListener('pointerdown', (e) => { if (!e.target.closest('button')) closeFilm(); });

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
  const WORLD_TROPHY = { 1: 'nebulaCrown', 2: 'prismHeart', 3: 'tidePearl', 4: 'emberCore', 5: 'echoBell', 6: 'vortexEye' };   // Glowwood: Prism Empress, Sunfire Dunes: Ember Lord
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
    $('#mods-note').textContent = (modsTab === 'drone' && !hasDrone ? t('Needs a helper drone from the Star shop') + ' · ' : '') + t('Make and upgrade here, choose what to use in the Equipment screen.');
    const inv = [...new Set(Object.values(REGION_BY_WORLD))].map((k) => `<span class="inv">${MAT_SVG[k]}<b>${save.mats[k] || 0}</b><small>${t(MAT_NAMES[k])}</small></span>`).join('');
    $('#mods-inv').innerHTML = inv;
    const grid = $('#mods-grid');
    grid.innerHTML = '';
    grid.classList.toggle('supers', modsTab === 'super');
    if (modsTab === 'super') { $('#mods-note').textContent = ''; renderSupers(grid); return; }
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
      if (lvl && equipped) {
        const e = document.createElement('span');
        e.className = 'in-use';
        e.textContent = '✓ ' + t('In use');
        row.appendChild(e);
      }
      card.appendChild(row);
      grid.appendChild(card);
    }
  }

  // Star items: special upgrades bought with the stars you earn on levels
  const STAR_SHOP = [
    { id: 'goldBlaster',  name: 'Golden blaster',  text: 'Your blaster turns shiny gold. Switch it on or off in Equipment.', price: 3 },
    { id: 'rainbowLaser', name: 'Rainbow lasers',  text: 'Every shot sparkles in all colours. Switch it on or off in Equipment.', price: 2 },
    { id: 'crystalMagnet', name: 'Crystal magnet', text: 'Every alien you catch gives 2 crystals instead of 1.', price: 4 },
    { id: 'secondChance', name: 'Second chance',   text: 'Once per level: when your health runs out, come back with 50%.', price: 5 },
    { id: 'helperDrone',  name: 'Helper drone',    text: 'A little drone that catches an alien for you every 10 seconds. Choose 0, 1 or 2 bots in Equipment.', price: 8 },
    { id: 'droneTwo',     name: 'Drone 2',         text: 'A second helper drone that flies and catches aliens on its own. Choose 0, 1 or 2 bots in Equipment.', price: 10 },
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
      if (item.levels) { grid.appendChild(levelItem(item)); continue; }
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

  // a shop item with several levels: shows its level, what the next level gives, and its price
  const shopLevel = (id) => { const l = (save.shopLv || {})[id]; return l != null ? l : ((save.owned || {})[id] ? 1 : 0); };
  function levelItem(item) {
    const l = shopLevel(item.id), max = item.levels.length, maxed = l >= max, price = maxed ? 0 : item.levels[l];
    const div = document.createElement('div');
    div.className = 'item lv' + (l ? ' owned' : '');
    const pips = Array.from({ length: max }, (_, i) => `<i class="${i < l ? 'on' : ''}"></i>`).join('');
    div.innerHTML = `<b>${t(item.name)}</b><p>${t(item.text)}</p><div class="pips shop-pips">${pips}</div>
      <p class="lvl">${l ? `${t('Now')}: ${item.effect(l)}` : `${t('Now')}: ${item.effect(0)}`}${maxed ? '' : ` → <b>${item.effect(l + 1)}</b>`}</p>`;
    const btn = document.createElement('button');
    btn.className = 'btn small' + (maxed ? '' : ' pink');
    btn.innerHTML = `<span>${maxed ? t('Max') : `${l ? t('Upgrade') : t('Buy')} · <i class="crystal"></i> ${price}`}</span>`;
    btn.disabled = maxed || save.crystals < price;
    btn.addEventListener('click', () => {
      if (maxed || save.crystals < price) return;
      save.crystals -= price;
      save.shopLv = { ...(save.shopLv || {}), [item.id]: l + 1 };
      save.owned[item.id] = true;
      persist(); Sfx.reload(); renderShop(); focusFirst();
    });
    div.appendChild(btn);
    return div;
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
    if (key === 'sound') { Sfx.enabled = v === 'on'; Music.setEnabled(v === 'on'); }
    if (key === 'vibrate') { Haptics.enabled = v === 'on'; if (v === 'on') Haptics.buzz(60, 0.6); }
    if (key === 'unlockAll') applyUnlockAll(v === 'on');
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
    // (the health meter needs no building any more: it is one bar)
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
  // Orbit talks during levels: a small speech bubble with his portrait (the Orbit design you chose)
  let orbitTimer = null;
  function showOrbit(text) {
    const box = $('#orbit-say');
    if (!box || !text) return;
    const d = Number(save.options.orbit || 0), face = $('.os-face', box);
    face.style.backgroundPosition = `${(d % 3) * 50}% ${Math.floor(d / 3) * 50}%`;
    $('.os-text', box).textContent = text;
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    clearTimeout(orbitTimer);
    orbitTimer = setTimeout(() => hideOrbit(), 3600 + Math.min(3000, text.length * 35));
  }
  function hideOrbit(now) { clearTimeout(orbitTimer); const box = $('#orbit-say'); if (box) box.classList.remove('show'); }
  function onHud(kind, value, L) {
    if (kind === 'all' || kind === 'health') {
      const mult = L.healthMult || 1;
      $('#health-num').textContent = Math.round(L.health * mult);                     // 100 … 300 with the Armour suit
      $('#health-max').textContent = '/' + Math.round(100 * mult);
      const h = $('#health');
      h.style.setProperty('--hp', Math.max(0, Math.min(100, L.health)) + '%');
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
        pips.classList.toggle('many', L.magSize > 12);           // bigger magazines: thinner bullets, in two rows from 30
        pips.classList.toggle('lots', L.magSize > 24);
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
    if (kind === 'super') updateSuperHud(value);
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
    if (kind === 'voidOutro') { Music.stop(900); playVoidOutro(); return; }
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
    if (kind === 'orbit') showOrbit(value);
    if (kind === 'tut') {
      const box = $('#tut-box');
      const d = Number(save.options.orbit || 0);
      $('.tb-face', box).style.backgroundPosition = `${(d % 3) * 50}% ${Math.floor(d / 3) * 50}%`;
      $('.tb-text', box).textContent = value.text;
      $('.tb-progress', box).textContent = value.progress || '';
      $('.tb-steps', box).innerHTML = Array.from({ length: value.steps }, (_, i) => `<i class="${i < value.step ? 'done' : i === value.step ? 'now' : ''}"></i>`).join('');
      box.classList.toggle('hint', !!value.hint);
      box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop', 'show');
      $$('#touchpad .tut-glow').forEach((x) => x.classList.remove('tut-glow'));
      if (value.glow) { const g = $(value.glow === 'stick' ? '#touchpad [data-id="stick"] .tp-base' : `#touchpad [data-id="${value.glow}"]`); if (g) g.classList.add('tut-glow'); }
    }
    if (kind === 'go') {
      $('#ov-count').classList.remove('show');
      if (!Level.plat && !Level.tut) showToast(lastMode !== 'phone' ? 'Click a monster to fire' : Input.isCam() ? 'Hold the circle on a monster to fire' : 'Aim and press Fire');
    }
    if (kind === 'pause') {
      Music.duck(true);
      $('#pause-reason').textContent = value || 'Take a breather.';
      $('#pause-hint').style.display = lastMode === 'phone' ? 'block' : 'none';
      $('#pause-hint').textContent = Input.isCam() ? 'Point at a button and hold to choose it.' : 'Move the circle to a button and press Fire. Menu returns to the game.';
      $('#ov-pause').classList.add('show');
      setTimeout(focusFirst, 30);
    }
    if (kind === 'resume') { $('#ov-pause').classList.remove('show'); Music.duck(false); }
  }
  function showToast(text) { onHud('toast', text, Level); }

  // Buttons the hand cursor can press while paused or on the end screen, in stage coordinates
  function getMenuButtons() {
    const overlay = $$('#ov-pause.show, #ov-end.show')[0];
    if (!overlay) return [];
    const sr = stage.getBoundingClientRect();
    const s = sr.width / window.SV.viewW();            // the stage can be wider than 1920 (expand mode)
    return $$('button', overlay).filter((b) => !b.disabled).map((b) => {
      const r = b.getBoundingClientRect();
      return { el: b, x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s };
    });
  }

  function hideOverlays() { $$('#screen-game .overlay').forEach((o) => o.classList.remove('show')); }

  // ---------------- Level flow ----------------
  let lastMode = 'mouse', lastWorld = 1, lastStage = 1;
  let tutNext = false, lastTut = false;
  function startTraining() {
    tutNext = true;
    pending = { world: WORLD_IDS[0], stage: 1 };
    Sfx.select();
    if (window.SV_TOUCH || Net.isConnected()) startLevel('phone', WORLD_IDS[0], 1);
    else go('connect');
  }
  function startLevel(mode, world = lastWorld, stage = lastStage) {
    currentPlanet = (LEVELS[world] && LEVELS[world].planet) || 1;
    const tutorial = tutNext; tutNext = false; lastTut = tutorial;
    if (!tutorial && !stageUnlocked(world, stage)) return;
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
    Music.play(musicFor(world, stage));
    Level.start({ level: world, stage, mode, players: !window.SV_TOUCH && Net.isConnected(2) ? 2 : 1, save, options: save.options, onEnd: endLevel, onHud, getMenuButtons, tutorial });
    $('#screen-game').classList.toggle('tutorial', tutorial);
    $('#tut-box').classList.remove('show');
    $$('#touchpad .tut-glow').forEach((x) => x.classList.remove('tut-glow'));
    buildCatches();
    onHud('all', null, Level);
    $('#screen-game').classList.toggle('plat', !!Level.plat);
    $('#screen-game').classList.toggle('endless', !!Level.endless);
    $('#screen-game').classList.toggle('survive', Level.special === 'survive');
    hideOrbit(true);
    Net.setLayout(Level.plat ? 'plat' : 'normal');
    if (mode === 'phone' && Input.isCam()) onHud('cal', 'Looking for you…', Level);
    else onHud('countdown', 3, Level);
  }

  // Music per world:
  //  Novara: Pixels (worlds 1, 3, 5) and Miami Heatwave (worlds 2, 4, 6) · Prismara: Stoner · ????: Zone 55
  //  rulers (level 10): Metal in the Night on Novara, Defender on Prismara · Endless: Defender
  //  The Void: The End Of All Things
  function musicFor(world, stage) {
    const L = LEVELS[world] || {};
    if (L.void) return stage === STAGES ? 'endofallthings' : 'zone55';
    if (L.endless) return 'defender';
    if (stage === STAGES && L.boss) return L.planet === 3 ? 'defender' : 'metal';
    if (L.planet === 3) return 'stoner';
    return world % 2 === 0 ? 'heatwave' : 'pixels';
  }

  // ---------------- Training (tutorial) ----------------
  // Orbit in front of the dimmed screen: the offer before the first level, and the reward afterwards
  function showTutOverlay(kind, info) {
    let ov = $('#tut-overlay');
    if (!ov) { ov = document.createElement('div'); ov.id = 'tut-overlay'; ov.className = 'tut-overlay'; $('#stage').appendChild(ov); }
    const d = Number(save.options.orbit || 0), pos = `${(d % 3) * 50}% ${Math.floor(d / 3) * 50}%`;
    const lines = kind === 'intro'
      ? [t("Hi Commander! I'm Orbit, your robot buddy."), t("Before we fly to Crystal Shores, let's do a quick training. It only takes two minutes!")]
      : info && info.first
        ? [t('Great job, Cadet! You know all the moves now.'), t('You earned 50 crystals and the Cadet badge!')]
        : [t('Great job! You still know all the moves.'), t('Ready for the real adventure?')];
    const buttons = kind === 'intro'
      ? `<button class="btn pink" data-action="tut-start"><span>${t('Start training')}</span></button><button class="btn" data-action="tut-skip"><span>${t('Skip')}</span></button>`
      : `<button class="btn pink" data-action="tut-adventure"><span>${t('Start the adventure')}</span></button><button class="btn" data-action="tut-back"><span>${t('Back')}</span></button>`;
    ov.innerHTML = `<div class="tut-dim"></div>
      <div class="tut-card">
        <div class="tut-orbit" style="background-position:${pos}"></div>
        <div class="tut-talk"><b>Orbit</b>${lines.map((l, i) => `<p style="animation-delay:${0.25 + i * 0.6}s">${l}</p>`).join('')}
          ${kind === 'done' && info && info.first ? `<div class="tut-reward"><span>${MAT_SVG.crystal || ''}<b>+50</b></span><span class="tut-badge">★ ${t('Cadet')}</span></div>` : ''}
          <div class="row tut-buttons">${buttons}</div></div>
      </div>`;
    ov.classList.add('show');
    Sfx.select();
    setTimeout(() => { const b = ov.querySelector('.btn.pink'); if (b) b.focus(); }, 60);
  }
  function hideTutOverlay() { const ov = $('#tut-overlay'); if (ov) ov.classList.remove('show'); }
  function endTutorial(r) {
    $('#tut-box').classList.remove('show');
    $$('#touchpad .tut-glow').forEach((x) => x.classList.remove('tut-glow'));
    const first = r.won && save.tut !== 'done';
    if (first) {
      save.crystals = (save.crystals || 0) + 50;
      save.badges = { ...(save.badges || {}), cadet: true };
    }
    if (r.won) save.tut = 'done';
    persist();
    showTutOverlay('done', { first });
  }

  // story scenes after beating a ruler (by boss), what it unlocks, and where their statue stands in the Spacedome
  const STORY_AFTER = {
    nebula: { scene: 'kn', champ: 'nebula' },
    prism: { scene: 'pe', champ: 'prism', item: 'prismLens' },
    splash: { scene: 'tq', champ: 'splash', item: 'songShell' },
    ember: { scene: 'el', champ: 'ember', item: 'scorchedFragment' },
    echo: { scene: 'em', champ: 'echo', item: 'echoStone' },
    vortex: { scene: 'vk', champ: 'vortex', item: 'starCompass' },
    skybloom: { scene: 'sq', champ: 'skybloom', item: 'bloomSeed' },
    orbello: { scene: 'op', champ: 'orbello', item: 'moonMirror' },
    vaporis: { scene: 'mk', champ: 'vaporis', item: 'mistScale' },
  };
  const CHAMPIONS = {
    nebula: { name: 'King Nebula', img: 'assets/story/p_kingnebula.jpg', pos: [930, 1062] },
    ember: { name: 'Ember Lord', img: 'assets/story/p_emberlord.jpg', pos: [790, 1062] },
    prism: { name: 'Prism Empress', img: 'assets/story/p_prismempress.jpg', pos: [1070, 1062] },
    splash: { name: 'Tidequeen', img: 'assets/story/p_tidequeen.jpg', pos: [370, 1062] },
    echo: { name: 'Echo Monarch', img: 'assets/story/p_echomonarch.jpg', pos: [1210, 1062] },
    vortex: { name: 'Vortex King', img: 'assets/story/p_vortexking.jpg', pos: [235, 1062] },
    skybloom: { name: 'Skybloom Queen', img: 'assets/story/p_skybloomqueen.jpg', pos: [1590, 1062] },
    orbello: { name: 'Orbello Prime', img: 'assets/story/p_orbelloprime.jpg', pos: [100, 1062] },
    vaporis: { name: 'Mistwyrm King', img: 'assets/story/p_mistwyrmking.jpg', pos: [1740, 1062] },
  };
  const ITEMS = {
    scorchedFragment: { name: 'Scorched Fragment', desc: 'A piece of the "falling star" from the Ember Lord\'s volcano. It is metal: someone built this.' },
    prismLens: { name: 'Prism Lens', svg: 'lens', desc: 'A gift from the Prism Empress. Through it, the "new stars" blink like machines.' },
    songShell: { name: 'Song Shell', svg: 'shell', desc: 'The Tidequeen\'s shell. Hold it to your helmet and you hear the cold song from the deep.' },
    echoStone: { name: 'Echo Stone', svg: 'stone', desc: 'The Echo Monarch\'s stone. It whispers one word over and over: Void.' },
    starCompass: { name: 'Star Compass', svg: 'compass', desc: 'From the Vortex King. Its needle always points to where Novara\'s energy was sent.' },
    bloomSeed: { name: 'Bloom Seed', svg: 'seed', desc: 'From the Skybloom Queen. Where it grows, no signal can reach.' },
    moonMirror: { name: 'Moon Mirror', svg: 'mirror', desc: 'From Orbello Prime. It shows things as they really are.' },
    mistScale: { name: 'Mist Scale', svg: 'scale', desc: 'From the Mistwyrm King. It hides you in a soft mist.' },
  };
  function endLevel(r) {
    Music.stop(1500);
    hideOrbit(true);
    if (r.tutorial) return endTutorial(r);
    // every time a ruler with a story is beaten: the cutscene (with a Skip button), then the usual end screen
    const story = r.won && r.stage === STAGES && !r.storyShown && window.Story ? STORY_AFTER[LEVELS[r.world].boss && LEVELS[r.world].boss.sprite] : null;
    if (story) {
      r.storyShown = true;
      save.story = { ...(save.story || {}), [story.scene]: true };
      save.champions = { ...(save.champions || {}), [story.champ]: true };
      if (story.item) save.items = { ...(save.items || {}), [story.item]: true };
      persist();
      Story.play(story.scene, () => endLevel(r));
      return;
    }
    // Crew quarters: +10% crystals per level of the building
    const crew = Math.round((r.earned || 0) * 0.1 * ((save.base || {}).quarters || 0));
    const bonus = (r.won ? 15 : 0) + crew;
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
    $('#end-title').textContent = r.endless ? `${t('Endless')}: ${t('wave')} ${r.wave}` : !r.won ? (r.reason || 'Your shields are down') : LEVELS[r.world].plat ? `${cfgName} cleared!` : r.stage === STAGES ? `${cfgName} cleared!` : `Level ${r.stage} clear`;
    $('#end-stars').innerHTML = r.won ? starsHtml(rating.stars) : '';
    // A friendly tip on what would give more stars
    let tip = '';
    if (r.won && rating.stars < 3) {
      const p = rating.parts, weakest = Object.entries(p).sort((a, b) => a[1] - b[1])[0][0];
      tip = { health: 'Tip: take less damage for more stars', accuracy: 'Tip: aim carefully, fewer missed shots give more stars', time: `Tip: be a bit quicker, the target time is ${fmtTime(r.par)}` }[weakest];
    }
    $('#end-tip').textContent = tip;
    const survive = r.special === 'survive';
    const caught = r.endless ? `<span>${t('Wave')}</span><b>${r.wave}</b>` : (survive ? `<span>${t('Survived')}</span><b>${r.won ? '60 s' : Math.floor(r.survived || 0) + ' s'}</b>` : '')
      + types().map((t) => `<span>${SPR[t].name}</span><b>${survive ? r.caught[t] : `${r.caught[t]}/${goal(t)}`}</b>`).join('')
      + (r.boss ? `<span>${r.boss.name}</span><b>${r.boss.caught ? 'Caught!' : 'Got away'}</b>` : '');
    const bonusRows = r.won && r.bonus ? `
      <span>${t('No damage bonus')}</span><b>${r.bonus.noDamage.toLocaleString()}</b>
      <span>${t('Accuracy bonus')}</span><b>${r.bonus.accuracy.toLocaleString()}</b>
      <span>${t('Speed bonus')}</span><b>${r.bonus.time.toLocaleString()}</b>` : '';
    // drops: a row of icons with the amount under each one (the name shows when you point at it)
    const dropIcons = Object.entries(r.drops || {}).map(([k, n]) => {
      const trophy = k.startsWith('trophy:');
      const name = t(trophy ? (TROPHY_NAMES[k.slice(7)] || k) : MAT_NAMES[k] || k);
      return `<div class="drop-ico" title="${name}">${trophy ? MAT_SVG.trophy : MAT_SVG[k] || ''}<b>${n}</b></div>`;
    }).join('');
    $('#end-score').innerHTML = `<span class="end-score-num">${(r.score || 0).toLocaleString()}</span>`
      + (r.newBest ? `<span class="new-best">${t('New high score!')}</span>` : '')
      + (r.bestCombo > 1 ? `<small>${t('Best combo')}: ${r.bestCombo}</small>` : '');
    $('#end-stats').innerHTML = `${bonusRows}
      ${dropIcons ? `<div class="end-drops"><span>${t('Drops')}</span><div class="drop-icons">${dropIcons}</div></div>` : ''}
      <span>Time</span><b>${fmtTime(r.time)}${r.endless ? '' : ` <small>(target ${fmtTime(r.par)})</small>`}</b>
      ${caught}
      <span>Accuracy</span><b>${r.accuracy}%</b>
      <span>Health left</span><b>${Math.max(0, Math.round(r.health))}%</b>
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
    // Orbit's training overlay: Escape / Back = Skip (before) or Back (after)
    const tov = $('#tut-overlay');
    if (tov && tov.classList.contains('show')) {
      if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'Backspace') { e.preventDefault(); actions[tov.querySelector('[data-action="tut-skip"]') ? 'tut-skip' : 'tut-back'](); return; }
      if (/^Arrow/.test(e.key)) { e.preventDefault(); const bs = [...tov.querySelectorAll('.btn')]; const i = bs.indexOf(document.activeElement); bs[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + bs.length) % bs.length].focus(); return; }
    }
    // during a cutscene: Enter / Space / → next line, Escape skips
    if (window.Story && Story.active) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); Story.advance(); }
      else if (e.key === 'Escape') { e.preventDefault(); Story.finish(); }
      return;
    }
    // typing in a text field (email, password, save code): leave the keys alone, except Escape
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Escape') return;
    if (current === 'planets' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement && document.activeElement.closest('#planet-row')) {
      e.preventDefault(); rotatePlanets(e.key === 'ArrowLeft' ? -1 : 1);
      const mid = $('#planet-row .planet[data-slot="mid"]'); if (mid) mid.focus();
      return;
    }
    if (current === 'game' && outroOn && ['Escape', 'Backspace', 'GoBack', 'Enter', ' '].includes(e.key)) { e.preventDefault(); endVoidOutro(); return; }
    const inGame = current === 'game' && Level.state === 'play';
    if (inGame && (e.key === 'r' || e.key === 'R')) { Level.keyReload(); return; }
    // superpowers: Q = left hand, E = right hand
    if (inGame && (e.key === 'q' || e.key === 'Q')) { Level.activateSuper(0); return; }
    if (inGame && (e.key === 'e' || e.key === 'E')) { Level.activateSuper(1); return; }
    if (inGame && ['1', '2', '3', '4'].includes(e.key)) { Level.keyEquipIndex(Number(e.key) - 1); return; }
    if (inGame && (e.key === 'g' || e.key === 'G')) { Level.toggleBelt(); return; }
    if (current === 'intro' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); endIntro(); return; }
    if (current === 'voidintro' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); endVoidIntro(); return; }
    if (current === 'equip' && !equipFilmDone && ['Enter', ' ', 'Escape', 'Backspace', 'GoBack'].includes(e.key)) { e.preventDefault(); finishEquipFilm(); return; }
    if (current === 'cinema' && filmOn && ['Enter', ' ', 'Escape', 'Backspace', 'GoBack'].includes(e.key)) { e.preventDefault(); closeFilm(); return; }
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.key === 'Backspace' || e.key === 'GoBack') {
      if (inGame) {
        e.preventDefault();
        if (Level.paused) Level.resume(); else Level.pause();
        return;
      }
      if (current === 'levels' && $('#ov-world').classList.contains('show')) { e.preventDefault(); actions['world-close'](); return; }
      if (current === 'dex' && Dex.detailOpen()) { e.preventDefault(); Dex.hide(); setTimeout(focusFirst, 30); return; }
      if (current === 'equip' && $('#ov-equip').classList.contains('show')) { e.preventDefault(); actions['equip-pick-close'](); return; }
      if (current === 'equip' && $('#ov-equip-tip').classList.contains('show')) { e.preventDefault(); actions['equip-tip-ok'](); return; }
      if (current === 'equip') { e.preventDefault(); actions['equip-back'](); return; }
      if (current === 'options') { e.preventDefault(); closeOptions(); return; }
      if (current === 'intro') { e.preventDefault(); endIntro(); return; }
      if (current === 'voidintro') { e.preventDefault(); endVoidIntro(); return; }
      if (current === 'home' && $('#ov-base').classList.contains('show')) { e.preventDefault(); actions['base-close'](); return; }
      const back = { cinema: 'planets', options: 'start', levels: 'planets', planets: 'start', shop: 'planets', connect: 'levels', quit: 'start', dex: 'planets', home: 'planets', ranch: 'home', workshop: workshopFrom, goals: 'planets', badges: 'goals', mods: modsFrom, account: accountFrom, touchedit: 'options' }[current];
      if (back) { e.preventDefault(); go(back); }
      return;
    }
    if (inGame && Level.plat) return;     // the platformer uses the arrow keys for moving
    // alien guide page: left/right go to the previous/next alien (unless you are moving between level buttons)
    if (current === 'dex' && Dex.detailOpen() && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
        && !(document.activeElement && document.activeElement.closest('.where-levels'))) {
      e.preventDefault(); if (Dex.step(e.key === 'ArrowLeft' ? -1 : 1)) Sfx.select(); return;
    }
    // the planet screen (hub): arrows move to the nearest button in that direction
    if (current === 'planets' && (e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement && document.activeElement.classList.contains('planet')) {
      e.preventDefault(); rotatePlanets(e.key === 'ArrowLeft' ? -1 : 1); return;
    }
    if (current === 'planets' && /^Arrow/.test(e.key)) {
      const f = focusables(), a = document.activeElement;
      if (f.length && f.includes(a)) {
        const r0 = a.getBoundingClientRect(), cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
        const [dx, dy] = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        let best = null, bd = Infinity;
        for (const el of f) {
          if (el === a || (el.dataset.slot && el.dataset.slot !== 'mid')) continue;     // only the planet in the middle
          const r = el.getBoundingClientRect(), x = r.left + r.width / 2 - cx, y = r.top + r.height / 2 - cy;
          const along = x * dx + y * dy, side = Math.abs(x * dy - y * dx);
          if (along < 20) continue;
          const d = along + side * 2;
          if (d < bd) { bd = d; best = el; }
        }
        e.preventDefault();
        if (best) { best.focus({ preventScroll: true }); Sfx.select(); }
        return;
      }
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

  // Android app: the phone's back button. On the title screen it closes the app, elsewhere it acts like Escape.
  window.SVBack = () => {
    if (current === 'start') return 'exit';
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    return 'ok';
  };
  if (window.SV_APP) document.body.classList.add('in-app');

  // ---------------- Orbit, the AI helper ----------------
  if (save.options.unlockAll === 'on') applyUnlockAll(true);
  if (window.Story) Story.orbitDesign = () => Number(save.options.orbit || 0);
  function renderOrbitPick() {
    const grid = $('#orbit-grid');
    const cur = Number(save.options.orbit || 0);
    grid.innerHTML = '';
    for (let d = 0; d < 9; d++) {
      const b = document.createElement('button');
      b.className = 'orbit-opt' + (d === cur ? ' on' : '');
      b.style.backgroundPosition = `${(d % 3) * 50}% ${Math.floor(d / 3) * 50}%`;
      b.setAttribute('aria-label', `Orbit ${d + 1}`);
      b.addEventListener('click', () => { save.options.orbit = d; persist(); Sfx.select(); renderOrbitPick(); });
      grid.appendChild(b);
    }
  }
  actions['choose-orbit'] = () => { renderOrbitPick(); $('#ov-orbit').classList.add('show'); setTimeout(focusFirst, 30); };
  actions['orbit-close'] = () => { $('#ov-orbit').classList.remove('show'); setTimeout(focusFirst, 30); };

  // ---------------- Planet choice ----------------
  // Each planet spins slowly: its 12 frames blend into each other while the picture turns a little.
  // Novara holds all current worlds; Cindera is the next planet (coming soon).
  let optionsFrom = 'start';
  const PLANETS = [
    { id: 1, name: 'Novara', img: 'assets/planet1.webp', cell: 340, frames: 12, open: true },
    { id: 2, name: 'Cindera', img: 'assets/planet2.webp', cell: 400, frames: 12, open: true, soon: true,
      // no playable worlds yet: all three show as 'Soon available' and cannot be entered
      worlds: [{ name: 'Glimmer Coast', bg: 'assets/cindera1.jpg' }, { name: 'Emberfall Rift', bg: 'assets/cindera2.jpg' },
        { name: 'Thunder Spires', bg: 'assets/cindera3.jpg' }] },
    // the third planet: the domain of the Void, the astronaut's recurring arch-nemesis (opens after Starfall Wetlands)
    { id: 5, name: '????', img: 'assets/planet5.webp', cell: 360, frames: 8, open: false, mystery: true,
      // its one world (10 levels); you get there through the opening film
      worlds: [{ world: 30, name: '????', bg: 'assets/void-bg.jpg' }] },
    { id: 3, name: 'Prismara', img: 'assets/planet3.webp', cell: 370, frames: 12, open: true, soon: true,
      // three playable worlds (backgrounds borrowed from Novara for now); opens after Starfall Wetlands
      worlds: [{ world: 20, name: 'Bubble Shallows', bg: 'assets/level3.jpg' }, { world: 21, name: 'Moonglass Caves', bg: 'assets/level5.jpg' },
        { world: 22, name: 'Petal Peaks', bg: 'assets/level1.jpg' }] },
    { id: 4, name: 'Tetra', img: 'assets/planet4.webp', cell: 360, frames: 16, open: false },
  ];
  PLANETS.forEach((p) => { p.image = new Image(); p.image.src = p.img; });
  let planetLoop = 0, planetZoom = false, planetIdx = 0;
  // place the planets on the carousel: the chosen one in the middle, its neighbours left and right
  // A round carousel: after the last planet comes the first one again (swipe, tap a side planet, or left/right)
  function layoutCarousel() {
    const n = PLANETS.length;
    $$('#planet-row .planet').forEach((b, i) => {
      let off = ((i - planetIdx) % n + n) % n;      // 0 = middle, 1 = right, n-1 = left, others out of view
      if (off > n / 2) off -= n;
      b.dataset.slot = off === 0 ? 'mid' : off === -1 ? 'left' : off === 1 ? 'right' : off < 0 ? 'offl' : 'offr';
      b.tabIndex = off === 0 ? 0 : -1;
    });
  }
  function rotatePlanets(dir) {
    const n = PLANETS.length;
    const hadFocus = document.activeElement && document.activeElement.classList.contains('planet');
    planetIdx = ((planetIdx + dir) % n + n) % n;
    Sfx.select();
    layoutCarousel();
    // keep the controller / keyboard focus on the planet in the middle
    if (hadFocus) { const mid = $('#planet-row .planet[data-slot="mid"]'); if (mid) mid.focus({ preventScroll: true }); }
  }
  // world cards: scroll by one card
  function scrollWorlds(dir) {
    const box = $('#worlds'), card = box.querySelector('.level-card');
    if (!card) return;
    box.scrollBy({ left: dir * (card.offsetWidth + 22), behavior: 'smooth' });
    Sfx.select();
  }
  actions['worlds-prev'] = () => scrollWorlds(-1);
  actions['worlds-next'] = () => scrollWorlds(1);
  // arrows only when there are more worlds than fit
  function updateWorldArrows() {
    const box = $('#worlds');
    const more = box.scrollWidth > box.clientWidth + 4;
    $('.worlds-wrap').classList.toggle('scrolls', more);
    $('.carousel-arrow.wl').classList.toggle('dim', box.scrollLeft <= 4);
    $('.carousel-arrow.wr').classList.toggle('dim', box.scrollLeft + box.clientWidth >= box.scrollWidth - 4);
  }
  actions['planet-prev'] = () => rotatePlanets(-1);
  actions['planet-next'] = () => rotatePlanets(1);

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
    const ed = $('#equip-dot'); if (ed) ed.classList.toggle('on', equipNews());
    const worlds = Object.values(LEVELS).filter((l) => !l.plat && !l.endless && (l.planet || 1) === 1);
    const aliens = new Set(worlds.flatMap((l) => l.types)).size;
    const row = $('#planet-row');
    row.innerHTML = '';
    for (const p of PLANETS) {
      const b = document.createElement('button');
      b.className = 'planet' + (p.open ? '' : ' locked') + (p.soon ? ' soon' : '') + (p.mystery ? ' mystery' + (voidOpen() ? ' open' : ' sealed') : '');
      b.dataset.planet = p.id;
      const playW = (p.worlds || []).filter((wd) => wd.world).map((wd) => wd.world);
      const info = p.soon
        ? `<span class="planet-info">${(p.worlds || []).length} ${t('worlds')}${playW.length ? ` · ${playW.length} ${t('open')}` : ''}</span>`
          + (playW.length ? `<span class="planet-info stars">${starSvg(true)} ${playW.reduce((a, w) => a + worldStars(w), 0)}/${playW.length * STAGES * 3}</span>` : `<span class="planet-info soon">${t('Soon available')}</span>`)
        : p.open
        ? `<span class="planet-info">${worlds.length} ${t('worlds')} · ${aliens} ${t('aliens')} · ${worlds.length} ${t('bosses')}</span>
           <span class="planet-info stars">${starSvg(true)} ${totalStars}/${worlds.length * STAGES * 3}</span>`
        : p.mystery ? `<span class="planet-info soon">${voidOpen() ? '???' : '🔒 ' + t('Free Starfall Wetlands first')}</span>`
        : `<span class="planet-info soon">${t('Coming soon')}</span>`;
      b.innerHTML = `<canvas class="planet-canvas" width="560" height="560"></canvas><span class="planet-name">${t(p.name)}</span>${info}`;
      b.setAttribute('aria-label', p.open ? p.name : `${p.name}, ${t('Coming soon')}`);
      b.addEventListener('click', () => {
        // a planet at the side first turns to the middle; the middle one is entered
        if (b.dataset.slot !== 'mid') { rotatePlanets(b.dataset.slot === 'left' || b.dataset.slot === 'offl' ? -1 : 1); return; }
        if (p.open) choosePlanet(b, p);
        else if (p.mystery && voidOpen()) enterVoidWorld();
        else if (p.mystery) { Sfx.clink(); showToast(t('Free the Vortex King in Starfall Wetlands first')); }
        else { Sfx.clink(); showToast(t('Coming soon')); }
      });
      row.appendChild(b);
      p.canvas = b.querySelector('canvas');
    }
    layoutCarousel();
    // swipe left/right on the planets to turn the carousel
    if (!row.dataset.swipe) {
      row.dataset.swipe = '1';
      let sx = null;
      const scale = () => $('#stage').getBoundingClientRect().width / window.SV.viewW();
      const drag = (px) => row.style.setProperty('--drag', px + 'px');
      row.addEventListener('pointerdown', (e) => { sx = e.clientX; row.classList.add('dragging'); });
      row.addEventListener('pointermove', (e) => { if (sx == null) return; drag(Math.max(-560, Math.min(560, (e.clientX - sx) / scale()))); });
      const end = (e) => {
        if (sx == null) return;
        const dx = (e.clientX - sx) / scale(); sx = null;
        row.classList.remove('dragging'); drag(0);
        if (Math.abs(dx) > 70) { e.stopPropagation(); rotatePlanets(dx < 0 ? 1 : -1); row.dataset.swiped = Date.now(); }
      };
      row.addEventListener('pointerup', end, true);
      row.addEventListener('pointercancel', () => { sx = null; row.classList.remove('dragging'); drag(0); });
      row.addEventListener('click', (e) => { if (Date.now() - (row.dataset.swiped || 0) < 300) { e.stopPropagation(); e.preventDefault(); } }, true);
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
    markFilm('intro');
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

  // ---------------- The mystery planet ???? ----------------
  // Choosing ???? fades to black and opens its world straight away.
  const VOID_WORLD = 30;
  function enterVoidWorld() {
    Sfx.select();
    currentPlanet = 5;
    fadeTo('levels', { tint: '#000', out: 800, hold: 250 });
    setTimeout(() => openWorld(VOID_WORLD), 820);
  }
  // Its opening film plays when you start the boss level (level 10): fade to black, film (Skip), then the level.
  let voidDone = true, voidBusy = false, voidAfter = null;
  function playVoidIntro(after) {
    if (voidBusy) return;
    markFilm('voidIntro');
    voidBusy = true; voidDone = false; voidAfter = after || null;
    Sfx.select();
    const v = $('#void-video');
    fadeTo('voidintro', { tint: '#000', out: 800, hold: 250 }).then(() => {
      voidBusy = false;
      if (voidDone) return;
      try {
        v.currentTime = 0;
        v.muted = save.options.sound !== 'on';
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => {
          if (voidDone) return;
          v.muted = true;
          const p2 = v.play();
          if (p2 && p2.catch) p2.catch(() => endVoidIntro());
        });
      } catch (e) { endVoidIntro(); }
    });
  }
  function endVoidIntro() {
    if (voidDone) return;
    voidDone = true;
    const v = $('#void-video');
    try { v.pause(); } catch (e) {}
    const after = voidAfter; voidAfter = null;
    const f = $('#fade'); f.style.background = '#000'; f.classList.add('on');
    setTimeout(() => {
      if (after) after(); else { go('levels'); openWorld(VOID_WORLD); }
      setTimeout(() => f.classList.remove('on'), 250);
    }, 500);
  }
  const isVoidBoss = (w, s) => !!(LEVELS[w] && LEVELS[w].void && s === STAGES);

  // ---------------- Film after defeating The Void ----------------
  let outroOn = false;
  function playVoidOutro() {
    const box = $('#void-outro'), v = $('#void-outro-video');
    markFilm('voidOutro');
    outroOn = true;
    box.classList.add('show');
    requestAnimationFrame(() => box.classList.add('in'));
    setTimeout(() => {
      if (!outroOn) return;
      try {
        v.currentTime = 0;
        v.muted = save.options.sound !== 'on';
        const pr = v.play();
        if (pr && pr.catch) pr.catch(() => { v.muted = true; const p2 = v.play(); if (p2 && p2.catch) p2.catch(() => endVoidOutro()); });
      } catch (e) { endVoidOutro(); }
      setTimeout(() => { const b = box.querySelector('button'); if (b) b.focus(); }, 50);
    }, 700);
  }
  // after the film: a black screen, the Void's last words, and only then the score
  let tauntOn = false, tauntTimer = 0;
  function endVoidOutro() {
    if (!outroOn) return;
    const box = $('#void-outro'), v = $('#void-outro-video');
    if (!tauntOn) {
      tauntOn = true;
      try { v.pause(); } catch (e) {}
      box.classList.add('taunt');
      const tx = $('#void-taunt');
      tx.classList.remove('show'); void tx.offsetWidth;
      setTimeout(() => { tx.classList.add('show'); Sfx.rumble && Sfx.rumble(1.2, 0.5); }, 700);
      tauntTimer = setTimeout(endVoidOutro, 5200);
      return;
    }
    clearTimeout(tauntTimer);
    tauntOn = false;
    outroOn = false;
    box.classList.remove('in');
    setTimeout(() => { box.classList.remove('show', 'taunt'); $('#void-taunt').classList.remove('show'); Level.endCine(); }, 600);
  }
  $('#void-outro').addEventListener('pointerdown', (e) => { if (tauntOn && !e.target.closest('.void-skip')) endVoidOutro(); });
  $('#void-outro-video').addEventListener('ended', endVoidOutro);
  $('#void-outro-video').addEventListener('error', () => { if (outroOn) endVoidOutro(); });

  $('#void-video').addEventListener('ended', endVoidIntro);
  $('#void-video').addEventListener('error', () => { if (!voidDone && current === 'voidintro') endVoidIntro(); });
  $('#screen-voidintro').addEventListener('pointerdown', (e) => { if (!e.target.closest('.void-skip')) endVoidIntro(); });

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
        mp.pos.x += (Input.aim.x * window.SV.viewW() - mp.pos.x) * k;     // the stage can be wider than 1920
        mp.pos.y += (Input.aim.y * 1080 - mp.pos.y) * k;
      }
      const fresh = Input.hasAim && Input.poseFresh();
      const screen = $('#screen-' + current);
      const overlay = $('.overlay.show', screen);
      const root = overlay || screen;
      const sr = stage.getBoundingClientRect(), s = sr.width / window.SV.viewW();
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
  Music.setEnabled(save.options.sound === 'on');
  Haptics.enabled = save.options.vibrate !== 'off';
  if (!save.options.lang) save.options.lang = I18N.guess();
  I18N.setLang(save.options.lang);
  I18N.watch();
  // the alien guide can start a level directly ("Where to catch it")
  Dex.init({ save, persist, unlocked: (w, s) => stageUnlocked(w, s), toast: (m) => showToastMenu(t(m)),
    cleared: (w, s) => unlockAll() || stageCleared(w, s),
    voidState: () => ({ sealed: voidOpen(), trueForm: unlockAll() || !!(save.films || {}).voidIntro || stageCleared(30, STAGES) }),
    play: (w, s) => { lastWorld = w; lastStage = s; currentPlanet = (LEVELS[w] && LEVELS[w].planet) || 1; chooseStage(w, s); } });
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
