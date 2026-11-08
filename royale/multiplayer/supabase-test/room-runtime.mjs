import {EqualXPAuthority} from '../equal-xp-authority.mjs';
import {Game,STEP} from '../../core.mjs';
import {encodeRuntime,decodeRuntime} from '../runtime.mjs';
import {captureProgress} from '../v3-checkpoints.mjs';

// Reuse the shipped authority. Postgres replaces SQLite only in this prototype.
class RequestStore {
  constructor(state,revision=0){this.initial=state||{version:1,rooms:new Map(),heroes:new Map(),imports:new Map(),tick:0};this.revision=revision;}
  commit(){return {revision:++this.revision};}
}
export class TestAuthority extends EqualXPAuthority {
  // Expiry is reconciled with the test hero rows by the HTTP adapter, not by
  // creating unindexed solo rooms inside another room's durable document.
  tick(){const grace=this.graceMs;this.graceMs=Infinity;try{super.tick();}finally{this.graceMs=grace;}}
}
export class RoomRuntime {
  constructor(row=null,now=Date.now()){
    this.clock=now;this.realNow=now;
    const data=row?decodeRuntime(row.runtime):null,old=new Map([...data?.state.heroes.values()||[]].map(h=>[h.id,{seen:h.netSeen||0,disconnectedAt:h.disconnectedAt}]));
    this.a=new TestAuthority(new RequestStore(data?.state,row?.version||0),{capacity:5,maxConnections:5,now:()=>this.clock});
    this.a.inputMaxAgeMs=1000;
    this.a.inputs=data?.inputs||new Map();this.lastStep=data?.lastStep??now;
    for(const h of this.a.state.heroes.values()){
      const prior=old.get(h.id);h.netSeen=prior.seen;h.connected=now-h.netSeen<5000;h.disconnectedAt=h.connected?null:prior.disconnectedAt??h.netSeen+5000;
      if(h.connected)this.a.connections.set(h.id,{close(){}});
    }
    for(const r of this.a.state.rooms.values())this.a.refreshHost(r);
  }
  adopt(row){
    const h=this.a.adopt(row.id,{id:row.id,slot:row.slot,snapshot:row.snapshot});
    h.commandSeq=row.command_seq||0;h.savedAt=row.saved_at;h.savedRevision=row.revision;h.netSeen=this.realNow;
    this.touch(h);return h;
  }
  touch(h){const r=this.a.state.rooms.get(h.room);if(!h.connected&&this.a.connected(r).length>=5)throw Error('Room capacity reached. Five players are already connected.');h.connected=true;h.netSeen=this.realNow;h.disconnectedAt=null;this.a.connections.set(h.id,{close(){}});if(!this.a.inputs.has(h.id))this.a.inputs.set(h.id,{seq:0,input:{},at:this.realNow});this.a.refreshHost(r);}
  pending(rows){
    for(const row of rows||[]){
      const h=this.a.state.heroes.get(row.id);if(!h)continue;
      // A confirmed disconnect takes precedence over older queued movement.
      if(!Number.isFinite(row.seen)||row.seen<=(h.disconnectedAt||0)||this.realNow-row.seen>=5000)continue;
      if(row.seen>(h.netSeen||0)){this.touch(h);h.netSeen=row.seen;}
      if(!h.connected)continue;
      for(const packet of row.packets||[])if(packet.seq>(this.a.inputs.get(h.id)?.seq||0)&&this.realNow-packet.at<1000){
        this.a.input(h.owner,h.id,packet.seq,packet.input);
        this.a.inputs.get(h.id).at=Math.min(this.realNow,packet.at);
      }
    }
  }
  advance(){
    // No long catch-up burst after all phones sleep. Active play still uses the
    // unchanged 60 Hz physics, damage, AI, cooldowns and monster difficulty.
    const start=Math.max(this.lastStep,this.realNow-1000),steps=Math.min(60,Math.max(0,Math.floor((this.realNow-start)/(STEP*1000)+1e-7)));
    this.clock=start;
    for(let i=0;i<steps;i++){this.clock+=STEP*1000;this.a.tick();}
    // Carry the fractional tick across requests. Dropping it on every client
    // update slows the shared world increasingly as more players join.
    this.lastStep=this.clock;this.clock=this.realNow;
  }
  command(h,seq,method,args=[]){return this.a.command(h.owner,h.id,seq,method,args);}
  view(h){const view=this.a.view(h.owner,h.id);return {...view,roomId:this.a.state.rooms.get(h.room).code?h.room:null,cloud:{slot:h.slot,revision:h.savedRevision||0,savedAt:h.savedAt||null,error:null}};}
  frame(r){
    const heroes=[...r.members].map(id=>this.a.state.heroes.get(id)).filter(h=>h.connected);
    return {tick:this.a.state.tick,phase:r.phase,hostId:r.hostId,players:heroes.map(h=>({id:h.id,name:h.game.look.name,region:h.game.regionId})),
      peers:heroes.map(h=>({id:h.id,zone:h.zone,hero:h.game.hero,look:h.game.look,outfit:h.game.visualOutfit(),powers:{active:h.game.powers.active,projectiles:h.game.powers.projectiles},mergeEffects:h.game.mergeEffects,mergeShots:h.game.mergeShots})),
      worlds:[...r.worlds.values()].map(w=>({key:w.key,enemies:w.enemies.map(e=>({id:e.id,hp:e.hp,maxHp:e.maxHp,x:e.x,y:e.y,face:e.face,state:e.state,pose:e.pose,age:e.age,attack:e.attack,phase:e.phase}))}))};
  }
  checkpoints(force=false){
    const rows=[];
    for(const h of this.a.state.heroes.values())if(force||this.a.dirty||this.realNow-Date.parse(h.savedAt||0)>=8000){
      h.savedAt=new Date(this.realNow).toISOString();h.savedRevision=(h.savedRevision||0)+1;
      rows.push({id:h.id,snapshot:captureProgress(h.game),revision:h.savedRevision,command_seq:h.commandSeq,saved_at:h.savedAt});
    }
    return rows;
  }
  encode(){return encodeRuntime({state:this.a.state,inputs:this.a.inputs,lastStep:this.lastStep});}
}
export function freshSnapshot(name='Test Hero'){
  return JSON.parse(new Game({look:{name}}).save());
}
