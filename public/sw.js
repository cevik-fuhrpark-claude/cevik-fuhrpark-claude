// [CLAUDE] Service Worker: Push-Empfang mit Empfangsquittung, Klick öffnet den Vorgang, App-Hülle offline
// App-Hülle je Fassung vollständig und atomar im Cache (18.10.2026): vorher wurde jede Datei einzeln ersetzt – ein Funkloch mitten im Laden
// mischte neue und alte Module (Offline-Start hing bei „Lädt…“), und eine einzeln gespeicherte neue version.json verdeckte, dass die
// laufenden Dateien alt waren (keine Leiste „Aktualisierung verfügbar“). Jetzt: Cache `cfp-shell-<Fassung>` mit allen Dateien inkl.
// version.json, erst nach vollständigem Laden aktiv; ohne Verbindung wird nur aus dem jüngsten vollständigen Cache bedient.
const PREFIX = 'cfp-shell-';
const META = 'cfp-meta';
const SHELL = ['/', '/index.html', '/styles.css', '/app-main.js', '/app-verwaltung.js', '/app-lager.js', '/i18n-core.js', '/i18n-de.js', '/i18n-uk.js', '/i18n-en.js', '/check-labels.js', '/holidays.js', '/emhours.js', '/finding-labels.js', '/finding-messages.js', '/ics-texts.js', '/qr.js', '/csv.js', '/help.js', '/manifest.webmanifest', '/boot.js', '/build-version.js', '/icons/icon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/version.json'];
async function currentCache() {
  const r = await (await caches.open(META)).match('/__current');
  return r ? r.text() : null;
}
let refreshing = null;
async function refreshShell(version) {
  if (!version) return;
  const name = PREFIX + version;
  if ((await currentCache()) === name) return;
  if (refreshing === name) return;
  refreshing = name;
  try {
    const c = await caches.open(name);
    await c.addAll(SHELL.map((p) => new Request(p, { cache: 'reload' }))); // alles oder nichts
    await (await caches.open(META)).put('/__current', new Response(name));
    const ks = await caches.keys();
    await Promise.all(ks.filter((k) => k !== name && k !== META).map((k) => caches.delete(k)));
  } catch { await caches.delete(name).catch(() => {}); } finally { refreshing = null; }
}
async function fetchVersion() {
  const r = await fetch('/version.json', { cache: 'no-store' });
  return r.ok ? ((await r.clone().json()).version || null) : null;
}
self.addEventListener('install', (e) => { e.waitUntil(fetchVersion().then(refreshShell).catch(() => {}).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });
async function fromCache(req) {
  const name = await currentCache();
  if (!name) return Response.error();
  const c = await caches.open(name);
  return (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? c.match('/') : Response.error());
}
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  // /werkstatt/ ist eine eigenständige Demo-Seite: nicht über die App-Hülle bedienen (offline zeigte sie sonst die Anmeldeseite der App, 18.10.2026)
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/') || u.pathname.startsWith('/werkstatt/')) return;
  // Netz zuerst, damit Aktualisierungen sofort ankommen; ohne Verbindung (oder Fehlerantwort) die Hülle der zuletzt vollständig geladenen Fassung.
  // Neue Fassung (version.json online) → im Hintergrund vollständig laden; nur einwandfreie Antworten zählen.
  if (u.pathname === '/version.json') {
    e.respondWith(fetch(e.request).then((r) => {
      if (r.ok) e.waitUntil(r.clone().json().then((j) => refreshShell(j && j.version)).catch(() => {}));
      return r;
    }).catch(() => Response.error())); // ohne Netz keine (womöglich ältere) version.json aus dem Cache – sonst meldete die laufende
    // neuere Fassung offline „Neue Version verfügbar“ und „Neu laden“ startete die ältere (21.10.2026); der Offline-Start braucht sie nicht
    return;
  }
  e.respondWith(fetch(e.request).then((r) => (r.ok || r.type !== 'basic' ? r : fromCache(e.request).then((x) => (x.type === 'error' ? r : x)))).catch(() => fromCache(e.request)));
});
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'Fuhrpark', body: e.data ? e.data.text() : '' }; }
  const work = [
    self.registration.showNotification(d.title || 'Fuhrpark', {
      body: d.body || '', tag: d.case_id || d.id, ...(d.lang ? { lang: d.lang, dir: 'ltr' } : {}), ...(d.ts ? { timestamp: d.ts } : {}), renotify: true, requireInteraction: !!d.urgent,
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { id: d.id, case_id: d.case_id, kind: d.kind, ref: d.ref, env: d.env }, // env für den Klick (Umgebung des Hinweises; 21.10.2026 fehlte es → Inhaber landete im falschen Bereich)
    }),
    d.id ? fetch(`/api/notifications/${d.id}/received`, { method: 'POST', headers: { 'x-cfp': '1' }, credentials: 'include' }).catch(() => {}) : null,
    self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'push' }))),
  ];
  e.waitUntil(Promise.all(work));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  // Ziel wie in der Hinweisliste: Vorgang; Anmelde-Hinweis → Mein Konto „Meine Anmeldungen“ (fremdes Gerät sofort abmelden); sonst #/push –
  // die App leitet nach derselben Rollenregel weiter wie die Hinweisliste (18.10.2026: Leitung landete in den Hinweisen statt im Management-Panel)
  const m = /^(vehicle|fine):(.+)$/.exec(d.ref || '');
  const hash = d.case_id ? `#/cases/${encodeURIComponent(d.case_id)}` : m ? `#/${m[1] === 'vehicle' ? 'vehicles' : 'fines'}/${encodeURIComponent(m[2])}` : d.kind === 'new_login' ? '#/more?o=sess' : '#/push';
  e.waitUntil((async () => {
    // Quittung „geöffnet“ abwarten (sonst kann sie nach focus/openWindow mit dem Service Worker verloren gehen; 20.10.2026)
    const ack = d.id ? fetch(`/api/notifications/${d.id}/opened`, { method: 'POST', headers: { 'x-cfp': '1' }, credentials: 'include' }).catch(() => {}) : null;
    const open = (async () => {
      // nur App-Fenster – nicht die Werkstatt-Demo unter /werkstatt/ (kennt „navigate“ nicht; 20.10.2026)
      const cs = (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).filter((c) => { try { return !new URL(c.url).pathname.startsWith('/werkstatt/'); } catch { return true; } });
      // env: Umgebung des Hinweises – der Inhaber wechselt damit in die passende Ansicht (Test/Betrieb), sonst 404 beim Test-Vorgang (21.10.2026)
      const ev = d.env === 'test' || d.env === 'production' ? d.env : null;
      for (const c of cs) { if ('focus' in c) { c.postMessage({ type: 'navigate', hash, ...(ev ? { env: ev } : {}) }); return c.focus(); } }
      return self.clients.openWindow('/' + (ev ? `?env=${ev}` : '') + hash);
    })();
    await Promise.all([ack, open]);
  })());
});
// Vom Browser/Push-Dienst erneuertes Abo sofort melden (20.10.2026): vorher erst beim nächsten App-Start (pushRebind) –
// bis dahin scheiterte jede Zustellung am alten Endpunkt. Ohne gültige Anmeldung lehnt der Server ab (dann beim nächsten Start).
self.addEventListener('pushsubscriptionchange', (e) => {
  e.waitUntil((async () => {
    try {
      const sub = e.newSubscription || (e.oldSubscription && e.oldSubscription.options ? await self.registration.pushManager.subscribe(e.oldSubscription.options) : null);
      if (!sub) return;
      const j = sub.toJSON();
      const ua = self.navigator.userAgent || '';
      const label = /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Android' : 'Android-Tablet') : /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Windows/.test(ua) ? 'Windows-PC' : /Mac/.test(ua) ? 'Mac' : null;
      await fetch('/api/push/subscribe', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cfp': '1' },
        body: JSON.stringify({ endpoint: j.endpoint, keys: j.keys, ...(label ? { device_label: label } : {}) }) });
    } catch {}
  })());
});
