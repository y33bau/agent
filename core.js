export const VERSION=2;
export const TYPES={
 call:{label:'Telefon',short:'Telefony',xp:15,coins:10,influence:1,icon:'phone'},
 followup:{label:'Follow-up',short:'Follow-upy',xp:20,coins:15,influence:1,icon:'arrow'},
 meeting:{label:'Spotkanie',short:'Spotkania',xp:60,coins:40,influence:3,icon:'calendar'},
 mandate:{label:'Pozyskana umowa',short:'Umowy',xp:120,coins:90,influence:5,icon:'key'},
 listing:{label:'Publikacja oferty',short:'Oferty',xp:70,coins:50,influence:3,icon:'home'},
 sale:{label:'Zamknięta transakcja',short:'Transakcje',xp:250,coins:180,influence:10,icon:'trophy'}
};
export const STAGES=[['new','Nowy kontakt'],['contacted','Po rozmowie'],['meeting','Spotkanie'],['mandate','Umowa'],['listed','Oferta'],['won','Zamknięty'],['lost','Odłożony']];
export const BUILDINGS=[
 {id:'office',name:'Siedziba',desc:'Od pierwszego biurka do biura, do którego chce się wracać.',icon:'building'},
 {id:'studio',name:'Studio ofert',desc:'Miejsce dla zdjęć, filmów i ofert, które robią wrażenie.',icon:'camera'},
 {id:'network',name:'Sieć kontaktów',desc:'Relacje budowane rozmowa po rozmowie.',icon:'network'}
];
export function uid(){return globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);}
export function dayKey(time=Date.now()){const d=new Date(time);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
export function isDay(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dayKey(new Date(s+'T12:00:00'))===s;}
export function offsetDay(day,n){const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+n);return dayKey(d);}
export function fresh(now=Date.now()){return {version:2,createdAt:now,settings:{name:'Adrian',agency:'ATRIA',calls:5,conversations:3,meetings:1,monthlyGoal:10000,bold:true,sound:false,motion:true},leads:[],activities:[],tasks:[],claims:[],purchases:[],rewards:[{id:'dinner',title:'Wieczór w restauracji',cost:180,archived:false},{id:'nightbrand',title:'Sesja NightBrand',cost:100,archived:false},{id:'treat',title:'Coś dla siebie',cost:300,archived:false}],buildings:{office:0,studio:0,network:0},upgrades:[],legacy:{xp:0,coins:0},focus:null,lastVisit:dayKey(now)};}
export const CASE_ROLES={buyer:'Kupujący',seller:'Sprzedający',tenant:'Najemca',landlord:'Wynajmujący'};
export function caseDetails(input){
 const details={};
 if(Object.hasOwn(CASE_ROLES,input.role))details.role=input.role;
 for(const [key,max] of [['price',1000000000],['rooms',100],['size',100000]]){
  if(input[key]===''||input[key]==null)continue;
  const value=Number(input[key]);
  if(!Number.isSafeInteger(value)||value<1||value>max)throw Error('Sprawdź kwotę, metraż i liczbę pokoi.');
  details[key]=value;
 }
 return details;
}
export function matchingCases(lead,leads){
 if(lead.archived||["won","lost"].includes(lead.stage))return [];
 const normalize=value=>value.trim().toLocaleLowerCase('pl');
 return leads.filter(other=>{
  if(other.id===lead.id||other.archived||['won','lost'].includes(other.stage))return false;
  const [buyer,offer]=['buyer','tenant'].includes(lead.role)?[lead,other]:[other,lead];
  const offerRole={buyer:'seller',tenant:'landlord'}[buyer.role];
  return !!offerRole&&offer.role===offerRole&&buyer.price>0&&offer.price>0&&offer.price<=buyer.price&&
   !!buyer.area.trim()&&normalize(buyer.area)===normalize(offer.area)&&
   normalize(buyer.property)===normalize(offer.property)&&
   (!buyer.rooms||offer.rooms>=buyer.rooms)&&(!buyer.size||offer.size>=buyer.size);
 });
}
export function makeLead(input,now=Date.now()){
 const name=String(input.name||'').trim().slice(0,100);if(!name)throw Error('Nadaj kontaktowi nazwę lub pseudonim.');
 const stage=STAGES.some(s=>s[0]===input.stage)?input.stage:'new';
 if(input.nextDate&&!isDay(input.nextDate))throw Error('Wybierz poprawną datę kontaktu.');
 return {...caseDetails(input),id:uid(),name,phone:String(input.phone||'').trim().slice(0,40),area:String(input.area||'Łańcut').trim().slice(0,100),property:String(input.property||'Mieszkanie').trim().slice(0,100),stage,nextDate:input.nextDate||dayKey(now),nextAction:String(input.nextAction||'Wykonaj pierwszy telefon').trim().slice(0,200),notes:String(input.notes||'').trim().slice(0,2000),createdAt:now,archived:false};
}
export function logActivity(s,input,now=Date.now()){
 if(!Object.hasOwn(TYPES,input.type))throw Error('Wybierz rodzaj działania.');
 if(input.id&&s.activities.some(a=>a.id===input.id))return null;
 const lead=input.leadId?s.leads.find(l=>l.id===input.leadId&&!l.archived):null;
 if(input.leadId&&!lead)throw Error('Ten kontakt nie jest dostępny.');
 const note=String(input.note||'').trim().slice(0,300);
 if(!lead&&!note)throw Error('Wybierz kontakt albo krótko opisz, co zrobiłeś.');
 const date=input.day||dayKey(now);if(!isDay(date)||date>dayKey(now))throw Error('Nie zapisujemy przyszłej aktywności jako wykonanej.');
 if(input.type==='sale'&&!lead)throw Error('Przypisz transakcję do kontaktu.');
 if(lead&&['sale','mandate','listing'].includes(input.type)&&s.activities.some(a=>!a.voided&&a.type===input.type&&a.leadId===lead.id))throw Error('Ten etap został już zapisany dla tego kontaktu.');
 const commission=input.type==='sale'?Number(input.commission):0;
 if(!Number.isFinite(commission)||commission<0||commission>10000000||Math.round(commission*100)!==commission*100&&Math.abs(Math.round(commission*100)-commission*100)>.00001)throw Error('Wpisz prowizję w zł, maksymalnie dwa miejsca po przecinku.');
 if(input.nextDate&&!isDay(input.nextDate))throw Error('Nieprawidłowa data następnego kroku.');
 const a={id:input.id||uid(),type:input.type,leadId:lead?.id||null,leadName:lead?.name||'',note,day:date,time:now,outcome:input.type==='call'?(input.outcome==='reached'?'reached':input.outcome==='declined'?'declined':'noanswer'):'done',commissionGrosz:Math.round(commission*100),voided:false};
 s.activities.push(a);
 if(lead){
  const stage={meeting:'meeting',mandate:'mandate',listing:'listed',sale:'won'}[a.type];
  if(stage)lead.stage=stage;else if(a.type==='call'&&a.outcome==='reached'&&lead.stage==='new')lead.stage='contacted';
  if(input.nextDate)lead.nextDate=input.nextDate;
  if(input.nextAction)lead.nextAction=String(input.nextAction).trim().slice(0,200);
 }
 return a;
}
export function taskProgress(s,t,day){const key=t.repeat==='daily'?day:'once';return t.records.filter(r=>r.occurrence===key);}
export function taskDone(s,t,day){return taskProgress(s,t,day).length===(t.steps.length||1);}
export function taskAvailable(t,day){return !t.archived&&t.date<=day;}
export function makeTask(input,now=Date.now()){
 const title=String(input.title||'').trim().slice(0,160);if(!title)throw Error('Wpisz cel misji.');
 const steps=(input.steps||[]).map(x=>String(x).trim().slice(0,160)).filter(Boolean).slice(0,10);
 return {id:uid(),title,date:isDay(input.date)?input.date:dayKey(now),repeat:input.repeat==='daily'?'daily':'none',tier:['small','normal','big'].includes(input.tier)?input.tier:'normal',steps,records:[],archived:false};
}
export const TASK_REWARDS={small:{xp:15,coins:10,influence:1},normal:{xp:40,coins:25,influence:2},big:{xp:80,coins:50,influence:4}};
function split(total,n,i){return Math.floor(total/n)+(i<total%n?1:0);}
export function completeTask(s,id,day=dayKey(),now=Date.now(),step=null){
 const t=s.tasks.find(t=>t.id===id);if(!t||!taskAvailable(t,day)||taskDone(s,t,day))return null;
 const n=t.steps.length||1,done=taskProgress(s,t,day),indices=step===null?Array.from({length:n},(_,i)=>i):[step],earned={xp:0,coins:0,influence:0};
 for(const i of indices){if(!Number.isInteger(i)||i<0||i>=n||done.some(r=>r.step===i))continue;
 const r={id:uid(),occurrence:t.repeat==='daily'?day:'once',day,time:now,step:i,xp:split(TASK_REWARDS[t.tier].xp,n,i),coins:split(TASK_REWARDS[t.tier].coins,n,i),influence:split(TASK_REWARDS[t.tier].influence,n,i)};
 t.records.push(r);for(const k of Object.keys(earned))earned[k]+=r[k];
 }return earned;
}
export function balance(s){
 const b={xp:s.legacy.xp,coins:s.legacy.coins,influence:0};
 for(const a of s.activities)if(!a.voided)for(const k of Object.keys(b))b[k]+=TYPES[a.type][k];
 for(const t of s.tasks)for(const r of t.records)for(const k of Object.keys(b))b[k]+=r[k];
 for(const c of s.claims){b.xp+=c.xp;b.coins+=c.coins;b.influence+=c.influence;}
 for(const p of s.purchases)b.coins-=p.cost;
 for(const u of s.upgrades)b.influence-=u.cost;
 return b;
}
export function totals(s,from,to=from){
 const a=s.activities.filter(a=>!a.voided&&a.day>=from&&a.day<=to);
 const count=type=>a.filter(x=>x.type===type).length;
 return {calls:count('call'),conversations:a.filter(x=>x.type==='call'&&x.outcome==='reached').length,meetings:count('meeting'),mandates:count('mandate'),listings:count('listing'),sales:count('sale'),followups:count('followup'),commissionGrosz:a.reduce((n,x)=>n+x.commissionGrosz,0)};
}
export function challenges(s,day=dayKey()){
 const stats=totals(s,day),goals=[['calls','Telefony',s.settings.calls,stats.calls,30,25],['conversations','Rozmowy',s.settings.conversations,stats.conversations,40,30],['meetings','Spotkanie',s.settings.meetings,stats.meetings,60,40]];
 return goals.map(([id,title,target,current,xp,coins])=>({id,title,target,current,xp,coins,influence:2,claimed:s.claims.some(c=>c.day===day&&c.goal===id)}));
}
export function claim(s,goal,day=dayKey(),now=Date.now()){
 const c=challenges(s,day).find(c=>c.id===goal);if(!c||c.claimed||c.current<c.target)throw Error('Najpierw wykonaj cel. Każdy bonus odbierasz raz dziennie.');
 s.claims.push({id:uid(),goal,day,time:now,target:c.target,xp:c.xp,coins:c.coins,influence:c.influence});return c;
}
function ensureUndo(s){const b=balance(s);if(b.coins<0||b.influence<0)throw Error('Nagroda jest już wydana. Najpierw uzbieraj saldo pozwalające ją cofnąć.');}
export function undoTask(s,id,day=dayKey()){
 const t=s.tasks.find(t=>t.id===id);if(!t)return;
 const old=t.records;t.records=t.records.filter(r=>r.occurrence!==(t.repeat==='daily'?day:'once'));
 try{ensureUndo(s);}catch(e){t.records=old;throw e;}
}
export function undoActivity(s,id){
 const a=s.activities.find(a=>a.id===id&&!a.voided);if(!a)throw Error('Nie ma takiego wpisu.');
 if(s.claims.some(c=>c.day===a.day&&((c.goal==='calls'&&a.type==='call')||(c.goal==='conversations'&&a.type==='call'&&a.outcome==='reached')||(c.goal==='meetings'&&a.type==='meeting')))){
 const copy={...s,activities:s.activities.map(x=>x===a?{...x,voided:true}:x)},stats=totals(copy,a.day);
 if(s.claims.some(c=>c.day===a.day&&stats[c.goal]<c.target))throw Error('Ten wpis jest podstawą odebranego bonusu dziennego. Nie można go cofnąć.');
 }
 a.voided=true;try{ensureUndo(s);}catch(e){a.voided=false;throw e;}
 // Stages are editable planning data; undoing a log does not silently move the pipeline.
}
export function levelInfo(xp){let level=1,needed=150;while(xp>=needed){xp-=needed;level++;needed=150+(level-1)*60;}const ranks=['Debiutant','Agent','Negocjator','Ekspert','Partner','Architekt imperium'];return {level,xp,needed,rank:ranks[Math.min(ranks.length-1,Math.floor((level-1)/3))]};}
export function redeem(s,id,now=Date.now()){
 const r=s.rewards.find(r=>r.id===id&&!r.archived);if(!r||balance(s).coins<r.cost)throw Error('Potrzebujesz jeszcze trochę żetonów.');
 const p={id:uid(),rewardId:r.id,title:r.title,cost:r.cost,day:dayKey(now),time:now};s.purchases.push(p);return p;
}
export function upgradeCost(s,id){return [8,18,30][s.buildings[id]]??null;}
export function upgrade(s,id,now=Date.now()){
 if(!BUILDINGS.some(b=>b.id===id))throw Error('Nie ma takiego budynku.');
 const cost=upgradeCost(s,id);if(cost===null)throw Error('To miejsce osiągnęło najwyższy poziom.');
 if(balance(s).influence<cost)throw Error('Jeszcze kilka działań i zdobędziesz potrzebny wpływ.');
 s.buildings[id]++;s.upgrades.push({id:uid(),building:id,cost,day:dayKey(now),time:now});
}
export function dueLeads(s,day=dayKey()){return s.leads.filter(l=>!l.archived&&!['won','lost'].includes(l.stage)&&l.nextDate&&l.nextDate<=day).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)||a.createdAt-b.createdAt);}
export function badges(s){
 const a=s.activities.filter(a=>!a.voided),types=t=>a.filter(x=>x.type===t).length;
 return [{id:'first',title:'Pierwszy ruch',desc:'Zapisz pierwsze działanie',icon:'spark',unlocked:a.length>=1},
 {id:'calls',title:'Telefon jest mój',desc:'Wykonaj 25 telefonów',icon:'phone',unlocked:types('call')>=25},
 {id:'closer',title:'Pierwszy klucz',desc:'Zamknij pierwszą transakcję',icon:'key',unlocked:types('sale')>=1},
 {id:'mandate',title:'Zaufanie na papierze',desc:'Pozyskaj 3 umowy',icon:'document',unlocked:types('mandate')>=3},
 {id:'empire',title:'Własny adres',desc:'Rozbuduj dowolną część biura',icon:'building',unlocked:Object.values(s.buildings).some(n=>n>0)}];
}
export function startFocus(s,minutes,now=Date.now()){if(s.focus)throw Error('Blok akwizycji już trwa.');if(![5,15,25,45].includes(minutes))throw Error('Nieprawidłowy czas.');s.focus={id:uid(),duration:minutes*60000,remaining:minutes*60000,endAt:now+minutes*60000,paused:false};}
export function remaining(f,now=Date.now()){return !f?0:f.paused?f.remaining:Math.max(0,f.endAt-now);}
export function pauseFocus(s,now=Date.now()){const f=s.focus;if(!f)return;if(f.paused){f.endAt=now+f.remaining;f.paused=false;}else{f.remaining=remaining(f,now);f.paused=true;}}
export function migrate(agent,quests,now=Date.now()){
 const s=fresh(now),n=v=>Number.isFinite(Number(v))?Math.max(0,Math.min(10000000,Math.floor(Number(v)))):0;
 s.legacy={xp:n(agent?.xp),coins:n(agent?.gold)};
 if(Array.isArray(quests))for(const q of quests.slice(0,1000)){if(!q||typeof q.title!=='string'||!q.title.trim())continue;const t=makeTask({title:q.title,tier:q.xp>=60?'big':q.xp>=25?'normal':'small'},now);s.tasks.push(t);if(q.completed){const reward=completeTask(s,t.id,dayKey(now),now);for(const r of t.records){r.xp=0;r.coins=0;r.influence=0;}}}
 return s;
}
export function validate(s){
 const fail=()=>{throw Error('Nieprawidłowa kopia danych AGENT EMPIRE v2.');},str=(v,n)=>typeof v==='string'&&v.length<=n,int=(v,max=10000000)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
 if(!s||s.version!==VERSION||!s.settings||!s.legacy||!s.buildings)fail();
 for(const key of ['leads','activities','tasks','claims','purchases','rewards','upgrades'])if(!Array.isArray(s[key])||s[key].length>100000)fail();
 if(!str(s.settings.name,40)||!str(s.settings.agency,50)||!int(s.settings.calls,100)||s.settings.calls<1||!int(s.settings.conversations,100)||s.settings.conversations<1||!int(s.settings.meetings,20)||s.settings.meetings<1||!int(s.settings.monthlyGoal,10000000)||s.settings.monthlyGoal<1)fail();
 for(const k of ['bold','sound','motion'])if(typeof s.settings[k]!=='boolean')fail();
 if(!int(s.legacy.xp)||!int(s.legacy.coins))fail();
 for(const b of BUILDINGS)if(!int(s.buildings[b.id],3))fail();
 const ids=new Set(),leadIds=new Set(),checks=(x)=>{if(!str(x.id,100)||!x.id||ids.has(x.id))fail();ids.add(x.id);};
 for(const l of s.leads){checks(l);leadIds.add(l.id);if(!str(l.name,100)||!l.name.trim()||!str(l.phone,40)||!str(l.area,100)||!str(l.property,100)||!str(l.nextAction,200)||!str(l.notes,2000)||!STAGES.some(x=>x[0]===l.stage)||!isDay(l.nextDate)||typeof l.archived!=='boolean'||!Number.isFinite(l.createdAt))fail();}
 for(const lead of s.leads){
  const details=caseDetails(lead);
  for(const key of ['role','price','rooms','size'])if(lead[key]!==details[key])fail();
 }
 for(const lead of s.leads)if(lead.clientId!==undefined&&(!leadIds.has(lead.clientId)||lead.clientId===lead.id))fail();
 const milestones=new Set();
 for(const a of s.activities){checks(a);if(!Object.hasOwn(TYPES,a.type)||!(a.leadId===null||leadIds.has(a.leadId))||!str(a.leadName,100)||!str(a.note,300)||!isDay(a.day)||!Number.isFinite(a.time)||!['reached','declined','noanswer','done'].includes(a.outcome)||!int(a.commissionGrosz,1000000000)||typeof a.voided!=='boolean')fail();if(a.type!=='sale'&&a.commissionGrosz!==0)fail();if(['sale','mandate','listing'].includes(a.type)&&a.leadId&&!a.voided){const key=a.leadId+':'+a.type;if(milestones.has(key))fail();milestones.add(key);}}
 for(const t of s.tasks){checks(t);if(!str(t.title,160)||!t.title.trim()||!isDay(t.date)||!['none','daily'].includes(t.repeat)||!Object.hasOwn(TASK_REWARDS,t.tier)||!Array.isArray(t.steps)||t.steps.length>10||t.steps.some(x=>!str(x,160))||!Array.isArray(t.records)||t.records.length>100000||typeof t.archived!=='boolean')fail();const seen=new Set();for(const r of t.records){checks(r);if(!isDay(r.day)||!Number.isFinite(r.time)||!(r.occurrence==='once'||isDay(r.occurrence))||!int(r.step,(t.steps.length||1)-1))fail();const key=r.occurrence+':'+r.step;if(seen.has(key))fail();seen.add(key);for(const k of ['xp','coins','influence'])if(!int(r[k],1000))fail();}}
 const claimed=new Set();
 for(const c of s.claims){checks(c);if(!['calls','conversations','meetings'].includes(c.goal)||!isDay(c.day)||!Number.isFinite(c.time)||!int(c.target,100)||c.target<1)fail();const key=c.day+':'+c.goal;if(claimed.has(key))fail();claimed.add(key);for(const k of ['xp','coins','influence'])if(!int(c[k],1000))fail();}
 for(const r of s.rewards){checks(r);if(!str(r.title,160)||!r.title.trim()||!int(r.cost,100000)||r.cost<1||typeof r.archived!=='boolean')fail();}
 for(const p of s.purchases){checks(p);if(!str(p.title,160)||!int(p.cost,100000)||p.cost<1||!isDay(p.day)||!Number.isFinite(p.time))fail();}
 for(const u of s.upgrades){checks(u);if(!BUILDINGS.some(b=>b.id===u.building)||![8,18,30].includes(u.cost)||!isDay(u.day)||!Number.isFinite(u.time))fail();}
 for(const b of BUILDINGS)if(s.upgrades.filter(u=>u.building===b.id).length!==s.buildings[b.id])fail();
 if(s.focus){const f=s.focus;if(!str(f.id,100)||![300000,900000,1500000,2700000].includes(f.duration)||!Number.isFinite(f.remaining)||f.remaining<0||f.remaining>f.duration||!Number.isFinite(f.endAt)||typeof f.paused!=='boolean')fail();}
 if(Object.values(balance(s)).some(v=>!Number.isSafeInteger(v)||v<0))fail();
 return s;
}
