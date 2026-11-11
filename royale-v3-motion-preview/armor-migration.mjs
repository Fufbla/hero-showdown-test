import {isRetiredHeadwear,reconcileArmorLoadout} from './equipment.mjs';
import {matchingMerge} from './legendary-state.mjs';

// A pre-v9 permanent ledger may still contain headwear that an ordinary save
// legitimately sold afterwards. Migration's synthetic retirement is not a
// historical sale/discard event: preserve the actual terminal reason when it
// is known, and require a terminal record for the newly retired headwear.
export function armorRetirementHistoryPreserved(previous,normalizedPrevious,next){
  const recorded=previous.inventory?.retired||{},retired=next.inventory?.retired||{};
  return Object.entries(normalizedPrevious.inventory.retired).every(([uid,reason])=>
    previous.version<9&&!Object.hasOwn(recorded,uid)
      ?retired[uid]==='sold'||retired[uid]==='discarded'
      :retired[uid]===reason);
}

// Called only after the old snapshot has passed its historical validators.
// This is a schema upgrade, not a purchase, discard, or new Legendary event.
export function migrateArmorSnapshot(snapshot){
  const state=structuredClone(snapshot),inventory=state.inventory;
  inventory.headwearArchive??=[];
  const archived=new Set(inventory.headwearArchive.map(item=>item.source+':'+item.uid));
  const retire=(item,source)=>{
    if(!isRetiredHeadwear(item))return false;
    const key=source+':'+item.uid;
    if(!archived.has(key)){
      inventory.headwearArchive.push({uid:item.uid,catalogId:item.catalogId,...(item.stats?{stats:{...item.stats}}:{}),source});
      archived.add(key);
    }
    if(/^drop-\d+$/.test(item.uid)){
      inventory.retired[item.uid]??='discarded';
      inventory.nextId=Math.max(inventory.nextId,Number(item.uid.slice(5))+1);
    }
    return true;
  };
  inventory.items=inventory.items.filter(item=>!retire(item,'inventory'));
  inventory.pending=inventory.pending.filter(item=>!retire(item,'pending'));
  state.loot=state.loot.filter(loot=>!loot.item||!retire(loot.item,'loot'));
  for(const [region,record] of Object.entries(state.bossProgress.records))
    record.chest.items=record.chest.items.filter(item=>!retire(item,'boss:'+region));
  for(const [id,record] of Object.entries(state.legendary.defeated))
    record.pieces=record.pieces.filter(item=>!retire(item,'legendary:'+id));
  // Complete only an already-owned family selected by a previously worn body
  // or boot. Incomplete/mixed leftovers stay owned and are never manufactured.
  inventory.equipped=reconcileArmorLoadout(inventory,state.level);
  state.legendary.configuration=2;
  state.legendary.active=matchingMerge(inventory,state.level);
  state.version=9;
  return state;
}
