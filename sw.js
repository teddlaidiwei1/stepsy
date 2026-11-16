// Stepsy background helper (service worker). It only shows notifications and opens the app when one is tapped.
// No caching on purpose: the prototype changes often and kids should always get the newest version.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = wins.find((w) => 'focus' in w);
    if (open) return open.focus();
    return self.clients.openWindow('./');
  })());
});
