import test from 'node:test';
import assert from 'node:assert/strict';
import * as C from '../core.js';
import * as O from '../office-core.js';
import * as U from '../office-ui.js';
import {viewingIcs} from '../office-actions.js';
import {crmRecord} from '../crm-core.js';
import {offerPreview} from '../crm-ui.js';
import worker from '../offer-ai-worker/worker.js';

function sample(){
 const now = Date.now(), day = C.dayKey(now), s = C.fresh(now);
 const seller = C.makeLead({name:'Anna Kowalska', phone:'600 100 200', area:'Łańcut', property:'Mieszkanie', role:'seller', price:420000, size:58}, now);
 const buyer = C.makeLead({name:'Marta <b>', phone:'602 333 444', area:'Łańcut', property:'Mieszkanie', role:'buyer', price:450000, size:50}, now);
 s.leads.push(seller, buyer);
 s.crm = {profiles:[{id:'p1', clientId:buyer.id, email:'m@example.com', source:'Otodom', summary:'', createdAt:now, updatedAt:now}],
  offers:[{id:'o1', clientId:seller.id, caseId:seller.id, title:'3 pokoje', property:'Mieszkanie', location:'Łańcut', description:'', internal:'', status:'published', transaction:'sale', price:420000, area:58, createdAt:now, updatedAt:now}],
  notes:[], documents:[{id:'d1', clientId:seller.id, title:'KW', reference:'', url:'', description:'', filename:'a.pdf', fileKey:'file-1', type:'property', status:'needed', createdAt:now, updatedAt:now}]};
 return {s, seller, buyer, day, now};
}

test('property card renders saved links, price history and related case information', () => {
 const {s, seller, buyer, day, now} = sample();
 const offer=s.crm.offers[0];
 const photos=['https://example.com/photo.jpg'], listings=['https://example.com/listing'];
 Object.assign(offer,{photos,listings,priceHistory:[{at:now,price:440000},{at:now+1000,price:420000}]});
 O.saveViewing(s,{buyerId:buyer.id,offerId:offer.id,date:day,time:'10:00'});
 O.saveMandate(s,{leadId:seller.id,start:day,end:O.addDays(day,7)});
 C.validate(JSON.parse(JSON.stringify(s)));
 const html=offerPreview(offer,s);
 for(const word of ['photo.jpg','example.com/listing','440','Umowa do','do pozyskania','Marta &lt;b&gt;']){
  assert.ok(html.includes(word),word);
 }
 assert.throws(()=>crmRecord('offer',{...offer,listings:['javascript:alert(1)']}),/HTTPS/);
 assert.throws(()=>crmRecord('offer',{...offer,photos:['https://user:pass@example.com/image.jpg']}),/HTTPS/);
});

test('deferred leads are counted as incoming without assuming later stages', () => {
 const {s, seller, day}=sample();
 seller.stage='lost';
 const result=O.report(s,day,day);
 assert.equal(result.funnel.find(item=>item.stage==='new').count,result.leads);
 assert.equal(result.funnel.find(item=>item.stage==='meeting').count,0);
});

test('AI note endpoint authenticates and returns an editable suggestion with a valid date', async () => {
 const secret='test-only-access';
 const limit={limit:async()=>({success:true})};
 let prompt;
 const env={
  ATRIA_AI_TOKEN:secret,AUTH_RATE_LIMIT:limit,OFFER_RATE_LIMIT:limit,
  AI:{run:async(_model,params)=>{
   prompt=params;
   return {response:{note:'Kupujący poprosił o kolejne spotkanie.',nextDate:'2026-02-30',nextAction:'Ustalić termin'}};
  }}
 };
 const request=token=>new Request('https://worker.example/v1/notes',{method:'POST',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({text:'Prośba o kolejne spotkanie.',ignored:'dane testowe'})});
 assert.equal((await worker.fetch(request('wrong-access'),env)).status,401);
 const response=await worker.fetch(request(secret),env);
 assert.equal(response.status,200);
 assert.deepEqual((await response.json()).draft,{note:'Kupujący poprosił o kolejne spotkanie.',nextDate:'',nextAction:'Ustalić termin'});
 assert.deepEqual(JSON.parse(prompt.messages[1].content),{text:'Prośba o kolejne spotkanie.'});
});

