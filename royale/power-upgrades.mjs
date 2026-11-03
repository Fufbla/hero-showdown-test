import {decodeSave} from './core.mjs';
import {POWER_IDS, POWER_CAP} from './powers.mjs';

const fail=error=>({ok:false,error});
// Commit only earned level/XP and the permanent spend. An upgrade is not an
// implicit manual save of the current position, inventory, coins or loadout.
export function powerUpgradeSnapshot(game,previous,id){
  const check=game.upgradePreview(id,1);
  if(!check.ok)return check;
  if(!game.canSave()||game.hero.dead)return fail('Leave combat before upgrading.');
  const saved=decodeSave(JSON.stringify(previous));
  if(!saved)return fail('The saved hero is unavailable. No Power Point was spent.');
  const levels=game.powers.data.levels,spent=POWER_IDS.reduce((n,k)=>n+levels[k],0);
  if(!POWER_IDS.every(k=>Number.isInteger(levels[k])&&levels[k]>=0&&levels[k]<=POWER_CAP&&levels[k]===saved.powers.levels[k])||
    !Number.isInteger(game.hero.level)||game.hero.level<saved.level||game.hero.level>99||
    game.powers.data.points!==game.hero.level-1-spent)
    return fail('Power progression changed. Reload the latest hero before upgrading.');
  const next=structuredClone(saved);
  next.level=game.hero.level;next.xp=game.hero.xp;
  next.powers.levels[id]++;next.powers.points=game.powers.data.points-1;
  next.economy.revision++;next.economy.recent.push({id:next.economy.revision,kind:'upgrade',coins:0});
  next.economy.recent=next.economy.recent.slice(-20);
  if(!decodeSave(JSON.stringify(next)))return fail('Upgrade validation failed. No Power Point was spent.');
  return {ok:true,snapshot:next,id,level:next.powers.levels[id],points:next.powers.points};
}

export class InstantPowerUpgrades{
  constructor(context){this.context=context;this.busy=false;}
  async spend(id){
    if(this.busy)return fail('An upgrade is being saved.');
    const {game,store,index,heroId}=this.context();
    const slot=store.slot(index);
    if(!heroId||slot?.id!==heroId)return fail('Select the current hero before upgrading.');
    if(!store.writable)return fail(store.message||'Hero storage is unavailable.');
    // CloudHeroStore keeps an ordinary in-memory cache. Only its server row is
    // an authoritative base; never mistake writeSlot() for a cloud commit.
    const previous=store.cloud?store.meta[index]?.snapshot:slot.snapshot;
    const result=powerUpgradeSnapshot(game,previous,id);
    if(!result.ok)return result;
    this.busy=true;
    try{
      const saved=store.cloud?await store.commit(index,result.snapshot):
        store.writeSlot(index,result.snapshot,{expectedId:heroId,region:slot.lastRegion,requireDurable:true});
      if(!saved?.ok)return saved||fail('Upgrade could not be saved.');
      // The live power is changed only after durable storage acknowledges it.
      // Gameplay and navigation stay paused while a remote write is in flight.
      game.powers.data.levels[id]=result.level;game.powers.data.points=result.points;
      game.recordEconomy('upgrade');game.emit('upgrade',{id,count:1});
      return {...result,storage:store.cloud?'cloud':'local'};
    }catch(error){
      return fail(store.cloud?'Cloud upgrade was not acknowledged. Reload to reconcile the result before another spend. '+error.message:
        'Upgrade was not saved. No Power Point was spent. '+error.message);
    }finally{this.busy=false;}
  }
}
