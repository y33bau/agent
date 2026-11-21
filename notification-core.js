export function defaultReminders(app){return {enabled:false,water:app==='adhd',work:true,start:9,end:19,waterEvery:60,workEvery:180,weekdays:app==='agent',zone:'Europe/Warsaw',last:{},backend:'',token:'',push:false,deviceId:''};}
export function localClock(now=Date.now(),zone='Europe/Warsaw'){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',weekday:'short',hourCycle:'h23'}).formatToParts(new Date(now)).map(x=>[x.type,x.value]));
 return {day:p.year+'-'+p.month+'-'+p.day,minute:Number(p.hour)*60+Number(p.minute),weekend:['Sat','Sun'].includes(p.weekday)};
}
export function dueReminders(config,now=Date.now(),hydrationDone=false){
 const clock=localClock(now,config.zone);
 if(!config.enabled||config.weekdays&&clock.weekend)return [];
 const out=[];
 for(const kind of ['water','work']){
 if(!config[kind]||kind==='water'&&hydrationDone)continue;
 const every=kind==='water'?config.waterEvery:config.workEvery;
 if(![30,60,90,120,180,240].includes(every))continue;
 for(let minute=config.start*60;minute<config.end*60;minute+=every){
 if(clock.minute>=minute&&clock.minute<minute+5){
 const key=clock.day+':'+kind+':'+minute;if(!config.last?.[key])out.push({kind,key,day:clock.day,minute});
 }
 }
 }return out;
}
export function validateReminders(raw,app){
 const base=defaultReminders(app),v={...base,...raw};
 for(const k of ['enabled','water','work','weekdays','push'])if(typeof v[k]!=='boolean')throw Error('Nieprawidłowe ustawienia przypomnień.');
 if(!Number.isInteger(v.start)||!Number.isInteger(v.end)||v.start<0||v.end>24||v.start>=v.end)throw Error('Początek przypomnień musi być przed końcem.');
 for(const k of ['waterEvery','workEvery'])if(![30,60,90,120,180,240].includes(v[k]))throw Error('Wybierz odstęp z listy.');
 localClock(Date.now(),v.zone);v.last=typeof v.last==='object'&&v.last?v.last:{};
 return v;
}
export function reminderMessage(app,kind){
 if(kind==='water')return {title:'SYNAPSE · porcja wody',body:'Czas na 200 ml. Jeden mały rytuał w stronę celu 2 l.',tag:'synapse-water'};
 return app==='agent'?{title:'ATRIA CRM · następny kontakt',body:'Jeden kontakt. Jeden konkretny następny krok. Sprawdź ekran „Dziś”.',tag:'agent-work'}:{title:'SYNAPSE · mały krok',body:'Wybierz jedną rzecz. Spróbuj przez 5 minut — reszta może poczekać.',tag:'synapse-work'};
}
