// Phone controller with three ways to play:
//  - cam:  camera body tracking (sends body points, no video)
//  - pad:  touch gamepad (joystick + buttons)
//  - tilt: point the phone at the TV like a remote (motion sensors + buttons)
// Everything goes straight to the game over a WebRTC data channel.

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

let mode = null;
let peer = null, conn = null, retryTimer = null, wantConnection = false;
let wakeLock = null;

// ---------------- Screens ----------------
function show(id) {
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

function setConn(state, text) {
  $$('[data-conn-dot]').forEach((d) => { d.className = 'dot' + (state ? ' ' + state : ''); });
  $$('[data-conn-text]').forEach((t) => { t.textContent = text; });
}

// ---------------- Connection ----------------
const params = new URLSearchParams(location.search);
$('code').value = (params.get('room') || '').toUpperCase();

function connect() {
  const code = $('code').value.trim().toLowerCase();
  if (!code) { setConn('bad', 'Enter the code shown on the TV'); return; }
  if (typeof Peer === 'undefined') { setConn('bad', 'Could not load the connection library. Check your internet.'); return; }
  wantConnection = true;
  clearTimeout(retryTimer);
  setConn('wait', 'Connecting…');
  if (!peer || peer.destroyed) {
    peer = new Peer({ debug: 1 });
    peer.on('open', () => openConn(code));
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') setConn('bad', 'No game found with this code. Check the code on the TV.');
      else setConn('bad', 'Connection problem: ' + err.type);
      scheduleRetry();
    });
  } else if (peer.open) {
    openConn(code);
  }
}

function openConn(code) {
  if (conn) conn.close();
  conn = peer.connect('sv-' + code, { reliable: false, serialization: 'json' });
  conn.on('open', () => {
    setConn('on', 'Connected to the game');
    keepAwake();
    if (!mode) show('s-modes');
    else send({ m: 'hello', mode });
  });
  conn.on('data', (d) => {
    if (!d) return;
    if (d.m === 'welcome') {
      if (d.lang && window.I18N) { I18N.setLang(d.lang); I18N.watch(); }
      $$('[data-badge]').forEach((b) => { b.textContent = 'Player ' + d.player; b.classList.remove('hidden'); b.classList.toggle('p2', d.player === 2); });
    }
    if (d.m === 'layout' && LAYOUTS[d.mode]) {
      layout = d.mode;
      applyPadMap();
      if (mode === 'tilt' || mode === 'cam') {
        const note = layout === 'plat' ? 'The extra level is a platformer: choose Gamepad to play it.' : '';
        if (note) setConn('on', note);
      }
    }
    if (d.m === 'full') {
      wantConnection = false;
      setConn('bad', 'This game already has 2 players.');
      show('s-connect');
    }
  });
  conn.on('close', () => { if (wantConnection) { setConn('bad', 'Disconnected. Reconnecting…'); scheduleRetry(); } });
  conn.on('error', () => scheduleRetry());
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { if (wantConnection) connect(); }, 2500);
}

function send(msg) {
  if (!conn || !conn.open) return;
  const dc = conn.dataChannel;
  if (dc && dc.bufferedAmount > 32 * 1024) return;   // skip instead of building up delay
  conn.send(msg);
}

$('connect').addEventListener('click', connect);
$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') connect(); });

// ---------------- Choosing a mode ----------------
let lastMode = null;
try { lastMode = localStorage.getItem('sv-mode'); } catch (e) {}
if (lastMode) { const b = document.querySelector(`.mode[data-mode="${lastMode}"]`); if (b) b.classList.add('last'); }

$$('.mode').forEach((b) => b.addEventListener('click', () => chooseMode(b.dataset.mode)));
$$('[data-change]').forEach((b) => b.addEventListener('click', () => { stopMode(); show('s-modes'); }));

async function chooseMode(m) {
  stopMode();
  mode = m;
  try { localStorage.setItem('sv-mode', m); } catch (e) {}
  send({ m: 'hello', mode: m });
  keepAwake();
  if (m === 'cam') { show('s-cam'); startCamera(); }
  if (m === 'pad') { show('s-pad'); landscapeMode(); startPointerLoop(); setTimeout(applyPadPos, 300); }
  if (m === 'tilt') { show('s-tilt'); await startTilt(); startPointerLoop(); }
}

