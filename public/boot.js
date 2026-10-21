// [CLAUDE] Start-Wächter (klassisches Skript, ohne Module): Scheitert das Laden der App-Module (z. B. Netzabbruch nach einem Deployment –
// neue app.js trifft auf alte i18n.js aus dem Offline-Cache) oder startet die App nicht binnen 15 s, steht statt „Lädt…“ ein Hinweis
// mit „Neu laden“. Online werden dabei die zwischengespeicherten App-Dateien verworfen, damit alle Dateien derselben Fassung neu kommen;
// offline bleibt der Cache erhalten (Offline-Start). 21.10.2026 – vorher blieb die App dauerhaft bei „Lädt…“ stehen.
(function () {
  var T = {
    de: ['Die App konnte nicht vollständig geladen werden.', 'Neu laden'],
    uk: ['Не вдалося повністю завантажити застосунок.', 'Перезавантажити'],
    en: ['The app could not be loaded completely.', 'Reload'],
  };
  function lang() {
    var l = '';
    try { l = localStorage.getItem('cfp_lang') || ''; } catch (e) { l = ''; }
    if (!T[l]) { var n = (navigator.language || 'de').toLowerCase(); l = n.indexOf('uk') === 0 ? 'uk' : n.indexOf('en') === 0 ? 'en' : 'de'; }
    return l;
  }
  function reload() {
    var done = function () { location.reload(); };
    if (navigator.onLine && window.caches && caches.keys) {
      caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('cfp-shell-') === 0 || k === 'cfp-meta'; }).map(function (k) { return caches.delete(k); })); }).then(done, done);
    } else done();
  }
  function fail() {
    if (window.__cfpBooted) return;
    var app = document.getElementById('app');
    if (!app || document.getElementById('bootfail')) return;
    var t = T[lang()];
    app.innerHTML = '<main><div id="bootfail" role="alert" style="padding:16px"><p></p><button type="button" class="btn primary"></button></div></main>';
    app.querySelector('#bootfail p').textContent = t[0];
    var b = app.querySelector('#bootfail button');
    b.textContent = t[1];
    b.onclick = reload;
  }
  window.addEventListener('error', function () { setTimeout(fail, 0); });
  setTimeout(fail, 15000);
})();
