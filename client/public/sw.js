// Minimal service worker: enables "install app" (PWA) without caching anything,
// so deploys are always picked up immediately (no stale-cache problems).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {}); // network passthrough
