// ATRIA CRM: widoki biura generowane jako HTML (bez DOM, testowalne w Node).
import {crmData, OFFER_STATUS, DOCUMENT_TYPES} from './crm-core.js';
import {CASE_ROLES, STAGES} from './core.js';
import {CHECKLIST, INTEREST, VIEWING_STATUS, addDays, dayOf, agenda, checklistFor, consentFor, daysBetween, expiringMandates, matchBuyers,
 matchOffers, missingDocuments, officeData, report, templatesOf} from './office-core.js';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'})[ch]);
const money = grosz => new Intl.NumberFormat('pl-PL', {style:'currency', currency:'PLN', maximumFractionDigits:0}).format(grosz / 100);
export const price = amount => amount === null || amount === undefined ? '' : money(amount * 100);
const dayLabel = day => new Date(day + 'T12:00:00').toLocaleDateString('pl-PL', {weekday:'long', day:'numeric', month:'long'});
const shortDay = day => new Date(day + 'T12:00:00').toLocaleDateString('pl-PL', {day:'numeric', month:'short'});
const btn = (action, id, label, style = 'ghost', extra = '') => '<button type="button" class="btn ' + style + '" data-action="' + action + '" data-id="' + esc(id) + '"' + extra + '>' + esc(label) + '</button>';
const panel = (title, body, action = '', cls = '') => '<section class="panel office-panel ' + cls + '"><div class="section-head"><h2>' + title + '</h2>' + action + '</div>' + body + '</section>';
const blank = text => '<p class="subtitle">' + text + '</p>';
const clientOf = lead => lead.clientId || lead.id;
const offerLine = offer => [offer.property, offer.location, offer.area && offer.area + ' m²', price(offer.price)].filter(Boolean).join(' · ');
const isSeeker = lead => ['buyer', 'tenant'].includes(lead?.role);
const isOwner = lead => ['seller', 'landlord'].includes(lead?.role);

export function callButton(lead, label = 'Zadzwoń'){
 return lead?.phone ? btn('office-call', lead.id, label, 'ghost office-call') : '';
}

