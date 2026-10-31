import { COSTUME_CATALOG, COSTUME_PARTS, resaleValue } from './costume-catalog.mjs';
import { itemDefinition } from './equipment.mjs';
import { sanitizeLook } from './appearance.mjs';
import { boardIndex } from './world.mjs';
export const APPEARANCE_PRICES=Object.freeze({hair:100,eyes:100,skin:150,face:200,body:300,age:300,makeover:750});
const GROUPS={hair:['hair','hairColor'],eyes:['eyes'],skin:['skin'],face:['face','eyeShape','brows','nose','mouth','facialHair'],body:['presentation','height','build','shoulders','muscle','torso','arms','legs'],age:['age']};
export const emptyEconomy=()=>({revision:0,purchased:0,sold:0,discarded:0,coinsSpent:0,coinsSold:0,recent:[]});
export function normalizeEconomy(raw){
  if(raw==null)return emptyEconomy();
  const keys=['revision','purchased','sold','discarded','coinsSpent','coinsSold'];
  if(keys.some(k=>!Number.isSafeInteger(raw[k])||raw[k]<0)||!Array.isArray(raw.recent)||raw.recent.length>20)return null;
  if(raw.recent.some(r=>!r||!Number.isSafeInteger(r.id)||r.id<1||r.id>raw.revision||!['purchase','sale','discard','reward','appearance','roots','upgrade','equip','chest','heal'].includes(r.kind)||!Number.isFinite(r.coins)))return null;
  return {...Object.fromEntries(keys.map(k=>[k,raw[k]])),recent:raw.recent.map(r=>({id:r.id,kind:r.kind,coins:r.coins}))};
}
export function normalizeSanctuary(raw,world,arena){
  if(raw==null)return null;
  const r=raw.returnLocation,l=world.location;
  if(r?.arena===true){if(arena?.mode!=='cleared'||r.region!==world.region||![r.x,r.y].every(Number.isFinite)||r.x<17||r.x>1803||r.y< -512||r.y>890)return false;return {returnLocation:{region:r.region,board:boardIndex(r.x),x:r.x,y:r.y,face:r.face===-1?-1:1,vx:0,vy:0,jumps:0,arena:true}};}
  if(!r||!l||r.region!==world.region||r.board!==boardIndex(r.x)||!Number.isFinite(r.x)||!Number.isFinite(r.y)||r.x!==l.x||r.y!==l.y||arena)return false;
  return {returnLocation:{region:r.region,board:r.board,x:r.x,y:r.y,face:l.face,vx:l.vx,vy:l.vy,jumps:l.jumps}};
}
export function appearanceQuote(current,draft){
  const next=sanitizeLook({...draft,name:current.name}),groups=Object.entries(GROUPS).filter(([,keys])=>keys.some(k=>next[k]!==current[k])).map(([id])=>id);
  const subtotal=groups.reduce((s,id)=>s+APPEARANCE_PRICES[id],0),cost=Math.min(APPEARANCE_PRICES.makeover,subtotal);
  const changed=Object.keys(next).some(k=>next[k]!==current[k]);
  return {next,groups,cost,subtotal,makeover:subtotal>=APPEARANCE_PRICES.makeover,changed};
}
const failed=error=>({ok:false,error});
// Sanctuary is a dedicated scene; keep the suspended exploration objects in place.
// This avoids respawning monsters or moving checkpoints merely to open a shop.
export const erisMethods={
  recordEconomy(kind,coins=0){
    this.economy.revision++;this.economy.recent.push({id:this.economy.revision,kind,coins});this.economy.recent=this.economy.recent.slice(-20);
    if(coins<0)this.economy.coinsSpent-=coins;
  },
  retireItem(uid,reason='discarded'){
    this.inventory.retired[uid]=reason;
    for(const [part,id] of Object.entries(this.inventory.equipped))if(id===uid)delete this.inventory.equipped[part];
    if(reason==='sold')this.economy.sold++;else this.economy.discarded++;
  },
  visitTree(){
    if(this.treeVisit)return true;
    if(!this.canTravel())return false;
    const h=this.hero;this.sanctuary={returnLocation:{region:this.regionId,board:boardIndex(h.x),x:h.x,y:h.y,face:h.face,vx:h.vx,vy:h.vy,jumps:h.jumps,...(this.arenaScene?{arena:true}:{})}};
    this.treeVisit=true;this.paused=true;return true;
  },
  leaveTree(){
    if(!this.treeVisit)return false;
    const r=this.sanctuary?.returnLocation;
    if(r&&r.region===this.regionId&&this.world.unlocked.includes(r.region)){
      Object.assign(this.hero,{x:r.x,y:r.y,prevX:r.x,prevY:r.y,face:r.face,vx:r.vx,vy:r.vy,jumps:r.jumps});this.board=r.board;
    }
    this.treeVisit=false;this.sanctuary=null;return true;
  },
  shopReady(){return this.treeVisit&&this.canSave()&&!this.bossEncounter&&this.inventory.pending.length===0;},
  costumePreview(selection,discardUids=[]){
    if(!this.shopReady())return failed('Visit the Tree of Eris safely and resolve pending rewards first.');
    const definitions=selection?.catalogId?[COSTUME_CATALOG[selection.catalogId]]:Object.values(COSTUME_CATALOG).filter(d=>d.setId===selection?.setId&&d.shop);
    if(!definitions.length||definitions.some(d=>!d?.shop)||(!selection.catalogId&&definitions.length!==3))return failed('That costume is not sold here.');
    if(definitions.some(d=>d.level>this.hero.level))return failed(`Requires hero level ${Math.max(...definitions.map(d=>d.level))}.`);
    const cost=definitions.reduce((s,d)=>s+d.catalogValue,0),needed=Math.max(0,this.inventory.items.length+definitions.length-7);
    if(this.hero.coins<cost)return failed(`Need ${cost} coins. Your balance is ${this.hero.coins}.`);
    if(new Set(discardUids).size!==discardUids.length||discardUids.some(uid=>!this.inventory.items.some(i=>i.uid===uid)))return failed('Choose distinct owned items to discard.');
    if(discardUids.length!==needed)return {ok:false,error:`Choose ${needed} owned item${needed===1?'':'s'} to discard before buying.`,needed,cost,definitions};
    return {ok:true,cost,needed,definitions,discardUids:[...discardUids],revision:this.economy.revision};
  },
  buyCostume(selection,{discardUids=[],confirmed=false,revision}={}){
    if(!confirmed||revision!==this.economy.revision)return failed('Review this purchase again before confirming.');
    const q=this.costumePreview(selection,discardUids);if(!q.ok)return q;
    if(this.inventory.nextId+q.definitions.length>=1e9)return failed('Item identifier limit reached.');
    for(const uid of discardUids)this.retireItem(uid);
    this.inventory.items=this.inventory.items.filter(i=>!discardUids.includes(i.uid));
    const items=q.definitions.map(d=>({uid:`drop-${this.inventory.nextId++}`,catalogId:d.id}));this.inventory.items.push(...items);
    this.hero.coins-=q.cost;this.economy.purchased+=items.length;this.recordEconomy('purchase',-q.cost);this.refreshEquipment();return {...q,items};
  },
  salePreview(uid){
    const item=this.inventory.items.find(i=>i.uid===uid),def=itemDefinition(item),value=resaleValue(def);
    if(!this.shopReady())return failed('Selling is available only at the central Costume Shop.');
    if(!def||value===null)return failed('This item cannot be sold. Legendary equipment has no resale.');
    if(this.hero.coins+value>999999)return failed('Coin balance is full. Spend some coins before selling.');
    return {ok:true,uid,value,def,revision:this.economy.revision};
  },
  sellItem(uid,{confirmed=false,revision}={}){
    if(!confirmed||revision!==this.economy.revision)return failed('Review this sale again before confirming.');
    const q=this.salePreview(uid);if(!q.ok)return q;
    this.retireItem(uid,'sold');this.inventory.items=this.inventory.items.filter(i=>i.uid!==uid);this.hero.coins+=q.value;this.economy.coinsSold+=q.value;this.recordEconomy('sale',q.value);this.refreshEquipment();return q;
  },
  rootPreview(count=1){
    if(!this.nearTree()||!this.canSave())return failed('Visit the Tree of Eris outside combat.');
    if(!Number.isInteger(count)||count<1||count>4-this.healthRoots)return failed(`Space for ${4-this.healthRoots} Health Roots.`);
    const cost=count*50;if(this.hero.coins<cost)return failed(`Need ${cost} coins.`);
    return {ok:true,count,cost,revision:this.economy.revision};
  },
  buyHealthRoot(count=1){const q=this.rootPreview(count);if(!q.ok)return false;this.hero.coins-=q.cost;this.healthRoots+=count;this.recordEconomy('roots',-q.cost);this.emit('purchase');return true;},
  makeoverPreview(draft){
    if(!this.shopReady())return failed('Appearance changes are available at the Tree of Eris.');
    const q=appearanceQuote(this.look,draft);
    if(!q.changed)return {...q,...failed('No changes selected.')};
    if(this.hero.coins<q.cost)return {...q,...failed(`Need ${q.cost} coins.`)};
    return {...q,ok:true,revision:this.economy.revision};
  },
  applyMakeover(draft,{confirmed=false,revision}={}){
    if(!confirmed||revision!==this.economy.revision)return failed('Review these appearance changes again.');
    const q=this.makeoverPreview(draft);if(!q.ok)return q;this.look=q.next;this.hero.coins-=q.cost;this.recordEconomy('appearance',-q.cost);return q;
  },
};
