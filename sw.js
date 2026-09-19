'use strict';
const CACHE_PREFIX = 'terrasana-shell-';
const CACHE_NAME = CACHE_PREFIX + 'v2.1.1';
const SHELL = [
  './', './index.html', './operacion.css', './centro-operaciones.css',
  './operacion.js', './informe.js', './pwa.js', './manifest.webmanifest', './brigada-bg.jpg',
  './vendor/jspdf.umd.min.js', './vendor/jspdf.plugin.autotable.min.js',
  './vendor/pdf.min.mjs','./vendor/pdf.worker.min.mjs',
  './vendor/maplibre-gl.js', './vendor/maplibre-gl.css', './vendor/lucide.min.js',
  './assets/icon-192.png', './assets/icon-512.png', './assets/icon-maskable.png'
];
const SHELL_URLS = new Set(SHELL.map(path => new URL(path,self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Only the application shell is cached, never external map tiles or case data.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!SHELL_URLS.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    try {
      const response=await fetch(event.request);
      if(response.ok)await cache.put(event.request,response.clone());
      if(response.ok)return response;
      return await cache.match(event.request)||response;
    } catch {
      return await cache.match(event.request)||new Response('Aplicación no disponible sin conexión.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }
  })());
});