// --- Ekran „Dziś” ---
function agendaRow(item){
 const lead = item.lead;
 if(item.kind === 'viewing'){
  return '<article class="office-row' + (item.late ? ' late' : '') + '"><span class="office-kind viewing">Prezentacja' + (item.viewing.time ? ' · ' + esc(item.viewing.time) : '') + '</span>' +
   '<div><strong>' + esc(lead?.name || 'Klient') + '</strong><p>' + esc(item.offer ? item.offer.title + ' · ' + item.offer.location : 'Oferta') + '</p></div>' +
   '<div class="row wrap">' + callButton(lead) + btn('office-viewing-edit', item.viewing.id, item.late ? 'Zapisz opinię' : 'Szczegóły') + '</div></article>';
 }
 if(item.kind === 'mandate'){
  const text = item.left < 0 ? 'Umowa wygasła ' + shortDay(item.mandate.end) : item.left === 0 ? 'Umowa kończy się dziś' : 'Umowa kończy się za ' + item.left + ' dni';
  return '<article class="office-row warn"><span class="office-kind mandate">' + (item.mandate.exclusive ? 'Wyłączność' : 'Umowa') + '</span>' +
   '<div><strong>' + esc(lead.name) + '</strong><p>' + esc(text) + '</p></div>' +
   '<div class="row wrap">' + callButton(lead) + btn('client-card', lead.id, 'Przedłuż', 'ghost', ' data-section="deal"') + '</div></article>';
 }
 return '<article class="office-row' + (item.late ? ' late' : '') + '"><span class="office-kind contact">' + (item.late ? 'Zaległy · ' + shortDay(lead.nextDate) : 'Kontakt') + '</span>' +
  '<div><strong>' + esc(lead.name) + '</strong><p>' + esc(lead.nextAction || 'Ustal kolejny krok') + '</p></div>' +
  '<div class="row wrap">' + callButton(lead) + btn('log-lead', lead.id, 'Zapisz wynik') + btn('client-card', lead.id, 'Karta') + '</div></article>';
}
export function todaySections(state, day){
 const crm = crmData(state), office = officeData(state);
 const now = agenda(state, day, day);
 const week = agenda(state, addDays(day, 1), addDays(day, 7)).filter(item => !item.late);
 const missing = missingDocuments(state);
 const month = day.slice(0, 7);
 const metrics = [
  ['Aktywni klienci', state.leads.filter(lead => !lead.archived && !['won', 'lost'].includes(lead.stage)).length, 'pipeline'],
  ['Oferty w sprzedaży', crm.offers.filter(offer => ['ready', 'published', 'reserved'].includes(offer.status)).length, 'offers'],
  ['Prezentacje w 7 dni', office.viewings.filter(v => v.status === 'planned' && v.date >= day && v.date <= addDays(day, 7)).length, 'calendar'],
  ['Prowizje w miesiącu', money(state.activities.filter(a => !a.voided && a.day.startsWith(month)).reduce((sum, a) => sum + a.commissionGrosz, 0)), 'reports']
 ];
 return '<section class="office-kpis" aria-label="Biuro w liczbach">' + metrics.map(([label, value, tab]) =>
  '<button class="office-kpi" data-tab="' + tab + '"><strong>' + esc(value) + '</strong><span>' + label + '</span></button>').join('') + '</section>' +
  '<div class="office-grid office-today"><div class="office-column">' +
  panel('Na dziś' + (now.length ? ' · ' + now.length : ''), now.length ? '<div class="office-list">' + now.map(agendaRow).join('') + '</div>' :
   blank('Na dziś nie ma zaplanowanych kontaktów ani prezentacji. Dobry moment na telefony do nowych leadów.'), btn('office-viewing-add', '', 'Zaplanuj prezentację')) +
  panel('Najbliższe 7 dni', week.length ? '<div class="office-list compact">' + week.slice(0, 8).map(item =>
   '<button class="office-mini" data-action="' + (item.kind === 'viewing' ? 'office-viewing-edit' : 'client-card') + '" data-id="' + esc(item.kind === 'viewing' ? item.viewing.id : item.lead.id) + '">' +
   '<span>' + esc(shortDay(item.day)) + (item.viewing?.time ? ' ' + esc(item.viewing.time) : '') + '</span><strong>' + esc(item.lead?.name || '') + '</strong><small>' +
   esc(item.kind === 'viewing' ? 'Prezentacja: ' + (item.offer?.title || '') : item.kind === 'mandate' ? 'Koniec umowy pośrednictwa' : item.lead.nextAction) + '</small></button>').join('') + '</div>' +
   (week.length > 8 ? '<button class="btn text" data-tab="calendar">Cały kalendarz ↗</button>' : '') : blank('Nic nie zaplanowano na kolejny tydzień.'), '<button class="btn text" data-tab="calendar">Kalendarz ↗</button>') +
  '</div><aside class="office-column" aria-label="Dokumenty i pogoda">' +
  panel('Dokumenty do zebrania', missing.length ? '<div class="office-list compact">' + missing.slice(0, 6).map(({doc, client}) =>
   '<button class="office-mini" data-action="client-card" data-id="' + esc(client.id) + '" data-section="documents"><strong>' + esc(doc.title) + '</strong><small>' +
   esc(client.name + ' · ' + DOCUMENT_TYPES[doc.type]) + '</small></button>').join('') + '</div>' : blank('Wszystkie wpisane dokumenty są zebrane.')) +
  panel('Szybkie działania', '<div class="dashboard-actions">' + btn('lead-add', '', 'Dodaj lead') + btn('crm-offer-pick', '', 'Nowa oferta') +
   btn('log-call', '', 'Zapisz telefon') + btn('office-import', '', 'Import leadów') + '</div>') +
  '<section class="panel dashboard-weather" id="dashboard-weather" aria-label="Data i pogoda"></section></aside></div>';
}

