# Star Voyager (MVP)

**Version 3.5** (3 October 2026) — same version as the Android app (star-voyager-v3.5.apk).

A first-person, motion-controlled shooter for the browser. The game runs on a TV or laptop; an Android phone acts as the camera. The phone tracks your body and sends only the keypoints (no video) straight to the game over WebRTC.

## Files

```
index.html          The game (open this on the TV or laptop)
controller.html     The phone controller (camera + pose tracking)
css/style.css       Game styling
js/app.js           Screens, menus, shop, options, saving, pairing
js/level.js         Gameplay: monsters, aiming, aim assist, shooting, health
js/net.js           WebRTC host (receives data from the phone)
js/controller.js    Phone side: MediaPipe pose tracking + WebRTC sending
js/audio.js         Synthesized sound effects
js/dex.js           Alien guide: facts about every alien and the guide screen
js/i18n.js          Languages: all translations of the game's texts
js/config.js        Your settings (Google Cast App ID, Firebase accounts, licences)
js/cloud.js         Accounts, cloud save and licence check (Firebase)
firestore.rules     Security rules to paste into Firebase
js/cast-receiver.js Makes the game work as a Google Cast receiver on the TV
assets/             Your artwork (spritesheets sliced into even frames)
```

## Put it online with GitHub Pages

1. Create a repository and upload all files, keeping the folder structure.
2. In the repository, go to **Settings → Pages**, choose **Deploy from a branch**, select `main` and `/ (root)`, and save.
3. After a minute the game is live at `https://<your-name>.github.io/<repo>/`.

GitHub Pages serves everything over HTTPS, which the phone needs for camera access. No server of your own is needed: the PeerJS cloud server handles only the handshake.

## How to play

1. Open the game on the TV or laptop and choose **Start → Level 1**.
2. Scan the QR code with the Android phone (Chrome), or open `controller.html` and type the code.
3. On the phone, tap **Start camera and connect** and allow the camera.
4. Prop the phone up near the screen, facing you, 2–3 metres away, so your head, shoulders and arms are visible.
5. On the TV, choose **Start level**. Point at the screen and hold still for a moment to calibrate.

After connecting, the phone asks how you want to play. You can switch at any time with **Change**:
- **Tilt:** point the phone at the TV like a remote. Tap **Fire** to shoot (hold it to keep firing at a target), **Reload** or flick the phone up to reload, **Center** if the circle drifts. Blaster, Net grenade and Shield buttons switch gear; **Menu** opens the in-game menu. Speed and Flip buttons adjust the feel.
- **Gamepad:** hold the phone sideways. Push the round d-pad on the left in any direction to move the circle: a small push moves it slowly, pushing to the edge moves it faster, and holding at the edge speeds up further. Fire and the other buttons are on the right.
- **Camera:** the motion controls described below.

**Moving the gamepad buttons:** press **Remap** at the top of the gamepad screen and drag any button or the d-pad to wherever you like; the buttons keep their functions. **Reset** restores the original layout, **Done** finishes. The layout is saved on the phone.

In the menus with Tilt or Gamepad: move the circle to a button and press **Fire**; **Menu** goes back.

Camera controls:
- **Aim:** move your aiming arm (right by default; change it in Options).
- **Fire the blaster:** hold the circle on a monster or a flying rock until the ring fills up.
- **Reload:** raise your other hand above your head.
- **Gadget belt:** move the circle onto the Gear button (bottom right; bottom left for left-handed players) and hold. The game slows down while the belt is open. Hold the circle on a gear item for 0.8 seconds to select it.
  - **Net grenade:** hold the circle still to throw. The net catches every monster in the dashed circle. The blaster comes back automatically after a throw. 3 per level (5 with the Grenade pouch).
  - **Shield:** blocks rocks and monster attacks. It breaks after 10 hits, the blaster comes back automatically, and the shield recharges after 20 seconds. Select the blaster in the belt to switch back at any time.
- **Pause:** make a time-out T with your forearms and hold it for a second, or hold the circle on the Menu button. In the pause menu, point at a button and hold to choose it.

Controls without the phone (for testing): mouse to aim, click to fire, right-click or `R` to reload, `G` opens the belt, `1` `2` `3` choose blaster, net grenade or shield, `Esc` or `P` pauses.

Prism and Vexa throw rocks from a distance. Shoot them down or block them with the shield.

