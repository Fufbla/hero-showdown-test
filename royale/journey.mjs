import { WORLD_REGIONS, TYPES, regionDefinition, regionCamps, regionSpawns, regionSurfaces, boardIndex, GATES } from './world.mjs';
import { LOOT, RESPAWN, worldClock, monsterXP, xpForLevel, maximumHP } from './progression.mjs';
import { emptyInventory, equipmentBonuses, equipmentOutfit, itemDefinition, rollEquipment } from './equipment.mjs';
import { initialWorld } from './world-state.mjs';
import { equipmentStats, isBoss } from './powers.mjs';

export function initializeJourney(g,save,now){
  g.now=now;g.world=structuredClone(save?.world||initialWorld(now()));g.regionId=g.world.region;
  g.camps=regionCamps(g.regionId);g.healthRoots=save?.healthRoots||0;g.inventory=structuredClone(save?.inventory||emptyInventory());
  g.enemyShots=[];g.treeVisit=false;g.bossEncounter=null;g.board=0;
}
export const journeyMethods={
  getRegion(){return regionDefinition(this.regionId);},
  clock(){return worldClock(this.world.clockReference,this.now(),this.regionId);},
  refreshEquipment(){
    const earned=equipmentBonuses(this.inventory),base=this.baseEquipment;
    this.equipment=equipmentStats(Object.fromEntries(Object.keys(earned).map(k=>[k,earned[k]+(base?.[k]||0)])));
  },
  visualOutfit(){return equipmentOutfit(this.inventory,this.outfit);},
  canSave(){return !this.hero.dead&&!this.inCombat();},
  canTravel(){return this.canSave()&&!this.bossEncounter&&this.inventory.pending.length===0;},
  visitTree(){if(!this.canTravel())return false;this.treeVisit=true;return true;},
  leaveTree(){this.treeVisit=false;}, // Visiting is a modal sanctuary; the world location is never changed.
  useHealthRoot(){
    const h=this.hero;if(h.dead||this.healthRoots<1||h.hp>=h.maxHp)return false;
    this.healthRoots--;h.hp=Math.min(h.maxHp,h.hp+h.maxHp*.25);this.emit('heal');return true;
  },
  buyHealthRoot(){
    if(!this.nearTree()||!this.canSave()||this.healthRoots>=LOOT.rootLimit||this.hero.coins<LOOT.rootPrice)return false;
    this.hero.coins-=LOOT.rootPrice;this.healthRoots++;this.emit('purchase');return true;
  },
  equipItem(uid){
    if(!this.canSave()||!this.paused)return false;
    const item=this.inventory.items.find(i=>i.uid===uid),def=itemDefinition(item);if(!def)return false;
    if(this.inventory.equipped[def.part]===uid)delete this.inventory.equipped[def.part];else this.inventory.equipped[def.part]=uid;
    this.refreshEquipment();return true;
  },
  discardItem(uid,confirmed=false){
    if(!confirmed||!this.canSave())return false;
    const i=this.inventory.items.findIndex(item=>item.uid===uid);if(i<0)return false;
    this.inventory.items.splice(i,1);for(const [part,id] of Object.entries(this.inventory.equipped))if(id===uid)delete this.inventory.equipped[part];
    this.refreshEquipment();return true;
  },
  resolveReward(uid,confirmed=false){
    // Pending loot is unclaimed. It cannot be equipped or count as an eighth carried item.
    if(!confirmed||!this.inventory.pending.length)return false;
    if(uid===null){this.inventory.pending.shift();return true;}
    const index=this.inventory.items.findIndex(i=>i.uid===uid);if(index<0)return false;
    for(const [part,id] of Object.entries(this.inventory.equipped))if(id===uid)delete this.inventory.equipped[part];
    this.inventory.items.splice(index,1,this.inventory.pending.shift());this.refreshEquipment();return true;
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
    if(e.rewarded)return;e.rewarded=true;
    const h=this.hero,info=TYPES[e.type];if(!info)return;
    this.kills++;this.species.add(e.type);this.world.kills[e.type]=(this.world.kills[e.type]||0)+1;
    const xp=monsterXP(info.xp,h.level,e.level||info.level),summoned=e.summoned===true,regular=!isBoss(e),coins=regular&&!summoned?(this.clock().night?2:1):0;
    h.coins=Math.min(999999,h.coins+coins);this.gainXP(xp);
    let root=false,item=null;
    if(regular&&!summoned){
      if(this.random()<LOOT.rootChance&&this.healthRoots<LOOT.rootLimit){this.healthRoots++;root=true;}
      item=rollEquipment(info.region,this.random,this.inventory.nextId);
      if(item){
        this.inventory.nextId++;
        if(this.inventory.items.length<LOOT.inventoryLimit)this.inventory.items.push(item);
        else this.inventory.pending.push(item);
        this.emit('equipment',{item,pending:this.inventory.pending.length>0});
      }
    }
    this.emit('reward',{x:e.x,y:e.y-24,xp,coins,root,item:!!item,enemy:info.name});
  },
  loadRegion(id,{x,y,checkpoint=false}={}){
    this.powers.cancelEffects();this.hero.attack=null;this.hero.attackBuffer=null;this.enemyShots=[];
    this.regionId=id;this.world.region=id;this.camps=regionCamps(id);this.surfaces=regionSurfaces(id);
    this.enemies=regionSpawns(id).map(([type,sx,surface],i)=>this.makeEnemy(type,sx,surface,i));
    const camp=this.camps[0],h=this.hero;
    Object.assign(h,{x:x??camp.x,y:y??camp.y,prevX:x??camp.x,prevY:y??camp.y,vx:0,vy:0,grounded:true,jumps:0,jumpBuffer:0,invulnerable:2,pose:'idle'});
    this.board=boardIndex(h.x);this.combatTimer=0;
    if(checkpoint){this.checkpoint=0;this.world.checkpoint={region:id,index:0};const key=`${id}:0`;if(!this.world.activated.includes(key))this.world.activated.push(key);}
    this.world.visits[`${id}:${this.board}`]=(this.world.visits[`${id}:${this.board}`]||0)+1;
    this.emit('region',{name:this.getRegion().name});
  },
  travel(id){
    if(!this.canTravel()||!Number.isInteger(id)||!this.world.unlocked.includes(id))return false;
    this.loadRegion(id,{checkpoint:true});return true;
  },
  usePassage(){
    if(!this.canTravel()||!this.hero.grounded)return false;
    const x=this.hero.x,id=this.regionId;
    if(x<110&&id>1){this.loadRegion(id-1,{x:5660,y:600});return true;}
    if(x>GATES.forward-75&&id<7){
      if(this.world.bossVictories.includes(id)&&this.world.unlocked.includes(id+1)){this.loadRegion(id+1,{checkpoint:true});return true;}
      this.emit('gate',{message:`Defeat ${this.getRegion().boss} to open this passage. Boss battles arrive in Phase 5.`});return false;
    }
    if(Math.abs(x-GATES.arena)<110){this.emit('gate',{message:`${this.getRegion().boss} arena entrance · battle coming in Phase 5.`});return false;}
    return false;
  },
  returnCheckpoint(){
    if(!this.canTravel())return false;this.respawn();return true;
  },
  enterBoard(index){
    if(index===this.board)return;this.board=index;
    const key=`${this.regionId}:${index}`,returning=!!this.world.visits[key];this.world.visits[key]=(this.world.visits[key]||0)+1;
    if(returning)for(const e of this.enemies)if(boardIndex(e.spawnX)===index&&e.state==='dead')e.respawn=0;
    this.emit('board');
  },
  respawnDelay(e){return RESPAWN[TYPES[e.type]?.rank]||RESPAWN.common;},
  monsterDamage(e){return TYPES[e.type].damage*(this.clock().night&&!isBoss(e)?2:1);},
};
