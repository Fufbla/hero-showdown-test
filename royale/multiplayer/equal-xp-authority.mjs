import {Authority} from './authority.mjs';
import {TYPES} from '../world.mjs';
import {BOSSES} from '../boss-data.mjs';

// Shared by the isolated HTTP prototype and continuous WebSocket authority.
export class EqualXPAuthority extends Authority {
  // The test's explicit rule is equal shares of the monster's base XP, including
  // mixed-level groups. Solo kills retain the original progression calculation.
  reward(h,e){this.pool=TYPES[e.type]?.xp;try{return super.reward(h,e);}finally{this.pool=null;}}
  completeWorld(r,w){this.pool=w.fight?.region?BOSSES[w.fight.region]?.xp:null;try{return super.completeWorld(r,w);}finally{this.pool=null;}}
  sharedXP(game,count,index,reward){
    if(count<2||!Number.isFinite(this.pool))return super.sharedXP(game,count,index,reward);
    const gain=game.gainXP,emit=game.emit,share=game.hero.level===99?0:Math.floor(this.pool/count)+(index<this.pool%count?1:0);
    game.gainXP=()=>gain.call(game,share);
    game.emit=(type,data)=>emit.call(game,type,['reward','boss-victory'].includes(type)?{...data,xp:share}:data);
    try{return reward();}finally{game.gainXP=gain;game.emit=emit;}
  }
}
