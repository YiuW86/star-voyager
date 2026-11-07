// Level 1 gameplay. Everything is drawn in a 1920x1080 coordinate space.
(function () {
  // Height is always 1080; the width follows the screen shape ("expand" mode): 1920 on a 16:9 TV,
  // about 2376 on a wide phone. Everything is placed relative to W, so wider screens show more world.
  let W = 1920;
  const H = 1080;
  let GOAL = 10;                                     // goal of the level being played (largest per kind)
  let GOALMAP = {};                                  // how many of each kind this level asks for
  const goalOf = (t) => (GOALMAP[t] != null ? GOALMAP[t] : GOAL);
  // Worlds (environments): background, the (at most 3) kinds of aliens, and the boss of the last level.
  // Every boss is a giant crowned version of an alien that has not been a boss before.
  const LEVELS = {
    1: { name: 'Crystal Shores', bg: 'assets/level1.jpg', types: ['nebula', 'prism', 'solara'],
         boss: { name: 'King Nebula', sprite: 'nebula', hp: 20 } },
    2: { name: 'Glowwood Forest', bg: 'assets/level2.jpg', video: { src: 'assets/glowwood.mp4', flow: 'glowwood' }, types: ['pulsar', 'ember', 'glide'],
         boss: { name: 'Prism Empress', sprite: 'prism', hp: 24 } },
    // Underwater: aliens swim and bubbles rise
    3: { name: 'Sunken Lagoon', bg: 'assets/level3.jpg', types: ['nimbus', 'splash', 'echo'], underwater: true,
         boss: { name: 'Tidequeen', sprite: 'splash', hp: 28 } },
    4: { name: 'Sunfire Dunes', bg: 'assets/level4.jpg', types: ['vexa', 'solara', 'prism'],
         boss: { name: 'Ember Lord', sprite: 'ember', hp: 32 } },
    5: { name: 'Moonlit Cavern', bg: 'assets/level5.jpg', types: ['glide', 'nebula', 'echo'],
         boss: { name: 'Echo Monarch', sprite: 'echo', hp: 36 } },
    6: { name: 'Starfall Wetlands', bg: 'assets/level6.jpg', types: ['orbita', 'razor', 'vortex'],
         boss: { name: 'Vortex King', sprite: 'vortex', hp: 40 } },
    // Endless: wave after wave through all worlds; every 5th wave is a boss
    8: { name: 'Endless', bg: 'assets/level1.jpg', types: [], endless: true },
    // Planet Cindera has no playable worlds right now (its worlds show as 'Soon available')
    // Planet Prismara: unlocks after Starfall Wetlands (after: 6). rank = difficulty step after the Novara worlds.
    // The backgrounds are borrowed from Novara until Prismara has its own pictures.
    // The mystery planet ????: one world, open right away (free), reached through its opening film.
    // void: the level map uses the purple-black level icons
    30: { name: '????', planet: 5, free: true, void: true, rank: 7, bg: 'assets/void-bg.jpg',
          types: ['echo', 'vortex', 'razor'], boss: { name: 'The Void', sprite: 'void', void: true, hp: 120 } },
    20: { name: 'Bubble Shallows', planet: 3, after: 6, rank: 7, bg: 'assets/level3.jpg', underwater: true,
          types: ['orblet', 'skybloom', 'slimora'], boss: { name: 'Skybloom Queen', sprite: 'skybloom', hp: 30 } },
    21: { name: 'Moonglass Caves', planet: 3, rank: 8, bg: 'assets/level5.jpg',
          types: ['orbello', 'emberoo', 'vaporis'], boss: { name: 'Orbello Prime', sprite: 'orbello', hp: 34 } },
    22: { name: 'Petal Peaks', planet: 3, rank: 9, bg: 'assets/level1.jpg',
          types: ['floravex', 'vaporis', 'orblet'], boss: { name: 'Mistwyrm King', sprite: 'vaporis', hp: 38 } },
  };
  // Levels with a video background. The player walks through the video in steps: aliens only come
  // while standing still at a stop. Once that group is caught, the video plays on to the next stop.
  // Each stop is one round of aliens: round = how many aliens come per round. The number of stops
  // follows from that (the first and the last frame of the video count as stops).
  // e.g. '1-1': { src: 'assets/walk1.mp4', round: 5 } = world 1, level 1; '3': {...} = every level of world 3.
  // Empty for now: all worlds use their static background again.
  const WALKS = {};

  // Each world has 10 levels. Levels 1-9 are regular, level 10 ends with the world's boss.
  // Every level asks for 15 to 20 aliens in total, spread over its kinds of aliens.
  // Early levels have 2 kinds of aliens, later ones 3; the boss level asks for 15 plus the boss.
  // Special levels, the same in every world (levels 1-2 normal, 10 = boss):
  //  3 rescue: protect a friendly alien in a bubble · 4 only: catch one kind, leave the others
  //  5 mini: a giant red mini-boss crashes down · 6 survive: stay alive 60 seconds
  //  7 storm: a meteor storm halfway · 8 dark: your aim is a flashlight · 9 crystal: aliens attack your crystal
  const SPECIALS = { 3: 'rescue', 4: 'only', 5: 'mini', 6: 'survive', 7: 'storm', 8: 'dark', 9: 'crystal' };
  const SPECIAL_INFO = {
    rescue: { title: 'Rescue!', sub: 'Protect the friendly alien in the bubble', tag: 'Rescue' },
    only: { title: 'Only catch {name}!', sub: 'Leave the other aliens alone', tag: 'One kind' },
    mini: { title: 'Warning: mini-boss!', sub: 'A giant alien will crash down', tag: 'Mini-boss' },
    survive: { title: 'Survive 60 seconds!', sub: 'Stay alive until the timer runs out', tag: 'Survive' },
    storm: { title: 'Meteor storm ahead!', sub: 'Shoot the meteors before they hit you', tag: 'Meteor storm' },
    dark: { title: 'Lights out!', sub: 'Your aim is your flashlight', tag: 'Dark' },
    crystal: { title: 'Protect your crystal!', sub: 'Aliens attack the crystal, not you', tag: 'Protect' },
  };
  const BOSS_INTRO = 3.6;         // seconds of the boss entrance
  // Training steps (in order); the last one is a short real wave
  const TUT_STEPS = ['aim', 'fire', 'reload', 'armour', 'shield', 'net', 'final', 'done'];
  const TUT_FINAL = TUT_STEPS.indexOf('final');
  // what the child is told; {aim} {fire} {reload} {shield} {grenade} become the right button for their controls
  const TUT_TEXT = {
    aim: ['First: aiming! Use {aim} to move your aiming circle onto the glowing ring.', 'Tip: follow the arrow. Keep the circle on the ring for a moment.'],
    fire: ['Great aim! Here comes an alien. Put the circle on it and press {fire} to catch it.', 'Tip: first move the circle onto the alien, then press {fire}.'],
    reload: ['Oh no, your blaster is empty! Press {reload} to reload.', 'Tip: press {reload}. The little bars at the bottom show your shots.'],
    armour: ['This alien wears armour. It needs a few hits. Keep pressing {fire}!', 'Tip: keep the circle on it and press {fire} again and again.'],
    shield: ['Watch out, this one throws rocks! Press {shield} to hold up your shield, and block a rock.', 'Tip: press {shield} before the rock reaches you.'],
    net: ['Three at once! Press {grenade} for a net grenade, aim at the group, then press {fire} to throw it.', 'Tip: you can also catch them one by one with {fire}.'],
    final: ['Final test! Catch 5 aliens. Careful, now they can hit back!', 'You can do it, Commander!'],
    done: ['Training complete! You are a real Cadet now!', ''],
  };
  const TUT_GLOW = { aim: 'stick', fire: 'fire', reload: 'reload', armour: 'fire', shield: 'shield', net: 'grenade', final: null, done: null };
  const SURVIVE_TIME = 60;
  function specialOf(world, stage) {
    const w = LEVELS[world];
    if (!w || w.plat || w.endless) return null;
    return SPECIALS[stage] || null;
  }
  // Orbit, your robot buddy, talks during levels (small speech bubbles)
  const ORBIT_LINES = {
    hello: ["Let's catch some aliens, Commander!", 'Scanners on. Here they come!', 'Ready when you are, Commander!'],
    rescue: ['A friendly alien is trapped! Keep the attackers away from the bubble!', 'Aliens with a red ! are going for the bubble. Stop them first!'],
    only: ['Only the aliens on the list, Commander. Leave the others alone!'],
    mini: ['My sensors pick up something BIG. Stay sharp!'],
    survive: ['Just stay alive for one minute. You can do it!'],
    storm: ['Weather report: cloudy, with a chance of METEORS.'],
    dark: ["It's dark in here... good thing your blaster has a flashlight!"],
    crystal: ['Guard the crystal! If it breaks, we lose.'],
    armour: ['Watch out, armoured ones! They need more hits.', 'That one has armour. Keep shooting!'],
    low: ['Health low, Commander! Use your shield!', 'Ouch! Careful, your health is low!'],
    combo: ['Nice combo, Commander!', 'Wow, you are on fire!', 'Amazing catches!'],
    hyper: ['HYPER MODE! Double points, go go go!'],
    boss: ['That is the ruler of this world. Free them from the mark!', 'Here comes the boss. Remember: shield up when it attacks!'],
    miniNow: ['MINI-BOSS! It has a lot of health. Keep hitting it!'],
    stormNow: ['Meteors incoming! Shoot them out of the sky!'],
    friendLow: ['The bubble is cracking! Protect it!'],
    guardLow: ['The crystal is almost broken! Hurry!'],
    dizzy: ['Whoa, everything is spinning... hang in there!'],
    win: ['Great job, Commander!', 'Level clear! High five! ...I have no hands. Low five?'],
    joke: ['Why did the alien bring a ladder? To reach the next level!', "Why don't aliens eat clowns? They taste funny!",
      'What do you call a sleeping alien? An unidentified sleeping object!', 'I asked a star for a joke. It was too bright for me.',
      'Fun fact: robots like me run on batteries... and cookies. Mostly batteries.', 'How do aliens keep their pants up? With an asteroid belt!'],
  };
  // Moving backgrounds: a looping film instead of the picture (all levels of the world).
  // Measured from the film, 4 samples per second: how fast the camera moves forward (1 = average)
  // and how quickly the picture slides sideways / up and down (in screen widths / heights per second).
  // Aliens come closer faster when the camera rushes forward, and slide along with the scenery when it turns.
  const BG_RATE = 1;             // playing speed of the film in normal levels (original speed)
  const BG_SPEED_EFFECT = 0.55;  // how strongly the film's rushing / slowing changes the aliens' speed (1 = fully)
  const BG_FLOW = { glowwood: {"speed":[0.5,0.64,0.66,0.72,0.81,0.83,0.79,0.78,0.73,0.69,0.7,0.8,0.91,1.02,1.2,1.49,1.7,1.7,1.43,0.74,1.07,1.59,1.1,0.85,1.17,1.16,1.28,1.37,1.25,1.18,1.25,1.24,1.21,1.24,1.24,1.27,1.25,1.17,0.98,0.73,0.71,0.74,0.71,0.66,0.6,0.55,0.56,0.67,0.97,1.54,1.7,1.7,1.4,1.7,1.7,1.25,1.32,1.39,1.64,1.7,1.69,1.54,1.45,1.34,1.27,1.23,1.25,1.32,1.36,1.32,1.17,1.05,0.89,0.7,0.63,0.61,0.6,0.56,0.5,0.5,0.5,0.56,0.63,0.67,0.72,0.84,1.04,1.16,0.92,0.89,1.02,1.17,1.32,1.42,1.49,1.52,1.54,1.55,1.54,1.49,1.41,1.18,0.91,0.78,0.67,0.57,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],"panX":[0.055,0.056,0.023,0.004,0.002,0.002,0.002,0.003,0.012,0.029,0.062,0.101,0.127,0.14,0.136,0.122,0.092,0.051,0.015,-0.001,-0.033,-0.096,-0.172,-0.246,-0.303,-0.308,-0.28,-0.217,-0.118,-0.028,0.03,0.09,0.127,0.121,0.083,0.052,0.039,0.033,0.03,0.028,0.025,0.024,0.026,0.033,0.044,0.062,0.081,0.112,0.193,0.303,0.335,0.226,0.107,0.07,0.046,0.03,0.028,0.024,0.021,0.012,0.012,0.015,0.017,0.024,0.035,0.047,0.056,0.061,0.06,0.056,0.049,0.038,0.027,0.019,0.012,0.005,-0.0,-0.032,-0.105,-0.177,-0.232,-0.268,-0.293,-0.307,-0.307,-0.285,-0.234,-0.155,-0.061,0.032,0.079,0.093,0.108,0.125,0.142,0.144,0.136,0.116,0.097,0.08,0.062,0.046,0.034,0.027,0.024,0.022,0.021,0.019,0.017,0.015,0.013,0.013,0.011,0.011,0.01,0.009,0.009,0.014,0.033],"panY":[-0.011,-0.052,-0.057,-0.052,-0.04,-0.032,-0.026,-0.019,-0.015,-0.019,-0.027,-0.033,-0.036,-0.044,-0.045,-0.044,-0.043,-0.039,-0.024,-0.023,-0.032,-0.039,-0.046,-0.062,-0.066,-0.067,-0.061,-0.057,-0.044,-0.027,-0.005,0.023,0.081,0.159,0.237,0.291,0.314,0.271,0.163,0.014,-0.129,-0.231,-0.288,-0.321,-0.31,-0.275,-0.239,-0.21,-0.166,-0.117,-0.073,-0.012,0.05,0.029,-0.001,-0.008,-0.039,-0.068,-0.067,-0.045,-0.014,-0.003,-0.01,-0.017,-0.016,-0.01,-0.006,-0.005,-0.006,-0.009,-0.013,-0.021,-0.029,-0.032,-0.033,-0.03,-0.031,-0.048,-0.079,-0.103,-0.121,-0.133,-0.141,-0.149,-0.156,-0.153,-0.136,-0.103,-0.062,-0.026,0.004,0.037,0.08,0.128,0.18,0.202,0.209,0.226,0.23,0.212,0.17,0.109,0.063,0.048,0.038,0.031,0.027,0.023,0.016,0.011,0.008,0.006,0.002,-0.001,-0.005,-0.009,-0.012,-0.011,-0.004]} };
  const STAGES = 10;
  const TOTALS = [14, 15, 16, 16, 17, 17, 18, 19, 20, 15];
  function stageConfig(world, stage) {
    const w = LEVELS[world];
    if (w.plat) return { ...w, world, stage, types: [], goal: 0, boss: null, par: 140, speedMul: 1 };
    if (w.endless) return { ...w, world, stage: 1, types: LEVELS[1].types.slice(), goals: {}, goal: 0, total: 0, boss: null, par: 0, ...difficulty(1, 1) };
    const n = w.types.length;
    const typeCount = Math.min(n, stage <= 2 ? 2 : 3);
    const types = w.types.slice(0, typeCount);
    const special = specialOf(world, stage);
    const rank0 = w.rank || world;
    // Level 4: catch only one kind; the others are decoys that fly past (shooting them costs points)
    if (special === 'only') {
      const tgt = types[(world + 1) % types.length], tot = TOTALS[stage - 1];
      return { ...w, world, stage, special, types: [tgt], decoys: types.filter((t) => t !== tgt), goals: { [tgt]: tot }, goal: tot, total: tot, boss: null, par: Math.round(tot * 3.2), ...difficulty(stage, rank0) };
    }
    // Level 6: no catch goals, stay alive for 60 seconds
    if (special === 'survive') {
      const goals = Object.fromEntries(types.map((t) => [t, 9999]));
      return { ...w, world, stage, special, types, goals, goal: 9999, total: 0, boss: null, par: SURVIVE_TIME, ...difficulty(stage, rank0) };
    }
    // every level asks for a little more than the one before (levels 1-2: 14 and 15, split over 2 kinds)
    const total = TOTALS[stage - 1];
    const goals = {};
    types.forEach((t, i) => { goals[t] = Math.floor(total / types.length) + (i < total % types.length ? 1 : 0); });
    const goal = Math.max(...Object.values(goals));
    const boss = stage === STAGES ? w.boss : null;
    // target time for 3 stars: about 3 seconds per catch, plus time for the boss
    const par = Math.round(total * 3 + (boss ? boss.hp * 1.8 + 8 : 0));
    const rank = w.rank || world;
    return { ...w, world, stage, special, types, goals, goal, total, boss, par: par + (special === 'mini' ? 25 : special === 'storm' ? 10 : 0), ...difficulty(stage, rank) };
  }

  // Difficulty: every level of a world is harder than the one before, and every world a little harder than the last.
  //  speedMul  = how fast aliens approach (and how often new ones come)
  //  attackMul = how often aliens throw rocks
  //  damage    = % health lost per hit
  //  armour    = chance an alien has a shield (needs several hits) and how many hits that shield takes
  function difficulty(stage, rank) {
    const s = stage - 1, r = rank - 1;
    return {
      speedMul: 1 + 0.055 * s + 0.04 * r,
      attackMul: 1 + 0.07 * s + 0.03 * r,
      damage: Math.min(12, 4 + 0.55 * s + 0.25 * r),
      armourChance: stage < 2 ? 0 : Math.min(0.6, 0.04 * s + 0.02 * r),
      armourHp: 2 + Math.floor(s / 4) + Math.floor(r / 3),
      // how lively and evasive aliens move: wandering, dodging your aim, sometimes flying back
      evade: Math.min(1, 0.3 + 0.075 * s + 0.04 * r),
    };
  }
  // Getting hit 4 times within 2 seconds makes you dizzy for 2 seconds (no actions, you still get hit);
  // afterwards you cannot get dizzy again for 5 seconds.
  const DIZZY = { hits: 4, window: 2, time: 2, immune: 5 };

  // Stars (1-3) for a cleared level: health left counts most, then accuracy, then time
  function starRating({ won, time, accuracy, health, par }) {
    if (!won) return { stars: 0, score: 0 };
    const hp = clamp(health / 100, 0, 1);
    const acc = clamp((accuracy - 40) / 50, 0, 1);            // 90% or better = full points
    const tm = clamp(1 - (time - par) / par, 0, 1);            // at or under the target time = full points
    const score = 0.4 * hp + 0.35 * acc + 0.25 * tm;
    return { stars: score >= 0.85 ? 3 : score >= 0.6 ? 2 : 1, score, parts: { health: hp, accuracy: acc, time: tm } };
  }

  const ALL_TYPES = ['nebula', 'prism', 'solara', 'glide', 'vexa', 'pulsar', 'ember', 'nimbus', 'echo', 'splash', 'razor', 'orbita', 'vortex', 'skybloom', 'slimora', 'vaporis', 'emberoo', 'floravex', 'orbello', 'orblet'];
  let TYPES = LEVELS[1].types;                       // types of the level being played
  let DWELL_TIME = 0.45;         // seconds the circle must rest on a target to fire the blaster
  let SHOT_COOLDOWN = 0.28;     // these three change with Workshop upgrades
  const DAMAGE = 5;              // % health lost per hit

  // Gadget belt and gear
  const BELT = { r: 64, itemR: 58, gap: 150, openTime: 0.45, selectTime: 0.8, closeDelay: 1.0, slowMo: 0.3 };
  const GEAR = [
    { id: 'gun',     name: 'Blaster',     color: '#62f0ff' },
    { id: 'grenade', name: 'Net grenade', color: '#ff8ad8' },
    { id: 'shield',  name: 'Shield',      color: '#8ff0c8' },
  ];
  // Boss rock attacks per phase: how many rocks at once, and how often (seconds); echo throws sound rings
  const BOSS_ATTACKS = {
    nebula: { volley: [2, 1, 3], every: [3.2, 3.6, 2.6] },
    ember:  { volley: [3, 3, 5], every: [3.4, 3.8, 2.8] },
    splash: { volley: [1, 2, 2], every: [3.4, 3.8, 3.0] },
    prism:  { volley: [2, 2, 3], every: [3.6, 4.0, 3.0] },
    echo:   { volley: [1, 2, 3], every: [3.0, 2.6, 2.0], kind: 'ring' },
    vortex: { volley: [2, 2, 3], every: [3.4, 3.4, 2.8] },
  };
  // What each boss announces when a new phase starts
  const PHASE_MSG = {
    nebula: { 2: 'Phase 2: find the real {name}!', 3: 'Phase 3: pop the glowing spots!' },
    ember:  { 2: 'Phase 2: walls of fire! Use your shield!', 3: 'Phase 3: the {name} is furious!' },
    splash: { 2: 'Phase 2: she dives and charges a water beam!', 3: 'Phase 3: waves of helpers!' },
    prism:  { 2: 'Phase 2: break the crystals in order 1, 2, 3!', 3: 'Phase 3: crystals and red glows!' },
    echo:   { 2: 'Phase 2: the lights go out!', 3: 'Phase 3: more sound rings!' },
    vortex: { 2: 'Phase 2: shoot between the spinning blades!', 3: 'Phase 3: the vortex pulls your aim!' },
  };

  // Every world has its own material, dropped only there (and in Endless waves in that world)
  const REGION_MAT = { 1: 'mist', 2: 'spark', 3: 'pearl', 4: 'glass', 5: 'echo', 6: 'vdust' };

  const REGION_ICON = { mist: ['#c9b6ff', 'cloud'], spark: ['#ff9a3a', 'flame'], pearl: ['#fde8ff', 'pearl'], glass: ['#bff9ff', 'prism'], echo: ['#b99bff', 'rings'], vdust: ['#ff8ad8', 'swirl'] };

  // Bosses with their own artwork (a 5x4 boss sheet and a 5x3 effects sheet).
  // Boss sheet: row 1 idle, row 2 rock throw (6 = red warning, 7-8 fling), row 3 splitting (11-13),
  // row 4: 15 bright flash, 16 hurt, 17 angry, 18 bubble shield, 19 dizzy/caught.
  // Effects sheet: 0-2 rocks, 3-4 rock breaking, 5-7 weak spot, 8-9 weak spot popping, 13-14 bubble popping.
  const BOSS_ART = {
    nebula: { img: 'nebula_king', fx: 'nebula_king_fx', meta: { fw: 255, fh: 234 }, fxMeta: { fw: 249, fh: 236 }, crown: true },
    // Ember Lord: 5x3 sheet. 0/5 front, 2/3/8/9/11/12 moving sideways (eye to the right; mirrored when going left),
    // 13 winding up, 14 spinning attack, 10 hurt / dizzy
    ember: { img: 'ember_lord', meta: { fw: 256, fh: 303 }, crown: true,
      frames: { idle: [0, 5], side: [2, 3, 8, 9, 11, 12], windup: 13, attack: 14, hurt: 10, caught: 10 } },
  };

  // Superpowers (order = icons in assets/supers.webp). `ready` ones work in the game already.
  const SUPERS = {
    mindswirl: { i: 0, name: 'Mind Swirl', ready: true },
    shockwave: { i: 1, name: 'Shockwave', ready: true },
    barrier:   { i: 2, name: 'Star Barrier', ready: true },
    blackhole: { i: 3, name: 'Black Hole', ready: true },
    frost:     { i: 4, name: 'Frost Nova', ready: true },
    overdrive: { i: 5, name: 'Overdrive', ready: true },
    meteor:    { i: 6, name: 'Meteor Shower', ready: true },
    aurora:    { i: 7, name: 'Healing Aurora', ready: true },
  };

  // Every boss drops its own trophy (needed for the strongest Workshop upgrades)
  const TROPHIES = { nebula: 'nebulaCrown', ember: 'emberCore', splash: 'tidePearl', prism: 'prismHeart', echo: 'echoBell', vortex: 'vortexEye' };
  // Time grenade: bought in the shop. Slows all aliens, rocks and the boss down for a few seconds.
  const TIME_GEAR = { id: 'time', name: 'Time grenade', color: '#9fd8ff' };
  const TIME_SLOW = 3;           // seconds
  const TIME_FACTOR = 0.25;      // how slow the world moves meanwhile
  let NET_R = 210;               // capture radius of the net
  const GRENADE_STILL = 0.6;     // hold the circle still this long to throw
  const STILL_PX = 30;           // how far the circle may drift while holding still
  let SHIELD_MAX = 10;         // hits before the shield breaks
  let SHIELD_RECHARGE = 20;      // seconds before a broken shield can be used again

  // Pause
  const MENU_BTN = { x: 860, y: 28, w: 200, h: 64 };   // matches #btn-menu in the HUD
  const MENU_DWELL = 0.8;
  const T_HOLD = 1.0;

  // Frame sizes come from the sliced spritesheets (5 columns x 3 rows each).
  // front = frames facing the player, side = frames facing right (mirrored for left).
  // thrower = this monster throws rocks the shield can block.
  const SPR = {
    gun:    { src: 'assets/gun.webp',    fw: 346, fh: 325 },
    nebula: { src: 'assets/nebula.webp', fw: 238, fh: 246, front: [0, 12, 11, 12], side: [1, 14, 9], color: '#c79bff', name: 'Nebula', speed: [8, 10] },
    prism:  { src: 'assets/prism.webp',  fw: 236, fh: 249, front: [0, 5, 11, 5],   side: [9, 14, 10], color: '#7fe3ff', name: 'Prism',  speed: [9, 11], thrower: true },
    solara: { src: 'assets/solara.webp', fw: 274, fh: 242, front: [0, 4, 12, 4],   side: [6, 9, 14], color: '#ffd27a', name: 'Solara', speed: [6.5, 8.5] },
    glide:  { src: 'assets/glide.webp',  fw: 262, fh: 212, front: [0, 11, 0, 11],  side: [2, 10, 14, 12], color: '#8ff0c8', name: 'Glide', speed: [6, 7.5] },
    vexa:   { src: 'assets/vexa.webp',   fw: 245, fh: 234, front: [0, 1, 11, 1],   side: [3, 9, 10, 14], color: '#ffa45c', name: 'Vexa',  speed: [9, 11], thrower: true },
    // pulse = moves toward you in bursts, to the rhythm of its glowing bubbles
    pulsar: { src: 'assets/pulsar.webp', fw: 244, fh: 229, front: [0, 10, 11, 10], side: [3, 8, 9], color: '#b8f06a', name: 'Pulsar', speed: [7, 9], pulse: true },
    // swim: 'jelly' = pushes forward in strokes like a jellyfish, 'glide' = glides and banks like a manta ray
    // open/push = frames with tentacles spread and pulled in (jellyfish stroke)
    nimbus: { src: 'assets/nimbus.webp', fw: 266, fh: 243, front: [0, 1], push: [5], side: [3, 4, 9, 7], color: '#8fd8ff', name: 'Nimbus', speed: [8, 10], swim: 'jelly' },
    echo:   { src: 'assets/echo.webp',   fw: 278, fh: 255, front: [0, 5, 10, 5], side: [2, 3, 8, 9], color: '#c79bff', name: 'Echo', speed: [7, 9], swim: 'glide', thrower: true },
    splash: { src: 'assets/splash.webp', fw: 265, fh: 246, front: [0, 12], push: [5, 14], side: [3, 4, 9, 7], color: '#ff9ad8', name: 'Splash', speed: [7.5, 9.5], swim: 'jelly' },
    // Starfall Wetlands: Razor scuttles fast and throws spikes, Orbita glides like a little planet, Vortex spins toward you in bursts
    razor:  { src: 'assets/razor.webp',  fw: 248, fh: 238, front: [0, 12, 6, 12], side: [5, 11, 3], color: '#c79bff', name: 'Razor', speed: [6, 7.5], thrower: true },
    orbita: { src: 'assets/orbita.webp', fw: 235, fh: 263, front: [0, 4, 8, 4],   side: [6, 5, 11], color: '#9fd8ff', name: 'Orbita', speed: [8, 10], swim: 'glide' },
    vortex: { src: 'assets/vortex.webp', fw: 275, fh: 244, front: [0, 12, 8, 12], side: [5, 14, 9], color: '#ff8ad8', name: 'Vortex', speed: [7, 9], pulse: true, thrower: true },
    // ---- Planet Prismara (sheets cut from the character sheets, background removed) ----
    // faceLeft = the turned frames look to the left (mirrored when it moves right)
    skybloom: { src: 'assets/skybloom.webp', fw: 250, fh: 244, front: [0, 10, 13, 10], side: [2, 12, 3], faceLeft: true,
      attackFrame: 8, color: '#ff9ae8', name: 'Skybloom', speed: [7.5, 9.5], swim: 'glide', thrower: true },
    // Slimora slides over the ground, slowly: 9 jumps up in a splash when it reaches you, 7 spits a glowing drop
    slimora:  { src: 'assets/slimora.webp', fw: 250, fh: 259, front: [0, 14, 0, 13], side: [0, 14, 0, 13], swim: 'walk',
      throwFrame: 7, attackFrame: 9, color: '#d79bff', name: 'Slimora', speed: [10.5, 12.5] },
    vaporis:  { src: 'assets/vaporis.webp', fw: 250, fh: 252, front: [0, 14, 0, 7], side: [1, 2, 3], attackFrame: 5,
      color: '#9fc8ff', name: 'Vaporis', speed: [7, 9], swim: 'glide', thrower: true },
    // Emberoo swims like a jellyfish: 10 = squeezed (pushing), 0/1 = spread (gliding)
    emberoo:  { src: 'assets/emberoo.webp', fw: 250, fh: 251, front: [0, 1], push: [10], side: [2, 11, 13], attackFrame: 5,
      color: '#ffa0c8', name: 'Emberoo', speed: [7.5, 9.5], swim: 'jelly', thrower: true },
    // Floravex walks on four legs: 14 charges an orb (throw), 5 claws when it reaches you
    floravex: { src: 'assets/floravex.webp', fw: 250, fh: 206, front: [0, 10, 0, 7], side: [0, 10, 0, 7], swim: 'walk',
      throwFrame: 14, attackFrame: 5, color: '#8fd8ff', name: 'Floravex', speed: [7, 8.5], thrower: true },
    orbello:  { src: 'assets/orbello.webp', fw: 250, fh: 234, front: [0, 1, 11, 1], side: [3, 14], attackFrame: 13,
      color: '#7fd0ff', name: 'Orbello', speed: [8, 10], thrower: true },
    // Orblet bounces toward you in little hops (pulse)
    orblet:   { src: 'assets/orblet.webp', fw: 250, fh: 235, front: [0, 10, 13, 10], side: [2, 11, 12], attackFrame: 7,
      color: '#9ff0c8', name: 'Orblet', speed: [8, 10], pulse: true },
    ember:  { src: 'assets/ember.webp',  fw: 244, fh: 260, front: [0, 5, 0, 7],    side: [3, 6, 11, 12], color: '#ff9a6a', name: 'Ember', speed: [6.5, 8], thrower: true },
  };
  // The Void (boss of the ???? world): 0 = still, 1-3 = firing its energy beam
  SPR.void = { src: 'assets/void_boss.webp', fw: 1102, fh: 620, front: [0], side: [0], color: '#b06cff', name: 'The Void' };
  // The Void fights in 4 health bars; it can only be hurt while its chest crystal is open
  const VOID = {
    bars: 4, barHp: 30,
    beamEvery: [10, 9, 8, 6.5],      // seconds between beams, per bar (4 bars left ... 1 bar left)
    charge: [2.3, 2.2, 2.0, 1.6],    // warning time before the beam
    fire: 1.0, tired: 4, stun: 6, beamDamage: 20, shieldCost: 3,
    orbEvery: 9, shardEvery: [0, 6, 5, 4], shards: [0, 2, 3, 3],
    minionEvery: [6, 5, 3.5, 4], minionMax: [3, 3, 5, 4], regenAfter: 5, heal: 25,
  };

  // Gun frames ordered from pointing far left to pointing far right
  const GUN_ORDER = [0, 1, 2, 3, 4, 12, 14, 13, 11, 10];

  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const FONT = '"Chakra Petch", "Segoe UI", Roboto, Arial, sans-serif';
  // A ranch friend with 5 hearts can come along as your buddy; each kind helps in its own way
  const BUDDY_BONUS = {
    heal: { text: 'Heals you 3 health for every catch' },
    slow: { text: 'Rocks fly 25% slower' },
    net: { text: '+1 net grenade in every level' },
    crystal: { text: '+15% crystals from every level' },
    score: { text: '+10% points' },
  };
  function buddyBonusOf(k) {
    const s = SPR[k] || {};
    const id = s.swim === 'jelly' ? 'heal' : s.swim === 'glide' ? 'slow' : s.swim === 'walk' ? 'net' : s.pulse ? 'crystal' : s.thrower ? 'score' : 'crystal';
    return { id, text: BUDDY_BONUS[id].text };
  }
  const EMOJI_FONT = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  // ---------------- Assets ----------------
  const Assets = {
    images: {},
    load(onProgress) {
      const list = [...Object.entries(LEVELS).map(([id, l]) => ['bg' + id, l.bg]), ...['gun', ...ALL_TYPES].map((k) => [k, SPR[k].src]),
        ['void', SPR.void.src],
        ['nebula_king', 'assets/nebula_king.webp'], ['nebula_king_fx', 'assets/nebula_king_fx.webp'], ['ember_lord', 'assets/ember_lord.webp'],
        ['drone1', 'assets/drone1.webp'], ['drone2', 'assets/drone2.webp']];
      let done = 0;
      return Promise.all(list.map(([key, src]) => new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => { this.images[key] = img; done++; if (onProgress) onProgress(done / list.length); resolve(); };
        img.onerror = () => reject(new Error('Could not load ' + src));
        img.src = src;
      })));
    },
  };

  // ---------------- Smoothing (One Euro filter) ----------------
  class OneEuro {
    constructor(minCutoff = 1.0, beta = 1.2, dCutoff = 1.0) {
      this.minCutoff = minCutoff; this.beta = beta; this.dCutoff = dCutoff; this.reset();
    }
    reset() { this.t = null; this.x = null; this.dx = 0; }
    alpha(cutoff, dt) { const tau = 1 / (2 * Math.PI * cutoff); return 1 / (1 + tau / dt); }
    filter(v, tMs) {
      if (this.t === null) { this.t = tMs; this.x = v; return v; }
      const dt = Math.max(0.001, (tMs - this.t) / 1000);
      this.t = tMs;
      const d = (v - this.x) / dt;
      this.dx = lerp(this.dx, d, this.alpha(this.dCutoff, dt));
      const cutoff = this.minCutoff + this.beta * Math.abs(this.dx);
      this.x = lerp(this.x, v, this.alpha(cutoff, dt));
      return this.x;
    }
  }

  // ---------------- Input: phone pose or mouse ----------------
  // One input per player (Player 1 can also use the mouse)
  function makeInput() {
    return {
    mode: 'mouse',
    hand: 'right',
    sens: 1,
    aim: { x: 0.5, y: 0.5 },        // normalized screen position (0..1)
    hasAim: false,
    lastPose: 0,
    offsetNow: null,                // wrist offset from shoulder, used for calibration
    calib: null,                    // { cx, cy } once calibrated
    freeHandUp: false,
    tSign: false,                   // time-out T made with both forearms
    mouseFire: false,
    mouseReload: false,
    // Phone controller type: 'cam' (camera body tracking), 'pad' (touch gamepad) or 'tilt' (point the phone like a remote)
    device: 'cam',
    events: [],            // button presses from the phone: fire, reload, gun, grenade, shield, menu
    fireHeld: false,
    counters: null, session: null,

    isCam() { return this.mode === 'phone' && this.device === 'cam'; },
    // Devices with a real button: aiming and clicking instead of holding still
    isClicky() { return this.mode === 'mouse' || (this.mode === 'phone' && this.device !== 'cam'); },
    usesDwell() { return this.mode === 'mouse' || this.isCam(); },

    // Message from the gamepad or tilt controller: absolute pointer position plus button press counters.
    // Counters (instead of single "pressed" messages) mean a lost network packet never loses a button press.
    onPointer(d) {
      if (d.m === 'hello') { this.device = d.mode; return; }
      if (this.mode !== 'phone') {
        // web version: while playing with the mouse, using the phone gamepad switches over to it
        const moved = this.padLast ? Math.hypot(d.x - this.padLast.x, d.y - this.padLast.y) : 0;
        const pressed = this.counters && d.c && Object.keys(d.c).some((k) => d.c[k] > (this.counters[k] || 0));
        const active = this.allowSwitch && this.mode === 'mouse' && d.m === 'pad' && this.padLast && (d.hold || moved > 0.012 || pressed);
        this.padLast = { x: d.x, y: d.y };
        if (!active) {
          if (d.c && !pressed) { this.counters = { ...d.c }; this.session = d.s; }    // keep up, so a switching press is not lost
          return;
        }
        this.mode = 'phone';
        this.lastPtr = null;
      }
      this.device = d.m;
      // Estimate how fast the pointer moves and aim a little ahead (about 50 ms),
      // which hides part of the network and TV delay
      const now0 = performance.now();
      if (this.lastPtr && now0 - this.lastPtr.t > 5 && now0 - this.lastPtr.t < 200) {
        const dtp = (now0 - this.lastPtr.t) / 1000;
        this.vel = { x: lerp(this.vel ? this.vel.x : 0, (d.x - this.lastPtr.x) / dtp, 0.5), y: lerp(this.vel ? this.vel.y : 0, (d.y - this.lastPtr.y) / dtp, 0.5) };
      } else this.vel = { x: 0, y: 0 };
      this.lastPtr = { x: d.x, y: d.y, t: now0 };
      const LEAD = 0.05;
      this.aim.x = clamp(d.x + this.vel.x * LEAD, 0, 1);
      this.aim.y = clamp(d.y + this.vel.y * LEAD, 0, 1);
      this.hasAim = true;
      this.lastPose = performance.now();
      this.fireHeld = !!d.hold;
      // gamepad extras used by the platformer level: raw d-pad direction and held buttons
      if (d.sx != null) this.stick = { x: d.sx, y: d.sy };
      this.jumpHeld = !!d.jh;
      this.runHeld = !!d.rh;
      if (d.c) {
        if (this.counters && this.session === d.s) {
          for (const k of Object.keys(d.c)) {
            const n = d.c[k] - (this.counters[k] || 0);
            for (let i = 0; i < Math.min(n, 3); i++) this.events.push(k);
          }
        }
        this.counters = { ...d.c }; this.session = d.s;
      }
    },
    takeEvents() { const e = this.events; this.events = []; return e; },
    smoothing: 'normal',
    // Separate filters: the wrist moves fast (adaptive filter), the shoulder and body size barely move (heavy filter).
    // This removes most of the jitter that the shoulder used to add to the aim.
    fw: [new OneEuro(), new OneEuro()],
    fs: [new OneEuro(0.3, 0.2), new OneEuro(0.3, 0.2)],
    fsw: new OneEuro(0.2, 0.1),
    lastWrist: null,

    setSmoothing(level) {
      this.smoothing = level;
      const [mc, beta] = { low: [1.6, 4], normal: [1.0, 3], high: [0.55, 2] }[level] || [1.0, 3];
      this.fw.forEach((f) => { f.minCutoff = mc; f.beta = beta; });
    },

    reset() {
      this.hasAim = false; this.lastPose = 0; this.offsetNow = null; this.freeHandUp = false; this.tSign = false;
      [...this.fw, ...this.fs, this.fsw].forEach((f) => f.reset());
      this.lastWrist = null;
    },

    // Message from the phone: { t, a: aspect ratio, p: [x,y,visibility] x 7 }
    // Landmark order: nose, left shoulder, right shoulder, left elbow, right elbow, left wrist, right wrist
    onPose(d) {
      if (d && d.m === 'cam') this.device = 'cam';
      if (this.mode !== 'phone' || !d || !d.p) return;
      this.device = 'cam';
      const now = performance.now();
      // Use the phone's own clock for filtering, so network hiccups don't affect the smoothing
      const t = typeof d.t === 'number' ? d.t : now;
      // Mirror x because the camera faces the player: their right hand should move the aim right
      const L = (i) => ({ x: (1 - d.p[i * 3]) * d.a, y: d.p[i * 3 + 1], v: d.p[i * 3 + 2] });
      const nose = L(0), ls = L(1), rs = L(2), le = L(3), re = L(4), lw = L(5), rw = L(6);
      if (ls.v < 0.4 || rs.v < 0.4) return;
      const swRaw = Math.max(0.05, Math.hypot(ls.x - rs.x, ls.y - rs.y));   // shoulder width = body scale
      const sw = this.fsw.filter(swRaw, t);
      const right = this.hand === 'right';
      const wristRaw = right ? rw : lw, shoulderRaw = right ? rs : ls, free = right ? lw : rw;

      // Reload gesture: free hand raised above the head
      this.freeHandUp = free.v > 0.4 && free.y < nose.y - 0.25 * sw;

      // Pause gesture: time-out T with the forearms (one horizontal, one vertical, wrists close together in front of the chest)
      this.tSign = false;
      if (lw.v > 0.5 && rw.v > 0.5 && le.v > 0.5 && re.v > 0.5) {
        const fa = (e, w) => ({ dx: w.x - e.x, dy: w.y - e.y, len: Math.hypot(w.x - e.x, w.y - e.y) });
        const a = fa(le, lw), b = fa(re, rw);
        const horiz = (f) => Math.abs(f.dy) < 0.45 * f.len;
        const vert = (f) => Math.abs(f.dx) < 0.45 * f.len;
        const shoulderY = (ls.y + rs.y) / 2;
        const near = Math.hypot(lw.x - rw.x, lw.y - rw.y) < 0.75 * sw;
        const chest = lw.y > nose.y - 0.3 * sw && rw.y > nose.y - 0.3 * sw && lw.y < shoulderY + 1.6 * sw && rw.y < shoulderY + 1.6 * sw;
        const long = a.len > 0.3 * sw && b.len > 0.3 * sw;
        this.tSign = near && chest && long && ((horiz(a) && vert(b)) || (vert(a) && horiz(b)));
      }

      // Ignore frames where the wrist is poorly seen, and single-frame jumps (tracking glitches)
      if (wristRaw.v < 0.5) return;
      if (this.lastWrist && wristRaw.v < 0.8 && Math.hypot(wristRaw.x - this.lastWrist.x, wristRaw.y - this.lastWrist.y) > 1.2 * sw) return;
      this.lastWrist = { x: wristRaw.x, y: wristRaw.y };

      const wx = this.fw[0].filter(wristRaw.x, t), wy = this.fw[1].filter(wristRaw.y, t);
      const sx = this.fs[0].filter(shoulderRaw.x, t), sy = this.fs[1].filter(shoulderRaw.y, t);
      const dx = (wx - sx) / sw;
      const dy = (wy - sy) / sw;
      this.offsetNow = { dx, dy, t: now };
      const side = right ? 1 : -1;
      const cx = this.calib ? this.calib.cx : 0.25 * side;
      const cy = this.calib ? this.calib.cy : 0.15;
      this.aim.x = clamp(0.5 + (dx - cx) / (1.9 / this.sens), -0.02, 1.02);
      this.aim.y = clamp(0.5 + (dy - cy) / (1.5 / this.sens), -0.02, 1.02);
      this.hasAim = true;
      this.lastPose = now;
    },

    poseFresh() { return this.mode === 'mouse' || performance.now() - this.lastPose < 700; },
  };
  }
  const inputs = [makeInput(), makeInput()];
  inputs[1].mode = 'phone';
  const Input = inputs[0];

  // ---------------- Level ----------------
  // Everything a single player owns (gun, aim, ammo, gear) lives in a player object,
  // so a second phone simply adds a second player with their own gun.
  const PLAYER_COLORS = { 1: '#62f0ff', 2: '#ffd27a' };
  const CROSSHAIR_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">'
    + '<g fill="none" stroke-linecap="round">'
    + '<circle cx="32" cy="32" r="20" stroke="#0a1440" stroke-width="7" opacity="0.55"/>'
    + '<circle cx="32" cy="32" r="20" stroke="#62f0ff" stroke-width="3.5"/>'
    + '<path d="M32 6v10M32 48v10M6 32h10M48 32h10" stroke="#0a1440" stroke-width="6" opacity="0.55"/>'
    + '<path d="M32 6v10M32 48v10M6 32h10M48 32h10" stroke="#62f0ff" stroke-width="3"/></g>'
    + '<circle cx="32" cy="32" r="3" fill="#62f0ff"/></svg>';
  const CROSSHAIR_CURSOR = `url("data:image/svg+xml,${encodeURIComponent(CROSSHAIR_SVG)}") 32 32, crosshair`;

  const Level = {
    canvas: null, ctx: null, scale: 1,
    running: false, paused: false, state: 'idle', loopId: 0,
    onEnd: null, onHud: null, getMenuButtons: null, save: null, options: null,
    players: [],

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      const toStage = (e) => {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      };
      // web version: moving or clicking the mouse while playing with the phone gamepad switches back to the mouse
      const toMouse = (e) => {
        if (Input.mode === 'phone' && Input.allowSwitch && Input.device === 'pad' && e.pointerType === 'mouse') { Input.mode = 'mouse'; Input.padLast = null; }
      };
      canvas.addEventListener('pointermove', (e) => {
        if (Math.abs(e.movementX) + Math.abs(e.movementY) > 3) toMouse(e);
        if (Input.mode !== 'mouse') return;
        const p = toStage(e); Input.aim.x = p.x; Input.aim.y = p.y; Input.hasAim = true;
      });
      canvas.addEventListener('pointerdown', (e) => {
        toMouse(e);
        if (Input.mode !== 'mouse') return;
        if (e.button === 2) Input.mouseReload = true; else Input.mouseFire = true;
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    },

    // Graphics: sharp 1920x1080 with glow, fast 1280x720, low 960x540. Fast and low skip the
    // canvas glow effect (shadow blur), which is by far the heaviest drawing work for TV browsers.
    setQuality(q) {
      if (q === 'auto') q = this.autoQuality || 'fast';
      this.quality = q;
      const w = q === 'sharp' ? 1920 : q === 'low' ? 960 : q === 'vlow' ? 640 : 1280;
      this.scale = w / 1920;                                // drawing resolution per game unit
      this.canvas.width = Math.round(W * this.scale); this.canvas.height = Math.round(H * this.scale);
      this.lowFx = q !== 'sharp';
      this.bgCache = null;
    },
    glow(n) { return this.lowFx ? 0 : n; },
    // The screen got wider or narrower: the game area follows (called by the menu code on resize)
    setViewWidth(w) {
      w = Math.round(w);
      if (w === W) return;
      W = w;
      this.viewW = W;
      if (this.quality) this.setQuality(this.quality);
    },

    // Automatic graphics: if the game runs below ~45 frames per second, step down to lighter settings
    trackSpeed(rawDt) {
      this.fpsFrames = (this.fpsFrames || 0) + 1;
      this.fpsTime = (this.fpsTime || 0) + rawDt;
      this.gapMax = Math.max(this.gapMax || 0, rawDt);
      if (rawDt > (this.frameCap ? 0.045 : 0.025)) this.slowFrames = (this.slowFrames || 0) + 1;
      if (this.fpsTime < 2) return;
      this.fps = Math.round(this.fpsFrames / this.fpsTime);
      const n = this.fpsFrames;
      this.hud('fps', {
        fps: this.fps,
        logic: (this.msUpdate || 0) / n, draw: (this.msDraw || 0) / n,     // average milliseconds per frame
        slow: Math.round(((this.slowFrames || 0) / n) * 100), gap: Math.round((this.gapMax || 0) * 1000),
      });
      this.fpsFrames = 0; this.fpsTime = 0; this.msUpdate = 0; this.msDraw = 0; this.slowFrames = 0; this.gapMax = 0;
      if (this.options && this.options.quality === 'auto' && this.state === 'play' && this.fps < 45) {
        const next = this.quality === 'sharp' ? 'fast' : this.quality === 'fast' ? 'low' : null;
        if (next) { this.autoQuality = next; this.setQuality(next); this.hud('toast', 'Graphics lowered for smoother play'); }
      }
    },

    start({ level = 1, stage = 1, mode, players = 1, save, options, onEnd, onHud, getMenuButtons, tutorial = false }) {
      Object.assign(this, { save, options, onEnd, onHud, getMenuButtons });
      this.perfOptions(options);
      this.levelId = level;
      this.stage = stage;
      this.levelCfg = stageConfig(level, stage);
      // Training (tutorial): Crystal Shores, no goals, no special rules; the steps run in updateTutorial
      if (tutorial) this.levelCfg = { ...this.levelCfg, types: ['nebula', 'prism'], goals: { nebula: 0, prism: 0 }, goal: 0, total: 0, boss: null, special: null,
        video: null, par: 120, ...difficulty(1, 1), armourChance: 0, evade: 0.25, tutorial: true };
      TYPES = this.levelCfg.types;
      GOAL = this.levelCfg.goal;
      GOALMAP = this.levelCfg.goals || {};
      this.types = TYPES; this.goal = GOAL;
      this.menuSuspended = false;
      Input.mode = mode;
      Input.allowSwitch = !window.SV_TOUCH;       // web: switch between mouse and phone gamepad at any time
      Input.padLast = null;
      inputs[1].mode = 'phone';
      // With a mouse, the crosshair is the real mouse cursor: it moves without any delay
      this.plat = !!LEVELS[level].plat;
      this.canvas.style.cursor = this.plat ? 'default' : mode === 'mouse' ? CROSSHAIR_CURSOR : 'none';
      for (const inp of inputs) {
        inp.hand = options.hand;
        inp.sens = options.sens;
        inp.setSmoothing(options.smoothing || 'normal');
        inp.reset();
      }
      if (mode === 'phone') Input.calib = null;
      TYPES.forEach((t) => { delete this['done_' + t]; });
      this.setQuality(options.quality);

      const up = save.owned || {};
      // Workshop upgrades
      const upg = save.upg || {};
      const bl = clamp(upg.blaster || 1, 1, 5), nl = clamp(upg.net || 1, 1, 3), sl = clamp(upg.shield || 1, 1, 3);
      // Armour suit (Workshop): Mk1 = normal health, each level +50%, Mk5 = 300% (three times as much)
      this.healthMult = 1 + 0.5 * (clamp(upg.health || 1, 1, 5) - 1);
      DWELL_TIME = [0.45, 0.4, 0.35, 0.31, 0.27][bl - 1];
      SHOT_COOLDOWN = [0.28, 0.25, 0.22, 0.2, 0.18][bl - 1];
      this.blasterDmg = [1, 1, 2, 2, 3][bl - 1];
      NET_R = 210 * (1 + 0.15 * (nl - 1));
      // region abilities in the loadout (one drone ability, one weapon mod)
      const mods = save.mods || {}, lo = save.loadout || {};
      this.dAb = lo.drone && mods[lo.drone] ? { id: lo.drone, lv: mods[lo.drone] } : null;
      this.wAb = lo.weapon && mods[lo.weapon] ? { id: lo.weapon, lv: mods[lo.weapon] } : null;
      if (this.wAb && this.wAb.id === 'vnet') NET_R *= [1.25, 1.4, 1.6][this.wAb.lv - 1];
      this.homing = this.wAb && this.wAb.id === 'homing' ? [0.2, 0.35, 0.5][this.wAb.lv - 1] : 0;
      this.whirls = [];
      this.regionWorld = level <= 6 ? level : null;
      this.netDmg = 2 + nl;
      SHIELD_MAX = 10 + 4 * (sl - 1);
      // Home base buildings
      const base = save.base || {};
      this.baseLv = { medbay: base.medbay || 0, lab: base.lab || 0, hangar: base.hangar || 0, observatory: base.observatory || 0 };
      this.regenEvery = [0, 10, 8, 6, 5, 4][this.baseLv.medbay]; this.regenT = 0;
      SHIELD_RECHARGE = 20 - 2 * this.baseLv.lab;
      this.droneCd = 10 - this.baseLv.hangar;
      this.droneDmg = 3 + Math.floor(this.baseLv.hangar / 2);
      this.shinyChance = 0.015 * (1 + 0.5 * this.baseLv.observatory);
      this.dropBoost = 1 + 0.2 * this.baseLv.observatory;
      // score, combo and drops
      this.score = 0; this.combo = 0; this.lastCatchT = -99; this.bestCombo = 0; this.mult = 1;
      this.floaters = []; this.drops = []; this.damageTaken = false; this.levelDrops = {};
      // shop levels (Bigger magazine 8 → 50 shots, Quick reload, Steady aim)
      const shopLv = (id) => { const v = (save.shopLv || {})[id]; return v != null ? v : (up[id] ? 1 : 0); };
      this.magSize = [8, 12, 18, 24, 30, 36, 42, 48, 50][Math.min(8, shopLv('magazine'))];
      this.steadyLv = Math.min(3, shopLv('steadyAim'));
      this.reloadTime = [0.95, 0.48, 0.38, 0.3][Math.min(3, shopLv('quickReload'))];
      this.assist = [0, 0.35, 0.6, 0.85][options.assist] + (options.assist > 0 ? [0, 0.12, 0.22, 0.32][this.steadyLv] : 0);
      this.steadyHit = [0, 0, 0.1, 0.2][this.steadyLv];       // Steady aim 2 and 3: bigger hit area, even with aim help off
      this.hasMedkit = !!up.medkit;

      this.health = 100;
      this.buddy = save && save.buddy && SPR[save.buddy] && !tutorial ? save.buddy : null;
      this.buddyBonus = this.buddy ? buddyBonusOf(this.buddy).id : null;
      this.buddyHop = 0; this.buddyT = 0; this._buddyPaid = false;
      this.caught = Object.fromEntries(TYPES.map((t) => [t, 0]));
      this.monsters = []; this.particles = []; this.voxels = []; this.trails = []; this.lasers = []; this.rocks = []; this.nets = []; this.flying = [];
      this.spawnTimer = 0.8;
      this.time = 0; this.shots = 0; this.hits = 0; this.earned = 0;
      this.medkitUsed = false;
      this.shake = 0;
      this.boss = null; this.bossDefeated = false; this.hazards = [];
      this.reviveUsed = false; this.drones = null;
      this.bubbles = []; this.bubbleT = 0;
      this.slowT = 0; this.waves = [];
      this.promptText = ''; this.promptUntil = 0;
      this.dizzyT = 0; this.dizzyImmune = 0; this.hitTimes = []; this.setDizzyLook(false);
      this.cine = false; this.beamFlash = 0;
      this.loseReason = null;
      this.initSpecial();
      this.tut = this.levelCfg.tutorial ? { step: -1, t: 0, idle: 0, hinted: false, rings: null, ring: 0, hold: 0, caught: 0, blocks: 0, spawned: [], finalSpawn: 0 } : null;

      this.players = [this.makePlayer(1)];
      if (players > 1 && !this.plat) this.players.push(this.makePlayer(2));
      this.menuPlayer = null;
      this.cursor = { target: null, t: 0 };

      this.paused = false;
      this.state = !this.plat && this.players.some((p) => p.input.isCam()) ? 'calibrate' : 'countdown';
      if (this.plat) this.platInit();
      this.endless = !!LEVELS[level].endless; this.wave = 0; this.bgKey = null;
      this.walkInit();
      this.bgVideoInit();
      if (!this.plat) this.warmSprites();
      this.superInit();
      if (this.endless) this.nextWave(true);
      this.stateT = 0;
      this.running = true;
      this.last = performance.now();
      this.hud('all');

      const id = ++this.loopId;
      const loop = (now) => {
        if (!this.running || id !== this.loopId) return;
        // "Frame rate: 30": only every other screen refresh, so each frame stays on screen equally long
        if (this.frameCap && now - this.last < 1000 / this.frameCap - 4) { requestAnimationFrame(loop); return; }
        const rawDt = (now - this.last) / 1000;
        const dt = Math.min(this.frameCap ? 0.07 : 0.05, rawDt);
        this.last = now;
        this.trackSpeed(rawDt);
        const t0 = performance.now();
        if (this.paused || this.state === 'done') { if (!this.menuSuspended) this.updateMenuCursor(dt); }
        else this.update(dt);
        const t1 = performance.now();
        this.draw();
        this.msUpdate = (this.msUpdate || 0) + (t1 - t0);
        this.msDraw = (this.msDraw || 0) + (performance.now() - t1);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },

    makePlayer(id) {
      const up = this.save.owned || {};
      const input = inputs[id - 1];
      if (id === 2) input.calib = null;
      return {
        id, input, color: PLAYER_COLORS[id],
        ammo: this.magSize, reloading: 0, reloadHold: 0, reloadLatch: false,
        equipped: 'gun', gunDown: 0, recoil: 0, cooldown: 0,
        dwell: 0, dwellTarget: null,
        reticle: { x: W / 2, y: H / 2 }, smoothAim: { x: W / 2, y: H / 2 },
        still: { x: 0, y: 0, t: 0 },
        belt: { open: false, hover: 0, sel: null, selT: 0, away: 0, anim: 0 },
        grenades: (up.grenadePouch ? 5 : 3) + Math.floor(((this.baseLv || {}).lab || 0) / 2) + (this.buddyBonus === 'net' ? 1 : 0),
        timeGrenades: up.timeGrenade ? (up.timePouch ? 4 : 2) + (((this.baseLv || {}).lab || 0) >= 3 ? 1 : 0) : 0,
        shieldHP: SHIELD_MAX, shieldRecharge: 0, shieldFlash: 0,
        tHold: 0, tLatch: true, menuHold: 0,
        calSamples: [], calibrated: !input.isCam(),
      };
    },
    player(id) { return this.players.find((p) => p.id === id) || null; },

    // A second phone joins or leaves during a level
    addPlayer(id) {
      if (this.plat) return;
      if (!this.running || this.state === 'done' || this.player(id)) return;
      const p = this.makePlayer(id);
      p.input.mode = 'phone';
      p.calibrated = true;           // joins straight in; camera players use the default centre
      this.players.push(p);
      this.players.sort((a, b) => a.id - b.id);
      this.hud('toast', `Player ${id} joined!`);
      this.hud('players');
    },
    removePlayer(id) {
      if (id === 1) return;
      const p = this.player(id);
      if (!p) return;
      this.players = this.players.filter((q) => q !== p);
      this.hud('toast', `Player ${id} left`);
      this.hud('players');
    },

    stop() { if (this.hyperT > 0) this.endHyper(); this.bgVideoEnd(); this.running = false; this.dizzyT = 0; this.setDizzyLook(false); this.walkEnd(); this.hud('cursor', null); },

    // Options changed from the in-game menu
    // frame rate cap and reduced effects (used at level start and when options change)
    perfOptions(o) {
      this.frameCap = o && o.frameRate === '30' ? 30 : 0;
      this.fxReduced = !!(o && o.effects === 'reduced');
      document.body.classList.toggle('fx-reduced', this.fxReduced);
    },
    applyOptions(o) {
      this.options = o;
      this.perfOptions(o);
      for (const inp of inputs) {
        inp.hand = o.hand;
        inp.sens = o.sens;
        inp.setSmoothing(o.smoothing || 'normal');
      }
      const up = this.save.owned || {};
      this.assist = [0, 0.35, 0.6, 0.85][o.assist] + (o.assist > 0 ? [0, 0.12, 0.22, 0.32][this.steadyLv || 0] : 0);
      this.players.forEach((p) => this.closeBelt(p));
      if (o.quality !== 'auto' || this.quality === undefined) this.setQuality(o.quality);
    },

    pause(reason, byPlayer) {
      if (this.state !== 'play' || this.paused) return;
      this.paused = true;
      this.menuPlayer = byPlayer || null;
      this.players.forEach((p) => { p.tHold = 0; p.tLatch = true; p.menuHold = 0; });
      this.cursor = { target: null, t: 0 };
      if (this.walk && this.walk.moving) this.walk.v.pause();
      if (this.bgv) try { this.bgv.v.pause(); } catch (e) {}
      this.hud('pause', reason);
    },
    resume() {
      this.paused = false; this.last = performance.now();
      if (this.walk && this.walk.moving && !this.walk.manual) this.walk.v.play().catch(() => {});
      if (this.bgv && !this.bgv.failed) this.bgv.v.play().catch(() => {});
      this.hud('cursor', null);
      this.hud('resume');
    },
    skipCalibration() { if (this.state === 'calibrate') { this.state = 'countdown'; this.stateT = 0; this.hud('countdown', 3); } },

    hud(kind, value) { if (this.onHud) this.onHud(kind, value, this); },

    followAim(p, dt) {
      if (this.dizzyT > 0) { p.smoothAim.x += Math.sin(this.time * 9) * 3; p.smoothAim.y += Math.cos(this.time * 7) * 2; return; }
      const inp = p.input;
      const target = inp.hasAim ? { x: inp.aim.x * W, y: inp.aim.y * H } : { x: this.gunBase(p), y: H / 2 };
      const k = inp.mode === 'mouse' ? 1 : Math.min(1, dt * (inp.isCam() ? 30 : 70));
      p.smoothAim.x = lerp(p.smoothAim.x, target.x, k);
      p.smoothAim.y = lerp(p.smoothAim.y, target.y, k);
    },

    // ---------------- Update ----------------
    update(dt) {
      if (this.plat) return this.platUpdate(dt);
      if (this.cine) return;                       // the defeat film of The Void is playing
      this.stateT += dt;
      for (const p of this.players) this.followAim(p, dt);
      if (this.state !== 'play') this.players.forEach((p) => p.input.takeEvents());   // ignore presses before and after play

      if (this.state === 'calibrate') return this.updateCalibration();
      if (this.state === 'countdown') {
        const left = 3 - Math.floor(this.stateT);
        this.hud('countdown', left);
        if (this.stateT >= 3) { this.state = 'play'; this.stateT = 0; this.hud('go'); this.onPlayStart(); }
        return;
      }
      if (this.state === 'ending') {
        this.updateEffects(dt);
        this.updateScoreFx(dt);
        this.monsters.forEach((m) => this.updateMonster(m, dt, true));
        if (this.stateT > 1.2) this.finish();
        return;
      }
      if (this.state !== 'play') return;

      // The world runs in slow motion while a gadget belt is open; your own actions don't.
      const worldSpeed = (this.players.some((p) => p.belt.open) ? BELT.slowMo : 1) * (this.slowT > 0 ? TIME_FACTOR : 1)
        * (this.boss && this.boss.state === 'enter' && !this.boss.void ? 0.2 : 1);
      const gdt = dt * worldSpeed;
      if (this.slowT > 0) { this.slowT = Math.max(0, this.slowT - dt); if (this.slowT === 0) this.hud('toast', 'Time is back to normal'); }

      this.time += dt;
      this.shake = Math.max(0, this.shake - dt);
      for (const p of this.players) {
        p.cooldown = Math.max(0, p.cooldown - dt);
        p.recoil = Math.max(0, p.recoil - dt * 6);
        p.shieldFlash = Math.max(0, p.shieldFlash - dt);
        p.gunDown = lerp(p.gunDown, p.equipped === 'gun' ? 0 : 1, Math.min(1, dt * 8));
        p.belt.anim = lerp(p.belt.anim, p.belt.open ? 1 : 0, Math.min(1, dt * 10));
        if (p.shieldHP <= 0) {
          p.shieldRecharge -= dt;
          if (p.shieldRecharge <= 0) { p.shieldHP = SHIELD_MAX; this.hud('toast', this.tag(p) + 'Shield recharged'); this.hud('gear'); }
        }
      }

      const dizzy = this.updateDizzy(dt);
      if (this.paused) return;
      this.updateSpawning(gdt);
      if (this.walk) this.updateWalk(dt, worldSpeed);
      if (this.bgv) this.updateBgVideo(dt, worldSpeed);
      for (const m of this.monsters) this.updateMonster(m, gdt, false);
      this.monsters = this.monsters.filter((m) => !m.gone);
      this.updateRocks(gdt);
      this.updateSpecial(dt, gdt);
      if (this.state !== 'play') return;
      this.updateHyper(dt);
      this.updateOrbit(dt);
      this.updateFlying(dt);
      if (this.boss) this.updateBoss(gdt, dt);
      if (this.hazards.length) this.updateHazards(gdt);
      if (this.levelCfg.underwater && !this.fxReduced) this.updateBubbles(dt);

      for (const p of this.players) { this.handlePhoneButtons(p); if (this.paused) return; }
      for (const p of this.players) { this.updatePauseGestures(p, dt); if (this.paused) return; }
      if (!dizzy) for (const p of this.players) {
        this.updateBelt(p, dt);
        this.updateWeapon(p, dt);
        this.updateReload(p, dt);
      }
      this.updateDrone(dt);
      if (this.whirls.length) this.updateWhirls(dt);
      this.updateSuper(dt);
      if (this.regenEvery && this.health > 0 && this.health < 100) {
        this.regenT += dt;
        if (this.regenT >= this.regenEvery) { this.regenT = 0; this.health = Math.min(100, this.health + 1); this.hud('health'); }
      }
      this.updateScoreFx(dt);
      this.updateEffects(dt);

      const stale = this.players.find((p) => !p.input.poseFresh());
      if (stale) this.setPrompt(stale.input.isCam() ? 'Step into view of the phone camera' : 'Waiting for your phone…', 0.3, stale);
      if (this.tut) { this.updateTutorial(dt); return; }

      if (this.endless) {
        if (this.bossWave) {
          if (!this.boss && !this.bossDefeated && this.stateT > 1.5) this.spawnBoss();
          if (this.bossDefeated) this.nextWave();
        } else if (this.waveCaught >= this.waveTarget && !(this.mini && !this.miniDone)) this.nextWave();
        return;
      }
      let goalsDone = this.special === 'survive' ? this.surviveT >= SURVIVE_TIME : TYPES.every((t) => this.caught[t] >= goalOf(t));
      // level 5: the mini-boss must be caught too (it crashes down at the latest when the goals are done)
      if (this.special === 'mini' && !this.miniDone) { if (goalsDone && !this.mini) this.spawnMini(); goalsDone = false; }
      if (goalsDone && this.levelCfg.boss && !this.boss && !this.bossDefeated) this.spawnBoss();
      if (goalsDone && (!this.levelCfg.boss || this.bossDefeated)) {
        this.state = 'ending'; this.stateT = 0; this.won = true;
        this.players.forEach((p) => { p.belt.open = false; });
        Sfx.victory(); this.hud('toast', 'Level clear!');
        this.onWin();
      }
    },

    // Camera players point at the screen and hold still once, so the aim fits their body
    updateCalibration() {
      const todo = this.players.filter((p) => p.input.isCam() && !p.calibrated);
      if (!todo.length) { this.state = 'countdown'; this.stateT = 0; this.hud('countdown', 3); return; }
      const now = performance.now();
      const who = (p) => (this.players.length > 1 ? `Player ${p.id}: ` : '');
      let status = '';
      for (const p of todo) {
        const o = p.input.offsetNow;
        if (!o || now - o.t > 500) { p.calSamples = []; status = status || who(p) + 'Looking for you…'; continue; }
        p.calSamples.push(o);
        p.calSamples = p.calSamples.filter((s) => now - s.t < 1200);
        const n = p.calSamples.length;
        const mx = p.calSamples.reduce((a, s) => a + s.dx, 0) / n;
        const my = p.calSamples.reduce((a, s) => a + s.dy, 0) / n;
        const spread = Math.max(...p.calSamples.map((s) => Math.hypot(s.dx - mx, s.dy - my)));
        const span = n > 1 ? (p.calSamples[n - 1].t - p.calSamples[0].t) / 1000 : 0;
        if (spread > 0.12) { p.calSamples = [o]; status = status || who(p) + 'Hold your arm still…'; continue; }
        status = status || who(p) + (span > 0.3 ? 'Almost there…' : 'Hold still…');
        if (span >= 1.0) { p.input.calib = { cx: mx, cy: my }; p.calibrated = true; Sfx.lock(); }
      }
      this.hud('cal', status || 'Almost there…');
    },

    // Buttons pressed on the gamepad or tilt controller
    handlePhoneButtons(p) {
      for (const e of p.input.takeEvents()) {
        if (e === 'menu') { this.pause(null, p); return; }
        if (e === 'fire') {
          const a = p.smoothAim;
          const onMenu = a.x > MENU_BTN.x && a.x < MENU_BTN.x + MENU_BTN.w && a.y > MENU_BTN.y && a.y < MENU_BTN.y + MENU_BTN.h + 20;
          if (onMenu) { this.pause(null, p); return; }
          p.input.mouseFire = true;
        }
        if (e === 'reload') p.input.mouseReload = true;
        if (e === 'super') this.activateSuper(0);
        if (e === 'super2') this.activateSuper(1);
        if (e === 'gun' || e === 'grenade' || e === 'shield' || e === 'time') { this.equip(p, e); this.closeBelt(p); }
      }
    },

    // ---------------- Pause: time-out T, or holding the circle on the Menu button ----------------
    updatePauseGestures(p, dt) {
      const inp = p.input;
      if (inp.isClicky()) { p.menuHold = 0; return; }   // gamepad/tilt/mouse use their Menu button
      if (inp.isCam()) {
        if (inp.tSign && inp.poseFresh()) {
          if (!p.tLatch) {
            p.tHold += dt;
            this.setPrompt('Keep holding the T to pause', 0.2, p);
            if (p.tHold >= T_HOLD) { p.tHold = 0; this.pause('Paused with the time-out sign', p); return; }
          }
        } else { p.tHold = 0; p.tLatch = false; }
      }
      const a = p.smoothAim;
      const onMenu = a.x > MENU_BTN.x && a.x < MENU_BTN.x + MENU_BTN.w && a.y > MENU_BTN.y && a.y < MENU_BTN.y + MENU_BTN.h + 20;
      if (onMenu && inp.poseFresh()) {
        p.menuHold += dt;
        if (p.menuHold >= MENU_DWELL) { p.menuHold = 0; this.pause(null, p); }
      } else p.menuHold = 0;
    },

    // While paused or on the end screen: the player who opened the menu (or Player 1) points at buttons
    updateMenuCursor(dt) {
      const phonePlayers = this.players.filter((p) => p.input.mode === 'phone');
      const cp = (this.menuPlayer && this.menuPlayer.input.mode === 'phone' && this.players.includes(this.menuPlayer)) ? this.menuPlayer : phonePlayers[0];
      // Other players: their Menu button returns to the game, everything else is ignored
      for (const p of this.players) {
        if (p === cp) continue;
        const ev = p.input.takeEvents();
        if (ev.includes('menu') && this.paused) { this.resume(); return; }
      }
      if (!cp || !this.getMenuButtons) { this.hud('cursor', null); return; }
      const inp = cp.input;
      this.followAim(cp, dt);
      const a = cp.smoothAim;
      const buttons = this.getMenuButtons();
      const over = buttons.find((b) => a.x >= b.x && a.x <= b.x + b.w && a.y >= b.y && a.y <= b.y + b.h);
      const el = over ? over.el : null;
      if (!inp.isCam()) {
        // Gamepad / tilt: move the circle and press Fire to choose; Menu returns to the game
        this.hud('cursor', { x: a.x, y: a.y, p: 0, show: inp.poseFresh() });
        for (const e of inp.takeEvents()) {
          if (e === 'fire' && el) { Sfx.select(); el.click(); break; }
          if (e === 'menu' && this.paused) { this.resume(); break; }
        }
        return;
      }
      if (el !== this.cursor.target) { this.cursor = { target: el, t: 0 }; if (el) Sfx.lock(); }
      else if (el) this.cursor.t += dt;
      const progress = el ? Math.min(1, this.cursor.t / MENU_DWELL) : 0;
      this.hud('cursor', { x: a.x, y: a.y, p: progress, show: inp.poseFresh() });
      if (el && this.cursor.t >= MENU_DWELL) {
        this.cursor = { target: null, t: -0.6 };
        el.click();
      }
    },

    // ---------------- Video walk ----------------
    walkInit() {
      this.walkEnd();
      const cfg = !this.endless && !this.plat && (WALKS[this.levelId + '-' + this.stage] || WALKS[this.levelId]);
      if (!cfg) return;
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
      // kept in the page (some browsers stop decoding videos that are not), but invisible
      // (a real size and a tiny bit of opacity: some browsers pause videos they think nobody can see)
      v.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:90px;opacity:0.01;pointer-events:none;z-index:-1';
      const total = TYPES.reduce((a, t) => a + goalOf(t), 0);
      const n = Math.max(1, Math.ceil(total / (cfg.round || 5)));
      const groups = Array.from({ length: n }, (_, i) => Math.floor(total / n) + (i < total % n ? 1 : 0));
      const w = { v, ready: false, failed: false, times: null, groups, stop: 0, groupEnd: groups[0],
        moving: false, moveT: 0, pre: 0, wait: 0, walkTime: 0, rate: 1, manual: false, stall: 0, lastCT: 0 };
      v.addEventListener('loadedmetadata', () => {
        const d = v.duration;
        w.times = Array.from({ length: n }, (_, i) => (n === 1 ? 0 : (d * i) / (n - 1)));
      });
      v.addEventListener('loadeddata', () => { w.ready = true; this.bgCache = null; });
      v.addEventListener('error', () => { w.failed = true; this.bgCache = null; });   // falls back to the picture
      v.src = cfg.src;
      document.body.appendChild(v);
      v.load();
      this.walk = w;
    },
    // ---- moving film background (looping), e.g. Glowwood Forest ----
    bgVideoInit() {
      this.bgVideoEnd();
      const cfg = !this.endless && !this.plat && LEVELS[this.levelId] && LEVELS[this.levelId].video;
      if (!cfg || this.walk) return;
      const v = document.createElement('video');
      v.muted = true; v.defaultMuted = true; v.playsInline = true; v.loop = true; v.preload = 'auto';
      v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', ''); v.setAttribute('loop', '');
      // kept in the page but invisible (some browsers stop decoding videos that are not on the page)
      v.style.cssText = 'position:fixed;left:0;top:0;width:160px;height:90px;opacity:0.01;pointer-events:none;z-index:-1';
      const g = { v, ready: false, failed: false, flow: BG_FLOW[cfg.flow] || null, speed: 1, panX: 0, panY: 0, rate: 1, lastT: -1, stall: 0,
        gentle: !!this.levelCfg.boss };
      v.addEventListener('loadeddata', () => { g.ready = true; });
      v.addEventListener('error', () => { g.failed = true; });          // falls back to the picture
      v.src = cfg.src;
      document.body.appendChild(v);
      v.load();
      // start at the right speed straight away (also during the countdown)
      g.rate = g.gentle ? 1 : BG_RATE;
      try { v.defaultPlaybackRate = g.rate; v.playbackRate = g.rate; } catch (e) { /* ignore */ }
      v.addEventListener('loadedmetadata', () => { try { v.playbackRate = g.rate; } catch (e) { /* ignore */ } });
      const pr = v.play(); if (pr && pr.catch) pr.catch(() => {});
      this.bgv = g;
    },
    bgVideoEnd() {
      const g = this.bgv;
      if (!g) return;
      try { g.v.pause(); g.v.removeAttribute('src'); g.v.load(); } catch (e) { /* ignore */ }
      g.v.remove();
      this.bgv = null; this.bgCache = null;
    },
    updateBgVideo(dt, worldSpeed) {
      const g = this.bgv, v = g.v;
      if (g.failed) { g.speed = 1; g.panX = g.panY = 0; return; }
      // the film plays at its original speed; slow motion (gadget belt,
      // time grenade, boss entrance) slows it down further
      const base = g.gentle ? 1 : BG_RATE;
      const rate = clamp(worldSpeed * base, 0.15, 1);
      if (Math.abs(rate - g.rate) > 0.04) { g.rate = rate; try { v.playbackRate = rate; } catch (e) { /* ignore */ } }
      if (v.paused && !this.paused) { const pr = v.play(); if (pr && pr.catch) pr.catch(() => {}); }
      // a film that stops playing (decoder trouble) falls back to the still picture
      if (g.ready && !v.paused) { if (v.currentTime === g.lastT) g.stall += dt; else g.stall = 0; g.lastT = v.currentTime; if (g.stall > 3) { g.failed = true; return; } }
      const f = g.flow;
      if (!f || !g.ready) { g.speed = 1; g.panX = g.panY = 0; return; }
      const n = f.speed.length, pos = (v.currentTime / (v.duration || 19)) * n, i = Math.floor(pos) % n, j = (i + 1) % n, k = pos - Math.floor(pos);
      const at = (arr) => arr[i] + (arr[j] - arr[i]) * k;
      let sp = at(f.speed), px = at(f.panX), py = at(f.panY);
      // the boss level: the same film, but gentle (smaller speed changes, less sliding)
      if (g.gentle) { sp = 1 + (sp - 1) * 0.3; px *= 0.35; py *= 0.25; }
      else { sp = 1 + (sp - 1) * BG_SPEED_EFFECT; px *= BG_RATE; py *= BG_RATE; }   // aliens slide exactly with the scenery
      // (aliens already move in slow motion during slow motion, so that is not counted twice)
      g.speed = sp; g.panX = px; g.panY = py;
    },
    walkEnd() {
      const w = this.walk;
      if (!w) return;
      try { w.v.pause(); w.v.removeAttribute('src'); w.v.load(); } catch (e) { /* ignore */ }
      w.v.remove();
      this.walk = null; this.bgCache = null;
    },
    walkRate(r) {
      const w = this.walk;
      r = clamp(r, 0.1, 1);
      if (Math.abs(r - w.rate) > 0.04) { w.rate = r; try { w.v.playbackRate = r; } catch (e) { /* ignore */ } }
    },
    // Arrive at the next stop: aliens come again after a short moment
    walkArrive() {
      const w = this.walk;
      w.moving = false; w.stop++; w.groupEnd += w.groups[w.stop]; w.wait = 0.5; w.pre = 0;
      this.spawnTimer = 0.4; this.bgCache = null;
    },
    updateWalk(dt, worldSpeed) {
      const w = this.walk;
      if (w.failed) return;
      const v = w.v;
      if (w.moving) {
        w.walkTime += dt; w.moveT += dt;
        const target = w.times[w.stop + 1];
        const ct = v.currentTime;
        const left = target - ct;
        // Safety net: a walk never takes much longer than planned, whatever the video does
        const planned = target - w.times[w.stop];
        if (v.ended || left <= 0.02 || w.moveT > planned * 3 + 3) {
          v.pause();
          if (left > 0.02) { try { v.currentTime = target; } catch (e) { /* ignore */ } }
          this.walkArrive(); return;
        }
        // ease in over the first half second, slow down over the last 0.7 seconds
        const rate = Math.min(1, 0.3 + w.moveT / 0.5) * clamp(left / 0.7, 0.25, 1) * worldSpeed;
        // Some phones and TVs quietly stop a video that plays in the background of a page.
        // If the picture stops moving, the game steps through the video itself for the rest of the level.
        if (ct > w.lastCT + 0.001) { w.lastCT = ct; w.stall = 0; } else w.stall += dt;
        if (!w.manual && w.stall > 0.6) { w.manual = true; v.pause(); }
        if (w.manual) {
          if (!v.paused) v.pause();
          if (!v.seeking) { try { v.currentTime = Math.min(target, ct + dt * rate); } catch (e) { /* ignore */ } }
          return;
        }
        this.walkRate(rate);
        if (v.paused) v.play().catch(() => {});         // e.g. after the app was in the background
        return;
      }
      if (w.wait > 0) { w.wait -= dt; return; }
      if (w.stop >= w.groups.length - 1) return;         // last stop: the level ends when this group is caught
      if (this.totalCaught() < w.groupEnd || this.monsters.length) { w.pre = 0; return; }
      w.pre += dt;
      if (w.pre < 0.7) return;                           // a short breath after the last catch
      if (!w.ready || !w.times) { this.walkArrive(); w.wait = 0; return; }   // video not there: carry on in place
      w.moving = true; w.moveT = 0; w.stall = 0; w.lastCT = v.currentTime;
      if (w.manual) return;                              // stepping through the video ourselves
      this.walkRate(0.3 * worldSpeed);
      v.play().catch(() => {
        // the video refuses to play: jump to the next stop instead
        if (!w.moving || this.walk !== w) return;
        try { v.currentTime = w.times[w.stop + 1]; } catch (e) { /* ignore */ }
        this.walkArrive();
      });
    },

    // ---------------- Monsters ----------------
    updateSpawning(dt) {
      if (this.endless && this.bossWave) return;
      if (this.tut) return;                                // the training brings its own aliens          // the boss brings its own helpers
      const walk = this.walk && !this.walk.failed ? this.walk : null;
      if (walk && (walk.moving || walk.wait > 0)) return;  // no aliens while walking or just arriving
      this.spawnTimer -= dt;
      if (this.spawnTimer > 0) return;
      const progress = this.endless ? Math.min(1, this.wave / 20) : this.special === 'survive' ? Math.min(1, this.surviveT / SURVIVE_TIME)
        : this.totalCaught() / Math.max(1, TYPES.reduce((a, t) => a + goalOf(t), 0));
      const alive = this.monsters.filter((m) => m.state === 'alive').length;
      // in a walk level the whole round may be out at once
      const maxAlive = walk ? walk.groups[walk.stop] : 4 + Math.floor(progress * 3) + (this.special === 'survive' ? 2 : 0);
      const decoys = this.decoys && this.decoys.length ? this.monsters.filter((m) => m.decoy && m.state === 'alive').length : 0;
      if (this.decoys && this.decoys.length && decoys < 2 && Math.random() < 0.38) this.spawn(this.decoys[Math.floor(Math.random() * this.decoys.length)], { decoy: true });
      else if (alive - decoys < maxAlive && (!walk || this.totalCaught() + alive < walk.groupEnd)) {
        const type = this.pickType();
        if (type) this.spawn(type);
      }
      this.spawnTimer = (rand(0.9, 1.7) - progress * 0.35) / (this.levelCfg.speedMul || 1) * (this.special === 'survive' ? 0.7 : 1);
    },

    pickType() {
      if (this.endless || this.special === 'survive') return TYPES[Math.floor(Math.random() * TYPES.length)];
      // Only spawn types that still need catching, weighted by how many are left
      const weights = TYPES.map((t) => Math.max(0, goalOf(t) - this.caught[t] - this.monsters.filter((m) => m.type === t && m.state === 'alive').length));
      const total = weights.reduce((a, b) => a + b, 0);
      if (!total) return null;
      let r = Math.random() * total;
      for (let i = 0; i < TYPES.length; i++) { r -= weights[i]; if (r <= 0) return TYPES[i]; }
      return TYPES[TYPES.length - 1];
    },

    spawn(type, opts) {
      const s = SPR[type];
      const m = {
        type, state: 'alive', t: 0, age: 0, z: 0, gone: false,
        x0: rand(0.14, 0.86), phase: rand(0, Math.PI * 2),
        freq: rand(0.6, 1.2), amp: rand(50, 150),
        dur: rand(s.speed[0], s.speed[1]) / (this.levelCfg.speedMul || 1),
        throwT: rand(2, 4) / (this.levelCfg.attackMul || 1),
        px: 0, py: 0, size: 0, r: 0, vx: 0, flip: false, frame: s.front[0],
        ...this.rollVariant(),
      };
      if (opts && opts.decoy) { m.decoy = true; m.elite = false; m.hp = m.maxHp = 1; m.shiny = false; m.dur *= 0.8; }
      // level 3: about half of the aliens go for the bubble with the friendly alien
      if (!m.decoy && this.friend && this.friend.hp > 0 && Math.random() < 0.5) { m.toFriend = true; m.x0 = clamp(this.friend.x / W + rand(-0.12, 0.12), 0.1, 0.9); }
      this.lifeInit(m);
      this.monsters.push(m);
      return m;
    },

    // Armoured aliens (from level 3, more often in later worlds) need several hits; shiny golden aliens are rare
    rollVariant() {
      const chance = this.levelCfg.armourChance || 0;
      const elite = !this.boss && Math.random() < chance;
      const hp = elite ? Math.min(6, this.levelCfg.armourHp || 2) : 1;
      return { elite, hp, maxHp: hp, shiny: Math.random() < (this.shinyChance || 0.015), hitFlash: 0 };
    },

    updateMonster(m, dt, frozen) {
      const s0 = SPR[m.type];
      m.age += dt;
      m.hitFlash = Math.max(0, (m.hitFlash || 0) - dt);
      if (m.state === 'dying') { m.t += dt; if (m.t > 0.45) m.gone = true; return; }
      if (m.state === 'attacking') {
        m.t += dt;
        if (m.t > 0.3 && !m.hitDone) {
          m.hitDone = true;
          if (m.atk === 'friend') this.friendHit(m);
          else if (this.guard && this.guard.hp > 0) this.guardHit(m);
          else { this.playerHit(this.nearestPlayer(m.px)); if (m.mini && this.state === 'play') this.playerHit(this.nearestPlayer(m.px)); }
        }
        if (m.t > 0.45) {
          // the mini-boss stomps back and comes again; the others are done
          if (m.mini) { m.state = 'alive'; m.z = 0.42; m.t = 0; m.hitDone = false; m.atk = null; }
          else m.gone = true;
        }
        return;
      }
      if (m.crashT > 0) {
        // the mini-boss falls out of the sky and lands with a crash
        m.crashT -= dt;
        if (m.crashT <= 0) { this.shake = 0.9; Sfx.crash(); window.Haptics && Haptics.buzz(160, 1); this.burst(m.px, m.py + m.size * 0.4, '#ff5a3a', 30); this.waves.push({ x: m.px, y: m.py + m.size * 0.4, t: 0, color: '#ff8a6a' }); }
      }
      // Jellyfish swimmers push forward in strokes: a quick squeeze, then a slow glide
      let stroke = 0;
      if (s0.swim === 'jelly') {
        const ph = (m.age * 0.8 + m.phase / 6.283) % 1;
        stroke = Math.pow(Math.max(0, Math.sin(ph * Math.PI * 2)), 2);
        if (stroke > 0.9 && !m.bubbled && this.levelCfg.underwater) { m.bubbled = true; this.trailBubbles(m); }
        if (stroke < 0.1) m.bubbled = false;
      }
      const zRate = s0.pulse ? 0.25 + 2.2 * Math.max(0, Math.sin(m.age * 3 + m.phase))
        : s0.swim === 'jelly' ? 0.35 + 1.4 * stroke : 1;
      this.updateStatus(m, dt);
      if (!frozen && !(m.peekT > 0)) m.z += (dt / m.dur) * zRate * this.alienSlow(m) * (this.bgv && !m.mini ? this.bgv.speed : 1) * (m.sleepy ? 0.85 : 1);
      if (m.tutHold != null) m.z = Math.min(m.z, m.tutHold);
      // moving film: the alien slides along with the scenery when the camera turns (closer = a bit more),
      // and drifts slowly back toward the middle so it does not leave the screen
      if (this.bgv && !frozen) {
        const k = 0.6 + 0.4 * m.z;
        m.panX = ((m.panX || 0) + this.bgv.panX * W * k * dt) * Math.exp(-0.35 * dt);
        m.panY = ((m.panY || 0) + this.bgv.panY * H * 0.45 * k * dt) * Math.exp(-0.5 * dt);
        m.panX = clamp(m.panX, -W * 0.42, W * 0.42); m.panY = clamp(m.panY, -H * 0.16, H * 0.16);
      }
      const e = Math.pow(Math.min(m.z, 1), 1.35);
      const wobFreq = s0.swim === 'jelly' ? m.freq * 0.6 : m.freq;
      const wob = Math.sin(m.phase + m.age * wobFreq) * m.amp * 0.55 * (0.35 + 0.65 * m.z) * (s0.swim === 'walk' ? 0.35 : 1);
      if (!frozen && this.alienSlow(m) > 0 && !m.noEvade) this.updateEvasion(m, s0, dt);
      const px = clamp(lerp(m.x0, 0.5, m.z * 0.35) * W + wob + (m.ex || 0) + (m.panX || 0), 70, W - 70);
      m.vx = dt > 0 ? (px - (m.bpx != null ? m.bpx : px)) / dt : 0;     // speed from the real path (not from little shivers and hops)
      m.bpx = px;
      m.px = px;
      m.py = lerp(0.4, 0.6, e) * H + Math.sin(m.age * 2.1 + m.phase) * 10 * (0.5 + m.z);
      m.size = lerp(80, 360, e) * (s0.pulse ? 1 + 0.06 * Math.sin(m.age * 6 + m.phase) : 1) * (m.mini ? 1.15 : 1);
      m.r = m.size * 0.38;
      if (m.crashT > 0) m.py -= Math.pow(m.crashT / 0.9, 2) * (m.py + 260);
      if (s0.swim === 'jelly') {
        // squeeze the bell on each stroke and rise a little, tilt toward where it swims
        m.sx = 1 + 0.07 * stroke; m.sy = 1 - 0.1 * stroke;
        m.py -= stroke * 22 * (0.5 + m.z);
        m.rot = clamp(m.vx * 0.0012, -0.35, 0.35);
      } else if (s0.swim === 'walk') {
        // walks on the ground: lower on the screen the closer it gets, with a heavy stomping step
        const stomp = Math.abs(Math.sin(m.age * 5 + m.phase));
        m.py = lerp(0.5, 0.74, e) * H - stomp * 8 * (0.5 + m.z);
        m.sx = 1 + 0.03 * (1 - stomp); m.sy = 1 - 0.04 * (1 - stomp);
        m.rot = 0;
      } else if (s0.swim === 'glide') {
        // glide with slow wing beats, banking into turns, rising and sinking in long waves
        m.sx = 1 + 0.07 * Math.sin(m.age * 4.5 + m.phase); m.sy = 1;
        m.py += Math.sin(m.age * 1.3 + m.phase) * 26 * (0.5 + m.z);
        m.rot = clamp(m.vx * 0.0016, -0.4, 0.4);
      }
      if (s0.swim !== 'walk') m.py = clamp(m.py + (m.ey || 0) + (m.panY || 0), 90, H * 0.8);
      else if (m.panY) m.py += m.panY * 0.6;

      // Face the player, or turn sideways while drifting quickly
      const s = SPR[m.type];
      const step = Math.floor(m.age * 5 + m.phase);
      if (s.swim === 'jelly') {
        // frames follow the stroke: tentacles pulled in while pushing, spread while gliding
        if (Math.abs(m.vx) > 150) { m.frame = s.side[Math.floor(m.age * 3 + m.phase) % s.side.length]; m.flip = (m.vx < 0) !== !!s.faceLeft; m.rot = 0; }
        else { m.frame = stroke > 0.45 ? s.push[step % s.push.length] : s.front[Math.floor(m.age * 1.5 + m.phase) % s.front.length]; m.flip = false; }
      } else if (s.swim === 'walk') {
        // walking frames; rocks raised just before a throw, the crack of a hit on armour
        m.frame = m.throwAnim > 0 ? s.throwFrame : m.hitFlash > 0.05 && s.hurtFrame != null ? s.hurtFrame : s.front[step % s.front.length];
        m.flip = m.vx < -40;
        if (m.throwAnim > 0) m.throwAnim -= dt;
      } else if (Math.abs(m.vx) > 120) { m.frame = s.side[step % s.side.length]; m.flip = (m.vx < 0) !== !!s.faceLeft; if (s.swim) m.rot *= 0.4; }
      else { m.frame = s.front[step % s.front.length]; m.flip = false; }

      this.lifeUpdate(m, dt, s0, frozen);

      // Some monsters throw rocks from mid-distance
      if (!frozen && ((s.thrower && !m.noThrow) || m.mini || m.tutThrow) && !m.decoy && !(m.crashT > 0) && m.z > 0.25 && m.z < 0.9 && this.alienSlow(m) === 1) {
        m.throwT -= dt;
        if (m.throwT <= 0) { this.throwRock(m); m.throwT = (m.mini ? rand(2.2, 3.2) : rand(3.5, 6.5)) / (this.levelCfg.attackMul || 1); m.throwAnim = 0.45; }
      }

      if (m.confT > 0) m.px += Math.sin(this.time * 7 + m.phase) * 3;     // confused wobble
      if (m.bubbleRise) m.py -= m.bubbleRise;
      if (this.holeT > 0 || m.pullK) this.holePull(m, dt);
      if (!frozen && this.alienSlow(m) > 0 && !(m.crashT > 0)) {
        if (m.decoy && m.z >= 0.95) { m.gone = true; this.burst(m.px, m.py, '#ffffff', 8, true); return; }    // decoys just fly past
        if (m.toFriend && this.friend && this.friend.hp > 0 && m.z >= 0.62) { m.state = 'attacking'; m.atk = 'friend'; m.t = 0; return; }
        if (m.z >= 1) { m.state = 'attacking'; m.t = 0; }
      }
    },

    // =====================================================================================
    // Alive aliens: body language, feelings, voices, little idle moments and a trail per kind
    // =====================================================================================
    // which trail each kind leaves behind, and what its voice sounds like
    TRAIL_OF: { nebula: 'sparkle', prism: 'shard', solara: 'sparkle', glide: 'streak', vexa: 'bubble', pulsar: 'ring', nimbus: 'drop',
      echo: 'ring', splash: 'drop', razor: 'shard', orbita: 'sparkle', vortex: 'swirl', skybloom: 'petal', slimora: 'slime', vaporis: 'mist',
      emberoo: 'spark', floravex: 'shard', orbello: 'bubble', orblet: 'bubble', ember: 'spark' },
    TRAIL_COL: { nebula: '#ff9ad8', prism: '#9ff8ff', solara: '#ffd27a', glide: '#c8f6ff', vexa: '#c79bff', pulsar: '#ff7ad0', nimbus: '#8fd0ff',
      echo: '#7ff6ff', splash: '#6ec8ff', razor: '#d29bff', orbita: '#9fc8ff', vortex: '#b07cff', skybloom: '#ffb3e0', slimora: '#8dff9a', vaporis: '#e8f4ff',
      emberoo: '#ffab5a', floravex: '#7ff6d0', orbello: '#7ff6ff', orblet: '#ffa6e6', ember: '#ff9a4a' },
    voiceOf(type) {
      if (!this._voices) this._voices = {};
      if (this._voices[type]) return this._voices[type];
      const s = SPR[type] || {};
      let h = 0; for (const ch of type) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
      const r = (h % 1000) / 1000;
      const v = s.swim === 'walk' ? { base: 200 + r * 90, wave: 'triangle', vol: 1.2 }          // deep and rumbly
        : s.swim === 'jelly' ? { base: 720 + r * 260, wave: 'sine', vol: 1 }                  // high and bubbly
        : s.swim === 'glide' ? { base: 560 + r * 220, wave: 'triangle', vol: 0.9 }            // whistly
        : this.TRAIL_OF[type] === 'shard' ? { base: 980 + r * 300, wave: 'sine', vol: 0.8 }   // glassy
        : { base: 420 + r * 220, wave: 'triangle', vol: 1 };
      return (this._voices[type] = v);
    },
    chirp(m, mood) { if (m && !m.decoy && window.Sfx && Sfx.chirp) Sfx.chirp(this.voiceOf(m.type), mood); },
    emote(m, icon, dur = 1.5) {
      if (!m || m.state !== 'alive') return;
      const busy = this.monsters.filter((x) => x.em && x.em.t < x.em.dur).length;
      if (busy >= 3 && !(m.em && m.em.t < m.em.dur)) return;          // never a cloud of icons
      m.em = { icon, t: 0, dur };
    },
    lifeInit(m) {
      if (m.decoy) return;
      const tut = !!this.tut;
      m.lifeIdle = rand(3, 7);
      m.sleepy = !tut && !m.mini && Math.random() < 0.12;
      if (m.sleepy) m.sleepT = rand(0.5, 2);
      if (m.elite) m.angryT = rand(0.3, 1.2);
      m.helloT = Math.random() < 0.3 ? rand(0.4, 1.4) : -1;
      // some aliens peek in from the edge of the screen first
      const s = SPR[m.type] || {};
      if (!tut && !m.mini && !this.boss && s.swim !== 'walk' && Math.random() < 0.2) {
        m.peekT = 1.7; m.peekSide = m.x0 < 0.5 ? -1 : 1; m.z = Math.max(m.z, 0.22);
        m.helloT = 0.2;
      }
    },
    lifeUpdate(m, dt, s0, frozen) {
      if (m.decoy) return;
      if (!s0.swim) { m.sx = 1; m.sy = 1; m.rot = 0; }
      if (m.em) { m.em.t += dt; if (m.em.t >= m.em.dur) m.em = null; }
      const t = this.time;
      let lx = 0, ly = 0;
      // --- peeking in from the edge ---
      if (m.peekT > 0) {
        m.peekT -= dt;
        const el = 1.7 - m.peekT, xe = m.peekSide < 0 ? m.size * 0.12 : W - m.size * 0.12;
        if (el < 0.12) this.emote(m, '👀', 1.1);
        const k = el < 1.1 ? 0 : Math.min(1, (el - 1.1) / 0.6), ease = k * k * (3 - 2 * k);
        const bob = el < 1.1 ? Math.sin(el * 7) * m.size * 0.08 : 0;
        m.px = lerp(xe - m.peekSide * bob, m.px, ease);
        m.rot += -m.peekSide * 0.25 * (1 - ease);
      }
      // --- body language: stretch when fast, squash when turning, wobble when hit ---
      const sp = Math.abs(m.vx || 0);
      if (!(m.peekT > 0)) {
        const st = Math.min(0.12, sp / 4000);
        m.sx *= 1 + st; m.sy *= 1 - st * 0.7;
        const dir = sp > 60 ? Math.sign(m.vx) : 0;
        if (dir && m.lastDir && dir !== m.lastDir) m.sqT = 0.22;
        if (dir) m.lastDir = dir;
      }
      if (m.sqT > 0) { m.sqT -= dt; const k = Math.max(0, m.sqT / 0.22); m.sx *= 1 + 0.13 * k; m.sy *= 1 - 0.13 * k; }
      if (m.wobT > 0) { m.wobT -= dt; const k = Math.max(0, m.wobT / 0.55), w = Math.sin((0.55 - m.wobT) * 42) * 0.17 * k; m.sx *= 1 + w; m.sy *= 1 - w; }
      // --- looking at you: leans toward the aiming circle when it comes close ---
      const p = this.players && this.players.length ? this.players.reduce((a, q) => (Math.hypot(q.smoothAim.x - m.px, q.smoothAim.y - m.py) < Math.hypot(a.smoothAim.x - m.px, a.smoothAim.y - m.py) ? q : a)) : null;
      if (p) {
        const dx = p.smoothAim.x - m.px, dist = Math.hypot(dx, p.smoothAim.y - m.py);
        if (dist < 380) {
          m.rot += clamp(dx / 900, -0.18, 0.18) * (1 - dist / 380);
          if (!m.noticed && dist < 260 && m.age > 0.6) {
            m.noticed = true;
            if (Math.random() < 0.45) { this.emote(m, '❗', 1.1); if (Math.random() < 0.5) this.chirp(m, 'hello'); }
          }
        }
      }
      if (m.helloT > 0) { m.helloT -= dt; if (m.helloT <= 0) this.chirp(m, 'hello'); }
      // --- feelings ---
      if (m.dzT > 0) { m.dzT -= dt; m.rot += Math.sin(t * 11 + m.phase) * 0.08 * Math.min(1, m.dzT); }
      if (m.teaseT > 0) { m.teaseT -= dt; const k = Math.min(1, m.teaseT / 0.3); m.rot += Math.sin(t * 32) * 0.25 * k; ly -= Math.abs(Math.sin(t * 16)) * 14 * k; }
      if (m.fearT > 0) { m.fearT -= dt; const k = Math.min(1, m.fearT / 0.3); lx += Math.sin(t * 70) * 5 * k + (m.fearDx || 0) * k; m.sy *= 1 - 0.06 * k; }
      if (m.sleepy) {
        m.sleepT -= dt;
        if (m.sleepT <= 0) { m.sleepT = rand(3, 5); this.emote(m, '💤', 1.8); if (Math.random() < 0.35) this.chirp(m, 'yawn'); }
        m.rot += Math.sin(t * 1.3 + m.phase) * 0.06;
      }
      if (m.elite && m.angryT != null) { m.angryT -= dt; if (m.angryT <= 0) { m.angryT = rand(4, 7); if (Math.random() < 0.6) this.emote(m, '😠', 1.4); } }
      // --- little idle moments when it is not in a hurry ---
      if (!frozen && !(m.peekT > 0) && !(m.dzT > 0) && !m.mini) {
        if (m.idle) {
          m.idleK += dt;
          const k = m.idleK / m.idleDur;
          if (m.idle === 'spin') m.rot += Math.PI * 2 * (k * k * (3 - 2 * k));
          else if (m.idle === 'wave') m.rot += Math.sin(m.idleK * 9) * 0.22 * (1 - k);
          else if (m.idle === 'hop') ly -= Math.abs(Math.sin(k * Math.PI * 2)) * 55 * (0.5 + m.z);
          else if (m.idle === 'bump') { lx += (m.bumpDx || 0) * Math.sin(Math.min(1, k) * Math.PI); m.rot += Math.sin(m.idleK * 14) * 0.12 * (1 - k); }
          if (k >= 1) { m.idle = null; m.lifeIdle = rand(4, 9); }
        } else if (m.z > 0.12 && m.z < 0.85) {
          m.lifeIdle -= dt;
          if (m.lifeIdle <= 0 && sp < 90) {
            m.idle = pick(['spin', 'wave', 'hop', 'hop']); m.idleK = 0; m.idleDur = m.idle === 'spin' ? 0.8 : m.idle === 'wave' ? 1.1 : 0.9;
            if (m.idle === 'wave' && Math.random() < 0.5) this.emote(m, '👋', 1.2);
            if (m.idle === 'spin' && Math.random() < 0.3) this.chirp(m, 'giggle');
          } else if (m.lifeIdle <= 0) m.lifeIdle = rand(1, 2);
        }
      }
      // --- a trail of its own ---
      this.emitTrail(m, dt);
      m.px = (m.peekT > 0 ? m.px : clamp(m.px + lx, 40, W - 40)); m.py += ly;
    },
    // two aliens bumping into each other giggle and bounce apart
    lifeBumps() {
      const al = this.monsters.filter((m) => m.state === 'alive' && !m.decoy && !m.mini && !m.idle && !(m.peekT > 0) && m.z > 0.12 && m.z < 0.85);
      for (let i = 0; i < al.length; i++) for (let j = i + 1; j < al.length; j++) {
        const a = al[i], b = al[j];
        if (Math.abs(a.z - b.z) > 0.18 || (a.bumpCd || 0) > this.time || (b.bumpCd || 0) > this.time) continue;
        const d = Math.hypot(a.px - b.px, a.py - b.py);
        if (d < (a.r + b.r) * 0.85) {
          const dir = Math.sign(a.px - b.px) || 1;
          for (const [m, s] of [[a, dir], [b, -dir]]) { m.idle = 'bump'; m.idleK = 0; m.idleDur = 0.7; m.bumpDx = s * 45 * (0.5 + m.z); m.bumpCd = this.time + 6; }
          if (Math.random() < 0.6) this.emote(Math.random() < 0.5 ? a : b, '😆', 1.2);
          this.chirp(a, 'giggle');
          return;
        }
      }
    },
    lifeHit(m) { m.dzT = 1.5; m.wobT = 0.55; this.chirp(m, 'ouch'); },
    lifeTease(at) {
      if ((this._teaseCd || 0) > this.time) return;
      let best = null, bd = 260;
      for (const m of this.monsters) if (m.state === 'alive' && !m.decoy && !m.mini) { const d = Math.hypot(m.px - at.x, m.py - at.y); if (d < bd) { bd = d; best = m; } }
      if (!best) return;
      this._teaseCd = this.time + 1.6;
      best.teaseT = 0.8;
      if (Math.random() < 0.7) this.emote(best, '😜', 1.2);
      this.chirp(best, 'hehe');
    },
    lifeFear(caught) {
      let said = false;
      for (const m of this.monsters) {
        if (m === caught || m.state !== 'alive' || m.decoy || m.mini) continue;
        const d = Math.hypot(m.px - caught.px, m.py - caught.py);
        if (d > 480) continue;
        m.fearT = 0.9; m.fearDx = Math.sign(m.px - caught.px || 1) * 30;
        if (!said && Math.random() < 0.35) { said = true; this.emote(m, '😱', 1.2); this.chirp(m, 'scared'); }
      }
    },
    // your buddy from the ranch floats beside the blaster and cheers when you catch an alien
    drawBuddy() {
      if (!this.buddy || this.state === 'idle') return;
      const s = SPR[this.buddy], img = Assets.images[this.buddy];
      if (!s || !img) return;
      this.buddyT += 1 / 60;
      if (this.buddyHop > 0) this.buddyHop -= 1 / 60;
      const hop = this.buddyHop > 0 ? Math.sin((0.45 - this.buddyHop) / 0.45 * Math.PI) * 60 : 0;
      const x = W / 2 - 235 + Math.sin(this.buddyT * 0.9) * 10, y = H - 115 + Math.sin(this.buddyT * 2.2) * 8 - hop;
      const fr = s.front[Math.floor(this.buddyT * 4) % s.front.length];
      const c = this.ctx;
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x, H - 40, 50, 10, 0, 0, Math.PI * 2); c.fill(); c.restore();
      this.drawFrame(img, s, fr, x, y, 130, false, 1, Math.sin(this.buddyT * 1.7) * 0.08 + (hop ? 0.15 : 0), 1 + (hop ? 0.05 : 0), 1 - (hop ? 0.05 : 0));
      if (hop > 40 && Math.random() < 0.08) this.burst(x, y - 70, '#ff7ab0', 2, false);
    },
    // ---- trails ----
    emitTrail(m, dt) {
      if (this.fxReduced || m.state !== 'alive' || m.z < 0.05) return;
      const kind = this.TRAIL_OF[m.type]; if (!kind) return;
      if (!this.trails) this.trails = [];
      if (this.trails.length > (this.lowFx ? 180 : 360)) return;
      const rate = { ring: 1.3, mist: 3, streak: 9, swirl: 6, drop: 4, slime: 3 }[kind] || 7;
      m.trailAcc = (m.trailAcc || 0) + dt * rate * (this.lowFx ? 0.55 : 1);
      const sc = m.size / 250, col = this.TRAIL_COL[m.type] || '#ffffff';
      while (m.trailAcc >= 1) {
        m.trailAcc -= 1;
        const q = { kind, col, t: 0, sc, x: m.px + rand(-0.25, 0.25) * m.size, y: m.py + rand(-0.15, 0.25) * m.size, vx: rand(-20, 20), vy: 0, life: rand(0.6, 1.1), rot: rand(0, 6) };
        if (kind === 'drop' || kind === 'slime') { q.y = m.type === 'nimbus' ? m.py - m.size * 0.58 : m.py + m.size * 0.2; if (m.type === 'nimbus') q.x = m.px + rand(-0.18, 0.18) * m.size; q.vy = rand(60, 140); q.life = 0.7; }
        else if (kind === 'spark') { q.vy = -rand(60, 160); q.life = rand(0.4, 0.8); }
        else if (kind === 'bubble') { q.vy = -rand(40, 90); q.life = rand(0.8, 1.3); }
        else if (kind === 'ring') { q.x = m.px; q.y = m.py; q.r0 = m.size * 0.3; q.life = 0.9; }
        else if (kind === 'streak') { q.x = m.px - Math.sign(m.vx || 1) * m.size * 0.3; q.len = rand(30, 70) * sc; q.dir = -Math.sign(m.vx || 1); q.life = 0.35; }
        else if (kind === 'mist') { q.life = 1.2; q.vy = -10; }
        else if (kind === 'petal') { q.vy = rand(20, 60); q.life = 1.2; }
        else if (kind === 'swirl') { q.cx = m.px; q.cy = m.py; q.ang = rand(0, 6.28); q.rad = m.size * rand(0.3, 0.45); q.life = 0.8; }
        else if (kind === 'shard') { q.vy = rand(10, 50); q.life = 0.9; }
        this.trails.push(q);
      }
    },
    updateTrails(dt) {
      if (!this.trails || !this.trails.length) return;
      for (const q of this.trails) {
        q.t += dt; q.rot += dt * 3;
        if (q.kind === 'drop' || q.kind === 'slime') q.vy += 520 * dt;
        if (q.kind === 'bubble') q.x += Math.sin(q.t * 6 + q.rot) * 30 * dt;
        if (q.kind === 'petal') q.x += Math.sin(q.t * 4 + q.rot) * 50 * dt;
        if (q.kind === 'heart') q.vy -= 30 * dt;
        if (q.kind === 'swirl') { q.ang += dt * 5; q.rad *= Math.pow(0.4, dt); q.x = q.cx + Math.cos(q.ang) * q.rad; q.y = q.cy + Math.sin(q.ang) * q.rad * 0.6; }
        else { q.x += q.vx * dt; q.y += q.vy * dt; }
      }
      this.trails = this.trails.filter((q) => q.t < q.life);
    },
    drawTrails() {
      if (!this.trails || !this.trails.length) return;
      const c = this.ctx;
      c.save();
      for (const q of this.trails) {
        if (q.t < 0) continue;
        const k = q.t / q.life, a = 1 - k, s = q.sc;
        c.globalAlpha = a;
        c.globalCompositeOperation = q.kind === 'drop' || q.kind === 'slime' || q.kind === 'petal' || q.kind === 'heart' ? 'source-over' : 'lighter';
        c.fillStyle = q.col; c.strokeStyle = q.col;
        if (q.kind === 'sparkle' || q.kind === 'spark') {
          const r = (q.kind === 'spark' ? 5 : 8) * s * (1 - k * 0.5) * (0.6 + 0.4 * Math.sin(q.t * 20 + q.rot));
          c.beginPath(); c.moveTo(q.x, q.y - r * 2); c.lineTo(q.x + r * 0.5, q.y - r * 0.5); c.lineTo(q.x + r * 2, q.y); c.lineTo(q.x + r * 0.5, q.y + r * 0.5);
          c.lineTo(q.x, q.y + r * 2); c.lineTo(q.x - r * 0.5, q.y + r * 0.5); c.lineTo(q.x - r * 2, q.y); c.lineTo(q.x - r * 0.5, q.y - r * 0.5); c.closePath(); c.fill();
        } else if (q.kind === 'shard') {
          const r = 9 * s; c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.beginPath(); c.moveTo(0, -r * 1.6); c.lineTo(r * 0.7, 0); c.lineTo(0, r * 1.6); c.lineTo(-r * 0.7, 0); c.closePath(); c.fill(); c.restore();
        } else if (q.kind === 'bubble') {
          c.lineWidth = Math.max(1, 2.5 * s); c.beginPath(); c.arc(q.x, q.y, 9 * s * (1 + k * 0.4), 0, Math.PI * 2); c.stroke();
        } else if (q.kind === 'ring') {
          c.lineWidth = Math.max(1, 5 * s * a); c.beginPath(); c.arc(q.x, q.y, q.r0 * (1 + k * 1.2), 0, Math.PI * 2); c.stroke();
        } else if (q.kind === 'drop' || q.kind === 'slime') {
          const r = (q.kind === 'slime' ? 8 : 6) * s; c.beginPath(); c.moveTo(q.x, q.y - r * 2); c.quadraticCurveTo(q.x + r, q.y, q.x, q.y + r); c.quadraticCurveTo(q.x - r, q.y, q.x, q.y - r * 2); c.fill();
        } else if (q.kind === 'streak') {
          c.lineWidth = Math.max(1, 3 * s); c.lineCap = 'round'; c.beginPath(); c.moveTo(q.x, q.y); c.lineTo(q.x + q.dir * q.len * (1 + k), q.y); c.stroke();
        } else if (q.kind === 'mist') {
          c.globalAlpha = a * 0.35; c.beginPath(); c.arc(q.x, q.y, 22 * s * (1 + k), 0, Math.PI * 2); c.fill();
        } else if (q.kind === 'petal') {
          c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.beginPath(); c.ellipse(0, 0, 10 * s, 5 * s, 0, 0, Math.PI * 2); c.fill(); c.restore();
        } else if (q.kind === 'swirl') {
          c.beginPath(); c.arc(q.x, q.y, 5 * s, 0, Math.PI * 2); c.fill();
        } else if (q.kind === 'heart') {
          c.font = `${Math.round(46 * s)}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('❤️', q.x, q.y);
        }
      }
      c.restore();
    },
    // dizzy stars, the emote bubble and Nimbus' rain cloud
    lifeDraw(m) {
      if (m.decoy) return;
      const c = this.ctx;
      if (m.type === 'nimbus' && !this.fxReduced) {
        const cx = m.px, cy = m.py - m.size * 0.62, w = m.size * 0.22;
        c.save(); c.globalAlpha = 0.85 * Math.min(1, m.age * 2); c.fillStyle = '#e9f2ff';
        c.beginPath(); c.arc(cx - w * 0.8, cy, w * 0.55, 0, Math.PI * 2); c.arc(cx, cy - w * 0.35, w * 0.75, 0, Math.PI * 2); c.arc(cx + w * 0.85, cy, w * 0.6, 0, Math.PI * 2);
        c.rect(cx - w * 0.8, cy, w * 1.65, w * 0.5); c.fill(); c.restore();
      }
      if (m.dzT > 0) {
        const k = Math.min(1, m.dzT / 0.4), cy = m.py - m.size * 0.42, rx = m.size * 0.28, ry = m.size * 0.07;
        c.save(); c.globalAlpha = k;
        for (let i = 0; i < 3; i++) {
          const a = this.time * 5 + i * 2.094, x = m.px + Math.cos(a) * rx, y = cy + Math.sin(a) * ry, r = Math.max(6, m.size * 0.045);
          c.beginPath();
          for (let j = 0; j < 10; j++) { const rr = j % 2 ? r * 0.45 : r, aa = -Math.PI / 2 + j * Math.PI / 5; c.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); }
          c.closePath(); c.fillStyle = '#ffe27a'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#fff'; c.stroke();
        }
        c.restore();
      }
      if (m.em && m.em.t < m.em.dur) {
        const e = m.em, k = e.t / e.dur;
        const pop = e.t < 0.15 ? e.t / 0.15 * 1.15 : e.t < 0.25 ? 1.15 - (e.t - 0.15) * 1.5 : 1;
        const fade = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
        const r = clamp(m.size * 0.13, 22, 40) * pop, x = m.px + m.size * 0.28, y = m.py - m.size * 0.5 - r + Math.sin(this.time * 4) * 3;
        c.save(); c.globalAlpha = fade;
        c.fillStyle = 'rgba(255,255,255,0.95)'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
        c.beginPath(); c.moveTo(x - r * 0.5, y + r * 0.7); c.lineTo(x - r * 0.9, y + r * 1.35); c.lineTo(x - r * 0.05, y + r * 0.9); c.fill();
        c.font = `${Math.round(r * 1.25)}px ${EMOJI_FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(e.icon, x, y + r * 0.06);
        c.restore();
      }
    },

    // Free, unpredictable movement for regular aliens (not bosses):
    //  - wandering: every now and then it picks a new spot to drift to (no fixed pattern)
    //  - dodging: when your aiming circle comes close it darts away, sometimes it also flies/swims back
    // Walkers only move sideways; swimmers and flyers also up and down. Later levels: livelier and quicker.
    updateEvasion(m, s0, dt) {
      const lv = this.levelCfg.evade != null ? this.levelCfg.evade : 0.4;
      const kind = s0.swim === 'walk' ? 0.55 : s0.swim === 'jelly' ? 0.8 : s0.swim === 'glide' ? 1.15 : s0.pulse ? 0.95 : 1;
      const agile = lv * kind * (m.elite ? 0.8 : 1) * (m.mini ? 0.45 : 1);
      if (m.ex == null) { m.ex = 0; m.ey = 0; m.evx = 0; m.evy = 0; m.tx = 0; m.ty = 0; m.wT = rand(0.3, 1.2); m.dodgeCd = rand(0.8, 2); }
      const near = m.z > 0.82;                 // about to attack: it commits and stops dodging
      m.wT -= dt; m.dodgeCd -= dt;
      if (m.wT <= 0) {
        const reach = (0.35 + 0.65 * m.z) * agile;
        m.tx = rand(-1, 1) * W * 0.16 * reach;
        m.ty = s0.swim === 'walk' ? 0 : rand(-1, 1) * H * 0.09 * reach;
        m.wT = rand(0.5, 2.0) / (0.6 + agile);
      }
      if (!near && m.dodgeCd <= 0) {
        // the closest aiming circle
        let best = null, bd = 1e9;
        for (const p of this.players) { const a = p.smoothAim; const d = Math.hypot(a.x - m.px, a.y - m.py); if (d < bd) { bd = d; best = a; } }
        const zone = m.r * 1.6 + 70;
        if (best && bd < zone && Math.random() < agile * dt * 4) {
          const dir = Math.abs(m.px - best.x) < 12 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(m.px - best.x);
          const power = rand(650, 1050) * (0.5 + agile);
          m.evx += dir * power;
          if (s0.swim !== 'walk') m.evy += (Math.sign(m.py - best.y) || (Math.random() < 0.5 ? -1 : 1)) * power * 0.35;
          m.tx = clamp(m.ex + dir * W * 0.12 * agile, -W * 0.3, W * 0.3);
          if (Math.random() < 0.3 * lv) m.z = Math.max(0.04, m.z - 0.05 - 0.05 * lv);   // flies / swims away for a moment
          m.dodgeCd = rand(1.0, 2.4) / (0.5 + lv);
        }
      }
      // springy steering toward the target spot, with drag
      const k = 5 + 4 * agile, drag = Math.exp(-3.2 * dt);
      m.evx = (m.evx + (m.tx - m.ex) * k * dt) * drag;
      m.evy = (m.evy + (m.ty - m.ey) * k * dt) * drag;
      m.ex = clamp(m.ex + m.evx * dt, -W * 0.34, W * 0.34);
      m.ey = clamp(m.ey + m.evy * dt, -H * 0.18, H * 0.18);
      if (near) { m.tx *= 0.9; m.ty *= 0.9; }
    },

    // ---------------- Rocks thrown at the players ----------------
    throwRock(m, kind) {
      const target = this.players[Math.floor(Math.random() * this.players.length)] || this.players[0];
      const pts = [];
      const n = 7;
      for (let i = 0; i < n; i++) pts.push([Math.cos(i / n * Math.PI * 2) * rand(0.7, 1), Math.sin(i / n * Math.PI * 2) * rand(0.7, 1)]);
      this.rocks.push({
        x0: m.px, y0: m.py, tx: this.gunBase(target) + rand(this.players.length > 1 ? -200 : -380, this.players.length > 1 ? 200 : 380), ty: H * 0.8,
        t: 0, dur: (kind === 'ring' ? rand(2.3, 2.8) : rand(1.6, 2.1)) * (this.buddyBonus === 'slow' ? 1.25 : 1), color: SPR[m.type].color, spin: rand(-4, 4), pts,
        x: m.px, y: m.py, size: 20, r: 10, state: 'fly', rock: true, target: target.id, kind: kind || 'rock',
        art: m.bossArt || null, variant: Math.floor(Math.random() * 3),
      });
    },

    updateRocks(dt) {
      for (const r of this.rocks) {
        if (r.state === 'gone') continue;
        r.t += dt;
        const p = Math.min(1, r.t / r.dur), e = p * p;
        r.x = lerp(r.x0, r.tx, e);
        r.y = lerp(r.y0, r.ty, e) - Math.sin(p * Math.PI) * 70;
        r.size = lerp(22, 170, e);
        r.r = Math.max(34, r.size * 0.55);    // generous target size, easier to shoot down
        if (p >= 1) { r.state = 'gone'; this.playerHit(this.player(r.target)); }
      }
      this.rocks = this.rocks.filter((r) => r.state !== 'gone');
    },

    smashRock(r) {
      r.state = 'gone';
      Sfx.pop();
      window.Haptics && Haptics.buzz(20, 0.3, 50);
      if (r.kind === 'meteor') { this.addScore(60, r.x, r.y - 30, true); this.burst(r.x, r.y, '#ffb347', 18); }
      if (r.art) this.playFx(r.art, [3, 4], r.x, r.y, r.size * 2.2, 0.35);
      this.burst(r.x, r.y, r.color, 14);
    },

    // All damage goes through here, so the shield can block it

    // The player whose gun is closest to a spot on screen (monsters attack the nearest player)
    nearestPlayer(x) {
      let best = this.players[0], bd = Infinity;
      for (const p of this.players) { const d = Math.abs(this.gunBase(p) - x); if (d < bd) { bd = d; best = p; } }
      return best;
    },

    // All damage goes through here, so a player's shield can block it
    playerHit(p) {
      if (this.state !== 'play') return;
      if (this.barrierT > 0) {
        Sfx.block(); this.floater(W / 2, H - 320, window.t ? t('Blocked!') : 'Blocked!', '#bff9ff');
        return;
      }
      this.superCleanT = 0;
      p = p && this.players.includes(p) ? p : this.players[0];
      if (p.equipped === 'shield' && p.shieldHP > 0) {
        if (this.tut) this.tut.blocks++;
        p.shieldHP--;
        p.shieldFlash = 0.35;
        Sfx.block();
        window.Haptics && Haptics.buzz(35, 0.4);
        const pl = this.modLv('weapon', 'pshield');
        if (pl) {
          const m = this.monsters.filter((q) => q.state === 'alive').sort((a, b) => b.z - a.z)[0];
          if (m) { this.lasers.push({ x1: this.gunBase(p), y1: H - 260, x2: m.px, y2: m.py, t: 0.18, color: '#bff9ff' }); this.damageMonster(m, pl); }
        }
        if (p.shieldHP === 0) {
          p.shieldRecharge = SHIELD_RECHARGE;
          this.equip(p, 'gun');
          Sfx.hurt();
          this.hud('toast', this.tag(p) + 'Shield broken: back to the blaster');
        }
        this.hud('gear');
        return;
      }
      this.takeDamage();
    },

    takeDamage(amount) {
      if (this.tut && this.tut.step < TUT_FINAL) { Sfx.hurt(); this.shake = 0.15; return; }      // training: an "ouch", but no damage
      if (this.tut) { this.health = Math.max(25, this.health - 4); this.shake = 0.25; Sfx.hurt(); this.hud('health'); window.Haptics && Haptics.buzz(90, 0.9); return; }
      this.damageTaken = true;
      if (this.combo > 1) this.hud('combo', null);
      this.combo = 0; this.mult = 1;
      this.health = Math.max(0, this.health - (amount || this.levelCfg.damage || DAMAGE) / (this.healthMult || 1));
      this.countHitForDizzy();
      this.shake = 0.3;
      Sfx.hurt();
      window.Haptics && Haptics.buzz(90, 0.9);
      if (this.hasMedkit && !this.medkitUsed && this.health > 0 && this.health <= 30) {
        this.medkitUsed = true;
        this.health = Math.min(100, this.health + 30);
        this.hud('toast', 'Medkit used: +30%');
      }
      this.hud('health');
      if (this.health <= 0 && this.tryRevive()) return;
      if (this.health <= 0) {
        this.state = 'ending'; this.stateT = 0; this.won = false;
        this.players.forEach((p) => { p.belt.open = false; });
        Sfx.lose();
      }
    },

    countHitForDizzy() {
      if (this.dizzyT > 0 || this.dizzyImmune > 0 || this.state !== 'play') return;
      this.hitTimes = (this.hitTimes || []).filter((t0) => this.time - t0 < DIZZY.window);
      this.hitTimes.push(this.time);
      if (this.hitTimes.length >= DIZZY.hits) {
        this.hitTimes = [];
        this.dizzyT = DIZZY.time;
        this.dizzyStars = Array.from({ length: 46 }, () => ({ x: rand(0, 1), y: rand(0, 1), s: rand(10, 26), ph: rand(0, 6.28), sp: rand(-3, 3) }));
        this.players.forEach((p) => { this.closeBelt(p); p.input.mouseFire = false; p.input.mouseReload = false; });
        this.setDizzyLook(true);
        this.hud('toast', 'Dizzy!');
      }
    },
    setDizzyLook(on) {
      try { this.canvas.style.filter = on ? 'blur(2.2px) saturate(1.25)' : ''; } catch (e) { /* ignore */ }
    },
    updateDizzy(dt) {
      if (this.dizzyImmune > 0) this.dizzyImmune = Math.max(0, this.dizzyImmune - dt);
      if (!(this.dizzyT > 0)) return false;
      this.dizzyT -= dt;
      for (const p of this.players) {
        // no actions while dizzy: drop everything that was pressed (the menu still works)
        for (const e of p.input.takeEvents()) if (e === 'menu') { this.pause(null, p); return true; }
        p.input.mouseFire = false; p.input.mouseReload = false;
      }
      if (this.dizzyT <= 0) { this.dizzyT = 0; this.dizzyImmune = DIZZY.immune; this.setDizzyLook(false); }
      return this.dizzyT > 0;
    },
    drawDizzy() {
      const c = this.ctx, k = Math.min(1, this.dizzyT * 3);
      c.save();
      c.globalAlpha = 0.18 * k; c.fillStyle = '#ffe680'; c.fillRect(0, 0, W, H);
      const star = (x, y, r, rot) => {
        c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
        for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(Math.sin(a) * rr, -Math.cos(a) * rr); }
        c.closePath(); c.fill(); c.stroke(); c.restore();
      };
      c.fillStyle = '#ffd84a'; c.strokeStyle = '#fff6c4'; c.lineWidth = 2;
      for (const st of this.dizzyStars || []) {
        c.globalAlpha = k * (0.55 + 0.45 * Math.sin(this.time * 6 + st.ph));
        star(st.x * W + Math.sin(this.time * 2 + st.ph) * 18, st.y * H + Math.cos(this.time * 2.4 + st.ph) * 14, st.s, this.time * st.sp);
      }
      // a ring of stars spinning around the middle of the screen
      c.globalAlpha = k;
      for (let i = 0; i < 7; i++) {
        const a = this.time * 3 + (i * Math.PI * 2) / 7;
        star(W / 2 + Math.cos(a) * 170, H * 0.42 + Math.sin(a) * 55, 22, a * 2);
      }
      c.globalAlpha = k; c.font = `700 64px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = '#3a2a00'; c.fillStyle = '#ffe680';
      c.strokeText('Dizzy!', W / 2, H * 0.42 - 90); c.fillText('Dizzy!', W / 2, H * 0.42 - 90);
      c.restore();
    },

    // ================= Training (tutorial) =================
    // the right name for a button, for the controls the child is using
    tutKeys() {
      const T = (s) => (window.t ? t(s) : s);
      const pad = window.Pad && Pad.inUse, p = this.players[0], mouse = p && p.input.mode === 'mouse';
      if (pad) return { aim: T('the stick'), fire: 'A', reload: 'B', shield: 'Y', grenade: 'X' };
      if (mouse) return { aim: T('the mouse'), fire: T('the left mouse button'), reload: 'R', shield: '3', grenade: '2' };
      if (this.touchMode) return { aim: T('the joystick (bottom left)'), fire: 'FIRE', reload: T('the reload button'), shield: T('the shield button'), grenade: T('the net button') };
      return { aim: T('your phone'), fire: 'Fire', reload: 'Reload', shield: T('Shield'), grenade: T('Net grenade') };
    },
    tutSay(hint) {
      const tu = this.tut, key = TUT_STEPS[tu.step], lines = TUT_TEXT[key];
      const text = window.t ? t(lines[hint ? 1 : 0], this.tutKeys()) : lines[hint ? 1 : 0];
      let progress = '';
      if (key === 'aim') progress = `${Math.min(3, tu.ring + 1)} / 3`;
      if (key === 'final') progress = `${Math.min(5, tu.caught - tu.finalStart)} / 5`;
      this.hud('tut', { text, step: tu.step, steps: TUT_STEPS.length - 1, progress, hint: !!hint, glow: TUT_GLOW[key] });
    },
    tutNext() {
      const tu = this.tut;
      tu.step++; tu.t = 0; tu.idle = 0; tu.hinted = false;
      const key = TUT_STEPS[tu.step], p = this.players[0];
      const add = (type, o) => { const m = this.spawn(type); Object.assign(m, { elite: false, hp: 1, maxHp: 1, shiny: false, noEvade: true, noThrow: true, x0: 0.5, z: 0.15, dur: 6, tutHold: 0.45 }, o || {}); return m; };
      if (tu.step > 0) { Sfx.win(); this.burst(W / 2, H * 0.3, '#7dffb0', 18, true); }
      if (key === 'aim') { tu.rings = [{ x: W * 0.3, y: H * 0.4 }, { x: W * 0.7, y: H * 0.32 }, { x: W * 0.5, y: H * 0.55 }]; tu.ring = 0; }
      if (key === 'fire') tu.want = [add('nebula', { x0: 0.55 })];
      if (key === 'reload') { p.ammo = 0; p.reloading = 0; this.hud('ammo'); }
      if (key === 'armour') tu.want = [add('prism', { elite: true, hp: 3, maxHp: 3, x0: 0.42 })];
      if (key === 'shield') { tu.blocks = 0; tu.want = [add('prism', { x0: 0.6, tutThrow: true, tutImmune: true, throwT: 1.6, tutHold: 0.4 })]; }
      if (key === 'net') {
        p.grenades = Math.max(p.grenades, 3); this.hud('gear');
        tu.want = [-0.06, 0, 0.06].map((dx, i) => add('nebula', { x0: 0.5 + dx, phase: i * 2.1, amp: 20, tutHold: 0.38 }));
      }
      if (key === 'final') { tu.finalStart = tu.caught; tu.finalSpawn = 0.3; }
      if (key === 'done') {
        this.players.forEach((q) => this.closeBelt(q));
        this.showBanner(window.t ? t('Training complete!') : 'Training complete!', window.t ? t('You are a Cadet now!') : 'You are a Cadet now!', '#7dffb0', 2.6);
        Sfx.victory();
      }
      this.tutSay(false);
    },
    updateTutorial(dt) {
      const tu = this.tut, p = this.players[0];
      if (tu.step < 0) { if (this.stateT > 0.6) this.tutNext(); return; }
      tu.t += dt; tu.idle += dt;
      const key = TUT_STEPS[tu.step];
      const allCaught = () => (tu.want || []).every((m) => m.state !== 'alive');
      // nobody can run out of shots during training (except in the reload step)
      if (key !== 'reload' && p.ammo <= 2 && !p.reloading) { p.ammo = this.magSize; this.hud('ammo'); }
      if (key === 'aim') {
        const r = tu.rings[tu.ring], a = p.reticle || p.smoothAim;
        if (Math.hypot(a.x - r.x, a.y - r.y) < 80) { tu.hold += dt; if (tu.hold > 0.35) { tu.hold = 0; tu.ring++; tu.idle = 0; Sfx.clink(); this.burst(r.x, r.y, '#7dffb0', 14, true); if (tu.ring >= 3) return this.tutNext(); this.tutSay(false); } }
        else tu.hold = Math.max(0, tu.hold - dt);
      }
      if ((key === 'fire' || key === 'armour' || key === 'net') && allCaught() && tu.t > 0.5) return this.tutNext();
      if (key === 'reload' && (p.reloading > 0 || p.ammo >= this.magSize)) { if (!tu.reloadT) tu.reloadT = 0.9; }
      if (tu.reloadT) { tu.reloadT -= dt; if (tu.reloadT <= 0) { tu.reloadT = 0; return this.tutNext(); } }
      if (key === 'shield' && !tu.blocks && (tu.want || []).every((m) => m.state !== 'alive' || m.gone)) {
        const m = this.spawn('prism');
        Object.assign(m, { elite: false, hp: 1, maxHp: 1, shiny: false, noEvade: true, noThrow: true, x0: 0.6, z: 0.15, dur: 6, tutHold: 0.4, tutThrow: true, tutImmune: true, throwT: 1.2 });
        tu.want = [m];
      }
      if (key === 'shield') {
        if (tu.blocks > 0 && !tu.blockedT) { tu.blockedT = 1.2; this.floater(W / 2, H - 360, window.t ? t('Blocked!') : 'Blocked!', '#7dffb0'); }
        if (tu.blockedT) {
          tu.blockedT -= dt;
          if (tu.blockedT <= 0) {
            tu.blockedT = 0;
            this.equip(p, 'gun'); this.hud('gear');                          // back to the blaster
            (tu.want || []).forEach((m) => { if (m.state === 'alive') { m.gone = true; this.burst(m.px, m.py, '#ffffff', 10, true); } });
            return this.tutNext();
          }
        }
      }
      if (key === 'final') {
        const done = tu.caught - tu.finalStart;
        if (done !== tu.lastDone) { tu.lastDone = done; tu.idle = 0; this.tutSay(false); }
        if (done >= 5) return this.tutNext();
        tu.finalSpawn -= dt;
        const alive = this.monsters.filter((m) => m.state === 'alive').length;
        if (tu.finalSpawn <= 0 && alive < 3 && done + alive < 5) { this.spawn(Math.random() < 0.5 ? 'nebula' : 'prism'); tu.finalSpawn = rand(0.8, 1.4); }
      }
      if (key === 'done' && tu.t > 2.4 && this.state === 'play') {
        this.state = 'ending'; this.stateT = 0; this.won = true;
        this.earned += 0;
      }
      // stuck: a simpler tip after a while
      if (!tu.hinted && tu.idle > (key === 'aim' ? 9 : 12) && TUT_TEXT[key][1]) { tu.hinted = true; this.tutSay(true); }
    },
    drawTutorial() {
      const tu = this.tut, c = this.ctx;
      if (!tu || tu.step < 0) return;
      const key = TUT_STEPS[tu.step], p = this.players[0], a = p.reticle || p.smoothAim;
      const arrowTo = (x, y, r) => {
        // a bouncing arrow pointing at the spot, coming from the aiming circle's side
        const ang = Math.atan2(y - a.y, x - a.x), d = Math.hypot(x - a.x, y - a.y);
        if (d < r + 40) return;
        const bob = Math.sin(this.time * 7) * 10, ex = x - Math.cos(ang) * (r + 24 + bob), ey = y - Math.sin(ang) * (r + 24 + bob);
        c.save(); c.translate(ex, ey); c.rotate(ang);
        c.fillStyle = '#ffd27a'; c.strokeStyle = '#3a2a00'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-46, -30); c.lineTo(-46, -12); c.lineTo(-96, -12); c.lineTo(-96, 12); c.lineTo(-46, 12); c.lineTo(-46, 30); c.closePath();
        c.stroke(); c.fill(); c.restore();
      };
      if (key === 'aim' && tu.ring < 3) {
        const r = tu.rings[tu.ring], pulse = 1 + 0.08 * Math.sin(this.time * 6), R = 70 * pulse;
        c.save();
        c.shadowColor = '#7dffb0'; c.shadowBlur = this.glow(24);
        c.strokeStyle = '#7dffb0'; c.lineWidth = 8; c.beginPath(); c.arc(r.x, r.y, R, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 3; c.globalAlpha = 0.6; c.beginPath(); c.arc(r.x, r.y, R * 0.55, 0, Math.PI * 2); c.stroke();
        if (tu.hold > 0) { c.globalAlpha = 1; c.lineWidth = 10; c.strokeStyle = '#ffffff'; c.beginPath(); c.arc(r.x, r.y, R + 14, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, tu.hold / 0.35)); c.stroke(); }
        c.restore();
        arrowTo(r.x, r.y, R);
      }
      if (key === 'fire' || key === 'armour' || key === 'net') {
        const m = (tu.want || []).find((q) => q.state === 'alive');
        if (m) arrowTo(m.px, m.py, m.r + 10);
      }
    },

    // ================= Special levels, mini-boss, Hyper mode, banners and Orbit =================
    initSpecial() {
      const cfg = this.levelCfg, sp = this.special = cfg.special || null;
      this.decoys = cfg.decoys || [];
      this.surviveT = 0;
      this.mini = null; this.miniDone = false;
      this.storm = null; this.stormDone = false;
      this.dark = sp === 'dark';
      this.hyper = 0; this.hyperT = 0;
      this.banner = null;
      this.orbitCd = 6; this.orbitSaid = {}; this.lastOrbitT = 0;
      this.bossWorldName = cfg.name;
      this.friend = null; this.guard = null;
      if (sp === 'rescue') {
        // a friendly alien (one that does not live in this world) trapped in a bubble
        const w = LEVELS[this.levelId] || {};
        const pool = ALL_TYPES.filter((t) => !(w.types || []).includes(t) && SPR[t] && !SPR[t].swim);
        const type = pool[(this.levelId * 7) % pool.length] || 'nebula';
        this.friend = { type, x: W / 2, y: H * 0.47, hp: 10, max: 10, hitT: 0, t: 0, popT: 0 };
      }
      if (sp === 'crystal') this.guard = { x: W / 2, y: H * 0.5, hp: 12, max: 12, hitT: 0 };
      this.eventPlan = {};
      if (window.Music && Music.setRate) Music.setRate(1);
    },
    // banner when play starts, plus a tip from Orbit
    onPlayStart() {
      const info = this.special && SPECIAL_INFO[this.special];
      if (info) {
        const name = this.special === 'only' ? (SPR[TYPES[0]] || {}).name : '';
        this.showBanner(window.t ? t(info.title, { name: t(name) }) : info.title.replace('{name}', name), window.t ? t(info.sub) : info.sub,
          this.special === 'mini' ? '#ff5a5a' : '#ffd27a', 3.2);
        this.orbitSay(this.special, true, 1.2);
      } else if (!this.endless && Math.random() < 0.6) this.orbitSay('hello', true, 0.8);
    },
    onWin() {
      if (this.hyperT > 0) this.endHyper();
      if (this.friend && this.friend.hp > 0) {
        this.friend.popT = 0.001; Sfx.net();
        if (!this.trails) this.trails = [];
        for (let i = 0; i < 9; i++) this.trails.push({ kind: 'heart', col: '#ff6a9a', t: -i * 0.08, life: 1.6, sc: 1, rot: 0, x: this.friend.x + rand(-90, 90), y: this.friend.y - rand(40, 120), vx: rand(-30, 30), vy: -rand(60, 120) });
        this.floater(this.friend.x, this.friend.y - 150, window.t ? t('Thank you!') : 'Thank you!', '#7dffb0');
        this.addScore(500, this.friend.x, this.friend.y - 90, true); this.earned += 3;
      }
      if (this.guard && this.guard.hp > 0) { this.addScore(50 * this.guard.hp, this.guard.x, this.guard.y - 120, true); this.earned += 2; }
      this.orbitSay('win', true);
    },
    lose(msg) {
      if (this.state !== 'play') return;
      this.state = 'ending'; this.stateT = 0; this.won = false;
      this.players.forEach((p) => { p.belt.open = false; });
      if (this.hyperT > 0) this.endHyper();
      Sfx.lose();
      this.loseReason = msg;
      if (msg) this.hud('toast', msg);
    },
    updateSpecial(dt, gdt) {
      const sp = this.special;
      if (this.banner) { this.banner.t += dt; if (this.banner.t > this.banner.dur) this.banner = null; }
      if (sp === 'survive') this.surviveT += dt;
      const f = this.friend;
      if (f) { f.t += dt; f.hitT = Math.max(0, f.hitT - dt); if (f.popT > 0) f.popT += dt; }
      if (this.guard) this.guard.hitT = Math.max(0, this.guard.hitT - dt);
      // progress of the level (0..1), for the mini-boss and the meteor storm
      const total = TYPES.reduce((a, t) => a + Math.min(goalOf(t), 9999), 0);
      const prog = sp === 'survive' ? this.surviveT / SURVIVE_TIME : total ? this.totalCaught() / total : 0;
      if (sp === 'mini' && !this.mini && !this.miniDone && prog >= 0.4) this.spawnMini();
      if (sp === 'storm' && !this.storm && !this.stormDone && prog >= 0.45) this.startStorm();
      if (this.endless && !this.bossWave) {
        if (this.eventPlan.storm && !this.storm && !this.stormDone && this.stateT > 6) this.startStorm();
        if (this.eventPlan.mini && !this.mini && !this.miniDone && this.stateT > 9) this.spawnMini();
      }
      if (this.storm) {
        const st = this.storm;
        st.t += dt; st.spawn -= gdt;
        if (st.spawn <= 0 && st.t < st.dur) {
          st.spawn = rand(0.5, 0.9) / Math.max(1, (this.levelCfg.speedMul || 1) * 0.9);
          const target = this.players[Math.floor(Math.random() * this.players.length)] || this.players[0];
          const x0 = rand(W * 0.08, W * 0.92);
          this.rocks.push({ x0, y0: -70, tx: clamp(this.gunBase(target) + rand(-520, 520), 120, W - 120), ty: H * 0.82, t: 0, dur: rand(1.9, 2.5),
            color: '#ff9a3a', spin: rand(-3, 3), pts: Array.from({ length: 8 }, (_, i) => [Math.cos(i / 8 * Math.PI * 2) * rand(0.72, 1), Math.sin(i / 8 * Math.PI * 2) * rand(0.72, 1)]),
            x: x0, y: -70, size: 20, r: 10, state: 'fly', rock: true, target: target.id, kind: 'meteor' });
        }
        if (st.t > st.dur + 2.5) { this.storm = null; this.stormDone = true; this.hud('toast', 'The meteor storm is over'); }
      }
      // the mini-boss's health bar is drawn in the game; losing the bubble or the crystal ends the level
      if (f && f.hp <= 0 && !f.lost) { f.lost = true; this.lose('The bubble popped!'); }
      if (this.guard && this.guard.hp <= 0 && !this.guard.lost) { this.guard.lost = true; this.lose('The crystal broke!'); }
      if (this.health > 0 && this.health <= 30 && !this.orbitSaid.low) this.orbitSay('low', true);
      if (!this.orbitSaid.armour && this.monsters.some((m) => m.elite && m.state === 'alive' && m.z > 0.15)) this.orbitSay('armour');
    },
    startStorm() {
      this.storm = { t: 0, dur: 14, spawn: 1.2 };
      Sfx.alarm();
      this.showBanner(window.t ? t('METEOR STORM!') : 'METEOR STORM!', window.t ? t('Shoot the meteors before they hit you') : 'Shoot the meteors before they hit you', '#ffb347', 2.4);
      this.orbitSay('stormNow', true);
    },
    // ---- mini-boss: one of this level's aliens, 15% bigger, red, with its own health bar ----
    spawnMini() {
      const w = LEVELS[this.levelId] || {};
      const pool = (this.decoys && this.decoys.length ? [...TYPES, ...this.decoys] : TYPES).filter((t) => SPR[t]);
      const type = pool[Math.floor(Math.random() * pool.length)];
      const rank = w.rank || this.levelId || 1;
      const hp = Math.round((9 + rank * 1.3 + (this.endless ? this.wave * 0.6 : 0)) * (this.players.length > 1 ? 1.4 : 1));
      const m = this.spawn(type);
      Object.assign(m, { mini: true, toFriend: false, elite: false, shiny: false, hp, maxHp: hp, z: 0.42, x0: 0.5, crashT: 0.9,
        dur: m.dur * 2.6, throwT: 2.5 });
      this.mini = m;
      Sfx.alarm();
      this.showBanner(window.t ? t('MINI-BOSS!') : 'MINI-BOSS!', (window.t ? t('Giant {name}', { name: t(SPR[type].name) }) : 'Giant ' + SPR[type].name), '#ff5a5a', 2.4);
      this.orbitSay('miniNow', true);
    },
    catchMini(m, netted) {
      window.Haptics && Haptics.buzz(220, 1);
      m.state = 'dying'; m.t = 0; m.netted = !!netted;
      this.dissolveMonster(m, netted);
      this.miniDone = true;
      this.shake = 0.5;
      this.earned += 5 * this.crystalValue();
      this.addScore(1000, m.px, m.py - m.r, true);
      Sfx.win(); Sfx.dissolve();
      this.burst(m.px, m.py, '#ff5a5a', 40, true);
      this.hud('toast', 'Mini-boss caught! Bonus reward!');
      this.hud('stat', { ev: 'mini' });
      const reg = REGION_MAT[this.regionWorld];
      ['goo', 'dust', 'shard', 'shard', reg].filter(Boolean).forEach((k, i) => setTimeout(() => this.giveDrop(k, m.px + rand(-90, 90), m.py + rand(-60, 60)), 140 * i));
      this.hyperAdd(0.25);
      this.hud('catch');
    },
    decoyHit(m) {
      m.state = 'dying'; m.t = 0; m.netted = false;
      this.burst(m.px, m.py, '#ffffff', 10, true);
      Sfx.hurt();
      if (this.combo > 1) this.hud('combo', null);
      this.combo = 0; this.mult = 1;
      this.score = Math.max(0, this.score - 100); this.hud('score', this.score);
      const name = (SPR[TYPES[0]] || {}).name || '';
      this.floater(m.px, m.py - m.r, window.t ? t('Oops! Only {name}!', { name: t(name) }) : `Oops! Only ${name}!`, '#ff8a8a');
    },
    friendHit(m) {
      const f = this.friend;
      if (!f || f.hp <= 0 || this.state !== 'play') return;
      if (this.barrierT > 0) { Sfx.block(); return; }
      f.hp--; f.hitT = 0.4; Sfx.hurt(); window.Haptics && Haptics.buzz(50, 0.6); this.shake = Math.max(this.shake, 0.15);
      this.burst(f.x, f.y, '#bff9ff', 12, true);
      if (f.hp <= 4 && !this.orbitSaid.friendLow) this.orbitSay('friendLow', true);
    },
    guardHit(m) {
      const g = this.guard;
      if (!g || g.hp <= 0 || this.state !== 'play') return;
      if (this.barrierT > 0) { Sfx.block(); return; }
      g.hp -= m.mini ? 2 : 1; g.hitT = 0.4; Sfx.hurt(); window.Haptics && Haptics.buzz(50, 0.6); Sfx.clink(); this.shake = Math.max(this.shake, 0.2);
      this.burst(g.x, g.y, '#7fe3ff', 14, true);
      if (g.hp <= 4 && !this.orbitSaid.guardLow) this.orbitSay('guardLow', true);
    },
    // ---- Hyper mode: quick catches fill the meter; full = 8 seconds of golden lasers and double points ----
    hyperAdd(v) {
      if (this.hyperT > 0 || this.state !== 'play') return;
      this.hyper = Math.min(1, (this.hyper || 0) + v);
      if (this.hyper >= 1) this.startHyper();
    },
    startHyper() {
      this.hyperT = 8; this.hyper = 0;
      Sfx.hyper(); this.shake = Math.max(this.shake, 0.3);
      if (window.Music && Music.setRate) Music.setRate(1.12);
      this.showBanner(window.t ? t('HYPER MODE!') : 'HYPER MODE!', window.t ? t('Double points!') : 'Double points!', 'rainbow', 1.6);
      this.orbitSay('hyper', true);
      this.hud('stat', { ev: 'hyper' });
    },
    endHyper() {
      this.hyperT = 0;
      if (window.Music && Music.setRate) Music.setRate(1);
    },
    updateHyper(dt) {
      if (this.hyperT > 0) { this.hyperT -= dt; if (this.hyperT <= 0) { this.endHyper(); this.hud('toast', 'Hyper mode over'); } }
      else if (this.hyper > 0 && this.time - this.lastCatchT > 3) this.hyper = Math.max(0, this.hyper - 0.07 * dt);
    },
    // ---- Orbit's speech bubbles: not too often (about every 20 s), important ones sooner ----
    orbitSay(kind, important, delay) {
      if (this.tut) return;
      const lines = ORBIT_LINES[kind];
      if (!lines || this.state === 'done') return;
      if (!important && this.orbitCd > 0) return;
      if (important && this.time - this.lastOrbitT < 3 && kind !== 'boss' && kind !== 'win') return;
      this.orbitSaid[kind] = true;
      this.orbitCd = 20; this.lastOrbitT = this.time;
      const text = lines[Math.floor(Math.random() * lines.length)];
      if (delay) setTimeout(() => { if (this.running) this.hud('orbit', text); }, delay * 1000);
      else this.hud('orbit', text);
    },
    updateOrbit(dt) {
      this.orbitCd -= dt;
      if (this.dizzyT > 0 && !this.orbitSaid.dizzy) this.orbitSay('dizzy', true);
      // a joke now and then when it's quiet
      if (this.time - this.lastOrbitT > 42 && this.orbitCd <= 0 && !this.boss) this.orbitSay('joke');
    },
    showBanner(title, sub, color, dur) { this.banner = { title, sub, color, dur: dur || 2.5, t: 0 }; },

    // a red version of an alien's sprite sheet (mini-boss)
    tintSheet(type) {
      const key = 'red_' + type;
      if (!Assets.images[key]) {
        const img = Assets.images[type];
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255, 30, 30, 0.5)'; g.fillRect(0, 0, cv.width, cv.height);
        Assets.images[key] = cv;
      }
      return Assets.images[key];
    },
    drawMiniBar(m) {
      const c = this.ctx, w = Math.max(200, m.size * 0.8), h = 16, x = m.px - w / 2, y = m.py - m.size * 0.62;
      c.save();
      c.fillStyle = 'rgba(40, 0, 0, 0.8)'; c.fillRect(x - 3, y - 3, w + 6, h + 6);
      c.strokeStyle = '#ffb0b0'; c.lineWidth = 2; c.strokeRect(x - 3, y - 3, w + 6, h + 6);
      const g = c.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#ff3a3a'); g.addColorStop(1, '#ffb347');
      c.fillStyle = g; c.fillRect(x, y, w * Math.max(0, m.hp / m.maxHp), h);
      c.font = `700 24px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillStyle = '#ffd0d0';
      c.shadowColor = '#000'; c.shadowBlur = this.glow(6);
      c.fillText(window.t ? t('MINI-BOSS') : 'MINI-BOSS', m.px, y - 6);
      c.restore();
    },
    drawFriend() {
      const f = this.friend, c = this.ctx;
      if (!f) return;
      const pop = f.popT > 0 ? Math.min(1, f.popT / 0.4) : 0;
      const bob = Math.sin(f.t * 1.6) * 14, x = f.x + (f.hitT > 0 ? rand(-6, 6) : 0), y = f.y + bob - pop * 120;
      const s = SPR[f.type], R = 118;
      c.save();
      c.globalAlpha = f.hp > 0 ? 1 - pop : 0.5;
      if (s && Assets.images[f.type]) this.drawFrame(Assets.images[f.type], s, s.front[Math.floor(f.t * 3) % s.front.length], x, y + 6, 170, false, 1 - pop * 0.5);
      if (pop < 1 && f.hp > 0) {
        // the bubble
        const g = c.createRadialGradient(x - R * 0.35, y - R * 0.4, R * 0.1, x, y, R);
        g.addColorStop(0, 'rgba(255,255,255,0.45)'); g.addColorStop(0.6, 'rgba(160,230,255,0.12)'); g.addColorStop(1, f.hitT > 0 ? 'rgba(255,90,90,0.55)' : 'rgba(140,220,255,0.45)');
        c.fillStyle = g; c.beginPath(); c.arc(x, y, R * (1 + pop * 0.3), 0, Math.PI * 2); c.fill();
        c.strokeStyle = f.hitT > 0 ? '#ff8a8a' : 'rgba(220,250,255,0.9)'; c.lineWidth = 4; c.stroke();
        // cracks when damaged
        const cracks = f.max - f.hp;
        c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2;
        for (let i = 0; i < Math.min(8, cracks); i++) {
          const a = i * 2.3 + 0.4; c.beginPath(); c.moveTo(x + Math.cos(a) * R, y + Math.sin(a) * R);
          c.lineTo(x + Math.cos(a + 0.2) * R * 0.75, y + Math.sin(a + 0.2) * R * 0.75); c.lineTo(x + Math.cos(a - 0.1) * R * 0.6, y + Math.sin(a - 0.1) * R * 0.6); c.stroke();
        }
      }
      c.restore();
      if (pop === 0 && f.hp > 0) this.drawSmallBar(f.x, f.y + R + 26, 220, f.hp / f.max, '#7dffb0', window.t ? t('Friend') : 'Friend');
    },
    drawGuard() {
      const g = this.guard, c = this.ctx;
      if (!g) return;
      const x = g.x + (g.hitT > 0 ? rand(-6, 6) : 0), y = g.y + Math.sin(this.time * 1.4) * 8, k = g.hp / g.max;
      c.save();
      c.shadowColor = '#62f0ff'; c.shadowBlur = this.glow(40);
      const gr = c.createLinearGradient(x - 60, y - 120, x + 60, y + 120);
      gr.addColorStop(0, '#e8fdff'); gr.addColorStop(0.5, g.hitT > 0 ? '#ff9aa8' : '#62d8ff'); gr.addColorStop(1, '#1a5ad8');
      c.fillStyle = gr; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
      c.globalAlpha = g.hp > 0 ? 1 : 0.3;
      c.beginPath(); c.moveTo(x, y - 125); c.lineTo(x + 62, y - 30); c.lineTo(x + 40, y + 95); c.lineTo(x, y + 125); c.lineTo(x - 40, y + 95); c.lineTo(x - 62, y - 30); c.closePath(); c.fill(); c.stroke();
      c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, y - 125); c.lineTo(x, y + 125); c.moveTo(x - 62, y - 30); c.lineTo(x + 62, y - 30); c.stroke();
      // cracks
      c.strokeStyle = 'rgba(20, 30, 70, 0.8)'; c.lineWidth = 3;
      for (let i = 0; i < Math.round((1 - k) * 7); i++) { const a = i * 1.7; c.beginPath(); c.moveTo(x + Math.sin(a) * 30, y + Math.cos(a) * 60); c.lineTo(x + Math.sin(a + 1) * 50, y + Math.cos(a + 1) * 20); c.stroke(); }
      c.restore();
      this.drawSmallBar(g.x, g.y + 160, 240, k, '#62f0ff', window.t ? t('Crystal') : 'Crystal');
    },
    drawSmallBar(cx, y, w, k, color, label) {
      const c = this.ctx, h = 14, x = cx - w / 2;
      c.save();
      c.fillStyle = 'rgba(8, 18, 64, 0.85)'; c.fillRect(x - 3, y - 3, w + 6, h + 6);
      c.strokeStyle = color; c.lineWidth = 2; c.strokeRect(x - 3, y - 3, w + 6, h + 6);
      c.fillStyle = k <= 0.35 ? '#ff5a5a' : color; c.fillRect(x, y, w * Math.max(0, k), h);
      c.font = `700 22px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = '#ffffff'; c.shadowColor = '#000'; c.shadowBlur = this.glow(6);
      c.fillText(label, cx, y + h + 6);
      c.restore();
    },
    // dark level: only the light of your aim shows the aliens
    drawFlashlight() {
      const c = this.ctx, R = 270;
      c.save();
      c.fillStyle = 'rgba(2, 4, 20, 0.93)';
      c.beginPath(); c.rect(0, 0, W, H);
      const spots = this.players.map((p) => p.reticle || p.smoothAim);
      for (const a of spots) { c.moveTo(a.x + R, a.y); c.arc(a.x, a.y, R, 0, Math.PI * 2, true); }
      if (this.drones) for (const d of this.drones) { c.moveTo(d.x + 90, d.y); c.arc(d.x, d.y, 90, 0, Math.PI * 2, true); }
      c.fill('evenodd');
      for (const a of spots) {
        const g = c.createRadialGradient(a.x, a.y, R * 0.55, a.x, a.y, R + 1);
        g.addColorStop(0, 'rgba(2, 4, 20, 0)'); g.addColorStop(1, 'rgba(2, 4, 20, 0.93)');
        c.fillStyle = g; c.beginPath(); c.arc(a.x, a.y, R + 1, 0, Math.PI * 2); c.fill();
        const w = c.createRadialGradient(a.x, a.y, 0, a.x, a.y, R);
        w.addColorStop(0, 'rgba(255, 250, 220, 0.10)'); w.addColorStop(1, 'rgba(255, 250, 220, 0)');
        c.fillStyle = w; c.beginPath(); c.arc(a.x, a.y, R, 0, Math.PI * 2); c.fill();
      }
      // the eyes of aliens in the dark glow faintly
      c.fillStyle = 'rgba(255, 240, 160, 0.55)';
      for (const m of this.monsters) {
        if (m.state !== 'alive' || spots.some((a) => Math.hypot(a.x - m.px, a.y - m.py) < R)) continue;
        const e = m.size * 0.06;
        c.beginPath(); c.arc(m.px - m.size * 0.09, m.py - m.size * 0.05, e, 0, Math.PI * 2); c.arc(m.px + m.size * 0.09, m.py - m.size * 0.05, e, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    },
    // timers and goals of special levels, under the score
    drawSpecialHud() {
      const c = this.ctx;
      let text = '';
      if (this.special === 'survive') {
        const left = Math.max(0, Math.ceil(SURVIVE_TIME - this.surviveT));
        text = `${window.t ? t('Survive') : 'Survive'} 0:${String(left).padStart(2, '0')}`;
      } else if (this.special === 'only') text = `${window.t ? t('Only catch') : 'Only catch'}: ${window.t ? t((SPR[TYPES[0]] || {}).name || '') : (SPR[TYPES[0]] || {}).name}`;
      if (!text) return;
      c.save();
      c.font = `700 38px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = this.special === 'survive' && this.surviveT > SURVIVE_TIME - 10 ? '#7dffb0' : '#ffd27a';
      c.shadowColor = '#000'; c.shadowBlur = this.glow(10); c.lineWidth = 6; c.strokeStyle = 'rgba(0,0,0,0.6)';
      c.strokeText(text, W / 2, 258); c.fillText(text, W / 2, 258);
      c.restore();
    },
    // Hyper meter (under the health bar) and the rainbow edge while Hyper mode is on
    drawHyper() {
      const c = this.ctx;
      const x = 100, y = 108, w = 360, h = 12;
      c.save();
      if (this.hyperT > 0) {
        const pulse = 0.65 + 0.35 * Math.sin(this.time * 10), hue = (this.time * 200) % 360;
        const g = c.createLinearGradient(0, 0, W, H);
        for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(hue + i * 60) % 360}, 100%, 60%)`);
        c.globalAlpha = pulse; c.strokeStyle = g; c.lineWidth = 26;
        c.shadowColor = `hsl(${hue}, 100%, 60%)`; c.shadowBlur = this.glow(30);
        c.strokeRect(13, 13, W - 26, H - 26);
        c.globalAlpha = 1; c.shadowBlur = 0;
        c.font = `700 30px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = `hsl(${hue}, 100%, 70%)`;
        c.fillText(`HYPER ×2  ${Math.ceil(this.hyperT)}`, x, y + h / 2 + 2);
      } else if (this.state === 'play' || this.hyper > 0) {
        c.fillStyle = 'rgba(8, 18, 64, 0.75)'; c.fillRect(x - 2, y - 2, w + 4, h + 4);
        const g = c.createLinearGradient(x, 0, x + w, 0);
        g.addColorStop(0, '#ff8ad8'); g.addColorStop(0.5, '#ffd27a'); g.addColorStop(1, '#7dffb0');
        c.fillStyle = g; c.fillRect(x, y, w * (this.hyper || 0), h);
        if (this.hyper > 0.85) { c.globalAlpha = 0.5 + 0.5 * Math.sin(this.time * 14); c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(x - 2, y - 2, w + 4, h + 4); c.globalAlpha = 1; }
        c.font = `700 18px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#bff9ff';
        c.fillText('HYPER', x, y + h + 4);
      }
      c.restore();
    },
    drawBanner() {
      const b = this.banner, c = this.ctx;
      if (!b) return;
      const tin = Math.min(1, b.t / 0.25), tout = Math.min(1, (b.dur - b.t) / 0.35), k = Math.max(0, Math.min(tin, tout));
      c.save();
      c.globalAlpha = k * 0.6; c.fillStyle = '#000';
      c.fillRect(0, H * 0.36, W, H * 0.22);
      c.globalAlpha = k;
      const sc = 0.85 + 0.15 * tin;
      c.translate(W / 2, H * 0.45); c.scale(sc, sc);
      c.font = `800 92px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      let fill = b.color;
      if (b.color === 'rainbow') { const g = c.createLinearGradient(-500, 0, 500, 0); for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${(this.time * 220 + i * 60) % 360}, 100%, 62%)`); fill = g; }
      c.lineWidth = 12; c.strokeStyle = 'rgba(0,0,0,0.75)'; c.strokeText(b.title, 0, 0);
      c.fillStyle = fill; c.shadowColor = b.color === 'rainbow' ? '#fff' : b.color; c.shadowBlur = this.glow(24); c.fillText(b.title, 0, 0);
      if (b.sub) { c.shadowBlur = this.glow(6); c.font = `600 40px ${FONT}`; c.fillStyle = '#ffffff'; c.lineWidth = 6; c.strokeText(b.sub, 0, 82); c.fillText(b.sub, 0, 82); }
      c.restore();
    },
    // boss entrance: dark screen, cinema bars, the boss rising, then its name and title
    drawBossIntro(b) {
      const c = this.ctx, T = b.introT || 0;
      const dark = Math.min(1, T / 0.5) * Math.min(1, (BOSS_INTRO - T) / 0.5);
      c.save();
      c.globalAlpha = 0.8 * dark; c.fillStyle = '#05030f'; c.fillRect(0, 0, W, H);
      c.restore();
      this.drawBoss();
      c.save();
      const bar = 120 * dark;
      c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
      const tk = Math.max(0, Math.min(1, (T - 1.2) / 0.35)) * Math.min(1, (BOSS_INTRO - T) / 0.4);
      if (tk > 0) {
        c.globalAlpha = tk; c.textAlign = 'center'; c.textBaseline = 'middle';
        const name = (window.t ? t(b.name) : b.name).toUpperCase();
        const sc = 1.25 - 0.25 * Math.min(1, (T - 1.2) / 0.35);
        c.translate(W / 2, H * 0.8); c.scale(sc, sc);
        c.font = `800 110px ${FONT}`; c.lineWidth = 14; c.strokeStyle = 'rgba(0,0,0,0.85)'; c.strokeText(name, 0, 0);
        const g = c.createLinearGradient(0, -55, 0, 55); g.addColorStop(0, '#fff4c9'); g.addColorStop(0.5, '#ffd27a'); g.addColorStop(1, '#ff8a3a');
        c.fillStyle = g; c.shadowColor = '#ffb347'; c.shadowBlur = this.glow(30); c.fillText(name, 0, 0);
        c.shadowBlur = this.glow(8); c.font = `600 44px ${FONT}`; c.fillStyle = '#ffffff'; c.lineWidth = 6;
        const title = window.t ? t('Ruler of {world}', { world: t(this.bossWorldName || '') }) : b.title;
        c.strokeText(title, 0, 84); c.fillText(title, 0, 84);
      }
      c.restore();
    },

    totalCaught() { return TYPES.reduce((a, t) => a + this.caught[t], 0); },

    // ---------------- Star upgrades (bought with stars in the shop) ----------------
    owns(id) { return !!((this.save && this.save.owned) || {})[id]; },
    // Second chance: once per level, come back with half health instead of losing
    tryRevive() {
      if (!this.owns('secondChance') || this.reviveUsed) return false;
      this.reviveUsed = true;
      this.health = 50;
      this.hud('health');
      this.hud('toast', 'Second chance! Back to 50%');
      Sfx.win();
      return true;
    },
    crystalValue() { return this.owns('crystalMagnet') ? 2 : 1; },
    // looks you own can be switched off in the Equipment screen
    styleOn(id) { return this.owns(id) && !((this.save && this.save.styleOff) || {})[id]; },
    // superpower level 1-3 (upgraded in the Equipment screen): lasts 30% / 60% longer
    superLv(id) { return Math.max(1, Math.min(3, (((this.save && this.save.superLv) || {})[id]) || 1)); },
    superMul(id) { return [1, 1.3, 1.6][this.superLv(id) - 1]; },
    laserColor(p) { if (this.hyperT > 0) return '#ffd84a'; return this.styleOn('rainbowLaser') ? `hsl(${(this.time * 240) % 360}, 100%, 65%)` : p.color; },
    // Golden blaster: a gold-tinted copy of the gun sheet, made once
    gunImage() {
      const img = Assets.images.gun;
      if (!this.styleOn('goldBlaster')) return img;
      if (!Assets.images.gunGold) {
        const cv = document.createElement('canvas');
        cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255, 196, 77, 0.5)';
        g.fillRect(0, 0, cv.width, cv.height);
        Assets.images.gunGold = cv;
      }
      return Assets.images.gunGold;
    },
    // Helper drones (star items): each flies around on its own half of the screen and catches an alien
    // by itself every 10 seconds. It faces you while idle and turns its back to you when it fires.
    // Sheets: 5x5 frames. Row 1 and 5 = face to you, row 2 = turned to the side, row 3 = back, row 4 = other side.
    updateDrone(dt) {
      if (this.tut) return;                 // training: no helper bots (they would catch the training aliens)
      // how many helper bots fly along: chosen in the Equipment screen (0, 1 or 2 of the ones you own)
      let owned = [['helperDrone', 'drone1'], ['droneTwo', 'drone2']].filter(([id]) => this.owns(id));
      const want = this.save && this.save.bots != null ? this.save.bots : owned.length;
      owned = owned.slice(0, Math.max(0, want));
      if (!owned.length) return;
      if (!this.drones) {
        this.drones = owned.map(([, img], i) => {
          const zone = i === 0 ? { x0: 220, x1: 860 } : { x0: 1060, x1: 1700 };
          return { img, zone, x: (zone.x0 + zone.x1) / 2, y: 520, tx: (zone.x0 + zone.x1) / 2, ty: 520,
                   vx: 0, cd: 5 + i * 5, state: 'idle', t: 0, wander: 0, target: null, animT: rand(0, 3) };
        });
      }
      for (const d of this.drones) {
        d.t += dt; d.animT += dt;
        this.droneAbility(d, dt);
        // wander to a new spot now and then (both drones independently)
        d.wander -= dt;
        if (d.wander <= 0 && d.state === 'idle') {
          d.tx = rand(d.zone.x0, d.zone.x1); d.ty = rand(300, 700); d.wander = rand(1.8, 3.6);
        }
        const px = d.x;
        const k = Math.min(1, dt * (d.state === 'idle' ? 1.6 : 0.6));
        d.x = lerp(d.x, d.tx, k);
        d.y = lerp(d.y, d.ty, k) + Math.sin(this.time * 2.6 + d.cd) * 0.6;
        d.vx = (d.x - px) / Math.max(dt, 0.001);
        d.cd -= dt;
        if (d.state === 'idle' && d.cd <= 0) {
          const alive = this.monsters.filter((m) => m.state === 'alive' && !m.droneTarget && !m.decoy);
          if (alive.length) {
            d.target = alive.sort((a, b) => b.z - a.z)[0];
            d.target.droneTarget = true;
            d.state = 'turn'; d.t = 0;               // turn around, back to us, before firing
          } else d.cd = 1;
        } else if (d.state === 'turn' && d.t > 0.35) {
          const m = d.target;
          if (m && m.state === 'alive') {
            this.lasers.push({ x1: d.x, y1: d.y - 10, x2: m.px, y2: m.py, t: 0.16, color: d.img === 'drone2' ? '#b99bff' : '#62f0ff' });
            Sfx.laser();
            this.damageMonster(m, this.droneDmg || 3);
            this.droneShotExtra(d, m);
          }
          d.state = 'fire'; d.t = 0;
        } else if (d.state === 'fire' && d.t > 0.45) {
          d.state = 'idle'; d.t = 0; d.cd = this.droneCd || 10; d.target = null;
        }
      }
    },
    // Armoured alien: a metal ring and hit-point pips (placeholder art)
    drawArmor(m) {
      const c = this.ctx;
      c.save();
      c.translate(m.px, m.py);
      c.rotate(this.time * 0.8);
      c.strokeStyle = '#cfe8ff'; c.lineWidth = Math.max(3, m.size * 0.018); c.globalAlpha = 0.85;
      c.setLineDash([m.size * 0.12, m.size * 0.06]);
      c.beginPath(); c.arc(0, 0, m.size * 0.47, 0, Math.PI * 2); c.stroke();
      c.restore();
      const n = m.maxHp, pw = Math.max(8, m.size * 0.07), gap = 4, w = n * pw + (n - 1) * gap;
      for (let i = 0; i < n; i++) {
        c.fillStyle = i < m.hp ? '#cfe8ff' : 'rgba(255,255,255,0.18)';
        c.fillRect(m.px - w / 2 + i * (pw + gap), m.py - m.size * 0.58, pw, Math.max(5, pw * 0.5));
      }
    },
    // Shiny aliens: a gold-tinted copy of the spritesheet, made once per kind
    shinySheet(type) {
      const key = 'shiny_' + type;
      if (!Assets.images[key]) {
        const img = Assets.images[type];
        const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
        const g = cv.getContext('2d');
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = 'source-atop';
        g.fillStyle = 'rgba(255, 205, 90, 0.55)'; g.fillRect(0, 0, cv.width, cv.height);
        Assets.images[key] = cv;
      }
      return Assets.images[key];
    },

    drawDrone() {
      if (!this.drones) return;
      const c = this.ctx;
      for (const d of this.drones) {
        const img = Assets.images[d.img];
        if (!img) continue;
        const meta = d.img === 'drone2' ? { fw: 176, fh: 188 } : { fw: 181, fh: 179 };
        const step = Math.floor(d.animT * 7) % 5;
        let row, flip = false;
        if (d.state !== 'idle') row = 2;                                   // back to us while firing
        else if (Math.abs(d.vx) > 60) { row = 1; flip = d.vx < 0; }        // moving sideways
        else row = Math.floor(d.animT / 3) % 2 ? 4 : 0;                    // idle: face to us
        const h = 150, w = h * meta.fw / meta.fh;
        this.drawHolos(d, img, meta, h, w);
        c.save();
        c.translate(d.x, d.y);
        if (flip) c.scale(-1, 1);
        c.drawImage(img, step * meta.fw, row * meta.fh, meta.fw, meta.fh, -w / 2, -h / 2, w, h);
        c.restore();
        // recharge ring
        if (d.state === 'idle') this.ring(d.x, d.y + h * 0.58, 16, 1 - Math.max(0, d.cd) / (this.droneCd || 10), d.img === 'drone2' ? '#b99bff' : '#62f0ff', 4);
      }
    },

    tag(p) { return this.players.length > 1 && p ? `Player ${p.id}: ` : ''; },

    // ---------------- Boss ----------------
    spawnBoss() {
      const cfg = this.levelCfg.boss;
      if (cfg.void) return this.spawnVoid(cfg);
      const hp = Math.round(cfg.hp * (this.players.length > 1 ? 1.5 : 1));
      this.boss = {
        isBoss: true, name: cfg.name, sprite: cfg.sprite, hp, max: hp,
        x: W / 2, y: H * 0.34, size: 120, r: 40, t: 0, state: 'enter',
        throwT: 3, minionT: 4, flash: 0, frame: SPR[cfg.sprite].front[0], sx: 1, sy: 1, rot: 0,
        // King Nebula fights in 3 phases (template for the other bosses)
        // every boss fights in 3 phases with its own attacks (see updateBossPhases)
        phased: true, phase: 1, transT: 0, tele: 0,
        copies: null, realIdx: 1, shuffleT: 0, shield: false, spots: null, openT: 0,
        speed: 1, wallT: 6, beamT: 6, diveT: 6, submerged: 0, reflectT: 0, reflectCd: 6,
        crystals: null, nextN: 1, dark: false, bladeAng: 0, bladeSpeed: 0, pull: false, waveT: 5,
      };
      // the entrance: the screen darkens, the world slows down, the boss rises up with a roar and its title appears
      this.boss.introT = 0; this.boss.roared = false;
      this.boss.title = cfg.title || ('Ruler of ' + (this.bossWorldName || this.levelCfg.name || ''));
      this.rocks = [];
      Sfx.rumble();
    },

    // ================= The Void (boss of the ???? world) =================
    // 4 health bars. Its chest crystal is closed (shots are blocked) except:
    //  - for a few seconds after it fired its energy beam (tired),
    //  - when the 3 glowing crystals are shot while it charges the beam (stunned, double damage),
    //  - when its orbiting orbs are popped (from bar 3 on).
    // The beam: hold up the shield (costs 3 shield hits) or lose 20% health.
    spawnVoid(cfg) {
      const mult = this.players.length > 1 ? 1.5 : 1;
      const barHp = Math.round(VOID.barHp * mult);
      this.boss = {
        isBoss: true, void: true, name: cfg.name, sprite: 'void', hp: barHp * VOID.bars, max: barHp * VOID.bars, barHp,
        x: W / 2, y: H * 0.42, size: 120, r: 40, t: 0, state: 'enter', flash: 0, frame: 0, sx: 1, sy: 1, rot: 0,
        phase: 1, transT: 0, tele: 0, shield: true, openT: 0, openMax: 1, dmgMul: 1, spots: null, crystals: null,
        barsLeft: VOID.bars, beamT: 5, charge: 0, chargeMax: 1, fireT: 0, fireHit: false, second: false, vcrystals: null,
        stunT: 0, orbT: VOID.orbEvery, shardT: 6, minionT: 4, lastHitT: this.time, regenT: 0, heart: null, dark: false,
        speed: 1, reflectT: 0, bladeSpeed: 0, submerged: 0, pull: false,
      };
      this.shake = 0.8;
      Sfx.lose();
      this.hud('toast', 'The Void appears!');
      this.setPrompt('Its heart is closed. Wait for its beam, shield up, then hit the glowing heart!', 4);
    },
    voidChest(b) { return { x: b.x, y: b.y + b.size * 0.1 }; },
    voidOpen(b, secs, mul, msg) {
      b.shield = false; b.openT = secs; b.openMax = secs; b.dmgMul = mul || 1;
      if (msg) this.hud('toast', msg);
      Sfx.win();
    },
    voidTargets(b) {
      const out = [];
      if (b.vcrystals) b.vcrystals.forEach((q, i) => { if (!q.broken) out.push({ px: q.x, py: q.y, r: 52, bossPart: 'vcrystal', idx: i }); });
      if (b.spots && b.shield) b.spots.forEach((sp, i) => { if (sp.hp > 0) out.push({ px: sp.x, py: sp.y, r: 46, bossPart: 'spot', idx: i }); });
      if (b.heart) out.push({ px: b.heart.x, py: b.heart.y, r: 56, bossPart: 'heart' });
      const ch = this.voidChest(b);
      out.push({ px: ch.x, py: ch.y, r: b.shield ? b.size * 0.3 : b.size * 0.22, bossPart: 'boss' });
      return out;
    },
    // returns true when the hit was handled here
    voidPartHit(b, tg, dmg, at, say) {
      if (tg.bossPart === 'vcrystal') {
        const q = b.vcrystals && b.vcrystals[tg.idx];
        if (!q || q.broken) return true;
        q.broken = true;
        Sfx.clink(); this.burst(q.x, q.y, '#e8d4ff', 16, true);
        this.addScore(120, q.x, q.y - 40, true);
        if (b.vcrystals.every((c) => c.broken)) {
          // the beam fizzles: stunned, open, double damage
          b.charge = 0; b.vcrystals = null; b.second = false;
          b.stunT = VOID.stun; b.beamT = VOID.beamEvery[VOID.bars - b.barsLeft];
          this.voidOpen(b, VOID.stun, 2, 'Beam stopped! The Void is stunned: double damage!');
          say(b.x, b.y - b.size * 0.35, 'Stunned!', '#ffe680');
        }
        return true;
      }
      if (tg.bossPart === 'heart') {
        const h = b.heart; b.heart = null;
        this.health = Math.min(100, this.health + VOID.heal); this.hud('health');
        Sfx.win(); this.burst(h.x, h.y, '#ff8ad8', 20, true);
        say(h.x, h.y - 40, '+' + VOID.heal + '% health', '#7dffb0');
        return true;
      }
      if (tg.bossPart === 'boss' && b.shield) {
        Sfx.clink(); say(at.x, at.y - 30, 'Blocked!', '#c79bff');
        return true;
      }
      return false;           // orbs ('spot') and the open heart: the normal boss code
    },
    voidBeamHit() {
      this.shake = 0.6; this.beamFlash = 1;
      for (const p of this.players) {
        if (this.barrierT > 0) { Sfx.block(); this.floater(W / 2, H - 320, window.t ? t('Blocked!') : 'Blocked!', '#bff9ff'); continue; }
        if (p.equipped === 'shield' && p.shieldHP > 0) {
          for (let i = 0; i < VOID.shieldCost && p.equipped === 'shield' && p.shieldHP > 0; i++) this.playerHit(p);
          this.floater(this.gunBase(p), H - 360, window.t ? t('Beam blocked!') : 'Beam blocked!', '#bff9ff');
        } else this.takeDamage(VOID.beamDamage);
      }
    },
    updateVoid(b, gdt, dt) {
      b.t += gdt;
      b.flash = Math.max(0, b.flash - dt);
      if (this.beamFlash > 0) this.beamFlash = Math.max(0, this.beamFlash - dt * 2.5);
      if (b.state === 'enter') {
        const k = Math.min(1, b.t / 2.5), e = 1 - Math.pow(1 - k, 3);
        b.size = lerp(120, 600, e);
        b.y = lerp(H * 0.3, H * 0.42, e);
        if (k >= 1) { b.state = 'fight'; b.t = 0; }
        b.r = b.size * 0.25;
        return;
      }
      if (b.state === 'defeat') {
        this.shake = Math.max(this.shake, 0.4);
        b.flash = 0.3;
        if (b.t > 1.4 && !b.cineAsked) { b.cineAsked = true; this.cine = true; this.hud('voidOutro'); }
        return;
      }
      if (b.state !== 'fight') return;
      // slow drifting and breathing, so the still picture feels alive
      b.x = W / 2 + Math.sin(b.t * 0.25) * W * 0.06;
      b.y = H * 0.42 + Math.sin(b.t * 0.8) * 18;
      const br = Math.sin(b.t * 1.6);
      b.sx = 1 + 0.015 * br; b.sy = 1 - 0.015 * br;
      b.r = b.size * 0.25;
      if (b.heart) { b.heart.t += gdt; b.heart.y += 30 * gdt; if (b.heart.t > 8) b.heart = null; }

      // a health bar broken: roar, a short pause, harder attacks, and a heart to collect
      const left = Math.max(1, Math.ceil(b.hp / b.barHp - 1e-6));
      if (left < b.barsLeft) {
        b.barsLeft = left;
        b.transT = 2; b.flash = 0.6; this.shake = 0.7; Sfx.lose();
        b.charge = 0; b.fireT = 0; b.vcrystals = null; b.second = false; b.spots = null;
        b.shield = true; b.openT = 0; b.dmgMul = 1; b.stunT = 0;
        b.beamT = 3; b.orbT = 4; b.shardT = 3;
        b.dark = left === 2;
        b.heart = { x: clamp(b.x + rand(-420, 420), 220, W - 220), y: H * 0.22, t: 0 };
        const msg = { 3: 'The Void throws crystals! Pop its orbs to open its heart!', 2: 'Darkness! Follow its glowing eyes.', 1: 'The Void is furious! Two beams in a row!' }[left];
        if (msg) this.hud('toast', msg);
        this.setPrompt('Shoot the heart to get health back!', 2.5);
      }
      if (b.transT > 0) { b.transT -= dt; return; }
      const bi = VOID.bars - b.barsLeft;          // 0 (4 bars left) ... 3 (last bar)
      if (b.stunT > 0) b.stunT -= gdt;
      if (b.openT > 0) {
        b.openT -= gdt;
        if (b.openT <= 0) { b.openT = 0; b.shield = true; b.dmgMul = 1; if (b.spots && b.spots.every((q) => q.hp <= 0)) { b.spots = null; b.orbT = VOID.orbEvery; } }
      }

      // the energy beam: charge (shoot the 3 crystals to stop it) -> fire -> tired (open)
      if (b.charge > 0) {
        b.charge -= gdt;
        this.orbitVoidCrystals(b);
        if (b.charge <= 0) { b.charge = 0; b.vcrystals = null; b.fireT = VOID.fire; b.fireHit = false; }
      } else if (b.fireT > 0) {
        b.fireT -= gdt;
        if (!b.fireHit && b.fireT < VOID.fire - 0.3) { b.fireHit = true; this.voidBeamHit(); }
        if (b.fireT <= 0) {
          b.fireT = 0;
          if (b.barsLeft === 1 && !b.second) { b.second = true; this.startVoidCharge(b, 1.3); }
          else {
            b.second = false; b.beamT = VOID.beamEvery[bi];
            this.voidOpen(b, VOID.tired, 1, null);
            this.setPrompt('It is tired: hit the glowing heart now!', 2);
          }
        }
      } else if (b.openT <= 0 && b.stunT <= 0) {
        b.beamT -= gdt;
        if (b.beamT <= 0) this.startVoidCharge(b, VOID.charge[bi]);
      }

      // orbs (from bar 3): pop all three to open the heart
      if (bi >= 1 && !b.spots && b.shield && b.charge <= 0 && b.fireT <= 0) {
        b.orbT -= gdt;
        if (b.orbT <= 0) { b.spots = this.makeSpots(); this.setPrompt('Pop the 3 orbs to open its heart!', 2); }
      }
      if (b.spots && b.shield) { this.lastDt = gdt; this.orbitParts(b, b.spots, 0.8, 0.5); }
      if (b.spots && !b.shield && b.openT <= 0) { b.spots = null; b.orbT = VOID.orbEvery; }

      // crystal shards (from bar 3)
      if (VOID.shards[bi] && b.charge <= 0 && b.fireT <= 0) {
        b.shardT -= gdt;
        if (b.shardT <= 0) {
          const from = { px: b.x, py: b.y + b.size * 0.05, type: 'void' };
          for (let i = 0; i < VOID.shards[bi]; i++) setTimeout(() => { if (this.boss === b && b.state === 'fight') this.throwRock(from); }, i * 260);
          b.shardT = VOID.shardEvery[bi];
        }
      }
      // helpers
      b.minionT -= gdt;
      if (b.minionT <= 0) {
        if (this.monsters.filter((m) => m.state === 'alive').length < VOID.minionMax[bi]) this.spawn(TYPES[Math.floor(Math.random() * TYPES.length)]);
        b.minionT = VOID.minionEvery[bi];
      }
      // last bar: heals itself when you stop hitting it
      if (b.barsLeft === 1 && this.time - b.lastHitT > VOID.regenAfter && b.hp < b.barHp) {
        b.regenT += gdt;
        if (b.regenT >= 0.5) { b.regenT = 0; b.hp = Math.min(b.barHp, b.hp + 1); }
      } else b.regenT = 0;
      // picture: 0 still, 1-3 while firing
      const e = VOID.fire - b.fireT;
      b.frame = b.fireT > 0 ? (e < 0.25 ? 1 : e < 0.5 ? 2 : 3) : 0;
    },
    startVoidCharge(b, secs) {
      b.charge = secs; b.chargeMax = secs;
      b.vcrystals = [0, 1, 2].map((i) => ({ i, broken: false, x: b.x, y: b.y }));
      this.orbitVoidCrystals(b);
      this.setPrompt('Beam! Shoot the 3 crystals or raise your shield!', secs);
      Sfx.lock();
    },
    orbitVoidCrystals(b) {
      if (!b.vcrystals) return;
      const slow = this.padPlay() ? 0.5 : 1;
      b.vcrystals.forEach((q, i) => {
        const a = b.t * 0.9 * slow + i * (Math.PI * 2 / 3) - Math.PI / 2;
        q.x = b.x + Math.cos(a) * b.size * 0.62;
        q.y = b.y - b.size * 0.05 + Math.sin(a) * b.size * 0.34;
      });
    },

    drawVoid(b) {
      const c = this.ctx, img = Assets.images.void;
      const alpha = b.state === 'enter' ? Math.min(1, b.t / 0.8) : 1;
      const ch = this.voidChest(b);
      // charging: a growing glow on the chest and purple screen edges
      if (b.charge > 0) {
        const k = 1 - b.charge / b.chargeMax;
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(ch.x, ch.y, 4, ch.x, ch.y, 60 + 160 * k);
        g.addColorStop(0, 'rgba(255, 255, 255, ' + (0.5 + 0.5 * k) + ')'); g.addColorStop(0.4, 'rgba(200, 120, 255, 0.6)'); g.addColorStop(1, 'rgba(120, 40, 255, 0)');
        c.fillStyle = g; c.beginPath(); c.arc(ch.x, ch.y, 60 + 160 * k, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      // a dark shadow behind it, so it stands out from the purple background
      c.save(); c.globalAlpha = alpha * 0.75;
      const sh = c.createRadialGradient(b.x, b.y, b.size * 0.1, b.x, b.y, b.size * 0.95);
      sh.addColorStop(0, 'rgba(4, 0, 12, 0.85)'); sh.addColorStop(0.6, 'rgba(4, 0, 12, 0.5)'); sh.addColorStop(1, 'rgba(4, 0, 12, 0)');
      c.fillStyle = sh; c.beginPath(); c.ellipse(b.x, b.y, b.size * 1.0, b.size * 0.62, 0, 0, Math.PI * 2); c.fill(); c.restore();
      if (img) {
        this.drawFrame(img, SPR.void, b.frame, b.x, b.y, b.size, false, alpha, 0, b.sx, b.sy);
        if (b.flash > 0) {
          c.save(); c.globalCompositeOperation = 'lighter';
          this.drawFrame(img, SPR.void, b.frame, b.x, b.y, b.size, false, Math.min(1, b.flash * 2.5), 0, b.sx, b.sy);
          c.restore();
        }
      }
      if (b.state !== 'fight') return;
      // open heart: bright pulsing crystal and a ring that shows how long it stays open
      if (!b.shield) {
        const pulse = 0.6 + 0.4 * Math.sin(this.time * 10);
        c.save(); c.globalCompositeOperation = 'lighter';
        const g = c.createRadialGradient(ch.x, ch.y, 4, ch.x, ch.y, 120);
        g.addColorStop(0, 'rgba(255, 255, 255, ' + pulse + ')'); g.addColorStop(0.35, b.dmgMul > 1 ? 'rgba(255, 230, 120, 0.8)' : 'rgba(125, 255, 176, 0.7)'); g.addColorStop(1, 'rgba(125, 255, 176, 0)');
        c.fillStyle = g; c.beginPath(); c.arc(ch.x, ch.y, 120, 0, Math.PI * 2); c.fill();
        c.restore();
        this.ring(ch.x, ch.y, 96, b.openT / b.openMax, b.dmgMul > 1 ? '#ffe680' : '#7dffb0', 9);
      }
      // stunned: little stars turning around its head
      if (b.stunT > 0) {
        c.save(); c.fillStyle = '#ffe680';
        for (let i = 0; i < 6; i++) {
          const a = this.time * 3 + i * Math.PI / 3;
          const x = b.x + Math.cos(a) * 150, y = b.y - b.size * 0.36 + Math.sin(a) * 34;
          c.beginPath();
          for (let k = 0; k < 10; k++) { const aa = k * Math.PI / 5, rr = k % 2 ? 7 : 17; c.lineTo(x + Math.sin(aa) * rr, y - Math.cos(aa) * rr); }
          c.closePath(); c.fill();
        }
        c.restore();
      }
    },
    // drawn on top of the darkness, so they stay visible: eyes, crystals, orbs, the heart pick-up, the beam flash
    drawVoidParts(b) {
      const c = this.ctx;
      if (b.state === 'fight' && b.dark) {
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const dx of [-34, 34]) {
          const x = b.x + dx, y = b.y - b.size * 0.215;
          const g = c.createRadialGradient(x, y, 2, x, y, 46);
          g.addColorStop(0, 'rgba(255, 255, 255, 0.95)'); g.addColorStop(0.4, 'rgba(190, 120, 255, 0.7)'); g.addColorStop(1, 'rgba(120, 40, 255, 0)');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, 46, 0, Math.PI * 2); c.fill();
        }
        if (!b.shield) { const ch = this.voidChest(b); this.ring(ch.x, ch.y, 96, b.openT / b.openMax, '#7dffb0', 9); }
        c.restore();
      }
      if (b.vcrystals) for (const q of b.vcrystals) {
        if (q.broken) continue;
        const pulse = 0.75 + 0.25 * Math.sin(this.time * 12 + q.i);
        c.save(); c.translate(q.x, q.y);
        c.shadowColor = '#d9a6ff'; c.shadowBlur = this.glow(26);
        c.fillStyle = `rgba(232, 212, 255, ${pulse})`; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, -50); c.lineTo(28, 0); c.lineTo(0, 50); c.lineTo(-28, 0); c.closePath(); c.fill(); c.stroke();
        c.restore();
      }
      if (b.spots && b.shield) for (const sp of b.spots) {
        if (sp.hp <= 0) continue;
        c.save();
        const r = 26 + 5 * Math.sin(this.time * 6 + sp.x);
        const g = c.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, r * 1.8);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffd27a'); g.addColorStop(1, 'rgba(255, 138, 216, 0)');
        c.fillStyle = g; c.beginPath(); c.arc(sp.x, sp.y, r * 1.8, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#ffffff';
        for (let i = 0; i < sp.hp; i++) c.fillRect(sp.x - 12 + i * 14, sp.y + r + 8, 10, 6);
        c.restore();
      }
      if (b.heart) {
        const h = b.heart, s = 1 + 0.12 * Math.sin(this.time * 8);
        c.save(); c.translate(h.x, h.y); c.scale(s, s);
        c.shadowColor = '#ff8ad8'; c.shadowBlur = this.glow(26); c.globalAlpha = h.t > 6.5 ? 0.5 + 0.5 * Math.sin(this.time * 20) : 1;
        c.fillStyle = '#ff5a9e'; c.strokeStyle = '#ffffff'; c.lineWidth = 4;
        c.beginPath(); c.moveTo(0, 30); c.bezierCurveTo(-60, -10, -30, -55, 0, -24); c.bezierCurveTo(30, -55, 60, -10, 0, 30); c.closePath(); c.fill(); c.stroke();
        c.shadowBlur = 0; c.fillStyle = '#fff'; c.font = `700 24px ${FONT}`; c.textAlign = 'center'; c.fillText('+' + VOID.heal, 0, -2);
        c.restore();
      }
      if (b.charge > 0) {
        // purple screen edges and a warning while it charges
        const k = 1 - b.charge / b.chargeMax;
        c.save();
        const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
        g.addColorStop(0, 'rgba(120, 40, 255, 0)'); g.addColorStop(1, `rgba(150, 60, 255, ${0.25 + 0.35 * k * (0.6 + 0.4 * Math.sin(this.time * 14))})`);
        c.fillStyle = g; c.fillRect(0, 0, W, H);
        c.font = `700 56px ${FONT}`; c.textAlign = 'center'; c.lineWidth = 8; c.strokeStyle = '#12001f'; c.fillStyle = '#e8d4ff';
        const txt = window.t ? t('SHIELD UP!') : 'SHIELD UP!';
        c.strokeText(txt, W / 2, H * 0.66); c.fillText(txt, W / 2, H * 0.66);
        c.restore();
      }
      if (this.beamFlash > 0) {
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = this.beamFlash * 0.45;
        c.fillStyle = '#c08cff'; c.fillRect(0, 0, W, H); c.restore();
      }
    },
    // two bars: on top one block per full health bar left (max 4), below it the bar being emptied now
    drawVoidBar(b) {
      const c = this.ctx;
      const w = 680, x = (W - w) / 2, y = 196;
      c.save();
      c.font = `700 30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillStyle = '#e8d4ff'; c.shadowColor = '#000'; c.shadowBlur = this.glow(8);
      c.fillText(b.name, W / 2, y - 8);
      c.shadowBlur = 0;
      const left = b.state === 'fight' || b.state === 'enter' ? b.barsLeft : 0;
      const bw = (w - 3 * 12) / 4;
      for (let i = 0; i < VOID.bars; i++) {
        const bx = x + i * (bw + 12);
        c.fillStyle = 'rgba(18, 4, 34, 0.9)'; c.fillRect(bx - 2, y - 2, bw + 4, 18);
        if (i < left) {
          const g = c.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#7a2ad6'); g.addColorStop(1, '#d9a6ff');
          c.fillStyle = g; c.fillRect(bx, y, bw, 14);
        }
        c.strokeStyle = '#c08cff'; c.lineWidth = 2; c.strokeRect(bx - 2, y - 2, bw + 4, 18);
      }
      const y2 = y + 30, h2 = 26;
      const cur = b.state === 'defeat' ? 0 : Math.max(0, b.hp - (b.barsLeft - 1) * b.barHp);
      c.fillStyle = 'rgba(18, 4, 34, 0.92)'; c.fillRect(x - 4, y2 - 4, w + 8, h2 + 8);
      const g2 = c.createLinearGradient(x, 0, x + w, 0); g2.addColorStop(0, '#ff8ad8'); g2.addColorStop(1, '#b06cff');
      c.fillStyle = g2; c.fillRect(x, y2, w * (cur / b.barHp), h2);
      c.strokeStyle = b.shield ? '#6a5a8a' : (b.dmgMul > 1 ? '#ffe680' : '#7dffb0'); c.lineWidth = b.shield ? 2 : 5;
      c.strokeRect(x - 4, y2 - 4, w + 8, h2 + 8);
      c.font = `700 20px ${FONT}`; c.textBaseline = 'top'; c.fillStyle = b.shield ? '#b9a6d8' : (b.dmgMul > 1 ? '#ffe680' : '#7dffb0');
      c.fillText(b.state !== 'fight' ? '' : b.shield ? (window.t ? t('Guarded') : 'Guarded') : (b.dmgMul > 1 ? (window.t ? t('OPEN! Double damage') : 'OPEN! Double damage') : (window.t ? t('OPEN!') : 'OPEN!')), W / 2, y2 + h2 + 8);
      c.restore();
    },
    // called by the app when the defeat film has finished (or was skipped)
    endCine() {
      if (!this.cine) return;
      this.cine = false;
      this.boss = null; this.bossDefeated = true;
      this.last = performance.now();
    },

    // Things you can aim at on the boss: the boss itself and, depending on the boss and phase,
    // fake copies, weak spots, numbered crystals or the charging orb of a water beam
    bossTargets() {
      const b = this.boss;
      if (!b || b.state !== 'fight' || b.transT > 0) return [];
      if (b.void) return this.voidTargets(b);
      const out = [];
      if (b.sprite === 'nebula' && b.phase === 2 && b.copies) {
        b.copies.forEach((c, i) => { if (!c.gone && c.alpha > 0.6) out.push({ px: c.x, py: c.y, r: b.r, bossPart: i === b.realIdx ? 'boss' : 'decoy', idx: i }); });
        return out;
      }
      if (b.spots && b.shield) b.spots.forEach((sp, i) => { if (sp.hp > 0) out.push({ px: sp.x, py: sp.y, r: 46, bossPart: 'spot', idx: i }); });
      if (b.crystals && b.shield) b.crystals.forEach((cr, i) => { if (!cr.broken) out.push({ px: cr.x, py: cr.y, r: 50, bossPart: 'crystal', idx: i }); });
      const beam = this.hazards.find((hz) => hz.kind === 'beam' && hz.t < hz.warn && !hz.dead);
      if (beam) out.push({ px: beam.ox, py: beam.oy, r: 58, bossPart: 'charge' });
      if (b.submerged <= 0) out.push({ px: b.x, py: b.y, r: b.r, bossPart: 'boss' });
      return out;
    },

    bossPartHit(tg, dmg, at, p) {
      const b = this.boss;
      if (!b || b.state !== 'fight') return;
      const say = (x, y, text, col) => this.floater(x, y, window.t ? t(text) : text, col);
      if (b.void && this.voidPartHit(b, tg, dmg, at, say)) return;
      if (tg.bossPart === 'decoy') {
        const c = b.copies[tg.idx];
        c.gone = true;
        Sfx.pop(); this.burst(c.x, c.y, '#ffffff', 16, true);
        say(c.x, c.y - b.r, 'Fake!', '#ff8ad8');
        return;
      }
      if (tg.bossPart === 'spot') {
        const sp = b.spots[tg.idx];
        sp.hp = Math.max(0, sp.hp - dmg);
        if (sp.hp <= 0 && BOSS_ART[b.sprite]) this.playFx(BOSS_ART[b.sprite], [9], sp.x, sp.y, 150, 0.35);
        Sfx.clink(); this.burst(sp.x, sp.y, '#ffd27a', 10, true);
        this.addScore(50, sp.x, sp.y - 40, true);
        if (b.spots.every((q) => q.hp <= 0)) {
          b.shield = false; b.openT = 5; Sfx.win(); this.hud('toast', 'Now! Hit ' + b.name + '!');
          if (BOSS_ART[b.sprite]) this.playFx(BOSS_ART[b.sprite], [13, 14], b.x, b.y, b.size * 1.15, 0.5);
        }
        return;
      }
      if (tg.bossPart === 'crystal') {
        // Prism Empress: the crystals must be broken in the order of their numbers
        const cr = b.crystals[tg.idx];
        if (cr.n !== b.nextN) {
          b.crystals.forEach((q) => { q.broken = false; });
          b.nextN = 1;
          Sfx.hurt(); say(cr.x, cr.y - 50, 'Wrong order!', '#ff5a7e');
          return;
        }
        cr.broken = true; b.nextN++;
        Sfx.clink(); this.burst(cr.x, cr.y, '#bff9ff', 14, true);
        this.addScore(80, cr.x, cr.y - 40, true);
        if (b.crystals.every((q) => q.broken)) { b.shield = false; b.openT = 5; Sfx.win(); this.hud('toast', 'Now! Hit ' + b.name + '!'); }
        return;
      }
      if (tg.bossPart === 'charge') {
        // Tidequeen: shooting the glowing orb stops the water beam
        const beam = this.hazards.find((hz) => hz.kind === 'beam' && hz.t < hz.warn && !hz.dead);
        if (beam) { beam.dead = true; Sfx.pop(); this.burst(beam.ox, beam.oy, '#9fd8ff', 20, true); say(beam.ox, beam.oy - 60, 'Beam stopped!', '#7dffb0'); this.addScore(150, beam.ox, beam.oy - 20, true); }
        return;
      }
      if (b.shield) { Sfx.clink(); say(at.x, at.y - 30, 'Shield!', '#9fd8ff'); return; }
      if (b.reflectT > 0) {
        // Prism Empress glowing red: your shot bounces back at you
        Sfx.clink(); say(at.x, at.y - 30, 'Reflected!', '#ff5a7e');
        this.playerHit(p || this.players[0]);
        return;
      }
      if (b.bladeSpeed > 0 && Math.cos(b.bladeAng) > 0.25) { Sfx.clink(); say(at.x, at.y - 30, 'Blocked!', '#c79bff'); return; }
      this.bossHit(dmg, at.x, at.y);
    },

    // A net grenade near the boss (or its copies / spots)
    bossNet(x, y) {
      const b = this.boss;
      if (!b || b.state !== 'fight' || b.transT > 0) return false;
      let hit = false;
      if (b.sprite === 'nebula' && b.phase === 2 && b.copies) {
        b.copies.forEach((c, i) => {
          if (c.gone || Math.hypot(c.x - x, c.y - y) > NET_R + b.r * 0.6) return;
          hit = true;
          this.bossPartHit({ bossPart: i === b.realIdx ? 'boss' : 'decoy', idx: i }, this.netDmg + 1, { x: c.x, y: c.y });
        });
        return hit;
      }
      if (b.spots && b.shield) {
        b.spots.forEach((sp, i) => { if (sp.hp > 0 && Math.hypot(sp.x - x, sp.y - y) < NET_R) { hit = true; this.bossPartHit({ bossPart: 'spot', idx: i }, this.netDmg, sp); } });
        if (hit) return true;
      }
      if (b.submerged <= 0 && Math.hypot(b.x - x, b.y - y) < NET_R + b.r * 0.6) {
        if (b.reflectT > 0) { this.floater(b.x, b.y - b.r, window.t ? t('Reflected!') : 'Reflected!', '#ff5a7e'); return true; }
        this.bossPartHit({ bossPart: 'boss' }, this.netDmg + 1, { x: b.x, y: b.y });
        if (!b.shield) this.hud('toast', 'The net tangles the ' + b.name + '!');
        return true;
      }
      return false;
    },

    updateBoss(gdt, dt) {
      if (this.boss.void) return this.updateVoid(this.boss, gdt, dt);
      const b = this.boss, s = SPR[b.sprite];
      if (this.frostT > 0) gdt *= 0.3;             // Frost Nova slows a boss down (it doesn't freeze it)
      b.t += gdt;
      b.flash = Math.max(0, b.flash - dt);
      if (b.throwAnim > 0) b.throwAnim -= dt;
      // Jellyfish bosses swim in strokes; the others float and bob, Ember flickers like a flame
      const jelly = !!s.push;
      const ph = (b.t * 0.55) % 1;
      const stroke = jelly ? Math.pow(Math.max(0, Math.sin(ph * Math.PI * 2)), 2)
        : b.sprite === 'ember' ? 0.25 + 0.2 * Math.sin(b.t * 9) * Math.sin(b.t * 3.7)
        : 0.3 * (0.5 + 0.5 * Math.sin(b.t * 2.2));
      if (b.state === 'enter') {
        // rises up from below the screen (in real time: the rest of the world is in slow motion)
        b.introT += dt; b.t = b.introT;
        const k = Math.min(1, b.introT / BOSS_INTRO), e = 1 - Math.pow(1 - Math.min(1, k * 1.5), 3);
        b.size = lerp(380, 520, e);
        b.y = lerp(H * 1.2, H * 0.43, e);
        b.x = W / 2;
        if (!b.roared && b.introT > 1.15) { b.roared = true; this.shake = 0.9; Sfx.roar(); window.Haptics && Haptics.buzz(320, 0.8); }
        if (k >= 1) {
          b.state = 'fight'; b.t = 0;
          this.hud('toast', `The ${b.name} appears!`);
          this.setPrompt('Catch the ' + b.name + ': hit it with the blaster or net grenades', 3);
          this.orbitSay('boss', true);
        }
      } else if (b.state === 'fight') {
        if (b.phased) this.updateBossPhases(b, gdt, dt);
        if (!(b.sprite === 'nebula' && b.phase === 2)) {
          b.mt = (b.mt || 0) + gdt * b.speed;
          const nx = (b.homeX || W / 2) + Math.sin(b.mt * (b.phase === 3 ? 0.45 : 0.3)) * W * (b.homeX ? 0.1 : 0.26);
          b.rot = clamp((nx - b.x) / Math.max(gdt, 0.001) * 0.0008, -0.25, 0.25);
          b.vx = (nx - b.x) / Math.max(gdt, 0.001);
          b.x = nx;
          b.y = (BOSS_ART[b.sprite] && BOSS_ART[b.sprite].ground) ? H * 0.5 - Math.abs(Math.sin(b.t * 2.4)) * 10   // walks on the ground
            : H * 0.43 + Math.sin(b.t * 0.7) * 30 - stroke * 24;
          if (this.bgv) {
            b.panX = clamp(((b.panX || 0) + this.bgv.panX * W * 0.5 * gdt) * Math.exp(-0.6 * gdt), -W * 0.12, W * 0.12);
            b.x = clamp(b.x + b.panX, b.size * 0.4, W - b.size * 0.4);
          }
        }
        // Rock attacks, with a warning glow before each throw
        if (b.transT <= 0) {
          b.throwT -= gdt;
          const warn = 0.7;
          b.tele = b.phased && b.throwT < warn ? 1 - b.throwT / warn : 0;
          if (b.throwT <= 0) {
            const from = { px: b.x, py: b.y + b.size * 0.2, type: b.sprite, bossArt: BOSS_ART[b.sprite] };
            b.throwAnim = 0.45;
            const a = BOSS_ATTACKS[b.sprite] || BOSS_ATTACKS.nebula;
            const volley = a.volley[b.phase - 1];
            if (b.submerged <= 0) for (let i = 0; i < volley; i++) setTimeout(() => { if (this.boss === b && b.state === 'fight') this.throwRock(from, a.kind); }, i * 220);
            b.throwT = a.every[b.phase - 1];
          }
        }
        b.minionT -= gdt;
        if (b.minionT <= 0) {
          if (this.monsters.filter((m) => m.state === 'alive').length < 3) this.spawn(TYPES[Math.floor(Math.random() * TYPES.length)]);
          b.minionT = rand(3.5, 5.5);
        }
      } else if (b.state === 'caught') {
        if (!b.vox && b.t > 0.4) {
          b.vox = this.voxelize(() => this.drawBossBody(b, b.x, b.y, 1, true), b.x, b.y, b.size * 1.45, this.voxCols(true), 'rise', { spread: 1.3 }) || 'none';
          Sfx.dissolve(true);
          window.Haptics && Haptics.buzz(180, 0.8);
          this.shake = Math.max(this.shake || 0, 0.35);
          this.burst(b.x, b.y, '#bff9ff', 40, true);
        }
        if (b.vox === 'none') b.size *= Math.pow(0.35, dt);        // fallback: the old shrink and fade
        if (b.t > (b.vox === 'none' ? 1.6 : 3.0)) { this.boss = null; this.bossDefeated = true; return; }
      }
      b.r = b.size * 0.3;
      b.sx = 1 + 0.07 * stroke; b.sy = 1 - 0.1 * stroke;
      b.frame = jelly ? (stroke > 0.45 ? s.push[0] : s.front[Math.floor(b.t * 1.5) % s.front.length])
        : s.front[Math.floor(b.t * 3) % s.front.length];
    },

    // Phases: every boss changes at 2/3 and 1/3 of its health, with its own attacks
    updateBossPhases(b, gdt, dt) {
      this.lastDt = gdt;          // used by the orbiting crystals / weak spots
      const want = b.hp > b.max * 2 / 3 ? 1 : b.hp > b.max / 3 ? 2 : 3;
      if (want !== b.phase) {
        b.phase = want; b.transT = 1.6; b.flash = 0.6; this.shake = 0.5;
        Sfx.lose();
        const msg = (PHASE_MSG[b.sprite] || PHASE_MSG.nebula)[want];
        if (msg) this.hud('toast', msg.replace('{name}', b.name));
        this.enterPhase(b, want);
      }
      b.transT = Math.max(0, b.transT - dt);
      const fn = { nebula: 'phNebula', ember: 'phEmber', splash: 'phTide', prism: 'phPrism', echo: 'phEcho', vortex: 'phVortex' }[b.sprite];
      if (fn && b.transT <= 0) this[fn](b, gdt, dt);
      // shields that open for 5 seconds (weak spots / crystals)
      if (!b.shield && b.openT > 0) {
        b.openT -= gdt;
        if (b.openT <= 0) {
          if (b.spots) { b.shield = true; b.spots = this.makeSpots(); this.hud('toast', 'The shield is back!'); }
          if (b.crystals) { b.shield = true; b.crystals = this.makeCrystals(); b.nextN = 1; this.hud('toast', 'The shield is back!'); }
        }
      }
      if (b.reflectT > 0) b.reflectT -= gdt;
      if (b.submerged > 0) b.submerged -= gdt;
    },

    enterPhase(b, ph) {
      if (b.sprite === 'nebula') {
        if (ph === 2) { b.copies = null; b.shuffleT = 0; }
        if (ph === 3) { b.copies = null; b.shield = true; b.spots = this.makeSpots(); }
      }
      if (b.sprite === 'ember' && ph === 3) b.speed = 1.7;
      if (b.sprite === 'prism' && ph >= 2) { b.shield = true; b.crystals = this.makeCrystals(); b.nextN = 1; }
      if (b.sprite === 'echo' && ph >= 2) b.dark = true;
      if (b.sprite === 'vortex') { b.bladeSpeed = ph === 2 ? 1.6 : ph === 3 ? 2.4 : 0; b.pull = ph === 3; }
    },

    // King Nebula: phase 2 three copies (find the real one), phase 3 bubble shield with weak spots
    phNebula(b, gdt, dt) {
      if (b.phase === 2) {
        b.shuffleT -= gdt;
        if (!b.copies || b.shuffleT <= 0) {
          const slots = [W * 0.24, W * 0.5, W * 0.76];
          b.realIdx = Math.floor(Math.random() * 3);
          b.copies = slots.map((x, i) => ({ x, y: H * 0.42, gone: false, alpha: 0, off: i * 2.1 }));
          b.shuffleT = 7;
        }
        for (const c of b.copies) {
          c.alpha = Math.min(1, c.alpha + dt * 2) * (b.shuffleT < 0.4 ? b.shuffleT / 0.4 : 1);
          c.y = H * 0.42 + Math.sin(b.t * 1.3 + c.off) * 40;
          c.x += Math.sin(b.t * 0.8 + c.off) * 40 * gdt;
        }
        const real = b.copies[b.realIdx];
        b.x = real.x; b.y = real.y; b.rot = 0;
      }
      if (b.phase === 3 && b.spots) this.orbitParts(b, b.spots, 0.9, 0.55);
    },

    // Ember Lord: phase 2+ sweeping walls of fire (only the shield blocks them), phase 3 enraged and fast
    phEmber(b, gdt) {
      if (b.phase < 2) return;
      b.wallT -= gdt;
      if (b.wallT <= 0) {
        this.hazards.push({ kind: 'wall', t: 0, warn: 2.2, dur: 0.7, color: '#ff7a3a' });
        this.setPrompt('Fire wall! Shield up!', 2.2);
        b.wallT = b.phase === 3 ? 7 : 9;
      }
    },

    // Tidequeen: phase 2+ dives (can't be hit) and comes up somewhere else, and charges a water beam
    // that you stop by shooting the glowing orb; phase 3 also calls waves of helpers
    phTide(b, gdt) {
      if (b.phase < 2) return;
      b.diveT -= gdt;
      if (b.diveT <= 0 && b.submerged <= 0) {
        b.submerged = 2;
        b.homeX = rand(W * 0.25, W * 0.75);
        b.diveT = b.phase === 3 ? 5.5 : 7.5;
        this.burst(b.x, b.y, '#9fd8ff', 20, true);
      }
      b.beamT -= gdt;
      if (b.beamT <= 0 && b.submerged <= 0) {
        this.hazards.push({ kind: 'beam', t: 0, warn: 2.0, dur: 0.6, color: '#9fd8ff', ox: b.x, oy: b.y + b.size * 0.22 });
        this.setPrompt('Shoot the glowing orb to stop the beam!', 2);
        b.beamT = b.phase === 3 ? 6.5 : 8.5;
      }
      if (b.phase === 3) {
        b.waveT -= gdt;
        if (b.waveT <= 0) { for (let i = 0; i < 3; i++) this.spawn(TYPES[i % TYPES.length]); b.waveT = 9; }
      }
    },

    // Prism Empress: glows red now and then (shots bounce back at you); phase 2+ numbered crystal shields
    phPrism(b, gdt) {
      b.reflectCd -= gdt;
      if (b.reflectCd <= 0 && b.reflectT <= 0) {
        b.reflectT = 2.2;
        b.reflectCd = b.phase === 3 ? 5 : 7;
        this.setPrompt('She glows red: stop shooting!', 1.6);
      }
      if (b.crystals) this.orbitParts(b, b.crystals, 0.7, 0.6);
    },

    // Echo Monarch: sound rings (shoot them down); phase 2+ the lights go out
    phEcho() {},

    // Vortex King: tornado helpers; phase 2+ spinning blades block shots; phase 3 its pull drags your aim
    phVortex(b, gdt) {
      b.bladeAng += gdt * b.bladeSpeed;
      b.waveT -= gdt;
      if (b.waveT <= 0) {
        if (this.monsters.filter((m) => m.state === 'alive').length < 5) { this.spawn(TYPES[0]); this.spawn(TYPES[TYPES.length - 1]); }
        b.waveT = b.phase === 3 ? 5 : 7;
      }
    },

    // true when someone plays with a gamepad (phone gamepad, touch gamepad) or tilt
    padPlay() { return this.touchMode || this.players.some((p) => p.input.mode === 'phone' && p.input.device !== 'cam'); },
    orbitParts(b, parts, speed, rad) {
      // with a gamepad the crystals / weak spots turn half as fast, so they are easier to hit
      if (this.padPlay()) speed *= 0.5;
      b.orbitA = (b.orbitA || 0) + speed * (this.lastDt || 0.016);
      parts.forEach((q, i) => {
        const a = b.orbitA + i * (Math.PI * 2 / parts.length);
        q.x = b.x + Math.cos(a) * b.size * rad;
        q.y = b.y + Math.sin(a) * b.size * rad * 0.78;
      });
    },
    makeCrystals() { return [1, 2, 3].sort(() => Math.random() - 0.5).map((n) => ({ n, broken: false, x: 0, y: 0 })); },

    // Fire walls and water beams: a warning first, then they hit every player (the shield blocks them)
    updateHazards(gdt) {
      for (const hz of this.hazards) {
        if (hz.dead) continue;
        hz.t += gdt;
        if (!hz.hit && hz.t >= hz.warn) {
          hz.hit = true;
          this.shake = 0.35;
          for (const p of this.players) this.playerHit(p);
        }
        if (hz.t >= hz.warn + hz.dur) hz.dead = true;
      }
      this.hazards = this.hazards.filter((hz) => !hz.dead);
    },

    makeSpots() { return [0, 1, 2].map(() => ({ hp: 2, x: 0, y: 0 })); },

    bossHit(dmg, x, y) {
      const b = this.boss;
      if (!b || b.state !== 'fight') return;
      if (b.void) { dmg *= b.dmgMul || 1; b.lastHitT = this.time; }
      b.hp = Math.max(0, b.hp - dmg);
      b.flash = 0.25;
      window.Haptics && Haptics.buzz(b.hp <= 0 ? 260 : 30, b.hp <= 0 ? 1 : 0.6, b.hp <= 0 ? 0 : 60);
      Sfx.pop();
      this.burst(x, y, SPR[b.sprite].color, 10 + dmg * 3);
      this.addScore(50 * dmg, x, y - 40, true);
      if (b.hp <= 0) {
        b.state = b.void ? 'defeat' : 'caught'; b.t = 0;
        this.hazards = []; b.dark = false; b.shield = false; b.bladeSpeed = 0; b.pull = false; b.reflectT = 0;
        if (b.void) { b.spots = null; b.vcrystals = null; b.charge = 0; b.fireT = 0; b.heart = null; this.monsters.forEach((m) => { if (m.state === 'alive') this.catchMonster(m); }); }
        else this.nets.push({ x: b.x, y: b.y, t: 0, big: true });
        this.earned += 10;
        this.shake = 0.4;
        Sfx.win();
        this.addScore(2500, b.x, b.y - b.r, true);
        this.hud('stat', { ev: 'boss', sprite: b.sprite, noDamage: !this.damageTaken });
        this.hud('toast', `You caught the ${b.name}!`);
        // the boss's own trophy, plus a handful of rare materials
        const trophy = TROPHIES[b.sprite];
        if (trophy) this.giveDrop('trophy:' + trophy, b.x, b.y);
        const reg = REGION_MAT[this.regionWorld];
        if (reg) for (let i = 0; i < 4; i++) setTimeout(() => this.giveDrop(reg, b.x + rand(-90, 90), b.y + rand(-60, 60)), 120 * i + 60);
        ['dust', 'goo', 'goo', 'shard', 'shard', 'shard'].forEach((k, i) => setTimeout(() => this.giveDrop(k, b.x + rand(-80, 80), b.y + rand(-60, 60)), 150 * i));
        this.hud('catch');
      }
    },

    // ---------------- Region abilities (drone abilities and weapon mods) ----------------
    // Each world has its own material and two abilities in its theme; the loadout holds one of each.
    modLv(kind, id) {
      const a = kind === 'drone' ? this.dAb : this.wAb;
      return a && a.id === id ? a.lv : 0;
    },
    // statuses on aliens: confused (wobble, no throwing), stunned (frozen), bubbled (frozen, floating), burning
    alienSlow(m) {
      if (m.stunT > 0 || m.bubbleT > 0 || m.frozenT > 0 || (m.pullK || 0) > 0.3) return 0;
      if (m.confT > 0) return 0.4;
      return 1;
    },
    updateStatus(m, dt) {
      if (m.confT > 0) m.confT -= dt;
      if (m.frozenT > 0) m.frozenT -= dt;
      if (m.stunT > 0) m.stunT -= dt;
      if (m.bubbleT > 0) { m.bubbleT -= dt; m.bubbleRise = (m.bubbleRise || 0) + dt * 40; }
      else if (m.bubbleRise) m.bubbleRise = Math.max(0, m.bubbleRise - dt * 120);
      if (m.burnT > 0) {
        m.burnT -= dt;
        if (Math.random() < 0.3) this.burst(m.px + rand(-0.3, 0.3) * m.r, m.py, '#ff9a3a', 1);
        if (m.burnT <= 0) {
          const lv = this.modLv('weapon', 'ember');
          // the flame jumps to a neighbour (level 2+)
          if (lv >= 2) {
            const near = this.monsters.filter((o) => o !== m && o.state === 'alive' && !(o.burnT > 0) && Math.hypot(o.px - m.px, o.py - m.py) < 320)[0];
            if (near) { near.burnT = [2, 1.5, 1][lv - 1]; this.lasers.push({ x1: m.px, y1: m.py, x2: near.px, y2: near.py, t: 0.12, color: '#ff9a3a' }); }
          }
          this.damageMonster(m, 1);
        }
      }
    },
    drawStatus(m) {
      const c = this.ctx;
      if (m.frozenT > 0) {
        c.save(); c.globalAlpha = 0.55 * Math.min(1, m.frozenT);
        c.fillStyle = 'rgba(191, 249, 255, 0.45)'; c.strokeStyle = '#e8f7ff'; c.lineWidth = 4;
        c.beginPath();
        for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + 0.3; c.lineTo(m.px + Math.cos(a) * m.size * 0.5, m.py + Math.sin(a) * m.size * 0.5); }
        c.closePath(); c.fill(); c.stroke(); c.restore();
      }
      if (m.bubbleT > 0) {
        c.save(); c.globalAlpha = 0.5; c.strokeStyle = '#e8f7ff'; c.lineWidth = 4; c.fillStyle = 'rgba(159, 216, 255, 0.18)';
        c.beginPath(); c.arc(m.px, m.py, m.size * 0.5, 0, Math.PI * 2); c.fill(); c.stroke();
        c.globalAlpha = 0.8; c.fillStyle = '#fff'; c.beginPath(); c.arc(m.px - m.size * 0.2, m.py - m.size * 0.22, m.size * 0.06, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      if (m.confT > 0) {
        c.save(); c.font = `700 ${Math.round(28 + m.size * 0.08)}px ${FONT}`; c.textAlign = 'center';
        c.fillStyle = '#ff8ad8'; c.strokeStyle = '#0a1440'; c.lineWidth = 5;
        const y = m.py - m.size * 0.62 + Math.sin(this.time * 6) * 6;
        c.strokeText('?', m.px, y); c.fillText('?', m.px, y); c.restore();
      }
      if (m.stunT > 0) {
        c.save(); c.fillStyle = '#ffd27a';
        for (let i = 0; i < 3; i++) {
          const a = this.time * 5 + i * 2.1;
          const x = m.px + Math.cos(a) * m.size * 0.3, y = m.py - m.size * 0.5 + Math.sin(a) * m.size * 0.08;
          c.beginPath();
          for (let k = 0; k < 8; k++) { const q = k * Math.PI / 4, r = k % 2 ? 4 : 11; c.lineTo(x + Math.cos(q) * r, y + Math.sin(q) * r); }
          c.closePath(); c.fill();
        }
        c.restore();
      }
    },

    // Drone abilities, each drone on its own timer
    droneAbility(d, dt) {
      const a = this.dAb;
      if (!a) return;
      const lv = a.lv;
      d.abT = (d.abT == null ? 4 + Math.random() * 3 : d.abT) - dt;
      if (d.holoT > 0) d.holoT -= dt;
      if (d.abT > 0) return;
      const alive = this.monsters.filter((m) => m.state === 'alive');
      if (a.id === 'mirror') {
        // hologram copies of the drone: aliens get confused
        d.holoT = 6; d.abT = [14, 12, 10][lv - 1];
        const secs = [3, 4, 5][lv - 1];
        alive.forEach((m) => { m.confT = Math.max(m.confT || 0, secs); });
        Sfx.slow();
      } else if (a.id === 'wave') {
        // a wave pushes all aliens back and washes away flying rocks
        d.abT = [12, 10, 8][lv - 1];
        alive.forEach((m) => { m.z = Math.max(0, m.z - [0.15, 0.2, 0.25][lv - 1]); });
        this.rocks.forEach((r) => this.smashRock(r));
        this.waves.push({ x: d.x, y: d.y, t: 0, color: '#9fd8ff' });
        Sfx.net();
      } else if (a.id === 'sonar') {
        // a sonar pulse stuns nearby aliens
        d.abT = [10, 8, 6][lv - 1];
        const r = [380, 480, 580][lv - 1];
        alive.forEach((m) => { if (Math.hypot(m.px - d.x, m.py - d.y) < r) m.stunT = [1.5, 2, 2.5][lv - 1]; });
        this.waves.push({ x: d.x, y: d.y, t: 0, color: '#b99bff' });
        Sfx.slow();
      } else if (a.id === 'blades') {
        // throws a blade at the incoming rock closest to hitting you
        d.abT = [4, 3, 2][lv - 1];
        const r = this.rocks.filter((q) => q.state === 'fly').sort((p1, p2) => p2.t / p2.dur - p1.t / p1.dur)[0];
        if (r) { this.lasers.push({ x1: d.x, y1: d.y, x2: r.x, y2: r.y, t: 0.14, color: '#c79bff' }); this.smashRock(r); Sfx.clink(); }
        else d.abT = 0.5;
      } else d.abT = 999;       // flare and prism work on the drone's normal shot
    },
    // Flare and Prism drones change the drone's own shot
    droneShotExtra(d, main) {
      const a = this.dAb;
      if (!a) return;
      const others = this.monsters.filter((m) => m.state === 'alive' && m !== main);
      if (a.id === 'flare') {
        // a fan of sparks: also hits the nearest other aliens
        others.sort((p1, p2) => p2.z - p1.z).slice(0, [2, 3, 3][a.lv - 1]).forEach((m) => {
          this.lasers.push({ x1: d.x, y1: d.y, x2: m.px, y2: m.py, t: 0.16, color: '#ff9a3a' });
          this.damageMonster(m, a.lv === 3 ? 2 : 1);
        });
      }
      if (a.id === 'prismd') {
        // prism beams strip the armour off armoured aliens
        others.filter((m) => m.elite && m.hp > 1).slice(0, [2, 3, 4][a.lv - 1]).forEach((m) => {
          this.lasers.push({ x1: d.x, y1: d.y, x2: m.px, y2: m.py, t: 0.16, color: '#bff9ff' });
          m.hp = 1; m.hitFlash = 0.3;
          this.floater(m.px, m.py - m.r, window.t ? t('Armour off!') : 'Armour off!', '#bff9ff');
        });
      }
    },
    // Whirlpool net: the net leaves a whirlpool that keeps catching
    updateWhirls(dt) {
      for (const w of this.whirls) {
        w.t += dt; w.tick -= dt;
        if (w.tick <= 0) {
          w.tick = 0.5;
          this.monsters.forEach((m) => { if (m.state === 'alive' && Math.hypot(m.px - w.x, m.py - w.y) < NET_R * 0.85) this.damageMonster(m, 1, true); });
        }
      }
      this.whirls = this.whirls.filter((w) => w.t < w.dur);
    },
    drawWhirls() {
      const c = this.ctx;
      for (const w of this.whirls) {
        c.save(); c.translate(w.x, w.y); c.rotate(w.t * 4);
        c.globalAlpha = Math.min(1, (w.dur - w.t) * 2) * 0.8; c.strokeStyle = '#9fd8ff'; c.lineWidth = 5;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, NET_R * (0.3 + i * 0.25), i, i + 3.6); c.stroke(); }
        c.restore();
      }
    },
    // Hologram copies around a drone (Mirror drones)
    drawHolos(d, img, meta, h, w) {
      if (!(d.holoT > 0)) return;
      const c = this.ctx, n = [2, 3, 4][this.dAb.lv - 1];
      for (let i = 0; i < n; i++) {
        const a = this.time * 1.5 + i * (Math.PI * 2 / n);
        const x = d.x + Math.cos(a) * 150, y = d.y + Math.sin(a) * 70;
        c.save(); c.globalAlpha = 0.35 * Math.min(1, d.holoT); c.globalCompositeOperation = 'lighter';
        c.drawImage(img, 0, 0, meta.fw, meta.fh, x - w / 2, y - h / 2, w, h);
        c.restore();
      }
    },

    // ---------------- Superpowers ----------------
    // A meter fills by catching aliens (faster with combos) and by not getting hit. When it is full,
    // the equipped superpower can be used once; then the meter starts again.
    superInit() {
      // two superpowers: one in each hand (left = slot 0, right = slot 1); they share the meter
      const picks = this.save.superPicks || [this.save.superPick || 'shockwave', null];
      this.superIds = [0, 1].map((k) => (picks[k] && SUPERS[picks[k]] && SUPERS[picks[k]].ready ? picks[k] : null));
      if (!this.superIds[0] && !this.superIds[1]) this.superIds[0] = 'shockwave';
      this.superId = this.superIds[0] || this.superIds[1];
      this.superMeter = 0; this.superReady = false; this.superCleanT = 0;
      this.barrierT = 0; this.swirlT = 0; this.swirlZapT = 0;
      this.holeT = 0; this.frostT = 0; this.overdriveT = 0; this.meteorT = 0; this.auroraT = 0; this.meteors = [];
      this.superSent = -1;
      this.superHud();
    },
    superAdd(v) {
      if (this.plat || this.superReady) return;
      this.superMeter = Math.min(1, this.superMeter + v);
      if (this.superMeter >= 1 && !this.superReady) {
        this.superReady = true;
        Sfx.win();
        this.hud('toast', 'Superpower ready!');
      }
      this.superHud();
    },
    superHud() {
      const p = Math.round(this.superMeter * 100);
      if (p === this.superSent && !this.superDirty) return;
      this.superSent = p; this.superDirty = false;
      this.hud('super', { p: this.superMeter, ready: this.superReady, ids: this.superIds, none: !!this.plat });
    },
    updateSuper(dt) {
      if (this.plat) return;
      // not getting hit for a while also fills the meter a little
      this.superCleanT += dt;
      if (this.superCleanT >= 10) { this.superCleanT = 0; this.superAdd(0.05); }
      this.updateSuper2(dt);
      if (this.barrierT > 0) { this.barrierT -= dt; if (this.barrierT <= 0) this.hud('toast', 'Star Barrier is gone'); }
      if (this.swirlT > 0) {
        this.swirlT -= dt;
        // dizzy aliens bump into each other: every little while one of them catches another
        this.swirlZapT -= dt;
        const alive = this.monsters.filter((m) => m.state === 'alive');
        alive.forEach((m) => { m.confT = Math.max(m.confT || 0, 0.3); });
        if (this.swirlZapT <= 0 && alive.length >= 2) {
          this.swirlZapT = 0.8;
          const a = alive[Math.floor(Math.random() * alive.length)];
          const b = alive.filter((m) => m !== a).sort((m1, m2) => Math.hypot(m1.px - a.px, m1.py - a.py) - Math.hypot(m2.px - a.px, m2.py - a.py))[0];
          this.lasers.push({ x1: a.px, y1: a.py, x2: b.px, y2: b.py, t: 0.25, color: '#ff8ad8' });
          this.floater(b.px, b.py - b.r, window.t ? t('Bonk!') : 'Bonk!', '#ff8ad8');
          this.damageMonster(b, 2);
        }
      }
    },
    activateSuper(slot = 0) {
      if (this.state !== 'play' || this.plat || !this.superReady || this.dizzyT > 0) return;
      // the chosen hand; if that hand is empty, the other one
      const id = this.superIds[slot] || this.superIds[1 - slot];
      if (!id) return;
      this.superId = id;
      this.superReady = false; this.superMeter = 0; this.superDirty = true;
      const gx = W / 2, gy = H - 200;
      this.flash = 0.5; this.shake = 0.3;
      Sfx.win();
      this.hud('toast', (SUPERS[id] || {}).name || 'Superpower');
      const lv = this.superLv(id), mul = this.superMul(id);
      if (id === 'shockwave') {
        // a huge ring blasts every alien far back and smashes every rock in the air (level 2-3: further back, stunned longer)
        const push = [0.45, 0.55, 0.65][lv - 1], stun = [1, 2, 3][lv - 1];
        this.monsters.forEach((m) => { if (m.state === 'alive') { m.z = Math.max(0, m.z - push); m.stunT = Math.max(m.stunT || 0, stun); } });
        if (this.monsters.some((m) => m.state === 'attacking')) this.monsters.forEach((m) => { if (m.state === 'attacking') { m.state = 'alive'; m.z = 0.4; } });
        this.rocks.forEach((r) => { if (r.state === 'fly') this.smashRock(r); });
        this.hazards.forEach((hz) => { if (hz.t < hz.warn) hz.dead = true; });
        for (let i = 0; i < 3; i++) setTimeout(() => this.waves.push({ x: gx, y: gy, t: 0, color: i === 1 ? '#ffd27a' : '#bff9ff' }), i * 120);
        Sfx.net();
      }
      if (id === 'barrier') {
        // nothing gets through for 8 seconds: rocks, fire walls, beams, reflected shots
        this.barrierT = 8 * mul;
      }
      if (id === 'mindswirl') {
        this.swirlT = 8 * mul; this.swirlZapT = 0.4;
      }
      this.superStart2(id);
      this.superHud();
    },
    drawSuperFx() {
      const c = this.ctx;
      if (this.barrierT > 0) {
        // a glowing dome over the bottom of the screen
        const k = Math.min(1, this.barrierT) * (0.75 + 0.25 * Math.sin(this.time * 6));
        c.save(); c.globalAlpha = 0.35 * k;
        const g = c.createRadialGradient(W / 2, H + 200, 200, W / 2, H + 200, H * 0.95);
        g.addColorStop(0, 'rgba(191, 249, 255, 0)'); g.addColorStop(0.85, 'rgba(98, 240, 255, 0.35)'); g.addColorStop(1, 'rgba(191, 249, 255, 0.9)');
        c.fillStyle = g; c.beginPath(); c.ellipse(W / 2, H + 200, W * 0.62, H * 0.95, 0, Math.PI, 0); c.fill();
        c.globalAlpha = 0.8 * k; c.strokeStyle = '#bff9ff'; c.lineWidth = 6;
        c.beginPath(); c.ellipse(W / 2, H + 200, W * 0.62, H * 0.95, 0, Math.PI, 0); c.stroke();
        c.restore();
      }
      if (this.swirlT > 0) {
        c.save(); c.globalAlpha = Math.min(1, this.swirlT) * 0.12; c.fillStyle = '#ff8ad8'; c.fillRect(0, 0, W, H); c.restore();
      }
    },

    // ---- the other five superpowers ----
    superStart2(id) {
      const mul = this.superMul(id), lv = this.superLv(id);
      if (id === 'blackhole') {
        // a black hole in the middle pulls all aliens in; hitting the bunch (or the hole) catches them all
        this.holeT = 6 * mul; this.hole = { x: W / 2, y: H * 0.42 };
        Sfx.slow();
      }
      if (id === 'frost') {
        this.frostT = 5 * mul;
        this.monsters.forEach((m) => { if (m.state === 'alive' || m.state === 'attacking') { m.state = 'alive'; m.frozenT = 5 * mul; m.z = Math.min(m.z, 0.9); } });
        this.rocks.forEach((r) => { if (r.state === 'fly') this.smashRock(r); });
        Sfx.clink();
      }
      if (id === 'overdrive') { this.overdriveT = 6 * mul; this.players.forEach((p) => { p.reloading = false; p.odCd = 0; }); }
      if (id === 'meteor') { this.meteorT = 5 * mul; this.meteorSpawn = 0; }
      if (id === 'aurora') {
        const heal = [40, 50, 60][lv - 1];
        this.health = Math.min(100, this.health + heal); this.hud('health');
        this.auroraT = 10 * mul; this.auroraTick = 0;
        this.floater(W / 2, H * 0.5, '+' + heal, '#7dffb0');
      }
    },
    updateSuper2(dt) {
      if (this.holeT > 0) {
        this.holeT -= dt;
        if (this.holeT <= 0) this.monsters.forEach((m) => { m.pullK = Math.min(m.pullK || 0, 0.99); });
      }
      if (this.frostT > 0) this.frostT -= dt;
      if (this.overdriveT > 0) this.overdriveT -= dt;
      if (this.meteorT > 0) {
        this.meteorT -= dt; this.meteorSpawn -= dt;
        if (this.meteorSpawn <= 0) {
          this.meteorSpawn = 0.32;
          const alive = this.monsters.filter((m) => m.state === 'alive');
          const b = this.boss && this.boss.state === 'fight' ? this.boss : null;
          const tg = alive.length && !(b && Math.random() < 0.4) ? alive[Math.floor(Math.random() * alive.length)] : b ? { px: b.x + rand(-40, 40), py: b.y + rand(-40, 40) } : null;
          const x1 = tg ? tg.px : rand(W * 0.15, W * 0.85), y1 = tg ? tg.py : rand(H * 0.35, H * 0.65);
          this.meteors.push({ x0: x1 + rand(-420, -180), y0: -80, x1, y1, t: 0, dur: 0.55 });
        }
      }
      for (const mt of this.meteors) {
        mt.t += dt;
        if (mt.t >= mt.dur && !mt.hit) {
          mt.hit = true;
          this.burst(mt.x1, mt.y1, '#ffd27a', 18, true); this.burst(mt.x1, mt.y1, '#ff8ad8', 10);
          this.shake = Math.max(this.shake, 0.12);
          Sfx.pop();
          this.monsters.forEach((m) => { if (m.state === 'alive' && Math.hypot(m.px - mt.x1, m.py - mt.y1) < 140) this.damageMonster(m, 3); });
          // against a boss: meteors land on it too, for a little damage
          const b = this.boss;
          if (b && b.state === 'fight' && !b.shield && b.submerged <= 0 && Math.hypot(b.x - mt.x1, b.y - mt.y1) < b.r + 80) this.bossHit(1, mt.x1, mt.y1);
        }
      }
      this.meteors = this.meteors.filter((mt) => mt.t < mt.dur + 0.3);
      if (this.auroraT > 0) {
        this.auroraT -= dt; this.auroraTick -= dt;
        if (this.auroraTick <= 0 && this.health < 100) { this.auroraTick = 0.4; this.health = Math.min(100, this.health + 1); this.hud('health'); }
      }
    },
    // Black hole: the pull on each alien (called from the alien update)
    holePull(m, dt) {
      if (this.holeT > 0 && m.state === 'alive') m.pullK = Math.min(1, (m.pullK || 0) + dt * 1.1);
      else if (m.pullK) m.pullK = Math.max(0, m.pullK - dt * 2.5);
      if (!m.pullK) return;
      const k = m.pullK * m.pullK * (3 - 2 * m.pullK);           // smooth
      const a = this.time * 3 + m.phase, rad = 70 * (1 - k) + 26;
      m.px = lerp(m.px, this.hole.x + Math.cos(a) * rad, k);
      m.py = lerp(m.py, this.hole.y + Math.sin(a) * rad * 0.6, k);
      m.size *= 1 - 0.35 * k; m.r = m.size * 0.38;
    },
    // one hit on the bunch (or on the hole itself) catches every alien pulled in
    holeCollapse() {
      const caught = this.monsters.filter((m) => m.state === 'alive' && (m.pullK || 0) > 0.6);
      if (!caught.length) return false;
      this.holeT = 0;
      this.burst(this.hole.x, this.hole.y, '#c79bff', 30, true);
      this.shake = 0.3; Sfx.win();
      caught.forEach((m) => this.damageMonster(m, 99));
      this.hud('toast', `Black Hole caught ${caught.length}!`);
      return true;
    },
    drawHole() {
      const c = this.ctx;
      {
        const { x, y } = this.hole, k = Math.min(1, this.holeT, (6 - this.holeT) * 2);
        c.save(); c.translate(x, y); c.rotate(-this.time * 2.2);
        c.globalAlpha = k;
        const g = c.createRadialGradient(0, 0, 10, 0, 0, 170);
        g.addColorStop(0, '#000'); g.addColorStop(0.35, '#05010f'); g.addColorStop(0.55, 'rgba(120, 60, 220, 0.8)'); g.addColorStop(1, 'rgba(199, 155, 255, 0)');
        c.fillStyle = g; c.beginPath(); c.arc(0, 0, 170, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(255, 138, 216, 0.7)'; c.lineWidth = 4;
        for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(0, 0, 70 + i * 28, i * 2, i * 2 + 3.4); c.stroke(); }
        c.restore();
      }
    },
    drawSuperFx2() {
      const c = this.ctx;
      if (this.frostT > 0) {
        const k = Math.min(1, this.frostT);
        c.save(); c.globalAlpha = 0.7 * k;
        const g = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.6);
        g.addColorStop(0, 'rgba(191, 249, 255, 0)'); g.addColorStop(1, 'rgba(191, 249, 255, 0.85)');
        c.fillStyle = g; c.fillRect(0, 0, W, H); c.restore();
      }
      if (this.overdriveT > 0) {
        c.save(); c.globalAlpha = 0.45 + 0.2 * Math.sin(this.time * 20); c.strokeStyle = '#ff8ad8'; c.lineWidth = 22;
        c.shadowColor = '#ff8ad8'; c.shadowBlur = this.glow(30);
        c.strokeRect(11, 11, W - 22, H - 22); c.restore();
      }
      for (const mt of this.meteors) {
        if (mt.hit) continue;
        const k = mt.t / mt.dur, x = lerp(mt.x0, mt.x1, k), y = lerp(mt.y0, mt.y1, k);
        c.save(); c.globalCompositeOperation = 'lighter';
        const tx = x - (mt.x1 - mt.x0) * 0.25, ty = y - (mt.y1 - mt.y0) * 0.25;
        const g = c.createLinearGradient(tx, ty, x, y);
        g.addColorStop(0, 'rgba(255, 138, 216, 0)'); g.addColorStop(1, 'rgba(255, 220, 150, 0.95)');
        c.strokeStyle = g; c.lineWidth = 16; c.lineCap = 'round';
        c.beginPath(); c.moveTo(tx, ty); c.lineTo(x, y); c.stroke();
        c.fillStyle = '#fff4c9'; c.beginPath(); c.arc(x, y, 16, 0, Math.PI * 2); c.fill();
        c.restore();
      }
      if (this.auroraT > 0) {
        const k = Math.min(1, this.auroraT);
        c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          c.globalAlpha = 0.38 * k;
          const g = c.createLinearGradient(0, 0, 0, H * 0.5);
          g.addColorStop(0, i === 1 ? '#7dffb0' : '#62f0ff'); g.addColorStop(1, 'rgba(0, 0, 0, 0)');
          c.fillStyle = g; c.beginPath(); c.moveTo(0, 0);
          for (let x = 0; x <= W; x += 60) c.lineTo(x, H * (0.18 + 0.08 * i) + Math.sin(x / 260 + this.time * (1 + i * 0.4) + i) * 40);
          c.lineTo(W, 0); c.closePath(); c.fill();
        }
        c.restore();
      }
    },

    // ---------------- Endless mode ----------------
    // Waves get bigger and faster; every 5 waves the world (background and aliens) changes,
    // and every 5th wave is that world's boss. Each new wave heals 10%.
    nextWave(first) {
      this.wave = (this.wave || 0) + 1;
      const world = (Math.floor((this.wave - 1) / 5) % 6) + 1;
      const cfg = LEVELS[world];
      TYPES = cfg.types.slice(); this.types = TYPES;
      TYPES.forEach((t) => { if (this.caught[t] == null) this.caught[t] = 0; });
      this.bgKey = 'bg' + world;
      this.regionWorld = world;
      this.levelCfg = { ...this.levelCfg, underwater: !!cfg.underwater, ...difficulty(Math.min(10, 1 + Math.floor((this.wave - 1) / 2)), 1 + Math.floor((this.wave - 1) / 5)), boss: null };
      this.waveCaught = 0;
      this.waveTarget = 10 + 2 * this.wave;
      this.bossWave = this.wave % 5 === 0;
      this.bossDefeated = false;
      this.bossWorldName = cfg.name;
      // random events: a meteor storm every third wave, a mini-boss now and then
      this.eventPlan = this.bossWave ? {} : { storm: this.wave % 3 === 2, mini: this.wave % 4 === 3 };
      this.storm = null; this.stormDone = false;
      if (this.mini && this.miniDone) { this.mini = null; this.miniDone = false; }
      if (this.bossWave) this.levelCfg.boss = { ...cfg.boss, hp: Math.round(cfg.boss.hp * (1 + this.wave / 15)) };
      this.stateT = 0;
      if (!first) { this.health = Math.min(100, this.health + 10); this.hud('health'); Sfx.win(); }
      this.hud('toast', this.bossWave ? `Wave ${this.wave}: boss!` : `Wave ${this.wave}`);
      this.hud('stat', { ev: 'wave', n: this.wave });
    },
    drawWaveLabel() {
      const c = this.ctx;
      c.save();
      c.font = `700 30px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = '#bff9ff'; c.shadowColor = '#000'; c.shadowBlur = this.glow(8);
      const w = window.t ? t('Wave') : 'Wave';
      c.fillText(this.bossWave ? `${w} ${this.wave} · ${window.t ? t('Boss') : 'Boss'}` : `${w} ${this.wave} · ${this.waveCaught}/${this.waveTarget}`, W / 2, 232);
      c.restore();
    },

    // ---------------- Score, combos and drops ----------------
    // Catches in quick succession build a combo: every 3 catches the multiplier goes up (max ×5)
    addScore(pts, x, y, noCombo) {
      if (!noCombo) {
        this.combo = this.time - this.lastCatchT < 2.5 ? this.combo + 1 : 1;
        this.lastCatchT = this.time;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.mult = Math.min(5, 1 + Math.floor((this.combo - 1) / 3));
        if (this.combo >= 2) this.hud('combo', { combo: this.combo, mult: this.mult });
        if (this.combo >= 5) this.hud('stat', { ev: 'combo', n: this.combo });
        if (this.combo === 5 || this.combo === 10) this.orbitSay('combo');
      }
      const got = Math.round(pts * (noCombo ? 1 : this.mult) * (this.hyperT > 0 ? 2 : 1) * (this.buddyBonus === 'score' ? 1.1 : 1));
      this.score += got;
      this.floater(x, y, '+' + got, this.hyperT > 0 ? '#ffe680' : this.mult > 1 && !noCombo ? '#ffd27a' : '#ffffff');
      this.hud('score', this.score);
    },
    floater(x, y, text, color) {
      if (this.floaters.length > 30) this.floaters.shift();
      this.floaters.push({ x, y, text, color, t: 0 });
    },
    // Materials: shards (common), goo (rare), star dust (epic); armoured and shiny aliens drop more
    rollDrop(m) {
      const reg = REGION_MAT[this.regionWorld];
      if (reg && Math.random() < (m.shiny ? 1 : m.elite ? 0.45 : 0.18) * (this.dropBoost || 1)) this.giveDrop(reg, m.px + 30, m.py);
      const r = Math.random();
      const boost = this.dropBoost || 1;
      const [pShard, pGoo, pDust] = (m.shiny ? [1, 1, 1] : m.elite ? [0.6, 0.25, 0.08] : [0.3, 0.07, 0.015]).map((q) => q * boost);
      if (m.shiny) { this.giveDrop('dust', m.px, m.py); this.giveDrop('goo', m.px, m.py); return; }
      if (r < pDust) this.giveDrop('dust', m.px, m.py);
      else if (r < pDust + pGoo) this.giveDrop('goo', m.px, m.py);
      else if (r < pDust + pGoo + pShard) this.giveDrop('shard', m.px, m.py);
    },
    giveDrop(kind, x, y) {
      this.drops.push({ kind, x0: x, y0: y, t: 0 });
      this.levelDrops[kind] = (this.levelDrops[kind] || 0) + 1;
      this.hud('drop', kind);
    },
    updateScoreFx(dt) {
      for (const f of this.floaters) f.t += dt;
      this.floaters = this.floaters.filter((f) => f.t < 1.1);
      for (const d of this.drops) d.t += dt;
      this.drops = this.drops.filter((d) => d.t < 1.2);
      if (this.combo > 1 && this.time - this.lastCatchT > 2.5) { this.combo = 0; this.mult = 1; this.hud('combo', null); }
    },
    drawScoreFx() {
      const c = this.ctx;
      c.save();
      c.textAlign = 'center'; c.textBaseline = 'middle';
      for (const f of this.floaters) {
        const k = f.t / 1.1;
        c.globalAlpha = 1 - k * k;
        c.font = `700 ${Math.round(36 + (f.text.length < 5 ? 0 : 4))}px ${FONT}`;
        c.lineWidth = 6; c.strokeStyle = 'rgba(10, 20, 64, 0.8)';
        c.strokeText(f.text, f.x, f.y - k * 70);
        c.fillStyle = f.color; c.fillText(f.text, f.x, f.y - k * 70);
      }
      c.restore();
      // drops fly from the alien to the material counter in the corner
      for (const d of this.drops) {
        const k = Math.min(1, d.t / 1.0), e = k * k;
        const tx = 150, ty = H - 70;
        const x = lerp(d.x0, tx, e), y = lerp(d.y0, ty, e) - Math.sin(k * Math.PI) * 120;
        this.drawMaterial(d.kind, x, y, lerp(46, 26, k), d.t > 1 ? 1 - (d.t - 1) / 0.2 : 1);
      }
    },
    // Placeholder icons for materials and trophies (to be replaced by artwork)
    drawMaterial(kind, x, y, s, alpha = 1) {
      const c = this.ctx;
      c.save(); c.globalAlpha = alpha; c.translate(x, y);
      c.lineWidth = 3; c.strokeStyle = '#ffffff';
      if (kind === 'shard') {
        c.fillStyle = '#62f0ff';
        c.beginPath(); c.moveTo(0, -s * 0.6); c.lineTo(s * 0.35, 0); c.lineTo(0, s * 0.6); c.lineTo(-s * 0.35, 0); c.closePath(); c.fill(); c.stroke();
      } else if (kind === 'goo') {
        c.fillStyle = '#7dffb0';
        c.beginPath(); c.arc(0, s * 0.08, s * 0.42, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#ff8ad8'; c.beginPath(); c.arc(-s * 0.12, -s * 0.05, s * 0.12, 0, Math.PI * 2); c.fill();
      } else if (kind === 'dust') {
        c.fillStyle = '#ffd27a';
        c.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? s * 0.18 : s * 0.55; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        c.closePath(); c.fill(); c.stroke();
      } else if (REGION_ICON[kind]) {
        // region materials (placeholder icons)
        const [col, shape] = REGION_ICON[kind];
        c.fillStyle = col;
        if (shape === 'cloud') { [[-0.2, 0.05, 0.28], [0.12, -0.05, 0.32], [0.3, 0.12, 0.22]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a * s, b * s, r * s, 0, Math.PI * 2); c.fill(); }); }
        if (shape === 'flame') { c.beginPath(); c.moveTo(0, -s * 0.55); c.quadraticCurveTo(s * 0.45, 0, 0, s * 0.45); c.quadraticCurveTo(-s * 0.45, 0, 0, -s * 0.55); c.fill(); c.stroke(); }
        if (shape === 'pearl') { c.beginPath(); c.arc(0, 0, s * 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * 0.13, -s * 0.13, s * 0.1, 0, Math.PI * 2); c.fill(); }
        if (shape === 'prism') { c.beginPath(); c.moveTo(0, -s * 0.5); c.lineTo(s * 0.45, s * 0.4); c.lineTo(-s * 0.45, s * 0.4); c.closePath(); c.fill(); c.stroke(); }
        if (shape === 'rings') { c.strokeStyle = col; c.lineWidth = 4; [0.18, 0.34, 0.5].forEach((r) => { c.beginPath(); c.arc(0, 0, r * s, 0, Math.PI * 2); c.stroke(); }); }
        if (shape === 'swirl') { c.strokeStyle = col; c.lineWidth = 5; c.beginPath(); for (let a = 0; a < 12; a += 0.3) c.lineTo(Math.cos(a) * a * s * 0.04, Math.sin(a) * a * s * 0.04); c.stroke(); }
      } else {
        // trophy: a golden crown with a gem
        c.fillStyle = '#ffd27a';
        c.beginPath(); c.moveTo(-s * 0.5, s * 0.35); c.lineTo(-s * 0.5, -s * 0.2); c.lineTo(-s * 0.25, s * 0.05); c.lineTo(0, -s * 0.45); c.lineTo(s * 0.25, s * 0.05); c.lineTo(s * 0.5, -s * 0.2); c.lineTo(s * 0.5, s * 0.35); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#b99bff'; c.beginPath(); c.arc(0, s * 0.12, s * 0.12, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    },

    // ---------------- Underwater bubbles ----------------
    updateBubbles(dt) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) {
        this.bubbleT = this.quality === 'low' ? 0.3 : this.lowFx ? 0.18 : 0.12;
        this.bubbles.push({ x: rand(0, W), y: H + 20, r: rand(3, 11), vy: rand(60, 150), ph: rand(0, 6), life: 99 });
      }
      for (const b of this.bubbles) { b.y -= b.vy * dt; b.x += Math.sin(this.time * 2 + b.ph) * 20 * dt; b.life -= dt; }
      this.bubbles = this.bubbles.filter((b) => b.y > -30 && b.life > 0);
    },
    trailBubbles(m) {
      for (let i = 0; i < 3; i++) {
        this.bubbles.push({ x: m.px + rand(-0.15, 0.15) * m.size, y: m.py + m.size * 0.35, r: rand(2, 6) * (0.5 + m.z), vy: rand(40, 90), ph: rand(0, 6), life: 2.5 });
      }
    },

    // ---------------- Time grenade ----------------
    timeBurst(x, y) {
      this.slowT = TIME_SLOW;
      this.waves.push({ x, y, t: 0 });
      Sfx.slow();
      this.hud('toast', 'Time slowed down!');
    },

    // ---------------- Gadget belt ----------------
    // One player: on the side of the aiming hand. Two players: Player 1 left, Player 2 right.
    beltPos(p) {
      const left = this.players.length > 1 ? p.id === 1 : p.input.hand === 'left';
      return left ? { x: 150, y: H - 150 } : { x: W - 150, y: H - 150 };
    },
    gearList() { return (this.save.owned || {}).timeGrenade ? [...GEAR, TIME_GEAR] : GEAR; },
    beltItems(p) {
      const b = this.beltPos(p);
      return this.gearList().map((g, i) => ({ ...g, x: b.x, y: b.y - BELT.gap * (i + 1) }));
    },
    gearAvailable(p, id) {
      if (id === 'time') return p.timeGrenades > 0;
      if (id === 'grenade') return p.grenades > 0;
      if (id === 'shield') return p.shieldHP > 0;
      return true;
    },
    inBeltZone(p, pt) {
      if (this.touchMode) return false;
      const b = this.beltPos(p);
      if (dist(pt, b) < BELT.r * 1.7) return true;
      if (!p.belt.open) return false;
      const top = b.y - BELT.gap * this.gearList().length - BELT.itemR - 30;
      return Math.abs(pt.x - b.x) < BELT.itemR + 60 && pt.y > top && pt.y < b.y + BELT.r;
    },

    updateBelt(p, dt) {
      if (this.touchMode) return;          // touch mode switches gear with its own buttons
      const a = p.smoothAim, b = this.beltPos(p), belt = p.belt, inp = p.input;
      const fresh = inp.poseFresh();
      const click = inp.mouseFire && this.inBeltZone(p, a);

      if (!belt.open) {
        const over = dist(a, b) < BELT.r * 1.2;
        if (over && fresh) belt.hover += dt; else belt.hover = Math.max(0, belt.hover - dt * 2);
        if ((over && click) || belt.hover >= BELT.openTime) this.openBelt(p);
      } else {
        let over = null;
        this.beltItems(p).forEach((it, i) => { if (dist(a, it) < BELT.itemR * 1.25) over = i; });
        const items = this.gearList();
        if (over !== null && this.gearAvailable(p, items[over].id) && fresh) {
          if (belt.sel !== over) { belt.sel = over; belt.selT = 0; Sfx.lock(); }
          belt.selT += dt;
          if (click || belt.selT >= BELT.selectTime) { this.equip(p, items[over].id); this.closeBelt(p); }
        } else { belt.sel = null; belt.selT = 0; }
        belt.away = this.inBeltZone(p, a) ? 0 : belt.away + dt;
        if (belt.away > BELT.closeDelay) this.closeBelt(p);
      }
      if (click) inp.mouseFire = false;   // a click on the belt never fires the gun
    },
    openBelt(p) {
      Object.assign(p.belt, { open: true, hover: 0, sel: null, selT: 0, away: 0 });
      Sfx.select();
    },
    closeBelt(p) { Object.assign(p.belt, { open: false, hover: 0, sel: null, selT: 0, away: 0 }); },
    toggleBelt() {
      const p = this.players[0];
      if (this.state !== 'play' || this.paused || !p || this.dizzyT > 0) return;
      if (p.belt.open) this.closeBelt(p); else this.openBelt(p);
    },

    equip(p, id) {
      if (id === 'time' && !(this.save.owned || {}).timeGrenade) { this.hud('toast', 'Buy time grenades in the shop first'); return; }
      if (!this.gearAvailable(p, id)) {
        this.hud('toast', this.tag(p) + (id === 'grenade' ? 'No net grenades left' : id === 'time' ? 'No time grenades left' : 'Shield is recharging'));
        return;
      }
      p.equipped = id;
      p.dwell = 0; p.dwellTarget = null;
      p.still = { x: p.smoothAim.x, y: p.smoothAim.y, t: 0 };
      Sfx.reload();
      if (id === 'grenade') this.setPrompt(p.input.usesDwell() ? 'Hold the circle still to throw' : 'Press Fire to throw', 2, p);
      if (id === 'time') this.setPrompt(p.input.usesDwell() ? 'Hold the circle still to throw: slows everything down' : 'Press Fire to throw: slows everything down', 2, p);
      if (id === 'shield') this.setPrompt('Shield up: it blocks rocks and attacks', 2, p);
      if (id === 'gun') this.setPrompt('', 0);
      this.hud('gear');
    },
    keyEquipIndex(i) { const g = this.gearList()[i]; if (g) this.keyEquip(g.id); },
    keyEquip(id) {
      if (this.dizzyT > 0) return;
      const p = this.players[0];
      if (this.state === 'play' && !this.paused && p) { this.equip(p, id); this.closeBelt(p); }
    },

    // ---------------- Weapons ----------------
    updateWeapon(p, dt) {
      const raw = p.smoothAim, inp = p.input;
      const blocked = p.belt.open || this.inBeltZone(p, raw) || !inp.poseFresh();
      if (p.equipped === 'gun') return this.updateGun(p, dt, blocked);

      p.reticle = { x: raw.x, y: raw.y };
      p.dwellTarget = null;
      if (p.equipped === 'grenade' || p.equipped === 'time') {
        // Throw by pressing Fire, or (camera/mouse) by holding the circle still
        if (dist(raw, p.still) > STILL_PX || blocked) p.still = { x: raw.x, y: raw.y, t: 0 };
        else p.still.t += dt;
        const clickThrow = inp.mouseFire && !blocked;
        inp.mouseFire = false;
        if (clickThrow || (inp.usesDwell() && p.still.t >= GRENADE_STILL)) this.throwGrenade(p, clickThrow ? raw : p.still);
      } else {
        inp.mouseFire = false;
      }
    },

    updateGun(p, dt, blocked) {
      const raw = p.smoothAim, inp = p.input;
      if (this.boss && this.boss.pull && this.boss.state === 'fight' && inp.mode !== 'mouse') {
        raw.x += (this.boss.x - raw.x) * Math.min(1, dt * 0.45);
        raw.y += (this.boss.y - raw.y) * Math.min(1, dt * 0.45);
      }
      const alive = this.monsters.filter((m) => m.state === 'alive');
      const targets = [...alive, ...this.rocks.map((r) => ({ ...r, ref: r, px: r.x, py: r.y }))];
      targets.push(...this.bossTargets());

      // Aim assist. Camera aiming is shaky, so there the circle is gently pulled toward the nearest target.
      // Mouse, gamepad and tilt are precise: the circle stays exactly where you point (pulling it made it
      // feel laggy and jumpy) and assist instead makes the targets easier to hit.
      const pullAim = inp.isCam();
      // Gamepad (phone or touch): a strong magnet. Near a target the circle locks onto it and stays
      // on it while it moves, until you steer clearly away.
      const magnet = inp.mode === 'phone' && inp.device === 'pad';
      let pos = { x: raw.x, y: raw.y };
      if ((pullAim && this.assist > 0 || magnet) && !blocked) {
        const assist = magnet ? Math.max(this.assist, 0.6) : this.assist;
        let best = null, bestD = Infinity, bestR = 0;
        for (const m of targets) {
          if (m.decoy) continue;
          const reach = m.r * (magnet ? 2.6 + assist * 1.4 : 1.6 + assist * 1.6) * (m.ref === p.lockOn || m === p.lockOn ? 1.35 : 1);
          const d = Math.hypot(m.px - raw.x, m.py - raw.y);
          if (d < reach && d < bestD) { best = m; bestD = d; bestR = reach; }
        }
        if (best) {
          const pull = magnet ? Math.min(1, 0.55 + 0.45 * Math.pow(1 - bestD / bestR, 0.35))
            : assist * Math.pow(1 - bestD / bestR, 0.6) * 0.9;
          pos = { x: lerp(raw.x, best.px, pull), y: lerp(raw.y, best.py, pull) };
        }
        p.lockOn = best ? (best.ref || best) : null;
      }
      p.reticle = pos;

      // What is under the circle? (rocks count as targets too)
      let target = null, td = Infinity;
      if (!blocked) {
        for (const m of targets) {
          if (m.decoy && inp.usesDwell()) continue;
          const d = Math.hypot(m.px - pos.x, m.py - pos.y);
          if (d < m.r * (1 + (pullAim ? 0.3 : magnet ? 1.1 : 0.7) * Math.max(this.assist, magnet ? 0.6 : 0)) * (1 + (this.homing || 0) + (this.steadyHit || 0)) && d < td) { target = m.ref || m; td = d; }
        }
      }
      if (target !== p.dwellTarget) {
        if (target) Sfx.lock();
        p.dwellTarget = target; p.dwell = 0;
      }

      if (target && !p.reloading) p.dwell += dt; else p.dwell = Math.max(0, p.dwell - dt * 2);

      if (this.overdriveT > 0 && !blocked && target) {
        // Overdrive: the gun fires by itself at whatever is under the circle
        p.odCd = (p.odCd || 0) - dt;
        if (p.odCd <= 0) { p.odCd = 0.12; this.fire(p, target); }
      }
      if (inp.mouseFire) { inp.mouseFire = false; if (!blocked) this.fire(p, target); }
      else if (inp.usesDwell() && target && p.dwell >= DWELL_TIME && p.cooldown <= 0) { this.fire(p, target); p.dwell = 0; }
      else if (!inp.usesDwell() && inp.fireHeld && target && p.cooldown <= 0 && p.dwell > 0.12) { this.fire(p, target); p.cooldown = 0.32; }
    },

    fire(p, target) {
      const od = this.overdriveT > 0;
      if (!od) {
        if (p.reloading) return;
        if (p.ammo <= 0) {
          Sfx.empty();
          this.setPrompt(this.reloadHint(p), 1.2, p);
          return;
        }
        p.ammo--;
      }
      this.shots++;
      p.cooldown = SHOT_COOLDOWN;
      p.recoil = 1;
      const muzzle = this.muzzle(p);
      const end = target ? (target.px != null ? { x: target.px, y: target.py } : { x: target.x, y: target.y }) : p.reticle;
      this.lasers.push({ x1: muzzle.x, y1: muzzle.y, x2: end.x, y2: end.y, t: 0.16, color: this.laserColor(p) });
      Sfx.laser();
      this._shotNow = true;
      if (target && target.rock) { this.hits++; this.smashRock(target); }
      else if (target && target.bossPart) { this.hits++; this.bossPartHit(target, this.blasterDmg * (od ? 2 : 1), end, p); }
      else if (this.holeT > 0 && (!target || (target.pullK || 0) > 0.6) && Math.hypot(end.x - this.hole.x, end.y - this.hole.y) < 200 && this.holeCollapse()) { this.hits++; }
      else if (target) {
        this.hits++;
        const wl = this.wAb ? this.wAb.lv : 0;
        const bonus = this.wAb && this.wAb.id === 'bubble' && wl >= 3 && target.bubbleT > 0 ? 1 : 0;
        const caught = this.damageMonster(target, this.blasterDmg * (od ? 2 : 1) + bonus);
        if (!caught && this.wAb && this.wAb.id === 'bubble') target.bubbleT = [2, 3, 4][wl - 1];
        if (!caught && this.wAb && this.wAb.id === 'ember' && !(target.burnT > 0)) target.burnT = [2, 1.5, 1][wl - 1];
      }
      this._shotNow = false;
      if (!target) this.lifeTease(end);
      if (p.ammo === 0) this.setPrompt(this.reloadHint(p), 2, p);
      this.hud('ammo');
    },

    throwGrenade(p, at) {
      const kind = p.equipped === 'time' ? 'time' : 'net';
      if (kind === 'time') { if (p.timeGrenades <= 0) return; p.timeGrenades--; }
      else { if (p.grenades <= 0) return; p.grenades--; }
      const side = this.isMirrored(p) ? -1 : 1;
      const hand = { x: this.gunBase(p) + 90 * side, y: H - 130 };
      this.flying.push({ x0: hand.x, y0: hand.y, x1: at.x, y1: at.y, t: 0, dur: 0.55, kind });
      Sfx.throw();
      this.equip(p, 'gun');          // the blaster comes back right after a throw
      this.hud('gear');
    },

    updateFlying(dt) {
      for (const g of this.flying) {
        g.t += dt;
        if (g.t >= g.dur && !g.done) { g.done = true; if (g.kind === 'time') this.timeBurst(g.x1, g.y1); else this.openNet(g.x1, g.y1); }
      }
      this.flying = this.flying.filter((g) => !g.done);
    },

    openNet(x, y) {
      this.nets.push({ x, y, t: 0 });
      if (this.wAb && this.wAb.id === 'whirl') this.whirls.push({ x, y, t: 0, tick: 0.5, dur: [2, 3, 4][this.wAb.lv - 1] });
      Sfx.net();
      let n = 0;
      this._shotNow = true;
      for (const m of this.monsters) {
        if (m.state === 'alive' && Math.hypot(m.px - x, m.py - y) < NET_R + m.r * 0.4) { if (this.damageMonster(m, this.netDmg, true)) n++; }
      }
      this._shotNow = false;
      for (const r of this.rocks) if (Math.hypot(r.x - x, r.y - y) < NET_R) this.smashRock(r);
      if (this.bossNet(x, y)) return;
      this.hud('toast', n > 1 ? `Net caught ${n} monsters!` : n === 1 ? 'Net caught 1 monster' : 'The net missed');
      this.hud('stat', { ev: 'net', n });
    },

    // A hit: armoured aliens lose a hit point (and flash); at 0 they are caught
    damageMonster(m, dmg, netted) {
      if (m.decoy) { if (m.state === 'alive' && this._shotNow) this.decoyHit(m); return false; }   // only your own shots scare decoys
      if (m.tutImmune) {
        if (m.state === 'alive' && this.time - (m.tutSaid || -9) > 1.2) { m.tutSaid = this.time; Sfx.clink(); m.hitFlash = 0.22; this.floater(m.px, m.py - m.r, window.t ? t('Use your shield!') : 'Use your shield!', '#ffd27a'); }
        return false;
      }
      if (m.mini && m.frozenT > 0) dmg = Math.min(dmg + 1, 3);
      else if (m.frozenT > 0) dmg = Math.max(dmg, m.hp || 1);
      if (m.state !== 'alive') return false;
      m.hp = (m.hp || 1) - dmg;
      if (m.hp <= 0) { this.catchMonster(m, netted); return true; }
      m.hitFlash = 0.22;
      Sfx.clink();
      this.lifeHit(m);
      window.Haptics && Haptics.buzz(18, 0.3, 50);
      this.burst(m.px, m.py, m.mini ? '#ff8a6a' : '#cfe8ff', 6, true);
      return false;
    },

    // ---- Voxel dissolve: a caught alien (or a beaten boss) breaks into little glowing cubes ----
    // The alien is drawn once on a hidden canvas, shrunk to a small grid, and every coloured grid cell becomes a cube.
    voxelize(drawFn, cx, cy, box, cols, mode, opt = {}) {
      if (!this.voxels) this.voxels = [];
      if (this.voxels.length > 1600) return false;
      let d;
      const S = Math.max(8, Math.ceil(box));
      try {
        const off = this._voxOff || (this._voxOff = document.createElement('canvas'));
        off.width = S; off.height = S;
        const oc = off.getContext('2d');
        const keep = this.ctx;
        this.ctx = oc;
        try { oc.save(); oc.translate(S / 2 - cx, S / 2 - cy); drawFn(); oc.restore(); } finally { this.ctx = keep; }
        const g = this._voxGrid || (this._voxGrid = document.createElement('canvas'));
        g.width = cols; g.height = cols;
        const gc = this._voxGc && this._voxGc.canvas === g ? this._voxGc : (this._voxGc = g.getContext('2d', { willReadFrequently: true }));
        gc.clearRect(0, 0, cols, cols);
        gc.drawImage(off, 0, 0, cols, cols);
        d = gc.getImageData(0, 0, cols, cols).data;
      } catch (e) { return false; }
      const cell = S / cols, x0 = cx - S / 2, y0 = cy - S / 2;
      let n = 0;
      for (let gy = 0; gy < cols; gy++) for (let gx = 0; gx < cols; gx++) {
        const i = (gy * cols + gx) * 4;
        if (d[i + 3] < 110) continue;
        const x = x0 + (gx + 0.5) * cell, y = y0 + (gy + 0.5) * cell;
        const v = { x, y, s: cell * 0.94, col: `rgb(${d[i]},${d[i + 1]},${d[i + 2]})`, t: 0, rot: 0, vr: rand(-6, 6), mode, cx, cy };
        if (mode === 'net') {                 // pulled into the net and gone
          v.delay = 0.1 + rand(0, 0.2); v.life = rand(0.4, 0.6);
        } else if (mode === 'rise') {         // a beaten boss: crumbles from the bottom up and floats away
          v.delay = (1 - gy / cols) * (opt.spread || 1.3) + rand(0, 0.18);
          v.life = rand(0.8, 1.2); v.vx = rand(-90, 90) + (x - cx) * 0.4; v.vy = -rand(160, 360); v.vr = rand(-4, 4);
        } else {                              // shot: bursts outward
          const dx = x - cx, dy = y - cy, dist = Math.hypot(dx, dy) || 1;
          v.delay = 0.08 + rand(0, 0.08) + dist / S * 0.25; v.life = rand(0.5, 0.8);
          const sp = rand(160, 420);
          v.vx = dx / dist * sp + rand(-40, 40); v.vy = dy / dist * sp - rand(60, 180);
        }
        this.voxels.push(v); n++;
      }
      return n > 0;
    },
    updateVoxels(dt) {
      if (!this.voxels || !this.voxels.length) return;
      for (const v of this.voxels) {
        if (v.delay > 0) { v.delay -= dt; continue; }
        v.t += dt;
        v.rot += v.vr * dt;
        if (v.mode === 'net') {
          const k = Math.min(1, dt * 7);
          v.x += (v.cx - v.x) * k; v.y += (v.cy - v.y) * k;
        } else {
          v.x += v.vx * dt; v.y += v.vy * dt;
          v.vx *= 0.96; v.vy = v.vy * 0.96 - (v.mode === 'rise' ? 40 : 120) * dt;   // they float up a little
        }
      }
      this.voxels = this.voxels.filter((v) => v.t < v.life);
    },
    drawVoxels() {
      if (!this.voxels || !this.voxels.length) return;
      const c = this.ctx;
      c.save();
      const base = c.getTransform();
      for (const v of this.voxels) {
        const k = v.delay > 0 ? 0 : v.t / v.life;
        const a = 1 - k * k;
        const sz = v.s * (v.mode === 'net' ? 1 - k * 0.9 : 1 - k * 0.55);
        if (sz < 0.5 || a <= 0) continue;
        c.setTransform(base);
        c.translate(v.x, v.y); if (v.rot) c.rotate(v.rot);
        const h = sz / 2, e = Math.max(1, sz * 0.22);
        c.globalAlpha = a;
        c.fillStyle = v.col; c.fillRect(-h, -h, sz, sz);
        c.fillStyle = 'rgba(255,255,255,0.38)'; c.fillRect(-h, -h, sz, e);          // light top face
        c.fillStyle = 'rgba(0,0,0,0.28)'; c.fillRect(h - e, -h + e, e, sz - e);    // dark side face
        if (k > 0) {                                                                 // glowing cyan edge once it breaks loose
          c.globalAlpha = a * 0.7; c.strokeStyle = '#9ff8ff'; c.lineWidth = Math.max(1, sz * 0.1);
          c.strokeRect(-h, -h, sz, sz);
        }
      }
      c.restore();
    },
    voxCols(big) {
      if (this.fxReduced) return big ? 20 : 12;
      if (this.lowFx) return big ? 28 : 18;
      return big ? 34 : 22;
    },
    // turn a caught alien into cubes (instead of the old fade); returns false if that was not possible
    dissolveMonster(m, netted) {
      const s = SPR[m.type];
      const sheet = m.mini ? this.tintSheet(m.type) : m.shiny ? this.shinySheet(m.type) : Assets.images[m.type];
      if (!sheet || !s) return false;
      const ok = this.voxelize(() => this.drawFrame(sheet, s, m.frame, m.px, m.py, m.size, m.flip, 1, m.rot || 0, m.sx || 1, m.sy || 1),
        m.px, m.py, m.size * 1.6, this.voxCols(m.mini), netted ? 'net' : 'burst');
      m.vox = ok;
      return ok;
    },

    catchMonster(m, netted) {
      if (m.decoy) { m.state = 'dying'; m.t = 0; return; }
      if (m.mini) return this.catchMini(m, netted);
      if (this.tut) this.tut.caught++;
      window.Haptics && Haptics.buzz(30, 0.5, 40);
      m.state = 'dying'; m.t = 0; m.netted = !!netted;
      this.hyperAdd(this.time - this.lastCatchT < 2.5 ? 0.13 : 0.05);
      this.earned += this.crystalValue() * (m.shiny ? 5 : 1);
      this.addScore((m.elite ? 250 : 100) * (m.shiny ? 5 : 1), m.px, m.py - m.r);
      this.rollDrop(m);
      if (m.shiny) this.hud('toast', 'Shiny ' + SPR[m.type].name + '!');
      if (this.endless) this.waveCaught++;
      this.superAdd(0.05 + 0.01 * Math.min(4, (this.mult || 1) - 1));
      this.hud('stat', { ev: 'catch', type: m.type, elite: !!m.elite, shiny: !!m.shiny, netted: !!netted });
      if (this.caught[m.type] < goalOf(m.type)) this.caught[m.type]++;
      this.hud('caught', m.type);
      this.dissolveMonster(m, netted);
      this.lifeFear(m);
      if (this.buddy) {
        this.buddyHop = 0.45;
        if (this.buddyBonus === 'heal' && this.health < 100) { this.health = Math.min(100, this.health + 3); this.hud('health'); }
      }
      Sfx.dissolve();
      this.burst(m.px, m.py, SPR[m.type].color, 22, true);
      if (this.caught[m.type] === goalOf(m.type) && !this['done_' + m.type]) { this['done_' + m.type] = true; this.hud('toast', SPR[m.type].name + ' complete!'); }
      this.hud('catch');
    },

    // sq = square "pixel" particles: the alien dissolves into data when it is caught
    burst(x, y, color, count, sq) {
      if (this.lowFx) count = Math.ceil(count / 2);
      if (this.fxReduced) count = Math.min(4, Math.ceil(count / 4));
      if (this.particles.length > (this.fxReduced ? 30 : 120)) return;
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2), sp = rand(150, 520);
        this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.4, 0.8), max: 0.8, r: rand(4, 10), color, sq });
      }
    },

    updateReload(p, dt) {
      const inp = p.input;
      if (p.reloading > 0) {
        p.reloading = Math.max(0, p.reloading - dt);
        if (p.reloading === 0) { p.ammo = this.magSize; this.hud('ammo'); }
        return;
      }
      let want = false;
      if (inp.isClicky()) { want = inp.mouseReload; inp.mouseReload = false; }
      else if (inp.freeHandUp && inp.poseFresh()) {
        p.reloadHold += dt;
        if (p.reloadHold > 0.3 && !p.reloadLatch) { want = true; p.reloadLatch = true; }
      } else { p.reloadHold = 0; p.reloadLatch = false; }
      if (want && p.equipped === 'gun' && p.ammo < this.magSize) {
        p.reloading = this.reloadTime;
        Sfx.reload();
        this.setPrompt('Reloading…', this.reloadTime, p);
      }
    },

    reloadHint(p) {
      if (p.input.isCam()) return 'Raise your free hand to reload';
      if (p.input.mode === 'phone') return 'Press Reload on your phone';
      return 'Right-click or press R to reload';
    },

    keyReload() { const p = this.players[0]; if (this.state === 'play' && !this.paused && p && !(this.dizzyT > 0)) p.input.mouseReload = true; },

    setPrompt(text, seconds, p) {
      this.promptText = text ? this.tag(p) + text : '';
      this.promptUntil = this.time + seconds;
    },

    updateEffects(dt) {
      this.updateVoxels(dt);
      this.updateTrails(dt);
      if (this.state === 'play') this.lifeBumps();
      for (const p of this.particles) { p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy = p.vy * 0.94 + 300 * dt; }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const l of this.lasers) l.t -= dt;
      this.lasers = this.lasers.filter((l) => l.t > 0);
      for (const n of this.nets) n.t += dt;
      this.nets = this.nets.filter((n) => n.t < (n.big ? 1.8 : 1.1));
      for (const w of this.waves) w.t += dt;
      if (this.fxAnims) { for (const f of this.fxAnims) f.t += dt; this.fxAnims = this.fxAnims.filter((f) => f.t < f.dur); }
      this.waves = this.waves.filter((w) => w.t < 1.2);
      const show = this.time < this.promptUntil ? this.promptText : '';
      if (show !== this._shownPrompt) { this._shownPrompt = show; this.hud('prompt', show); }
    },

    finish() {
      this.state = 'done';
      if (this.hyperT > 0) this.endHyper();
      this.dizzyT = 0; this.setDizzyLook(false);
      // end-of-level bonuses for the score
      const acc = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
      const par = this.levelCfg.par || 60;
      const time = this.time - (this.walk ? this.walk.walkTime : 0);     // walking between stops does not count
      this.bonus = this.won ? {
        noDamage: this.damageTaken ? 0 : 1000,
        accuracy: acc * 10,
        time: Math.max(0, Math.round((par - time) * 20)),
      } : { noDamage: 0, accuracy: 0, time: 0 };
      this.score += this.bonus.noDamage + this.bonus.accuracy + this.bonus.time;
      this.players.forEach((p) => { p.belt.open = false; });
      if (this.buddyBonus === 'crystal' && !this._buddyPaid) { this._buddyPaid = true; this.earned = Math.round(this.earned * 1.15); }
      if (this.onEnd) this.onEnd({
        won: this.won, time,
        accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
        earned: this.earned, caught: { ...this.caught }, health: this.health,
        boss: this.levelCfg.boss ? { name: this.levelCfg.boss.name, caught: this.bossDefeated } : null,
        world: this.levelId, stage: this.stage, par: this.levelCfg.par,
        score: this.score, bonus: this.bonus, bestCombo: this.bestCombo, drops: { ...this.levelDrops },
        endless: !!this.endless, wave: this.wave, tutorial: !!this.tut,
        special: this.special, reason: this.won ? null : this.loseReason || null, survived: this.surviveT,
      });
    },

    // ---------------- Drawing ----------------
    // One player: gun in the middle. Two players: guns at 30% and 70% of the width,
    // the same distance from the centre, with Player 2's gun mirrored.
    gunBase(p) {
      if (this.players.length < 2) return W / 2;
      return p.id === 1 ? W * 0.3 : W * 0.7;
    },
    isMirrored(p) { return this.players.length > 1 && p.id === 2; },

    gunPose(p) {
      const base = this.gunBase(p);
      const t = clamp(0.5 + (p.reticle.x - base) / (W * 0.9), 0, 1);
      const mirror = this.isMirrored(p);
      const idx = GUN_ORDER[Math.round((mirror ? 1 - t : t) * (GUN_ORDER.length - 1))];
      const gh = H * 0.4, gw = gh * SPR.gun.fw / SPR.gun.fh;
      const reloadP = p.reloading > 0 ? 1 - p.reloading / this.reloadTime : 0;
      const dip = Math.sin(reloadP * Math.PI);
      const x = base + (t - 0.5) * 115;
      const y = H + 10 + p.recoil * 22 + dip * 200 + p.gunDown * 270 + Math.sin(this.time * 2 + p.id) * 4;
      const rot = (t - 0.5) * 0.14;
      return { idx, gw, gh, x, y, rot, mirror };
    },

    muzzle(p) {
      const g = this.gunPose(p);
      const lx = 0, ly = -g.gh * 0.9;   // top of the scope
      return { x: g.x + lx * Math.cos(g.rot) - ly * Math.sin(g.rot), y: g.y + lx * Math.sin(g.rot) + ly * Math.cos(g.rot) };
    },

    // Pre-shrunk spritesheets: shrinking a big sheet while drawing costs weak TVs a lot on every frame,
    // so a copy at 60% and at 35% is made once, and the smallest copy that is still big enough is used.
    scaledSheet(img, meta, drawH) {
      if (!img || !img.width) return { img, meta };
      const need = (drawH * (this.scale || 1)) / meta.fh;
      const level = need <= 0.35 ? 0.35 : need <= 0.6 ? 0.6 : 1;
      if (level === 1) return { img, meta };
      if (!this._sc) this._sc = new WeakMap();
      let cache = this._sc.get(img);
      if (!cache) { cache = {}; this._sc.set(img, cache); }
      if (!cache[level]) {
        const fw = Math.max(1, Math.round(meta.fw * level)), fh = Math.max(1, Math.round(meta.fh * level));
        const cols = Math.max(1, Math.round(img.width / meta.fw)), rows = Math.max(1, Math.round(img.height / meta.fh));
        const cv = document.createElement('canvas');
        cv.width = fw * cols; cv.height = fh * rows;
        const g = cv.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, meta.fw * cols, meta.fh * rows, 0, 0, cv.width, cv.height);
        cache[level] = { img: cv, meta: { fw, fh } };
      }
      return cache[level];
    },
    // make the shrunk copies of this level's sheets before playing, so there is no hiccup later
    warmSprites() {
      const sheets = [...TYPES.map((t) => [Assets.images[t], SPR[t]]), [Assets.images.gun, SPR.gun]];
      for (const [img, meta] of sheets) {
        if (!img || !meta) continue;
        [0.3, 0.55].forEach((k) => this.scaledSheet(img, meta, (k * meta.fh) / (this.scale || 1)));
      }
    },

    drawFrame(img, meta, idx, cx, cy, h, flip, alpha, rot = 0, sx = 1, sy = 1) {
      const scd = this.scaledSheet(img, meta, h * Math.max(Math.abs(sx), Math.abs(sy)));
      img = scd.img; meta = scd.meta;
      const fx = (idx % 5) * meta.fw, fy = Math.floor(idx / 5) * meta.fh;
      const w = h * meta.fw / meta.fh;
      const c = this.ctx;
      c.save();
      c.globalAlpha = alpha;
      c.translate(cx, cy);
      if (rot) c.rotate(rot);
      if (sx !== 1 || sy !== 1) c.scale(sx, sy);
      if (flip) c.scale(-1, 1);
      c.drawImage(img, fx, fy, meta.fw, meta.fh, -w / 2, -h / 2, w, h);
      c.restore();
    },

    draw() {
      if (this.plat) return this.platDraw();
      const c = this.ctx, img = Assets.images;
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0);

      // Screen shake
      if (this.reducedMotion === undefined) this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (this.shake > 0 && !this.reducedMotion && !this.fxReduced) {
        c.translate(rand(-1, 1) * this.shake * 40, rand(-1, 1) * this.shake * 40);
      }

      // Background with a little parallax from the aim (average of all players)
      const n = this.players.length || 1;
      const ax = this.players.reduce((a, p) => a + p.smoothAim.x, 0) / n || W / 2;
      const ay = this.players.reduce((a, p) => a + p.smoothAim.y, 0) / n || H / 2;
      const bgv = this.bgv && !this.bgv.failed && this.bgv.ready && this.bgv.v.videoWidth ? this.bgv : null;
      const px = (ax / W - 0.5) * (bgv ? -14 : -36), py = (ay / H - 0.5) * (bgv ? -8 : -20);
      // A walk level shows its video; the picture is the fallback while it loads or if it fails
      const wk = this.walk && !this.walk.failed && this.walk.ready && this.walk.v.videoWidth ? this.walk : null;
      const src = wk ? { width: wk.v.videoWidth, height: wk.v.videoHeight } : img[this.bgKey || 'bg' + this.levelId];
      const cover = src && src.width ? Math.max((W * 1.06) / src.width, (H * 1.06) / src.height) : 1;
      const bw = src && src.width ? src.width * cover : W * 1.06, bh = src && src.width ? src.height * cover : H * 1.06;
      // The background is scaled once to the canvas size, so each frame is a cheap 1:1 copy
      // (while walking the video is drawn directly; while standing still its frame is cached the same way)
      const bgKey = wk ? 'walk' + wk.stop : this.bgKey || 'bg' + this.levelId;
      if (bgv) {
        const vv = bgv.v, cv = Math.max((W * 1.03) / vv.videoWidth, (H * 1.03) / vv.videoHeight);
        const vw = vv.videoWidth * cv, vh = vv.videoHeight * cv;
        c.drawImage(vv, (W - vw) / 2 + px, (H - vh) / 2 + py, vw, vh);
      } else if (wk && wk.moving) c.drawImage(wk.v, (W - bw) / 2 + px, (H - bh) / 2 + py, bw, bh);
      else {
        if (!this.bgCache || this.bgCacheKey !== bgKey + '/' + this.scale + '/' + W) {
          const bc = document.createElement('canvas');
          bc.width = Math.round(bw * this.scale); bc.height = Math.round(bh * this.scale);
          bc.getContext('2d').drawImage(wk ? wk.v : img[bgKey], 0, 0, bc.width, bc.height);
          this.bgCache = bc; this.bgCacheKey = bgKey + '/' + this.scale + '/' + W;
        }
        c.drawImage(this.bgCache, (W - bw) / 2 + px, (H - bh) / 2 + py, bw, bh);
      }

      if (this.levelCfg.underwater && !this.fxReduced) this.drawBubbles();
      const intro = this.boss && this.boss.state === 'enter' && !this.boss.void;
      if (this.boss && !intro) this.drawBoss();
      if (this.friend) this.drawFriend();
      if (this.guard) this.drawGuard();

      // Monsters, far ones first (their trails behind them)
      this.drawTrails();
      if (this.holeT > 0) this.drawHole();
      const sorted = [...this.monsters].sort((a, b) => a.z - b.z);
      for (const m of sorted) {
        const s = SPR[m.type];
        if (m.state === 'dying' && m.vox) {
          continue;
        } else if (m.state === 'dying') {
          const q = m.t / 0.45;
          const grow = m.netted ? 1 - q * 0.6 : 1 + q * 0.5;    // netted monsters shrink into the net
          this.drawFrame(img[m.type], s, m.frame, m.px, m.py, m.size * grow, m.flip, 1 - q, m.rot || 0);
          if (!this.lowFx) {
            c.save(); c.globalCompositeOperation = 'lighter';
            this.drawFrame(img[m.type], s, m.frame, m.px, m.py, m.size * grow, m.flip, (1 - q) * 0.8, m.rot || 0);
            c.restore();
          }
        } else if (m.state === 'attacking') {
          const q = Math.min(1, m.t / 0.3);
          const af = s.attackFrame != null ? s.attackFrame : m.frame;     // a walker swipes with its tail
          this.drawFrame(img[m.type], s, af, m.px, m.py + q * 80, m.size * (1 + q * 0.6), m.flip, m.t > 0.3 ? 1 - (m.t - 0.3) / 0.15 : 1);
        } else {
          if (m.z > 0.7) {
            c.save(); c.globalAlpha = (m.z - 0.7) / 0.3 * 0.5; c.fillStyle = '#ff5a7e';
            c.beginPath(); c.ellipse(m.px, m.py + m.size * 0.45, m.size * 0.4, m.size * 0.08, 0, 0, Math.PI * 2); c.fill(); c.restore();
          }
          const sheet = m.mini ? this.tintSheet(m.type) : m.shiny ? this.shinySheet(m.type) : img[m.type];
          if (m.mini) {
            c.save(); c.globalAlpha = 0.45 + 0.15 * Math.sin(this.time * 6);
            const rg = c.createRadialGradient(m.px, m.py, m.size * 0.1, m.px, m.py, m.size * 0.75);
            rg.addColorStop(0, 'rgba(255, 60, 40, 0.7)'); rg.addColorStop(1, 'rgba(255, 60, 40, 0)');
            c.fillStyle = rg; c.beginPath(); c.arc(m.px, m.py, m.size * 0.75, 0, Math.PI * 2); c.fill(); c.restore();
          }
          this.drawFrame(sheet, s, m.frame, m.px, m.py, m.size, m.flip, m.mini ? 1 : Math.min(1, m.age * 3), m.rot || 0, m.sx || 1, m.sy || 1);
          if (m.hitFlash > 0) {
            c.save(); c.globalCompositeOperation = 'lighter';
            this.drawFrame(sheet, s, m.frame, m.px, m.py, m.size, m.flip, m.hitFlash * 4, m.rot || 0, m.sx || 1, m.sy || 1);
            c.restore();
          }
          if (m.elite) this.drawArmor(m);
          this.drawStatus(m);
          this.lifeDraw(m);
          if (m.mini) this.drawMiniBar(m);
          if (m.toFriend && this.friend && this.friend.hp > 0) {
            // a red "!" above aliens that go for the bubble
            c.save(); c.font = `800 ${Math.round(30 + m.size * 0.1)}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
            c.fillStyle = '#ff4a5a'; c.strokeStyle = '#fff'; c.lineWidth = 4; const yy = m.py - m.size * 0.45 + Math.sin(this.time * 8) * 4;
            c.strokeText('!', m.px, yy); c.fillText('!', m.px, yy); c.restore();
          }
          if (m.shiny && Math.random() < 0.15) this.burst(m.px + rand(-1, 1) * m.r, m.py + rand(-1, 1) * m.r, '#ffd27a', 1, true);
        }
      }

      if (this.boss && this.boss.dark && this.boss.state === 'fight') this.drawDarkness();
      if (this.dark && this.state !== 'countdown') this.drawFlashlight();
      if (this.boss && this.boss.void) this.drawVoidParts(this.boss);
      this.drawRocks();
      if (this.hazards.length) this.drawHazards();
      if (this.whirls.length) this.drawWhirls();
      if (this.barrierT > 0 || this.swirlT > 0) this.drawSuperFx();
      this.drawSuperFx2();
      if (this.fxAnims && this.fxAnims.length) this.drawFxAnims();
      this.drawDrone();
      this.drawNets();
      this.drawFlying();
      this.drawWaves();
      if (this.slowT > 0) {
        c.save(); c.globalAlpha = Math.min(1, this.slowT) * 0.14; c.fillStyle = '#9fd8ff'; c.fillRect(0, 0, W, H); c.restore();
      }

      this.drawVoxels();
      this.drawBuddy();
      // Particles and laser shots (each player's laser in their own colour)
      c.save();
      c.globalCompositeOperation = 'lighter';
      for (const q of this.particles) {
        c.globalAlpha = Math.max(0, q.life / q.max);
        c.fillStyle = q.color;
        if (q.sq) c.fillRect(q.x - q.r, q.y - q.r, q.r * 2, q.r * 2); else { c.beginPath(); c.arc(q.x, q.y, q.r, 0, Math.PI * 2); c.fill(); }
      }
      for (const l of this.lasers) {
        const a = l.t / 0.16;
        c.globalAlpha = a * 0.5; c.strokeStyle = l.color || '#62f0ff'; c.lineWidth = 22; c.lineCap = 'round';
        c.beginPath(); c.moveTo(l.x1, l.y1); c.lineTo(l.x2, l.y2); c.stroke();
        c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 6;
        c.beginPath(); c.moveTo(l.x1, l.y1); c.lineTo(l.x2, l.y2); c.stroke();
      }
      c.restore();

      this.drawScoreFx();

      // Guns at the bottom, turning toward each player's aim (lowered while other gear is in use)
      for (const p of this.players) {
        const g = this.gunPose(p);
        c.save();
        c.translate(g.x, g.y);
        c.rotate(g.rot);
        if (g.mirror) c.scale(-1, 1);
        const gs = this.scaledSheet(this.gunImage(), SPR.gun, g.gh);
        c.drawImage(gs.img, (g.idx % 5) * gs.meta.fw, Math.floor(g.idx / 5) * gs.meta.fh, gs.meta.fw, gs.meta.fh, -g.gw / 2, -g.gh, g.gw, g.gh);
        c.restore();
        if ((p.equipped === 'grenade' || p.equipped === 'time') && this.state === 'play') {
          const side = g.mirror ? -1 : 1;
          this.drawGrenade(this.gunBase(p) + 90 * side, H - 130 + (1 - p.gunDown) * 220 + Math.sin(this.time * 3) * 6, 46, p.equipped === 'time' ? 'time' : 'net');
        }
        if (p.equipped === 'shield' || p.shieldFlash > 0) this.drawShield(p);
      }

      if (this.boss && this.boss.state !== 'caught' && !intro) this.drawBossBar();
      if (this.endless && !this.boss) this.drawWaveLabel();
      if (this.special) this.drawSpecialHud();
      if (this.tut && this.state === 'play') this.drawTutorial();
      this.drawHyper();
      if (intro) this.drawBossIntro(this.boss);
      this.drawBanner();
      if (this.state === 'play') {
        if (this.players.some((p) => p.belt.open)) this.drawSlowMo();
        for (const p of this.players) { if (!this.touchMode) this.drawBelt(p); if (this.players.length > 1) this.drawPlayerHud(p); }
        this.drawMenuHold();
      }
      if (this.state === 'play' || this.state === 'countdown' || this.state === 'calibrate') {
        for (const p of this.players) this.drawReticle(p);
      }
      if (this.dizzyT > 0) this.drawDizzy();
    },

    drawRocks() {
      const c = this.ctx;
      for (const r of this.rocks) {
        if (r.art && Assets.images[r.art.fx]) {
          const img = Assets.images[r.art.fx], m = r.art.fxMeta;
          this.drawFrame(img, m, r.variant, r.x, r.y, r.size * 1.9, false, 1, r.t * 3);
          continue;
        }
        if (r.kind === 'meteor') {
          const s = r.size * 0.5, dx = r.x - r.x0, dy = r.y - r.y0, len = Math.hypot(dx, dy) || 1;
          c.save(); c.globalCompositeOperation = 'lighter';
          const tx = r.x - dx / len * s * 4, ty = r.y - dy / len * s * 4;
          const tg = c.createLinearGradient(r.x, r.y, tx, ty); tg.addColorStop(0, 'rgba(255, 200, 80, 0.9)'); tg.addColorStop(1, 'rgba(255, 60, 20, 0)');
          c.strokeStyle = tg; c.lineWidth = s * 1.3; c.lineCap = 'round'; c.beginPath(); c.moveTo(r.x, r.y); c.lineTo(tx, ty); c.stroke();
          c.restore();
          c.save(); c.translate(r.x, r.y); c.rotate(r.t * r.spin);
          c.shadowColor = '#ff7a2a'; c.shadowBlur = this.glow(30);
          c.fillStyle = '#4a2a1a'; c.strokeStyle = '#ffb347'; c.lineWidth = Math.max(3, s * 0.12);
          c.beginPath(); r.pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s))); c.closePath(); c.fill(); c.stroke();
          c.shadowBlur = 0; c.fillStyle = 'rgba(255, 150, 60, 0.75)'; c.beginPath(); c.arc(-s * 0.2, -s * 0.15, s * 0.3, 0, Math.PI * 2); c.fill();
          c.restore();
          continue;
        }
        if (r.kind === 'ring') {
          // Echo Monarch's sound ring: glowing circles that grow as they come closer
          c.save(); c.globalCompositeOperation = 'lighter';
          const s = r.size * 0.6;
          for (let k = 0; k < 3; k++) {
            c.globalAlpha = 0.9 - k * 0.25; c.strokeStyle = k % 2 ? '#ff8ad8' : '#b99bff'; c.lineWidth = 6 - k * 1.5;
            c.beginPath(); c.arc(r.x, r.y, s * (0.5 + k * 0.28) + Math.sin(r.t * 12 + k) * 3, 0, Math.PI * 2); c.stroke();
          }
          c.restore();
          continue;
        }
        c.save();
        c.translate(r.x, r.y);
        c.rotate(r.t * r.spin);
        const s = r.size * 0.5;
        c.shadowColor = r.color; c.shadowBlur = this.glow(24);
        c.fillStyle = '#2a2f63';
        c.strokeStyle = r.color; c.lineWidth = Math.max(3, s * 0.1);
        c.beginPath();
        r.pts.forEach(([x, y], i) => (i ? c.lineTo(x * s, y * s) : c.moveTo(x * s, y * s)));
        c.closePath(); c.fill(); c.stroke();
        c.shadowBlur = this.glow(0);
        c.fillStyle = r.color; c.globalAlpha = 0.6;
        c.beginPath(); c.arc(-s * 0.2, -s * 0.2, s * 0.25, 0, Math.PI * 2); c.fill();
        c.restore();
      }
    },

    netShape(x, y, R, alpha) {
      const c = this.ctx;
      c.save();
      c.globalAlpha = alpha;
      c.strokeStyle = '#ff8ad8'; c.lineWidth = 4; c.shadowColor = '#ff8ad8'; c.shadowBlur = this.glow(16);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * Math.PI * 2;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * R, y + Math.sin(a) * R); c.stroke();
      }
      c.strokeStyle = '#bff9ff';
      for (let k = 1; k <= 3; k++) {
        c.beginPath();
        for (let i = 0; i <= 12; i++) {
          const a = i / 12 * Math.PI * 2, rr = R * k / 3;
          const X = x + Math.cos(a) * rr, Y = y + Math.sin(a) * rr;
          i ? c.lineTo(X, Y) : c.moveTo(X, Y);
        }
        c.stroke();
      }
      c.restore();
    },

    drawNets() {
      for (const n of this.nets) {
        const grow = Math.min(1, n.t / 0.25);
        const R = (n.big ? 320 : NET_R) * (0.3 + 0.7 * (1 - Math.pow(1 - grow, 3)));
        const hold = n.big ? 1.2 : 0.6;
        this.netShape(n.x, n.y, R, n.t < hold ? 1 : 1 - (n.t - hold) / 0.5);
      }
    },

    drawGrenade(x, y, r, kind = 'net') {
      const c = this.ctx;
      const col = kind === 'time' ? '#9fd8ff' : '#ff8ad8';
      c.save();
      c.shadowColor = col; c.shadowBlur = this.glow(26);
      c.fillStyle = kind === 'time' ? '#1d3f8f' : '#3a2a8f'; c.strokeStyle = col; c.lineWidth = 5;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.shadowBlur = this.glow(0); c.lineWidth = 2.5; c.strokeStyle = '#bff9ff';
      if (kind === 'time') {
        // clock face
        for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; c.beginPath(); c.moveTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); c.lineTo(x + Math.cos(a) * r * 0.85, y + Math.sin(a) * r * 0.85); c.stroke(); }
        c.lineWidth = 4;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - r * 0.55); c.moveTo(x, y); c.lineTo(x + r * 0.4, y + r * 0.1); c.stroke();
      } else {
        c.beginPath(); c.moveTo(x - r, y); c.lineTo(x + r, y); c.moveTo(x, y - r); c.lineTo(x, y + r); c.stroke();
        c.beginPath(); c.arc(x, y, r * 0.55, 0, Math.PI * 2); c.stroke();
      }
      c.fillStyle = '#ffffff'; c.globalAlpha = 0.7;
      c.beginPath(); c.arc(x - r * 0.35, y - r * 0.35, r * 0.18, 0, Math.PI * 2); c.fill();
      c.restore();
    },

    drawFlying() {
      for (const g of this.flying) {
        const p = Math.min(1, g.t / g.dur);
        const x = lerp(g.x0, g.x1, p);
        const y = lerp(g.y0, g.y1, p) - Math.sin(p * Math.PI) * 220;
        this.drawGrenade(x, y, lerp(46, 22, p), g.kind);
      }
    },

    drawBubbles() {
      const c = this.ctx;
      c.save();
      c.strokeStyle = 'rgba(210, 245, 255, 0.55)'; c.lineWidth = 2;
      for (const b of this.bubbles) {
        c.globalAlpha = Math.min(1, b.life);
        c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.stroke();
        c.fillStyle = 'rgba(255, 255, 255, 0.5)';
        c.beginPath(); c.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.25, 0, Math.PI * 2); c.fill();
      }
      c.restore();
    },

    drawBoss() {
      const b = this.boss;
      if (b.void) return this.drawVoid(b);
      if (b.state === 'caught' && b.vox && b.vox !== 'none') return;         // it is cubes now
      let alpha = b.state === 'caught' ? (b.vox === 'none' ? Math.max(0, 1 - b.t / 1.6) : 1) : Math.min(1, b.t / 0.6 + (b.state === 'fight' ? 1 : 0));
      if (b.submerged > 0) alpha *= b.submerged > 1.7 ? (b.submerged - 1.7) / 0.3 : b.submerged < 0.3 ? 1 - b.submerged / 0.3 : 0.12;
      if (b.phased && b.phase === 2 && b.copies && b.state === 'fight') {
        // three identical copies; only the real one has a tiny sparkle on its crown
        b.copies.forEach((cp, i) => { if (!cp.gone) this.drawBossBody(b, cp.x, cp.y, BOSS_ART[b.sprite] ? alpha * Math.max(0.35, cp.alpha) : alpha * cp.alpha, i === b.realIdx, cp.alpha); });
      } else this.drawBossBody(b, b.x, b.y, alpha, true);

      const c = this.ctx;
      // warning glow just before it throws
      if (b.tele > 0) {
        c.save(); c.globalAlpha = b.tele * 0.8; c.strokeStyle = '#ff5a7e'; c.lineWidth = 10;
        c.beginPath(); c.arc(b.x, b.y, b.size * (0.45 + 0.08 * Math.sin(this.time * 20)), 0, Math.PI * 2); c.stroke(); c.restore();
      }
      // phase 3: bubble shield and the glowing weak spots
      if (b.phase === 3 && b.state === 'fight') {
        if (b.shield && !BOSS_ART[b.sprite]) {
          c.save();
          c.globalAlpha = 0.28 + 0.08 * Math.sin(this.time * 4);
          c.fillStyle = '#9fd8ff'; c.strokeStyle = '#e8f7ff'; c.lineWidth = 6;
          c.beginPath(); c.ellipse(b.x, b.y, b.size * 0.62, b.size * 0.56, 0, 0, Math.PI * 2); c.fill();
          c.globalAlpha = 0.8; c.stroke();
          c.restore();
        }
        if (b.spots && b.shield) for (const sp of b.spots) {
          if (sp.hp <= 0) continue;
          const art = BOSS_ART[b.sprite];
          if (art && Assets.images[art.fx]) {
            this.drawFrame(Assets.images[art.fx], art.fxMeta, sp.hp < 2 ? 8 : 5 + Math.floor(this.time * 6) % 3, sp.x, sp.y, 110, false, 1);
            c.save(); c.fillStyle = '#ffffff';
            for (let i = 0; i < sp.hp; i++) c.fillRect(sp.x - 12 + i * 14, sp.y + 62, 10, 6);
            c.restore();
            continue;
          }
          c.save();
          const r = 26 + 5 * Math.sin(this.time * 6 + sp.x);
          const g = c.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, r * 1.8);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#ffd27a'); g.addColorStop(1, 'rgba(255, 138, 216, 0)');
          c.fillStyle = g; c.beginPath(); c.arc(sp.x, sp.y, r * 1.8, 0, Math.PI * 2); c.fill();
          c.fillStyle = '#ffffff';
          for (let i = 0; i < sp.hp; i++) c.fillRect(sp.x - 12 + i * 14, sp.y + r + 8, 10, 6);
          c.restore();
        }
        if (!b.shield && b.openT > 0) this.ring(b.x, b.y, b.size * 0.5, b.openT / 5, '#7dffb0', 8);
      }
      if (b.state === 'fight') this.drawBossExtras(b);
      if (b.transT > 0) {
        c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(1, b.transT);
        const g = c.createRadialGradient(b.x, b.y, 10, b.x, b.y, b.size * 0.8);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(185, 155, 255, 0)');
        c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.size * 0.8, 0, Math.PI * 2); c.fill(); c.restore();
      }
    },

    // Prism crystals, the red reflect glow and Vortex blades
    drawBossExtras(b) {
      const c = this.ctx;
      if (b.reflectT > 0) {
        c.save(); c.globalAlpha = 0.45 + 0.25 * Math.sin(this.time * 18);
        const g = c.createRadialGradient(b.x, b.y, b.size * 0.15, b.x, b.y, b.size * 0.7);
        g.addColorStop(0, 'rgba(255, 90, 126, 0.8)'); g.addColorStop(1, 'rgba(255, 90, 126, 0)');
        c.fillStyle = g; c.beginPath(); c.arc(b.x, b.y, b.size * 0.7, 0, Math.PI * 2); c.fill(); c.restore();
      }
      if (b.crystals && b.shield) {
        c.save();
        c.globalAlpha = 0.25; c.fillStyle = '#bff9ff';
        c.beginPath(); c.ellipse(b.x, b.y, b.size * 0.6, b.size * 0.54, 0, 0, Math.PI * 2); c.fill();
        c.globalAlpha = 1;
        for (const cr of b.crystals) {
          if (cr.broken) continue;
          const next = cr.n === b.nextN;
          c.save(); c.translate(cr.x, cr.y);
          c.fillStyle = next ? '#e8f7ff' : '#7fe3ff'; c.strokeStyle = next ? '#ffd27a' : '#1c8fd8'; c.lineWidth = next ? 6 : 3;
          c.beginPath(); c.moveTo(0, -48); c.lineTo(30, 0); c.lineTo(0, 48); c.lineTo(-30, 0); c.closePath(); c.fill(); c.stroke();
          c.fillStyle = '#0a1440'; c.font = `700 36px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(cr.n), 0, 2);
          c.restore();
        }
        c.restore();
      }
      if (b.bladeSpeed > 0) {
        // two blades circling the boss; while they pass in front of it, shots are blocked
        const front = Math.cos(b.bladeAng) > 0.25;
        c.save(); c.translate(b.x, b.y);
        for (let i = 0; i < 2; i++) {
          const a = b.bladeAng + i * Math.PI;
          const x = Math.sin(a) * b.size * 0.5, depth = Math.cos(a);
          c.save(); c.translate(x, 0); c.scale(0.6 + 0.4 * Math.abs(depth), 1);
          c.globalAlpha = depth > 0 ? 0.95 : 0.35;
          c.fillStyle = front && depth > 0 ? '#e8d8ff' : '#b99bff'; c.strokeStyle = '#ffffff'; c.lineWidth = 3;
          c.beginPath(); c.ellipse(0, 0, b.size * 0.14, b.size * 0.42, 0, 0, Math.PI * 2); c.fill(); c.stroke();
          c.restore();
        }
        c.restore();
      }
    },

    // Fire walls, water beams (with their warnings) and Echo's darkness
    drawHazards() {
      const c = this.ctx;
      for (const hz of this.hazards) {
        const warn = hz.t < hz.warn;
        if (hz.kind === 'wall') {
          c.save();
          if (warn) {
            c.globalAlpha = 0.25 + 0.25 * Math.abs(Math.sin(hz.t * 8));
            c.fillStyle = '#ff5a3a'; c.fillRect(0, H * 0.62, W, H * 0.38);
            c.globalAlpha = 1; c.font = `700 64px ${FONT}`; c.textAlign = 'center'; c.fillStyle = '#fff4c9';
            c.shadowColor = '#000'; c.shadowBlur = this.glow(10);
            c.fillText(window.t ? t('SHIELD UP!') : 'SHIELD UP!', W / 2, H * 0.72);
          } else {
            const k = (hz.t - hz.warn) / hz.dur;
            const g = c.createLinearGradient(0, H, 0, H * 0.35);
            g.addColorStop(0, 'rgba(255, 230, 120, 0.95)'); g.addColorStop(0.5, 'rgba(255, 110, 40, 0.8)'); g.addColorStop(1, 'rgba(255, 60, 60, 0)');
            c.globalAlpha = 1 - k * 0.6; c.fillStyle = g; c.fillRect(0, H * 0.35, W, H * 0.65);
          }
          c.restore();
        }
        if (hz.kind === 'beam') {
          c.save();
          if (warn) {
            // the charging orb (shoot it!) and a thin warning line
            c.strokeStyle = '#9fd8ff'; c.lineWidth = 3; c.setLineDash([14, 12]); c.globalAlpha = 0.8;
            c.beginPath(); c.moveTo(hz.ox, hz.oy); c.lineTo(W / 2, H); c.stroke();
            c.setLineDash([]);
            const r = 30 + 24 * (hz.t / hz.warn);
            const g = c.createRadialGradient(hz.ox, hz.oy, 4, hz.ox, hz.oy, r * 1.6);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#9fd8ff'); g.addColorStop(1, 'rgba(98, 240, 255, 0)');
            c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(hz.ox, hz.oy, r * 1.6, 0, Math.PI * 2); c.fill();
          } else {
            c.globalCompositeOperation = 'lighter';
            c.strokeStyle = '#bff9ff'; c.lineCap = 'round';
            c.globalAlpha = 0.5; c.lineWidth = 90; c.beginPath(); c.moveTo(hz.ox, hz.oy); c.lineTo(W / 2, H + 40); c.stroke();
            c.globalAlpha = 1; c.lineWidth = 30; c.beginPath(); c.moveTo(hz.ox, hz.oy); c.lineTo(W / 2, H + 40); c.stroke();
          }
          c.restore();
        }
      }
    },
    drawDarkness() {
      const c = this.ctx;
      c.save();
      c.fillStyle = 'rgba(2, 4, 22, 0.86)';
      c.beginPath(); c.rect(0, 0, W, H);
      for (const p of this.players) { const a = p.reticle || p.smoothAim; c.moveTo(a.x + 230, a.y); c.arc(a.x, a.y, 230, 0, Math.PI * 2, true); }
      if (this.dAb && this.dAb.id === 'sonar' && this.drones) for (const d of this.drones) { c.moveTo(d.x + 200, d.y); c.arc(d.x, d.y, 200, 0, Math.PI * 2, true); }
      c.fill('evenodd');
      c.restore();
    },

    // short effect animations from a boss effects sheet (rock breaking, weak spot popping, shield popping)
    playFx(art, frames, x, y, size, dur) {
      if (!this.fxAnims) this.fxAnims = [];
      this.fxAnims.push({ art, frames, x, y, size, dur, t: 0 });
    },
    drawFxAnims() {
      for (const f of this.fxAnims) {
        const img = Assets.images[f.art.fx];
        if (!img) continue;
        const k = f.t / f.dur, i = Math.min(f.frames.length - 1, Math.floor(k * f.frames.length));
        this.drawFrame(img, f.art.fxMeta, f.frames[i], f.x, f.y, f.size, false, i === f.frames.length - 1 ? 1 - (k * f.frames.length - i) : 1);
      }
    },
    // which frame of the boss artwork fits what the boss is doing
    bossArtFrame(b, copyAlpha) {
      const art = BOSS_ART[b.sprite];
      b.artFlip = false;
      if (art && art.frames) {
        // artwork with a frame list: front when still, side frames when moving (mirrored to the left)
        const F = art.frames;
        if (b.state === 'caught') return F.caught;
        if (b.transT > 0) return F.roar != null ? F.roar : F.attack;
        if (b.flash > 0.05) return F.hurt;
        if (b.throwAnim > 0) return F.attack;
        if (b.tele > 0) return F.windup;
        const vx = b.vx || 0;
        if (Math.abs(vx) > 60) { b.artFlip = vx < 0; return F.side[Math.floor(b.t * 8) % F.side.length]; }
        return F.idle[Math.floor(b.t * 2) % F.idle.length];
      }
      const idle = Math.floor(b.t * 6) % 5;
      if (b.state === 'caught') return 19;
      if (b.transT > 1.2) return 15;
      if (b.transT > 0) return 17;
      if (copyAlpha < 0.95) return copyAlpha < 0.35 ? 12 : copyAlpha < 0.7 ? 13 : 11;
      if (b.flash > 0.05) return 16;
      if (b.shield && b.spots) return 18;
      if (b.throwAnim > 0) return b.throwAnim > 0.22 ? 7 : 8;
      if (b.tele > 0.45) return 6;
      if (b.tele > 0) return 5;
      return idle;
    },

    drawBossBody(b, x, y, alpha, real, copyAlpha = 1) {
      const art = BOSS_ART[b.sprite];
      if (art && Assets.images[art.img]) {
        // the boss's own artwork (crown included)
        const frame = this.bossArtFrame(b, copyAlpha);
        this.drawFrame(Assets.images[art.img], art.meta, frame, x, y, b.size * (art.frames ? 1.25 : 1.12), b.artFlip, alpha, art.frames ? 0 : b.rot, b.sx, b.sy);
        if (real && b.sprite === 'nebula' && b.phase === 2 && b.state === 'fight') {
          // the tell: a twinkling star on the real crown
          const c = this.ctx, k = 0.6 + 0.4 * Math.sin(this.time * 8), cy = y - b.size * 0.5;
          c.save(); c.fillStyle = '#ffffff'; c.globalAlpha = alpha * k; c.shadowColor = '#fff'; c.shadowBlur = this.glow(16);
          c.beginPath();
          for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 6 : 18; c.lineTo(x + b.size * 0.09 + Math.cos(a) * r, cy + Math.sin(a) * r); }
          c.closePath(); c.fill(); c.restore();
        }
        return;
      }
      const c = this.ctx, s = SPR[b.sprite], img = Assets.images[b.sprite];
      c.save();
      const g = c.createRadialGradient(x, y, b.size * 0.1, x, y, b.size * 0.7);
      g.addColorStop(0, 'rgba(255, 210, 122, 0.45)'); g.addColorStop(0.55, s.color + '55'); g.addColorStop(1, 'rgba(255, 138, 216, 0)');
      c.globalAlpha = alpha; c.fillStyle = g;
      c.beginPath(); c.arc(x, y, b.size * 0.7, 0, Math.PI * 2); c.fill();
      c.restore();
      this.drawFrame(img, s, b.frame, x, y, b.size, false, alpha, b.rot, b.sx, b.sy);
      if (b.flash > 0 && real) {
        c.save(); c.globalCompositeOperation = 'lighter';
        this.drawFrame(img, s, b.frame, x, y, b.size, false, b.flash * 3, b.rot, b.sx, b.sy);
        c.restore();
      }
      if (b.state === 'caught') return;
      const cx = x, cy = y - b.size * 0.43 * b.sy, w = b.size * 0.22;
      c.save(); c.globalAlpha = alpha;
      c.translate(cx, cy); c.rotate(b.rot);
      c.fillStyle = '#ffd27a'; c.strokeStyle = '#fff4c9'; c.lineWidth = 3; c.shadowColor = '#ffd27a'; c.shadowBlur = this.glow(20);
      c.beginPath();
      c.moveTo(-w / 2, 0); c.lineTo(-w / 2, -w * 0.45); c.lineTo(-w / 4, -w * 0.2); c.lineTo(0, -w * 0.55); c.lineTo(w / 4, -w * 0.2); c.lineTo(w / 2, -w * 0.45); c.lineTo(w / 2, 0);
      c.closePath(); c.fill(); c.stroke();
      if (real && b.phase === 2) {
        // the tell: a twinkling star on the real crown
        const k = 0.6 + 0.4 * Math.sin(this.time * 8);
        c.fillStyle = '#ffffff'; c.globalAlpha = alpha * k; c.shadowBlur = this.glow(16);
        c.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? 5 : 15; c.lineTo(Math.cos(a) * r, -w * 0.62 + Math.sin(a) * r); }
        c.closePath(); c.fill();
      }
      c.restore();
    },

    drawBossBar() {
      const c = this.ctx, b = this.boss;
      if (b.void) return this.drawVoidBar(b);
      const w = 640, h = 24, x = (W - w) / 2, y = 218;
      c.save();
      c.font = `700 28px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'bottom';
      c.fillStyle = '#ffd27a'; c.shadowColor = '#000'; c.shadowBlur = this.glow(8);
      c.fillText(b.name + (b.phased ? `  ·  ${b.phase}/3` : ''), W / 2, y - 6);
      c.shadowBlur = this.glow(0);
      c.fillStyle = 'rgba(12, 28, 94, 0.9)'; c.fillRect(x - 4, y - 4, w + 8, h + 8);
      c.strokeStyle = '#ffd27a'; c.lineWidth = 2; c.strokeRect(x - 4, y - 4, w + 8, h + 8);
      const k = b.hp / b.max;
      const g = c.createLinearGradient(x, 0, x + w, 0);
      g.addColorStop(0, '#ff8ad8'); g.addColorStop(1, '#ffd27a');
      c.fillStyle = g; c.fillRect(x, y, w * k, h);
      if (b.phased) {
        // phase markers at one and two thirds
        c.fillStyle = '#0a1440';
        [1 / 3, 2 / 3].forEach((f) => c.fillRect(x + w * f - 2, y - 4, 4, h + 8));
      }
      if (b.shield) { c.strokeStyle = '#9fd8ff'; c.lineWidth = 4; c.strokeRect(x - 8, y - 8, w + 16, h + 16); }
      c.restore();
    },

    drawWaves() {
      const c = this.ctx;
      for (const wv of this.waves) {
        const k = wv.t / 1.2;
        c.save();
        c.globalAlpha = 1 - k; c.strokeStyle = wv.color || '#9fd8ff'; c.lineWidth = 8 * (1 - k) + 2; c.shadowColor = wv.color || '#9fd8ff'; c.shadowBlur = this.glow(20);
        c.beginPath(); c.arc(wv.x, wv.y, 40 + k * 900, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.arc(wv.x, wv.y, 20 + k * 500, 0, Math.PI * 2); c.stroke();
        c.restore();
      }
    },

    drawShield(p) {
      const c = this.ctx;
      const up = p.equipped === 'shield' ? 1 : 0;
      const a = 0.35 * up + p.shieldFlash * 1.8;
      const two = this.players.length > 1;
      const cx = this.gunBase(p), rw = two ? W * 0.3 : W * 0.62, rh = two ? H * 0.62 : H * 0.78;
      c.save();
      c.globalAlpha = Math.min(1, a);
      c.strokeStyle = p.shieldFlash > 0 ? '#ffffff' : '#8ff0c8';
      c.fillStyle = 'rgba(143, 240, 200, 0.10)';
      c.lineWidth = 8; c.shadowColor = '#8ff0c8'; c.shadowBlur = this.glow(30);
      c.beginPath(); c.ellipse(cx, H * 1.25, rw, rh, 0, Math.PI, Math.PI * 2); c.fill(); c.stroke();
      c.shadowBlur = this.glow(0); c.lineWidth = 2; c.globalAlpha *= 0.6;
      for (let k = 1; k <= 3; k++) {
        c.beginPath(); c.ellipse(cx, H * 1.25, rw * (1 - k * 0.12), rh * (1 - k * 0.12), 0, Math.PI, Math.PI * 2); c.stroke();
      }
      c.restore();
    },

    drawSlowMo() {
      const c = this.ctx;
      const anim = Math.max(...this.players.map((p) => p.belt.anim));
      c.save();
      c.globalAlpha = 0.25 * anim;
      c.fillStyle = '#1b2f8a';
      c.fillRect(0, 0, W, H);
      c.restore();
    },

    drawGearIcon(id, x, y, s, color) {
      const c = this.ctx;
      c.save();
      c.translate(x, y);
      c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 4; c.lineJoin = 'round';
      if (id === 'gun') {
        c.beginPath(); c.roundRect ? c.roundRect(-s * 0.6, -s * 0.28, s * 1.1, s * 0.4, 6) : c.rect(-s * 0.6, -s * 0.28, s * 1.1, s * 0.4); c.stroke();
        c.beginPath(); c.moveTo(-s * 0.2, s * 0.12); c.lineTo(-s * 0.35, s * 0.6); c.lineTo(-s * 0.05, s * 0.6); c.lineTo(s * 0.05, s * 0.12); c.stroke();
        c.beginPath(); c.arc(s * 0.62, -s * 0.08, s * 0.1, 0, Math.PI * 2); c.fill();
      } else if (id === 'grenade') {
        c.beginPath(); c.arc(0, 0, s * 0.5, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 2.5;
        c.beginPath(); c.moveTo(-s * 0.5, 0); c.lineTo(s * 0.5, 0); c.moveTo(0, -s * 0.5); c.lineTo(0, s * 0.5); c.stroke();
        c.beginPath(); c.arc(0, 0, s * 0.27, 0, Math.PI * 2); c.stroke();
      } else if (id === 'time') {
        c.beginPath(); c.arc(0, 0, s * 0.5, 0, Math.PI * 2); c.stroke();
        c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -s * 0.32); c.moveTo(0, 0); c.lineTo(s * 0.24, s * 0.08); c.stroke();
      } else if (id === 'shield') {
        c.beginPath();
        c.moveTo(0, -s * 0.6); c.lineTo(s * 0.5, -s * 0.4); c.lineTo(s * 0.42, s * 0.15);
        c.quadraticCurveTo(s * 0.3, s * 0.45, 0, s * 0.62);
        c.quadraticCurveTo(-s * 0.3, s * 0.45, -s * 0.42, s * 0.15);
        c.lineTo(-s * 0.5, -s * 0.4); c.closePath(); c.stroke();
      }
      c.restore();
    },

    ring(x, y, r, progress, color, width) {
      if (progress <= 0) return;
      const c = this.ctx;
      c.save(); c.lineWidth = width; c.strokeStyle = color; c.lineCap = 'round';
      c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, progress)); c.stroke(); c.restore();
    },

    drawBelt(p) {
      const c = this.ctx, b = this.beltPos(p), belt = p.belt, anim = belt.anim;
      const labelLeft = b.x > W / 2;
      c.save();
      c.font = `600 28px ${FONT}`;
      c.textBaseline = 'middle';

      // Unfolding rounded column
      if (anim > 0.02) {
        const top = b.y - BELT.gap * this.gearList().length * anim - BELT.itemR - 14;
        const w = (BELT.itemR + 16) * 2;
        c.globalAlpha = anim;
        c.fillStyle = 'rgba(12, 28, 94, 0.88)';
        c.strokeStyle = p.color; c.lineWidth = 3;
        c.beginPath();
        if (c.roundRect) c.roundRect(b.x - w / 2, top, w, b.y - top, w / 2); else c.rect(b.x - w / 2, top, w, b.y - top);
        c.fill(); c.stroke();

        this.beltItems(p).forEach((it, i) => {
          const y = b.y - BELT.gap * (i + 1) * anim;
          const ok = this.gearAvailable(p, it.id);
          const on = p.equipped === it.id;
          c.globalAlpha = anim * (ok ? 1 : 0.4);
          c.fillStyle = on ? 'rgba(255, 138, 216, 0.25)' : '#12246e';
          c.strokeStyle = on ? '#ff8ad8' : it.color; c.lineWidth = on ? 5 : 3;
          c.beginPath(); c.arc(b.x, y, BELT.itemR, 0, Math.PI * 2); c.fill(); c.stroke();
          this.drawGearIcon(it.id, b.x, y, 52, it.color);
          if (belt.sel === i) this.ring(b.x, y, BELT.itemR + 12, belt.selT / BELT.selectTime, '#ffffff', 8);

          let label = window.t ? t(it.name) : it.name;
          if (it.id === 'grenade') label += ` ×${p.grenades}`;
          if (it.id === 'time') label += ` ×${p.timeGrenades}`;
          if (it.id === 'shield') label = (window.t ? t('Shield') : 'Shield') + (p.shieldHP > 0 ? ` ${p.shieldHP}/${SHIELD_MAX}` : ` ${Math.ceil(p.shieldRecharge)}s`);
          c.fillStyle = '#e8f7ff';
          c.textAlign = labelLeft ? 'right' : 'left';
          c.shadowColor = '#000'; c.shadowBlur = this.glow(8);
          c.fillText(label, b.x + (labelLeft ? -1 : 1) * (BELT.itemR + 34), y);
          c.shadowBlur = this.glow(0);
        });
      }

      // Belt button, showing the gear in use
      c.globalAlpha = 1;
      c.fillStyle = belt.open ? '#2150c4' : 'rgba(12, 28, 94, 0.85)';
      c.strokeStyle = p.color; c.lineWidth = 4; c.shadowColor = p.color; c.shadowBlur = this.glow(18);
      c.beginPath(); c.arc(b.x, b.y, BELT.r, 0, Math.PI * 2); c.fill(); c.stroke();
      c.shadowBlur = this.glow(0);
      const eq = this.gearList().find((g) => g.id === p.equipped) || GEAR[0];
      this.drawGearIcon(eq.id, b.x, b.y - 4, 50, eq.color);
      c.fillStyle = '#9fb7e8'; c.font = `500 18px ${FONT}`; c.textAlign = 'center';
      c.fillText(this.players.length > 1 ? `P${p.id}` : (window.t ? t('Gear') : 'Gear'), b.x, b.y + BELT.r + 20);
      // Grenade count badge
      c.fillStyle = '#ff8ad8';
      c.beginPath(); c.arc(b.x + BELT.r * 0.72, b.y - BELT.r * 0.72, 20, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#0a1440'; c.font = `700 22px ${FONT}`;
      c.fillText(String(p.grenades), b.x + BELT.r * 0.72, b.y - BELT.r * 0.72 + 1);
      if (!belt.open) this.ring(b.x, b.y, BELT.r + 12, belt.hover / BELT.openTime, '#ffffff', 8);
      c.restore();
    },

    // Two players: each player's ammo next to their gear button
    drawPlayerHud(p) {
      const c = this.ctx, b = this.beltPos(p);
      const right = b.x > W / 2;
      const x0 = right ? b.x - BELT.r - 30 : b.x + BELT.r + 30;
      c.save();
      c.textBaseline = 'middle';
      c.textAlign = right ? 'right' : 'left';
      c.font = `700 26px ${FONT}`;
      c.fillStyle = p.color;
      c.shadowColor = '#000'; c.shadowBlur = this.glow(8);
      const label = p.equipped === 'time' ? `P${p.id} · Time grenade` : p.equipped === 'grenade' ? `P${p.id} · Net grenade` : p.equipped === 'shield' ? `P${p.id} · Shield ${p.shieldHP}/${SHIELD_MAX}` : `P${p.id} · Blaster`;
      c.fillText(label, x0, b.y + 30);
      c.shadowBlur = this.glow(0);
      // ammo pips
      const pw = 12, gap = 6;
      for (let i = 0; i < this.magSize; i++) {
        const k = right ? this.magSize - 1 - i : i;
        const x = right ? x0 - k * (pw + gap) - pw : x0 + k * (pw + gap);
        c.globalAlpha = i < p.ammo ? (p.equipped === 'gun' ? 1 : 0.35) : 0.15;
        c.fillStyle = '#d4fbff';
        c.fillRect(x, b.y - 22, pw, 30);
      }
      c.restore();
    },

    // Progress ring on the Menu button and for the time-out T
    drawMenuHold() {
      const cx = MENU_BTN.x + MENU_BTN.w / 2, cy = MENU_BTN.y + MENU_BTN.h / 2;
      const menuHold = Math.max(0, ...this.players.map((p) => p.menuHold));
      const tHold = Math.max(0, ...this.players.map((p) => p.tHold));
      if (menuHold > 0) this.ring(cx, cy, 60, menuHold / MENU_DWELL, '#ffffff', 8);
      if (tHold > 0) this.ring(cx, cy, 60, tHold / T_HOLD, '#ffd27a', 8);
    },

    drawReticle(p) {
      const c = this.ctx;
      const playing = this.state === 'play';
      const { x, y } = playing ? p.reticle : p.smoothAim;
      const inBelt = playing && (p.belt.open || this.inBeltZone(p, p.smoothAim));
      const two = this.players.length > 1;

      // Where your hand actually is (before aim assist)
      if (p.input.isCam() && playing && p.equipped === 'gun') {
        c.save(); c.globalAlpha = 0.45; c.fillStyle = '#ffffff';
        c.beginPath(); c.arc(p.smoothAim.x, p.smoothAim.y, 7, 0, Math.PI * 2); c.fill(); c.restore();
      }

      // Net grenade: show the capture area
      if (playing && (p.equipped === 'grenade' || p.equipped === 'time') && !inBelt) {
        const tg = p.equipped === 'time';
        c.save();
        c.setLineDash([16, 12]); c.lineWidth = 4; c.strokeStyle = tg ? '#9fd8ff' : '#ff8ad8'; c.globalAlpha = 0.85;
        c.beginPath(); c.arc(x, y, tg ? 110 : NET_R, 0, Math.PI * 2); c.stroke();
        c.restore();
        if (p.input.usesDwell()) this.ring(x, y, 58, p.still.t / GRENADE_STILL, '#ffffff', 9);
      }

      const locked = !!p.dwellTarget && playing && p.equipped === 'gun';
      const col = inBelt ? '#ffffff' : p.equipped === 'shield' ? '#8ff0c8' : locked ? '#ff8ad8' : p.color;
      const R = p.equipped === 'gun' || inBelt ? 44 : 30;

      if (p.input.mode === 'mouse') {
        // The crosshair itself is the mouse cursor (drawn by the computer, so it never lags).
        // Here we only mark a locked target and show the dwell progress.
        if (locked) {
          const t = p.dwellTarget, tx = t.rock || t.isBoss ? t.x : t.px, ty = t.rock || t.isBoss ? t.y : t.py;
          c.save(); c.strokeStyle = '#ff8ad8'; c.lineWidth = 4; c.setLineDash([10, 8]);
          c.beginPath(); c.arc(tx, ty, (t.r || 40) * 1.1, 0, Math.PI * 2); c.stroke(); c.restore();
          if (p.dwell > 0) this.ring(x, y, R + 12, p.dwell / DWELL_TIME, '#ffffff', 9);
        }
        return;
      }

      c.save();
      if (this.lowFx) {
        // cheap glow: a wide see-through ring instead of a blur
        c.globalAlpha = 0.3; c.lineWidth = 14; c.strokeStyle = col;
        c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
      }
      c.lineWidth = 4; c.strokeStyle = col;
      c.shadowColor = col; c.shadowBlur = this.glow(16);
      c.beginPath(); c.arc(x, y, R, 0, Math.PI * 2); c.stroke();
      c.shadowBlur = this.glow(0);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2;
        c.beginPath();
        c.moveTo(x + Math.cos(a) * (R - 12), y + Math.sin(a) * (R - 12));
        c.lineTo(x + Math.cos(a) * (R + 12), y + Math.sin(a) * (R + 12));
        c.stroke();
      }
      c.fillStyle = col; c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill();
      if (two) {
        c.font = `700 24px ${FONT}`; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillStyle = p.color; c.shadowColor = '#000'; c.shadowBlur = this.glow(6);
        c.fillText('P' + p.id, x + R + 10, y - R + 4);
      }
      c.restore();

      // Dwell progress: the ring fills up, then the blaster fires
      if (locked && p.dwell > 0 && p.input.usesDwell()) this.ring(x, y, R + 12, p.dwell / DWELL_TIME, '#ffffff', 9);
    },

    drawPortrait(canvas, type) {
      const s = SPR[type], img = Assets.images[type];
      const c = canvas.getContext('2d');
      c.clearRect(0, 0, canvas.width, canvas.height);
      const h = canvas.height, w = h * s.fw / s.fh;
      c.drawImage(img, 0, 0, s.fw, s.fh, (canvas.width - w) / 2, 0, w, h);
    },
  };

  window.SV = { buddyBonusOf, SPECIALS, SPECIAL_INFO, specialOf, SUPERS, viewW: () => W, REGION_MAT, Assets, Input, inputs, Level, SPR, LEVELS, STAGES, stageConfig, starRating, ALL_TYPES, GEAR, TIME_GEAR, SHIELD_MAX, TROPHIES, shieldMax: () => SHIELD_MAX, get TYPES() { return TYPES; }, get GOAL() { return GOAL; }, goalOf };
})();
