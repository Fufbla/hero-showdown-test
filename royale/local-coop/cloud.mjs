import {serialize} from './serialize.mjs';
export const CLOUD_ENDPOINT='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging';
const PREFIX='healthia.royale.local-two.v1:';
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export class SaveConflict extends Error{}
export class CloudProfile {
  constructor({fetcher=fetch,storage=globalThis.localStorage,onStatus=()=>{},endpoint=CLOUD_ENDPOINT}={}){
    Object.assign(this,{fetcher,storage,onStatus,endpoint});this.slots=[];this.queues=new Map();this.desired=new Map();this.blocked=new Set();
  }
  async request(action,body={},auth=true){
    const response=await this.fetcher(this.endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+this.access}:{})},body:await serialize({action,...body},{validate:action==='save'}),cache:'no-store',signal:AbortSignal.timeout(15000)});
    let data;try{data=await response.json();}catch{throw Error('The save service did not respond. Retry saving when connected.');}
    if(!response.ok){const e=Error(data.error||'Cloud request failed.');e.status=response.status;throw e;}return data;
  }
  async call(action,body){
    try{return await this.request(action,body);}catch(e){
      if(e.status!==401||!this.refresh)throw e;
      this.renewing??=this.request('renew',{refresh:this.refresh},false).then(r=>{this.access=r.access;this.refresh=r.refresh;}).finally(()=>this.renewing=null);
      await this.renewing;return this.request(action,body);
    }
  }
  async login(code){
    if(!/^\d{10}$/.test(code))throw Error('Enter your 10-digit code.');
    const r=await this.request('verify',{code},false);this.access=r.access;this.refresh=r.refresh;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('local-two:'+code));
    this.identity=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
    await this.load();return this;
  }
  async load(){
    const {slots}=await this.call('slots');
    if(!Array.isArray(slots)||![1,2,3].every(n=>slots.some(r=>r.slot_number===n&&Number.isSafeInteger(r.revision))))throw Error('The hero list is incomplete. Try loading again.');
    this.slots=structuredClone(slots);return this.slots;
  }
  key(slot){return PREFIX+this.identity+':'+slot;}
  remember(key,value){
    if(!this.storage)throw Error('Enable browser storage before playing so interrupted saves can be recovered.');
    const raw=JSON.stringify(value);this.storage.setItem(key,raw);
    if(this.storage.getItem(key)!==raw)throw Error('Recovery storage is unavailable.');
  }
  async prepare(slot){
    const key=this.key(slot),raw=this.storage?.getItem(key);if(!raw)return this.recoverLatest(slot);
    let pending;try{pending=JSON.parse(raw);}catch{throw Error('A recovery checkpoint needs attention. Your cloud hero is unchanged.');}
    if(pending.slot!==slot||!pending.snapshot||!Number.isSafeInteger(pending.revision))throw Error('Invalid recovery checkpoint.');
    const current=this.slots.find(r=>r.slot_number===slot);
    if(current.revision===pending.revision+1&&canonical(current.snapshot)===canonical(pending.snapshot)){
      this.settleJournal(slot,pending,current.revision);return this.recoverLatest(slot);
    }
    if(current.revision!==pending.revision){
      // Retain the competing checkpoint separately; always load the newer cloud hero.
      this.remember(key+':conflict:'+crypto.randomUUID(),pending);this.storage.removeItem(key);
      this.archiveLatest(slot);
      this.onStatus('A newer cloud hero was loaded. The older checkpoint was kept as a recovery copy.');return;
    }
    await this.writePending(slot,pending);
    await this.recoverLatest(slot);
  }
  archiveLatest(slot){const key=this.key(slot)+':latest',raw=this.storage?.getItem(key);if(raw){this.remember(key+':conflict:'+crypto.randomUUID(),JSON.parse(raw));this.storage.removeItem(key);}}
  settleJournal(slot,pending,revision){
    const key=this.key(slot),raw=this.storage?.getItem(key+':latest');
    if(raw){const latest=JSON.parse(raw);if(canonical(latest.snapshot)===canonical(pending.snapshot))this.storage.removeItem(key+':latest');else if(latest.revision===pending.revision){latest.revision=revision;this.remember(key+':latest',latest);}}
    this.storage.removeItem(key);
  }
  async recoverLatest(slot){
    const key=this.key(slot),raw=this.storage?.getItem(key+':latest');if(!raw)return;
    const latest=JSON.parse(raw),row=this.slots.find(r=>r.slot_number===slot);
    if(latest.slot!==slot||!latest.snapshot||!Number.isSafeInteger(latest.revision))throw Error('Invalid recovery checkpoint.');
    if(canonical(row.snapshot)===canonical(latest.snapshot)){this.storage.removeItem(key+':latest');return;}
    if(row.revision!==latest.revision){this.archiveLatest(slot);this.onStatus('A newer cloud hero was loaded. The older checkpoint was kept as a recovery copy.');return;}
    this.remember(key,latest);await this.writePending(slot,latest);
  }
  save(slot,snapshot){
    if(![1,2,3].includes(slot)||!this.slots.some(r=>r.slot_number===slot&&r.snapshot))return Promise.reject(Error('Choose a saved hero.'));
    if(this.blocked.has(slot))return Promise.reject(new SaveConflict('This hero changed on another device. Reload the cloud hero to continue.'));
    // Journal every checkpoint, including progress made while an older request is offline.
    try{this.remember(this.key(slot)+':latest',{slot,revision:this.slots.find(r=>r.slot_number===slot).revision,snapshot});}catch(e){return Promise.reject(e);}
    this.desired.set(slot,structuredClone(snapshot));
    if(this.queues.has(slot))return this.queues.get(slot);
    const task=(async()=>{
      while(this.desired.has(slot)){
        if(this.blocked.has(slot))throw new SaveConflict('This hero changed on another device. Reload the cloud hero to continue.');
        const copy=this.desired.get(slot);this.desired.delete(slot);
        const key=this.key(slot),raw=this.storage?.getItem(key);
        if(raw)await this.writePending(slot,JSON.parse(raw));
        const row=this.slots.find(r=>r.slot_number===slot);
        if(canonical(row.snapshot)===canonical(copy)){const latest=this.storage?.getItem(key+':latest');if(latest&&canonical(JSON.parse(latest).snapshot)===canonical(copy))this.storage.removeItem(key+':latest');continue;}
        const pending={slot,revision:row.revision,snapshot:copy};this.remember(key,pending);
        await this.writePending(slot,pending);
      }
      return this.slots.find(r=>r.slot_number===slot);
    })().finally(()=>this.queues.delete(slot));
    this.queues.set(slot,task);return task;
  }
  async writePending(slot,pending){
    let result;
    try{result=await this.call('save',{slot,revision:pending.revision,snapshot:pending.snapshot});}
    catch(error){
      // The server may have committed just before a lost response. Read before retrying.
      let current;try{const data=await this.call('slots');current=data.slots?.find(r=>r.slot_number===slot);}catch{}
      if(current?.revision===pending.revision+1&&canonical(current.snapshot)===canonical(pending.snapshot))result=current;
      else if(current&&current.revision!==pending.revision){this.blocked.add(slot);throw new SaveConflict('This hero changed on another device. The newer cloud save is protected; this session’s checkpoint is retained.');}
      else throw error;
    }
    const row=this.slots.find(r=>r.slot_number===slot);
    Object.assign(row,{revision:result.revision,snapshot:structuredClone(pending.snapshot),updated_at:result.updated_at});
    this.settleJournal(slot,pending,result.revision);this.onStatus('Saved · '+new Date().toLocaleTimeString());return row;
  }
  forget(){this.access='';this.refresh='';this.slots=[];this.desired.clear();}
}
