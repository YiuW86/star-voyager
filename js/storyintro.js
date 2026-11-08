// Star Voyager – the story before the intro film: five short animated pages with a line of text each.
// StoryIntro.play(done) shows them on #screen-story; tap / Enter = next page, Skip / Escape = straight to the end.
(function () {
  'use strict';
  const PAGES = [
    'Far away, at the edge of the galaxy, lies the Star Cluster: planets full of friendly, colourful aliens.',
    "But one day a strange humming signal spread from star to star. It filled the aliens' heads with static… and they turned wild and angry.",
    'Space Command sent its bravest astronaut: you! And Orbit, your little robot helper, came along.',
    "Your blaster doesn't hurt. Its digital beam catches an alien, cleans the static from its head, and keeps it safe in your Alien Guide.",
    'Calm aliens move to your ranch. Free every planet… and find out who sent the signal.',
  ];
  // sprite sheets (same cells as the game): [src, cell width, cell height, idle frame]
  const SPR = {
    nebula: ['assets/nebula.webp', 238, 246, 0], glide: ['assets/glide.webp', 262, 212, 0], orblet: ['assets/orblet.webp', 250, 235, 0],
    prism: ['assets/prism.webp', 236, 249, 0], solara: ['assets/solara.webp', 274, 242, 0], splash: ['assets/splash.webp', 265, 246, 0],
    skybloom: ['assets/skybloom.webp', 250, 244, 0],
  };
  const PLAN = [['assets/planet1.webp', 340, 12], ['assets/planet2.webp', 400, 12], ['assets/planet3.webp', 370, 12]];
  const IMG = {};
  const img = (src) => { if (!IMG[src]) { const i = new Image(); i.src = src; IMG[src] = i; } return IMG[src]; };
  const ok = (i) => i && i.complete && i.naturalWidth > 0;
  const T = (s) => (window.t ? window.t(s) : s);
  const $ = (q) => document.querySelector(q);
  const ease = (x) => { x = Math.max(0, Math.min(1, x)); return 1 - Math.pow(1 - x, 3); };
  const back = (x) => { x = Math.max(0, Math.min(1, x)); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

  const S = {
    on: false, page: 0, pt: 0, typed: 0, done: null, raf: 0, last: 0, stars: null, cubes: [],
    preload() {
      Object.values(SPR).forEach((s) => img(s[0])); PLAN.forEach((p) => img(p[0]));
      ['assets/story/orbit.jpg', 'assets/story/p_astronaut.jpg', 'assets/ranch.jpg', 'assets/void_boss.webp'].forEach(img);
    },
    play(done) {
      this.preload();
      this.done = done; this.on = true; this.page = 0; this.pt = 0; this.typed = 0; this.cubes = [];
      if (!this.stars) this.stars = Array.from({ length: 220 }, () => ({ x: Math.random(), y: Math.random(), z: 0.2 + Math.random() * 0.8, p: Math.random() * 6 }));
      const cv = $('#story-canvas');
      this.ctx = cv.getContext('2d');
      this.showText();
      cancelAnimationFrame(this.raf);
      this.last = performance.now();
      const loop = (now) => { if (!this.on) return; const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now; this.update(dt); this.draw(); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
      setTimeout(() => { const b = $('#story-next'); if (b) b.focus(); }, 60);
    },
    showText() {
      const el = $('#story-text');
      this.full = T(PAGES[this.page]); this.typed = 0;
      el.textContent = '';
      $('#story-dots').innerHTML = PAGES.map((_, i) => `<i class="${i === this.page ? 'on' : i < this.page ? 'past' : ''}"></i>`).join('');
      $('#story-next span').textContent = T(this.page === PAGES.length - 1 ? "Let's go!" : 'Next');
      $('#screen-story').classList.remove('typed');
      if (window.Sfx) try { Sfx.select(); } catch (e) {}
    },
    next() {
      if (!this.on) return;
      if (this.typed < this.full.length) { this.typed = this.full.length; $('#story-text').textContent = this.full; $('#screen-story').classList.add('typed'); return; }
      if (this.page >= PAGES.length - 1) return this.finish();
      this.page++; this.pt = 0; this.cubes = [];
      this.showText();
    },
    finish() {
      if (!this.on) return;
      this.on = false;
      cancelAnimationFrame(this.raf);
      const d = this.done; this.done = null;
      if (d) d();
    },
    update(dt) {
      this.pt += dt;
      if (this.typed < this.full.length) {
        this.typed = Math.min(this.full.length, this.typed + dt * 38);
        $('#story-text').textContent = this.full.slice(0, Math.floor(this.typed));
        if (this.typed >= this.full.length) $('#screen-story').classList.add('typed');
      }
      // page 4: the beam turns the alien into cubes that fly into the guide card
      if (this.page === 3) {
        const c = this.loopT(5.5);
        if (c < 0.05) this.cubes = [];
        if (c >= 1.7 && !this.cubesMade) { this.makeCubes(); this.cubesMade = true; if (window.Sfx) try { Sfx.dissolve(false); } catch (e) {} }
        if (c < 1.7) this.cubesMade = false;
        for (const q of this.cubes) {
          q.t += dt;
          const k = ease((q.t - q.delay) / 0.9);
          q.x = q.x0 + (q.tx - q.x0) * k + Math.sin(k * Math.PI) * q.arc;
          q.y = q.y0 + (q.ty - q.y0) * k - Math.sin(k * Math.PI) * 120;
          q.a = q.t < q.delay ? 1 : 1 - Math.max(0, (q.t - q.delay - 0.7) / 0.3);
        }
      }
      // little chirps
      if (this.page === 1 && this.pt > 1.2 && !this.chirped) { this.chirped = true; if (window.Sfx && Sfx.chirp) try { Sfx.chirp(0, 'ouch'); } catch (e) {} }
      if (this.page !== 1) this.chirped = false;
    },
    // Orbit's picture without its dark square: a soft round mask
    orbitPic(o, d) {
      if (this._orb && this._orbD === d) return this._orb;
      const cell = o.naturalWidth / 3, cv = document.createElement('canvas'); cv.width = cv.height = 300;
      const x = cv.getContext('2d');
      x.drawImage(o, (d % 3) * cell, Math.floor(d / 3) * cell, cell, cell, 0, 0, 300, 300);
      x.globalCompositeOperation = 'destination-in';
      const g = x.createRadialGradient(150, 150, 70, 150, 150, 148); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, 300, 300);
      this._orb = cv; this._orbD = d; return cv;
    },
    loopT(len) { return this.pt % len; },
    makeCubes() {
      const W = this.W, cx = W * 0.3, cy = 380, cols = ['#c79bff', '#9a6bff', '#ff8ad8', '#62f0ff', '#e7d4ff'];
      this.cubes = [];
      for (let i = 0; i < 70; i++) {
        const x0 = cx + (Math.random() - 0.5) * 200, y0 = cy + (Math.random() - 0.5) * 200;
        this.cubes.push({ x0, y0, x: x0, y: y0, tx: W * 0.7 + (Math.random() - 0.5) * 60, ty: 380 + (Math.random() - 0.5) * 60,
          arc: (Math.random() - 0.5) * 120, delay: Math.random() * 0.4, t: 0, s: 10 + Math.random() * 12, c: cols[i % cols.length], a: 1 });
      }
    },

    // ---------- drawing ----------
    draw() {
      const cv = this.ctx.canvas, stage = $('#stage');
      const W = Math.round(stage ? stage.offsetWidth || 1920 : 1920);
      if (cv.width !== W) { cv.width = W; cv.height = 1080; }
      this.W = W;
      const c = this.ctx, t = this.pt;
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.filter = 'none';
      const g = c.createRadialGradient(W * 0.5, 380, 100, W * 0.5, 540, W * 0.75);
      g.addColorStop(0, this.page === 1 ? '#3a1030' : this.page === 4 && t > 3 ? '#12082a' : '#1b2a7a'); g.addColorStop(1, '#03051a');
      c.fillStyle = g; c.fillRect(0, 0, W, 1080);
      this.drawStars(c, W, t);
      const fadeIn = ease(t / 0.6);
      c.save(); c.globalAlpha = fadeIn;
      [this.p1, this.p2, this.p3, this.p4, this.p5][this.page].call(this, c, W, t);
      c.restore();
    },
    drawStars(c, W, t) {
      for (const s of this.stars) {
        const x = ((s.x * W - t * 30 * s.z) % W + W) % W, y = s.y * 860;
        c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(t * 1.5 + s.p)) * s.z;
        c.fillStyle = '#fff'; c.fillRect(x, y, 2.4 * s.z, 2.4 * s.z);
      }
      c.globalAlpha = 1;
    },
    sprite(c, k, x, y, h, opt = {}) {
      const s = SPR[k], im = img(s[0]); if (!ok(im)) return;
      const cols = Math.max(1, Math.floor(im.naturalWidth / s[1])), f = opt.frame != null ? opt.frame : s[3];
      const w = h * s[1] / s[2];
      c.save(); c.translate(x, y);
      if (opt.flip) c.scale(-1, 1);
      if (opt.filter) c.filter = opt.filter;
      if (opt.alpha != null) c.globalAlpha *= opt.alpha;
      c.drawImage(im, (f % cols) * s[1], Math.floor(f / cols) * s[2], s[1], s[2], -w / 2, -h / 2, w, h);
      c.restore();
    },
    planet(c, i, x, y, size, t, alpha) {
      const p = PLAN[i], im = img(p[0]); if (!ok(im)) return;
      const f = Math.floor(t * 5) % p[2];
      c.save(); c.globalAlpha *= alpha;
      c.shadowColor = ['#7fd8ff', '#ff9a5a', '#c79bff'][i]; c.shadowBlur = 50;
      c.drawImage(im, f * p[1], 0, p[1], p[1], x - size / 2, y - size / 2, size, size);
      c.restore();
    },
    glowText(c, s, x, y, size, col) {
      c.save(); c.font = `700 ${size}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.shadowColor = col; c.shadowBlur = 20; c.fillStyle = col; c.fillText(s, x, y); c.restore();
    },
    // 1: the Star Cluster – planets glow in, happy aliens float by
    p1(c, W, t) {
      const pos = [[0.24, 360, 300], [0.5, 290, 380], [0.76, 380, 280]];
      pos.forEach(([fx, y, s], i) => {
        const a = ease((t - 0.3 - i * 0.6) / 1.2);
        this.planet(c, i, W * fx, y + Math.sin(t * 0.8 + i) * 10, s * (0.7 + 0.3 * a), t, a);
      });
      const al = [['nebula', 0.36, 560], ['glide', 0.63, 600], ['orblet', 0.88, 240], ['skybloom', 0.11, 200]];
      al.forEach(([k, fx, y], i) => {
        const a = ease((t - 1.8 - i * 0.4) / 0.8);
        this.sprite(c, k, W * fx + Math.sin(t * 0.7 + i * 2) * 30, y + Math.sin(t * 2 + i) * 14, 130, { alpha: a, flip: i % 2 === 1 });
      });
    },
    // 2: the signal – red static waves, an alien turns angry
    p2(c, W, t) {
      const ox = W * 0.92, oy = 260;
      for (let i = 0; i < 6; i++) {
        const r = ((t * 260 + i * 220) % 1300);
        c.save(); c.strokeStyle = `rgba(255,70,90,${0.6 * (1 - r / 1300)})`; c.lineWidth = 6; c.beginPath();
        for (let a = 0; a <= Math.PI * 2 + 0.01; a += 0.05) {
          const j = r + Math.sin(a * 18 + t * 20 + i) * 10 + (Math.random() - 0.5) * 8;
          const x = ox + Math.cos(a) * j, y = oy + Math.sin(a) * j;
          a === 0 ? c.moveTo(x, y) : c.lineTo(x, y);
        }
        c.stroke(); c.restore();
      }
      // the signal's source: a pulsing dark spot
      c.save(); c.fillStyle = '#ff3a5a'; c.shadowColor = '#ff3a5a'; c.shadowBlur = 40 + Math.sin(t * 8) * 20;
      c.beginPath(); c.arc(ox, oy, 18, 0, Math.PI * 2); c.fill(); c.restore();
      const anger = ease((t - 1.0) / 1.2);
      const shake = anger * 10;
      const x = W * 0.42 + (Math.random() - 0.5) * shake, y = 430 + (Math.random() - 0.5) * shake;
      this.sprite(c, 'nebula', x, y, 380, {});
      if (anger > 0) this.sprite(c, 'nebula', x, y, 380, { alpha: anger * 0.75, filter: 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(0.9)' });
      // static over the head
      c.save(); c.globalAlpha = anger;
      for (let i = 0; i < 26; i++) {
        c.fillStyle = Math.random() < 0.5 ? '#ff6a7a' : '#fff';
        c.fillRect(x - 160 + Math.random() * 320, y - 220 + Math.random() * 140, 10 + Math.random() * 40, 4);
      }
      c.restore();
      if (anger > 0.6) {
        const s = 1 + Math.sin(t * 10) * 0.12;
        c.save(); c.translate(x + 170, y - 190); c.scale(s, s); c.font = '90px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('💢', 0, 0); c.restore();
      }
    },
    // 3: you and Orbit
    p3(c, W, t) {
      const a = img('assets/story/p_astronaut.jpg');
      const k = back((t - 0.2) / 0.9), cx = W * 0.4, cy = 380 + (1 - k) * 500;
      if (ok(a)) {
        c.save();
        c.shadowColor = '#62f0ff'; c.shadowBlur = 60;
        c.beginPath(); c.arc(cx, cy, 228, 0, Math.PI * 2); c.fillStyle = '#62f0ff'; c.fill();
        c.shadowBlur = 0; c.beginPath(); c.arc(cx, cy, 220, 0, Math.PI * 2); c.clip();
        c.drawImage(a, cx - 220, cy - 220, 440, 440); c.restore();
      }
      // Orbit pops up with a bounce
      const o = img('assets/story/orbit.jpg'), d = window.Story && Story.orbitDesign ? Story.orbitDesign() : 0;
      const ok2 = ok(o), ks = back((t - 1.4) / 0.6);
      if (ok2 && t > 1.4) {
        const ox = W * 0.66, oy = 360 + Math.sin(t * 2.4) * 18, sz = 300 * ks;
        c.drawImage(this.orbitPic(o, d), ox - sz / 2, oy - sz / 2, sz, sz);
        if (t > 2.0) {
          c.save(); c.globalAlpha *= ease((t - 2) / 0.3);
          c.fillStyle = '#fff'; c.beginPath(); c.ellipse(ox + 150, oy - 150, 54, 44, 0, 0, Math.PI * 2); c.fill();
          c.beginPath(); c.moveTo(ox + 110, oy - 125); c.lineTo(ox + 90, oy - 95); c.lineTo(ox + 135, oy - 118); c.fill();
          this.glowText(c, '!', ox + 150, oy - 150, 64, '#1c2a86'); c.restore();
        }
        // sparkles
        for (let i = 0; i < 8; i++) {
          const an = i / 8 * Math.PI * 2 + t, r = 190 + Math.sin(t * 3 + i) * 20;
          c.save(); c.globalAlpha *= 0.6 * ks; c.fillStyle = '#9ff8ff';
          c.translate(ox + Math.cos(an) * r, oy + Math.sin(an) * r); c.rotate(Math.PI / 4); c.fillRect(-5, -5, 10, 10); c.restore();
        }
      }
    },
    // 4: beam → cubes → calm alien on a guide card (loops)
    p4(c, W, t) {
      const lt = this.loopT(5.5), ax = W * 0.3, ay = 380;
      if (lt < 1.7) {
        const sh = 8;
        const x = ax + (Math.random() - 0.5) * sh, y = ay + (Math.random() - 0.5) * sh;
        this.sprite(c, 'nebula', x, y, 300, {});
        this.sprite(c, 'nebula', x, y, 300, { alpha: 0.7, filter: 'sepia(1) saturate(6) hue-rotate(-40deg) brightness(0.9)' });
      }
      if (lt > 0.9 && lt < 1.9) {
        const k = Math.min(1, (lt - 0.9) / 0.25), sx = 120, sy = 1080;
        const ex = sx + (ax - sx) * k, ey = sy + (ay - sy) * k;
        c.save(); c.lineCap = 'round';
        c.strokeStyle = 'rgba(98,240,255,0.35)'; c.lineWidth = 46; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
        c.strokeStyle = '#e8fdff'; c.lineWidth = 12; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke();
        c.restore();
        if (k >= 1) { c.save(); c.globalCompositeOperation = 'lighter'; const r = c.createRadialGradient(ax, ay, 0, ax, ay, 200); r.addColorStop(0, 'rgba(160,250,255,0.8)'); r.addColorStop(1, 'rgba(98,240,255,0)'); c.fillStyle = r; c.fillRect(ax - 200, ay - 200, 400, 400); c.restore(); }
      }
      for (const q of this.cubes) {
        if (q.a <= 0) continue;
        c.save(); c.globalAlpha *= q.a; c.fillStyle = q.c; c.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s);
        c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(q.x - q.s / 2, q.y - q.s / 2, q.s, q.s * 0.3); c.restore();
      }
      // the guide card
      const cx = W * 0.7, cy = 360, cw = 340, ch = 430;
      c.save();
      c.shadowColor = '#62f0ff'; c.shadowBlur = lt > 2.4 && lt < 3.2 ? 60 : 24;
      const g = c.createLinearGradient(cx, cy - ch / 2, cx, cy + ch / 2); g.addColorStop(0, '#2a3fb0'); g.addColorStop(1, '#0b1450');
      c.fillStyle = g; c.strokeStyle = '#62f0ff'; c.lineWidth = 5;
      c.beginPath(); c.roundRect ? c.roundRect(cx - cw / 2, cy - ch / 2, cw, ch, 28) : c.rect(cx - cw / 2, cy - ch / 2, cw, ch); c.fill(); c.stroke();
      c.restore();
      this.glowText(c, T('Alien guide'), cx, cy - ch / 2 + 44, 34, '#ffd27a');
      if (lt > 2.3) {
        const k = back((lt - 2.3) / 0.5);
        this.sprite(c, 'nebula', cx, cy + 20 + Math.sin(t * 2) * 8, 240 * k, {});
        if (lt > 2.8) this.glowText(c, '♥', cx + 110, cy - 100 - (lt - 2.8) * 30, 54, '#ff8ad8');
      } else {
        c.save(); c.strokeStyle = 'rgba(98,240,255,0.4)'; c.setLineDash([12, 10]); c.lineWidth = 4;
        c.strokeRect(cx - 120, cy - 110, 240, 240); c.restore();
        this.glowText(c, '?', cx, cy + 10, 120, 'rgba(98,240,255,0.5)');
      }
    },
    // 5: the ranch, then the shadow with glowing eyes
    p5(c, W, t) {
      const r = img('assets/ranch.jpg');
      const dark = ease((t - 3.2) / 1.4);
      if (ok(r)) {
        const sc = Math.max(W / r.naturalWidth, 1080 / r.naturalHeight), w = r.naturalWidth * sc, h = r.naturalHeight * sc;
        c.save(); c.globalAlpha *= ease(t / 0.8); c.drawImage(r, (W - w) / 2, (1080 - h) / 2, w, h); c.restore();
      }
      const al = [['glide', 0.18, 0], ['orblet', 0.38, 1], ['splash', 0.58, 2], ['solara', 0.8, 3], ['prism', 0.48, 4]];
      al.forEach(([k, fx, i]) => {
        const hop = Math.abs(Math.sin(t * 3 + i * 1.3)) * 50, x = W * fx + Math.sin(t * 0.6 + i) * 60;
        this.sprite(c, k, x, 690 - hop - (i === 4 ? 130 : 0), i === 4 ? 140 : 180, { flip: Math.cos(t * 0.6 + i) < 0 });
      });
      if (dark > 0) {
        c.save(); c.globalAlpha = dark * 0.82; c.fillStyle = '#05010f'; c.fillRect(0, 0, W, 1080); c.restore();
        const v = img('assets/void_boss.webp');
        if (ok(v)) {
          const vw = 1100 * (0.9 + 0.1 * dark), vh = vw * 620 / 1102;
          c.save(); c.globalAlpha = dark * 0.75; c.filter = 'brightness(0.18) saturate(0.4)';
          c.drawImage(v, 0, 0, 1102, 620, W / 2 - vw / 2, 60 + (1 - dark) * 60, vw, vh); c.restore();
        }
        // the eyes blink now and then
        const blink = (t % 3.1) > 2.95 ? 0.1 : 1;
        if (dark > 0.6) {
          [-1, 1].forEach((s) => {
            c.save(); c.globalAlpha = (dark - 0.6) / 0.4; c.fillStyle = '#e8b0ff'; c.shadowColor = '#b06cff'; c.shadowBlur = 40;
            c.beginPath(); c.ellipse(W / 2 - 6 + s * 24, 236, 17, 7 * blink, s * -0.35, 0, Math.PI * 2); c.fill(); c.restore();
          });
        }
      }
    },
  };
  window.StoryIntro = S;
})();
