// ATRIA CRM: obsługa przycisków i formularzy biura.
import {crmData, crmRecord} from './crm-core.js';
import {makeLead} from './core.js';
import {CHECKLIST, consentFor, dayOf, eraseClient, fillTemplate, firstName, matchOffers, officeData, parseLeadImport, planImport, removeTemplate,
 saveConsent, saveMandate, saveTemplate, saveViewing, templatesOf, toggleStep, waNumber, normalizePhone, INTEREST} from './office-core.js';
import {composer, consentForm, esc, importForm, importPreview, mandateForm, price, templateForm, viewingForm} from './office-ui.js';
import {removeFile} from './crm-files.js';

const clientOf = lead => lead.clientId || lead.id;

function download(text, name, type){
 const url = URL.createObjectURL(new Blob([text], {type})), link = document.createElement('a');
 link.href = url;
 link.download = name;
 document.body.append(link);
 link.click();
 link.remove();
 setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const icsText = value => String(value ?? '').replace(/[\\;,]/g, ch => '\\' + ch).replace(/\n/g, '\\n');
export function viewingIcs(viewing, buyer, offer, agency){
 const start = viewing.date.replace(/-/g, '') + (viewing.time ? 'T' + viewing.time.replace(':', '') + '00' : '');
 const endDate = new Date(viewing.date + 'T' + (viewing.time || '12:00') + ':00');
 endDate.setHours(endDate.getHours() + 1);
 const end = viewing.time ? dayOf(endDate).replace(/-/g, '') + 'T' + String(endDate.getHours()).padStart(2, '0') + String(endDate.getMinutes()).padStart(2, '0') + '00' : null;
 return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ATRIA CRM//PL', 'BEGIN:VEVENT', 'UID:' + viewing.id + '@atria-crm',
  'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
  viewing.time ? 'DTSTART:' + start : 'DTSTART;VALUE=DATE:' + start, end ? 'DTEND:' + end : '',
  'SUMMARY:' + icsText('Prezentacja: ' + (offer?.title || 'nieruchomość') + ' · ' + (buyer?.name || '')),
  'LOCATION:' + icsText(offer?.location || ''), 'DESCRIPTION:' + icsText([agency, buyer?.phone && 'Tel. ' + buyer.phone, viewing.notes].filter(Boolean).join('\n')),
  'END:VEVENT', 'END:VCALENDAR'].filter(Boolean).join('\r\n');
}

