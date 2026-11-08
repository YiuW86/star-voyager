// On-screen touch gamepad, for playing on the phone or tablet itself (the Android app).
// It works exactly like the phone controller, but inside the game: the d-pad moves the aiming circle,
// the big button fires, and the small buttons around it switch gear. Buttons can be moved in
// Options → Arrange touch buttons (positions are saved with the options).
(function () {
  const W = 1920, H = 1080;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Where everything sits on the 1920x1080 screen (centre points)
  const DEFAULT_LAYOUT = {
    stick: { x: 250, y: 800 },
    fire: { x: 1680, y: 820 },
    time: { x: 1645, y: 615 },
    grenade: { x: 1530, y: 670 },
    shield: { x: 1470, y: 790 },
    reload: { x: 1495, y: 915 },
    gun: { x: 1790, y: 640 },
    super: { x: 250, y: 540 },        // left-hand superpower, above the d-pad
    super2: { x: 1800, y: 470 },      // right-hand superpower, above the fire button
  };
  const ICONS = {
    gun: '<svg viewBox="0 0 24 24"><path d="M3 9h13l2-2h3v5h-3l-1 1H9l-1 5H5l1-5H3z" fill="currentColor"/></svg>',
    grenade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="7"/><path d="M5 13h14M12 6v14M7.5 8.5l9 9M16.5 8.5l-9 9"/></svg>',
    time: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M10 2h4"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor"/></svg>',
    reload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5"/></svg>',
    run: '<svg viewBox="0 0 24 24"><path d="M13 4a2 2 0 1 1 0 .1M9 21l2-6 3 2v5h2v-6l-3-3 1-4 2 3h4v-2h-3l-2-4-5 1-3 5 2 1 2-3-1 4-3 8z" fill="currentColor"/></svg>',
  };

  // ---------------- Game controller (Bluetooth / USB gamepad on the phone or tablet) ----------------
  // Standard layout (Xbox / PlayStation / most Android pads):
  //   left stick or d-pad = aim (in menus: move between buttons)    A / RT = fire (in menus: press)
  //   B = reload (in menus: back)    X = net grenade    Y = shield    LT = time grenade    L3 / R3 = blaster
  //   LB = left-hand superpower    RB = right-hand superpower    Start / Select = menu
  // While a controller is used the touch buttons hide; touching the screen brings them back.
  const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const Pad = {
    inUse: false, fire: false, jump: false, run: false, prev: [], navT: 0, navDir: null, sx: 0, sy: 0,
    init(touch) {
      this.touch = touch;
      if (!navigator.getGamepads) return;
      addEventListener('gamepadconnected', (e) => { this.connected = true; if (touch.toast) touch.toast('Controller connected: ' + (e.gamepad.id || '').split('(')[0].trim()); });
      addEventListener('gamepaddisconnected', () => { this.inUse = false; this.fire = false; if (touch.toast) touch.toast('Controller disconnected'); });
      // touching the screen switches back to the touch buttons
      addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') this.inUse = false; }, true);
    },
    pad() {
      if (!navigator.getGamepads) return null;
      const list = navigator.getGamepads() || [];
      for (const g of list) if (g && g.connected && g.buttons && g.buttons.length) return g;
      return null;
    },
    poll(dt, playing) {
      const g = this.pad();
      if (!g) { this.fire = this.jump = this.run = false; return; }
      const down = (i) => !!(g.buttons[i] && (g.buttons[i].pressed || g.buttons[i].value > 0.5));
      const pressed = (i) => down(i) && !this.prev[i];
      const ax = (i) => { const v = g.axes[i] || 0; return Math.abs(v) < 0.18 ? 0 : v; };
      // stick: left stick, or the right one, or the d-pad
      let sx = ax(0), sy = ax(1);
      const rx = ax(2), ry = ax(3);
      if (Math.hypot(rx, ry) > Math.hypot(sx, sy)) { sx = rx; sy = ry; }
      if (down(BTN.LEFT)) sx = -1; if (down(BTN.RIGHT)) sx = 1; if (down(BTN.UP)) sy = -1; if (down(BTN.DOWN)) sy = 1;
      const any = g.buttons.some((b, i) => b && b.pressed && i !== BTN.LT && i !== BTN.RT) || Math.hypot(sx, sy) > 0.3 || down(BTN.LT) || down(BTN.RT);
      if (any && !this.inUse) this.inUse = true;
      this.sx = sx; this.sy = sy;
      const T = this.touch;
      if (playing) {
        const plat = T.layoutMode === 'plat';
        const add = (act) => { T.counters[act] = (T.counters[act] || 0) + 1; };
        this.fire = !plat && (down(BTN.A) || down(BTN.RT));
        this.jump = plat && (down(BTN.A) || down(BTN.RT));
        this.run = plat && down(BTN.B);
        if (pressed(BTN.A) || pressed(BTN.RT)) add(plat ? 'jump' : 'fire');
        if (!plat) {
          if (pressed(BTN.B)) add('reload');
          if (pressed(BTN.X)) add('grenade');
          if (pressed(BTN.Y)) add('shield');
          if (pressed(BTN.LT)) add('time');
          if (pressed(BTN.L3) || pressed(BTN.R3)) add('gun');
          if (pressed(BTN.LB)) add('super');
          if (pressed(BTN.RB)) add('super2');
        } else if (pressed(BTN.X) || pressed(BTN.Y)) add('fire');
        if (pressed(BTN.START) || pressed(BTN.SELECT)) add('menu');
      } else {
        this.fire = this.jump = this.run = false;
        // menus: move between buttons, A presses, B goes back, Start opens/closes the menu
        const dir = Math.abs(sx) > 0.5 || Math.abs(sy) > 0.5 ? (Math.abs(sx) > Math.abs(sy) ? (sx > 0 ? 'ArrowRight' : 'ArrowLeft') : (sy > 0 ? 'ArrowDown' : 'ArrowUp')) : null;
        if (dir) {
          this.navT -= dt;
          if (dir !== this.navDir || this.navT <= 0) { this.key(dir); this.navT = dir !== this.navDir ? 0.38 : 0.16; }
        } else this.navT = 0;
        this.navDir = dir;
        if (pressed(BTN.A)) { const el = document.activeElement; if (el && el !== document.body && typeof el.click === 'function') el.click(); else this.key('Enter'); }
        if (pressed(BTN.B)) this.key('Escape');
        if (pressed(BTN.Y)) this.key('i');
        if (pressed(BTN.START)) this.key('Escape');
        if (any) this.inUse = true;
      }
      this.prev = g.buttons.map((b) => !!(b && (b.pressed || b.value > 0.5)));
    },
    // the same aim feel as the touch d-pad
    aim(T, dt) {
      const sx = this.sx, sy = this.sy, mag = Math.min(1, Math.hypot(sx, sy));
      if (mag < 0.05 || Math.hypot(T.stick.x, T.stick.y) > 0.14) return;
      const speed = 0.75 * Math.pow(mag, 2.0);
      T.aim.x = clamp(T.aim.x + (sx / Math.max(mag, 0.001)) * speed * dt, 0, 1);
      T.aim.y = clamp(T.aim.y + (sy / Math.max(mag, 0.001)) * speed * dt * (16 / 9), 0, 1);
    },
    key(k) {
      this.lastSynth = { k, t: performance.now() };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    },
  };
  // Some phones also send the d-pad / A / B as key presses: ignore those when the controller just did the same
  document.addEventListener('keydown', (e) => {
    const s = Pad.lastSynth;
    if (e.isTrusted && s && performance.now() - s.t < 150 && (e.key === s.k || (s.k === 'Escape' && e.key === 'GoBack') || e.key === 'Enter')) { e.stopImmediatePropagation(); e.preventDefault(); }
  }, true);
  window.Pad = Pad;

  const Touch = {
    active: false,
    aim: { x: 0.5, y: 0.5 },
    stick: { id: null, x: 0, y: 0, edgeT: 0 },
    counters: { fire: 0, reload: 0, gun: 0, grenade: 0, shield: 0, time: 0, menu: 0, jump: 0, super: 0, super2: 0 },
    fireHeld: false, jumpHeld: false, runHeld: false,
    session: 'touch' + Math.random().toString(36).slice(2, 7),
    layoutMode: '',
    editing: false,

    init({ getLayout, saveLayout, Level, Net, owns, toast }) {
      Object.assign(this, { getLayout, saveLayout, Level, Net, owns, toast });
      Pad.init(this);
      this.el = document.getElementById('touchpad');
      this.el.innerHTML = `
        <div class="tp-item tp-stick" data-id="stick"><div class="tp-base"><i class="tp-knob"></i></div></div>
        <button class="tp-item tp-fire" data-id="fire"><span>FIRE</span></button>
        ${['gun', 'grenade', 'time', 'shield', 'reload'].map((id) => `<button class="tp-item tp-small" data-id="${id}">${ICONS[id]}</button>`).join('')}
        <button class="tp-item tp-super" data-id="super"></button>
        <button class="tp-item tp-super" data-id="super2"></button>`;
      this.items = {};
      this.el.querySelectorAll('.tp-item').forEach((n) => { this.items[n.dataset.id] = n; });
      this.knob = this.el.querySelector('.tp-knob');
      this.applyLayout();
      this.bind();
      requestAnimationFrame((t) => this.loop(t));
    },

    layout() { return { ...DEFAULT_LAYOUT, ...(this.getLayout() || {}) }; },
    // Positions are stored for a 1920-wide screen; buttons on the right half keep their distance
    // to the right edge, so on wider phones they stay at the edge under your thumb
    // usable width for the buttons: the screen width minus a camera notch, if there is one
    screenW() { return (this.el && this.el.offsetWidth) || ((window.SV && window.SV.viewW) ? window.SV.viewW() : W); },
    toScreenX(x) { return x > W / 2 ? this.screenW() - (W - x) : x; },
    fromScreenX(x) { const sw = this.screenW(); return x > sw / 2 ? W - (sw - x) : x; },
    applyLayout() {
      const L = this.layout();
      for (const [id, n] of Object.entries(this.items)) {
        const p = L[id];
        n.style.left = this.toScreenX(p.x) + 'px'; n.style.top = p.y + 'px';
      }
      this.laidOutFor = this.screenW();
    },
    resetLayout() { this.saveLayout(null); this.applyLayout(); },

    // stage coordinates (1920x1080) of a touch, whatever the screen size
    toStage(e) {
      const r = this.el.getBoundingClientRect(), sw = this.screenW();
      return { x: (e.clientX - r.left) / r.width * sw, y: (e.clientY - r.top) / r.height * H };
    },

    bind() {
      const st = this.items.stick;
      st.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.editing) return this.startDrag('stick', e);
        if (this.stick.id !== null) return;
        this.stick.id = e.pointerId;
        try { st.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        this.stickFrom(e);
      });
      st.addEventListener('pointermove', (e) => { if (e.pointerId === this.stick.id) this.stickFrom(e); });
      const end = (e) => {
        if (e.pointerId !== this.stick.id) return;
        this.stick.id = null; this.stick.x = 0; this.stick.y = 0; this.stick.edgeT = 0;
        this.knob.style.transform = 'translate(-50%, -50%)';
      };
      st.addEventListener('pointerup', end);
      st.addEventListener('pointercancel', end);

      for (const [id, n] of Object.entries(this.items)) {
        if (id === 'stick') continue;
        n.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (this.editing) return this.startDrag(id, e);
          n.classList.add('down');
          const act = this.actionOf(id);
          if (act === 'run') { this.runHeld = true; return; }
          this.counters[act] = (this.counters[act] || 0) + 1;
          if (act === 'fire') this.fireHeld = true;
          if (act === 'jump') this.jumpHeld = true;
          if (window.Haptics) Haptics.buzz(12, 0.2); else if (navigator.vibrate) navigator.vibrate(12);
        });
        const up = () => {
          n.classList.remove('down');
          const act = this.actionOf(id);
          if (act === 'fire') this.fireHeld = false;
          if (act === 'jump') this.jumpHeld = false;
          if (act === 'run') this.runHeld = false;
        };
        n.addEventListener('pointerup', up);
        n.addEventListener('pointercancel', up);
        n.addEventListener('pointerleave', up);
        n.addEventListener('contextmenu', (e) => e.preventDefault());
      }
      // dragging buttons while arranging
      document.addEventListener('pointermove', (e) => {
        if (!this.drag || e.pointerId !== this.drag.pid) return;
        const p = this.toStage(e);
        const L = this.layout();
        L[this.drag.id] = { x: Math.round(clamp(this.fromScreenX(clamp(p.x, 60, this.screenW() - 60)), 60, W - 60)), y: Math.round(clamp(p.y, 60, H - 60)) };
        this.saveLayout(L);
        this.applyLayout();
      });
      const stop = (e) => { if (this.drag && e.pointerId === this.drag.pid) { this.items[this.drag.id].classList.remove('dragging'); this.drag = null; } };
      document.addEventListener('pointerup', stop);
      document.addEventListener('pointercancel', stop);
    },
    startDrag(id, e) {
      this.drag = { id, pid: e.pointerId };
      this.items[id].classList.add('dragging');
    },

    // In the platformer level the big button jumps; the small ones blast and run
    actionOf(id) {
      if (this.layoutMode === 'plat') return { fire: 'jump', gun: 'fire', reload: 'run' }[id] || id;
      return id;
    },
    setLayoutMode(mode) {
      if (mode === this.layoutMode) return;
      this.layoutMode = mode;
      const plat = mode === 'plat';
      this.items.fire.querySelector('span').textContent = plat ? 'JUMP' : 'FIRE';
      this.items.gun.innerHTML = plat ? '<span class="tp-lbl">Blast</span>' : ICONS.gun;
      this.items.reload.innerHTML = plat ? ICONS.run : ICONS.reload;
      ['grenade', 'time', 'shield', 'super'].forEach((id) => this.items[id].classList.toggle('hidden', plat));
    },

    stickFrom(e) {
      const base = this.items.stick.querySelector('.tp-base').getBoundingClientRect();
      const R = base.width / 2;
      let dx = e.clientX - (base.left + R), dy = e.clientY - (base.top + R);
      const len = Math.hypot(dx, dy), max = R * 0.62;
      if (len > max) { dx *= max / len; dy *= max / len; }
      this.stick.x = dx / max; this.stick.y = dy / max;
      const k = base.width / this.items.stick.querySelector('.tp-base').offsetWidth || 1;   // screen px → element px
      this.knob.style.transform = `translate(calc(-50% + ${dx / k}px), calc(-50% + ${dy / k}px))`;
    },

    // Same feel as the phone gamepad: small push = slow and precise, push to the edge = faster
    updateAim(dt) {
      const s = this.stick, mag = Math.min(1, Math.hypot(s.x, s.y)), DEAD = 0.14;
      if (mag < DEAD) { s.edgeT = 0; return; }
      const m = (mag - DEAD) / (1 - DEAD);
      s.edgeT = m > 0.9 ? s.edgeT + dt : 0;
      const boost = 1 + Math.min(0.8, Math.max(0, s.edgeT - 0.35) * 1.4);
      const speed = 0.6 * Math.pow(m, 2.4) * boost;
      this.aim.x = clamp(this.aim.x + (s.x / mag) * speed * dt, 0, 1);
      this.aim.y = clamp(this.aim.y + (s.y / mag) * speed * dt * (16 / 9), 0, 1);
    },

    loop(now) {
      const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
      this.last = now;
      const L = this.Level;
      // the gamepad only shows while really playing: not behind the pause menu or the level-clear screen
      const playing = this.active && L.running && document.getElementById('screen-game').classList.contains('active')
        && !document.querySelector('#screen-game .overlay.show') && L.state !== 'done';
      Pad.poll(dt, playing);
      this.el.classList.toggle('show', !!((playing && !Pad.inUse) || this.editing));
      if (this.laidOutFor !== this.screenW()) this.applyLayout();
      if (playing) {
        this.setLayoutMode(L.plat ? 'plat' : 'normal');
        this.items.time.classList.toggle('hidden', !!L.plat || !this.owns('timeGrenade'));
        const eq = L.players && L.players[0] ? L.players[0].equipped : 'gun';
        for (const id of ['gun', 'grenade', 'time', 'shield']) this.items[id].classList.toggle('on', !L.plat && eq === id);
        this.updateAim(dt);
        if (Pad.inUse) Pad.aim(this, dt);
        // hand the input to the game exactly as if it came from the phone controller
        this.Net.onData({ t: Date.now(), m: 'pad', s: this.session, x: +this.aim.x.toFixed(4), y: +this.aim.y.toFixed(4),
          hold: this.fireHeld || Pad.fire, c: this.counters, sx: this.stick.x, sy: this.stick.y, jh: this.jumpHeld || Pad.jump, rh: this.runHeld || Pad.run }, 1);
      }
      requestAnimationFrame((t) => this.loop(t));
    },

    // called just before a level starts
    prepare() {
      this.aim = { x: 0.5, y: 0.5 };
      this.fireHeld = this.jumpHeld = this.runHeld = false;
      this.Net.onData({ m: 'hello', mode: 'pad' }, 1);
      this.Net.onData({ t: Date.now(), m: 'pad', s: this.session, x: 0.5, y: 0.5, hold: false, c: this.counters, sx: 0, sy: 0 }, 1);
    },

    // Options → Arrange touch buttons
    edit(on, host) {
      this.editing = on;
      this.el.classList.toggle('editing', on);
      this.setLayoutMode('normal');
      ['grenade', 'time', 'shield'].forEach((id) => this.items[id].classList.remove('hidden'));
      (on ? host : document.getElementById('screen-game')).appendChild(this.el);
    },
  };
  window.Touch = Touch;
})();
