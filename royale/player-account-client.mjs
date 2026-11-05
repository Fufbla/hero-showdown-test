import {CloudAPI,CloudHeroStore} from './cloud-client.mjs';
import {CLOUD_CONFIG} from './cloud-config.mjs';
import {ACCOUNT_ENDPOINT} from './player-accounts-config.mjs';
import {setServerClock} from './shared-clock.mjs';
export class PlayerAccountAPI extends CloudAPI{
 constructor(options){super(options);this.endpoint=ACCOUNT_ENDPOINT;}
 async request(body){const headers={apikey:CLOUD_CONFIG.publishableKey,'Content-Type':'application/json'};if(body?.authenticated){const {data,error}=await this.auth.getSession();if(error||!data.session)throw Error('Session expired. Sign in again; your cloud heroes are unchanged.');if(body.payload.accountId&&body.payload.accountId!==data.session.user.id)throw Error('Account changed. This save belongs to the previous account.');headers.Authorization='Bearer '+data.session.access_token;}
  const r=await fetch(this.endpoint,{method:body?'POST':'GET',headers,cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{body:JSON.stringify(body.payload)}:{})});let data;try{data=await r.json();}catch{throw Error('Connection interrupted. Retry the same save before continuing.');}if(!r.ok)throw Object.assign(Error(data.error||'Account request failed.'),{status:r.status});if(data.serverTime)setServerClock(data.serverTime);return data;
 }
 async configure(){const data=await this.request();this.methods=data.methods;this.registrationReady=data.registrationReady;return data;}
 async call(payload,{anonymous=false}={}){return this.request({payload,authenticated:!anonymous});}
 async signIn(username,passcode){const r=await this.call({action:'username-login',username,passcode},{anonymous:true});const {error}=await this.auth.setSession(r.session);if(error)throw error;return r;}
 async signUp(values){const r=await this.call({action:'username-signup',...values},{anonymous:true});if(r.session){const {error}=await this.auth.setSession(r.session);if(error)throw error;}return r;}
 async logout(){await this.call({action:'logout'});const {error}=await this.auth.signOut({scope:'local'});if(error)throw error;}
}
export class AutomaticCloudStore extends CloudHeroStore{
 constructor(api,{onStatus=()=>{},backup=null}={}){super(api);this.tail=Promise.resolve();this.pendingCount=0;this.failure=null;this.onStatus=onStatus;this.backup=backup;this.message='Account heroes · progress saves automatically. Wait for Cloud saved before closing.';}
 get saving(){return this.pendingCount>0;}
 async flush(){await this.tail;if(this.failure)throw this.failure;}
 commit(index,snapshot,kind='manual',extra={}){
  const copy=typeof snapshot==='string'?JSON.parse(snapshot):structuredClone(snapshot);
  const owner=this.user?.id;if(!owner)return Promise.reject(Error('Load your account heroes before saving.'));
  if(this.failure)return Promise.reject(this.failure);
  this.pendingCount++;this.onStatus('Saving to your account…');
  const operation=this.tail.then(async()=>{
   if(this.failure)throw this.failure;
   // Retain a separate, account-specific recovery draft. Never overwrite legacy slots.
   if(copy&&this.backup&&this.user?.id){try{this.backup.setItem(`healthia.royale.cloud-draft.v1:${this.user.id}:${index}`,JSON.stringify({heroId:this.meta[index]?.hero_id||null,baseRevision:this.meta[index]?.revision||0,snapshot:copy}));}catch{this.onStatus('Browser backup unavailable; confirming cloud save…');}}
   try{const result=await super.commit(index,copy,kind,{...extra,accountId:owner});this.onStatus('Cloud saved');return result;}catch(error){this.failure=error;this.onStatus('Cloud save not confirmed. Retry or reload before continuing.');throw error;}
  });
  this.tail=operation.catch(()=>{});return operation.finally(()=>{this.pendingCount--;});
 }
 async retry(){await this.tail;if(!this.failure)return;if(!this.api.pending)throw this.failure;const body=JSON.parse(this.api.pending.payload);const r=await this.api.mutate(body);this.apply(r.slot);this.failure=null;this.onStatus('Cloud saved');}
 async refresh(){await this.tail;await super.refresh();this.failure=null;this.message='Account heroes · progress saves automatically. Wait for Cloud saved before closing.';return this;}
 async migrate(index,local){
  if(this.slot(index))throw Error('Choose an empty cloud slot.');
  await super.migrate(index,local);
  const confirmed=structuredClone(this.meta[index]),data=await this.api.call({action:'list'}),row=data.slots?.find(s=>s.slot===index);
  if(data.user?.id!==this.user.id||row?.hero_id!==confirmed.hero_id||row?.revision!==confirmed.revision||JSON.stringify(row?.snapshot)!==JSON.stringify(confirmed.snapshot))throw Error('Import requires verification. Local backups are retained. Reload cloud heroes before trying again.');
  return {ok:true,verified:true};
 }
}
