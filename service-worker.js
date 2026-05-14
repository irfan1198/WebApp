const CACHE_NAME = 'sar-app-v1';
const assetsToCache = [
  './',              
  './index.html',     
  './app.js',        
  './manifest.json',
  './icon.png'
];

// Menyimpan file ke memori HP saat pertama kali dibuka
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(assetsToCache);
    })
  );
});

// Mengambil file dari memori HP saat offline
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});