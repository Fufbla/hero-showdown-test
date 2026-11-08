import {createHash,randomUUID} from 'node:crypto';
import {CLOUD_CONFIG} from '../cloud-config.mjs';
import {SaveConflict} from './v3-checkpoints.mjs';
const digest=t=>createHash('sha256').update(t).digest('hex');
const tokenOK=t=>typeof t==='string'&&/^[a-f0-9]{64}$/.test(t);
const uuidOK=t=>typeof t==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(t);
// Server-only. This adapter cannot address original V3 or HTTP-test save rows.
export class ContinuousTestBridge {
  constructor({url=CLOUD_CONFIG.url,key=process.env.SUPABASE_SERVICE_ROLE_KEY,owner=randomUUID(),fetcher=fetch}={}){
    if(!key||!uuidOK(owner))throw Error('A server credential and unique server identity are required.');
    Object.assign(this,{url,key,owner,fetcher});this.leases=new Map();
  }
  async rpc(name,args){
    const response=await this.fetcher(this.url+'/rest/v1/rpc/royale_continuous_test_'+name,{method:'POST',headers:{apikey:this.key,Authorization:'Bearer '+this.key,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(7000)});
    if(!response.ok){const problem=await response.json().catch(()=>({}));if(problem.code==='P0002')throw new SaveConflict('Test save ownership changed. Reconnect; newer cloud progress is preserved.');throw Error('Continuous test cloud request failed. Reconnect or retry after the other server releases this hero.');}
    return response.json();
  }
  async copyTestHero(sourceToken,{id,token}={}){
    if(!tokenOK(sourceToken)||!tokenOK(token)||!uuidOK(id))throw Error('A source session and retained copy receipt are required.');
    return this.rpc('copy',{p_source:digest(sourceToken),p_id:id,p_token:digest(token)});
  }
  async authenticate(token,{slot}={}){
    if(!tokenOK(token)||!Number.isInteger(slot)||slot<0||slot>1)throw Error('Select test hero Slot 1 or Slot 2.');
    const row=await this.rpc('open',{p_token:digest(token),p_slot:slot,p_owner:this.owner});
    this.leases.set(row.id,{epoch:row.epoch,slot});
    return {id:'continuous:'+row.id,profile:row.id,slot,kind:'v3',expiresAt:Date.now()+3600000};
  }
  checkpoint(profile,slot,expected=null,snapshot=null){
    const lease=this.leases.get(profile);
    if(!lease||lease.slot!==slot)throw Error('Authenticate this test hero before saving.');
    return this.rpc('checkpoint',{p_id:profile,p_owner:this.owner,p_epoch:lease.epoch,p_expected:expected,p_snapshot:snapshot});
  }
  read(profile,slot){return this.checkpoint(profile,slot);}
  write(profile,slot,expected,snapshot){
    if(!Number.isSafeInteger(expected)||expected<0)throw Error('Invalid save revision.');
    return this.checkpoint(profile,slot,expected,snapshot);
  }
}
