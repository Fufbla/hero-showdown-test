import {travelMethods} from './travel.mjs?v=phase-portals-1';
import {monsterCoins} from './economy.mjs';
import {matchingFlightBonus,refreshFlightEffect} from '../../royale/flight-armor.mjs';
import {matchingAgilityBonus,refreshAgilityEffect} from '../../royale/agility-armor.mjs';
import {matchingSpeedBonus} from '../../royale/speed-armor.mjs';
import {matchingSuperKickBonus,refreshSuperKickEffect} from '../../royale/super-kick-armor.mjs';
import {matchingWhirlwindBonus,refreshWhirlwindEffect} from '../../royale/whirlwind-armor.mjs';
import {matchingStrengthBonus} from '../../royale/strength-armor.mjs';
import {matchingRootsBonus,refreshRootsEffect} from '../../royale/roots-armor.mjs';
import {matchingSteelBonus, refreshSteelEffect} from '../../royale/steel-armor.mjs';
import {matchingFireballBonus} from '../../royale/power-armor.mjs';
import {spawnLoot,normalizeLoot} from '../../royale/world-loot.mjs';
import { matchingMerge, mergeEntitlement } from '../../royale/legendary-state.mjs';
import { WORLD_REGIONS, TYPES, regionDefinition, regionCamps, regionSpawns, regionSurfaces, boardIndex, GATES } from '../../royale/world.mjs';
import { LOOT, RESPAWN, worldClock, monsterXP, xpForLevel, maximumHP, regularLootOutcome } from '../../royale/progression.mjs';
import { emptyInventory, equipmentBonuses, equipmentOutfit, itemDefinition, rollEquipment, armorOutfitForItem, equippedArmorOutfit, isRetiredHeadwear } from '../../royale/equipment.mjs';
import { initialWorld } from '../../royale/world-state.mjs';
import { equipmentStats, isBoss } from '../../royale/powers.mjs';
import {ProjectilePool,clearProjectiles,compactProjectiles} from '../../royale/projectiles.mjs';
import {cosmeticAppearance} from '../../royale/cosmetics/state.mjs';