function stopMode() {
  if (mode === 'pad') { leaveLandscape(); setRemapping(false); }
  stopCamera();
  stopTilt();
  pointerRunning = false;
  fireHeld = false;
  mode = null;
}

// ---------------- Buttons (gamepad and tilt) ----------------
// Each press increases a counter. The game compares counters, so a lost message never loses a press.
const session = Math.random().toString(36).slice(2, 8);
const counters = { fire: 0, reload: 0, gun: 0, grenade: 0, shield: 0, time: 0, menu: 0, jump: 0 };
let fireHeld = false, jumpHeld = false, runHeld = false;

function press(name) {
  counters[name]++;
  if (navigator.vibrate) navigator.vibrate(name === 'fire' ? 12 : 20);
}

$$('[data-press]').forEach((b) => {
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (remapping && b.dataset.slot) { startDrag(b, e); return; }   // remap mode: drag the button somewhere else
    const name = b.dataset.press;
    b.classList.add('down');
    if (name !== 'run') press(name);
    if (name === 'fire') fireHeld = true;
    if (name === 'jump') jumpHeld = true;
    if (name === 'run') runHeld = true;
  });
  const up = () => {
    b.classList.remove('down');
    const name = b.dataset.press;
    if (name === 'fire') fireHeld = false;
    if (name === 'jump') jumpHeld = false;
    if (name === 'run') runHeld = false;
  };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
});

// ---------------- Gamepad layouts and moving buttons ----------------
// Each gamepad button is a "slot". The game decides which layout is shown:
// 'normal' for the shooter levels, 'plat' for the platformer level (Jump, Blast, Run).
// Remap lets you drag every button (and the d-pad) to wherever you like; its function stays the same.
const ACTIONS = { fire: 'FIRE', reload: 'Reload', menu: 'Menu', gun: 'Blaster', grenade: 'Net grenade', shield: 'Shield', time: 'Time grenade', jump: 'JUMP', run: 'Run', blast: 'Blast' };
const LAYOUTS = {
  normal: { s1: 'reload', s2: 'menu', s3: 'gun', s4: 'fire', s5: 'grenade', s6: 'shield', s7: 'time' },
  plat:   { s1: 'fire', s2: 'menu', s3: 'run', s4: 'jump', s5: null, s6: null, s7: null },
};
let layout = 'normal', remapping = false;
let padPos = {};      // slot or 'dpad' -> { x, y } centre as a fraction of the gamepad area, plus w, h in px
try { padPos = JSON.parse(localStorage.getItem('sv-padpos') || '{}') || {}; } catch (e) { padPos = {}; }
function savePadPos() { try { localStorage.setItem('sv-padpos', JSON.stringify(padPos)); } catch (e) {} }

function applyPadMap() {
  const map = LAYOUTS[layout];
  $$('#s-pad [data-slot]').forEach((b) => {
    const action = map[b.dataset.slot];
    b.classList.toggle('hidden', !action);
    if (!action) return;
    b.dataset.press = action;
    const label = layout === 'plat' && action === 'fire' ? 'Blast' : ACTIONS[action];
    const [first, ...rest] = label.split(' ');
    b.innerHTML = rest.length ? `${first}<small>${rest.join(' ')}</small>` : label;
    b.classList.toggle('grenade', action === 'grenade');
    b.classList.toggle('shield', action === 'shield');
    b.classList.toggle('time', action === 'time');
  });
  applyPadPos();
}

