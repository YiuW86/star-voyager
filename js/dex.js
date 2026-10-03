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
    { id: 'vexa', name: 'Vexa', title: 'The Ember Eye', level: 4, danger: 4,
      home: 'Warm pools in the Sunfire Dunes', size: 'As big as an armchair', diet: 'Warm pebbles',
      about: 'Vexa is slow, but it throws glowing rocks at anyone who comes too close to its pools.',
      tip: 'Block its rocks with the shield, or shoot them out of the air.',
      fact: 'Its orange eye sees heat instead of light.' },
    { id: 'splash', name: 'Splash', title: 'The Puddle Jumper', level: 3, danger: 1,
      home: 'The coral gardens of the Sunken Lagoon', size: 'As big as a football', diet: 'Rainbow droplets',
      about: 'Splash swims by squeezing its bell and shooting forward, then gliding for a moment. Its queen, the giant Tidequeen, rules the Sunken Lagoon.',
      tip: 'Catch it while it glides between two pushes.',
      fact: 'Its tentacles leave little puddles that sparkle for hours.' },
    { id: 'crysta', name: 'Crysta', title: 'The Shard Knight', level: null, danger: 4,
      home: 'The tallest crystal spires', size: 'Taller than a grown-up', diet: 'Minerals from rocks',
      about: 'Crysta is covered in thick crystal armour. It guards the crystal spires and chases away visitors.',
      tip: 'Aim for the gap around its eyes.',
      fact: 'Crysta grows one new crystal on its birthday every year.' },
    { id: 'pulsar', name: 'Pulsar', title: 'The Beat Keeper', level: 2, danger: 3,
      home: 'The mushroom glades of Glowwood Forest', size: 'As big as a washing machine', diet: 'Radio waves',
      about: 'The bubbles around Pulsar light up to a steady beat, like a drum. It moves toward you in bursts, one beat at a time.',
      tip: 'Catch it between two beats, when it hardly moves.',
      fact: 'When Pulsars meet, they start pulsing together like a band.' },
    { id: 'tidal', name: 'Tidal', title: 'The Horned Wave', level: null, danger: 4,
      home: 'Oceans under the floating islands', size: 'As big as a rowing boat', diet: 'Sea glass',
      about: 'Tidal uses its two big horns to push waves around. Where Tidal goes, the water follows.',
      tip: 'Stay calm when the waves come: it is slow between two waves.',
      fact: 'Its horns start to hum when a storm is coming.' },
    { id: 'nimbus', name: 'Nimbus', title: 'The Cloud Floater', level: 3, danger: 1,
      home: 'The misty deep water of the Sunken Lagoon', size: 'As big as a pillow', diet: 'Fog',
      about: 'Nimbus drifts through the deep water like a little cloud, pushing itself along with slow, gentle strokes.',
      tip: 'It swims slowly and calmly: an easy catch if you are patient.',
      fact: 'When Nimbus sneezes, it makes a tiny rain shower.' },
    { id: 'solara', name: 'Solara', title: 'The Sun Spark', level: 1, danger: 3,
      home: 'Sunny rocks on Crystal Shores', size: 'As big as a sunflower', diet: 'Sunshine',
      about: 'Solara is one of the fastest aliens on Crystal Shores. It zooms toward anything warm.',
      tip: 'Turn aim assist on: it moves fast, but it flies in a straight line.',
      fact: 'It stores sunlight in its petals so it can glow at night.' },
    { id: 'glide', name: 'Glide', title: 'The Wind Rider', level: 2, danger: 3,
      home: 'Air currents above the Glowwood Forest', size: 'Wings as wide as a door', diet: 'Tiny sky bugs',
      about: 'Glide surfs the wind on its huge wings. It reaches you faster than any other alien on Crystal Shores.',
      tip: 'Catch it early, while it is still far away.',
      fact: 'Glide can fly for a whole day without flapping its wings once.' },
    { id: 'vortex', name: 'Vortex', title: 'The Spinning Storm', level: 6, danger: 4,
      home: 'The windy marshes of the Starfall Wetlands', size: 'As big as a car tyre', diet: 'Dust from whirlwinds',
      about: 'Vortex spins around so fast that it makes little whirlwinds. Loose things fly around wherever it goes.',
      tip: 'Wait until it stops spinning to catch its breath.',
      fact: 'No matter how long it spins, Vortex never gets dizzy.' },
    { id: 'prism', name: 'Prism', title: 'The Crystal Thrower', level: 1, danger: 4,
      home: 'Crystal fields on Crystal Shores', size: 'As big as a fridge', diet: 'Light',
      about: 'Prism is built from sharp crystals. It throws crystal rocks at anyone who comes near.',
      tip: 'Shoot its rocks out of the air, or use the shield.',
      fact: 'When Prism laughs, it bends light into little rainbows.' },
    { id: 'orbita', name: 'Orbita', title: 'The Tiny Planet', level: 6, danger: 2,
      home: 'Above the glowing water of the Starfall Wetlands', size: 'As big as a bicycle wheel', diet: 'Space dust',
      about: 'Orbita looks like a small planet, with its own ring and little moons circling around it.',
      tip: 'Its moons circle around it. Catch it when they are behind it.',
      fact: 'The little moons around Orbita are its pets.' },
    { id: 'razor', name: 'Razor', title: 'The Spike Crawler', level: 6, danger: 5,
      home: 'Rocky islands in the Starfall Wetlands', size: 'As big as a dog', diet: 'Metal scraps',
      about: 'Razor scuttles around quickly on its sharp legs. It is one of the hardest aliens to catch.',
      tip: 'Keep your shield ready and wait for it to stop.',
      fact: 'When Razor sleeps, its spikes go as soft as feathers.' },
    { id: 'echo', name: 'Echo', title: 'The Sound Wing', level: 3, danger: 3,
      home: 'The underwater canyons of the Sunken Lagoon', size: 'Wings as wide as a table', diet: 'Sounds',
      about: 'Echo glides through the water on wide fins, like a manta ray, and finds its way by listening to echoes. It throws bubble rocks when it feels threatened.',
      tip: 'Shoot its bubble rocks out of the water, or keep your shield ready.',
      fact: 'Echo can copy any sound it hears.' },
    { id: 'ember', name: 'Ember', title: 'The Flame Dancer', level: 2, danger: 5,
      home: 'Warm hollows deep in Glowwood Forest', size: 'As tall as a grown-up', diet: 'Sparks',
      about: 'Ember flickers and dances like a campfire, and it is quick. It throws glowing fire rocks at anyone who comes close.',
      tip: 'Keep your shield ready for its fire rocks, and catch it early.',
      fact: 'Its flames look hot, but they are actually cold.' },

    // ---- Planet Cindera (the card images are cut from the Cindera roster) ----
    { id: 'ashbloom', planet: 2, name: 'Ashbloom', title: 'The Smoke Flower', level: null, danger: 2,
      home: 'Ash fields around the volcanoes', size: 'As big as a cabbage', diet: 'Warm ash',
      about: 'A rocky flower that puffs out little clouds of warm ash when it is startled.',
      tip: 'Wait until the ash cloud clears, then shoot.',
      fact: 'Its petals are thin slices of cooled lava.' },
    { id: 'flarewisp', planet: 2, name: 'Flarewisp', title: 'The Spark Fox', level: null, danger: 2,
      home: 'Cracks in the cooling lava', size: 'As big as a cat', diet: 'Sparks',
      about: 'A playful little fox made of glowing stone. Its tail flickers like a candle.',
      tip: 'It jumps sideways a lot: aim where it lands.',
      fact: 'Its tail glows brighter when it is happy.' },
    { id: 'stonepuff', planet: 2, name: 'Stonepuff', title: 'The Pebble Cloud', level: null, danger: 1,
      home: 'Floating over hot springs', size: 'As big as a beach ball', diet: 'Steam',
      about: 'A round cloud of pebbles that floats on the warm air above hot springs.',
      tip: 'Slow and gentle: an easy catch.',
      fact: 'It can split into pebbles and come back together.' },
    { id: 'lavaclaw', planet: 2, name: 'Lavaclaw', title: 'The Magma Crab', level: 10, danger: 3,
      home: 'Beaches of Glimmer Coast', size: 'As big as a car tyre', diet: 'Hot rocks',
      about: 'A heavy crab of black rock with glowing lava claws. It cannot fly, so it stomps over the ground toward you.',
      tip: 'It walks straight at you: easy to aim at, but watch out for the rocks it throws and its tail.',
      fact: 'Its claws stay hot for days after a lava swim.' },
    { id: 'infernomoth', planet: 2, name: 'Infernomoth', title: 'The Flame Moth', level: null, danger: 2,
      home: 'Around volcano lights at night', size: 'As wide as an umbrella', diet: 'Heat from lava lamps',
      about: 'A moth with stone wings that glow like embers.',
      tip: 'Its wings flap slowly: shoot between beats.',
      fact: 'It is drawn to any light, even your aiming circle.' },
    { id: 'cinderjelly', planet: 2, name: 'Cinderjelly', title: 'The Ember Jelly', level: null, danger: 2,
      home: 'Floating above lava lakes', size: 'As big as a lampshade', diet: 'Heat bubbles',
      about: 'A jellyfish that swims through hot air instead of water.',
      tip: 'Its glowing tentacles show where it will go next.',
      fact: 'It is cousin to the Nebula of Novara.' },
    { id: 'magmaseed', planet: 2, name: 'Magmaseed', title: 'The Fire Sprout', level: null, danger: 1,
      home: 'Young volcano slopes', size: 'As big as a pineapple', diet: 'Warm minerals',
      about: 'A seed that cracked open in the lava and grew stone leaves.',
      tip: 'It hardly moves: a perfect target.',
      fact: 'One day it will grow into a lava tree.' },
    { id: 'voltspine', planet: 2, name: 'Voltspine', title: 'The Spiky Ball', level: null, danger: 3,
      home: 'Crackling crystal caves', size: 'As big as a football', diet: 'Static sparks',
      about: 'A ball of stone spikes that crackles with little lightning bolts.',
      tip: 'Do not let it roll close: catch it from far away.',
      fact: 'Its spikes all point toward thunderclouds.' },
    { id: 'obsidianray', planet: 2, name: 'Obsidianray', title: 'The Glass Glider', level: null, danger: 3,
      home: 'High up near the volcano tops', size: 'As long as a canoe', diet: 'Volcanic gas',
      about: 'A ray of shiny black glass that glides on hot winds.',
      tip: 'It turns fast: aim ahead of its head.',
      fact: 'It can glide for hours without flapping.' },
    { id: 'pyrosprout', planet: 2, name: 'Pyrosprout', title: 'The Ember Bud', level: null, danger: 1,
      home: 'Gardens of warm stones', size: 'As big as a melon', diet: 'Sunlight and heat',
      about: 'A round bud surrounded by floating seeds of stone.',
      tip: 'Pop the seeds first, then the bud.',
      fact: 'Each floating seed can grow a new Pyrosprout.' },
    { id: 'ravencling', planet: 2, name: 'Ravencling', title: 'The Rock Raven', level: null, danger: 3,
      home: 'Cliffs over the lava rivers', size: 'As big as an eagle', diet: 'Shiny pebbles',
      about: 'A raven of sharp rock plates that loves collecting shiny things.',
      tip: 'It dives at you: shield up, then shoot.',
      fact: 'It hides its treasures in old craters.' },
    { id: 'heatwisp', planet: 2, name: 'Heatwisp', title: 'The Little Sun', level: null, danger: 2,
      home: 'Deep inside warm caves', size: 'As big as a basketball', diet: 'Cave heat',
      about: 'A glowing orb with tiny rocks orbiting it like planets.',
      tip: 'Hit the bright core, not the orbiting rocks.',
      fact: 'It warms up whole caves for the other creatures.' },
    { id: 'cragglet', planet: 2, name: 'Cragglet', title: 'The Rock Hedgehog', level: null, danger: 2,
      home: 'Rocky lava plains', size: 'As big as a dog', diet: 'Crunchy minerals',
      about: 'A spiky rock creature that curls into a ball when scared.',
      tip: 'Catch it before it curls up.',
      fact: 'Its spikes are as sharp as glass.' },
    { id: 'ashdrifter', planet: 2, name: 'Ashdrifter', title: 'The Dust Jelly', level: null, danger: 2,
      home: 'Clouds of volcanic ash', size: 'As big as a lampshade', diet: 'Ash dust',
      about: 'A grey jellyfish that drifts with the ash clouds.',
      tip: 'It hides in ash: look for its glowing tips.',
      fact: 'It glows only when it is close to a friend.' },
    { id: 'firesprout', planet: 2, name: 'Firesprout', title: 'The Ember Pup', level: null, danger: 2,
      home: 'Warm valleys', size: 'As big as a fox', diet: 'Glowing berries',
      about: 'A small four-legged creature with flaming spikes on its back.',
      tip: 'It runs in circles: wait for it to stop.',
      fact: 'It wags its tail like a puppy.' },
    { id: 'skyclad', planet: 2, name: 'Skyclad', title: 'The Crystal Kite', level: null, danger: 3,
      home: 'Windy crystal peaks', size: 'As big as a kite', diet: 'Starlight',
      about: 'A floating crystal with little crystal wings that spin around it.',
      tip: 'Shoot the centre crystal when the wings are open.',
      fact: 'It sings when the wind blows through it.' },
    { id: 'blazetorch', planet: 2, name: 'Blazetorch', title: 'The Torch Beast', level: null, danger: 4,
      home: 'Near erupting volcanoes', size: 'As big as a pony', diet: 'Hot coals',
      about: 'A strong rock creature with flames bursting from its back.',
      tip: 'Very tough: use net grenades.',
      fact: 'It can light up a whole valley at night.' },
    { id: 'scorchwing', planet: 2, name: 'Scorchwing', title: 'The Lava Shark', level: null, danger: 4,
      home: 'Above the lava sea', size: 'As long as a boat', diet: 'Fire fish',
      about: 'A shark-shaped flyer that swoops low over the lava.',
      tip: 'It comes in fast and low: watch the horizon.',
      fact: 'It never lands; it even sleeps while flying.' },
    { id: 'pyrovek', planet: 2, name: 'Pyrovek', title: 'The Ember Spider', level: null, danger: 3,
      home: 'Dark lava tunnels', size: 'As big as a chair', diet: 'Warm crystals',
      about: 'A round creature with glowing claws that scuttles along the tunnel walls.',
      tip: 'Aim at the glowing core in its body.',
      fact: 'It weaves nets of melted glass.' },
    { id: 'emberhive', planet: 2, name: 'Emberhive', title: 'The Crystal Queen', level: null, danger: 5,
      home: 'The heart of the volcano', size: 'As big as a house', diet: 'Pure magma',
      about: 'A huge crystal creature full of glowing chambers. Smaller creatures live inside it.',
      tip: 'Nobody has caught one yet.',
      fact: 'Every Cindera creature is said to have come from an Emberhive.' },
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

    planet: 1,
    render() {
      const grid = $('#dex-grid');
      grid.innerHTML = '';
      // a page per planet
      let tabs = $('#dex-tabs');
      if (!tabs) {
        tabs = document.createElement('div'); tabs.id = 'dex-tabs'; tabs.className = 'dex-tabs';
        grid.parentElement.insertBefore(tabs, grid);
      }
      const T = (x) => (window.t ? window.t(x) : x);
      tabs.innerHTML = [[1, 'Novara'], [2, 'Cindera']].map(([p, n]) => `<button class="btn small ${this.planet === p ? 'pink' : ''}" data-dexp="${p}"><span>${T(n)}</span></button>`).join('');
      tabs.querySelectorAll('[data-dexp]').forEach((b) => b.addEventListener('click', () => { this.planet = Number(b.dataset.dexp); this.render(); }));
      let found = 0;
      const list = ALIENS.filter((a) => (a.planet || 1) === this.planet);
      for (const a of list) {
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
      $('#dex-count').textContent = `Discovered ${found}/${list.length}`;
    },

    show(id) {
      const a = ALIENS.find((x) => x.id === id);
      const n = this.caught(id);
      const panel = $('#dex-detail');
      const levels = (window.SV && window.SV.LEVELS) || {};
      const where = a.level && levels[a.level] ? levels[a.level].name : 'Not spotted yet';
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
