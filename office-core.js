// ATRIA CRM: logika biura (prezentacje, umowy pośrednictwa, checklisty, RODO, szablony, import, raporty).
// Czyste funkcje bez DOM, aby dało się je testować w Node.
import {crmData} from './crm-core.js';

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const clean = (value, size) => String(value ?? '').trim().slice(0, size);
const isDay = value => typeof value === 'string' && DAY.test(value) && !Number.isNaN(new Date(value + 'T12:00:00').getTime());
const lower = value => String(value ?? '').trim().toLocaleLowerCase('pl');
const newId = () => globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2);
export const dayOf = (time = Date.now()) => {
 const d = new Date(time);
 return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
export const addDays = (day, n) => {
 const d = new Date(day + 'T12:00:00');
 d.setDate(d.getDate() + n);
 return dayOf(d);
};
export const daysBetween = (from, to) => Math.round((new Date(to + 'T12:00:00') - new Date(from + 'T12:00:00')) / 86400000);

export const VIEWING_STATUS = {planned:'Zaplanowana', done:'Odbyta', cancelled:'Odwołana'};
export const INTEREST = {'':'Bez oceny', high:'Zainteresowany', maybe:'Do namysłu', no:'Nie pasuje'};
export const CHECKLIST = [
 ['kw', 'Odpis księgi wieczystej'],
 ['ownership', 'Podstawa nabycia (akt, postanowienie)'],
 ['zoning', 'Wypis z rejestru gruntów / MPZP'],
 ['dues', 'Zaświadczenie o braku zaległości'],
 ['residents', 'Zaświadczenie o braku zameldowanych'],
 ['energy', 'Świadectwo charakterystyki energetycznej'],
 ['reservation', 'Umowa rezerwacyjna'],
 ['preliminary', 'Umowa przedwstępna'],
 ['financing', 'Finansowanie kupującego (kredyt, decyzja)'],
 ['notary', 'Termin i akt notarialny'],
 ['handover', 'Protokół zdawczo-odbiorczy i liczniki']
];
export const DEFAULT_TEMPLATES = [
 {id:'tpl-after-call', title:'Po rozmowie', body:'Dzień dobry, dziękuję za rozmowę. Zgodnie z ustaleniami odezwę się z propozycjami. W razie pytań jestem pod tym numerem.\n{agent}, {biuro}'},
 {id:'tpl-offer', title:'Wysyłam ofertę', body:'Dzień dobry, przesyłam ofertę: {oferta}, {lokalizacja}, {cena}. Chętnie umówię prezentację. Kiedy Panu/Pani pasuje?\n{agent}, {biuro}'},
 {id:'tpl-viewing', title:'Potwierdzenie prezentacji', body:'Dzień dobry, potwierdzam prezentację nieruchomości {oferta} ({lokalizacja}) w dniu {data}. Do zobaczenia!\n{agent}, {biuro}'},
 {id:'tpl-documents', title:'Prośba o dokumenty', body:'Dzień dobry, do dalszych kroków potrzebuję jeszcze dokumentów: {dokumenty}. Mogą Państwo przesłać skany odpowiedzią na tę wiadomość.\n{agent}, {biuro}'},
 {id:'tpl-follow', title:'Przypomnienie po czasie', body:'Dzień dobry, wracam z pytaniem, czy temat nieruchomości jest nadal aktualny. Mam nowe propozycje, chętnie porozmawiam.\n{agent}, {biuro}'}
];

export function officeData(state){
 const office = state.office ?? {};
 return {
  viewings: office.viewings ?? [],
  mandates: office.mandates ?? [],
  checklists: office.checklists ?? [],
  consents: office.consents ?? [],
  templates: office.templates ?? null
 };
}
export function ensureOffice(state){
 state.office = officeData(state);
 return state.office;
}
export const templatesOf = state => officeData(state).templates ?? DEFAULT_TEMPLATES;
const clientOf = lead => lead.clientId || lead.id;
const isSeeker = lead => ['buyer', 'tenant'].includes(lead?.role);

// --- Prezentacje ---
export function viewingRecord(input){
 const date = clean(input.date, 10), time = clean(input.time, 5);
 if(!isDay(date)) throw Error('Wybierz datę prezentacji.');
 if(time && !TIME.test(time)) throw Error('Podaj godzinę w formacie GG:MM.');
 const status = Object.hasOwn(VIEWING_STATUS, input.status) ? input.status : 'planned';
 const interest = Object.hasOwn(INTEREST, input.interest ?? '') ? (input.interest ?? '') : '';
 const rating = input.rating === '' || input.rating == null ? 0 : Number(input.rating);
 if(!Number.isInteger(rating) || rating < 0 || rating > 5) throw Error('Ocena to liczba od 1 do 5.');
 return {date, time, status, interest, rating, feedback:clean(input.feedback, 2000), notes:clean(input.notes, 1000)};
}
export function saveViewing(state, input, now = Date.now()){
 const office = ensureOffice(state);
 const buyer = state.leads.find(lead => lead.id === input.buyerId && !lead.archived);
 if(!buyer) throw Error('Wybierz klienta, który ogląda nieruchomość.');
 const offer = crmData(state).offers.find(entry => entry.id === input.offerId);
 if(!offer) throw Error('Wybierz ofertę.');
 if(clientOf(buyer) === offer.clientId) throw Error('Właściciel oferty nie może być oglądającym.');
 const info = viewingRecord(input);
 const old = input.id ? office.viewings.find(entry => entry.id === input.id) : null;
 if(input.id && !old) throw Error('Prezentacja zmieniła się. Otwórz ją ponownie.');
 const entry = {...info, id:old?.id || newId(), buyerId:buyer.id, offerId:offer.id, createdAt:old?.createdAt ?? now, updatedAt:now};
 if(old) office.viewings[office.viewings.indexOf(old)] = entry;
 else office.viewings.push(entry);
 return entry;
}

// --- Umowy pośrednictwa ---
export function saveMandate(state, input, now = Date.now()){
 const office = ensureOffice(state);
 const lead = state.leads.find(entry => entry.id === input.leadId);
 if(!lead) throw Error('Sprawa jest niedostępna.');
 const start = clean(input.start, 10), end = clean(input.end, 10);
 if(!isDay(start) || !isDay(end)) throw Error('Podaj datę początku i końca umowy.');
 if(end < start) throw Error('Koniec umowy nie może być przed jej początkiem.');
 const commission = input.commission === '' || input.commission == null ? 0 : Number(input.commission);
 if(!Number.isFinite(commission) || commission < 0 || commission > 100 || Math.round(commission * 100) / 100 !== commission) throw Error('Prowizja to procent od 0 do 100, maks. 2 miejsca po przecinku.');
 const old = office.mandates.find(entry => entry.leadId === lead.id);
 const entry = {id:old?.id || newId(), leadId:lead.id, exclusive:input.exclusive === true || input.exclusive === 'on', start, end, commission,
  number:clean(input.number, 60), notes:clean(input.notes, 1000), createdAt:old?.createdAt ?? now, updatedAt:now};
 if(old) office.mandates[office.mandates.indexOf(old)] = entry;
 else office.mandates.push(entry);
 return entry;
}
export function expiringMandates(state, day = dayOf(), within = 14){
 return officeData(state).mandates
  .map(mandate => ({mandate, lead:state.leads.find(lead => lead.id === mandate.leadId), left:daysBetween(day, mandate.end)}))
  .filter(item => item.lead && !item.lead.archived && !['won', 'lost'].includes(item.lead.stage) && item.left <= within)
  .sort((a, b) => a.left - b.left);
}

// --- Checklista transakcji ---
export function checklistFor(state, leadId){
 return officeData(state).checklists.find(entry => entry.leadId === leadId)?.done ?? [];
}
export function toggleStep(state, leadId, key, now = Date.now()){
 if(!CHECKLIST.some(([id]) => id === key)) throw Error('Nieznany krok.');
 if(!state.leads.some(lead => lead.id === leadId)) throw Error('Sprawa jest niedostępna.');
 const office = ensureOffice(state);
 let entry = office.checklists.find(item => item.leadId === leadId);
 if(!entry){entry = {leadId, done:[], updatedAt:now}; office.checklists.push(entry);}
 entry.done = entry.done.includes(key) ? entry.done.filter(item => item !== key) : CHECKLIST.map(([id]) => id).filter(id => id === key || entry.done.includes(id));
 entry.updatedAt = now;
 return entry.done.includes(key);
}

// --- RODO ---
export function saveConsent(state, input, now = Date.now()){
 const office = ensureOffice(state);
 const clientId = input.clientId;
 if(!state.leads.some(lead => lead.id === clientId)) throw Error('Klient jest niedostępny.');
 const processing = clean(input.processing, 10), marketing = clean(input.marketing, 10);
 for(const value of [processing, marketing]) if(value && !isDay(value)) throw Error('Sprawdź daty zgód.');
 const old = office.consents.find(entry => entry.clientId === clientId);
 const entry = {clientId, processing, marketing, basis:clean(input.basis, 300), updatedAt:now};
 if(old) office.consents[office.consents.indexOf(old)] = entry;
 else office.consents.push(entry);
 return entry;
}
export const consentFor = (state, clientId) => officeData(state).consents.find(entry => entry.clientId === clientId);
// Usuwa klienta, jego sprawy i wszystkie powiązane wpisy. Zwraca klucze plików do usunięcia z IndexedDB.
export function eraseClient(state, clientId){
 const ids = new Set(state.leads.filter(lead => clientOf(lead) === clientId).map(lead => lead.id));
 if(!ids.size) throw Error('Klient jest niedostępny.');
 const crm = crmData(state);
 const offers = new Set(crm.offers.filter(offer => offer.clientId === clientId).map(offer => offer.id));
 const fileKeys = crm.documents.filter(doc => doc.clientId === clientId && doc.fileKey).map(doc => doc.fileKey);
 state.leads = state.leads.filter(lead => !ids.has(lead.id));
 for(const activity of state.activities) if(ids.has(activity.leadId)){activity.leadId = null; activity.leadName = ''; activity.note = activity.note ? '[usunięto na żądanie klienta]' : '';}
 if(state.crm){
  for(const key of ['profiles', 'offers', 'notes', 'documents']) state.crm[key] = state.crm[key].filter(entry => entry.clientId !== clientId);
 }
 const office = ensureOffice(state);
 office.viewings = office.viewings.filter(entry => !ids.has(entry.buyerId) && !offers.has(entry.offerId));
 office.mandates = office.mandates.filter(entry => !ids.has(entry.leadId));
 office.checklists = office.checklists.filter(entry => !ids.has(entry.leadId));
 office.consents = office.consents.filter(entry => !ids.has(entry.clientId));
 return fileKeys;
}

// --- Szablony ---
export function saveTemplate(state, input){
 const office = ensureOffice(state);
 const list = office.templates ?? structuredClone(DEFAULT_TEMPLATES);
 const title = clean(input.title, 80), body = clean(input.body, 2000);
 if(!title || !body) throw Error('Podaj nazwę i treść szablonu.');
 const old = input.id ? list.find(entry => entry.id === input.id) : null;
 if(input.id && !old) throw Error('Szablon zmienił się. Otwórz go ponownie.');
 if(!old && list.length >= 50) throw Error('Masz już 50 szablonów.');
 if(old) Object.assign(old, {title, body});
 else list.push({id:'tpl-' + newId(), title, body});
 office.templates = list;
}
export function removeTemplate(state, id){
 const office = ensureOffice(state);
 office.templates = (office.templates ?? structuredClone(DEFAULT_TEMPLATES)).filter(entry => entry.id !== id);
}
export function fillTemplate(body, values){
 return body.replace(/\{([a-ząćęłńóśźż]+)\}/gi, (match, key) => {
  const value = values[key.toLocaleLowerCase('pl')];
  return value ? String(value) : match;
 });
}
export const firstName = name => clean(name, 100).split(/\s+/)[0] || '';
export function normalizePhone(value){
 let digits = String(value ?? '').replace(/[^\d+]/g, '');
 if(digits.startsWith('00')) digits = '+' + digits.slice(2);
 if(digits.startsWith('+48')) digits = digits.slice(3);
 else if(digits.startsWith('48') && digits.length === 11) digits = digits.slice(2);
 digits = digits.replace(/\D/g, '');
 return digits.length >= 9 ? digits : '';
}
export function waNumber(value){
 const digits = normalizePhone(value);
 return digits.length === 9 ? '48' + digits : digits;
}

// --- Kojarzenie popytu z ofertami ---
const OPEN_OFFERS = ['ready', 'published'];
function offerFits(buyer, offer){
 const transaction = buyer.role === 'tenant' ? 'rent' : 'sale';
 if(!OPEN_OFFERS.includes(offer.status) || offer.transaction !== transaction || offer.clientId === clientOf(buyer)) return false;
 if(buyer.price && (offer.price === null || offer.price > buyer.price)) return false;
 if(buyer.size && (offer.area === null || offer.area < buyer.size)) return false;
 if(buyer.property && lower(buyer.property) !== lower(offer.property)) return false;
 const area = lower(buyer.area);
 if(area && !lower(offer.location).includes(area) && !area.includes(lower(offer.location))) return false;
 return true;
}
export function matchOffers(state, buyer){
 if(!isSeeker(buyer) || buyer.archived || ['won', 'lost'].includes(buyer.stage)) return [];
 return crmData(state).offers.filter(offer => offerFits(buyer, offer)).sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
}
export function matchBuyers(state, offer){
 return state.leads.filter(lead => isSeeker(lead) && !lead.archived && !['won', 'lost'].includes(lead.stage) && offerFits(lead, offer));
}

// --- Import leadów (CSV albo wklejone wiersze z Excela) ---
const HEADERS = {
 name:['imię', 'imie', 'nazwa', 'nazwisko', 'klient', 'właściciel', 'wlasciciel', 'kontakt'],
 property:['rodzaj', 'rodzaj nieruchomości', 'rodzaj nieruchomosci', 'typ', 'nieruchomość', 'nieruchomosc'],
 purpose:['przeznaczenie', 'transakcja', 'oferta'],
 area:['lokalizacja', 'miejscowość', 'miejscowosc', 'rejon', 'adres', 'miasto'],
 size:['metraż', 'metraz', 'powierzchnia', 'm2', 'm²'],
 price:['cena', 'kwota'],
 phone:['telefon', 'tel', 'tel.', 'numer', 'numer telefonu'],
 email:['e-mail', 'email', 'mail'],
 notes:['notatki', 'uwagi', 'opis', 'link', 'źródło', 'zrodlo']
};
function splitRows(text){
 const rows = [];
 const delimiter = text.includes('\t') ? '\t' : (text.split('\n')[0].split(';').length > text.split('\n')[0].split(',').length ? ';' : ',');
 let row = [], cell = '', quoted = false;
 for(let i = 0; i < text.length; i++){
  const ch = text[i];
  if(quoted){
   if(ch === '"' && text[i + 1] === '"'){cell += '"'; i++;}
   else if(ch === '"') quoted = false;
   else cell += ch;
  } else if(ch === '"' && cell === '') quoted = true;
  else if(ch === delimiter){row.push(cell); cell = '';}
  else if(ch === '\n' || ch === '\r'){
   if(ch === '\r' && text[i + 1] === '\n') i++;
   row.push(cell); cell = '';
   if(row.some(value => value.trim())) rows.push(row);
   row = [];
  } else cell += ch;
 }
 row.push(cell);
 if(row.some(value => value.trim())) rows.push(row);
 return rows;
}
const number = value => {
 const n = Number(String(value ?? '').replace(/\s|zł|pln|m2|m²/gi, '').replace(',', '.'));
 return Number.isFinite(n) && n > 0 ? Math.round(n) : '';
};
export function parseLeadImport(text){
 const rows = splitRows(String(text ?? '').replace(/^﻿/, ''));
 if(rows.length < 2) throw Error('Brak danych. Pierwszy wiersz to nagłówki, kolejne to leady.');
 const header = rows[0].map(lower);
 const column = Object.fromEntries(Object.entries(HEADERS).map(([key, names]) => [key, header.findIndex(cell => names.includes(cell))]));
 if(column.phone < 0) throw Error('Nie znalazłem kolumny „Telefon”.');
 return rows.slice(1, 2001).map(cells => {
  const pick = key => column[key] >= 0 ? clean(cells[column[key]], 2000) : '';
  const purpose = lower(pick('purpose'));
  return {name:pick('name'), property:pick('property'), area:pick('area'), size:number(pick('size')), price:number(pick('price')),
   phone:normalizePhone(pick('phone')), rawPhone:pick('phone'), email:pick('email'), notes:pick('notes'),
   role:/wynaj|najem/.test(purpose) ? 'landlord' : /kup|szuk/.test(purpose) ? 'buyer' : 'seller', purpose:pick('purpose')};
 });
}
export function planImport(state, rows){
 const known = new Set(state.leads.map(lead => normalizePhone(lead.phone)).filter(Boolean));
 const fresh = [], skipped = [];
 for(const row of rows){
  if(!row.phone){skipped.push({row, reason:'brak telefonu'}); continue;}
  if(known.has(row.phone)){skipped.push({row, reason:'duplikat'}); continue;}
  known.add(row.phone);
  fresh.push(row);
 }
 return {fresh, skipped};
}

// --- Agenda dnia i kalendarz ---
export function agenda(state, from, to){
 const crm = crmData(state), items = [];
 for(const lead of state.leads){
  if(lead.archived || ['won', 'lost'].includes(lead.stage) || lead.nextDate > to) continue;
  items.push({kind:'contact', day:lead.nextDate < from ? from : lead.nextDate, late:lead.nextDate < from, lead});
 }
 for(const viewing of officeData(state).viewings){
  if(viewing.status !== 'planned' || viewing.date > to) continue;
  const buyer = state.leads.find(lead => lead.id === viewing.buyerId);
  const offer = crm.offers.find(entry => entry.id === viewing.offerId);
  items.push({kind:'viewing', day:viewing.date < from ? from : viewing.date, late:viewing.date < from, viewing, lead:buyer, offer});
 }
 for(const {mandate, lead, left} of expiringMandates(state, from, daysBetween(from, to))){
  items.push({kind:'mandate', day:left < 0 ? from : mandate.end, late:left < 0, mandate, lead, left});
 }
 const order = {viewing:0, mandate:1, contact:2};
 return items.sort((a, b) => a.day.localeCompare(b.day) || (a.viewing?.time || '99').localeCompare(b.viewing?.time || '99') || order[a.kind] - order[b.kind]);
}
export function missingDocuments(state){
 const crm = crmData(state);
 return crm.documents.filter(doc => doc.status === 'needed')
  .map(doc => ({doc, client:state.leads.find(lead => lead.id === doc.clientId)}))
  .filter(item => item.client && !item.client.archived);
}

// --- Raporty ---
const STAGE_ORDER = ['new', 'contacted', 'meeting', 'mandate', 'listed', 'won'];
export function report(state, from, to){
 const crm = crmData(state);
 const inRange = day => day >= from && day <= to;
 const leads = state.leads.filter(lead => inRange(dayOf(lead.createdAt)));
 const reached = (lead, stage) => STAGE_ORDER.indexOf(lead.stage) >= STAGE_ORDER.indexOf(stage);
 const funnel = [['new', 'Nowe leady'], ['contacted', 'Po rozmowie'], ['meeting', 'Spotkanie'], ['mandate', 'Umowa'], ['won', 'Transakcja']]
  .map(([stage, label]) => ({stage, label, count:leads.filter(lead => reached(lead, stage)).length}));
 const profiles = new Map(crm.profiles.map(profile => [profile.clientId, profile.source]));
 const sources = new Map();
 for(const lead of leads){
  const source = profiles.get(clientOf(lead)) || (lead.notes.startsWith('Import') ? 'Import z pliku' : 'Nie podano');
  const entry = sources.get(source) ?? {source, count:0, won:0};
  entry.count++;
  if(lead.stage === 'won') entry.won++;
  sources.set(source, entry);
 }
 const activities = state.activities.filter(item => !item.voided);
 const firstDay = (leadId, type) => activities.filter(item => item.leadId === leadId && item.type === type).map(item => item.day).sort()[0];
 const durations = type => state.leads.map(lead => {
  const day = firstDay(lead.id, type);
  return day && inRange(day) ? daysBetween(dayOf(lead.createdAt), day) : null;
 }).filter(value => value !== null && value >= 0);
 const avg = list => list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : null;
 const speed = [['meeting', 'Do pierwszego spotkania'], ['mandate', 'Do umowy'], ['sale', 'Do transakcji']].map(([type, label]) => ({label, days:avg(durations(type)), count:durations(type).length}));
 const months = [];
 const end = new Date(to + 'T12:00:00');
 for(let i = 5; i >= 0; i--){
  const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
  const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  months.push({key, label:new Intl.DateTimeFormat('pl-PL', {month:'short'}).format(d), grosz:activities.filter(item => item.day.startsWith(key)).reduce((sum, item) => sum + item.commissionGrosz, 0)});
 }
 const viewings = officeData(state).viewings.filter(entry => entry.status === 'done' && inRange(entry.date));
 const rated = viewings.filter(entry => entry.rating);
 return {
  leads:leads.length, funnel, sources:[...sources.values()].sort((a, b) => b.count - a.count), speed, months,
  calls:activities.filter(item => item.type === 'call' && inRange(item.day)).length,
  commissionGrosz:activities.filter(item => inRange(item.day)).reduce((sum, item) => sum + item.commissionGrosz, 0),
  viewings:viewings.length, rating:rated.length ? Math.round(rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length * 10) / 10 : null,
  interested:viewings.filter(entry => entry.interest === 'high').length
 };
}

// --- Walidacja zapisu ---
export function validateOffice(office, leads, crm){
 if(office === undefined) return;
 const fail = () => {throw Error('Nieprawidłowy zapis danych biura.');};
 if(!office || typeof office !== 'object') fail();
 const leadIds = new Set(leads.map(lead => lead.id));
 const offers = new Set((crm?.offers ?? []).map(offer => offer.id));
 for(const key of ['viewings', 'mandates', 'checklists', 'consents']) if(!Array.isArray(office[key]) || office[key].length > 20000) fail();
 const ids = new Set();
 const unique = id => {if(typeof id !== 'string' || !id || id.length > 100 || ids.has(id)) fail(); ids.add(id);};
 for(const v of office.viewings){
  unique(v.id);
  if(!leadIds.has(v.buyerId) || !offers.has(v.offerId) || !Number.isFinite(v.createdAt) || !Number.isFinite(v.updatedAt)) fail();
  const n = viewingRecord(v);
  if(Object.keys(n).some(key => n[key] !== v[key])) fail();
 }
 const mandated = new Set();
 for(const m of office.mandates){
  unique(m.id);
  if(!leadIds.has(m.leadId) || mandated.has(m.leadId) || !isDay(m.start) || !isDay(m.end) || m.end < m.start || typeof m.exclusive !== 'boolean' ||
   !Number.isFinite(m.commission) || m.commission < 0 || m.commission > 100 || typeof m.notes !== 'string' || m.notes.length > 1000 ||
   typeof m.number !== 'string' || m.number.length > 60 || !Number.isFinite(m.createdAt)) fail();
  mandated.add(m.leadId);
 }
 const steps = new Set(CHECKLIST.map(([id]) => id)), listed = new Set();
 for(const c of office.checklists){
  if(!leadIds.has(c.leadId) || listed.has(c.leadId) || !Array.isArray(c.done) || c.done.some(key => !steps.has(key)) || new Set(c.done).size !== c.done.length) fail();
  listed.add(c.leadId);
 }
 const consented = new Set();
 for(const c of office.consents){
  if(!leadIds.has(c.clientId) || consented.has(c.clientId) || ![c.processing, c.marketing].every(value => value === '' || isDay(value)) ||
   typeof c.basis !== 'string' || c.basis.length > 300) fail();
  consented.add(c.clientId);
 }
 if(office.templates !== null){
  if(!Array.isArray(office.templates) || office.templates.length > 50) fail();
  const tpl = new Set();
  for(const t of office.templates){
   if(typeof t?.id !== 'string' || !t.id || t.id.length > 100 || tpl.has(t.id) || typeof t.title !== 'string' || !t.title.trim() || t.title.length > 80 ||
    typeof t.body !== 'string' || !t.body.trim() || t.body.length > 2000) fail();
   tpl.add(t.id);
  }
 }
}