// Free positions: once anything has been moved, every piece is placed absolutely
const padArea = () => document.querySelector('#s-pad .pad-main');
const movables = () => [...$$('#s-pad [data-slot]'), $('stick-zone')];
const keyOf = (el) => el.dataset.slot || 'dpad';
// Where pieces go in a free layout if they were never moved (e.g. buttons hidden while you rearranged)
const PAD_DEFAULT_POS = {
  dpad: { x: 0.22, y: 0.52, w: 230, h: 230 }, s4: { x: 0.76, y: 0.52, w: 170, h: 170 },
  s1: { x: 0.6, y: 0.1, w: 120, h: 56 }, s2: { x: 0.76, y: 0.1, w: 120, h: 56 }, s3: { x: 0.92, y: 0.1, w: 120, h: 56 },
  s5: { x: 0.6, y: 0.92, w: 120, h: 56 }, s6: { x: 0.76, y: 0.92, w: 120, h: 56 }, s7: { x: 0.92, y: 0.92, w: 120, h: 56 },
};
function applyPadPos() {
  const custom = Object.keys(padPos).length > 0;
  padArea().classList.toggle('custom', custom);
  for (const el of movables()) {
    const p = padPos[keyOf(el)] || (custom ? PAD_DEFAULT_POS[keyOf(el)] : null);
    if (custom && p) {
      el.style.left = (p.x * 100) + '%'; el.style.top = (p.y * 100) + '%';
      el.style.width = p.w + 'px'; el.style.height = p.h + 'px';
    } else { el.style.left = el.style.top = el.style.width = el.style.height = ''; }
  }
}
// Take a snapshot of the current (grid) layout so pieces can be dragged from where they are
function freezePositions() {
  const area = padArea().getBoundingClientRect();
  if (!area.width) return;
  for (const el of movables()) {
    if (padPos[keyOf(el)]) continue;
    // the d-pad's area is only as big as the d-pad itself (plus a little margin)
    const r = el.id === 'stick-zone' ? (() => { const d = $('dpad').getBoundingClientRect(); const m = 14; return { left: d.left - m, top: d.top - m, width: d.width + 2 * m, height: d.height + 2 * m }; })() : el.getBoundingClientRect();
    if (!r.width) continue;
    padPos[keyOf(el)] = { x: (r.left + r.width / 2 - area.left) / area.width, y: (r.top + r.height / 2 - area.top) / area.height, w: Math.round(r.width), h: Math.round(r.height) };
  }
}
let drag = null;
function startDrag(el, e) {
  freezePositions(); savePadPos(); applyPadPos();
  drag = { el, id: e.pointerId };
  try { el.setPointerCapture(e.pointerId); } catch (err) {}
  el.classList.add('dragging');
}
document.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const area = padArea().getBoundingClientRect();
  const p = padPos[keyOf(drag.el)];
  p.x = clamp((e.clientX - area.left) / area.width, 0.03, 0.97);
  p.y = clamp((e.clientY - area.top) / area.height, 0.03, 0.97);
  drag.el.style.left = (p.x * 100) + '%'; drag.el.style.top = (p.y * 100) + '%';
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag.el.classList.remove('dragging'); drag = null; savePadPos(); } };
document.addEventListener('pointerup', endDrag);
document.addEventListener('pointercancel', endDrag);

function setRemapping(on) {
  remapping = on;
  document.body.classList.toggle('remapping', on);
  $('remap-bar').classList.toggle('hidden', !on);
  $('remap').textContent = on ? 'Moving…' : 'Remap';
}
$('remap').addEventListener('click', () => setRemapping(!remapping));
$('remap-done').addEventListener('click', () => setRemapping(false));
$('remap-reset').addEventListener('click', () => { padPos = {}; savePadPos(); applyPadPos(); });
addEventListener('resize', () => applyPadPos());
applyPadMap();

// ---------------- Pointer loop: sends aim position + buttons ----------------
const aim = { x: 0.5, y: 0.5 };
let pointerRunning = false, lastSend = 0, lastFrame = 0;

function startPointerLoop() {
  if (pointerRunning) return;
  pointerRunning = true;
  lastFrame = performance.now();
  requestAnimationFrame(pointerLoop);
}

function pointerLoop(now) {
  if (!pointerRunning) return;
  const dt = Math.min(0.05, (now - lastFrame) / 1000);
  lastFrame = now;
  if (mode === 'pad') updateStick(dt);
  if (now - lastSend >= 15) {          // about 60 messages per second
    lastSend = now;
    send({ t: Date.now(), m: mode, s: session, x: +aim.x.toFixed(4), y: +aim.y.toFixed(4), hold: fireHeld, c: counters,
      sx: +stick.x.toFixed(3), sy: +stick.y.toFixed(3), jh: jumpHeld, rh: runHeld });
  }
  requestAnimationFrame(pointerLoop);
}

