import {serialize} from './serialize.mjs';
export const CLOUD_ENDPOINT='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-v3-staging';
export const HERO_ENDPOINT='https://adakwbhxiuatjvphutgo.supabase.co/functions/v1/royale-local-heroes';
const PREFIX='healthia.royale.local-two.v1:';
const canonical=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]])):x);
export class SaveConflict extends Error{}
export class CloudProfile {
  // Browser fetch must keep Window as its receiver, never this CloudProfile.
  constructor({fetcher=(...args)=>globalThis.fetch(...args),storage=globalThis.localStorage,onStatus=()=>{},endpoint=CLOUD_ENDPOINT,heroEndpoint=HERO_ENDPOINT}={}){
    Object.assign(this,{fetcher,storage,onStatus,endpoint,heroEndpoint});this.slots=[];this.queues=new Map();this.desired=new Map();this.blocked=new Set();this.activeSlots=new Set();this.mutating=new Set();
  }
  async request(action,body={},auth=true,endpoint=this.endpoint){
    const response=await this.fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+this.access}:{})},body:await serialize({action,...body},{validate:action==='save'}),cache:'no-store',signal:AbortSignal.timeout(15000)});
    let data;try{data=await response.json();}catch{throw Error('The save service did not respond. Retry saving when connected.');}
    if(!response.ok){const e=Error(data.error||'Cloud request failed.');e.status=response.status;throw e;}return data;
  }
  async call(action,body,endpoint=this.endpoint){
    try{return await this.request(action,body,true,endpoint);}catch(e){
      if(e.status!==401||!this.refresh)throw e;
      this.renewing??=this.request('renew',{refresh:this.refresh},false).then(r=>{this.access=r.access;this.refresh=r.refresh;}).finally(()=>this.renewing=null);
      await this.renewing;return this.request(action,body,true,endpoint);
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
  async manage(slot,revision,action){
    if(![1,2,3].includes(slot)||!Number.isSafeInteger(revision))throw Error('Choose a current hero slot.');
    if(this.activeSlots.has(slot))throw Error('Leave Local Co-op before changing this hero slot.');
    if(this.mutating.has(slot)||this.queues.has(slot)||this.desired.has(slot))throw Error('Wait for this hero’s pending save.');
    this.mutating.add(slot);
    try{
      await this.load();const row=this.slots.find(r=>r.slot_number===slot);
      if(row.revision!==revision)throw new SaveConflict('This slot changed. Review the refreshed hero list.');
      const result=await action(row);this.blocked.delete(slot);return result;
    }finally{this.mutating.delete(slot);}
  }
  create(slot,snapshot,revision){
    return this.manage(slot,revision,async row=>{
      if(row.snapshot)throw Error('That slot already has a hero. No progress was replaced.');
      const pending={slot,revision,snapshot:structuredClone(snapshot)};
      // Older journals cannot resurrect a deleted or replaced hero.
      const old=this.storage?.getItem(this.key(slot));if(old)this.remember(this.key(slot)+':conflict:'+crypto.randomUUID(),JSON.parse(old));
      this.archiveLatest(slot);this.remember(this.key(slot),pending);
      return this.writePending(slot,pending);
    });
  }
  remove(slot,{confirmed=false,revision,name}={}){
    if(!confirmed)return Promise.reject(Error('Confirm the named hero before deleting.'));
    return this.manage(slot,revision,async row=>{
      if(!row.snapshot||row.snapshot.look.name!==name)throw new SaveConflict('The selected hero changed. Review the hero list.');
      let result;
      try{result=await this.call('delete-hero',{slot,revision,name,confirmed:true},this.heroEndpoint);}
      catch(error){
        // A lost response is safe to retry only when this precise revision is
        // now empty. Never delete a replacement hero using a newer revision.
        await this.load();const current=this.slots.find(r=>r.slot_number===slot);
        if(current.revision!==revision+1||current.snapshot!==null)throw error;
        result=current;
      }
      this.archiveLatest(slot);const raw=this.storage?.getItem(this.key(slot));if(raw){this.remember(this.key(slot)+':conflict:'+crypto.randomUUID(),JSON.parse(raw));this.storage.removeItem(this.key(slot));}
      Object.assign(this.slots.find(r=>r.slot_number===slot),{snapshot:null,revision:result.revision,updated_at:result.updated_at});
      return this.slots.find(r=>r.slot_number===slot);
    });
  }
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
    if(this.mutating.has(slot))return Promise.reject(Error('Wait for the hero slot change to finish.'));
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
