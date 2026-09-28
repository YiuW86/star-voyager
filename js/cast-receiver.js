// Runs only when the game is opened on a Google TV / Android TV / Chromecast through the Cast button
// (the registered receiver address ends in ?cast=1). The phone sends a room code, and the game on
// the TV uses that code, so the phone can connect to it straight away without scanning a QR code.
(function () {
  if (!/[?&]cast=1\b/.test(location.search)) return;
  const s = document.createElement('script');
  s.src = '//www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js';
  s.onload = () => {
    try {
      const ctx = cast.framework.CastReceiverContext.getInstance();
      ctx.addCustomMessageListener(window.SV_CAST_NS, (ev) => {
        const d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        if (d && d.room && window.Net) window.Net.useRoom(d.room);
      });
      const opts = new cast.framework.CastReceiverOptions();
      opts.disableIdleTimeout = true;          // a game is not a video: don't close when nothing "plays"
      opts.maxInactivity = 3600;
      opts.skipPlayersLoad = true;
      opts.customNamespaces = { [window.SV_CAST_NS]: cast.framework.system.MessageType.JSON };
      ctx.start(opts);
    } catch (e) { console.warn('Cast receiver could not start', e); }
  };
  document.head.appendChild(s);
})();
