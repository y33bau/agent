const key='atria-offer-ai-config-v1';
const defaultWorker='https://atria-offer-ai.ad-szelag.workers.dev';
const labels={openai:'OpenAI',anthropic:'Claude',gemini:'Gemini'};
const errors={
 unauthorized:'Kod dostępu do generatora jest nieprawidłowy.',
 worker_setup:'Na Workerze brakuje kodu dostępu ATRIA_AI_TOKEN.',
 provider_setup:'Ten dostawca nie ma klucza API w Cloudflare.',
 provider_config:'Dostawca odrzucił klucz lub wybrany model. Sprawdź konfigurację.',
 provider_limit:'Dostawca zgłosił limit użycia lub brak środków.',
 provider_billing:'Sprawdź rozliczenia konta API u dostawcy.',
 provider_error:'Dostawca nie przyjął zapytania. Spróbuj ponownie lub zmień dostawcę.',
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
function configFrom(form){
 let url;
 try{url=new URL(find(form,'url').value.trim());}catch{}
 if(!url || url.protocol!=='https:' || !/^[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev$/i.test(url.hostname) ||
    url.port || url.username || url.password || url.pathname!=='/' || url.search || url.hash){
  throw Error('Wklej adres Workera w domenie workers.dev, bez dodatkowej ścieżki.');
 }
 const token=find(form,'token').value.trim();
 if(!/^[a-zA-Z0-9_-]{32,128}$/.test(token)) throw Error('Kod dostępu musi mieć od 32 do 128 znaków. Użyj liter, cyfr, myślników lub podkreśleń.');
 return {url:url.origin,token,provider:find(form,'provider').value};
}
function status(form,message,target='status'){find(form,target).textContent=message;}
function restore(form){
 if(instances.has(form)) return instances.get(form);
 const current=storedConfig(), instance={draft:null,busy:false};
 instances.set(form,instance);
 const url=find(form,'url'), token=find(form,'token');
 if(!url.value)url.value=current.url || defaultWorker;
 if(!token.value)token.value=current.token || '';
 if(Object.hasOwn(labels,current.provider))find(form,'provider').value=current.provider;
 return instance;
}
function setProviders(form,providers){
 const select=find(form,'provider');
 for(const option of select.options)option.disabled=!providers.includes(option.value);
 if(!providers.includes(select.value))select.value=providers[0] || '';
}
async function request(config,path,body){
 let response,data;
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),32000);
 try{
  response=await fetch(config.url+path,{
   method:body?'POST':'GET',
   headers:{Authorization:'Bearer '+config.token,...(body?{'Content-Type':'application/json'}:{})},
   body:body?JSON.stringify(body):undefined,
   signal:controller.signal,cache:'no-store',redirect:'error'
  });
  data=await response.json().catch(error=>{if(controller.signal.aborted)throw error;return null;});
 }catch{throw Error(controller.signal.aborted?'Przekroczono czas oczekiwania.':'Nie udało się połączyć z Workerem. Sprawdź adres i internet.');}
 finally{clearTimeout(timer);}
 if(!response.ok || !data){
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
 status(form,'Szkic gotowy • '+labels[provider]);
}
function factsFrom(form){
 const facts=Object.fromEntries(['transaction','property','location','price','area']
  .map(name=>[name,form.elements.namedItem(name).value.trim()]));
 facts.features=find(form,'features').value.trim();
 if(!facts.property || !facts.location)throw Error('Uzupełnij typ nieruchomości i miejscowość.');
 return facts;
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
  if(action==='forget'){
   localStorage.removeItem(key);
   find(form,'url').value=defaultWorker;
   find(form,'token').value='';
   setProviders(form,Object.keys(labels));
   status(form,'Usunięto konfigurację z tego urządzenia.',target);
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
   status(form,providers.length?'Połączono. Dostępni dostawcy: '+providers.map(id=>labels[id]).filter(Boolean).join(', ')+'.':'Połączono z Workerem. Dodaj klucz API wybranego dostawcy w Cloudflare.',target);
   return;
  }
  if(action==='generate'){
   if(!Object.hasOwn(labels,config.provider))throw Error('Wybierz dostawcę AI.');
   const facts=factsFrom(form);
   status(form,'Tworzę szkic…');
   find(form,'result').hidden=true;
   const {draft}=await request(config,'/v1/offers',{provider:config.provider,facts});
   if(!draft || ['title','description','short'].some(name=>typeof draft[name]!=='string') ||
      !Array.isArray(draft.missing) || draft.title.length>160 || draft.description.length>8000 || draft.short.length>650){
    throw Error(errors.invalid_draft);
   }
   instance.draft=draft;
   draftPreview(form,draft,config.provider);
   localStorage.setItem(key,JSON.stringify(config));
  }
 }catch(error){status(form,error.message || 'Generator jest chwilowo niedostępny.',target);}
 finally{if(ownsRequest){instance.busy=false;button.disabled=false;}}
});
