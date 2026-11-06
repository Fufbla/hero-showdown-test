import {createHash,randomUUID} from 'node:crypto';
import {Game,decodeSave} from '../core.mjs';
import {encodeRuntime,decodeRuntime} from './runtime.mjs';
import {CLOUD_CONFIG} from '../cloud-config.mjs';
import {AUTOSAVE_MS} from './room-rules.mjs';

const digest=value=>createHash('sha256').update(value).digest('hex');
const fingerprint=value=>digest(JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v));
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class SaveConflict extends Error {}

// Capture a separate graph: autosaving must not change combat, loot or cooldowns.
// The full exact runtime is also committed in SQLite, including active arenas.
export function captureProgress(game){
  const copy=decodeRuntime(encodeRuntime(game));
  copy.canSave=()=>true;
  return JSON.parse(Game.prototype.save.call(copy));
}

// Only the authority process has this credential. No schema changes or alternate
// cloud slots: co-op continues the same V3 profile/slot and revision contract.
export class V3CloudBridge {
  constructor({url=CLOUD_CONFIG.url,key=process.env.SUPABASE_SERVICE_ROLE_KEY,fetcher=fetch}={}){
    if(!key)throw Error('V3 multiplayer requires the server-only cloud credential.');
    Object.assign(this,{url,key,fetcher});
  }
  async request(path,options={}){
    const response=await this.fetcher(this.url+'/rest/v1/'+path,{...options,headers:{apikey:this.key,Authorization:'Bearer '+this.key,'Content-Type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw Error('Cloud saving is unavailable. Your confirmed server checkpoint is retained.');
    return response.json();
  }
  async authenticate(token,{slot}={}){
    if(typeof token!=='string'||!/[a-f0-9]{64}/.test(token)||token.length!==64||!Number.isInteger(slot)||slot<0||slot>2)throw Error('Choose a saved V3 hero first.');
    const rows=await this.request('royale_v3_sessions?select=profile_id,expires_at&token_hash=eq.'+digest(token)+'&expires_at=gt.'+encodeURIComponent(new Date().toISOString()));
    const session=rows[0];if(!session||!uuid.test(session.profile_id))throw Error('Your game session expired. Re-enter your save code.');
    return {id:'v3:'+session.profile_id,profile:session.profile_id,slot,kind:'v3',expiresAt:Date.parse(session.expires_at)};
  }
  path(profile,slot){
    if(!uuid.test(profile)||!Number.isInteger(slot)||slot<0||slot>2)throw Error('Invalid cloud slot.');
    return 'royale_v3_hero_slots?profile_id=eq.'+profile+'&slot_number=eq.'+(slot+1);
  }
  async read(profile,slot){
    const rows=await this.request(this.path(profile,slot)+'&select=snapshot,revision,updated_at');
    if(!rows[0]?.snapshot)throw Error('Create and save this hero before joining multiplayer.');
    return rows[0];
  }
  async write(profile,slot,expected,snapshot){
    if(!Number.isSafeInteger(expected)||expected<0)throw Error('Invalid save revision.');
    const rows=await this.request(this.path(profile,slot)+'&revision=eq.'+expected,{method:'PATCH',body:JSON.stringify({snapshot,revision:expected+1,updated_at:new Date().toISOString()})});
    if(rows[0])return rows[0];
    // Recover an applied PATCH whose response was lost; never replay rewards.
    const current=await this.read(profile,slot);
    if(current.revision===expected+1&&fingerprint(current.snapshot)===fingerprint(snapshot))return current;
    throw new SaveConflict('This hero was saved on another device. Multiplayer paused; both the newer cloud save and server recovery are preserved.');
  }
}

export class V3Checkpoints {
  constructor(authority,bridge,{now=Date.now,onError=()=>{},onSaved=()=>{}}={}){
    Object.assign(this,{authority,bridge,now,onError,onSaved});this.pending=new Map();this.opening=new Map();
  }
  open(account){
    const key=account.id+':'+account.slot;
    if(this.opening.has(key))return this.opening.get(key);
    const promise=this.restore(account).finally(()=>this.opening.delete(key));this.opening.set(key,promise);return promise;
  }
  archive(h){
    const a=this.authority;
    // Retain the original runtime before disconnect cleanup cancels effects.
    a.state.recoveries??=new Map();a.state.recoveries.set(h.id,decodeRuntime(encodeRuntime(h)));
    const connection=a.connections.get(h.id);
    if(connection){a.detach(h.id,connection);connection.close(4009,'Cloud save conflict. Recovery retained.');}
    const room=a.state.rooms.get(h.room);room.members.delete(h.id);
    for(const w of room.worlds.values())a.reconcileControls(room,w);
    if(!room.members.size)a.state.rooms.delete(room.id);a.state.heroes.delete(h.id);a.commit();
  }
  async restore(account){
    const {authority:a}=this;
    let h=[...a.state.heroes.values()].find(h=>h.owner===account.id&&h.slot===account.slot);
    if(h?.cloud?.conflict){
      // A reconnect chooses the newer cloud save, while the conflicting room
      // runtime stays in a separate durable recovery record, never a hero slot.
      this.archive(h);h=null;
    }
    if(h?.cloud?.pending)await this.saveHero(h);
    const row=await this.bridge.read(account.profile,account.slot);
    // A read started before an in-flight checkpoint can return an older revision.
    // Only a newer cloud revision supersedes the current authority runtime.
    if(h&&(!h.cloud||row.revision>h.cloud.revision)){this.archive(h);h=null;}
    if(h)return h;
    const save=decodeSave(JSON.stringify(row.snapshot));if(!save)throw Error('This hero needs save recovery before multiplayer.');
    h=a.adopt(account.id,{id:randomUUID(),slot:account.slot,snapshot:save});
    h.cloud={profile:account.profile,revision:row.revision,savedAt:row.updated_at,dueAt:this.now()+AUTOSAVE_MS};a.commit();return h;
  }
  saveHero(h){
    if(!h.cloud)return Promise.resolve(null);
    if(h.cloud.conflict)return Promise.reject(new SaveConflict(h.cloud.error));
    if(this.pending.has(h.id))return this.pending.get(h.id);
    const promise=this.flush(h).catch(error=>{
      h.cloud.error=error.message;h.cloud.conflict=error instanceof SaveConflict;
      this.authority.commit();this.onError(h,error);throw error;
    }).finally(()=>this.pending.delete(h.id));
    this.pending.set(h.id,promise);return promise;
  }
  async flush(h){
    const c=h.cloud,a=this.authority;
    const desired=captureProgress(h.game);
    const snapshots=c.pending?[c.pending.snapshot,desired]:[desired];let result;
    for(const snapshot of snapshots){
      if(result&&fingerprint(result.snapshot)===fingerprint(snapshot))continue;
      c.pending??={snapshot,revision:c.revision};a.commit();
      const row=await this.bridge.write(c.profile,h.slot,c.pending.revision,c.pending.snapshot);
      result={slot:h.slot,snapshot:row.snapshot,revision:row.revision,savedAt:row.updated_at};
      c.revision=row.revision;c.savedAt=row.updated_at;c.error=null;c.pending=null;a.commit();
    }
    this.onSaved(h,result);return result;
  }
  due(){
    const tasks=[];
    for(const h of this.authority.state.heroes.values())if(h.cloud&&!h.cloud.conflict&&this.now()>=h.cloud.dueAt&&(h.connected||h.cloud.pending||this.now()-h.disconnectedAt<this.authority.graceMs)){
      h.cloud.dueAt=this.now()+AUTOSAVE_MS;tasks.push(this.saveHero(h));
    }
    return Promise.allSettled(tasks);
  }
  async release(h,connection){
    const a=this.authority;
    if(!h.game.canSave())throw Error('Leave combat for five seconds before returning to heroes. Eight-second autosave is still active.');
    a.detach(h.id,connection);
    await this.pending.get(h.id);
    const result=await this.saveHero(h),room=a.state.rooms.get(h.room);
    room.members.delete(h.id);for(const w of room.worlds.values())a.reconcileControls(room,w);
    if(!room.members.size)a.state.rooms.delete(room.id);
    a.state.heroes.delete(h.id);a.commit();return result;
  }
}
