// Alien guide (encyclopedia): card images, alien facts and the guide screen.
(function () {
  // In the same order as the cards in the artwork (5 per row).
  // level: where the alien can be caught right now (null = not in the game yet)
  const ALIENS = [
    { id: 'nebula', name: 'Nebula', title: 'The Drifting Dreamer', level: 1, danger: 1,
      home: 'The sky pools above Crystal Shores', size: 'As big as a beach ball', diet: 'Starlight dust',
      about: 'Nebula floats slowly toward anything that glows. It is curious rather than dangerous, and its dome gets brighter when it is happy.',
      tip: 'Slow and steady, a perfect first catch. Hold the circle on its dome.',
      fact: 'Its dome shows the colours of the last nebula it drifted through.' },
    { id: 'zephyr', name: 'Zephyr', title: 'The Wind Sprite', level: null, danger: 2,
      home: 'Floating wind gardens', size: 'About as big as a pigeon', diet: 'Pollen from sky flowers',
      about: 'Zephyr darts around in zigzags on four humming wings. It is almost never still for more than a second.',
      tip: 'Aim a little ahead of where it is flying.',
      fact: 'The balls on its antennae can pick up radio music from far away.' },
    { id: 'glix', name: 'Glix', title: 'The Bubble Blob', level: null, danger: 2,
      home: 'Fizzy lakes on the moon', size: 'As big as a bean bag', diet: 'Sparkling moon water',
      about: 'Glix is made of hundreds of little bubbles stuck together. When it gets scared it splits into smaller blobs.',
      tip: 'A net grenade catches all of its bubbles at once.',
      fact: 'When its bubbles pop they sound like a tiny xylophone.' },
    { id: 'orbit', name: 'Orbit', title: 'The Watcher', level: null, danger: 3,
      home: 'Deep moon craters', size: 'As tall as a kitchen chair', diet: 'Meteorite crumbs',
      about: 'Orbit has one enormous eye that can see all the way around. It walks on four thin legs and stops to stare at anything new.',
      tip: 'Catch it while it stops to stare.',
      fact: 'Its eye glows pink when it recognises a friend.' },
    { id: 'lumora', name: 'Lumora', title: 'The Star Flower', level: null, danger: 2,
      home: 'Glowing crystal caves', size: 'As big as a dinner plate', diet: 'Moonlight',
      about: 'Lumora looks like a flower made of ice. It only opens its petals at night, when it can soak up moonlight.',
      tip: 'Aim for the glowing heart in the middle.',
      fact: 'One Lumora gives off enough light to light up a whole cave.' },
    { id: 'skyra', name: 'Skyra', title: 'The Sky Squid', level: null, danger: 2,
      home: 'Between the clouds', size: 'As long as a surfboard', diet: 'Cloud plankton',
      about: 'Skyra swims through the clouds like a squid swims through the sea, carrying a little lantern on its head.',
      tip: 'Follow its lantern light when it hides in the clouds.',
      fact: 'It uses its lantern to lead lost baby aliens back home.' },
    { id: 'vexa', name: 'Vexa', title: 'The Ember Eye', level: 1, danger: 4,
      home: 'Warm pools on Crystal Shores', size: 'As big as an armchair', diet: 'Warm pebbles',
      about: 'Vexa is slow, but it throws glowing rocks at anyone who comes too close to its pools.',
      tip: 'Block its rocks with the shield, or shoot them out of the air.',
      fact: 'Its orange eye sees heat instead of light.' },
    { id: 'splash', name: 'Splash', title: 'The Puddle Jumper', level: null, danger: 1,
      home: 'Waterfalls of the floating islands', size: 'As big as a football', diet: 'Rainbow droplets',
      about: 'Splash loves to hop from waterfall to waterfall. It is playful and friendly, and it never stays dry for long.',
      tip: 'Catch it just as it lands after a jump.',
      fact: 'Its tentacles leave little puddles that sparkle for hours.' },
    { id: 'crysta', name: 'Crysta', title: 'The Shard Knight', level: null, danger: 4,
      home: 'The tallest crystal spires', size: 'Taller than a grown-up', diet: 'Minerals from rocks',
      about: 'Crysta is covered in thick crystal armour. It guards the crystal spires and chases away visitors.',
      tip: 'Aim for the gap around its eyes.',
      fact: 'Crysta grows one new crystal on its birthday every year.' },
    { id: 'pulsar', name: 'Pulsar', title: 'The Beat Keeper', level: null, danger: 3,
      home: 'Star clusters with lots of noise', size: 'As big as a washing machine', diet: 'Radio waves',
      about: 'The bubbles around Pulsar light up to a steady beat, like a drum.',
      tip: 'Wait for its beat and catch it between two pulses.',
      fact: 'When Pulsars meet, they start pulsing together like a band.' },
    { id: 'tidal', name: 'Tidal', title: 'The Horned Wave', level: null, danger: 4,
      home: 'Oceans under the floating islands', size: 'As big as a rowing boat', diet: 'Sea glass',
      about: 'Tidal uses its two big horns to push waves around. Where Tidal goes, the water follows.',
      tip: 'Stay calm when the waves come: it is slow between two waves.',
      fact: 'Its horns start to hum when a storm is coming.' },
    { id: 'nimbus', name: 'Nimbus', title: 'The Cloud Floater', level: null, danger: 1,
      home: 'Misty valleys', size: 'As big as a pillow', diet: 'Fog',
      about: 'Nimbus hides inside mist and fog. You usually only see its glowing eyes.',
      tip: 'Look for two little lights in the mist.',
      fact: 'When Nimbus sneezes, it makes a tiny rain shower.' },
    { id: 'solara', name: 'Solara', title: 'The Sun Spark', level: 1, danger: 3,
      home: 'Sunny rocks on Crystal Shores', size: 'As big as a sunflower', diet: 'Sunshine',
      about: 'Solara is one of the fastest aliens on Crystal Shores. It zooms toward anything warm.',
      tip: 'Turn aim assist on: it moves fast, but it flies in a straight line.',
      fact: 'It stores sunlight in its petals so it can glow at night.' },
    { id: 'glide', name: 'Glide', title: 'The Wind Rider', level: 1, danger: 3,
      home: 'Air currents above Crystal Shores', size: 'Wings as wide as a door', diet: 'Tiny sky bugs',
      about: 'Glide surfs the wind on its huge wings. It reaches you faster than any other alien on Crystal Shores.',
      tip: 'Catch it early, while it is still far away.',
      fact: 'Glide can fly for a whole day without flapping its wings once.' },
    { id: 'vortex', name: 'Vortex', title: 'The Spinning Storm', level: null, danger: 4,
      home: 'Windy plains', size: 'As big as a car tyre', diet: 'Dust from whirlwinds',
      about: 'Vortex spins around so fast that it makes little whirlwinds. Loose things fly around wherever it goes.',
      tip: 'Wait until it stops spinning to catch its breath.',
      fact: 'No matter how long it spins, Vortex never gets dizzy.' },
    { id: 'prism', name: 'Prism', title: 'The Crystal Thrower', level: 1, danger: 4,
      home: 'Crystal fields on Crystal Shores', size: 'As big as a fridge', diet: 'Light',
      about: 'Prism is built from sharp crystals. It throws crystal rocks at anyone who comes near.',
      tip: 'Shoot its rocks out of the air, or use the shield.',
      fact: 'When Prism laughs, it bends light into little rainbows.' },
    { id: 'orbita', name: 'Orbita', title: 'The Tiny Planet', level: null, danger: 2,
      home: 'Empty space between the stars', size: 'As big as a bicycle wheel', diet: 'Space dust',
      about: 'Orbita looks like a small planet, with its own ring and little moons circling around it.',
      tip: 'Its moons circle around it. Catch it when they are behind it.',
      fact: 'The little moons around Orbita are its pets.' },
    { id: 'razor', name: 'Razor', title: 'The Spike Crawler', level: null, danger: 5,
      home: 'Dark rocky caves', size: 'As big as a dog', diet: 'Metal scraps',
      about: 'Razor scuttles around quickly on its sharp legs. It is one of the hardest aliens to catch.',
      tip: 'Keep your shield ready and wait for it to stop.',
      fact: 'When Razor sleeps, its spikes go as soft as feathers.' },
    { id: 'echo', name: 'Echo', title: 'The Sound Wing', level: null, danger: 3,
      home: 'Canyons with lots of echoes', size: 'Wings as wide as a table', diet: 'Sounds',
      about: 'Echo finds its way by listening to echoes, like a bat. It can hear you coming from far away.',
      tip: 'Move slowly and quietly, and catch it by surprise.',
      fact: 'Echo can copy any sound it hears.' },
    { id: 'ember', name: 'Ember', title: 'The Flame Dancer', level: null, danger: 5,
      home: 'Volcano rims', size: 'As tall as a grown-up', diet: 'Sparks',
      about: 'Ember flickers and dances like a campfire. It is very rare and very hard to catch.',
      tip: 'Only the most skilled space catchers have ever seen one.',
      fact: 'Its flames look hot, but they are actually cold.' },
  ];

  const $ = (s, root = document) => root.querySelector(s);

  const Dex = {
    ALIENS,
    save: null,
    persist: null,

    init({ save, persist }) { this.save = save; this.persist = persist; },
    setSave(save) { this.save = save; },

    caught(id) { return (this.save.dex && this.save.dex[id]) || 0; },

    // Called for every catch. Returns true the first time an alien is caught.
    record(id) {
      if (!this.save.dex) this.save.dex = {};
      if (!this.save.dexNew) this.save.dexNew = {};
      const first = !this.save.dex[id];
      this.save.dex[id] = (this.save.dex[id] || 0) + 1;
      if (first) this.save.dexNew[id] = true;
      this.persist();
      return first;
    },

    render() {
      const grid = $('#dex-grid');
      grid.innerHTML = '';
      let found = 0;
      for (const a of ALIENS) {
        const n = this.caught(a.id);
        if (n) found++;
        const b = document.createElement('button');
        b.className = 'dex-card' + (n ? '' : ' locked');
        b.dataset.id = a.id;
        b.setAttribute('aria-label', n ? a.name : 'Unknown alien');
        b.innerHTML = `<img src="assets/dex/${a.id}${n ? '' : '-locked'}.png" alt="">`
          + (n ? '' : '<span class="dex-q">???</span>')
          + (this.save.dexNew && this.save.dexNew[a.id] ? '<span class="dex-new">New</span>' : '');
        b.addEventListener('click', () => this.show(a.id));
        grid.appendChild(b);
      }
      $('#dex-count').textContent = `Discovered ${found}/${ALIENS.length}`;
    },

    show(id) {
      const a = ALIENS.find((x) => x.id === id);
      const n = this.caught(id);
      const panel = $('#dex-detail');
      const where = a.level ? `Crystal Shores (level ${a.level})` : 'Not spotted yet';
      if (!n) {
        panel.innerHTML = `
          <img class="dex-big" src="assets/dex/${a.id}-locked.png" alt="">
          <div class="dex-info">
            <h2>Unknown alien</h2>
            <p class="dex-title">Not discovered yet</p>
            <p>Catch one to unlock its page in the alien guide.</p>
            <dl><dt>Where to find it</dt><dd>${a.level ? where : 'In a level that has not been reached yet'}</dd></dl>
          </div>`;
      } else {
        const stars = '<i class="on"></i>'.repeat(a.danger) + '<i></i>'.repeat(5 - a.danger);
        panel.innerHTML = `
          <img class="dex-big" src="assets/dex/${a.id}.png" alt="${a.name}">
          <div class="dex-info">
            <h2>${a.name}</h2>
            <p class="dex-title">${a.title}</p>
            <p>${a.about}</p>
            <dl>
              <dt>Home</dt><dd>${a.home}</dd>
              <dt>Size</dt><dd>${a.size}</dd>
              <dt>Eats</dt><dd>${a.diet}</dd>
              <dt>Found in</dt><dd>${where}</dd>
              <dt>Danger</dt><dd><span class="danger" aria-label="${a.danger} out of 5">${stars}</span></dd>
              <dt>Times caught</dt><dd>${n}</dd>
            </dl>
            <p class="dex-tip"><b>Catching tip:</b> ${a.tip}</p>
            <p class="dex-fact"><b>Did you know?</b> ${a.fact}</p>
          </div>`;
        if (this.save.dexNew && this.save.dexNew[id]) {
          delete this.save.dexNew[id];
          this.persist();
          const badge = $(`.dex-card[data-id="${id}"] .dex-new`);
          if (badge) badge.remove();
        }
      }
      $('#ov-dex').classList.add('show');
    },

    hide() { $('#ov-dex').classList.remove('show'); },
    detailOpen() { return $('#ov-dex').classList.contains('show'); },
  };

  window.Dex = Dex;
})();
