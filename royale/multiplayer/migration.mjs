import {randomBytes,createHash} from 'node:crypto';
import {decodeSave} from '../core.mjs';
import {CLOUD_CONFIG} from '../cloud-config.mjs';
export const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
// The bridge freezes the previous account writer before SQLite adopts a hero.
// Both steps are idempotent: a crash between them resumes the reserved snapshot.
export class MigrationService {
  constructor(authority,bridge){this.authority=authority;this.bridge=bridge;this.tickets=new Map();}
  async preview(owner,{slot,sourceId,snapshot,choice='local'}){
    if(!this.bridge)throw Error('Account migration is not configured. Your original hero is unchanged.');
    if(!Number.isInteger(slot)||slot<0||slot>2||typeof sourceId!=='string'||sourceId.length<8||sourceId.length>160||!['local','cloud'].includes(choice))throw Error('Invalid migration request.');
    const existing=this.authority.list(owner).find(h=>h.slot===slot);
    const row=structuredClone(await this.bridge.inspect(owner,slot));
    if(row.migration){return this.issue(owner,{slot,sourceId,choice:'resume',row,save:row.snapshot,existing});}
    if(existing)throw Error('This account slot already contains a multiplayer hero. Select it from Account heroes.');
    if(choice==='local'&&row.snapshot)throw Error('An account hero already exists in this slot. Review the account version; the local backup will not replace it.');
    const raw=choice==='cloud'?row.snapshot:snapshot,save=decodeSave(JSON.stringify(raw));
    if(!save)throw Error('This save could not be validated. Your original data is untouched.');
    // Normalize old schemas through the existing decoder. Do not turn a future
    // schema into an older save or accept a supplied cloud revision.
    if(raw.version>save.version)throw Error('This save was created by a newer game version.');
    return this.issue(owner,{slot,sourceId,choice,row,save});
  }
  issue(owner,data){
    for(const [id,t] of this.tickets)if(t.expires<Date.now())this.tickets.delete(id);
    if(this.tickets.size>1000)throw Error('Migration service busy. Retry shortly.');
    const ticket=randomBytes(32).toString('hex');this.tickets.set(ticket,{owner,...data,expires:Date.now()+300000});
    return {ticket,summary:{source:data.choice,name:data.save.look.name,level:data.save.level,coins:data.save.coins,version:data.save.version,cloudRevision:data.row.revision||0,items:data.save.inventory.items.length},message:'The local backup is retained. After transfer this hero uses account saving for solo and multiplayer; reconnect to continue if offline.'};
  }
  async confirm(owner,ticket){
    const t=this.tickets.get(ticket);if(!t||t.owner!==owner||t.expires<Date.now())throw Error('Migration review expired. Review the save again.');
    const reservation=await this.bridge.reserve({owner,slot:t.slot,expectedRevision:t.row.revision||0,source:createHash('sha256').update(t.choice==='cloud'?'royale-cloud-v1:'+owner+':'+t.slot:'royale-local-v1:'+t.sourceId).digest('hex'),snapshot:t.save,choice:t.choice});
    const hero=this.authority.adopt(owner,reservation);
    // Retain ticket for response-loss retries; authoritative UUID deduplicates.
    return {id:hero.id,slot:hero.slot};
  }
}
export class SupabaseMigrationBridge {
  constructor({url=CLOUD_CONFIG.url,key=process.env.SUPABASE_SERVICE_ROLE_KEY}={}){if(!key)throw Error('A server-only migration credential is required.');this.url=url;this.key=key;}
  async rpc(name,body){
    const response=await fetch(this.url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:this.key,Authorization:'Bearer '+this.key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    const result=await response.json();if(!response.ok)throw Error(result.message||'Account migration unavailable. Original saves are retained.');return result;
  }
  inspect(owner,slot){return this.rpc('royale_mp_inspect',{p_owner:owner,p_slot:slot});}
  reserve({owner,slot,expectedRevision,source,snapshot,choice}){return this.rpc('royale_mp_reserve',{p_owner:owner,p_slot:slot,p_expected:expectedRevision,p_source:source,p_snapshot:snapshot,p_choice:choice});}
}
