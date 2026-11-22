const key='atria-offer-ai-config-v1';
const defaultWorker='https://atria-offer-ai.ad-szelag.workers.dev';
const labels={cloudflare:'Cloudflare AI',openai:'OpenAI',anthropic:'Claude',gemini:'Gemini'};
const errors={
 unauthorized:'Kod dostępu do generatora jest nieprawidłowy.',
 worker_setup:'Na Workerze brakuje poprawnego kodu ATRIA_AI_TOKEN. Ustaw od 10 do 128 znaków.',
 auth_limit:'Za dużo prób połączenia. Odczekaj minutę i spróbuj ponownie.',
 provider_setup:'Ten dostawca nie ma klucza API w Cloudflare.',
 provider_config:'Dostawca odrzucił klucz lub wybrany model. Sprawdź konfigurację.',
 provider_limit:'Dostawca zgłosił limit użycia lub brak środków.',
 provider_billing:'Sprawdź rozliczenia konta API u dostawcy.',
 provider_error:'Dostawca nie przyjął zapytania. Spróbuj ponownie lub zmień dostawcę.',
 cloudflare_limit:'Wykorzystano dzienny limit Workers AI. Spróbuj po odnowieniu limitu.',
 cloudflare_error:'Cloudflare AI jest chwilowo niedostępne. Spróbuj ponownie.',
 local_limit:'Osiągnięto limit generatora. Spróbuj za minutę.',
 invalid_input:'Uzupełnij typ nieruchomości i miejscowość. Sprawdź długość opisu cech.',
 invalid_draft:'AI zwróciło niepełny szkic. Spróbuj ponownie lub zmień dostawcę.',
 timeout:'Dostawca nie odpowiedział na czas. Spróbuj ponownie.'
};
const instances=new WeakMap();
const find=(form,name)=>form.querySelector('[data-ai-'+name+']');
function storedConfig(){
 try{return JSON.parse(localStorage.getItem(key)) || {};}catch{return {};}
}
function validatedConfig(address,code,provider){
 let url;
 try{url=new URL(address.trim());}catch{}
 if(!url || url.protocol!=='https:' || !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/i.test(url.hostname) ||
    url.port || url.username || url.password || url.pathname!=='/' || url.search || url.hash){
  throw Error('Wklej adres Workera w domenie workers.dev, bez dodatkowej ścieżki.');
 }
 const token=code.trim();
 const length=[...token].length;
 if(length<10) throw Error('Kod ma '+length+' znaków. Minimum to 10.');
 if(length>128) throw Error('Kod może mieć maksymalnie 128 znaków.');
 if(/\p{Cc}/u.test(token)) throw Error('Kod zawiera znak sterujący, np. tabulator lub koniec linii.');
 return {url:url.origin,token,provider};
}
function configFrom(form){
 return validatedConfig(find(form,'url').value,find(form,'token').value,find(form,'provider').value);
}
function status(form,message,target='status'){find(form,target).textContent=message;}
function restore(form){
 if(instances.has(form)) return instances.get(form);
 const current=storedConfig(), instance={draft:null,busy:false};
 instances.set(form,instance);
 const url=find(form,'url'), token=find(form,'token');
 if(!url.value)url.value=current.url || defaultWorker;
 if(!token.value)token.value=current.token || '';
 const provider=find(form,'provider');
 if([...provider.options].some(option=>option.value===current.provider))provider.value=current.provider;
 return instance;
}
function setProviders(form,providers){
 const select=find(form,'provider');
 for(const option of select.options)option.disabled=!providers.includes(option.value);
 if(!providers.includes(select.value))select.value=[...select.options].find(option=>!option.disabled)?.value || '';
}
function authorization(token){
 const bytes=new TextEncoder().encode(token);
 const encoded=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 return 'Bearer atria-v2.'+encoded;
}
async function request(config,path,body){
 let response,data;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),32000);
 try{
  response=await fetch(config.url+path,{
   method:body?'POST':'GET',
   headers:{Authorization:authorization(config.token),...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,
   signal:controller.signal,cache:'no-store',redirect:'error'
  });
  data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return null;});
 }catch{throw Error(controller.signal.aborted?'Przekroczono czas oczekiwania.':'Nie udało się połączyć z Workerem. Sprawdź adres i internet.');}
 finally{clearTimeout(timer);}
 if(!response.ok || !data){
  if(path==='/v1/notes' && response.status===404){
   throw Error('Notatki AI wymagają aktualizacji Workera. Wpisz treść i zapisz notatkę ręcznie.');
  }
  if(body?.provider==='cloudflare' && data?.error==='provider_setup'){
   throw Error('Sprawdź, czy Worker ma włączone Cloudflare AI i jest zaktualizowany.');
  }
  if(data?.error==='provider_config'){
   const name=labels[body?.provider] || 'Dostawca AI';
   const detail={
    401:'odrzucił klucz API. W Cloudflare ustaw aktywny klucz API tego dostawcy.',
    403:'nie zezwala na to żądanie. Sprawdź uprawnienia klucza i projektu API.',
    404:'nie udostępnia wybranego modelu. Sprawdź, czy projekt API ma do niego dostęp.'
   }[data.providerStatus];
   if(detail) throw Error(name+' '+detail+' ('+data.providerStatus+').');
  }
  throw Error(errors[data?.error] || 'Worker nie odpowiedział prawidłowo.');
 }
 return data;
}
function draftPreview(form,draft,provider){
 find(form,'result').hidden=false;
 find(form,'draft-title').textContent=draft.title;
 find(form,'draft-description').value=draft.description;
 find(form,'draft-short').value=draft.short;
 find(form,'draft-missing').textContent=draft.missing.length?'Do uzupełnienia: '+draft.missing.join(', '):'';
 status(form,'Szkic gotowy • '+provider);
}
function factsFrom(form){
 const facts=Object.fromEntries(['transaction','property','location','price','area']
  .map(name=>[name,form.elements.namedItem(name).value.trim()]));
 facts.features=find(form,'features').value.trim();
 if(!facts.property || !facts.location)throw Error('Uzupełnij typ nieruchomości i miejscowość.');
 return facts;
}
function chatGptPrompt(facts){
 const listing={
  'Rodzaj transakcji':facts.transaction==='rent'?'Najem':'Sprzedaż',
  'Typ nieruchomości':facts.property,
  'Miejscowość lub rejon':facts.location,
  'Cena w PLN':facts.price,
  'Powierzchnia w m²':facts.area,
  'Cechy':facts.features
 };
 return [
  'Przygotuj po polsku szkic ogłoszenia nieruchomości dla ATRIA na podstawie poniższych danych. Używaj wyłącznie podanych faktów. Puste pola pomiń w opisie. Nie dopisuj szczegółów ani danych kontaktowych.',
  'Zwróć wyłącznie jeden poprawny obiekt JSON. Pola: title (tytuł, maks. 160 znaków), description (opis, maks. 8000 znaków), short (krótka wersja, maks. 650 znaków), missing (tablica krótkich nazw istotnych brakujących danych, pusta jeśli żadnych nie ma).',
  JSON.stringify(listing,null,2)
 ].join('\n\n');
}
function parseChatGptDraft(value){
 const input=value.trim();
 if(!input)throw Error('Wklej odpowiedź z ChatGPT.');
 if(input.length>65536)throw Error('Odpowiedź jest za długa. Poproś ChatGPT o krótszy szkic.');
 const block=input.match(/```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n[ \t]*```/i);
 let draft;
 try{draft=JSON.parse(block?.[1] ?? input);}catch{
  throw Error('Nie udało się odczytać szkicu. Poproś ChatGPT o sam JSON i wklej cały wynik.');
 }
 const title=typeof draft?.title==='string'?draft.title.trim():'';
 const description=typeof draft?.description==='string'?draft.description.trim():'';
 if(!title || !description)throw Error('W szkicu brakuje tytułu lub opisu. Poproś ChatGPT o pełny wynik.');
 const short=typeof draft.short==='string'?draft.short.trim():'';
 if(title.length>160 || description.length>8000 || short.length>650){
  throw Error('Szkic przekracza limit długości. Poproś ChatGPT o krótszy tytuł, opis lub skrót.');
 }
 const missing=Array.isArray(draft.missing)?draft.missing.filter(item=>typeof item==='string').map(item=>item.trim()).filter(Boolean):[];
 return {title,description,short,missing};
}
async function copyChatGptPrompt(form){
 const prompt=chatGptPrompt(factsFrom(form));
 const fallback=find(form,'copy-fallback');
 try{
  await navigator.clipboard.writeText(prompt);
  fallback.hidden=true;
  status(form,'Skopiowano. Otwórz ChatGPT i wklej polecenie.');
 }catch{
  const field=find(form,'prompt');
  field.value=prompt;
  fallback.hidden=false;
  field.focus();
  field.select();
  status(form,'Skopiuj polecenie ręcznie z widocznego pola.');
 }
}
function applyDraft(form,draft){
 const title=form.elements.namedItem('title'), description=form.elements.namedItem('description');
 const overwrites=(title.value && title.value!==draft.title) || (description.value && description.value!==draft.description);
 if(overwrites && !window.confirm('Zastąpić aktualny tytuł i opis w formularzu?')) return;
 title.value=draft.title;
 description.value=draft.description;
 find(form,'result').hidden=true;
 status(form,'Wstawiono tytuł i opis. Sprawdź treść i zapisz ofertę.');
}