test('viewings are validated, saved and survive full validation', () => {
 const {s, buyer, seller, day} = sample();
 const v = O.saveViewing(s, {buyerId:buyer.id, offerId:'o1', date:day, time:'17:30'});
 assert.equal(v.status, 'planned');
 C.validate(JSON.parse(JSON.stringify(s)));
 assert.throws(() => O.saveViewing(s, {buyerId:seller.id, offerId:'o1', date:day}), /Właściciel/);
 assert.throws(() => O.saveViewing(s, {buyerId:buyer.id, offerId:'o1', date:day, time:'25:00'}), /GG:MM/);
 O.saveViewing(s, {id:v.id, buyerId:buyer.id, offerId:'o1', date:day, time:'17:30', status:'done', interest:'high', rating:'4', feedback:'Ładne'});
 assert.equal(O.officeData(s).viewings.length, 1);
 assert.equal(O.officeData(s).viewings[0].rating, 4);
 const broken = structuredClone(s);
 broken.office.viewings[0].offerId = 'missing';
 assert.throws(() => C.validate(broken), /biura/);
});

test('mandates expire into the today agenda 14 days ahead', () => {
 const {s, seller, day} = sample();
 O.saveMandate(s, {leadId:seller.id, exclusive:true, start:O.addDays(day, -100), end:O.addDays(day, 10), commission:'2.5'});
 assert.equal(O.expiringMandates(s, day).length, 1);
 assert.equal(O.expiringMandates(s, O.addDays(day, -30)).length, 0);
 assert.ok(O.agenda(s, day, O.addDays(day, 14)).some(item => item.kind === 'mandate'));
 assert.throws(() => O.saveMandate(s, {leadId:seller.id, start:day, end:O.addDays(day, -1)}), /przed/);
 assert.throws(() => O.saveMandate(s, {leadId:seller.id, start:day, end:day, commission:'120'}), /Prowizja/);
 C.validate(s);
});

test('checklist toggles keep canonical order', () => {
 const {s, seller} = sample();
 O.toggleStep(s, seller.id, 'notary');
 O.toggleStep(s, seller.id, 'kw');
 assert.deepEqual(O.checklistFor(s, seller.id), ['kw', 'notary']);
 O.toggleStep(s, seller.id, 'kw');
 assert.deepEqual(O.checklistFor(s, seller.id), ['notary']);
 assert.throws(() => O.toggleStep(s, seller.id, 'nope'));
 C.validate(s);
});

test('matching connects buyers with open offers in both directions', () => {
 const {s, buyer} = sample();
 assert.deepEqual(O.matchOffers(s, buyer).map(o => o.id), ['o1']);
 assert.deepEqual(O.matchBuyers(s, s.crm.offers[0]).map(l => l.id), [buyer.id]);
 s.crm.offers[0].status = 'draft';
 assert.equal(O.matchOffers(s, buyer).length, 0);
 s.crm.offers[0].status = 'published';
 buyer.price = 300000;
 assert.equal(O.matchOffers(s, buyer).length, 0);
});

test('templates fill known fields and keep unknown ones visible', () => {
 assert.equal(O.fillTemplate('Hej {imię}, {oferta} {xyz}', {imię:'Ania', oferta:'Dom'}), 'Hej Ania, Dom {xyz}');
 const {s} = sample();
 O.saveTemplate(s, {title:'Nowy', body:'Treść'});
 assert.equal(O.templatesOf(s).length, O.DEFAULT_TEMPLATES.length + 1);
 O.removeTemplate(s, 'tpl-offer');
 assert.ok(!O.templatesOf(s).some(t => t.id === 'tpl-offer'));
 C.validate(s);
});

