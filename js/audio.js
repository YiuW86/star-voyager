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
  select() { this.tone(880, 0.06, 'triangle', 0.06); },
  lock()   { this.tone(1500, 0.05, 'sine', 0.04); },
  win()    { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.25, 'triangle', 0.1, null, i * 0.12)); },
  lose()   { [392, 330, 262].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.1, null, i * 0.18)); },
};