// --- Kalendarz ---
export function calendarView(state, day, offset = 0){
 const from = addDays(day, offset * 14), to = addDays(from, 13);
 const items = agenda(state, from, to).filter(item => offset === 0 || !item.late);
 const done = officeData(state).viewings.filter(v => v.status !== 'planned' && v.date >= addDays(day, -30)).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
 const crm = crmData(state);
 const groups = new Map();
 for(const item of items){
  const key = item.late ? 'late' : item.day;
  if(!groups.has(key)) groups.set(key, []);
  groups.get(key).push(item);
 }
 const body = [...groups].sort(([a], [b]) => a === 'late' ? -1 : b === 'late' ? 1 : a.localeCompare(b)).map(([key, list]) =>
  '<section class="office-day"><h3>' + (key === 'late' ? 'Zaległe' : esc(dayLabel(key)) + (key === day ? ' · dziś' : '')) + '</h3><div class="office-list">' + list.map(agendaRow).join('') + '</div></section>').join('');
 return '<div class="office-calendar-nav">' + btn('office-cal-shift', String(offset - 1), '← Wcześniej') +
  '<strong>' + esc(shortDay(from) + ' – ' + shortDay(to)) + '</strong>' + btn('office-cal-shift', String(offset + 1), 'Później →') + '</div>' +
  (body || blank('W tym okresie nie ma kontaktów, prezentacji ani kończących się umów.')) +
  (done.length ? panel('Ostatnie prezentacje', '<div class="office-list compact">' + done.map(v => {
   const buyer = state.leads.find(lead => lead.id === v.buyerId), offer = crm.offers.find(entry => entry.id === v.offerId);
   return '<button class="office-mini" data-action="office-viewing-edit" data-id="' + esc(v.id) + '"><span>' + esc(shortDay(v.date)) + '</span><strong>' +
    esc((buyer?.name || '') + ' · ' + (offer?.title || '')) + '</strong><small>' + esc(VIEWING_STATUS[v.status] + (v.interest ? ' · ' + INTEREST[v.interest] : '') + (v.rating ? ' · ' + v.rating + '/5' : '')) + '</small></button>';
  }).join('') + '</div>') : '');
}

// --- Raporty ---
export const PERIODS = {month:'Ten miesiąc', d30:'30 dni', d90:'90 dni', year:'Ten rok'};
export function periodRange(period, day){
 if(period === 'month') return [day.slice(0, 8) + '01', day];
 if(period === 'year') return [day.slice(0, 5) + '01-01', day];
 return [addDays(day, period === 'd90' ? -89 : -29), day];
}
export function reportsView(state, day, period = 'month'){
 const [from, to] = periodRange(period, day);
 const r = report(state, from, to);
 const top = Math.max(1, ...r.funnel.map(item => item.count));
 const maxMonth = Math.max(1, ...r.months.map(item => item.grosz));
 const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
 return '<div class="crm-tabs" role="group" aria-label="Okres raportu">' + Object.entries(PERIODS).map(([id, label]) =>
  '<button class="filter ' + (id === period ? 'active' : '') + '" aria-pressed="' + (id === period) + '" data-action="office-period" data-id="' + id + '">' + label + '</button>').join('') + '</div>' +
  '<section class="office-kpis">' + [['Nowe leady', r.leads], ['Telefony', r.calls], ['Prezentacje', r.viewings + (r.rating ? ' · ' + r.rating + '/5' : '')], ['Prowizje', money(r.commissionGrosz)]]
   .map(([label, value]) => '<div class="office-kpi"><strong>' + esc(value) + '</strong><span>' + label + '</span></div>').join('') + '</section>' +
  '<div class="office-grid"><div class="office-column">' +
  panel('Lejek leadów z okresu', r.leads ? '<div class="office-bars">' + r.funnel.map((item, i) =>
   '<div class="office-bar"><span>' + item.label + '</span><div class="track"><div class="fill" style="width:' + (item.count / top * 100) + '%"></div></div><strong>' + item.count +
   (i ? ' <small>' + pct(item.count, r.funnel[0].count) + '</small>' : '') + '</strong></div>').join('') + '</div>' +
   blank('Procent liczony od leadów dodanych w tym okresie, według ich obecnego etapu.') : blank('W tym okresie nie dodano leadów.')) +
  panel('Źródła leadów', r.sources.length ? '<table class="office-table"><thead><tr><th>Źródło</th><th>Leady</th><th>Transakcje</th></tr></thead><tbody>' +
   r.sources.map(s => '<tr><td>' + esc(s.source) + '</td><td>' + s.count + '</td><td>' + s.won + ' (' + pct(s.won, s.count) + ')</td></tr>').join('') + '</tbody></table>' +
   blank('Źródło wpisujesz w profilu klienta.') : blank('Brak danych.')) +
  '</div><div class="office-column">' +
  panel('Prowizje · 6 miesięcy', '<div class="office-columns">' + r.months.map(m => '<div class="office-colbar"><div class="office-colfill" style="height:' +
   Math.max(2, m.grosz / maxMonth * 100) + '%" title="' + esc(money(m.grosz)) + '"></div><small>' + esc(m.label) + '</small></div>').join('') + '</div>' +
   '<p class="subtitle">Najwyżej: ' + esc(money(Math.max(...r.months.map(m => m.grosz)))) + '</p>') +
  panel('Tempo pracy', '<div class="office-list compact">' + r.speed.map(s => '<div class="office-mini"><strong>' + s.label + '</strong><small>' +
   (s.days === null ? 'Brak danych w okresie' : 'średnio ' + s.days + ' dni od dodania leada · spraw: ' + s.count) + '</small></div>').join('') + '</div>') +
  panel('Prezentacje', blank(r.viewings ? 'Odbyte: ' + r.viewings + '. Zainteresowanych: ' + r.interested + ' (' + pct(r.interested, r.viewings) + ').' + (r.rating ? ' Średnia ocena: ' + r.rating + '/5.' : '') : 'Brak odbytych prezentacji w tym okresie.')) +
  '</div></div>';
}