test('consents and erasing a client remove personal data everywhere', () => {
 const {s, seller, buyer, day} = sample();
 O.saveConsent(s, {clientId:buyer.id, processing:day, marketing:'', basis:'Formularz'});
 O.saveViewing(s, {buyerId:buyer.id, offerId:'o1', date:day});
 O.saveMandate(s, {leadId:seller.id, start:day, end:day});
 C.logActivity(s, {type:'call', leadId:seller.id, outcome:'reached', note:'Rozmowa z Anną'});
 C.validate(s);
 const keys = O.eraseClient(s, seller.id);
 assert.deepEqual(keys, ['file-1']);
 assert.ok(!s.leads.some(l => l.id === seller.id));
 assert.equal(s.crm.offers.length, 0);
 assert.equal(s.crm.documents.length, 0);
 assert.equal(O.officeData(s).viewings.length, 0);
 assert.equal(O.officeData(s).mandates.length, 0);
 assert.equal(s.activities[0].leadId, null);
 assert.doesNotMatch(JSON.stringify(s), /Anna|Kowalska/);
 assert.equal(O.consentFor(s, buyer.id).processing, day);
 C.validate(s);
});

test('lead import reads Excel paste and CSV, normalizes phones and skips duplicates', () => {
 const {s} = sample();
 const tsv = 'Rodzaj nieruchomości\tPrzeznaczenie\tLokalizacja\tMetraż\tCena\tTelefon\nMieszkanie\tSprzedaż\tŁańcut\t48,5\t399 000 zł\t+48 605 111 222\nDom\tWynajem\tKraczkowa\t120\t3500\t600-100-200\nDziałka\tSprzedaż\tAlbigowa\t1200\t150000\t';
 const rows = O.parseLeadImport(tsv);
 assert.equal(rows.length, 3);
 assert.equal(rows[0].phone, '605111222');
 assert.equal(rows[0].size, 49);
 assert.equal(rows[0].price, 399000);
 assert.equal(rows[1].role, 'landlord');
 const plan = O.planImport(s, rows);
 assert.equal(plan.fresh.length, 1);
 assert.deepEqual(plan.skipped.map(x => x.reason).sort(), ['brak telefonu', 'duplikat']);
 const csv = '"Telefon";"Lokalizacja";"Uwagi"\n"605 999 000";"Rzeszów";"Link; z średnikiem"\n';
 assert.equal(O.parseLeadImport(csv)[0].notes, 'Link; z średnikiem');
 assert.throws(() => O.parseLeadImport('Lokalizacja\nŁańcut'), /Telefon/);
});

test('reports count funnel, sources and commission', () => {
 const {s, buyer, seller} = sample();
 C.logActivity(s, {type:'meeting', leadId:buyer.id});
 C.logActivity(s, {type:'sale', leadId:seller.id, commission:'8500'});
 const day = C.dayKey();
 const r = O.report(s, day.slice(0, 8) + '01', day);
 assert.equal(r.leads, 2);
 assert.equal(r.funnel.find(f => f.stage === 'won').count, 1);
 assert.equal(r.commissionGrosz, 850000);
 assert.ok(r.sources.some(x => x.source === 'Otodom'));
 assert.equal(r.months.at(-1).grosz, 850000);
});

test('office views render and escape client data', () => {
 const {s, buyer, seller, day} = sample();
 O.saveViewing(s, {buyerId:buyer.id, offerId:'o1', date:day, time:'09:00'});
 O.saveMandate(s, {leadId:seller.id, start:day, end:O.addDays(day, 5)});
 for(const html of [U.todaySections(s, day), U.calendarView(s, day), U.reportsView(s, day, 'd90'), U.templatesView(s),
  ...['matches', 'viewings', 'deal', 'privacy'].map(view => U.clientTab(s, buyer, view)), U.clientTab(s, seller, 'viewings')]){
  assert.ok(html.length > 50);
  assert.doesNotMatch(html, /<b>/);
 }
 assert.match(U.todaySections(s, day), /Prezentacja/);
 assert.match(U.contactBar(buyer, {email:'m@example.com'}), /E-mail/);
 assert.ok(U.timelineExtras(s, seller).length >= 2);
});

test('viewing calendar file is valid iCalendar', () => {
 const ics = viewingIcs({id:'v1', date:'2026-11-23', time:'17:30', notes:'Klucze; u sąsiada'}, {name:'Marta', phone:'602'}, {title:'3 pokoje, balkon', location:'Łańcut'}, 'ATRIA');
 assert.match(ics, /DTSTART:20261123T173000/);
 assert.match(ics, /DTEND:20261123T183000/);
 assert.match(ics, /SUMMARY:Prezentacja: 3 pokoje\\, balkon/);
 assert.match(ics, /Klucze\\; u sąsiada/);
});
