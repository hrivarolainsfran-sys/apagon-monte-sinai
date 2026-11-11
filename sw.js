// Service worker: guarda la app en el celular para que abra aunque la señal sea mala.
const CACHE = 'apagon-v10';
const CORE = [
  './', 'index.html', 'admin.html', 'sombra.html', 'imprimir.html', 'pantalla.html', 'js/pantalla.js', 'mision.html', 'js/mision.js',
  'css/app.css', 'js/config.js', 'js/engine.js', 'js/backend.js', 'js/ui.js', 'js/scanner.js',
  'js/player.js', 'js/admin.js', 'js/sombra.js', 'manifest.webmanifest', 'icon.svg',
  'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js',
];
const CDN_HOSTS = ['unpkg.com', 'cdn.jsdelivr.net', 'www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin && !CDN_HOSTS.includes(url.hostname)) return; // Firestore y demás: directo a la red
  e.respondWith(networkFirst(req));
});

// Red primero (para recibir cambios), con caché de respaldo si la red tarda más de 3,5 s o falla.
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  // En archivos propios se pide revalidar siempre: así un cambio publicado llega
  // apenas hay señal, sin esperar los 10 min de caché de GitHub Pages.
  const sameOrigin = new URL(req.url).origin === location.origin;
  const net = (sameOrigin ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req)).then(res => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  });
  const cached = await cache.match(req, { ignoreSearch: true });
  if (!cached) return net;
  return Promise.race([
    net.catch(() => cached),
    new Promise(r => setTimeout(() => r(cached), 3500)),
  ]);
}