// --- Szablony ---
export function templatesView(state){
 return '<div class="office-list">' + templatesOf(state).map(t => '<article class="panel office-template"><div class="section-head"><h3>' + esc(t.title) + '</h3>' +
  '<div class="row wrap">' + btn('office-template-edit', t.id, 'Edytuj') + btn('office-template-delete', t.id, 'Usuń') + '</div></div><p class="crm-copy">' + esc(t.body) + '</p></article>').join('') + '</div>' +
  blank('Pola do podstawienia: {imię}, {agent}, {biuro}, {oferta}, {lokalizacja}, {cena}, {data}, {dokumenty}, {telefon}.');
}
export function templateForm(template){
 return '<form id="office-template-form" data-id="' + esc(template?.id || '') + '"><label class="field">Nazwa<input name="title" maxlength="80" required value="' + esc(template?.title || '') + '"></label>' +
  '<label class="field">Treść<textarea name="body" maxlength="2000" rows="7" required>' + esc(template?.body || '') + '</textarea></label>' +
  blank('Pola: {imię}, {agent}, {biuro}, {oferta}, {lokalizacja}, {cena}, {data}, {dokumenty}, {telefon}.') +
  '<div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button><button class="btn gold" type="submit">Zapisz szablon</button></div></form>';
}

// --- Wiadomość z szablonu ---
export function composer(state, {lead, templateId, text, channel, phone, email, context = ''}){
 const list = templatesOf(state);
 return '<form id="office-compose-form" data-lead="' + esc(lead.id) + '" data-context="' + esc(context) + '">' +
  '<p class="subtitle">Do: ' + esc([lead.name, phone, email].filter(Boolean).join(' · ')) + '</p>' +
  (context ? '' : '<label class="field">Szablon<select name="template" data-office-change="template">' + list.map(t => '<option value="' + esc(t.id) + '"' + (t.id === templateId ? ' selected' : '') + '>' + esc(t.title) + '</option>').join('') + '</select></label>') +
  '<label class="field">Treść<textarea name="text" rows="8" maxlength="4000">' + esc(text) + '</textarea></label>' +
  (context ? '' : '<p class="subtitle tiny">Pola w klamrach, których nie dało się uzupełnić, zostały w tekście. Popraw je przed wysłaniem.</p>') +
  '<div class="row wrap office-send">' +
  (phone ? btn('office-send', 'sms', 'Wyślij SMS', channel === 'sms' ? 'gold' : 'ghost') + btn('office-send', 'whatsapp', 'WhatsApp', channel === 'whatsapp' ? 'gold' : 'ghost') : '') +
  (email ? btn('office-send', 'email', 'E-mail', channel === 'email' ? 'gold' : 'ghost') : '') +
  btn('office-send', 'copy', 'Kopiuj tekst') + '</div>' +
  '<p class="subtitle tiny">Po wysłaniu wiadomość trafi do historii klienta.</p></form>';
}