// ---------------- Gamepad: fixed 360° d-pad ----------------
// The d-pad stays in one place. Pushing it moves the aiming circle: a small push moves it slowly
// (for precise aiming), pushing to the edge moves it faster, and holding at the edge speeds up further.
const zone = $('stick-zone'), dpad = $('dpad'), knob = $('stick-knob');
const stick = { id: null, x: 0, y: 0, edgeT: 0 };

function stickFrom(e) {
  const r = dpad.getBoundingClientRect();
  const R = r.width / 2;
  let dx = e.clientX - (r.left + R), dy = e.clientY - (r.top + R);
  const len = Math.hypot(dx, dy), max = R * 0.62;
  if (len > max) { dx *= max / len; dy *= max / len; }
  stick.x = dx / max; stick.y = dy / max;
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
zone.addEventListener('pointerdown', (e) => {
  if (remapping) { e.preventDefault(); startDrag(zone, e); return; }
  if (stick.id !== null) return;
  e.preventDefault();
  try { zone.setPointerCapture(e.pointerId); } catch (err) {}
  stick.id = e.pointerId;
  stickFrom(e);
});
zone.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) stickFrom(e); });
const stickEnd = (e) => {
  if (e.pointerId !== stick.id) return;
  stick.id = null; stick.x = 0; stick.y = 0; stick.edgeT = 0;
  knob.style.transform = 'translate(-50%, -50%)';
};
zone.addEventListener('pointerup', stickEnd);
zone.addEventListener('pointercancel', stickEnd);

function updateStick(dt) {
  const mag = Math.min(1, Math.hypot(stick.x, stick.y));
  const DEAD = 0.14;
  if (mag < DEAD) { stick.edgeT = 0; return; }
  const m = (mag - DEAD) / (1 - DEAD);
  // Holding the d-pad near the edge for a moment speeds the circle up, for crossing the screen
  stick.edgeT = m > 0.9 ? stick.edgeT + dt : 0;
  const boost = 1 + Math.min(0.8, Math.max(0, stick.edgeT - 0.35) * 1.4);
  const speed = 0.6 * Math.pow(m, 2.4) * boost;           // screen widths per second
  aim.x = clamp(aim.x + (stick.x / mag) * speed * dt, 0, 1);
  aim.y = clamp(aim.y + (stick.y / mag) * speed * dt * (16 / 9), 0, 1);
}

// Gamepad works in landscape: go full screen and turn sideways where the phone allows it
let wentFullscreen = false;
async function landscapeMode() {
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      wentFullscreen = true;
    }
    if (screen.orientation && screen.orientation.lock) await screen.orientation.lock('landscape');
  } catch (e) { /* not supported (e.g. iPhone): the "turn your phone" hint is shown instead */ }
}
function leaveLandscape() {
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch (e) {}
  if (wentFullscreen && document.fullscreenElement) { document.exitFullscreen().catch(() => {}); }
  wentFullscreen = false;
}

// ---------------- Tilt: point the phone like a remote ----------------
// Uses the gyroscope: turning the phone left/right moves the circle sideways, tilting it up/down moves it vertically.
// Works whether the phone is held flat (screen up) or upright: "sideways" is measured around the real vertical axis.
const tilt = { raw: { x: 0.5, y: 0.5 }, speed: 4, flipX: false, flipY: false, up: [0, 0, 1], lastFlick: 0, on: false, gotData: false };
try {
  const saved = JSON.parse(localStorage.getItem('sv-tilt') || '{}');
  ['speed', 'flipX', 'flipY'].forEach((k) => { if (k in saved) tilt[k] = saved[k]; });
} catch (e) {}
function saveTilt() { try { localStorage.setItem('sv-tilt', JSON.stringify({ speed: tilt.speed, flipX: tilt.flipX, flipY: tilt.flipY })); } catch (e) {} }
function tiltLabel() { $('tilt-speed').textContent = tilt.speed; }
tiltLabel();

