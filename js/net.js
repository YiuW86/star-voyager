// WebRTC connection on the game side. The game "hosts" a room; the phone joins it.
// PeerJS's free cloud server is only used for the handshake. After that, pose data
// flows directly phone -> game over a WebRTC data channel.
window.Net = {
  peer: null,
  conn: null,
  roomCode: null,
  status: 'off',            // off | starting | waiting | connected | lost | error
  onData: null,             // callback(data) for each pose message
  onStatus: null,           // callback(status, text)
  _qrMade: false,

  makeCode() {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';  // no look-alike characters
    let s = '';
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  },

  controllerUrl() {
    return new URL('controller.html?room=' + this.roomCode, location.href).href;
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

    this.peer.on('connection', (conn) => {
      if (this.conn && this.conn.open) this.conn.close();   // newest phone wins
      this.conn = conn;
      conn.on('open', () => this.setStatus('connected', 'Phone connected'));
      conn.on('data', (d) => { if (this.onData) this.onData(d); });
      conn.on('close', () => { if (this.conn === conn) this.setStatus('lost', 'Phone disconnected'); });
      conn.on('error', () => { if (this.conn === conn) this.setStatus('lost', 'Phone connection error'); });
    });

    this.peer.on('disconnected', () => {
      // Lost the signaling server only. An open phone connection keeps working.
      if (!this.peer.destroyed) this.peer.reconnect();
    });

    this.peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Code already taken: pick a new one and try again
        try { sessionStorage.removeItem('sv-room'); } catch (e) {}
        this.peer.destroy();
        this.peer = null;
        this._qrMade = false;
        this.start();
      } else if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
        this.setStatus('error', 'Can\'t reach the connection server. Check your internet connection.');
      } else {
        console.warn('Peer error', err);
      }
    });
  },

  renderQr() {
    if (!this.roomCode) return;
    const url = this.controllerUrl();
    const codeEl = document.getElementById('room-code');
    const urlEl = document.getElementById('room-url');
    if (codeEl) codeEl.textContent = this.roomCode.toUpperCase();
    if (urlEl) urlEl.textContent = url;
    const box = document.getElementById('qr');
    if (!box || this._qrMade) return;
    box.innerHTML = '';
    if (typeof QRCode !== 'undefined') {
      new QRCode(box, { text: url, width: 260, height: 260, colorDark: '#0a1440', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      this._qrMade = true;
    } else {
      box.textContent = 'QR code unavailable — use the link.';
    }
  },

  isConnected() { return this.status === 'connected'; },

  setStatus(status, text) {
    this.status = status;
    if (this.onStatus) this.onStatus(status, text);
  },
};