// --- Karta klienta: kontakt i dodatkowe zakładki ---
export function contactBar(client, profile){
 const parts = [];
 if(client.phone){
  parts.push(btn('office-call', client.id, 'Zadzwoń', 'gold'));
  parts.push(btn('office-compose', client.id, 'SMS', 'ghost', ' data-channel="sms"'));
  parts.push(btn('office-compose', client.id, 'WhatsApp', 'ghost', ' data-channel="whatsapp"'));
 }
 if(profile?.email) parts.push(btn('office-compose', client.id, 'E-mail', 'ghost', ' data-channel="email"'));
 if(!parts.length) return '<p class="notice">Dodaj telefon lub e-mail w profilu, aby kontaktować się jednym przyciskiem.</p>';
 return '<div class="row wrap office-contact-bar">' + parts.join('') + '</div>';
}
export function clientTabs(lead){
 const tabs = [];
 if(isSeeker(lead)) tabs.push(['matches', 'Dopasowania']);
 tabs.push(['viewings', 'Prezentacje'], ['deal', 'Umowa i transakcja'], ['privacy', 'RODO']);
 return tabs;
}
export function clientTab(state, lead, view){
 const crm = crmData(state), office = officeData(state), clientId = clientOf(lead);
 const cases = state.leads.filter(item => clientOf(item) === clientId);
 if(view === 'matches'){
  const seekers = cases.filter(isSeeker);
  return seekers.map(item => {
   const offers = matchOffers(state, item);
   const want = [CASE_ROLES[item.role], item.property, item.area, item.price && 'do ' + price(item.price), item.size && 'od ' + item.size + ' m²'].filter(Boolean).join(' · ');
   return panel('Szuka: ' + esc(want), offers.length ? '<div class="office-list compact">' + offers.map(offer =>
    '<div class="office-mini"><strong>' + esc(offer.title) + '</strong><small>' + esc(offerLine(offer)) + '</small><div class="row wrap">' +
    btn('crm-offer-preview', offer.id, 'Podgląd') + btn('office-viewing-add', item.id, 'Umów prezentację', 'ghost', ' data-offer="' + esc(offer.id) + '"') + '</div></div>').join('') + '</div>' +
    '<div class="row wrap">' + btn('office-match-send', item.id, 'Wyślij listę ofert (' + offers.length + ')', 'gold') + '</div>' :
    blank('Brak pasujących ofert ze statusem „Gotowa” lub „Opublikowana”. Kryteria: rodzaj, rejon, budżet i minimalny metraż ze sprawy.'));
  }).join('') || blank('Ustaw w sprawie rolę „Kupujący” lub „Najemca” oraz kryteria.');
 }
 if(view === 'viewings'){
  const ids = new Set(cases.map(item => item.id));
  const ownOffers = crm.offers.filter(offer => offer.clientId === clientId);
  const asBuyer = office.viewings.filter(v => ids.has(v.buyerId)).sort((a, b) => b.date.localeCompare(a.date));
  const row = v => {
   const offer = crm.offers.find(entry => entry.id === v.offerId), buyer = state.leads.find(entry => entry.id === v.buyerId);
   return '<article class="crm-entry"><div class="section-head"><strong>' + esc(shortDay(v.date) + (v.time ? ' ' + v.time : '') + ' · ' + (ids.has(v.buyerId) ? offer?.title : buyer?.name)) + '</strong>' +
    '<span class="stage-badge">' + VIEWING_STATUS[v.status] + '</span></div>' +
    (v.interest || v.rating ? '<small>' + esc([v.interest && INTEREST[v.interest], v.rating && v.rating + '/5'].filter(Boolean).join(' · ')) + '</small>' : '') +
    (v.feedback ? '<p class="crm-copy">' + esc(v.feedback) + '</p>' : '') + '<div class="row wrap">' + btn('office-viewing-edit', v.id, v.status === 'planned' ? 'Zapisz opinię' : 'Edytuj') +
    (v.status === 'planned' ? btn('office-viewing-ics', v.id, 'Do kalendarza') : '') + '</div></article>';
  };
  const buyerPart = cases.some(isSeeker) || asBuyer.length ? panel('Oglądane nieruchomości', asBuyer.map(row).join('') || blank('Brak prezentacji.'),
   btn('office-viewing-add', (cases.find(isSeeker) || lead).id, 'Zaplanuj')) : '';
  const ownerPart = ownOffers.map(offer => {
   const list = office.viewings.filter(v => v.offerId === offer.id).sort((a, b) => b.date.localeCompare(a.date));
   const buyers = matchBuyers(state, offer);
   return panel('Oferta: ' + esc(offer.title), (list.map(row).join('') || blank('Nikt jeszcze nie oglądał tej oferty.')) +
    (buyers.length ? '<p class="subtitle">Pasujący kupujący: ' + buyers.map(b => '<button class="btn text" data-action="client-card" data-id="' + esc(b.id) + '">' + esc(b.name) + '</button>').join(', ') + '</p>' : ''),
    '<div class="row wrap">' + btn('office-viewing-add', '', 'Zaplanuj', 'ghost', ' data-offer="' + esc(offer.id) + '"') + (list.length ? btn('office-seller-report', offer.id, 'Raport dla sprzedającego', 'gold') : '') + '</div>');
  }).join('');
  return buyerPart + ownerPart || blank('Prezentacje pojawią się, gdy klient będzie kupującym lub właścicielem oferty.');
 }
 if(view === 'deal'){
  return cases.map(item => {
   const mandate = office.mandates.find(m => m.leadId === item.id);
   const done = checklistFor(state, item.id);
   const left = mandate ? daysBetween(dayOf(), mandate.end) : null;
   const mandateHtml = mandate ? '<p class="crm-copy">' + esc([mandate.exclusive ? 'Na wyłączność' : 'Otwarta', mandate.number && 'nr ' + mandate.number,
     shortDay(mandate.start) + ' – ' + shortDay(mandate.end), mandate.commission && 'prowizja ' + String(mandate.commission).replace('.', ',') + '%'].filter(Boolean).join(' · ')) + '</p>' +
     '<p class="' + (left <= 14 ? 'notice' : 'subtitle') + '">' + (left < 0 ? 'Umowa wygasła.' : left === 0 ? 'Umowa kończy się dziś.' : 'Do końca umowy: ' + left + ' dni.') + '</p>' +
     (mandate.notes ? '<p class="crm-copy">' + esc(mandate.notes) + '</p>' : '') : blank('Brak umowy pośrednictwa.');
   return panel(esc(item.property + ' · ' + item.area) + ' <small class="muted">' + esc(STAGES.find(([s]) => s === item.stage)[1]) + '</small>',
    '<h3>Umowa pośrednictwa</h3>' + mandateHtml + '<div class="row wrap">' + btn('office-mandate-edit', item.id, mandate ? 'Edytuj umowę' : 'Dodaj umowę') + '</div>' +
    '<h3>Checklista transakcji · ' + done.length + '/' + CHECKLIST.length + '</h3><div class="track"><div class="fill" style="width:' + (done.length / CHECKLIST.length * 100) + '%"></div></div>' +
    '<div class="office-checklist">' + CHECKLIST.map(([key, label]) => '<label class="setting-line"><span>' + esc(label) + '</span><input type="checkbox" data-office-step="' + esc(key) + '" data-id="' + esc(item.id) + '"' + (done.includes(key) ? ' checked' : '') + '></label>').join('') + '</div>' +
    (done.length < CHECKLIST.length ? btn('office-docs-request', item.id, 'Poproś klienta o brakujące dokumenty') : ''));
  }).join('');
 }
 if(view === 'privacy'){
  const consent = consentFor(state, clientId);
  return panel('Zgody', consent ? '<p class="crm-copy">' + esc([consent.processing ? 'Przetwarzanie danych: ' + consent.processing : 'Brak zgody na przetwarzanie', consent.marketing ? 'Marketing: ' + consent.marketing : 'Brak zgody marketingowej'].join(' · ')) + '</p>' +
   (consent.basis ? '<p class="crm-copy">' + esc(consent.basis) + '</p>' : '') : blank('Nie zapisano zgód tego klienta.'), btn('office-consent-edit', clientId, 'Edytuj zgody')) +
   panel('Usunięcie danych', blank('Na żądanie klienta usuniesz jego sprawy, profil, oferty, notatki, dokumenty, pliki, prezentacje i zgody. Kwoty prowizji zostają w statystykach bez danych osobowych.') +
    btn('office-erase', clientId, 'Usuń klienta i jego dane', 'danger'));
 }
 return '';
}

