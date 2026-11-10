import {Authority} from './authority.mjs';
import {Game} from '../core.mjs';
import {TYPES} from '../world.mjs';
import {BOSSES} from '../boss-data.mjs';

// One local death event, one loot roll, one entitlement for each active hero.
export class EqualXPAuthority extends Authority {
  constructor(...args){super(...args);this.dropSerial=0;this.sharedDrops=new Map();}
  contributors(room,zone){return [...room.members].map(id=>this.state.heroes.get(id)).filter(h=>h?.connected&&h.zone===zone);}
  reward(attacker,enemy){
    if(enemy.rewarded||enemy.hp>0||enemy.state!=='dead')return;enemy.rewarded=true;
    const room=this.state.rooms.get(attacker.room),players=this.contributors(room,attacker.zone),offset=(room.xpTurn||0)%Math.max(1,players.length);
    this.pool=TYPES[enemy.type]?.xp;let newDrops=[];
    try{
      players.forEach((h,i)=>{
        const g=h.game,previous=new Set(g.loot),random=g.random;
        // Only the first hero rolls a drop. Other heroes receive cloned entitlements.
        if(i>0)g.random=()=>1;
        try{this.sharedXP(g,players.length,(i-offset+players.length)%players.length,()=>Game.prototype.reward.call(g,{...enemy,rewarded:false}));}
        finally{g.random=random;}
        if(i===0)newDrops=g.loot.filter(o=>!previous.has(o));
        else for(const drop of newDrops){
          const copy=structuredClone(drop);copy.id=`loot-${g.inventory.nextId++}`;
          if(copy.item)copy.item.uid=`drop-${g.inventory.nextId++}`;
          copy.localDropId=drop.localDropId;g.loot.push(copy);
        }
        if(i===0)for(const drop of newDrops){drop.localDropId=++this.dropSerial;this.sharedDrops.set(drop.localDropId,{id:drop.localDropId,expiresAt:drop.expiresAt,eligible:new Set(players.map(p=>p.id)),claimed:new Set()});}
        h.revision++;
      });
      if(players.length)room.xpTurn=(offset+1)%players.length;
      this.dirty=true;
    }finally{this.pool=null;}
  }
  sharedXP(game,count,index,reward){
    if(count<2||!Number.isFinite(this.pool))return super.sharedXP(game,count,index,reward);
    const gain=game.gainXP,emit=game.emit,share=Math.floor(this.pool/count)+(index<this.pool%count?1:0);
    game.gainXP=()=>gain.call(game,share);
    game.emit=(type,data)=>emit.call(game,type,['reward','boss-victory'].includes(type)?{...data,xp:game.hero.level===99?0:share}:data);
    try{return reward();}finally{game.gainXP=gain;game.emit=emit;}
  }
  completeWorld(room,world){
    if(world.cleared||!world.fight)return;
    const players=this.contributors(room,world.key).filter(h=>h.game.arenaScene),offset=(room.xpTurn||0)%Math.max(1,players.length);
    this.pool=world.fight.region?BOSSES[world.fight.region]?.xp:null;
    try{players.forEach((h,i)=>{
      const g=h.game,dead=g.hero.dead;g.hero.dead=false;
      try{
        if(g.arenaScene.legendary){g.pendingLegendaryVictory=g.arenaScene.legendary;g.prepareLegendaryVictory();}
        else {
          // A companion can arrive in the leader's region before unlocking it
          // in solo play. The verified shared victory belongs to both heroes.
          // Keep each hero's chest record; never copy the leader's reward history.
          const region=world.fight.region;
          if(!g.world.unlocked.includes(region))g.world.unlocked.push(region);
          g.bossEncounter=world.fight;
          this.sharedXP(g,players.length,(i-offset+players.length)%players.length,()=>Game.prototype.completeBoss.call(g));
        }
      }finally{g.hero.dead=dead;}
      g.bossEncounter=null;g.arenaScene.cleared=true;g.pendingLegendaryVictory=null;h.revision++;
    });}finally{this.pool=null;}
    room.xpTurn=(offset+1)%Math.max(1,players.length);world.cleared=true;world.shots.length=0;world.hazards.length=0;world.fight=null;this.dirty=true;
  }
  reconcileDrops(){
    for(const [id,drop] of this.sharedDrops){
      for(const heroId of drop.eligible){const h=this.state.heroes.get(heroId);if(!h||!h.connected||!h.game.loot.some(o=>o.localDropId===id))drop.claimed.add(heroId);}
      if(drop.claimed.size===drop.eligible.size||drop.expiresAt<=this.now())this.sharedDrops.delete(id);
    }
  }
}
