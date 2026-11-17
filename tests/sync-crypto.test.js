import test from 'node:test';import assert from 'node:assert/strict';import {seal,unseal,authToken} from '../sync-crypto.js';
const code='local_service_key_32_characters.'+'a'.repeat(64);
test('synchronization encryption round-trips Polish text and private records',async()=>{const value={name:'Łańcut',notes:['Żółć'],contacts:[{phone:'+48123456789'}]};assert.deepEqual(await unseal(await seal(value,code),code),value);});
test('same snapshot encrypts with a new nonce each time',async()=>{const a=await seal({a:1},code),b=await seal({a:1},code);assert.notEqual(a.iv,b.iv);assert.notEqual(a.cipher,b.cipher);});
test('transmitted authentication token cannot decrypt data',async()=>{const e=await seal({private:'data'},code),auth=await authToken(code);assert.notEqual(auth,code.split('.')[1]);await assert.rejects(()=>unseal(e,'local_service_key_32_characters.'+auth));});
test('tampered ciphertext is rejected',async()=>{const e=await seal({a:1},code);e.cipher=(e.cipher[0]==='A'?'B':'A')+e.cipher.slice(1);await assert.rejects(()=>unseal(e,code));});
test('service access key rotation does not lose encrypted data',async()=>{const e=await seal({a:1},code);assert.deepEqual(await unseal(e,'another_service_key_32_characters.'+code.split('.')[1]),{a:1});});
