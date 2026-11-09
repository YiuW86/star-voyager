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

    // ---- Planet Cindera: ashen ground creatures of rock and glowing magma (not in any level yet) ----
    { id: 'vorath', planet: 2, name: 'Vorath', title: 'The Magma Boulder', level: null, danger: 4,
      home: 'Cooling lava fields of Emberfall Rift', size: 'As big as a small car', diet: 'Warm volcanic rocks',
      about: 'Vorath looks like a pile of boulders until it stands up. Glowing magma runs through the cracks in its stony back.',
      tip: 'It charges in a straight line: step aside, then catch it while it turns around.',
      fact: 'When it sleeps, it is so still that birds build nests on its back.' },
    { id: 'tharzul', planet: 2, name: 'Tharzul', title: 'The Cinder Serpent', level: null, danger: 4,
      home: 'Ash dunes of Glimmer Coast', size: 'As long as a bus', diet: 'Hot ash',
      about: 'Tharzul slithers through the ash like a fish through water. Its scales glow brighter the angrier it gets.',
      tip: 'Aim for its head when it rises up out of the ash.',
      fact: 'It sheds its stone scales once a year, and they keep glowing for weeks.' },
    { id: 'gravtech', planet: 2, name: 'Gravtech', title: 'The Iron Walker', level: null, danger: 5,
      home: 'Metal canyons of Thunder Spires', size: 'Taller than a grown-up', diet: 'Iron ore',
      about: 'Gravtech walks on two strong legs and has claws like digging tools. Nobody knows if it is an alien or a machine.',
      tip: 'Its armour is thick: keep firing at the glowing joints.',
      fact: 'Lightning loves Gravtech: it gets struck almost every storm and only grows stronger.' },
    { id: 'dazkor', planet: 2, name: 'Dazkor', title: 'The Spiked Brute', level: null, danger: 5,
      home: 'Volcano slopes of Emberfall Rift', size: 'As big as a gorilla', diet: 'Glowing crystals',
      about: 'Dazkor is covered in sharp red spikes. It stomps so hard that small rocks jump up around it.',
      tip: 'Keep your shield ready when it stomps: the rocks fly toward you.',
      fact: 'Baby Dazkors have soft spikes that only harden after their first eruption.' },
    { id: 'vexor', planet: 2, name: 'Vexor', title: 'The Molten Core', level: null, danger: 3,
      home: 'Inside steaming craters', size: 'As big as a beach ball', diet: 'Heat',
      about: 'Vexor is a round stone with a burning heart. Little rocks orbit around it like a shield.',
      tip: 'Shoot when the orbiting rocks are behind it and the core is open.',
      fact: 'Its core is so hot that snow melts when Vexor floats over it.' },
    { id: 'brakzan', planet: 2, name: 'Brakzan', title: 'The Ember Crab', level: null, danger: 3,
      home: 'Black sand beaches of Glimmer Coast', size: 'As big as a dog', diet: 'Sea glass and coal',
      about: 'Brakzan scuttles sideways on sharp stone legs and waves its glowing claws at anything that moves.',
      tip: 'It runs in zigzags: wait for it to stop and wave its claws.',
      fact: 'It decorates its shell with shiny pebbles to look more scary.' },
    { id: 'zeltha', planet: 2, name: 'Zeltha', title: 'The Ash Squid', level: null, danger: 3,
      home: 'Smoky skies over Emberfall Rift', size: 'As long as a sofa', diet: 'Smoke',
      about: 'Zeltha floats through the smoke with long glowing tentacles. It moves silently, like a ghost.',
      tip: 'Follow the glow of its tentacles when it hides in the smoke.',
      fact: 'It can squirt a cloud of ash to hide, just like a squid squirts ink.' },
    { id: 'tornik', planet: 2, name: 'Tornik', title: 'The Spike Star', level: null, danger: 4,
      home: 'Rocky plains of Thunder Spires', size: 'As big as a football', diet: 'Sparks',
      about: 'Tornik rolls around like a spiky ball and bounces off walls. Its glowing centre spins when it is excited.',
      tip: 'Catch it right after it bounces, when it slows down.',
      fact: 'Its spikes pick up static: touch one and your hair stands up!' },
    { id: 'krazul', planet: 2, name: 'Krazul', title: 'The Tunnel Worm', level: null, danger: 4,
      home: 'Deep under the ash fields', size: 'As long as a train carriage', diet: 'Stone',
      about: 'Krazul eats its way through solid rock with a mouth full of glowing rings. It leaves long tunnels behind.',
      tip: 'Watch the ground shake: that is where it comes up.',
      fact: 'Its tunnels are so neat that other aliens use them as roads.' },
    { id: 'drektha', planet: 2, name: 'Drektha', title: 'The Shell Tank', level: null, danger: 4,
      home: 'Lava plains of Emberfall Rift', size: 'As big as a bathtub', diet: 'Hot pebbles',
      about: 'Drektha carries a heavy stone shell with glowing red eyes on the sides. Nothing can push it over.',
      tip: 'Hit it when it lifts its shell to look around.',
      fact: 'It can stay inside its shell for a whole month.' },
    { id: 'xalrin', planet: 2, name: 'Xalrin', title: 'The Cliff Spider', level: null, danger: 4,
      home: 'Steep cliffs of Thunder Spires', size: 'As big as an armchair', diet: 'Lightning bugs',
      about: 'Xalrin climbs up straight cliffs on eight sharp legs and waits quietly for something to pass by.',
      tip: 'It jumps toward you: catch it in the air with a net grenade.',
      fact: 'Its webs are made of glowing glass threads.' },
    { id: 'sylthar', planet: 2, name: 'Sylthar', title: 'The Ash Hawk', level: null, danger: 4,
      home: 'High above the volcanoes', size: 'Wings as wide as a car', diet: 'Flying embers',
      about: 'Sylthar soars on wings of jagged stone and dives down at amazing speed.',
      tip: 'It always circles twice before it dives: aim where it will come down.',
      fact: 'It rides the hot air from volcanoes and almost never flaps its wings.' },
    { id: 'korvax', planet: 2, name: 'Korvax', title: 'The Crystal Back', level: null, danger: 5,
      home: 'Glowing caves of Emberfall Rift', size: 'As big as a rhinoceros', diet: 'Red crystals',
      about: 'Korvax grows bright red crystals all along its back. The bigger the crystals, the older the Korvax.',
      tip: 'Its back is armoured: aim for its face.',
      fact: 'The oldest Korvax has crystals taller than a house.' },
    { id: 'zephora', planet: 2, name: 'Zephora', title: 'The Ring Keeper', level: null, danger: 3,
      home: 'Floating rocks above Glimmer Coast', size: 'As big as a wardrobe', diet: 'Starlight',
      about: 'Zephora is a tall crystal stone with a glowing ring and little rocks floating around it.',
      tip: 'Shoot the glowing seam in the middle when the ring turns.',
      fact: 'Its ring hums a low note that you can feel in your tummy.' },
    { id: 'rexora', planet: 2, name: 'Rexora', title: 'The Boulder Beetle', level: null, danger: 3,
      home: 'Ash forests of Glimmer Coast', size: 'As big as a coffee table', diet: 'Burnt wood',
      about: 'Rexora rolls its round shell down hills and stops right in front of you to say hello.',
      tip: 'It rolls fast but brakes hard: catch it when it stops.',
      fact: 'Rexora beetles line up in long rows and roll down hills together.' },
    { id: 'vorlis', planet: 2, name: 'Vorlis', title: 'The Flare Star', level: null, danger: 3,
      home: 'Sky over Thunder Spires', size: 'As big as a bicycle wheel', diet: 'Flashes of lightning',
      about: 'Vorlis floats like a burning star with long sharp points. It flashes brightly when it is surprised.',
      tip: 'Close your eyes for its flash, then catch it while it recharges.',
      fact: 'From far away, people often think Vorlis is a falling star.' },
    { id: 'skarnel', planet: 2, name: 'Skarnel', title: 'The Lava Scarab', level: null, danger: 4,
      home: 'Hot springs of Emberfall Rift', size: 'As big as a sheep', diet: 'Lava bubbles',
      about: 'Skarnel has a shell of cracked stone with lava glowing underneath. It digs in the warm mud around hot springs.',
      tip: 'Aim for the glowing cracks: that is where its shell is weakest.',
      fact: 'It keeps warm all night by sitting on a lava bubble.' },

    // ---- Planet Prismara (card images cut from the Prismara creature roster; level = the first world it lives in) ----
    { id: 'aurorajell', planet: 3, name: 'Aurorajell', title: 'The Aurora Jelly', level: null, danger: 2,
      home: 'Glowing sky pools of Prismara', size: 'As big as a beach ball', diet: 'Rainbow mist',
      about: 'A jellyfish of soft rainbow glass. It drifts on warm air and its bell glows in every colour of the northern lights.',
      tip: 'It floats slowly: hold the circle steady on its bell.',
      fact: 'Its colours change with its mood, pink means it is happy.' },
    { id: 'floravex', planet: 3, name: 'Floravex', title: 'The Petal Dragon', level: 22, danger: 3,
      home: 'Crystal flower meadows', size: 'As big as a dog', diet: 'Flower nectar',
      about: 'A little dragon with petals of glass along its back. It hops from flower to flower and hides in the meadows.',
      tip: 'It darts sideways between flowers: aim where it lands.',
      fact: 'Every year it grows one new crystal petal.' },
    { id: 'orbello', planet: 3, name: 'Orbello', title: 'The Bubble Moon', level: 21, danger: 2,
      home: 'Floating above crystal lakes', size: 'As big as a football', diet: 'Moonlight',
      about: 'A round alien with a glowing eye, circled by little bubble moons that follow it everywhere.',
      tip: 'Hit the bright eye in the middle, not the bubbles.',
      fact: 'Its bubble moons are its children.' },
    { id: 'zephyrax', planet: 3, name: 'Zephyrax', title: 'The Prism Crab', level: null, danger: 3,
      home: 'Glass beaches of Prismara', size: 'As big as a car tyre', diet: 'Shiny pebbles',
      about: 'A crab with a shell of pink crystal plates. It scuttles fast and waves its claws when it is surprised.',
      tip: 'It runs in zigzags: wait until it stops to wave its claws.',
      fact: 'It can see in every direction at once.' },
    { id: 'luminara', planet: 3, name: 'Luminara', title: 'The Light Fairy', level: null, danger: 1,
      home: 'Shimmering crystal forests', size: 'As big as a sparrow', diet: 'Drops of light',
      about: 'A tiny fairy with four see-through wings. It leaves a trail of sparkles wherever it flies.',
      tip: 'Small but slow: aim help makes it an easy catch.',
      fact: 'Its wings make a soft humming sound like a music box.' },
    { id: 'skyshard', planet: 3, name: 'Skyshard', title: 'The Glass Squid', level: null, danger: 3,
      home: 'High winds above the crystal peaks', size: 'As big as a kite', diet: 'Cloud crystals',
      about: 'A squid with a sharp crystal head that cuts through the wind like an arrow.',
      tip: 'It shoots forward in quick bursts: aim a little ahead of it.',
      fact: 'It is the fastest swimmer in the sky of Prismara.' },
    { id: 'slimora', planet: 3, name: 'Slimora', title: 'The Rainbow Slug', level: 20, danger: 1,
      home: 'Wet crystal caves', size: 'As big as a slipper', diet: 'Soft moss',
      about: 'A friendly slug of glowing jelly with two big eye stalks. It leaves a sparkling trail behind it.',
      tip: 'It barely moves: a perfect first catch.',
      fact: 'Its trail shines in the dark for a whole night.' },
    { id: 'nexuslit', planet: 3, name: 'Nexuslit', title: 'The Star Bloom', level: null, danger: 2,
      home: 'Starlit crystal gardens', size: 'As big as a dinner plate', diet: 'Starlight',
      about: 'A star-shaped crystal with a glowing heart. It spins slowly while it floats toward you.',
      tip: 'Aim for the glowing heart in the centre.',
      fact: 'It points toward the brightest star in the sky.' },
    { id: 'aquilon', planet: 3, name: 'Aquilon', title: 'The Sky Ray', level: null, danger: 3,
      home: 'Open skies over the glass sea', size: 'As big as a door', diet: 'Floating plankton',
      about: 'A wide ray with starry wings that glides through the air like it is swimming.',
      tip: 'It banks in long curves: follow it with the circle.',
      fact: 'Its wings show a new pattern of stars every night.' },
    { id: 'bubzel', planet: 3, name: 'Bubzel', title: 'The Bubble Bug', level: null, danger: 2,
      home: 'Bubbling springs', size: 'As big as a melon', diet: 'Soap bubbles',
      about: 'A round, rainbow bug that blows bubbles from its antennas. It bounces when it moves.',
      tip: 'It bounces up and down: catch it at the top of a bounce.',
      fact: 'It can hold its breath inside a bubble for an hour.' },
    { id: 'vaporis', planet: 3, name: 'Vaporis', title: 'The Mist Wyrm', level: 21, danger: 3,
      home: 'Misty crystal valleys', size: 'As long as a bus', diet: 'Morning fog',
      about: 'A long sea serpent of mist and glass that curls through the clouds.',
      tip: 'Its long body is easy to hit, but it dodges quickly.',
      fact: 'It can turn into mist and float through walls.' },
    { id: 'tentrix', planet: 3, name: 'Tentrix', title: 'The Dome Jelly', level: null, danger: 2,
      home: 'Deep crystal pools', size: 'As big as an umbrella', diet: 'Glow plankton',
      about: 'A big jellyfish with a pink dome and many curly tentacles full of tiny bubbles.',
      tip: 'Wait until it pulls its tentacles in, then hit the dome.',
      fact: 'Each tentacle can light up on its own.' },
    { id: 'crystoon', planet: 3, name: 'Crystoon', title: 'The Crystal Guard', level: null, danger: 4,
      home: 'Crystal mountains', size: 'As big as a fridge', diet: 'Gem dust',
      about: 'A guardian made of sharp crystal points. It is very tough and blocks shots with its spikes.',
      tip: 'Very tough: hit it a few times in the glowing centre.',
      fact: 'It stands still for weeks, like a statue.' },
    { id: 'zephylon', planet: 3, name: 'Zephylon', title: 'The Wing Hopper', level: null, danger: 2,
      home: 'Windy hills of Prismara', size: 'As big as a rabbit', diet: 'Seeds of light',
      about: 'A little hopper with big glass wings. It jumps high and glides back down.',
      tip: 'Catch it while it glides, not while it jumps.',
      fact: 'It can jump ten times its own height.' },
    { id: 'skybloom', planet: 3, name: 'Skybloom', title: 'The Blossom Spider', level: 20, danger: 3,
      home: 'Hanging crystal gardens', size: 'As big as a dinner plate', diet: 'Flower dew',
      about: 'A spider with petals instead of legs. It hangs from glowing threads and swings toward you.',
      tip: 'It swings from side to side: time your shot.',
      fact: 'Its threads are stronger than steel.' },
    { id: 'tidalis', planet: 3, name: 'Tidalis', title: 'The Coral Crab', level: null, danger: 3,
      home: 'Coral reefs of the glass sea', size: 'As big as a car tyre', diet: 'Sea crystals',
      about: 'A crab of pink coral glass with big curved claws. It is shy but pinches when cornered.',
      tip: 'Watch the claws: it attacks when they glow.',
      fact: 'It changes colour with the tide.' },
    { id: 'orelis', planet: 3, name: 'Orelis', title: 'The Frost Star', level: null, danger: 2,
      home: 'Icy crystal plains', size: 'As big as a dinner plate', diet: 'Snowflakes',
      about: 'A star of frozen crystal petals with a warm glowing core.',
      tip: 'Hit the warm core: the frozen petals block shots.',
      fact: 'It is warm inside, even when it is freezing outside.' },
    { id: 'jellyx', planet: 3, name: 'Jellyx', title: 'The Bubble Blob', level: null, danger: 1,
      home: 'Bubbling mud pools', size: 'As big as a pumpkin', diet: 'Sweet bubbles',
      about: 'A wobbly blob of green and yellow jelly with three eye stalks. It loves to bounce.',
      tip: 'An easy catch: it is slow and big.',
      fact: 'It splits into two smaller blobs when it is very full.' },
    { id: 'breezling', planet: 3, name: 'Breezling', title: 'The Cloud Jelly', level: null, danger: 2,
      home: 'Breezy cloud banks', size: 'As big as an umbrella', diet: 'Raindrops',
      about: 'A jellyfish shaped like a cloud. It rides the wind and drips little drops of light.',
      tip: 'It drifts with the wind: aim where it is floating to.',
      fact: 'It can make tiny rain showers.' },
    { id: 'viren', planet: 3, name: 'Viren', title: 'The Leaf Sprite', level: null, danger: 2,
      home: 'Glass leaf forests', size: 'As big as a cat', diet: 'Leaf sap',
      about: 'A sprite with leaves of crystal and a little round face. It hides between real leaves.',
      tip: 'Look closely: it blends in with the background.',
      fact: 'It sleeps upside down like a bat.' },
    { id: 'lumzig', planet: 3, name: 'Lumzig', title: 'The Glow Shrimp', level: null, danger: 2,
      home: 'Shallow glowing streams', size: 'As big as a banana', diet: 'Tiny glow worms',
      about: 'A shrimp with a glowing, segmented body that zigzags through the water and the air.',
      tip: 'It zigzags: wait for it to change direction.',
      fact: 'Its glow can be seen from far away at night.' },
    { id: 'orblet', planet: 3, name: 'Orblet', title: 'The Pom Pom', level: 20, danger: 1,
      home: 'Soft crystal hills', size: 'As big as a ball', diet: 'Sugar crystals',
      about: 'A cheerful round alien with little bubble feet and two shining eyes.',
      tip: 'Slow and round: an easy catch.',
      fact: 'It giggles when it bounces.' },
    { id: 'shardlit', planet: 3, name: 'Shardlit', title: 'The Crown Crystal', level: null, danger: 4,
      home: 'Inside crystal caves', size: 'As big as a tree', diet: 'Light from the stars',
      about: 'A crown of tall crystal shards with a glowing heart. It sends out sharp sparkles.',
      tip: 'Hit the heart when the shards spread open.',
      fact: 'It hums a song that makes other crystals glow.' },
    { id: 'emberoo', planet: 3, name: 'Emberoo', title: 'The Sunset Jelly', level: 21, danger: 2,
      home: 'Warm sunset lakes', size: 'As big as a beach ball', diet: 'Warm sunlight',
      about: 'A jellyfish that glows orange and pink like a sunset. It is warm to the touch.',
      tip: 'Its tentacles hang low: aim at the top of the dome.',
      fact: 'It glows brightest just before night.' },
    { id: 'moonfin', planet: 3, name: 'Moonfin', title: 'The Night Glider', level: null, danger: 3,
      home: 'Night skies of Prismara', size: 'As big as an eagle', diet: 'Moon dust',
      about: 'A graceful glider with long fins and big dark eyes. It only comes out at night.',
      tip: 'It glides fast in long curves: use aim help.',
      fact: 'Its fins shine silver in the moonlight.' },
  ];

  const PLANET_NAMES = { 1: 'Novara', 2: 'Cindera', 3: 'Prismara', 5: '????' };
  // The guide shows the aliens grouped per planet: jelly creatures on Novara, ashen rock creatures on Cindera,
  // crystal creatures on Prismara (in this order inside each planet).
  const GROUPS = {
    1: ['nebula', 'glix', 'skyra', 'splash', 'pulsar', 'tidal', 'nimbus', 'solara', 'glide', 'vortex', 'orbita', 'echo', 'ember', 'aurorajell',
        'slimora', 'bubzel', 'vaporis', 'tentrix', 'skybloom', 'jellyx', 'breezling', 'lumzig', 'orblet', 'emberoo'],
    2: ['vorath', 'tharzul', 'gravtech', 'dazkor', 'vexor', 'brakzan', 'zeltha', 'tornik', 'krazul', 'drektha', 'xalrin', 'sylthar', 'korvax',
        'zephora', 'rexora', 'vorlis', 'skarnel'],
    3: ['zephyr', 'orbit', 'lumora', 'vexa', 'crysta', 'prism', 'razor', 'floravex', 'orbello', 'zephyrax', 'luminara', 'skyshard', 'nexuslit',
        'aquilon', 'crystoon', 'zephylon', 'tidalis', 'orelis', 'viren', 'shardlit', 'moonfin'],
  };
  const PLANET_ORDER = [1, 2, 3];
  {
    const byId = Object.fromEntries(ALIENS.map((a) => [a.id, a]));
    const sorted = [];
    for (const pl of PLANET_ORDER) for (const id of GROUPS[pl]) { const a = byId[id]; if (a) { a.planet = pl; sorted.push(a); delete byId[id]; } }
    sorted.push(...Object.values(byId));        // anything not listed stays at the end
    ALIENS.splice(0, ALIENS.length, ...sorted);
  }
  const tt = (s, v) => (window.t ? window.t(s, v) : s);

  // ---- Bosses: the rulers of each world (level 10) and the Void, the astronaut's arch-nemesis ----
  const BOSSES = [
    { id: 'b1', world: 1, name: 'King Nebula', title: 'Ruler of Crystal Shores', img: 'assets/story/p_kingnebula.jpg', danger: 2,
      about: 'A giant, crowned Nebula who floats above the sky pools. The Mark of Static on his crown filled his head with an angry buzzing.',
      attack: 'He drifts slowly and calls little Nebulas to help him.',
      tip: 'Keep your circle on his big dome and keep firing. Catch his helpers when they come close.' },
    { id: 'b2', world: 2, name: 'Prism Empress', title: 'Ruler of Glowwood Forest', img: 'assets/story/p_prismempress.jpg', danger: 3,
      about: 'A proud empress made of glittering crystal. Her crystals see everything that shines, even the strange blinking "stars".',
      attack: 'She throws sharp crystal rocks at you.',
      tip: 'Hold up your shield when she throws, or shoot her crystals out of the air.' },
    { id: 'b3', world: 3, name: 'Tidequeen', title: 'Ruler of the Sunken Lagoon', img: 'assets/story/p_tidequeen.jpg', danger: 3,
      about: 'The giant queen of all Splashes. Deep in her lagoon she heard a cold song from very far away.',
      attack: 'She pushes forward in big swims, then glides.',
      tip: 'Hit her while she glides between two pushes.' },
    { id: 'b4', world: 4, name: 'Ember Lord', title: 'Ruler of the Sunfire Dunes', img: 'assets/story/p_emberlord.jpg', danger: 4,
      about: 'A loud, proud lord of fire. A strange humming star fell into his volcano, and it would not melt.',
      attack: 'He throws glowing fire rocks, faster and faster.',
      tip: 'Keep your shield ready and use a net grenade when he is low on health.' },
    { id: 'b5', world: 5, name: 'Echo Monarch', title: 'Ruler of the Moonlit Cavern', img: 'assets/story/p_echomonarch.jpg', danger: 4,
      about: 'A huge winged Echo whose voice fills the whole cave. For many moons he heard nothing but the signal.',
      attack: 'He swoops through the cave and throws bubble rocks.',
      tip: 'Aim a little ahead of him when he swoops.' },
    { id: 'b6', world: 6, name: 'Vortex King', title: 'Ruler of the Starfall Wetlands', img: 'assets/story/p_vortexking.jpg', danger: 5,
      about: 'A spinning storm with a crown. When he spins, the whole marsh spins with him.',
      attack: 'He spins up whirlwinds and charges at you.',
      tip: 'Wait until he stops spinning to catch his breath, then fire everything.' },
    { id: 'void', world: 30, void: true, name: 'The Void', title: 'The astronaut\'s arch-nemesis', danger: 5,
      about: 'A dark, living shadow from far beyond the stars. The Void sent the Mark of Static to make the rulers angry. Nobody knows what it wants... yet.',
      attack: 'It fires a giant beam, throws dark shards and calls its shadow minions.',
      tip: 'When the beam charges, shoot the glowing core to stun it. Then do double damage!',
      forms: [
        { name: 'Sealed form', img: 'assets/boss/void-sealed.webp', text: 'A small, dark spirit with burning eyes, locked inside its own planet. It watches. It waits.' },
        { name: 'True form', img: 'assets/boss/void-true.webp', text: 'When the seal breaks, the Void grows into a giant made of shadow and crystal. Its claws can grab whole stars.' },
      ] },
    { id: 'b20', world: 20, name: 'Skybloom Queen', title: 'Ruler of Bubble Shallows', img: 'assets/story/p_skybloomqueen.jpg', danger: 3,
      about: 'A queen of glass petals who drifts over the shallow waters of Prismara.',
      attack: 'She sends bubbles and petals swirling around you.',
      tip: 'Shoot the bubbles away first, then aim at her flower crown.' },
    { id: 'b21', world: 21, name: 'Orbello Prime', title: 'Ruler of Moonglass Caves', img: 'assets/story/p_orbelloprime.jpg', danger: 4,
      about: 'The oldest and biggest Orbello, circled by a whole family of bubble moons.',
      attack: 'His bubble moons fly at you in waves.',
      tip: 'Hit the bright eye in the middle, not the moons.' },
    { id: 'b22', world: 22, name: 'Mistwyrm King', title: 'Ruler of Petal Peaks', img: 'assets/story/p_mistwyrmking.jpg', danger: 5,
      about: 'A long, misty dragon king who hides in the clouds around the crystal peaks.',
      attack: 'He vanishes into the mist and appears somewhere else.',
      tip: 'Watch the mist: he always swirls before he appears.' },
  ];
  const $ = (s, root = document) => root.querySelector(s);

  const Dex = {
    ALIENS,
    save: null,
    persist: null,

    BOSSES,
    init({ save, persist, play, unlocked, toast, cleared, voidState }) { Object.assign(this, { save, persist, play, unlocked, toast, cleared, voidState }); },
    mode: 'aliens',
    setMode(m) {
      this.mode = m;
      document.querySelectorAll('.dex-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === m));
      this.render();
    },
    // a boss is known once you have beaten it (the Void: its sealed form when its planet opens, its true form once you met it)
    bossKnown(b) {
      if (b.void) { const v = this.voidState ? this.voidState() : {}; return v.sealed || v.trueForm; }
      return this.cleared ? this.cleared(b.world, (window.SV && window.SV.STAGES) || 10) : false;
    },
    bossWhere(b) {
      const L = (window.SV && window.SV.LEVELS) || {}, cfg = L[b.world] || {}, N = (window.SV && window.SV.STAGES) || 10;
      return { planet: PLANET_NAMES[cfg.planet || 1] || '', world: cfg.name || '', stage: N };
    },
    renderBosses() {
      const grid = $('#dex-grid');
      grid.innerHTML = '';
      grid.classList.add('bosses');
      let found = 0;
      for (const b of BOSSES) {
        const known = this.bossKnown(b);
        if (known) found++;
        const w = this.bossWhere(b);
        const v = b.void && this.voidState ? this.voidState() : {};
        const img = b.void ? (v.trueForm ? b.forms[1].img : b.forms[0].img) : b.img;
        const el = document.createElement('button');
        el.className = 'boss-card' + (known ? '' : ' locked') + (b.void ? ' void' : '');
        el.dataset.id = b.id;
        el.setAttribute('aria-label', known ? b.name : 'Unknown boss');
        el.innerHTML = `<span class="boss-pic"><img src="${img}" alt=""></span>`
          + `<b>${known ? tt(b.name) : '???'}</b><small>${known || !b.void ? `${tt(w.planet)} · ${tt(w.world)}` : '????'}</small>`
          + (b.void ? `<span class="boss-tag">${tt('Arch-nemesis')}</span>` : `<span class="boss-tag">${tt('Level')} ${w.stage}</span>`);
        el.addEventListener('click', () => this.showBoss(b.id));
        grid.appendChild(el);
      }
      $('#dex-count').textContent = tt('Bosses {a}/{b}', { a: found, b: BOSSES.length });
    },
    showBoss(id) {
      const b = BOSSES.find((x) => x.id === id);
      this.currentId = id;
      const list = BOSSES, idx = list.indexOf(b);
      const prev = $('.dex-nav.prev'), next = $('.dex-nav.next');
      if (prev) prev.style.visibility = idx > 0 ? 'visible' : 'hidden';
      if (next) next.style.visibility = idx < list.length - 1 ? 'visible' : 'hidden';
      const known = this.bossKnown(b), w = this.bossWhere(b);
      const L = (window.SV && window.SV.LEVELS) || {}, cfg = L[b.world] || {};
      const open = this.unlocked ? this.unlocked(b.world, w.stage) : true;
      const lock = '<svg viewBox="0 0 24 24" class="lk"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
      const crown = '<svg viewBox="0 0 64 40" class="cr"><path d="M4 36V10l14 12L32 4l14 18 14-12v26z"/></svg>';
      const whereHtml = `<div class="dex-where"><h3>Where to find it</h3><p class="muted">${open ? 'Choose the level to play it right away.' : 'Unlock this level first.'}</p>
        <div class="where-world" style="--bg:url('${cfg.bg || ''}')"><div class="where-head"><b>${tt(w.world)}</b><small>${tt(w.planet)} · ${tt('Level')} ${w.stage}</small></div>
        <div class="where-levels"><button class="where-lv boss${open ? '' : ' locked'}" data-world="${b.world}" data-stage="${w.stage}" aria-label="${w.world} ${w.stage}">${open ? '' : lock}<span>${crown}${w.stage}</span></button></div></div></div>`;
      const stars = '<i class="on"></i>'.repeat(b.danger) + '<i></i>'.repeat(5 - b.danger);
      const panel = $('#dex-detail');
      if (b.void) {
        const v = this.voidState ? this.voidState() : {};
        const form = (f, ok) => `<div class="void-form${ok ? '' : ' locked'}"><span class="boss-pic"><img src="${f.img}" alt=""></span><b>${ok ? f.name : '???'}</b><p>${ok ? f.text : 'Not seen yet.'}</p></div>`;
        panel.innerHTML = `<div class="boss-detail void">
          <div class="void-forms">${form(b.forms[0], v.sealed)}${form(b.forms[1], v.trueForm)}</div>
          <div class="dex-info">
            <h2>${known ? b.name : '???'}</h2>
            <p class="dex-title">${known ? b.title : 'Something is watching you...'}</p>
            ${known ? `<p>${b.about}</p><dl><dt>Planet</dt><dd>${tt(w.planet)}</dd><dt>Found in</dt><dd>${tt('{world}, level {n}', { world: tt(w.world), n: w.stage })}</dd><dt>Attacks</dt><dd>${b.attack}</dd><dt>Danger</dt><dd><span class="danger">${stars}</span></dd></dl>
              <p class="dex-tip"><b>Boss tip:</b> ${b.tip}</p>
              <button class="btn small mural-link" data-action="mural-open" data-from="dex"><span>${tt('Ancient mural')}</span></button>` : '<p>Free the rulers of Novara to find out more.</p>'}
            ${whereHtml}
          </div></div>`;
      } else {
        panel.innerHTML = `<div class="boss-detail">
          <span class="boss-pic big${known ? '' : ' locked'}"><img src="${b.img}" alt=""></span>
          <div class="dex-info">
            <h2>${known ? b.name : 'Unknown boss'}</h2>
            <p class="dex-title">${b.title}</p>
            ${known ? `<p>${b.about}</p>` : '<p>Beat this boss to unlock its page.</p>'}
            <dl><dt>Planet</dt><dd>${tt(w.planet)}</dd><dt>Found in</dt><dd>${tt('{world}, level {n}', { world: tt(w.world), n: w.stage })}</dd>
              ${known ? `<dt>Attacks</dt><dd>${b.attack}</dd>` : ''}<dt>Danger</dt><dd><span class="danger">${stars}</span></dd></dl>
            ${known ? `<p class="dex-tip"><b>Boss tip:</b> ${b.tip}</p>` : ''}
            ${whereHtml}
          </div></div>`;
      }
      this.bindPlaces(panel);
      panel.scrollTop = 0;
      $('#ov-dex').classList.add('show');
    },

    // Every world and level where this alien shows up (also as the boss of a world's last level)
    places(id) {
      const SV = window.SV || {};
      const L = SV.LEVELS || {}, N = SV.STAGES || 10;
      const out = [];
      for (const w of Object.keys(L).map(Number)) {
        const cfg = L[w];
        if (!cfg || cfg.endless || cfg.plat || cfg.experimental || !SV.stageConfig) continue;
        const stages = [];
        let boss = false;
        for (let s = 1; s <= N; s++) {
          const sc = SV.stageConfig(w, s);
          if ((sc.types || []).includes(id)) stages.push(s);
          if (sc.boss && sc.boss.sprite === id) boss = true;
        }
        if (stages.length || boss) out.push({ world: w, name: cfg.name, bg: cfg.bg, planet: cfg.planet || 1, stages, boss, bossName: boss ? L[w].boss.name : '' });
      }
      return out;
    },
    placesHtml(id) {
      const list = this.places(id);
      if (!list.length) return `<div class="dex-where"><h3>Where to catch it</h3><p class="muted">Not spotted in any level yet.</p></div>`;
      const N = (window.SV && window.SV.STAGES) || 10;
      const lock = '<svg viewBox="0 0 24 24" class="lk"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
      const crown = '<svg viewBox="0 0 64 40" class="cr"><path d="M4 36V10l14 12L32 4l14 18 14-12v26z"/></svg>';
      const chip = (w, s, extra, label) => {
        const open = this.unlocked ? this.unlocked(w, s) : true;
        return `<button class="where-lv${open ? '' : ' locked'}${extra}" data-world="${w}" data-stage="${s}" aria-label="${label}${open ? '' : ', locked'}">${open ? '' : lock}<span>${s === N && extra ? crown : ''}${s}</span></button>`;
      };
      return `<div class="dex-where"><h3>Where to catch it</h3><p class="muted">Choose a level to play it right away.</p>`
        + list.map((p) => {
          const chips = p.stages.map((s) => chip(p.world, s, s === N && p.boss ? ' boss' : '', `${p.name}, level ${s}`));
          if (p.boss && !p.stages.includes(N)) chips.push(chip(p.world, N, ' boss', `${p.name}, level ${N}, boss`));
          return `<div class="where-world" style="--bg:url('${p.bg}')">
              <div class="where-head"><b>${p.name}</b><small>${PLANET_NAMES[p.planet] || ''}${p.boss ? ` · Boss: ${p.bossName}` : ''}</small></div>
              <div class="where-levels">${chips.join('')}</div></div>`;
        }).join('') + '</div>';
    },
    bindPlaces(panel) {
      panel.querySelectorAll('.where-lv').forEach((b) => b.addEventListener('click', () => {
        const w = +b.dataset.world, s = +b.dataset.stage;
        if (b.classList.contains('locked')) { if (this.toast) this.toast('Unlock this level first'); return; }
        this.hide();
        if (this.play) this.play(w, s);
      }));
    },
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
      if (this.mode === 'bosses') return this.renderBosses();
      const grid = $('#dex-grid');
      grid.innerHTML = '';
      grid.classList.remove('bosses');
      // grouped per planet: a header with the planet, then its aliens
      let found = 0;
      const list = ALIENS;
      let lastPlanet = null;
      const tt = (s, v) => (window.t ? window.t(s, v) : s);
      for (const a of list) {
        const pl = a.planet || 1;
        if (pl !== lastPlanet) {
          lastPlanet = pl;
          const group = list.filter((x) => (x.planet || 1) === pl);
          const got = group.filter((x) => this.caught(x.id)).length;
          const h = document.createElement('div');
          h.className = 'dex-planet';
          h.innerHTML = `<b>${tt(PLANET_NAMES[pl] || '')}</b><span>${tt('{n} aliens', { n: group.length })} · ${tt('Discovered {a}/{b}', { a: got, b: group.length })}</span>`;
          grid.appendChild(h);
        }
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

    // previous / next alien in the guide (the arrows beside the page)
    step(dir) {
      if (this.mode === 'bosses') {
        const i = BOSSES.findIndex((x) => x.id === this.currentId), j = i + dir;
        if (i < 0 || j < 0 || j >= BOSSES.length) return false;
        this.showBoss(BOSSES[j].id);
        const nb = $(dir < 0 ? '.dex-nav.prev' : '.dex-nav.next');
        if (nb && nb.style.visibility !== 'hidden') nb.focus(); else { const o = $(dir < 0 ? '.dex-nav.next' : '.dex-nav.prev'); if (o) o.focus(); }
        return true;
      }
      const i = ALIENS.findIndex((x) => x.id === this.currentId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ALIENS.length) return false;
      this.show(ALIENS[j].id);
      const b = $(dir < 0 ? '.dex-nav.prev' : '.dex-nav.next');
      if (b && b.style.visibility !== 'hidden') b.focus(); else { const o = $(dir < 0 ? '.dex-nav.next' : '.dex-nav.prev'); if (o) o.focus(); }
      return true;
    },

    show(id) {
      const a = ALIENS.find((x) => x.id === id);
      this.currentId = id;
      const idx = ALIENS.indexOf(a);
      const prev = $('.dex-nav.prev'), next = $('.dex-nav.next');
      if (prev) prev.style.visibility = idx > 0 ? 'visible' : 'hidden';
      if (next) next.style.visibility = idx < ALIENS.length - 1 ? 'visible' : 'hidden';
      const n = this.caught(id);
      const panel = $('#dex-detail');
      const levels = (window.SV && window.SV.LEVELS) || {};
      const pl = this.places(a.id);
      const where = pl.length ? [...new Set(pl.map((p) => p.name))].join(', ') : 'Not spotted yet';
      if (!n) {
        panel.innerHTML = `
          <img class="dex-big" src="assets/dex/${a.id}-locked.png" alt="">
          <div class="dex-info">
            <h2>Unknown alien</h2>
            <p class="dex-title">Not discovered yet</p>
            <p>Catch one to unlock its page in the alien guide.</p>
            <dl><dt>Planet</dt><dd>${PLANET_NAMES[a.planet || 1]}</dd>
              <dt>Where to find it</dt><dd>${pl.length ? where : 'In a level that has not been reached yet'}</dd></dl>
            ${this.placesHtml(a.id)}
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
              <dt>Planet</dt><dd>${PLANET_NAMES[a.planet || 1]}</dd>
              <dt>Home</dt><dd>${a.home}</dd>
              <dt>Size</dt><dd>${a.size}</dd>
              <dt>Eats</dt><dd>${a.diet}</dd>
              <dt>Found in</dt><dd>${where}</dd>
              <dt>Danger</dt><dd><span class="danger" aria-label="${a.danger} out of 5">${stars}</span></dd>
              <dt>Times caught</dt><dd>${n}</dd>
            </dl>
            <p class="dex-tip"><b>Catching tip:</b> ${a.tip}</p>
            <p class="dex-fact"><b>Did you know?</b> ${a.fact}</p>
            ${this.placesHtml(a.id)}
          </div>`;
        if (this.save.dexNew && this.save.dexNew[id]) {
          delete this.save.dexNew[id];
          this.persist();
          const badge = $(`.dex-card[data-id="${id}"] .dex-new`);
          if (badge) badge.remove();
        }
      }
      this.bindPlaces(panel);
      panel.scrollTop = 0;
      $('#ov-dex').classList.add('show');
    },

    hide() { $('#ov-dex').classList.remove('show'); },
    detailOpen() { return $('#ov-dex').classList.contains('show'); },
  };

  window.Dex = Dex;
})();
