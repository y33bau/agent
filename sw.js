const CACHE='agent-empire-v2.0.0';
const CORE=['./','./index.html','./styles.css','./core.js','./app.js','./manifest.webmanifest','./assets/empire.svg','./assets/empire-maskable.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('agent-empire-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(caches.match(req).then(cached=>cached||(req.mode==='navigate'?caches.match('./index.html'):null)).then(cached=>cached||fetch(req)));
});
