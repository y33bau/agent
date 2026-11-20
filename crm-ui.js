import {crmData, OFFER_STATUS, TRANSACTION, NOTE_TYPES, DOCUMENT_TYPES, DOCUMENT_STATUS} from './crm-core.js';

export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character =>
 ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[character]);
const e = escapeHtml;
const date = time => new Intl.DateTimeFormat('pl-PL',{dateStyle:'medium',timeStyle:'short'}).format(time);
const price = amount => amount === null ? '' : new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(amount);
const summary = offer => [TRANSACTION[offer.transaction],offer.property,offer.location,offer.area && offer.area+' m²',price(offer.price)].filter(Boolean).join(' · ');
const btn = (action,id,label,style='ghost') => '<button type="button" class="btn '+style+'" data-action="'+action+'" data-id="'+e(id)+'">'+e(label)+'</button>';
const item = body => '<article class="crm-entry">'+body+'</article>';
const section = (title,action,body) => '<section class="crm-block"><div class="section-head"><h3>'+title+'</h3>'+action+'</div>'+body+'</section>';
const blank = text => '<p class="subtitle">'+text+'</p>';
const line = text => text ? '<p class="crm-copy">'+e(text)+'</p>' : '';
const input = (name,label,value,max,type='text',required=false) =>
 '<label class="field">'+label+'<input type="'+type+'" name="'+name+'"'+(max?' maxlength="'+max+'"':'')+(required?' required':'')+' value="'+e(value)+'"></label>';
const textarea = (name,label,value,max,required=false) =>
 '<label class="field">'+label+'<textarea name="'+name+'" maxlength="'+max+'" rows="4"'+(required?' required':'')+'>'+e(value)+'</textarea></label>';
const select = (name,label,value,choices) => '<label class="field">'+label+'<select name="'+name+'">'+Object.entries(choices).map(([key,title])=>
 '<option value="'+e(key)+'"'+(key===value?' selected':'')+'>'+e(title)+'</option>').join('')+'</select></label>';
const numberInput = (name,label,value,max) =>
 '<label class="field">'+label+'<input type="number" name="'+name+'" min="0.01" max="'+max+'" step="0.01" value="'+e(value)+'"></label>';

