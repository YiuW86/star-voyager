# Star Voyager (MVP)

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

Controls with the phone:
- **Aim:** move your aiming arm (right by default; change it in Options).
- **Fire the blaster:** hold the circle on a monster or a flying rock until the ring fills up.
- **Reload:** raise your other hand above your head.
- **Gadget belt:** move the circle onto the Gear button (bottom right; bottom left for left-handed players) and hold. The game slows down while the belt is open. Hold the circle on a gear item for 0.8 seconds to select it.
  - **Net grenade:** hold the circle still to throw. The net catches every monster in the dashed circle. The blaster comes back automatically after a throw. 3 per level (5 with the Grenade pouch).
  - **Shield:** blocks rocks and monster attacks. It breaks after 10 hits, the blaster comes back automatically, and the shield recharges after 20 seconds. Select the blaster in the belt to switch back at any time.
- **Pause:** make a time-out T with your forearms and hold it for a second, or hold the circle on the Menu button. In the pause menu, point at a button and hold to choose it.

Controls without the phone (for testing): mouse to aim, click to fire, right-click or `R` to reload, `G` opens the belt, `1` `2` `3` choose blaster, net grenade or shield, `Esc` or `P` pauses.

Prism and Vexa throw rocks from a distance. Shoot them down or block them with the shield.

Goal: catch 10 each of Nebula, Prism, Solara, Glide and Vexa. Each monster that reaches you costs 5% health.

## Alien guide

Open it from the level select screen. All 20 aliens are shown as silhouettes until you catch one for the first time; then the full card appears with a "New" badge. Select a card (click, or with the phone point at it and hold for 1 second) to read about the alien. Alien names, facts and which level they appear in are in `js/dex.js`. The card images are in `assets/dex/` (`<id>.png` and `<id>-locked.png` for the silhouette).

## Tuning

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
