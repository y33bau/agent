import {generateRequestDetails} from 'web-push';
import {dueReminders,validateReminders,reminderMessage,localClock} from '../notification-core.js';

const APPS={adhd:'/RPG-ADHD/',agent:'/agent/'};
const encoder=new TextEncoder();
async function digest(value){const b=await crypto.subtle.digest('SHA-256',encoder.encode(value));return new Uint8Array(b);}
async function authorized(request,env){
 const expected=env.PUSH_ACCESS_TOKEN||'';if(expected.length<24)return false;
 const actual=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 const a=await digest(actual),b=await digest(expected);let mismatch=0;for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i];return mismatch===0;
}
function validEndpoint(raw){
 try{const u=new URL(raw);if(u.protocol!=='https:'||u.port&&u.port!=='443'||u.username||u.password)return false;
 return ['fcm.googleapis.com','push.services.mozilla.com','web.push.apple.com','notify.windows.com'].some(d=>u.hostname===d||u.hostname.endsWith('.'+d));}catch{return false;}
}
function validSubscription(sub){return sub&&validEndpoint(sub.endpoint)&&typeof sub.keys?.p256dh==='string'&&/^[A-Za-z0-9_-]{80,100}$/.test(sub.keys.p256dh)&&typeof sub.keys?.auth==='string'&&/^[A-Za-z0-9_-]{20,30}$/.test(sub.keys.auth);}
function key(id){if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw Error('Bad device id');return 'subscription:'+id;}
function headers(origin){return {'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Cache-Control':'no-store','Vary':'Origin'};}
function json(data,status,origin){return Response.json(data,{status,headers:headers(origin)});}
async function send(env,entry,message){
 const details=generateRequestDetails(entry.subscription,JSON.stringify({...message,url:'https://y33bau.github.io'+APPS[entry.app]}),{TTL:300,urgency:'normal',vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY}});
 const response=await fetch(details.endpoint,{method:details.method,headers:details.headers,body:details.body,redirect:'error'});
 if([404,410].includes(response.status))return 'expired';
 if(!response.ok)throw Error('Push delivery failed ('+response.status+')');
 return 'sent';
}
export default {
 async fetch(request,env){
 const origin=env.ALLOWED_ORIGIN||'https://y33bau.github.io',incoming=request.headers.get('Origin');
 if(incoming!==origin)return json({error:'Origin denied'},403,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
 if(!await authorized(request,env))return json({error:'Unauthorized'},401,origin);
 if(!env.SUBSCRIPTIONS||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return json({error:'Service is not configured'},503,origin);
 try{
 const path=new URL(request.url).pathname;
 if(path==='/vapid-public-key'&&request.method==='GET')return json({publicKey:env.VAPID_PUBLIC_KEY},200,origin);
 if(request.method!=='POST')return json({error:'Method not allowed'},405,origin);
 const raw=await request.text();if(raw.length>16000)return json({error:'Too large'},413,origin);
 const body=JSON.parse(raw),id=key(body.deviceId);
 if(path==='/unsubscribe'){await env.SUBSCRIPTIONS.delete(id);return json({ok:true},200,origin);}
 if(path==='/subscribe'){
 if(!Object.hasOwn(APPS,body.app)||!validSubscription(body.subscription))return json({error:'Invalid subscription'},400,origin);
 const schedule=validateReminders({...body.schedule,last:{}},body.app);
 const old=await env.SUBSCRIPTIONS.get(id,'json');
 const last=old?.app===body.app?old.schedule.last:{};
 const {enabled,water,work,start,end,waterEvery,workEvery,weekdays,zone}=schedule;
 const entry={app:body.app,subscription:body.subscription,schedule:{enabled,water,work,start,end,waterEvery,workEvery,weekdays,zone,last},hydratedDay:typeof body.hydratedDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(body.hydratedDay)?body.hydratedDay:null,updatedAt:Date.now()};
 await env.SUBSCRIPTIONS.put(id,JSON.stringify(entry),{expirationTtl:60*60*24*180});return json({ok:true},200,origin);
 }
 if(path==='/test'){
 const entry=await env.SUBSCRIPTIONS.get(id,'json');if(!entry)return json({error:'Subscription missing'},404,origin);
 const result=await send(env,entry,{...reminderMessage(entry.app,'work'),body:'Test push działa. Możesz wrócić do swojego dnia.'});
 if(result==='expired'){await env.SUBSCRIPTIONS.delete(id);return json({error:'Subscription expired'},410,origin);}return json({ok:true},200,origin);
 }
 return json({error:'Not found'},404,origin);
 }catch{return json({error:'Invalid request or delivery failure'},400,origin);}
 },
 async scheduled(event,env,ctx){
 ctx.waitUntil((async()=>{
 if(!env.SUBSCRIPTIONS||!env.VAPID_PRIVATE_KEY)return;
 let cursor;
 do{
 const page=await env.SUBSCRIPTIONS.list({prefix:'subscription:',limit:100,cursor});
 for(const item of page.keys){
 try{
 const entry=await env.SUBSCRIPTIONS.get(item.name,'json');if(!entry)continue;
 const clock=localClock(event.scheduledTime,entry.schedule.zone);
 entry.schedule.last=Object.fromEntries(Object.entries(entry.schedule.last||{}).filter(([key])=>key.startsWith(clock.day)));
 const due=dueReminders(entry.schedule,event.scheduledTime,entry.hydratedDay===clock.day);
 let expired=false;
 for(const reminder of due){
 const result=await send(env,entry,reminderMessage(entry.app,reminder.kind));
 if(result==='expired'){await env.SUBSCRIPTIONS.delete(item.name);expired=true;break;}
 entry.schedule.last[reminder.key]=true;
 }
 if(!expired&&due.length)await env.SUBSCRIPTIONS.put(item.name,JSON.stringify(entry),{expirationTtl:60*60*24*180});
 }catch{ /* Do not log subscription endpoints or private keys. Retry on next scheduled tick. */ }
 }
 cursor=page.list_complete?undefined:page.cursor;
 }while(cursor);
 })());
 }
};
