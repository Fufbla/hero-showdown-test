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
  if(copy.multiplayerSharedLoot){
    // Shared drops belong to the room and cannot be exported into five solo saves.
    copy.loot=copy.personalGroundLoot||[];
    for(const e of [...copy.enemies,...(copy.arenaScene?.enemies||[])])if(e.coopBaseHp){e.hp=e.maxHp?e.hp/e.maxHp*e.coopBaseHp:0;e.maxHp=e.coopBaseHp;}
  }
  // The solo save format requires a living hero. Store the already-penalized
  // checkpoint respawn in cloud while SQLite retains the exact death animation.
  if(copy.hero.dead)Game.prototype.respawn.call(copy);
  copy.canSave=()=>true;
  return JSON.parse(Game.prototype.save.call(copy));
}

// Only the authority process has this credential. Co-op continues the same V3
// profile/slot; the reviewed lease migration fences concurrent solo writers.
export class V3CloudBridge {
  constructor({url=process.env.ROYALE_V3_SUPABASE_URL||CLOUD_CONFIG.url,key=process.env.SUPABASE_SERVICE_ROLE_KEY,fetcher=fetch}={}){
    if(!key)throw Error('V3 multiplayer requires the server-only cloud credential.');
    Object.assign(this,{url,key,fetcher});
  }
  async request(path,options={}){
    const response=await this.fetcher(this.url+'/rest/v1/'+path,{...options,headers:{apikey:this.key,Authorization:'Bearer '+this.key,'Content-Type':'application/json',Prefer:'return=representation',...options.headers},signal:AbortSignal.timeout(7000)});
    if(!response.ok){
      const error=await response.json().catch(()=>({}));
      if(error.code==='P0001'&&/Revision conflict|lease changed/i.test(error.message||''))throw new SaveConflict('This hero changed on another connection. The newer cloud save and server recovery are preserved.');
      throw Error('Cloud saving is unavailable. Your confirmed server checkpoint is retained.');
    }
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
  async claim(profile,slot,leaseToken){
    this.path(profile,slot);if(!uuid.test(leaseToken))throw Error('Invalid room lease.');
    return this.request('rpc/royale_v3_claim_room',{method:'POST',body:JSON.stringify({p_profile:profile,p_slot:slot+1,p_token:leaseToken})});
  }
  async release(profile,slot,leaseToken){
    this.path(profile,slot);if(!uuid.test(leaseToken))throw Error('Invalid room lease.');
    return this.request('rpc/royale_v3_release_room',{method:'POST',body:JSON.stringify({p_profile:profile,p_slot:slot+1,p_token:leaseToken})});
  }
  async write(profile,slot,expected,snapshot,leaseToken){
    if(!Number.isSafeInteger(expected)||expected<0)throw Error('Invalid save revision.');
    this.path(profile,slot);if(!uuid.test(leaseToken))throw Error('A verified room lease is required before saving.');
    return this.request('rpc/royale_v3_save_room',{method:'POST',body:JSON.stringify({p_profile:profile,p_slot:slot+1,p_token:leaseToken,p_revision:expected,p_snapshot:snapshot})});
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
    a.state.claims??=new Map();const claimKey=account.id+':'+account.slot;
    const leaseToken=h?.cloud?.leaseToken||a.state.claims.get(claimKey)||randomUUID();
    a.state.claims.set(claimKey,leaseToken);a.commit();
    const row=this.bridge.claim?await this.bridge.claim(account.profile,account.slot,leaseToken):await this.bridge.read(account.profile,account.slot);
    // A read started before an in-flight checkpoint can return an older revision.
    // Only a newer cloud revision supersedes the current authority runtime.
    if(h&&(!h.cloud||row.revision>h.cloud.revision)){this.archive(h);h=null;}
    if(h)return h;
    const save=decodeSave(JSON.stringify(row.snapshot));if(!save)throw Error('This hero needs save recovery before multiplayer.');
    h=a.adopt(account.id,{id:randomUUID(),slot:account.slot,snapshot:save});
    h.cloud={profile:account.profile,leaseToken,revision:row.revision,savedAt:row.updated_at,dueAt:this.now()+AUTOSAVE_MS};a.commit();return h;
  }
  saveHero(h,{latest=false}={}){
    if(!h.cloud)return Promise.resolve(null);
    if(h.cloud.conflict)return Promise.reject(new SaveConflict(h.cloud.error));
    if(this.pending.has(h.id))return latest?this.pending.get(h.id).then(()=>this.saveHero(h,{latest:true})):this.pending.get(h.id);
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
      const row=await this.bridge.write(c.profile,h.slot,c.pending.revision,c.pending.snapshot,c.leaseToken);
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
    if(a.connections.get(h.id)!==connection)throw Error('This hero is active in another connection.');
    h.releasing=true;a.detach(h.id,connection);
    let result;try{await this.pending.get(h.id);result=await this.saveHero(h);if(this.bridge.release)await this.bridge.release(h.cloud.profile,h.slot,h.cloud.leaseToken);}catch(error){h.releasing=false;a.commit();throw error;}
    const room=a.state.rooms.get(h.room);
    room.members.delete(h.id);for(const w of room.worlds.values())a.reconcileControls(room,w);
    if(!room.members.size)a.state.rooms.delete(room.id);
    a.state.heroes.delete(h.id);a.commit();return result;
  }
}
