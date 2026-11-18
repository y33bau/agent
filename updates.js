const VERSION='2.4.6';
let registration,changed=false,checking=false,notice;
function offerUpdate(){
 changed=true;
 if(notice?.isConnected)return;
 notice=document.createElement('section');notice.setAttribute('role','status');
 notice.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(100px + env(safe-area-inset-bottom));z-index:200;padding:16px;border:1px solid #adbec7;border-radius:16px;background:#203d55;color:#fff;box-shadow:0 12px 40px #0008;display:flex;gap:12px;align-items:center;flex-wrap:wrap';
 const label=document.createElement('span');label.textContent='Nowa wersja jest gotowa. Zapisz otwarte formularze przed odświeżeniem.';label.style.flex='1 1 180px';
 const apply=document.createElement('button');apply.className='btn primary gold';apply.textContent='Wczytaj nową wersję';apply.addEventListener('click',()=>location.reload());
 const later=document.createElement('button');later.className='btn';later.textContent='Później';later.addEventListener('click',()=>notice.remove());
 notice.append(label,apply,later);document.body.append(notice);
 updateSettings();
}
function updateSettings(){
 const form=document.getElementById('settings-form');if(!form)return;
 let area=document.getElementById('app-update-settings');
 if(!area){
 area=document.createElement('section');area.id='app-update-settings';area.style.cssText='margin:20px 0;padding:16px 0;border-top:1px solid #ffffff25';
 const info=document.createElement('p');info.className='subtext subtitle';info.textContent='Wersja '+VERSION+' · Aktualizacje bez ponownej instalacji.';
 const button=document.createElement('button');button.type='button';button.className='btn';button.id='app-update-check';
 button.addEventListener('click',async()=>{
 if(changed){location.reload();return;}
 if(checking)return;checking=true;button.disabled=true;button.textContent='Sprawdzam…';
 try{
 registration=registration||await navigator.serviceWorker.getRegistration();
 if(!navigator.onLine)throw Error('offline');
 await registration?.update();
 if(registration?.waiting){registration.waiting.postMessage({type:'SKIP_WAITING'});button.textContent='Przygotowuję aktualizację…';}
 else if(!changed)button.textContent=registration?.installing?'Pobieram nową wersję…':'Masz aktualną wersję · sprawdź ponownie';
 }catch{button.textContent='Brak połączenia · spróbuj ponownie';}
 finally{checking=false;button.disabled=false;if(changed)button.textContent='Wczytaj nową wersję';}
 });
 area.append(info,button);form.after(area);
 }
 const button=area.querySelector('button');
 if(changed&&button.textContent!=='Wczytaj nową wersję')button.textContent='Wczytaj nową wersję';
 else if(!button.textContent)button.textContent='Sprawdź aktualizację';
}
if('serviceWorker' in navigator&&location.protocol!=='file:'){
 const hadController=!!navigator.serviceWorker.controller;
 navigator.serviceWorker.addEventListener('controllerchange',()=>{if(hadController)offerUpdate();});
 const watch=reg=>{
 registration=reg;
 if(reg.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
 reg.addEventListener('updatefound',()=>{
 const worker=reg.installing;
 worker?.addEventListener('statechange',()=>{if(worker.state==='activated'&&hadController)offerUpdate();});
 });
 };
 navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(watch).catch(()=>{});
 let lastCheck=0;
 const check=()=>{if(document.hidden||!navigator.onLine||!registration||Date.now()-lastCheck<60000)return;lastCheck=Date.now();registration.update().catch(()=>{});};
 document.addEventListener('visibilitychange',check);window.addEventListener('online',check);setInterval(check,30*60*1000);
 new MutationObserver(updateSettings).observe(document.body,{childList:true,subtree:true});updateSettings();
}
