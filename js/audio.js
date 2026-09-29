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

  laser()  { this.tone(1300, 0.14, 'sawtooth', 0.05, 240); this.tone(700, 0.1, 'square', 0.03, 180); },
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
  lock()   { this.tone(1500, 0.05, 'sine', 0.04); },
  win()    { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, null, i * 0.12)); },
  lose()   { [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.1, null, i * 0.18)); },
};
