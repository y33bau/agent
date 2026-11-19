let database;
function openFiles(){
 if(!database){
  database = new Promise((resolve,reject)=>{
   const request = indexedDB.open('atria-crm-files',1);
   request.onupgradeneeded = ()=>request.result.createObjectStore('files');
   request.onsuccess = ()=>resolve(request.result);
   request.onerror = ()=>reject(request.error);
  }).catch(error=>{database=undefined;throw error;});
 }
 return database;
}
async function fileOperation(mode, operation){
 const db = await openFiles();
 return new Promise((resolve,reject)=>{
  const tx = db.transaction('files',mode);
  const request = operation(tx.objectStore('files'));
  tx.oncomplete = ()=>resolve(request.result);
  tx.onabort = ()=>reject(tx.error);
 });
}
export function putFile(id, file){return fileOperation('readwrite', store=>store.put(file,id));}
export function readFile(id){return fileOperation('readonly', store=>store.get(id));}
export function removeFile(id){return fileOperation('readwrite', store=>store.delete(id));}
