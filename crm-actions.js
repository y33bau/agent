import {crmData, crmRecord} from './crm-core.js';
import {crmForm, escapeHtml, offerPreview, publicOfferHtml} from './crm-ui.js';
import {putFile, readFile, removeFile} from './crm-files.js';
import {isDay} from './core.js';

const collections = {profile:'profiles', offer:'offers', note:'notes', document:'documents'};
const titles = {profile:'Profil klienta', offer:'Oferta nieruchomości', note:'Wpis w historii', document:'Dokument klienta'};

function download(blob, name){
 const url = URL.createObjectURL(blob), link = document.createElement('a');
 link.href = url;
 link.download = name;
 document.body.append(link);
 link.click();
 link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}

export function createCrmActions({getState, commit, uid, modal, clientCard, toast}){
 const record = (kind,id)=>crmData(getState())[collections[kind]].find(entry=>entry.id===id);
 const findLead = id=>getState().leads.find(lead=>lead.id===id);
 const profileFor = id=>crmData(getState()).profiles.find(entry=>entry.clientId===id);

 function form(kind, lead, entry){
  if(!lead) throw Error('Sprawa klienta jest niedostępna.');
  if(kind==='profile') lead=findLead(lead.clientId || lead.id) || lead;
  modal(titles[kind],crmForm(kind,lead,entry));
 }

 function pickClient(){
  const leads = getState().leads.filter(lead=>!lead.archived).sort((a,b)=>a.name.localeCompare(b.name,'pl'));
  modal('Powiąż ofertę ze sprawą',leads.length
   ? '<form id="crm-pick-form"><label class="field">Sprawa klienta<select name="lead" required><option value="">Wybierz sprawę</option>'+
     leads.map(lead=>'<option value="'+escapeHtml(lead.id)+'">'+escapeHtml(lead.name+' · '+lead.property+' · '+lead.area)+'</option>').join('')+
     '</select></label><div class="form-actions"><button class="btn gold">Utwórz ofertę</button></div></form>'
   : '<p>Dodaj lead, aby powiązać z nim ofertę.</p><button class="btn gold" data-action="lead-add">Dodaj lead</button>');
 }

 async function onAction(action,id){
  if(action==='crm-offer-pick'){pickClient();return;}
  if(action==='crm-profile'){
   const lead=findLead(id);
   if(lead) form('profile',lead,profileFor(lead.clientId || lead.id));
   return;
  }
  const [,kind,verb] = action.split('-');
  if(!Object.hasOwn(collections,kind) && kind!=='file') return;
  if(kind==='file'){
   const entry=record('document',id);
   if(!entry?.fileKey) return;
   const file=await readFile(entry.fileKey);
   if(!file) throw Error('Pliku nie ma na tym urządzeniu. Użyj linku lub załącz plik ponownie.');
   download(file,entry.filename);
   return;
  }
  if(verb==='add'){form(kind,findLead(id));return;}
  const entry=record(kind,id);
  if(!entry) return;
  if(verb==='edit'){form(kind,findLead(entry.caseId || entry.clientId),entry);return;}
  if(verb==='preview'){modal(entry.title,offerPreview(entry,getState()));return;}
  if(verb==='export'){
   const html=publicOfferHtml(entry,getState().settings.agency);
   download(new Blob([html],{type:'text/html;charset=utf-8'}),'oferta-'+entry.id.slice(0,8).replace(/[^a-z0-9-]/gi,'')+'.html');
  }
 }

 async function onSubmit(formElement){
  const values=Object.fromEntries(new FormData(formElement));
  if(formElement.id==='crm-pick-form'){form('offer',findLead(values.lead));return;}
  const {kind,id,lead:leadId}=formElement.dataset;
  const lead=findLead(leadId);
  if(!lead) throw Error('Sprawa klienta jest niedostępna.');
  const clientId=lead.clientId || lead.id;
  const old=id ? record(kind,id) : undefined;
  if(id && (!old || old.clientId!==clientId)) throw Error('Wpis zmienił się. Otwórz go ponownie.');
  const entryId=old?.id || uid();
  const now=Date.now();
  if(kind==='offer'){
   for(const key of ['photos','listings']) values[key]=String(values[key]??'').split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
  }
  if(kind==='note' && values.nextDate && !isDay(values.nextDate)) throw Error('Wybierz prawidłową datę kontaktu.');
  let fileKey=old?.fileKey;
  const file=kind==='document' && values.file?.size ? values.file : null;
  if(file && file.size>25*1024*1024) throw Error('Plik przekracza 25 MB.');
  const info=crmRecord(kind,{...values, filename:file?.name || old?.filename});
  if(file){
   fileKey=uid();
   await putFile(fileKey,file);
  }
  try {
   commit(next=>{
    const current=crmData(next);
    next.crm=current;
    const list=current[collections[kind]];
    const existing=list.find(entry=>entry.id===entryId);
    if(old && !existing) throw Error('Wpis zmienił się. Otwórz go ponownie.');
    const entry={...info,id:entryId,clientId,createdAt:old?.createdAt ?? now,updatedAt:now};
    if(kind==='profile'){
     const name=String(values.name || '').trim().slice(0,100);
     if(!name) throw Error('Podaj nazwę klienta.');
     for(const contact of next.leads.filter(contact=>(contact.clientId || contact.id)===clientId)){
      contact.name=name;
      contact.phone=String(values.phone || '').trim().slice(0,40);
     }
    }
    if(kind==='offer'){
     entry.caseId=existing?.caseId || leadId;
     const history=[...(existing?.priceHistory||[])];
     if(existing && !history.length && existing.price!==null) history.push({at:existing.updatedAt,price:existing.price});
     if(existing ? existing.price!==entry.price : entry.price!==null) history.push({at:now,price:entry.price});
     entry.priceHistory=history.slice(-100);
    }
    if(kind==='note'){
     const currentLead=next.leads.find(item=>item.id===leadId);
     if(!currentLead) throw Error('Sprawa klienta jest niedostępna.');
     if(values.nextDate) currentLead.nextDate=values.nextDate;
     if(values.nextAction?.trim()) currentLead.nextAction=values.nextAction.trim().slice(0,200);
    }
    if(fileKey) entry.fileKey=fileKey;
    if(existing) list[list.indexOf(existing)]=entry;
    else list.push(entry);
   });
  } catch(error){
   if(file) await removeFile(fileKey).catch(()=>{});
   throw error;
  }
  if(document.getElementById(formElement.id)===formElement){
   if(kind==='offer') await onAction('crm-offer-preview',entryId);
   else clientCard(leadId,({note:'history',document:'documents'})[kind]);
  }
  toast('Zapisano w CRM.');
 }

 return {onAction,onSubmit};
}