export function createOfficeActions({getState, commit, modal, close, clientCard, toast, logForm}){
 let compose = null, importPlan = null;
 const lead = id => getState().leads.find(item => item.id === id);
 const profileOf = client => crmData(getState()).profiles.find(entry => entry.clientId === clientOf(client));
 const clientFor = item => lead(clientOf(item)) || item;

 function values(client, extra = {}){
  const state = getState();
  const docs = crmData(state).documents.filter(doc => doc.clientId === clientOf(client) && doc.status === 'needed').map(doc => doc.title);
  return {imię:firstName(client.name), agent:state.settings.name, biuro:state.settings.agency, telefon:client.phone, dokumenty:docs.join(', '), ...extra};
 }
 function openComposer({leadId, channel = 'sms', templateId, text, context = '', extra = {}}){
  const target = lead(leadId);
  if(!target) throw Error('Klient jest niedostępny.');
  const client = clientFor(target), email = profileOf(client)?.email || '';
  const list = templatesOf(getState());
  const template = list.find(t => t.id === templateId) || list[0];
  const body = text ?? (template ? fillTemplate(template.body, values(client, extra)) : '');
  compose = {leadId:target.id, clientId:client.id, extra, context};
  modal(context ? 'Wiadomość do klienta' : 'Wiadomość z szablonu', composer(getState(), {lead:client, templateId:template?.id, text:body, channel, phone:client.phone, email, context}));
 }
 function viewing(id){return officeData(getState()).viewings.find(v => v.id === id);}

 async function send(channel){
  const form = document.getElementById('office-compose-form');
  if(!form || !compose) return;
  const text = form.querySelector('textarea[name=text]').value.trim();
  if(!text) throw Error('Wpisz treść wiadomości.');
  const client = lead(compose.clientId);
  if(!client) throw Error('Klient jest niedostępny.');
  const email = profileOf(client)?.email || '';
  if(channel === 'copy'){
   await navigator.clipboard.writeText(text);
   toast('Skopiowano tekst.');
  } else {
   const url = channel === 'sms' ? 'sms:' + normalizePhone(client.phone) + '?&body=' + encodeURIComponent(text)
    : channel === 'whatsapp' ? 'https://wa.me/' + waNumber(client.phone) + '?text=' + encodeURIComponent(text)
    : 'mailto:' + email + '?subject=' + encodeURIComponent(getState().settings.agency + ': wiadomość') + '&body=' + encodeURIComponent(text);
   if(channel === 'whatsapp') window.open(url, '_blank', 'noopener');
   else location.href = url;
  }
  const label = {sms:'SMS', whatsapp:'WhatsApp', email:'E-mail', copy:'Skopiowana wiadomość'}[channel];
  const now = Date.now();
  commit(next => {
   next.crm = crmData(next);
   const note = crmRecord('note', {type:channel === 'email' ? 'email' : 'note', body:label + ': ' + text});
   next.crm.notes.push({...note, id:crypto.randomUUID?.() || String(now), clientId:clientOf(client), createdAt:now, updatedAt:now});
  });
  toast(channel === 'copy' ? 'Skopiowano i zapisano w historii klienta.' : 'Zapisano w historii klienta.');
 }

 function sellerReport(offerId){
  const state = getState(), offer = crmData(state).offers.find(o => o.id === offerId);
  if(!offer) throw Error('Oferta jest niedostępna.');
  const list = officeData(state).viewings.filter(v => v.offerId === offerId && v.status === 'done').sort((a, b) => a.date.localeCompare(b.date));
  const seller = lead(offer.clientId);
  const rated = list.filter(v => v.rating);
  const lines = list.map((v, i) => (i + 1) + '. ' + v.date + ' · ' + (INTEREST[v.interest] || 'bez oceny') + (v.rating ? ' · ocena ' + v.rating + '/5' : '') + (v.feedback ? '\n   ' + v.feedback : ''));
  const text = 'Dzień dobry,\n\nprzesyłam podsumowanie prezentacji nieruchomości „' + offer.title + '” (' + offer.location + ').\n\n' +
   'Odbyte prezentacje: ' + list.length + (rated.length ? ', średnia ocena ' + (Math.round(rated.reduce((s, v) => s + v.rating, 0) / rated.length * 10) / 10) + '/5' : '') +
   ', zainteresowani: ' + list.filter(v => v.interest === 'high').length + '.\n\n' + (lines.join('\n') || 'Brak odbytych prezentacji.') +
   '\n\nOpinie są zanonimizowane. Chętnie omówię wnioski i dalsze kroki.\n' + state.settings.name + ', ' + state.settings.agency;
  openComposer({leadId:offer.clientId, channel:'email', text, context:'report'});
 }

 function matchList(leadId){
  const buyer = lead(leadId);
  const offers = matchOffers(getState(), buyer);
  if(!offers.length) throw Error('Brak pasujących ofert.');
  const client = clientFor(buyer), state = getState();
  const text = 'Dzień dobry,\n\nwybrałem oferty pasujące do Pana/Pani kryteriów:\n\n' +
   offers.map((o, i) => (i + 1) + '. ' + o.title + ' · ' + [o.property, o.location, o.area && o.area + ' m²', price(o.price)].filter(Boolean).join(' · ')).join('\n') +
   '\n\nKtóre z nich chce Pan/Pani zobaczyć?\n' + state.settings.name + ', ' + state.settings.agency;
  openComposer({leadId, channel:'sms', text, context:'matches'});
 }

 async function onAction(action, id, button){
  const state = getState();
  switch(action){
   case 'office-call': {
    const target = lead(id);
    if(!target?.phone) throw Error('Brak numeru telefonu.');
    location.href = 'tel:' + normalizePhone(target.phone);
    logForm('call', target.id);
    return;
   }
   case 'office-compose': {
    const v = button?.dataset.viewing ? viewing(button.dataset.viewing) : null;
    const offer = v ? crmData(state).offers.find(o => o.id === v.offerId) : null;
    openComposer({leadId:id, channel:button?.dataset.channel || 'sms', templateId:v ? 'tpl-viewing' : undefined,
     extra:offer ? {oferta:offer.title, lokalizacja:offer.location, cena:price(offer.price), data:v.date + (v.time ? ' o ' + v.time : '')} : {}});
    return;
   }
   case 'office-send': await send(id); return;
   case 'office-match-send': matchList(id); return;
   case 'office-seller-report': sellerReport(id); return;
   case 'office-docs-request': {
    const target = lead(id), done = new Set(officeData(state).checklists.find(c => c.leadId === id)?.done ?? []);
    const missing = CHECKLIST.filter(([key]) => !done.has(key) && !['reservation', 'preliminary', 'notary', 'handover', 'financing'].includes(key)).map(([, label]) => label);
    openComposer({leadId:id, channel:'email', templateId:'tpl-documents', extra:{dokumenty:missing.join(', ') || values(clientFor(target)).dokumenty}});
    return;
   }
   case 'office-viewing-add': modal('Prezentacja nieruchomości', viewingForm(state, null, {buyerId:id || '', offerId:button?.dataset.offer || ''})); return;
   case 'office-viewing-edit': {
    const v = viewing(id);
    if(v) modal('Prezentacja nieruchomości', viewingForm(state, v) + '<div class="row wrap" style="margin-top:12px">' +
     '<button type="button" class="btn ghost" data-action="office-viewing-ics" data-id="' + esc(v.id) + '">Dodaj do kalendarza</button>' +
     '<button type="button" class="btn ghost" data-action="office-compose" data-id="' + esc(v.buyerId) + '" data-channel="sms" data-viewing="' + esc(v.id) + '">Potwierdź SMS-em</button></div>');
    return;
   }
   case 'office-viewing-ics': {
    const v = viewing(id);
    if(!v) return;
    const offer = crmData(state).offers.find(o => o.id === v.offerId);
    download(viewingIcs(v, lead(v.buyerId), offer, state.settings.agency), 'prezentacja-' + v.date + '.ics', 'text/calendar;charset=utf-8');
    return;
   }
   case 'office-mandate-edit': {
    const target = lead(id);
    if(target) modal('Umowa pośrednictwa', mandateForm(target, officeData(state).mandates.find(m => m.leadId === id), dayOf()));
    return;
   }
   case 'office-consent-edit': {
    const client = lead(id);
    if(client) modal('Zgody RODO', consentForm(client, consentFor(state, id)));
    return;
   }
   case 'office-erase': {
    const client = lead(id);
    if(client) modal('Usunąć dane klienta?', '<p class="crm-copy">Usuniesz klienta <strong>' + esc(client.name) + '</strong> razem z jego sprawami, profilem, ofertami, notatkami, dokumentami, plikami, prezentacjami i zgodami. Tego nie da się cofnąć.</p>' +
     '<p class="subtitle">Jeśli masz starsze kopie zapasowe, dane klienta nadal w nich są.</p><div class="form-actions"><button class="btn" type="button" data-action="close">Anuluj</button>' +
     '<button class="btn danger" type="button" data-action="office-erase-confirm" data-id="' + esc(id) + '">Usuń na stałe</button></div>');
    return;
   }
   case 'office-erase-confirm': {
    let keys = [];
    commit(next => {keys = eraseClient(next, id);});
    await Promise.all(keys.map(key => removeFile(key).catch(() => {})));
    close();
    toast('Dane klienta zostały usunięte.');
    return;
   }
   case 'office-template-add': modal('Nowy szablon', templateForm(null)); return;
   case 'office-template-edit': modal('Edytuj szablon', templateForm(templatesOf(state).find(t => t.id === id))); return;
   case 'office-template-delete': commit(next => removeTemplate(next, id)); toast('Szablon usunięty.'); return;
   case 'office-import': importPlan = null; modal('Import leadów', importForm()); return;
   case 'office-import-confirm': {
    if(!importPlan?.fresh.length) return;
    const now = Date.now(), day = dayOf(now);
    let added = 0;
    commit(next => {
     next.crm = crmData(next);
     for(const row of importPlan.fresh){
      try {
       const created = makeLead({name:row.name || 'Właściciel · ' + (row.area || row.property || row.phone), phone:row.rawPhone || row.phone, area:row.area || 'Nie podano',
        property:row.property || 'Nieruchomość', stage:'new', nextDate:day, nextAction:'Pierwszy telefon do właściciela', role:row.role, price:row.price, size:row.size,
        notes:['Import ' + day, row.purpose, row.notes].filter(Boolean).join(' · ').slice(0, 2000)}, now);
       next.leads.push(created);
       let email = '';
       try {email = crmRecord('profile', {email:row.email}).email;} catch {}
       const profile = crmRecord('profile', {email, source:'Import z pliku', summary:''});
       next.crm.profiles.push({...profile, id:crypto.randomUUID?.() || created.id + '-p', clientId:created.id, createdAt:now, updatedAt:now});
       added++;
      } catch {}
     }
    });
    importPlan = null;
    close();
    toast('Dodano leady: ' + added + '. Znajdziesz je na ekranie „Dziś”.');
    return;
   }
  }
 }

 async function onSubmit(form){
  const data = Object.fromEntries(new FormData(form));
  if(form.id === 'office-viewing-form'){
   let saved;
   commit(next => {saved = saveViewing(next, {...data, id:form.dataset.id || undefined});});
   close();
   toast(saved.status === 'planned' ? 'Prezentacja zaplanowana.' : 'Opinia zapisana.');
   return;
  }
  if(form.id === 'office-mandate-form'){
   commit(next => saveMandate(next, {...data, leadId:form.dataset.lead, exclusive:form.elements.exclusive.checked}));
   clientCard(form.dataset.lead, 'deal');
   toast('Umowa zapisana.');
   return;
  }
  if(form.id === 'office-consent-form'){
   commit(next => saveConsent(next, {...data, clientId:form.dataset.client}));
   clientCard(form.dataset.client, 'privacy');
   toast('Zgody zapisane.');
   return;
  }
  if(form.id === 'office-template-form'){
   commit(next => saveTemplate(next, {...data, id:form.dataset.id || undefined}));
   close();
   toast('Szablon zapisany.');
   return;
  }
  if(form.id === 'office-import-form'){
   const file = form.elements.file?.files?.[0];
   const text = file ? await file.text() : data.text;
   importPlan = planImport(getState(), parseLeadImport(text));
   modal('Import leadów', importPreview(importPlan));
  }
 }

 function onChange(target){
  if(target.dataset.officeStep){
   const leadId = target.dataset.id;
   commit(next => toggleStep(next, leadId, target.dataset.officeStep));
   clientCard(leadId, 'deal');
   return true;
  }
  if(target.dataset.officeChange === 'template' && compose){
   const template = templatesOf(getState()).find(t => t.id === target.value);
   const client = lead(compose.clientId);
   const area = target.form?.querySelector('textarea[name=text]');
   if(template && client && area) area.value = fillTemplate(template.body, values(client, compose.extra));
   return true;
  }
  return false;
 }

 return {onAction, onSubmit, onChange, openComposer};
}
