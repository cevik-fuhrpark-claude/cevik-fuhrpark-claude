// [CLAUDE] Service Worker: Push-Empfang mit Empfangsquittung, Klick öffnet den Vorgang, App-Hülle offline
const CACHE = 'cfp-shell-v12';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/i18n.js', '/check-labels.js', '/finding-labels.js', '/finding-messages.js', '/qr.js', '/csv.js', '/help.js', '/manifest.webmanifest', '/icons/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // Netz zuerst, damit Aktualisierungen sofort ankommen; Cache nur ohne Verbindung
  // nur einwandfreie Antworten speichern (18.10.2026: ein 503 beim Deployment überschrieb die App-Hülle, Offline-Start hing bei „Lädt…“)
  e.respondWith(fetch(e.request).then((r) => { if (r.ok && r.type === 'basic') { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); } return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'Fuhrpark', body: e.data ? e.data.text() : '' }; }
  const work = [
    self.registration.showNotification(d.title || 'Fuhrpark', {
      body: d.body || '', tag: d.case_id || d.id, ...(d.lang ? { lang: d.lang, dir: 'ltr' } : {}), ...(d.ts ? { timestamp: d.ts } : {}), renotify: true, requireInteraction: !!d.urgent,
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { id: d.id, case_id: d.case_id, kind: d.kind, ref: d.ref },
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
    if (d.id) fetch(`/api/notifications/${d.id}/opened`, { method: 'POST', headers: { 'x-cfp': '1' }, credentials: 'include' }).catch(() => {});
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cs) { if ('focus' in c) { c.postMessage({ type: 'navigate', hash }); return c.focus(); } }
    return self.clients.openWindow('/' + hash);
  })());
});
