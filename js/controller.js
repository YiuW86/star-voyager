// Phone controller: runs pose tracking on the phone and sends only body keypoints
// (no video) straight to the game over a WebRTC data channel.
import { PoseLandmarker, FilesetResolver } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs';

const WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
// Landmarks sent to the game: nose, left/right shoulder, left/right elbow, left/right wrist
const KEEP = [0, 11, 12, 13, 14, 15, 16];
const BONES = [[11, 12], [11, 13], [13, 15], [12, 14], [14, 16]];

const $ = (id) => document.getElementById(id);
const video = $('video'), overlay = $('overlay'), octx = overlay.getContext('2d');

const params = new URLSearchParams(location.search);
$('code').value = (params.get('room') || '').toUpperCase();

let landmarker = null, stream = null, facing = 'user';
let peer = null, conn = null, retryTimer = null;
let running = false, saver = false, lastRun = 0, frames = 0, fpsT = performance.now();
let wakeLock = null;

function setStatus(which, state, text) {
  const dot = $('dot-' + which);
  dot.className = 'dot' + (state ? ' ' + state : '');
  $('txt-' + which).textContent = text;
}

// ---------------- Camera ----------------
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
  setStatus('track', 'wait', 'Loading pose tracker…');
  const files = await FilesetResolver.forVisionTasks(WASM);
  const make = (delegate) => PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: MODEL, delegate },
    runningMode: 'VIDEO', numPoses: 1,
    minPoseDetectionConfidence: 0.5, minPosePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  try { landmarker = await make('GPU'); }
  catch (e) { console.warn('GPU not available, using CPU', e); landmarker = await make('CPU'); }
}

// ---------------- Connection ----------------
function connect() {
  const code = $('code').value.trim().toLowerCase();
  if (!code) { setStatus('conn', 'bad', 'Enter the code shown on the TV'); return; }
  clearTimeout(retryTimer);
  if (!peer || peer.destroyed) {
    peer = new Peer({ debug: 1 });
    peer.on('open', () => openConn(code));
    peer.on('disconnected', () => { if (!peer.destroyed) peer.reconnect(); });
    peer.on('error', (err) => {
      if (err.type === 'peer-unavailable') setStatus('conn', 'bad', 'No game found with this code. Check the code on the TV.');
      else setStatus('conn', 'bad', 'Connection problem: ' + err.type);
      scheduleRetry();
    });
  } else if (peer.open) {
    openConn(code);
  }
  setStatus('conn', 'wait', 'Connecting…');
}

function openConn(code) {
  if (conn) conn.close();
  conn = peer.connect('sv-' + code, { reliable: false, serialization: 'json' });
  conn.on('open', () => setStatus('conn', 'on', 'Connected to the game'));
  conn.on('close', () => { setStatus('conn', 'bad', 'Disconnected. Reconnecting…'); scheduleRetry(); });
  conn.on('error', () => scheduleRetry());
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => { if (running) connect(); }, 2500);
}

function send(msg) {
  if (!conn || !conn.open) return;
  const dc = conn.dataChannel;
  if (dc && dc.bufferedAmount > 32 * 1024) return;   // skip frames instead of building up delay
  conn.send(msg);
}

// ---------------- Tracking loop ----------------
function loop(now) {
  if (!running) return;
  requestAnimationFrame(loop);
  const interval = saver ? 1000 / 15 : 1000 / 30;
  if (now - lastRun < interval - 2 || video.readyState < 2) return;
  lastRun = now;

  const result = landmarker.detectForVideo(video, now);
  const lm = result.landmarks && result.landmarks[0];
  octx.clearRect(0, 0, overlay.width, overlay.height);

  if (!lm) {
    setStatus('track', 'bad', 'Can\'t see you. Step back so your upper body is in view.');
    send({ t: Date.now(), none: 1 });
    return;
  }

  // Some versions report visibility as 0 everywhere; treat that as "unknown" (fully visible)
  const noVis = lm.every((p) => !p.visibility);
  const vis = (p) => (noVis ? 1 : p.visibility);
  const p = [];
  for (const i of KEEP) p.push(+lm[i].x.toFixed(4), +lm[i].y.toFixed(4), +vis(lm[i]).toFixed(2));
  send({ t: Date.now(), a: +(video.videoWidth / video.videoHeight).toFixed(4), p });

  drawSkeleton(lm, vis);
  frames++;
  if (now - fpsT > 1000) {
    const fps = Math.round(frames * 1000 / (now - fpsT));
    frames = 0; fpsT = now;
    const ok = vis(lm[11]) > 0.4 && vis(lm[12]) > 0.4;
    setStatus('track', ok ? 'on' : 'wait', ok ? `Tracking at ${fps} fps` : 'Make sure both shoulders are visible');
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

// ---------------- Screen wake lock ----------------
async function keepAwake() {
  try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && running) keepAwake();
});

// ---------------- Buttons ----------------
$('start').addEventListener('click', async () => {
  const btn = $('start');
  btn.disabled = true;
  try {
    setStatus('track', 'wait', 'Starting camera…');
    await openCamera();
    if (!landmarker) await loadModel();
    running = true;
    keepAwake();
    connect();
    requestAnimationFrame(loop);
    btn.textContent = 'Running — keep this page open';
    $('flip').disabled = false;
  } catch (e) {
    console.error(e);
    btn.disabled = false;
    const msg = e && e.name === 'NotAllowedError'
      ? 'Camera access was blocked. Allow the camera in your browser settings and try again.'
      : 'Could not start: ' + (e.message || e);
    setStatus('track', 'bad', msg);
  }
});

$('flip').addEventListener('click', async () => {
  facing = facing === 'user' ? 'environment' : 'user';
  try { await openCamera(); } catch (e) { setStatus('track', 'bad', 'Could not switch camera'); }
});

$('saver').addEventListener('click', () => {
  saver = !saver;
  $('saver').textContent = 'Battery saver: ' + (saver ? 'on (15 fps)' : 'off');
});

$('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('start').click(); });