export function initializeJourney(g,save,now){
  g.loot=normalizeLoot(save?.loot||[],now());g.now=now;g.world=structuredClone(save?.world||initialWorld(now()));g.regionId=g.world.region;
  g.camps=regionCamps(g.regionId);g.healthRoots=save?.healthRoots||0;g.inventory=structuredClone(save?.inventory||emptyInventory());
  g.enemyShots=[];g.enemyShotPool=new ProjectilePool(64);g.treeVisit=false;g.bossEncounter=null;g.board=0;
}
export const journeyMethods={
  spawnEnemyShot(values){const p=this.enemyShotPool.acquire({...values,fxKind:values.bossShot?values.source?.attack?.kind:null});if(p)this.enemyShots.push(p);return p;},
  clearEnemyShots(){clearProjectiles(this.enemyShots,this.enemyShotPool);},
  removeEnemyShots(source){compactProjectiles(this.enemyShots,this.enemyShotPool,p=>p.source!==source);},
  nearPortal(){return !this.arenaScene&&!this.treeVisit&&this.camps.some(c=>Math.abs(this.hero.x-(c.x+90))<=90&&Math.abs(this.hero.y-c.y)<100);},
  getRegion(){return regionDefinition(this.regionId);},
  clock(){return worldClock(this.world.clockReference,this.now(),this.regionId);},
  refreshEquipment(){
    this._outfitInventory = null;
    const earned=equipmentBonuses(this.inventory,this.hero?.level||99),base=this.baseEquipment;
    const active=matchingMerge(this.inventory,this.hero?.level||99);if(this.legendary.active!==active)this.cancelMergeEffects();this.legendary.active=active;if(this.powers)this.powers.mergeEntitlement=mergeEntitlement(active);
    const previousSuperKickBonus=this.equipment?.superKickLevels||0;
    const previousWhirlwindBonus=this.equipment?.whirlwindLevels||0;
    const previousStrengthBonus=this.equipment?.strengthLevels||0;
    const previousRootsBonus=this.equipment?.rootsLevels||0;
    const previousFlightBonus=this.equipment?.flightLevels||0;
    const previousAgilityBonus=this.equipment?.agilityLevels||0;
    const previousSteelBonus=this.equipment?.steelLevels||0;
    this.equipment=equipmentStats(Object.fromEntries(Object.keys(earned).map(k=>[k,earned[k]+(base?.[k]||0)])));
    const bonus=matchingFireballBonus(this.inventory,this.hero?.level||1);
    if(bonus)this.equipment.fireballLevels=bonus;
    const steelBonus=matchingSteelBonus(this.inventory,this.hero?.level||1);
    if(steelBonus)this.equipment.steelLevels=steelBonus;
    if(previousSteelBonus!==steelBonus)refreshSteelEffect(this.powers);
    const rootsBonus=matchingRootsBonus(this.inventory,this.hero?.level||1);
    if(rootsBonus)this.equipment.rootsLevels=rootsBonus;
    if(previousRootsBonus!==rootsBonus)refreshRootsEffect(this.powers);
    const flightBonus=matchingFlightBonus(this.inventory,this.hero?.level||1);
    if(flightBonus)this.equipment.flightLevels=flightBonus;
    if(previousFlightBonus!==flightBonus)refreshFlightEffect(this.powers);
    const agilityBonus=matchingAgilityBonus(this.inventory,this.hero?.level||1);
    if(agilityBonus)this.equipment.agilityLevels=agilityBonus;
    if(previousAgilityBonus!==agilityBonus)refreshAgilityEffect(this.powers);
    const speedBonus=matchingSpeedBonus(this.inventory,this.hero?.level||1);
    if(speedBonus)this.equipment.speedLevels=speedBonus;
    const superKickBonus=matchingSuperKickBonus(this.inventory,this.hero?.level||1);
    if(superKickBonus)this.equipment.superKickLevels=superKickBonus;
    if(previousSuperKickBonus!==superKickBonus)refreshSuperKickEffect(this.powers);
    const whirlwindBonus=matchingWhirlwindBonus(this.inventory,this.hero?.level||1);
    if(whirlwindBonus)this.equipment.whirlwindLevels=whirlwindBonus;
    if(previousWhirlwindBonus!==whirlwindBonus)refreshWhirlwindEffect(this.powers);
    const strengthBonus=matchingStrengthBonus(this.inventory,this.hero?.level||1);
    if(strengthBonus)this.equipment.strengthLevels=strengthBonus;
    if(previousStrengthBonus!==strengthBonus && this.hero?.attack?.power==='strength'){
      this.hero.attack.stats=this.powers.stats('strength');
    }
  },
  visualOutfit(){const e=this.inventory.equipped;if(this._outfitInventory!==this.inventory||this._outfitSuit!==e.suit||this._outfitChest!==e.chest||this._outfitBoots!==e.boots||this._outfitBase!==this.outfit){this._outfitInventory=this.inventory;this._outfitSuit=e.suit;this._outfitChest=e.chest;this._outfitBoots=e.boots;this._outfitBase=this.outfit;this._visualOutfit=equipmentOutfit(this.inventory,this.outfit);}return {...this._visualOutfit,cosmetics:cosmeticAppearance(this.cosmetics)};},
  canSave(){return !this.hero.dead&&!this.inCombat();},
  canTravel(){return !this.treeVisit&&this.canSave()&&!this.bossEncounter&&this.inventory.pending.length===0&&!this.pendingMergeReward();},
  visitTree(){if(!this.canTravel())return false;this.treeVisit=true;return true;},
  leaveTree(){this.treeVisit=false;}, // Visiting is a modal sanctuary; the world location is never changed.
  useHealthRoot(){
    const h=this.hero;if(h.dead||this.healthRoots<1||h.hp>=h.maxHp)return false;
    this.healthRoots--;h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.25);this.recordEconomy('heal');this.emit('heal');return true;
  },
  buyHealthRoot(){
    if(!this.nearTree()||!this.canSave()||this.healthRoots>=LOOT.rootLimit||this.hero.coins<LOOT.rootPrice)return false;
    this.hero.coins-=LOOT.rootPrice;this.healthRoots++;this.emit('purchase');return true;
  },
  equipItem(uid){
    if(!this.canSave()||!this.paused)return false;
    const item=this.inventory.items.find(i=>i.uid===uid);if(!item||isRetiredHeadwear(item))return false;
    const next=armorOutfitForItem(this.inventory,uid,this.hero.level),worn=equippedArmorOutfit(this.inventory,this.hero.level);
    if(!next.ok||((next.rarity==='legendary'||worn?.rarity==='legendary')&&!this.treeVisit))return false;
    this.inventory.equipped=next.equipped?{}:{...next.selection};
    this.recordEconomy('equip');this.refreshEquipment();return true;
  },
  discardItem(uid,confirmed=false){
    if(!confirmed||!this.canSave())return false;
    const i=this.inventory.items.findIndex(item=>item.uid===uid);if(i<0)return false;
    this.retireItem(uid);this.recordEconomy('discard');this.inventory.items.splice(i,1);for(const [part,id] of Object.entries(this.inventory.equipped))if(id===uid)delete this.inventory.equipped[part];
    this.refreshEquipment();return true;
  },
  resolveReward(uid,confirmed=false){
    // Pending boss rewards remain unclaimed, outside the carried equipment limit.
    if(!confirmed||!this.canSave()||!this.inventory.pending.length||isRetiredHeadwear(this.inventory.pending[0]))return false;
    if(uid===null){this.retireItem(this.inventory.pending[0].uid);this.recordEconomy('discard');this.inventory.pending.shift();return true;}
    const index=this.inventory.items.findIndex(i=>i.uid===uid);if(index<0)return false;
    this.retireItem(uid);this.recordEconomy('reward');this.inventory.items.splice(index,1,this.inventory.pending.shift());this.refreshEquipment();return true;
  },
  gainXP(amount){
    const h=this.hero;if(!Number.isFinite(amount)||amount<=0||h.level>=99)return;
    h.xp+=Math.floor(amount);
    while(h.level<99&&h.xp>=xpForLevel(h.level)){
      h.xp-=xpForLevel(h.level);h.level++;h.maxHp=maximumHP(h.level);h.hp=h.maxHp;this.powers.data.points++;this.emit('level',{level:h.level});
    }
    if(h.level===99)h.xp=0;
  },
  reward(e){
    if(e.rewarded||!Number.isFinite(e.hp)||e.hp>0||e.state!=='dead')return;e.rewarded=true;
    const h=this.hero,info=TYPES[e.type];if(!info)return;
    this.kills++;this.species.add(e.type);this.world.kills[e.type]=(this.world.kills[e.type]||0)+1;
    const xp=monsterXP(info.xp,h.level,e.level||info.level),summoned=e.summoned===true,regular=!isBoss(e),coins=regular&&!summoned?monsterCoins(e.level??info.level):0;
    h.coins=Math.min(999999,h.coins+coins);this.gainXP(xp);
    const root=false,item=null; // Regular monsters award coins and unchanged XP only.
    this.emit('reward',{x:e.x,y:e.y-24,xp,coins,root,item:!!item,enemy:info.name});
  },
  loadRegion(id,{x,y,checkpoint=false}={}){
    if(this.treeVisit)return false;
    if(this.arenaScene)this.leaveBoss('travel');
    this.powers.cancelEffects();this.hero.attack=null;this.hero.attackBuffer=null;this.clearEnemyShots();
    this.regionId=id;this.world.region=id;this.camps=regionCamps(id);this.surfaces=regionSurfaces(id);
    this.enemies=regionSpawns(id).map(([type,sx,surface],i)=>this.makeEnemy(type,sx,surface,i));
    const camp=this.camps[0],h=this.hero;
    Object.assign(h,{x:x??camp.x,y:y??camp.y,prevX:x??camp.x,prevY:y??camp.y,vx:0,vy:0,grounded:true,jumps:0,jumpBuffer:0,invulnerable:2,pose:'idle'});
    this.board=boardIndex(h.x);this.combatTimer=0;
    if(checkpoint){this.checkpoint=0;this.world.checkpoint={region:id,index:0};const key=`${id}:0`;if(!this.world.activated.includes(key))this.world.activated.push(key);}
    this.world.visits[`${id}:${this.board}`]=(this.world.visits[`${id}:${this.board}`]||0)+1;
    this.emit('region',{name:this.getRegion().name});
  },
  // Retired menu command: only defeat may call respawn.
  returnCheckpoint(){return false;},
  enterBoard(index){
    if(index===this.board)return;this.board=index;
    const key=`${this.regionId}:${index}`,returning=!!this.world.visits[key];this.world.visits[key]=(this.world.visits[key]||0)+1;
    if(returning)for(const e of this.enemies)if(boardIndex(e.spawnX)===index&&e.state==='dead')e.respawn=0;
    this.emit('board');
  },
  respawnDelay(e){return RESPAWN[TYPES[e.type]?.rank]||RESPAWN.common;},
  ...travelMethods,
  // Lighting is universal; retain the established region 3–7 night difficulty.
  monsterDamage(e){if(e.legendaryHelper)return e.damage;if(isBoss(e))return e.damage??TYPES[e.type]?.damage??0;return TYPES[e.type].damage*(this.regionId>2&&this.clock().night&&!isBoss(e)?2:1);},
};
