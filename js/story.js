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
    pe: { name: 'Prism Empress', img: 'assets/story/p_prismempress.jpg', side: 'right', color: '#7fe3ff' },
    tq: { name: 'Tidequeen', img: 'assets/story/p_tidequeen.jpg', side: 'right', color: '#ff9ad8' },
    em: { name: 'Echo Monarch', img: 'assets/story/p_echomonarch.jpg', side: 'right', color: '#c79bff' },
    vk: { name: 'Vortex King', img: 'assets/story/p_vortexking.jpg', side: 'right', color: '#ff8ad8' },
    sq: { name: 'Skybloom Queen', img: 'assets/story/p_skybloomqueen.jpg', side: 'right', color: '#ffb0e0' },
    op: { name: 'Orbello Prime', img: 'assets/story/p_orbelloprime.jpg', side: 'right', color: '#9fd8ff' },
    mk: { name: 'Mistwyrm King', img: 'assets/story/p_mistwyrmking.jpg', side: 'right', color: '#c9b6ff' },
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


  // The other rulers (pictures made from the game art for now; can be replaced by real artwork later)
  SCENES.pe = {
    img: 'assets/story/pe_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'lens',
    glow: ['#7fe3ff', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_prismempress.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_prismempress.jpg', cls: 'rw-statue' }, { img: 'assets/dex/prism.png', cls: 'rw-habitat' }, { item: 'lens', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "The Prism Empress lowers her glittering arms. The angry red light inside her crystals turns clear and calm.", fx: 'calm' },
      { who: 'pe', text: "Oh! My reflection... it is MY face again. Not that horrid scowl." },
      { who: 'astro', text: "Are you all right, Your Majesty?" },
      { who: 'pe', text: "Better than all right, little light. That buzzing made me so cross. I even shouted at a flower.", fx: 'hum' },
      { who: 'orbit', text: "Commander, another Mark of Static. It is fading now.", fx: 'scan mark' },
      { who: 'pe', text: "My crystals see everything that shines. Even the \"new stars\" in our sky.", fx: 'stars' },
      { who: 'astro', text: "King Nebula told us about those stars.", fx: 'stars' },
      { who: 'pe', text: "Then hear this: they are not stars. Stars twinkle. These blink. On, off. On, off. Like a machine.", fx: 'stars' },
      { who: 'orbit', text: "Machines circling the planet? That could be where the signal comes from!" },
      { who: 'narr', text: "The Prism Empress breaks off a perfect, clear crystal and holds it out.", fx: 'crystal' },
      { who: 'pe', text: "Take this lens. Look through it, and what is hidden will shine.", fx: 'crystal-held' },
      { who: 'pe', text: "Find who built those blinking lights. And tell them I do not like being shouted at. Not even by myself." },
      { reward: ["Prism Empress is now your Champion!", "New statue in your Spacedome.", "Prism aliens have moved into your habitat.", "New item: Prism Lens (view in the Spacedome)"] },
      { who: 'orbit', text: "Commander... when I looked through the lens, my own scanner blinked too. On, off. Probably nothing." },
    ],
  };
  SCENES.tq = {
    img: 'assets/story/tq_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'shell',
    glow: ['#ff9ad8', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_tidequeen.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_tidequeen.jpg', cls: 'rw-statue' }, { img: 'assets/dex/splash.png', cls: 'rw-habitat' }, { item: 'shell', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "The Tidequeen rises slowly from the water. Bubbles float up around her, soft and quiet.", fx: 'calm' },
      { who: 'tq', text: "Blub... the deep is quiet again. Thank you, little swimmer." },
      { who: 'astro', text: "I'm more of a floater, really. Are you all right?" },
      { who: 'tq', text: "The signal was loudest down in the deep. And inside it... there was a voice. Singing.", fx: 'hum' },
      { who: 'astro', text: "Singing? What did it sing?" },
      { who: 'tq', text: "No words I know. Just one long, cold note. Like a song from very, very far away.", fx: 'hum' },
      { who: 'orbit', text: "The mark on her crown is gone, Commander. And I recorded a piece of that song.", fx: 'scan mark' },
      { who: 'narr', text: "Orbit plays the recording. A low hum fills the lagoon. Orbit's lights flicker.", fx: 'hum' },
      { who: 'orbit', text: "That is strange. My speakers... they want to sing along." },
      { who: 'tq', text: "Your little friend knows this song?" },
      { who: 'orbit', text: "N-no! Of course not. I am a perfectly normal robot. Beep boop." },
      { who: 'narr', text: "The Tidequeen hands over a shimmering shell.", fx: 'crystal' },
      { who: 'tq', text: "Take my Song Shell. It remembers every sound of the sea. Perhaps it will help you remember too.", fx: 'crystal-held' },
      { reward: ["Tidequeen is now your Champion!", "New statue in your Spacedome.", "Splash aliens have moved into your habitat.", "New item: Song Shell (view in the Spacedome)"] },
      { who: 'astro', text: "Orbit... you have never said \"beep boop\" before." },
    ],
  };
  SCENES.em = {
    img: 'assets/story/em_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'stone',
    glow: ['#c79bff', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_echomonarch.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_echomonarch.jpg', cls: 'rw-statue' }, { img: 'assets/dex/echo.png', cls: 'rw-habitat' }, { item: 'stone', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "The Echo Monarch folds his huge wings. The echoes in the cave go silent, one by one.", fx: 'calm' },
      { who: 'em', text: "Free... free... free... Sorry. Old habit." },
      { who: 'astro', text: "Do you repeat everything?" },
      { who: 'em', text: "An echo repeats what it hears. And for many moons, I heard only the signal.", fx: 'hum' },
      { who: 'em', text: "Listen closely, star-walker. I will play it back for you. Slowly.", fx: 'hum' },
      { who: 'narr', text: "The cave fills with the buzzing sound. But slowed down, it turns into... letters.", fx: 'mark' },
      { who: 'em', text: "Vvv... Ooo... Iii... Ddd...", fx: 'hum' },
      { who: 'astro', text: "V... O... I... D. Void?" },
      { who: 'orbit', text: "VOID. Searching... ERROR. Searching... ERR\u2014", fx: 'scan' },
      { who: 'narr', text: "Orbit's lights flash red for a moment. Then they turn green again.", fx: 'flare' },
      { who: 'orbit', text: "Sorry, Commander. Small glitch. All systems normal." },
      { who: 'em', text: "Your little friend is hiding an echo of his own. I can hear it." },
      { who: 'narr', text: "The Echo Monarch drops a smooth, humming stone into your hands.", fx: 'crystal' },
      { who: 'em', text: "Take my Echo Stone. Hold it up, and the truth will always answer.", fx: 'crystal-held' },
      { reward: ["Echo Monarch is now your Champion!", "New statue in your Spacedome.", "Echo aliens have moved into your habitat.", "New item: Echo Stone (view in the Spacedome)"] },
      { who: 'orbit', text: "Commander... I think the name \"Void\" is somewhere in my memory. Behind a locked door." },
    ],
  };
  SCENES.vk = {
    img: 'assets/story/vk_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'compass',
    glow: ['#ff8ad8', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_vortexking.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_vortexking.jpg', cls: 'rw-statue' }, { img: 'assets/dex/vortex.png', cls: 'rw-habitat' }, { item: 'compass', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "The Vortex King stops spinning. The wind over the wetlands drops to a gentle breeze.", fx: 'calm' },
      { who: 'vk', text: "Whoa... the whole world stopped spinning. Oh wait. That was just me." },
      { who: 'astro', text: "You were spinning for quite a while." },
      { who: 'vk', text: "Many moons! And with every spin, the blinking machines pulled energy out of our planet.", fx: 'stars' },
      { who: 'orbit', text: "I see it now, Commander! The machines send Novara's energy into space. All in one direction.", fx: 'scan' },
      { who: 'astro', text: "Where to?" },
      { who: 'vk', text: "Toward the shining planet. Prismara. That is where our energy goes.", fx: 'stars' },
      { who: 'astro', text: "Then that is where we go next." },
      { who: 'narr', text: "The Vortex King spins one last time. A little compass falls into your hands.", fx: 'crystal' },
      { who: 'vk', text: "Take my Star Compass. It always points to where our energy was sent.", fx: 'crystal-held' },
      { who: 'vk', text: "And star-walker... thank you. Novara is free. Every ruler is free." },
      { reward: ["Vortex King is now your Champion!", "New statue in your Spacedome.", "Vortex aliens have moved into your habitat.", "New item: Star Compass (view in the Spacedome)"] },
      { who: 'orbit', text: "Novara is safe, Commander. But on Prismara the signal is even stronger." },
    ],
  };
  SCENES.sq = {
    img: 'assets/story/sq_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'seed',
    glow: ['#ffb0e0', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_skybloomqueen.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_skybloomqueen.jpg', cls: 'rw-statue' }, { img: 'assets/dex/skybloom.png', cls: 'rw-habitat' }, { item: 'seed', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "The Skybloom Queen floats down like a falling petal. All around her, flowers begin to open.", fx: 'calm' },
      { who: 'sq', text: "Ah... the sun feels warm again. My flowers stopped blooming when the buzzing came." },
      { who: 'astro', text: "You had the Mark of Static too?" },
      { who: 'sq', text: "A newer one. Shinier. Someone has been here not long ago.", fx: 'mark' },
      { who: 'orbit', text: "She is right, Commander. This is a newer version of the mark. Someone keeps improving it.", fx: 'scan' },
      { who: 'sq', text: "One night, I saw a dark ship drift past our moons. No lights. No sound. Just a shadow eating the stars.", fx: 'stars' },
      { who: 'astro', text: "A ship... the Void?" },
      { who: 'sq', text: "It stopped above the Moonglass Caves. Then it was gone.", fx: 'stars' },
      { who: 'narr', text: "The Skybloom Queen gives you a tiny, glowing seed.", fx: 'crystal' },
      { who: 'sq', text: "Take this Bloom Seed. Wherever it grows, no signal can reach.", fx: 'crystal-held' },
      { reward: ["Skybloom Queen is now your Champion!", "New statue in your Spacedome.", "Skybloom aliens have moved into your habitat.", "New item: Bloom Seed (view in the Spacedome)"] },
      { who: 'orbit', text: "Moonglass Caves... their mirrors show the truth, Commander. I'm not sure I want to see it." },
    ],
  };
  SCENES.op = {
    img: 'assets/story/op_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'mirror',
    glow: ['#9fd8ff', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_orbelloprime.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_orbelloprime.jpg', cls: 'rw-statue' }, { img: 'assets/dex/orbello.png', cls: 'rw-habitat' }, { item: 'mirror', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "Orbello Prime rolls to a stop. The moonglass walls around him glow silver and clear.", fx: 'calm' },
      { who: 'op', text: "Hmm. My thoughts are round again. Round thoughts are the best thoughts." },
      { who: 'astro', text: "Did you see the dark ship?" },
      { who: 'op', text: "I saw its reflection. My moonglass shows what things really are. Look.", fx: 'scan' },
      { who: 'narr', text: "The giant mirror lights up. It shows the astronaut... and Orbit. Inside Orbit's core, a Mark of Static glows.", fx: 'mark' },
      { who: 'astro', text: "Orbit... you have the mark?!", fx: 'mark' },
      { who: 'orbit', text: "I... I don't understand. I don't remember..." },
      { who: 'op', text: "The mirror never lies, little robot. You were built by the same hands that built the machines." },
      { who: 'orbit', text: "Then... the Void made me. As a scout. To find planets for him.", fx: 'hum' },
      { who: 'narr', text: "Orbit sinks down to the ground. His lights turn dim and blue." },
      { who: 'orbit', text: "Commander... maybe you should not trust me." },
      { who: 'astro', text: "Orbit. You've saved me a hundred times. You're my friend. That's what matters." },
      { who: 'orbit', text: "...Thank you, Commander." },
      { who: 'narr', text: "Orbello Prime hands over a small, round mirror.", fx: 'crystal' },
      { who: 'op', text: "Take this Moon Mirror. When you doubt yourselves, look into it.", fx: 'crystal-held' },
      { reward: ["Orbello Prime is now your Champion!", "New statue in your Spacedome.", "Orbello aliens have moved into your habitat.", "New item: Moon Mirror (view in the Spacedome)"] },
      { who: 'orbit', text: "I want to fix this, Commander. The Mistwyrm King knows the way to the Void. Let us go." },
    ],
  };
  SCENES.mk = {
    img: 'assets/story/mk_scene.jpg', ratio: 1671 / 941,
    helmet: [31.2, 59.0], crown: [60.0, 22.8], mark: [60.0, 48.5], boss: [60.0, 51.0], beamTo: 'mark', itemSvg: 'scale',
    glow: ['#c9b6ff', 'rgba(255, 255, 255, 0.35)'],
    rewardIcons: [{ img: 'assets/story/p_mistwyrmking.jpg', cls: 'rw-champ' }, { img: 'assets/story/p_mistwyrmking.jpg', cls: 'rw-statue' }, { img: 'assets/dex/vaporis.png', cls: 'rw-habitat' }, { item: 'scale', cls: 'rw-item' }],
    steps: [
      { who: 'narr', text: "The Mistwyrm King uncurls his long, misty body. The thick fog on Petal Peaks begins to thin.", fx: 'calm' },
      { who: 'mk', text: "The fog in my head is gone. And the fog on my mountain too, I see." },
      { who: 'astro', text: "We need to find the Void. Do you know where he is?" },
      { who: 'mk', text: "My mist covers everything, so I see everything. Even the planet that has no name.", fx: 'stars' },
      { who: 'mk', text: "Behold.", fx: 'stars' },
      { who: 'narr', text: "The mist opens like a curtain. Far away, a dark purple planet appears. Nobody knows its name.", fx: 'stars' },
      { who: 'orbit', text: "Planet ????. The Void's home. That is where the signal begins.", fx: 'scan' },
      { who: 'mk', text: "Your little robot still carries the mark. The Void will hear him coming.", fx: 'mark' },
      { who: 'orbit', text: "Not anymore.", fx: 'mark' },
      { who: 'narr', text: "Orbit's core glows bright white. With a loud crack, the Mark of Static breaks into pieces.", fx: 'flare markfade' },
      { who: 'orbit', text: "I choose who I am. And I choose to be your friend, Commander." },
      { who: 'astro', text: "Welcome back, partner." },
      { who: 'narr', text: "The Mistwyrm King drops a shining scale from his tail.", fx: 'crystal' },
      { who: 'mk', text: "Brave little lights. Take my Mist Scale. It will hide you on your way.", fx: 'crystal-held' },
      { reward: ["Mistwyrm King is now your Champion!", "New statue in your Spacedome.", "Vaporis aliens have moved into your habitat.", "The road to planet ???? is open!"] },
      { who: 'orbit', text: "The Void is waiting, Commander. Let us end this." },
    ],
  };

  const Story = {
    orbitDesign: () => 0,          // set by the menus: which of the 9 Orbit designs the player chose
    active: false,

    play(id, onDone, opts) {
      let sc = SCENES[id];
      if (!sc) { if (onDone) onDone(); return; }
      // replay from the Cinema: the conversation only, without the reward screen
      if (opts && opts.replay) sc = { ...sc, steps: sc.steps.filter((x) => !x.reward) };
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
          <div class="cs-crystal" style="${pos(sc.boss)}">${sc.itemSvg ? ITEM_SVG(sc.itemSvg) : sc.item === 'fragment' ? FRAGMENT_SVG : CRYSTAL_SVG}</div>
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
      const icon = (k) => { const ic = icons[k] || {}; if (ic.item) return `<i class="${ic.cls}">${ITEM_SVG(ic.item)}</i>`; return ic.svg ? `<i class="${ic.cls}">${FRAGMENT_SVG}</i>` : `<i class="${ic.cls || ''}" style="background-image:url(${ic.img || ''})"></i>`; };
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
  // small pictures of the gifts from the rulers
  function ITEM_SVG(kind) {
    const g = (id, a, b, c) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="0.5" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs>`;
    const S = {
      lens: `${g('il1', '#f0fdff', '#7fe3ff', '#1c8fd8')}<circle cx="40" cy="36" r="26" fill="url(#il1)" stroke="#fff" stroke-width="3"/><path d="M26 26 L40 18 L54 26 L54 46 L40 54 L26 46 Z" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2"/><circle cx="32" cy="28" r="5" fill="#fff" opacity="0.8"/>`,
      shell: `${g('il2', '#fff0fa', '#ff9ad8', '#a83a8a')}<path d="M40 62 C14 60 8 30 22 14 C30 22 34 10 40 8 C46 10 50 22 58 14 C72 30 66 60 40 62 Z" fill="url(#il2)" stroke="#fff" stroke-width="3"/><path d="M40 60 L40 14 M30 58 L24 20 M50 58 L56 20" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>`,
      stone: `${g('il3', '#f0e6ff', '#b99bff', '#4a2a8a')}<ellipse cx="40" cy="38" rx="30" ry="24" fill="url(#il3)" stroke="#fff" stroke-width="3"/><path d="M20 38 Q30 26 40 38 T60 38" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M26 46 Q34 38 40 46 T54 46" fill="none" stroke="rgba(255,255,255,0.6)" stroke-width="2"/>`,
      compass: `${g('il4', '#ffe0f4', '#ff8ad8', '#7a1a6a')}<circle cx="40" cy="36" r="28" fill="url(#il4)" stroke="#fff" stroke-width="3"/><path d="M40 12 L48 36 L40 60 L32 36 Z" fill="#fff4c9" stroke="#fff" stroke-width="1.5"/><path d="M40 12 L48 36 L32 36 Z" fill="#ff5a7e"/><circle cx="40" cy="36" r="4" fill="#0a1440"/>`,
      seed: `${g('il5', '#fff6e0', '#ffd27a', '#ff8ad8')}<path d="M40 8 C62 26 62 50 40 64 C18 50 18 26 40 8 Z" fill="url(#il5)" stroke="#fff" stroke-width="3"/><path d="M40 16 L40 58 M40 30 L30 24 M40 42 L50 36" stroke="#5aa86a" stroke-width="3" stroke-linecap="round"/>`,
      mirror: `${g('il6', '#ffffff', '#cfe8ff', '#6a8ac8')}<circle cx="40" cy="34" r="26" fill="url(#il6)" stroke="#ffd27a" stroke-width="5"/><path d="M40 60 L40 68" stroke="#ffd27a" stroke-width="6" stroke-linecap="round"/><path d="M28 22 Q36 16 46 20" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>`,
      scale: `${g('il7', '#f6f0ff', '#c9b6ff', '#6a4ab8')}<path d="M40 8 C60 18 66 38 52 58 L40 66 L28 58 C14 38 20 18 40 8 Z" fill="url(#il7)" stroke="#fff" stroke-width="3"/><path d="M40 14 C50 24 50 44 40 60 M40 14 C30 24 30 44 40 60" stroke="rgba(255,255,255,0.6)" stroke-width="2" fill="none"/>`,
    };
    return `<svg viewBox="0 0 80 72">${S[kind] || S.lens}</svg>`;
  }
  Story.ITEM_SVG = ITEM_SVG;
  Story.SCENES = SCENES;
  window.Story = Story;
})();
