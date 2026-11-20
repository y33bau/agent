import * as C from './core.js';
import {crmData} from './crm-core.js';
import {clientSections, crmTabs, offersView} from './crm-ui.js';
import {createCrmActions} from './crm-actions.js';
const KEY='agent_empire_v2',$=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
 grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 phone:'M8 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 2a13 13 0 0 1-6-6l2-2z',
 arrow:'M4 12h16m-6-6 6 6-6 6',calendar:'M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-11 4h2v2H9z',
 key:'M14 4a5 5 0 1 1-4 8L3 19v3h4v-3h3v-3l3-3M16 7h.01',
 home:'m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
 building:'M5 22V6h10v16M15 11h5v11M3 22h19M8 10h4m-4 4h4m-4 4h4M8 2h4v4',
 trophy:'M7 3h10v7a5 5 0 0 1-10 0zm10 1h4v3a4 4 0 0 1-4 4M7 4H3v3a4 4 0 0 0 4 4m5 4v5m-5 1h10',
 target:'M21 12a9 9 0 1 1-9-9M17 12a5 5 0 1 1-5-5m0 5 9-9m-5 0h5v5',
 gift:'M3 9h18v4H3zm2 4v8h14v-8M12 9v12m0-12C3 9 5 1 9 4zm0 0c9 0 7-8 3-5z',
 chart:'M4 20h17M6 16v-4m6 4V8m6 8V3',users:'M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21v-2a6 6 0 0 1 12 0v2M17 4a4 4 0 0 1 0 8m1 3a6 6 0 0 1 4 6',
 camera:'M3 7h5l2-3h4l2 3h5v14H3zM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
 network:'M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0M12 4v6m0 4v6M4 12h6m4 0h6M8 5l3 5m2 4 3 5M5 8l5 3m4 2 5 3M5 16l5-3m4-2 5-3',
 spark:'m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z',
 document:'M5 2h10l4 4v16H5zm10 0v5h4M8 12h8m-8 4h6',plus:'M12 5v14M5 12h14',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',check:'m5 12 4 4L19 6',coin:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0m-9-5v10m3-8h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H8'
};
function icon(name){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="'+(paths[name]||paths.spark)+'"/></svg>';}
let state,tab='dashboard',leadFilter='active',taskFilter='active',search='',notice='',loadFailed=false,saveFailed=false,toastTimer,lastTrigger,ringed=null,pendingImport=null,installPrompt=null;
try{
 const raw=localStorage.getItem(KEY);
 if(raw)state=C.validate(JSON.parse(raw));else{
  const a=localStorage.getItem('realestate_agent'),q=localStorage.getItem('realestate_quests');
  state=a||q?C.migrate(a?JSON.parse(a):null,q?JSON.parse(q):null):C.fresh();
  if(a||q)notice='Twój dotychczasowy dorobek jest tutaj. Dawna „prowizja” stała się żetonami gry. Rzeczywiste transakcje liczysz od osobnych wpisów.';
  localStorage.setItem(KEY,JSON.stringify(state));
 }
}catch{state=C.fresh();loadFailed=true;notice='Nie udało się odczytać danych. Oryginalny zapis pozostaje nienaruszony. W ustawieniach możesz go pobrać lub wczytać poprawną kopię.';}
const priorVisit=state.lastVisit,today=()=>C.dayKey(),money=n=>new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN',maximumFractionDigits:2}).format(n/100),number=n=>new Intl.NumberFormat('pl-PL').format(n);
function save(){if(loadFailed)return false;try{const raw=JSON.stringify(state);if(localStorage.getItem(KEY)!==raw)localStorage.setItem(KEY,raw);saveFailed=false;if(typeof document.dispatchEvent==='function')document.dispatchEvent(new Event('app-progress'));return true;}catch{saveFailed=true;toast('Nie udało się zapisać danych. Pobierz kopię w ustawieniach.');return false;}}
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),4500);}
function act(fn){try{fn();}catch(e){toast(e.message||'Nie udało się wykonać działania.');}}
function celebrate(earned){
 if(state.settings.motion&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const root=$('#confetti');root.replaceChildren();for(let i=0;i<18;i++){const p=document.createElement('i');p.className='confetti';p.style.cssText='--dx:'+(Math.random()-.5)*400+'px;--dy:'+(Math.random()-.5)*330+'px;--r:'+Math.random()*600+'deg;background:'+['#d9bd79','#b8cfa7','#eee9d4'][i%3];root.append(p);}setTimeout(()=>root.replaceChildren(),900);}
 if(state.settings.sound)try{const A=window.AudioContext||window.webkitAudioContext,ctx=new A();[440,554,659].forEach((hz,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.connect(g);g.connect(ctx.destination);o.frequency.value=hz;g.gain.setValueAtTime(.04,ctx.currentTime+i*.09);g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+i*.09+.2);o.start(ctx.currentTime+i*.09);o.stop(ctx.currentTime+i*.09+.22);});setTimeout(()=>ctx.close(),1200);}catch{}
 toast(earned?'Ruch wykonany. +'+earned.xp+' XP · +'+earned.coins+' żetonów':'Twoje imperium rośnie.');
}
function dateLabel(day){return new Date(day+'T12:00:00').toLocaleDateString('pl-PL',{day:'numeric',month:'short'});}
function datePill(day){return '<span class="date-pill '+(day<today()?'overdue':'')+'">'+(day===today()?'Dzisiaj':day<today()?'Do kontaktu · '+dateLabel(day):dateLabel(day))+'</span>';}
function heading(title,sub,action='log',label='Zapisz działanie'){return '<div class="page-heading"><div><h1>'+title+'</h1><p class="subtitle">'+sub+'</p></div>'+(action?'<button class="btn gold" data-action="'+action+'">'+icon('plus')+label+'</button>':'')+'</div>';}
function empty(title,sub,action,label,which='target'){return '<div class="empty">'+icon(which)+'<h3>'+title+'</h3><p>'+sub+'</p>'+(action?'<button class="btn ghost" data-action="'+action+'">'+label+'</button>':'')+'</div>';}
function city(full=false){
 const {office,studio,network}=state.buildings,h=office*15;
 return '<svg class="'+(full?'hero-art':'city-mini')+'" viewBox="0 0 370 250" aria-label="Panorama Twojego biura" role="img"><defs><linearGradient id="city-g" x2="0" y2="1"><stop stop-color="#d9bd79" stop-opacity=".15"/><stop offset="1" stop-color="#d9bd79" stop-opacity="0"/></linearGradient></defs><g fill="none" stroke="#d9bd79" stroke-width=".9" stroke-opacity=".6"><path d="M12 225h345M25 225v-54h36v54m5 0V124h48v101m8 0V84h58v141m-44-141V64h31v20m23 141V'+(81-h)+'h68v'+(144+h)+'m-55-'+(144+h)+'v-14h41v14m-33-14v-18h25v18m9-18v-24m20 169V130h48v95m8 0v-77h35v77"/><path d="M32 183h21m-21 12h21m-21 12h21M75 138h29m-29 13h29m-29 13h29m-29 13h29m-29 13h29m-29 13h29M133 99h35m-35 13h35m-35 13h35m-35 13h35m-35 13h35m-35 13h35m-35 13h35m-35 13h35m-35 13h35M201 95h45m-45 15h45m-45 15h45m-45 15h45m-45 15h45m-45 15h45m-45 15h45m-45 15h45M277 144h29m-29 13h29m-29 13h29m-29 13h29m-29 13h29M324 163h20m-20 13h20m-20 13h20m-20 13h20"/><path d="M12 234h345m-281 7h220" stroke-opacity=".2"/></g><path d="M190 225V'+(81-h)+'h68v'+(144+h)+'z" fill="url(#city-g)"/><g fill="#d9bd79" opacity=".6">'+(office?'<path d="M204 112h9v10h-9zm18 0h9v10h-9zm18 0h9v10h-9z"/>':'')+(studio?'<path d="M133 151h9v10h-9zm18 0h9v10h-9zm-18 26h9v10h-9z"/>':'')+(network?'<path d="M277 157h9v10h-9zm16 26h9v10h-9z"/>':'')+'</g><circle cx="322" cy="47" r="20" stroke="#d9bd79" stroke-opacity=".25" fill="#d9bd7905"/><path d="M37 57h35m-18-17v35" stroke="#d9bd79" stroke-opacity=".15"/></svg>';
}
function profile(){const b=C.balance(state),l=C.levelInfo(b.xp);return '<section class="panel profile"><div class="profile-head"><div class="rank-icon">'+icon('trophy')+'</div><div><div class="eyebrow">POZIOM '+l.level+' / '+esc(state.settings.agency)+'</div><h3>'+l.rank+'</h3><p class="tiny muted">'+esc(state.settings.name)+'</p></div></div><div class="progress-info"><span>Do kolejnego poziomu</span><span>'+l.xp+' / '+l.needed+' XP</span></div><div class="track" role="progressbar" aria-label="Do kolejnego poziomu" aria-valuenow="'+l.xp+'" aria-valuemin="0" aria-valuemax="'+l.needed+'"><div class="fill" style="width:'+Math.min(100,l.xp/l.needed*100)+'%"></div></div><div class="wallet"><div><strong>'+number(b.coins)+'</strong><small>◈ żetony nagród</small></div><div><strong>'+number(b.influence)+'</strong><small>◇ wpływ na rozwój biura</small></div></div></section>';}
function kpis(){
 const stats=C.totals(state,today()),week=C.totals(state,C.offsetDay(today(),-6),today());
 return '<div class="kpi-grid">'+[
 ['Telefony',stats.calls,'Dzisiaj · cel '+state.settings.calls,'phone',false],
 ['Rozmowy',stats.conversations,'Dzisiaj','users',false],
 ['Spotkania',week.meetings,'Ostatnie 7 dni','calendar',false],
 ['Umowy',week.mandates,'Ostatnie 7 dni','key',true]
 ].map(([name,value,sub,i,highlight])=>'<div class="kpi '+(highlight?'highlight':'')+'"><div class="kpi-head"><span>'+name+'</span>'+icon(i)+'</div><strong>'+value+'</strong><small>'+sub+'</small></div>').join('')+'</div>';
}
function coach(){const d=C.totals(state,today()),hour=new Date().getHours();if(hour<8||hour>=19)return 'Na dziś wystarczy? Zapisz następny krok na jutro. Rano masz działać, a nie zgadywać, od czego zacząć.';if(d.calls===0)return state.settings.bold?'Panel nie wykona za Ciebie telefonu. Wybierz jeden kontakt. Numer, oddech, pierwszy ruch.':'Zacznij od jednego telefonu. Tylko jedna rozmowa na początek.';if(d.calls<state.settings.calls)return 'Masz już '+d.calls+' telefonów. Jeszcze '+(state.settings.calls-d.calls)+' do celu. Jeden numer naraz.';return 'Plan telefonów dowieziony. Teraz dopilnuj follow-upów — dobra rozmowa zasługuje na następny krok.';}
function challengesPanel(){return '<section class="panel"><div class="section-head"><h2>Dzienny kontrakt</h2><span class="section-label">RESET O PÓŁNOCY</span></div>'+C.challenges(state).map((c,i)=>'<div class="mission"><div class="mission-title">'+icon(['phone','users','calendar'][i])+c.title+'<span class="mission-stats">'+c.current+' / '+c.target+'</span></div><div class="track"><div class="fill" style="width:'+Math.min(100,c.current/c.target*100)+'%"></div></div><div class="mission-foot"><span>+'+c.xp+' XP · +'+c.coins+' żetonów</span>'+(c.claimed?'<span style="color:var(--green)">✓ Bonus odebrany</span>':c.current>=c.target?'<button class="btn small gold" data-action="claim" data-id="'+c.id+'">Odbierz bonus</button>':'<span>Każdy ruch przybliża Cię do celu</span>')+'</div></div>').join('')+'</section>';}
function nextRow(l){return '<article class="lead-row"><div class="lead-monogram">'+esc(l.name.slice(0,1).toUpperCase())+'</div><div class="lead-info"><strong>'+esc(l.name)+'</strong><p>'+esc(l.nextAction||'Ustal kolejny krok')+'</p></div>'+datePill(l.nextDate)+'<button class="icon-btn" data-action="log-lead" data-id="'+esc(l.id)+'" aria-label="'+esc('Zapisz kontakt: '+l.name)+'">'+icon('arrow')+'</button></article>';}
const drawnMoves=new Set();
function drawMove(){
 const day=today();
 const contacts=C.dueLeads(state,day).map(lead=>{
  const number=lead.phone.replace(/[^+0-9]/g,'');
  const phone=/^\+?\d{6,15}$/.test(number)?'<a class="btn gold" href="tel:'+number+'">Zadzwoń</a>':'';
  return {key:'lead:'+lead.id,title:'Skontaktuj się z '+lead.name,detail:lead.nextAction,
   actions:phone+'<button class="btn" data-action="log-lead" data-id="'+esc(lead.id)+'">Zapisz wynik telefonu</button><button class="btn" data-action="client-card" data-id="'+esc(lead.id)+'">Karta klienta</button>'};
 });
 const missions=state.tasks.filter(task=>C.taskAvailable(task,day)&&!C.taskDone(state,task,day)).map(task=>({
  key:'task:'+task.id,title:task.title,detail:'Otwarta misja',
  actions:'<button class="btn gold" data-action="draw-missions">Otwórz misje</button>'
 }));
 const ideas=[
  ['Pozyskiwanie','Sprawdź 3 nowe ogłoszenia prywatne','Wybierz jedną ofertę, przy której możesz realnie pomóc właścicielowi.','portals'],
  ['Pozyskiwanie','Wróć do dawnego źródła poleceń','Wybierz jedną osobę i przygotuj krótką, osobistą wiadomość.','pipeline'],
  ['Pozyskiwanie','Przećwicz otwarcie rozmowy','Powiedz na głos dwa zdania, którymi przedstawisz się właścicielowi.'],
  ['Pozyskiwanie','Przygotuj odpowiedź na typową obiekcję','Zapisz krótką odpowiedź na pytanie o prowizję lub wyłączność.'],
  ['Pozyskiwanie','Zrób 5 minut akwizycji','Wybierz jedną ulicę albo miejscowość i sprawdź nowe ogłoszenia.','focus'],
  ['CRM','Uzupełnij jeden kontakt','Dopisz brakujący numer, preferowaną formę kontaktu albo istotną notatkę.','pipeline'],
  ['CRM','Zaplanuj kolejny krok w jednej sprawie','Ustal konkretne działanie i datę powrotu do klienta.','pipeline'],
  ['CRM','Przejrzyj sprawy po spotkaniach','Wybierz jedno spotkanie i przygotuj krótkie podsumowanie ustaleń.','pipeline'],
  ['CRM','Zapisz kryteria kupującego','Dopisz budżet, lokalizację i trzy warunki, na których klientowi zależy.','pipeline'],
  ['CRM','Uporządkuj jedną odłożoną sprawę','Sprawdź, czy warto do niej wrócić, i zaktualizuj etap.','pipeline'],
  ['Oferty','Porównaj 3 podobne nieruchomości','Zapisz cenę za metr i najważniejsze różnice.','portals'],
  ['Oferty','Sprawdź, co zmieniło się na rynku','Znajdź jedną zmianę ceny lub nową ofertę w rejonie, w którym działasz.','portals'],
  ['Oferty','Popraw pierwsze zdanie ogłoszenia','Umieść najważniejszy atut nieruchomości w pierwszym zdaniu.'],
  ['Oferty','Przejrzyj zdjęcia jednej oferty','Wybierz lepsze zdjęcie główne i wskaż jedno ujęcie do uzupełnienia.'],
  ['Oferty','Sprawdź kompletność ogłoszenia','Zweryfikuj metraż, piętro, opłaty i dostępność.'],
  ['Marketing','Zapisz pomysł na krótki film','Wybierz jeden atut nieruchomości i rozpisz trzy ujęcia.'],
  ['Marketing','Przygotuj szkic posta ATRIA','Zacznij od pytania, które często zadają klienci.'],
  ['Marketing','Przygotuj opis zdjęcia oferty','Wyjaśnij jednym zdaniem, co to miejsce daje kupującemu.'],
  ['Marketing','Sprawdź profil ATRIA oczami klienta','Zobacz, czy łatwo znaleźć telefon, ofertę i sposób kontaktu.','portals'],
  ['Marketing','Zapisz pomysł na poradę dla sprzedających','Wybierz jedną rzecz, którą warto przygotować przed pierwszą prezentacją.'],
  ['Teren','Sprawdź trasę na najbliższą prezentację','Zaplanuj dojazd, miejsce parkowania i punkt spotkania.','field'],
  ['Teren','Przygotuj trzy pytania na oględziny','Dopytaj o stan, koszty utrzymania i termin wydania.','field'],
  ['Teren','Zrób listę ujęć przed wizytą','Uwzględnij wejście, wnętrze, widok i otoczenie.','field'],
  ['Teren','Wybierz jedną okolicę do rozpoznania','Sprawdź dojazd, usługi i charakter zabudowy.','field'],
  ['Organizacja','Zaplanuj jeden blok telefonów','Wybierz porę i przygotuj krótką listę kontaktów.','focus'],
  ['Organizacja','Uporządkuj materiały jednej nieruchomości','Zbierz zdjęcia, opis i ustalenia w jednym miejscu.'],
  ['Organizacja','Rozbij jedną dużą misję','Zapisz pierwszy krok, który możesz zrobić dzisiaj.','missions'],
  ['Organizacja','Zapisz jedno działanie z ostatniej rozmowy','Dodaj następny krok do CRM, póki pamiętasz szczegóły.','pipeline']
 ];
 const labels={portals:'Otwórz portale',pipeline:'Otwórz CRM',field:'Otwórz Teren',missions:'Otwórz misje',focus:'Ustaw timer'};
 const suggestions=ideas.map(([category,title,detail,destination],index)=>({
  key:'idea:'+index,title,detail:category+' · '+detail,
  actions:destination?'<button class="btn gold" data-action="draw-open" data-id="'+destination+'">'+labels[destination]+'</button>':''
 }));
 const moves=[...contacts,...missions,...suggestions];
 let available=moves.filter(move=>!drawnMoves.has(move.key));
 if(!available.length){
  const last=[...drawnMoves].at(-1);
  drawnMoves.clear();
  available=moves.length>1?moves.filter(move=>move.key!==last):moves;
 }
 const move=available[Math.floor(Math.random()*available.length)];
 drawnMoves.add(move.key);
 modal('Twój wylosowany ruch','<h3>'+esc(move.title)+'</h3><p class="subtitle">'+esc(move.detail)+'</p><div class="row wrap">'+move.actions+'<button class="btn ghost" data-action="draw-move">Losuj jeszcze raz</button></div>');
}
function dashboardView(){
 const due=C.dueLeads(state);
 return (notice?'<div class="notice">'+esc(notice)+'</div>':'')+
  '<section class="office-intro"><div class="office-intro-content"><p class="office-agency">'+esc(state.settings.agency)+'</p>'+
  '<h1>Pulpit agenta</h1><p class="subtitle">Klienci, nieruchomości i oferty w jednym miejscu.</p>'+
  '<div class="row wrap office-intro-actions"><button class="btn gold" data-tab="pipeline">'+icon('users')+'Otwórz CRM</button>'+
  '<button class="btn ghost" data-action="crm-offer-pick">'+icon('plus')+'Nowa oferta</button></div>'+
  '</div></section>'+
  '<section class="office-metrics" aria-labelledby="office-metrics-title"><h2 id="office-metrics-title">Aktywność biura</h2>'+kpis()+'</section>'+
  '<div class="office-grid"><div class="office-column">'+
  '<section class="panel office-followups"><div class="section-head"><h2>Do oddzwonienia</h2></div><div class="next-list">'+
  (due.length?due.slice(0,4).map(nextRow).join(''):empty('Brak zaplanowanych telefonów.','Zaplanuj oddzwonienie w karcie klienta.','lead-add','Dodaj kontakt','phone'))+
  '</div></section>'+
  '<section class="panel office-shortcuts"><h2>Szybkie działania</h2><div class="dashboard-actions">'+
  '<button class="btn ghost" data-action="log-call">'+icon('phone')+'Zapisz telefon</button>'+
  '<button class="btn ghost" data-action="draw-move">'+icon('spark')+'Wylosuj działanie</button>'+
  '<button class="btn ghost" data-action="focus">'+icon('clock')+'Blok akwizycji</button>'+
  '<button class="btn ghost" data-action="log">'+icon('plus')+'Inne działanie</button></div></section></div>'+
  '<aside class="office-column" aria-label="Pogoda i postęp"><section class="panel dashboard-weather" id="dashboard-weather" aria-label="Data i pogoda"></section>'+profile()+'</aside></div>';
}
function leadCard(lead){
 const id=esc(lead.id);
 const stage=C.STAGES.find(([key])=>key===lead.stage)[1];
 const role=C.CASE_ROLES[lead.role];
 return '<article class="panel lead-card"><div class="section-head"><span class="stage-badge">'+(role?role+' · ':'')+stage+'</span>'+datePill(lead.nextDate)+'</div>'+
  '<h3>'+esc(lead.name)+'</h3><p class="lead-property">'+[lead.property,lead.area].filter(Boolean).map(esc).join(' · ')+'</p>'+
  '<div class="next-action"><small>NASTĘPNY KROK</small>'+esc(lead.nextAction||'Ustal kolejny krok')+'</div>'+
  '<div class="crm-card-actions"><button class="btn gold" data-action="client-card" data-id="'+id+'">Otwórz kartę</button>'+
  '<button class="btn ghost" data-action="log-lead" data-id="'+id+'">Zapisz telefon</button></div></article>';
}
let crmView='leads',offerFilter='all',offerSearch='';
function pipelineView(){
 if(crmView==='offers')return heading('Oferty nieruchomości','Szkice, opisy i oferty przypisane do klientów.','crm-offer-pick','Nowa oferta')+crmTabs(crmView)+offersView(state,offerFilter,offerSearch);
 const counts=C.STAGES.filter(x=>x[0]!=='lost').map(([id,title])=>'<button class="stage-count filter '+(leadFilter==='stage:'+id?'active':'')+'" data-lead-filter="stage:'+id+'"><strong>'+state.leads.filter(l=>!l.archived&&l.stage===id).length+'</strong>'+title+'</button>').join('');
 let leads=state.leads.filter(l=>leadFilter==='archive'?l.archived:!l.archived);
 if(leadFilter==='active')leads=leads.filter(l=>!['won','lost'].includes(l.stage));
 if(['late','today','later'].includes(leadFilter)){
  const day=today();
  leads=leads.filter(l=>!['won','lost'].includes(l.stage)&&(leadFilter==='late'?l.nextDate<day:leadFilter==='today'?l.nextDate===day:l.nextDate>day)).sort((a,b)=>a.nextDate.localeCompare(b.nextDate));
 }
 if(leadFilter.startsWith('role:'))leads=leads.filter(l=>l.role===leadFilter.slice(5));
 if(leadFilter.startsWith('stage:'))leads=leads.filter(l=>l.stage===leadFilter.slice(6));
 if(leadFilter==='won')leads=leads.filter(l=>l.stage==='won');
 const emails=new Map(crmData(state).profiles.map(profile=>[profile.clientId,profile.email]));
 leads=leads.filter(l=>[l.name,l.phone,l.area,l.property,emails.get(l.clientId||l.id)].join(' ').toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl')));
 const filters=[['active','W toku'],['late','Zaległe'],['today','Dzisiaj'],['later','Nadchodzące']];
 const extraFilters=[['all','Wszystkie'],['won','Zamknięte'],['archive','Archiwum']];
 const filterButton=([id,label])=>'<button class="filter '+(leadFilter===id?'active':'')+'" aria-pressed="'+(leadFilter===id)+'" data-lead-filter="'+id+'">'+label+'</button>';
 return heading('Klienci i leady','Zarządzaj sprawami, etapami i terminami kontaktu.', 'lead-add','Dodaj lead')+crmTabs(crmView)+
  '<div class="crm-toolbar"><input class="search" aria-label="Szukaj kontaktu" placeholder="Nazwisko, telefon, e-mail lub rejon" value="'+esc(search)+'">'+
  '<div class="crm-quick">'+filters.map(filterButton).join('')+'</div>'+
  '<details '+(leadFilter.startsWith('stage:')||leadFilter.startsWith('role:')||extraFilters.some(([id])=>id===leadFilter)?'open':'')+'><summary>Więcej filtrów i etapy</summary>'+
  '<div class="filters">'+extraFilters.concat(Object.entries(C.CASE_ROLES).map(([id,label])=>['role:'+id,label])).map(filterButton).join('')+'</div><div class="pipeline-summary">'+counts+'</div></details></div>'+
  '<div class="lead-grid" id="lead-grid">'+(leads.length?leads.map(leadCard).join(''):empty('Brak kontaktów w tym widoku.','Dodaj lead lub zmień filtr.','lead-add','Dodaj lead','users'))+'</div>';

}
function taskCard(t){
 const done=C.taskDone(state,t,today()),progress=C.taskProgress(state,t,today());
 return '<article class="task '+(done?'done':'')+'"><button class="check" data-action="'+(done?'task-undo':'task-complete')+'" data-id="'+esc(t.id)+'" aria-label="'+esc((done?'Cofnij: ':'Ukończ: ')+t.title)+'" '+(!C.taskAvailable(t,today())?'disabled':'')+'>'+(done?'✓':'')+'</button><div class="task-body"><h3 class="task-name">'+esc(t.title)+'</h3><p class="task-meta">+'+C.TASK_REWARDS[t.tier].xp+' XP · +'+C.TASK_REWARDS[t.tier].coins+' żetonów'+(t.repeat==='daily'?' · codziennie':'')+' · '+dateLabel(t.date)+'</p>'+(t.steps.length?'<div class="task-steps">'+t.steps.map((x,i)=>'<label class="task-step"><input type="checkbox" data-task="'+esc(t.id)+'" data-step="'+i+'" '+(progress.some(r=>r.step===i)?'checked disabled':'')+' '+(!C.taskAvailable(t,today())?'disabled':'')+'><span>'+esc(x)+'</span></label>').join('')+'</div>':'')+'</div><button class="icon-btn" data-action="task-edit" data-id="'+esc(t.id)+'" aria-label="Edytuj misję">⋯</button></article>';
}
function missionsView(){
 let tasks=state.tasks.filter(t=>taskFilter==='archive'?t.archived:!t.archived);if(taskFilter==='active')tasks=tasks.filter(t=>!C.taskDone(state,t,today()));if(taskFilter==='done')tasks=tasks.filter(t=>C.taskDone(state,t,today()));
 return heading('Plan, który zamieniasz w ruch.','Własne misje na zdjęcia, ogłoszenia, dokumenty i wszystkie sprawy pomiędzy.','task-add','Dodaj misję')+'<div class="dashboard"><div class="stack">'+challengesPanel()+'<section class="panel"><div class="toolbar"><h2>Twoje misje</h2><div class="filters">'+[['active','W toku'],['done','Zrobione'],['archive','Archiwum']].map(([v,l])=>'<button class="filter '+(taskFilter===v?'active':'')+'" data-task-filter="'+v+'">'+l+'</button>').join('')+'</div></div><div class="task-list">'+(tasks.length?tasks.map(taskCard).join(''):empty('Jedna konkretna rzecz na początek.','Podziel większe zadanie na małe kroki.','task-add','Dodaj misję'))+'</div></section></div><div class="stack"><section class="panel"><div class="eyebrow">GOTOWE PUNKTY STARTOWE</div><h2>Nie zaczynaj od pustej kartki.</h2><p class="subtitle">Dodaj misję, a potem dopasuj ją do swojej oferty.</p>'+[['offer','Przygotować ofertę nieruchomości'],['visit','Przygotować prezentację'],['follow','Uporządkować follow-upy']].map(([id,title])=>'<button class="btn ghost" style="width:100%;margin-top:12px" data-action="template" data-id="'+id+'">'+title+' ↗</button>').join('')+'</section><div class="coach"><div class="eyebrow">JEDNA ZASADA</div><p>Telefon i spotkanie zapisuj w działaniach. Misje zostaw na pozostałą pracę — dzięki temu statystyki pokazują to, co faktycznie zrobiłeś.</p></div></div></div>';
}
function empireView(){return heading('Budujesz więcej niż wynik.','Działania dają wpływ. Wpływ zamieniasz w rozwój swojego biura.',null)+'<section class="panel empire-hero"><div><div class="eyebrow">TWOJE IMPERIUM / '+esc(state.settings.agency)+'</div><h2 style="font-family:Georgia,serif;font-size:29px;font-weight:400">Własny adres.<br>Własne zasady.</h2><p class="subtitle">◇ '+number(C.balance(state).influence)+' wpływu do wykorzystania</p></div>'+city()+'</section><div class="rooms">'+C.BUILDINGS.map(b=>{const l=state.buildings[b.id],cost=C.upgradeCost(state,b.id);return '<section class="panel room" data-level="'+l+'"><div class="eyebrow">'+['OD CZEGOŚ SIĘ ZACZYNA','PIERWSZY ADRES','CORAZ WIĘKSZY ZASIĘG','PEŁEN POTENCJAŁ'][l]+'</div><div class="room-icon">'+icon(b.icon)+'</div><h2>'+b.name+'</h2><div class="room-level" aria-label="Poziom '+l+' z 3">'+[1,2,3].map(i=>'<span class="'+(l>=i?'on':'')+'"></span>').join('')+'</div><p>'+b.desc+'</p><button class="btn ghost" data-action="upgrade" data-id="'+b.id+'" '+(cost===null||C.balance(state).influence<cost?'disabled':'')+'>'+(cost===null?'✓ Maksymalny poziom':(l?'Rozbuduj':'Otwórz')+' · ◇ '+cost)+'</button></section>';}).join('')+'</div><div class="badges">'+C.badges(state).map(b=>'<div class="badge '+(b.unlocked?'unlocked':'')+'">'+icon(b.icon)+'<strong>'+b.title+'</strong><p>'+b.desc+'</p></div>').join('')+'</div>';}
function rewardsView(){return heading('Wynik ma też smak nagrody.','Żetony są walutą gry. Odpoczynek nie wymaga żadnej zapłaty.','reward-add','Dodaj nagrodę')+'<div class="toolbar"><span class="btn ghost">'+icon('coin')+number(C.balance(state).coins)+' żetonów</span><span class="tiny muted">Nagrody wybierasz sam.</span></div><div class="rewards-grid">'+state.rewards.filter(r=>!r.archived).map((r,i)=>'<section class="panel reward"><button class="icon-btn" data-action="reward-edit" data-id="'+esc(r.id)+'" aria-label="Edytuj nagrodę">⋯</button><div class="reward-art">'+icon(['gift','spark','trophy'][i%3])+'</div><h3>'+esc(r.title)+'</h3><div class="row between"><span class="tiny" style="color:var(--gold)">◈ '+r.cost+' żetonów</span><button class="btn small ghost" data-action="redeem" data-id="'+esc(r.id)+'" '+(C.balance(state).coins<r.cost?'disabled':'')+'>Odbierz ↗</button></div></section>').join('')+'</div>';}
function progressView(){
 const week=C.totals(state,C.offsetDay(today(),-6),today()),days=Array.from({length:7},(_,i)=>C.offsetDay(today(),i-6)),counts=days.map(d=>state.activities.filter(a=>!a.voided&&a.day===d).length),max=Math.max(1,...counts);
 const history=[...state.activities.map(a=>({...a,kind:'activity'})),...state.purchases.map(p=>({...p,kind:'purchase'})),...state.upgrades.map(u=>({...u,kind:'upgrade'})),...state.claims.map(c=>({...c,kind:'bonus'}))].sort((a,b)=>b.time-a.time).slice(0,100);
 return heading('Czarno na białym. Twój postęp.','Prawdziwe działania, zapisane transakcje i dorobek, który zostaje.',null)+'<div class="dashboard"><section class="panel"><div class="section-head"><h2>Ruch z ostatnich 7 dni</h2><span class="tiny muted">'+counts.reduce((a,b)=>a+b,0)+' działań</span></div><div class="chart" role="img" aria-label="'+esc(days.map((d,i)=>d+': '+counts[i]+' działań').join(', '))+'">'+days.map((d,i)=>'<div class="chart-col"><strong>'+counts[i]+'</strong><div class="chart-bar" style="height:'+(counts[i]/max*100)+'px"></div><small>'+esc(new Date(d+'T12:00:00').toLocaleDateString('pl-PL',{weekday:'short'}))+'</small></div>').join('')+'</div><p class="subtitle tiny">'+week.calls+' telefonów · '+week.meetings+' spotkań · '+week.mandates+' umów · '+week.sales+' transakcji</p></section>'+profile()+'</div><section class="panel" style="margin-top:21px"><div class="section-head"><h2>Dziennik agenta</h2><span class="tiny muted">Ostatnie 100 wpisów</span></div><div class="history">'+(history.length?history.map(e=>{const type=e.kind==='activity'?C.TYPES[e.type]:null;return '<div class="history-row" style="'+(e.voided?'opacity:.4':'')+'"><div class="history-icon">'+icon(type?.icon||'spark')+'</div><div style="min-width:0;flex:1"><h3>'+esc(type?type.label+(e.leadName?' · '+e.leadName:''):e.kind==='purchase'?e.title:e.kind==='upgrade'?'Rozbudowa: '+C.BUILDINGS.find(b=>b.id===e.building).name:'Bonus dzienny')+'</h3><p>'+dateLabel(e.day)+' · '+esc(type?e.note||({reached:'Rozmowa',noanswer:'Brak odpowiedzi',declined:'Odmowa',done:'Zapisane działanie'}[e.outcome]):e.kind==='purchase'?'Odebrana nagroda':e.kind==='upgrade'?'Nowy poziom biura':'Cel wykonany')+(e.voided?' · COFNIĘTE':'')+'</p></div><span class="amount">'+(e.type==='sale'?money(e.commissionGrosz):type?'+'+type.xp+' XP':e.kind==='purchase'?'−'+e.cost+' ◈':e.kind==='upgrade'?'−'+e.cost+' ◇':'+'+e.xp+' XP')+'</span>'+(type&&!e.voided?'<button class="icon-btn" data-action="activity-undo" data-id="'+esc(e.id)+'" aria-label="Cofnij wpis">↶</button>':'')+'</div>';}).join(''):empty('Pierwszy wpis czeka na Ciebie.','Zapisz działanie, a zobaczysz je tutaj.','log','Zapisz działanie','chart'))+'</div></section>';
}
function moreView(){
 const stats=C.totals(state,today().slice(0,7)+'-01',today());
 const p=Math.min(100,stats.commissionGrosz/(state.settings.monthlyGoal*100)*100);
 return heading('Więcej','')+'<div class="row wrap">'+tabs.slice(5).map(([id,title])=>'<button class="btn" data-tab="'+id+'">'+title+'</button>').join('')+'<button class="btn" data-action="settings">Ustawienia</button></div><div class="stack">'+profile()+challengesPanel()+
 '<section class="panel money-panel"><div class="section-head"><h2>Prowizje miesiąca</h2>'+icon('chart')+'</div><div class="money-number">'+money(stats.commissionGrosz)+'</div><p class="money-caption">Rzeczywiste kwoty wpisane przy zamkniętych transakcjach. Żetony gry nie są pieniędzmi.</p><div class="target-line"><span>Twój cel: '+money(state.settings.monthlyGoal*100)+'</span><span>'+Math.round(p)+'%</span></div><div class="track"><div class="fill" style="width:'+p+'%"></div></div><button class="btn text" data-action="log-sale" style="margin-top:12px">Zapisz transakcję ↗</button></section>'+'</div>';
}
function caseSummary(lead){
 const seeker=['buyer','tenant'].includes(lead.role);
 const fields=[C.CASE_ROLES[lead.role],lead.price&&((seeker?'Budżet do ':'Cena ')+money(lead.price*100)),
  lead.size&&((seeker?'Od ':'')+lead.size+' m²'),lead.rooms&&((seeker?'Od ':'')+lead.rooms+' pok.')].filter(Boolean);
 return fields.length?'<p class="subtitle">'+esc(fields.join(' · '))+'</p>':'';
}
function caseDetailsForm(lead){
 const roleOptions=Object.entries(C.CASE_ROLES).map(([id,label])=>'<option value="'+id+'" '+(lead?.role===id?'selected':'')+'>'+label+'</option>');
 const fields=[['price','Cena lub maks. budżet (zł)',1000000000],['size','Metraż lub minimum (m²)',100000],['rooms','Pokoje lub minimum',100]];
 return '<details '+(lead?.role?'open':'')+'><summary>Szczegóły sprawy</summary><label class="field">Rola klienta<select name="role"><option value="">Wybierz rolę</option>'+roleOptions.join('')+'</select></label>'+
  '<div class="form-grid">'+fields.map(([name,label,max])=>'<label class="field">'+label+'<input type="number" inputmode="numeric" min="1" max="'+max+'" name="'+name+'" value="'+esc(lead?.[name]??'')+'"></label>').join('')+'</div>'+
  '<p class="subtitle">Dla najmu podaj miesięczną kwotę. Do dopasowania używamy nazwy rejonu i rodzaju nieruchomości.</p></details>';
}
function clientCard(id,view='overview'){
 const lead=state.leads.find(item=>item.id===id);
 if(!lead)return;
 const clientId=lead.clientId||lead.id;
 const cases=state.leads.filter(item=>(item.clientId||item.id)===clientId);
 const ids=new Set(cases.map(item=>item.id));
 const matches=C.matchingCases(lead,state.leads);
 const matchingPanel=lead.role?'<h3>Pasujące sprawy</h3>'+(matches.length?matches.map(item=>
  '<section class="panel"><button class="btn text" data-action="client-card" data-id="'+esc(item.id)+'">'+esc(item.name+' · '+item.property+' · '+item.area)+'</button>'+caseSummary(item)+'</section>'
 ).join(''):'<p>Uzupełnij rejon, rodzaj i kwotę w obu sprawach. Dopasowania uwzględniają też podane minimum metrażu i pokoi.</p>'):'';

 const history=state.activities.filter(item=>ids.has(item.leadId)&&!item.voided).map(item=>({time:item.time,html:'<article class="crm-entry"><strong>'+esc(C.TYPES[item.type].label)+'</strong><small>'+esc(item.day)+' · '+esc(({reached:'Rozmowa',noanswer:'Brak odpowiedzi',declined:'Odmowa',done:'Zapisano'})[item.outcome])+'</small>'+(item.note?'<p class="crm-copy">'+esc(item.note)+'</p>':'')+'</article>'}));
 const overview='<div class="row wrap crm-case-actions"><button class="btn" data-action="lead-edit" data-id="'+esc(id)+'">Edytuj sprawę</button><button class="btn" data-action="case-add" data-id="'+esc(id)+'">Dodaj sprawę</button><button class="btn" data-action="log-lead" data-id="'+esc(id)+'">Zapisz kontakt</button></div><h3>Sprawy i nieruchomości</h3>'+cases.map(item=>'<section class="panel"><button class="btn text" data-action="client-card" data-id="'+esc(item.id)+'">'+esc(item.property+' · '+item.area)+'</button>'+caseSummary(item)+'<p>'+esc(C.STAGES.find(([stage])=>stage===item.stage)[1])+' · '+esc(item.nextDate)+' · '+esc(item.nextAction)+'</p><p>'+esc(item.notes)+'</p></section>').join('')+matchingPanel;
 const client=state.leads.find(item=>item.id===clientId)||lead;
 modal(client.name,clientSections(state,lead,history,view,overview));
}
const tabs=[['dashboard','Pulpit','grid'],['pipeline','CRM','users'],['field','Teren','phone'],['portals','Portale','building'],['more','Więcej','grid'],['missions','Misje','target'],['empire','Imperium','building'],['rewards','Nagrody','gift'],['progress','Postęp','chart']];
function render(){
 document.body.classList.toggle('calm',!state.settings.motion);
 $('#agency-label').textContent=state.settings.agency;$('#view-label').textContent=tabs.find(t=>t[0]===tab)[1];$('.avatar').textContent=state.settings.name.slice(0,1).toUpperCase()||'A';
 $('#connection').textContent=loadFailed?'● Zapis wstrzymany':saveFailed?'● Błąd zapisu':navigator.onLine?'● Zapis lokalny':'● Tryb offline';
 $('#nav').innerHTML=tabs.slice(0,5).map(([id,title,i])=>'<button class="nav-item '+((id===tab||id==='more'&&tabs.slice(5).some(item=>item[0]===tab))?'active':'')+'" data-tab="'+id+'" '+((id===tab||id==='more'&&tabs.slice(5).some(item=>item[0]===tab))?'aria-current="page"':'')+'>'+icon(i)+'<span>'+title+'</span></button>').join('');
 $('#main').setAttribute?.('data-view',tab);
 $('#main').innerHTML=({field:()=>heading('Teren',''),portals:()=>heading('Portale',''),more:moreView,dashboard:dashboardView,pipeline:pipelineView,missions:missionsView,empire:empireView,rewards:rewardsView,progress:progressView}[tab])();
 state.lastVisit=today();save();renderFocus();
}
function modal(title,body){lastTrigger=document.activeElement;$('#modal-content').innerHTML='<div class="modal-head"><h2 id="modal-title">'+esc(title)+'</h2><button class="icon-btn" data-action="close" aria-label="Zamknij">×</button></div>'+body;if(!$('#modal').open)$('#modal').showModal();$('#modal').scrollTop=0;}
function close(){if($('#modal').open)$('#modal').close();if(lastTrigger?.isConnected)lastTrigger.focus();}
function leadForm(id,source){
 const l=state.leads.find(l=>l.id===id);
 modal(l?'Edytuj sprawę':source?'Nowa sprawa klienta':'Nowy lead',
 '<form id="lead-form" data-id="'+esc(id||'')+'" data-client="'+esc(source?.clientId||source?.id||'')+'"><label class="field">Nazwa lub pseudonim<input name="name" maxlength="100" required value="'+esc((l||source)?.name||'')+'" placeholder="Np. Właściciel · mieszkanie centrum" autofocus></label><div class="form-grid"><label class="field">Telefon (opcjonalnie)<input name="phone" type="tel" maxlength="40" value="'+esc((l||source)?.phone||'')+'"></label><label class="field">Rejon<input name="area" maxlength="100" value="'+esc(l?.area||'Łańcut')+'"></label></div><div class="form-grid"><label class="field">Nieruchomość<input name="property" maxlength="100" value="'+esc(l?.property||'Mieszkanie')+'"></label><label class="field">Etap<select name="stage">'+C.STAGES.map(([v,x])=>'<option value="'+v+'" '+(l?.stage===v?'selected':'')+'>'+x+'</option>').join('')+'</select></label></div><div class="form-grid"><label class="field">Następny kontakt<input name="nextDate" type="date" required value="'+esc(l?.nextDate||today())+'"></label><label class="field">Konkretny następny krok<input name="nextAction" maxlength="200" value="'+esc(l?.nextAction||'Wykonaj pierwszy telefon')+'"></label></div>'+caseDetailsForm(l)+'<label class="field">Notatka<textarea name="notes" maxlength="2000" placeholder="Co warto pamiętać przed rozmową?">'+esc(l?.notes||'')+'</textarea><small>Dane zapisują się na urządzeniu; po włączeniu synchronizacji trafiają też do szyfrowanej chmury. Zapis etapu nie nalicza punktów ani prowizji.</small></label><div class="form-actions">'+(l?'<button class="btn danger" type="button" data-action="lead-archive" data-id="'+esc(l.id)+'">'+(l.archived?'Przywróć':'Archiwizuj')+'</button>':'')+'<button class="btn gold" type="submit">Zapisz sprawę</button></div></form>');
}
function logForm(type=null,leadId=null){
 if(!type){modal('Jaki ruch wykonałeś?','<p class="subtitle">Punkty za rzeczywistą pracę. Prowizja dopiero po wpisaniu transakcji.</p><div class="choice-grid">'+Object.entries(C.TYPES).map(([id,t])=>'<button class="choice" data-action="log-type" data-id="'+id+'">'+icon(t.icon)+'<strong>'+t.label+'</strong><small>+'+t.xp+' XP · +'+t.coins+' żetonów</small></button>').join('')+'</div>');return;}
 const t=C.TYPES[type],lead=state.leads.find(l=>l.id===leadId);
 modal(type==='call'?'Zapisz wynik telefonu':t.label+' — dobry ruch.',
 '<form id="activity-form" data-type="'+type+'" data-token="'+C.uid()+'"><label class="field">Kontakt'+(type==='sale'?' (wymagany)':'')+'<select name="leadId" '+(type==='sale'?'required':'')+'><option value="">'+(type==='sale'?'Wybierz kontakt':'Bez przypisania — opiszę działanie')+'</option>'+state.leads.filter(l=>!l.archived).map(l=>'<option value="'+esc(l.id)+'" '+(leadId===l.id?'selected':'')+'>'+esc(l.name)+'</option>').join('')+'</select></label>'+
 (type==='call'?'<label class="field">Wynik telefonu<select name="outcome"><option value="reached">Odebrał</option><option value="noanswer">Nie odebrał</option><option value="callback">Oddzwoni</option><option value="declined">Odmowa</option></select></label>':'')+
 (type==='sale'?'<label class="field">Rzeczywista prowizja z tej transakcji (zł)<input name="commission" type="number" min="0" max="10000000" step=".01" required placeholder="Np. 8500"><small>Wpisz uzgodnioną kwotę. To nie jest prognoza ani żeton gry.</small></label>':'')+
 '<label class="field">Krótki opis<input name="note" maxlength="300" placeholder="'+(lead?'Np. właściciel potwierdził termin':'Np. telefon w sprawie mieszkania w centrum')+'"><small>Wymagany, jeśli nie przypisujesz kontaktu.</small></label><label class="field">Data wykonania<input name="day" type="date" required max="'+today()+'" value="'+today()+'"></label>'+
 (type==='call'?'<div class="row wrap followup-shortcuts" aria-label="Szybki termin kontaktu"><button type="button" class="btn ghost" data-action="followup-date" data-id="1">Jutro</button><button type="button" class="btn ghost" data-action="followup-date" data-id="3">Za 3 dni</button><button type="button" class="btn ghost" data-action="followup-date">Wybierz datę</button></div>':'')+
 (type!=='sale'?'<div class="form-grid"><label class="field">Następny kontakt (opcjonalnie)<input name="nextDate" type="date" value="'+esc(lead?.nextDate||'')+'"></label><label class="field">Następny krok<input name="nextAction" maxlength="200" value="'+esc(lead?.nextAction||'')+'" placeholder="Np. wysłać propozycję spotkania"></label></div>':'')+
 '<div class="notice" style="margin-top:10px">+'+t.xp+' XP · +'+t.coins+' żetonów · +'+t.influence+' wpływu. Wynik telefonu nie odbiera Ci punktów za próbę.</div><div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button><button class="btn gold" type="submit">Zapisz wykonane działanie</button></div></form>');
}
function taskForm(id,template=null){
 const t=state.tasks.find(t=>t.id===id),locked=!!t?.records.length;
 const templates={offer:{title:'Przygotować ofertę nieruchomości',steps:['Wybrać zdjęcia','Napisać opis','Sprawdzić szczegóły i opublikować'],tier:'big'},visit:{title:'Przygotować prezentację',steps:['Potwierdzić termin','Przygotować informacje o nieruchomości','Sprawdzić dojazd i klucze'],tier:'normal'},follow:{title:'Uporządkować follow-upy',steps:['Przejrzeć otwarte kontakty','Ustalić kolejny krok dla każdego'],tier:'normal'}},base=t||templates[template]||{};
 modal(t?'Twoja misja.':'Jedna rzecz, którą dowieziesz.',
 '<form id="task-form" data-id="'+esc(id||'')+'"><label class="field">Cel misji<input name="title" required maxlength="160" value="'+esc(base.title||'')+'" autofocus></label><div class="form-grid"><label class="field">Wielkość<select name="tier" '+(locked?'disabled':'')+'>'+[['small','Mały krok · 15 XP'],['normal','Zadanie · 40 XP'],['big','Wyzwanie · 80 XP']].map(([v,l])=>'<option value="'+v+'" '+((base.tier||'normal')===v?'selected':'')+'>'+l+'</option>').join('')+'</select></label><label class="field">Powtarzanie<select name="repeat" '+(locked?'disabled':'')+'><option value="none">Jednorazowo</option><option value="daily" '+(t?.repeat==='daily'?'selected':'')+'>Codziennie</option></select></label></div><label class="field">Kiedy?<input name="date" type="date" required value="'+esc(t?.date||today())+'" '+(locked?'disabled':'')+'></label><label class="field">Małe kroki (opcjonalnie)<textarea name="steps" maxlength="1700" '+(locked?'disabled':'')+' placeholder="Jeden krok w wierszu">'+esc(base.steps?.join('\n')||'')+'</textarea><small>'+(locked?'Po rozpoczęciu budżet i kroki są stałe. Możesz poprawić tytuł.':'Do 10 kroków. Łączna nagroda zostaje taka sama.')+'</small></label><div class="form-actions">'+(t?'<button class="btn danger" type="button" data-action="task-archive" data-id="'+esc(t.id)+'">'+(t.archived?'Przywróć':'Archiwizuj')+'</button>':'')+'<button class="btn gold" type="submit">Zapisz misję</button></div></form>');
}
function rewardForm(id){
 const r=state.rewards.find(r=>r.id===id);
 modal(r?'Twoja nagroda.':'Na co zbierasz?',
 '<form id="reward-form" data-id="'+esc(id||'')+'"><label class="field">Nagroda<input name="title" maxlength="160" required value="'+esc(r?.title||'')+'" placeholder="Np. wyjście na dobrą kolację" autofocus></label><label class="field">Koszt w żetonach<input name="cost" type="number" min="1" max="100000" step="1" required value="'+(r?.cost||150)+'"><small>Telefon daje 10 żetonów, spotkanie 40, pozyskanie umowy 90.</small></label><div class="form-actions">'+(r?'<button class="btn danger" type="button" data-action="reward-archive" data-id="'+esc(r.id)+'">Usuń z oferty</button>':'')+'<button class="btn gold" type="submit">Zapisz nagrodę</button></div></form>');
}
function settings(){
 modal('Twoje zasady gry.',
 '<form id="settings-form"><div class="form-grid"><label class="field">Imię<input name="name" maxlength="40" value="'+esc(state.settings.name)+'"></label><label class="field">Biuro<input name="agency" maxlength="50" value="'+esc(state.settings.agency)+'"></label></div><h3 style="margin-bottom:14px">Dzienny kontrakt</h3><div class="form-grid">'+[['calls','Telefony',100],['conversations','Rozmowy',100],['meetings','Spotkania',20]].map(([k,l,max])=>'<label class="field">'+l+'<input name="'+k+'" type="number" min="1" max="'+max+'" step="1" required value="'+state.settings[k]+'"></label>').join('')+'<label class="field">Cel prowizji / miesiąc (zł)<input name="monthlyGoal" type="number" min="1" max="10000000" step="1" required value="'+state.settings.monthlyGoal+'"></label></div>'+[['bold','Motywacja bez owijania'],['sound','Dźwięk po wykonaniu'],['motion','Delikatne animacje i celebracje']].map(([k,l])=>'<label class="setting-line">'+l+'<input name="'+k+'" type="checkbox" '+(state.settings[k]?'checked':'')+'></label>').join('')+'<div class="form-actions"><button class="btn gold" type="submit">Zapisz ustawienia</button></div></form><hr style="border:0;border-top:1px solid var(--line);margin:24px 0"><button class="btn ghost" data-action="notifications" style="width:100%;margin-bottom:20px">Powiadomienia i przypomnienia</button><h3>Kopia danych</h3><p class="subtitle">Kontakty i postęp są lokalne. Eksportuj kopię, zanim zmienisz urządzenie lub wyczyścisz przeglądarkę. Kopia zawiera dane CRM i linki do dokumentów. Załączone pliki pobierz osobno z kart klientów.</p><div class="row wrap" style="margin-top:14px"><button class="btn" data-action="export">↓ Pobierz kopię</button><button class="btn" data-action="import">↑ Wczytaj kopię</button>'+(loadFailed?'<button class="btn danger" data-action="raw-export">Pobierz oryginalny zapis</button>':'')+'</div><input id="import-file" type="file" accept=".json,application/json" hidden><p class="subtitle tiny">Instalacja na iPhonie: Safari → Udostępnij → Do ekranu początkowego. Offline działa po pierwszym pełnym otwarciu.</p>'+(installPrompt?'<button class="btn ghost" style="margin-top:12px" data-action="install">Zainstaluj aplikację</button>':'')+'<p class="subtitle tiny">Blok akwizycji nie blokuje innych aplikacji. Prowizje są Twoimi wpisami, bez integracji z bankiem lub CRM.</p>');
}
function renderFocus(){
 const f=state.focus,bar=$('#focus-bar');bar.hidden=!f;if(!f)return;
 const left=C.remaining(f),seconds=Math.ceil(left/1000),text=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
 document.title=left===0?'Blok zakończony — AGENT EMPIRE':text+' — AGENT EMPIRE';
 const sig=[f.id,f.paused,left===0].join('|');if(bar.dataset.sig===sig&&bar.querySelector('.focus-time')){bar.querySelector('.focus-time').textContent=text;return;}bar.dataset.sig=sig;
 bar.innerHTML='<span class="focus-time" role="timer">'+text+'</span><div class="focus-caption"><strong>'+(left===0?'Blok zakończony.':'Blok akwizycji')+'</strong><small>'+(f.paused?'Pauza. Wracasz, kiedy chcesz.':'Jeden kontakt. Potem następny.')+'</small></div>'+(left===0?'<button class="btn small gold" data-action="focus-finish">Gotowe</button>':'<button class="btn small" data-action="focus-pause">'+(f.paused?'Wznów':'Pauza')+'</button>')+'<button class="icon-btn" data-action="focus-stop" aria-label="Zakończ blok">×</button>';
 if(left===0&&ringed!==f.id){ringed=f.id;toast('Blok skończony. Zapisz wykonane działania i zrób przerwę.');}
}
function download(raw,name){const url=URL.createObjectURL(new Blob([raw],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function rawBackup(){return localStorage.getItem(KEY)||JSON.stringify({realestate_agent:localStorage.getItem('realestate_agent'),realestate_quests:localStorage.getItem('realestate_quests')},null,2);}
const crmActions=createCrmActions({getState:()=>state,uid:C.uid,modal,clientCard,toast,commit(update){
 const previous=state,next=structuredClone(state);
 update(next);C.validate(next);state=next;
 if(!save()){state=previous;throw Error('Nie udało się zapisać danych CRM.');}
 render();
}});
document.addEventListener('click',e=>{
 const button=e.target.closest('button');if(!button)return;
 act(()=>{
 if(button.dataset.tab){tab=button.dataset.tab;if(button.dataset.queue){leadFilter=button.dataset.queue;crmView='leads';}render();$('#main').focus();window.scrollTo({top:0,behavior:'instant'});return;}
 if(button.dataset.leadFilter){leadFilter=button.dataset.leadFilter;render();return;}
 if(button.dataset.taskFilter){taskFilter=button.dataset.taskFilter;render();return;}
 const action=button.dataset.action,id=button.dataset.id;
 if(action==='crm-view'){crmView=id;render();document.querySelector('[data-action=crm-view][aria-pressed=true]')?.focus();return;}
 if(action?.startsWith('crm-')){crmActions.onAction(action,id).catch(error=>toast(error.message));return;}
 switch(action){
 case 'close':close();break;
 case 'draw-move':drawMove();break;
 case 'draw-open':if(id==='focus'){close();document.querySelector('[data-action=focus]')?.click();break;}close();tab=id;render();$('#main').focus();window.scrollTo(0,0);break;
 case 'draw-missions':close();tab='missions';taskFilter='active';render();$('#main').focus();window.scrollTo(0,0);break;
 case 'settings':settings();break;
 case 'lead-add':leadForm();break;
 case 'client-card':clientCard(id,button.dataset.section);break;
 case 'client-view':clientCard(id,button.dataset.section);$('#modal-content [aria-pressed=true]')?.focus();break;
 case 'case-add':leadForm(null,state.leads.find(item=>item.id===id));break;
 case 'lead-edit':leadForm(id);break;
 case 'lead-archive':{const l=state.leads.find(l=>l.id===id);l.archived=!l.archived;save();close();render();toast(l.archived?'Kontakt w archiwum. Możesz go przywrócić.':'Kontakt przywrócony.');break;}
 case 'log':logForm();break;
 case 'log-call':logForm('call');break;
 case 'log-sale':logForm('sale');break;
 case 'log-type':logForm(id);break;
 case 'followup-date':{
  const field=button.form?.elements.nextDate;
  if(!field)break;
  if(id){
   const date=new Date();
   date.setHours(12,0,0,0);
   date.setDate(date.getDate()+Number(id));
   field.value=C.dayKey(date);
  }else{
   field.focus();
   try{field.showPicker?.();}catch{}
  }
  break;
 }
 case 'log-lead':logForm('call',id);break;
 case 'claim':{const reward=C.claim(state,id);save();render();celebrate(reward);break;}
 case 'task-add':taskForm();break;
 case 'task-edit':taskForm(id);break;
 case 'template':taskForm(null,id);break;
 case 'task-complete':{const reward=C.completeTask(state,id);if(reward){save();render();celebrate(reward);}break;}
 case 'task-undo':C.undoTask(state,id);save();render();toast('Cofnięto wykonanie i jego nagrody.');break;
 case 'task-archive':{const t=state.tasks.find(t=>t.id===id);t.archived=!t.archived;save();close();render();break;}
 case 'upgrade':C.upgrade(state,id);save();render();celebrate();break;
 case 'reward-add':rewardForm();break;
 case 'reward-edit':rewardForm(id);break;
 case 'reward-archive':state.rewards.find(r=>r.id===id).archived=true;save();close();render();break;
 case 'redeem':{const r=state.rewards.find(r=>r.id===id);modal('Czas na coś dobrego.','<p class="subtitle">'+esc(r.title)+' · '+r.cost+' żetonów</p><div class="form-actions"><button class="btn" data-action="close">Jeszcze zbieram</button><button class="btn gold" data-action="redeem-confirm" data-id="'+esc(id)+'">Odbieram nagrodę</button></div>');break;}
 case 'redeem-confirm':{const p=C.redeem(state,id);save();close();render();toast('Twoja nagroda: '+p.title+'. Korzystaj!');break;}
 case 'activity-undo':modal('Cofnąć ten wpis?','<p class="subtitle">Odwrócimy punkty i wpisaną prowizję. Etap kontaktu pozostanie do ręcznej korekty. Odebrany bonus dzienny lub wydane nagrody mogą uniemożliwić cofnięcie.</p><div class="form-actions"><button class="btn" data-action="close">Anuluj</button><button class="btn ghost" data-action="activity-undo-confirm" data-id="'+esc(id)+'">Cofnij wpis</button></div>');break;
 case 'activity-undo-confirm':C.undoActivity(state,id);save();close();render();toast('Wpis cofnięty. Jeśli potrzeba, popraw etap kontaktu.');break;
 case 'focus':if(state.focus){toast('Twój blok już trwa. Timer jest na dole.');break;}modal('Odkładamy rozpraszacze.','<p class="subtitle">Wybierz blok. Działania zapisujesz osobno — sam czas nie daje punktów.</p><div class="choice-grid">'+[5,15,25,45].map(n=>'<button class="choice" data-action="focus-start" data-id="'+n+'">'+icon('clock')+'<strong>'+n+' minut</strong><small>'+(n===5?'Pierwszy ruch.':'Telefony i follow-upy.')+'</small></button>').join('')+'</div>');break;
 case 'focus-start':C.startFocus(state,Number(id));save();close();renderFocus();break;
 case 'focus-pause':C.pauseFocus(state);save();renderFocus();break;
 case 'focus-stop':modal('Zakończyć blok?','<p class="subtitle">Zapisane działania zostają. Nie ma kary za przerwę.</p><div class="form-actions"><button class="btn" data-action="close">Wracam do bloku</button><button class="btn ghost" data-action="focus-finish">Zakończ blok</button></div>');break;
 case 'focus-finish':state.focus=null;save();close();render();document.title='AGENT EMPIRE — Twój następny ruch';toast('Blok zakończony. Zapisz działania, których jeszcze nie dodałeś.');break;
 case 'export':download(JSON.stringify(state,null,2),'agent-empire-'+today()+'.json');break;
 case 'raw-export':download(rawBackup(),'agent-empire-oryginalny-zapis.json');break;
 case 'import':$('#import-file').click();break;
 case 'import-confirm':if(pendingImport){download(rawBackup(),'agent-empire-przed-importem-'+today()+'.json');localStorage.setItem(KEY,JSON.stringify(pendingImport));state=pendingImport;pendingImport=null;loadFailed=false;saveFailed=false;notice='Kopia wczytana. Wracasz na swój teren.';close();render();toast('Dane przywrócone.');}break;
 case 'install':installPrompt?.prompt();installPrompt=null;break;
 }
 });
});
document.addEventListener('input',e=>{if(e.target.matches('.search')){if(crmView==='offers')offerSearch=e.target.value;else search=e.target.value;const value=e.target.selectionStart;render();const input=$('.search');input?.focus();input?.setSelectionRange(value,value);}});
document.addEventListener('change',e=>{
 if(e.target.name==='offer-status-filter'){offerFilter=e.target.value;render();document.querySelector('[name=offer-status-filter]')?.focus();}
 if(e.target.matches('[data-step]'))act(()=>{const reward=C.completeTask(state,e.target.dataset.task,today(),Date.now(),Number(e.target.dataset.step));if(reward){save();render();celebrate(reward);}});
 if(e.target.id==='import-file'){const file=e.target.files[0];if(!file)return;if(file.size>15000000){toast('Kopia jest za duża. Maksymalnie 15 MB.');return;}file.text().then(raw=>act(()=>{pendingImport=C.validate(JSON.parse(raw));modal('Wczytać tę kopię?','<p class="subtitle">Zastąpi aktualne dane: '+pendingImport.leads.length+' kontaktów i '+pendingImport.activities.length+' działań. Najpierw pobierzemy obecną kopię bezpieczeństwa.</p><div class="form-actions"><button class="btn" data-action="close">Anuluj</button><button class="btn gold" data-action="import-confirm">Wczytaj kopię</button></div>');})).catch(()=>toast('Nie udało się odczytać pliku.'));}
});
document.addEventListener('submit',e=>{
 if(['crm-record-form','crm-pick-form'].includes(e.target.id)){
  e.preventDefault();const submit=e.target.querySelector('[type=submit]');
  if(e.target.dataset.saving)return;
  e.target.dataset.saving='true';if(submit)submit.disabled=true;
  crmActions.onSubmit(e.target).catch(error=>toast(error.message)).finally(()=>{delete e.target.dataset.saving;if(submit)submit.disabled=false;});return;
 }
 if(!['lead-form','activity-form','task-form','reward-form','settings-form'].includes(e.target.id))return;e.preventDefault();
 act(()=>{
 const form=e.target,data=new FormData(form),values=Object.fromEntries(data);
 if(form.id==='lead-form'){
  const next=structuredClone(state),lead=C.makeLead(values);
  const old=next.leads.find(item=>item.id===form.dataset.id);
  if(form.dataset.id&&!old)throw Error('Sprawa klienta jest niedostępna.');
  const clientId=old?.clientId||old?.id||form.dataset.client||lead.id;
  if(old){
   for(const key of ['role','price','size','rooms'])delete old[key];
   Object.assign(old,lead,{id:old.id,createdAt:old.createdAt,archived:old.archived});
  }else{
   if(form.dataset.client)lead.clientId=clientId;
   next.leads.push(lead);
  }
  for(const item of next.leads.filter(item=>(item.clientId||item.id)===clientId)){
   item.name=lead.name;
   item.phone=lead.phone;
  }
  C.validate(next);
  const previous=state;
  state=next;
  if(!save()){state=previous;return;}
  render();clientCard(old?.id||lead.id);toast('Sprawa zapisana.');
 }
 if(form.id==='activity-form'){
  if(form.dataset.type==='call'&&values.outcome==='callback'){
   values.outcome='reached';
   values.note=('Klient oddzwoni. '+values.note.trim()).trim();
  }
  const a=C.logActivity(state,{...values,id:form.dataset.token,type:form.dataset.type});if(a){save();close();render();celebrate(C.TYPES[a.type]);}}
 if(form.id==='task-form'){const old=state.tasks.find(t=>t.id===form.dataset.id),locked=!!old?.records.length,t=C.makeTask({...values,steps:locked?old.steps:String(values.steps||'').split('\n'),tier:locked?old.tier:values.tier,date:locked?old.date:values.date,repeat:locked?old.repeat:values.repeat});if(old)Object.assign(old,t,{id:old.id,records:old.records,archived:old.archived});else state.tasks.push(t);save();close();render();toast('Misja gotowa. Teraz pierwszy krok.');}
 if(form.id==='reward-form'){const title=String(values.title||'').trim().slice(0,160),cost=Number(values.cost);if(!title||!Number.isSafeInteger(cost)||cost<1||cost>100000)throw Error('Podaj nazwę i koszt od 1 do 100 000 żetonów.');const r=state.rewards.find(r=>r.id===form.dataset.id);if(r)Object.assign(r,{title,cost});else state.rewards.push({id:C.uid(),title,cost,archived:false});save();close();render();toast('Nagroda zapisana.');}
 if(form.id==='settings-form'){const next={name:String(values.name||'').trim().slice(0,40),agency:String(values.agency||'').trim().slice(0,50),calls:Number(values.calls),conversations:Number(values.conversations),meetings:Number(values.meetings),monthlyGoal:Number(values.monthlyGoal),bold:data.has('bold'),sound:data.has('sound'),motion:data.has('motion')};C.validate({...state,settings:next});state.settings=next;save();close();render();toast('Zasady zapisane. Gramy dalej.');}
 });
});
$('#modal').addEventListener('click',e=>{if(e.target===$('#modal')){const r=$('#modal').getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
window.addEventListener('online',render);window.addEventListener('offline',render);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue)act(()=>{state=C.validate(JSON.parse(e.newValue));close();render();toast('Postęp odświeżony z drugiej karty.');});});
let lastDay=today();setInterval(()=>{renderFocus();if(lastDay!==today()){lastDay=today();render();}},1000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){renderFocus();if(lastDay!==today()){lastDay=today();render();}}});
render();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').then(reg=>{if(navigator.serviceWorker.controller)return;if(reg.active)toast('Twoje centrum dowodzenia jest gotowe offline.');else reg.addEventListener('updatefound',()=>reg.installing?.addEventListener('statechange',e=>{if(e.target.state==='activated')toast('Twoje centrum dowodzenia jest gotowe offline.');}));}).catch(()=>toast('Tryb offline chwilowo niedostępny. Zapis lokalny nadal działa.'));

// Shared add-ons use the existing validator and persistence path.
document.addEventListener('companion-state',e=>{const q=e.detail;if(q.action==='read'){q.result=structuredClone(state);return;}try{if(loadFailed)throw Error('Najpierw odzyskaj oryginalny zapis w ustawieniach.');const before=state,next=structuredClone(state);q.update(next);C.validate(next);state=next;if(!save()){state=before;throw Error('Nie udało się zapisać zmiany.');}render();q.result=true;}catch(err){q.error=err.message;}});