// Wpisy do osi czasu klienta (oferty, dokumenty, prezentacje).
export function timelineExtras(state, lead){
 const crm = crmData(state), office = officeData(state), clientId = clientOf(lead);
 const ids = new Set(state.leads.filter(item => clientOf(item) === clientId).map(item => item.id));
 const entry = (time, title, sub, body = '') => ({time, html:'<article class="crm-entry office-timeline"><strong>' + esc(title) + '</strong><small>' + esc(sub) + '</small>' + (body ? '<p class="crm-copy">' + esc(body) + '</p>' : '') + '</article>'});
 const date = time => new Intl.DateTimeFormat('pl-PL', {dateStyle:'medium'}).format(time);
 const list = [];
 for(const offer of crm.offers.filter(o => o.clientId === clientId)) list.push(entry(offer.createdAt, 'Oferta: ' + offer.title, date(offer.createdAt) + ' · ' + OFFER_STATUS[offer.status]));
 for(const doc of crm.documents.filter(d => d.clientId === clientId)) list.push(entry(doc.updatedAt, 'Dokument: ' + doc.title, date(doc.updatedAt) + ' · ' + DOCUMENT_TYPES[doc.type]));
 for(const v of office.viewings){
  const offer = crm.offers.find(o => o.id === v.offerId);
  if(!ids.has(v.buyerId) && offer?.clientId !== clientId) continue;
  const buyer = state.leads.find(l => l.id === v.buyerId);
  list.push(entry(new Date(v.date + 'T' + (v.time || '12:00')).getTime(), 'Prezentacja: ' + (ids.has(v.buyerId) ? offer?.title : buyer?.name), v.date + ' · ' + VIEWING_STATUS[v.status] + (v.interest ? ' · ' + INTEREST[v.interest] : ''), v.feedback));
 }
 for(const m of office.mandates.filter(m => ids.has(m.leadId))) list.push(entry(new Date(m.start + 'T12:00').getTime(), 'Umowa pośrednictwa' + (m.exclusive ? ' (wyłączność)' : ''), m.start + ' – ' + m.end));
 return list;
}

