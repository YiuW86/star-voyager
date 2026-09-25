// Level 1 gameplay. Everything is drawn in a 1920x1080 coordinate space.
(function () {
  const W = 1920, H = 1080;
  let GOAL = 10;                                     // goal of the level being played
  // Levels: background, which monsters appear, and how many of each to catch
  const LEVELS = {
    1: { name: 'Crystal Shores',  bg: 'assets/level1.jpg', types: ['nebula', 'prism', 'solara', 'glide', 'vexa'], goal: 10 },
    2: { name: 'Glowwood Forest', bg: 'assets/level2.jpg', types: ['pulsar', 'ember'], goal: 15 },
  };
  const ALL_TYPES = ['nebula', 'prism', 'solara', 'glide', 'vexa', 'pulsar', 'ember'];
  let TYPES = LEVELS[1].types;                       // types of the level being played
  const DWELL_TIME = 0.45;       // seconds the circle must rest on a target to fire the blaster
  const SHOT_COOLDOWN = 0.28;
  const DAMAGE = 5;              // % health lost per hit

  // Gadget belt and gear
  const BELT = { r: 64, itemR: 58, gap: 150, openTime: 0.45, selectTime: 0.8, closeDelay: 1.0, slowMo: 0.3 };
  const GEAR = [
    { id: 'gun',     name: 'Blaster',     color: '#62f0ff' },
    { id: 'grenade', name: 'Net grenade', color: '#ff8ad8' },
    { id: 'shield',  name: 'Shield',      color: '#8ff0c8' },
  ];
  const NET_R = 210;             // capture radius of the net
  const GRENADE_STILL = 0.6;     // hold the circle still this long to throw
  const STILL_PX = 30;           // how far the circle may drift while holding still
  const SHIELD_MAX = 10;         // hits before the shield breaks
  const SHIELD_RECHARGE = 20;    // seconds before a broken shield can be used again

  // Pause
  const MENU_BTN = { x: 860, y: 28, w: 200, h: 64 };   // matches #btn-menu in the HUD
  const MENU_DWELL = 0.8;
  const T_HOLD = 1.0;

  // Frame sizes come from the sliced spritesheets (5 columns x 3 rows each).
  // front = frames facing the player, side = frames facing right (mirrored for left).
  // thrower = this monster throws rocks the shield can block.
  const SPR = {
    gun:    { src: 'assets/gun.png',    fw: 346, fh: 325 },
    nebula: { src: 'assets/nebula.png', fw: 238, fh: 246, front: [0, 12, 11, 12], side: [1, 14, 9], color: '#c79bff', name: 'Nebula', speed: [8, 10] },
    prism:  { src: 'assets/prism.png',  fw: 236, fh: 249, front: [0, 5, 11, 5],   side: [9, 14, 10], color: '#7fe3ff', name: 'Prism',  speed: [9, 11], thrower: true },
    solara: { src: 'assets/solara.png', fw: 274, fh: 242, front: [0, 4, 12, 4],   side: [6, 9, 14], color: '#ffd27a', name: 'Solara', speed: [6.5, 8.5] },
    glide:  { src: 'assets/glide.png',  fw: 262, fh: 212, front: [0, 11, 0, 11],  side: [2, 10, 14, 12], color: '#8ff0c8', name: 'Glide', speed: [6, 7.5] },
    vexa:   { src: 'assets/vexa.png',   fw: 245, fh: 234, front: [0, 1, 11, 1],   side: [3, 9, 10, 14], color: '#ffa45c', name: 'Vexa',  speed: [9, 11], thrower: true },
    // pulse = moves toward you in bursts, to the rhythm of its glowing bubbles
    pulsar: { src: 'assets/pulsar.png', fw: 244, fh: 229, front: [0, 10, 11, 10], side: [3, 8, 9], color: '#b8f06a', name: 'Pulsar', speed: [7, 9], pulse: true },
    ember:  { src: 'assets/ember.png',  fw: 244, fh: 260, front: [0, 5, 0, 7],    side: [3, 6, 11, 12], color: '#ff9a6a', name: 'Ember', speed: [6.5, 8], thrower: true },
  };
  // Gun frames ordered from pointing far left to pointing far right
  const GUN_ORDER = [0, 1, 2, 3, 4, 12, 14, 13, 11, 10];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const FONT = '"Chakra Petch", "Segoe UI", Roboto, Arial, sans-serif';

  // ---------------- Assets ----------------
  const Assets = {
    images: {},
    load(onProgress) {
      const list = [...Object.entries(LEVELS).map(([id, l]) => ['bg' + id, l.bg]), ...['gun', ...ALL_TYPES].map((k) => [k, SPR[k].src])];
      let done = 0;
      return Promise.all(list.map(([key, src]) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { this.images[key] = img; done++; if (onProgress) onProgress(done / list.length); resolve(); };
        img.onerror = () => reject(new Error('Could not load ' + src));
        img.src = src;
      })));
    },
  };

  // ---------------- Smoothing (One Euro filter) ----------------
  class OneEuro {
    constructor(minCutoff = 1.0, beta = 1.2, dCutoff = 1.0) {
      this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff; this.reset();
    }
    reset() { this.t = null; this.x = null; this.dx = 0; }
    alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
    filter(v, tMs) {
      if (this.t === null) { this.t = tMs; this.x = v; return v; }
      const dt = Math.max(0.001, (tMs - this.t) / 1000);
      this.t = tMs;
      const d = (v - this.x) / dt;
      this.dx = lerp(this.dx, d, this.alpha(this.dCutoff, dt));
      const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
      this.x = lerp(this.x, v, this.alpha(cutoff, dt));
      return this.x;
    }
  }

  // ---------------- Input: phone pose or mouse ----------------
  // One input per player (Player 1 can also use the mouse)
  function makeInput() {
    return {
    mode: 'mouse',
    hand: 'right',
    sens: 1,
    aim: { x: 0.5, y: 0.5 },        // normalized screen position (0..1)
    hasAim: false,
    lastPose: 0,
    offsetNow: null,                // wrist offset from shoulder, used for calibration
    calib: null,                    // { cx, cy } once calibrated
    freeHandUp: false,
    tSign: false,                   // time-out T made with both forearms
    mouseFire: false,
    mouseReload: false,
    // Phone controller type: 'cam' (camera body tracking), 'pad' (touch gamepad) or 'tilt' (point the phone like a remote)
    device: 'cam',
    events: [],            // button presses from the phone: fire, reload, gun, grenade, shield, menu
    fireHeld: false,
    counters: null, session: null,

    isCam() { return this.mode === 'phone' && this.device === 'cam'; },
    // Devices with a real button: aiming and clicking instead of holding still
    isClicky() { return this.mode === 'mouse' || (this.mode === 'phone' && this.device !== 'cam'); },
    usesDwell() { return this.mode === 'mouse' || this.isCam(); },

    // Message from the gamepad or tilt controller: absolute pointer position plus button press counters.
    // Counters (instead of single "pressed" messages) mean a lost network packet never loses a button press.
    onPointer(d) {
      if (d.m === 'hello') { this.device = d.mode; return; }
      if (this.mode !== 'phone') return;
      this.device = d.m;
      this.aim.x = clamp(d.x, 0, 1);
      this.aim.y = clamp(d.y, 0, 1);
      this.hasAim = true;
      this.lastPose = performance.now();
      this.fireHeld = !!d.hold;
      if (d.c) {
        if (this.counters && this.session === d.s) {
          for (const k of Object.keys(d.c)) {
            const n = d.c[k] - (this.counters[k] || 0);
            for (let i = 0; i < Math.min(n, 3); i++) this.events.push(k);
          }
        }
        this.counters = { ...d.c }; this.session = d.s;
      }
    },
    takeEvents() { const e = this.events; this.events = []; return e; },
    smoothing: 'normal',
    // Separate filters: the wrist moves fast (adaptive filter), the shoulder and body size barely move (heavy filter).
    // This removes most of the jitter that the shoulder used to add to the aim.
    fw: [new OneEuro(), new OneEuro()],
    fs: [new OneEuro(0.3, 0.2), new OneEuro(0.3, 0.2)],
    fsw: new OneEuro(0.2, 0.1),
    lastWrist: null,

    setSmoothing(level) {
      this.smoothing = level;
      const [mc, beta] = { low: [1.6, 4], normal: [1.0, 3], high: [0.55, 2] }[level] || [1.0, 3];
      this.fw.forEach((f) => { f.minCutoff = mc; f.beta = beta; });
    },

    reset() {
      this.hasAim = false; this.lastPose = 0; this.offsetNow = null; this.freeHandUp = false; this.tSign = false;
      [...this.fw, ...this.fs, this.fsw].forEach((f) => f.reset());
      this.lastWrist = null;
    },

    // Message from the phone: { t, a: aspect ratio, p: [x,y,visibility] x 7 }
    // Landmark order: nose, left shoulder, right shoulder, left elbow, right elbow, left wrist, right wrist
    onPose(d) {
      if (d && d.m === 'cam') this.device = 'cam';
      if (this.mode !== 'phone' || !d || !d.p) return;
      this.device = 'cam';
      const now = performance.now();
      // Use the phone's own clock for filtering, so network hiccups don't affect the smoothing
      const t = typeof d.t === 'number' ? d.t : now;
      // Mirror x because the camera faces the player: their right hand should move the aim right
      const L = (i) => ({ x: (1 - d.p[i * 3]) * d.a, y: d.p[i * 3 + 1], v: d.p[i * 3 + 2] });
      const nose = L(0), ls = L(1), rs = L(2), le = L(3), re = L(4), lw = L(5), rw = L(6);
      if (ls.v < 0.4 || rs.v < 0.4) return;
      const swRaw = Math.max(0.05, Math.hypot(ls.x - rs.x, ls.y - rs.y));   // shoulder width = body scale
      const sw = this.fsw.filter(swRaw, t);
      const right = this.hand === 'right';
      const wristRaw = right ? rw : lw, shoulderRaw = right ? rs : ls, free = right ? lw : rw;

      // Reload gesture: free hand raised above the head
      this.freeHandUp = free.v > 0.4 && free.y < nose.y - 0.25 * sw;

      // Pause gesture: time-out T with the forearms (one horizontal, one vertical, wrists close together in front of the chest)
      this.tSign = false;
      if (lw.v > 0.5 && rw.v > 0.5 && le.v > 0.5 && re.v > 0.5) {
        const fa = (e, w) => ({ dx: w.x - e.x, dy: w.y - e.y, len: Math.hypot(w.x - e.x, w.y - e.y) });
        const a = fa(le, lw), b = fa(re, rw);
        const horiz = (f) => Math.abs(f.dy) < 0.45 * f.len;
        const vert = (f) => Math.abs(f.dx) < 0.45 * f.len;
        const shoulderY = (ls.y + rs.y) / 2;
        const near = Math.hypot(lw.x - rw.x, lw.y - rw.y) < 0.75 * sw;
        const chest = lw.y > nose.y - 0.3 * sw && rw.y > nose.y - 0.3 * sw && lw.y < shoulderY + 1.6 * sw && rw.y < shoulderY + 1.6 * sw;
        const long = a.len > 0.3 * sw && b.len > 0.3 * sw;
        this.tSign = near && chest && long && ((horiz(a) && vert(b)) || (vert(a) && horiz(b)));
      }

      // Ignore frames where the wrist is poorly seen, and single-frame jumps (tracking glitches)
      if (wristRaw.v < 0.5) return;
      if (this.lastWrist && wristRaw.v < 0.8 && Math.hypot(wristRaw.x - this.lastWrist.x, wristRaw.y - this.lastWrist.y) > 1.2 * sw) return;
      this.lastWrist = { x: wristRaw.x, y: wristRaw.y };

      const wx = this.fw[0].filter(wristRaw.x, t), wy = this.fw[1].filter(wristRaw.y, t);
      const sx = this.fs[0].filter(shoulderRaw.x, t), sy = this.fs[1].filter(shoulderRaw.y, t);
      const dx = (wx - sx) / sw;
      const dy = (wy - sy) / sw;
      this.offsetNow = { dx, dy, t: now };
      const side = right ? 1 : -1;
      const cx = this.calib ? this.calib.cx : 0.25 * side;
      const cy = this.calib ? this.calib.cy : 0.15;
      this.aim.x = clamp(0.5 + (dx - cx) / (1.9 / this.sens), -0.02, 1.02);
      this.aim.y = clamp(0.5 + (dy - cy) / (1.5 / this.sens), -0.02, 1.02);
      this.hasAim = true;
      this.lastPose = now;
    },

    poseFresh() { return this.mode === 'mouse' || performance.now() - this.lastPose < 700; },
  };
  }
  const inputs = [makeInput(), makeInput()];
  inputs[1].mode = 'phone';
  const Input = inputs[0];

  // ---------------- Level ----------------
  // Everything a single player owns (gun, aim, ammo, gear) lives in a player object,
  // so a second phone simply adds a second player with their own gun.
  const PLAYER_COLORS = { 1: '#62f0ff', 2: '#ffd27a' };

  const Level = {
    canvas: null, ctx: null, scale: 1,
    running: false, paused: false, state: 'idle', loopId: 0,
    onEnd: null, onHud: null, getMenuButtons: null, save: null, options: null,
    players: [],

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      const toStage = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      };
      canvas.addEventListener('pointermove', (e) => {
        if (Input.mode !== 'mouse') return;
        const p = toStage(e); Input.aim.x = p.x; Input.aim.y = p.y; Input.hasAim = true;
      });
      canvas.addEventListener('pointerdown', (e) => {
        if (Input.mode !== 'mouse') return;
        if (e.button === 2) Input.mouseReload = true; else Input.mouseFire = true;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    setQuality(q) {
      const w = q === 'sharp' ? 1920 : 1280;
      this.canvas.width = w; this.canvas.height = Math.round(w * 9 / 16);
      this.scale = w / W;
    },

    start({ level = 1, mode, players = 1, save, options, onEnd, onHud, getMenuButtons }) {
      Object.assign(this, { save, options, onEnd, onHud, getMenuButtons });
      this.levelId = level;
      TYPES = LEVELS[level].types;
      GOAL = LEVELS[level].goal;
      this.types = TYPES; this.goal = GOAL;
      this.menuSuspended = false;
      Input.mode = mode;
      inputs[1].mode = 'phone';
      for (const inp of inputs) {
        inp.hand = options.hand;
        inp.sens = options.sens;
        inp.setSmoothing(options.smoothing || 'normal');
        inp.reset();
      }
      if (mode === 'phone') Input.calib = null;
      TYPES.forEach((t) => { delete this['done_' + t]; });
      this.setQuality(options.quality);

      const up = save.owned || {};
      this.magSize = up.magazine ? 12 : 8;
      this.reloadTime = up.quickReload ? 0.5 : 0.95;
      this.assist = [0, 0.35, 0.6, 0.85][options.assist] + (up.steadyAim && options.assist > 0 ? 0.12 : 0);
      this.hasMedkit = !!up.medkit;

      this.health = 100;
      this.caught = Object.fromEntries(TYPES.map((t) => [t, 0]));
      this.monsters = []; this.particles = []; this.lasers = []; this.rocks = []; this.nets = []; this.flying = [];
      this.spawnTimer = 0.8;
      this.time = 0; this.shots = 0; this.hits = 0; this.earned = 0;
      this.medkitUsed = false;
      this.shake = 0;
      this.promptText = ''; this.promptUntil = 0;

      this.players = [this.makePlayer(1)];
      if (players > 1) this.players.push(this.makePlayer(2));
      this.menuPlayer = null;
      this.cursor = { target: null, t: 0 };

      this.paused = false;
      this.state = this.players.some((p) => p.input.isCam()) ? 'calibrate' : 'countdown';
      this.stateT = 0;
      this.running = true;
      this.last = performance.now();
      this.hud('all');

      const id = ++this.loopId;
      const loop = (now) => {
        if (!this.running || id !== this.loopId) return;
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        if (this.paused || this.state === 'done') { if (!this.menuSuspended) this.updateMenuCursor(dt); }
        else this.update(dt);
        this.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    makePlayer(id) {
      const up = this.save.owned || {};
      const input = inputs[id - 1];
      if (id === 2) input.calib = null;
      return {
        id, input, color: PLAYER_COLORS[id],
        ammo: this.magSize, reloading: 0, reloadHold: 0, reloadLatch: false,
        equipped: 'gun', gunDown: 0, recoil: 0, cooldown: 0,
        dwell: 0, dwellTarget: null,
        reticle: { x: W / 2, y: H / 2 }, smoothAim: { x: W / 2, y: H / 2 },
        still: { x: 0, y: 0, t: 0 },
        belt: { open: false, hover: 0, sel: null, selT: 0, away: 0, anim: 0 },
        grenades: up.grenadePouch ? 5 : 3,
        shieldHP: SHIELD_MAX, shieldRecharge: 0, shieldFlash: 0,
        tHold: 0, tLatch: true, menuHold: 0,
        calSamples: [], calibrated: !input.isCam(),
      };
    },
    player(id) { return this.players.find((p) => p.id === id) || null; },

    // A second phone joins or leaves during a level
    addPlayer(id) {
      if (!this.running || this.state === 'done' || this.player(id)) return;
      const p = this.makePlayer(id);
      p.input.mode = 'phone';
      p.calibrated = true;           // joins straight in; camera players use the default centre
      this.players.push(p);
      this.players.sort((a, b) => a.id - b.id);
      this.hud('toast', `Player ${id} joined!`);
      this.hud('players');
    },
    removePlayer(id) {
      if (id === 1) return;
      const p = this.player(id);
      if (!p) return;
      this.players = this.players.filter((q) => q !== p);
      this.hud('toast', `Player ${id} left`);
      this.hud('players');
    },

    stop() { this.running = false; this.hud('cursor', null); },

    // Options changed from the in-game menu
    applyOptions(o) {
      this.options = o;
      for (const inp of inputs) {
        inp.hand = o.hand;
        inp.sens = o.sens;
        inp.setSmoothing(o.smoothing || 'normal');
      }
      const up = this.save.owned || {};
      this.assist = [0, 0.35, 0.6, 0.85][o.assist] + (up.steadyAim && o.assist > 0 ? 0.12 : 0);
      this.players.forEach((p) => this.closeBelt(p));
    },

    pause(reason, byPlayer) {
      if (this.state !== 'play' || this.paused) return;
      this.paused = true;
      this.menuPlayer = byPlayer || null;
      this.players.forEach((p) => { p.tHold = 0; p.tLatch = true; p.menuHold = 0; });
      this.cursor = { target: null, t: 0 };
      this.hud('pause', reason);
    },
    resume() {
      this.paused = false; this.last = performance.now();
      this.hud('cursor', null);
      this.hud('resume');
    },
    skipCalibration() { if (this.state === 'calibrate') { this.state = 'countdown'; this.stateT = 0; this.hud('countdown', 3); } },

    hud(kind, value) { if (this.onHud) this.onHud(kind, value, this); },

    followAim(p, dt) {
      const inp = p.input;
      const target = inp.hasAim ? { x: inp.aim.x * W, y: inp.aim.y * H } : { x: this.gunBase(p), y: H / 2 };
      const k = inp.mode === 'mouse' ? 1 : Math.min(1, dt * (inp.isCam() ? 30 : 45));
      p.smoothAim.x = lerp(p.smoothAim.x, target.x, k);
      p.smoothAim.y = lerp(p.smoothAim.y, target.y, k);
    },

    // ---------------- Update ----------------
    update(dt) {
      this.stateT += dt;
      for (const p of this.players) this.followAim(p, dt);
      if (this.state !== 'play') this.players.forEach((p) => p.input.takeEvents());   // ignore presses before and after play

      if (this.state === 'calibrate') return this.updateCalibration();
      if (this.state === 'countdown') {
        const left = 3 - Math.floor(this.stateT);
        this.hud('countdown', left);
        if (this.stateT >= 3) { this.state = 'play'; this.stateT = 0; this.hud('go'); }
        return;
      }
      if (this.state === 'ending') {
        this.updateEffects(dt);
        this.monsters.forEach((m) => this.updateMonster(m, dt, true));
        if (this.stateT > 1.2) this.finish();
        return;
      }
      if (this.state !== 'play') return;

      // The world runs in slow motion while a gadget belt is open; your own actions don't.
      const gdt = dt * (this.players.some((p) => p.belt.open) ? BELT.slowMo : 1);

      this.time += dt;
      this.shake = Math.max(0, this.shake - dt);
      for (const p of this.players) {
        p.cooldown = Math.max(0, p.cooldown - dt);
        p.recoil = Math.max(0, p.recoil - dt * 6);
        p.shieldFlash = Math.max(0, p.shieldFlash - dt);
        p.gunDown = lerp(p.gunDown, p.equipped === 'gun' ? 0 : 1, Math.min(1, dt * 8));
        p.belt.anim = lerp(p.belt.anim, p.belt.open ? 1 : 0, Math.min(1, dt * 10));
        if (p.shieldHP <= 0) {
          p.shieldRecharge -= dt;
          if (p.shieldRecharge <= 0) { p.shieldHP = SHIELD_MAX; this.hud('toast', this.tag(p) + 'Shield recharged'); this.hud('gear'); }
        }
      }

      this.updateSpawning(gdt);
      for (const m of this.monsters) this.updateMonster(m, gdt, false);
      this.monsters = this.monsters.filter((m) => !m.gone);
      this.updateRocks(gdt);
      this.updateFlying(dt);

      for (const p of this.players) { this.handlePhoneButtons(p); if (this.paused) return; }
      for (const p of this.players) { this.updatePauseGestures(p, dt); if (this.paused) return; }
      for (const p of this.players) {
        this.updateBelt(p, dt);
        this.updateWeapon(p, dt);
        this.updateReload(p, dt);
      }
      this.updateEffects(dt);

      const stale = this.players.find((p) => !p.input.poseFresh());
      if (stale) this.setPrompt(stale.input.isCam() ? 'Step into view of the phone camera' : 'Waiting for your phone…', 0.3, stale);

      if (TYPES.every((t) => this.caught[t] >= GOAL)) {
        this.state = 'ending'; this.stateT = 0; this.won = true;
        this.players.forEach((p) => { p.belt.open = false; });
        Sfx.win(); this.hud('toast', 'Level clear!');
      }
    },

    // Camera players point at the screen and hold still once, so the aim fits their body
    updateCalibration() {
      const todo = this.players.filter((p) => p.input.isCam() && !p.calibrated);
      if (!todo.length) { this.state = 'countdown'; this.stateT = 0; this.hud('countdown', 3); return; }
      const now = performance.now();
      const who = (p) => (this.players.length > 1 ? `Player ${p.id}: ` : '');
      let status = '';
      for (const p of todo) {
        const o = p.input.offsetNow;
        if (!o || now - o.t > 500) { p.calSamples = []; status = status || who(p) + 'Looking for you…'; continue; }
        p.calSamples.push(o);
        p.calSamples = p.calSamples.filter((s) => now - s.t < 1200);
        const n = p.calSamples.length;
        const mx = p.calSamples.reduce((a, s) => a + s.dx, 0) / n;
        const my = p.calSamples.reduce((a, s) => a + s.dy, 0) / n;
        const spread = Math.max(...p.calSamples.map((s) => Math.hypot(s.dx - mx, s.dy - my)));
        const span = n > 1 ? (p.calSamples[n - 1].t - p.calSamples[0].t) / 1000 : 0;
        if (spread > 0.12) { p.calSamples = [o]; status = status || who(p) + 'Hold your arm still…'; continue; }
        status = status || who(p) + (span > 0.3 ? 'Almost there…' : 'Hold still…');
        if (span >= 1.0) { p.input.calib = { cx: mx, cy: my }; p.calibrated = true; Sfx.lock(); }
      }
      this.hud('cal', status || 'Almost there…');
    },

    // Buttons pressed on the gamepad or tilt controller
    handlePhoneButtons(p) {
      for (const e of p.input.takeEvents()) {
        if (e === 'menu') { this.pause(null, p); return; }
        if (e === 'fire') {
          const a = p.smoothAim;
          const onMenu = a.x > MENU_BTN.x && a.x < MENU_BTN.x + MENU_BTN.w && a.y > MENU_BTN.y && a.y < MENU_BTN.y + MENU_BTN.h + 20;
          if (onMenu) { this.pause(null, p); return; }
          p.input.mouseFire = true;
        }
        if (e === 'reload') p.input.mouseReload = true;
        if (e === 'gun' || e === 'grenade' || e === 'shield') { this.equip(p, e); this.closeBelt(p); }
      }
    },

    // ---------------- Pause: time-out T, or holding the circle on the Menu button ----------------
    updatePauseGestures(p, dt) {
      const inp = p.input;
      if (inp.isClicky()) { p.menuHold = 0; return; }   // gamepad/tilt/mouse use their Menu button
      if (inp.isCam()) {
        if (inp.tSign && inp.poseFresh()) {
          if (!p.tLatch) {
            p.tHold += dt;
            this.setPrompt('Keep holding the T to pause', 0.2, p);
            if (p.tHold >= T_HOLD) { p.tHold = 0; this.pause('Paused with the time-out sign', p); return; }
          }
        } else { p.tHold = 0; p.tLatch = false; }
      }
      const a = p.smoothAim;
      const onMenu = a.x > MENU_BTN.x && a.x < MENU_BTN.x + MENU_BTN.w && a.y > MENU_BTN.y && a.y < MENU_BTN.y + MENU_BTN.h + 20;
      if (onMenu && inp.poseFresh()) {
        p.menuHold += dt;
        if (p.menuHold >= MENU_DWELL) { p.menuHold = 0; this.pause(null, p); }
      } else p.menuHold = 0;
    },

    // While paused or on the end screen: the player who opened the menu (or Player 1) points at buttons
    updateMenuCursor(dt) {
      const phonePlayers = this.players.filter((p) => p.input.mode === 'phone');
      const cp = (this.menuPlayer && this.menuPlayer.input.mode === 'phone' && this.players.includes(this.menuPlayer)) ? this.menuPlayer : phonePlayers[0];
      // Other players: their Menu button returns to the game, everything else is ignored
      for (const p of this.players) {
        if (p === cp) continue;
        const ev = p.input.takeEvents();
        if (ev.includes('menu') && this.paused) { this.resume(); return; }
      }
      if (!cp || !this.getMenuButtons) { this.hud('cursor', null); return; }
      const inp = cp.input;
      this.followAim(cp, dt);
      const a = cp.smoothAim;
      const buttons = this.getMenuButtons();
      const over = buttons.find((b) => a.x >= b.x && a.x <= b.x + b.w && a.y >= b.y && a.y <= b.y + b.h);
      const el = over ? over.el : null;
      if (!inp.isCam()) {
        // Gamepad / tilt: move the circle and press Fire to choose; Menu returns to the game
        this.hud('cursor', { x: a.x, y: a.y, p: 0, show: inp.poseFresh() });
        for (const e of inp.takeEvents()) {
          if (e === 'fire' && el) { Sfx.select(); el.click(); break; }
          if (e === 'menu' && this.paused) { this.resume(); break; }
        }
        return;
      }
      if (el !== this.cursor.target) { this.cursor = { target: el, t: 0 }; if (el) Sfx.lock(); }
      else if (el) this.cursor.t += dt;
      const progress = el ? Math.min(1, this.cursor.t / MENU_DWELL) : 0;
      this.hud('cursor', { x: a.x, y: a.y, p: progress, show: inp.poseFresh() });
      if (el && this.cursor.t >= MENU_DWELL) {
        this.cursor = { target: null, t: -0.6 };
        el.click();
      }
    },

    // ---------------- Monsters ----------------
    updateSpawning(dt) {
      this.spawnTimer -= dt;
      if (this.spawnTimer > 0) return;
      const progress = this.totalCaught() / (GOAL * TYPES.length);
      const alive = this.monsters.filter((m) => m.state === 'alive').length;
      const maxAlive = 4 + Math.floor(progress * 3);
      if (alive < maxAlive) {
        const type = this.pickType();
        if (type) this.spawn(type);
      }
      this.spawnTimer = rand(0.9, 1.7) - progress * 0.35;
    },

    pickType() {
      // Only spawn types that still need catching, weighted by how many are left
      const weights = TYPES.map((t) => Math.max(0, GOAL - this.caught[t] - this.monsters.filter((m) => m.type === t && m.state === 'alive').length));
      const total = weights.reduce((a, b) => a + b, 0);
      if (!total) return null;
      let r = Math.random() * total;
      for (let i = 0; i < TYPES.length; i++) { r -= weights[i]; if (r <= 0) return TYPES[i]; }
      return TYPES[TYPES.length - 1];
    },

    spawn(type) {
      const s = SPR[type];
      this.monsters.push({
        type, state: 'alive', t: 0, age: 0, z: 0, gone: false,
        x0: rand(0.14, 0.86), phase: rand(0, Math.PI * 2),
        freq: rand(0.6, 1.2), amp: rand(50, 150),
        dur: rand(s.speed[0], s.speed[1]),
        throwT: rand(2, 4),
        px: 0, py: 0, size: 0, r: 0, vx: 0, flip: false, frame: s.front[0],
      });
    },

    updateMonster(m, dt, frozen) {
      const s0 = SPR[m.type];
      m.age += dt;
      if (m.state === 'dying') { m.t += dt; if (m.t > 0.45) m.gone = true; return; }
      if (m.state === 'attacking') {
        m.t += dt;
        if (m.t > 0.3 && !m.hitDone) { m.hitDone = true; this.playerHit(this.nearestPlayer(m.px)); }
        if (m.t > 0.45) m.gone = true;
        return;
      }
      if (!frozen) m.z += (dt / m.dur) * (s0.pulse ? 0.25 + 2.2 * Math.max(0, Math.sin(m.age * 3 + m.phase)) : 1);
      const e = Math.pow(Math.min(m.z, 1), 1.35);
      const wob = Math.sin(m.phase + m.age * m.freq) * m.amp * (0.35 + 0.65 * m.z);
      const px = lerp(m.x0, 0.5, m.z * 0.35) * W + wob;
      m.vx = dt > 0 ? (px - m.px) / dt : 0;
      m.px = px;
      m.py = lerp(0.4, 0.6, e) * H + Math.sin(m.age * 2.1 + m.phase) * 10 * (0.5 + m.z);
      m.size = lerp(80, 360, e) * (s0.pulse ? 1 + 0.06 * Math.sin(m.age * 6 + m.phase) : 1);
      m.r = m.size * 0.38;

      // Face the player, or turn sideways while drifting quickly
      const s = SPR[m.type];
      const step = Math.floor(m.age * 5 + m.phase);
      if (Math.abs(m.vx) > 120) { m.frame = s.side[step % s.side.length]; m.flip = m.vx < 0; }
      else { m.frame = s.front[step % s.front.length]; m.flip = false; }

      // Some monsters throw rocks from mid-distance
      if (!frozen && s.thrower && m.z > 0.25 && m.z < 0.9) {
        m.throwT -= dt;
        if (m.throwT <= 0) { this.throwRock(m); m.throwT = rand(3.5, 6.5); }
      }

      if (m.z >= 1 && !frozen) { m.state = 'attacking'; m.t = 0; }
    },

    // ---------------- Rocks thrown at the players ----------------
    throwRock(m) {
      const target = this.players[Math.floor(Math.random() * this.players.length)] || this.players[0];
      const pts = [];
      const n = 7;
      for (let i = 0; i < n; i++) pts.push([Math.cos(i / n * Math.PI * 2) * rand(0.7, 1), Math.sin(i / n * Math.PI * 2) * rand(0.7, 1)]);
      this.rocks.push({
        x0: m.px, y0: m.py, tx: this.gunBase(target) + rand(this.players.length > 1 ? -200 : -380, this.players.length > 1 ? 200 : 380), ty: H * 0.8,
        t: 0, dur: rand(1.6, 2.1), color: SPR[m.type].color, spin: rand(-4, 4), pts,
        x: m.px, y: m.py, size: 20, r: 10, state: 'fly', rock: true, target: target.id,
      });
    },

    updateRocks(dt) {
      for (const r of this.rocks) {
        if (r.state === 'gone') continue;
        r.t += dt;
        const p = Math.min(1, r.t / r.dur), e = p * p;
        r.x = lerp(r.x0, r.tx, e);
        r.y = lerp(r.y0, r.ty, e) - Math.sin(p * Math.PI) * 70;
        r.size = lerp(22, 170, e);
        r.r = Math.max(34, r.size * 0.55);    // generous target size, easier to shoot down
        if (p >= 1) { r.state = 'gone'; this.playerHit(this.player(r.target)); }
      }
      this.rocks = this.rocks.filter((r) => r.state !== 'gone');
    },

    smashRock(r) {
      r.state = 'gone';
      Sfx.pop();
      this.burst(r.x, r.y, r.color, 14);
    },

    // All damage goes through here, so the shield can block it

    // The player whose gun is closest to a spot on screen (monsters attack the nearest player)
    nearestPlayer(x) {
      let best = this.players[0], bd = Infinity;
      for (const p of this.players) { const d = Math.abs(this.gunBase(p) - x); if (d < bd) { bd = d; best = p; } }
      return best;
    },

    // All damage goes through here, so a player's shield can block it
    playerHit(p) {
      if (this.state !== 'play') return;
      p = p && this.players.includes(p) ? p : this.players[0];
      if (p.equipped === 'shield' && p.shieldHP > 0) {
        p.shieldHP--;
        p.shieldFlash = 0.35;
        Sfx.block();
        if (p.shieldHP === 0) {
          p.shieldRecharge = SHIELD_RECHARGE;
          this.equip(p, 'gun');
          Sfx.hurt();
          this.hud('toast', this.tag(p) + 'Shield broken: back to the blaster');
        }
        this.hud('gear');
        return;
      }
      this.takeDamage();
    },

    takeDamage() {
      this.health = Math.max(0, this.health - DAMAGE);
      this.shake = 0.3;
      Sfx.hurt();
      if (this.hasMedkit && !this.medkitUsed && this.health > 0 && this.health <= 30) {
        this.medkitUsed = true;
        this.health = Math.min(100, this.health + 30);
        this.hud('toast', 'Medkit used: +30%');
      }
      this.hud('health');
      if (this.health <= 0) {
        this.state = 'ending'; this.stateT = 0; this.won = false;
        this.players.forEach((p) => { p.belt.open = false; });
        Sfx.lose();
      }
    },

    totalCaught() { return TYPES.reduce((a, t) => a + this.caught[t], 0); },

    tag(p) { return this.players.length > 1 && p ? `Player ${p.id}: ` : ''; },

    // ---------------- Gadget belt ----------------
    // One player: on the side of the aiming hand. Two players: Player 1 left, Player 2 right.
    beltPos(p) {
      const left = this.players.length > 1 ? p.id === 1 : p.input.hand === 'left';
      return left ? { x: 150, y: H - 150 } : { x: W - 150, y: H - 150 };
    },
    beltItems(p) {
      const b = this.beltPos(p);
      return GEAR.map((g, i) => ({ ...g, x: b.x, y: b.y - BELT.gap * (i + 1) }));
    },
    gearAvailable(p, id) {
      if (id === 'grenade') return p.grenades > 0;
      if (id === 'shield') return p.shieldHP > 0;
      return true;
    },
    inBeltZone(p, pt) {
      const b = this.beltPos(p);
      if (dist(pt, b) < BELT.r * 1.7) return true;
      if (!p.belt.open) return false;
      const top = b.y - BELT.gap * GEAR.length - BELT.itemR - 30;
      return Math.abs(pt.x - b.x) < BELT.itemR + 60 && pt.y > top && pt.y < b.y + BELT.r;
    },

    updateBelt(p, dt) {
      const a = p.smoothAim, b = this.beltPos(p), belt = p.belt, inp = p.input;
      const fresh = inp.poseFresh();
      const click = inp.mouseFire && this.inBeltZone(p, a);

      if (!belt.open) {
        const over = dist(a, b) < BELT.r * 1.2;
        if (over && fresh) belt.hover += dt; else belt.hover = Math.max(0, belt.hover - dt * 2);
        if ((over && click) || belt.hover >= BELT.openTime) this.openBelt(p);
      } else {
        let over = null;
        this.beltItems(p).forEach((it, i) => { if (dist(a, it) < BELT.itemR * 1.25) over = i; });
        if (over !== null && this.gearAvailable(p, GEAR[over].id) && fresh) {
          if (belt.sel !== over) { belt.sel = over; belt.selT = 0; Sfx.lock(); }
          belt.selT += dt;
          if (click || belt.selT >= BELT.selectTime) { this.equip(p, GEAR[over].id); this.closeBelt(p); }
        } else { belt.sel = null; belt.selT = 0; }
        belt.away = this.inBeltZone(p, a) ? 0 : belt.away + dt;
        if (belt.away > BELT.closeDelay) this.closeBelt(p);
      }
      if (click) inp.mouseFire = false;   // a click on the belt never fires the gun
    },
    openBelt(p) {
      Object.assign(p.belt, { open: true, hover: 0, sel: null, selT: 0, away: 0 });
      Sfx.select();
    },
    closeBelt(p) { Object.assign(p.belt, { open: false, hover: 0, sel: null, selT: 0, away: 0 }); },
    toggleBelt() {
      const p = this.players[0];
      if (this.state !== 'play' || this.paused || !p) return;
      if (p.belt.open) this.closeBelt(p); else this.openBelt(p);
    },

    equip(p, id) {
      if (!this.gearAvailable(p, id)) { this.hud('toast', this.tag(p) + (id === 'grenade' ? 'No net grenades left' : 'Shield is recharging')); return; }
      p.equipped = id;
      p.dwell = 0; p.dwellTarget = null;
      p.still = { x: p.smoothAim.x, y: p.smoothAim.y, t: 0 };
      Sfx.reload();
      if (id === 'grenade') this.setPrompt(p.input.usesDwell() ? 'Hold the circle still to throw' : 'Press Fire to throw', 2, p);
      if (id === 'shield') this.setPrompt('Shield up: it blocks rocks and attacks', 2, p);
      if (id === 'gun') this.setPrompt('', 0);
      this.hud('gear');
    },
    keyEquip(id) {
      const p = this.players[0];
      if (this.state === 'play' && !this.paused && p) { this.equip(p, id); this.closeBelt(p); }
    },

    // ---------------- Weapons ----------------
    updateWeapon(p, dt) {
      const raw = p.smoothAim, inp = p.input;
      const blocked = p.belt.open || this.inBeltZone(p, raw) || !inp.poseFresh();
      if (p.equipped === 'gun') return this.updateGun(p, dt, blocked);

      p.reticle = { x: raw.x, y: raw.y };
      p.dwellTarget = null;
      if (p.equipped === 'grenade') {
        // Throw by pressing Fire, or (camera/mouse) by holding the circle still
        if (dist(raw, p.still) > STILL_PX || blocked) p.still = { x: raw.x, y: raw.y, t: 0 };
        else p.still.t += dt;
        const clickThrow = inp.mouseFire && !blocked;
        inp.mouseFire = false;
        if (clickThrow || (inp.usesDwell() && p.still.t >= GRENADE_STILL)) this.throwGrenade(p, clickThrow ? raw : p.still);
      } else {
        inp.mouseFire = false;
      }
    },

    updateGun(p, dt, blocked) {
      const raw = p.smoothAim, inp = p.input;
      const alive = this.monsters.filter((m) => m.state === 'alive');
      const targets = [...alive, ...this.rocks.map((r) => ({ ...r, ref: r, px: r.x, py: r.y }))];

      // Aim assist: gently pull the circle toward the nearest target within reach
      let pos = { x: raw.x, y: raw.y };
      if (this.assist > 0 && !blocked) {
        let best = null, bestD = Infinity, bestR = 0;
        for (const m of targets) {
          const reach = m.r * (1.6 + this.assist * 1.6);
          const d = Math.hypot(m.px - raw.x, m.py - raw.y);
          if (d < reach && d < bestD) { best = m; bestD = d; bestR = reach; }
        }
        if (best) {
          const pull = this.assist * Math.pow(1 - bestD / bestR, 0.6) * 0.9;
          pos = { x: lerp(raw.x, best.px, pull), y: lerp(raw.y, best.py, pull) };
        }
      }
      p.reticle = pos;

      // What is under the circle? (rocks count as targets too)
      let target = null, td = Infinity;
      if (!blocked) {
        for (const m of targets) {
          const d = Math.hypot(m.px - pos.x, m.py - pos.y);
          if (d < m.r * (1 + 0.3 * this.assist) && d < td) { target = m.ref || m; td = d; }
        }
      }
      if (target !== p.dwellTarget) {
        if (target) Sfx.lock();
        p.dwellTarget = target; p.dwell = 0;
      }

      if (target && !p.reloading) p.dwell += dt; else p.dwell = Math.max(0, p.dwell - dt * 2);

      if (inp.mouseFire) { inp.mouseFire = false; if (!blocked) this.fire(p, target); }
      else if (inp.usesDwell() && target && p.dwell >= DWELL_TIME && p.cooldown <= 0) { this.fire(p, target); p.dwell = 0; }
      else if (!inp.usesDwell() && inp.fireHeld && target && p.cooldown <= 0 && p.dwell > 0.12) { this.fire(p, target); p.cooldown = 0.32; }
    },

    fire(p, target) {
      if (p.reloading) return;
      if (p.ammo <= 0) {
        Sfx.empty();
        this.setPrompt(this.reloadHint(p), 1.2, p);
        return;
      }
      p.ammo--; this.shots++;
      p.cooldown = SHOT_COOLDOWN;
      p.recoil = 1;
      const muzzle = this.muzzle(p);
      const end = target ? { x: target.rock ? target.x : target.px, y: target.rock ? target.y : target.py } : p.reticle;
      this.lasers.push({ x1: muzzle.x, y1: muzzle.y, x2: end.x, y2: end.y, t: 0.16, color: p.color });
      Sfx.laser();
      if (target && target.rock) { this.hits++; this.smashRock(target); }
      else if (target) this.catchMonster(target);
      if (p.ammo === 0) this.setPrompt(this.reloadHint(p), 2, p);
      this.hud('ammo');
    },

    throwGrenade(p, at) {
      if (p.grenades <= 0) return;
      p.grenades--;
      const side = this.isMirrored(p) ? -1 : 1;
      const hand = { x: this.gunBase(p) + 90 * side, y: H - 130 };
      this.flying.push({ x0: hand.x, y0: hand.y, x1: at.x, y1: at.y, t: 0, dur: 0.55 });
      Sfx.throw();
      this.equip(p, 'gun');          // the blaster comes back right after a throw
      this.hud('gear');
    },

    updateFlying(dt) {
      for (const g of this.flying) {
        g.t += dt;
        if (g.t >= g.dur && !g.done) { g.done = true; this.openNet(g.x1, g.y1); }
      }
      this.flying = this.flying.filter((g) => !g.done);
    },

    openNet(x, y) {
      this.nets.push({ x, y, t: 0 });
      Sfx.net();
      let n = 0;
      for (const m of this.monsters) {
        if (m.state === 'alive' && Math.hypot(m.px - x, m.py - y) < NET_R + m.r * 0.4) { this.catchMonster(m, true); n++; }
      }
      for (const r of this.rocks) if (Math.hypot(r.x - x, r.y - y) < NET_R) this.smashRock(r);
      this.hud('toast', n > 1 ? `Net caught ${n} monsters!` : n === 1 ? 'Net caught 1 monster' : 'The net missed');
    },

    catchMonster(m, netted) {
      m.state = 'dying'; m.t = 0; m.netted = !!netted;
      this.hits++; this.earned++;
      if (this.caught[m.type] < GOAL) this.caught[m.type]++;
      this.hud('caught', m.type);
      if (!netted) Sfx.pop();
      this.burst(m.px, m.py, SPR[m.type].color, 22);
      if (this.caught[m.type] === GOAL && !this['done_' + m.type]) { this['done_' + m.type] = true; this.hud('toast', SPR[m.type].name + ' complete!'); }
      this.hud('catch');
    },

    burst(x, y, color, count) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(150, 520);
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.8), max: 0.8, r: rand(4, 10), color });
      }
    },

    updateReload(p, dt) {
      const inp = p.input;
      if (p.reloading > 0) {
        p.reloading = Math.max(0, p.reloading - dt);
        if (p.reloading === 0) { p.ammo = this.magSize; this.hud('ammo'); }
        return;
      }
      let want = false;
      if (inp.isClicky()) { want = inp.mouseReload; inp.mouseReload = false; }
      else if (inp.freeHandUp && inp.poseFresh()) {
        p.reloadHold += dt;
        if (p.reloadHold > 0.3 && !p.reloadLatch) { want = true; p.reloadLatch = true; }
      } else { p.reloadHold = 0; p.reloadLatch = false; }
      if (want && p.equipped === 'gun' && p.ammo < this.magSize) {
        p.reloading = this.reloadTime;
        Sfx.reload();
        this.setPrompt('Reloading…', this.reloadTime, p);
      }
    },

    reloadHint(p) {
      if (p.input.isCam()) return 'Raise your free hand to reload';
      if (p.input.mode === 'phone') return 'Press Reload on your phone';
      return 'Right-click or press R to reload';
    },

    keyReload() { const p = this.players[0]; if (this.state === 'play' && !this.paused && p) p.input.mouseReload = true; },

    setPrompt(text, seconds, p) {
      this.promptText = text ? this.tag(p) + text : '';
      this.promptUntil = this.time + seconds;
    },

    updateEffects(dt) {
      for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + 300 * dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const l of this.lasers) l.t -= dt;
      this.lasers = this.lasers.filter((l) => l.t > 0);
      for (const n of this.nets) n.t += dt;
      this.nets = this.nets.filter((n) => n.t < 1.1);
      const show = this.time < this.promptUntil ? this.promptText : '';
      if (show !== this._shownPrompt) { this._shownPrompt = show; this.hud('prompt', show); }
    },

    finish() {
      this.state = 'done';
      this.players.forEach((p) => { p.belt.open = false; });
      if (this.onEnd) this.onEnd({
        won: this.won, time: this.time,
        accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
        earned: this.earned, caught: { ...this.caught }, health: this.health,
      });
    },

    // ---------------- Drawing ----------------
    // One player: gun in the middle. Two players: guns at 30% and 70% of the width,
    // the same distance from the centre, with Player 2's gun mirrored.
    gunBase(p) {
      if (this.players.length < 2) return W / 2;
      return p.id === 1 ? W * 0.3 : W * 0.7;
    },
    isMirrored(p) { return this.players.length > 1 && p.id === 2; },

    gunPose(p) {
      const base = this.gunBase(p);
      const t = clamp(0.5 + (p.reticle.x - base) / (W * 0.9), 0, 1);
      const mirror = this.isMirrored(p);
      const idx = GUN_ORDER[Math.round((mirror ? 1 - t : t) * (GUN_ORDER.length - 1))];
      const gh = H * 0.4, gw = gh * SPR.gun.fw / SPR.gun.fh;
      const reloadP = p.reloading > 0 ? 1 - p.reloading / this.reloadTime : 0;
      const dip = Math.sin(reloadP * Math.PI);
      const x = base + (t - 0.5) * 115;
      const y = H + 10 + p.recoil * 22 + dip * 200 + p.gunDown * 270 + Math.sin(this.time * 2 + p.id) * 4;
      const rot = (t - 0.5) * 0.14;
      return { idx, gw, gh, x, y, rot, mirror };
    },

    muzzle(p) {
      const g = this.gunPose(p);
      const lx = 0, ly = -g.gh * 0.9;   // top of the scope
      return { x: g.x + lx * Math.cos(g.rot) - ly * Math.sin(g.rot), y: g.y + lx * Math.sin(g.rot) + ly * Math.cos(g.rot) };
    },

    drawFrame(img, meta, idx, cx, cy, h, flip, alpha) {
      const sx = (idx % 5) * meta.fw, sy = Math.floor(idx / 5) * meta.fh;
      const w = h * meta.fw / meta.fh;
      const c = this.ctx;
      c.save();
      c.globalAlpha = alpha;
      c.translate(cx, cy);
      if (flip) c.scale(-1, 1);
      c.drawImage(img, sx, sy, meta.fw, meta.fh, -w / 2, -h / 2, w, h);
      c.restore();
    },

    draw() {
      const c = this.ctx, img = Assets.images;
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0);

      // Screen shake
      if (this.shake > 0 && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
        c.translate(rand(-1, 1) * this.shake * 40, rand(-1, 1) * this.shake * 40);
      }

      // Background with a little parallax from the aim (average of all players)
      const n = this.players.length || 1;
      const ax = this.players.reduce((a, p) => a + p.smoothAim.x, 0) / n || W / 2;
      const ay = this.players.reduce((a, p) => a + p.smoothAim.y, 0) / n || H / 2;
      const px = (ax / W - 0.5) * -36, py = (ay / H - 0.5) * -20;
      const bw = W * 1.06, bh = H * 1.06;
      c.drawImage(img['bg' + this.levelId], (W - bw) / 2 + px, (H - bh) / 2 + py, bw, bh);

      // Monsters, far ones first
      const sorted = [...this.monsters].sort((a, b) => a.z - b.z);
      for (const m of sorted) {
        const s = SPR[m.type];
        if (m.state === 'dying') {
          const q = m.t / 0.45;
          const grow = m.netted ? 1 - q * 0.6 : 1 + q * 0.5;    // netted monsters shrink into the net
          this.drawFrame(img[m.type], s, m.frame, m.px, m.py, m.size * grow, m.flip, 1 - q);
          c.save(); c.globalCompositeOperation = 'lighter';
          this.drawFrame(img[m.type], s, m.frame, m.px, m.py, m.size * grow, m.flip, (1 - q) * 0.8);
          c.restore();
        } else if (m.state === 'attacking') {
          const q = Math.min(1, m.t / 0.3);
          this.drawFrame(img[m.type], s, m.frame, m.px, m.py + q * 80, m.size * (1 + q * 0.6), m.flip, m.t > 0.3 ? 1 - (m.t - 0.3) / 0.15 : 1);
        } else {
          if (m.z > 0.7) {
            c.save(); c.globalAlpha = (m.z - 0.7) / 0.3 * 0.5; c.fillStyle = '#ff5a7e';
            c.beginPath(); c.ellipse(m.px, m.py + m.size * 0.45, m.size * 0.4, m.size * 0.08, 0, 0, Math.PI * 2); c.fill(); c.restore();
          }
          this.drawFrame(img[m.type], s, m.frame, m.px, m.py, m.size, m.flip, Math.min(1, m.age * 3));
        }
      }

      this.drawRocks();
      this.drawNets();
      this.drawFlying();

      // Particles and laser shots (each player's laser in their own colour)
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const q of this.particles) {
        c.globalAlpha = Math.max(0, q.life / q.max);
        c.fillStyle = q.color;
        c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill();
      }
      for (const l of this.lasers) {
        const a = l.t / 0.16;
        c.globalAlpha = a * 0.5; c.strokeStyle = l.color || '#62f0ff'; c.lineWidth = 22; c.lineCap = 'round';
        c.beginPath(); c.moveTo(l.x1, l.y1); c.lineTo(l.x2, l.y2); c.stroke();
        c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(l.x1, l.y1); c.lineTo(l.x2, l.y2); c.stroke();
      }
      c.restore();

      // Guns at the bottom, turning toward each player's aim (lowered while other gear is in use)
      for (const p of this.players) {
        const g = this.gunPose(p);
        c.save();
        c.translate(g.x, g.y);
        c.rotate(g.rot);
        if (g.mirror) c.scale(-1, 1);
        c.drawImage(img.gun, (g.idx % 5) * SPR.gun.fw, Math.floor(g.idx / 5) * SPR.gun.fh, SPR.gun.fw, SPR.gun.fh, -g.gw / 2, -g.gh, g.gw, g.gh);
        c.restore();
        if (p.equipped === 'grenade' && this.state === 'play') {
          const side = g.mirror ? -1 : 1;
          this.drawGrenade(this.gunBase(p) + 90 * side, H - 130 + (1 - p.gunDown) * 220 + Math.sin(this.time * 3) * 6, 46);
        }
        if (p.equipped === 'shield' || p.shieldFlash > 0) this.drawShield(p);
      }

      if (this.state === 'play') {
        if (this.players.some((p) => p.belt.open)) this.drawSlowMo();
        for (const p of this.players) { this.drawBelt(p); if (this.players.length > 1) this.drawPlayerHud(p); }
        this.drawMenuHold();
      }
      if (this.state === 'play' || this.state === 'countdown' || this.state === 'calibrate') {
        for (const p of this.players) this.drawReticle(p);
      }
    },

    drawRocks() {
      const c = this.ctx;
      for (const r of this.rocks) {
        c.save();
        c.translate(r.x, r.y);
        c.rotate(r.t * r.spin);
        const s = r.size * 0.5;
        c.shadowColor = r.color; c.shadowBlur = 24;
        c.fillStyle = '#2a2f63';
        c.strokeStyle = r.color; c.lineWidth = Math.max(3, s * 0.1);
        c.beginPath();
        r.pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)));
        c.closePath(); c.fill(); c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = r.color; c.globalAlpha = 0.6;
        c.beginPath(); c.arc(-s * 0.2, -s * 0.2, s * 0.25, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    },

    netShape(x, y, R, alpha) {
      const c = this.ctx;
      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = '#ff8ad8'; c.lineWidth = 4; c.shadowColor = '#ff8ad8'; c.shadowBlur = 16;
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke();
      }
      c.strokeStyle = '#bff9ff';
      for (let k = 1; k <= 3; k++) {
        c.beginPath();
        for (let i = 0; i <= 12; i++) {
          const a = i / 12 * Math.PI * 2, rr = R * k / 3;
          const X = x + Math.cos(a) * rr, Y = y + Math.sin(a) * rr;
          i ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.stroke();
      }
      c.restore();
    },

    drawNets() {
      for (const n of this.nets) {
        const grow = Math.min(1, n.t / 0.25);
        const R = NET_R * (0.3 + 0.7 * (1 - Math.pow(1 - grow, 3)));
        this.netShape(n.x, n.y, R, n.t < 0.6 ? 1 : 1 - (n.t - 0.6) / 0.5);
      }
    },

    drawGrenade(x, y, r) {
      const c = this.ctx;
      c.save();
      c.shadowColor = '#ff8ad8'; c.shadowBlur = 26;
      c.fillStyle = '#3a2a8f'; c.strokeStyle = '#ff8ad8'; c.lineWidth = 5;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.shadowBlur = 0; c.lineWidth = 2.5; c.strokeStyle = '#bff9ff';
      c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
      c.beginPath(); c.arc(x, y, r * 0.55, 0, Math.PI * 2); c.stroke();
      c.fillStyle = '#ffffff'; c.globalAlpha = 0.7;
      c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2); c.fill();
      c.restore();
    },

    drawFlying() {
      for (const g of this.flying) {
        const p = Math.min(1, g.t / g.dur);
        const x = lerp(g.x0, g.x1, p);
        const y = lerp(g.y0, g.y1, p) - Math.sin(p * Math.PI) * 220;
        this.drawGrenade(x, y, lerp(46, 22, p));
      }
    },

    drawShield(p) {
      const c = this.ctx;
      const up = p.equipped === 'shield' ? 1 : 0;
      const a = 0.35 * up + p.shieldFlash * 1.8;
      const two = this.players.length > 1;
      const cx = this.gunBase(p), rw = two ? W * 0.3 : W * 0.62, rh = two ? H * 0.62 : H * 0.78;
      c.save();
      c.globalAlpha = Math.min(1, a);
      c.strokeStyle = p.shieldFlash > 0 ? '#ffffff' : '#8ff0c8';
      c.fillStyle = 'rgba(143, 240, 200, 0.10)';
      c.lineWidth = 8; c.shadowColor = '#8ff0c8'; c.shadowBlur = 30;
      c.beginPath(); c.ellipse(cx, H * 1.25, rw, rh, 0, Math.PI, Math.PI * 2); c.fill(); c.stroke();
      c.shadowBlur = 0; c.lineWidth = 2; c.globalAlpha *= 0.6;
      for (let k = 1; k <= 3; k++) {
        c.beginPath(); c.ellipse(cx, H * 1.25, rw * (1 - k * 0.12), rh * (1 - k * 0.12), 0, Math.PI, Math.PI * 2); c.stroke();
      }
      c.restore();
    },

    drawSlowMo() {
      const c = this.ctx;
      const anim = Math.max(...this.players.map((p) => p.belt.anim));
      c.save();
      c.globalAlpha = 0.25 * anim;
      c.fillStyle = '#1b2f8a';
      c.fillRect(0, 0, W, H);
      c.restore();
    },

    drawGearIcon(id, x, y, s, color) {
      const c = this.ctx;
      c.save();
      c.translate(x, y);
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 4; c.lineJoin = 'round';
      if (id === 'gun') {
        c.beginPath(); c.roundRect ? c.roundRect(-s * 0.6, -s * 0.28, s * 1.1, s * 0.4, 6) : c.rect(-s * 0.6, -s * 0.28, s * 1.1, s * 0.4); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.2, s * 0.12); c.lineTo(-s * 0.35, s * 0.6); c.lineTo(-s * 0.05, s * 0.6); c.lineTo(s * 0.05, s * 0.12); c.stroke();
        c.beginPath(); c.arc(s * 0.62, -s * 0.08, s * 0.1, 0, Math.PI * 2); c.fill();
      } else if (id === 'grenade') {
        c.beginPath(); c.arc(0, 0, s * 0.5, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(-s * 0.5, 0); c.lineTo(s * 0.5, 0); c.moveTo(0, -s * 0.5); c.lineTo(0, s * 0.5); c.stroke();
        c.beginPath(); c.arc(0, 0, s * 0.27, 0, Math.PI * 2); c.stroke();
      } else if (id === 'shield') {
        c.beginPath();
        c.moveTo(0, -s * 0.6); c.lineTo(s * 0.5, -s * 0.4); c.lineTo(s * 0.42, s * 0.15);
        c.quadraticCurveTo(s * 0.3, s * 0.45, 0, s * 0.62);
        c.quadraticCurveTo(-s * 0.3, s * 0.45, -s * 0.42, s * 0.15);
        c.lineTo(-s * 0.5, -s * 0.4); c.closePath(); c.stroke();
      }
      c.restore();
    },

    ring(x, y, r, progress, color, width) {
      if (progress <= 0) return;
      const c = this.ctx;
      c.save(); c.lineWidth = width; c.strokeStyle = color; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress)); c.stroke(); c.restore();
    },

    drawBelt(p) {
      const c = this.ctx, b = this.beltPos(p), belt = p.belt, anim = belt.anim;
      const labelLeft = b.x > W / 2;
      c.save();
      c.font = `600 28px ${FONT}`;
      c.textBaseline = 'middle';

      // Unfolding rounded column
      if (anim > 0.02) {
        const top = b.y - BELT.gap * GEAR.length * anim - BELT.itemR - 14;
        const w = (BELT.itemR + 16) * 2;
        c.globalAlpha = anim;
        c.fillStyle = 'rgba(12, 28, 94, 0.88)';
        c.strokeStyle = p.color; c.lineWidth = 3;
        c.beginPath();
        if (c.roundRect) c.roundRect(b.x - w / 2, top, w, b.y - top, w / 2); else c.rect(b.x - w / 2, top, w, b.y - top);
        c.fill(); c.stroke();

        this.beltItems(p).forEach((it, i) => {
          const y = b.y - BELT.gap * (i + 1) * anim;
          const ok = this.gearAvailable(p, it.id);
          const on = p.equipped === it.id;
          c.globalAlpha = anim * (ok ? 1 : 0.4);
          c.fillStyle = on ? 'rgba(255, 138, 216, 0.25)' : '#12246e';
          c.strokeStyle = on ? '#ff8ad8' : it.color; c.lineWidth = on ? 5 : 3;
          c.beginPath(); c.arc(b.x, y, BELT.itemR, 0, Math.PI * 2); c.fill(); c.stroke();
          this.drawGearIcon(it.id, b.x, y, 52, it.color);
          if (belt.sel === i) this.ring(b.x, y, BELT.itemR + 12, belt.selT / BELT.selectTime, '#ffffff', 8);

          let label = it.name;
          if (it.id === 'grenade') label += ` ×${p.grenades}`;
          if (it.id === 'shield') label = p.shieldHP > 0 ? `Shield ${p.shieldHP}/${SHIELD_MAX}` : `Shield ${Math.ceil(p.shieldRecharge)}s`;
          c.fillStyle = '#e8f7ff';
          c.textAlign = labelLeft ? 'right' : 'left';
          c.shadowColor = '#000'; c.shadowBlur = 8;
          c.fillText(label, b.x + (labelLeft ? -1 : 1) * (BELT.itemR + 34), y);
          c.shadowBlur = 0;
        });
      }

      // Belt button, showing the gear in use
      c.globalAlpha = 1;
      c.fillStyle = belt.open ? '#2150c4' : 'rgba(12, 28, 94, 0.85)';
      c.strokeStyle = p.color; c.lineWidth = 4; c.shadowColor = p.color; c.shadowBlur = 18;
      c.beginPath(); c.arc(b.x, b.y, BELT.r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.shadowBlur = 0;
      const eq = GEAR.find((g) => g.id === p.equipped);
      this.drawGearIcon(eq.id, b.x, b.y - 4, 50, eq.color);
      c.fillStyle = '#9fb7e8'; c.font = `500 18px ${FONT}`; c.textAlign = 'center';
      c.fillText(this.players.length > 1 ? `P${p.id} gear` : 'Gear', b.x, b.y + BELT.r + 20);
      // Grenade count badge
      c.fillStyle = '#ff8ad8';
      c.beginPath(); c.arc(b.x + BELT.r * 0.72, b.y - BELT.r * 0.72, 20, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0a1440'; c.font = `700 22px ${FONT}`;
      c.fillText(String(p.grenades), b.x + BELT.r * 0.72, b.y - BELT.r * 0.72 + 1);
      if (!belt.open) this.ring(b.x, b.y, BELT.r + 12, belt.hover / BELT.openTime, '#ffffff', 8);
      c.restore();
    },

    // Two players: each player's ammo next to their gear button
    drawPlayerHud(p) {
      const c = this.ctx, b = this.beltPos(p);
      const right = b.x > W / 2;
      const x0 = right ? b.x - BELT.r - 30 : b.x + BELT.r + 30;
      c.save();
      c.textBaseline = 'middle';
      c.textAlign = right ? 'right' : 'left';
      c.font = `700 26px ${FONT}`;
      c.fillStyle = p.color;
      c.shadowColor = '#000'; c.shadowBlur = 8;
      const label = p.equipped === 'grenade' ? `P${p.id} · Net grenade` : p.equipped === 'shield' ? `P${p.id} · Shield ${p.shieldHP}/${SHIELD_MAX}` : `P${p.id} · Blaster`;
      c.fillText(label, x0, b.y + 30);
      c.shadowBlur = 0;
      // ammo pips
      const pw = 12, gap = 6;
      for (let i = 0; i < this.magSize; i++) {
        const k = right ? this.magSize - 1 - i : i;
        const x = right ? x0 - k * (pw + gap) - pw : x0 + k * (pw + gap);
        c.globalAlpha = i < p.ammo ? (p.equipped === 'gun' ? 1 : 0.35) : 0.15;
        c.fillStyle = '#d4fbff';
        c.fillRect(x, b.y - 22, pw, 30);
      }
      c.restore();
    },

    // Progress ring on the Menu button and for the time-out T
    drawMenuHold() {
      const cx = MENU_BTN.x + MENU_BTN.w / 2, cy = MENU_BTN.y + MENU_BTN.h / 2;
      const menuHold = Math.max(0, ...this.players.map((p) => p.menuHold));
      const tHold = Math.max(0, ...this.players.map((p) => p.tHold));
      if (menuHold > 0) this.ring(cx, cy, 60, menuHold / MENU_DWELL, '#ffffff', 8);
      if (tHold > 0) this.ring(cx, cy, 60, tHold / T_HOLD, '#ffd27a', 8);
    },

    drawReticle(p) {
      const c = this.ctx;
      const playing = this.state === 'play';
      const { x, y } = playing ? p.reticle : p.smoothAim;
      const inBelt = playing && (p.belt.open || this.inBeltZone(p, p.smoothAim));
      const two = this.players.length > 1;

      // Where your hand actually is (before aim assist)
      if (p.input.isCam() && playing && p.equipped === 'gun') {
        c.save(); c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(p.smoothAim.x, p.smoothAim.y, 7, 0, Math.PI * 2); c.fill(); c.restore();
      }

      // Net grenade: show the capture area
      if (playing && p.equipped === 'grenade' && !inBelt) {
        c.save();
        c.setLineDash([16, 12]); c.lineWidth = 4; c.strokeStyle = '#ff8ad8'; c.globalAlpha = 0.85;
        c.beginPath(); c.arc(x, y, NET_R, 0, Math.PI * 2); c.stroke();
        c.restore();
        if (p.input.usesDwell()) this.ring(x, y, 58, p.still.t / GRENADE_STILL, '#ffffff', 9);
      }

      const locked = !!p.dwellTarget && playing && p.equipped === 'gun';
      const col = inBelt ? '#ffffff' : p.equipped === 'shield' ? '#8ff0c8' : locked ? '#ff8ad8' : p.color;
      const R = p.equipped === 'gun' || inBelt ? 44 : 30;

      c.save();
      c.lineWidth = 4; c.strokeStyle = col;
      c.shadowColor = col; c.shadowBlur = 16;
      c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
      c.shadowBlur = 0;
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * (R - 12), y + Math.sin(a) * (R - 12));
        c.lineTo(x + Math.cos(a) * (R + 12), y + Math.sin(a) * (R + 12));
        c.stroke();
      }
      c.fillStyle = col; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      if (two) {
        c.font = `700 24px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = p.color; c.shadowColor = '#000'; c.shadowBlur = 6;
        c.fillText('P' + p.id, x + R + 10, y - R + 4);
      }
      c.restore();

      // Dwell progress: the ring fills up, then the blaster fires
      if (locked && p.dwell > 0 && p.input.usesDwell()) this.ring(x, y, R + 12, p.dwell / DWELL_TIME, '#ffffff', 9);
    },

    drawPortrait(canvas, type) {
      const s = SPR[type], img = Assets.images[type];
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, canvas.width, canvas.height);
      const h = canvas.height, w = h * s.fw / s.fh;
      c.drawImage(img, 0, 0, s.fw, s.fh, (canvas.width - w) / 2, 0, w, h);
    },
  };

  window.SV = { Assets, Input, inputs, Level, SPR, LEVELS, ALL_TYPES, GEAR, SHIELD_MAX, get TYPES() { return TYPES; }, get GOAL() { return GOAL; } };
})();
