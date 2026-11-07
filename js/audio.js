// Small synthesized sound effects, so the game needs no audio files.
window.Sfx = {
  ctx: null,
  enabled: true,

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.loadSamples();
  },

  // Recorded sound effects (small Opus files), decoded once; the synth sound is used until they are ready
  samples: { laser: 'assets/sfx/laser.webm', victory: 'assets/sfx/victory.webm', dissolve: 'assets/sfx/dissolve.webm' },
  buf: {},
  loadSamples() {
    if (this._loading || !this.ctx) return;
    this._loading = true;
    Object.entries(this.samples).forEach(([k, src]) => {
      fetch(src).then((r) => r.arrayBuffer())
        .then((ab) => new Promise((ok, bad) => this.ctx.decodeAudioData(ab, ok, bad)))
        .then((b) => { this.buf[k] = b; }).catch(() => {});
    });
  },
  sample(k, vol = 1, rate = 1) {
    if (!this.enabled || !this.ctx || !this.buf[k]) return false;
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = this.buf[k]; g.gain.value = vol; src.playbackRate.value = rate;
    src.connect(g).connect(this.ctx.destination); src.start();
    return true;
  },

  tone(freq, dur, type = 'sine', vol = 0.1, slideTo = null, delay = 0) {
    if (!this.enabled || !this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  },

  laser()  { if (this.sample('laser', 0.42)) return; this.tone(1300, 0.14, 'sawtooth', 0.05, 240); this.tone(700, 0.1, 'square', 0.03, 180); },
  pop()    { this.tone(520, 0.12, 'triangle', 0.12, 1400); this.tone(900, 0.18, 'sine', 0.08, 1800, 0.05); },
  hurt()   { this.tone(160, 0.3, 'square', 0.1, 50); },
  empty()  { this.tone(1800, 0.03, 'square', 0.04); },
  reload() { this.tone(300, 0.07, 'square', 0.06); this.tone(620, 0.09, 'square', 0.06, null, 0.12); },
  block()  { this.tone(900, 0.12, 'triangle', 0.1, 1500); this.tone(300, 0.15, 'sine', 0.08, 200); },
  throw()  { this.tone(400, 0.25, 'sine', 0.07, 900); },
  net()    { this.tone(700, 0.08, 'triangle', 0.1, 350); this.tone(1200, 0.3, 'sine', 0.07, 600, 0.06); },
  slow()   { this.tone(900, 0.6, 'sine', 0.09, 180); this.tone(450, 0.8, 'triangle', 0.05, 90, 0.1); },
  // "Digitized": a fast rising bleep run, a choppy data-stream sweep and a final ping,
  // as if the alien is turned into data and saved
  digitize() {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime;
    for (let i = 0; i < 8; i++) this.tone(320 * Math.pow(1.27, i), 0.045, 'square', 0.045, null, i * 0.026);
    const len = 0.34, buf = c.createBuffer(1, Math.floor(c.sampleRate * len), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.floor(i / 240) % 2 ? 1 : 0.25);
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 5;
    f.frequency.setValueAtTime(700, t0); f.frequency.exponentialRampToValueAtTime(5200, t0 + len);
    const g = c.createGain(); g.gain.setValueAtTime(0.11, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + len);
    src.connect(f).connect(g).connect(c.destination); src.start(t0); src.stop(t0 + len);
    this.tone(2300, 0.09, 'sine', 0.06, 3600, 0.25);
  },
  clink()  { this.tone(1900, 0.06, 'square', 0.05, 1200); this.tone(3200, 0.05, 'sine', 0.03, null, 0.02); },
  select() { this.tone(880, 0.06, 'triangle', 0.06); },
  // putting gear on: a quick rising "power-up click"; taking it off: a soft falling whoosh
  equip()   { this.tone(420, 0.09, 'square', 0.05, 900); this.tone(1260, 0.14, 'triangle', 0.08, 1900, 0.07); this.tone(2400, 0.05, 'sine', 0.04, null, 0.16); },
  unequip() { this.tone(1100, 0.22, 'triangle', 0.07, 300); this.tone(500, 0.18, 'sine', 0.05, 160, 0.05); },
  lock()   { this.tone(1500, 0.05, 'sine', 0.04); },
  // filtered noise (for roars, rumbles and crashes)
  noise(dur, from, to, vol, type = 'lowpass', delay = 0, q = 1) {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + Math.min(0.15, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(c.destination); src.start(t0); src.stop(t0 + dur + 0.05);
  },
  // a boss rising: a low rumble that grows
  rumble() { this.noise(1.6, 120, 380, 0.25, 'lowpass'); this.tone(48, 1.5, 'sawtooth', 0.06, 70); },
  // the boss roar: growling low voices with a breathy noise on top
  roar() {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx, t0 = c.currentTime, dur = 1.5;
    [70, 93, 141].forEach((f0, k) => {
      const o = c.createOscillator(), g = c.createGain(), lfo = c.createOscillator(), lg = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 1.4, t0); o.frequency.exponentialRampToValueAtTime(f0, t0 + 0.35); o.frequency.exponentialRampToValueAtTime(f0 * 0.7, t0 + dur);
      lfo.frequency.value = 23 + k * 4; lg.gain.value = f0 * 0.12; lfo.connect(lg).connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.09, t0 + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(c.destination); o.start(t0); lfo.start(t0); o.stop(t0 + dur + 0.05); lfo.stop(t0 + dur + 0.05);
    });
    this.noise(1.3, 1800, 300, 0.22, 'bandpass', 0, 0.8);
  },
  // the mini-boss landing
  crash() { this.noise(0.8, 900, 60, 0.4, 'lowpass'); this.tone(90, 0.5, 'square', 0.1, 35); },
  // warning siren (mini-boss, meteor storm)
  alarm() { for (let i = 0; i < 3; i++) this.tone(660, 0.18, 'square', 0.05, 990, i * 0.26); },
  // Hyper mode: a fast rising sparkle run
  hyper() { [523, 659, 784, 1046, 1318, 1568, 2093].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.07, null, i * 0.05)); this.noise(0.6, 2000, 9000, 0.06, 'highpass'); },

  // winning a level: the "spacey console select" chime
  // a caught alien dissolves: slightly different pitch each time, and never a pile-up of the same sound
  dissolve(big) {
    const now = this.ctx ? this.ctx.currentTime : 0;
    if (!big && now - (this._dissT || -1) < 0.07) return;
    this._dissT = now;
    if (this.sample('dissolve', big ? 1 : 0.8, big ? 0.72 : 0.93 + Math.random() * 0.16)) return;
    this.digitize();
  },
  victory() { if (!this.sample('victory', 0.9)) this.win(); },
  win()    { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, null, i * 0.12)); },
  lose()   { [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.1, null, i * 0.18)); },
};