export function crmTabs(current){
 return '<div class="crm-tabs" aria-label="Widoki CRM">'+[['leads','Leady i klienci'],['offers','Oferty']]
  .map(([id,label])=>'<button class="filter '+(id===current?'active':'')+'" aria-pressed="'+(id===current)+'" data-action="crm-view" data-id="'+id+'">'+label+'</button>').join('')+'</div>';
}
function offerRow(offer, customer=''){
 return item('<div class="section-head"><strong>'+e(offer.title)+'</strong><span class="stage-badge">'+OFFER_STATUS[offer.status]+'</span></div>'+
  line(summary(offer))+line(customer)+btn('crm-offer-preview',offer.id,'Otwórz ofertę','gold'));
}
export function offersView(state, filter, query){
 const {offers} = crmData(state);
 const customer = offer => state.leads.find(lead=>lead.id===offer.clientId)?.name || '';
 const matches = offers.filter(offer=>(filter==='all'||offer.status===filter) &&
  [offer.title,offer.location,offer.property,customer(offer)].join(' ').toLocaleLowerCase('pl').includes(query.trim().toLocaleLowerCase('pl')))
  .sort((a,b)=>b.updatedAt-a.updatedAt);
 return '<div class="crm-toolbar"><input class="search" aria-label="Szukaj oferty" placeholder="Tytuł, miejscowość lub klient" value="'+e(query)+'">'+
 select('offer-status-filter','Status',filter,{all:'Wszystkie',...OFFER_STATUS})+'</div>'+
 '<div class="crm-stack">'+(matches.map(offer=>offerRow(offer,customer(offer))).join('')||blank('Brak ofert w tym widoku.'))+'</div>';
}
export function clientSections(state, lead, timeline, view, overview){
 const crm = crmData(state), clientId = lead.clientId || lead.id;
 const profile = crm.profiles.find(entry=>entry.clientId===clientId);
 const client = state.leads.find(entry=>entry.id===clientId) || lead;
 const linked = key => crm[key].filter(entry=>entry.clientId===clientId).sort((a,b)=>b.updatedAt-a.updatedAt);
 const contact = [client.phone,profile?.email].filter(Boolean).join(' · ');
 const notes = linked('notes').map(note=>({time:note.createdAt, html:item('<strong>'+NOTE_TYPES[note.type]+'</strong><small>'+date(note.createdAt)+'</small>'+line(note.body)+btn('crm-note-edit',note.id,'Edytuj'))}));
 const history = [...notes,...timeline].sort((a,b)=>b.time-a.time);
 const tabs='<div class="crm-tabs client-tabs" aria-label="Karta klienta">'+[['overview','Profil'],['offers','Oferty'],['documents','Dokumenty'],['history','Historia']].map(([id,label])=>'<button class="filter '+(view===id?'active':'')+'" aria-pressed="'+(view===id)+'" data-action="client-view" data-id="'+e(lead.id)+'" data-section="'+id+'">'+label+'</button>').join('')+'</div>';
 if(view==='overview') return tabs+section('Profil klienta',btn('crm-profile',lead.id,'Edytuj profil'),
  line(contact)+line(profile?.source && 'Źródło: '+profile.source)+line(profile?.summary)+(!contact&&!profile?.summary&&!profile?.source?blank('Uzupełnij dane i źródło kontaktu.') : ''))+overview;
 if(view==='offers') return tabs+section('Oferty',btn('crm-offer-add',lead.id,'Nowa oferta'),linked('offers').map(offer=>offerRow(offer)).join('')||blank('Brak zapisanych ofert.'));
 if(view==='documents') return tabs+section('Dokumenty',btn('crm-document-add',lead.id,'Dodaj dokument'),
  linked('documents').map(doc=>item('<div class="section-head"><strong>'+e(doc.title)+'</strong><span class="stage-badge">'+DOCUMENT_STATUS[doc.status]+'</span></div>'+
   line([DOCUMENT_TYPES[doc.type],doc.reference,doc.filename].filter(Boolean).join(' · '))+line(doc.description)+
   '<div class="row wrap">'+(doc.url?'<a class="btn ghost" href="'+e(doc.url)+'" target="_blank" rel="noopener noreferrer">Otwórz link</a>':'')+
   (doc.filename?btn('crm-file',doc.id,'Pobierz plik'):'')+btn('crm-document-edit',doc.id,'Edytuj')+'</div>')).join('')||blank('Dodaj dokument albo wpisz, czego brakuje.'));
 return tabs+section('Historia kontaktu',btn('crm-note-add',lead.id,'Dodaj wpis'),
  history.map(entry=>entry.html).join('')||blank('Brak zapisanych działań.'));
}
function aiPanel(){
 return '<details class="crm-ai" data-ai-panel><summary>Stwórz ofertę z AI</summary>'+
  '<label class="field">Cechy do ogłoszenia<textarea data-ai-features maxlength="1800" rows="3" placeholder="Np. 3 pokoje, balkon od południa, osobna kuchnia"></textarea></label>'+
  '<p class="subtitle">Skopiuj polecenie z danymi nieruchomości, wklej je w ChatGPT i zaimportuj odpowiedź. W cechach wpisuj tylko informacje przeznaczone do ogłoszenia.</p>'+
  '<div class="row wrap"><button type="button" class="btn gold" data-ai-action="copy-chatgpt">Kopiuj dane do ChatGPT</button>'+
  '<a class="btn ghost" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Otwórz ChatGPT</a></div>'+
  '<label class="field" data-ai-copy-fallback hidden>Polecenie do ręcznego skopiowania<textarea data-ai-prompt rows="5" readonly></textarea></label>'+
  '<label class="field">Odpowiedź z ChatGPT<textarea data-ai-import-text rows="4" maxlength="65536" spellcheck="false" placeholder="Wklej odpowiedź z ChatGPT"></textarea></label>'+
  '<button type="button" class="btn ghost" data-ai-action="import-chatgpt">Importuj szkic</button>'+
  '<details><summary>Generator przez API</summary>'+
  '<label class="field">Dostawca<select data-ai-provider><option value="openai">OpenAI</option><option value="anthropic">Claude</option><option value="gemini">Gemini</option></select></label>'+
  '<details><summary>Połączenie z generatorem</summary><label class="field">Adres Cloudflare Workera<input data-ai-url type="url" placeholder="https://atria-offer-ai.ad-szelag.workers.dev" autocomplete="off"></label>'+
  '<label class="field">Kod dostępu do generatora<input data-ai-token type="password" maxlength="256" autocomplete="off"></label>'+
  '<div class="row wrap"><button type="button" class="btn ghost" data-ai-action="check">Połącz</button><button type="button" class="btn text" data-ai-action="forget">Usuń połączenie</button></div><p class="subtitle" data-ai-connect-status role="status" aria-live="polite"></p></details>'+
  '<button type="button" class="btn gold" data-ai-action="generate">Generuj szkic</button></details>'+
  '<p class="subtitle" data-ai-status role="status" aria-live="polite"></p>'+
  '<section class="crm-entry" data-ai-result hidden><strong data-ai-draft-title></strong><label class="field">Opis oferty<textarea data-ai-draft-description rows="7" readonly></textarea></label>'+
  '<label class="field">Skrót do skopiowania<textarea data-ai-draft-short rows="3" readonly></textarea></label>'+
  '<p class="subtitle" data-ai-draft-missing></p><button type="button" class="btn gold" data-ai-action="apply">Wstaw tytuł i opis</button></section></details>';
}
export function crmForm(kind, lead, record){
 const data = record ?? {};
 let body = '';
 if(kind==='profile') body = '<div class="form-grid">'+input('name','Nazwa klienta',lead.name,100,'text',true)+input('phone','Telefon',lead.phone,40,'tel')+
  input('email','E-mail',data.email,180,'email')+input('source','Źródło kontaktu',data.source,120)+'</div>'+textarea('summary','Podsumowanie współpracy',data.summary,3000);
 if(kind==='offer') body = input('title','Tytuł oferty',data.title,160,'text',true)+'<div class="form-grid">'+
  select('transaction','Transakcja',data.transaction || (lead.role==='landlord'?'rent':'sale'),TRANSACTION)+select('status','Status',data.status,OFFER_STATUS)+
  input('property','Typ nieruchomości',data.property ?? lead.property,100,'text',true)+input('location','Miejscowość lub rejon',data.location ?? lead.area,150,'text',true)+
  numberInput('price','Cena (zł)',record ? data.price : (['seller','landlord'].includes(lead.role)?lead.price:null),1e9)+
  numberInput('area','Powierzchnia (m²)',record ? data.area : (['seller','landlord'].includes(lead.role)?lead.size:null),1e6)+'</div>'+
  aiPanel()+textarea('description','Opis dla klienta',data.description,8000)+textarea('internal','Notatka wewnętrzna',data.internal,3000);
 if(kind==='note') body=select('type','Rodzaj wpisu',data.type,NOTE_TYPES)+textarea('body','Treść wpisu',data.body,4000,true);
 if(kind==='document') body=input('title','Nazwa dokumentu',data.title,160,'text',true)+'<div class="form-grid">'+
  select('type','Rodzaj',data.type,DOCUMENT_TYPES)+select('status','Status',data.status,DOCUMENT_STATUS)+'</div>'+
  input('reference','Numer lub oznaczenie',data.reference,120)+input('url','Link do dokumentu',data.url,1200,'url')+
  textarea('description','Uwagi',data.description,1500)+
  '<label class="field">'+(data.filename?'Dodaj nową wersję pliku':'Załącz plik')+'<input name="file" type="file"><small>Do 25 MB. Plik jest dostępny tylko na tym urządzeniu. Link i opis trafiają do kopii CRM.</small></label>'+
  (data.filename?'<p>'+e(data.filename)+'</p>':'');
 return '<form id="crm-record-form" data-kind="'+kind+'" data-id="'+e(data.id)+'" data-lead="'+e(lead.id)+'">'+body+
  '<div class="form-actions">'+btn('client-card',lead.id,'Wróć do klienta')+'<button class="btn gold" type="submit">Zapisz</button></div></form>';
}
export function offerPreview(offer){
 return '<div class="crm-stack">'+item('<span class="stage-badge">'+OFFER_STATUS[offer.status]+'</span>'+line(summary(offer))+line(offer.description))+
 (offer.internal?section('Notatka wewnętrzna','',line(offer.internal)):'')+
 '<div class="row wrap">'+btn('crm-offer-edit',offer.id,'Edytuj','gold')+
 btn('crm-offer-export',offer.id,'Pobierz ofertę do druku')+btn('client-card',offer.caseId,'Otwórz klienta')+'</div></div>';
}
export function publicOfferHtml(offer, agency){
 return '<!doctype html><html lang="pl"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+e(offer.title)+'</title>'+
 '<style>body{margin:48px auto;padding:0 20px;max-width:680px;color:#193247;font:17px/1.65 system-ui,sans-serif}header{border-bottom:2px solid #a18347;padding-bottom:8px}h1{line-height:1.15}p{white-space:pre-wrap;overflow-wrap:anywhere}@media print{body{margin:0}}</style>'+
 '<header>'+e(agency)+'</header><main><h1>'+e(offer.title)+'</h1>'+line(summary(offer))+line(offer.description)+'</main></html>';
}