After pressing Start, the intro video (`assets/intro.mp4`) plays full screen, followed by a warp transition to the world screen; Skip (or Enter / Fire on the phone) skips it.

Worlds and levels:

The game has 6 worlds (environments), each with **10 levels**. Levels 1–9 are regular levels; **level 10 ends with the world's boss** and is marked with a pulsing ⚠ BOSS sign. Each world has at most 3 kinds of aliens, and every level asks for **15 to 20 aliens** in total, spread over its kinds (the boss level: 15 plus the boss). Levels 1–2 have 2 kinds; later levels bring all 3 kinds, more catches and faster aliens.

| World | Aliens | Boss |
|---|---|---|
| Crystal Shores | Nebula, Prism, Solara | King Nebula |
| Glowwood Forest | Pulsar, Ember, Glide | Ember Lord |
| Sunken Lagoon | Nimbus, Splash, Echo | Tidequeen |
| Sunfire Dunes | Vexa, Solara, Prism | Prism Empress |
| Moonlit Cavern | Glide, Nebula, Echo | Echo Monarch |
| Starfall Wetlands | Orbita, Razor, Vortex | Vortex King |

The world cards are a **carousel**: 4–5 big cards are in view; swipe, scroll or use the ‹ › arrows for the rest.

A level can only be played when the level before it is cleared, and a world only opens when every level of the previous world is cleared. **Options → Unlock all levels** opens everything.

Every cleared level earns **1 to 3 stars**, based on health left (counts most), accuracy and time compared with the level's target time. The best result is kept, and the world card shows the stars collected (out of 30). The end screen gives a tip on how to get more stars, and **Next level** goes straight on.

World settings (background, aliens, boss) are in `LEVELS` at the top of `js/level.js`; how the 10 levels of a world get harder is in `GOALS` and `stageConfig`, and the star rules in `starRating`.

Every boss is a giant, crowned version of one of the level's monsters. Blaster hits fill 1 point of the boss bar, net grenades 4. Boss strength per level is the `hp` value in `LEVELS` in `js/level.js`.

## Star shop

The shop has two tabs. The **Star shop** sells special upgrades paid with the stars earned on levels: Golden blaster (3★), Rainbow lasers (2★), Crystal magnet (4★, 2 crystals per catch), Second chance (5★, once per level come back with 50% health) and Helper drone (8★) and Drone 2 (10★): two little drones that each fly around on their own and catch an alien for you every 10 seconds. They face you while idle and turn their back to you when they fire.

## Languages

Options → Language: English, Nederlands, Deutsch, Français, Español, Português. The phone follows the game's language. The alien guide's descriptions are still in English.

## Score, drops and the Workshop

- **Score:** every catch gives points (armoured aliens 250, normal 100, shiny ×5). Catches in quick succession build a **combo**: every 3 catches the multiplier goes up, up to ×5. Taking damage resets it. At the end of a level you get bonuses for no damage, accuracy and speed. The best score per level is kept and shown on the level map; a new best shows **New high score!**
- **Armoured aliens** (from level 3, more in later worlds) have a metal ring and hit-point pips and need several hits. Rare **shiny** golden aliens give 5× points and crystals and always drop rare materials.
- **Drops:** caught aliens sometimes drop materials: crystal shards (common), alien goo (rare) and star dust (epic). Every boss drops its own **trophy** (for example the Nebula Crown) plus a handful of materials. Drops are saved immediately.
- **Workshop** (button on the world screen): upgrade the **Blaster** (Mk 1–5: more damage, faster lock-on and firing; Mk 5 needs the Nebula Crown), the **Net grenade** (Mk 1–3: bigger net, more damage) and the **Shield** (Mk 1–3: blocks more hits), paid with crystals and materials. Costs are in `UPGRADES` in `js/app.js`.

## Home base

The **Home** button opens your base. Tap a building to build or upgrade it (crystals, materials, and for the top levels a boss trophy). Every level gives a permanent bonus:

