// [CLAUDE] Service Worker: Push-Empfang mit Empfangsquittung, Klick öffnet den Vorgang, App-Hülle offline
const CACHE = 'cfp-shell-v1';
const SHELL = ['/', '/index.html', '/styles.css', '/app.js', '/i18n.js', '/manifest.webmanifest', '/icons/icon.svg'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // Netz zuerst, damit Aktualisierungen sofort ankommen; Cache nur ohne Verbindung
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((ca) => ca.put(e.request, c)); return r; }).catch(() => caches.match(e.request).then((r) => r || caches.match('/'))));
});
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch { d = { title: 'Fuhrpark', body: e.data ? e.data.text() : '' }; }
  const work = [
    self.registration.showNotification(d.title || 'Fuhrpark', {
      body: d.body || '', tag: d.case_id || d.id, renotify: true, requireInteraction: !!d.urgent,
      icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', data: { id: d.id, case_id: d.case_id },
    }),
    d.id ? fetch(`/api/notifications/${d.id}/received`, { method: 'POST', headers: { 'x-cfp': '1' }, credentials: 'include' }).catch(() => {}) : null,
    self.clients.matchAll({ type: 'window' }).then((cs) => cs.forEach((c) => c.postMessage({ type: 'push' }))),
  ];
  e.waitUntil(Promise.all(work));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const d = e.notification.data || {};
  const hash = d.case_id ? `#/cases/${d.case_id}` : '#/inbox';
  e.waitUntil((async () => {
    if (d.id) fetch(`/api/notifications/${d.id}/opened`, { method: 'POST', headers: { 'x-cfp': '1' }, credentials: 'include' }).catch(() => {});
    const cs = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of cs) { if ('focus' in c) { c.postMessage({ type: 'navigate', hash }); return c.focus(); } }
    return self.clients.openWindow('/' + hash);
  })());
});
