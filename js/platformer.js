// Experimental level 6: a side-scrolling platformer.
// The robot runs from left to right through three backgrounds. Each background ends in a portal
// that transitions to the next one; the last one ends at the big crystal.
(function () {
  const { Assets, Input, SPR, Level } = window.SV;
  let W = 1920;            // follows the game's screen width (wider on wide phones)
  const H = 1080;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);

  // Robot spritesheet (see assets/robot.png): cell size and the frames of each animation
  const ROBOT = { fw: 164, fh: 155, cols: 8, anims: {
    idle: [0, 1, 2, 3], walk: [4, 5, 6, 7, 8, 9, 10], run: [11, 12, 13, 14, 15, 16],
    jump: [17, 18, 19, 20, 21], fall: [22, 23, 24, 25], land: [26, 27, 28, 29, 30],
    attack: [31, 32, 33, 34, 35, 36], hurt: [37, 38, 39, 40] } };

  // Physics (pixels and seconds)
  const G = 2700, JUMP_V = 1180, WALK = 330, RUN = 560, ACC_GROUND = 3200, ACC_AIR = 1900;
  const COYOTE = 0.1, BUFFER = 0.14;
  const HB_W = 56, HB_H = 124;          // player hitbox
  const DRAW_H = 150;                   // player drawn about 1/7 of the screen height, like classic platformers
  const ALIEN_H = 125;
  const DAMAGE = 10, FALL_DAMAGE = 15;

  // The three backgrounds, each scaled to the screen height; the game world scrolls 1:1 with them,
  // so the floating rocks in the second background are real platforms.
  // ground: solid floor height (null = no floor, falling means losing health)
  // platforms: one-way platforms (you can jump up through them and land on top); draw: true = drawn by the game
  const SECTIONS = [
    {
      img: 'platA', w: 2386, ground: 905, tint: ['#c2477a', '#6b1f4d', '#ffb0d0'],
      spawn: { x: 160 },
      platforms: [
        { x0: 760, x1: 990, y: 715, draw: true }, { x0: 1110, x1: 1330, y: 580, draw: true }, { x0: 1560, x1: 1790, y: 700, draw: true },
      ],
      aliens: [
        { type: 'solara', x: 900, walk: true }, { type: 'nebula', x: 1440, y: 470 },
        { type: 'vexa', x: 1880, walk: true }, { type: 'solara', x: 2120, walk: true },
      ],
      portal: { x: 2290, y: 780, trigger: (p) => p.x > 2255 },
    },
    {
      img: 'platB', w: 2160, ground: null,
      spawn: { x: 260, y: 748 },
      platforms: [
        { x0: 120, x1: 784, y: 748 }, { x0: 930, x1: 1504, y: 786 }, { x0: 1680, x1: 2004, y: 674 },
      ],
      aliens: [
        { type: 'glide', x: 860, y: 540 }, { type: 'echo', x: 1330, y: 560 }, { type: 'nimbus', x: 1880, y: 470 },
      ],
      // the last rock ends at x 2004: you have to jump into the portal floating to its right
      portal: { x: 2105, y: 520, trigger: (p) => p.x > 2060 && p.y < 660 },   // feet above the rock: only reachable by jumping
    },
    {
      img: 'platC', w: 2430, ground: 900, tint: ['#6a5cff', '#2a1f6e', '#bff9ff'],
      spawn: { x: 150 },
      platforms: [
        { x0: 380, x1: 600, y: 725, draw: true }, { x0: 920, x1: 1480, y: 866 },
      ],
      aliens: [
        { type: 'prism', x: 560, walk: true }, { type: 'pulsar', x: 800, walk: true }, { type: 'ember', x: 1010, y: 580 },
      ],
      // the goal: the big crystal in the middle of this background
      goal: { x: 1210, trigger: (p) => p.x > 1150 && p.x < 1270 },
    },
  ];

  Object.assign(Level, {
    platInit() {
      this.keys = this.keys || {};
      if (!this._platKeys) {
        this._platKeys = true;
        addEventListener('keydown', (e) => {
          if (!this.plat) return;
          this.keys[e.code] = true;
          if (this.state === 'play' && !this.paused) {
            if (['Space', 'ArrowUp', 'KeyW', 'KeyZ'].includes(e.code) && !e.repeat) this.pl.jumpBuf = BUFFER;
            if (['KeyJ', 'KeyX', 'KeyF', 'ControlLeft'].includes(e.code) && !e.repeat) this.platShoot();
            if (['Space', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'].includes(e.code)) e.preventDefault();
          }
        });
        addEventListener('keyup', (e) => { if (this.keys) this.keys[e.code] = false; });
      }
      this.pl = null;
      this.sectionIdx = 0;
      this.trans = null;
      this.blasts = []; this.orbs = []; this.particles = [];
      this.camX = 0;
      this.platLoadSection(0);
      const inp = this.players[0].input;
      if (inp.mode === 'phone' && inp.device !== 'pad') this.platDeviceWarn = true;
    },

    platLoadSection(i) {
      const s = SECTIONS[i];
      this.sectionIdx = i;
      this.sec = s;
      const sy = s.spawn.y || s.ground;
      this.pl = {
        x: s.spawn.x, y: sy, vx: 0, vy: 0, face: 1, onGround: true, coyote: 0, jumpBuf: 0,
        landT: 0, attackT: 0, hurtT: 0, invuln: 1.0, animT: 0, shootCd: 0,
        checkpoint: { x: s.spawn.x, y: sy },
      };
      this.aliens = s.aliens.map((a) => {
        const floorY = a.walk ? this.platFloorAt(a.x, s.ground || 900) : null;
        return { ...a, home: a.x, y0: a.y || floorY, y: a.y || floorY, t: rand(0, 6), throwT: rand(1.5, 3), state: 'alive', face: -1, vx: 0 };
      });
      this.blasts = []; this.orbs = [];
      this.camX = 0;
    },

    // highest platform top at x that is at or below height y (for placing walkers)
    platFloorAt(x, fallback) {
      const s = this.sec;
      let best = s.ground != null ? s.ground : fallback;
      for (const p of s.platforms) if (x >= p.x0 && x <= p.x1 && p.y < best) best = p.y;
      return best;
    },

    platShoot() {
      const p = this.pl;
      if (!p || p.shootCd > 0 || this.trans) return;
      p.shootCd = 0.3;
      p.attackT = 0.3;
      this.shots++;
      this.blasts.push({ x: p.x + p.face * 58, y: p.y - 74, vx: p.face * 1250, t: 0 });
      Sfx.laser();
    },

    platUpdate(dt) {
      this.stateT += dt;
      const inp = this.players[0].input;
      if (this.state === 'countdown') {
        const left = 3 - Math.floor(this.stateT);
        this.hud('countdown', left);
        if (this.stateT >= 3) {
          this.state = 'play'; this.stateT = 0; this.hud('go');
          const msg = inp.mode === 'mouse' ? 'Arrows or A/D to move, Shift to run, Space to jump, J or click to blast'
            : inp.device === 'pad' ? 'D-pad to move (push far to run), JUMP to jump, Blast to shoot'
            : 'The extra level needs the Gamepad on your phone (or a keyboard)';
          this.setPrompt(msg, 5);
        }
        inp.takeEvents();
        return;
      }
      if (this.state === 'ending') {
        this.platEffects(dt);
        if (this.stateT > 1.4) this.finish();
        return;
      }
      if (this.state !== 'play') return;
      this.time += dt;
      this.shake = Math.max(0, this.shake - dt);

      // Phone buttons
      for (const e of inp.takeEvents()) {
        if (e === 'menu') { this.pause(null, this.players[0]); return; }
        if (e === 'jump') this.pl.jumpBuf = BUFFER;
        if (e === 'fire') this.platShoot();
      }
      if (inp.mouseFire) { inp.mouseFire = false; this.platShoot(); }
      if (inp.fireHeld && this.pl.shootCd <= 0) this.platShoot();

      if (this.trans) this.platTransition(dt);
      else {
        this.platPlayer(dt, inp);
        this.platAliens(dt);
      }
      this.platProjectiles(dt);
      this.platEffects(dt);

      const p = this.pl;
      W = window.SV.viewW();
      // a background narrower than the screen is centred (with dark edges); otherwise follow the robot
      const target = this.sec.w <= W ? (this.sec.w - W) / 2 : clamp(p.x - W * 0.38, 0, this.sec.w - W);
      this.camX = lerp(this.camX, target, Math.min(1, dt * 8));
      if (this.platDeviceWarn) this.setPrompt('The extra level needs the Gamepad on your phone (or a keyboard)', 0.3);
    },

    platInputX(inp) {
      const k = this.keys || {};
      let x = 0, run = false;
      if (k.ArrowLeft || k.KeyA) x -= 1;
      if (k.ArrowRight || k.KeyD) x += 1;
      run = !!(k.ShiftLeft || k.ShiftRight);
      if (inp.mode === 'phone' && inp.stick) {
        const sx = inp.stick.x;
        if (Math.abs(sx) > 0.22) { x = Math.sign(sx) * Math.min(1, (Math.abs(sx) - 0.22) / 0.5 + 0.5); run = run || Math.abs(sx) > 0.85; }
        run = run || inp.runHeld;
      }
      return { x, run, jumpHeld: !!(k.Space || k.ArrowUp || k.KeyW || k.KeyZ || inp.jumpHeld) };
    },

    platPlayer(dt, inp) {
      const p = this.pl, s = this.sec;
      const ctl = this.platInputX(inp);
      p.shootCd = Math.max(0, p.shootCd - dt);
      p.attackT = Math.max(0, p.attackT - dt);
      p.landT = Math.max(0, p.landT - dt);
      p.hurtT = Math.max(0, p.hurtT - dt);
      p.invuln = Math.max(0, p.invuln - dt);
      p.jumpBuf = Math.max(0, p.jumpBuf - dt);
      p.coyote = p.onGround ? COYOTE : Math.max(0, p.coyote - dt);
      p.animT += dt;

      // horizontal movement (no control for a moment after getting hurt)
      if (p.hurtT <= 0.15) {
        const maxV = (ctl.run ? RUN : WALK) * Math.abs(ctl.x);
        const want = Math.sign(ctl.x) * maxV;
        const acc = p.onGround ? ACC_GROUND : ACC_AIR;
        if (want > p.vx) p.vx = Math.min(want, p.vx + acc * dt); else p.vx = Math.max(want, p.vx - acc * dt);
        if (ctl.x) p.face = Math.sign(ctl.x);
      }
      // jumping, with a little forgiveness (jump just after leaving a ledge, or just before landing)
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.vy = -JUMP_V; p.onGround = false; p.coyote = 0; p.jumpBuf = 0;
        Sfx.throw();
      }
      if (!ctl.jumpHeld && p.vy < -420) p.vy = -420;      // short hop when the button is let go early

      p.vy = Math.min(p.vy + G * dt, 1800);
      const prevY = p.y;
      p.x = clamp(p.x + p.vx * dt, 30, s.w - 20);
      p.y += p.vy * dt;

      // land on the floor or on a platform (one-way: only when falling onto its top)
      const wasGround = p.onGround;
      p.onGround = false;
      if (p.vy >= 0) {
        const tops = [...s.platforms];
        if (s.ground != null) tops.push({ x0: -1e4, x1: 1e4, y: s.ground });
        for (const t of tops) {
          if (p.x + HB_W * 0.3 >= t.x0 && p.x - HB_W * 0.3 <= t.x1 && prevY <= t.y + 2 && p.y >= t.y) {
            p.y = t.y; p.vy = 0; p.onGround = true;
            if (!wasGround && p.hurtT <= 0) { p.landT = 0.22; }
            p.checkpoint = { x: clamp(p.x, t.x0 + 40, t.x1 - 40), y: t.y };
            break;
          }
        }
      }

      // fell into a pit: lose some health and come back at the last safe spot
      if (p.y > H + 160) {
        this.platHurt(FALL_DAMAGE, true);
        if (this.state !== 'play') return;
        p.x = p.checkpoint.x; p.y = p.checkpoint.y - 4; p.vx = 0; p.vy = 0; p.invuln = 1.4;
      }

      // reached the portal or the crystal
      if (s.portal && s.portal.trigger(p)) this.trans = { t: 0, phase: 'out' };
      if (s.goal && s.goal.trigger(p) && this.state === 'play') {
        this.state = 'ending'; this.stateT = 0; this.won = true;
        Sfx.win(); this.hud('toast', 'You reached the crystal!');
        this.burst(s.goal.x, 600, '#ff8ad8', 40);
      }
    },

    platHurt(amount, fromFall) {
      const p = this.pl;
      if (!fromFall && p.invuln > 0) return;
      this.damageTaken = true;
      if (this.combo > 1) this.hud('combo', null);
      this.combo = 0; this.mult = 1;
      this.health = Math.max(0, this.health - amount);
      this.hud('health');
      Sfx.hurt();
      this.shake = 0.25;
      if (!fromFall) { p.hurtT = 0.45; p.invuln = 1.3; p.vx = -p.face * 380; p.vy = -520; p.onGround = false; }
      if (this.health <= 0 && this.state === 'play' && this.tryRevive()) { p.invuln = 2; return; }
      if (this.health <= 0 && this.state === 'play') { this.state = 'ending'; this.stateT = 0; this.won = false; Sfx.lose(); }
    },

    platAliens(dt) {
      const p = this.pl;
      for (const a of this.aliens) {
        if (a.state === 'dying') { a.t += dt; if (a.t > 0.45) a.state = 'gone'; continue; }
        if (a.state !== 'alive') continue;
        a.t += dt;
        const dx = p.x - a.x, near = Math.abs(dx) < 950;
        a.face = dx >= 0 ? 1 : -1;
        // walkers come toward you along the ground (within their patch); floaters drift and bob
        const speed = a.walk ? 95 : 70;
        let vx = 0;
        if (near && Math.abs(dx) > 140) vx = a.face * speed;
        const nx = clamp(a.x + vx * dt, a.home - 260, a.home + 260);
        a.vx = (nx - a.x) / Math.max(dt, 0.001);
        a.x = nx;
        if (a.walk) a.y = this.platFloorAt(a.x, a.y0);
        else a.y = a.y0 + Math.sin(a.t * 1.8) * 30;
        // throw a glowing orb at the player now and then
        a.throwT -= dt;
        if (near && a.throwT <= 0 && Math.abs(dx) > 120) {
          a.throwT = rand(2.2, 3.4);
          const ax = a.x + a.face * 40, ay = a.walk ? a.y - ALIEN_H * 0.55 : a.y;
          const tx = p.x, ty = p.y - HB_H * 0.55;
          const d = Math.hypot(tx - ax, ty - ay) || 1;
          this.orbs.push({ x: ax, y: ay, vx: (tx - ax) / d * 430, vy: (ty - ay) / d * 430, t: 0, color: SPR[a.type].color });
        }
        // touching an alien hurts
        const cy = a.walk ? a.y - ALIEN_H / 2 : a.y;
        if (Math.abs(p.x - a.x) < 70 && Math.abs((p.y - HB_H / 2) - cy) < 95) this.platHurt(DAMAGE);
      }
      this.aliens = this.aliens.filter((a) => a.state !== 'gone');
    },

    platProjectiles(dt) {
      const p = this.pl;
      for (const b of this.blasts) {
        b.t += dt; b.x += b.vx * dt;
        for (const a of this.aliens) {
          if (a.state !== 'alive') continue;
          const cy = a.walk ? a.y - ALIEN_H / 2 : a.y;
          if (Math.abs(b.x - a.x) < 62 && Math.abs(b.y - cy) < 70) {
            a.state = 'dying'; a.t = 0; b.dead = true;
            this.hits++; this.earned += this.crystalValue();
            this.addScore(100, a.x, cy - 70);
            Sfx.digitize(); this.burst(a.x, cy, SPR[a.type].color, 20, true);
            this.hud('caught', a.type); this.hud('catch');
            break;
          }
        }
        for (const o of this.orbs) {
          if (!o.dead && Math.hypot(o.x - b.x, o.y - b.y) < 45) { o.dead = true; b.dead = true; this.hits++; this.burst(o.x, o.y, o.color, 10); Sfx.pop(); }
        }
        if (b.t > 0.9) b.dead = true;
      }
      this.blasts = this.blasts.filter((b) => !b.dead);
      for (const o of this.orbs) {
        o.t += dt; o.x += o.vx * dt; o.y += o.vy * dt;
        if (Math.abs(o.x - p.x) < 40 && Math.abs(o.y - (p.y - HB_H / 2)) < 62) { o.dead = true; this.platHurt(DAMAGE); }
        if (o.t > 4) o.dead = true;
      }
      this.orbs = this.orbs.filter((o) => !o.dead);
    },

    platEffects(dt) {
      if (this.floaters) { for (const f of this.floaters) f.t += dt; this.floaters = this.floaters.filter((f) => f.t < 1.1); }
      if (this.combo > 1 && this.time - this.lastCatchT > 2.5) { this.combo = 0; this.mult = 1; this.hud('combo', null); }
      for (const q of this.particles) { q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.94; q.vy = q.vy * 0.94 + 300 * dt; }
      this.particles = this.particles.filter((q) => q.life > 0);
      const show = this.time < this.promptUntil ? this.promptText : '';
      if (show !== this._shownPrompt) { this._shownPrompt = show; this.hud('prompt', show); }
    },

    // Portal transition: the screen swirls to white, the next background loads, and it fades back in
    platTransition(dt) {
      const tr = this.trans;
      tr.t += dt;
      if (tr.phase === 'out' && tr.t >= 0.7) {
        this.platLoadSection(this.sectionIdx + 1);
        tr.phase = 'in'; tr.t = 0;
        this.hud('toast', ['', 'The floating rocks: jump carefully!', 'Find the great crystal!'][this.sectionIdx]);
      } else if (tr.phase === 'in' && tr.t >= 0.7) this.trans = null;
    },

    // ---------------- Drawing ----------------
    platDraw() {
      W = window.SV.viewW();
      const c = this.ctx, img = Assets.images, s = this.sec, p = this.pl;
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      if (this.shake > 0) c.translate(rand(-1, 1) * this.shake * 30, rand(-1, 1) * this.shake * 30);
      const cam = Math.round(this.camX);
      c.drawImage(img[s.img], -cam, 0, s.w, H);
      c.save();
      c.translate(-cam, 0);

      for (const pl of s.platforms) if (pl.draw) this.platDrawSlab(pl, s.tint);
      if (s.portal) this.platDrawPortal(s.portal.x, s.portal.y);
      if (s.goal) this.platDrawGoal(s.goal.x);

      // aliens, turned toward the player
      for (const a of this.aliens) {
        const spr = SPR[a.type];
        const moving = Math.abs(a.vx) > 5;
        const step = Math.floor(a.t * (moving ? 6 : 3));
        const frame = moving ? spr.side[step % spr.side.length] : spr.front[step % spr.front.length];
        const flip = moving && a.face < 0;
        const cy = a.walk ? a.y - ALIEN_H / 2 : a.y;
        const q = a.state === 'dying' ? a.t / 0.45 : 0;
        const bob = a.walk ? Math.abs(Math.sin(a.t * 8)) * -6 * (moving ? 1 : 0) : 0;
        this.drawFrame(img[a.type], spr, frame, a.x, cy + bob, ALIEN_H * (1 - q * 0.5), flip, 1 - q, 0);
      }

      // enemy orbs and your blasts
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const o of this.orbs) {
        c.fillStyle = o.color; c.globalAlpha = 0.45;
        c.beginPath(); c.arc(o.x, o.y, 22, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1; c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(o.x, o.y, 9, 0, Math.PI * 2); c.fill();
      }
      c.restore();
      for (const b of this.blasts) {
        const bw = 150, bh = bw * 106 / 237;
        c.save(); c.translate(b.x, b.y); if (b.vx < 0) c.scale(-1, 1);
        c.drawImage(img.blast, -bw * 0.62, -bh / 2, bw, bh);
        c.restore();
      }

      // the robot
      if (p && !(p.invuln > 0 && Math.floor(p.invuln * 12) % 2 === 0 && p.hurtT <= 0)) {
        const f = this.platFrame(p);
        const dh = DRAW_H, dw = dh * ROBOT.fw / ROBOT.fh;
        c.save();
        c.translate(p.x, p.y + 4);
        if (p.face < 0) c.scale(-1, 1);
        c.drawImage(img.robot, (f % ROBOT.cols) * ROBOT.fw, Math.floor(f / ROBOT.cols) * ROBOT.fh, ROBOT.fw, ROBOT.fh, -dw / 2, -dh, dw, dh);
        c.restore();
      }

      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const q of this.particles) {
        c.globalAlpha = Math.max(0, q.life / q.max); c.fillStyle = q.color;
        if (q.sq) c.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); else { c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill(); }
      }
      c.restore();
      // score pop-ups (in world coordinates, like everything above)
      const drops = this.drops; this.drops = [];
      this.drawScoreFx();
      this.drops = drops;
      c.restore();

      // progress: which of the three backgrounds you are in
      c.save();
      c.font = `700 26px "Chakra Petch", Arial, sans-serif`; c.textAlign = 'center'; c.fillStyle = '#bff9ff';
      c.shadowColor = '#000'; c.shadowBlur = 6;
      c.fillText(`${this.sectionIdx + 1} / ${SECTIONS.length}`, W / 2, 130);
      c.restore();

      // portal transition swirl
      if (this.trans) {
        const k = this.trans.phase === 'out' ? this.trans.t / 0.7 : 1 - this.trans.t / 0.7;
        const g = c.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.8);
        g.addColorStop(0, `rgba(255,255,255,${clamp(k * 1.3, 0, 1)})`);
        g.addColorStop(0.5, `rgba(191,249,255,${clamp(k * 1.1, 0, 1)})`);
        g.addColorStop(1, `rgba(185,155,255,${clamp(k, 0, 1)})`);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.save(); c.translate(W / 2, H / 2); c.rotate(this.trans.t * 5);
        c.strokeStyle = `rgba(255,255,255,${k})`; c.lineWidth = 10;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, 120 + i * 120 + (1 - k) * 300, i, i + 4); c.stroke(); }
        c.restore();
      }
    },

    platFrame(p) {
      const A = ROBOT.anims;
      const at = (arr, fps) => arr[Math.floor(p.animT * fps) % arr.length];
      if (p.hurtT > 0) return A.hurt[Math.min(A.hurt.length - 1, Math.floor((0.45 - p.hurtT) / 0.45 * A.hurt.length))];
      if (!p.onGround) {
        if (p.vy < -650) return A.jump[1];
        if (p.vy < -150) return A.jump[2];
        if (p.vy < 250) return A.jump[3];
        return at(A.fall, 8);
      }
      if (p.landT > 0) return A.land[1 + Math.min(3, Math.floor((0.22 - p.landT) / 0.22 * 4))];
      if (p.attackT > 0 && Math.abs(p.vx) < 60) return A.attack[Math.min(A.attack.length - 1, Math.floor((0.3 - p.attackT) / 0.3 * A.attack.length))];
      if (Math.abs(p.vx) > 430) return at(A.run, 13);
      if (Math.abs(p.vx) > 25) return at(A.walk, 11);
      return at(A.idle, 4);
    },

    // A floating rock slab drawn in the colours of the background
    platDrawSlab(pl, tint) {
      const c = this.ctx, w = pl.x1 - pl.x0, y = pl.y;
      const [top, dark, edge] = tint;
      c.save();
      c.fillStyle = dark;
      c.beginPath();
      c.moveTo(pl.x0, y); c.lineTo(pl.x1, y);
      c.lineTo(pl.x1 - w * 0.12, y + 38); c.lineTo(pl.x0 + w * 0.62, y + 92); c.lineTo(pl.x0 + w * 0.35, y + 70); c.lineTo(pl.x0 + w * 0.1, y + 36);
      c.closePath(); c.fill();
      c.fillStyle = top;
      c.beginPath(); c.moveTo(pl.x0, y); c.lineTo(pl.x1, y); c.lineTo(pl.x1 - 10, y + 16); c.lineTo(pl.x0 + 10, y + 16); c.closePath(); c.fill();
      c.strokeStyle = edge; c.lineWidth = 4; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(pl.x0 + 4, y + 1); c.lineTo(pl.x1 - 4, y + 1); c.stroke();
      c.globalAlpha = 0.6; c.strokeStyle = '#62f0ff'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(pl.x0 + w * 0.2, y + 30); c.lineTo(pl.x0 + w * 0.45, y + 52); c.lineTo(pl.x0 + w * 0.62, y + 44); c.stroke();
      c.restore();
    },

    platDrawPortal(x, y) {
      const c = this.ctx, t = this.time;
      c.save();
      c.translate(x, y);
      const g = c.createRadialGradient(0, 0, 10, 0, 0, 130);
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.35, 'rgba(98,240,255,0.7)'); g.addColorStop(1, 'rgba(185,155,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.ellipse(0, 0, 90, 130, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#bff9ff'; c.lineWidth = 5;
      for (let i = 0; i < 3; i++) {
        c.beginPath(); c.ellipse(0, 0, 60 + i * 14, 100 + i * 14, 0, t * (2 + i) + i, t * (2 + i) + i + 3.5); c.stroke();
      }
      c.restore();
    },

    platDrawGoal(x) {
      const c = this.ctx, t = this.time;
      c.save();
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.35 + 0.2 * Math.sin(t * 3);
      const g = c.createRadialGradient(x, 560, 20, x, 560, 260);
      g.addColorStop(0, 'rgba(255,138,216,0.9)'); g.addColorStop(1, 'rgba(255,138,216,0)');
      c.fillStyle = g; c.fillRect(x - 260, 300, 520, 520);
      c.restore();
    },
  });
})();
