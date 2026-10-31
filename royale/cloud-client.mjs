import {createClient} from './vendor/auth-provider.mjs';
import {CLOUD_CONFIG} from './cloud-config.mjs';
import {LocalHeroStore} from './saves.mjs';
import {restoreCloudSnapshot} from './cloud-restore.mjs';
import {boardAt,regionDefinition} from './world.mjs';
import {setServerClock} from './shared-clock.mjs';
export class CloudAPI{
 constructor({storageKey='healthia.royale.auth.v1',persistSession=true}={}){this.auth=createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey,{auth:{flowType:'pkce',storageKey,persistSession,autoRefreshToken:true,detectSessionInUrl:true}}).auth;this.methods={};this.pending=null;this.writing=false;}
 async configure(){try{const r=await fetch(CLOUD_CONFIG.endpoint,{headers:{apikey:CLOUD_CONFIG.publishableKey},cache:'no-store',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();const data=await r.json();this.methods=data.methods;setServerClock(data.serverTime);return data;}catch{this.methods={};throw Error('Account service awaits deployment or is unavailable. Your local heroes are unchanged.');}}

 async call(body,{anonymous=false}={}){
  const headers={'Content-Type':'application/json',apikey:CLOUD_CONFIG.publishableKey};
  if(!anonymous){const{data,error}=await this.auth.getSession();if(error||!data.session)throw Error('Sign in again before accessing cloud heroes.');headers.Authorization='Bearer '+data.session.access_token;}
  const r=await fetch(CLOUD_CONFIG.endpoint,{method:'POST',headers,body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(20000)});let data;try{data=await r.json();}catch{throw Error('The server response was interrupted. Retry the same operation or reload.');}if(!r.ok)throw Error(data.error||'Cloud request failed.');if(data.serverTime)setServerClock(data.serverTime);return data;
 }
 async mutate(body){
  const payload=JSON.stringify(body);
  if(this.pending&&this.pending.payload!==payload)throw Error('A previous cloud request has an uncertain result. Retry it or reload your heroes first.');
  this.pending||={payload,requestId:crypto.randomUUID()};
  this.writing=true;try{const result=await this.call({...body,requestId:this.pending.requestId});this.pending=null;return result;}finally{this.writing=false;}
 }
 async username(action,username,passcode,acknowledgeNoRecovery=false){const result=await this.call({action:'username-'+action,username,passcode,acknowledgeNoRecovery},{anonymous:true});const{error}=await this.auth.setSession(result.session);if(error)throw error;return result;}
}
export class CloudHeroStore extends LocalHeroStore{
 constructor(api){const mem=new Map();super({getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)});this.api=api;this.cloud=true;this.meta=[null,null,null];this.user=null;this.message='Account heroes · use Pause → Save Game to save ordinary progress to the cloud.';}
 async refresh(){const data=await this.api.call({action:'list'});this.api.pending=null;this.user=data.user;this.meta=[null,null,null];this.data.slots=[null,null,null];for(const row of data.slots)this.apply(row);this.writable=true;this.durable=true;return this;}
 apply(row){this.meta[row.slot]=structuredClone(row);if(row.deleted){this.data.slots[row.slot]=null;return;}const restored=restoreCloudSnapshot(row.snapshot);if(!restored)throw Error('This cloud hero needs recovery; no data was overwritten.');const {snapshot,recovered}=restored;if(recovered)this.message='A saved location was invalid. This hero returns to its last checkpoint; other progress is preserved. Choose Save Game to record the repaired position.';this.data.slots[row.slot]={id:row.hero_id,createdAt:row.created_at,updatedAt:row.updated_at,lastRegion:`${regionDefinition(snapshot.world.region).name} · ${boardAt(snapshot.world.region,snapshot.world.location?.x||160).name}`,snapshot};}
 writeSlot(index,snapshot,options){const result=super.writeSlot(index,snapshot,options);if(result.ok&&this.meta[index])this.data.slots[index].updatedAt=this.meta[index].updated_at;return result;}
 async commit(index,snapshot,kind='manual',extra={}){
  const old=this.meta[index];const result=await this.api.mutate({action:'commit',kind,slot:index,heroId:old?.hero_id||null,expectedRevision:old?.revision||0,snapshot:typeof snapshot==='string'?JSON.parse(snapshot):snapshot,...extra});this.apply(result.slot);return {ok:true};
 }
 async create(index,snapshot){return this.commit(index,snapshot,'create');}
 async migrate(index,local){if(this.slot(index))throw Error('Choose an empty cloud slot. Existing cloud heroes are never overwritten.');return this.commit(index,local.snapshot,'import',{sourceId:local.id,confirmed:true});}
 async remove(index,id){if(this.slot(index)?.id!==id)throw Error('This hero changed. Reload before deleting.');return this.commit(index,null,'delete',{confirmed:true});}
 async irreversible(heroId,revision,snapshot){const index=this.data.slots.findIndex(s=>s?.id===heroId);if(index<0||this.meta[index].snapshot.legendary.revision!==revision)throw Error('Permanent progress changed. Reload your heroes.');return this.commit(index,snapshot,'irreversible');}
}