const noteDrafts=new WeakMap();
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-note-ai]');
 const form=button?.closest('#crm-record-form[data-kind=note]');
 if(!form) return;
 const status=form.querySelector('[data-note-status]');
 const body=form.elements.namedItem('body');
 const preview=form.querySelector('[data-note-result]');
 const proposed=form.querySelector('[data-note-draft]');
 if(button.dataset.noteAi==='apply'){
  const draft=noteDrafts.get(form);
  if(!draft || body.value!==draft.original || !proposed.value.trim()){
   status.textContent='Sprawdź treść i wygeneruj propozycję ponownie.';
   return;
  }
  body.value=proposed.value.trim();
  const followup=form.querySelector('[data-note-followup]');
  followup.open=true;
  const inputDate=form.elements.namedItem('nextDate'), inputAction=form.elements.namedItem('nextAction');
  if(draft.nextDate && !inputDate.value)inputDate.value=draft.nextDate;
  if(draft.nextAction && !inputAction.value)inputAction.value=draft.nextAction;
  preview.hidden=true;
  status.textContent='Sprawdź notatkę i pola następnego kontaktu. Zmiany zapisze przycisk Zapisz.';
  return;
 }
 const original=body.value;
 if(!original.trim()){status.textContent='Najpierw wpisz lub podyktuj notatkę.';return;}
 const config=storedConfig();
 if(!config.token){status.textContent='Najpierw połącz generator AI w formularzu dowolnej oferty.';return;}
 preview.hidden=true;
 button.disabled=true;
 status.textContent='Porządkuję notatkę…';
 try{
  const {draft}=await request(validatedConfig(config.url||defaultWorker,config.token,'cloudflare'),'/v1/notes',{text:original.trim()});
  if(!draft?.note || typeof draft.note!=='string' || draft.note.length>4000)throw Error(errors.invalid_draft);
  proposed.value=draft.note;
  noteDrafts.set(form,{original,nextDate:draft.nextDate,nextAction:draft.nextAction});
  const hint=document.createElement('p');
  hint.className='subtitle';
  hint.dataset.noteHint='';
  hint.textContent=[draft.nextDate,draft.nextAction].filter(Boolean).join(' · ')||'AI nie zaproponowało następnego kontaktu.';
  preview.querySelector('[data-note-hint]')?.remove();
  preview.prepend(hint);
  preview.hidden=false;
  status.textContent='Sprawdź propozycję przed wstawieniem.';
 }catch(error){status.textContent=error.message;}
 finally{button.disabled=false;}
});

