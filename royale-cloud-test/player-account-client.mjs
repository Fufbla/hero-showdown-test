import {CloudAPI,CloudHeroStore} from './cloud-client.mjs';
import {CLOUD_CONFIG} from './cloud-config.mjs';
import {ACCOUNT_ENDPOINT} from './player-accounts-config.mjs';
import {setServerClock} from './shared-clock.mjs';
export class PlayerAccountAPI extends CloudAPI{
 constructor(options){super(options);this.endpoint=ACCOUNT_ENDPOINT;}
 async request(body){const headers={apikey:CLOUD_CONFIG.publishableKey,'Content-Type':'application/json'};if(body?.authenticated){const {data,error}=await this.auth.getSession();if(error||!data?.session)throw Object.assign(Error('Session expired. Sign in again; your cloud heroes are unchanged.'),{status:401});if(body.payload.accountId&&body.payload.accountId!==data.session.user.id)throw Error('Account changed. This save belongs to the previous account.');headers.Authorization='Bearer '+data.session.access_token;}
  const r=await fetch(this.endpoint,{method:body?'POST':'GET',headers,cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{body:JSON.stringify(body.payload)}:{})});let data;try{data=await r.json();}catch{throw Error('Connection interrupted. Retry the same save before continuing.');}if(!r.ok)throw Object.assign(Error(data.error||'Account request failed.'),{status:r.status});if(data.serverTime)setServerClock(data.serverTime);return data;
 }
 async configure(){const data=await this.request();this.methods=data.methods;this.registrationReady=data.registrationReady;return data;}
 async call(payload,{anonymous=false}={}){return this.request({payload,authenticated:!anonymous});}
 async signIn(username,passcode){const r=await this.call({action:'username-login',username,passcode},{anonymous:true});const {error}=await this.auth.setSession(r.session);if(error)throw error;return r;}
 async signUp(values){const r=await this.call({action:'username-signup',...values},{anonymous:true});if(r.session){const {error}=await this.auth.setSession(r.session);if(error)throw error;}return r;}
 async logout(){try{await this.call({action:'logout'});}catch(error){if(error.status!==401)throw error;}const {error}=await this.auth.signOut({scope:'local'});if(error)throw error;}
}
export class AutomaticCloudStore extends CloudHeroStore{
 constructor(api,{onStatus=()=>{},backup=null}={}){super(api);this.tail=Promise.resolve();this.pendingCount=0;this.failure=null;this.onStatus=onStatus;this.backup=backup;this.message='Account heroes · progress saves automatically. Wait for Cloud saved before closing.';}
 get saving(){return this.pendingCount>0;}
 draftKey(index){return `healthia.royale.cloud-draft.v1:${this.user.id}:${index}`;}
 writeDraft(index,value){
  if(!this.backup)return;
  const text=JSON.stringify(value),key=this.draftKey(index),prior=this.backup.getItem(key);
  if(value.pending&&prior){const previous=JSON.parse(prior);if(previous.status==='pending'&&previous.pending?.requestId!==value.pending.requestId)throw Error('Another browser save needs recovery. Reload before saving this slot.');}
  this.backup.setItem(key,text);
  if(this.backup.getItem(key)!==text)throw Error('Recovery draft could not be saved. Keep this browser open and retry.');
 }
 async flush(){await this.tail;if(this.failure)throw this.failure;}
 commit(index,snapshot,kind='manual',extra={}){
  if(![0,1,2].includes(index))return Promise.reject(Error('Invalid hero slot.'));
  const copy=typeof snapshot==='string'?JSON.parse(snapshot):structuredClone(snapshot);
  const owner=this.user?.id;if(!owner)return Promise.reject(Error('Load your account heroes before saving.'));
  if(this.failure)return Promise.reject(this.failure);
  this.pendingCount++;this.onStatus('Saving to your account…');
  const operation=this.tail.then(async()=>{
   if(this.failure)throw this.failure;
   try{
    const old=this.meta[index],body={action:'commit',kind,slot:index,heroId:old?.hero_id||null,expectedRevision:old?.revision||0,snapshot:copy,...extra,accountId:owner};
    if(this.api.pending)throw Error('An unconfirmed save must be retried or explicitly reloaded first.');
    const pending={payload:JSON.stringify(body),requestId:crypto.randomUUID()};
    // Persist the EXACT request and id before network I/O, including deletions.
    // A browser restart can retry an acknowledged-but-lost response idempotently.
    this.api.pending=pending;this.writeDraft(index,{version:2,status:'pending',pending});
    const result=await this.api.mutate(body);this.apply(result.slot);
    this.api.pending=pending;this.writeDraft(index,{version:2,status:'confirmed',pending,revision:result.slot.revision});this.api.pending=null;
    this.onStatus('Cloud saved');return {ok:true};
   }catch(error){this.failure=error;this.onStatus('Cloud save not confirmed. Retry or reload before continuing.');throw error;}
  });
  this.tail=operation.catch(()=>{});return operation.finally(()=>{this.pendingCount--;});
 }
 async retry(){
  await this.tail;if(!this.failure)return;if(!this.api.pending)throw this.failure;
  this.pendingCount++;
  try{
   const pending=structuredClone(this.api.pending),body=JSON.parse(pending.payload);
   if(body.accountId!==this.user.id)throw Error('This recovery draft belongs to another account.');
   this.writeDraft(body.slot,{version:2,status:'pending',pending});
   const r=await this.api.mutate(body);this.apply(r.slot);
   this.api.pending=pending;this.writeDraft(body.slot,{version:2,status:'confirmed',pending,revision:r.slot.revision});this.api.pending=null;
   this.failure=null;this.onStatus('Cloud saved');
  }finally{this.pendingCount--;}
 }
 async refresh({discardPending=false}={}){
  await this.tail;await super.refresh();this.failure=null;
  this.message='Account heroes · progress saves automatically. Wait for Cloud saved before closing.';
  let draftCount=0,blockedRecovery=false;
  if(this.backup)for(let index=0;index<3;index++){
   try{
    const raw=this.backup.getItem(this.draftKey(index));if(!raw)continue;
    let draft;try{draft=JSON.parse(raw);}catch{if(!discardPending)throw Error('Unreadable recovery draft. Export it before reloading.');}
    if(draft?.status==='confirmed'||draft?.status==='archived')continue;
    if(discardPending){
     // Explicit cloud reload preserves a separate immutable copy for recovery.
     const key=this.draftKey(index)+':archive:'+crypto.randomUUID();this.backup.setItem(key,raw);
     if(this.backup.getItem(key)!==raw)throw Error('Recovery archive could not be verified.');
     this.writeDraft(index,{version:2,status:'archived',archiveKey:key});continue;
    }
    draftCount++;if(draftCount>1)throw Error('Multiple unconfirmed drafts need review. Export them before reloading.');
    if(draft.version===2&&draft.status==='pending'){
     const body=JSON.parse(draft.pending.payload);
     if(body.action!=='commit'||!['create','import','manual','irreversible','delete'].includes(body.kind)||body.accountId!==this.user.id||body.slot!==index||!Number.isSafeInteger(body.expectedRevision)||body.expectedRevision<0||!/^[-a-f0-9]{36}$/i.test(draft.pending.requestId))throw Error('Invalid recovery draft. Export it before reloading.');
     // A stale ordinary autosave must never block the account indefinitely.
     // Keep the full draft in a verified immutable archive and load the newer
     // server-confirmed hero. Never auto-replay a superseded mutation.
     const confirmed=this.meta[index];
     if(body.kind==='manual'&&confirmed&&!confirmed.deleted&&confirmed.revision>body.expectedRevision){
      const key=this.draftKey(index)+':archive:'+crypto.randomUUID();
      this.backup.setItem(key,raw);
      if(this.backup.getItem(key)!==raw)throw Error('Could not verify the recovery archive; no cloud data was changed.');
      this.writeDraft(index,{version:2,status:'archived',archiveKey:key,serverRevision:confirmed.revision,reason:'superseded-manual-save'});
      this.message='A superseded local save was safely archived. Your newer confirmed cloud hero is ready.';
      continue;
     }
     if(this.api.pending)throw Error('Multiple unconfirmed drafts need review. Export them before reloading.');
     this.api.pending=draft.pending;
    }else blockedRecovery=true;
    this.failure=Error('An unconfirmed save was recovered from this browser. Retry it or reload confirmed cloud heroes.');
   }catch(error){this.failure=error;blockedRecovery=true;}
  }
  if(blockedRecovery)this.api.pending=null;
  if(this.failure)this.message=this.failure.message;return this;
 }
 exportDrafts(){
  const drafts=[];for(let i=0;i<3;i++){const key=this.draftKey(i),raw=this.backup?.getItem(key);if(!raw)continue;const entry={slot:i,raw};try{const d=JSON.parse(raw);if(d.status==='archived'&&d.archiveKey?.startsWith(key+':archive:'))entry.archivedRaw=this.backup.getItem(d.archiveKey);}catch{}drafts.push(entry);}
  return JSON.stringify({format:'hero-showdown-royale-cloud-drafts',accountId:this.user.id,drafts},null,2);
 }
 async irreversible(heroId,revision,snapshot){
  if(this.failure&&this.api.pending){
   const body=JSON.parse(this.api.pending.payload),copy=typeof snapshot==='string'?JSON.parse(snapshot):snapshot;
   if(body.accountId===this.user?.id&&body.kind==='irreversible'&&body.heroId===heroId&&body.snapshot?.legendary?.revision===revision+1&&JSON.stringify(body.snapshot)===JSON.stringify(copy)){
    await this.retry();return {ok:true};
   }
  }
  return super.irreversible(heroId,revision,snapshot);
 }
 async migrate(index,local){
  if(this.slot(index))throw Error('Choose an empty cloud slot.');
  await super.migrate(index,local);
  try{
   const confirmed=structuredClone(this.meta[index]),data=await this.api.call({action:'list'}),row=data.slots?.find(s=>s.slot===index);
   const stable=value=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);
   if(data.user?.id!==this.user.id||row?.hero_id!==confirmed.hero_id||row?.revision!==confirmed.revision||stable(row?.snapshot)!==stable(confirmed.snapshot))throw Error('Import requires verification. Local backups are retained. Reload cloud heroes before trying again.');
   return {ok:true,verified:true};
  }catch(error){this.failure=error;throw error;}
 }
}
