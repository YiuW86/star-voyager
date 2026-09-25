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
  conn.on('close', () => { setConn('bad', 'Disconnected. Reconnecting…'); scheduleRetry(); });
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
  if (m === 'pad') { show('s-pad'); startPointerLoop(); }
  if (m === 'tilt') { show('s-tilt'); await startTilt(); startPointerLoop(); }
}

function stopMode() {
  stopCamera();
  stopTilt();
  pointerRunning = false;
  fireHeld = false;
  mode = null;
}

// ---------------- Buttons (gamepad and tilt) ----------------
// Each press increases a counter. The game compares counters, so a lost message never loses a press.
const session = Math.random().toString(36).slice(2, 8);
const counters = { fire: 0, reload: 0, gun: 0, grenade: 0, shield: 0, menu: 0 };
let fireHeld = false;

function press(name) {
  counters[name]++;
  if (navigator.vibrate) navigator.vibrate(name === 'fire' ? 12 : 20);
}

$$('[data-press]').forEach((b) => {
  const name = b.dataset.press;
  b.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    b.classList.add('down');
    press(name);
    if (name === 'fire') fireHeld = true;
  });
  const up = () => { b.classList.remove('down'); if (name === 'fire') fireHeld = false; };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('contextmenu', (e) => e.preventDefault());
});

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
  if (now - lastSend >= 25) {          // about 40 messages per second
    lastSend = now;
    send({ t: Date.now(), m: mode, s: session, x: +aim.x.toFixed(4), y: +aim.y.toFixed(4), hold: fireHeld, c: counters });
  }
  requestAnimationFrame(pointerLoop);
}

// ---------------- Gamepad: joystick ----------------
// The stick moves the aiming circle: a small push moves it slowly (precise), a full push moves it fast.
const zone = $('stick-zone'), base = $('stick-base'), knob = $('stick-knob');
const stick = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const STICK_R = 60;

zone.addEventListener('pointerdown', (e) => {
  if (stick.id !== null) return;
  e.preventDefault();
  try { zone.setPointerCapture(e.pointerId); } catch (err) {}
  const r = zone.getBoundingClientRect();
  stick.id = e.pointerId;
  stick.ox = e.clientX - r.left; stick.oy = e.clientY - r.top;
  stick.x = 0; stick.y = 0;
  base.style.display = knob.style.display = 'block';
  base.style.left = knob.style.left = stick.ox + 'px';
  base.style.top = knob.style.top = stick.oy + 'px';
});
zone.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stick.id) return;
  const r = zone.getBoundingClientRect();
  let dx = e.clientX - r.left - stick.ox, dy = e.clientY - r.top - stick.oy;
  const len = Math.hypot(dx, dy);
  if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
  stick.x = dx / STICK_R; stick.y = dy / STICK_R;
  knob.style.left = stick.ox + dx + 'px';
  knob.style.top = stick.oy + dy + 'px';
});
const stickEnd = (e) => {
  if (e.pointerId !== stick.id) return;
  stick.id = null; stick.x = 0; stick.y = 0;
  base.style.display = knob.style.display = 'none';
};
zone.addEventListener('pointerup', stickEnd);
zone.addEventListener('pointercancel', stickEnd);

function updateStick(dt) {
  const mag = Math.hypot(stick.x, stick.y);
  if (mag < 0.08) return;                                     // small dead zone
  const speed = 1.3 * Math.pow((mag - 0.08) / 0.92, 1.8);     // screen widths per second, curved for precision
  aim.x = clamp(aim.x + (stick.x / mag) * speed * dt, 0, 1);
  aim.y = clamp(aim.y + (stick.y / mag) * speed * dt * (16 / 9), 0, 1);
}

// ---------------- Tilt: point the phone like a remote ----------------
// Uses the gyroscope: turning the phone left/right moves the circle sideways, tilting it up/down moves it vertically.
// Works whether the phone is held flat (screen up) or upright: "sideways" is measured around the real vertical axis.
const tilt = { speed: 5, flipX: false, flipY: false, up: [0, 0, 1], lastFlick: 0, on: false, gotData: false };
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
  aim.x = 0.5; aim.y = 0.5;
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
  const dead = 1.5;
  yaw = Math.abs(yaw) < dead ? 0 : yaw - Math.sign(yaw) * dead;
  pitch = Math.abs(pitch) < dead ? 0 : pitch - Math.sign(pitch) * dead;
  const k = 0.006 + tilt.speed * 0.0022;                             // speed 5: roughly 60 degrees of turning crosses the screen
  aim.x = clamp(aim.x + (tilt.flipX ? 1 : -1) * yaw * dt * k, 0, 1);
  aim.y = clamp(aim.y + (tilt.flipY ? 1 : -1) * pitch * dt * k * (16 / 9), 0, 1);
}

$('recenter').addEventListener('pointerdown', (e) => {
  e.preventDefault();
  aim.x = 0.5; aim.y = 0.5;
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

// Came from the QR code: connect straight away
if ($('code').value) connect();
