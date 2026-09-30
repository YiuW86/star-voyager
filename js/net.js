// WebRTC connection on the game side. The game "hosts" a room; up to two phones join it.
// The first phone becomes Player 1, the second Player 2.
// PeerJS's free cloud server is only used for the handshake. After that, data flows
// directly phone -> game over WebRTC data channels.
window.Net = {
  MAX_PLAYERS: 2,
  peer: null,
  slots: { 1: null, 2: null },   // connection per player
  roomCode: null,
  status: 'off',                 // status of Player 1: off | starting | waiting | connected | lost | error
  onData: null,                  // callback(data, player) for each controller message
  onStatus: null,                // callback(status, text) for Player 1 / the room
  onPlayer: null,                // callback(player, joined) when a phone joins or leaves

  makeCode() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';  // no look-alike characters
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  },

  controllerUrl() {
    // Inside the Android app the page itself is not online, so use the public address if one is set
    const base = window.SV_APP ? ((window.SV_CONFIG || {}).publicUrl || '') : location.href;
    if (!base) return '';
    return new URL('controller.html?room=' + this.roomCode, base).href;
  },

  start() {
    if (this.peer && !this.peer.destroyed) return;
    if (typeof Peer === 'undefined') {
      this.setStatus('error', 'Could not load the connection library. Check your internet connection.');
      return;
    }
    let saved = null;
    try { saved = sessionStorage.getItem('sv-room'); } catch (e) {}
    this.roomCode = saved || this.makeCode();
    this.setStatus('starting', 'Setting up connection…');

    this.peer = new Peer('sv-' + this.roomCode, { debug: 1 });

    this.peer.on('open', () => {
      try { sessionStorage.setItem('sv-room', this.roomCode); } catch (e) {}
      this.setStatus('waiting', 'Waiting for phone…');
      this.renderQr();
    });

    this.peer.on('connection', (conn) => this.accept(conn));

    this.peer.on('disconnected', () => {
      // Lost the signaling server only. Open phone connections keep working.
      if (!this.peer.destroyed) this.peer.reconnect();
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        try { sessionStorage.removeItem('sv-room'); } catch (e) {}
        this.peer.destroy();
        this.peer = null;
        this.start();
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.setStatus('error', 'Can\'t reach the connection server. Check your internet connection.');
      } else {
        console.warn('Peer error', err);
      }
    });
  },

  // A phone connects: give it the first free player slot (or turn it away if the game is full)
  accept(conn) {
    conn.on('open', () => {
      const free = [1, 2].find((s) => !this.slots[s] || !this.slots[s].open);
      if (!free) {
        try { conn.send({ m: 'full' }); } catch (e) {}
        setTimeout(() => conn.close(), 500);
        return;
      }
      conn.player = free;
      this.slots[free] = conn;
      this.welcome(free);
      if (free === 1) this.setStatus('connected', 'Phone connected');
      if (this.onPlayer) this.onPlayer(free, true);
    });
    conn.on('data', (d) => {
      if (!conn.player || this.slots[conn.player] !== conn) return;
      if (d && d.m === 'hello') this.welcome(conn.player);
      if (this.onData) this.onData(d, conn.player);
    });
    const gone = () => {
      const p = conn.player;
      if (!p || this.slots[p] !== conn) return;
      this.slots[p] = null;
      if (p === 1) this.setStatus('lost', 'Phone disconnected');
      if (this.onPlayer) this.onPlayer(p, false);
    };
    conn.on('close', gone);
    conn.on('error', gone);
  },

  // Tell a phone which player it is (sent a few times, the channel may drop a message)
  welcome(p) {
    [0, 400, 1500].forEach((ms) => setTimeout(() => {
      this.sendTo(p, { m: 'welcome', player: p, lang: window.I18N ? window.I18N.lang : 'en' });
      this.sendTo(p, { m: 'layout', mode: this.layout });
    }, ms));
  },

  // Which button layout the phones should show: 'normal' or 'plat' (platformer level)
  layout: 'normal',
  setLayout(mode) {
    if (mode === this.layout) return;
    this.layout = mode;
    [1, 2].forEach((p) => [0, 500].forEach((ms) => setTimeout(() => this.sendTo(p, { m: 'layout', mode }), ms)));
  },

  sendTo(p, msg) {
    const c = this.slots[p];
    if (c && c.open) { try { c.send(msg); } catch (e) {} }
  },

  // Casting: the phone chose the room code and sent it to the TV; switch this game to that code
  useRoom(code) {
    code = String(code).toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12);
    if (!code || code === this.roomCode) return;
    try { sessionStorage.setItem('sv-room', code); } catch (e) {}
    if (this.peer) { try { this.peer.destroy(); } catch (e) {} this.peer = null; }
    document.querySelectorAll('[data-qr]').forEach((b) => { delete b.dataset.made; });
    this.start();
  },

  isConnected(p = 1) { return !!(this.slots[p] && this.slots[p].open); },
  playerCount() { return [1, 2].filter((p) => this.isConnected(p)).length; },

  // Fills every QR code box and room code on the page (start screen and pairing screen)
  renderQr() {
    if (!this.roomCode) return;
    const url = this.controllerUrl();
    document.querySelectorAll('[data-room-code]').forEach((el) => { el.textContent = this.roomCode.toUpperCase(); });
    const urlEl = document.getElementById('room-url');
    if (urlEl) urlEl.textContent = url || 'Star Voyager app → Use as controller';
    document.querySelectorAll('[data-qr]').forEach((box) => {
      if (box.dataset.made === this.roomCode) return;
      box.innerHTML = '';
      if (!url) { box.textContent = 'App'; box.classList.add('no-qr'); box.dataset.made = this.roomCode; return; }
      if (typeof QRCode === 'undefined') { box.textContent = 'Use the link'; return; }
      const size = Number(box.dataset.size) || 260;
      new QRCode(box, { text: url, width: size, height: size, colorDark: '#0a1440', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      box.dataset.made = this.roomCode;
    });
  },

  setStatus(status, text) {
    this.status = status;
    if (this.onStatus) this.onStatus(status, text);
  },
};
