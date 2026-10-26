/* Service worker: ให้แอปเปิดได้แม้ไม่มีสัญญาณ
   ★ ทุกครั้งที่ออกรุ่นใหม่ ให้เปลี่ยนเลขใน CACHE (เช่น ss-v2) เพื่อให้เครื่องผู้ใช้โหลดไฟล์ใหม่ */
const CACHE = 'ss-v6';
const SHELL = ['./', 'index.html', 'style.css', 'config.js', 'core.js', 'backend.js', 'app.js', 'knowledge.js', 'songs.js', 'lineage.js', 'teachings.js', 'library.js', 'directory.js', 'events.js', 'finance.js', 'vote.js', 'honor.js', 'manual.js', 'about.js', 'clubinfo.js', 'report.js', 'signature.js', 'push.js', 'extras.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'icons/logo-256.png', 'icons/logo-1024.png'];
const CDN = ['cdnjs.cloudflare.com', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
// หมายเหตุ: ไม่แคชคำขอ Firebase/Google Sign-in (ต้องสดเสมอ)

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === location.origin, cdn = CDN.includes(url.hostname);
  if (!same && !cdn) return; // Firebase ฯลฯ ไม่ยุ่ง
  if (cdn) { // cache-first สำหรับไลบรารี/ฟอนต์
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return res; })));
    return;
  }
  // ไฟล์ของแอป: network-first (ได้รุ่นใหม่ทันทีเมื่อออนไลน์ · ออฟไลน์ใช้ของที่แคชไว้)
  e.respondWith(caches.open(CACHE).then(c => fetch(req, { cache: 'no-cache' }).then(res => { if (res && res.ok) c.put(req, res.clone()); return res; }).catch(() => c.match(req, { ignoreSearch: true }))));
});
