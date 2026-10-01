// Story cutscenes: a picture with effects, and a dialogue box with the head of whoever speaks.
// Tap / click / Enter / Fire shows the rest of a line at once, or goes to the next line.
// Every cutscene is a list of steps: { who, text, fx } or { reward: [...] }.
(function () {
  const T = (s) => (window.t ? window.t(s) : s);

  // Who can speak: name, portrait and the side of the box the portrait is on
  const SPEAKERS = {
    astro: { name: 'Astronaut', img: 'assets/story/p_astronaut.jpg', side: 'left', color: '#62f0ff' },
    orbit: { name: 'Orbit', orbit: true, side: 'left', color: '#7dffb0' },
    kn: { name: 'King Nebula', img: 'assets/story/p_kingnebula.jpg', side: 'right', color: '#ff8ad8' },
  };

  // Positions on the cutscene picture, in % of the picture (it is shown whole-height, cropped at the sides if needed)
  const SCENES = {
    kn: {
      img: 'assets/story/kn_scene.jpg', ratio: 1671 / 941,
      helmet: [36.5, 59.5], crown: [55.1, 37.2], mark: [55.2, 38.6], boss: [58, 54],
      steps: [
        { who: 'narr', text: 'King Nebula sinks to the ground. His purple glow flickers, then turns calm and soft.', fx: 'calm' },
        { who: 'kn', text: "Rrrgh... the noise... it's fading..." },
        { who: 'astro', text: "Easy, big guy. I'm not here to hurt you." },
        { who: 'kn', text: 'Little star-walker... you did not destroy me. You calmed me.' },
        { who: 'astro', text: 'Why did you attack me? Why is everyone here so angry?' },
        { who: 'kn', text: 'A sound came from the sky. A buzzing, humming sound. It crept into our heads and filled us with rage.', fx: 'hum' },
        { who: 'narr', text: "Orbit's scanner beam sweeps over King Nebula's crown. A strange symbol glows on it.", fx: 'scan' },
        { who: 'orbit', text: "Commander, look. There's a mark on his crown. It's sending out a signal.", fx: 'mark' },
        { who: 'kn', text: 'The Mark of Static. It appeared on every ruler of this planet. After that, we were no longer ourselves.', fx: 'mark' },
        { who: 'astro', text: 'Who did this to you?', fx: 'mark' },
        { who: 'kn', text: 'We do not know. It began when the new stars appeared in our sky.', fx: 'stars' },
        { who: 'orbit', text: "New stars? My charts don't show any new stars here...", fx: 'stars' },
        { who: 'astro', text: 'Strange. Keep scanning, Orbit.' },
        { who: 'kn', text: 'The other rulers still hear the noise. Free them, star-walker, and this planet will never forget you.' },
        { who: 'narr', text: 'King Nebula hands over a glowing purple crystal.', fx: 'crystal' },
        { who: 'kn', text: 'Take this. When you need us, call. The Nebula will answer.', fx: 'crystal-held' },
        { reward: ['King Nebula is now your Champion!', 'New statue in your Spacedome.', 'Nebula aliens have moved into your habitat.'] },
        { who: 'orbit', text: "Commander... that signal from the mark. I've heard it before. I just can't remember where...", fx: 'mark' },
      ],
    },
  };

  const Story = {
    orbitDesign: () => 0,          // set by the menus: which of the 9 Orbit designs the player chose
    active: false,

    play(id, onDone) {
      const sc = SCENES[id];
      if (!sc) { if (onDone) onDone(); return; }
      this.sc = sc; this.onDone = onDone; this.i = -1; this.active = true;
      const root = document.getElementById('cutscene');
      const pos = (p) => `left:${p[0]}%;top:${p[1]}%`;
      root.innerHTML = `
        <div class="cs-scene" style="--ratio:${sc.ratio}">
          <img class="cs-bg" src="${sc.img}" alt="">
          <div class="cs-glow" style="${pos(sc.boss)}"></div>
          <div class="cs-hum" style="${pos(sc.crown)}"><i></i><i></i><i></i></div>
          <div class="cs-beam" style="${pos(sc.helmet)}"></div>
          <div class="cs-mark" style="${pos(sc.mark || sc.crown)}">${MARK_SVG}</div>
          <div class="cs-newstars"><i style="left:22%;top:12%"></i><i style="left:47%;top:7%"></i><i style="left:78%;top:15%"></i></div>
          <div class="cs-crystal" style="${pos(sc.boss)}">${CRYSTAL_SVG}</div>
          <div class="cs-sparkles">${Array.from({ length: 24 }, (_, k) => `<i style="left:${(k * 37) % 100}%;top:${(k * 53) % 100}%;animation-delay:${(k % 7) * 0.6}s"></i>`).join('')}</div>
        </div>
        <div class="cs-vignette"></div>
        <button class="cs-box" id="cs-box" aria-live="polite">
          <span class="cs-portrait"><i></i></span>
          <span class="cs-text"><b class="cs-name"></b><span class="cs-line"></span></span>
          <span class="cs-next">▸</span>
        </button>
        <div class="cs-reward" id="cs-reward"></div>
        <button class="btn small cs-skip" id="cs-skip"><span>${T('Skip')}</span></button>
        <div class="cs-fade"></div>`;
      // the crystal later floats from the boss to the astronaut
      const cr = root.querySelector('.cs-crystal');
      cr.style.setProperty('--hx', sc.helmet[0] + 3 + '%'); cr.style.setProperty('--hy', sc.helmet[1] + 4 + '%');
      root.classList.add('show');
      requestAnimationFrame(() => this.layoutBeam());
      root.onpointerdown = (e) => { if (e.target.closest('#cs-skip')) return; e.preventDefault(); this.advance(); };
      root.querySelector('#cs-skip').onclick = (e) => { e.stopPropagation(); this.finish(); };
      root.querySelector('#cs-box').onclick = (e) => { if (e.detail === 0) this.advance(); };   // keyboard / phone Fire
      requestAnimationFrame(() => root.classList.add('in'));
      setTimeout(() => this.advance(), 700);
      setTimeout(() => { const b = document.getElementById('cs-box'); if (b) b.focus(); }, 750);
    },

    // the scanner beam runs from the helmet to the crown (measured on the picture as it is shown)
    layoutBeam() {
      const root = document.getElementById('cutscene');
      const scene = root.querySelector('.cs-scene'), beam = root.querySelector('.cs-beam');
      if (!scene || !beam) return;
      const w = scene.offsetWidth, h = scene.offsetHeight, sc = this.sc;
      const dx = (sc.crown[0] - sc.helmet[0]) / 100 * w, dy = (sc.crown[1] - sc.helmet[1]) / 100 * h;
      beam.style.width = Math.hypot(dx, dy) + 'px';
      beam.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
    },

    // tap: finish typing the line, or go on to the next line
    advance() {
      if (!this.active) return;
      if (this.typing) { this.typing = false; return; }
      if (this.waitReward) { this.waitReward = false; document.getElementById('cs-reward').classList.remove('show'); }
      this.i++;
      const st = this.sc.steps[this.i];
      if (!st) return this.finish();
      if (window.Sfx) Sfx.select();
      const root = document.getElementById('cutscene');
      if (st.fx) st.fx.split(' ').forEach((f) => root.classList.add('fx-' + f));
      if (st.fx === 'crystal-held') root.classList.add('fx-crystal');
      if (st.reward) return this.showReward(st.reward);
      const box = document.getElementById('cs-box');
      box.classList.remove('hidden');
      const sp = SPEAKERS[st.who];
      box.classList.toggle('narr', !sp);
      box.classList.toggle('right', !!sp && sp.side === 'right');
      const portrait = box.querySelector('.cs-portrait i');
      if (sp) {
        box.style.setProperty('--who', sp.color);
        if (sp.orbit) { const d = this.orbitDesign(); portrait.style.backgroundImage = 'url(assets/story/orbit.jpg)'; portrait.style.backgroundSize = '300% 300%'; portrait.style.backgroundPosition = `${(d % 3) * 50}% ${Math.floor(d / 3) * 50}%`; }
        else { portrait.style.backgroundImage = `url(${sp.img})`; portrait.style.backgroundSize = 'cover'; portrait.style.backgroundPosition = 'center'; }
        box.querySelector('.cs-portrait').classList.remove('pop'); void box.offsetWidth; box.querySelector('.cs-portrait').classList.add('pop');
      }
      box.querySelector('.cs-name').textContent = sp ? T(sp.name) : '';
      this.type(T(st.text), box.querySelector('.cs-line'));
    },

    // the text appears letter by letter
    type(text, el) {
      this.typing = true;
      el.textContent = '';
      let n = 0;
      const step = () => {
        if (!this.active) return;
        if (!this.typing) { el.textContent = text; return; }
        n += 2;
        el.textContent = text.slice(0, n);
        if (n >= text.length) { this.typing = false; return; }
        setTimeout(step, 28);
      };
      step();
    },

    showReward(lines) {
      document.getElementById('cs-box').classList.add('hidden');
      const box = document.getElementById('cs-reward');
      const icons = ['assets/story/p_kingnebula.jpg', 'assets/story/p_kingnebula.jpg', 'assets/dex/nebula.png'];
      const cls = ['rw-champ', 'rw-statue', 'rw-habitat'];
      box.innerHTML = `<div class="cs-reward-card"><h2>${T('Reward')}</h2>${lines.map((l, k) => `<div class="cs-reward-line" style="animation-delay:${0.3 + k * 0.35}s"><i class="${cls[k]}" style="background-image:url(${icons[k]})"></i><span>${T(l)}</span></div>`).join('')}<p class="cs-tap">${T('Tap to continue')}</p></div>`;
      box.classList.add('show');
      this.waitReward = true;
      if (window.Sfx) Sfx.win();
    },

    finish() {
      if (!this.active) return;
      this.active = false;
      const root = document.getElementById('cutscene');
      root.classList.add('out');
      setTimeout(() => {
        root.classList.remove('show', 'in', 'out');
        root.className = root.className.split(' ').filter((c) => !c.startsWith('fx-')).join(' ');
        root.innerHTML = '';
        if (this.onDone) this.onDone();
      }, 1100);
    },
  };

  const MARK_SVG = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="7"/>
    <path d="M18 52 L32 52 L39 34 L48 70 L56 26 L63 60 L69 48 L82 48" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const CRYSTAL_SVG = `<svg viewBox="0 0 60 90"><defs><linearGradient id="csg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4dcff"/><stop offset="0.5" stop-color="#b56cff"/><stop offset="1" stop-color="#5a1aa8"/></linearGradient></defs>
    <path d="M30 2 L56 34 L30 88 L4 34 Z" fill="url(#csg)" stroke="#fff" stroke-width="2"/><path d="M30 2 L30 88 M4 34 L56 34" stroke="rgba(255,255,255,0.6)" stroke-width="1.5"/></svg>`;

  window.Story = Story;
})();