document.addEventListener('toggle',event=>{
 const form=event.target.closest?.('#crm-record-form[data-kind=offer]');
 if(form && event.target.matches('[data-ai-panel]') && event.target.open)restore(form);
},true);
document.addEventListener('keydown',event=>{
 if(event.key==='Enter' && event.target.matches('[data-ai-url],[data-ai-token]')){
  event.preventDefault();
  event.target.closest('form')?.querySelector('[data-ai-action=check]')?.click();
 }
});
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-ai-action]');
 const form=button?.closest('#crm-record-form[data-kind=offer]');
 if(!form) return;
 const action=button.dataset.aiAction;
 const target=['check','forget'].includes(action)?'connect-status':'status';
 let instance,ownsRequest=false;
 try{
  instance=restore(form);
  if(instance.busy){status(form,'Poczekaj na zakończenie bieżącego żądania.',target);return;}
  if(action==='apply' && instance.draft){applyDraft(form,instance.draft);return;}
  if(action==='copy-chatgpt'){await copyChatGptPrompt(form);return;}
  if(action==='import-chatgpt'){
   instance.draft=null;
   find(form,'result').hidden=true;
   instance.draft=parseChatGptDraft(find(form,'import-text').value);
   draftPreview(form,instance.draft,'ChatGPT');
   return;
  }
  if(action==='forget'){
   localStorage.removeItem(key);
   find(form,'url').value=defaultWorker;
   find(form,'token').value='';
   setProviders(form,Object.keys(labels));
   status(form,'Usunięto konfigurację z tego urządzenia.',target);
   return;
  }
  if(action==='generate-cloudflare' && !find(form,'token').value.trim()){
   find(form,'settings').open=true;
   find(form,'token').focus();
   status(form,'Wpisz swój dotychczasowy kod dostępu do generatora.');
   return;
  }
  const config=configFrom(form);
  instance.busy=true;
  ownsRequest=true;
  button.disabled=true;
  if(action==='check'){
   status(form,'Sprawdzam połączenie…',target);
   const {providers}=await request(config,'/v1/providers');
   if(!Array.isArray(providers))throw Error('Worker nie zwrócił listy dostawców.');
   setProviders(form,providers);
   localStorage.setItem(key,JSON.stringify({...config,provider:find(form,'provider').value}));
   status(form,providers.length?'Połączono. Dostępni dostawcy: '+providers.map(id=>labels[id]).filter(Boolean).join(', ')+'.':'Połączono z Workerem. Włącz Cloudflare AI w konfiguracji Workera.',target);
   return;
  }
  if(action==='generate' || action==='generate-cloudflare'){
   const provider=action==='generate-cloudflare'?'cloudflare':config.provider;
   if(!Object.hasOwn(labels,provider))throw Error('Wybierz dostawcę AI.');
   const facts=factsFrom(form);
   status(form,'Tworzę szkic…');
   find(form,'result').hidden=true;
   const {draft}=await request(config,'/v1/offers',{provider,facts});
   if(!draft || ['title','description','short'].some(name=>typeof draft[name]!=='string') ||
      !Array.isArray(draft.missing) || draft.title.length>160 || draft.description.length>8000 || draft.short.length>650){
    throw Error(errors.invalid_draft);
   }
   instance.draft=draft;
   draftPreview(form,draft,labels[provider]);
   localStorage.setItem(key,JSON.stringify(config));
  }
 }catch(error){status(form,error.message || 'Generator jest chwilowo niedostępny.',target);}
 finally{if(ownsRequest){instance.busy=false;button.disabled=false;}}
});