// --- Formularze ---
const options = (list, value, label) => list.map(item => '<option value="' + esc(item.id) + '"' + (item.id === value ? ' selected' : '') + '>' + esc(label(item)) + '</option>').join('');
export function viewingForm(state, viewing, {buyerId = '', offerId = ''} = {}){
 const crm = crmData(state);
 const buyers = state.leads.filter(lead => !lead.archived && (isSeeker(lead) || lead.id === viewing?.buyerId || lead.id === buyerId)).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
 const offers = crm.offers.filter(offer => !['archived', 'closed'].includes(offer.status) || offer.id === viewing?.offerId);
 if(!buyers.length || !offers.length) return blank('Do prezentacji potrzebujesz klienta z rolą „Kupujący” lub „Najemca” i co najmniej jednej oferty.') +
  '<div class="row wrap">' + btn('lead-add', '', 'Dodaj lead') + btn('crm-offer-pick', '', 'Nowa oferta') + '</div>';
 const v = viewing || {date:dayOf(), time:'', status:'planned', interest:'', rating:0, feedback:'', notes:''};
 return '<form id="office-viewing-form" data-id="' + esc(viewing?.id || '') + '">' +
  '<label class="field">Oglądający<select name="buyerId" required><option value="">Wybierz klienta</option>' + options(buyers, viewing?.buyerId || buyerId, l => l.name + ' · ' + (CASE_ROLES[l.role] || '') + ' · ' + l.area) + '</select></label>' +
  '<label class="field">Oferta<select name="offerId" required><option value="">Wybierz ofertę</option>' + options(offers, viewing?.offerId || offerId, o => o.title + ' · ' + o.location) + '</select></label>' +
  '<div class="form-grid"><label class="field">Data<input type="date" name="date" required value="' + esc(v.date) + '"></label><label class="field">Godzina<input type="time" name="time" value="' + esc(v.time) + '"></label></div>' +
  '<label class="field">Status<select name="status">' + Object.entries(VIEWING_STATUS).map(([k, l]) => '<option value="' + k + '"' + (k === v.status ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
  '<details' + (viewing ? ' open' : '') + '><summary>Opinia po prezentacji</summary><div class="form-grid"><label class="field">Zainteresowanie<select name="interest">' +
  Object.entries(INTEREST).map(([k, l]) => '<option value="' + k + '"' + (k === v.interest ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></label>' +
  '<label class="field">Ocena 1–5<select name="rating"><option value="0">Bez oceny</option>' + [1, 2, 3, 4, 5].map(n => '<option value="' + n + '"' + (n === v.rating ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></label></div>' +
  '<label class="field">Co powiedział klient<textarea name="feedback" maxlength="2000" rows="4" placeholder="Np. podoba się układ, za mało światła w kuchni, cena do negocjacji">' + esc(v.feedback) + '</textarea></label></details>' +
  '<label class="field">Notatka wewnętrzna<input name="notes" maxlength="1000" value="' + esc(v.notes) + '"></label>' +
  '<div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button><button class="btn gold" type="submit">Zapisz prezentację</button></div></form>';
}
export function mandateForm(lead, mandate, day){
 const m = mandate || {exclusive:true, start:day, end:addDays(day, 180), commission:'', number:'', notes:''};
 return '<form id="office-mandate-form" data-lead="' + esc(lead.id) + '"><p class="subtitle">' + esc(lead.name + ' · ' + lead.property + ' · ' + lead.area) + '</p>' +
  '<label class="setting-line">Umowa na wyłączność<input type="checkbox" name="exclusive"' + (m.exclusive ? ' checked' : '') + '></label>' +
  '<div class="form-grid"><label class="field">Numer umowy<input name="number" maxlength="60" value="' + esc(m.number) + '"></label>' +
  '<label class="field">Prowizja (%)<input name="commission" type="number" min="0" max="100" step="0.01" value="' + esc(m.commission) + '"></label>' +
  '<label class="field">Od<input type="date" name="start" required value="' + esc(m.start) + '"></label><label class="field">Do<input type="date" name="end" required value="' + esc(m.end) + '"></label></div>' +
  '<label class="field">Uwagi<textarea name="notes" maxlength="1000" rows="3">' + esc(m.notes) + '</textarea></label>' +
  '<p class="subtitle">Na ekranie „Dziś” zobaczysz przypomnienie 14 dni przed końcem umowy.</p>' +
  '<div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button><button class="btn gold" type="submit">Zapisz umowę</button></div></form>';
}
export function consentForm(client, consent){
 const c = consent || {processing:'', marketing:'', basis:''};
 return '<form id="office-consent-form" data-client="' + esc(client.id) + '"><p class="subtitle">' + esc(client.name) + '</p>' +
  '<div class="form-grid"><label class="field">Zgoda na przetwarzanie danych (data)<input type="date" name="processing" value="' + esc(c.processing) + '"></label>' +
  '<label class="field">Zgoda marketingowa (data)<input type="date" name="marketing" value="' + esc(c.marketing) + '"></label></div>' +
  '<label class="field">Podstawa i sposób zebrania<input name="basis" maxlength="300" placeholder="Np. formularz podpisany w biurze, nagranie rozmowy" value="' + esc(c.basis) + '"></label>' +
  '<p class="subtitle">Puste pole daty oznacza brak zgody albo jej wycofanie.</p>' +
  '<div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button><button class="btn gold" type="submit">Zapisz zgody</button></div></form>';
}
export function importForm(){
 return '<form id="office-import-form"><p class="subtitle">Wczytaj plik CSV z Excela (Plik → Zapisz jako → CSV) albo skopiuj wiersze z arkusza razem z nagłówkami i wklej poniżej. ' +
  'Rozpoznaję kolumny: Rodzaj nieruchomości, Przeznaczenie, Lokalizacja, Metraż, Cena, Telefon, a także Imię, E-mail i Uwagi.</p>' +
  '<label class="field">Plik CSV<input type="file" name="file" accept=".csv,.tsv,.txt,text/csv,text/plain"></label>' +
  '<label class="field">albo wklej dane<textarea name="text" rows="7" placeholder="Rodzaj nieruchomości;Lokalizacja;Metraż;Cena;Telefon"></textarea></label>' +
  '<div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button><button class="btn gold" type="submit">Sprawdź dane</button></div></form>';
}
export function importPreview(plan){
 const reasons = plan.skipped.reduce((map, item) => (map[item.reason] = (map[item.reason] || 0) + 1, map), {});
 return '<p class="crm-copy">Nowe leady: <strong>' + plan.fresh.length + '</strong>' + (plan.skipped.length ? ' · pominięte: ' + Object.entries(reasons).map(([r, n]) => r + ' ' + n).join(', ') : '') + '</p>' +
  (plan.fresh.length ? '<div class="office-list compact">' + plan.fresh.slice(0, 8).map(row => '<div class="office-mini"><strong>' + esc(row.name || 'Właściciel · ' + (row.area || row.property)) + '</strong><small>' +
   esc([row.phone, row.property, row.area, row.size && row.size + ' m²', row.price && price(row.price)].filter(Boolean).join(' · ')) + '</small></div>').join('') + '</div>' +
   (plan.fresh.length > 8 ? blank('…i ' + (plan.fresh.length - 8) + ' więcej.') : '') : '') +
  '<div class="form-actions"><button class="btn" type="button" data-action="office-import">Wróć</button>' + (plan.fresh.length ? btn('office-import-confirm', '', 'Dodaj leady (' + plan.fresh.length + ')', 'gold') : '') + '</div>';
}