// Background music for the levels: one looping track at a time, with soft fades.
// Quieter while the game is paused, and silent while the app is in the background.
window.Music = {
  el: null, src: null, vol: 0.55, ducked: false, want: false, fadeT: null, enabled: true,
  base: 'assets/music/', ext: '.webm',

  target() { return this.ducked ? this.vol * 0.35 : this.vol; },
  fadeTo(v, ms, done) {
    clearInterval(this.fadeT);
    const a = this.el; if (!a) { if (done) done(); return; }
    const from = a.volume, steps = Math.max(1, Math.round(ms / 40)); let i = 0;
    if (ms <= 0) { a.volume = v; if (done) done(); return; }
    this.fadeT = setInterval(() => {
      i++; a.volume = Math.max(0, Math.min(1, from + (v - from) * (i / steps)));
      if (i >= steps) { clearInterval(this.fadeT); if (done) done(); }
    }, 40);
  },
  play(name) {
    if (!name) return this.stop(600);
    const src = this.base + name + this.ext;
    this.want = true; this.ducked = false;
    if (!this.enabled) { this.src = src; return; }
    if (this.el && this.src === src && !this.el.paused) { this.fadeTo(this.target(), 500); return; }   // same track keeps going
    const start = () => {
      if (!this.want) return;
      if (!this.el) { this.el = new Audio(); this.el.loop = true; this.el.preload = 'auto'; }
      const a = this.el;
      if (this.src !== src || a.ended) { a.src = src; this.src = src; }
      a.currentTime = 0; a.volume = 0; try { a.playbackRate = this.rate || 1; } catch (e) {}
      const pr = a.play(); if (pr && pr.catch) pr.catch(() => {});
      this.fadeTo(this.target(), 900);
    };
    if (this.el && !this.el.paused) this.fadeTo(0, 400, () => { this.el.pause(); start(); });
    else start();
  },
  stop(ms = 800) {
    this.want = false;
    if (!this.el || this.el.paused) return;
    this.fadeTo(0, ms, () => { if (!this.want && this.el) this.el.pause(); });
  },
  // faster music during Hyper mode (keeps its pitch)
  setRate(r) {
    this.rate = r;
    if (!this.el) return;
    try { this.el.preservesPitch = true; this.el.mozPreservesPitch = true; this.el.webkitPreservesPitch = true; this.el.playbackRate = r; } catch (e) {}
  },
  duck(on) { this.ducked = !!on; if (this.el && !this.el.paused) this.fadeTo(this.target(), 300); },
  setEnabled(on) {
    this.enabled = !!on;
    if (!on && this.el) { clearInterval(this.fadeT); this.el.pause(); }
    else if (on && this.want && this.src && this.el) { const n = this.src.slice(this.base.length, -this.ext.length); this.want = false; this.play(n); }
  },
};
document.addEventListener('visibilitychange', () => {
  const M = window.Music; if (!M.el) return;
  if (document.hidden) M.el.pause();
  else if (M.want && M.enabled) { const pr = M.el.play(); if (pr && pr.catch) pr.catch(() => {}); }
});

// Vibration: the phone buzzes (and a gamepad with rumble shakes) when you get hit or hit an alien.
// Switch it off in Options > Vibration.
window.Haptics = {
  enabled: true, last: 0,
  buzz(ms, strength = 0.6, minGap = 0) {
    if (!this.enabled) return;
    const now = performance.now();
    if (minGap && now - this.last < minGap) return;
    this.last = now;
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {}
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const g of pads) {
        const a = g && g.vibrationActuator;
        if (a && a.playEffect) { const pr = a.playEffect('dual-rumble', { duration: ms, strongMagnitude: strength, weakMagnitude: Math.min(1, strength + 0.2) }); if (pr && pr.catch) pr.catch(() => {}); }
      }
    } catch (e) {}
  },
};
