import {decodeSave} from '../../royale/core.mjs';
let worker=null,serial=0;const pending=new Map();
export function serialize(value,{validate=false}={}){
 if(validate&&!decodeSave(JSON.stringify(value.snapshot)))return Promise.reject(Error('Checkpoint validation failed; previous cloud save retained.'));
 if(typeof Worker==='undefined'){if(validate&&!decodeSave(JSON.stringify(value.snapshot)))return Promise.reject(Error('Checkpoint validation failed; previous cloud save retained.'));return Promise.resolve(JSON.stringify(value));}
 if(!worker){worker=new Worker(new URL('../../royale/local-coop/json-worker.mjs',import.meta.url),{type:'module'});worker.onmessage=({data})=>{const task=pending.get(data.id);if(!task)return;pending.delete(data.id);data.error?task.reject(Error(data.error)):task.resolve(data.text);};worker.onerror=()=>{for(const task of pending.values())task.reject(Error('Save preparation failed. Retry saving.'));pending.clear();worker.terminate();worker=null;};}
 return new Promise((resolve,reject)=>{const id=++serial;pending.set(id,{resolve,reject});worker.postMessage({id,value,validate:false});});
}
