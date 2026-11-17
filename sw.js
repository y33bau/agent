const CACHE='agent-empire-v2.1.0';
const CORE=['./','./index.html','./styles.css','./core.js','./app.js','./notifications.js','./notification-core.js','./manifest.webmanifest','./assets/empire.svg','./assets/empire-maskable.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('agent-empire-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 event.respondWith(caches.match(req).then(cached=>cached||(req.mode==='navigate'?caches.match('./index.html'):null)).then(cached=>cached||fetch(req)));
});

self.addEventListener('push',event=>{
 event.waitUntil((async()=>{
 let data={};try{data=event.data?.json()||{};}catch{}
 const title=typeof data.title==='string'?data.title.slice(0,100):'Twoje przypomnienie';
 const body=typeof data.body==='string'?data.body.slice(0,300):'Czas na jeden mały krok.';
 await self.registration.showNotification(title,{body,tag:typeof data.tag==='string'?data.tag.slice(0,80):'reminder',icon:new URL('./assets/empire.svg',self.registration.scope).href,data:{url:self.registration.scope}});
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 event.waitUntil((async()=>{const scope=self.registration.scope,windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const app=windows.find(w=>w.url.startsWith(scope));if(app){await app.focus();return;}await self.clients.openWindow(scope);})());
});
