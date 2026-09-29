// Accounts and cloud save (Firebase). Switched on by filling in `firebase` in js/config.js.
// Progress is always saved on the device as well; when a parent is signed in it is also copied
// to the cloud, so it can be continued on another device (TV, laptop).
// Licences (later) live in a separate place that only the server may write: see firestore.rules.
(function () {
  const cfg = (window.SV_CONFIG || {}).firebase || {};
  const VERSION = '10.12.2';

  const progressOf = (s) => ({
    stars: Object.values(s.stages || {}).reduce((a, x) => a + (x.stars || 0), 0),
    crystals: s.crystals || 0,
    aliens: Object.keys(s.dex || {}).filter((k) => s.dex[k] > 0).length,
    updated: (s.meta && s.meta.updated) || 0,
  });
  const isFresh = (s) => { const p = progressOf(s); return p.stars === 0 && p.aliens === 0; };
  const withoutMeta = (s) => { const c = { ...s }; delete c.meta; delete c.options; return JSON.stringify(c); };

  const Cloud = {
    enabled: !!(cfg.apiKey && cfg.projectId && cfg.appId),
    ready: false, user: null, license: null,
    status: 'off',            // off | loading | signedout | syncing | synced | error
    error: '', lastSync: 0,
    listeners: [],
    progressOf,
    onChange(fn) { this.listeners.push(fn); },
    emit() { this.listeners.forEach((f) => { try { f(this); } catch (e) { /* ignore */ } }); },

    // the Firebase libraries are only downloaded when accounts are switched on
    loadSdk() {
      return new Promise((resolve, reject) => {
        if (window.firebase && window.firebase.firestore) return resolve();
        const files = ['firebase-app-compat', 'firebase-auth-compat', 'firebase-firestore-compat'];
        let i = 0;
        const next = () => {
          if (i >= files.length) return resolve();
          const s = document.createElement('script');
          s.src = `https://www.gstatic.com/firebasejs/${VERSION}/${files[i++]}.js`;
          s.onload = next;
          s.onerror = () => reject(new Error('Could not load the account service'));
          document.head.appendChild(s);
        };
        next();
      });
    },

    // getLocal(): the current save; useCloud(save): replace the local save; ask(local, cloud): 'cloud' or 'local'
    async init({ getLocal, useCloud, ask }) {
      Object.assign(this, { getLocal, useCloud, ask });
      if (!this.enabled) return;
      this.status = 'loading'; this.emit();
      try { await this.loadSdk(); } catch (e) { this.status = 'error'; this.error = e.message; this.emit(); return; }
      firebase.initializeApp(cfg);
      this.auth = firebase.auth();
      this.db = firebase.firestore();
      this.ready = true; this.status = 'signedout'; this.emit();
      this.auth.onAuthStateChanged(async (u) => {
        this.user = u;
        if (!u) { this.status = 'signedout'; this.license = null; this.emit(); return; }
        this.status = 'syncing'; this.emit();
        await this.firstSync();
        await this.readLicense();
        this.emit();
      });
    },

    docRef() { return this.db.collection('users').doc(this.user.uid); },

    // Right after signing in: combine this device's progress with the cloud
    async firstSync() {
      try {
        const snap = await this.docRef().get();
        const local = this.getLocal();
        if (!snap.exists) { await this.push(); return; }              // first time: upload this device
        const data = snap.data();
        const cloud = JSON.parse(data.save || '{}');
        if (isFresh(local)) { this.useCloud(cloud); this.done(); return; }   // nothing played here yet
        if (withoutMeta(cloud) !== withoutMeta(local)) {
          const choice = await this.ask(progressOf(local), progressOf(cloud));
          if (choice === 'cloud') { this.useCloud(cloud); this.done(); return; }
        }
        await this.push();
      } catch (e) { this.fail(e); }
    },
    done() { this.status = 'synced'; this.lastSync = Date.now(); this.error = ''; this.emit(); },
    fail(e) { this.status = 'error'; this.error = (e && e.message) || String(e); this.emit(); },

    // Saves are sent a few seconds after the last change, so many small changes become one upload
    queueSave() {
      if (!this.user) return;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.push(), 4000);
    },
    async push() {
      if (!this.user) return;
      try {
        const local = this.getLocal();
        await this.docRef().set({
          save: JSON.stringify(local),
          updated: (local.meta && local.meta.updated) || Date.now(),
          device: navigator.userAgent.slice(0, 120),
        }, { merge: true });
        this.done();
      } catch (e) { this.fail(e); }
    },

    // Licences: read-only for the player (written only by the server after a purchase)
    async readLicense() {
      try {
        const s = await this.db.collection('licenses').doc(this.user.uid).get();
        this.license = s.exists ? s.data() : null;
      } catch (e) { this.license = null; }
    },

    signIn(email, pw) { return this.auth.signInWithEmailAndPassword(email, pw); },
    signUp(email, pw) { return this.auth.createUserWithEmailAndPassword(email, pw); },
    resetPassword(email) { return this.auth.sendPasswordResetEmail(email); },
    signOut() { clearTimeout(this.timer); return this.auth.signOut(); },
  };
  window.Cloud = Cloud;
})();