async function startTilt() {
  $('tilt-msg').textContent = 'Point the phone at the TV and press Center.';
  if (typeof DeviceMotionEvent === 'undefined') { $('tilt-msg').textContent = 'This phone has no motion sensor support. Use Gamepad instead.'; return; }
  // iPhone asks permission for motion sensors; Android allows it straight away
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const res = await DeviceMotionEvent.requestPermission();
      if (res !== 'granted') { $('tilt-msg').textContent = 'Motion access was not allowed. Allow it in your browser settings, or use Gamepad.'; return; }
    } catch (e) { $('tilt-msg').textContent = 'Tap Change and choose Tilt again to allow motion access.'; return; }
  }
  tilt.on = true; tilt.gotData = false;
  aim.x = 0.5; aim.y = 0.5; tilt.raw = { x: 0.5, y: 0.5 };
  window.addEventListener('devicemotion', onMotion);
  setTimeout(() => { if (tilt.on && !tilt.gotData) $('tilt-msg').textContent = 'No motion data from this phone. Use Gamepad instead, or try Chrome.'; }, 2000);
}

function stopTilt() {
  tilt.on = false;
  window.removeEventListener('devicemotion', onMotion);
}

function onMotion(e) {
  if (!tilt.on) return;
  const g = e.accelerationIncludingGravity;
  if (g && g.x != null) {
    const n = Math.hypot(g.x, g.y, g.z) || 1;
    const gv = [g.x / n, g.y / n, g.z / n];
    // Slowly follow gravity: which way is "up" for the phone right now
    for (let i = 0; i < 3; i++) tilt.up[i] += (gv[i] - tilt.up[i]) * 0.1;
  }
  const r = e.rotationRate;
  if (!r || r.alpha == null) return;
  if (!tilt.gotData) { tilt.gotData = true; $('tilt-msg').textContent = 'Point and shoot! Press Center if the circle drifts.'; }
  let dt = e.interval || 16;
  if (dt > 1) dt /= 1000;                                            // most browsers report milliseconds, some seconds
  dt = Math.min(dt, 0.05);
  const wx = r.beta || 0, wy = r.gamma || 0, wz = r.alpha || 0;     // degrees per second around the phone's x, y, z axes
  const u = tilt.up, un = Math.hypot(u[0], u[1], u[2]) || 1;
  let yaw = (wx * u[0] + wy * u[1] + wz * u[2]) / un;               // turning left/right
  let pitch = wx;                                                    // tilting up/down
  // Flick the phone up quickly to reload
  const now = performance.now();
  if (pitch > 320 && now - tilt.lastFlick > 800) { tilt.lastFlick = now; press('reload'); return; }
  if (now - tilt.lastFlick < 350) return;                             // don't let the flick move the aim
  // Ignore tiny rotations so the circle stays still when your hand is still
  const dead = 2.5;
  yaw = Math.abs(yaw) < dead ? 0 : yaw - Math.sign(yaw) * dead;
  pitch = Math.abs(pitch) < dead ? 0 : pitch - Math.sign(pitch) * dead;
  // Like a computer mouse: slow turns move the circle less (precise), quick turns move it more
  const rate = Math.hypot(yaw, pitch);
  const accel = 0.4 + 0.6 * Math.min(1, rate / 90);
  const k = (0.006 + tilt.speed * 0.0022) * accel;
  tilt.raw.x = clamp(tilt.raw.x + (tilt.flipX ? 1 : -1) * yaw * dt * k, 0, 1);
  tilt.raw.y = clamp(tilt.raw.y + (tilt.flipY ? 1 : -1) * pitch * dt * k * (16 / 9), 0, 1);
  // A little smoothing takes out hand tremble
  aim.x += (tilt.raw.x - aim.x) * 0.5;
  aim.y += (tilt.raw.y - aim.y) * 0.5;
}

