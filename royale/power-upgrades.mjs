import {decodeSave} from './core.mjs';
import {POWERS, POWER_IDS, POWER_CAP, ACTIVE_SLOTS} from './powers.mjs';

const fail=error=>({ok:false,error});

export function hudEquipError(game, slot, id) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= ACTIVE_SLOTS) return 'That slot belongs to Villain Merge.';
  if (game.hero.dead || !game.canSave()) return 'Leave combat before changing powers.';
  const powers = game.powers, current = powers.data.equipped[slot];
  if (id !== null) {
    if (!POWER_IDS.includes(id) || POWERS[id].passive || !powers.data.levels[id]) return 'Choose a learned active power.';
    const other = powers.data.equipped.indexOf(id);
    if (other === slot) return `Equipped in slot ${other + 1}`;
  } else if (!current) return 'This slot is already empty.';
  if ([current, id].some(power => power && (powers.active[power] || powers.cooldowns[power] > 0 || game.disruptedPower === power))) {
    return 'Wait until the power is ready.';
  }
  return '';
}

function savePowerChange(store, index, heroId, region, snapshot) {
  return store.cloud ? store.commit(index, snapshot) :
    store.writeSlot(index, snapshot, {expectedId:heroId, region, requireDurable:true});
}
// Commit the complete current hero alongside the spend: an old partial snapshot
// must never resurrect spent coins, older HP or a pre-travel position.
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
  const next=decodeSave(game.save());
  if(!next)return fail('Current hero progress could not be captured.');
  next.level=game.hero.level;next.xp=game.hero.xp;
  next.powers.levels[id]++;next.powers.points=game.powers.data.points-1;
  next.economy.revision++;next.economy.recent.push({id:next.economy.revision,kind:'upgrade',coins:0});
  next.economy.recent=next.economy.recent.slice(-20);
  if(!decodeSave(JSON.stringify(next)))return fail('Upgrade validation failed. No Power Point was spent.');
  return {ok:true,snapshot:next,id,level:next.powers.levels[id],points:next.powers.points};
}

export class InstantPowerUpgrades{
  constructor(context){this.context=context;this.busy=false;}
  async remoteChange(remote,method,args){this.busy=true;try{const result=await remote.command(method,args);return result===false?fail('This power change is unavailable.'):typeof result==='object'?result:{ok:true};}catch(error){return fail(error.message);}finally{this.busy=false;}}
  async equip(slot, id) {
    if (this.busy) return fail('A power change is being saved.');
    const {game, store, index, heroId,remote,blocked} = this.context();
    if(blocked)return fail('This hero uses account saving. Reconnect before changing powers.');
    if(remote)return this.remoteChange(remote,'equipPower',[slot,id]);
    const reason = hudEquipError(game, slot, id);
    if (reason || !game.paused) return fail(reason || 'Open the slot to choose a power.');
    const record = store.slot(index);
    if (!record || record.id !== heroId || !store.writable) return fail(store.message || 'Select a writable hero before equipping.');
    const snapshot = decodeSave(game.save());
    if (!snapshot) return fail('The saved hero is unavailable.');
    const equipped = [...game.powers.data.equipped];
    const other=id===null?-1:equipped.indexOf(id);
    if(other>=0&&other!==slot)equipped[other]=equipped[slot];
    equipped[slot] = id;
    if (equipped.some(power => power && !snapshot.powers.levels[power])) return fail('Reload the latest hero before equipping.');
    snapshot.powers.equipped = equipped;
    // A loadout write must never provide a way to reload away a live cooldown.
    const recovery = game.powers.snapshot().recovery;
    for (const power of POWER_IDS) snapshot.powers.recovery[power] = Math.max(snapshot.powers.recovery[power] || 0, recovery[power] || 0);
    this.busy = true;
    try {
      const saved = await savePowerChange(store, index, heroId, record.lastRegion, snapshot);
      if (!saved?.ok) return saved || fail('The loadout could not be saved.');
      game.equipPower(slot, id);
      return {ok:true};
    } catch (error) {
      return fail('The loadout was not confirmed. ' + error.message);
    } finally {
      this.busy = false;
    }
  }
  async spend(id){
    if(this.busy)return fail('An upgrade is being saved.');
    const {game,store,index,heroId,remote,blocked}=this.context();
    if(blocked)return fail('This hero uses account saving. Reconnect before changing powers.');
    if(remote){const result=await this.remoteChange(remote,'upgradePower',[id,1]);return result.ok?{...result,level:remote.game.powers.data.levels[id],points:remote.game.powers.data.points,storage:'cloud'}:result;}
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
      const saved=await savePowerChange(store,index,heroId,slot.lastRegion,result.snapshot);
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
