const bytes=s=>new TextEncoder().encode(s);
const b64=b=>{let s='';for(const n of new Uint8Array(b))s+=String.fromCharCode(n);return btoa(s);};
const decode=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
function secret(code){if(!/^[A-Za-z0-9_-]{24,128}\.[a-f0-9]{64}$/.test(code))throw Error('Nieprawidłowy kod parowania');return code.split('.')[1];}
async function digest(code,purpose){return crypto.subtle.digest('SHA-256',bytes(purpose+':'+secret(code)));}
async function key(code){return crypto.subtle.importKey('raw',await digest(code,'encryption'),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function authToken(code){return Array.from(new Uint8Array(await digest(code,'auth')),b=>b.toString(16).padStart(2,'0')).join('');}
export async function seal(value,code){const iv=crypto.getRandomValues(new Uint8Array(12)),cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(code),bytes(JSON.stringify(value)));return {iv:b64(iv),cipher:b64(cipher)};}
export async function unseal(envelope,code){const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(envelope.iv)},await key(code),decode(envelope.cipher));return JSON.parse(new TextDecoder().decode(data));}
