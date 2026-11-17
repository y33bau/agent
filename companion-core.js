export function pickTask(tasks,minutes,energy,available,random=Math.random){
 const limit=Number(minutes)<=5?0:Number(minutes)<=15?1:2;
 const rank=t=>['micro','small'].includes(t.tier)?0:t.tier==='big'?2:1;
 const pending=tasks.filter(available),candidates=pending.filter(t=>rank(t)<=Math.min(limit,energy==='low'?0:energy==='medium'?1:2));
 const list=candidates.length?candidates:pending.filter(t=>rank(t)===Math.min(...pending.map(rank)));
 return list.length?list[Math.min(list.length-1,Math.floor(random()*list.length))]:null;
}
export function radar(leads,day){return leads.filter(l=>!l.archived&&!['won','lost'].includes(l.stage)).sort((a,b)=>(a.nextDate||'9999').localeCompare(b.nextDate||'9999')).map(l=>({...l,urgency:!l.nextDate?'none':l.nextDate<day?'late':l.nextDate===day?'today':'later'}));}
export function funnel(activities){const a=activities.filter(a=>!a.voided),count=t=>a.filter(a=>a.type===t).length;const calls=count('call'),reached=a.filter(a=>a.type==='call'&&a.outcome==='reached').length;return {calls,reached,meetings:count('meeting'),mandates:count('mandate'),sales:count('sale'),answerRate:calls?Math.round(reached/calls*100):null};}
export function phoneUrl(phone){const clean=String(phone).replace(/[^+0-9]/g,'');return /^\+?\d{6,15}$/.test(clean)?'tel:'+clean:null;}
export function appendNote(current,note){return [current,String(note).trim()].filter(Boolean).join('\n').slice(-2000);}
