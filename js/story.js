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
    el: { name: 'Ember Lord', img: 'assets/story/p_emberlord.jpg', side: 'right', color: '#ffb347' },
  };

  // Positions on the cutscene picture, in % of the picture (it is shown whole-height, cropped at the sides if needed)
  const SCENES = {
    kn: {
      img: 'assets/story/kn_scene.jpg', ratio: 1671 / 941,
      helmet: [36.5, 59.5], crown: [55.1, 37.2], mark: [55.2, 38.6], boss: [58, 54], item: 'crystal',
      rewardIcons: [{ img: 'assets/story/p_kingnebula.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_kingnebula.jpg', cls: 'rw-statue' }, { img: 'assets/dex/nebula.png', cls: 'rw-habitat' }],
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

  // The Ember Lord, in the crystal fire world (Sunfire Dunes)
  SCENES.el = {
    img: 'assets/story/el_scene.jpg', ratio: 1671 / 941,
    helmet: [36.6, 61.4], crown: [57.0, 47.3], mark: [56.0, 62.2], boss: [56.9, 59.5], beamTo: 'mark', item: 'fragment',
    glow: ['rgba(255, 50, 20, 1)', 'rgba(255, 150, 40, 0.6)'],
    rewardIcons: [{ img: 'assets/story/p_emberlord.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_emberlord.jpg', cls: 'rw-statue' },
      { img: 'assets/dex/ember.png', cls: 'rw-habitat' }, { svg: 'fragment', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: 'Ember Lord crashes down in a burst of sparks. His flames shrink from roaring red to a small orange flicker. He quickly jumps back up.', fx: 'crash' },
      { who: 'el', text: "HA! I slipped! That doesn't count!" },
      { who: 'astro', text: 'You slipped... five times?' },
      { who: 'el', text: "The floor is very slippery! It's LAVA!" },
      { who: 'orbit', text: 'Commander, his temperature is dropping. The Mark of Static is fading from his chest.', fx: 'scan' },
      { who: 'narr', text: 'Ember Lord looks down at the fading mark. He goes quiet for a moment.', fx: 'markfade' },
      { who: 'el', text: "...The buzzing. It's gone. My head is quiet for the first time in many moons." },
      { who: 'el', text: 'Fine. FINE. You beat me. Fair and square. Mostly.' },
      { who: 'astro', text: "I'm not here to beat anyone. I'm trying to find out what's causing this." },
      { who: 'el', text: "Hmph. Then you're braver than you look. And you look very small." },
      { who: 'el', text: 'Listen, tiny one. I saw something. Before the buzzing started, a star fell from the sky. Right into my volcano.', fx: 'fallstar' },
      { who: 'astro', text: 'A falling star?' },
      { who: 'el', text: 'Stars should melt in my volcano. Everything melts in my volcano! But this one did NOT melt. It just sat there... humming.', fx: 'hum' },
      { who: 'narr', text: 'Ember Lord pulls a small, scorched piece of metal from his armour and tosses it over.', fx: 'crystal' },
      { who: 'el', text: 'Here. A piece broke off. Take it before it gives ME a headache again.', fx: 'crystal-held' },
      { who: 'orbit', text: "Scanning... Commander, this isn't a rock. It's metal. Someone built this." },
      { who: 'astro', text: 'Built it? Then who sent it here?' },
      { who: 'el', text: 'Find out, tiny one. And when you find whoever did this...' },
      { who: 'narr', text: 'His flames flare up bright red again.', fx: 'flare' },
      { who: 'el', text: '...call ME. I want to be there!', fx: 'flare' },
      { reward: ['Ember Lord is now your Champion!', 'New statue in your Spacedome.', 'Ember aliens have moved into your habitat.', 'New item: Scorched Fragment (view in the Spacedome)'] },
      { who: 'orbit', text: "Commander... the markings on this fragment. They look almost like... no. That can't be right." },
    ],
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
          <div class="cs-glow" style="${pos(sc.boss)};${sc.glow ? `--g1:${sc.glow[0]};--g2:${sc.glow[1]}` : ''}"></div>
          <div class="cs-burst" style="${pos(sc.boss)}">${Array.from({ length: 18 }, (_, k) => `<i style="--a:${k * 20}deg;--d:${0.7 + (k % 4) * 0.25}"></i>`).join('')}</div>
          <div class="cs-fallstar"></div>
          <div class="cs-hum" style="${pos(sc.crown)}"><i></i><i></i><i></i></div>
          <div class="cs-beam" style="${pos(sc.helmet)}"></div>
          <div class="cs-mark" style="${pos(sc.mark || sc.crown)}">${MARK_SVG}</div>
          <div class="cs-newstars"><i style="left:22%;top:12%"></i><i style="left:47%;top:7%"></i><i style="left:78%;top:15%"></i></div>
          <div class="cs-crystal" style="${pos(sc.boss)}">${sc.item === 'fragment' ? FRAGMENT_SVG : CRYSTAL_SVG}</div>
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
      const to = sc.beamTo === 'mark' ? sc.mark : sc.crown;
      const dx = (to[0] - sc.helmet[0]) / 100 * w, dy = (to[1] - sc.helmet[1]) / 100 * h;
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
      const icons = this.sc.rewardIcons || [];
      const icon = (k) => { const ic = icons[k] || {}; return ic.svg ? `<i class="${ic.cls}">${FRAGMENT_SVG}</i>` : `<i class="${ic.cls || ''}" style="background-image:url(${ic.img || ''})"></i>`; };
      box.innerHTML = `<div class="cs-reward-card"><h2>${T('Reward')}</h2>${lines.map((l, k) => `<div class="cs-reward-line" style="animation-delay:${0.3 + k * 0.35}s">${icon(k)}<span>${T(l)}</span></div>`).join('')}<p class="cs-tap">${T('Tap to continue')}</p></div>`;
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

  // the scorched metal piece from the Ember Lord's volcano
  const FRAGMENT_SVG = `<svg viewBox="0 0 80 70"><defs><linearGradient id="fgg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c9ccd6"/><stop offset="0.5" stop-color="#6b6f7d"/><stop offset="1" stop-color="#2b2d36"/></linearGradient></defs>
    <path d="M8 22 L30 6 L58 10 L74 30 L64 58 L34 66 L12 52 Z" fill="url(#fgg)" stroke="#ffb347" stroke-width="2.5"/>
    <path d="M22 26 L40 20 L56 30 M28 44 L46 40 L52 50" stroke="#62f0ff" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="32" r="3.5" fill="#ff5a7e"/><path d="M14 50 L22 40 M60 16 L66 26" stroke="#ff7a3a" stroke-width="3" opacity="0.8"/></svg>`;
  Story.FRAGMENT_SVG = FRAGMENT_SVG;
  window.Story = Story;
})();
