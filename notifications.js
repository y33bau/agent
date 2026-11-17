import {defaultReminders,validateReminders,dueReminders,reminderMessage,localClock} from './notification-core.js';
const APP=document.documentElement.dataset.product==='adhd'?'adhd':'agent',KEY=APP+'_reminders_v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let config,dialog,timer,busy=false,lastSync='',syncTimer;
try{config=validateReminders(JSON.parse(localStorage.getItem(KEY)||'null'),APP);}catch{config=defaultReminders(APP);}
function save(){try{localStorage.setItem(KEY,JSON.stringify(config));}catch{status('Nie udało się zapisać ustawień.');}}
function supported(){return 'Notification' in window&&'serviceWorker' in navigator;}
function status(text){const el=document.getElementById('reminder-status');if(el)el.textContent=text;}
function hydrated(){
 if(APP!=='adhd')return false;try{const s=JSON.parse(localStorage.getItem('synapse_v2')||'null');const today=new Date().toLocaleDateString('en-CA');const local=new Date();const day=local.getFullYear()+'-'+String(local.getMonth()+1).padStart(2,'0')+'-'+String(local.getDate()).padStart(2,'0');return s?.water?.day===day&&s.water.count>=10;}catch{return false;}
}
function prune(){const day=localClock(Date.now(),config.zone).day;config.last=Object.fromEntries(Object.entries(config.last).filter(([k])=>k.startsWith(day)));}
function permissionLabel(){if(!supported())return 'Powiadomienia są niedostępne w tej przeglądarce. Na iPhonie otwórz aplikację dodaną do ekranu początkowego.';if(Notification.permission==='denied')return 'Powiadomienia są zablokowane. Zmień zgodę w ustawieniach przeglądarki.';return config.push?(config.enabled?'Push połączony. Przypomnienia mogą dochodzić także po zamknięciu aplikacji.':'Push połączony, harmonogram jest wyłączony. Włącz przypomnienia poniżej.'):config.enabled?'Przypomnienia są włączone przy otwartej aplikacji. Push po zamknięciu wymaga połączenia usługi poniżej.':'Wybierz godziny i włącz przypomnienia na tym urządzeniu.';}
function open(){
 if(!dialog){dialog=document.createElement('dialog');dialog.id='reminder-dialog';dialog.setAttribute('aria-labelledby','reminder-title');document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
 dialog.innerHTML='<div class="modal-head modal-heading"><h2 id="reminder-title">Przypomnienia po Twojemu</h2><button type="button" class="btn small" id="reminder-close" aria-label="Zamknij przypomnienia">×</button></div><p class="subtitle subtext" id="reminder-status" role="status">'+permissionLabel()+'</p><form id="reminder-form" style="margin-top:20px">'+
 (APP==='adhd'?'<label class="setting-line">Woda · porcja 200 ml<input type="checkbox" name="water" '+(config.water?'checked':'')+'></label>':'')+
 '<label class="setting-line">'+(APP==='agent'?'Następny telefon / follow-up':'Jeden mały krok / zadanie')+'<input name="work" type="checkbox" '+(config.work?'checked':'')+'></label><div class="form-grid" style="margin-top:17px"><label class="field">Od godziny<input type="number" name="start" min="0" max="23" required value="'+config.start+'"></label><label class="field">Do godziny<input type="number" name="end" min="1" max="24" required value="'+config.end+'"></label>'+
 (APP==='adhd'?'<label class="field">Woda co<select name="waterEvery">'+[30,60,90,120].map(n=>'<option value="'+n+'" '+(config.waterEvery===n?'selected':'')+'>'+n+' minut</option>').join('')+'</select></label>':'')+
 '<label class="field">Działanie co<select name="workEvery">'+[60,120,180,240].map(n=>'<option value="'+n+'" '+(config.workEvery===n?'selected':'')+'>'+n+' minut</option>').join('')+'</select></label></div><label class="setting-line">Tylko od poniedziałku do piątku<input type="checkbox" name="weekdays" '+(config.weekdays?'checked':'')+'></label><p class="subtitle subtext tiny">Godziny: '+esc(config.zone)+'. Powiadomienia są dobrowolne. Woda przestaje przypominać po zapisaniu 2 l danego dnia.</p><div class="form-actions"><button type="button" class="btn" id="reminder-disable">Wyłącz</button><button class="btn '+(APP==='adhd'?'primary':'gold')+'" type="submit">Włącz / zapisz przypomnienia</button></div></form><button class="btn" id="reminder-test" style="width:100%;margin-top:15px">Wyślij test na to urządzenie</button>'+
 '<details style="margin-top:23px"><summary style="cursor:pointer;font-size:12px;color:var(--muted)">Push przy zamkniętej aplikacji</summary><p class="subtitle subtext tiny">Wymaga aktywnej usługi powiadomień. Po połączeniu wyślemy jej tylko subskrypcję urządzenia i harmonogram — bez zadań, kontaktów i prowizji.</p><label class="field" style="margin-top:13px">Adres usługi HTTPS<input id="push-backend" type="url" placeholder="https://powiadomienia.example.workers.dev" value="'+esc(config.backend)+'"></label><label class="field">Klucz dostępu do własnej usługi<input id="push-token" type="password" autocomplete="off" value="'+esc(config.token)+'"></label><div class="row wrap"><button type="button" class="btn" id="push-connect">Połącz push</button><button type="button" class="btn" id="push-disconnect">Odłącz push</button></div></details>';
 dialog.querySelector('#reminder-close').addEventListener('click',()=>dialog.close());
 dialog.querySelector('#reminder-form').addEventListener('submit',async e=>{
 e.preventDefault();const data=new FormData(e.target);
 try{
 const next=validateReminders({...config,enabled:true,water:APP==='adhd'&&data.has('water'),work:data.has('work'),start:Number(data.get('start')),end:Number(data.get('end')),waterEvery:APP==='adhd'?Number(data.get('waterEvery')):60,workEvery:Number(data.get('workEvery')),weekdays:data.has('weekdays'),zone:Intl.DateTimeFormat().resolvedOptions().timeZone||'Europe/Warsaw'},APP);
 if(!supported()){status(permissionLabel());return;}const granted=await Notification.requestPermission();if(granted!=='granted'){status('Brak zgody na powiadomienia. Ustawienia nie zostały włączone.');return;}
 config=next;save();if(config.push)await registerPush();status(permissionLabel());tick();
 }catch(e){status(e.message);}
 });
 dialog.querySelector('#reminder-disable').addEventListener('click',async()=>{config.enabled=false;save();try{if(config.push)await registerPush();status('Przypomnienia wyłączone.');}catch(e){status('Lokalne przypomnienia wyłączone. Nie udało się zaktualizować serwera push — odłącz go po odzyskaniu połączenia.');}});
 dialog.querySelector('#reminder-test').addEventListener('click',async()=>{try{if(!supported())throw Error(permissionLabel());const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Najpierw zezwól na powiadomienia.');if(config.push){await api('/test',{deviceId:config.deviceId});status('Test push wysłany do usługi urządzenia.');}else{await notify({...reminderMessage(APP,'work'),body:'Test działa. W tym trybie aplikacja musi być otwarta.'});status('Test powiadomienia wysłany.');}}catch(e){status(e.message);}});
 dialog.querySelector('#push-connect').addEventListener('click',async()=>{
 try{
 if(!supported()||!('PushManager' in window))throw Error('Push jest niedostępny. Na iPhonie użyj aplikacji z ekranu początkowego.');
 const url=new URL(dialog.querySelector('#push-backend').value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Podaj poprawny adres HTTPS.');
 const token=dialog.querySelector('#push-token').value.trim();if(token.length<24)throw Error('Klucz usługi musi mieć co najmniej 24 znaki.');
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Najpierw zezwól na powiadomienia.');
 config.backend=url.origin;config.token=token;await registerPush();config.push=true;save();status(permissionLabel());
 }catch(e){config.push=false;save();status(e.message);}
 });
 dialog.querySelector('#push-disconnect').addEventListener('click',async()=>{try{if(config.backend&&config.deviceId)await api('/unsubscribe',{deviceId:config.deviceId});const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.getSubscription();await sub?.unsubscribe();config.push=false;config.backend='';config.token='';save();status('Push odłączony.');}catch(e){status('Nie udało się odłączyć usługi: '+e.message);}});
 if(!dialog.open)dialog.showModal();
}
async function notify(message){const reg=await navigator.serviceWorker.ready;await reg.showNotification(message.title,{body:message.body,tag:message.tag,icon:APP==='adhd'?'./assets/synapse.svg':'./assets/empire.svg',data:{url:reg.scope},renotify:false});}
async function api(path,body){
 const res=await fetch(config.backend+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+config.token,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
 if(!res.ok)throw Error(res.status===401?'Nieprawidłowy klucz usługi.':'Usługa powiadomień odpowiedziała błędem ('+res.status+').');
 return res.json();
}
function decodeKey(base64){const pad='='.repeat((4-base64.length%4)%4),raw=atob((base64+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function registerPush(){
 const reg=await navigator.serviceWorker.ready,{publicKey}=await api('/vapid-public-key');if(!publicKey)throw Error('Usługa nie zwróciła klucza push.');
 let sub=await reg.pushManager.getSubscription();if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(publicKey)});
 if(!config.deviceId)config.deviceId=crypto.randomUUID();
 const schedule={enabled:config.enabled,water:config.water,work:config.work,start:config.start,end:config.end,waterEvery:config.waterEvery,workEvery:config.workEvery,weekdays:config.weekdays,zone:config.zone};
 await api('/subscribe',{deviceId:config.deviceId,app:APP,subscription:sub.toJSON(),schedule,hydratedDay:hydrated()?localClock(Date.now(),config.zone).day:null});save();
}
async function tick(){
 if(busy||!config.enabled||config.push||!supported()||Notification.permission!=='granted')return;
 busy=true;try{prune();for(const item of dueReminders(config,Date.now(),hydrated())){await notify(reminderMessage(APP,item.kind));config.last[item.key]=true;}save();}catch{}finally{busy=false;}
}
document.addEventListener('click',e=>{if(e.target.closest('[data-action="notifications"]'))open();});
document.addEventListener('app-progress',()=>{
 if(!config.push)return;const value=hydrated()?'done':'pending';if(lastSync===value)return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>registerPush().then(()=>lastSync=value).catch(()=>{}),1000);
});
window.addEventListener('focus',tick);setInterval(tick,60000);tick();
