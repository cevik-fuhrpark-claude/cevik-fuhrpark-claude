// [CLAUDE] Start-Wächter (klassisches Skript, ohne Module): Scheitert das Laden der App-Module (z. B. Netzabbruch nach einem Deployment –
// neue app.js trifft auf alte i18n-core.js aus dem Offline-Cache) oder startet die App nicht binnen 15 s, steht statt „Lädt…“ ein Hinweis
// mit „Neu laden“. Online werden dabei die zwischengespeicherten App-Dateien verworfen, damit alle Dateien derselben Fassung neu kommen;
// offline bleibt der Cache erhalten (Offline-Start). 21.10.2026 – vorher blieb die App dauerhaft bei „Lädt…“ stehen.
// Langsame Verbindung (Backlog 588, 28.10.2026): Solange die Module noch geladen werden (DOMContentLoaded steht aus), zeigt der
// Wächter nach 15 s nur „Lädt noch – langsame Verbindung“ und wartet bis 120 s (ebenso, solange app.js das Sprachpaket lädt). Vorher meldete er bei „Slow 3G“ (≈ 20 s Ladezeit)
// fälschlich einen Ladefehler, und „Neu laden“ verwarf den Cache und begann von vorn.
(function () {
  var T = {
    de: ['Die App konnte nicht vollständig geladen werden.', 'Neu laden', 'Lädt noch – langsame Verbindung. Bitte warten …'],
    uk: ['Не вдалося повністю завантажити застосунок.', 'Перезавантажити', 'Ще завантажується – повільне з’єднання. Зачекайте, будь ласка …'],
    en: ['The app could not be loaded completely.', 'Reload', 'Still loading – slow connection. Please wait …'],
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
  var loaded = false, waited = 15000;
  if (document.addEventListener) document.addEventListener('DOMContentLoaded', function () { loaded = true; });
  function check() {
    if (window.__cfpBooted) return;
    if ((!loaded || window.__cfpLoading) && waited < 120000) { // Module oder Sprachpaket (app.js: __cfpLoading) laden noch
      var p = document.getElementById('bootslow');
      if (!p) { var app = document.getElementById('app'); if (app && !document.getElementById('bootfail')) { app.innerHTML = '<main><p id="bootslow" role="status" style="padding:16px"></p></main>'; p = document.getElementById('bootslow'); } }
      if (p) p.textContent = T[lang()][2];
      waited += 5000; setTimeout(check, 5000); return;
    }
    fail();
  }
  // Backlog 588: Kern und Sprachpaket sofort parallel anfordern (sonst erst, nachdem app.js geladen und ausgeführt ist)
  try {
    ['/i18n-core.js', '/i18n-' + lang() + '.js'].forEach(function (h) { var l = document.createElement('link'); l.rel = 'modulepreload'; l.href = h; document.head.appendChild(l); });
  } catch (e) { /* nur Beschleunigung */ }
  window.addEventListener('error', function () { setTimeout(fail, 0); });
  setTimeout(check, 15000);
})();