| Building | Bonus |
|---|---|
| Alien sanctuary (5 levels) | Your caught aliens live here (shown floating inside) and make crystals every hour, even when you are not playing. Collect them with the button (or the +number badge on the building). More kinds of aliens discovered = more crystals. |
| Observatory (3) | More shiny aliens and more drops |
| Med bay (5) | Your health slowly comes back during levels |
| Lab (5) | Extra net grenades, a faster shield recharge, and an extra time grenade |
| Hangar (5) | Helper drones fire more often and hit harder |
| Workshop | Opens the Workshop (blaster, net grenade, shield upgrades) |
| Command center | Overview of all buildings and your base level |
| Crew quarters (3 levels) | +10% / +20% / +30% extra crystals after every level |

Built buildings glow gold, brighter with each level; unbuilt ones show a +. Costs are in `MODULES` in `js/app.js`.

## Boss phases

Every boss fights in **3 phases** (markers on its health bar, and a message when a new phase starts):

| Boss | Phase 2 | Phase 3 |
|---|---|---|
| King Nebula | Splits into 3 copies; only the real one has a twinkling star on its crown | Bubble shield with 3 glowing weak spots; pop them, then hit it for 5 seconds |
| Ember Lord | Walls of fire sweep over the screen after a warning: only the shield blocks them | Furious: moves faster, 5 fireballs at once |
| Tidequeen | Dives (can't be hit) and comes up elsewhere; charges a water beam that you stop by shooting the glowing orb | Also calls waves of helpers |
| Prism Empress | Numbered crystal shields: break them in order 1, 2, 3 (wrong order resets them). She also glows red now and then: shots bounce back at you | Crystals and red glows more often |
| Echo Monarch | Throws sound rings (shoot them down); the lights go out, you only see around your aiming circle | More sound rings |
| Vortex King | Spinning blades block your shots while they pass in front; tornado helpers | Faster blades, and its pull drags your aiming circle (not with a mouse) |

Settings per boss are in `BOSS_ATTACKS` and `PHASE_MSG` in `js/level.js`.

**Boss artwork:** King Nebula uses its own sheets: `assets/nebula_king.png` (5×4: idle, rock throw with red warning, splitting into copies, hurt/angry/bubble shield/dizzy) and `assets/nebula_king_fx.png` (5×3: rocks and rocks breaking, weak spots and popping, bubble shield popping). Other bosses still use their crowned alien sprite until their artwork is added to `BOSS_ART` in `js/level.js`.

## Accounts, cloud save and licences (Firebase)

Parents can make an account (Options → **Account**). Progress is then saved on the device *and* online, and can be continued on any other device by signing in there. Creating an account asks a small sum first ("grown-ups only"), and only the parent's email address is stored. If a device and the cloud both have different progress, the game asks once which one to keep. Settings like graphics and language stay per device.

### Switching it on (about 15 minutes, free)

1. Go to **console.firebase.google.com**, sign in with a Google account and click **Create a project** (name: Star Voyager). Google Analytics is not needed.
2. In the project: **Build → Authentication → Get started**, then under **Sign-in method** switch on **Email/Password**.
3. **Authentication → Settings → Authorized domains**: add your game's address, for example `yourname.github.io`.
4. **Build → Firestore Database → Create database**: choose a location close to your players (for Europe `eur3` or `europe-west`), start in **production mode**.
5. Firestore → **Rules**: replace everything with the contents of `firestore.rules` from the game folder, and press **Publish**. These rules make sure every account can only see its own progress, and that nobody can give themselves a licence.
6. **Project settings (gear icon) → General → Your apps → Web app (</>)**: register an app (name: Star Voyager, no hosting). Firebase shows a `firebaseConfig` with apiKey, authDomain, projectId, storageBucket, messagingSenderId and appId. Copy those six values into `firebase` in `js/config.js` and upload that file.

The free Spark plan is enough to start (50,000 monthly active users, 50,000 reads and 20,000 writes per day). The config values are not secret: they only identify your project; the rules in step 5 do the protecting.

### Licences

In `js/config.js`, `licensing.enabled: false` keeps the whole game open (as now). With `enabled: true`, players without a licence can only play the worlds in `freeWorlds` (Crystal Shores by default); the other world cards show **Full game** and lead to the Account screen.

A licence is a document in Firestore → collection `licenses` → document named after the player's **Account ID** (shown on the Account screen) with a field `full` = true (for ever) or `until` = a date (for example a school year). You can add one by hand in the Firebase console (for testers, schools, giveaways). Later a payment service (Paddle, Lemon Squeezy or Stripe) will do this automatically after a payment: set `licensing.buyUrl` to the payment page (it receives `?account=…&email=…`), and a small Firebase Cloud Function (needs the pay-as-you-go Blaze plan) receives the payment message and writes the licence.

## Performance settings (for TVs)

Options has four settings for slower devices:

- **Graphics:** Sharp 1920×1080 (with glow effects), Fast 1280×720, Low 960×540, Very low 640×360. Auto starts at Fast and steps down below 45 FPS.
- **Frame rate:** 60, or **30 (steady)**: the game then draws exactly every other screen refresh. On a 60 Hz TV, a steady 30 often feels smoother than an uneven 45.
- **Effects:** Full or **Reduced** (few sparkles, no screen shake, no bubbles, no moving glows and shadows over the game).
- **Unlock all** (Options) gives everything for testing (also every creature in the alien guide): all worlds and levels, all Workshop upgrades (incl. Armour suit Mk5), every crystal-shop item at its highest level and every star-shop item (both drones), all trophies, all abilities at level 3, all superpowers, every base building at its highest level (Med bay, Crew quarters, Hangar, Lab, Alien sanctuary, Observatory) and lots of crystals and materials. Switching it off brings back your real progress.
- **Show speed (FPS):** shows frames per second and a speed test: *logic* and *draw* are the milliseconds the game itself spends per frame, *slow* is the share of frames that came too late, *worst* the longest wait between two frames. If logic + draw are small (a few ms) but the FPS is still low, the TV's graphics chip or browser is the limit, not the game code.

The game also makes shrunk copies (60% and 35%) of the spritesheets once, and draws from the smallest copy that is still big enough; that saves weak devices a lot of work every frame without looking different.

## Shop levels

Three crystal-shop items can now be upgraded several times:

- **Bigger magazine** (8 levels): 8 → 12 → 18 → 24 → 30 → 36 → 42 → 48 → 50 shots.
- **Quick reload** (3 levels): half the reload time, then 20% less, then another 20% less (0.95 s → 0.48 → 0.38 → 0.30 s).
- **Steady aim** (3 levels): stronger aim help (+12% / +22% / +32%), and from level 2 a bigger hit area (+10% / +20%), which also works with aim help switched off.

## Armour suit (health)

A fourth Workshop upgrade: the **Armour suit** (Mk1–Mk5) raises your health from 100 up to 300 (+200%, three times as much). The health number in the HUD shows the real value; the bar still shows how full it is.

## Story cutscenes

`js/story.js` plays the story scenes: a picture with effects (`assets/story/`), and a modern dialogue box with a round portrait of whoever speaks (name in their colour; narration in italics without a portrait). Tap/click, Enter, Space or Fire shows the rest of a line at once, or goes to the next; **Skip** (or Escape) ends the scene.

- **After King Nebula** (every time he is beaten; Skip ends it straight away): he calms down, Orbit's scanner beam finds the glowing **Mark of Static** on his crown, the strange "new stars" glitch in the sky, and he hands over a purple crystal. Reward card: King Nebula becomes your **Champion**, a golden **statue** appears on your home base (Spacedome), and Nebula aliens move into your habitat. Then the usual end screen follows.
- **After the Ember Lord** (ruler of the crystal fire world **Sunfire Dunes**; the Prism Empress now rules Glowwood Forest): he crashes down in sparks, the Mark of Static fades from his chest under Orbit's scanner, a falling star streaks across the sky, and he tosses over a **Scorched Fragment** of metal. Reward: he becomes your Champion with a statue in the Spacedome, Ember aliens move into your habitat, and the fragment appears in the **Collection** in the Command center. His fights use his own artwork (`assets/ember_lord.png`, 5×3 frames: front, moving sideways, wind-up, spin attack, hurt).
- **Orbit**, the AI helper in the astronaut's helmet, has 9 designs (`assets/story/orbit.jpg`); players choose one in **Options → Orbit**.

New scenes are added to `SCENES` in `js/story.js`: a picture, a few positions on it (helmet, crown, boss), and the lines with their effects.

## Superpowers

A **super meter** fills while you play: every catch adds to it (more with a combo), and so does 10 seconds without getting hit. When it's full, the **Super button** glows: the round button under the health bar (click it or press **E**), the ★ SUPER button on the phone controller, or the star button above the d-pad in touch mode. Using it empties the meter.

Choose your superpowers in **Workshop → Abilities → Superpowers**: one in your **left hand** and one in your **right hand** (4 big cards per page). Both hands share the same meter: when it is full, use either one — left with **Q** / ★ Left, right with **E** / ★ Right (two round buttons under the health meter; two star buttons on the touch gamepad and the phone controller).

| Superpower | Effect | Unlocked by |
|---|---|---|
| Shockwave | All aliens are blasted far back; every flying rock is smashed | from the start |
| Star Barrier | 8 seconds: nothing gets through (rocks, fire walls, beams, reflected shots) | beating King Nebula |
| Mind Swirl | 8 seconds: aliens get dizzy, stop attacking and catch each other | beating the Ember Lord |
| Black Hole | A black hole pulls all aliens into one spot; one shot at the bunch catches them all | beating the Tidequeen |
| Frost Nova | 5 seconds: every alien freezes and is caught with one hit (even armoured ones); a boss is only slowed down | beating the Prism Empress |
| Overdrive | 6 seconds: the blaster fires by itself at whatever is under the circle, no reloading, double damage | beating the Echo Monarch |
| Meteor Shower | 5 seconds of crystal meteors that catch aliens where they land (and hit a boss a little) | beating the Vortex King |
| Healing Aurora | 40% health back at once, then a slow heal for 10 seconds | collecting 60 stars |

Icons are in `assets/supers.png` (8 icons side by side); settings in `SUPERS` in `js/level.js` and `SUPER_INFO` in `js/app.js`.

## HUD

The health meter is a slim glowing bar with the number above it (for example 220/300); a white trail shows what you just lost, and it turns red and the heart beats below 30%. On the level-clear screen, drops are shown as icons with the amount underneath.

## Region abilities

Every world has its own **material** that only drops there (and in Endless waves in that world): Nebula mist, Ember sparks, Lagoon shells, Prism glass, Echo crystals and Vortex dust. Armoured and shiny aliens drop more, and bosses drop 4.

With that material and the world's **boss trophy** you build two abilities in the world's theme (3 levels each) in the **Abilities** screen (Workshop → Abilities, or Home base → Hangar → Drone abilities). Your **loadout** is one weapon mod and one drone ability (Equip).

| World | Drone ability | Weapon mod |
|---|---|---|
| Crystal Shores | Mirror drones: hologram copies confuse aliens (they wobble with a "?" and stop throwing) | Bubble shot: armoured aliens you hit float in a bubble and can't move or throw |
| Glowwood Forest | Flare drone: a fan of sparks also hits other aliens | Ember rounds: armoured aliens burn and lose extra armour; the flame jumps to a neighbour |
| Sunken Lagoon | Wave drone: pushes all aliens back and washes away rocks | Whirlpool net: the net leaves a whirlpool that keeps catching |
| Sunfire Dunes | Prism drone: strips the armour off armoured aliens | Prism shield: blocked rocks bounce back at an alien |
| Moonlit Cavern | Sonar drone: stuns nearby aliens and lights up the dark | Homing shot: bigger hit area for your shots |
| Starfall Wetlands | Blade drone: destroys rocks flying at you | Vortex net: a much bigger net |

Drone abilities need a helper drone from the Star shop. Settings are in `MODS` in `js/app.js` and in the region-abilities section of `js/level.js`.

## Goals: achievements and missions

The **Goals** button on the world screen (a gold dot shows when a reward is ready) opens:

- **Daily missions** (3, new every day) and **weekly missions** (3, new every Monday), such as "Catch 40 aliens", "Reach a combo of 8" or "Catch 1 bosses". Finished missions give crystals and materials with **Claim**.
- **22 achievements** that unlock once, each with a reward: catching aliens, shiny and armoured aliens, combos, bosses (also without taking damage), stars, score, base level, upgrades, the alien guide and Endless waves.

Missions are in `MISSIONS`, achievements in `ACHIEVEMENTS` in `js/app.js`.

## Endless mode

The **Endless** card (opens after clearing Crystal Shores) is survival: wave after wave, each bigger and faster. Every 5 waves the world changes (background and aliens), and every 5th wave is that world's boss, with its phases. Every new wave heals 10%. The best wave and score are shown on the card.

## Time grenades

Buy **Time grenades** in the shop (2 per level, or 4 with the Time grenade pouch). Throw one like a net grenade: everything (aliens, rocks and the boss) moves at a quarter of its speed for 3 seconds. Choose it on the gear belt, with the **Time** button on the phone, or key `4`.

## Casting to Google TV, Android TV and Chromecast

The phone page has a **Start on the TV** button: it opens the game on the TV and connects the phone automatically, without scanning a QR code. It works from Chrome on Android phones, on TVs and devices with Google Cast built in. It stays hidden until you have set up a Cast App ID:

1. Go to the Google Cast SDK Developer Console (cast.google.com/publish), sign in and pay the one-time registration fee.
2. Click **Add New Application** → **Custom Receiver**. Name: Star Voyager. Receiver Application URL: your game address followed by `index.html?cast=1`, for example `https://yourname.github.io/star-voyager/index.html?cast=1`.
3. Copy the **Application ID** you get and paste it in `js/config.js` between the quotes of `castAppId`. Upload `js/config.js` to GitHub.
4. While the app is not yet published, only registered devices can open it: under **Devices**, add your Google TV / Chromecast with its serial number (on Google TV: Settings → System → About). It can take about 15 minutes, and restarting the TV helps.
5. Open `controller.html` on the phone (same Wi-Fi as the TV) and press **Start on the TV**.
6. When everything works, press **Publish** in the console so every Cast device can use it.

Amazon Fire TV does not support Google Cast; for Fire TV the route is an app in the Amazon Appstore.

## Planet choice

After Start and the intro, the **Choose your planet** screen appears on the space background (`assets/space.jpg`). Planets spin slowly (their 12 frames blend into each other, with a gentle sway): **Novara** (`assets/planet1.png`) holds all current worlds and shows "6 worlds · 13 aliens · 6 bosses" and its stars; **Cindera** (`assets/planet2.png`) can be visited: its world screen shows its first three worlds, Glimmer Coast (`assets/cindera1.jpg`) Emberfall Rift (`assets/cindera2.jpg`) and Thunder Spires (`assets/cindera3.jpg`), as *Soon available* (no aliens yet). **Prismara** (`assets/planet3.png`) and **Tetra** (`assets/planet4.png`, 16 frames) are shown as *Coming soon*. The planets sit on a **carousel**: three in view (the chosen one large in the middle), turned with the ‹ › arrows, by swiping, with the left/right keys, or by tapping a planet at the side. After the intro the screen fades through dark into the planets (the intro's sound fades out too), and choosing a planet zooms into it and fades via its glow into the worlds, which come into focus with the cards rising one after another. Tapping anywhere during the intro skips it. Planets are listed in `PLANETS` in `js/app.js`.

The buttons on this screen: **Back** (title screen), **Home** (base), **Continue** (straight to the next level to play, with its world and number shown on the button), **Goals**, **Shop** and **Options**. Choosing Novara zooms into it and opens the world screen (which keeps Workshop, Alien guide and Connect phone).

## Planet Cindera: Glimmer Coast

Cindera's first world, **Glimmer Coast** (world 10, `assets/cindera1.jpg`), has ten levels with the **Lavaclaw** (`assets/lavaclaw.png`, 5×3 frames). The Lavaclaw cannot fly: it walks over the ground toward you with a heavy stomping step, raises rocks before it throws them, and swipes with its tail when it reaches you. Level 10 is the **Lavaclaw Titan**: it stands on the ground, roars when its phase changes, sends lava waves in phase 2 (shield up!) and gets furious in phase 3. Glimmer Coast opens after Starfall Wetlands (the last world of Novara). Emberfall Rift and Thunder Spires stay *Soon available*.

The **alien guide** has a page per planet; the Cindera page has 20 creatures (card images in `assets/dex/`, cut from the Cindera roster). The Lavaclaw can already be caught; the others come with the next worlds.

## Gamepad and mouse

- **Sticky aim with a gamepad** (phone gamepad and touch gamepad): near an alien, rock or boss part the aiming circle locks onto it like a magnet and stays on it while it moves, until you steer clearly away; the hit area is also bigger.
- **Rotating crystals and weak spots** (Prism Empress, King Nebula) turn **half as fast** when someone plays with a gamepad.
- **Web version: switch any time.** While playing with the mouse, using the phone gamepad switches to it; moving or clicking the mouse switches back.

## Expand mode (wide screens)

The game is always 1080 units high, and as wide as the screen's shape: 1920 on a 16:9 TV, about 2376 on a wide phone (up to 2600). On wider screens you simply see more of the world: the backgrounds fill the full width, aliens also appear at the sides, and the HUD and touch buttons stay at the screen edges. Screens with buttons drawn in the picture (the title screen and the home base) keep their picture in the middle and show a blurred copy of it at the sides. In the Android app the game also uses the strip beside the camera notch, while keeping the HUD and buttons clear of it. In touch mode, menus, world cards, level buttons and options are shown larger for phone screens.

## Touch mode (on-screen gamepad)

In the Android app (and in a browser with `?touch=1` after the address) the game has its own gamepad on the screen, so no phone controller, no QR code and one player: a d-pad on the left moves the aiming circle, the big **FIRE** button on the right shoots, and the small buttons around it switch to the blaster, net grenade, time grenade (once bought) and shield, and reload. Menus work by tapping. **Options → Touch buttons** lets you drag every button to another place (Reset puts them back).

## Android app (APK)

`star-voyager.apk` contains the whole game, so it can be installed on an Android phone or tablet (Android 5 or newer) without a browser. It needs an internet connection only for connecting phones.

- Play on the phone itself by tapping on aliens (the "Play with mouse" way), or connect a controller phone.
- The app has an extra button on the title screen, **Use as controller**: this turns the phone into a controller for a game running on a TV or laptop (enter the code shown there).
- Inside the app the QR code can't point to the app itself. Put your online address in `publicUrl` in `js/config.js` (for example `https://yourname.github.io/star-voyager/`) and rebuild the app, and the QR code will point other phones to the online controller page.
- The phone's back button works like Escape; on the title screen it closes the app.
- Keep the signing key (`starvoyager.keystore` and its password) safe: every update of the app must be signed with the same key, otherwise Android refuses to install it over the old version.

## Two players

A second phone can scan the same QR code (or enter the same code) at any time, even in the middle of a level. It becomes **Player 2** and gets its own gun: Player 1's gun moves to the left and Player 2's (mirrored) gun to the right, at the same distance from the centre. Each player has their own aiming circle (P1 cyan, P2 gold), ammo, net grenades and shield; Player 1's gear button is bottom left, Player 2's bottom right. Health and the monsters to catch are shared. Each phone chooses its own way to play (tilt, gamepad or camera). Player 1 controls the menus. A third phone is told the game is full.

## Alien guide

Open it from the level select screen. All 20 aliens are shown as silhouettes until you catch one for the first time; then the full card appears with a "New" badge. Select a card (click, or with the phone point at it and hold for 1 second) to read about the alien. Alien names, facts and which level they appear in are in `js/dex.js`. The card images are in `assets/dex/` (`<id>.png` and `<id>-locked.png` for the silhouette).

## Tuning

Levels (background, monsters, goal) are defined in `LEVELS` at the top of `js/level.js`.


Most gameplay numbers are at the top of `js/level.js` and in its `spawn`, `updateSpawning` and `start` functions:
- `DWELL_TIME` — how long to hold the circle on a monster before firing
- `DAMAGE` — health lost per attack
- `speed` per monster in `SPR` — seconds a monster takes to reach you
- `maxAlive` and `spawnTimer` in `updateSpawning` — how many monsters and how often
- `GUN_ORDER` — which gun frame is used from left to right
- `BELT`, `NET_R`, `GRENADE_STILL`, `SHIELD_MAX`, `SHIELD_RECHARGE`, `T_HOLD`, `MENU_DWELL` — gadget belt, net grenade, shield and pause timings
- `thrower: true` in `SPR` — which monsters throw rocks

Aim range is set in `Input.onPose` (the `1.9` and `1.5` values); the Options sensitivity slider scales it.

## Notes

- **TV browsers:** choose Graphics → Fast (the default) for TVs. It draws at 1280×720 and scales up.
- **Latency:** turn on the TV's Game Mode; TV picture processing often adds more delay than the network.
- **Heat and battery:** the phone runs the lightest pose model. Battery saver (15 fps) on the phone reduces heat further.
- **Networks:** phone and game connect directly on the same Wi-Fi. On guest networks with device isolation the direct connection can fail; adding a TURN server to both `new Peer(...)` calls fixes this.
- Progress, crystals, upgrades and options are saved in the browser (localStorage).
