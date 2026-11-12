import {fileURLToPath} from 'node:url';
import {Game,STEP} from '../../../royale/core.mjs';
import {PowerSystem,normalizePowers} from '../../../royale/powers.mjs';
import {EQUIPMENT,armorOutfitKey,emptyInventory} from '../../../royale/equipment.mjs';
import {kingJamesLook} from '../selection.mjs';
export const testedPowers=['strength','superKick','fireball','flight','speed','steel','roots','whirlwind'];
export function inventoryFor(setId,serial=1){
 const defs=Object.values(EQUIPMENT).filter(d=>armorOutfitKey(d)===setId&&['suit','chest','boots'].includes(d.part));
 const items=defs.map((d,i)=>({uid:'drop-'+(serial+i),catalogId:d.id}));
 return {...emptyInventory(),items,nextId:serial+items.length,equipped:Object.fromEntries(items.map((item,i)=>[defs[i].part,item.uid]))};
}
export function makeHero(){
 const g=new Game({random:()=>.3});g.gainXP(1e9);g.look=kingJamesLook(g.look);g.enemies=[];g.paused=true;
 g.powers=new PowerSystem(g,normalizePowers({levels:Object.fromEntries(testedPowers.map(id=>[id,5])),equipped:['steel','strength','superKick']},99));
 g.inventory.items=[...inventoryFor('fireball-flare').items,...inventoryFor('steel-rivet',3).items];g.inventory.nextId=5;
 g.refreshEquipment();return g;
}
export function recordBonuses(){
 const g=makeHero(),out={};
 for(const setId of new Set(Object.values(EQUIPMENT).map(armorOutfitKey))){
  const inv=inventoryFor(setId);if(!inv.items.length)continue;
  g.inventory=inv;g.refreshEquipment();
  const {agilityLevels,...equipment}=g.equipment;
  out[setId]={equipment,stats:Object.fromEntries(testedPowers.map(id=>[id,g.powers.stats(id)])),speed:g.powers.speed,attackRate:g.powers.attackRate};
 }
 return out;
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(JSON.stringify(recordBonuses()));
