import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as C from '../core.js';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import .*$/gm,'');
function boot(initial={}){
 const items=new Map(Object.entries(initial)),nodes=new Map();
 const node=()=>({innerHTML:'',textContent:'',hidden:false,open:false,dataset:{},classList:{toggle(){},add(){},remove(){}},addEventListener(){},querySelector(){return null;},showModal(){this.open=true;},close(){this.open=false;},focus(){}});
 const document={querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},querySelectorAll:()=>[],addEventListener(){},body:node(),activeElement:null,title:''};
 const localStorage={getItem:k=>items.get(k)??null,setItem:(k,v)=>items.set(k,v)};
 const context=vm.createContext({C,document,localStorage,navigator:{onLine:true},location:{protocol:'https:'},window:{addEventListener(){}},setInterval(){},setTimeout(){},clearTimeout(){},matchMedia:()=>({matches:false})});
 vm.runInContext(source+'\n;globalThis.api={getState:()=>state,dashboardView,pipelineView,missionsView,empireView,rewardsView,progressView,leadForm,taskForm,logForm,settings};',context);
 return {api:context.api,nodes,items};
}
test('fresh startup renders useful zero-state and saves a valid state',()=>{const {nodes,items}=boot();assert.match(nodes.get('#main').innerHTML,/jutrzejszą prowizję/);C.validate(JSON.parse(items.get('agent_empire_v2')));});
test('every view renders with real activities and partial tasks',()=>{const s=C.fresh(),l=C.makeLead({name:'Kontakt testowy'});s.leads.push(l);C.logActivity(s,{type:'call',leadId:l.id,outcome:'reached'});const t=C.makeTask({title:'Oferta',steps:['Foto','Opis']});s.tasks.push(t);C.completeTask(s,t.id,C.dayKey(),Date.now(),0);const {api}=boot({agent_empire_v2:JSON.stringify(s)});for(const name of ['dashboardView','pipelineView','missionsView','empireView','rewardsView','progressView'])assert.ok(api[name]().length>100,name);});
test('contact names and notes are escaped in pipeline and forms',()=>{const s=C.fresh(),title='<img src=x onerror=alert(1)>',l=C.makeLead({name:title,notes:title});s.leads.push(l);const {api,nodes}=boot({agent_empire_v2:JSON.stringify(s)});assert.equal(api.pipelineView().includes(title),false);api.leadForm(l.id);assert.ok(nodes.get('#modal-content').innerHTML.includes('&lt;img'));});
test('corrupt stored data remains untouched',()=>{const {items,nodes}=boot({agent_empire_v2:'BROKEN'});assert.equal(items.get('agent_empire_v2'),'BROKEN');assert.match(nodes.get('#main').innerHTML,/Oryginalny zapis/);});
test('legacy storage is preserved after migration',()=>{const old=JSON.stringify({xp:40,gold:1450});const {api,items}=boot({realestate_agent:old,realestate_quests:JSON.stringify([{title:'Stary cel',xp:30}])});assert.equal(items.get('realestate_agent'),old);assert.equal(C.balance(api.getState()).coins,1450);assert.equal(C.totals(api.getState(),C.dayKey()).commissionGrosz,0);});
test('active acquisition timer appears after reopening',()=>{const s=C.fresh();C.startFocus(s,15);const {nodes}=boot({agent_empire_v2:JSON.stringify(s)});assert.equal(nodes.get('#focus-bar').hidden,false);assert.match(nodes.get('#focus-bar').innerHTML,/Blok akwizycji/);});
