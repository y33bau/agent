export const OFFER_STATUS = {draft:'Szkic', ready:'Gotowa', published:'Opublikowana', reserved:'Rezerwacja', closed:'Zamknięta', archived:'Archiwum'};
export const TRANSACTION = {sale:'Sprzedaż', rent:'Wynajem'};
export const DOCUMENT_TYPES = {agreement:'Umowa', consent:'Zgoda', property:'Dokument nieruchomości', protocol:'Protokół', correspondence:'Korespondencja', other:'Inny'};
export const DOCUMENT_STATUS = {needed:'Do pozyskania', received:'Otrzymany', signed:'Podpisany', checked:'Zweryfikowany'};
const NOTE_TYPES = {note:'Notatka', email:'E-mail', meeting:'Spotkanie', decision:'Ustalenie'};
const clean = (value, size) => String(value ?? '').trim().slice(0, size);
const choice = (choices, value, fallback) => Object.hasOwn(choices, value) ? value : fallback;
const fields = {
 profile:{email:180, source:120, summary:3000},
 offer:{title:160, property:100, location:150, description:8000, internal:3000},
 note:{body:4000},
 document:{title:160, reference:120, url:1200, description:1500, filename:255}
};
function numeric(value, max){
 if(value === '' || value == null) return null;
 const n = Number(value);
 if(!Number.isFinite(n) || n <= 0 || n > max || n !== Math.round(n * 100) / 100) throw Error('Sprawdź cenę i metraż.');
 return n;
}
export function crmRecord(kind, input){
 const limits = fields[kind];
 if(!limits) throw Error('Nieznany typ wpisu CRM.');
 const result = Object.fromEntries(Object.entries(limits).map(([key,max])=>[key,clean(input[key],max)]));
 if(kind === 'profile' && result.email && !/^[^\s@]+@[^\s@]+$/.test(result.email)) throw Error('Podaj poprawny adres e-mail.');
 if(['offer','document'].includes(kind) && !result.title) throw Error('Podaj tytuł.');
 if(kind === 'offer'){
  result.status = choice(OFFER_STATUS,input.status,'draft');
  result.transaction = choice(TRANSACTION,input.transaction,'sale');
  result.price = numeric(input.price,1e9);
  result.area = numeric(input.area,1e6);
  if(!result.property || !result.location) throw Error('Podaj typ i miejscowość nieruchomości.');
 }
 if(kind === 'note'){
  if(!result.body) throw Error('Wpisz treść.');
  result.type = choice(NOTE_TYPES,input.type,'note');
 }
 if(kind === 'document'){
  result.type = choice(DOCUMENT_TYPES,input.type,'other');
  result.status = choice(DOCUMENT_STATUS,input.status,'needed');
  if(result.url){
   let url;
   try {url = new URL(result.url);} catch {}
   if(url?.protocol !== 'https:' || url.username || url.password) throw Error('Wklej poprawny adres HTTPS bez danych logowania.');
  }
 }
 return result;
}
export {NOTE_TYPES};
export function crmData(state){
 return state.crm ?? {profiles:[], offers:[], notes:[], documents:[]};
}
export function validateCrm(crm, leads){
 if(crm === undefined) return;
 const clients = new Set(leads.map(lead=>lead.clientId || lead.id));
 const cases = new Map(leads.map(lead=>[lead.id,lead.clientId || lead.id]));
 const invalid = ()=>{throw Error('Nieprawidłowy zapis danych CRM.');};
 const ids = new Set(), profiles = new Set();
 const collections = {profiles:'profile', offers:'offer', notes:'note', documents:'document'};
 for(const [key,kind] of Object.entries(collections)){
  if(!Array.isArray(crm?.[key]) || crm[key].length > 10000) invalid();
  for(const entry of crm[key]){
   if(!entry || typeof entry.id !== 'string' || !entry.id || entry.id.length > 100 || ids.has(entry.id) ||
      !clients.has(entry.clientId) || !Number.isFinite(entry.updatedAt) || !Number.isFinite(entry.createdAt)) invalid();
   ids.add(entry.id);
   if(kind === 'profile'){
    if(profiles.has(entry.clientId)) invalid();
    profiles.add(entry.clientId);
   }
   if(kind === 'offer' && cases.get(entry.caseId) !== entry.clientId) invalid();
   if(kind === 'document' && (entry.filename ? !/^[a-z0-9-]{1,100}$/i.test(entry.fileKey ?? '') : entry.fileKey !== undefined)) invalid();
   const normalized = crmRecord(kind,entry);
   if(Object.keys(normalized).some(name=>normalized[name] !== entry[name])) invalid();
  }
 }
}
