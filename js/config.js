// Settings you fill in yourself.
window.SV_CONFIG = {
  // Google Cast: the Application ID you get after registering a "Custom Receiver" in the
  // Google Cast SDK Developer Console (see README). Leave empty to hide the Cast button.
  castAppId: '',
  // The address where the game is online, for example 'https://yourname.github.io/star-voyager/'.
  // Used by the Android app, so the QR code points other phones to the online controller page.
  publicUrl: '',
  // Accounts and cloud save (Firebase). Paste the "firebaseConfig" values of your Firebase web app here
  // (see README, "Accounts and cloud save"). Leave empty to play without accounts.
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  // Licences. enabled: false = the whole game is open for everyone (as now).
  // enabled: true = without a licence only the worlds in freeWorlds can be played (1 = Crystal Shores); buyUrl = your payment page (it gets ?account=...&email=... added).
  licensing: {
    enabled: false,
    freeWorlds: [1],
    buyUrl: '',
  },
};
// Running inside the Star Voyager Android app (the app adds this to its browser name)
window.SV_APP = /StarVoyagerApp/.test(navigator.userAgent);
// Touch mode: the game has its own on-screen gamepad (no phone controller, no QR code, one player).
// On in the Android app; in a browser it can be tried by adding ?touch=1 to the address.
window.SV_TOUCH = window.SV_APP || /[?&]touch=1\b/.test(location.search);
// Message channel between the phone and the TV for casting (must be the same on both sides)
window.SV_CAST_NS = 'urn:x-cast:com.starvoyager.game';