$('recenter').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  aim.x = 0.5; aim.y = 0.5; tilt.raw = { x: 0.5, y: 0.5 };
  if (navigator.vibrate) navigator.vibrate(20);
});
$('tilt-slower').addEventListener('click', () => { tilt.speed = Math.max(1, tilt.speed - 1); tiltLabel(); saveTilt(); });
$('tilt-faster').addEventListener('click', () => { tilt.speed = Math.min(10, tilt.speed + 1); tiltLabel(); saveTilt(); });
$('tilt-flipx').addEventListener('click', () => { tilt.flipX = !tilt.flipX; saveTilt(); });
$('tilt-flipy').addEventListener('click', () => { tilt.flipY = !tilt.flipY; saveTilt(); });

// ---------------- Camera mode ----------------
const VISION = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
// Standard = lite model (fast, cool phone). High = full model (more precise, warmer phone).
const MODELS = {
  standard: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  high: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
};
// Landmarks sent to the game: nose, left/right shoulder, left/right elbow, left/right wrist
const KEEP = [0, 11, 12, 13, 14, 15, 16];
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];

const video = $('video'), overlay = $('overlay'), octx = overlay.getContext('2d');
let vision = null, landmarker = null, stream = null, facing = 'user';
let camRunning = false, saver = false, lastRun = 0, frames = 0, fpsT = performance.now();
let quality = 'standard';
try { quality = localStorage.getItem('sv-quality') || 'standard'; } catch (e) {}

function setTrack(state, text) {
  $('dot-track').className = 'dot' + (state ? ' ' + state : '');
  $('txt-track').textContent = text;
}

async function openCamera() {
  if (stream) stream.getTracks().forEach((t) => t.stop());
  stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
  });
  video.srcObject = stream;
  await video.play();
  overlay.width = video.videoWidth; overlay.height = video.videoHeight;
  $('preview').classList.toggle('mirror', facing === 'user');
  $('empty').classList.add('hidden');
}

async function loadModel() {
  setTrack('wait', 'Loading pose tracker…');
  // Only loaded when camera mode is chosen, so gamepad and tilt start instantly
  if (!vision) vision = await import(VISION + '/vision_bundle.mjs');
  const files = await vision.FilesetResolver.forVisionTasks(VISION + '/wasm');
  const make = (delegate) => vision.PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODELS[quality], delegate },
    runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.6,
  });
  try { landmarker = await make('GPU'); }
  catch (e) { console.warn('GPU not available, using CPU', e); landmarker = await make('CPU'); }
}

async function startCamera() {
  $('empty').classList.remove('hidden');
  $('empty').textContent = 'Starting the camera…';
  try {
    setTrack('wait', 'Starting camera…');
    await openCamera();
    if (!landmarker) await loadModel();
    if (mode !== 'cam') { stopCamera(); return; }
    camRunning = true;
    requestAnimationFrame(camLoop);
  } catch (e) {
    console.error(e);
    const msg = e && e.name === 'NotAllowedError'
      ? 'Camera access was blocked. Allow the camera in your browser settings and try again.'
      : 'Could not start: ' + (e.message || e);
    setTrack('bad', msg);
    $('empty').textContent = msg;
  }
}

function stopCamera() {
  camRunning = false;
  if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
}

function camLoop(now) {
  if (!camRunning) return;
  requestAnimationFrame(camLoop);
  const interval = saver ? 1000 / 15 : 1000 / 30;
  if (now - lastRun < interval - 2 || video.readyState < 2) return;
  lastRun = now;

  const result = landmarker.detectForVideo(video, now);
  const lm = result.landmarks && result.landmarks[0];
  octx.clearRect(0, 0, overlay.width, overlay.height);

  if (!lm) {
    setTrack('bad', 'Can\'t see you. Step back so your upper body is in view.');
    send({ t: Date.now(), m: 'cam', none: 1 });
    return;
  }

  // Some versions report visibility as 0 everywhere; treat that as "unknown" (fully visible)
  const noVis = lm.every((p) => !p.visibility);
  const vis = (p) => (noVis ? 1 : p.visibility);
  const p = [];
  for (const i of KEEP) p.push(+lm[i].x.toFixed(4), +lm[i].y.toFixed(4), +vis(lm[i]).toFixed(2));
  send({ t: Date.now(), m: 'cam', a: +(video.videoWidth / video.videoHeight).toFixed(4), p });

  drawSkeleton(lm, vis);
  frames++;
  if (now - fpsT > 1000) {
    const fps = Math.round(frames * 1000 / (now - fpsT));
    frames = 0; fpsT = now;
    const ok = vis(lm[11]) > 0.4 && vis(lm[12]) > 0.4;
    setTrack(ok ? 'on' : 'wait', ok ? `Tracking at ${fps} fps` : 'Make sure both shoulders are visible');
  }
}

function drawSkeleton(lm, vis) {
  const w = overlay.width, h = overlay.height;
  octx.lineWidth = 6; octx.strokeStyle = '#62f0ff'; octx.fillStyle = '#ff8ad8';
  for (const [a, b] of BONES) {
    if (vis(lm[a]) < 0.4 || vis(lm[b]) < 0.4) continue;
    octx.beginPath(); octx.moveTo(lm[a].x * w, lm[a].y * h); octx.lineTo(lm[b].x * w, lm[b].y * h); octx.stroke();
  }
  for (const i of KEEP) {
    if (vis(lm[i]) < 0.4) continue;
    octx.beginPath(); octx.arc(lm[i].x * w, lm[i].y * h, 9, 0, Math.PI * 2); octx.fill();
  }
}

$('flip').addEventListener('click', async () => {
  facing = facing === 'user' ? 'environment' : 'user';
  try { await openCamera(); } catch (e) { setTrack('bad', 'Could not switch camera'); }
});
$('saver').addEventListener('click', () => {
  saver = !saver;
  $('saver').textContent = 'Battery saver: ' + (saver ? 'on' : 'off');
});
function qualityLabel() { $('quality').textContent = 'Accuracy: ' + (quality === 'high' ? 'high' : 'standard'); }
qualityLabel();
$('quality').addEventListener('click', async () => {
  quality = quality === 'high' ? 'standard' : 'high';
  try { localStorage.setItem('sv-quality', quality); } catch (e) {}
  qualityLabel();
  if (landmarker) {
    const was = camRunning;
    camRunning = false;
    try { landmarker.close(); } catch (e) {}
    landmarker = null;
    try { await loadModel(); } catch (e) { setTrack('bad', 'Could not load the tracker'); return; }
    if (was && mode === 'cam') { camRunning = true; requestAnimationFrame(camLoop); }
  }
});

// ---------------- Keep the screen on ----------------
async function keepAwake() {
  try {
    if ('wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && mode) keepAwake();
});

// ---------------- Casting to Google TV / Android TV / Chromecast ----------------
// "Start on the TV" opens the game on the TV (a registered Cast receiver), sends it a new room code,
// and then connects this phone to that room, so no QR code is needed.
function makeRoomCode() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
function castInit() {
  const appId = window.SV_CONFIG && window.SV_CONFIG.castAppId;
  if (!window.__castOk || !appId || !window.cast || !cast.framework) return;
  cast.framework.CastContext.getInstance().setOptions({
    receiverApplicationId: appId,
    autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
  });
  $('cast-box').classList.remove('hidden');
}
if (window.__castOk) castInit(); else document.addEventListener('cast-ready', castInit);

$('cast-btn').addEventListener('click', async () => {
  const ctx = cast.framework.CastContext.getInstance();
  try {
    setConn('wait', 'Opening the game on the TV…');
    await ctx.requestSession();                    // the phone shows its list of TVs
    const session = ctx.getCurrentSession();
    const room = makeRoomCode();
    // send the room code a few times while the game is still loading on the TV
    let n = 0;
    const tell = () => { try { session.sendMessage(window.SV_CAST_NS, { room }); } catch (e) {} if (++n < 8) setTimeout(tell, 1500); };
    tell();
    $('code').value = room.toUpperCase();
    setTimeout(connect, 2500);                     // connecting retries until the TV is ready
  } catch (e) {
    if (e === 'cancel' || (e && e.code === 'cancel')) setConn('', 'Not connected');
    else setConn('bad', 'Could not start the game on the TV');
  }
});

// Came from the QR code: connect straight away
if ($('code').value) connect();

// Small hook for testing the layouts in a desktop browser
window.__svPad = { setLayout(m) { if (LAYOUTS[m]) { layout = m; applyPadMap(); } } };
